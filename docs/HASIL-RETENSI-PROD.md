# Hasil Retensi V1 di Produksi

Tanggal: 25 November 2026. Perintah dijalankan pemilik lewat sesi ini. Tidak ada deploy kode. Backup database segar dibuat sebelum prosedur.

## Backup

`/home/ubuntu/imm-db-backups/pre-retensi-20261125-100810.sql`, 2.252.038 byte, `pg_dump` penuh.

## Dry-run

Skrip: `scripts/retention-dry-run.sql`. Output lengkap: `docs/bukti-gate-siklus2/retensi-dry-run-20261125.txt`.

Hasil:

- Gate tabel dikecualikan: `aman = true`.
- Kandidat retensi: 0 peserta. `diskip_diarsipkan = 0`, `dihapus = 0`.
- Jumlah sebelum sama dengan sesudah simulasi: snapshot 5, publikasi 2, audit publikasi 2, audit ekspor 2, evaluasi 7, `participant_access` 0, peserta 48, `test_results` 0, arsip identitas 0.
- Transaksi dry-run di-`rollback`.

## Apply

Skrip: `scripts/retention-apply.sql`. Output lengkap: `docs/bukti-gate-siklus2/retensi-apply-20261125.txt`.

Hasil:

- `INSERT` arsip identitas: 0.
- `UPDATE` peserta: 0.
- `UPDATE participant_access`: 0.
- `DELETE test_results`: 0.
- `DELETE participants`: 0.
- Gate dalam transaksi lolos; `COMMIT`.
- Jumlah akhir sama dengan awal: snapshot 5, publikasi 2, audit publikasi 2, audit ekspor 2, evaluasi 7, `participant_access` 0.

## Pemeriksaan setelahnya

- pm2 `imm` online, PID `3214883`.
- Smoke HTTP 8080: `/` dan `/dashboard` → 200.
- Tidak ada 5xx pada 20 permintaan terakhir di log nginx.

## Catatan

- Tidak ada data yang terhapus atau diarsipkan karena belum ada peserta yang memenuhi kriteria 2 tahun.
- Penjadwalan otomatis `/etc/cron.d/imm-retention` **belum dipasang**. Prosedur dan skrip sudah tersedia, tetapi pemasangan cron belum dilakukan karena memerlukan keputusan terpisah untuk perubahan sistem.
- `scripts/retention-apply.sql` bersifat destruktif bila ada kandidat. Jalankan hanya setelah backup dan dry-run lolos.
