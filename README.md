# IMM Observer — Petunjuk Uji Coba

Aplikasi ini dikembangkan dengan Next.js (kerangka kerja website) dan Supabase (layanan login serta basis data). Gunakan data simulasi saja.

## Menjalankan di Windows

1. Pasang Node.js versi 20.9 atau lebih baru.
2. Buka PowerShell, lalu jalankan:

```powershell
cd "C:\Users\Lenovo\Documents\project"
npm install
npm.cmd run dev
```

3. Buka alamat yang muncul, umumnya `http://localhost:3000`. Tekan `Ctrl+C` pada PowerShell untuk menghentikan server.

Halaman utama adalah portal publik simulasi. Login internal tersedia melalui tombol **Login pengguna**.

## Menyiapkan login Supabase untuk uji lokal

Login sungguhan membutuhkan proyek Supabase gratis. Jangan kirim kata sandi atau kunci rahasia ke chat.

1. Buat proyek Supabase untuk pengujian dan simpan kata sandi basis data dengan aman.
2. Pada menu **SQL Editor**, jalankan berurutan isi migrasi dari `20261029000000_initial_profiles_rls.sql` sampai migrasi terbaru di folder `supabase/migrations`. Migrasi 0500 menambah kolom profil dan tautan Komisariat; 0600 membuat bucket foto privat; 0700 menyiapkan rubrik/observasi; 0800–0900 menyiapkan impor nilai khusus Admin Sistem; 1000 menyiapkan pengajuan Komisariat dan seleksi administrasi; 1100–1200 membatasi kegiatan Observer; 1300 membatasi pengelolaan rubrik kepada Admin Sistem; 1400–1600 memisahkan rubrik menurut tahap/jenis dan status selesai Observer; 1700 menambahkan materi Pelatihan; 1800 menambahkan tahap Rencana Tindak Lanjut, role Instruktur, dan rekap kategori; 1900 menambahkan penugasan subrole Instruktur per kegiatan beserta checklist tugas masing-masing. Untuk proyek yang sudah menjalankan migrasi lama, jalankan migrasi baru secara berurutan. Peserta simulasi lama mendapat data profil contoh; fotonya belum terisi dan dapat ditambahkan saat diedit.
3. Pada pengaturan autentikasi, matikan pendaftaran umum (public sign-up). Akun internal dibuat admin saja. Untuk uji awal, atur konfirmasi email sesuai kebijakan pengujian Anda; jangan pakai akun nyata tanpa meninjau pengaturan email.
4. Salin **Project URL** dan **publishable key** (atau anon key lama) dari pengaturan API Supabase. Jangan gunakan `service_role` key di browser.
5. Buat file lokal `.env.local` dengan isi berikut, lalu ganti dua nilai contoh:

```text
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT-ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=KUNCI_PUBLISHABLE_ATAU_ANON
```

`NEXT_PUBLIC` berarti nilai tersebut dapat dibaca browser. Karena itu hanya boleh diisi URL dan publishable/anon key, yang memang dirancang untuk digunakan bersama kebijakan RLS. Jangan taruh service key, kata sandi basis data, atau rahasia lain di sini.

6. Buat satu pengguna uji melalui menu **Authentication → Users**. Trigger basis data membuat profil tanpa role. Berikan role admin kepada pengguna pertama melalui SQL Editor, ganti UUID dengan ID pengguna dari halaman Users:

```sql
update public.profiles
set role = 'admin_system', display_name = 'Admin Uji'
where id = 'GANTI-DENGAN-UUID-PENGGUNA';
```

7. Pengguna berikutnya dibuat lewat Authentication → Users. Setelah Admin awal masuk, buka menu **Pengguna** di ruang kerja untuk memberi atau mengubah role akun. Baris akun tanpa role ditolak dari dashboard sampai Admin memberi role.
8. Masuk sebagai Observer atau Admin Sistem (Super Admin). Menu **Kegiatan DAD** dapat membuat kegiatan trial dan mengubah kegiatan; menu **Peserta** menambah, mengedit seluruh profil, mengganti foto, atau menghapus peserta. Nama peserta yang sama diperbolehkan. Profil baru memerlukan nama, Komisariat aktif, jurusan/program studi, tahun angkatan, dan foto formal; jabatan opsional. Untuk kegiatan nyata, peserta, foto, dan nilai tetap gunakan data simulasi sampai akses, privasi, serta cadangan data ditinjau.
9. Admin Sistem dapat membuka **Komisariat** dari menu **Pengelolaan** untuk mengubah nama contoh, menambahkan entri, atau menonaktifkan/mengaktifkan kembali Komisariat. Contoh awal bernama Komisariat Simulasi 01–03; tidak ada nama nyata. Entri nonaktif tidak dihapus agar riwayat tetap ada.
10. Admin Sistem memberi role Komisariat kepada akun uji, lalu memilih master Komisariat pada kolom **Tautan Komisariat** di halaman **Pengguna**.
11. Untuk uji pengajuan, masuk sebagai akun Komisariat tertaut, buka **Pengajuan Peserta**, buat draf untuk kegiatan terencana/berlangsung, unggah PDF dan data peserta/foto, lalu kirim. Sebagai Observer yang ditugaskan ke kegiatan itu, buka **Seleksi Komisariat**, mulai tinjauan, simpan keputusan untuk tiap peserta, dan terbitkan hasil. Komisariat dapat melihat hasil pada halaman pengajuannya.
12. Hentikan dan jalankan ulang `npm run dev` setelah membuat `.env.local`.

## Tahap 4 — pengaturan penilaian dan observasi

Setelah semua migrasi dijalankan, Admin Sistem (Super Admin) membuka **Pengaturan Penilaian** untuk membuat atau mengubah draf rubrik dan mengaktifkannya. Bidang Kader dapat melihat rubrik dan mengatur penugasan Observer, tetapi tidak dapat mengubah atau mengaktifkan rubrik. Bobot aspek dan indikator di dalam setiap aspek harus berjumlah 100%. Versi aktif bersifat tetap; Admin Sistem membuat versi draf berikutnya untuk perubahan. Versi baru menyalin susunan versi sebelumnya.

Di halaman **Pengaturan Penilaian**, pilih kegiatan DAD, lalu pilih **Screening**, **Pelatihan**, atau **Rencana Tindak Lanjut**. Pada Pelatihan, Super Admin menambah nama materi terlebih dahulu; setiap materi memiliki rubrik dan status selesai sendiri. Screening dan Rencana Tindak Lanjut langsung memilih jenis penilaian tanpa materi. Tiap rubrik memiliki aspek, indikator, target, dan bobot sendiri; bobot antar-aspek dan indikator dalam tiap aspek harus berjumlah 100%. Rubrik lama dari sebelum migrasi 1400 tetap tersimpan di materi **Materi umum**, jenis **Penilaian umum**, pada tahap Pelatihan. Penugasan Observer tetap berlaku per kegiatan. Menu **Observasi** menuntun pemilihan kegiatan → tahap → (materi untuk Pelatihan) → jenis penilaian sebelum membuka rubrik aktif. Lembar itu menyediakan skala bulat 1–5, status “Belum diamati”, catatan privat, simpan otomatis, pemeriksaan konflik saat beberapa pengguna mengubah isian, dan riwayat perubahan. Jika semua indikator sebuah aspek belum diamati, aspek dikeluarkan dan bobot aspek lainnya dinormalisasi ulang. Rata-rata berbobot diubah ke 0–100 dengan rumus `(rata-rata − 1) ÷ 4 × 100`. Kategori nilai: 0–<60 Perlu pengembangan, 60–<75 Cukup, 75–<90 Baik, 90–100 Sangat baik. Status selesai disimpan per versi rubrik; nilai untuk rubrik itu menjadi resmi setelah semua Observer yang ditugaskan selesai. Perubahan nilai membuka kembali status selesai hanya untuk rubrik terkait. Dashboard Observer dan Super Admin menampilkan skor/kategori individu pada kegiatan yang dapat diakses. Super Admin memilih subrole Instruktur pada saat menugaskan akun ke kegiatan; subrole berlaku per kegiatan. MoT/Vice MoT dan Master/Vice Observer mendapat rekap kategori dan checklist tugas. IoT/Vice IoT mendapat checklist agenda ruhiyah tanpa data nilai. Tidak ada subrole Instruktur yang dapat membaca catatan privat Observer; Observer tetap role terpisah untuk menginput skor dan catatan.

## Tahap 5 — impor pretest/posttest

Admin Sistem (Super Admin) dapat membuka **Impor Hasil Tes**. Fitur ini ditunda untuk role Bidang Kader. Pilih kegiatan dan jenis tes, lalu unggah ekspor Excel `.xlsx` dari Google Sheets (maksimal 5 MB, 500 baris data, 50 kolom, dan 10 lembar). Baris pertama dianggap judul kolom; pengguna memilih kolom nama, Komisariat, dan nilai. Berkas dibaca sementara dan tidak disimpan sebagai salinan.

Sebelum menyimpan, pratinjau menunjukkan pasangan peserta berdasarkan nama + Komisariat. Pasangan yang tidak cocok atau lebih dari satu harus dipilih manual; baris yang tidak ingin diimpor dapat dikeluarkan. Jika ada hasil sebelumnya untuk peserta/jenis tes yang sama, impor baru disimpan sebagai riwayat dan pengguna wajib memilih hasil lama atau hasil baru yang akan dipakai. Nilai lama tidak ditimpa diam-diam.

Tahap impor ini ditunda sementara pengguna memusatkan pekerjaan pada Observer dan Komisariat. Berkas `.env.local` diabaikan Git dan tidak boleh dibagikan. `.env.example` hanya berisi format dan nilai contoh.

## Pengajuan Komisariat dan seleksi administrasi

Setelah migrasi 1000 dijalankan, Admin Sistem menautkan akun Komisariat ke master Komisariat. Setiap Komisariat dapat membuat satu pengajuan aktif per kegiatan, mengunggah satu Surat Mandat PDF maksimal 10 MB, lalu menambah beberapa profil peserta dengan foto JPG/PNG maksimal 5 MB. Draf dapat diedit; pengajuan dapat dibatalkan sebelum Observer mulai meninjau.

Observer yang ditugaskan ke kegiatan membuka **Seleksi Komisariat**, memulai tinjauan, menetapkan Lolos/Tidak Lolos untuk semua peserta, menambahkan alasan publik untuk peserta yang tidak lolos, dan catatan internal opsional. Pengajuan terkunci sejak tinjauan dimulai; hasil baru terlihat di halaman Komisariat sesudah diterbitkan.

Implementasi saat ini mencakup alur tersebut dan hasil di halaman web. Unduhan Excel/PDF, tahap screening, peserta tambahan, dan mandat tambahan belum tersedia. Gunakan data simulasi sampai uji akses dan privasi di Supabase selesai.

## Jika terjadi masalah

- **Login belum disambungkan:** periksa nama dan isi `.env.local`, lalu mulai ulang server.
- **Akses belum diberikan:** profil akun belum memiliki role; admin perlu mengaturnya.
- **Profil belum tersedia:** pastikan skrip migrasi berhasil dijalankan dan trigger profil aktif.
- **Email/kata sandi ditolak:** periksa pengguna di Authentication → Users dan status konfirmasi email.
- **Alamat tidak terbuka:** pastikan terminal masih menjalankan `npm run dev`; gunakan URL yang dicetak terminal.

## Status tahap

Tahap 2 menyediakan login, pembacaan role di server, sesi cookie, perlindungan baris tabel profil, dan halaman admin untuk mengatur role akun yang sudah dibuat. Tahap 3 menambahkan kegiatan/peserta simulasi dan master Komisariat. Jalankan migrasi berurutan seperti dijelaskan di atas; build lokal tidak memeriksa migrasi pada proyek Supabase sebenarnya.
