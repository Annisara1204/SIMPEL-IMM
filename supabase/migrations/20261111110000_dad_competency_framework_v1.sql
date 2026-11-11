-- Phase 2: master competency framework DAD versi trial.
-- Rubrik kegiatan tetap menjadi snapshot dan tidak ditulis ulang oleh seed ini.

create table if not exists public.competency_frameworks (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9_-]{2,40}$'),
  name text not null check (char_length(trim(name)) between 2 and 160),
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.competency_framework_versions (
  id uuid primary key default gen_random_uuid(),
  framework_id uuid not null references public.competency_frameworks(id) on delete restrict,
  version integer not null check (version > 0),
  status text not null check (status in ('trial', 'published', 'archived')),
  is_official boolean not null default false,
  source_note text not null,
  created_at timestamptz not null default now(),
  unique (framework_id, version),
  unique (id, framework_id)
);

create table if not exists public.competency_aspects (
  id uuid primary key default gen_random_uuid(),
  framework_version_id uuid not null references public.competency_framework_versions(id) on delete restrict,
  code text not null check (code ~ '^[A-Z]{2,8}$'),
  name text not null check (char_length(trim(name)) between 2 and 120),
  description text not null,
  purpose text not null,
  weight numeric(5,2) not null check (weight > 0 and weight <= 100),
  position integer not null check (position > 0),
  unique (framework_version_id, code),
  unique (framework_version_id, name),
  unique (id, framework_version_id)
);

create table if not exists public.competency_indicators (
  id uuid primary key default gen_random_uuid(),
  framework_version_id uuid not null references public.competency_framework_versions(id) on delete restrict,
  code text not null check (code ~ '^[A-Z]{2,8}-[0-9]{2,3}$'),
  name text not null check (char_length(trim(name)) between 2 and 200),
  description text not null,
  measurement_objective text not null,
  observable_behaviors text not null,
  measurement_method text not null,
  evidence_guidance text not null,
  position integer not null check (position > 0),
  unique (framework_version_id, code),
  unique (framework_version_id, name),
  unique (id, framework_version_id)
);

create table if not exists public.competency_indicator_aspects (
  id uuid primary key default gen_random_uuid(),
  framework_version_id uuid not null,
  indicator_id uuid not null,
  aspect_id uuid not null,
  created_at timestamptz not null default now(),
  foreign key (indicator_id, framework_version_id)
    references public.competency_indicators(id, framework_version_id) on delete restrict,
  foreign key (aspect_id, framework_version_id)
    references public.competency_aspects(id, framework_version_id) on delete restrict,
  unique (indicator_id, aspect_id)
);

create index if not exists competency_framework_versions_status_idx
  on public.competency_framework_versions(framework_id, status, version desc);
create index if not exists competency_aspects_version_position_idx
  on public.competency_aspects(framework_version_id, position);
create index if not exists competency_indicators_version_position_idx
  on public.competency_indicators(framework_version_id, position);
create index if not exists competency_indicator_aspects_aspect_idx
  on public.competency_indicator_aspects(aspect_id, indicator_id);

-- Referensi opsional menghubungkan salinan rubrik kegiatan dengan master asalnya.
alter table public.rubric_aspects
  add column if not exists competency_aspect_id uuid references public.competency_aspects(id) on delete restrict;
alter table public.rubric_indicators
  add column if not exists competency_indicator_id uuid references public.competency_indicators(id) on delete restrict;
create index if not exists rubric_aspects_competency_aspect_idx
  on public.rubric_aspects(competency_aspect_id) where competency_aspect_id is not null;
create index if not exists rubric_indicators_competency_indicator_idx
  on public.rubric_indicators(competency_indicator_id) where competency_indicator_id is not null;

alter table public.competency_frameworks enable row level security;
alter table public.competency_framework_versions enable row level security;
alter table public.competency_aspects enable row level security;
alter table public.competency_indicators enable row level security;
alter table public.competency_indicator_aspects enable row level security;

create policy competency_frameworks_read_assessment_staff on public.competency_frameworks
for select to authenticated using (exists (
  select 1 from public.profiles profile where profile.id = (select auth.uid())
    and profile.role in ('admin_system', 'bidang_kader', 'observer', 'instruktur')
));
create policy competency_framework_versions_read_assessment_staff on public.competency_framework_versions
for select to authenticated using (exists (
  select 1 from public.profiles profile where profile.id = (select auth.uid())
    and profile.role in ('admin_system', 'bidang_kader', 'observer', 'instruktur')
));
create policy competency_aspects_read_assessment_staff on public.competency_aspects
for select to authenticated using (exists (
  select 1 from public.profiles profile where profile.id = (select auth.uid())
    and profile.role in ('admin_system', 'bidang_kader', 'observer', 'instruktur')
));
create policy competency_indicators_read_assessment_staff on public.competency_indicators
for select to authenticated using (exists (
  select 1 from public.profiles profile where profile.id = (select auth.uid())
    and profile.role in ('admin_system', 'bidang_kader', 'observer', 'instruktur')
));
create policy competency_indicator_aspects_read_assessment_staff on public.competency_indicator_aspects
for select to authenticated using (exists (
  select 1 from public.profiles profile where profile.id = (select auth.uid())
    and profile.role in ('admin_system', 'bidang_kader', 'observer', 'instruktur')
));

grant select on public.competency_frameworks, public.competency_framework_versions,
  public.competency_aspects, public.competency_indicators, public.competency_indicator_aspects to authenticated;
revoke insert, update, delete, truncate, references, trigger on public.competency_frameworks,
  public.competency_framework_versions, public.competency_aspects,
  public.competency_indicators, public.competency_indicator_aspects from anon, authenticated;

-- Trial DAD v1. Rerun aman: kode/versi unik dan seed memakai ON CONFLICT DO NOTHING.
insert into public.competency_frameworks(code, name, description)
values ('DAD_IMM', 'Kerangka Kompetensi Darul Arqam Dasar IMM',
  'Kerangka trial proyek untuk pemetaan perkembangan peserta DAD; bukan standar resmi IMM.')
on conflict (code) do nothing;

insert into public.competency_framework_versions(framework_id, version, status, is_official, source_note)
select id, 1, 'trial', false,
  'Usulan trial dari prompt proyek 11 November 2026; validasi terhadap pedoman dan silabus DAD tetap diperlukan.'
from public.competency_frameworks where code = 'DAD_IMM'
on conflict (framework_id, version) do nothing;

insert into public.competency_aspects(framework_version_id, code, name, description, purpose, weight, position)
select version.id, seed.code, seed.name, seed.description, seed.purpose, seed.weight, seed.position
from public.competency_frameworks framework
join public.competency_framework_versions version on version.framework_id = framework.id and version.version = 1
cross join (values
  ('INT','Intelektualitas','Pemahaman dan pengolahan gagasan, pengetahuan, serta persoalan secara kritis dan kontekstual.','Mengamati pemahaman materi, nalar, argumentasi, analisis konteks, dan perumusan solusi.',25.00,1),
  ('REL','Religiusitas','Pemahaman dan refleksi nilai Islam sebagaimana dibahas dalam materi dan interaksi yang dapat diamati.','Mengamati pemahaman nilai, refleksi sukarela, akhlak dalam interaksi, dan penerapan nilai; bukan mengukur kadar iman.',20.00,2),
  ('HUM','Humanitas','Kepekaan terhadap martabat, pengalaman, kebutuhan, dan perbedaan orang lain serta masyarakat.','Mengamati empati, solidaritas, kepedulian sosial, kerja sama, dan sikap pada perbedaan.',20.00,3),
  ('PAR','Partisipasi dan Kolaborasi','Kontribusi peserta dalam diskusi, kegiatan, komunikasi, dan kerja bersama.','Mengamati beragam bentuk kontribusi; banyak berbicara bukan satu-satunya ukuran partisipasi.',15.00,4),
  ('DIS','Kedisiplinan dan Tanggung Jawab','Konsistensi memenuhi kesepakatan waktu, tugas, aturan teknis, dan keikutsertaan.','Mengamati perilaku yang relevan dengan kesepakatan dan memberi ruang pencatatan kendala yang dikomunikasikan.',10.00,5),
  ('KOM','Komitmen dan Tindak Lanjut','Refleksi proses diri dan rencana realistis untuk terus belajar serta berproses.','Mengamati refleksi, kesadaran proses perkaderan, inisiatif lanjutan, dan rencana tindak lanjut.',10.00,6)
) as seed(code,name,description,purpose,weight,position)
where framework.code = 'DAD_IMM' and version.version = 1
on conflict (framework_version_id, code) do nothing;

insert into public.competency_indicators(
  framework_version_id, code, name, description, measurement_objective,
  observable_behaviors, measurement_method, evidence_guidance, position
)
select version.id, seed.code, seed.name, seed.description, seed.objective,
  seed.behaviors, seed.method, seed.evidence, seed.position
from public.competency_frameworks framework
join public.competency_framework_versions version on version.framework_id = framework.id and version.version = 1
cross join (values
  ('INT-01','Pemahaman terhadap materi','Menjelaskan gagasan utama materi dengan kata sendiri.','Menilai ketepatan peserta memahami konsep pokok tanpa hanya mengulang istilah.','Penjelasan lisan/tulisan, jawaban, rangkuman, atau hasil tugas yang menunjukkan konsep.','Tanya jawab, diskusi, atau telaah tugas.','Catat konsep yang dijelaskan dan contoh yang dipakai; bedakan salah paham dari belum mendapat kesempatan.','INT',1),
  ('INT-02','Kemampuan berpikir kritis','Mengajukan pertanyaan dan menilai alasan atau bukti yang mendasari suatu gagasan.','Menilai penggunaan pertanyaan, alasan, dan bukti secara proporsional.','Pertanyaan relevan, pemeriksaan sumber/alasan, atau pembedaan fakta dan pendapat.','Diskusi kasus, tanya jawab, atau analisis bacaan.','Simpan pertanyaan/alasan spesifik; jangan menyamakan ketidaksetujuan dengan berpikir kritis.','INT',2),
  ('INT-03','Kemampuan menyampaikan argumentasi','Menyampaikan pendapat beserta alasan dan contoh yang berkaitan dengan isu.','Menilai keterhubungan pendapat, alasan, contoh, serta respons terhadap pertanyaan.','Pernyataan posisi, alasan, contoh/bukti, dan tanggapan terhadap pandangan lain.','Diskusi, presentasi, debat terarah, atau tulisan.','Nilai isi dan penalaran, bukan kefasihan, volume suara, atau gaya bicara.','INT',3),
  ('INT-04','Kemampuan menganalisis persoalan kontekstual','Menghubungkan konsep materi dengan faktor dan keadaan pada persoalan nyata.','Menilai kemampuan menerapkan konsep dengan memperhatikan konteks dan penyebab.','Identifikasi masalah, faktor penyebab, pihak terdampak, dan hubungan dengan konsep.','Studi kasus, analisis sosial, atau diskusi kontekstual.','Catat unsur konteks yang digunakan; hindari kesimpulan umum tanpa data kasus.','INT',4),
  ('INT-05','Kemampuan merumuskan alternatif solusi','Mengusulkan pilihan tindakan yang relevan dan dapat dipertimbangkan untuk suatu persoalan.','Menilai relevansi, kelayakan, alasan, dan dampak dari alternatif solusi.','Langkah yang diusulkan, alasan, kebutuhan sumber daya, dan pihak yang terdampak.','Pemecahan masalah, simulasi, atau tugas kelompok.','Catat solusi dan dasar pertimbangannya; jangan menilai hanya dari banyaknya ide.','INT',5),
  ('REL-01','Pemahaman nilai-nilai Islam','Menjelaskan nilai atau konsep Islam yang menjadi pokok pembahasan materi.','Menilai pemahaman materi berdasarkan penjelasan atau rujukan yang dibahas.','Makna nilai, alasan, rujukan materi, atau hubungan antargagasan yang dijelaskan.','Tanya jawab, diskusi, refleksi materi, atau tugas.','Gunakan materi sebagai acuan; jangan menyimpulkan kadar iman atau kesalehan pribadi.','REL',6),
  ('REL-02','Kemampuan melakukan refleksi spiritual','Mengaitkan materi dengan refleksi pribadi secara sukarela dan sesuai batas privasi peserta.','Menilai kemampuan merefleksikan gagasan/nilai, bukan isi keyakinan pribadi.','Refleksi yang peserta pilih untuk disampaikan dan kaitannya dengan materi.','Refleksi tertulis atau berbagi sukarela.','Jangan memberi skor rendah pada peserta yang memilih tidak membuka pengalaman pribadi; gunakan N/O bila tidak ada bukti yang layak.','REL',7),
  ('REL-03','Penerapan akhlak dalam interaksi','Menunjukkan sikap menghormati, jujur, santun, dan bertanggung jawab pada interaksi yang diamati.','Menilai perilaku interaksi yang nyata dan relevan selama kegiatan.','Cara menyimak, menyampaikan pendapat, mengakui kesalahan, dan memperlakukan orang lain.','Observasi interaksi diskusi dan kerja kelompok.','Catat perilaku spesifik dan konteksnya; hindari penilaian berdasarkan prasangka.','REL',8),
  ('REL-04','Kemampuan menghubungkan nilai Islam dengan kehidupan','Memberi alasan atau contoh penerapan nilai yang dibahas pada situasi kehidupan.','Menilai kemampuan menjelaskan hubungan nilai dan pilihan tindakan.','Contoh situasi, nilai yang terkait, dan alasan tindakan yang dipilih.','Studi kasus, diskusi, atau refleksi sukarela.','Fokus pada penalaran dan contoh; tidak menilai identitas/keyakinan dari jawaban personal.','REL',9),
  ('HUM-01','Empati terhadap orang lain','Mendengarkan dan merespons perspektif atau kebutuhan orang lain dengan hormat.','Menilai kesediaan memahami perspektif dan kualitas respons yang tampak.','Menyimak, mengklarifikasi kebutuhan, atau merespons tanpa meremehkan.','Observasi diskusi dan simulasi perspektif.','Catat ucapan/tindakan dan situasi; jangan menyimpulkan sifat tetap dari satu kejadian.','HUM',10),
  ('HUM-02','Solidaritas','Memberi dukungan yang sesuai terhadap kebutuhan atau tujuan bersama.','Menilai tindakan dukungan yang disepakati dan proporsional.','Membantu tugas, berbagi sumber daya, atau menindaklanjuti kebutuhan kelompok.','Observasi kerja kelompok atau kegiatan bersama.','Catat bentuk dukungan dan kebutuhan yang ditanggapi; pertimbangkan pembagian peran.','HUM',11),
  ('HUM-03','Kepedulian sosial','Mengenali persoalan sosial, pihak terdampak, atau kebutuhan masyarakat secara kontekstual.','Menilai perhatian peserta pada dampak sosial berbasis informasi yang tersedia.','Identifikasi kelompok terdampak, kebutuhan, dan faktor lingkungan.','Analisis kasus, diskusi, atau pemetaan masalah.','Catat bukti konteks yang dipakai dan hindari generalisasi terhadap kelompok masyarakat.','HUM',12),
  ('HUM-04','Kemampuan bekerja sama','Berbagi peran dan menjaga koordinasi untuk menyelesaikan pekerjaan bersama.','Menilai kontribusi pada proses kerja tim, termasuk dukungan dan serah-terima tugas.','Kesepakatan peran, komunikasi perkembangan, bantuan, atau penyelesaian bagian tugas.','Observasi kerja kelompok atau proyek kecil.','Gunakan bukti proses dan hasil; jangan menyamakan peran yang berbeda dengan kontribusi yang lebih rendah.','HUM',13),
  ('HUM-05','Menghargai perbedaan','Menanggapi perbedaan pendapat atau pengalaman tanpa merendahkan pihak lain.','Menilai keterbukaan dialog dan sikap hormat terhadap perspektif berbeda.','Mendengarkan, bertanya untuk memahami, menyampaikan ketidaksetujuan dengan hormat.','Diskusi kelompok atau studi kasus beragam perspektif.','Catat interaksi spesifik; jangan menuntut peserta menyetujui semua pendapat.','HUM',14),
  ('PAR-01','Keaktifan dalam diskusi','Memberi kontribusi relevan melalui bicara, tulisan, pertanyaan, atau peran lain.','Menilai kontribusi pada diskusi melalui beragam kanal, bukan frekuensi bicara saja.','Pertanyaan, catatan, rangkuman, tanggapan, atau dukungan proses diskusi.','Observasi diskusi dan hasil kerja.','Periksa kesempatan dan akses berkontribusi; peserta yang tidak banyak bicara tidak otomatis rendah.','PAR',15),
  ('PAR-02','Inisiatif dalam kegiatan','Memulai langkah yang diperlukan dan sesuai tujuan tanpa menunggu arahan berulang.','Menilai ketepatan dan relevansi inisiatif terhadap kebutuhan kegiatan.','Mengusulkan langkah, menyiapkan kebutuhan, atau mengatasi hambatan dalam kewenangan.','Observasi kegiatan, simulasi, atau kerja kelompok.','Catat konteks, tindakan, dan dampak; bedakan inisiatif dari tindakan di luar kesepakatan.','PAR',16),
  ('PAR-03','Kemampuan komunikasi','Menyampaikan dan menerima pesan secara jelas serta sesuai konteks kegiatan.','Menilai kejelasan dan respons dua arah tanpa bias terhadap gaya komunikasi tertentu.','Menyampaikan inti, menyimak, mengklarifikasi, dan menanggapi secara relevan.','Diskusi, presentasi, koordinasi tugas, atau komunikasi tertulis.','Gunakan contoh pesan dan situasi; pertimbangkan aksesibilitas dan kesempatan.','PAR',17),
  ('PAR-04','Kontribusi terhadap kelompok','Memberi gagasan atau hasil kerja yang mendukung tujuan kelompok.','Menilai kegunaan dan ketuntasan kontribusi terhadap hasil bersama.','Bagian tugas, bahan, gagasan, atau bantuan yang digunakan tim.','Tugas kelompok atau pemecahan masalah.','Catat kontribusi spesifik dan bagaimana dipakai; jangan hanya menghitung jumlah bicara.','PAR',18),
  ('PAR-05','Kolaborasi dalam menyelesaikan tugas','Mengintegrasikan peran dan masukan anggota untuk menuntaskan tugas bersama.','Menilai koordinasi, integrasi kontribusi, dan penyelesaian hasil kelompok.','Menyepakati langkah, menghubungkan bagian kerja, dan menindaklanjuti hambatan.','Simulasi, proyek/tugas kelompok, atau refleksi proses tim.','Catat proses kolaborasi dan hasil; bedakan kolaborasi dari sekadar berada di kelompok.','PAR',19),
  ('DIS-01','Ketepatan waktu','Mengikuti waktu yang disepakati atau mengomunikasikan kendala secara wajar.','Menilai kepatuhan pada jadwal dengan mempertimbangkan kendala yang disampaikan.','Kehadiran, ketepatan menyerahkan tugas, dan pemberitahuan jika terlambat.','Rekap jadwal kegiatan dan observasi penyerahan tugas.','Gunakan data waktu yang benar; jangan menganggap kendala yang telah dikomunikasikan sebagai ketidakpedulian.','DIS',20),
  ('DIS-02','Tanggung jawab terhadap tugas','Menuntaskan peran yang disepakati atau mengatur komunikasi dan tindak lanjut saat terkendala.','Menilai kepemilikan tugas, mutu penyelesaian, dan tindak lanjut.','Penyelesaian tugas, laporan kemajuan, komunikasi risiko, atau serah-terima.','Pemantauan tugas kelompok atau tanggung jawab kegiatan.','Catat kesepakatan awal, dukungan yang tersedia, dan hasil tindak lanjut.','DIS',21),
  ('DIS-03','Kepatuhan terhadap kesepakatan teknis','Mengikuti aturan teknis yang telah dijelaskan dan relevan dengan kegiatan.','Menilai penerapan kesepakatan untuk kelancaran dan keselamatan bersama.','Mengikuti instruksi teknis, menjaga perlengkapan, dan merespons pengingat.','Observasi prosedur kegiatan atau simulasi.','Nilai hanya aturan yang sudah disampaikan, relevan, dan dapat dilakukan peserta.','DIS',22),
  ('DIS-04','Konsistensi mengikuti kegiatan','Mengikuti rangkaian kegiatan atau mengomunikasikan alasan dan tindak lanjut bila berhalangan.','Menilai kesinambungan partisipasi dan tanggung jawab pada materi yang terlewat.','Kehadiran, keterlibatan lintas sesi, dan usaha mengejar informasi yang tertinggal.','Rekap kehadiran dan observasi lintas sesi.','Periksa konteks izin/kendala; gunakan N/O jika data lintas sesi belum tersedia.','DIS',23),
  ('KOM-01','Refleksi diri','Mengidentifikasi pengalaman, pembelajaran, kekuatan, atau kebutuhan pengembangan diri dengan contoh.','Menilai refleksi yang spesifik dan berangkat dari bukti pengalaman.','Contoh peristiwa, makna yang ditarik, dan hal yang ingin dipertahankan/diperbaiki.','Refleksi tertulis atau percakapan reflektif.','Gunakan isi yang disampaikan sukarela; jangan menyimpulkan kondisi pribadi yang tidak diungkapkan.','KOM',24),
  ('KOM-02','Kesadaran terhadap proses perkaderan','Menjelaskan tujuan proses belajar/perkaderan dan peran dirinya secara realistis.','Menilai pemahaman hubungan proses, tujuan, tanggung jawab, dan kapasitas diri.','Penjelasan tujuan, tahapan proses, dan kontribusi yang dapat dijalankan.','Diskusi, refleksi, atau tugas pemahaman.','Nilai pemahaman terhadap materi; tidak menganggap satu pandangan sebagai standar resmi tanpa pedoman.','KOM',25),
  ('KOM-03','Inisiatif untuk terus berproses','Mengusulkan langkah belajar atau kontribusi lanjutan yang sesuai minat dan kapasitas.','Menilai kesiapan merencanakan proses lanjut secara mandiri dan realistis.','Pilihan kegiatan/belajar, alasan, kebutuhan dukungan, atau langkah awal.','Refleksi akhir, percakapan, atau rencana sederhana.','Jangan memberi nilai rendah karena pilihan jalur berbeda; lihat alasan dan kelayakan langkah.','KOM',26),
  ('KOM-04','Kemampuan menyusun rencana tindak lanjut','Menyusun tindakan lanjutan yang spesifik, realistis, dan dapat ditinjau kembali.','Menilai kejelasan tindakan, waktu, dukungan, dan cara memeriksa kemajuan.','Target, langkah, waktu, sumber dukungan, kemungkinan hambatan, dan indikator kemajuan.','Lembar rencana tindak lanjut atau presentasi singkat.','Nilai mutu rencana, bukan janji hasil; rencana boleh direvisi sesuai keadaan.','KOM',27)
) as seed(code,name,description,objective,behaviors,method,evidence,aspect_code,position)
where framework.code = 'DAD_IMM' and version.version = 1
on conflict (framework_version_id, code) do nothing;

insert into public.competency_indicator_aspects(framework_version_id, indicator_id, aspect_id)
select version.id, indicator.id, aspect.id
from public.competency_frameworks framework
join public.competency_framework_versions version on version.framework_id = framework.id and version.version = 1
join public.competency_indicators indicator on indicator.framework_version_id = version.id
join public.competency_aspects aspect on aspect.framework_version_id = version.id and aspect.code = left(indicator.code, position('-' in indicator.code) - 1)
where framework.code = 'DAD_IMM'
on conflict (indicator_id, aspect_id) do nothing;

-- Validasi seed saat migrasi berjalan agar data parsial tidak lolos diam-diam.
do $$
declare framework_version uuid; aspect_count integer; indicator_count integer; mapping_count integer; aspect_weight_total numeric;
begin
  select version.id into framework_version from public.competency_frameworks framework
  join public.competency_framework_versions version on version.framework_id = framework.id and version.version = 1
  where framework.code = 'DAD_IMM';
  select count(*), coalesce(sum(weight), 0) into aspect_count, aspect_weight_total
  from public.competency_aspects where framework_version_id = framework_version;
  select count(*) into indicator_count from public.competency_indicators where framework_version_id = framework_version;
  select count(*) into mapping_count from public.competency_indicator_aspects where framework_version_id = framework_version;
  if aspect_count <> 6 then raise exception 'DAD trial harus memiliki tepat 6 aspek; ditemukan %.', aspect_count; end if;
  if indicator_count <> 27 then raise exception 'DAD trial harus memiliki tepat 27 indikator; ditemukan %.', indicator_count; end if;
  if mapping_count <> 27 then raise exception 'Setiap indikator trial harus terhubung ke satu aspek; ditemukan % relasi.', mapping_count; end if;
  if abs(aspect_weight_total - 100) >= 0.001 then raise exception 'Total bobot aspek DAD trial harus 100; ditemukan %.', aspect_weight_total; end if;
  if exists (select 1 from public.competency_indicators indicator where indicator.framework_version_id = framework_version and not exists (select 1 from public.competency_indicator_aspects mapping where mapping.indicator_id = indicator.id)) then
    raise exception 'Ditemukan indikator DAD trial tanpa aspek.';
  end if;
  if exists (select 1 from public.competency_indicator_aspects mapping where mapping.framework_version_id = framework_version and mapping.indicator_id not in (select id from public.competency_indicators where framework_version_id = framework_version)) then
    raise exception 'Ditemukan relasi indikator-aspek lintas framework.';
  end if;
end;
$$;

comment on table public.competency_frameworks is 'Master kerangka kompetensi yang dibedakan dari snapshot rubric_versions.';
comment on table public.competency_framework_versions is 'Versi master framework; DAD v1 berstatus trial dan bukan standar resmi.';
comment on table public.competency_aspects is 'Master aspek kompetensi dengan bobot pada versi framework.';
comment on table public.competency_indicators is 'Bank indikator terstruktur beserta tujuan ukur, perilaku, metode, dan panduan bukti.';
comment on table public.competency_indicator_aspects is 'Relasi indikator-aspek; mendukung lebih dari satu aspek pada pengembangan berikutnya.';
