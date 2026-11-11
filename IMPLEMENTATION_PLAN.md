# Rencana Implementasi — DAD Assessment & Cadre Development System

Dokumen ini mencatat urutan kerja berdasarkan audit repository 11 November 2026. `BLUEPRINT.md` tetap menjadi sumber keputusan produk dan aturan akses. Tahap berikutnya baru dimulai setelah pengguna memeriksa dan menyatakan tahap berjalan sesuai atau meminta lanjut.

## Kondisi repository

- Frontend: Next.js 16.4.3 App Router, React 19.2, TypeScript 5.9.
- Backend dan basis data: Supabase Auth, PostgreSQL, RLS, Storage; klien server/browser tersedia di `lib/supabase/`.
- Package manager: npm (`package-lock.json`).
- Fitur yang sudah ada: login/role, kegiatan dan peserta, Komisariat, rubrik dan observasi, pengajuan Komisariat dan seleksi administrasi, profil Instruktur, serta beberapa alur dashboard.
- Migrasi database tersimpan berurutan di `supabase/migrations/`.
- Dependensi relevan yang tersedia: `@supabase/ssr`, `@supabase/supabase-js`, dan `xlsx`. Belum ada dependensi khusus PDF yang digunakan.
- Foto peserta opsional dan migrasi perluasan engine rubrik sudah dikonfirmasi berhasil oleh pengguna. Spesifikasi kerangka trial DAD telah disiapkan di `TRIAL_DAD_COMPETENCY_FRAMEWORK.md`; seed database dan alur salin template belum dibuat.
- Repository memiliki perubahan lokal yang belum dikomit. Perubahan tersebut dipertahankan.

## Prinsip arsitektur

1. Pertahankan Next.js dan pola Supabase yang sudah berjalan; jangan membuat integrasi duplikat.
2. Otorisasi diberlakukan di server dan RLS. Kunci service role hanya boleh dipakai di server.
3. Migration SQL menjadi perubahan skema yang berurutan dan dapat ditinjau.
4. Satu skor bersama disimpan per peserta/indikator dengan riwayat perubahan. Catatan tetap per penulis. Template awal ditetapkan sebagai trial, lalu bisa dikustomisasi melalui versi baru pada fase berikutnya.
5. Pengembangan memakai data simulasi. Jangan mempublikasikan aplikasi atau memasukkan data nyata sebelum peninjauan privasi, keamanan, backup, dan biaya.
6. Tambahkan dependensi hanya bila fitur yang disetujui membutuhkannya.

## Tahapan dan ketergantungan

| Tahap | Cakupan | Status dan ketergantungan |
|---|---|---|
| 1. Fondasi | Audit, skema, autentikasi, role, RLS | Sudah dikerjakan dan diterima menurut `HANDOVER.md`; audit akses menyeluruh tetap diperlukan sebelum rilis. |
| 2. Kegiatan dan peserta | Kegiatan, peserta, Komisariat, materi, penugasan | Fitur dasar sudah ada. Form pengajuan Komisariat dan seleksi administrasi sudah dibuat; migrasi/alur browser terbaru masih perlu pemeriksaan pengguna. |
| 2A. Competency Framework | Master framework DAD trial v1: aspek, indikator, bobot, dan relasi | Migration seed berhasil diterapkan di Supabase menurut konfirmasi pengguna. File SQL regression check tersedia; hasilnya belum dikonfirmasi terpisah. |
| 3. Rubric Engine | Master 7 materi, 27 rubrik indikator, 135 behavioral anchors, N/O, preview, dan RLS | Dua migration berhasil diterapkan menurut pengguna dan SQL regression Phase 3 lulus. Preview browser masih perlu diperiksa sebelum Phase 4. Approval workflow tetap tidak digunakan sesuai keputusan pengguna. |
| 4. Assessment Form | Form asesmen dinamis, referensi versi rubrik, dan alur input observer | Fondasi form lama sudah ada. Integrasi template master ke rubrik kegiatan menjadi fase berikutnya setelah Phase 3 diterima. |
| 5. Analitik | Agregasi, dashboard, progres dan profil kompetensi | Sebagian ringkasan dashboard sudah ada. Analitik lintas kegiatan dan pemeriksaan privasi agregat belum lengkap. |
| 6. Evaluasi | Tes, evaluasi program, moderasi dan sidang kelulusan | Impor tes ditunda. Evaluasi program dan keputusan sidang belum diimplementasikan penuh. |
| 7. Pelaporan | Rapor dan ekspor PDF/Excel, riwayat ekspor | Belum lengkap. Format dan alur persetujuan rapor masih mengikuti keputusan terbuka pada blueprint. |
| 8. Pengembangan kader | Rekomendasi dan pemantauan 30/60/90 hari | Belum dikerjakan; bergantung pada hasil final dan kebijakan akses yang disetujui. |
| 9. QA dan persiapan rilis | Uji alur, RLS, privasi, performa, backup dan dokumentasi deployment | Belum selesai; tidak boleh dinyatakan siap produksi sebelum pemeriksaan menyeluruh. |

## Urutan kerja terdekat

1. Buka `/dashboard/kerangka` di browser dan tinjau preview aspek, materi, serta anchor 27 indikator.
2. Setelah preview diperiksa dan diterima, lanjutkan Phase 4 sesuai izin pengguna.

## Pemeriksaan sebelum penggunaan nyata

- Uji akses langsung setiap role di server dan RLS, termasuk isolasi kegiatan dan catatan privat.
- Uji konflik serta sinkronisasi antar-Observer sebelum menyebut kolaborasi realtime siap.
- Pastikan status sementara/resmi dan snapshot nilai tidak berubah diam-diam.
- Tinjau retensi berkas, backup/pemulihan, biaya layanan, serta izin publik.
- Jalankan pemeriksaan browser nyata dan keamanan; keberhasilan TypeScript/build saja tidak membuktikan hal tersebut.
