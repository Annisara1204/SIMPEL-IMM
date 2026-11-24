# Persetujuan Owner — 16 Pertanyaan Tindak Lanjut

Tanggal: 24 November 2026.
Sumber: balasan pemilik atas daftar pertanyaan yang disusun dari `docs/RENCANA-IMPLEMENTASI-KEPUTUSAN.md`. Jawaban: **"setuju semuanya"**, artinya semua rekomendasi pada daftar diterima.

Dokumen ini menjadi acuan bersama `docs/MATRIKS-KEPUTUSAN-PRODUK.md`. Bila ada perbedaan, jawaban di bawah yang dipakai untuk 16 poin ini.

## Jawaban yang disetujui

| # | Pokok | Keputusan |
|---|---|---|
| 1 | Penandatangan | **Skip dulu, tidak perlu nama.** Persetujuan pemilik cukup tercatat di dokumen ini. Gate yang meminta tiga tanda tangan nama dihapus. |
| 2 | Izin perbaikan produksi | **Ya.** Empat perbaikan Fase 0b boleh dilakukan: nonaktifkan pendaftaran publik, cabut grant anon, putar kunci, lengkapi backup akun. Pasang domain dan HTTPS **tidak jadi dilakukan**. |
| 3 | Domain HTTPS | **Final: tidak ada domain, aplikasi tetap memakai IP.** Port 8080 dipertahankan. Konsekuensi: tanpa TLS yang dipercaya browser, kredensial Peserta tidak dibagikan sampai ada domain. |
| 4 | Definisi "kelompok" | **Per komisariat dalam satu kegiatan.** Ambang 10 diterapkan pada kelompok itu sebelum agregat tampil. |
| 5 | Syarat terbit rapor | **Ya.** Rapor hanya terbit bila coverage minimal 80%, moderasi selesai, dan alasan keputusan terisi. Nilai sementara tetap tampil di aplikasi. |
| 6 | Tombol Finalisasi aplikasi | **Ikut dikunci** sampai moderasi selesai. Publish sudah keras. |
| 7 | Filter peserta pada RPC rekap | **Ya.** Ditambah masukan opsional agar rekap diambil untuk satu peserta, menggantikan kirim 3.069 baris ke browser. |
| 8 | Jalur revisi rapor | **Buat evaluasi dan snapshot revisi baru.** Snapshot lama tidak diubah. |
| 9 | Akses Kader ke nilai mentah | **Tidak.** Kader hanya menerima rekap tanpa bukti dan catatan rinci. |
| 10 | Masa berlaku kata sandi Peserta | **30 hari** sejak kegiatan selesai, dapat dicabut kapan saja. |
| 11 | Bukti ganti kata sandi | **Tidak ada SMTP, TOTP, atau pihak ketiga.** Pakai pendaftaran dan kata sandi biasa. Bukti ganti sandi mengandalkan perbandingan hash sandi di server. Jalur OTP atau email dibatalkan. |
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
- `[TERBUKA-13]` jalur OTP/email dibatalkan. Bukti ganti sandi hanya memakai perbandingan hash sandi di server. Jika hash tidak terbaca, kewajiban ganti sandi tidak dapat dibuktikan dan harus dilaporkan, bukan diganti dengan proksi.
- `[TERBUKA-1]` tertutup: satu angka desimal di Observasi, Evaluasi, PDF, dan Excel. Nilai di snapshot tetap disimpan dua angka desimal.
- `[TERBUKA-6]` tertutup: tidak memakai nama penandatangan; persetujuan pemilik di dokumen ini yang menjadi bukti.
- `[TERBUKA-11]` ditutup dengan keputusan tetap memakai IP. Kredensial Peserta tidak dibagikan sebelum ada TLS yang dipercaya browser.
- `[TERBUKA-12]` tertutup: yang boleh menulis status `finalized` adalah Admin Sistem dan empat subrole koordinator. Opsi B diaktifkan, tombol Admin dihapus.

## Konsekuensi keputusan IP tanpa domain

Aplikasi panitia tetap bisa dipakai lewat `http://43.173.33.195:8080/`. Karena tidak ada TLS, kata sandi dan token akan lewat jaringan tanpa enkripsi. Karena itu:

- Akun dan kata sandi Peserta tidak dibuat atau dibagikan sampai ada domain dan HTTPS.
- Rapor Peserta belum bisa diakses Peserta. Admin, koordinator, dan Kader tetap bisa membuka rapor yang sudah diterbitkan.
- Fase 3d dan RPT-001 sampai RPT-005 ditunda. Fase 2 dan 3a sampai 3c serta 3e sampai 3g tetap bisa dikerjakan di DEV.
- Fase 0b tidak lagi memasang sertifikat. Bukti 0b butir domain dan TLS diganti dengan catatan keputusan ini.

## Yang belum boleh dimulai

Sesuai jawaban nomor 16, pekerjaan kode Fase 2 baru dimulai setelah tinjauan keamanan, privasi, biaya, dan backup selesai. Izin produksi pada nomor 2 baru dilaksanakan pada Fase 0b dengan bukti tertulis.
