# Rencana Perbaikan Otorisasi Peserta dan Foto

**Tanggal:** 27 November 2026
**Status:** rencana saja. Belum ada kode, migrasi, atau data yang diubah.
**Disetujui pemilik:** 27 November 2026 untuk disusun. Eksekusi menunggu review rencana ini dan keputusan deploy terpisah.

## 1. Tujuan

Observer hanya boleh menambah, mengubah, menghapus, dan membuka foto peserta pada kegiatan yang benar-benar ditugaskan kepadanya. Admin Sistem tetap boleh mengelola semua kegiatan. Pemeriksaan dipasang di dua lapis: fungsi di aplikasi dan aturan di basis data.

## 2. Dasar temuan yang sudah diverifikasi

- `app/dashboard/kegiatan/actions.ts:62-75` — `authorizedActor()` hanya memeriksa peran `admin_system`/`observer`. `:77-79` adalah `authorizedClient()`, pembungkus yang mengambil klien dari fungsi itu.
- `app/dashboard/kegiatan/actions.ts:81-94` — `assertEventActive()` hanya memeriksa kegiatan ada dan belum diarsipkan. Tidak mengecek penugasan.
- `app/dashboard/kegiatan/actions.ts:229,296,372` — `addParticipant`, `editParticipant`, `removeParticipant` memakai kedua fungsi di atas. Pemeriksaan akhirnya ada di `:265`, `:337`, dan `:383`. Ketiga fungsi itu tidak mengecek penugasan Observer.
- `app/dashboard/kegiatan/actions.ts:122-133` — `updateEvent` sudah melakukan pemeriksaan penugasan. Ini menjadi acuan pola yang dipakai.
- `supabase/migrations/20261029010000_events_participants.sql:27-33` dan `20261029020000_observer_event_permissions.sql:2-8` — `can_manage_events()` hanya memeriksa peran, tanpa `event_id`.
- `supabase/migrations/20261029070000_rubrics_observations.sql:117-120` — policy SELECT peserta sudah memakai `can_access_event(event_id)` yang benar, tetapi policy INSERT/UPDATE/DELETE masih memakai `can_manage_events()`.
- `supabase/migrations/20261029060000_private_participant_photos.sql:13-25` — tiga policy bucket `participant-photos` juga masih memakai `can_manage_events()`.
- `supabase/migrations/20261106210000_instructor_assigned_profiles.sql:35-41` — policy foto untuk Instruktur sudah membatasi berdasarkan segmen pertama path. Ini menjadi acuan untuk Observer.
- `supabase/migrations/20261106120000_observer_event_scope_and_rename_guard.sql:2-17,28-44` — fungsi `is_assigned_observer_for_event(uuid)` sudah ada dan policy tabel `events` sudah benar. Tidak perlu dibuat fungsi baru atau diubah.
- Dampak yang sudah tertahan: lewat Server Action biasa, `assertEventActive` membaca tabel `events` dengan JWT pengguna, sehingga policy `events_read_scoped_staff` (`20261106120000_observer_event_scope_and_rename_guard.sql:28-34`) menyembunyikan kegiatan B. Untuk edit/hapus, policy `participants_read_assigned_observer` (`20261029070000_rubrics_observations.sql:117`) juga menyaring baris sebelum `:336` dan `:382`. Jadi tombol di halaman tidak langsung membocorkan kegiatan B.
- Dampak yang masih terbuka: Observer dapat menulis peserta ke kegiatan B lewat PostgREST langsung, dan dapat meminta tautan foto peserta kegiatan B lewat Storage API langsung. Keduanya tidak melewati `assertEventActive`. Tampilan `/dashboard/peserta` sudah terbatasi policy SELECT, tetapi aturan tulis dan aturan berkas masih hanya berbasis peran.

## 3. Perubahan yang direncanakan

### 3.1 Lapisan aplikasi

Berkas: `app/dashboard/kegiatan/actions.ts`

1. Tetapkan `authorizedActor()` sebagai gerbang peran seperti sekarang.
2. Tambah helper `assertEventAssignment(supabase, userId, role, eventId, actionLabel)`. Helper ini **hanya mengecek penugasan**, tidak memanggil `assertEventActive`. `actionLabel` membuat pesan sesuai konteks, misalnya `mengelola peserta` atau `mengubah detail kegiatan`:
   - validasi `eventId` memakai pola UUID kanonik yang lebih ketat dari `uuidPattern` di `lib/validation.ts:2` (pola lama `/^[0-9a-f-]{36}$/i` terlalu longgar);
   - Admin Sistem langsung lolos;
   - Observer wajib memiliki baris di `observer_assignments` dengan `event_id` dan `observer_id` yang cocok;
   - jika tidak ada, lempar pesan: `Anda hanya dapat ${actionLabel} pada kegiatan yang ditugaskan.`
3. Pasang helper itu tanpa menggandakan query:
   - `addParticipant`: sesudah validasi input dan sebelum `assertEventActive` di `:265`;
   - `editParticipant` dan `removeParticipant`: sesudah baris `current` terbaca dari `participants` (`:330-334` dan `:377-381`), menggantikan `assertEventActive` lama di `:337` dan `:383` dengan `assertEventAssignment` lalu `assertEventActive(current.event_id)`;
   - tiga pemanggilan `assertEventActive` yang tersisa tetap satu per aksi, tidak ada yang dipanggil dua kali.
4. Ubah `updateEvent` agar memakai `assertEventAssignment(..., "mengubah detail kegiatan")` menggantikan blok `:122-133`. Pesannya menjadi `Anda hanya dapat mengubah detail kegiatan pada kegiatan yang ditugaskan.` Perilaku kegiatan terarsip **sengaja tidak diubah**: `updateEvent` tetap hanya menyaring dengan `.is("archived_at", null)` di `:149`, jadi update pada kegiatan terarsip tetap gagal diam-diam seperti sekarang, bukan melempar pesan baru.
5. Tidak mengubah bentuk `FormData`, validasi foto, `revalidatePath`, atau alur halaman. Ketidaksesuaian `uuidPattern` dengan UUID kanonik dicatat sebagai utang terpisah, bukan dirombak di sini.

### 3.2 Lapisan basis data

Berkas baru: `supabase/migrations/20261127000000_participant_event_scope_v1.sql`

1. Drop dan buat ulang tepat tiga policy `public.participants`:
   - `participants_insert_by_authorized_roles`
   - `participants_update_by_authorized_roles`
   - `participants_delete_by_authorized_roles`

   Nama itu diambil dari `20261029070000_rubrics_observations.sql:118-120`. Nyata yang harus dihapus, bukan sekadar ditimpa, karena policy bersifat permissive dan di-OR. Syarat baru:

   ```sql
   (select public.is_admin_system())
   or (select public.is_assigned_observer_for_event(event_id))
   ```

   Berlaku untuk `using` dan `with check`.

2. Drop dan buat ulang tepat tiga policy `storage.objects`:
   - `participant_photos_read_by_event_managers`
   - `participant_photos_insert_by_event_managers`
   - `participant_photos_delete_by_event_managers`

   Nama itu diambil dari `20261029060000_private_participant_photos.sql:13-25`. Regex UUID dipakai persis sama dengan policy Instruktur di `20261106210000_instructor_assigned_profiles.sql:39`. Pola mengikuti policy itu, dengan `CASE` agar cast tidak terjadi pada path abnormal:

   ```sql
   bucket_id = 'participant-photos'
   and (
     (select public.is_admin_system())
     or case
          when split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then (select public.is_assigned_observer_for_event(split_part(name, '/', 1)::uuid))
          else false
        end
   )
   ```

3. Policy SELECT yang lain **tidak disentuh**: `participants_read_assigned_observer`, `participants_read_assigned_instructor`, `participants_read_own_published_report`, dan `participant_photos_read_by_assigned_instructors`. Halaman Profil Peserta untuk Instruktur memakai policy terakhir lewat `signMany` di `app/dashboard/profil-peserta/page.tsx:61-66`.
4. Tidak mengubah `can_manage_events()` dan `can_access_event()`. Fungsi pertama memang tidak lagi dipakai policy mana pun setelah keenam policy lama dihapus, tetapi sengaja dibiarkan agar migrasi lama tetap bisa dibaca. Alasan ini ditulis sebagai komentar di migrasi.
5. Migrasi dibuat idempotent dengan `drop policy if exists` sebelum `create policy`, mengikuti kebiasaan migrasi yang ada.
6. Sertakan berkas rollback berisi policy lama persis seperti di `20261029070000_rubrics_observations.sql:118-120` dan `20261029060000_private_participant_photos.sql:13-25`.
7. Kegiatan terarsip masih bisa ditulis lewat PostgREST langsung karena policy baru tidak memeriksa `archived_at`. Ini sudah menjadi kondisi sekarang dan sengaja tidak diperluas ke sini; dicatat sebagai utang terpisah.

### 3.3 Penguji otomatis

Berkas baru: `supabase/tests/participant_event_scope.sql`

Mengikuti pola `supabase/tests/material_archive.sql` (transaksi `begin` dan di-rollback di akhir) dengan tambahan `\set ON_ERROR_STOP on` di baris pertama, seperti `scripts/retention-dry-run.sql:4`. Tanpa itu, `psql` dapat tetap keluar dengan kode 0 setelah `raise exception`.

Fixtures memakai akun QA sintetik yang sudah ada di DEV (`HANDOVER.md:81,119`; email ada di `.env.qa-test` yang di-gitignore). Kedua Observer QA itu sudah memiliki penugasan ke `PK IMM FEB UM Bandung`, jadi jangan INSERT polos. ID diambil dari `auth.users` memakai email tersebut. Semua penyesuaian `public.profiles` dan `observer_assignments` dilakukan **sebelum** `set local role authenticated`, dengan peran privileged di awal transaksi:

1. `profiles`: pastikan role sesuai memakai `insert ... on conflict (id) do update`, bukan INSERT polos.
2. Penugasan: Observer A **hanya** punya baris untuk kegiatan A, Observer B **hanya** punya baris untuk kegiatan B. Pastikan dengan `insert ... (event_id, observer_id, assigned_by) values (..., id_admin_qa) on conflict (event_id, observer_id) do nothing`. Kolom `assigned_by` wajib dan tidak punya default (`20261029070000_rubrics_observations.sql:14-20`). Hapus penugasan lama yang tidak sesuai pola ini di dalam transaksi.
3. Skenario "Observer tanpa penugasan": di dalam transaksi yang sama, hapus baris penugasan Observer B untuk kegiatan B. Karena penguji di-rollback di akhir, penugasan asli di DEV kembali utuh. Tidak perlu akun ketiga dan tidak ada INSERT ke `auth.users`.
4. Data pendukung: sebelum `set local role authenticated`, siapkan satu peserta di kegiatan A dan satu di kegiatan B, serta dua baris `storage.objects` di bucket `participant-photos` dengan nama `eventA/participantA/uuid.jpg` dan `eventB/participantB/uuid.jpg`. Semua dibuat dengan peran privileged dan ikut ter-rollback.

Assert yang diuji dengan `set local role authenticated` dan `set_config('request.jwt.claim.sub', ...)`:

1. Definisi policy, bukan nama policy. Keenam policy memang sengaja memakai nama yang sama dengan yang lama, sehingga asersi "nama lama hilang" mustahil lulus. Seleksi `pg_policies` difilter per `schemaname`, `tablename`, dan `policyname`, lalu pastikan `qual`/`with_check` memuat `is_assigned_observer_for_event` dan tidak lagi memuat `can_manage_events`. Jumlah policy baru harus tepat enam pada dua objek tersebut.
2. Observer A menambah peserta ke kegiatan A berhasil, ke kegiatan B gagal.
3. Observer A mengubah dan menghapus peserta kegiatan A berhasil, kegiatan B gagal.
4. Observer A membaca `storage.objects` untuk path foto kegiatan A berhasil, kegiatan B gagal.
5. Observer tanpa penugasan gagal untuk ketiga aksi di semua kegiatan.
6. Admin Sistem berhasil untuk semua aksi di kedua kegiatan.
7. Baris policy Instruktur `participant_photos_read_by_assigned_instructors` masih ada.

## 4. Cara memverifikasi

1. `npm run check` dan `npm run build` di Linux. Hasil yang diharapkan: tetap hijau, 27 tes lolos.
2. Jalankan `supabase/tests/participant_event_scope.sql` hanya di project DEV.
3. Uji browser DEV dengan dua akun Observer QA. Observer A hanya melihat kegiatannya. Coba kirim `eventId` kegiatan B lewat alat pengembang browser; aksi harus ditolak dan pesannya tampil.
4. Uji akses foto dengan JWT Observer A terhadap path kegiatan B; permintaan baru harus ditolak oleh policy Storage. Tautan yang sudah terbit sebelumnya berlaku sampai 3600 detik (`app/dashboard/peserta/page.tsx:79`) dan tidak dicabut serta-merta oleh perubahan policy, jadi jangan mengklaim pencabutan langsung.
5. Tidak ada pengujian yang menulis ke project produksi.

## 5. Deploy dan rollback

- DEV terlebih dahulu. Setelah semua verifikasi hijau, minta keputusan deploy produksi secara terpisah.
- Sebelum deploy produksi: backup direktori aplikasi dan `.env.production`, pastikan backup database harian masih berjalan, dan jangan memakai `rsync --delete`.
- Pasang migrasi lewat SQL Editor atau Management API. Di produksi hanya lakukan smoke baca dan pemeriksaan policy; jangan menjalankan penguji yang menulis data.
- Deploy kode memakai prosedur `docs/DEPLOYMENT.md`: rsync tanpa `--delete`, `npm ci`, `npm run build`, `pm2 restart`, lalu smoke delapan halaman lewat port 8080.
- Rollback kode: kembalikan commit sebelumnya lalu build dan restart. Rollback aturan basis data: jalankan berkas rollback policy lama. Tidak ada tabel atau baris yang dihapus.
- Setelah deploy, perbarui `docs/STATUS-PRODUKSI-SATU-VERSI.md` lebih dulu, baru dokumen lain.

## 6. Di luar lingkup

Temuan berikut dicatat tetapi sengaja tidak disentuh dalam perbaikan ini:

- RPC `get_public_event_aggregate(uuid)` yang bisa dipanggil untuk kegiatan lain.
- 254 `throw` untuk validasi yang seharusnya tampil inline.
- Duplikasi perhitungan indikator antara Server Action dan halaman Evaluasi.
- 15 cast `as unknown as` dan trik `setTimeout(..., 0)` untuk memuaskan aturan lint.
- Panel simulasi yang masih dirender sebagai fallback.
- Tabel `events`: policy yang berlaku sudah benar, jadi tidak diubah.
- Ketidaksesuaian `uuidPattern` di `lib/validation.ts:2` dengan UUID kanonik. Helper memakai pola ketat, validasi lama tidak dirombak.
- Tulisan ke kegiatan terarsip lewat PostgREST langsung masih memungkinkan, sama seperti kondisi sekarang.

## 7. Selesai ketika

- [ ] Helper otorisasi dipakai di empat fungsi pada `kegiatan/actions.ts`.
- [ ] Migrasi dan penguji SQL lolos di DEV.
- [ ] `npm run check` dan `npm run build` hijau.
- [ ] Uji browser dua Observer di DEV lolos, termasuk percobaan memakai `eventId` kegiatan lain.
- [ ] Uji akses foto lintas kegiatan ditolak.
- [ ] Setelah ada izin: deploy produksi dan pembaruan dokumen status selesai.
