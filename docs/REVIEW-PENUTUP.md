# Review Penutup Loop Plan → Review → Revision

Dokumen ini menutup enam siklus perencanaan. Tidak ada kode, migrasi, data, atau produksi yang diubah selama loop. Semua hasil berupa dokumen di `docs/`.

## Ringkasan skor per siklus

| Siklus | Kelayakan | Teknis | Keamanan | Aksi setelah review |
|---|---|---|---|---|
| 1 | 4/10 | 5/10 | 5/10 | Revisi A/B/C → `revisi-siklus1-*.md` |
| 2 | 6/10 | 6/10 | 5/10 | Revisi A/B/C → `revisi-siklus2-*.md` |
| 3 | 7/10 | 6/10 | blocker + 6 major | Revisi A/B/C → `revisi-siklus3-*.md` |
| 4 | 9/10 | 7/10 | 4/10 | Revisi A/B → `revisi-siklus4-*.md` |
| 5 | tidak dinilai terpisah | 7/10 | 7/10 dengan 1 blocker baru | Revisi final → `revisi-siklus5-final.md` |
| 6 | tidak dinilai ulang | tidak dinilai ulang | tidak dinilai ulang | Perbaikan terarah diterapkan langsung ke rencana utama |

Sesuai kesepakatan di awal, loop dihentikan setelah siklus kelima dan satu putaran perbaikan terarah. Rencana akhir ada di `docs/RENCANA-IMPLEMENTASI-KEPUTUSAN.md` siklus 5 dengan perbaikan final dari `docs/revisi-siklus5-final.md`.

## Apa yang berubah dari awal sampai akhir

- Urutan backup dibetulkan: backup sebelum migrasi, bukan sesudahnya.
- Fase 0b ditambahkan sebagai jalur remediasi produksi berizin; deadlock Fase 0 hilang.
- Publish rapor diputus keras oleh pemilik; tidak ada snapshot provisional yang disimpan.
- Guard aplikasi (coverage, moderasi, Kirim) jadi peringatan, bukan penolakan simpan.
- IoT tidak bisa membaca evaluasi lewat REST/RPC, tetapi tetap bisa mengisi Observasi; policy `FOR ALL` dipecah jadi INSERT/UPDATE.
- Observer tetap bisa membaca barisnya sendiri lewat cabang pemilik pada policy SELECT.
- Kader hanya menerima rekap; `snapshot_data`, ekspor, dan revisi evaluasi tidak terbaca.
- Akun Peserta: hash sandi saat penautan dipakai sebagai bukti ganti sandi; `P0003` sebelum tanda tangan; unique per akun.
- Retensi tidak menghapus baris yang tertahan FK dan tidak merusak snapshot immutable.
- Predicate publish lengkap dengan deklarasi variabel, penolakan `aspects` absen, dan filter rubric moderasi.
- Agregasi "Lainnya" memakai dua tahap agar 9:1 tidak tampil dan 18:2 menampilkan 18.
- Konvensi bukti, perintah PowerShell, dan tiga tanda tangan pemilik tersedia di rencana utama.

## Yang tetap terbuka

Dua belas butir ada di daftar terbuka rencana akhir. Yang paling berdampak sebelum eksekusi: `[TERBUKA-2]` definisi kelompok, `[TERBUKA-6]` tanda tangan matriks, `[TERBUKA-12]` kewenangan trigger `finalized` untuk koordinator, dan `[TERBUKA-13]` ketersediaan `encrypted_password` di project target.

## Batas bukti

Reviewer hanya membaca dokumen, kode, dan migrasi. Tidak ada browser, build, migrasi, atau uji RLS yang dijalankan ulang setelah perubahan dokumen. `npm run check` dan `npm run build` terakhir dijalankan sebelum loop dokumen ini; hasilnya 0 error dengan 5 peringatan lama dan build berhasil. Bukti gate produksi masih harus dikumpulkan sesuai daftar verifikasi.
