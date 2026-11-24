# Revisi A Siklus 2 — Fase 0/0b, Fase 5, Fase 6, bukti, perintah, ringkasan

Pengganti bagian terkait di `docs/RENCANA-IMPLEMENTASI-KEPUTUSAN.md`. Rencana utama, kode, data, dan produksi tidak diubah. Singkatan: `RENCANA` = berkas itu; `VERIFIKASI` = `docs/VERIFIKASI-PRODUKSI-YANG-BELUM-DILAKUKAN.md`; `MATRIKS` = `docs/MATRIKS-KEPUTUSAN-PRODUK.md`; `REVIEW` = `docs/REVIEW-SIKLUS-2.md`.

24 November 2026: lunak hanya guard aplikasi (coverage, moderasi, status kirim/final, pesan UI). **Publish rapor tetap keras**: `finalized` + coverage 80% + moderasi + alasan; `provisional` ditolak (`MATRIKS:166`, `REVIEW:16,30`). RLS, grant, tanda tangan, 14 butir, backup, rotasi kunci, TLS tidak dilonggarkan.

## A. Fase 0 dan Fase 0b — pengganti `RENCANA:34-50`

**Fase 0, read-only.** Gate masuk: tidak ada; prasyarat matriks ditandatangani tiga peran (`MATRIKS:198-204`, bukan `:201-203`). Gate keluar: 14 butir `VERIFIKASI:22-37` "sudah" + bukti; lima kontradiksi `:14-18` selesai; enam butir kritis "sudah" + bukti. Kriteria tidak diturunkan. Kerja: baca commit, migrasi, env tanpa kunci, grant, log, `df -h`, baseline 5xx/502, isi daftar terbuka.

Dilarang menulis ke PROD, memutar kunci, menghapus backup, memakai data nyata, **kecuali remediasi 0b berizin**. Uji alur penuh tetap di Fase 5.

**Fase 0b `[IZIN]` — remediasi produksi.** Pelaku: Infrastruktur butir 1-5, 9-14; Keamanan butir 6-8, 11. Urutan: izin tertulis → tindakan → bukti → tanda tangan.

| Kritis | Tindakan | Bukti |
|---|---|---|
| `disable_signup` (`VERIFIKASI:29`) | set `true` di Auth PROD | konfigurasi + tanggal; daftar akun ditolak |
| grant `anon` (`:30`) | `revoke` SELECT di dua tabel moderasi | `role_table_grants` = 0 baris untuk `anon` |
| PAT + service-role (`:31`, `HANDOVER.md:321`) | putar, perbarui `.env.production` 600, `pm2 restart --update-env`, cabut yang lama | tertulis ber tanggal + hash; kunci lama 401 |
| `npm audit` (`HANDOVER.md:337,347`) | jalankan di workstation, perbaiki non-breaking | output 0 kerentanan atau sisa + persetujuan Keamanan |
| domain + TLS (`:32`, `docs/DEPLOYMENT.md:19,61`) | pasang domain/sertifikat, alihkan 8080 | `https://<DOMAIN_HTTPS>/login` 200 + sertifikat; 8080 bukan 200 |
| salinan `auth` (`:33`, `HANDOVER.md:334-335`) | `auth.users`/`identities` di backup harian atau re-create terdokumentasi; cek `.env.bak-20261123-202146` | isi `/etc/cron.d/imm-db-backup` + daftar berkas + uji restore; nama/ukuran/hash `.env.bak` |

Tindakan dan bukti untuk 14 butir "Belum" (`VERIFIKASI:24-37`):

| # | Tindakan → bukti |
|---|---|
| 1 | `git rev-parse HEAD` di `/home/ubuntu/imm-app` → `0448100` (`HANDOVER.md:479`) |
| 2 | query `schema_migrations` → 40 versi termasuk `20261123130000`, `is_active` terbaca |
| 3 | jalankan `dad_single_recommendation.sql` read-only dalam `begin; ... rollback;` → log lolos |
| 4 | baca `/home/ubuntu/supabase/.env` + env `supabase-rest` → `PGRST_DB_MAX_ROWS=100000` (`HANDOVER.md:452`); hash nilai |
| 5 | baca `.env.production` tanpa kunci → URL self-hosted, bukan cloud di-pause |
| 6-10 | sesuai lima baris pertama dan terakhir tabel kritis di atas |
| 11 | baca konfigurasi monitoring → aturan alert 5xx + notifikasi uji terkirim |
| 12 | login browser dua akun `@invalid` pasca hotfix prefetch dan P1/P2 → tangkapan tanpa banner |
| 13 | baca `/var/log/nginx/imm.*.log` → waktu, total request, jumlah 5xx/502, persentase |
| 14 | `df -h` + status container → disk sehat, `wms_prod_*` healthy (`docs/DEPLOYMENT.md:7-16`) |

## B. Penandatanganan matriks — tambahan Fase 0, 5, 6

| Peran | Lingkup | Kolom |
|---|---|---|
| Pemilik Produk | keputusan 1-12 (`MATRIKS:166,191`), ringkasan Bagian 7, publish keras | Nama, tanggal, tanda tangan |
| Pemilik Infrastruktur | butir 1-5, 9-14; backup, cron, TLS, domain, rotasi Fase 0b | Nama, tanggal, tanda tangan |
| Pemilik Keamanan/Privasi | butir 6-8, 11; RLS, grant, audit, daftar akun uji | Nama, tanggal, tanda tangan |

Gate masuk tidak digantung `[TERBUKA-n]`: butir penghalang ditutup di 0b atau dinyatakan "tidak menghalangi" tertulis dengan nama dan tanggal. Kolom kosong = gate belum lolos (`AGENTS.md:19-21`).

## C. Fase 1 dan publish keras — tambahan kecil

Gate keluar Fase 1 (`RENCANA:62`) simpan `docs/bukti-gate-siklus2/fase-1-sesuai.md` berisi daftar akun `@invalid`/QA simulasi dan hasil query domain: `select email from auth.users where email not like '%@invalid%'` = 0 baris; `select count(*) from assessment_snapshots` sesuai baseline. Di Fase 2f/3a hapus frasa "selisih 2 poin jadi peringatan" (`RENCANA:78`; `REVIEW:17`); gate integritas bobot tetap keras. Bukti Fase 3: publish `provisional` ditolak (42501/`P0002`), `finalized` + coverage + moderasi + alasan → 200.

## D. Fase 5 — pengganti `RENCANA:106-119`

Gate masuk, semua "sudah" + bukti: (1) Fase 1-4 dinyatakan sesuai; (2) izin tertulis Produk dan Infrastruktur; (3) enam butir kritis masih "sudah", TLS aktif sebelum kredensial Peserta dipakai; (4) backup sebelum migrasi: `pre-migration-*.sql`, `imm-app.bak-$(date +%F)`, hash `.env.production`, salinan `auth`, hasil uji restore; (5) `.env.bak-20261123-202146` terverifikasi; (6) **bukti rotasi kunci Fase 0b masih berlaku** (hash/tanggal sesuai, kunci lama masih ditolak). Rotasi hanya sekali, di 0b.

Urutan: backup → migrasi + penguji SQL → rsync tanpa `--delete`/`--delete-excluded` (`docs/DEPLOYMENT.md:35-39`) → `npm ci --include=dev` → `npm run build` → `pm2 restart imm` → smoke → RPT-001..005 dan alur penuh dengan `@invalid` → ulang uji PROD (`MATRIKS:166`). Tanpa langkah rotasi kedua.

Smoke: `curl -s -o /dev/null -w "%{http_code}" http://43.173.33.195:8080/` → 200 **hanya** cek halaman tanpa kredensial. Lalu 8080 ditutup/dialihkan (301/302 ke HTTPS, bukan 200). Login QA hanya di `https://<DOMAIN_HTTPS>/login`; domain dari bukti 0b butir 9, jangan mengarang. "Smoke HTTP 200" di `RENCANA:136` dibaca "smoke HTTPS 200". Gate keluar: 14 butir diisi ulang, 5xx/502 tidak melebihi baseline butir 13, bukti per peran dan smoke HTTPS terkumpul, hash PDF cocok.

## E. Fase 6 — pengganti `RENCANA:121-123`

Gate masuk: pemilik menyatakan Fase 5 sesuai, bukti tersimpan. Perbarui daftar di `RENCANA:123` dan tambahkan `docs/MATRIKS-RPC-AKSES.md`, `docs/INVENTARIS-JALUR-LAMA.md`, `docs/ALUR-PENILAIAN-KANONIK.md` (wajib karena aturan gate berubah: publish keras, coverage/moderasi lunak).

"Satu versi status": otoritas sejak Fase 0 adalah tabel 14 butir terisi di `VERIFIKASI:22-37`; klaim lama dihapus/tandas kedaluwarsa. Klaim yang harus hilang: "migrasi belum ada" (`LANGKAH-PASANG-MIGRASI-DAN-UJI.md:9`, `HANDOVER.md:470`), "deploy ditunda" (`HANDOVER.md:471`), "database kosong/belum ada admin" (`docs/DEPLOYMENT.md:27,65`), "belum ada domain/TLS, HTTP polos" (`docs/DEPLOYMENT.md:19,61`), "regression belum dijalankan" (`docs/DEPLOYMENT.md:29`), "belum ada jadwal backup" (`docs/DEPLOYMENT.md:62`), "disable_signup false/grant anon ada" (`HANDOVER.md:327`), "`PGRST_DB_MAX_ROWS=1000`". `QA_PHASE8_TEST_PLAN.md:72,279` diperbarui setelah akun Peserta tersedia. Gate keluar: tiga peran menandatangani status akhir.

## F. Konvensi bukti tunggal

Satu berkas per fase: `docs/bukti-gate-siklus2/fase-N-sesuai.md` untuk N = 0, 0b, 1-6. Isi: checklist gate; per bukti, perintah + keluaran atau hash + path:line; daftar akun uji `@invalid` tanpa kata sandi; hasil query domain; nama peran dan tanggal tanda tangan. Tabel per peran Bagian 5 masuk `fase-3-sesuai.md` dan `fase-4-sesuai.md`. Bukti fase berikutnya tidak boleh merujuk folder lain.

## G. Pemisahan perintah (jumlah pemeriksaan tidak berubah)

Laptop Windows, PowerShell:
```powershell
Get-FileHash .\docs\baseline-pdf-sha256.csv -Algorithm SHA256
Get-Date -Format yyyy-MM-dd
Invoke-WebRequest -Uri "https://<DOMAIN_HTTPS>/login"   # kredensial QA hanya di sini
Invoke-WebRequest -Uri "http://43.173.33.195:8080/" -MaximumRedirection 0  # tanpa kredensial
```
Server Infrastruktur, SSH:
```bash
cd /home/ubuntu/imm-app && git rev-parse HEAD && sha256sum .env.production
sha256sum /home/ubuntu/imm-db-backups/*/pre-migration-*.sql
df -h; docker ps --format '{{.Names}} {{.Status}}' | grep wms_prod
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/
cat /etc/cron.d/imm-db-backup /etc/cron.d/imm-retention
openssl s_client -connect <DOMAIN_HTTPS>:443 -servername <DOMAIN_HTTPS> </dev/null
```
Hash menggantikan pencetakan kunci. Server dijalankan Infrastruktur; laptop oleh Produk/Keamanan.

## H. Ringkasan Bagian 7 — pengganti `RENCANA:166-175`

Gate aplikasi = peringatan/status sementara bila aman; gate keamanan wajib, publish rapor tetap wajib.

- **Fase 0:** Tombol belum berubah. Terlihat: 14 pemeriksaan dan lima kontradiksi. Bisa diulang: baca commit, migrasi, sertifikat, log 5xx/502. Fase 0b membetulkan enam prasyarat dengan izin tertulis.
- **Fase 1:** Tombol belum berubah. Terlihat: angka baseline dan sidik PDF di `docs/baseline-pdf-sha256.csv`. Bisa diulang: unduh PDF lama, cocokkan sidik.
- **Fase 2:** Skor 4 berarti 80 **pada penilaian lengkap**; bila belum lengkap, tanda sementara dan peringatan, bukan penolakan simpan. N/O tidak mengurangi penyebut coverage. Terbit ditolak untuk penilaian sementara.
- **Fase 3:** Kader tidak bisa Terbit; IoT tidak melihat menu Evaluasi/Laporan dan tidak mengambil data lewat API; rubrik berlabel percobaan/resmi; impor ulang dengan pilihan Admin.
- **Fase 4:** Jalur lama dan 14 entri inventaris ditutup; kontrak RPC ber signature dua argumen; empat pemanggil berfungsi. Bisa diulang: tujuh penguji SQL dan uji signature.
- **Fase 5:** Gate tetap: RLS, 14 butir, TLS, bukti rotasi berlaku, backup, HTTPS 200, 5xx/502 tidak melebihi baseline. Bisa diulang: smoke HTTPS dan uji per peran dengan `@invalid`; 8080 hanya cek halaman.
- **Fase 6:** Tombol tidak berubah. Terlihat: satu status produksi di semua dokumen. Bisa diulang: cari "ditunda"/"belum" yang bertentangan; harus tidak ada.

## I. Daftar terbuka — pengganti `RENCANA:153-164`

1. `[TERBUKA-1]` Pembulatan di Observasi, Evaluasi, PDF, snapshot. Rujuk **Fase 2a** (`RENCANA:68`), bukan 3f; menghalangi uji "3.5 → 70".
2. `[TERBUKA-2]` Definisi "kelompok" (ambang 10). Menghalangi 3c dan gate Fase 0.
3. `[TERBUKA-3]` Kewenangan ekspor Kader. Rujuk 3a.
4. `[TERBUKA-4]` Arsip identitas di `private_payload`. Rujuk 3e.
5. `[TERBUKA-5]` Jalur revisi tanpa melanggar `finalized`. Rujuk 2e.
6. `[TERBUKA-6]` Penandatangan tiga peran. Rujuk B; ditutup di Fase 0.
7. `[TERBUKA-7]` Filter `target_participant_id` dan aturan RPC empat definisi. Rujuk 4.
8. `[TERBUKA-8]` Nasib `finalized`: A atau B. Rujuk 2d; sebelum diputus tombol belum selesai.
9. `[TERBUKA-9]` Penguncian moderasi tertulis. Rujuk 2f.
10. `[TERBUKA-10]` `expires_at` default akun Peserta; fallback 30 hari. Rujuk 3d.
11. `[TERBUKA-11]` Domain HTTPS dan penutupan 8080. Ditutup di 0b butir 9; menghalangi smoke Fase 5.
