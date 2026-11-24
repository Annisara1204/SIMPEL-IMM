# Revisi C Siklus 1 — Pengganti Fase 3 dan Fase 4

Pengganti Fase 3 dan Fase 4 di `docs/RENCANA-IMPLEMENTASI-KEPUTUSAN.md`. Rencana utama, kode, migrasi, dan data tidak diubah.

Catatan diterima 24 November 2026: instruksi "aplikasi jangan terlalu ketat dalam guard/gate" hanya untuk guard aplikasi (coverage, moderasi, publish, finalisasi), boleh jadi peringatan/provisional bila aman. RLS, grant, filter komisariat, `expires_at`, `must_change_password`, dan penerbit keputusan 9 tetap keras; yang dilonggarkan hanya teks UI.

## Fase 3 — Akses dan data, DEV

Gate masuk: Fase 2 disetujui pemilik; A1/A5/A7/A8 dan TLS terbukti (`HANDOVER.md:337,347`); definisi "kelompok", ekspor Kader, dan arsip identitas ditandatangani. Gate keluar: bukti HTTP/SQL per peran di tabel akhir, bukan klik menu.

**3a. Penyeragaman penerbit.** Putuskan sebelum 3a: Kader tetap baca rekap (`20261112180000:146`, `20261112170000:306`), tapi tidak menerbitkan/mengekspor (salinan PII). Samakan empat titik: `app/dashboard/laporan/actions.ts:26`, `:78`, RPC publish, dan `record_assessment_export` (`20261112180000:192-197`). Daftar `export_type` juga sama di constraint `:54`, RPC `:191`, UI `laporan/actions.ts:67-73`.

Migrasi baru (timestamp > `20261123130000`), bukan sunting lama: `create or replace public.publish_assessment_report(target_snapshot_id uuid)`, signature persis `20261113130000:4-5`. Hapus `bidang_kader` dari `:11-12`; pertahankan `security definer`, `set search_path=''` (`:5`), evaluasi final `:15-18`, snapshot terbaru per evaluasi `:19-24`, audit `:29-30`. Ulangi revoke/grant (`20261112180000:103-104`). Jangan sentuh `is_assessment_moderator` (`20261112170000:13-25`, dipakai `app/dashboard/evaluasi/actions.ts:20-31`).

SQL otoritas. `publishReport` (`app/dashboard/laporan/actions.ts:21-33`) hanya menerima `snapshotId`; hapus daftar `:26` (salah memasukkan `instruktur` non-moderator dan Kader), tanpa lookup `event_id` di klien. Pemanggil kedua `app/dashboard/evaluasi/actions.ts:853-856` sudah cocok. Audit: `published_by` (`20261112180000:14`) dan `actor_id` (`:37`) wajib `auth.uid()` pemanggil (`:99-100`), bukan service role; `action` tetap `published`/`republished`.

**3b. Akses Observasi policy, bukan menu.** `can_access_observation` (`20261106200000:2-19`) di `:13-16` memberi semua `instruktur` dengan `instructor_event_assignments` akses, termasuk IoT. Persempit di migrasi baru ke empat posisi koordinator (`lib/phase7-home.ts:55-61`) atau delegasi ke `is_assessment_moderator` (`20261112170000:13-25`). Pertahankan revoke/grant `20261106200000:20-21`; buktikan di server.

Ekstrak helper moderator bersama dari `app/dashboard/evaluasi/page.tsx:110-120` dan `app/dashboard/laporan/page.tsx:96-107`; pakai ulang di `app/dashboard/layout.tsx:18-33` untuk flag `AppShell`. Menu `lib/navigation.ts:67-81` dan `components/app-shell.tsx:84-92,107-136` hanya UX; redirect `evaluasi/page.tsx:115-120` dan `laporan/page.tsx:107` tetap. Observasi tampil untuk keenam subrole. Gate 3 = uji JWT IoT langsung ke RPC/tabel.

**3c. Rekap Komisariat.** Gate masuk: "kelompok" ditulis. Usulan: `participants.commissariat` per `event_id` (`20261112180000:112,149`). Tanpa itu RPC ditunda.

RPC `get_commissariat_event_summary(uuid)`, `security definer`, `set search_path=''`. Wajib filter komisariat pemanggil memakai `current_commissariat_id()` (`20261029100000:59-62`) dan `is_commissariat_member(p.commissariat)` (`:64-67`) pada `participants.commissariat` milik event. Admin/moderator boleh tanpa filter; `komisariat` tidak. Keluarkan hanya jumlah, rata-rata, distribusi keputusan; `having count(*) >= 10`. Distribusi 9:1 pada 10 peserta: kategori < 10 tidak dikeluarkan, digabung ke "Lainnya" hanya bila total bucket >= 10, else `null`. Dilarang `participant_id`, `display_name`, `student_number`, `group_name`, `snapshot_data` (`20261112180000:149`).

`revoke all ... from public`; `grant execute ... to authenticated` untuk komisariat. `anon` hanya untuk `get_public_event_aggregate(uuid)` bila dipanggil `app/page.tsx:9`; bila tidak, jangan grant.

**3d. Akun Peserta.** Migrasi baru: `public.participant_access` (`participant_id` PK+FK, `account_user_id`, `expires_at timestamptz not null`, `revoked_at timestamptz`, `must_change_password boolean not null default true`). Aktifkan RLS; `revoke all ... from authenticated,anon`; tanpa policy untuk keduanya. Akses Peserta hanya RPC `security definer`.

Ubah `assign_participant_account(uuid,uuid)` (`20261112180000:67-76`) lewat migrasi baru, signature tetap, cek Admin `:70`, role Peserta `:71-73`, update `:74`. Satu transaksi: upsert `participant_access` `on conflict (participant_id) do update set account_user_id=excluded.account_user_id, expires_at=excluded.expires_at, revoked_at=null, must_change_password=true`. `expires_at` dari keputusan tertulis; fallback `[TERBUKA]`: `coalesce(e.ends_on, now()) + interval '30 days'`. `target_user_id` null → `revoked_at=now()`. Ulangi `:77-78`. Tanpa upsert semua peserta kena `P0002`.

Timpa `get_my_published_assessment_report()` (`20261112180000:106-140`), signature sama. Tambah join `participant_access pa` dan `pa.account_user_id=(select auth.uid()) and pa.revoked_at is null and pa.expires_at > now()`. Pertahankan `:133-135` dan **kode `P0002` di `:136`** (UI `app/dashboard/laporan/page.tsx:70`); ulangi `:139-140`.

`must_change_password` ditegakkan server: setelah login cek lewat RPC milik sendiri; flag true → halaman ganti sandi sebelum rapor diambil. RPC selesai hanya setelah `supabase.auth.updateUser({ password })` berhasil dan hanya mengubah baris milik `auth.uid()`. Tidak boleh dilemahkan/dipindah ke klien.

Uji RPT-001..005 (`docs/QA_PHASE8_TEST_PLAN.md:183-187`) + tiga: lewat `expires_at`, `revoked_at` terisi, dan flag sandi belum clear → rapor gagal. Kredensial nyata `[IZIN]`.

**3e. Retensi/backup.** Buat `docs/PROSEDUR-RETENSI-DATA-V1.md`, `scripts/retention-dry-run.sql`, `scripts/retention-apply.sql`. Dikecualikan dari `delete`: `assessment_snapshots` (`20261112170000:294-310`), `assessment_snapshot_private_sources` (`:312-325`), `assessment_report_publications` (`20261112180000:10-29`), `assessment_report_publication_audit` (`:31-49`), `assessment_export_audit` (`:51-65`), `observation_revisions` (`20261106200000:65-99`): diarsipkan, bukan dihapus.

Kandidat: `events.ends_on < now() - interval '2 years'`; Surat Mandat `administrative_published` (`20261029100000:252-262`) > 2 tahun; audit `acted_at` (`20261112180000:38`) / `created_at` (`:57`) > 5 tahun. Eksekusi cron 03:20 `/etc/cron.d/imm-retention` setelah backup 03:15 (`HANDOVER.md:334`): dry-run dulu (keluaran `count(*)` per tabel), baru apply. Dry-run wajib membuktikan `count(*) from public.assessment_snapshots` sebelum = sesudah dan hash PDF Fase 1 sama.

Putuskan sebelum prosedur: arsip identitas di `private_payload` (`20261112170000:312-325`) tetap disimpan terenkripsi; bila ditolak, tulis transformasi tanpa mengubah snapshot terbit. Backup PII (`~/Documents/backup-prod-2026-11-14/`, `auth.users`+`auth.identities`, `HANDOVER.md:335`): enkripsi at-rest (age/GPG atau LUKS), kunci di luar server, workstation + satu offline, retensi 14 hari (`:334`) dan salinan rahasia 30 hari pasca-rotasi, akses hanya Infrastruktur/Keamanan lewat grup Unix + log. Uji restore wajib sebelum Fase 5.

## Fase 4 — Jalur lama dan kontrak RPC, DEV

Gate masuk: Fase 3 lolos; 17 RPC (`docs/MATRIKS-RPC-AKSES.md:18`) terpetakan. 14 entri `docs/INVENTARIS-JALUR-LAMA.md:14-24`: hapus `saveObservation` (`:27-34`) dan dua action tanpa pemanggil (`:72-79`); alihkan `lib/dashboard-results.ts` (`:45-52`) sebelum hapus `observations` + tiga tabel status (`:36-79`); migrasi data NULL (`:81-88`) dan duplikat seed (`:90-97`); tahan finalisasi (`:117-142`) dan fallback nama (`:144-151`); entri 10 (`:108-115`) tidak aksi.

Kontrak: kontradiksi "17 kontrak" vs "drop bila signature berubah" diselesaikan: hanya `get_event_assessment_summary(uuid)` yang berubah. **16 lainnya tidak termasuk** (`finalize_collective_evaluation(8 arg)` `MATRIKS-RPC-AKSES.md:86`/`20261113120000:4-7`; `publish_assessment_report(uuid)` `:87`; `get_my_published_assessment_report()` `:82`; `assign_participant_account(uuid,uuid)` `:88`; `record_assessment_export(uuid,text,jsonb)` `:89`; `is_assessment_moderator(uuid)` `:85`).

Paket perubahan:
1. Migrasi baru > `20261123130000`: `drop function if exists public.get_event_assessment_summary(uuid);` (definisi `20261112190000:5-12`, pendahulu `20261112170000:28`).
2. `create or replace ... (target_event_id uuid, target_participant_id uuid default null)` dengan 16 kolom persis `20261112190000:6-10`, `#variable_conflict use_column` `:12`, cek peran `:15-21`, filter `and (target_participant_id is null or p.id=target_participant_id)` di CTE `planned` `:31-39`; pertahankan `order by` `:69` dan gate `:52-67`.
3. Ulangi `revoke all on function public.get_event_assessment_summary(uuid,uuid) from public; grant execute ... to authenticated;` (`:71-72`) karena grant mengikat signature (`MATRIKS-RPC-AKSES.md:100-101`). Signature lama hilang bersama `drop`.
4. Uji empat pemanggil: `app/dashboard/evaluasi/page.tsx:147-151`, `app/dashboard/evaluasi/actions.ts:382` dan `:593`, serta internal `20261113120000_scope_finalize_moderation_to_penilaian_v1.sql:52-67` (satu argumen); gate moderasi identik.

`PGRST_DB_MAX_ROWS` (`HANDOVER.md:437-439,451-452`) tetap 100000; filter SQL mengurangi transfer 3069 baris, bukan menggantikan konfigurasi. Gate keluar: tujuh `supabase/tests/` lolos, signature dua argumen dan `P0002` diverifikasi, penguji menguji perilaku/RLS bukan nama `pg_proc` (`MATRIKS-RPC-AKSES.md:103`).

## Gate keluar Fase 3 dan 4 per peran

Bukti `curl -i` dengan JWT simulasi `@invalid`: respons HTTP + jumlah baris atau hasil SQL. Simpan di `docs/bukti-gate-siklus2/`.

| Peran | Target | Expected | Gagal bila |
|---|---|---|---|
| IoT/Vice IoT | `rpc/can_access_observation`, `participants`, `assessment_ratings`, `assessment_snapshots`, `assessment_snapshot_private_sources`, `/dashboard/evaluasi`, `/dashboard/laporan` | `false`; 0 baris/42501; halaman 307 | masih ada baris/`true`/200 walau menu disembunyikan |
| Instruktur koordinator | `rpc/is_assessment_moderator`, `rpc/get_event_assessment_summary`, publish | `true`; rekap sesuai penugasan; publish 200 | publish ditolak pada koordinator sah |
| Bidang Kader | `rpc/get_event_report_rows`, publish, `rpc/record_assessment_export`, audit | rekap 200; publish/ekspor 42501; audit privasi 0 baris | publish/ekspor berhasil atau `snapshot_data` terbaca |
| Admin Sistem | `rpc/assign_participant_account`, publish, ekspor | 200; baris `participant_access` satu transaksi | baris tidak ada/`expires_at` null |
| Komisariat A vs B | `rpc/get_commissariat_event_summary` | A hanya `commissariat_id` A; total < 10 tanpa distribusi | A melihat B atau kombinasi 9:1 terpapar |
| anon/publik | `rpc/get_public_event_aggregate`, tabel alur | agregat hanya bila dipanggil `app/page.tsx:9`; tabel 401/403 | `grant anon`, identitas, atau baris terbaca |
| Peserta normal | `rpc/get_my_published_assessment_report` | rapor miliknya; `P0002` bila belum publish | rapor lain terbaca |
| Peserta kadaluwarsa/dicabut/berflag | RPC rapor langsung | `P0002`/42501 sampai `expires_at > now()`, `revoked_at is null`, flag clear | masih bisa mengambil rapor |

Gate gagal bila IoT, Kader di luar kewenangannya, atau anon masih bisa mengambil data sensitif lewat Rest/SQL langsung. Pelonggaran 24 November 2026 hanya pada pesan peringatan UI, bukan baris gate di atas.
