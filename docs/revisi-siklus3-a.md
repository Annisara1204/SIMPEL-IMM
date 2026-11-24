# Revisi A Siklus 3 — Fase 0/0b, penandatanganan, bukti, perintah, ringkasan, terbuka, Fase 6

Usulan perbaikan untuk `docs/RENCANA-IMPLEMENTASI-KEPUTUSAN.md`. Rencana utama, kode, migrasi, data, dan produksi tidak diubah. Tidak ada commit. Singkatan: `RENCANA` = berkas itu; `MATRIKS` = `docs/MATRIKS-KEPUTUSAN-PRODUK.md`; `VERIFIKASI` = `docs/VERIFIKASI-PRODUKSI-YANG-BELUM-DILAKUKAN.md`; `REVIEW` = `docs/REVIEW-SIKLUS-3.md`; `REVISI2A` = `docs/revisi-siklus2-a.md`.

**Aturan prioritas** (`REVIEW:38`): bila berkas revisi berbeda dengan rencana utama, **rencana utama yang menang**. Berkas revisi hanya usulan dan tidak mengubah gate sampai pemilik menyetujui serta `RENCANA` diperbarui. Untuk item yang sama, `MATRIKS:3` tetap mengalahkan `BLUEPRINT.md` dan dokumen lama.

## A. Urutan Fase 0 dan 0b — pengganti `RENCANA:34-63`

Deadlock di `REVIEW:23` dan `REVIEW-SIKLUS-2.md:11` ditutup dengan urutan ini. 0b berada **sebelum** gate keluar Fase 0, bukan sesudahnya.

1. **Gate masuk Fase 0** (`RENCANA:36`): tiga peran menandatangani matriks (`MATRIKS:198-204`, bukan `:201-203`). Tanda tangan boleh diisi setelah 0b, asal sebelum Fase 0 dinyatakan selesai. Kolom kosong berarti gate belum lolos (`AGENTS.md:19-21`).
2. **Izin tertulis untuk 0b** diberikan sebelum ada tindakan ke PROD. Ini instrumen terpisah dari tanda tangan matriks, jadi tidak ada kontradiksi: 0b tidak menunggu tanda tangan matriks terisi, dan Fase 0 tidak dinyatakan selesai sebelum tanda tangan ada (`RENCANA:54`).
3. **Fase 0, read-only**: baca commit, migrasi, env tanpa kunci, grant, log, `df -h`, baseline 5xx/502, isi daftar terbuka. Dilarang menulis ke PROD, memutar kunci, menghapus backup, memakai data nyata (`RENCANA:38`).
4. **Gate masuk 0b**: izin tertulis nomor 2 + bukti baca Fase 0 lengkap. **Gate keluar 0b**: lima butir kritis "sudah" + bukti, dan tanda tangan Pelaku (Infrastruktur butir 1-5, 9-14; Keamanan butir 6-8, 11). Urutan kerja: izin → tindakan → bukti → tanda tangan.
5. **Gate keluar Fase 0** (`RENCANA:36`): 14 butir `VERIFIKASI:22-37` "sudah" + bukti; lima kontradiksi `VERIFIKASI:14-18` selesai; lima butir kritis dari 0b "sudah" + bukti; tiga tanda tangan terisi. Kriteria tidak diturunkan. Uji alur penuh tetap di Fase 5.

## B. Format tiga tanda tangan — pengganti `MATRIKS:198-204`

Teks siap disalin untuk `MATRIKS:198-204` (`REVIEW:9,38`; `REVISI2A:41-45`):

```markdown
## Pengesahan dokumen

Dengan menandatangani, pemilik menetapkan semua kolom `Keputusan pemilik` di atas
sebagai keputusan resmi. Dokumen ini mengalahkan dokumen lama untuk item yang sama.

Tanggal pengisian: 24 / 11 / 2026

### Pemilik Produk
- Nama: ________________________________________
- Tanggal: _____________________________________
- Tanda tangan: ________________________________

### Pemilik Infrastruktur
- Nama: ________________________________________
- Tanggal: _____________________________________
- Tanda tangan: ________________________________

### Pemilik Keamanan/Privasi
- Nama: ________________________________________
- Tanggal: _____________________________________
- Tanda tangan: ________________________________

Catatan pemilik (opsional): ________________________________________________
```

Lingkup tanda tangan tetap `RENCANA:135-139`: Produk = keputusan 1-12 dan publish keras; Infrastruktur = butir 1-5, 9-14; Keamanan = butir 6-8, 11.

## C. Perintah di rencana utama — tambahan setelah `RENCANA:9`

Pisahkan laptop dan server. Jumlah pemeriksaan tidak berubah dari `REVISI2A:73-89` (4 di laptop, 6 di server). Hash menggantikan pencetakan kunci.

Laptop Windows, PowerShell (dijalankan Pemilik Produk/Keamanan):

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

## D. Konvensi bukti — pengganti `RENCANA:9`

Buat direktori dari laptop, lalu satu berkas per fase (`REVIEW:38`; `REVISI2A:67-69`):

```powershell
New-Item -ItemType Directory -Force .\docs\bukti-gate-siklus2
```

Isi `docs/bukti-gate-siklus2/fase-N-sesuai.md` untuk N = 0, 0b, 1-6: checklist gate; per bukti, perintah + keluaran atau hash + `path:line`; daftar akun uji `@invalid` tanpa kata sandi; hasil query domain; nama peran dan tanggal tanda tangan. **Dilarang** merujuk folder bukti lain. Tabel per peran Bagian 5 (`RENCANA:156-171`) ditempatkan di `fase-3-sesuai.md` dan `fase-4-sesuai.md`, bukan di berkas lain.

## E. Ringkasan Bagian 8 — pengganti `RENCANA:187-197`

Terjemahan untuk pemula: **provisional** = "sementara", penilaian belum memenuhi syarat terbit; tersimpan sebagai draf, bukan rapor resmi. **Coverage** = seberapa banyak indikator benar-benar dinilai dalam satu aspek; ambang 80%. **N/O** = "Belum diamati", indikator tanpa skor; tidak mengurangi penyebut coverage dan tetap butuh minimal satu indikator berskor. **5xx/502** = kesalahan server di log nginx; jumlahnya dibandingkan dengan baseline butir 13. **Sidik PDF** = sidik jari SHA256 berkas; dipakai untuk membuktikan PDF lama tidak berubah. **Signature dua argumen** = kontrak RPC `get_event_assessment_summary(target_event_id, target_participant_id)`: dua masukan, bukan satu (`RENCANA:115`).

Tindakan pemilik: (1) tanda tangani matriks (`MATRIKS:198-204`); (2) beri izin tertulis untuk 0b sebelum tindakan ke PROD; (3) nyatakan tiap fase sesuai dan bukti tersimpan sebelum fase berikutnya mulai (`AGENTS.md:19-21`).

Isi ringkasan per fase mengikuti `REVISI2A:93-101`, dengan catatan Fase 0b: "Fase 0b membetulkan **lima** prasyarat dengan izin tertulis" (`REVIEW:33`). Gate aplikasi lunak; gate keamanan dan publish rapor tetap keras.

## F. Daftar terbuka — pengganti `RENCANA:173-185`

1. `[TERBUKA-1]` Format pembulatan tampilan di Observasi, Evaluasi, PDF. Tidak menghalangi uji angka mentah `3.5 → 70` (Fase 2a); menghalangi uji tampilan (Fase 2g, 3f) (`RENCANA:78`; `MATRIKS:41`).
2. `[TERBUKA-2]` Definisi "kelompok" dan sumber agregat publik. **Jadi langkah eksplisit sebelum gate keluar Fase 0**: putus dan catat sebelum 14 butir dinyatakan "sudah"; menghalangi 3c dan agregat anon 3e.
3. `[TERBUKA-6]` Penandatangan tiga peran. **Ditutup sebelum Fase 0 masuk** (bagian A nomor 1), bukan sekadar "ditutup di Fase 0".
4. `[TERBUKA-8]` **Dicoret dari daftar terbuka** dan dipindah ke catatan tertutup: Opsi B dipilih, `finalized` ditulis server di 2d (`RENCANA:182`).
5. Nomor lain (`TERBUKA-3,4,5,7,9,10,11`) tetap seperti `RENCANA:177-185`.
6. Aturan prioritas antarberkas revisi: rencana utama menang (lihat pembuka).

## G. Bukti 14 butir dan lima butir kritis

Semua nilai di tabel 14 butir (`RENCANA:40-50`) adalah **nilai yang diharapkan, diisi setelah verifikasi**, bukan hasil. Kolom "sudah" hanya ditulis bila bukti nyata tersimpan (`REVIEW:38`). Butir 6-10 memetakan **lima** butir kritis; butir 11 (monitoring, `VERIFIKASI:34`) tetap di tabel 14 sebagai pemeriksaan baca Fase 0 dan **tidak dimasukkan** tabel 0b (`REVISI2A:33`).

Tabel 0b — pengganti `RENCANA:56-63`, lima baris sesuai `VERIFIKASI:29-33`:

| Kritis | Tindakan | Bukti |
|---|---|---|
| `disable_signup` (`:29`) | set `true` di Auth PROD | konfigurasi + tanggal; pendaftaran ditolak |
| grant `anon` (`:30`) | `revoke` SELECT di dua tabel moderasi | `role_table_grants` = 0 baris untuk `anon` |
| PAT + service-role (`:31`) | putar, `.env.production` mode 600, `pm2 restart --update-env`, cabut lama | tertulis bertanggal + hash; kunci lama 401 |
| domain + TLS (`:32`) | pasang sertifikat, alihkan 8080 | `https://<DOMAIN_HTTPS>/login` 200 + sertifikat; 8080 bukan 200 |
| salinan `auth` (`:33`) | backup harian atau re-create terdokumentasi; cek `.env.bak-20261123-202146` | isi cron + daftar berkas + uji restore; hash `.env.bak` |

`npm audit` (`HANDOVER.md:337,347`) tetap dikerjakan di 0b, tetapi bukan butir kritis; buktinya output 0 kerentanan atau sisa + persetujuan Keamanan. Hitungan "enam butir kritis" di `RENCANA:36,46,119` dibaca **lima butir kritis**.

## H. Fase 6 — pengganti `RENCANA:125-129`

Daftar dokumen di `RENCANA:127` sudah lengkap (13 berkas, termasuk `MATRIKS-RPC-AKSES.md`, `INVENTARIS-JALUR-LAMA.md`, `ALUR-PENILAIAN-KANONIK.md`). Tambahkan dua baris ini tanpa mengurangi daftar:

- **Otoritas status sejak Fase 0** = tabel 14 butir terisi di `VERIFIKASI:22-37` (`RENCANA:129`). Klaim lama dihapus atau ditandai kedaluwarsa.
- **Format tanda tangan status akhir** — pengganti `RENCANA:129` kalimat terakhir:

```markdown
Gate keluar Fase 6: tiga peran menandatangani status akhir.
- Pemilik Produk — Nama: ______ Tanggal: ______ Tanda tangan: ______
- Pemilik Infrastruktur — Nama: ______ Tanggal: ______ Tanda tangan: ______
- Pemilik Keamanan/Privasi — Nama: ______ Tanggal: ______ Tanda tangan: ______
Dengan ini dinyatakan semua dokumen di atas memakai satu versi status produksi
sesuai tabel 14 butir `VERIFIKASI:22-37`.
```
