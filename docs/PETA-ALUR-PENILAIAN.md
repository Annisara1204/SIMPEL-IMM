# Peta Alur Penilaian — Indeks

Hasil eksplorasi branch `research/peta-alur-penilaian` (24 November 2026). Semua berkas di bawah dibuat dari pembacaan kode dan uji browser lokal. Tidak ada penulisan ke database produksi.

**Otoritas status:** `STATUS-PRODUKSI-SATU-VERSI.md`. Dokumen itu yang menentukan keadaan produksi dan DEV. Bila ada klaim status yang bertentangan di berkas lain, pakai dokumen itu. Perubahan Fase 2–4 dan uji finalize/ekspor sudah dilaksanakan di DEV dengan data simulasi; belum ada deploy produksi.

## Daftar dokumen

| Dokumen | Isi | Dipakai untuk |
|---|---|---|
| `STATUS-PRODUKSI-SATU-VERSI.md` | Otoritas tunggal status produksi dan DEV per 24 November 2026 | Menjawab "apa yang sudah berjalan di mana" sebelum memakai dokumen lain |
| `ALUR-PENILAIAN-KANONIK.md` | Rantai 12 langkah dari penugasan sampai rapor, aturan angka, dan status akhir K1–K10 | Menjelaskan aplikasi kepada pemilik dan panitia |
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
| `HASIL-FASE3EFG-DEV.md` | Perubahan dan verifikasi Fase 3e–3g di DEV | Bukti pelaksanaan Fase 3e–3g |
| `HASIL-FASE4-DEV.md` | Perubahan dan verifikasi Fase 4 di DEV | Bukti pelaksanaan Fase 4 |
| `HASIL-UJI-FINALIZE-EKSPOR-DEV.md` | Uji browser satu klik finalize/publish dan semua tombol ekspor | Bukti alur akhir masih bekerja |
| `HASIL-FASE6-DOKUMEN.md` | Hasil penyatuan status dokumen | Penutup Fase 6 |
| `HASIL-FASE5-DEPLOY.md` | Backup, migrasi, deploy, dan rollback produksi 24 November | Bukti deploy ke produksi |
| `HASIL-UJI-RLS-PROD.md` | Matriks akses lintas peran di produksi dan perbaikannya | Bukti RLS produksi |
| `HASIL-UJI-KONFLIK-REALTIME.md` | Uji dua penilai, resolusi konflik, dan Realtime | Bukti alur kolaborasi |
| `HASIL-FASE3F-DEV.md` | Verifikasi aturan impor `.xlsx` dan bug batas baris | Rincian Fase 3f |

## Temuan yang paling berpengaruh

1. **Satu rumus skor sejak Fase 2.** Skor 4 tampil 80.0/100 di Observasi dan di Evaluasi. Sebelumnya 75/100 di Observasi. Lihat K2.
2. **Gate "semua Observer submit" dihapus.** Tiga jalur finalisasi masih ada di halaman Evaluasi, tetapi tombol finalisasi Admin di Observasi dan syarat kirim lengkap tidak lagi ada. Kader tidak bisa terbit/ekspor. Lihat K1 dan K9.
3. **Jalur lama sebagian dibersihkan.** `saveObservation`, dua action mati, dan dua tabel status sudah dihapus di DEV; trigger ditulis ulang. Tabel `observations` dan dashboard lama masih dipertahankan. Lihat K7.
4. **Agregat publik memakai ambang 10** lewat `get_public_event_aggregate`, tanpa identitas peserta. IoT tetap mengisi Observasi tetapi tidak melihat rekap. Lihat K8 dan K10.
5. **Status dokumen lama saling bertentangan**, jadi klaim "sudah deploy" atau "belum deploy" harus diambil dari `STATUS-PRODUKSI-SATU-VERSI.md`.

## Urutan kerja yang disarankan

1. `MATRIKS-KEPUTUSAN-PRODUK.md` sudah terisi semua 12 item pada 24 November 2026. Item 2 sampai 6 dijawab langsung; sisanya mengikuti rekomendasi. Tanda tangan pemilik masih kosong.
2. Perubahan Fase 2–4 sudah diverifikasi di DEV, termasuk klik finalize/publish dan semua tombol ekspor (`HASIL-UJI-FINALIZE-EKSPOR-DEV.md`). Alur akun Peserta dan RPT-001..005 tetap ditunda karena pemilik memakai IP tanpa TLS.
3. Yang belum diulang setelah Fase 4: uji dua akun untuk konflik dan Realtime, serta RLS lintas peran penuh. Isi byte PDF juga belum dibandingkan dengan baseline. Lihat `QA_PHASE8_TEST_PLAN.md` dan `STATUS-PRODUKSI-SATU-VERSI.md`.
4. Jalur lama baru ditutup sebagian. Sisanya memakai urutan di `INVENTARIS-JALUR-LAMA.md`, dengan izin dan backup lebih dulu.
5. Deploy produksi Fase 5 menunggu izin tertulis dan Fase 0b. Belum ada deploy dari perubahan branch ini.

`npm run check` exit 0 dengan 0 error dan 5 peringatan lama, 22 tes lolos. `npm run build` berhasil. 8 dari 8 penguji SQL lolos di DEV. Semua angka status ada di `STATUS-PRODUKSI-SATU-VERSI.md`.
