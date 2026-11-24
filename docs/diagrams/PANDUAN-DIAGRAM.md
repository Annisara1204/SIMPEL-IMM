# Panduan Diagram IMM Observer

Dokumen ini membantu pembaca memahami aplikasi dengan cepat tanpa membaca seluruh kode. Buka berkas PNG untuk melihat, atau berkas `.drawio` untuk mengubah diagram.

## Ringkasan satu paragraf

IMM Observer adalah website untuk mengawasi dan menilai Peserta Pelatihan Kader IMM (mulanya Darul Arqam Dasar/DAD). Komisariat mengajukan peserta, Observer menyeleksi administrasi dan screening, lalu Observer serta Instruktur mengisi nilai secara independen. Nilai yang sudah dikirim digabung, dimoderasi bila selisihnya besar, diputuskan oleh koordinator, lalu disimpan sebagai rapor yang tidak bisa diubah. Publik hanya melihat angka agregat yang aman.

## Daftar diagram

| # | Berkas | Pertanyaan yang dijawab |
|---|---|---|
| 1 | `01-arsitektur-sistem.png` | Aplikasi ini terdiri dari apa saja, dan siapa memakainya? |
| 2 | `02-peran-dan-akses.png` | Siapa boleh melihat apa, terutama data sensitif? |
| 3 | `03-alur-pengajuan-seleksi.png` | Bagaimana peserta masuk sampai ditetapkan lolos screening? |
| 4 | `04-alur-penilaian-laporan.png` | Bagaimana nilai diisi sampai rapor diterbitkan? |
| 5 | `05-aturan-perhitungan-skor.png` | Bagaimana angka 0-100 dan kategori dihitung? |
| 6 | `06-model-data.png` | Tabel apa saja yang menyimpan data dan bagaimana hubungannya? |
| 7 | `07-peta-halaman-per-role.png` | Menu apa yang tersedia untuk setiap peran? |

## Alur singkat (enam langkah)

1. **Admin Sistem** membuat kegiatan dan komisariat; Observer dan Instruktur ditugaskan.
2. **Komisariat** mengirim pengajuan peserta beserta Surat Mandat dan foto opsional. Setelah Observer mulai meninjau, pengajuan terkunci.
3. **Observer** memvalidasi berkas (seleksi administrasi), lalu melakukan screening. Hasil baru terlihat Komisariat setelah ditekan tombol "Terbitkan hasil".
4. **Observer dan Instruktur** mengisi skor 1-5 atau N/O per indikator, disertai bukti dan catatan. Penilaian tiap orang tersimpan sendiri, autosave, dan perubahan langsung tampil ke penilai lain bila terhubung.
5. **Moderator** (Admin Sistem, Bidang Kader, atau Instruktur dengan subrole tertentu) melihat agregat, menyelesaikan moderasi bila selisih skor mencapai 2 poin, menetapkan keputusan, lalu memfinalisasi menjadi snapshot.
6. **Admin/Bidang** menerbitkan rapor dari snapshot; Peserta dan Kader melihatnya, sementara PDF/ZIP/Excel tercatat di audit.

## Kata kunci yang sering muncul

- **Rubrik versi**: aturan penilaian (aspek, indikator, bobot, uraian skor) yang disimpan per kegiatan, tahap, jenis penilaian, dan materi. Versi aktif tidak diubah; perubahan membuat versi baru.
- **Aspek / indikator**: aspek adalah kelompok kompetensi (misalnya Intelektualitas). Indikator adalah hal spesifik yang diamati (misalnya INT-01 Memahami materi).
- **Jenis penilaian**: satu versi rubrik aktif, misalnya Screening atau Pelatihan AIK Kognitif. Finalisasi dan rapor berlaku per jenis.
- **N/O (Belum diamati)**: indikator tidak dinilai karena tidak ada bukti. Bukan nilai 0 dan tidak ikut dihitung.
- **Coverage**: persentase indikator yang benar-benar dinilai dalam satu aspek. Minimal 80% agar aspek dianggap valid.
- **Moderasi**: peninjauan manual bila skor antar penilai selisih 2 poin atau lebih. Nilai Observer tetap dipakai, keputusan moderasi dicatat terpisah.
- **Rekomendasi otomatis**: draf saran untuk indikator dengan rata-rata di bawah 3/5. Bersifat deterministik (bukan AI) dan harus disetujui instruktur sebelum masuk rapor.
- **Snapshot**: hasil final bernomor yang sudah dikunci. Tidak bisa diedit atau dihapus; revisi membuat snapshot baru.
- **Publikasi**: tindakan eksplisit agar rapor bisa dibuka. Sebelum itu hasil masih bersifat provisional.
- **RLS (Row Level Security)**: aturan di basis data yang membatasi baris mana yang boleh dibaca atau diubah setiap peran. Izin tidak hanya bergantung pada menu yang disembunyikan.

## Kategori nilai

| Skor 0-100 | Kategori |
|---|---|
| 0 sampai kurang dari 60 | Perlu pengembangan |
| 60 sampai kurang dari 75 | Cukup |
| 75 sampai kurang dari 90 | Baik |
| 90 sampai 100 | Sangat baik |

Keputusan lulus atau perlu pembahasan lanjutan tetap ditetapkan manual oleh koordinator.

## Hal yang perlu diingat

- Seluruh data yang dipakai adalah **data simulasi**. Jangan memasukkan data peserta nyata sebelum tinjauan keamanan, privasi, backup, dan biaya selesai.
- Aplikasi bisa diakses di `http://43.173.33.195:8080/`. Pemilik memutuskan tetap memakai IP tanpa TLS untuk sementara; lihat `docs/STATUS-PRODUKSI-SATU-VERSI.md`.
- Akun Peserta belum dibuat, sehingga rapor saat ini hanya dibuka Admin, Bidang Kader, dan Instruktur moderator.
- Impor nilai tes dari Google Sheets dan fitur AI masih ditunda.

## Cara membuka dan mengubah diagram

- **Melihat cepat**: buka berkas `.png` yang sesuai, atau buka `index.html` di browser untuk galeri lengkap.
- **Mengubah**: buka berkas `.drawio` dengan aplikasi draw.io desktop, atau di `https://app.diagrams.net` (pilih *Open From → Device*).
- **Membuat ulang PNG**: jalankan `bash render.sh` (butuh koneksi internet dan Google Chrome terpasang). Skrip ini membuka viewer diagrams.net secara headless lalu mengambil tangkapan layar.
- **Catatan teknis**: teks yang mengandung tanda `%` ditulis sebagai `&#37;` di berkas `.drawio`. Tanpa itu, viewer diagrams.net menolak URL saat merender.

Sumber isi diagram: `BLUEPRINT.md`, `HANDOVER.md`, `IMPLEMENTATION_PLAN.md`, kode di `app/`, `lib/`, `components/`, dan migrasi di `supabase/migrations/`.
