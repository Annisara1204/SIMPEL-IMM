# Blueprint Website Observer Pelatihan Kader IMM Kota Bandung

Dokumen ini menjadi acuan utama agar sesi Codex lain dapat meneruskan proyek tanpa bergantung pada riwayat percakapan. **Sesi baru: baca dokumen ini terlebih dahulu, periksa berkas kerja terkini, lalu lanjutkan hanya tahap yang diizinkan pengguna.** Perbarui blueprint jika keputusan atau status berubah.

## Tujuan dan cara bekerja

Membangun website untuk mendukung observasi dan evaluasi Pelatihan Kader IMM Kota Bandung, fokus awal Darul Arqam Dasar (DAD). Target akhirnya menyatukan kegiatan, peserta, penilaian Observer, pretest/posttest, dashboard, analisis, dan rapor.

Pengguna pemula; gunakan bahasa Indonesia sederhana dan jelaskan istilah teknis sebelum digunakan. Pengembangan/pengujian dilakukan di laptop Windows terlebih dahulu. Gunakan data simulasi, bukan data peserta sebenarnya. Sebelum setiap tahap, jelaskan berkas yang berubah, perintah Windows, hasil yang diharapkan, dan cara menangani kesalahan umum. Pastikan satu tahap bisa diperiksa sebelum lanjut.

## Keputusan yang disepakati

### Uji coba dan infrastruktur

- Fokus awal: pengujian dengan biaya awal Rp0; belum ada infrastruktur khusus yang diwajibkan.
- Rekomendasi teknologi: Next.js + Supabase/PostgreSQL + Vercel. Paket gratis hanya untuk prototipe/pengujian; batas, jeda layanan, kebijakan pemakaian, backup, dan biaya domain harus ditinjau sebelum penggunaan resmi.
- Tidak memakai data pribadi peserta sebenarnya saat pengembangan awal.

### Kegiatan dan penilaian

- Uji coba pertama memakai satu kegiatan DAD simulasi.
- Pelatihan lazimnya 2–3 hari, 6–9 materi. Tiap materi dapat memuat aspek kognitif/perilaku dengan sejumlah indikator.
- Gambar yang diberikan pengguna adalah referensi struktur (KPI/aspek/indikator, bobot/target, dan lembar Observer); angka dan bobot dalam gambar hanya contoh, bukan ketentuan final.
- Perlu halaman **Pengaturan Penilaian** untuk mengatur skala, aspek/indikator, bobot, target dan aturan sesuai kesepakatan instruktur.
- Pengaturan rubrik dipisah menurut kegiatan, tahap, dan jenis penilaian. Tahap yang disiapkan dahulu adalah Screening dan Pelatihan; Rencana Tindak Lanjut menunggu. Super Admin dapat menambahkan jenis penilaian pada setiap tahap, dan masing-masing jenis memiliki rubrik berversi sendiri.
- Pada uji coba satu pengaturan berlaku untuk seluruh kegiatan, bukan berbeda per materi.
- Konfigurasi disimpan sebagai versi pada kegiatan; perubahan baru tidak boleh mengubah hasil lama.
- Skor akhir memakai rata-rata berbobot dan rumus harus ditampilkan. Validasi bobot/rentang wajib dilakukan sebelum konfigurasi dipakai.
- Skala indikator yang disepakati: 1–5 dengan label 1 = Belum terlihat, 2 = Mulai berkembang, 3 = Cukup, 4 = Baik, 5 = Sangat baik.
- Skor Observer berupa bilangan bulat saja, tanpa pecahan.
- Bobot indikator di dalam setiap aspek harus berjumlah 100%.
- Bobot antar-aspek pada satu konfigurasi juga harus berjumlah 100%.
- Observer dapat memilih `Belum diamati`; indikator tersebut tidak diberi skor dan bobotnya tidak ikut dihitung untuk peserta itu.
- Jika hanya sebagian indikator dalam aspek berstatus `Belum diamati`, bobot indikator yang memiliki skor dinormalisasi ulang agar aspek tetap berjumlah 100% untuk hasil peserta tersebut.
- Jika seluruh indikator dalam aspek berstatus `Belum diamati`, aspek dikeluarkan dari nilai keseluruhan dan bobot aspek yang diamati dinormalisasi ulang.
- Nilai untuk setiap jenis penilaian menjadi resmi setelah seluruh Observer yang ditugaskan menyelesaikan jenis penilaian tersebut. Status selesai dicatat terpisah per jenis.
- Persetujuan/review Bidang Kader pada rapor ditunda dari versi awal sederhana; dapat ditambahkan pada pengembangan selanjutnya.

### Akses dan privasi

- **Observer yang ditugaskan** dapat melihat penilaian mentah dan catatan observasi sesuai penugasan.
- **Bidang Kader berwenang** dapat melihat rekap dan nilai untuk pemantauan/penyusunan laporan; catatan observasi rinci tetap hanya untuk Observer yang ditugaskan.
- **Peserta** dapat melihat hanya miliknya: nilai sementara dalam bentuk ringkasan (bukan data mentah Observer) dan catatan pengembangan/perhatian. Tampilkan penanda bahwa nilai masih sementara.
- **Publik** hanya melihat agregat yang aman: tanpa nama peserta, nilai individual, atau catatan privat. Tinjau ambang minimum agregat agar orang tidak bisa dikenali dari kelompok kecil.
- **Komisariat** hanya mendapat informasi/laporan yang diizinkan; cakupan tepatnya belum diputuskan.
- Hak akses wajib diverifikasi di server dan basis data, bukan hanya dengan menyembunyikan menu.

### Pretest/posttest dan AI/laporan

- Uji coba awal memakai Google Forms. Hasil diimpor dari ekspor Google Sheets.
- Pencocokan sementara menggunakan nama + komisariat karena kode unik belum dikumpulkan. Baris tak cocok/ambigu harus ditinjau dan dikonfirmasi Bidang Kader sebelum hasil disimpan.
- Tahap 5 memakai berkas Excel `.xlsx` sesuai pilihan pengguna. Aturan terbaru pengguna: fitur impor ditunda untuk role Bidang Kader dan hanya tersedia bagi Admin Sistem/Super Admin. Jika peserta/jenis tes yang sama sudah memiliki nilai, impor baru disimpan sebagai riwayat dan Admin Sistem harus memilih dengan eksplisit nilai mana yang dipakai.
- Tes langsung di website ditunda.
- AI opsional hanya untuk draf narasi/insight; tidak menghitung skor, menentukan kelulusan, mengarang angka, atau menyimpulkan karakter dari skor. Minimalkan/anonymize data; API key hanya di server.
- Alur rapor lengkap draft-review-approval-publish dan ekspor PDF/Excel ditunda sampai kebutuhan format disepakati.

### Pengajuan dan seleksi peserta oleh Komisariat (rancangan yang disepakati)

- Komisariat mengajukan peserta melalui formulir web pada kegiatan terkait, bukan template Excel. Formulir memuat profil peserta dan unggahan berkas untuk seleksi administrasi.
- Satu pengajuan dapat memuat beberapa peserta sekaligus, memakai satu Surat Mandat Komisariat untuk pengajuan dan satu foto untuk tiap peserta.
- Belum ada batas jumlah peserta tetap per pengajuan untuk satu kegiatan.
- Berkas seleksi administrasi yang ditetapkan pengguna: satu Surat Mandat Komisariat untuk seluruh pengajuan dan satu foto formal per peserta (memakai jas IMM dengan latar putih).
- Batas unggahan yang disetujui sebagai rancangan: Surat Mandat PDF maksimal 10 MB; foto JPG/PNG maksimal 5 MB per peserta.
- Surat Mandat digunakan untuk validasi seleksi administrasi dan disimpan sampai hasil seleksi administrasi diterbitkan. Foto dibutuhkan untuk halaman penilaian dan rapor, lalu disimpan selama rapor peserta masih tersedia.
- Foto formal ditampilkan pada halaman penilaian peserta dan rapor dengan akses terbatas sesuai daftar role yang ditetapkan di bawah.
- Foto dapat dilihat peserta yang bersangkutan pada rapornya, Observer yang ditugaskan, Admin Sistem, dan Bidang Kader berwenang. Komisariat lain dan publik tidak dapat melihatnya.
- Pengguna menyetujui lima kolom profil peserta: nama lengkap, asal komisariat, jurusan/program studi, tahun angkatan, dan jabatan. Data kontak hanya ditambahkan bila ada kebutuhan operasional yang jelas.
- Keputusan wajib isi: nama lengkap, asal komisariat, jurusan/program studi, dan tahun angkatan wajib diisi; jabatan opsional.
- Tahun angkatan menggunakan tahun kalender empat angka, misalnya `2024`.
- Jabatan diisi sebagai teks bebas dan opsional, bukan pilihan dari daftar tetap.
- Asal komisariat dipilih dari daftar resmi, bukan teks bebas. Karena daftar nama belum tersedia, diperlukan halaman khusus Admin Sistem/Super Admin untuk menambah dan mengedit komisariat. Setiap komisariat memakai ID tetap agar penggantian nama tidak memutus tautan data terkait.
- Komisariat yang tidak aktif ditandai nonaktif, bukan dihapus permanen, agar riwayat data tetap utuh.
- Beberapa akun pengguna boleh ditautkan ke Komisariat yang sama; pengaitan akun-ke-komisariat dikelola Admin Sistem/Super Admin.
- Semua akun yang ditautkan ke Komisariat yang sama dapat membuat dan membatalkan pengajuan sebelum Observer mulai meninjau. Setelah mulai ditinjau, semua akun terkait hanya dapat melihat status dan unduhan.
- Satu akun Komisariat hanya ditautkan ke satu Komisariat; beberapa akun tetap dapat berbagi Komisariat.
- Satu Komisariat hanya memiliki satu pengajuan aktif untuk setiap kegiatan; sebelum ditinjau pengajuan dapat dibatalkan dan dikirim ulang.
- Jika kolom wajib kosong/salah format, preview memberi peringatan per baris dan pengajuan tidak dapat dikirim sebelum Komisariat memperbaikinya.
- Hasil per peserta pada seleksi administrasi dan screening hanya memiliki status `Lolos` atau `Tidak Lolos`; tidak ada status cadangan.
- Untuk peserta berstatus `Tidak Lolos`, Observer dapat mengisi alasan singkat yang dapat dilihat Komisariat di web dan unduhan. Alasan ini opsional; catatan internal Observer tetap terpisah dan tidak dibagikan.
- Hasil tiap tahap tidak terlihat Komisariat sampai Observer meninjau seluruh peserta lalu menekan aksi eksplisit `Terbitkan hasil`.
- Hasil seleksi yang diterbitkan dapat diunduh Komisariat dalam format Excel dan PDF.
- File hasil untuk seleksi administrasi dan screening memuat profil (nama, Komisariat, jurusan/program studi, tahun angkatan, jabatan), status, dan alasan bila diisi. Foto dan Surat Mandat tidak disertakan.
- Saat screening, Observer boleh menambahkan peserta baru dan menetapkan hasil screening peserta tersebut sebagai `Lolos` atau `Tidak Lolos`.
- Asal Komisariat untuk peserta baru saat screening dipilih dari daftar Komisariat resmi.
- Peserta tambahan saat screening tetap memerlukan profil wajib lengkap dan foto formal.
- Jika peserta tambahan belum tercantum dalam Surat Mandat awal, diperlukan Surat Mandat tambahan.
- Komisariat dapat mengirim Surat Mandat tambahan melalui aksi khusus pada halaman status, tanpa membuka kembali daftar peserta yang telah ditinjau.
- Saat Komisariat mengisi formulir web, nama lengkap dan komisariat yang sama pada satu kegiatan memicu peringatan kemungkinan duplikat. Komisariat boleh tetap mengajukan keduanya jika memang orang berbeda; duplikat tidak otomatis dihapus atau ditolak.
- Validasi formulir web menunjukkan kolom wajib yang kosong atau tidak sesuai. Pengajuan tidak dapat dikirim sebelum profil wajib lengkap. Kebutuhan preview lima baris dari rancangan unggah Excel tidak lagi berlaku setelah pengajuan dialihkan ke formulir web.
- Sebelum Observer mulai meninjau, Komisariat dapat membatalkan pengajuan lalu memperbaiki dan mengajukan ulang. Ketika status berubah menjadi ditinjau, pengajuan terkunci: Komisariat tidak dapat mengedit atau membatalkannya. Komisariat dapat melihat status dan mengunduh hasil pada tahap yang sudah diterbitkan.
- Tahap pertama: Observer memvalidasi berkas dan menyeleksi peserta untuk seleksi administrasi. Hasil seleksi diumumkan pada halaman web Komisariat dan dapat diunduh.
- Hanya peserta berstatus `Lolos` pada seleksi administrasi diteruskan ke screening.
- Tahap kedua: Observer/instruktur melakukan screening. Peserta dapat berkurang atau bertambah sesuai hasil screening. Perubahan jumlah harus dicatat; peserta tambahan perlu memiliki asal/status yang jelas (misalnya dari daftar cadangan atau penambahan manual tercatat), bukan mengganti angka tanpa jejak.
- Hasil screening yang sudah diterbitkan dapat diunduh Komisariat. Halaman role Komisariat menampilkan status saat ini, jumlah peserta tiap tahap, dan unduhan hasil yang tersedia.
- Observer yang ditugaskan dan Admin Sistem dapat meninjau/memperbaiki kolom profil serta mencatat keputusan seleksi. Komisariat hanya melihat pengajuan miliknya sendiri dan tidak dapat mengubah data setelah diajukan.
- Berkas pribadi disimpan privat; hanya akun Komisariat terkait, Observer yang ditugaskan, dan Admin Sistem yang berwenang dapat membukanya. Jangan gunakan tautan berkas publik.
- Masa penyimpanan berkas perlu diputuskan sebelum implementasi. Alur pengajuan ini terpisah dari impor nilai pretest/posttest.

## Role pengguna

1. Pengunjung publik: dashboard agregat aman.
2. Admin sistem: akun, role, konfigurasi.
3. Bidang Kader: konfigurasi penilaian, penugasan, pemantauan dan laporan sesuai kewenangan. Impor pretest/posttest saat ini khusus Admin Sistem. Sesuai aturan terbaru pengguna, pengelolaan kegiatan dan peserta dilakukan Observer dan Super Admin.
4. Observer: penilaian/catatan sesuai penugasan.
5. Komisariat: informasi/laporan yang diizinkan.
6. Peserta: kelak mengakses tes/rapor yang diizinkan melalui username/password sementara atau token dengan masa berlaku yang dapat diatur.

Admin Sistem, Bidang Kader, Observer, dan Komisariat memakai login email + kata sandi. Akun/token peserta belum dibuat dan metode akses peserta masih terbuka.

## Preferensi visual yang sudah disepakati

- Warna hijau utama dashboard diganti menjadi merah marun sebagai interpretasi visual keluarga warna merah IMM. Acuan yang ditemukan menyebut merah, tetapi tidak memberikan kode hex marun digital yang baku.
- Hijau boleh tetap dipakai untuk status sukses/selesai agar makna status tetap mudah dikenali.

## Halaman dan navigasi target

- Dashboard publik; dashboard internal sesuai role.
- Kegiatan DAD dan detail; peserta; penugasan Observer.
- Form observasi bersama; Pengaturan Penilaian; status simpan dan riwayat.
- Impor hasil tes; Analitik & Rekap; Rapor.
- Pengguna/konfigurasi untuk Admin; profil dan keluar.

## Alur per role

- Publik: buka dashboard → lihat agregat aman.
- Admin: login email → kelola akun, role, konfigurasi.
- Bidang Kader: atur penilaian → tugaskan Observer → pantau rekap → sediakan laporan sederhana. Impor tes dilakukan Admin Sistem untuk sementara.
- Observer: login → buka kegiatan tugas → isi indikator/catatan → cek status simpan → selesaikan penilaian.
- Komisariat: login → lihat informasi/laporan yang diizinkan.
- Peserta: gunakan akses sementara saat fitur tersedia → lihat nilai ringkas sementara dan catatan pengembangan miliknya → akses rapor sesuai izin.

## Umpan balik tampilan dashboard per role

Masukan pengguna yang sudah diterima:

- **Observer:** bagian utama dashboard adalah daftar kegiatan yang ditugaskan dan jadwal kegiatan hari ini.
- **Bidang Kader:** bagian utama dashboard adalah daftar kegiatan DAD beserta statusnya, serta ringkasan jumlah peserta dan progres penilaian.
- **Komisariat:** bagian utama dashboard adalah daftar kegiatan DAD yang berkaitan dengan komisariatnya dan rekap/laporan yang memang diizinkan untuk diakses.
- **Peserta:** bagian utama dashboard adalah nilai sementara miliknya dalam bentuk ringkasan dan catatan pengembangan/perhatian. Tidak menampilkan nilai mentah Observer.
- **Admin Sistem:** bagian utama dashboard adalah ringkasan jumlah pengguna menurut peran dan status konfigurasi sistem.
- **Pengunjung Publik:** tampilkan informasi/jadwal DAD yang telah, sedang, dan akan diselenggarakan, serta profil instruktur (foto, nama, media sosial). Foto dan akun profil nyata perlu persetujuan instruktur; gunakan placeholder simulasi selama prototipe.

## Arsitektur dan teknologi

- Tampilan browser (frontend): Next.js + TypeScript.
- Backend/basis data: Supabase + PostgreSQL, autentikasi, storage, dan kebijakan akses baris (RLS).
- Hosting frontend prototipe: Vercel. Paket Vercel Hobby memiliki batas penggunaan/pemakaian; periksa kelayakannya sebelum pemakaian resmi.
- Pengembangan: Node.js/npm di Windows, PowerShell untuk perintah.
- Jangan memasukkan API key/kredensial rahasia ke kode frontend.
- Harga/kuota paket gratis dapat berubah; periksa ulang sebelum publikasi.

## Rancangan data awal

Nama tabel masih konsep dan dapat disesuaikan saat implementasi data dimulai:

- `users`, `user_roles`; `commissariats`; `events`; `participants`.
- `participant_access`: token/akun sementara, kedaluwarsa, pencabutan.
- `observer_assignments`: cakupan tugas Observer.
- `rubric_versions`, `indicators`: versi rubrik, aspek, indikator, skala, bobot, target, aturan hitung.
- `observations`, `observation_revisions`: nilai/catatan dan riwayat revisi.
- `test_imports`, `test_results`: sumber impor, baris hasil, status pencocokan, konfirmasi pasangan peserta.
- `reports`, `report_reviews`: untuk alur rapor lanjutan.
- `audit_logs`: aktor, waktu, objek, dan perubahan penting.

## Aturan keamanan dan integritas

- Periksa akses pada server dan RLS; uji antar-role, kegiatan, peserta, dan komisariat.
- Peserta tidak boleh membaca nilai mentah Observer atau catatan privat.
- Dashboard publik hanya dari agregasi yang aman; tanpa identitas/skor individu/catatan.
- Token peserta sukar ditebak, kedaluwarsa, bisa dicabut; jangan simpan password terbuka.
- Rubrik berversi dan tidak ditimpa setelah dipakai. Tiap hasil mengacu ke versi rubriknya.
- Validasi bobot dan rentang skala. Rumus, aturan pembulatan dan nilai kosong harus eksplisit.
- Form observasi bersama perlu autosave, indikator status simpan, penanganan konflik perubahan, serta riwayat.
- Impor spreadsheet menampilkan kecocokan ambigu sebelum menyimpan.
- AI hanya menerima data minimum/anonim dan hasilnya tetap draf untuk tinjauan manusia.

## Tahapan implementasi dan kriteria

1. Tampilan dasar dan navigasi dashboard — halaman responsif, menu/pratinjau role jelas.
2. Login, role, pembatasan akses — akses URL/API langsung pun tidak melewati izin.
3. Manajemen satu kegiatan dan peserta simulasi — data tertaut tepat dan terbatas.
4. Pengaturan penilaian berversi dan observasi bersama — bobot/skala valid, hasil lama tetap, autosave/riwayat/konflik dapat diperiksa.
5. Impor Google Sheets — format, peserta tidak cocok, duplikat/ambigu diuji sebelum simpan.
6. Analitik, ringkasan peserta dan rapor sederhana — cocok dengan data simulasi dan akses tiap role.
7. Uji keamanan, privasi, rumus, integritas dan alur penuh.
8. Persiapan publikasi — dependensi, rahasia, backup, biaya, domain, dan pemeriksaan akhir.

## Status proyek saat ini

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
- Migrasi `20261029070000_rubrics_observations.sql` menambahkan versi rubrik, aspek/indikator, penugasan Observer, skor/catatan observasi, riwayat revisi, dan RLS. Skala tersimpan sebagai skor bulat 1–5; konfigurasi baru hanya dapat aktif bila bobot aspek dan bobot indikator tiap aspek masing-masing 100%.
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

### Berkas penting

- `app/page.tsx` — portal publik.
- `app/login/page.tsx` — form login email/kata sandi.
- `app/dashboard/page.tsx` — verifikasi sesi dan role server.
- `app/auth/signout/route.ts` — keluar dan menghapus sesi.
- `proxy.ts` — pembaruan cookie dan pemeriksaan klaim sesi.
- `lib/supabase/` — pembuat klien browser dan server.
- `supabase/migrations/20261029000000_initial_profiles_rls.sql` — tabel profil dan kebijakan baris.
- `.env.example`, `README.md` — format dan panduan pengaturan lokal.
## Keputusan yang masih terbuka

Jangan mengarang keputusan di bawah. Tanyakan satu per satu saat diperlukan:

- Rubrik/indikator final dan contoh data simulasi untuk rubrik.
- Pembulatan dan rumus tampilan nilai agregat/ringkasan setelah perhitungan nilai keseluruhan dibangun.
- Kapan setiap Observer dianggap selesai dan bagaimana tugas tidak lengkap ditangani.
- Cakupan akses Komisariat dan ambang minimum agregat publik.
- Format ekspor Google Sheets, impor ulang/duplikat, dan format rapor.
- Retensi/penghapusan data dan backup untuk penggunaan resmi.
- Pilihan username/password atau token bagi peserta.


