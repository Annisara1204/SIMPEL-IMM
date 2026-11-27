# Progres eksekusi rencana — 28 November 2026

Dokumen ini mencatat bukti per paket kerja saat eksekusi. Status rencana: `RENCANA-IMPLEMENTASI.md`.

| Paket | Status | Bukti | Commit |
|---|---|---|---|
| 0 | Selesai | `security_baseline.sql` lolos; tiga penguji lama (participant scope, allowlist, revision privacy) lolos; `tests/relations.test.ts` memeriksa batas cast; `npm run check` dan `npm run build` exit 0 | |
| 1 | Selesai | Migrasi `20261128010000`, penguji `supabase/tests/revision_privacy.sql` lolos dengan Kader 0 baris dan Admin 1 baris; `npm run check` exit 0; `npm run build` exit 0 | |
| 2-15 | Belum | | |

## Catatan Paket 1

- Policy `collective_evaluation_revisions_read_authorized` hanya mengizinkan Admin Sistem dan moderator kegiatan.
- `revoke all ... from anon` untuk dua tabel revisi kini ada di migrasi, bukan hanya di server.
- Rollback hanya memulihkan definisi policy, tidak mengembalikan grant `anon`.
- Penguji SQL dijalankan di Supabase lokal port 54322 dengan transaksi di-rollback.

## Catatan Paket 0

- K11 ternyata tidak selesai di database lokal: enam fungsi internal masih memiliki `EXECUTE` eksplisit untuk `anon`. Migrasi `20261128020000_anon_function_grants_harden_v1.sql` mencabutnya; rollback disediakan.
- Penguji `security_baseline.sql` membuktikan tidak ada policy aktif yang memakai `can_manage_events()` dan hanya `get_public_event_aggregate` yang memberi `EXECUTE` ke `anon`.
- Penguji SQL lama `competency_material_mapping_phase4.sql`, `dad_reporting_phase7.sql`, `material_archive.sql`, dan `staff_event_summary.sql` gagal lebih dulu karena data DEV hasil salinan produksi sudah bergeser dari fixture penguji. Ini bukan regresi dari paket ini dan sengaja tidak diubah dalam lingkup Paket 0.
