# Hasil Penyusunan Ulang Halaman Evaluasi Kolektif

Tanggal: 24 November 2026. Perubahan hanya pada `app/dashboard/evaluasi/page.tsx`. Tidak ada perubahan Server Action, perhitungan, gate, RPC, atau database produksi.

## Masalah

- Form utama dan form finalisasi terpisah. Form finalisasi mengulang input keputusan dan alasan serta menyalin narasi sebagai input hidden.
- Koordinator harus mengisi ulang keputusan dan alasan untuk tiap tombol.
- Tabel 15 indikator, kartu aspek, moderasi, dan empat form bertumpuk dalam satu halaman panjang.

## Perubahan

- Satu form bersama untuk narasi, keputusan, dan alasan. Semua tombol memakai input yang sama:
  - `Simpan draf evaluasi` → `saveCollectiveEvaluation`
  - `Finalisasi dan simpan snapshot` → `finalizeCollectiveEvaluation`
  - `Setujui, finalisasi, terbitkan, dan unduh rapor` → `approveFinalizePublishReport`
- Input hidden duplikat dihapus. Field yang dibaca Server Action tetap sama persis.
- Halaman dibagi menjadi tiga seksi bernomor:
  1. Rekap penilaian, dengan tabel indikator yang default terlipat dan UUID dipendekkan menjadi 8 karakter.
  2. Catatan, rekomendasi, dan keputusan, termasuk form bersama dan form rekomendasi.
  3. Tindak lanjut, berisi finalisasi massal di bagian bawah.
- Select keputusan diberi `key` agar nilai tersimpan tampil kembali setelah draft disimpan.
- Petunjuk di dekat tombol finalisasi menjelaskan kewajiban keputusan, alasan minimal 10 karakter, dan alasan tombol dinonaktifkan bila coverage belum memenuhi.

## Verifikasi DEV

- Tiga seksi bernomor tampil.
- Hanya ada satu `select[name=decision]` dan satu `textarea[name=decisionRationale]`.
- Mengisi sekali lalu menekan "Simpan draf evaluasi" menyimpan narasi, keputusan, dan alasan ke database.
- Setelah halaman dimuat ulang, nilai keputusan dan alasan masih tampil.
- Draft uji dihapus setelah pengujian.
- `npm run check` dan `npm run build` lolos, 22 tes lulus, 5 peringatan lama.

## Deploy produksi

- Backup aplikasi `/home/ubuntu/imm-app.bak-evaluasi-ui-20261124-191956`.
- Backup `.env.production` `/home/ubuntu/.env.production.bak-evaluasi-ui-20261124-191956`, hash sama dengan file aktif.
- rsync tanpa `--delete`, build, dan `pm2 restart imm` berhasil. PID baru `3214883`.
- Smoke enam halaman: 200.
- Browser produksi dengan akun QA Instruktur MoT, pada URL yang dilaporkan pengguna: tiga seksi tampil, satu input keputusan, satu input alasan, tiga tombol aksi tersedia, tanpa banner error.

## Yang tidak diubah

- Logika perhitungan skor, coverage, moderasi, dan snapshot.
- Nama dan signature Server Action.
- Hak akses dan RLS.
- Data evaluasi produksi.
