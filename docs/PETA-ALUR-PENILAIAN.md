# Peta Alur Penilaian — Indeks

Hasil eksplorasi branch `research/peta-alur-penilaian` (24 November 2026). Semua berkas di bawah dibuat dari pembacaan kode dan uji browser lokal. Tidak ada perubahan kode aplikasi, tidak ada penulisan ke database produksi.

## Daftar dokumen

| Dokumen | Isi | Dipakai untuk |
|---|---|---|
| `ALUR-PENILAIAN-KANONIK.md` | Rantai 12 langkah dari penugasan sampai rapor, aturan angka, dan 10 kontradiksi K1–K10 | Menjelaskan aplikasi kepada pemilik dan panitia |
| `INVENTARIS-JALUR-LAMA.md` | 14 entri jalur lama: penulis, pembaca, UI, duplikasi data, rekomendasi mematikan | Menentukan kode lama mana yang aman ditutup |
| `MATRIKS-RPC-AKSES.md` | 17 RPC, pemanggil, peran, `SECURITY DEFINER`, RLS, dan kontrak yang tidak boleh diubah | Syarat sebelum mengubah alur atau hak akses |
| `MATRIKS-KEPUTUSAN-PRODUK.md` | 12 keputusan terisi, termasuk publish keras dan tambahan 24 November | Mengalahkan dokumen lama untuk item yang sama |
| `HASIL-UJI-BROWSER-DEV.md` | 10 skenario yang benar-benar dijalankan di browser lokal | Membedakan bukti runtime dari dugaan kode |
| `VERIFIKASI-PRODUKSI-YANG-BELUM-DILAKUKAN.md` | 14 item yang belum diverifikasi di server produksi | Daftar periksa sebelum deploy atau rilis berikutnya |
| `RENCANA-IMPLEMENTASI-KEPUTUSAN.md` | Rencana siklus 5 hasil enam putaran perencanaan, review, dan revisi | Pedoman eksekusi 12 keputusan dengan gate per fase |
| `REVIEW-SIKLUS-1.md` sampai `REVIEW-SIKLUS-4.md` | Arsip temuan dan skor reviewer tiap siklus | Menjelaskan mengapa rencana berubah |
| `REVIEW-PENUTUP.md` | Ringkasan penutupan loop dan sisa butir terbuka | Menutup siklus perencanaan |
| `PERSETUJUAN-OWNER-16-PERTANYAAN.md` | 16 jawaban owner beserta dampaknya pada butir terbuka | Acuan izin dan keputusan tambahan sebelum eksekusi |
| `HASIL-FASE2-DEV.md` | Perubahan dan verifikasi Fase 2 di DEV | Bukti pelaksanaan Fase 2 sebelum lanjut Fase 3 |
| `HASIL-FASE3-DEV.md` | Perubahan dan verifikasi Fase 3a–3c di DEV | Bukti pelaksanaan Fase 3a–3c |

## Temuan yang paling berpengaruh

1. **Dua rumus skor hidup bersamaan.** Skor 4 tampil sebagai 75/100 di Observasi dan 80/100 di Evaluasi. Terbukti di browser. Lihat K2.
2. **Tiga tombol finalisasi/publikasi aktif di satu halaman** dengan syarat yang berbeda. Lihat K1.
3. **Jalur nilai lama masih bisa ditulis** lewat `saveObservation`, sementara dashboard lama masih membacanya. Lihat inventaris jalur lama.
4. **Dokumen status produksi saling bertentangan**, jadi klaim "sudah deploy" atau "belum deploy" tidak bisa dipakai sebelum dicek ke server.

## Urutan kerja yang disarankan

1. `MATRIKS-KEPUTUSAN-PRODUK.md` sudah terisi semua 12 item pada 24 November 2026. Item 2 sampai 6 dijawab langsung; sisanya mengikuti rekomendasi. Tanda tangan pemilik masih kosong.
2. Verifikasi produksi sesuai daftar periksa, dengan izin eksplisit.
3. Uji browser yang belum dilakukan: konflik dua penilai, N/O sampai Evaluasi, alur finalize/publish/ekspor di DEV, RLS lintas peran.
4. Baru setelah itu Tutup jalur lama satu per satu memakai urutan di `INVENTARIS-JALUR-LAMA.md`.

`npm run check` exit 0 dengan 0 error dan 5 peringatan lama. `npm run build` berhasil. Keduanya dijalankan sebelum branch ini di-commit.
