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

3. Buka `http://localhost:3000`. Tekan `Ctrl+C` untuk menghentikan server.

Verifikasi sebelum menyerahkan perubahan:

```powershell
npm.cmd run check    # typecheck + lint + format:check + tes
npm.cmd run build
```

Halaman utama adalah portal publik simulasi. Login internal tersedia melalui tombol **Login pengguna**.

## Menyiapkan login Supabase untuk uji lokal

Login sungguhan membutuhkan proyek Supabase gratis. Jangan kirim kata sandi atau kunci rahasia ke chat.

1. Buat proyek Supabase untuk pengujian dan simpan kata sandi basis data dengan aman.
2. Di **SQL Editor**, jalankan seluruh migrasi di `supabase/migrations` **sesuai urutan nama berkas** (dari yang paling awal sampai berkas terakhir di direktori tersebut). Migrasi mengatur tabel profil, role, RLS, kegiatan/peserta, rubrik, observasi, pengajuan Komisariat, framework dan rubric engine DAD, workspace penilaian, scoring kolektif, pelaporan/publikasi, arsip kegiatan, dan rekap peserta unik. Untuk proyek yang sudah menjalankan migrasi lama, jalankan hanya migrasi yang belum; daftar dan status otoritas ada di `docs/STATUS-PRODUKSI-SATU-VERSI.md`.
3. Di pengaturan autentikasi, aktifkan pendaftaran email agar instruktur tetap dapat mendaftar sendiri. Akun baru tetap tanpa role dan tidak dapat memakai dashboard sampai Superadmin memberi role. Atur konfirmasi email sesuai kebijakan uji dan izinkan URL pengalihan `http://localhost:3000/auth/callback`.
4. Buat file `.env.local` dari `.env.example`, lalu isi:

```text
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT-ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=KUNCI_PUBLISHABLE_ATAU_ANON
SUPABASE_SERVICE_ROLE_KEY=KUNCI_RAHASIA_SERVER
```

`NEXT_PUBLIC` berarti nilai dapat dibaca browser. Hanya URL dan publishable/anon key yang boleh memakai awalan itu. Service key hanya untuk server (membuat akun instruktur perbantuan) dan tidak pernah dikirim ke browser. `.env.local` diabaikan Git dan tidak boleh dibagikan.

5. Buat satu pengguna uji melalui **Authentication → Users**. Trigger membuat profil tanpa role. Jadikan admin pertama lewat SQL Editor (ganti UUID):

```sql
update public.profiles
set role = 'admin_system', display_name = 'Admin Uji'
where id = 'GANTI-DENGAN-UUID-PENGGUNA';
```

6. Instruktur tetap mendaftar lewat `/daftar`; akun perbantuan dibuat Superadmin di halaman **Pengguna** dengan username dan kata sandi. Setelah role Instruktur diberikan, Superadmin memilih subrole dan kegiatan di **Pengaturan Penilaian**. Pengguna mengubah nama tampilan sendiri di **Profil saya**; role/subrole hanya diubah Superadmin.
7. Mulai dari **Kegiatan DAD**: buat kegiatan trial, isi peserta simulasi. Lalu **Pengaturan Penilaian** → pilih kegiatan → Screening/Pelatihan/Rencana Tindak Lanjut → susun rubrik → aktifkan. **Observasi**: Observer yang ditugaskan dan seluruh subrole Instruktur yang ditugaskan mengisi penilaian independen (skor 1–5 atau N/O) per peserta/indikator; status selesai tercatat per versi rubrik; perubahan skor/catatan membuka kembali status selesai terkait.
8. Untuk pengajuan peserta Komisariat: tautan akun Komisariat di halaman **Pengguna**, lalu akun Komisariat membuat draf, mengunggah Surat Mandat PDF (maks. 10 MB) dan foto peserta (maks. 5 MB) di **Pengajuan Peserta**, mengirimnya; Observer memproses di **Seleksi Komisariat**.

## Yang sudah tersedia dan verifikasinya

- **Phase 2–4** (framework kompetensi, rubric engine, mapping materi): migrasi dan penguji SQL lulus; halaman `/dashboard/kerangka` tersedia.
- **Phase 5–7** (penilaian independen, agregasi kolektif, dashboard, publikasi, ekspor): migrasi terpasang; uji browser dua akun, konflik, Realtime, finalisasi, publikasi, dan ekspor sudah dijalankan. Rincian di `HANDOVER.md`.

Detail kondisi terkini dan kode aktif: `docs/STATUS-PRODUKSI-SATU-VERSI.md` (otoritas tunggal), bukan ringkasan lama di `HANDOVER.md`. Rencana uji: `docs/QA_PHASE8_TEST_PLAN.md`. Spesifikasi trial: `docs/TRIAL_DAD_COMPETENCY_FRAMEWORK.md`. Riwayat verifikasi per sesi: `docs/archive/`.

## Batasan yang diketahui

- Data masih simulasi. Jangan migrasi data nyata sebelum tinjauan keamanan, privasi, backup, dan biaya.
- Fitur impor tes (.xlsx) tersedia untuk Admin Sistem dan ditunda sementara pengguna memusatkan pekerjaan pada Observer dan Komisariat.
- Build pernah gagal `EPERM` di prerender pada Windows (masalah filesystem Windows, bukan kode); build lolos di Linux dan di CI.
- Unduhan Excel/PDF hasil seleksi Komisariat dan tahap screening belum tersedia.

## Jika terjadi masalah

- **Login belum disambungkan:** periksa isi `.env.local`, lalu mulai ulang server (`Ctrl+C` → `npm.cmd run dev`).
- **Akses belum diberikan:** profil akun belum memiliki role; Superadmin perlu mengaturnya.
- **Profil belum tersedia:** pastikan seluruh migrasi berhasil dijalankan dan trigger profil aktif.
- **Email/kata sandi ditolak:** periksa pengguna di Authentication → Users dan status konfirmasi email.

## Keputusan penting yang berlaku

- Skor tiap peserta-indikator independen per Observer/Instruktur (bukan satu nilai bersama); observer lain tampil baca-saja.
- Catatan observasi dipisah per penulis dan kategori; catatan privat tidak otomatis masuk rapor.
- Nilai agregat memakai `(skor aspek / 5) × bobot aspek`; tampilan satu angka desimal, snapshot menyimpan dua angka desimal. Kategori: 0–<60 Perlu pengembangan, 60–<75 Cukup, 75–<90 Baik, 90–100 Sangat baik.
- Rubrik berversi dan tidak bisa diubah setelah aktif; perubahan membuat versi baru.
- Rapor peserta hanya tersedia setelah snapshot final **dipublikasikan** eksplisit; ekspor skor rinci hanya untuk Admin Sistem/koordinator.
- Tidak ada AI pada perhitungan skor; AI ditunda dan hanya untuk draf narasi bila nanti disepakati.
