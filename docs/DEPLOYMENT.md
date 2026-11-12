# Deployment — IMM Observer (SIMPEL-IMM) ke VPS produksi

**Server:** `43.173.33.195` (Ubuntu 24.04.4 LTS, 2 CPU, 7.4 GB RAM, 79 GB disk)
**Pengguna OS:** `ubuntu` (uid 1000, sudo, docker)
**Akses SSH:** key `~/.ssh/imm_prod_43-173-33-195` di workstation pengembangan (private key tidak pernah keluar dari workstation)

## Yang berjalan di server ini

| Layanan | Port | Lokasi |
|---|---|---|
| `nginx` (service, pre-existing) | 80, 443, **8080** | vhost bawaan tidak diubah |
| `imm` (Next.js 16, pm2 `fork`) | `127.0.0.1:3000` (hanya lokal; nginx meneruskan ke 8080) | `/home/ubuntu/imm-app` |
| `wms_prod_backend` (Docker, pre-existing) | `127.0.0.1:8000` | `api-jkstok.my.id` |
| `wms_prod_postgres` (Docker, pre-existing) | `127.0.0.1:5432` | milik workload lain |

- **vhost `imm-8080`** (`/etc/nginx/sites-enabled/imm-8080`, log `/var/log/nginx/imm.*.log`): `listen 8080; proxy_pass http://127.0.0.1:3000`. Port 8080 dibuka di `ufw` — jangan mengalihkan port yang sudah dipakai `api-jkstok` (80/443).
- **pm2**: `pm2 status`, `pm2 logs imm`, `pm2 restart imm`; konfigurasi disimpan (`pm2 save`) + `pm2 startup systemd` sudah terdaftar untuk auto-boot.
- **Node.js** v22.23.5 via NodeSource (npm 10.9.9).
- URL publik aplikasi: **http://43.173.33.195:8080/** (hanya HTTP untuk sementara — belum ada domain dan TLS; token sesi dan kata sandi belum dienkripsi di jaringan).

## Isi `.env.production` (server)

`/home/ubuntu/imm-app/.env.production` (mode 600): `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` dari project Supabase **produksi** `crrqlwlfndhugcqcnkex` ("production imm"), plus `NEXT_PUBLIC_SITE_URL=http://43.173.33.195:8080`. Tidak ada service-role key — fitur pembuatan akun Instruktur (`/dashboard/pengguna`) akan gagal sampai `SUPABASE_SERVICE_ROLE_KEY` ditambahkan (server-only).

## Database produksi (`crrqlwlfndhugcqcnkex`)

- **Kosong sebelum deploy** (0 tabel, 0 user). **Semua 39 migration terpasang** via Management API (urut nama file, semua OK) pada 13 Nov 2026. Tidak ada data tersisa; **belum ada akun admin** — tidak ada yang bisa login selain via bootstrap (lihat TODO).
- Data di server ini adalah **produksi**: jangan jalankan pengujian yang menulis data ke produksi.
- Regression SQL (`supabase/tests/*.sql`) belum dijalankan di produksi; jalankan di DEV (`thtwrkovcorgxzuqttal`).

## Cara memperbarui aplikasi (deploy ulang)

```powershell
# dari workstation, repo ini
rsync -az -e "ssh -i ~/.ssh/imm_prod_43-173-33-195" `
  --exclude .git --exclude node_modules --exclude .next `
  --exclude '.env*' --exclude '*.tsbuildinfo' `
  ./ ubuntu@43.173.33.195:/home/ubuntu/imm-app/
ssh -i ~/.ssh/imm_prod_43-173-33-195 ubuntu@43.173.33.195 'cd /home/ubuntu/imm-app && npm ci --include=dev && npm run build && pm2 restart imm'
```

Jangan pernah menyalin `.env.local` / `.env.qa-test` ke server; jangan push `.env*`.

## Rollback

```bash
ssh -i ~/.ssh/imm_prod_43-173-33-195 ubuntu@43.173.33.195
cd /home/ubuntu/imm-app
# restore dari snapshot direktori sebelumnya (jika dibuat), atau
git reset --hard <commit-lama>   # hanya bila .git dibawa ke server (tidak)
npm ci --include=dev && npm run build && pm2 restart imm
```
Disarankan sebelum redeploy besar: `cp -a /home/ubuntu/imm-app /home/ubuntu/imm-app.bak-$(date +%F)`.

## Bootstrap admin (13 November 2026)

Akun admin produksi dibuat: `annisa@swamedia.co.id` (role `admin_system`, password acak kuat — diserahkan langsung kepada pemilik di luar dokumen ini). Terverifikasi login di http://43.173.33.195:8080 → dashboard Admin merender ("Ringkasan sistem", nilai 0 — database kosong). Ubah password setelah login pertama bila perlu; akun bisa membuat kegiatan lewat UI.

## TODO / pemblokir

1. **Domain + TLS** — belum ada domain; akses hanya via reverse proxy HTTP di :8080. Jangan masukkan data peserta nyata sebelum HTTPS tersedia.
2. **Backup** — belum ada jadwal backup DB produksi; tinjau Paket Gratis Supabase & kebijakan retensi.
3. **Service role key** — diperlukan bila fitur pembuatan akun Instruktur dipakai di produksi.
4. **Monitoring** — belum ada alerting (uptime, error rate); pm2 restart otomatis hanya untuk crash.
5. **Seed data produksi** — database masih kosong (belum ada kegiatan/peserta/rubrik produksi).
