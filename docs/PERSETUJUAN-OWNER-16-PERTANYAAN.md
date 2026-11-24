# Persetujuan Owner — 16 Pertanyaan Tindak Lanjut

Tanggal: 24 November 2026.
Sumber: balasan pemilik atas daftar pertanyaan yang disusun dari `docs/RENCANA-IMPLEMENTASI-KEPUTUSAN.md`. Jawaban: **"setuju semuanya"**, artinya semua rekomendasi pada daftar diterima.

Dokumen ini menjadi acuan bersama `docs/MATRIKS-KEPUTUSAN-PRODUK.md`. Bila ada perbedaan, jawaban di bawah yang dipakai untuk 16 poin ini.

## Jawaban yang disetujui

| # | Pokok | Keputusan |
|---|---|---|
| 1 | Penandatangan | Pemilik Produk = pemilik aplikasi; Pemilik Infrastruktur = pengelola server; Pemilik Keamanan/Privasi = pemilik atau penanggung jawab data. **Nama belum diisi.** |
| 2 | Izin perbaikan produksi | **Ya.** Lima perbaikan Fase 0b boleh dilakukan: nonaktifkan pendaftaran publik, cabut grant anon, putar kunci, pasang domain dan HTTPS, lengkapi backup akun. |
| 3 | Domain HTTPS | Gunakan domain resmi IMM Kota Bandung yang sudah ada. **Nama domain belum diisi.** Tanpa domain, kredensial Peserta tidak dibagikan. |
| 4 | Definisi "kelompok" | **Per komisariat dalam satu kegiatan.** Ambang 10 diterapkan pada kelompok itu sebelum agregat tampil. |
| 5 | Syarat terbit rapor | **Ya.** Rapor hanya terbit bila coverage minimal 80%, moderasi selesai, dan alasan keputusan terisi. Nilai sementara tetap tampil di aplikasi. |
| 6 | Tombol Finalisasi aplikasi | **Ikut dikunci** sampai moderasi selesai. Publish sudah keras. |
| 7 | Filter peserta pada RPC rekap | **Ya.** Ditambah masukan opsional agar rekap diambil untuk satu peserta, menggantikan kirim 3.069 baris ke browser. |
| 8 | Jalur revisi rapor | **Buat evaluasi dan snapshot revisi baru.** Snapshot lama tidak diubah. |
| 9 | Akses Kader ke nilai mentah | **Tidak.** Kader hanya menerima rekap tanpa bukti dan catatan rinci. |
| 10 | Masa berlaku kata sandi Peserta | **30 hari** sejak kegiatan selesai, dapat dicabut kapan saja. |
| 11 | Bukti ganti kata sandi | **Ya.** Jika hash sandi tidak terbaca, pakai jalur OTP atau email. Kewajiban ganti sandi tidak dinyatakan terpenuhi sebelum jalur itu siap. |
| 12 | Satu akun untuk satu Peserta | **Ya.** Satu akun hanya ditaut ke satu peserta. |
| 13 | Akses IoT | **Ya.** IoT tetap mengisi Observasi, tidak melihat rekap penilaian. |
| 14 | Retensi data | **Ya.** Surat Mandat sampai hasil seleksi terbit; foto sampai rapor tidak tersedia; nilai dan riwayat 2 tahun; log audit 5 tahun; backup harian 14 hari; salinan rahasia akun 30 hari setelah rotasi kunci. |
| 15 | Arsip identitas di snapshot | **Ya.** Identitas dalam snapshot privat tetap diarsipkan terenkripsi. |
| 16 | Mulai Fase 2 di DEV | **Ya**, setelah tinjauan keamanan, privasi, biaya, dan backup selesai. Tidak ada deploy produksi tanpa izin terpisah. |

## Dampak pada daftar terbuka rencana

- `[TERBUKA-2]` tertutup: kelompok = per komisariat dalam kegiatan.
- `[TERBUKA-3]` tertutup: Kader tidak melihat nilai mentah; ekspor Kader tetap ditolak.
- `[TERBUKA-4]` tertutup: arsip identitas disetujui.
- `[TERBUKA-5]` tertutup: revisi memakai evaluasi dan snapshot baru.
- `[TERBUKA-7]` tertutup: filter peserta pada RPC disetujui.
- `[TERBUKA-9]` tertutup: tombol Finalisasi dikunci sampai moderasi selesai.
- `[TERBUKA-10]` tertutup: masa berlaku 30 hari.
- `[TERBUKA-13]` jalur OTP/email disetujui sebagai cadangan; implementasi masih menunggu pengecekan ketersediaan hash sandi.
- `[TERBUKA-1]` masih terbuka: format pembulatan tampilan belum diputus.
- `[TERBUKA-6]` masih terbuka sampai nama tiga penandatangan diisi.
- `[TERBUKA-11]` masih terbuka sampai nama domain HTTPS diisi.
- `[TERBUKA-12]` masih terbuka: izin ini mengunci tombol Finalisasi di aplikasi, belum mengubah aturan database siapa yang boleh menulis status `finalized`.

## Yang belum boleh dimulai

Sesuai jawaban nomor 16, pekerjaan kode Fase 2 baru dimulai setelah tinjauan keamanan, privasi, biaya, dan backup selesai. Izin produksi pada nomor 2 baru dilaksanakan pada Fase 0b dengan bukti tertulis.
