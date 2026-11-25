# Status Produksi — Satu Versi

Dokumen ini menjadi otoritas tunggal untuk keadaan aplikasi dan produksi per 24 November 2026. Dokumen lain harus merujuk ke sini, bukan menyimpan klaim status yang berbeda. Bila ada perbedaan dengan `HANDOVER.md`, `BLUEPRINT.md`, `docs/DEPLOYMENT.md`, atau dokumen lain, pakai dokumen ini.

## 1. Keadaan produksi saat ini

- Aplikasi: IMM Observer, alamat `http://43.173.33.195:8080/`.
- Server: Ubuntu 24.04 di `43.173.33.195`. Node v22, pm2 `imm`, nginx reverse proxy. Workload lain (`api-jkstok.my.id`, `wms_prod_*`) tetap berjalan dan tidak tersentuh.
- Database: Supabase self-hosted di server yang sama. API internal `127.0.0.1:8180`, port publik `8081` untuk browser. Cloud project lama `crrqlwlfndhugcqcnkex` sudah di-pause sebagai cadangan beku.
- Kode yang aktif di produksi: hasil branch `research/peta-alur-penilaian` pada commit `69e257f`, di-deploy 24 November 2026 sore. Deploy sebelumnya memakai `0448100` dan kini menjadi riwayat.
- Migrasi di produksi: 39 migrasi lama ditambah 11 migrasi baru `20261124100000` sampai `20261124140000`. Semua terpasang. Rincian ada di `docs/HASIL-FASE5-DEPLOY.md`.
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
- `npm run check` terakhir: 0 error, 5 peringatan lama, 22 tes lolos.
- `npm run build` terakhir: berhasil.
- 8 dari 8 penguji SQL lolos di DEV.
- Dry-run retensi lolos. `retention-apply.sql` belum dijalankan.
- Uji browser: Observer, Kader, IoT, Evaluasi, finalize satu klik, publikasi, dan semua tombol ekspor berhasil di DEV.
- Bukti per fase ada di `docs/HASIL-FASE2-DEV.md`, `docs/HASIL-FASE3-DEV.md`, `docs/HASIL-FASE3EFG-DEV.md`, `docs/HASIL-FASE3F-DEV.md`, `docs/HASIL-FASE4-DEV.md`, dan `docs/HASIL-UJI-FINALIZE-EKSPOR-DEV.md`.

## 3. Keputusan pemilik yang mengikat

- Metode akses Peserta: username dan kata sandi biasa. Tidak ada SMTP, TOTP, atau penyedia pihak ketiga.
- Karena tidak ada domain dan TLS, akun serta rapor Peserta tidak dibagikan. Fase 3d dan RPT-001 sampai RPT-005 ditunda.
- Publish rapor tetap keras. Snapshot `provisional` tidak boleh diterbitkan.
- Guard aplikasi lain lunak: coverage dan moderasi yang belum selesai menjadi peringatan dan status sementara, bukan penolakan simpan.
- Skor 0–100 memakai `(skor aspek / 5) × bobot`. Tampilan memakai satu angka desimal. Snapshot menyimpan dua angka desimal.
- N/O dibuang dari denominator coverage.
- Yang boleh menulis status `finalized`: Admin Sistem dan empat subrole koordinator.
- Bidang Kader hanya menerima rekap, tanpa `snapshot_data`, bukti, catatan rinci, evaluate, atau ekspor.
- IoT tetap mengisi Observasi, tetapi tidak melihat rekap penilaian.
- Kelompok untuk ambang 10 adalah komisariat dalam satu kegiatan.
- Tanda tangan nama tidak diperlukan; persetujuan pemilik tercatat di `docs/PERSETUJUAN-OWNER-16-PERTANYAAN.md`.
- Retensi dan izin perbaikan produksi sudah disetujui. `disable_signup` dan pencabutan grant anon sudah dijalankan. Rotasi PAT dan service-role key **tidak dilakukan sesuai keputusan pemilik**, bukan tertunda.

## 4. Yang belum selesai

- Fase 5 deploy produksi sudah selesai pada 24 November 2026 sore. Rotasi PAT dan service-role key tidak dilakukan sesuai keputusan pemilik.
- Uji RLS lintas peran produksi sudah dijalankan dan dua celah diperbaiki lewat migrasi `20261124150000`. Rincian ada di `docs/HASIL-UJI-RLS-PROD.md`.
- Uji konflik dua penilai dan Realtime sudah dijalankan di DEV; perbaikan panel rekan dipasang di produksi lewat migrasi `20261124160000`. Rincian ada di `docs/HASIL-UJI-KONFLIK-REALTIME.md`.
- Isi byte PDF unduhan belum dibandingkan dengan baseline.
- `scripts/retention-apply.sql` sudah dijalankan sekali pada 25 November 2026 dengan backup segar; tidak ada kandidat, jadi tidak ada data yang dihapus atau diarsipkan. Rincian ada di `docs/HASIL-RETENSI-PROD.md`. Cron otomatis belum dipasang.
- `NEXT_PUBLIC_PUBLIC_AGGREGATE_EVENT_ID` perlu diisi di lingkungan produksi agar halaman publik menampilkan agregat.
- Dokumen lama masih berisi klaim status yang bertentangan. Fase 6 memperbaruinya untuk merujuk ke dokumen ini.

## 5. Aturan pembaruan

Setiap perubahan status produksi, deploy, atau hasil verifikasi harus menulis ke dokumen ini terlebih dahulu, baru ke dokumen lain. Jangan menambah klaim "belum ada deploy", "database kosong", "belum ada admin", atau "deploy ditunda" di dokumen lain tanpa menyatakan bahwa itu riwayat lama.
