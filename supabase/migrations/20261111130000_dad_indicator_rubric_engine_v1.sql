-- Phase 3: versioned master rubrics and five behavioral anchors per DAD indicator.
-- This is a read-only trial rubric library. Approval workflow is intentionally omitted
-- per the agreed product decision; published here means usable as a master snapshot.

create table if not exists public.competency_indicator_rubrics (
  id uuid primary key default gen_random_uuid(),
  framework_version_id uuid not null,
  indicator_id uuid not null,
  code text not null unique check (code ~ '^DAD-[A-Z]{2,8}-[0-9]{2,3}$'),
  title text not null,
  created_at timestamptz not null default now(),
  foreign key (indicator_id, framework_version_id)
    references public.competency_indicators(id, framework_version_id) on delete restrict,
  unique (framework_version_id, indicator_id),
  unique (id, framework_version_id),
  unique (id, indicator_id, framework_version_id)
);

create table if not exists public.competency_indicator_rubric_versions (
  id uuid primary key default gen_random_uuid(),
  framework_version_id uuid not null,
  rubric_id uuid not null,
  indicator_id uuid not null,
  version integer not null check (version > 0),
  status text not null check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  source_note text not null,
  foreign key (rubric_id, indicator_id, framework_version_id)
    references public.competency_indicator_rubrics(id, indicator_id, framework_version_id) on delete restrict,
  unique (rubric_id, version),
  unique (id, framework_version_id),
  unique (id, indicator_id)
);
create unique index if not exists competency_indicator_rubrics_one_published_version
  on public.competency_indicator_rubric_versions(rubric_id) where status = 'published';

create table if not exists public.rubric_behavioral_anchors (
  id uuid primary key default gen_random_uuid(),
  rubric_version_id uuid not null references public.competency_indicator_rubric_versions(id) on delete restrict,
  score smallint not null check (score between 1 and 5),
  label text not null check (label = case score
    when 1 then 'Sangat Kurang' when 2 then 'Kurang' when 3 then 'Cukup'
    when 4 then 'Baik' when 5 then 'Sangat Baik' end),
  description text not null check (char_length(trim(description)) between 10 and 700),
  unique (rubric_version_id, score)
);
create index if not exists rubric_behavioral_anchors_version_score_idx
  on public.rubric_behavioral_anchors(rubric_version_id, score);

-- Event-specific assessment indicators retain a direct reference to the exact master rubric version used.
alter table public.rubric_indicators
  add column if not exists competency_indicator_rubric_version_id uuid;
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.rubric_indicators'::regclass and conname = 'rubric_indicators_master_reference_pair_check') then
    alter table public.rubric_indicators add constraint rubric_indicators_master_reference_pair_check
      check ((competency_indicator_id is null and competency_indicator_rubric_version_id is null)
        or (competency_indicator_id is not null and competency_indicator_rubric_version_id is not null));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.rubric_indicators'::regclass and conname = 'rubric_indicators_master_version_indicator_fk') then
    alter table public.rubric_indicators add constraint rubric_indicators_master_version_indicator_fk
      foreign key (competency_indicator_rubric_version_id, competency_indicator_id)
      references public.competency_indicator_rubric_versions(id, indicator_id) on delete restrict;
  end if;
end;
$$;
create index if not exists rubric_indicators_master_rubric_version_idx
  on public.rubric_indicators(competency_indicator_rubric_version_id)
  where competency_indicator_rubric_version_id is not null;

alter table public.competency_indicator_rubrics enable row level security;
alter table public.competency_indicator_rubric_versions enable row level security;
alter table public.rubric_behavioral_anchors enable row level security;
drop policy if exists competency_indicator_rubrics_read_assessment_staff on public.competency_indicator_rubrics;
create policy competency_indicator_rubrics_read_assessment_staff on public.competency_indicator_rubrics
for select to authenticated using (exists (
  select 1 from public.profiles profile where profile.id = (select auth.uid())
    and profile.role in ('admin_system', 'bidang_kader', 'observer', 'instruktur')
));
drop policy if exists competency_indicator_rubric_versions_read_assessment_staff on public.competency_indicator_rubric_versions;
create policy competency_indicator_rubric_versions_read_assessment_staff on public.competency_indicator_rubric_versions
for select to authenticated using (exists (
  select 1 from public.profiles profile where profile.id = (select auth.uid())
    and profile.role in ('admin_system', 'bidang_kader', 'observer', 'instruktur')
));
drop policy if exists rubric_behavioral_anchors_read_assessment_staff on public.rubric_behavioral_anchors;
create policy rubric_behavioral_anchors_read_assessment_staff on public.rubric_behavioral_anchors
for select to authenticated using (exists (
  select 1 from public.profiles profile where profile.id = (select auth.uid())
    and profile.role in ('admin_system', 'bidang_kader', 'observer', 'instruktur')
));
grant select on public.competency_indicator_rubrics,
  public.competency_indicator_rubric_versions, public.rubric_behavioral_anchors to authenticated;
revoke insert, update, delete, truncate, references, trigger on public.competency_indicator_rubrics,
  public.competency_indicator_rubric_versions, public.rubric_behavioral_anchors from anon, authenticated;

insert into public.competency_indicator_rubrics(framework_version_id, indicator_id, code, title)
select indicator.framework_version_id, indicator.id,
  'DAD-' || indicator.code, indicator.name
from public.competency_frameworks framework
join public.competency_framework_versions version on version.framework_id = framework.id and version.version = 1
join public.competency_indicators indicator on indicator.framework_version_id = version.id
where framework.code = 'DAD_IMM'
on conflict (framework_version_id, indicator_id) do nothing;

insert into public.competency_indicator_rubric_versions(framework_version_id, rubric_id, indicator_id, version, status, source_note)
select rubric.framework_version_id, rubric.id, rubric.indicator_id, 1, 'published',
  'Rubrik perilaku trial DAD v1; bukan standar resmi dan belum menggunakan alur approval aplikasi.'
from public.competency_indicator_rubrics rubric
join public.competency_framework_versions version on version.id = rubric.framework_version_id and version.version = 1
join public.competency_frameworks framework on framework.id = version.framework_id
where framework.code = 'DAD_IMM'
on conflict (rubric_id, version) do nothing;

insert into public.rubric_behavioral_anchors(rubric_version_id, score, label, description)
select rubric_version.id, anchor.score, anchor.label, anchor.description
from public.competency_frameworks framework
join public.competency_framework_versions framework_version on framework_version.framework_id = framework.id and framework_version.version = 1
cross join (values
 ('INT-01',1,'Sangat Kurang','Belum dapat menyebut gagasan utama materi meski telah mendapat kesempatan dan pertanyaan bantu.'),('INT-01',2,'Kurang','Menyebut beberapa istilah materi, tetapi penjelasan konsep masih keliru atau terpisah.'),('INT-01',3,'Cukup','Menjelaskan gagasan utama secara sederhana dengan sebagian besar konsep pokok tepat.'),('INT-01',4,'Baik','Menjelaskan gagasan utama dengan kata sendiri dan memberi contoh yang sesuai pembahasan.'),('INT-01',5,'Sangat Baik','Menguraikan konsep secara akurat, menghubungkan bagian materi, dan menerapkannya pada konteks baru.'),
 ('INT-02',1,'Sangat Kurang','Belum mengidentifikasi persoalan atau alasan yang dibahas meski tersedia kesempatan dan arahan.'),('INT-02',2,'Kurang','Mengenali persoalan tetapi belum memeriksa asumsi, alasan, atau bukti yang mendukungnya.'),('INT-02',3,'Cukup','Mengajukan pertanyaan atau alasan sederhana yang relevan terhadap persoalan.'),('INT-02',4,'Baik','Memeriksa alasan atau bukti dan membedakan fakta dari pendapat pada contoh yang dibahas.'),('INT-02',5,'Sangat Baik','Membandingkan beberapa alasan dan bukti, lalu menyimpulkan secara terukur beserta keterbatasan informasi.'),
 ('INT-03',1,'Sangat Kurang','Pendapat belum tersampaikan atau tidak berkaitan dengan isu meski telah diberi kesempatan.'),('INT-03',2,'Kurang','Menyampaikan pendapat, tetapi alasan yang mendukungnya belum dapat dikenali atau relevan.'),('INT-03',3,'Cukup','Memberi pendapat dengan satu alasan sederhana yang berkaitan dengan isu.'),('INT-03',4,'Baik','Menyusun alasan dan contoh relevan serta menanggapi pertanyaan yang diajukan.'),('INT-03',5,'Sangat Baik','Menyampaikan argumen runtut berbasis bukti dan menanggapi pandangan berbeda secara adil.'),
 ('INT-04',1,'Sangat Kurang','Belum menghubungkan konsep materi dengan persoalan nyata yang menjadi bahan latihan.'),('INT-04',2,'Kurang','Menyebut persoalan nyata tetapi hubungan dengan konsep masih tidak tepat atau tidak jelas.'),('INT-04',3,'Cukup','Menunjukkan satu hubungan sederhana antara konsep materi dan kondisi pada kasus.'),('INT-04',4,'Baik','Menjelaskan hubungan konsep dengan penyebab atau keadaan kontekstual secara masuk akal.'),('INT-04',5,'Sangat Baik','Menganalisis beberapa faktor konteks dan batas penerapan konsep dengan bukti yang relevan.'),
 ('INT-05',1,'Sangat Kurang','Belum mengusulkan langkah penyelesaian meski masalah dan tugas telah dijelaskan.'),('INT-05',2,'Kurang','Mengusulkan langkah, tetapi belum terkait penyebab masalah atau sulit dilakukan.'),('INT-05',3,'Cukup','Mengusulkan satu alternatif yang cukup relevan dengan masalah yang dibahas.'),('INT-05',4,'Baik','Mengusulkan solusi yang realistis dengan alasan dan pihak terkait yang jelas.'),('INT-05',5,'Sangat Baik','Membandingkan alternatif, dampak, sumber daya, dan risiko sebelum memilih langkah layak.'),
 ('REL-01',1,'Sangat Kurang','Belum dapat menjelaskan nilai atau konsep Islam yang menjadi pokok materi.'),('REL-01',2,'Kurang','Menyebut istilah nilai Islam tetapi makna yang dijelaskan belum tepat.'),('REL-01',3,'Cukup','Menjelaskan makna dasar nilai yang dibahas dengan sebagian besar pemahaman tepat.'),('REL-01',4,'Baik','Menjelaskan nilai secara tepat disertai alasan atau rujukan yang sesuai materi.'),('REL-01',5,'Sangat Baik','Menguraikan makna, konteks, dan hubungan antarnilai menggunakan rujukan relevan.'),
 ('REL-02',1,'Sangat Kurang','Belum menyampaikan refleksi yang dipilihnya; diam atau menjaga privasi bukan dasar skor rendah.'),('REL-02',2,'Kurang','Refleksi sukarela masih berupa pernyataan umum dan belum terkait pembelajaran.'),('REL-02',3,'Cukup','Menyebut satu hal yang dipikirkan setelah materi dan kaitan dasarnya.'),('REL-02',4,'Baik','Menghubungkan materi dengan pengalaman atau pilihan diri secara jelas dan sukarela.'),('REL-02',5,'Sangat Baik','Merefleksikan pengalaman, pertanyaan, dan langkah pribadi secara mendalam tanpa klaim tentang kadar iman.'),
 ('REL-03',1,'Sangat Kurang','Interaksi teramati berulang melanggar kesepakatan hormat setelah arahan yang jelas.'),('REL-03',2,'Kurang','Sikap menghormati atau kejujuran dalam interaksi belum konsisten dan masih perlu beberapa pengingat.'),('REL-03',3,'Cukup','Umumnya santun dan jujur pada interaksi yang diamati, dengan beberapa ketidakkonsistenan.'),('REL-03',4,'Baik','Konsisten menyimak, menyampaikan pendapat santun, dan menghormati pihak lain.'),('REL-03',5,'Sangat Baik','Menjaga martabat pihak lain secara konsisten dan membantu suasana interaksi saling menghormati.'),
 ('REL-04',1,'Sangat Kurang','Belum memberi contoh penerapan nilai Islam pada situasi yang dibahas.'),('REL-04',2,'Kurang','Memberi contoh, tetapi hubungan antara nilai dan tindakan belum jelas.'),('REL-04',3,'Cukup','Menjelaskan satu penerapan sederhana yang cukup relevan dengan situasi.'),('REL-04',4,'Baik','Mengaitkan nilai dengan tindakan nyata beserta alasan yang sesuai pembahasan.'),('REL-04',5,'Sangat Baik','Membandingkan penerapan pada beberapa konteks dan menjelaskan pertimbangan serta dampaknya.'),
 ('HUM-01',1,'Sangat Kurang','Mengabaikan kebutuhan atau respons orang lain yang tampak dalam kegiatan meski sudah diarahkan.'),('HUM-01',2,'Kurang','Mendengarkan sebagian, tetapi kerap memotong atau meremehkan perspektif orang lain.'),('HUM-01',3,'Cukup','Memberi ruang bicara dan merespons kebutuhan yang disampaikan secara dasar.'),('HUM-01',4,'Baik','Mendengarkan aktif dan menanggapi perspektif atau kebutuhan dengan hormat.'),('HUM-01',5,'Sangat Baik','Memeriksa pemahaman, menyesuaikan respons, dan membantu suara yang belum terwakili didengar.'),
 ('HUM-02',1,'Sangat Kurang','Tidak menjalankan dukungan kelompok yang disepakati dan tidak mengomunikasikan kendala.'),('HUM-02',2,'Kurang','Memberi dukungan terbatas setelah beberapa arahan dan tindak lanjut belum tuntas.'),('HUM-02',3,'Cukup','Memberi dukungan pada sebagian kebutuhan bersama sesuai peran yang disepakati.'),('HUM-02',4,'Baik','Menjalankan dukungan dengan tepat waktu dan proporsional terhadap kebutuhan kelompok.'),('HUM-02',5,'Sangat Baik','Peka pada kebutuhan bersama, mengoordinasikan dukungan, dan menjaga pembagian bantuan tetap adil.'),
 ('HUM-03',1,'Sangat Kurang','Belum mengenali pihak terdampak pada persoalan sosial yang menjadi bahan pembahasan.'),('HUM-03',2,'Kurang','Menyebut pihak terdampak tetapi belum menjelaskan kebutuhan atau dampaknya.'),('HUM-03',3,'Cukup','Menjelaskan satu dampak sosial secara sederhana berdasarkan informasi kasus.'),('HUM-03',4,'Baik','Mengidentifikasi kelompok terdampak dan kebutuhan dengan merujuk informasi kasus.'),('HUM-03',5,'Sangat Baik','Menghubungkan dampak, penyebab, dan konteks dengan bukti tanpa menggeneralisasi kelompok.'),
 ('HUM-04',1,'Sangat Kurang','Tidak menjalankan peran kelompok dan tidak memberi kabar saat mengalami kendala.'),('HUM-04',2,'Kurang','Menjalankan sebagian peran, tetapi koordinasi atau bantuan masih sering perlu diarahkan.'),('HUM-04',3,'Cukup','Menuntaskan sebagian peran dan berkoordinasi ketika diminta.'),('HUM-04',4,'Baik','Berbagi peran, menyampaikan perkembangan, dan membantu kelancaran kerja tim.'),('HUM-04',5,'Sangat Baik','Menjaga koordinasi inklusif, menyesuaikan pembagian peran, dan membantu tim menuntaskan hasil.'),
 ('HUM-05',1,'Sangat Kurang','Merendahkan atau menolak perspektif berbeda tanpa memberi ruang untuk didengar.'),('HUM-05',2,'Kurang','Mendengar pandangan berbeda tetapi merespons defensif atau menyamaratakan.'),('HUM-05',3,'Cukup','Menyatakan perbedaan pendapat secara cukup sopan.'),('HUM-05',4,'Baik','Menanggapi perbedaan secara terbuka dan menjaga rasa hormat.'),('HUM-05',5,'Sangat Baik','Menggali alasan berbeda, mencari titik temu, dan menjaga ruang dialog yang aman.'),
 ('PAR-01',1,'Sangat Kurang','Belum memberi kontribusi melalui kanal yang tersedia meski kesempatan dan dukungan cukup.'),('PAR-01',2,'Kurang','Kontribusi masih sangat terbatas atau belum berkaitan dengan tujuan diskusi.'),('PAR-01',3,'Cukup','Memberi satu kontribusi relevan melalui bicara, tulisan, pertanyaan, atau peran lain.'),('PAR-01',4,'Baik','Berkontribusi relevan dan menanggapi perkembangan diskusi.'),('PAR-01',5,'Sangat Baik','Membantu diskusi maju dengan kontribusi bermakna serta membuka ruang bagi peserta lain.'),
 ('PAR-02',1,'Sangat Kurang','Belum memulai tindakan pada kebutuhan kegiatan yang menjadi tanggung jawabnya.'),('PAR-02',2,'Kurang','Memulai setelah arahan berulang dan belum menjaga tindak lanjut.'),('PAR-02',3,'Cukup','Mengambil satu inisiatif sederhana setelah memahami tujuan kegiatan.'),('PAR-02',4,'Baik','Memulai langkah yang diperlukan dan mengomunikasikannya kepada kelompok.'),('PAR-02',5,'Sangat Baik','Mengantisipasi kebutuhan, mengoordinasikan inisiatif, dan memeriksa dampaknya pada tujuan.'),
 ('PAR-03',1,'Sangat Kurang','Pesan tugas tidak tersampaikan atau tidak memberi ruang respons meski tersedia dukungan.'),('PAR-03',2,'Kurang','Sebagian pesan dipahami, tetapi kurang jelas atau kurang menanggapi lawan bicara.'),('PAR-03',3,'Cukup','Menyampaikan inti pesan secara sederhana dan merespons pertanyaan dasar.'),('PAR-03',4,'Baik','Menyampaikan pesan jelas, sesuai konteks, dan menanggapi dengan relevan.'),('PAR-03',5,'Sangat Baik','Menyesuaikan komunikasi, memastikan pemahaman, dan memfasilitasi pertukaran dua arah.'),
 ('PAR-04',1,'Sangat Kurang','Belum menyelesaikan kontribusi yang telah disepakati untuk tujuan kelompok.'),('PAR-04',2,'Kurang','Kontribusi terbatas atau terlambat dan belum membantu kebutuhan utama kelompok.'),('PAR-04',3,'Cukup','Memberi kontribusi yang mendukung sebagian tugas kelompok.'),('PAR-04',4,'Baik','Menghasilkan kontribusi tepat guna yang membantu capaian kelompok.'),('PAR-04',5,'Sangat Baik','Memberi kontribusi bermutu dan membantu mengintegrasikan hasil kerja anggota lain.'),
 ('PAR-05',1,'Sangat Kurang','Belum berkoordinasi dengan anggota lain dalam penyelesaian tugas kelompok.'),('PAR-05',2,'Kurang','Koordinasi terbatas sehingga pembagian langkah atau hasil bersama belum jelas.'),('PAR-05',3,'Cukup','Menjalankan bagian tugas dan menyepakati langkah dasar dengan kelompok.'),('PAR-05',4,'Baik','Mengintegrasikan peran dan menjaga koordinasi hingga tugas selesai.'),('PAR-05',5,'Sangat Baik','Membangun proses kolaborasi inklusif, mengatasi hambatan, dan mengevaluasi hasil bersama.'),
 ('DIS-01',1,'Sangat Kurang','Berulang kali melewati waktu yang disepakati tanpa pemberitahuan atau keterangan.'),('DIS-01',2,'Kurang','Beberapa kali terlambat dan komunikasi tentang kendala belum memadai.'),('DIS-01',3,'Cukup','Umumnya mengikuti waktu dan mengomunikasikan kendala yang terjadi.'),('DIS-01',4,'Baik','Tepat waktu atau memberi kabar kendala secara wajar dan bertanggung jawab.'),('DIS-01',5,'Sangat Baik','Konsisten menjaga waktu dan membantu koordinasi jadwal tanpa menghakimi kendala orang lain.'),
 ('DIS-02',1,'Sangat Kurang','Tugas tidak ditindaklanjuti dan tidak ada komunikasi tentang kendala yang dihadapi.'),('DIS-02',2,'Kurang','Menyelesaikan sebagian kecil tugas setelah beberapa kali diingatkan.'),('DIS-02',3,'Cukup','Menyelesaikan tugas dasar atau melaporkan kendala kepada pihak terkait.'),('DIS-02',4,'Baik','Menuntaskan tugas sesuai kesepakatan atau mengatur tindak lanjut yang jelas.'),('DIS-02',5,'Sangat Baik','Menjaga mutu tugas, mengomunikasikan risiko lebih awal, dan memastikan serah-terima tuntas.'),
 ('DIS-03',1,'Sangat Kurang','Mengabaikan aturan teknis penting setelah penjelasan dan pengingat yang memadai.'),('DIS-03',2,'Kurang','Mematuhi sebagian aturan tetapi berulang kali masih memerlukan pengingat.'),('DIS-03',3,'Cukup','Mengikuti aturan pokok setelah arahan diberikan.'),('DIS-03',4,'Baik','Konsisten mengikuti kesepakatan teknis yang telah dijelaskan.'),('DIS-03',5,'Sangat Baik','Mematuhi aturan dan membantu mengingatkan secara santun sambil memahami tujuannya.'),
 ('DIS-04',1,'Sangat Kurang','Tidak mengikuti sebagian besar rangkaian dan tidak menyampaikan kendala yang relevan.'),('DIS-04',2,'Kurang','Kehadiran atau keterlibatan tidak konsisten dengan komunikasi yang terbatas.'),('DIS-04',3,'Cukup','Mengikuti sebagian besar rangkaian atau menyampaikan kendala yang terjadi.'),('DIS-04',4,'Baik','Konsisten mengikuti rangkaian dan memberi kabar bila berhalangan.'),('DIS-04',5,'Sangat Baik','Konsisten terlibat, menindaklanjuti materi terlewat, dan mengomunikasikan hambatan.'),
 ('KOM-01',1,'Sangat Kurang','Belum mengidentifikasi pengalaman atau pembelajaran diri meski tersedia panduan refleksi.'),('KOM-01',2,'Kurang','Menyebut pengalaman tetapi belum menjelaskan makna atau hal yang dipelajari.'),('KOM-01',3,'Cukup','Menyebut satu pembelajaran dan satu hal yang ingin diperbaiki.'),('KOM-01',4,'Baik','Menghubungkan pengalaman dengan kekuatan serta area pengembangan yang spesifik.'),('KOM-01',5,'Sangat Baik','Merefleksikan pola dan bukti pengalaman lalu merumuskan langkah perbaikan realistis.'),
 ('KOM-02',1,'Sangat Kurang','Belum menjelaskan hubungan kegiatan dengan proses belajar atau perkaderan.'),('KOM-02',2,'Kurang','Menyebut tujuan umum tetapi belum mengaitkannya dengan peran diri.'),('KOM-02',3,'Cukup','Menjelaskan satu makna proses dan peran dasar dirinya.'),('KOM-02',4,'Baik','Menghubungkan proses, tujuan, dan tanggung jawab diri secara realistis.'),('KOM-02',5,'Sangat Baik','Menjelaskan tahapan belajar, kontribusi, dan batas kapasitas dengan pemahaman kontekstual.'),
 ('KOM-03',1,'Sangat Kurang','Belum mengusulkan langkah belajar atau kontribusi setelah kegiatan.'),('KOM-03',2,'Kurang','Langkah masih umum dan belum sesuai minat atau kapasitas yang disampaikan.'),('KOM-03',3,'Cukup','Menyebut satu langkah sederhana yang mungkin dilakukan.'),('KOM-03',4,'Baik','Mengusulkan langkah relevan beserta waktu atau dukungan yang dibutuhkan.'),('KOM-03',5,'Sangat Baik','Menetapkan langkah bertahap, sumber dukungan, dan cara meninjau kemajuan.'),
 ('KOM-04',1,'Sangat Kurang','Belum menyusun tindakan lanjutan meski mendapat panduan dan kesempatan.'),('KOM-04',2,'Kurang','Rencana masih berupa niat umum tanpa tindakan atau waktu yang jelas.'),('KOM-04',3,'Cukup','Menyebut tindakan dasar dengan perkiraan waktu pelaksanaan.'),('KOM-04',4,'Baik','Menyusun tindakan spesifik dan realistis beserta waktu pelaksanaan.'),('KOM-04',5,'Sangat Baik','Menyusun langkah terukur, dukungan, hambatan, dan cara mengevaluasi kemajuan.')
) as anchor(indicator_code,score,label,description)
join public.competency_indicators indicator on indicator.code = anchor.indicator_code and indicator.framework_version_id = framework_version.id
join public.competency_indicator_rubrics rubric on rubric.indicator_id = indicator.id
join public.competency_indicator_rubric_versions rubric_version on rubric_version.rubric_id = rubric.id and rubric_version.version = 1
where framework.code = 'DAD_IMM'
on conflict (rubric_version_id, score) do nothing;

do $$
declare framework_version uuid; rubric_count integer; rubric_version_count integer; anchor_count integer;
begin
  select version.id into framework_version from public.competency_frameworks framework
  join public.competency_framework_versions version on version.framework_id = framework.id and version.version = 1
  where framework.code = 'DAD_IMM';
  select count(*) into rubric_count from public.competency_indicator_rubrics where framework_version_id = framework_version;
  select count(*) into rubric_version_count from public.competency_indicator_rubric_versions where framework_version_id = framework_version and status = 'published';
  select count(*) into anchor_count from public.rubric_behavioral_anchors anchor
    join public.competency_indicator_rubric_versions version on version.id = anchor.rubric_version_id
    where version.framework_version_id = framework_version and version.status = 'published';
  if rubric_count <> 27 then raise exception 'Harus ada 27 rubrik indikator; ditemukan %.', rubric_count; end if;
  if rubric_version_count <> 27 then raise exception 'Harus ada 27 versi rubrik published; ditemukan %.', rubric_version_count; end if;
  if anchor_count <> 135 then raise exception 'Harus ada 135 behavioral anchors; ditemukan %.', anchor_count; end if;
  if exists (
    select 1 from public.competency_indicator_rubric_versions version
    join public.competency_indicator_rubrics rubric on rubric.id = version.rubric_id
    left join public.rubric_behavioral_anchors anchor on anchor.rubric_version_id = version.id
    where version.framework_version_id = framework_version and version.status = 'published'
    group by version.id, rubric.code having count(anchor.id) <> 5 or count(distinct anchor.score) <> 5
  ) then raise exception 'Setiap versi rubric published harus memiliki tepat lima skor unik.'; end if;
  if exists (
    select lower(trim(anchor.description))
    from public.rubric_behavioral_anchors anchor
    join public.competency_indicator_rubric_versions version on version.id = anchor.rubric_version_id
    where version.framework_version_id = framework_version and version.status = 'published'
    group by lower(trim(anchor.description)) having count(*) > 1
  ) then raise exception 'Anchor rubrik tidak boleh memakai deskripsi identik untuk indikator berbeda.'; end if;
end;
$$;

comment on table public.competency_indicator_rubrics is 'Rubrik master per indikator framework; terpisah dari salinan pada rubric_versions kegiatan.';
comment on table public.competency_indicator_rubric_versions is 'Versi rubrik master yang immutable untuk menjaga histori penilaian.';
comment on table public.rubric_behavioral_anchors is 'Lima anchor perilaku bernilai 1-5; N/O tetap status observasi dan bukan anchor.';
