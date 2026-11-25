# Deployment — IMM Observer (SIMPEL-IMM) ke VPS produksi

**Server:** `43.173.33.195` (Ubuntu 24.04.4 LTS, 2 CPU, 7.4 GB RAM, 79 GB disk)
**Pengguna OS:** `ubuntu` (uid 1000, sudo, docker)
**Akses SSH:** key `~/.ssh/imm_prod_43-173-33-195` di workstation pengembangan (private key tidak pernah keluar dari workstation)

> **Status terkini (25 November 2026):** `docs/STATUS-PRODUKSI-SATU-VERSI.md` adalah otoritas tunggal. Kode aktif di produksi = commit `50322aa` (deploy 25 November). Database memakai Supabase self-hosted di server yang sama; project cloud lama `crrqlwlfndhugcqcnkex` hanya cadangan beku yang di-pause. Pekerjaan branch `research/peta-alur-penilaian` sudah masuk `main` dan di-deploy. Bagian bertanda "riwayat" di bawah adalah catatan 13 November dan tidak menggambarkan keadaan sekarang.

## Yang berjalan di server ini

| Layanan | Port | Lokasi |
|---|---|---|
| `nginx` (service, pre-existing) | 80, 443, **8080** | vhost bawaan tidak diubah |
| `imm` (Next.js 16, pm2 `fork`) | `127.0.0.1:3000` (hanya lokal; nginx meneruskan ke 8080) | `/home/ubuntu/imm-app` |
| Supabase self-hosted | API internal `127.0.0.1:8180`, port publik `8081` untuk browser | `/home/ubuntu/supabase` |
| `wms_prod_backend` (Docker, pre-existing) | `127.0.0.1:8000` | `api-jkstok.my.id` |
| `wms_prod_postgres` (Docker, pre-existing) | `127.0.0.1:5432` | milik workload lain |

- **vhost `imm-8080`** (`/etc/nginx/sites-enabled/imm-8080`, log `/var/log/nginx/imm.*.log`): `listen 8080; proxy_pass http://127.0.0.1:3000`. Port 8080 dibuka di `ufw` — jangan mengalihkan port yang sudah dipakai `api-jkstok` (80/443).
- **pm2**: proses `imm`; `pm2 status`, `pm2 logs imm`, `pm2 restart imm`; konfigurasi disimpan (`pm2 save`) + `pm2 startup systemd` sudah terdaftar untuk auto-boot.
- **Node.js** v22.23.5 via NodeSource (npm 10.9.9).
- URL publik aplikasi: **http://43.173.33.195:8080/**. HTTP polos pada port 8080 tanpa domain dan TLS adalah **keputusan final pemilik untuk sementara** (lihat `docs/STATUS-PRODUKSI-SATU-VERSI.md` bagian 1 dan 3). Port 8080 dipertahankan. Token sesi dan kata sandi belum dienkripsi di jaringan.

## Isi `.env.production` (server)

`/home/ubuntu/imm-app/.env.production` (mode 600) berisi `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only, dipakai `lib/supabase/admin.ts`, tidak pernah masuk repo/git/frontend), `NEXT_PUBLIC_SITE_URL=http://43.173.33.195:8080`, dan `NEXT_PUBLIC_PUBLIC_AGGREGATE_EVENT_ID=48880b89-de78-4e72-a82b-e2bb89f74fbd` (bukan rahasia). Jangan mencetak nilai kunci di dokumen ini.

Target yang seharusnya dipakai aplikasi adalah **Supabase self-hosted** di server yang sama: API internal `127.0.0.1:8180`, port publik `8081` untuk browser. Project cloud lama `crrqlwlfndhugcqcnkex` sudah di-pause sebagai cadangan beku dan bukan target aplikasi. Butir 5 di `docs/VERIFIKASI-PRODUKSI-YANG-BELUM-DILAKUKAN.md` masih perlu mengonfirmasi isi file ini langsung di server.

## Database produksi (Supabase self-hosted)

- Instance self-hosted di server yang sama. API internal `127.0.0.1:8180`, port publik `8081` untuk browser. Project cloud lama `crrqlwlfndhugcqcnkex` hanya cadangan beku yang di-pause.
- **39 migrasi lama** terpasang sesuai catatan handover sebelum pekerjaan branch ini. Migrasi baru (`20261123130000` dan `20261124100000` sampai `20261124160000`) sudah dipasang di produksi. Rincian ada di `docs/STATUS-PRODUKSI-SATU-VERSI.md` bagian 1–2 dan `docs/LANGKAH-PASANG-MIGRASI-DAN-UJI.md`.
- Data produksi: trial DAD dengan peserta simulasi, rubrik, dan beberapa rapor yang sudah diterbitkan. Tidak ada data pribadi peserta nyata yang sengaja dimasukkan.
- Data di server ini adalah **produksi**: jangan jalankan pengujian yang menulis data ke produksi.
- Regression SQL (`supabase/tests/*.sql`) belum dijalankan di produksi. Di DEV, 8 dari 8 penguji SQL lolos (lihat `docs/STATUS-PRODUKSI-SATU-VERSI.md` bagian 2).

## Backup

- Cron harian **03:15** ke `/home/ubuntu/imm-db-backups/`, retensi 14 hari.
- Skema `auth` **belum** termasuk di backup otomatis. Salinan lengkap ada di workstation di luar repo.
- Rincian ada di `docs/STATUS-PRODUKSI-SATU-VERSI.md` bagian 1; butir verifikasi ada di `docs/VERIFIKASI-PRODUKSI-YANG-BELUM-DILAKUKAN.md` butir 10.

## Cara memperbarui aplikasi (deploy ulang)

Prosedur ini dipakai untuk pembaruan aplikasi. Kode yang aktif sekarang `50322aa` (deploy 25 November 2026).

```powershell
# dari workstation, repo ini
rsync -az -e "ssh -i ~/.ssh/imm_prod_43-173-33-195" `
  --exclude .git --exclude node_modules --exclude .next `
  --exclude '.env*' --exclude '*.tsbuildinfo' `
  ./ ubuntu@43.173.33.195:/home/ubuntu/imm-app/
ssh -i ~/.ssh/imm_prod_43-173-33-195 ubuntu@43.173.33.195 'cd /home/ubuntu/imm-app && npm ci --include=dev && npm run build && pm2 restart imm'
```

Jangan pernah menyalin `.env.local` / `.env.qa-test` ke server; jangan push `.env*`. Jangan pernah menambahkan `--delete` atau `--delete-excluded` ke rsync: opsi itu bisa menghapus berkas milik workload lain di direktori tujuan.

## Rollback

```bash
ssh -i ~/.ssh/imm_prod_43-173-33-195 ubuntu@43.173.33.195
cd /home/ubuntu/imm-app
# restore dari snapshot direktori sebelumnya (jika dibuat), atau
git reset --hard <commit-lama>   # hanya bila .git dibawa ke server (tidak)
npm ci --include=dev && npm run build && pm2 restart imm
```

Disarankan sebelum redeploy besar: `cp -a /home/ubuntu/imm-app /home/ubuntu/imm-app.bak-$(date +%F)`.

## Bootstrap admin (13 November 2026 — riwayat)

Akun admin produksi dibuat: `annisa@swamedia.co.id` (role `admin_system`, password acak kuat — diserahkan langsung kepada pemilik di luar dokumen ini). Saat itu dashboard Admin merender "Ringkasan sistem" dengan nilai 0 karena database masih kosong. **Keadaan sekarang:** akun admin tetap aktif dan database sudah berisi data trial (lihat `docs/STATUS-PRODUKSI-SATU-VERSI.md`). Bagian ini hanya catatan pembuatan akun, bukan status terkini.

## TODO / pemblokir

Ringkasan keadaan terkini; rincian ada di `docs/STATUS-PRODUKSI-SATU-VERSI.md` dan daftar verifikasi di `docs/VERIFIKASI-PRODUKSI-YANG-BELUM-DILAKUKAN.md`.

1. ~~Domain + TLS~~ — **ditutup**: HTTP polos di `:8080` tanpa domain dan TLS adalah keputusan final pemilik untuk sementara. Port 8080 dipertahankan.
2. ~~Backup~~ — **selesai**: cron harian 03:15 ke `/home/ubuntu/imm-db-backups/`, retensi 14 hari. Catatan: skema `auth` belum masuk backup otomatis (butir 10).
3. ~~Service role key~~ — **selesai** (13 Nov 2026): `SUPABASE_SERVICE_ROLE_KEY` terpasang di `.env.production` (mode 600), pm2 restart `--update-env`, aplikasi online. Fitur pembuatan akun Instruktur perbantuan di `/dashboard/pengguna` aktif (belum diuji dengan pembuatan akun sungguhan). Kunci perlu diputar sebelum penggunaan resmi (butir 8).
4. **Monitoring** — belum ada alerting 5xx (butir 11); pm2 restart otomatis hanya untuk crash.
5. ~~Seed data produksi~~ — **selesai**: data trial DAD sudah ada (lihat bagian "Seed trial produksi" di bawah, riwayat 13 Nov 2026).
6. ~~Deploy branch ini~~ — selesai 24–25 November 2026. Hasil branch `research/peta-alur-penilaian` sudah di-deploy; kode aktif `50322aa`.

## Seed trial produksi (13 November 2026 — riwayat)

Disalin terpilih dari DEV `thtwrkovcorgxzuqttal` ke target yang saat itu bernama PROD `crrqlwlfndhugcqcnkex` (tanpa akun, nilai, snapshot, moderasi, lampiran):

- Kegiatan **PK IMM FEB UM Bandung** (84315272-…, 13–15 Nov 2026, SMA Muhammadiyah 4 Bandung)
- 2 rubric material: "Materi umum" (kosong), "AIK" (7 indikator skala 1–5)
- 6 rubrik versi dari DEV: **Interview (Screening) aktif** — 5 aspek 100%, 10 indikator; **Kognitif (Pelatihan AIK) aktif** — Pretest/Post-Test 50/50, 5 indikator; 4 versi draft (tidak terkait validasi nilai — tetap tersedia untuk pengujian UI sebagai draft)
- 3 peserta simulasi: Peserta 01/02 (PK IMM FEB UM Bandung), R1 (Komisariat Simulasi 03)
- `created_by` diremap ke admin produksi; tidak ada akun QA/nilai/snapshot/moderasi yang masuk

Verifikasi: bobot aktif = 100 untuk kedua rubrik; kegiatan tampil di dashboard; Kerangka DAD (6 aspek, 27 indikator, 135 anchor) tampil di `/dashboard/kerangka`; event tampil di `/dashboard/kegiatan`.

**Catatan:** DEV tidak berisi data uji; Salinan dilakukan dengan INSERT tervalidasi FK, satu transaksi. `/dashboard/pengguna` (buat akun) aktif sejak `SUPABASE_SERVICE_ROLE_KEY` ditambahkan ke `.env.production` (13 Nov 2026, sore; pm2 restart).

Catatan status: bagian ini adalah riwayat 13 November ketika target produksi masih project cloud `crrqlwlfndhugcqcnkex`. Produksi sekarang memakai Supabase self-hosted; lihat `docs/STATUS-PRODUKSI-SATU-VERSI.md`.

## Akun sintetik PROD (13 November 2026, malam — riwayat)

Empat akun uji untuk trial produksi (data simulasi, hapus kapan pun, password acak diserahkan ke pemilik):

| Akun | Role | Penugasan |
|---|---|---|
| `qa-prod-observer-a@imm-observer.invalid` | Observer | `PK IMM FEB UM Bandung` |
| `qa-prod-observer-b@imm-observer.invalid` | Observer | `PK IMM FEB UM Bandung` |
| `qa-prod-instruktur@imm-observer.invalid` | Instruktur (MoT) | `PK IMM FEB UM Bandung`, 5 tugas checklist |
| `qa-prod-kader@imm-observer.invalid` | Bidang Kader | — |

Semuanya login terverifikasi di produksi (Observer melihat kegiatan tugasnya; Instruktur melihat monitoring + checklist MoT; Kader dashboard pemantauan). Kredensial tersimpan lokal di `.env.qa-test` (gitignored). Akun produksi nyata untuk anggota panitia belum dibuat — belum ada daftar email/peran. Status akun saat ini ada di `docs/STATUS-PRODUKSI-SATU-VERSI.md` bagian 1.
