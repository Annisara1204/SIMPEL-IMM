# Rencana Implementasi Keputusan Produk — Siklus 5

Status: **draft hasil revisi siklus 4**, hasil akhir loop plan → review → revision. Belum ada kode, migrasi, atau data yang diubah. Riwayat penilaian: `docs/REVIEW-SIKLUS-1.md` sampai `docs/REVIEW-SIKLUS-4.md`; potongan revisi: `docs/revisi-siklus{1,2,3,4}-{a,b,c}.md`.

Sumber keputusan: `docs/MATRIKS-KEPUTUSAN-PRODUK.md` (12 item terisi, including publish keras). Sumber kondisi: `docs/ALUR-PENILAIAN-KANONIK.md`, `docs/HASIL-UJI-BROWSER-DEV.md`, `docs/INVENTARIS-JALUR-LAMA.md`, `docs/MATRIKS-RPC-AKSES.md`, `docs/VERIFIKASI-PRODUKSI-YANG-BELUM-DILAKUKAN.md`, `docs/PETA-ALUR-PENILAIAN.md`.

**Instruksi pemilik 24 November 2026:** yang dilonggarkan hanya peringatan dan status sementara di aplikasi (tampilan coverage, peringatan moderasi, status Kirim/Buka kembali, teks UI). **Publish rapor, RLS, grant, filter akses, audit, rotasi kunci, dan 14 butir verifikasi produksi tetap keras.** Tidak ada snapshot provisional yang disimpan; provisional hanya penandaan draf/tampilan.

**Aturan prioritas:** rencana utama menang atas berkas revisi. `revisi-siklus3-b.md:30-34` tentang migrasi penandaan snapshot provisional dinyatakan **kedaluwarsa**; jangan dijalankan. Untuk keputusan produk, `MATRIKS-KEPUTUSAN-PRODUK.md` mengalahkan dokumen lama.

---

## 1. Keputusan yang diimplementasikan

| # | Keputusan | Area |
|---|---|---|
| 1 | Peserta: username + kata sandi sementara, kedaluwarsa, wajib ganti, dibuktikan lewat perubahan hash sandi di server | Akses |
| 2 | Skor 0–100 = `(skor aspek / 5) × bobot`; pratinjau Observasi diselaraskan | Skor |
| 3 | Gate "semua Observer submit" dihapus; coverage/moderasi jadi peringatan; publish tetap keras | Penilaian |
| 4 | N/O dibuang dari denominator coverage, minimal satu indikator berskor | Skor |
| 5 | Revisi rapor = nomor snapshot maksimum + 1 (jalur revisi `[TERBUKA-5]`) | Snapshot |
| 6 | Rekap Komisariat tanpa identitas; ambang 10 di RPC sebelum data ke browser | Akses/data |
| 7 | Impor `.xlsx`, riwayat dengan pilihan Admin, PDF browser tetap | Impor/rapor |
| 8 | Retensi data; backup harian + salinan `auth` | Data |
| 9 | Penerbit dan ekspor hanya Admin + empat subrole koordinator; Kader hanya rekap | Akses |
| 10 | Tidak ada fitur baru sebelum tinjauan selesai, lalu uji PROD diulang | Gate |
| 11 | Rubrik trial dibedakan dari rubrik resmi Koordinator Instruktur | Rubrik |
| 12 | "Selesai" Observer = status Submitted | Penilaian |

---

## 2. Road map dan gate

### Fase 0 — Prasyarat, read-only

Urutan: **persetujuan pemilik tercatat → Fase 0 baca → izin tertulis 0b → Fase 0b remediasi → gate keluar Fase 0.** Pemilik memutuskan tidak memakai nama penandatangan; persetujuan di `docs/PERSETUJUAN-OWNER-16-PERTANYAAN.md` menjadi bukti. Izin 0b diberikan setelah bukti baca Fase 0 lengkap.

Gate masuk: persetujuan pemilik sudah tercatat di dokumen persetujuan. Tidak ada kolom nama yang harus diisi (`AGENTS.md:19-21`).

Fase 0 read-only: baca commit, migrasi, env tanpa kunci, grant, log, `df -h`, baseline 5xx/502, isi daftar terbuka. Dilarang menulis ke PROD, memutar kunci, menghapus backup, memakai data nyata.

Bukti 14 butir (`VERIFIKASI:22-37`) adalah **nilai yang diharapkan, diisi setelah verifikasi**. Butir 11 monitoring tetap pemeriksaan baca Fase 0.

Gate keluar: 14 butir "sudah" dengan bukti, dengan butir domain dan TLS diganti catatan keputusan memakai IP; lima kontradiksi `VERIFIKASI:14-18` selesai; empat butir kritis dari 0b "sudah" dengan bukti; `[TERBUKA-2]` definisi kelompok diputus. Tidak ada tanda tangan nama. Uji alur penuh tetap di Fase 5.

### Fase 0b `[IZIN]` — remediasi produksi

Gate masuk: izin tertulis + bukti baca Fase 0 lengkap. Gate keluar: empat butir kritis "sudah" dengan bukti dan catatan pelaku. Urutan: izin → tindakan → bukti → catatan. Tidak ada tanda tangan nama.

| Kritis | Tindakan | Bukti |
|---|---|---|
| `disable_signup` (`VERIFIKASI:29`) | set `true` di Auth PROD | konfigurasi + tanggal; pendaftaran ditolak |
| grant `anon` (`:30`) | `revoke` SELECT di dua tabel moderasi | `role_table_grants` = 0 baris untuk `anon` |
| PAT + service-role (`:31`) | putar, `.env.production` mode 600, `pm2 restart --update-env`, cabut lama; sinkronkan cron backup | tertulis bertanggal + hash; kunci lama 401; uji restore cron exit 0 |
| domain + TLS (`:32`) | **Final: tidak dilakukan.** Pemilik memutuskan tetap memakai IP. 8080 dipertahankan | catatan keputusan di dokumen persetujuan; kredensial Peserta ditunda sampai ada TLS |
| salinan `auth` (`:33`) | backup harian `auth.users`/`identities` atau re-create terdokumentasi; cek `.env.bak-20261123-202146` | isi cron + daftar berkas + uji restore; hash `.env.bak` |

`npm audit` dikerjakan di 0b tetapi bukan butir kritis; buktinya output 0 kerentanan atau sisa dengan persetujuan Keamanan. Hitungan kritis = **lima**.

### Fase 1 — Baseline DEV, tanpa fitur baru

Gate masuk: Fase 0/0b dinyatakan sesuai. Gate keluar: baseline tersimpan, alat hijau, hash PDF immutable tercatat, `docs/bukti-gate-siklus2/fase-1-sesuai.md` berisi daftar akun `@invalid`/QA dan `select email from auth.users where email not like '%@invalid%'` = 0 baris.

- Pastikan `20261123130000` terpasang di DEV dan jalankan 7 penguji SQL yang ada.
- Uji browser yang belum: konflik dua penilai, N/O sampai Evaluasi, finalize/publish/ekspor, RLS lintas peran, sesi kedaluwarsa (`docs/HASIL-UJI-BROWSER-DEV.md:42-53`).
- PDF snapshot immutable: `sha256sum` PDF dan hash `snapshot_data` di `docs/baseline-pdf-sha256.csv` beserta `snapshot_id`, `revision`, baris audit. PDF alur uji dicatat terpisah.
- `npm run check` dan `npm run build` hijau.

### Fase 2 — Skor dan alur penilaian, DEV

Gate masuk: Fase 1 selesai; 7 penguji SQL hijau; hash PDF tersimpan sebelum `lib/scoring.ts:72` disunting. Gate keluar: `npm test` menjalankan tiga berkas `test:phase6` termasuk `tests/scoring.test.ts`; delapan penguji SQL hijau termasuk `rpc_contract_behavior.sql`; `npm run check`/`build` hijau; angka sama hanya pada cakupan lengkap; klausul `security definer` utuh; hash baseline identik; RLS tidak berubah; uji publish provisional ditolak **bersifat defensif**. `[TERBUKA-12]` sudah diputus: Admin Sistem dan empat subrole koordinator boleh menulis status `finalized`, sehingga Opsi B aktif.

**2a/2b.** `lib/scoring.ts:72` → `(averageOnFivePointScale / 5) * 100`; pertahankan `:69-77`, `:52-66`, batas `:19-29`. Buat `tests/scoring.test.ts`: 4→80 "Baik", 3→60 "Cukup", 3.5→70 "Cukup"; uji nilai mentah dulu. `[TERBUKA-1]` sudah diputus: semua tampilan memakai **satu angka desimal**; snapshot tetap menyimpan dua angka desimal. Ubah `package.json:18` `test:phase6` menjadi `node --experimental-strip-types --test tests/scoring.test.ts tests/phase6-scoring.test.ts tests/phase6-recommendations.test.ts`; `npm test` (`:17`) dan `npm run check` (`:20`) mengikutinya. Frasa "selisih 2 poin jadi peringatan" dicabut; `20261113120000:26-33` keras.

**2c.** Di `lib/phase6-scoring.ts:168-267`, `notObservedIndicators` (`:226-234`) bukan penyebut. `coverageDenominator = max(0, plannedCount - jumlah baris average===null && notObserved>0)`; `coverage = coverageDenominator>0 ? valid.length/coverageDenominator*100 : 0`; `valid = valid.length>=1 && coverage>=coverageThreshold`. Tambah `coverageDenominator` ke `AspectAggregate` (`:46-58`) dan teks alasan `:290-295`. Enam kasus uji dengan angka eksplisit: (1) 1 skor + 1 N/O + 1 pending → penyebut 2, coverage 50, invalid pada 80; (2) 1 skor + 2 N/O → 100 valid; (3) semua N/O → 0 invalid; (4) dua skor + satu N/O pada indikator sama → penyebut 2, coverage 100; (5) N/O tidak mengurangi penyebut skor; (6) tepat 50 pada ambang 50 valid. Fixture `:143-155` diperbarui. Sumber ambang produksi = `assessment_scoring_policies.minimum_coverage` (`20261112170000:114`), bukan konstanta JS.

**2d — Opsi B, diaktifkan sesuai keputusan pemilik.** Rentang hapus benar di `assessment-actions.ts` = `:383-423`; pertahankan `:353-382` termasuk `:378-382`. Tipe `:356` → `"submitted" | "draft"`. Di `submission-controls.tsx`: `:17` tetap tiga nilai, `:25` → dua nilai, hapus `:38` dan tombol `:76-88`, teks `:54` jadi "X dari Y observer mengirim penilaian (informasi; tidak menghalangi finalisasi)". `observasi/page.tsx:567-575` tetap memakai `finalizedCount` dari server.

Perubahan trigger `20261111160000:136-138` (opsi a) **diaktifkan**: ganti dengan `if new.status='finalized' and not public.is_assessment_moderator((select p.event_id from public.participants p where p.id=new.participant_id)) then raise exception ... using errcode='42501'; end if;`. Helper mencakup `admin_system` (`20261112170000:16`), jadi yang boleh menulis `finalized` adalah Admin Sistem dan empat subrole koordinator. Header `security definer set search_path=''` (`:129`) tetap. RPC sementara `finalize_submission_as_admin` dan opsi (b) tidak dipakai. Tombol Admin `submission-controls.tsx:76-88` dihapus di 2d. Penulis server setelah `20261113120000:70`: `update assessment_submissions set status='finalized', finalized_at=now(), finalized_by=(select auth.uid()) where participant_id=target_participant and status='submitted' and rubric_version_id in (select jsonb_array_elements_text(target_rubric_versions)::uuid);`.

**2e.** Migrasi > `20261123130000`, delapan argumen persis `20261113120000:4-7`, header `returns uuid language plpgsql security definer set search_path = '' as $$` utuh. Tambah `next_revision integer;` di `declare` `:9`; isi dari `select coalesce(max(s.revision),0)+1 ... where collective_evaluation_id=target_evaluation_id`; ganti literal `1` di `:72`. Pertahankan RLS `:228`, trigger `:253`, index unik `20261113000000:29-31`, immutable `20261112170000:330-331`. Jalur revisi `[TERBUKA-5]`.

**2f — Gate Evaluasi dan publish keras.** Gate keras tidak diubah: struktur `20261113120000:22-24`, bobot dan computed overall `:26-33`, referensi rating `:41-47`, moderasi `:48-51,52-67`. Gate aplikasi lunak: `evaluasi/actions.ts:652-666` dan `:692-698` jadi penandaan sementara plus peringatan; draf tersimpan. `assessment-actions.ts:398-413` ikut terhapus di 2d. Tidak ada snapshot provisional; gate `20261113120000:19-21,34-40,48-67` menolak finalisasi yang belum memenuhi syarat.

Timpa `publish_assessment_report` di migrasi baru > `20261123130000` dengan header `20261113130000:4-5`. Perluas `declare` di `:6`:

```
declare ev uuid; person uuid; evaluation uuid; revision_number integer; latest_snapshot uuid;
        policy_minimum numeric; snapshot_payload jsonb; snapshot_rubrics jsonb; rationale_text text;
```

Setelah `select ... into ev, person, evaluation` di `:8-9` dan penjaga `ev is null` di `:10`, ambil nilainya:

```
select pol.minimum_coverage, snap.snapshot_data, snap.rubric_version_ids, evl.decision_rationale
  into policy_minimum, snapshot_payload, snapshot_rubrics, rationale_text
from public.assessment_snapshots snap
join public.collective_evaluations evl on evl.id = snap.collective_evaluation_id
join public.assessment_scoring_policies pol on pol.id = true
where snap.id = target_snapshot_id;
if policy_minimum is null then
  raise exception 'Konfigurasi minimum_coverage tidak ditemukan.';
end if;
```

Sumber kolom: `minimum_coverage` `20261112170000:114`, `rubric_version_ids` `:297`, `snapshot_data` `:299`, `decision_rationale` `:212`. Gate sebelum insert publikasi `:25-28`:

```
if coalesce(snapshot_payload->'overall'->>'status','') <> 'ready_for_collective_evaluation'
   or coalesce(jsonb_typeof(snapshot_payload->'aspects'),'') <> 'array'
   or exists (select 1 from jsonb_array_elements(snapshot_payload->'aspects') a
              where coalesce((a->>'valid')::boolean,false) is not true
                 or coalesce((a->>'coverage')::numeric,0) < policy_minimum
                 or (a->>'score') is null)
   or char_length(trim(coalesce(rationale_text,''))) < 10
   or jsonb_array_length(snapshot_rubrics) = 0
   or exists (select 1 from public.assessment_moderations m
              where m.event_id=ev and m.participant_id=person
                and m.status not in ('reviewed','resolved')
                and m.rubric_version_id = any(array(select jsonb_array_elements_text(snapshot_rubrics))::uuid[]))
then raise exception 'Snapshot belum memenuhi syarat terbit.'; end if;
```

Bagian `:10-24` tidak diubah **kecuali `:12`**: hapus cabang `or exists(... p.role='bidang_kader')`, sehingga peran publish hanya `is_admin_system() or is_assessment_moderator(ev)` (`:11`). Audit `:29-30`, `published_by`/`actor_id` = `auth.uid()`, grant `20261112180000:103-104` tidak diubah. Gate Fase 2 menguji Kader publish ditolak `42501`. Dua pemanggil publish: `evaluasi/actions.ts:854` (`supabase.rpc("publish_assessment_report")` di dalam aksi `:821-864`) dan `laporan/actions.ts:28` (action `publishReport`). `[TERBUKA-9]` hanya rincian tombol Finalisasi aplikasi.

**2g.** Sebelum `lib/scoring.ts:72` disunting, rekam `sha256sum` PDF baseline, `snapshot_id`, `revision`, baris audit, hash `snapshot_data`. Gate keluar: hash identik; `lib/dashboard-results.ts:137` dan `components/phase7-report-workspace.tsx:77` memakai modul sama.

### Fase 3 — Akses dan data, DEV

Gate masuk: Fase 2 disetujui; A1/A5/A7/A8, TLS, `[TERBUKA-2]`, `[TERBUKA-3]`, `[TERBUKA-13]` terbukti. Gate keluar: bukti HTTP/SQL per peran (Bagian 6).

**3a.** Migrasi > `20261123130000`: `create or replace publish_assessment_report(uuid)` seperti 2f tanpa `bidang_kader`. `record_assessment_export(uuid,text,jsonb)` dengan header `20261112180000:187-188`: di `:192` hapus cabang `bidang_kader`, pertahankan admin, moderator, pengecualian Peserta `individual_pdf` (`:193-195`), `export_type` `:54,:191`, `laporan/actions.ts:67-73`; ulangi `:201-202`. Di UI: `app/dashboard/laporan/actions.ts:26` adalah daftar role aksi publish `publishReport` (RPC di `:28`); dihapus sehingga SQL menjadi otoritas. `:78` adalah daftar role aksi ekspor `auditReportExport` (RPC di `:82`); diubah bukan menjadi `["admin_system","instruktur"]` (IoT lolos lalu `42501`), melainkan Admin + empat subrole koordinator `mot`, `vice_mot`, `master_observer`, `vice_observer` (`20261112170000:21`); `iot` (`lib/instructor-roles.ts:15`) ditolak di UI sebelum RPC. `[TERBUKA-3]` ditandatangani Keamanan sebelum Fase 3 selesai; sampai itu ekspor Kader tetap ditolak. Jangan sentuh `is_assessment_moderator` (`20261112170000:13-25`).

**3b — IoT: pisahkan baca evaluasi dari tulis Observasi.** `can_access_observation(uuid)` (`20261106200000:2-19`) **tidak diubah**; keenam subrole tetap menulis. Buat fungsi baca:

```
create or replace function public.can_review_observation(target_participant_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select public.is_admin_system() or exists (
    select 1 from public.participants p
    where p.id=target_participant_id and public.is_assessment_moderator(p.event_id));
$$;
revoke all on function public.can_review_observation(uuid) from public;
grant execute on function public.can_review_observation(uuid) to authenticated;
```

Policy SELECT memakai **`can_review_observation(...) OR (kolom_pemilik=auth.uid() AND can_access_observation(...))`** agar Observer tetap membaca barisnya sendiri. Kolom pemilik eksplisit: `observer_id` pada `assessment_submissions`/`assessment_ratings` (`20261111160000:83-85`); `changed_by` pada revisi keduanya (`:147,172`); `author_id` pada `observer_notes` (`20261111100000:141`); `changed_by` pada `observer_note_revisions` (tabel ini tidak punya `author_id`, hanya `note_id` dan `changed_by`, `:145-151`); `updated_by` pada `observations` (`20261029070000:51`); `changed_by` pada `observation_revisions` (`:154`). Berlaku untuk `assessment_submissions`, `assessment_ratings`, revisi keduanya, `observer_notes`, `observer_note_revisions`, `observations`, `observation_revisions`.

Policy tulis `observations_write_assigned_observer` (`20261029070000:139`) bertipe `FOR ALL`, sehingga SELECT ikut lolos ke IoT lewat `can_access_observation`. Hapus policy itu dan buat ulang hanya `FOR INSERT` dan `FOR UPDATE` dengan predikat lama; SELECT sepenuhnya pada policy SELECT baru:

```sql
drop policy if exists observations_write_assigned_observer on public.observations;
create policy observations_insert_assigned_observer on public.observations for insert to authenticated with check ((select public.can_access_observation(participant_id)));
create policy observations_update_assigned_observer on public.observations for update to authenticated using ((select public.can_access_observation(participant_id))) with check ((select public.can_access_observation(participant_id)));
```

Uji: IoT 0 baris `observations`, tetapi INSERT draft submission dan rating tetap 200. `participants_read_assigned_instructor` (`20261106200000:23-25`) → moderator-only; `participants_read_assigned_observer` (`20261029070000:117`) tidak diubah. `drop policy if exists` sebelum tiap `create policy`. Predikat policy tulis tidak diubah; helper tulis `can_write_observation_submission`, `can_write_observation_rating`, `can_write_observer_note` wajib mempertahankan cabang Admin `20261111160000:84-85` dan `finalized_by` pada `WITH CHECK`. Helper moderator tidak di `layout.tsx:18-33`: layout hanya mengirim role; `eventId` dari `evaluasi/page.tsx:100-109` dan `laporan/page.tsx:96-100`; otoritas akhir `is_assessment_moderator`. Redirect tetap. Uji: Observer baris sendiri >0 dan orang lain 0; IoT `can_review_observation=false`, 0 baris `participants`/`observations`/orang lain, tapi INSERT draft submission dan rating 200; IoT `get_event_assessment_summary` dan `get_instructor_dashboard_results` (`20261106180000:51-77`, definisi `20261111100000:346-410`) 0 baris/42501.

**3c — Rekap Komisariat.** `participants.commissariat_id uuid NOT NULL` sudah ada (`20261029050000:3,22`); jangan menambah kolom. Gate backfill 100% cocok dengan `lower(trim(name))=lower(trim(commissariat))`, 0 placeholder `a3200000-...0001` (`20261029050000:10`); baris tak cocok dicatat, gate gagal sampai Admin memilih. Sumber filter: `komisariat` → `target_commissariat_id := public.current_commissariat_id()` (`20261029100000:59-62`), null → `42501`; Admin/moderator boleh null. RPC `get_commissariat_event_summary(uuid)`, `security definer set search_path=''`, hanya jumlah/rata-rata/distribusi, tanpa identitas; revoke public, grant authenticated. Agregasi **dua tahap**, bukan `having count(*)>=10` satu tahap: tahap 1 hitung `count(*)` dan rata-rata per bucket tanpa HAVING; tahap 2 keluarkan bucket dengan `count>=10`, gabungkan bucket `count<10` menjadi `"Lainnya"` dengan `count=sum(cnt)` dan rata-rata berbobot `sum(cnt*avg)/sum(cnt)`. Tampilkan "Lainnya" hanya bila `sum(cnt)>=10`. Total <10 → `distribution=null`. Aturan ini berlaku juga untuk moderator. Uji 9:1 → null, 18:2 → 18.

**3d — Akun Peserta.** `participant_access`: `participant_id` PK+FK, `account_user_id`, `expires_at timestamptz not null`, `revoked_at`, `must_change_password boolean not null default true`, `linked_at timestamptz not null default now()`, `password_changed_at timestamptz`, **`encrypted_password_at_link text`**. RLS aktif, revoke `authenticated,anon`, tanpa policy; akses hanya RPC. `assign_participant_account(uuid,uuid)` (`20261112180000:67-78`) ditimpa: baca `select encrypted_password into linked_hash from auth.users where id=target_user_id;`, tolak `42501` bila null, upsert `participant_access` dalam satu transaksi dengan `encrypted_password_at_link=linked_hash`, `linked_at=now()`, `password_changed_at=null`, `must_change_password=true`, `revoked_at=null`; `target_user_id null` → `revoked_at=now()` dan `account_user_id=null`. `revoke_expired_participant_access()` cron harian null-kan `account_user_id`. `get_my_published_assessment_report()` (`20261112180000:106-140`) ditimpa: join `pa.participant_id=p.id`, syarat akses aktif dan `must_change_password=false` di `:133`, pertahankan `P0002` `:136`, flag true → `P0003`. Tambah `create unique index if not exists participant_access_account_user_unique on public.participant_access(account_user_id) where account_user_id is not null;` karena `participants` hanya unik per `(event_id, account_user_id)` (`20261112180000:6`); `assign_participant_account` menolak `42501` bila akun sudah terikat di baris lain. Buat helper tanpa argumen di migrasi 3d:

```sql
create or replace function public.has_active_participant_access()
returns boolean language sql stable security definer set search_path='' as $$
  select exists (select 1 from public.participant_access pa
    where pa.account_user_id=(select auth.uid())
      and pa.revoked_at is null and pa.expires_at>now());
$$;
revoke all on function public.has_active_participant_access() from public;
grant execute on function public.has_active_participant_access() to authenticated;
```

Versi tanpa argumen dipakai policy `participants_read_own_published_report` (`20261112180000:8`) dan `assessment_report_publications_read` (`:25`); helper satu argumen kembali salah untuk UUID orang lain.

`public.confirm_participant_password_change()` security definer `set search_path=''`: ambil baris `participant_access` milik `auth.uid()`, tolak bila tidak aktif, `encrypted_password_at_link is null`, atau `auth.users.encrypted_password` sama dengan hash saat penautan; jika berbeda, tulis `password_changed_at=now(), encrypted_password_at_link=current_hash`. Tidak memakai proksi `updated_at`. `clear_my_must_change_password()` menolak bila `password_changed_at is null`, dan setelah konfirmasi sukses men-set `must_change_password=false` untuk baris ber-`account_user_id=auth.uid()` (jika tidak, rapor tetap `P0003`). Helper `has_active_participant_access(uuid)` tetap memakai `pa.account_user_id=(select auth.uid())`, tambah `target_participant_id is not null`, dan sediakan versi tanpa argumen untuk Policy; helper satu argumen mengembalikan `false` untuk UUID orang lain. Semua helper dan RPC konfirmasi memakai `security definer set search_path=''`, nama lengkap, grant hanya `authenticated`. Uji: `updateUser({data})` → hash sama → konfirmasi `42501`, rapor `P0003`; `updateUser({password})` → hash beda → konfirmasi sukses, clear sukses, rapor terbaca; konfirmasi dua kali → kedua ditolak. Uji REST `/rest/v1/participant_access`: 0 baris untuk `authenticated`, 401/403 untuk `anon`. `[TERBUKA-10]` default `expires_at` fallback 30 hari. `[TERBUKA-13]` sudah diputus: tidak ada SMTP, TOTP, atau penyedia pihak ketiga. Pendaftaran dan kata sandi biasa dipakai. Bukti ganti sandi hanya perbandingan hash sandi di server. Jika `auth.users.encrypted_password` tidak terbaca, kewajiban ganti sandi tidak boleh diklaim terpenuhi dan gate Fase 3d gagal sampai ada solusi. Jalur OTP/email dibatalkan.

**3e — Retensi, agregat, backup.** Gate masuk: arsip identitas `private_payload` (`20261112170000:312-325`) ditandatangani. Dikecualikan dari delete: `assessment_snapshots`, `assessment_snapshot_private_sources`, `assessment_report_publications`, audit, `collective_evaluations`, `assessment_moderations`, `development_recommendations`, `observation_revisions`, dan **`participant_access.participant_id`** (FK `NO ACTION` dari migrasi baru 3d). Peserta dengan turunan itu diskip: identitas diarsipkan di `private_payload`, baris ditandai **kolom baru `archived_at`** dan `account_user_id=null`, demikian pula `participant_access.account_user_id=null` **dan `encrypted_password_at_link=null`**. Baris tanpa turunan restrict dihapus; cascade mengikuti. Jangan ubah FK atau hapus snapshot. Dry-run `count(*)` sebelum=sesudah untuk snapshot, publikasi, audit, evaluasi, `participant_access`; hash PDF identik. Cron 03:20 `/etc/cron.d/imm-retention` setelah backup 03:15.

Kader tidak membaca `snapshot_data`: hapus cabang `bidang_kader` dari `assessment_snapshots_read_authorized` (`20261112170000:306`), dari `get_event_report_rows` (`20261112180000:142-156`), dan dari `collective_evaluation_revisions_read_authorized` (`20261112170000:243-244`). Cabang Kader di `development_recommendations_read_authorized` (`:281`) tidak diubah. Buat `get_event_report_summary_for_kader(target_event_id uuid)`, `security definer set search_path=''`, keluaran `participant_id uuid, display_name text, commissariat text, overall_score numeric, graduation_decision text, published_at timestamptz, publication_revision integer`, hanya dari snapshot yang dipublikasi (`20261112180000:10-29`). **Awali cek internal**, disalin eksplisit: `if not exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='bidang_kader') then raise exception 'Akses ringkasan Kader ditolak.' using errcode='42501'; end if;` — Admin dan IoT ditolak `42501`. `overall_score` = `snapshot_data->'overall'->>'score'` (`20261113120000:31`), `graduation_decision` dari `collective_evaluations` (`20261112170000:211`). Tanpa `snapshot_data`/bukti/catatan. `revoke all ... from public; grant execute ... to authenticated;` — grant tetap authenticated, keputusan di cek internal.

`get_public_event_aggregate(target_event_id uuid)`, `security definer set search_path=''`, keluaran `event_id uuid, total_participants integer, groups jsonb` (`{key,count,average_score}`), hanya peserta dengan `assessment_report_publications` dan **`snapshot_data->'overall'->>'status' = 'ready_for_collective_evaluation'`**. Ambang 10 dan aturan "Lainnya" **agregasi dua tahap** seperti 3c; total <10 → `groups=null`. Tanpa identitas. `revoke all ... from public; grant execute ... to anon, authenticated;` satu-satunya grant anon baru. Gate Fase 4 verifikasi lewat `information_schema.role_table_grants` dan ACL `pg_proc`: tidak ada grant anon lain yang tersisa. `docs/revisi-siklus4-b.md:52-55` (filter rubric lama tanpa penolakan `snapshot_rubrics` kosong) dinyatakan **kedaluwarsa**. `app/page.tsx:9` memanggil RPC ini. Backup PII: `age`/GPG, `restic`/LUKS; verifikasi dekripsi, `restic check`, restore exit 0; kunci di workstation dan media offline; retensi 14 hari dan salinan `auth` 30 hari pasca-rotasi; grup Unix `imm-backup`, `chmod 0770`, log sudo; kriteria restore lengkap.

**3f/3g.** Impor `.xlsx` dengan batas 5 MB/500/50, Admin Sistem, riwayat `is_current`, PDF tetap (`impor-tes/actions.ts:9-11,29-32,153-181,190-204`). Rubrik trial berlabel (`BLUEPRINT.md:28,40,58`), snapshot lama tidak diubah, hash baseline cocok.

### Fase 4 — Jalur lama dan kontrak RPC, DEV

Tutup 14 entri `INVENTARIS-JALUR-LAMA.md:14-24`. Hanya `get_event_assessment_summary(uuid)` berubah signature: migrasi > `20261123130000`, `drop function if exists ...(uuid)`, `create or replace ...(target_event_id uuid, target_participant_id uuid default null)` dengan 16 kolom `20261112190000:6-10`, `#variable_conflict use_column` `:12`, peran `:15-21`, filter di `planned` `:31-39`, `order by :69`, gate `:52-67`. Revoke/grant `(uuid,uuid)` `:71-72`. `PGRST_DB_MAX_ROWS=100000` tetap. Gate keluar: delapan penguji SQL lolos; signature dua argumen dan `P0002` terverifikasi; empat pemanggil masih berjalan; signature lama tidak tersisa; uji IoT rekap dan `get_instructor_dashboard_results`; uji anon agregat; uji REST `participant_access`.

### Fase 5 — Deploy PROD dan uji ulang

Gate masuk: Fase 1-4 dinyatakan sesuai; izin tertulis pemilik; empat butir kritis masih "sudah"; backup sebelum migrasi (dump, direktori, hash `.env.production`, salinan `auth`, uji restore); `.env.bak-20261123-202146` terverifikasi; bukti rotasi Fase 0b masih berlaku. TLS tidak menjadi syarat karena pemilik memakai IP; kredensial Peserta tidak dibagikan pada fase ini. Rotasi hanya sekali di 0b.

Urutan: backup → migrasi + penguji SQL → rsync tanpa `--delete`/`--delete-excluded` (`DEPLOYMENT.md:35-39`) → `npm ci --include=dev` → `npm run build` → `pm2 restart imm` → smoke → RPT-001..005 dan alur penuh `@invalid` → ulang uji PROD.

Smoke: `http://43.173.33.195:8080/` → 200 hanya cek halaman tanpa kredensial, lalu 8080 ditutup/dialihkan; login QA hanya di HTTPS dari bukti 0b. Gate keluar: 14 butir diisi ulang; 5xx/502 tidak melebihi baseline; bukti per peran dan smoke HTTPS; hash PDF cocok.

### Fase 6 — Penutupan dokumen

**Sudah dilaksanakan pada 24 November 2026.** Gate masuk asalnya "pemilik menyatakan Fase 5 sesuai", tetapi Fase 5 belum dijalankan karena deploy menunggu izin. Fase 6 tetap dikerjakan untuk menyatukan dokumen, bukan untuk menyatakan deploy sudah terjadi.

Otoritas status sekarang adalah `docs/STATUS-PRODUKSI-SATU-VERSI.md`. Dokumen root, prosedur, dan pemetaan telah diselaraskan untuk merujuk ke sana. Klaim lama seperti "migrasi belum ada", "deploy ditunda", "database kosong/belum ada admin", dan "regression belum dijalankan" ditandai sebagai riwayat atau dihapus. "Belum ada domain/TLS" tidak dihapus, melainkan dicatat sebagai keputusan pemilik untuk tetap memakai IP.

Gate keluar: satu versi status produksi, tidak ada klaim status baru yang bertentangan, dan persetujuan pemilik tercatat di dokumen persetujuan. Tidak ada tanda tangan nama. Fase 5 belum selesai, sehingga Fase 6 tidak boleh dibaca sebagai bukti deploy.

---

## 3. Penandatanganan dan perintah

Pengesahan matriks tidak memakai nama atau tanda tangan. Pemilik memutuskan persetujuan cukup tercatat di `docs/PERSETUJUAN-OWNER-16-PERTANYAAN.md` dengan tanggal 24 November 2026. Ruang lingkup persetujuan tetap: keputusan 1-12, publish keras, perbaikan produksi, dan izin lanjutan. Butir 11 monitoring termasuk pemeriksaan Infrastruktur.

Laptop Windows, PowerShell (Pemilik Produk/Keamanan):

```powershell
Get-FileHash .\docs\baseline-pdf-sha256.csv -Algorithm SHA256
Get-Date -Format yyyy-MM-dd
Invoke-WebRequest -Uri "https://<DOMAIN_HTTPS>/login"   # kredensial QA hanya di sini
Invoke-WebRequest -Uri "http://43.173.33.195:8080/" -MaximumRedirection 0  # tanpa kredensial
New-Item -ItemType Directory -Force .\docs\bukti-gate-siklus2
```

Server Infrastruktur, SSH:

```bash
cd /home/ubuntu/imm-app && git rev-parse HEAD && sha256sum .env.production
sha256sum /home/ubuntu/imm-db-backups/*/pre-migration-*.sql
df -h; docker ps --format '{{.Names}} {{.Status}}' | grep wms_prod
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/
cat /etc/cron.d/imm-db-backup /etc/cron.d/imm-retention
openssl s_client -connect <DOMAIN_HTTPS>:443 -servername <DOMAIN_HTTPS> </dev/null
```

Konvensi bukti: `docs/bukti-gate-siklus2/fase-N-sesuai.md` untuk N = 0, 0b, 1-6 berisi checklist gate, perintah dan keluaran atau hash, `path:line`, daftar akun `@invalid` tanpa kata sandi, hasil query domain, nama peran, tanggal. Dilarang merujuk folder lain. Tabel per peran Bagian 6 ditempatkan di `fase-3-sesuai.md` dan `fase-4-sesuai.md`.

## 4. Strategi pengujian

- **Otomatis:** `tests/scoring.test.ts` baru dan `package.json:18`; enam kasus N/O; `tests/phase6-recommendations.test.ts`, `tests/phase7-files.test.ts`; `npm run check`, `npm run build`; `npm test` menjalankan tiga berkas `test:phase6`.
- **SQL:** delapan berkas di `supabase/tests/` termasuk `rpc_contract_behavior.sql`. Di DEV dengan `begin; ... rollback;`. Fixture snapshot dibuat dengan `set local role service_role` atau seed migrasi karena INSERT snapshot dicabut dari `authenticated` (`20261112170000:309,324`); assertion dengan `set local role authenticated; set local request.jwt.claim.sub='<qa-id>'`. Periksa signature delapan argumen, `P0002`, `P0003`, hash sandi sebelum/sesudah `updateUser`, publish ditolak untuk snapshot yang tidak memenuhi syarat, trigger `finalized` menerima Admin dan empat subrole koordinator.
- **Browser dan peran:** konflik dua penilai, N/O sampai Evaluasi, finalize/publish/ekspor, RLS lintas peran, sesi kedaluwarsa; Observer membaca baris sendiri; IoT tidak membaca orang lain tetapi tetap menulis; Kader hanya rekap; Peserta flag sandi.
- **Regresi PDF:** bandingkan `sha256sum` dengan baseline sebelum `lib/scoring.ts:72` diubah; jangan hitung ulang `snapshot_data`.

## 5. Rollback

Backup sebelum migrasi: dump, direktori aplikasi, hash `.env.production`, salinan `auth`. Rollback: hentikan deploy, restore dump dalam satu transaksi, kembalikan direktori dari `imm-app.bak-*`, kembalikan `.env.production` terverifikasi, verifikasi hash, `npm ci && npm run build && pm2 restart imm`, smoke HTTPS. Jangan hapus baris historis; restore definisi RPC lewat `create or replace`/`drop function`; grant mengikat signature. Bila rekap terpotong, restore `PGRST_DB_MAX_ROWS=100000` dan buat ulang container `rest`. Jangan hapus direktori rollback; bukti restore wajib disimpan.

## 6. Gate keluar Fase 3 dan 4 per peran

Bukti `curl -i`/SQL dengan JWT `@invalid`, disimpan di `docs/bukti-gate-siklus2/`.

| Peran | Target | Expected | Gagal bila |
|---|---|---|---|
| IoT | REST `participants`, `ratings`, `observations`, `observer_note_revisions`, snapshot; `can_review_observation`; rekap; INSERT draft submission + rating | 0 baris/42501/`false`; tulis 200 | baris terbaca, tulis gagal, rekap lolos |
| Observer ditugaskan | REST submission/rating/revisi/catatan milik sendiri; tulis rating | baris sendiri >0, orang lain 0, tulis 200 | baris sendiri hilang atau lintas terbaca |
| Koordinator | `is_assessment_moderator`, rekap, publish | `true`; publish 200 hanya snapshot memenuhi syarat | publish ditolak pada koordinator sah atau provisional terbit |
| Kader | `get_event_report_summary_for_kader`, REST snapshot, publish, ekspor, revisi evaluasi | rekap 200 tanpa `snapshot_data`; snapshot 0; publish/ekspor 42501 | `snapshot_data` terbaca atau publish/ekspor berhasil |
| Admin | `assign_participant_account`, publish | 200; baris `participant_access` satu transaksi | baris tidak ada/`expires_at` null |
| Moderator lintas komisariat | `get_commissariat_event_summary` tanpa filter | agregat saja; 9:1 → null; 18:2 → 18 | identitas terbaca atau bucket <10 keluar |
| Komisariat A/B | RPC rekap | A hanya A dari `current_commissariat_id()` | A melihat B atau argumen dari klien |
| anon | `get_public_event_aggregate`; semua REST/RPC lain | agregat 200 tanpa identitas; lain 401/403 | identitas terbaca atau grant anon lain |
| Peserta normal | status, konfirmasi, clear, rapor | clear tanpa perubahan hash ditolak; setelah hash beda → rapor | `P0003` dilewati |
| Peserta dicabut/expired | RPC dan REST rapor | `P0002`/42501; `account_user_id` null | masih mengambil rapor |
| Audit publish/backup | publikasi, audit, cron | `published_by`/`actor_id` = `auth.uid()`; cron pakai kunci baru | null/audit hilang/kunci lama dipakai |

## 7. Daftar terbuka terpusat

1. `[TERBUKA-13]` Ketersediaan `auth.users.encrypted_password` di project target. Jalur OTP/email dibatalkan; jika hash tidak terbaca, Fase 3d tidak lolos.

Empat butir sudah ditutup oleh keputusan pemilik 24 November 2026: `[TERBUKA-1]` satu angka desimal, `[TERBUKA-6]` tanpa nama penandatangan, `[TERBUKA-11]` tetap memakai IP, dan `[TERBUKA-12]` Admin serta empat koordinator boleh menulis `finalized`. Untuk `[TERBUKA-13]`, jalur sudah diputus menjadi perbandingan hash sandi tanpa OTP; yang masih dicek hanyalah ketersediaan hash di project target. Rincian ada di `docs/PERSETUJUAN-OWNER-16-PERTANYAAN.md`.

Butir yang sudah ditutup oleh persetujuan owner 24 November 2026 ada di `docs/PERSETUJUAN-OWNER-16-PERTANYAAN.md`: `[TERBUKA-2]` kelompok per komisariat dalam kegiatan; `[TERBUKA-3]` Kader tanpa nilai mentah; `[TERBUKA-4]` arsip identitas disetujui; `[TERBUKA-5]` revisi dengan evaluasi dan snapshot baru; `[TERBUKA-7]` filter peserta pada RPC; `[TERBUKA-9]` tombol Finalisasi dikunci sampai moderasi selesai; `[TERBUKA-10]` kata sandi Peserta 30 hari; retensi dan izin produksi juga disetujui.

### Catatan tertutup

- Opsi B aktif. Yang boleh menulis `finalized` adalah Admin Sistem dan empat subrole koordinator, sesuai keputusan pemilik 24 November 2026.
- `revisi-siklus3-b.md:30-34` tentang migrasi penandaan snapshot provisional dinyatakan kedaluwarsa.

## 8. Ringkasan untuk pemilik

**Istilah:** *provisional* = sementara, penilaian belum memenuhi syarat terbit, tersimpan sebagai draf, bukan rapor resmi. *Coverage* = seberapa banyak indikator dinilai dalam aspek, ambang 80%. *N/O* = Belum diamati, tanpa skor, tidak mengurangi penyebut coverage. *5xx/502* = kesalahan server di log nginx, dibandingkan baseline. *Sidik PDF* = sidik jari SHA256 untuk membuktikan PDF lama tidak berubah.

**Tindakan pemilik:** persetujuan sudah tercatat, tidak perlu nama; beri izin tertulis 0b setelah bukti baca Fase 0; nyatakan tiap fase sesuai sebelum fase berikutnya. Konsekuensi memakai IP tanpa TLS: kata sandi Peserta tidak dibagikan sampai ada domain.

- **Fase 0/0b:** 14 pemeriksaan, lima kontradiksi, lima prasyarat dibetulkan dengan izin. Bisa diulang: baca commit, migrasi, sertifikat, log.
- **Fase 1:** angka baseline dan sidik PDF. Bisa diulang: unduh PDF lama, cocokkan sidik.
- **Fase 2:** skor 4 berarti 80 pada penilaian lengkap; bila belum lengkap, tanda sementara dan peringatan. Terbit ditolak untuk penilaian yang belum memenuhi syarat.
- **Fase 3:** Kader hanya rekap; IoT tidak membaca evaluasi tetapi tetap mengisi Observasi; kata sandi Peserta harus benar-benar diganti sebelum rapor terbaca.
- **Fase 4:** jalur lama ditutup, kontrak RPC dua argumen, empat pemanggil berfungsi. Bisa diulang: delapan penguji SQL.
- **Fase 5:** gate keamanan tetap: RLS, 14 butir, TLS, rotasi, backup, HTTPS 200, 5xx/502 tidak melebihi baseline.
- **Fase 6:** satu status produksi di semua dokumen; cari "ditunda"/"belum" yang bertentangan, harus tidak ada.

## 9. Yang tidak boleh diubah

RLS dan pengecekan peran di server; `is_assessment_moderator`; snapshot dan PDF yang sudah terbit; trigger immutable; migrasi lama; grant/revoke kecuali signature yang diubah di Fase 4; index unik `(collective_evaluation_id, revision)`; dependency; data produksi sebelum izin; `PGRST_DB_MAX_ROWS`; batas kategori `lib/scoring.ts:19-29`. Format tampilan sudah diputus satu angka desimal.

## 10. Risiko top 10

| # | Risiko | Mitigasi |
|---|---|---|
| 1 | Status PROD dua versi | Isi 14 butir, hapus klaim lama |
| 2 | Fitur baru sebelum tinjauan | Gate Fase 0/0b ber persetujuan tercatat |
| 3 | Data pribadi nyata terpakai | Akun QA simulasi, ambang 10 di RPC |
| 4 | Snapshot/PDF lama berubah | Hash baseline, tanpa recalc |
| 5 | Nomor revisi tidak terpakai | Jalur revisi diputus dulu |
| 6 | Rekap terpotong lagi | Filter peserta di SQL, batas tetap 100000 |
| 7 | RLS lintas peran bocor | Uji per peran lewat HTTP/SQL |
| 8 | Publish data belum resmi | Predicate publish lengkap, diuji |
| 9 | Deploy menghapus `.env` | rsync tanpa `--delete`, hash `.env` |
| 10 | RPC empat definisi bertabrakan | Drop/recreate eksplisit, ulangi grant |
