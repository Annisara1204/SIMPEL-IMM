# Hasil Fase 5 — Deploy ke Produksi

Tanggal: 24 November 2026, sekitar 18:07–18:15 UTC. Izin deploy diberikan pemilik pada sesi ini. Semua perubahan bisa dikembalikan memakai backup yang dibuat sebelum deploy.

## Keadaan sebelum deploy

- Kode aktif: `0448100`, 39 migrasi lama, 53 tabel publik.
- `DISABLE_SIGNUP=true` dan `PGRST_DB_MAX_ROWS=100000` sudah benar.
- Grant `anon` masih ada di `assessment_moderation_revisions` dan `collective_evaluation_revisions`.
- Fungsi rekap masih bersignature `(uuid)`, tabel `participant_access` dan `retention_identity_archives` belum ada.
- pm2 `imm` online, nginx active, disk 37% terpakai.

## Backup sebelum perubahan

Dibuat dengan timestamp `20261124-180719`:

- Database: `/home/ubuntu/imm-db-backups/pre-deploy-20261124-180719.sql`, 2.244.807 byte, `pg_dump` penuh.
- Aplikasi: `/home/ubuntu/imm-app.bak-predeploy-20261124-180719`.
- Konfigurasi: `/home/ubuntu/.env.production.bak-predeploy-20261124-180719`, mode 600, hash `b53e5763...adeaa8a` sama dengan `.env.production` aktif.

Backup lama pemilik juga tetap ada: 11 direktori backup harian `imm-prod-2026-11-14` sampai `imm-prod-2026-11-24`, `pre-migration-20261124-045542.sql`, dan enam direktori backup aplikasi.

## Perubahan yang dilakukan

1. `revoke all` untuk `anon` pada dua tabel revisi. Verifikasi: 0 baris grant tersisa.
2. Koreksi data komisariat sebelum migrasi:
   - Peserta `R1`: teks komisariat disamakan dengan nama resmi `PK IMM UPI` sesuai `commissariat_id`-nya.
   - Dua peserta lainnya: `commissariat_id` diarahkan ke `PK IMM FEB UM Bandung` sesuai teks komisariat yang sudah benar.
   - Verifikasi akhir: 48 peserta, 0 ketidakcocokan nama dan ID.
3. Pasang 11 migrasi baru `20261124100000` sampai `20261124140000`. Dua gangguan SSH sementara terjadi; sambung ulang dan migrasi dilanjutkan dari posisi terakhir. Tidak ada migrasi yang terlewat.
4. Kirim kode aplikasi dengan rsync tanpa `--delete` dan tanpa `--delete-excluded`. `.env.production` tidak ikut tertimpa; hash tetap sama.
5. `npm ci --include=dev` dan `npm run build` di server, keduanya berhasil.
6. `pm2 restart imm --update-env`, PID baru `2992104`, restart ke-15, status online.

## Verifikasi setelah deploy

- Fungsi di database: `get_event_assessment_summary(uuid,uuid)` satu-satunya signature rekap; `get_commissariat_event_summary`, `get_public_event_aggregate`, `can_review_observation` ada; `finalize_collective_evaluation` tetap 8 argumen.
- Tabel baru `participant_access` dan `retention_identity_archives` ada; dua tabel status lama sudah tidak ada.
- Grant `anon` pada dua tabel revisi: 0.
- Smoke HTTP 8080: `/`, `/login`, `/dashboard`, `/dashboard/observasi`, `/dashboard/evaluasi`, `/dashboard/laporan`, `/dashboard/kegiatan`, `/dashboard/kerangka` semuanya 200.
- Enam 502 pada 18:14:40 berasal dari smoke yang dijalankan tepat saat Next.js belum selesai start. Request setelahnya 200, tidak ada 5xx lain.
- Login browser dengan akun QA Kader produksi berhasil. Dashboard dan Laporan merender tanpa banner "Data belum dapat dibaca". Halaman Observasi mengalihkan Kader ke dashboard sesuai aturan.

## Yang belum dilakukan

- Rotasi PAT dan service-role key. Kunci lama pernah tercatat di riwayat sesi; ini tetap risiko dan perlu jendela pemeliharaan terpisah. Tidak dilakukan saat deploy agar tidak memutus aplikasi.
- `NEXT_PUBLIC_PUBLIC_AGGREGATE_EVENT_ID` belum diisi di `.env.production`. Halaman publik menampilkan "data belum tersedia" sampai variabel ini diisi dan aplikasi di-build ulang.
- Uji RLS lintas peran penuh, uji dua akun untuk konflik dan Realtime, serta perbandingan byte PDF belum dijalankan ulang di produksi.
- `scripts/retention-apply.sql` belum dijalankan.
- Tidak ada akun Peserta, sesuai keputusan IP tanpa TLS.

## Rollback

Bila diperlukan:

1. Hentikan lalu kembalikan direktori aplikasi dari `/home/ubuntu/imm-app.bak-predeploy-20261124-180719`.
2. Pulihkan database dari `/home/ubuntu/imm-db-backups/pre-deploy-20261124-180719.sql` dengan `psql -v ON_ERROR_STOP=1`.
3. Pulihkan `.env.production` dari `/home/ubuntu/.env.production.bak-predeploy-20261124-180719`, pertahankan mode 600.
4. `npm ci --include=dev && npm run build`, lalu `pm2 restart imm --update-env`.
5. Verifikasi smoke HTTP 8080 dan login QA.

Jangan memakai `--delete` saat mengembalikan direktori aplikasi.
