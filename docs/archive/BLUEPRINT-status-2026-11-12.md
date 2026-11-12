## Status proyek saat ini

### Verifikasi Supabase — 12 November 2026

- Regression SQL Phase 5 (`dad_assessment_phase5.sql`) dan Phase 6 (`dad_scoring_phase6.sql`, setelah perbaikan placeholder `%%`) dilaporkan pengguna **lulus**. Migration Phase 7 (`20261112180000_dad_reporting_publication_v1.sql`) terpasang dan `dad_reporting_phase7.sql` dilaporkan **berhasil**. Belum diuji di browser: dua akun, RLS lintas role, Realtime, submission/finalisasi, publikasi rapor, dan ekspor PDF/ZIP/Excel. Data tetap simulasi.

### Keputusan terbaru Phase 5 — 11 November 2026

- Prompt Phase 5 terbaru menggantikan keputusan lama untuk satu skor bersama: setiap Observer menyimpan skor, N/O, bukti, revisi, dan statusnya sendiri per peserta/indikator/versi rubrik. Penilaian observer lain ditampilkan baca-saja; catatan kategori tetap terpisah per penulis.
- Status submission per peserta dan observer: Draft → Submitted → Finalized. Observer dapat mengirim dan membuka kembali kirimannya; hanya Admin Sistem dapat finalisasi setelah seluruh Observer yang ditugaskan mengirim peserta itu. Finalisasi mengunci revisi langsung; pembukaan kembali finalisasi belum tersedia pada MVP.
- Nilai kolektif, nilai resmi, dan laporan belum dihitung di Phase 5; agregasi skor observer adalah Phase 6. Skor yang tampil di workspace hanya pratinjau milik observer.
- Pada Pengaturan Penilaian, Admin Sistem dapat memilih subset aspek dan indikator master untuk tiap materi pada versi draf; pilihan disimpan sebagai snapshot versi rubrik, dengan anchor master dan bobot awal yang dapat disesuaikan sebelum aktivasi. Master framework Phase 2 dan mapping Phase 4 tetap read-only.
- Kelompok belum memiliki model/tabel pada aplikasi. Workspace MVP sekarang memakai satu cakupan “Semua peserta”; pemisahan kelompok perlu ditambahkan sesudah rancangan kelompok disepakati.

### Tahap 1 — tampilan dasar dan navigasi: diterima pengguna

- Dashboard simulasi enam role dibuat dengan warna utama merah marun.
- Tampilan tiap role mengikuti umpan balik pengguna. Seluruh konten masih data contoh.
- Dashboard sebelumnya memiliki pemilih role pratinjau; pada tahap 2 pemilih ini tidak lagi tersedia untuk pengalaman pengguna.

### Tahap 2 — login, role, dan pembatasan akses: fondasi implementasi tersedia

- Metode login yang dipilih: email dan kata sandi untuk Admin Sistem, Bidang Kader, dan Observer (akun dibuat Admin; pendaftaran umum tidak ditampilkan).
- Pengunjung publik tetap membuka `/`. Login berada di `/login`, dan ruang internal di `/dashboard`.
- Next.js diperbarui ke 16.4.3 dan React ke 19.2.0; Supabase SSR/client ditambahkan.
- Pemeriksaan sesi menggunakan `getClaims()` pada Proxy dan halaman dashboard. Role dibaca dari tabel profil di server, bukan dari pilihan browser.
- Migrasi awal menyediakan tabel `profiles`, role yang diizinkan, pembuatan profil tanpa role saat akun Auth dibuat, serta Row Level Security untuk pembacaan diri sendiri/Admin dan perubahan oleh Admin.
- Kredensial Supabase belum tersedia; login end-to-end, kebijakan SQL pada proyek Supabase sebenarnya, dan uji lintas role belum dapat dilakukan.
- Pengelolaan pengguna melalui layar Admin Sistem tersedia untuk akun yang sudah dibuat. Admin pertama perlu ditetapkan melalui Supabase SQL Editor sesuai panduan README.
- Tabel kegiatan, peserta, penugasan, rubrik, observasi, impor tes, dan pengajuan Komisariat telah ditambahkan melalui migrasi bertahap. RLS tersedia tetapi tetap perlu diperiksa pada proyek Supabase pengguna dan diuji lintas role.
- Build produksi berhasil setelah perbaikan tipe pada route sign-out.
- Halaman admin `/dashboard/pengguna` tersedia untuk membaca daftar profil dan mengatur role akun yang sudah dibuat. Pemeriksaan admin dilakukan di halaman dan Server Action; perubahan data mengikuti RLS. Akun baru tetap dibuat melalui Supabase Auth, dan Admin pertama tetap ditetapkan melalui SQL Editor.
- Belum diuji terhadap proyek Supabase nyata. Build lokal tidak membuktikan konfigurasi RLS ataupun alur login end-to-end.
- Pemeriksaan manual pada proyek Supabase pengguna (29 Oktober 2026): Admin Uji berhasil login dan melihat satu profil di halaman Pengguna; Admin memberi role Observer; Observer berhasil login dan membuka dashboard; saat sebagai Observer, akses ke `/dashboard/pengguna` kembali ke login dan daftar pengguna tidak tampil. Ini merupakan hasil yang dilaporkan pengguna.
- Pengujian belum mencakup akun tanpa role, percobaan langsung mengirim Server Action sebagai non-Admin, maupun login untuk semua role lainnya. Tahap 2 belum dinyatakan tuntas sepenuhnya sampai pemeriksaan sisa ini diputuskan/dilakukan.
- Pemeriksaan lanjutan yang dilaporkan pengguna (29 Oktober 2026): akun uji tanpa role saat membuka dashboard menerima peringatan “Akses belum diberikan”. Alur tanpa role kini teruji secara manual. Aksi server langsung oleh non-Admin dan role lain yang belum dicoba masih belum terverifikasi end-to-end.
- Pengguna menerima Tahap 2 dan meminta Tahap 3 dilanjutkan pada chat terpisah (29 Oktober 2026). Tahap 3 berikutnya: satu kegiatan DAD simulasi dan peserta simulasi.
- Implementasi Tahap 3 tersedia secara lokal: tabel `events` dan `participants`, kebijakan RLS untuk Observer dan Admin Sistem (Super Admin), satu kegiatan dan lima peserta rekaan, serta halaman pengelolaan kegiatan dan peserta. Build berhasil sebelum perubahan izin terbaru; migrasi dan alur data belum diuji pada proyek Supabase pengguna. Tahap 3 menunggu pemeriksaan dan penerimaan pengguna.
- Aturan terbaru pengguna: hak menambah, mengedit, dan menghapus kegiatan/peserta diberikan kepada Observer dan Super Admin. Untuk menjaga role yang sudah dipakai aplikasi, Super Admin dipetakan ke `admin_system` (label Admin Sistem). Bidang Kader, Komisariat, dan Peserta tidak mendapat hak ini. Migrasi perubahan izin `20261029020000_observer_event_permissions.sql` memperbarui RLS yang mungkin sudah pernah diterapkan.
- Halaman daftar Komisariat `/dashboard/komisariat` dan migrasi `20261029030000_commissariats.sql` dibuat dengan tiga nama simulasi. Admin Sistem dapat menambah/mengedit nama dan menonaktifkan/mengaktifkan entri; RLS melarang penghapusan permanen. Pengguna melaporkan migrasi 0300 dan 0400 berhasil dijalankan di Supabase.
- Pemeriksaan manual pengguna: nama Komisariat dapat diedit dan statusnya dapat dinonaktifkan melalui web.
- Migrasi `20261029040000_allow_same_name_participants.sql` menghapus batas basis data yang menolak dua peserta dengan nama dan Komisariat sama; deteksi/konfirmasi kemungkinan duplikat tetap menjadi bagian preview formulir pada fitur pengajuan mendatang.
- Form peserta memuat nama, pilihan Komisariat aktif, jurusan/program studi, tahun angkatan empat angka, dan jabatan opsional; Observer dan Admin Sistem dapat mengedit semua kolom. Pengguna melaporkan migrasi `20261029050000_participant_profiles.sql` berhasil dijalankan; halaman form terbaru masih menunggu pemeriksaan manual.
- Form tambah/edit peserta menyediakan unggah/ganti foto formal JPG/PNG maksimal 5 MB. Bucket `participant-photos` privat; migration `20261029060000_private_participant_photos.sql` memberi akses storage hanya kepada Observer dan Admin Sistem dan menyiapkan signed URL untuk tampilan foto. Server Action menerima body hingga 6 MB sesuai batas unggahan.
- Pengguna melaporkan migrasi penyimpanan foto 0600 berhasil dijalankan di Supabase; unggahan dan tampilan foto belum dikonfirmasi manual.
- Pemeriksaan manual pengguna: unggah foto peserta berhasil dan foto tersimpan; tampilan thumbnail setelah tersimpan belum dikonfirmasi secara terpisah.
- Pemeriksaan manual terbaru: Observer/Admin Sistem dapat menambah, mengedit, dan menghapus peserta pada form dengan profil baru; pengguna juga mengonfirmasi akses edit dan nonaktifkan Komisariat berhasil.
- Pengguna meminta melanjutkan setelah pemeriksaan Tahap 3; Tahap 3 dianggap diterima pada 29 Oktober 2026. Pengguna telah melaporkan kegiatan dan peserta dapat dikelola, data Komisariat dapat diedit/dinonaktifkan, serta foto berhasil diunggah dan tersimpan. Foto tampil kembali belum dikonfirmasi terpisah.
- Tahap 4 mulai dikerjakan pada 29 Oktober 2026 atas permintaan pengguna. Aturan yang sebelumnya terbuka sudah diputuskan: jika semua indikator dalam satu aspek belum diamati, aspek dikeluarkan dari nilai keseluruhan dan bobot aspek lain dinormalisasi ulang.
- Aturan resmi/sementara diputuskan pengguna pada 29 Oktober 2026: nilai resmi setelah semua Observer yang ditugaskan menyelesaikan penilaian; bila ada tugas yang belum selesai, nilai tetap sementara. Status selesai harus dibuka kembali otomatis bila skor/catatan berubah.
- Nilai agregat pengguna putuskan ditampilkan 0–100 menggunakan `(rata-rata berbobot 1–5 − 1) ÷ 4 × 100`, sehingga skor rata-rata 1 menjadi 0 dan 5 menjadi 100. Perhitungan disimpan tanpa pembulatan; tampilan memakai dua angka desimal.
- Migrasi `20261029070000_rubrics_observations.sql` menambahkan versi rubrik, aspek/indikator, penugasan Observer, skor/catatan observasi, riwayat revisi, dan RLS. Perluasan `20261111100000_dynamic_rubric_mappings_and_observer_notes.sql` menambah pemetaan indikator multi-aspek, uraian skor, catatan per penulis dan Realtime. Konfigurasi baru hanya dapat aktif bila bobot aspek dan bobot pemetaan indikator tiap aspek masing-masing 100%.
- Halaman `/dashboard/penilaian` memungkinkan Admin Sistem menyusun aspek/indikator, mengaktifkan versi dan membuat versi lanjutan; Admin Sistem/Bidang Kader dapat menugaskan Observer ke kegiatan. Versi aktif dan arsip tidak dapat diedit melalui kebijakan RLS.
- Halaman `/dashboard/observasi` menampilkan peserta dan catatan hanya bagi Admin Sistem atau Observer yang ditugaskan pada kegiatan. Skor/catatan disimpan otomatis, perubahan bersaing menggunakan nomor revisi untuk deteksi konflik, dan riwayat revisi dapat dilihat. RLS basis data membatasi akses ke peserta yang ditugaskan. Rata-rata berbobot dihitung dengan normalisasi bobot indikator/aspek sesuai data diamati; semua Observer harus menyelesaikan sebelum nilai ditandai resmi. Perubahan skor/catatan otomatis membuka kembali semua status selesai kegiatan.
- `npx tsc --noEmit` berhasil setelah perubahan Tahap 4. Belum menjalankan migrasi baru di Supabase milik pengguna dan belum meminta pemeriksaan manual. Build produksi dan uji tampilan/perilaku browser belum dilakukan.
- Tahap 4 diterima pengguna pada 29 Oktober 2026 saat meminta lanjut. Migrasi/alur Supabase tetap belum diperiksa manual; indikator final/contoh rubrik akan diisi sesuai kesepakatan instruktur. Penugasan tersedia per kegiatan, belum per materi/aspek/peserta.
- Penyempurnaan 6 November 2026: halaman Pengaturan Penilaian menampilkan daftar kegiatan terlebih dahulu. Admin/Bidang Kader memilih kegiatan, lalu melihat rubrik dan mengelola penugasan Observer untuk kegiatan terpilih; Observer yang ditugaskan mendapat kegiatan itu di menu Observasi.
- Pengguna ingin mencoba trial untuk pelatihan mendatang dari PK IMM FEB UM Bandung. Form tambah kegiatan tersedia di `/dashboard/kegiatan`, dengan nama dan penyelenggara awal tersebut serta isian lokasi/tanggal oleh pengguna. Trial boleh memakai metadata kegiatan aktual, tetapi peserta/foto/nilai tetap simulasi sampai kontrol akses, privasi dan backup ditinjau.
- Pengguna meminta halaman Kegiatan DAD untuk Observer hanya menampilkan kegiatan yang ditugaskan dan tidak memberi akses mengubah nama kegiatan. Form tambah kegiatan hanya untuk Admin Sistem. Migrasi `20261106120000_observer_event_scope_and_rename_guard.sql` mengunci cakupan baca/update di RLS dan melarang perubahan nama via trigger.
- Pengguna menetapkan bahwa pengelolaan rubrik aktif sementara dipegang Super Admin/Admin Sistem. Role Bidang Kader tetap dapat membaca rubrik dan mengelola penugasan Observer, tetapi tidak dapat membuat/mengubah/aktifkan versi rubrik. Migrasi `20261106130000_superadmin_rubric_management.sql` menegakkan batas ini di RLS.
- Tahap 5 (impor hasil tes) ditunda atas arahan pengguna untuk memusatkan pekerjaan pada Observer dan Komisariat. Keputusan tetap: Excel `.xlsx`, simpan riwayat dan minta konfirmasi hasil aktif, Admin Sistem saja (Bidang Kader dilewati sementara). Kode impor telah tersedia secara lokal, namun alur belum diperiksa di browser.
- Catatan pemeriksaan teknis terakhir: `npx tsc --noEmit` berhasil. Build produksi gagal pada prerender `/_not-found` dengan `EPERM` pada folder output Next.js di Windows, setelah bundle dan tipe lolos. Belum ada klaim build produksi sukses setelah perubahan terakhir.
- Pemeriksaan manual pengguna: perubahan kegiatan berhasil disimpan; Observer dan Admin Sistem (Super Admin) berhasil menambah serta menghapus peserta; Bidang Kader, Komisariat, dan Peserta tidak dapat menambah peserta. Pemeriksaan dilaporkan pengguna setelah migrasi dijalankan.
- Pengguna memilih membangun alur pengajuan Komisariat terlebih dahulu. Migrasi `20261029100000_commissariat_submission_drafts.sql` menautkan akun ke Komisariat, membuat draf/pengajuan peserta, tabel keputusan Observer dan catatan privat, bucket privat, RLS, serta fungsi untuk mengunci, membatalkan sebelum tinjauan, memulai tinjauan dan menerbitkan hasil administrasi.
- Halaman `/dashboard/pengajuan` menyediakan draf untuk kegiatan berjalan/terencana, Surat Mandat PDF, profil dan foto peserta, pengiriman, status, pembatalan sebelum tinjauan, serta hasil administrasi setelah diterbitkan. Halaman `/dashboard/seleksi-komisariat` memberi Observer yang ditugaskan/Admin Sistem kemampuan memulai tinjauan, menetapkan Lolos/Tidak Lolos, memberi alasan yang dapat dibagikan dan catatan internal privat, lalu menerbitkan hasil hanya setelah semua peserta dinilai.
- Pengaturan tautan akun Komisariat ditambahkan ke Pengguna Admin Sistem. Menu Komisariat dan Observer menampilkan masing-masing Pengajuan Peserta dan Seleksi Komisariat.
- Tahap ini belum diperiksa di Supabase pengguna atau browser. Unduhan Excel/PDF serta tahap screening (termasuk tambahan peserta dan mandat tambahan) masih belum dibuat; implementasi saat ini mencakup pengajuan dan seleksi administrasi pertama.
- Uji coba tetap harus memakai data simulasi. Jangan publikasi atau masukkan data pribadi sebelum pemeriksaan keamanan, privasi, backup dan biaya.
- Status Phase 2 framework DAD: master v1 berisi enam aspek dan 27 indikator telah diterapkan di Supabase menurut konfirmasi pengguna; pemeriksaan SQL regression tersendiri belum dikonfirmasi.
- Status Phase 3 rubric engine: tujuh materi, 14 relasi materi-aspek, 36 relasi materi-indikator, 27 rubrik, dan 135 anchor perilaku; pengguna mengonfirmasi migrations dan regression SQL berhasil serta halaman `/dashboard/kerangka` sudah tampil. Review/approval aplikasi tetap ditunda.
- Status Phase 4: scope final mengikuti prompt pengguna: master mapping materi/aktivitas read-only; belum membangun form asesmen. Migration 1400 dan mapping `20261111150000_dad_material_activity_mapping_v1.sql` berhasil diterapkan menurut pengguna. Mapping mencakup 13 materi/aktivitas, satu konteks lintas sesi, 56 mapping, metode, panduan, required/optional, dan rubric-version FK. HUM-01/HUM-02 belum memiliki konteks. Regression Phase 2–4 dan uji tampilan masih menunggu pengguna.

### Berkas penting

- `app/page.tsx` — portal publik.
- `app/login/page.tsx` — form login email/kata sandi.
- `app/dashboard/page.tsx` — verifikasi sesi dan role server.
- `app/auth/signout/route.ts` — keluar dan menghapus sesi.
- `proxy.ts` — pembaruan cookie dan pemeriksaan klaim sesi.
- `lib/supabase/` — pembuat klien browser dan server.
- `supabase/migrations/20261029000000_initial_profiles_rls.sql` — tabel profil dan kebijakan baris.
- `.env.example`, `README.md` — format dan panduan pengaturan lokal.
