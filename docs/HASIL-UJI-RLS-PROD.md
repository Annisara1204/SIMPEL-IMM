# Hasil Uji RLS Lintas Peran — Produksi

Tanggal: 24 November 2026. Pengujian memakai JWT simulasi akun QA produksi dalam transaksi `begin; ... rollback;`. Tidak ada data permanen yang diubah oleh pengujian. Dua penemuan nyata diperbaiki dengan migrasi `20261124150000_rls_harden_report_and_anon_v1.sql`; backup database `pre-rls-fix-20261124-182946.sql` dibuat sebelum perbaikan.

## Matriks akhir

| Peran | Hasil |
|---|---|
| Observer A/B | `can_review_observation=false`, tidak bisa memanggil rekap atau laporan, 0 baris snapshot, catatan privat, dan nilai Observer lain. Hanya bisa melihat peserta yang ditugaskan. Data Observer produksi masih kosong, jadi kasus positif "baris sendiri terbaca" tidak bisa dibuktikan di produksi; sudah dibuktikan di DEV. |
| Instruktur MoT | `can_review_observation=true`, `is_assessment_moderator=true`. Bisa membaca rekap 93 baris, laporan 36 baris, snapshot, sumber privat, dan catatan sesuai kewenangan. |
| Bidang Kader | Tidak bisa membaca tabel `assessment_snapshots`, sumber privat, catatan, atau nilai mentah. RPC laporan mengembalikan 36 baris rekap, tetapi `snapshot_data` semuanya `null`. Panel ekspor dan tombol Terbit tidak tampil. |
| anon | Hanya `get_public_event_aggregate` yang boleh dieksekusi. RPC publish, ekspor, dan rekap ekspor tidak lagi memberi EXECUTE ke `anon`. Tidak ada grant anon lain yang dipertahankan. |

## Temuan dan perbaikan

1. Sebelum perbaikan, Kader bisa membaca 5 baris langsung dari `public.assessment_snapshots`, termasuk `snapshot_data`. Policy `assessment_snapshots_read_authorized` ditulis ulang tanpa cabang `bidang_kader`.
2. `get_event_report_rows` dulu mengembalikan `snapshot_data` mentah untuk Kader. Fungsi ditimpa dengan `case when is_admin_system() or is_assessment_moderator(...) then snapshot_data else null::jsonb end`.
3. Banyak fungsi internal masih memiliki grant EXECUTE eksplisit untuk `anon` dari migrasi lama. Semua dicabut kecuali `get_public_event_aggregate`.

## Verifikasi browser produksi

- Login QA Kader berhasil; Laporan merender, rekap tampil, tanpa banner error, tanpa panel ekspor dan tombol Terbit.
- Login QA Instruktur MoT berhasil; Dashboard, Evaluasi, Laporan, dan Observasi merender tanpa banner error.

## Batas pengujian

- Akun IoT produksi tidak tersedia. Hak IoT sudah diuji di DEV: 0 baris data evaluasi, tetapi tetap bisa mengisi Observasi.
- Tidak ada nilai Observer produksi, jadi uji "Observer hanya melihat baris sendiri" tidak bisa dibuktikan di produksi.
- Uji konflik dua akun dan Realtime belum diulang setelah perbaikan RLS.
- Tidak ada penulisan permanen; seluruh matriks dijalankan dalam transaksi yang di-`rollback`.
