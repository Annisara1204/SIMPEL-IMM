# Handover — IMM Observer

**Terakhir diperbarui:** 6 November 2026  
**Lokasi proyek:** `C:\Users\Lenovo\Documents\project`

## Baca sebelum melanjutkan

- `AGENTS.md` — aturan kerja dan komunikasi.
- `BLUEPRINT.md` — sumber keputusan dan rancangan.
- `README.md` — petunjuk menjalankan dan pengaturan Supabase lokal.

## Ringkasan proyek

Website pemantauan dan evaluasi Pelatihan Kader IMM Kota Bandung, fokus awal DAD. Uji awal ditargetkan tanpa biaya awal dan memakai data simulasi. Teknologi saat ini Next.js 16.4.3, React 19.2.0, dan Supabase untuk login serta basis data.

Keputusan pengguna: scoring dapat berubah sesuai kesepakatan instruktur dan perlu halaman konfigurasi khusus; Google Forms dipakai untuk tes awal, kemudian hasil ekspor Sheets diimpor; hanya Observer mengisi penilaian; peserta kelak hanya melihat nilai ringkas sementara miliknya dan catatan pengembangan/perhatian. Baca `BLUEPRINT.md` untuk keseluruhan hak akses, rubrik, dan keputusan terbuka.

## Status tahap

- **Tahap 1 — tampilan dasar dan navigasi:** diterima pengguna.
- **Tahap 2 — login, role, pembatasan akses:** diterima pengguna setelah pemeriksaan manual dasar pada Supabase. Pemeriksaan Server Action langsung sebagai non-Admin belum dilakukan; implementasi action memeriksa role Admin di server dan mutasi tunduk pada RLS.
- **Tahap 3 — kegiatan dan peserta simulasi:** diterima pengguna saat meminta melanjutkan ke tahap berikutnya (29 Oktober 2026). Manual Supabase yang dilaporkan: kegiatan dapat diedit; Observer/Admin Sistem dapat menambah, mengedit, dan menghapus peserta; Bidang Kader/Komisariat/Peserta tidak dapat menambah peserta; daftar Komisariat dapat diedit/dinonaktifkan; foto peserta berhasil diunggah dan tersimpan. Tampilan foto belum dikonfirmasi terpisah.
- Persiapan Tahap 4: pengguna memilih skala indikator 1–5 dengan label 1 Belum terlihat, 2 Mulai berkembang, 3 Cukup, 4 Baik, 5 Sangat baik.
- Skor indikator harus berupa bilangan bulat tanpa nilai pecahan.
- Total bobot indikator pada setiap aspek adalah 100%.
- Total bobot antar-aspek adalah 100%.
- Observer dapat memilih Belum diamati untuk indikator tanpa skor.
- Jika sebagian indikator tidak diamati, bobot sisa di aspek disesuaikan kembali menjadi 100% pada perhitungan peserta tersebut.
- Aturan aspek kosong yang sebelumnya terbuka sudah dijawab pengguna: aspek dikeluarkan dan bobot aspek lain dinormalisasi ulang.
- Pengguna melanjutkan Tahap 4 pada 29 Oktober 2026 dan memilih: aspek tanpa satu pun indikator yang diamati dikeluarkan, lalu bobot aspek lain dinormalisasi ulang.
- Aturan nilai resmi: resmi setelah semua Observer yang ditugaskan menyelesaikan penilaian; skor/catatan yang berubah menghapus status selesai semua Observer kegiatan. Nilai belum lengkap tetap sementara.
- Format nilai: rata-rata berbobot skala 1–5 dikonversi ke 0–100 memakai `(rata-rata − 1) ÷ 4 × 100`. Pengguna menyetujui perhitungan tanpa pembulatan dan tampilan dua desimal.
- Implementasi lokal Tahap 4: migrasi `20261029070000_rubrics_observations.sql`; halaman `/dashboard/penilaian` untuk membuat/mengaktifkan versi rubrik, aspek, indikator dan penugasan Observer per kegiatan; halaman `/dashboard/observasi` untuk skor 1–5, “Belum diamati”, catatan privat, simpan otomatis, deteksi konflik dan riwayat revisi.
- RLS membatasi detail peserta/observasi kepada Admin Sistem atau Observer yang ditugaskan ke kegiatan. Versi aktif/arsip dilindungi dari perubahan; draf hanya aktif bila total bobot aspek dan total indikator dalam setiap aspek masing-masing 100%. Versi draf berikutnya menyalin konfigurasi sebelumnya.
- Pemeriksaan `npx tsc --noEmit` lulus. Pengguna menyatakan Tahap 4 sesuai dan meminta lanjut; migrasi belum dijalankan di Supabase pengguna dan alur browser belum diperiksa manual. Indikator final perlu diisi sesuai kesepakatan instruktur; penugasan saat ini per kegiatan. UI menampilkan agregat Observer dan status resmi/sementara.
- Tahap 5 (impor hasil tes) ditunda atas arahan pengguna agar pekerjaan fokus pada Observer dan Komisariat. Keputusan impor tetap `.xlsx`, riwayat disimpan dan versi aktif dikonfirmasi; akses hanya Admin Sistem. Migrasi dan UI impor lokal sudah ada, tetapi belum diperiksa.
- Pemeriksaan manual yang dilaporkan pengguna: edit kegiatan berhasil; Observer dan Admin Sistem (Super Admin) berhasil menambah serta menghapus peserta; Bidang Kader, Komisariat, dan Peserta tidak dapat menambah peserta. Pengguna sudah menjalankan migrasi terkait di Supabase.
- Halaman Admin Sistem `/dashboard/komisariat` menambah/mengedit nama Komisariat serta menonaktifkan/mengaktifkan entri. Migrasi `20261029030000_commissariats.sql` membuat tiga nama contoh (Komisariat Simulasi 01–03); tidak menghapus baris agar relasi historis tetap aman. `npm run build` berhasil dan rute terdeteksi; pengguna melaporkan migrasi 0300 dan 0400 berhasil dijalankan di Supabase. Halaman belum dikonfirmasi tampil/berfungsi secara manual.
- Pengguna mengonfirmasi edit nama dan menonaktifkan Komisariat berhasil di web.
- Migrasi `20261029040000_allow_same_name_participants.sql` mengizinkan nama peserta yang sama dalam satu Komisariat. Pengguna melaporkan migrasi 0300 dan 0400 berhasil dijalankan.
- Migrasi `20261029050000_participant_profiles.sql` menambah jurusan, tahun angkatan, jabatan opsional, dan referensi Komisariat ke tabel peserta; memberi nilai contoh pada data simulasi lama.
- Form peserta di `/dashboard/peserta` sekarang menyediakan tambah dan edit profil lengkap, dengan pilihan Komisariat aktif. Pengguna melaporkan migrasi 0500 berhasil dijalankan; halaman form terbaru masih perlu dicoba manual.
- Foto peserta kini dapat diunggah/diganti JPG/PNG maksimal 5 MB melalui bucket Storage privat. Migrasi `20261029060000_private_participant_photos.sql` menambah kolom path, bucket, dan RLS; pengguna melaporkan migrasi berhasil. `next.config.ts` menaikkan batas Server Action ke 6 MB untuk multipart request.
- Pengguna melaporkan tambah, edit, dan hapus peserta berhasil pada form terbaru. Edit dan nonaktifkan Komisariat juga berhasil; migrasi 0500 sudah dijalankan.
- `npx tsc --noEmit` setelah perubahan unggah foto berhasil tanpa error. Build produksi sebelumnya berhasil mengompilasi bundle dan tipe, tetapi gagal saat prerender `/_not-found` karena Windows mengembalikan `EPERM` saat Next membuat folder `.next/server/app/_not-found.segments/_not-found`; terjadi pada Turbopack dan Webpack. Pengguna mengonfirmasi foto berhasil diunggah dan tersimpan; tampilan thumbnail belum dikonfirmasi secara terpisah.
- Pengguna memilih membangun pengajuan Komisariat terlebih dahulu. Implementasi lokal sekarang mencakup tautan akun Komisariat di halaman Pengguna, pengajuan peserta dengan berkas privat, tinjauan administrasi Observer, catatan privat, dan publikasi hasil.
- Migrasi `20261029100000_commissariat_submission_drafts.sql` menyiapkan skema, RLS, bucket privat, dan RPC alur draf/kirim/batal/mulai tinjauan/terbitkan hasil. Jalankan sesudah migrasi 0900. Jika migrasi 1000 sudah dijalankan, jangan jalankan ulang sebagai SQL baru.
- `/dashboard/pengajuan` adalah halaman akun Komisariat. `/dashboard/seleksi-komisariat` adalah halaman Observer yang ditugaskan dan Admin Sistem. Hasil administrasi ditampilkan Komisariat hanya setelah diterbitkan.
- Implementasi belum mencakup unduhan Excel/PDF, screening, peserta tambahan saat screening, atau mandat tambahan. Retensi/penghapusan terjadwal belum dibuat.
- `npx tsc --noEmit` berhasil setelah penambahan halaman/action Observer dan tampilan hasil. Migrasi belum dijalankan/diperiksa pada Supabase pengguna; alur browser dan akses lintas role belum diuji.
- Kriteria pemeriksaan manual berikutnya: akun Komisariat hanya melihat pengajuannya sendiri; draf wajib memiliki mandat dan setidaknya satu peserta; Observer tanpa penugasan tidak bisa membuka/mengubah pengajuan; hasil dan alasan baru tampak bagi Komisariat setelah publikasi; catatan internal tidak pernah tampak pada akun Komisariat.
- 6 November 2026: atas masukan pengguna, halaman Pengaturan Penilaian diubah menjadi daftar kegiatan DAD terlebih dahulu. Setelah memilih kegiatan, admin melihat/mengelola rubrik dan menugaskan Observer untuk kegiatan itu. Observer yang sudah ditugaskan akan melihat kegiatan di menu Observasi. `npx tsc --noEmit` lulus setelah perubahan; pemeriksaan manual browser belum dilakukan.
- Pengguna melaporkan aksi Tugaskan menampilkan error. Pemeriksaan screenshot menunjukkan aksi insert penugasan gagal; daftar sudah memiliki satu assignment. Perubahan sekarang memakai `observer_id` langsung untuk mencegah Observer yang sudah ditugaskan muncul kembali, mengecek duplikasi sebelum simpan, dan mengembalikan pesan yang ramah pengguna. `npx tsc --noEmit` lulus; perlu muat ulang halaman dan mencoba kembali.
- 6 November 2026: pengguna ingin mencoba trial untuk pelatihan mendatang dari PK IMM FEB UM Bandung. Halaman Kegiatan DAD menyediakan form membuat kegiatan berstatus Direncanakan dengan nama/penyelenggara default PK IMM FEB UM Bandung; pengguna mengisi lokasi serta tanggal. Ini hanya metadata kegiatan. Data peserta/foto/nilai nyata tetap tidak digunakan sebelum pemeriksaan akses, privasi, dan backup selesai.
- Atas permintaan pengguna, Observer kini hanya melihat kegiatan yang ditugaskan pada halaman Kegiatan DAD, tidak dapat mengganti nama kegiatan, dan form tambah kegiatan hanya untuk Admin Sistem. Migrasi baru `20261106120000_observer_event_scope_and_rename_guard.sql` mengatur RLS dan trigger supaya aturan yang sama berlaku di basis data. Jalankan migrasi ini di Supabase sebelum memakai perubahan. `npx tsc --noEmit` lulus; verifikasi browser/Supabase belum dilakukan.
- Pengguna menetapkan pengelolaan rubrik aktif sementara hanya dipegang Super Admin/Admin Sistem. UI dan Server Action pembuatan, perubahan, versi baru, serta aktivasi rubrik dibatasi ke `admin_system`; Bidang Kader masih dapat membaca rubrik dan mengelola penugasan Observer. Migrasi `20261106130000_superadmin_rubric_management.sql` mengubah RLS terkait. Jalankan setelah migrasi 1200; `npx tsc --noEmit` lulus, basis data/browser belum diuji.
- 6 November 2026: Pengaturan Penilaian menuntun pemilihan kegiatan → tahap → jenis penilaian → versi rubrik. Tahap Screening dan Pelatihan disediakan; Rencana Tindak Lanjut ditambahkan pada perubahan terbaru dengan rubrik 1–5 tanpa materi. Super Admin dapat menambah jenis penilaian per tahap; setiap jenis menyimpan rubrik berversi dengan aspek, indikator, target, dan bobot sendiri. Migrasi `20261106140000_stage_and_assessment_type_rubrics.sql` menambah cakupan tahap/jenis dan mempertahankan rubrik lama di Pelatihan dengan jenis “Penilaian umum”. Migrasi `20261106150000_allow_rubric_activation.sql` memperbaiki kebijakan aktivasi rubrik.
- 6 November 2026: Pengguna melaporkan aktivasi rubrik menampilkan “Rubrik gagal diaktifkan.” Penyebab pada kebijakan RLS migrasi 0700: UPDATE draf mengizinkan status hasil `draft` atau `archived`, tetapi tidak `active`, sehingga database menolak aktivasi. Migrasi `20261106150000_allow_rubric_activation.sql` mengganti kebijakan agar Admin Sistem boleh mengaktifkan draf. Pengguna perlu menjalankan migrasi 1500 sesudah 1400 di Supabase SQL Editor, lalu coba lagi. Jangan buat draf baru; draf yang gagal diaktifkan tetap ada.
- Pengguna melanjutkan implementasi ke halaman Observasi: pilih kegiatan → tahap → jenis penilaian sebelum mengisi skor. Setelah materi Pelatihan diminta, langkah materi juga ditambahkan. Penyelesaian Observer dicatat terpisah per versi rubrik.
- Hasil uji manual pengguna setelah migrasi 1600: Observer berhasil menginput nilai pada Screening, menandai jenis penilaian selesai hingga status menjadi **Nilai resmi**, mengubah nilai, melihat status kembali menjadi **Nilai sementara**, lalu menyelesaikan lagi hingga resmi. Alur input, status resmi, dan pembukaan ulang untuk Screening terkonfirmasi di proyek Supabase pengguna. Jenis/tahap Pelatihan belum diuji.
- Pengguna meminta Pelatihan menampilkan langkah penambahan **Nama Materi** sebelum jenis penilaian/rubrik. Implementasi memisahkan rubrik per materi pada tahap Pelatihan; Screening tetap tanpa materi. Menu Pengaturan Penilaian dan Observasi mengikuti alur kegiatan → tahap → materi (Pelatihan) → jenis penilaian → rubrik. Rubrik Pelatihan lama dipindahkan ke materi “Materi umum”. Status selesai ditautkan ke versi rubrik spesifik agar nilai antar-materi tidak bercampur. Migrasi `20261106170000_training_material_rubrics.sql` dijalankan pengguna. `npx tsc --noEmit` lulus. Pengguna mengonfirmasi Observer berhasil menginput nilai Pelatihan dan menyelesaikan uji: status bisa menjadi resmi, kembali sementara setelah nilai diubah, lalu terpisah dari status Screening. Alur konfigurasi dan observasi Screening/Pelatihan telah diuji manual pengguna.
- Pengguna meminta dashboard hasil untuk Observer, Super Admin, dan Instruktur, serta kategori nilai. Keputusan pengguna: Instruktur adalah role baru, hanya menerima rekap untuk kegiatan yang ditugaskan tanpa nama peserta/catatan privat. Kategori disetujui: 0–<60 Perlu pengembangan; 60–<75 Cukup; 75–<90 Baik; 90–100 Sangat baik. Rencana Tindak Lanjut memakai rubrik/skor 1–5 seperti tahap lain. Implementasi lokal menambah ringkasan dashboard, assignment Instruktur oleh Super Admin di Pengaturan Penilaian, fungsi RPC Supabase yang hanya mengirim agregat ke Instruktur, dan konfigurasi/observasi untuk tahap Rencana Tindak Lanjut. Migrasi `20261106180000_dashboard_results_categories_instructor_role.sql` perlu dijalankan setelah 1700. `npx tsc --noEmit` lulus; Supabase/browser belum diperiksa. Uji manual berikutnya: jalankan migrasi, buat akun Instruktur dan tetapkan role, tugaskan ke kegiatan, pastikan dashboardnya hanya berisi rekap/kategori, lalu periksa dashboard Observer/Admin menampilkan hasil individu dan kategori di ketiga tahap.
- Pengguna meminta subrole Instruktur MoT, Vice MoT, IoT, Vice IoT, Master of Observer, dan Vice Observer. Subrole dipilih **per kegiatan**, dan pengguna menegaskan role Observer yang sudah berjalan harus dipertahankan. Rujukan SPI IMM 2011 menjelaskan tugas MoT/Vice MoT/IoT/Observer/Koordinator Observer; uraian detail Vice IoT dan Master/Vice Observer diimplementasikan sebagai checklist operasional rancangan lokal. Perubahan menambah pilihan subrole saat penugasan, checklist tugas tersimpan per kegiatan, dan tampilan dashboard berdasarkan tugas; IoT/Vice IoT tidak melihat hasil penilaian, sementara MoT dan koordinator Observer melihat agregat yang relevan tanpa catatan privat. Migrasi baru `20261106190000_instructor_positions_and_duties.sql` harus dijalankan setelah 1800. `npx tsc --noEmit` lulus; migrasi dan tampilan browser belum diuji pada Supabase pengguna.
- Berkas wajib yang disebut pengguna: satu Surat Mandat Komisariat per pengajuan dan satu foto formal tiap peserta (jas IMM, latar putih).
- Rancangan batas unggahan disetujui: Surat Mandat PDF maks. 10 MB; foto JPG/PNG maks. 5 MB per peserta. Foto akan tampil di halaman penilaian peserta dan rapor dengan akses sesuai role yang sudah disepakati.
- Surat Mandat disimpan sampai hasil seleksi administrasi diterbitkan. Foto disimpan selama rapor peserta tersedia.
- Cakupan akses foto yang disetujui: peserta terkait pada rapornya, Observer yang ditugaskan, Admin Sistem, dan Bidang Kader berwenang; bukan Komisariat lain atau publik.
- Satu pengajuan Komisariat memuat beberapa peserta: satu Surat Mandat per pengajuan dan satu foto per peserta.
- Tidak ada batas jumlah peserta tetap per pengajuan untuk satu kegiatan.
- Pengguna menyetujui lima kolom profil peserta: nama lengkap, asal komisariat, jurusan/program studi, tahun angkatan, dan jabatan. Empat kolom pertama wajib; jabatan opsional.
- Tahun angkatan ditulis sebagai tahun kalender empat angka (contoh `2024`).
- Jabatan berupa teks bebas dan opsional.
- Asal komisariat akan dipilih dari daftar terkelola. Perlu halaman Admin Sistem/Super Admin untuk menambah/mengedit daftar komisariat; daftar nama nyata belum diberikan. Gunakan ID tetap untuk menjaga relasi data saat nama diedit.
- Komisariat lama dinonaktifkan, bukan dihapus, agar riwayatnya tetap dapat ditampilkan.
- Beberapa akun dapat berbagi satu Komisariat; Super Admin mengatur tautan akun dengan Komisariat.
- Semua akun dalam Komisariat boleh mengajukan/membatalkan sebelum tinjauan dimulai; sesudahnya hanya dapat melihat status dan unduhan.
- Satu akun Komisariat tertaut ke satu Komisariat saja.
- Satu pengajuan aktif per Komisariat per kegiatan; dapat dibatalkan dan diajukan ulang sebelum ditinjau.
- Kolom wajib yang kosong/salah format memblokir pengiriman; preview menunjukkan masalah yang harus diperbaiki Komisariat.
- Hasil seleksi administrasi maupun screening hanya `Lolos` atau `Tidak Lolos`; tanpa status cadangan.
- Observer boleh memberi alasan singkat pada status Tidak Lolos; alasan opsional dapat dilihat Komisariat di web dan unduhan. Catatan internal Observer tidak dibagikan.
- Hasil tahap baru ditampilkan setelah Observer meninjau seluruh peserta dan menekan tombol `Terbitkan hasil`.
- Hasil seleksi yang diterbitkan diunduh dalam format Excel dan PDF.
- Hanya peserta Lolos administrasi diteruskan ke screening.
- Berkas hasil mencakup lima kolom profil peserta, status seleksi, dan alasan bila tersedia; tidak menyertakan foto atau Surat Mandat.
- Saat screening Observer dapat menambahkan peserta dan langsung menetapkan hasil Lolos/Tidak Lolos.
- Asal Komisariat peserta baru saat screening dipilih dari master data Komisariat.
- Peserta yang ditambahkan Observer pada screening tetap harus memiliki profil lengkap dan foto formal.
- Peserta tambahan yang belum tercantum pada Surat Mandat awal memerlukan Surat Mandat tambahan.
- Komisariat dapat mengirim Surat Mandat tambahan lewat halaman status tanpa mengedit/membuka kembali daftar peserta yang terkunci.
- Preview unggahan Komisariat harus memperingatkan nama lengkap dan komisariat yang sama dalam satu kegiatan. Jika memang orang berbeda, Komisariat boleh mengunggah kedua baris tanpa menghapus salah satunya.
- Admin Sistem, Bidang Kader, Observer, dan Komisariat memakai login email + kata sandi. Tidak ada pilihan role simulasi lagi di dashboard. Role dibaca dari `profiles` di server. Metode akses sementara Peserta belum ditentukan.
- SQL migrasi menyiapkan profil, role, trigger pembuatan profil tanpa role, dan kebijakan RLS dasar.
- Halaman admin `/dashboard/pengguna` dapat membaca profil dan menetapkan/mengubah role akun yang sudah dibuat. Pembuatan akun masih melalui Supabase Authentication → Users; Admin pertama disiapkan lewat SQL Editor. Perubahan role akun aktif sengaja tidak diizinkan dari halaman tersebut.
- Migrasi dan kontrol akses untuk kegiatan, peserta, observasi, impor tes, serta pengajuan Komisariat tersedia. Dashboard beberapa role masih berisi placeholder; analitik/rapor dan pemeriksaan keamanan lintas role belum selesai.

## Pemeriksaan terakhir

`npm run build` berhasil setelah halaman pengelolaan pengguna ditambahkan dengan Next.js 16.4.3. Rute terdeteksi: `/`, `/login`, `/dashboard`, `/dashboard/pengguna`, `/auth/signout`. Build hanya membuktikan kompilasi dan rendering; belum membuktikan login Supabase, SQL pada proyek nyata, atau keamanan seluruh data bisnis.

Pengguna melaporkan pemeriksaan manual terhadap proyek Supabase: Admin Uji berhasil login dan melihat satu akun pada halaman Pengguna; role Observer berhasil diberikan; akun Observer berhasil login serta membuka dashboard; saat mengakses `/dashboard/pengguna` sebagai Observer, aplikasi kembali ke login dan daftar pengguna tidak terlihat. Sesudah role akun uji diubah menjadi tanpa akses, dashboard menampilkan peringatan “Akses belum diberikan”. Pemeriksaan dilakukan pada 29 Oktober 2026.

`npm run build` setelah perubahan Tahap 3 berhasil; rute `/dashboard/kegiatan` dan `/dashboard/peserta` terdeteksi. Build hanya memeriksa kompilasi dan tipe. SQL, halaman terhubung, serta penolakan akses Observer/Komisariat perlu diperiksa setelah migrasi diterapkan di Supabase.

## Langkah berikutnya

1. Jika migrasi 1800 belum dijalankan, jalankan dulu `20261106180000_dashboard_results_categories_instructor_role.sql`, lalu jalankan `20261106190000_instructor_positions_and_duties.sql` di Supabase SQL Editor.
2. Buat akun simulasi melalui Supabase Authentication → Users, lalu tetapkan role **Instruktur** melalui menu **Pengguna**.
3. Di **Pengaturan Penilaian**, pilih kegiatan, akun Instruktur, dan subrole pada kegiatan itu. Akun yang sama boleh memegang subrole berbeda di kegiatan lain.
4. Periksa checklist tugas tiap subrole. MoT/Vice MoT dan Master/Vice Observer mendapat ringkasan skor; IoT/Vice IoT mendapat tugas agenda ruhiyah tanpa data nilai. Pastikan Observer tetap bisa menginput nilai seperti sebelumnya.
5. Migrasi dan akses lintas role di Supabase pengguna serta tampilan browser belum diverifikasi.

## Menjalankan lokal (PowerShell)

```powershell
cd "C:\Users\Lenovo\Documents\project"
npm.cmd run dev
```

Buka `http://localhost:3000`. Hentikan server dengan `Ctrl+C`.

