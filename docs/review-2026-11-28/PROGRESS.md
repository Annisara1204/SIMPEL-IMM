# Progres eksekusi rencana — 28 November 2026

Dokumen ini mencatat bukti per paket kerja during eksekusi. Status rencana: `RENCANA-IMPLEMENTASI.md`.

| Paket | Status | Bukti | Commit |
|---|---|---|---|
| 0 | Belum | Tutup temuan sudah selesai (A11, K10, K11) | |
| 1 | Selesai | Migrasi `20261128010000`, penguji `supabase/tests/revision_privacy.sql` lolos dengan Kader 0 baris dan Admin 1 baris; `npm run check` exit 0; `npm run build` exit 0 | |
| 2-15 | Belum | | |

## Catatan Paket 1

- Policy `collective_evaluation_revisions_read_authorized` hanya mengizinkan Admin Sistem dan moderator kegiatan.
- `revoke all ... from anon` untuk dua tabel revisi kini ada di migrasi, bukan hanya di server.
- Rollback hanya memulihkan definisi policy, tidak mengembalikan grant `anon`.
- Penguji SQL dijalankan di Supabase lokal port 54322 dengan transaksi di-rollback.
