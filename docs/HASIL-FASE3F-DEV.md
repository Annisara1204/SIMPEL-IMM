# Hasil Fase 3f — Verifikasi Impor Hasil Tes

Tanggal: 24 November 2026.
Branch: `research/peta-alur-penilaian`.

Ruang lingkup: **verifikasi dengan pembacaan kode** terhadap enam aturan Fase 3f/3g di `docs/RENCANA-IMPLEMENTASI-KEPUTUSAN.md:184` dan `docs/PERSETUJUAN-OWNER-16-PERTANYAAN.md`. Tidak ada uji browser, tidak ada uji runtime aplikasi, tidak ada migrasi, dan tidak ada penulisan ke basis data. Satu percobaan lokal murni dijalankan hanya untuk membuktikan perilaku pustaka `xlsx` (lihat bagian Temuan).

Hasil ringkas: **satu penyimpangan nyata ditemukan dan diperbaiki** (batas 500 baris bisalolos karena pemotongan saat baca). Lima aturan lain sudah sesuai.

## Tabel verifikasi

| Aturan | Bukti `path:line` | Status | Tindakan |
|---|---|---|---|
| Format tetap `.xlsx` | `app/dashboard/impor-tes/actions.ts:46-47` (cek ekstensi saat unggah); `actions.ts:232-233` (cek nama berkas saat simpan); `app/dashboard/impor-tes/import-wizard.tsx:340-346` (`accept` hanya `.xlsx`) | Sesuai | Tidak ada. Catatan: pemeriksaan hanya pada ekstensi nama berkas, bukan isi; lihat Catatan. |
| Batas 5 MB | `actions.ts:9` (`5 * 1024 * 1024`); `actions.ts:44-45` (tolak bila `file.size` melebihi) | Sesuai | Tidak ada. 5 MB di sini = 5 MiB (5.242.880 byte). |
| Batas 50 kolom | `actions.ts:11` (`maxColumns = 50`); `actions.ts:71` (cek `!ref`); `actions.ts:82-84` (cek tiap baris `matrix`) | Sesuai | Tidak ada. |
| Batas 500 baris | `actions.ts:10` (`maxRows = 500`); `actions.ts:71` (cek `!ref`); `actions.ts:82-84` (cek `matrix.length`); `actions.ts:131-132` dan `:237-238` (validasi jumlah baris ke RPC); `supabase/migrations/20261029090000_admin_only_test_imports.sql:29` (RPC menolak > 500 baris); `import-wizard.tsx:168-170` (batas sisi klien) | **Tidak sesuai semula** | **Diperbaiki.** `XLSX.read` memakai `sheetRows: maxRows + 1`, yang memotong lembar menjadi 501 baris sebelum pemeriksaan `!ref`/`matrix` berjalan. Berkas 600 baris diterima dan 99 baris terakhir hilang tanpa pesan. Opsi `sheetRows` dihapus di `actions.ts:49-56`. |
| Pencocokan nama + komisariat | `actions.ts:110-117` (normalisasi NFD, aksen dihapus, trim, spasi dirapatkan, lowercase `id-ID`); `actions.ts:197-201` (kandidat harus memenuhi **nama DAN komisariat** sama); `import-wizard.tsx:27-42` (pilih kolom otomatis); `import-wizard.tsx:467-477` (pilih peserta manual bila tidak ada kecocokan); `app/dashboard/impor-tes/page.tsx:123` (teks UI) | Sesuai | Tidak ada. |
| Impor hanya Admin Sistem / Super Admin | `actions.ts:19-34` (Server Action membuang peran selain `admin_system`); dipanggil di `actions.ts:37`, `:124`, `:226`; `page.tsx:25-30` (halaman redirect non-admin); `supabase/migrations/20261029090000_admin_only_test_imports.sql:7-10` (RLS hanya `is_admin_system()`); `:26` (RPC menolak non-admin); `:65-66` (grant hanya `authenticated`, otoritas di cek internal) | Sesuai | Tidak ada. `admin_system` adalah label "Admin Sistem" (`lib/navigation.ts:6`); tidak ada peran `super_admin` terpisah (`lib/roles.ts:2-9`). |
| Duplikat jadi riwayat `is_current`, Admin memilih nilai aktif | `actions.ts:164-169` (baca nilai `is_current = true` sebelumnya); `actions.ts:203-209` (kirim nilai lama ke UI); `import-wizard.tsx:71-90, 91-99` (wajib pilih sebelum simpan); `import-wizard.tsx:501-566` (radio "pertahankan nilai saat ini" / "gunakan nilai baris X", teks "semua baris impor tetap disimpan sebagai riwayat"); `import-wizard.tsx:262-270` (`isCurrent` dikirim); `actions.ts:223, 256, 265-272` (validasi dan kirim `is_current` ke RPC); SQL `:30-33` (maksimal satu aktif per peserta), `:45-46` (wajib ada aktif), `:54-59` (aktif lama di-set `false`, semua baris tetap di-`insert`), `:27` dari `20261029080000_test_result_imports.sql` (index unik satu `is_current` per peserta+jenis) | Sesuai | Tidak ada. |
| Rapor tetap PDF browser + web | Tidak ada perubahan Fase 3f di jalur rapor. `lib/phase7-files.ts:275, 286-287` (PDF dirakit di browser sebagai `Blob` `%PDF-1.4`), `:361-366` dan `:370-386` (unduh lewat `URL.createObjectURL`); `components/phase7-report-workspace.tsx:686` (rapor web ringkas), `:305-309, 336-341, 623` (ekspor PDF individual/bulk/event) | Sesuai | Tidak ada. |

## Temuan dan perbaikan

**Penyimpangan:** pembacaan berkas memotong lembar lebih dulu, sehingga aturan 500 baris tidak pernah benar-benar menolak berkas kelebihan baris.

Sebelum perbaikan, `actions.ts` memanggil `XLSX.read(..., { sheetRows: maxRows + 1 })`. Pustaka `xlsx` menyesuaikan `!ref` mengikuti pemotongan itu, jadi pemeriksaan `range.e.r + 1 > maxRows + 1` dan `matrix.length > maxRows + 1` selalu melihat paling banyak 501 baris. Akibatnya berkas dengan 600 baris diterima, tetapi hanya 500 baris data pertama yang masuk wizard; sisanya hilang tanpa pemberitahuan.

Bukti lokal (perhitungan `xlsx` di luar aplikasi, bukan uji browser): berkas 600×3 dibaca dengan opsi lama menghasilkan `!ref = A1:C501` dan `matrix.length = 501`, dua-duanya lolos. Setelah opsi `sheetRows` dihapus, `!ref = A1:C600` dan `matrix.length = 600`, sehingga pemeriksaan yang sudah ada menolak berkas itu. Kasus pembanding: 501 baris (1 judul + 500 data) masih diterima; 500 baris × 50 kolom masih diterima; 51 kolom ditolak.

Perubahan kode: `app/dashboard/impor-tes/actions.ts:49-56`, menghapus opsi `sheetRows` dan menambah tiga baris komentar penjelas. Batas 5 MB tetap menjadi pembatas memori saat berkas besar dibaca penuh. Tidak ada berkas lain yang diubah.

## Catatan (bukan penyimpangan)

- Pemeriksaan format hanya membaca akhiran nama berkas. Berkas bukan-Excel yang diganti namanya menjadi `.xlsx` tetap akan dikirim ke `XLSX.read`. Ini tidak mengubah keputusan "format tetap `.xlsx`", tetapi bukan pemeriksaan isi berkas.
- Ada batas tambahan 10 lembar kerja (`actions.ts:62-65`) yang tidak disebut keputusan. Batas ini lebih ketat, tidak bertentangan.
- Pencocokan nama/komisariat bersifat tepat setelah dinormalisasi, bukan fuzzy. Baris yang tidak cocok otomatis masih bisa dipilih manual di wizard.
- Batas 5 MB memakai MiB, bukan 5.000.000 byte.

## Verifikasi setelah perubahan

- `npm run typecheck`: **lolos**, tanpa keluaran kesalahan.
- `npm run lint`: **lolos**, 0 error, 5 warning. Kelima warning sudah ada sebelumnya dan berada di luar berkas yang disentuh: `app/dashboard/analitik/page.tsx:3`, `app/dashboard/laporan/page.tsx:1,82`, `app/dashboard/profil-instruktur/page.tsx:1`, `app/dashboard/profil-peserta/page.tsx:1`.

Tidak dijalankan: uji browser, uji runtime aplikasi, migrasi, penulisan data, commit. Berkas di `supabase/`, `lib/`, `tests/`, dan dokumen lain tidak diubah.
