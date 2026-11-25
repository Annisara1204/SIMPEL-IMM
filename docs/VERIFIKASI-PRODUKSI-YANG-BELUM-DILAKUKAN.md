# Verifikasi Produksi yang Belum Dilakukan

Dokumen ini adalah daftar periksa, bukan laporan hasil. **Riwayat (24 November 2026):** pada saat penulisan saya tidak mengakses server produksi; semua pekerjaan ada di branch `research/peta-alur-penilaian` dengan data simulasi lokal. Banyak butir di bawah sudah terselesaikan pada 25 November 2026, jangan dibaca sebagai status terkini.

Otoritas keadaan produksi adalah `docs/STATUS-PRODUKSI-SATU-VERSI.md`. Klaim kode aktif `0448100` dan deploy yang belum terjadi di dokumen ini adalah riwayat. Status terkini: kode aktif `a43bd27`, seluruh migrasi branch terpasang, dan sebagian butir verifikasi sudah dijalankan langsung di server.

## Kenapa tidak saya jalankan

- `AGENTS.md:19-21` melarang memulai tahap berikutnya tanpa persetujuan dan melarang menganggap keputusan terbuka sebagai final.
- `AGENTS.md:32-34` melarang perubahan besar di luar lingkup, pelaporan yang mengklaim teruji padahal tidak, dan publikasi sebelum tinjauan keamanan, privasi, biaya, dan backup.
- `docs/RENCANA-IMPLEMENTASI-KOREKSI-ALUR.md:7-10` menetapkan kerja di DEV dengan data simulasi dan tidak menulis ke PROD saat pengembangan.
- Kunci produksi dan akses SSH tidak saya pakai. Kunci yang pernah tercatat di riwayat sesi sebelumnya sebaiknya diputar, bukan dipakai lagi.
- Izin remediasi sudah diberikan pemilik (`docs/STATUS-PRODUKSI-SATU-VERSI.md` bagian 1 dan 3), tetapi belum dijalankan di produksi. Izin itu tidak mengubah status "Belum" di tabel di bawah.
- Akses HTTP polos tanpa domain dan TLS di `http://43.173.33.195:8080/` adalah **keputusan final pemilik untuk sementara** (`docs/STATUS-PRODUKSI-SATU-VERSI.md` bagian 1 dan 3), bukan pekerjaan yang tertunda. Butir 9 tetap "Belum" karena tidak ada pemeriksaan sertifikat atau konfigurasi di server.

## Konflik dokumen dan status penyelesaiannya

`docs/STATUS-PRODUKSI-SATU-VERSI.md` sekarang menjadi otoritas tunggal. Klaim status di dokumen lain harus merujuk ke sana.

1. **Terselesaikan di dokumen.** `HANDOVER.md:479` menyatakan deploy 24 November selesai dan migrasi `20261123130000` terpasang di PROD, sementara `HANDOVER.md:470-471` menyatakan sebaliknya. Otoritas mencatat: deploy 24 November pagi memang terjadi untuk kode lama `0448100`, tetapi migrasi baru branch ini belum dipasang di PROD.
2. **Terselesaikan di dokumen.** `docs/DEPLOYMENT.md` tidak lagi menyebut database kosong, belum ada admin, atau project cloud sebagai target. Sekarang memakai self-hosted, akun admin, backup 03:15, dan kode `0448100`. Klaim lama ditandai sebagai riwayat.
3. **Terselesaikan di dokumen.** `docs/LANGKAH-PASANG-MIGRASI-DAN-UJI.md` sekarang membedakan DEV (migrasi sampai `20261124140000`) dan PROD (39 migrasi lama).
4. **Masih perlu verifikasi server.** `PGRST_DB_MAX_ROWS` diubah langsung di server ke 100000 (`HANDOVER.md:449-453`). Perubahan ini tidak tercatat di repo dan bisa hilang saat container dibuat ulang. Lihat butir 4.
5. **Masih perlu verifikasi server.** `.env.production` di repo berpotensi masih menunjuk project cloud lama, sementara aplikasi produksi memakai instance self-hosted (`HANDOVER.md:371-374`). Lihat butir 5.

## Daftar periksa

| # | Yang harus diverifikasi | Cara aman | Status |
|---|---|---|---|
| 1 | Commit yang aktif di server benar-benar `0448100` | Baca `git rev-parse HEAD` di `/home/ubuntu/imm-app` | Belum |
| 2 | 39 migrasi lama terpasang, dan migrasi branch ini belum ada (lihat status dokumen bagian 1–2) | Query tabel `schema_migrations` atau cek kolom `is_active` | Belum |
| 3 | Penguji SQL `dad_single_recommendation.sql` lolos di PROD | Jalankan penguji read-only bila diizinkan | Belum |
| 4 | `PGRST_DB_MAX_ROWS=100000` benar-benar ada di `/home/ubuntu/supabase/.env` dan di container `supabase-rest` | Baca env, jangan ubah | Belum |
| 5 | Aplikasi memakai URL self-hosted, bukan cloud yang sudah di-pause | Baca `.env.production` tanpa mencetak kunci | Belum |
| 6 | `disable_signup=true` | Baca konfigurasi Auth | Belum, `HANDOVER.md:327` |
| 7 | Grant `anon` pada dua tabel riwayat moderasi sudah dicabut | `information_schema.role_table_grants` | Belum, `HANDOVER.md:327,337` |
| 8 | PAT dan service-role key sudah diputar | Konfirmasi dari pemilik, jangan cetak kunci | Belum, `HANDOVER.md:321,417` |
| 9 | Domain dan TLS sudah ada | Cek alamat akses dan sertifikat | Belum, HTTP polos di `:8080`; ini keputusan final pemilik untuk sementara, lihat `docs/STATUS-PRODUKSI-SATU-VERSI.md` bagian 1 dan 3 |
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

Setelah daftar ini diisi, tulis hasilnya ke `docs/STATUS-PRODUKSI-SATU-VERSI.md` terlebih dahulu, baru perbarui dokumen lain agar tidak ada dua versi kondisi produksi. Butir 9 tidak berubah menjadi "Sudah" hanya karena alamat IP tanpa TLS sudah diputuskan final; butir itu mengukur ada tidaknya domain dan sertifikat, bukan kebijakan akses.
