# Status Produksi — Satu Versi

Dokumen ini menjadi otoritas tunggal untuk keadaan aplikasi dan produksi per 24 November 2026. Dokumen lain harus merujuk ke sini, bukan menyimpan klaim status yang berbeda. Bila ada perbedaan dengan `HANDOVER.md`, `BLUEPRINT.md`, `docs/DEPLOYMENT.md`, atau dokumen lain, pakai dokumen ini.

## 1. Keadaan produksi saat ini

- Aplikasi: IMM Observer, alamat `http://43.173.33.195:8080/`.
- Server: Ubuntu 24.04 di `43.173.33.195`. Node v22, pm2 `imm`, nginx reverse proxy. Workload lain (`api-jkstok.my.id`, `wms_prod_*`) tetap berjalan dan tidak tersentuh.
- Database: Supabase self-hosted di server yang sama. API internal `127.0.0.1:8180`, port publik `8081` untuk browser. Cloud project lama `crrqlwlfndhugcqcnkex` sudah di-pause sebagai cadangan beku.
- Kode yang aktif di produksi: `main` commit `18e5139`, di-deploy 26 November 2026 pukul 20:11 WIB. Deploy ini menambah "Peta kompetensi otomatis" di Evaluasi Kolektif untuk semua peserta, termasuk nilai sementara. Deploy sebelumnya memakai `7ae5941` (26 November, nilai gabungan peserta), `cb44235` (26 November, tombol arsip versi), `5dbfde5` (26 November, arsip materi tanpa penghapusan data), `f6223c5` (26 November, perbaikan validasi Evaluasi), dan `a9ae78b` (25 November); semuanya kini menjadi riwayat. Kode `f6223c5` mencakup perbaikan validasi finalisasi Evaluasi agar kegagalan yang diharapkan tampil sebagai pesan di halaman, bukan "Halaman gagal dimuat". Kode `a9ae78b` mencakup hasil branch `research/peta-alur-penilaian`, perbaikan 24 November, pembersihan lima peringatan lint, RPC ringkas untuk dashboard staf, DTO ringkas panel Laporan dengan muat-saat-ekspor, fitur arsip kegiatan, perbaikan rekap peserta unik, dan penguncian aksi tulis pada kegiatan berarsip.
- Migrasi di produksi: seluruh 57 berkas di `supabase/migrations/` terpasang, termasuk `20261123130000`, `20261124100000` sampai `20261124160000`, `20261125100000` sampai `20261125120000`, dan `20261126190000` (arsip materi). Rincian deploy ada di `docs/HASIL-FASE5-DEPLOY.md`.
- Akun produksi: Admin `annisa@swamedia.co.id` dan akun QA simulasi Observer A/B, Instruktur MoT, dan Bidang Kader. Belum ada akun Peserta.
- Data produksi: trial DAD dengan peserta simulasi, rubrik, dan beberapa rapor yang sudah diterbitkan. Tidak ada data pribadi peserta nyata yang sengaja dimasukkan.
- Backup: cron harian 03:15 ke `/home/ubuntu/imm-db-backups/`, retensi 14 hari, skema `auth` belum termasuk di backup otomatis. Salinan lengkap ada di workstation di luar repo.
- Akses: HTTP polos pada port 8080. Tidak ada domain dan TLS. Pemilik memutuskan ini **final** untuk sementara. Port 8080 dipertahankan.
- Kunci: PAT dan service-role key pernah tercatat di riwayat sesi lama dan perlu diputar. Rotasi sengaja tidak dilakukan saat deploy agar tidak memutus aplikasi; ini jadi jendela pemeliharaan terpisah.
- Keamanan lain: `DISABLE_SIGNUP=true` terverifikasi di server. Grant `anon` pada dua tabel revisi sudah dicabut dan terverifikasi 0 baris.
- Monitoring 5xx belum terpasang. Beberapa kerentanan `npm audit` moderat belum ditindak. Enam 502 saat restart deploy bersifat sementara; setelahnya tidak ada 5xx baru.

Keadaan di atas diperiksa langsung di server pada 24 November 2026 sebelum dan sesudah deploy. Rincian ada di `docs/HASIL-FASE5-DEPLOY.md`.

## 2. Keadaan branch kerja

- Branch: `research/peta-alur-penilaian`.
- Commit sebelum deploy: `69e257f`; hasil deploy tercatat di `docs/HASIL-FASE5-DEPLOY.md`.
- Fase 2 sampai 4 dan uji finalize/ekspor sudah dikerjakan di DEV dengan data simulasi.
- DEV lokal memakai Supabase di `127.0.0.1:54322`, Studio `54323`, dan Next.js di `localhost:3100`.
- Migrasi baru yang sudah dipasang di DEV: `20261124100000` sampai `20261124140000` sesuai urutan di `supabase/migrations/`.
- `npm run check` terakhir: 0 error, 0 peringatan, 22 tes lolos.
- `npm run build` terakhir: berhasil.
- 8 dari 8 penguji SQL lolos di DEV.
- Dry-run retensi lolos. `retention-apply.sql` belum dijalankan.
- Uji browser: Observer, Kader, IoT, Evaluasi, finalize satu klik, publikasi, dan semua tombol ekspor berhasil di DEV.
- Bukti per fase ada di `docs/HASIL-FASE2-DEV.md`, `docs/HASIL-FASE3-DEV.md`, `docs/HASIL-FASE3EFG-DEV.md`, `docs/HASIL-FASE3F-DEV.md`, `docs/HASIL-FASE4-DEV.md`, dan `docs/HASIL-UJI-FINALIZE-EKSPOR-DEV.md`.

## 3. Keputusan pemilik yang mengikat

- Metode akses Peserta: username dan kata sandi biasa. Tidak ada SMTP, TOTP, atau penyedia pihak ketiga.
- Karena tidak ada domain dan TLS, akun serta rapor Peserta tidak dibagikan. Fase 3d dan RPT-001 sampai RPT-005 ditunda.
- Publish rapor tetap keras. Snapshot `provisional` tidak boleh diterbitkan.
- Guard lunak hanya untuk simpan draf: coverage dan moderasi yang belum selesai menjadi peringatan dan status sementara, bukan penolakan simpan. Finalisasi tetap menolak bila coverage atau moderasi belum selesai.
- Skor 0–100 memakai `(skor aspek / 5) × bobot`. Tampilan memakai satu angka desimal. Snapshot menyimpan dua angka desimal.
- N/O dibuang dari denominator coverage.
- Yang boleh menulis status `finalized`: Admin Sistem dan empat subrole koordinator.
- Bidang Kader hanya menerima rekap, tanpa `snapshot_data`, bukti, catatan rinci, evaluate, atau ekspor.
- IoT tetap mengisi Observasi, tetapi tidak melihat rekap penilaian.
- Kelompok untuk ambang 10 adalah komisariat dalam satu kegiatan. RPC `get_commissariat_event_summary` tersedia, tetapi dashboard Komisariat belum memakainya.
- Tanda tangan nama tidak diperlukan; persetujuan pemilik tercatat di `docs/PERSETUJUAN-OWNER-16-PERTANYAAN.md`.
- Retensi dan izin perbaikan produksi sudah disetujui. `disable_signup` dan pencabutan grant anon sudah dijalankan. Rotasi PAT dan service-role key **tidak dilakukan sesuai keputusan pemilik**, bukan tertunda.

## 4. Yang belum selesai

- Fase 5 deploy produksi sudah selesai pada 24 November 2026 sore. Rotasi PAT dan service-role key tidak dilakukan sesuai keputusan pemilik.
- Uji RLS lintas peran produksi sudah dijalankan dan dua celah diperbaiki lewat migrasi `20261124150000`. Rincian ada di `docs/HASIL-UJI-RLS-PROD.md`.
- Uji konflik dua penilai dan Realtime sudah dijalankan di DEV; perbaikan panel rekan dipasang di produksi lewat migrasi `20261124160000`. Rincian ada di `docs/HASIL-UJI-KONFLIK-REALTIME.md`.
- Isi byte PDF sudah dibandingkan dengan baseline `docs/baseline-pdf-sha256.csv`; PDF individual dan PDF dalam ZIP identik di DEV.
- `scripts/retention-apply.sql` sudah dijalankan sekali pada 25 November 2026 dengan backup segar; tidak ada kandidat, jadi tidak ada data yang dihapus atau diarsipkan. Rincian ada di `docs/HASIL-RETENSI-PROD.md`. Cron otomatis belum dipasang dan **prioritasnya diturunkan pemilik**; tidak mendesak saat ini.
- `NEXT_PUBLIC_PUBLIC_AGGREGATE_EVENT_ID` sudah diisi di produksi dengan event `48880b89-de78-4e72-a82b-e2bb89f74fbd` pada 25 November 2026 dan aplikasi di-build ulang. Agregat publik belum tampil karena jumlah peserta dengan rapor Published masih 2, di bawah ambang 10 per komisariat.
- Pemisahan payload `snapshot_data`: dashboard staf memakai RPC `get_staff_event_summary` (migrasi `20261125100000`, sudah terpasang di produksi). Panel Laporan kini mengirim DTO ringkas dan mengambil snapshot penuh lewat Server Action `loadReportSnapshots` hanya saat ekspor. Baseline PDF `docs/baseline-pdf-sha256.csv`; PDF individual dan ZIP terbukti identik dengan baseline di DEV. Perubahan panel Laporan di-deploy ke produksi pada 25 November 2026 dengan backup aplikasi dan env terlebih dahulu; tujuh halaman smoke balas 200 dan tidak ada error baru setelah restart.
- Fitur arsip kegiatan (migrasi `20261125110000`, Server Action `archiveEvent`/`restoreEvent`) sudah terpasang di produksi. Kegiatan berarsip disembunyikan dari semua pemilih kegiatan; penghapusan permanen tidak disediakan.
- Perbaikan `get_staff_event_summary` (migrasi `20261125120000`) sudah terpasang di produksi. Angka event trial kini `33 peserta · 2 final · 2 published`, dan Kader menerima rekap agregat yang sama dengan Admin.
- Klaim status lama di `docs/DEPLOYMENT.md` dan `docs/QA_PHASE8_TEST_PLAN.md` sudah diselaraskan dengan dokumen ini pada 25 November 2026.
- Deploy 26 November 2026 (`f6223c5`): backup aplikasi `/home/ubuntu/imm-app.bak-2026-11-26-1839-full` dan env `/home/ubuntu/.env.production.bak-2026-11-26-1839` dibuat lebih dulu; hash `.env.production` sama sebelum dan sesudah; rsync tanpa `--delete`; `npm ci --include=dev`; `npm run build`; `pm2 restart imm --update-env` (restart ke-25, online). Smoke 8080: delapan halaman 200. Bundle memuat kode validasi baru; tidak ada error baru di log setelah restart. Tidak ada migrasi atau perubahan data. Pengguna wajib Ctrl+F5 agar action ID dan bundle baru dipakai.
- Deploy 26 November 2026 (`5dbfde5`, arsip materi): backup aplikasi `/home/ubuntu/imm-app.bak-2026-11-26-190850-full`, env `/home/ubuntu/.env.production.bak-2026-11-26-190850`, dan dump DB `manual-pre-material-archive-2026-11-26-190850/postgres.dump` dibuat lebih dulu. Migrasi `20261126190000` dipasang; kolom `archived_at` dan dua trigger terbaca. Hash env sama; rsync tanpa `--delete`; build OK; `pm2 restart imm --update-env` (restart ke-26, online). Smoke sembilan halaman 200; bundle memuat kode arsip; tidak ada error baru di log. Hitungan tabel tidak berubah: 10 materi, 16 versi, 229 submission, 2740 rating, 12 evaluasi, 7 snapshot. Tidak ada materi produksi yang diarsipkan pada deploy ini.
- Deploy 26 November 2026 (`cb44235`, tombol arsip versi): backup aplikasi `/home/ubuntu/imm-app.bak-2026-11-26-192501-full` dan env `/home/ubuntu/.env.production.bak-2026-11-26-192501`; hash env sama; rsync tanpa `--delete`; build OK; `pm2 restart imm --update-env` (restart ke-27, online). Smoke delapan halaman 200; bundle memuat "Arsipkan versi"; tidak ada error baru di log. Hitungan data tetap 16 versi, 229 submission, 2740 rating, 12 evaluasi, 7 snapshot. Tidak ada versi produksi yang diarsipkan saat deploy.
- Deploy 26 November 2026 (`7ae5941`, nilai gabungan peserta): backup aplikasi `/home/ubuntu/imm-app.bak-2026-11-26-195606-full` dan env `/home/ubuntu/.env.production.bak-2026-11-26-195606`; hash env sama; rsync tanpa `--delete`; build OK; `pm2 restart imm --update-env` (restart ke-28, online). Smoke delapan halaman 200; bundle memuat teks ringkasan baru; tidak ada error baru di log. Hitungan data tidak berubah: 10 materi, 16 versi, 229 submission, 2740 rating, 12 evaluasi, 7 snapshot, 4 publikasi. Tidak ada migrasi. Pengguna wajib Ctrl+F5.
- Deploy 26 November 2026 (`18e5139`, peta kompetensi otomatis): backup aplikasi `/home/ubuntu/imm-app.bak-2026-11-26-201159-full` dan env `/home/ubuntu/.env.production.bak-2026-11-26-201159`; hash env sama; rsync tanpa `--delete`; build OK; `pm2 restart imm --update-env` (restart ke-29, online). Smoke delapan halaman 200; bundle memuat "Peta kompetensi otomatis"; tidak ada error baru di log. Hitungan data tidak berubah: 10 materi, 16 versi, 229 submission, 2740 rating, 12 evaluasi, 7 snapshot, 4 publikasi. Tidak ada migrasi. Pengguna wajib Ctrl+F5.

## 5. Aturan pembaruan

Setiap perubahan status produksi, deploy, atau hasil verifikasi harus menulis ke dokumen ini terlebih dahulu, baru ke dokumen lain. Jangan menambah klaim "belum ada deploy", "database kosong", "belum ada admin", atau "deploy ditunda" di dokumen lain tanpa menyatakan bahwa itu riwayat lama.
