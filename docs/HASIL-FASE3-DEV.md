# Hasil Fase 3a–3c di DEV

Tanggal: 24 November 2026. Branch: `research/peta-alur-penilaian`. Data simulasi di Supabase lokal `127.0.0.1:54322` dan Next.js `localhost:3100`. Tidak ada deploy atau penulisan ke produksi.

## Yang diubah

- **3a:** migrasi baru `20261124113000` mencabut `bidang_kader` dari `record_assessment_export`. `app/dashboard/laporan/actions.ts` tidak lagi menerima Kader sebagai penerbit atau pengekspor; ekspor kini hanya Admin Sistem atau Instruktur dengan penugasan `mot`, `vice_mot`, `master_observer`, `vice_observer`. Pengecualian Peserta untuk `individual_pdf` tetap. Halaman Laporan menyembunyikan tombol Terbit dan seluruh panel ekspor untuk Kader.
- **3b:** migrasi baru `20261124110000` menambah `can_review_observation`, menimpa delapan policy SELECT dengan pola moderator atau pemilik, memecah policy tulis Observasi menjadi INSERT dan UPDATE, dan mencabut akses baca rekan untuk Instruktur non-koordinator. Helper bersama `lib/moderation-access.ts` dipakai halaman Evaluasi dan Laporan.
- **3c:** migrasi baru `20261124103000` membuat `get_commissariat_event_summary(uuid)` dengan filter komisariat, agregasi dua tahap, ambang 10, dan tanpa identitas peserta.
- Satu perbaikan saat verifikasi: policy `participants_read_assigned_instructor` dikembalikan ke `is_assigned_instructor_for_event` supaya IoT tetap melihat daftar peserta untuk mengisi Observasi. Nilai, catatan, dan rekap tetap tertutup oleh policy tabel penilaian.

## Verifikasi otomatis

- `npm run check`: 0 error, 5 peringatan lama, 22 tes lolos.
- `npm run build`: berhasil.
- Tiga migrasi dipasang di DEV. Migrasi RLS sempat gagal karena `observations` memakai `updated_by`, bukan `changed_by`; setelah diperbaiki, semua migrasi lolos.
- 8 dari 8 penguji SQL lolos.

## Verifikasi browser dan SQL

- Kader membuka Laporan: rekap tampil, tombol Terbit tidak ada, panel "Ekspor dan laporan" tidak ada.
- Observer A membuka Observasi: 5 peserta tampil, tanpa banner error, Realtime tersambung. Masih bisa membaca barisnya sendiri.
- Akun Instruktur sementara diubah menjadi `iot` di DEV: 5 peserta tampil di Observasi, tanpa banner. Query SQL dengan JWT akun itu: `participants` 5 baris, `assessment_ratings` 0 baris, `can_review_observation` false. Posisi dikembalikan ke `mot` setelah uji.

## Keputusan kecil yang dipakai

- Aturan "Lainnya": distribusi hanya tampil bila ada minimal satu komisariat dengan 10 peserta atau lebih. Kombinasi 9:1 dan 5+5 menghasilkan distribusi kosong; 18:2 menampilkan 18. Ini mengikuti contoh uji pada rencana.
- `get_commissariat_event_summary` mengembalikan bucket `{key,count,average_score}` dengan `key` = nama komisariat, bukan distribusi `graduation_decision`.

## Yang belum dikerjakan

- Fase 3d akun Peserta, 3e retensi dan agregat publik, 3f impor, dan 3g rubrik trial.
- Menu IoT di sidebar masih menampilkan Evaluasi Kolektif dan Laporan & Rapor. Halaman tetap mengarahkan ke dashboard; ini UX, bukan pengamanan.
- RLS lintas peran penuh dan uji dua akun untuk konflik serta Realtime belum diulang setelah Fase 3.
- Tidak ada snapshot, publikasi, atau akun Peserta baru yang dibuat selama verifikasi.
