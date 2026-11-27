# Progres eksekusi rencana — 28 November 2026

Dokumen ini mencatat bukti per paket kerja saat eksekusi. Status rencana: `RENCANA-IMPLEMENTASI.md`.

| Paket | Status | Bukti | Commit |
|---|---|---|---|
| 0 | Selesai | `security_baseline.sql` lolos; tiga penguji lama (participant scope, allowlist, revision privacy) lolos; `tests/relations.test.ts` memeriksa batas cast; `npm run check` dan `npm run build` exit 0 | |
| 1 | Selesai | Migrasi `20261128010000`, penguji `supabase/tests/revision_privacy.sql` lolos dengan Kader 0 baris dan Admin 1 baris; `npm run check` exit 0; `npm run build` exit 0 | |
| 2 | Selesai | `observer_assignment_scope.sql` lolos; unit `request-base-url.test.ts` lolos; QA browser: Kader tidak melihat 2 kotak penugasan, Admin melihat keduanya; curl host asing redirect ke host default; `npm run check` dan `npm run build` exit 0 | |
| 3 | Selesai | `tests/autosave-policy.test.ts` lolos; QA browser DEV Observer: Ubah skor → "Tersimpan · 06.32.27", tidak ada tombol "Coba lagi"; nilai dikembalikan ke "Belum dinilai"; `npm run check` dan `npm run build` exit 0 | |
| 4-15 | Belum | | |

## Catatan Paket 1

- Policy `collective_evaluation_revisions_read_authorized` hanya mengizinkan Admin Sistem dan moderator kegiatan.
- `revoke all ... from anon` untuk dua tabel revisi kini ada di migrasi, bukan hanya di server.
- Rollback hanya memulihkan definisi policy, tidak mengembalikan grant `anon`.
- Penguji SQL dijalankan di Supabase lokal port 54322 dengan transaksi di-rollback.

## Catatan Paket 0

- K11 ternyata tidak selesai di database lokal: enam fungsi internal masih memiliki `EXECUTE` eksplisit untuk `anon`. Migrasi `20261128020000_anon_function_grants_harden_v1.sql` mencabutnya; rollback disediakan.
- Penguji `security_baseline.sql` membuktikan tidak ada policy aktif yang memakai `can_manage_events()` dan hanya `get_public_event_aggregate` yang memberi `EXECUTE` ke `anon`.
- Penguji SQL lama `competency_material_mapping_phase4.sql`, `dad_reporting_phase7.sql`, `material_archive.sql`, dan `staff_event_summary.sql` gagal lebih dulu karena data DEV hasil salinan produksi sudah bergeser dari fixture penguji. Ini bukan regresi dari paket ini dan sengaja tidak diubah dalam lingkup Paket 0.

## Catatan Paket 2

- `assertEventAssignment` dan `requireModerator` dipindah ke `lib/authorization.ts`; pemanggil lama memakai helper yang sama.
- Kader tidak lagi bisa menugaskan/mencabut Observer lewat aksi maupun RLS. QA browser DEV: Kader melihat 0 kotak penugasan, Admin melihat 2 kotak dan form "Tugaskan Observer".
- Seleksi Komisariat dan Laporan kini memeriksa penugasan kegiatan di aplikasi, bukan hanya di RPC/RLS.
- `requestBaseUrl` memakai daftar putih host (`IMM_ALLOWED_HOSTS`) dan `safeNextPath` membandingkan origin. QA curl dengan `Host: evil.example` menghasilkan redirect ke `http://43.173.33.195:8080/login`.
- Untuk QA browser DEV, kata sandi dua akun uji lokal di-reset lewat Auth Admin API lokal. Tidak ada akun produksi yang diubah.

## Catatan Paket 3

- Autosave skor dan catatan berhenti setelah kegagalan bukan-konflik, dengan tombol "Coba lagi". Aturan ini ada di `lib/autosave-policy.ts` dan diuji unit.
- BUG-06: Realtime kini memanggil `setAuth` lagi saat `TOKEN_REFRESHED` atau `SIGNED_IN`. QA live lebih dari satu jam tidak dilakukan, jadi perbaikan ini belum terbukti secara runtime dan tetap dicatat sebagai hipotesis.
- BUG-07: event Realtime rekan menyimpan `revision`; penimpa dengan revisi lebih lama atau sama diabaikan bila data server punya revisi.
- QA browser DEV (Observer A, kegiatan `48880b89`, Pelatihan/Ke-IMM-an/Observasi): memilih skor 4 menghasilkan "Tersimpan · 06.32.27" dan tidak ada tombol "Coba lagi". Nilai uji dikembalikan ke "Belum dinilai".
