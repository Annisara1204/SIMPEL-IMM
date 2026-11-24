# Peta Alur Penilaian — Indeks

Hasil eksplorasi branch `research/peta-alur-penilaian` (24 November 2026). Semua berkas di bawah dibuat dari pembacaan kode dan uji browser lokal. Tidak ada perubahan kode aplikasi, tidak ada penulisan ke database produksi.

## Daftar dokumen

| Dokumen | Isi | Dipakai untuk |
|---|---|---|
| `ALUR-PENILAIAN-KANONIK.md` | Rantai 12 langkah dari penugasan sampai rapor, aturan angka, dan 10 kontradiksi K1–K10 | Menjelaskan aplikasi kepada pemilik dan panitia |
| `INVENTARIS-JALUR-LAMA.md` | 14 entri jalur lama: penulis, pembaca, UI, duplikasi data, rekomendasi mematikan | Menentukan kode lama mana yang aman ditutup |
| `MATRIKS-RPC-AKSES.md` | 17 RPC, pemanggil, peran, `SECURITY DEFINER`, RLS, dan kontrak yang tidak boleh diubah | Syarat sebelum mengubah alur atau hak akses |
| `MATRIKS-KEPUTUSAN-PRODUK.md` | 12 pertanyaan terbuka dengan bukti, pilihan, rekomendasi, dan kolom kosong untuk pemilik | Mengumpulkan keputusan yang mengalahkan dokumen lama |
| `HASIL-UJI-BROWSER-DEV.md` | 10 skenario yang benar-benar dijalankan di browser lokal | Membedakan bukti runtime dari dugaan kode |
| `VERIFIKASI-PRODUKSI-YANG-BELUM-DILAKUKAN.md` | 14 item yang belum diverifikasi di server produksi | Daftar periksa sebelum deploy atau rilis berikutnya |

## Temuan yang paling berpengaruh

1. **Dua rumus skor hidup bersamaan.** Skor 4 tampil sebagai 75/100 di Observasi dan 80/100 di Evaluasi. Terbukti di browser. Lihat K2.
2. **Tiga tombol finalisasi/publikasi aktif di satu halaman** dengan syarat yang berbeda. Lihat K1.
3. **Jalur nilai lama masih bisa ditulis** lewat `saveObservation`, sementara dashboard lama masih membacanya. Lihat inventaris jalur lama.
4. **Dokumen status produksi saling bertentangan**, jadi klaim "sudah deploy" atau "belum deploy" tidak bisa dipakai sebelum dicek ke server.

## Urutan kerja yang disarankan

1. Isi `MATRIKS-KEPUTUSAN-PRODUK.md` bersama pemilik, terutama metode akses Peserta, rumus agregat, dan aturan "nilai resmi".
2. Verifikasi produksi sesuai daftar periksa, dengan izin eksplisit.
3. Uji browser yang belum dilakukan: konflik dua penilai, N/O sampai Evaluasi, alur finalize/publish/ekspor di DEV, RLS lintas peran.
4. Baru setelah itu Tutup jalur lama satu per satu memakai urutan di `INVENTARIS-JALUR-LAMA.md`.

`npm run check` exit 0 dengan 0 error dan 5 peringatan lama. `npm run build` berhasil. Keduanya dijalankan sebelum branch ini di-commit.
