# Rencana Implementasi — DAD Assessment & Cadre Development System

Dokumen ini mencatat urutan kerja berdasarkan audit repository 11 November 2026. `BLUEPRINT.md` tetap menjadi sumber keputusan produk dan aturan akses. Tahap berikutnya baru dimulai setelah pengguna memeriksa dan menyatakan tahap berjalan sesuai atau meminta lanjut.

## Kondisi repository

- Frontend: Next.js 16.4.3 App Router, React 19.2, TypeScript 5.9.
- Backend dan basis data: Supabase Auth, PostgreSQL, RLS, Storage; klien server/browser tersedia di `lib/supabase/`.
- Package manager: npm (`package-lock.json`).
- Fitur yang sudah ada: login/role, kegiatan dan peserta, Komisariat, rubrik dan observasi, pengajuan Komisariat dan seleksi administrasi, profil Instruktur, serta beberapa alur dashboard.
- Migrasi database tersimpan berurutan di `supabase/migrations/`.
- Dependensi relevan yang tersedia: `@supabase/ssr`, `@supabase/supabase-js`, dan `xlsx`. Belum ada dependensi khusus PDF yang digunakan.
- Foto peserta opsional dan migration framework/rubrik Phase 2–3 telah dikonfirmasi berhasil oleh pengguna. Spesifikasi trial serta mapping Phase 4 diperbarui di `TRIAL_DAD_COMPETENCY_FRAMEWORK.md`; migration final Phase 4 menunggu diterapkan.
- Perubahan sampai Phase 3 sudah tersinkron ke `origin/main` pada commit `ad5a2a7`. Perubahan Phase 4 yang sedang dikerjakan akan menjadi commit berikutnya setelah ditinjau pengguna.

## Prinsip arsitektur

1. Pertahankan Next.js dan pola Supabase yang sudah berjalan; jangan membuat integrasi duplikat.
2. Otorisasi diberlakukan di server dan RLS. Kunci service role hanya boleh dipakai di server.
3. Migration SQL menjadi perubahan skema yang berurutan dan dapat ditinjau.
4. Keputusan terbaru Phase 5: satu skor independen per observer/peserta/indikator/versi rubrik, dengan bukti, status, revisi, dan audit trail. Data legacy skor bersama dipertahankan sebagai historis; agregasi baru menunggu Phase 6.
5. Pengembangan memakai data simulasi. Jangan mempublikasikan aplikasi atau memasukkan data nyata sebelum peninjauan privasi, keamanan, backup, dan biaya.
6. Tambahkan dependensi hanya bila fitur yang disetujui membutuhkannya.

## Tahapan dan ketergantungan

| Tahap | Cakupan | Status dan ketergantungan |
|---|---|---|
| 1. Fondasi | Audit, skema, autentikasi, role, RLS | Sudah dikerjakan dan diterima menurut `HANDOVER.md`; audit akses menyeluruh tetap diperlukan sebelum rilis. |
| 2. Kegiatan dan peserta | Kegiatan, peserta, Komisariat, materi, penugasan | Fitur dasar sudah ada. Form pengajuan Komisariat dan seleksi administrasi sudah dibuat; migrasi/alur browser terbaru masih perlu pemeriksaan pengguna. |
| 2A. Competency Framework | Master framework DAD trial v1: aspek, indikator, bobot, dan relasi | Migration seed berhasil diterapkan di Supabase menurut konfirmasi pengguna. File SQL regression check tersedia; hasilnya belum dikonfirmasi terpisah. |
| 3. Rubric Engine | Master 7 materi, 27 rubrik indikator, 135 behavioral anchors, N/O, preview, dan RLS | Migration serta SQL regression berhasil menurut pengguna; halaman `/dashboard/kerangka` telah tampil. Pengguna meminta lanjut ke Phase 4. Approval workflow tetap tidak digunakan sesuai keputusan pengguna. |
| 4. Material Mapping | Seed materi/aktivitas ke aspek, indikator, metode, panduan, cakupan sesi/lintas sesi, matriks read-only, dan validasi | Migrations 1400 dan 1500 berhasil diterapkan menurut pengguna. SQL regression Phase 2–4 dan uji browser masih menunggu. TypeScript dan diff check lulus. |
| 5. Assessment Workspace | Rating independen observer, bukti, N/O, autosave/offline, Realtime, submission, RLS, audit, dynamic mapping | Implementasi lokal tersedia; pengguna sempat mendapat `42P07` karena `assessment_submissions` sudah ada saat suatu migrasi dijalankan. Kelengkapan Phase 5 perlu diverifikasi dengan `supabase/tests/dad_assessment_phase5.sql`; uji browser/dua akun belum dikonfirmasi. |
| 6. Scoring & Collective Evaluation | Agregasi per peserta/indikator/cakupan, coverage, moderasi, evaluasi kolektif, keputusan manual, rekomendasi disetujui, snapshot immutable | Implementasi lokal tersedia di `/dashboard/evaluasi`; migration `20261112170000_dad_scoring_collective_evaluation_v1.sql` dan regression SQL tersedia. Unit test 10/10, TSC, dan diff check lulus. Migration dan SQL regression belum dikonfirmasi berjalan; browser/RLS multiakun belum diverifikasi. |
| 5. Analitik | Agregasi, dashboard, progres dan profil kompetensi | Sebagian ringkasan dashboard sudah ada. Analitik lintas kegiatan dan pemeriksaan privasi agregat belum lengkap. |
| 6. Evaluasi | Tes, evaluasi program, moderasi dan sidang kelulusan | Impor tes ditunda. Evaluasi program dan keputusan sidang belum diimplementasikan penuh. |
| 7. Dashboard, Rapor, Reporting & Export | Dashboard role, snapshot final, publikasi, PDF/ZIP, Excel, event report, audit | Implementasi lokal tersedia di dashboard root dan `/dashboard/laporan`; migration `20261112180000_dad_reporting_publication_v1.sql` serta SQL regression tersedia. Tes generator PDF/ZIP 2/2 dan TSC lulus. Menunggu verifikasi Phase 5/6 lalu migration 1800 dan uji browser/RLS/SQL di Supabase. |
| 8. Pengembangan kader | Rekomendasi dan pemantauan 30/60/90 hari | Belum dikerjakan; bergantung pada hasil final dan kebijakan akses yang disetujui. |
| 9. QA dan persiapan rilis | Uji alur, RLS, privasi, performa, backup dan dokumentasi deployment | Belum selesai; tidak boleh dinyatakan siap produksi sebelum pemeriksaan menyeluruh. |

## Urutan kerja terdekat

1. Jalankan `supabase/tests/dad_assessment_phase5.sql`. Jika lulus, Phase 5 lengkap; jangan ulangi migration itu karena tabel `assessment_submissions` sudah terdeteksi ada.
2. Jalankan `supabase/tests/dad_scoring_phase6.sql`. Jika fungsi/tabel Phase 6 belum ada, terapkan migration 1700 lalu ulangi cek. Jangan lanjut ke migration 1800 sebelum Phase 6 lengkap.
3. Terapkan `20261112180000_dad_reporting_publication_v1.sql`, kemudian jalankan `supabase/tests/dad_reporting_phase7.sql`.
4. Jalankan server lokal dan uji role Admin, Bidang Kader, koordinator, Observer, dan Peserta dengan data simulasi. Pastikan akun Peserta ditautkan, rapor hanya tampil setelah Published, dan bulk export mengecualikan yang belum Published.

## Pemeriksaan sebelum penggunaan nyata

- Uji akses langsung setiap role di server dan RLS, termasuk isolasi kegiatan dan catatan privat.
- Uji konflik serta sinkronisasi antar-Observer sebelum menyebut kolaborasi realtime siap.
- Pastikan status sementara/resmi dan snapshot nilai tidak berubah diam-diam.
- Tinjau retensi berkas, backup/pemulihan, biaya layanan, serta izin publik.
- Jalankan pemeriksaan browser nyata dan keamanan; keberhasilan TypeScript/build saja tidak membuktikan hal tersebut.
