# Verifikasi Produksi yang Belum Dilakukan

Dokumen ini adalah daftar periksa, bukan laporan hasil. Saya **tidak mengakses server produksi** selama sesi ini. Tidak ada deploy, migrasi, perubahan konfigurasi, rotasi kunci, atau penulisan data ke produksi. Semua pekerjaan ada di branch `research/peta-alur-penilaian` dan memakai data simulasi lokal.

## Kenapa tidak saya jalankan

- `AGENTS.md:19-21` melarang memulai tahap berikutnya tanpa persetujuan dan melarang menganggap keputusan terbuka sebagai final.
- `AGENTS.md:32-34` melarang perubahan besar di luar lingkup, pelaporan yang mengklaim teruji padahal tidak, dan publikasi sebelum tinjauan keamanan, privasi, biaya, dan backup.
- `docs/RENCANA-IMPLEMENTASI-KOREKSI-ALUR.md:7-10` menetapkan kerja di DEV dengan data simulasi dan tidak menulis ke PROD saat pengembangan.
- Kunci produksi dan akses SSH tidak saya pakai. Kunci yang pernah tercatat di riwayat sesi sebelumnya sebaiknya diputar, bukan dipakai lagi.

## Konflik dokumen yang harus diselesaikan lebih dulu

1. `HANDOVER.md:479` menyatakan deploy 24 November selesai dan migrasi `20261123130000` terpasang di PROD. `HANDOVER.md:470-471` masih menyatakan migrasi belum dipasang dan deploy belum ada. Keduanya tidak bisa benar bersamaan.
2. `docs/DEPLOYMENT.md:23-29` masih menyebut project cloud `crrqlwlfndhugcqcnkex`, database kosong, belum ada admin, dan regression belum dijalankan. `HANDOVER.md:365-384,449-479` menyatakan sebaliknya: self-hosted, ada admin dan QA, migrasi terpasang.
3. `docs/LANGKAH-PASANG-MIGRASI-DAN-UJI.md:9` masih menyebut migrasi belum ada di DEV maupun PROD.
4. `PGRST_DB_MAX_ROWS` diubah langsung di server ke 100000 (`HANDOVER.md:449-453`). Perubahan ini tidak tercatat di repo dan bisa hilang saat container dibuat ulang.
5. `.env.production` di repo berpotensi masih menunjuk project cloud lama, sementara aplikasi produksi sudah memakai instance self-hosted (`HANDOVER.md:371-374`).

## Daftar periksa

| # | Yang harus diverifikasi | Cara aman | Status |
|---|---|---|---|
| 1 | Commit yang aktif di server benar-benar `0448100` | Baca `git rev-parse HEAD` di `/home/ubuntu/imm-app` | Belum |
| 2 | 40 migrasi terpasang, termasuk `20261123130000` | Query tabel `schema_migrations` atau cek kolom `is_active` | Belum |
| 3 | Penguji SQL `dad_single_recommendation.sql` lolos di PROD | Jalankan penguji read-only bila diizinkan | Belum |
| 4 | `PGRST_DB_MAX_ROWS=100000` benar-benar ada di `/home/ubuntu/supabase/.env` dan di container `supabase-rest` | Baca env, jangan ubah | Belum |
| 5 | Aplikasi memakai URL self-hosted, bukan cloud yang sudah di-pause | Baca `.env.production` tanpa mencetak kunci | Belum |
| 6 | `disable_signup=true` | Baca konfigurasi Auth | Belum, `HANDOVER.md:327` |
| 7 | Grant `anon` pada dua tabel riwayat moderasi sudah dicabut | `information_schema.role_table_grants` | Belum, `HANDOVER.md:327,337` |
| 8 | PAT dan service-role key sudah diputar | Konfirmasi dari pemilik, jangan cetak kunci | Belum, `HANDOVER.md:321,417` |
| 9 | Domain dan TLS sudah ada | Cek alamat akses dan sertifikat | Belum, saat ini HTTP polos di `:8080`, `docs/DEPLOYMENT.md:19` |
| 10 | Backup harian menyertakan `auth.*` atau prosedur re-create akun terdokumentasi | Baca `/etc/cron.d/imm-db-backup` dan isi backup | Belum, `HANDOVER.md:334-335` |
| 11 | Monitoring/alert 5xx aktif | Cek konfigurasi monitoring | Belum, `HANDOVER.md:337,363` |
| 12 | Uji registry dua akun pasca hotfix prefetch dan P1/P2 | Uji browser dengan akun QA simulasi | Belum |
| 13 | Rasio 5xx dan 502 di nginx setelah deploy terakhir | Baca log, jangan ubah | Belum |
| 14 | Disk dan workload bersama masih sehat | `df -h`, status container `wms_prod_*` | Belum, `docs/DEPLOYMENT.md:7-16` |

## Yang tidak boleh dilakukan tanpa perintah eksplisit

- Menjalankan migrasi atau regression yang menulis ke PROD.
- Mengubah `PGRST_DB_MAX_ROWS`, `.env.production`, nginx, atau container Supabase.
- Memutar kunci di lingkungan bersama.
- Menghapus backup atau direktori rollback.
- Memakai data peserta nyata sebelum tinjauan keamanan, privasi, biaya, dan backup selesai.

Setelah daftar ini diisi, hasilnya sebaiknya menggantikan klaim status di `HANDOVER.md:470-479` dan `docs/DEPLOYMENT.md`, supaya tidak ada lagi dua versi kondisi produksi.
