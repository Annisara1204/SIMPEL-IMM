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
- Pengaturan rubrik dipisah menurut kegiatan, tahap, dan jenis penilaian. Super Admin dapat menambahkan jenis penilaian pada setiap tahap, dan masing-masing jenis memiliki rubrik berversi sendiri.
- Pada tahap Pelatihan, setiap materi memiliki rubrik dan status penilaian sendiri. Screening tidak memakai materi.
- Rencana Tindak Lanjut memakai rubrik dan skor bulat 1–5 seperti Screening; tahap ini tidak memakai materi.
- Konfigurasi disimpan sebagai versi pada kegiatan; perubahan baru tidak boleh mengubah hasil lama.
- ~~Skor tiap peserta-indikator merupakan satu nilai bersama~~ **(Digantikan Phase 5, 11 Nov 2026):** setiap Observer/Instruktur yang ditugaskan menyimpan nilai independen per peserta/indikator/versi rubrik, dengan bukti, revisi, status, dan riwayat sendiri; nilai observer lain ditampilkan baca-saja. Konflik tetap memakai pemeriksaan revisi dan pilihan eksplisit; pelaku, waktu, dan nilai sebelum/sesudah tersimpan. Lihat `docs/archive/HANDOVER-2026-11-12.md` (bagian Phase 5) untuk alasan penggantian keputusan.
- Catatan observasi dipisah per penulis dan kategori (observasi/bukti, kekuatan, pengembangan, khusus); perubahan catatan seorang penulis tidak menimpa catatan penulis lain. Catatan privat tidak otomatis masuk rapor.
- Satu indikator boleh dipetakan ke lebih dari satu aspek. Bobot indikator ditetapkan untuk setiap pemetaan dan total bobot pemetaan dalam tiap aspek harus 100%; bobot aspek dalam satu rubrik juga harus 100%.
- Rubrik tidak memakai alur review/approval di aplikasi untuk saat ini. Super Admin mengaktifkan versi; hasil dapat ditinjau manual setelahnya.
- Setiap indikator memiliki uraian perilaku untuk skor bulat 1–5. Label skala uji terbaru: 1 Sangat Kurang, 2 Kurang, 3 Cukup, 4 Baik, 5 Sangat Baik. Rubrik aktif baru wajib mengisi uraian spesifik tiap skor; rubrik historis tetap dibaca tanpa perubahan.
- Sinkronisasi antarperangkat menggunakan Supabase Realtime bila tersedia. Konflik tidak diselesaikan diam-diam: nilai terbaru dipertahankan sampai pengguna memilih tindakan eksplisit.
- Bobot enam aspek dan indikator contoh hanya starter/configuration draft, bukan standar resmi; tidak diaktifkan sebagai ketentuan final tanpa keputusan instruktur.
- Skor akhir memakai rata-rata berbobot dan rumus harus ditampilkan. Validasi bobot/rentang wajib dilakukan sebelum konfigurasi dipakai.
- Skala indikator uji terbaru: 1 = Sangat Kurang, 2 = Kurang, 3 = Cukup, 4 = Baik, 5 = Sangat Baik. Label ini tidak mengubah batas kategori agregat 0–100.
- Kerangka awal DAD akan diuji dengan enam aspek berbobot dan 27 indikator dari prompt 11 November 2026. Ini rancangan trial, bukan standar resmi IMM; aspek, indikator, bobot, rubrik, dan pemetaan materi perlu divalidasi Koordinator Instruktur terhadap silabus.
- Kerangka trial mula-mula menjadi template tetap yang disimpan berversi di basis data, lalu disalin ke rubrik per kegiatan/materi. Fase berikutnya boleh menyediakan opsi custom aspek, indikator, bobot, rubrik, dan pemetaan materi; perubahan memakai versi baru agar hasil historis tetap.
- Phase 2 menambahkan master `competency_frameworks`, `competency_framework_versions`, `competency_aspects`, `competency_indicators`, dan `competency_indicator_aspects`; rubrik per kegiatan tetap menjadi snapshot dan dapat merujuk ke master asal.
- Catatan tetap ditulis per Observer dan tidak digabung otomatis. Penggabungan dengan atribusi nama penulis dapat dipertimbangkan setelah ada alur pengiriman/submission yang disepakati; review/finalisasi aplikasi belum termasuk trial.
- Skor Observer berupa bilangan bulat saja, tanpa pecahan.
- Bobot indikator di dalam setiap aspek harus berjumlah 100%.
- Bobot antar-aspek pada satu konfigurasi juga harus berjumlah 100%.
- Observer dapat memilih `Belum diamati`; indikator tersebut tidak diberi skor dan bobotnya tidak ikut dihitung untuk peserta itu.
- Jika hanya sebagian indikator dalam aspek berstatus `Belum diamati`, bobot indikator yang memiliki skor dinormalisasi ulang agar aspek tetap berjumlah 100% untuk hasil peserta tersebut.
- Jika seluruh indikator dalam aspek berstatus `Belum diamati`, aspek dikeluarkan dari nilai keseluruhan dan bobot aspek yang diamati dinormalisasi ulang.
- Nilai untuk setiap jenis penilaian menjadi resmi setelah seluruh Observer yang ditugaskan menyelesaikan jenis penilaian tersebut. Status selesai dicatat terpisah per jenis.
- Kategori nilai 0–100: 0–<60 **Perlu pengembangan**, 60–<75 **Cukup**, 75–<90 **Baik**, dan 90–100 **Sangat baik**.
- Persetujuan/review Bidang Kader pada rapor ditunda dari versi awal sederhana; dapat ditambahkan pada pengembangan selanjutnya.

### Phase 6 — scoring dan evaluasi kolektif (MVP)

- Setiap Observer/Instruktur tetap memberi nilai independen pada Phase 5. Phase 6 menghitung rata-rata hanya dari rating berstatus Submitted/Finalized; draf tidak dihitung dan N/O tidak dianggap nol.
- Agregasi dibuat per peserta, indikator, dan cakupan. Cakupan sesi dipisahkan dari cakupan `cross_session`. Sistem menampilkan jumlah rating valid, minimum, maksimum, rentang, N/O, pending, dan status moderasi.
- Rentang skor minimal 2 memerlukan moderasi manual oleh Admin Sistem atau koordinator Instruktur yang ditugaskan (MoT, Vice MoT, Master Observer, Vice Observer). Rating Observer tidak ditimpa oleh moderasi.
- Coverage minimal 80% berlaku untuk setiap aspek. Nilai aspek memakai bobot indikator; nilai keseluruhan memakai `Σ(nilai aspek / 5 × bobot aspek)`, tanpa menormalisasi ulang bobot aspek. Data yang belum memenuhi aturan tetap provisional.
- Keputusan lulus/tidak lulus/perlu pembahasan lanjutan ditetapkan manual oleh koordinator, bukan oleh aturan skor otomatis. Finalisasi menyimpan snapshot bernomor dan sumber privat; snapshot tidak dapat diedit atau dihapus.
- Bidang Kader melihat agregat dan snapshot yang aman. Skor mentah, bukti, dan pembahasan privat dibatasi ke Admin Sistem dan koordinator kegiatan.
- Rekomendasi pengembangan perlu disetujui sebelum masuk snapshot/rekap yang boleh dibagikan.
- Sistem boleh menyusun draf rekomendasi berbasis aturan dari indikator dengan rata-rata di bawah 3/5. Saran berupa latihan umum sesuai aspek, tidak membuat kesimpulan tentang karakter peserta, dan tetap harus ditinjau/disetujui instruktur. Fitur ini deterministik, bukan AI; penggunaan AI tetap ditunda.
- Data profil peserta untuk pencocokan laporan dapat memuat NIM dan kelompok; NIM unik per kegiatan bila diisi.

### Phase 7 — dashboard, rapor, dan ekspor

- Dashboard/report resmi memakai snapshot Fase 6; Draft/Submitted tidak menjadi hasil final. Dashboard menampilkan status provisional/finalized/published, progres submit penilai, distribusi keputusan, dan agregat aspek.
- Rapor peserta hanya tersedia setelah snapshot final diterbitkan secara eksplisit. Akun role Peserta harus ditautkan Admin Sistem ke satu record peserta; akses rapor peserta diperiksa lagi di basis data dan RPC hanya mengembalikan rapor Published miliknya.
- Tema dan penyelenggara kegiatan bersifat opsional sampai datanya diisi. Nama pejabat pengesah tidak diisi otomatis; PDF menyediakan ruang pengesahan tanpa mengarang identitas.
- PDF resmi dan ZIP massal hanya memuat rapor Published. Excel dan event report memakai data yang diizinkan per role; ekspor skor individual/evidence hanya untuk Admin Sistem/koordinator. Catatan deliberasi dan sumber privat tidak masuk snapshot publik.
- Publikasi dan ekspor dicatat di audit table. Snapshot Phase 6 tetap immutable; rapor revisi menggunakan snapshot baru.
- PDF dibuat di browser memakai generator internal ringan dan ZIP tanpa kompresi; tidak menambah dependency. Excel menggunakan `xlsx` yang sudah terpasang. Rapor peserta belum dapat dibuka sebelum akun ditautkan.

### Akses dan privasi

- **Observer dan Instruktur yang ditugaskan** dapat melihat nilai bersama, riwayat perubahan, dan catatan per penulis untuk kegiatan tugasnya.
- **Bidang Kader berwenang** dapat melihat rekap dan nilai untuk pemantauan/penyusunan laporan; catatan observasi rinci tetap privat bagi Observer/Instruktur yang ditugaskan dan Admin Sistem.
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
- Berkas seleksi administrasi: satu Surat Mandat Komisariat untuk seluruh pengajuan. Foto peserta dan instruktur bersifat opsional; bila diunggah, foto peserta formal (jas IMM, latar putih) dan mengikuti batas/akses privat yang ditetapkan.
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
- Peserta tambahan saat screening tetap memerlukan profil wajib lengkap; foto opsional.
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
4. Observer: penilaian bersama dan catatan per penulis sesuai penugasan.
5. Instruktur: subrole diberikan per kegiatan. Keenam subrole dapat mengubah skor bersama dan membuat catatan masing-masing hanya untuk kegiatan yang ditugaskan. Akses penilaian membuka identitas peserta dan riwayat perubahan untuk kegiatan itu; catatan tidak dapat diakses dari kegiatan lain. Semua subrole memiliki dashboard peserta dan hasil penilaian kegiatan yang ditugaskan. Menu Profil Peserta dan Profil Instruktur menyediakan pemilihan kegiatan sesuai penugasan akun. MoT/Vice MoT mendapat checklist koordinasi; IoT/Vice IoT mendapat checklist agenda ruhiyah; Master of Observer/Vice Observer mendapat checklist koordinasi Observer.
6. Komisariat: informasi/laporan yang diizinkan.
7. Peserta: kelak mengakses tes/rapor yang diizinkan melalui username/password sementara atau token dengan masa berlaku yang dapat diatur.

Admin Sistem, Bidang Kader, Observer, Instruktur tetap, dan Komisariat memakai login email + kata sandi. Instruktur perbantuan memakai username + kata sandi. Akun/token peserta belum dibuat dan metode akses peserta masih terbuka.

### Pendaftaran akun Instruktur

- Ada dua jenis akun Instruktur: **permanen** untuk instruktur tetap dan **sementara** untuk instruktur perbantuan.
- Akun permanen mendaftar sendiri dengan email dan kata sandi.
- Akun sementara dibuat secara manual oleh Superadmin menggunakan username dan kata sandi.
- Kedua jenis akun dapat mengedit profil miliknya sendiri.
- Profil berisi nama lengkap, tempat lahir, tanggal lahir, jenis kelamin, nomor handphone, dan alamat domisili sebagai kolom wajib; foto terbaru opsional.
- Data pribadi profil disimpan terpisah dari ringkasan profil yang dapat dibaca role lain. Hanya pemilik dapat membaca dan mengubah detail pribadi; nama lengkap dan foto terlihat semua akun ber-role. Foto disimpan privat tetapi dapat dibaca akun ber-role. Foto memakai batas awal yang sama dengan foto peserta: JPG/PNG maksimal 5 MB.
- Semua akun ber-role yang sudah login dapat melihat nama lengkap dan foto Instruktur melalui daftar Profil Instruktur; tidak mendapat tempat/tanggal lahir, jenis kelamin, nomor handphone, atau alamat. Pengunjung publik belum termasuk dalam akses ini; tampilan profil publik tetap menunggu persetujuan pemilik foto/profil sesuai aturan privasi publik.
- Akun baru tidak mendapat akses dashboard sampai Superadmin menetapkan role dan subrole. Halaman dashboard sebelum penetapan boleh kosong/tidak berisi fitur berwenang.
- Pemilihan kegiatan dan subrole Instruktur tetap mengikuti penugasan yang sudah ada per kegiatan.
- Login username dipetakan di server ke alamat internal non-email pada Supabase Auth; profil menyimpan username terpisah. Pada versi awal, pemilik mengedit nama tampilan sendiri; kredensial, role, subrole, dan username tidak dapat diedit dari profil.

### Subrole Instruktur per kegiatan

- Superadmin menetapkan satu dari enam subrole pada setiap penugasan kegiatan. Akun yang sama dapat mendapat subrole berbeda pada kegiatan berbeda.
- **MoT:** memimpin koordinasi tim, memastikan rencana program/jadwal/target siap, mencatat kendala, dan mengoordinasikan evaluasi pasca kegiatan. Dashboard menampilkan checklist tugas dan ringkasan hasil.
- **Vice MoT:** membantu koordinasi MoT, menindaklanjuti delegasi dan siap menggantikan saat diperlukan. Dashboard menampilkan checklist dukungan dan ringkasan hasil.
- **IoT:** mengoordinasikan agenda ibadah dan pembinaan ruhiyah, petugas, jadwal, dan evaluasinya. Dashboard berisi checklist agenda; tidak menampilkan nilai peserta.
- **Vice IoT:** membantu kesiapan petugas/perlengkapan dan kelancaran agenda IoT. Dashboard berisi checklist tugas.
- **Master of Observer:** mengoordinasikan pembagian tugas Observer, memastikan rubrik dipahami, memantau progres, dan menyampaikan ringkasan hasil kepada MoT. Dashboard berisi checklist dan rekap agregat tanpa catatan privat.
- **Vice Observer:** membantu pemantauan penilaian yang belum selesai dan menyiapkan ringkasan untuk Master of Observer. Dashboard berisi checklist dan rekap agregat tanpa catatan privat.
- Semua daftar tugas merupakan checklist operasional yang dapat ditandai selesai.
- **Observer** tetap role terpisah dengan alur input yang sudah dijalankan. Observer yang ditugaskan dan semua subrole Instruktur yang ditugaskan dapat mengisi skor/catatan.
- Riwayat perubahan menyimpan skor/catatan sebelum dan sesudah, nama akun pelaku, dan waktu perubahan. Riwayat lama sebelum migrasi pelaku tidak dapat diidentifikasi; aplikasi harus menandainya tanpa mengarang nama.
- **Publik** tetap dapat melihat informasi publik dan agregat yang aman saja. Role Komisariat/Peserta/Bidang Kader yang mendukung fitur lama tetap dipertahankan; perubahan ini tidak menghapusnya.
- Dasar rujukan yang ditemukan: Sistem Perkaderan Ikatan IMM (2011) menjelaskan MoT sebagai pemimpin dan penanggung jawab keinstrukturan, Vice MoT membantu atau menggantikan, IoT memandu syariat/akhlak, Observer mengevaluasi perkembangan peserta, dan Koordinator Observer mengelola laporan serta mengoordinasikan konsolidasi. Tugas Vice IoT serta pembagian detail Master/Vice Observer di aplikasi ini adalah rancangan operasional yang diturunkan dari kebutuhan pengguna, bukan definisi baku resmi.

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
- **Instruktur:** dashboard menampilkan tugas subrole, daftar peserta, hasil/kategori nilai, serta pilihan Profil Peserta dan Profil Instruktur untuk kegiatan yang ditugaskan. Semua subrole dapat membaca nama dan profil peserta; rincian catatan tetap tersedia melalui Observasi sesuai kegiatan.
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

Status tiap fase dicatat ringkas di `HANDOVER.md`; daftar berkas penting dipindah ke bagian bawah dokumen ini. Riwayat sesi verifikasi dan migrasi (9 Oktober–12 November 2026) tersimpan verbatim di `docs/archive/BLUEPRINT-status-2026-11-12.md`. Dokumen ini hanya memuat keputusan dan rancangan yang masih berlaku.

### Berkas penting

- `app/page.tsx` — portal publik.
- `app/login/page.tsx` — form login email/kata sandi.
- `app/dashboard/page.tsx` — verifikasi sesi dan role server.
- `app/auth/signout/route.ts` — keluar dan menghapus sesi.
- `proxy.ts` — pembaruan cookie dan pemeriksaan klaim sesi.
- `lib/supabase/` — pembuat klien browser dan server.
- `.github/workflows/ci.yml` — verifikasi otomatis (typecheck, lint, format, tes, build).
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


