# Prosedur Retensi Data — V1

Status: **V1 dijalankan sekali pada 25 November 2026** dengan backup segar; tidak ada kandidat, jadi tidak ada data yang dihapus atau diarsipkan. Bukti: `docs/HASIL-RETENSI-PROD.md`. Cron otomatis belum dipasang dan prioritasnya diturunkan pemilik. Berkas ini meresmikan prosedur, bukan klaim bahwa cron sudah berjalan.

Sumber keputusan: `docs/PERSETUJUAN-OWNER-16-PERTANYAAN.md` butir 14 dan 15, `docs/RENCANA-IMPLEMENTASI-KEPUTUSAN.md` Fase 3e, `docs/revisi-siklus3-c.md`, `docs/revisi-siklus4-a.md`, `docs/revisi-siklus5-final.md` A7, dan `docs/revisi-siklus2-c.md` bagian backup.

## 1. Versi

| Versi | Tanggal    | Perubahan                                                                                                                                    | Status                  |
| ----- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| V1    | 2026-11-24 | Versi awal. Angka retensi dari persetujuan owner; aturan skip FK; arsip `private_payload`; dry-run wajib; cron 03:20; backup PII terenkripsi | dijalankan 25 Nov 2026, 0 kandidat; cron belum dipasang |

Perubahan angka retensi atau daftar tabel wajib menaikkan versi dan tanggal. Konfigurasi lama tidak diubah diam-diam.

## 2. Gate masuk

- Persetujuan owner butir 14 dan 15 sudah tercatat (24 November 2026).
- Arsip identitas di `private_payload` sudah disetujui dan buktinya disimpan.
- Tabel `participant_access` sudah terpasang (`20261124130000`); akun dan RPC Peserta (Fase 3d) tetap ditunda sesuai `docs/STATUS-PRODUKSI-SATU-VERSI.md` §3.
- Migrasi `20261124120000_phase3e_public_aggregate_retention_archive.sql` sudah terpasang. Migrasi ini menambah kolom `participants.archived_at` dan tabel arsip `public.retention_identity_archives`. Tidak ada FK yang diubah.
- Backup harian 03:15 berhasil dan terverifikasi sebelum prosedur 03:20 berjalan.

Tanpa semua syarat itu, prosedur tidak boleh dijalankan.

## 3. Angka retensi yang disetujui

| Data                                                                         | Lama simpani                 | Dasar                   | Tindakan setelah lewat                                                                                                |
| ---------------------------------------------------------------------------- | ---------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Surat Mandat (`commissariat-mandates`, `mandate_path`)                       | Sampai hasil seleksi terbit  | Owner butir 14          | Hapus objek setelah `commissariat_submissions.administrative_published_at` terisi dan bukti hasil seleksi tersimpan. **Belum terotomatisasi**; skrip retensi V1 tidak menyentuh objek Storage.        |
| Foto peserta (`submission-photos`, `photo_path`)                             | Sampai rapor tidak tersedia  | Owner butir 14          | Hapus objek saat rapor tidak lagi tersedia (peserta dihapus atau publikasi tidak dapat diakses). **Belum terotomatisasi**; skrip retensi V1 tidak menyentuh objek Storage.                       |
| Nilai dan riwayat (`test_results`, hasil observasi yang bukan arsip wajib)   | 2 tahun                      | Owner butir 14          | Hapus baris lewat `scripts/retention-apply.sql`                                                                       |
| Log audit administrasi/ekspor/publikasi                                      | 5 tahun                      | Owner butir 14          | Baris audit lewat 5 tahun dievaluasi Admin; prosedur V1 **tidak menghapus** tabel audit yang dikecualikan di bagian 4 |
| Backup harian                                                                | 14 hari                      | Owner butir 14          | Hapus berkas lebih tua dari 14 hari, catat nama dan tanggal penghapusan                                               |
| Salinan rahasia skema `auth` (`auth.users`, `auth.identities`, `.env.bak-*`) | 30 hari setelah rotasi kunci | Owner butir 14, Fase 0b | Hapus setelah 30 hari terhitung dari tanggal rotasi, bukan dari tanggal backup. **Riwayat:** rotasi PAT dan service-role key tidak dilakukan sesuai keputusan pemilik; skema `auth` tidak masuk backup harian otomatis. Salinan penuh ada di workstation di luar repo. Lihat `docs/STATUS-PRODUKSI-SATU-VERSI.md`.                                        |

"Log audit 5 tahun" berarti data audit dipertahankan minimal 5 tahun. Penghapusan setelah itu memerlukan keputusan tertulis baru dan versi prosedur berikutnya.

## 4. Tabel yang dikecualikan dari delete

Tabel ini tidak dihapus barisnya oleh prosedur V1, termasuk saat pesertanya sudah melewati masa retensi:

1. `public.assessment_snapshots` — immutable (trigger `20261112170000:330-331`).
2. `public.assessment_snapshot_private_sources` — immutable, `private_payload` asli (`:332-333`).
3. `public.assessment_report_publications`.
4. `public.assessment_report_publication_audit` — audit publikasi.
5. `public.assessment_export_audit` — audit ekspor.
6. `public.collective_evaluations`.
7. `public.assessment_moderations`.
8. `public.development_recommendations`.
9. `public.observation_revisions`.
10. `public.participant_access` — `participant_id` tidak dihapus (FK `NO ACTION` dari Fase 3d).

`test_results` **tidak** termasuk daftar dikecualikan. Barisnya dihapus lebih dulu saat lewat 2 tahun agar FK `on delete restrict` tidak menggagalkan penghapusan peserta. FK tidak diubah menjadi cascade atau set null.

## 5. Aturan kandidat dan skip

Kandidat hapus peserta: `events.ends_on < current_date - interval '2 years'` **atau** ada `commissariat_submissions` dengan status `administrative_published` dan `administrative_published_at` lebih tua dari 2 tahun.

Peserta kandidat **diskip dari delete** bila masih memiliki turunan pada salah satu tabel di bagian 4, atau memiliki `observation_revisions` lewat `observations`. Untuk yang diskip:

1. Identitas disalin ke `public.retention_identity_archives.private_payload` (`display_name`, `commissariat`, `student_number`, `group_name`, `account_user_id`, `created_at`). Tabel ini RLS dan tanpa grant untuk `anon`/`authenticated`.
2. `participants.archived_at = now()`.
3. `participants.account_user_id = null`.
4. `participant_access.account_user_id = null` **dan** `participant_access.encrypted_password_at_link = null` (`revisi-siklus5-final.md` A7).

Peserta kandidat tanpa turunan restrict dihapus. Turunan cascade (`assessment_submissions`, `observer_notes`, `observations`, `commissariat_submission_participants`) mengikuti. `observation_revisions` yang masih melekat membuat peserta diskip, sehingga riwayat tidak ikut terhapus.

Baris yang sudah punya `archived_at` tidak diarsipkan ulang; `insert ... on conflict do nothing` menjaga ini tetap idempoten.

## 6. Dry-run wajib

Jalankan di DEV atau salinan PROD. Jangan menjalankan terhadap produksi langsung tanpa izin tertulis.

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/retention-dry-run.sql \
  | tee docs/bukti-gate-siklus2/retensi-dry-run-$(date +%F).txt
```

Dry-run membungkus seluruh simulasi dalam transaksi yang di-`ROLLBACK`. Bukti yang harus ada:

- `count(*)` sebelum = sesudah simulasi untuk `assessment_snapshots`, `assessment_report_publications`, `assessment_report_publication_audit`, `assessment_export_audit`, `collective_evaluations`, `participant_access`, dan `participants`.
- Baris `aman = true` untuk setiap pasangan jumlah di atas.
- Sidik PDF identik: `sha256sum` setiap PDF hasil unduhan sama dengan `docs/baseline-pdf-sha256.csv`. Di Windows: `Get-FileHash .\<file>.pdf -Algorithm SHA256`. Simpan outputnya berdampingan dengan berkas dry-run. Hash `snapshot_data` tidak dihitung ulang. Sejak 27 November 2026 ada tiga baris untuk snapshot `39d48a66-…` revision 1: `35281c2d…` untuk PDF immutable hasil generator lama, `24074c18…` (commit `03db8dd`) untuk layout v2, dan `25e4cb95…` (commit `ecf842a`) untuk generator dengan grafik dan ringkasan cakupan. Cocokkan PDF restore dengan baris sesuai versi generatornya; jangan menimpa baris lama.
- Daftar peserta yang diskip dan yang dihapus (jumlah, bukan nama, bila dibagikan).

Bila ada satu saja angka berubah atau sidik PDF beda, gate gagal. Jangan lanjut ke apply.

## 7. Eksekusi nyata dan cron

```cron
# /etc/cron.d/imm-db-backup
15 3 * * * ubuntu /home/ubuntu/imm-app/scripts/backup-daily.sh >> /var/log/imm-backup.log 2>&1

# /etc/cron.d/imm-retention
20 3 * * * ubuntu /home/ubuntu/imm-app/scripts/retention-dry-run.sh >> /var/log/imm-retention.log 2>&1
20 3 * * * ubuntu /home/ubuntu/imm-app/scripts/retention-apply.sh >> /var/log/imm-retention.log 2>&1
```

Urutan: backup 03:15 selesai dan terverifikasi → dry-run 03:20 → apply 03:20. `retention-apply.sql` berisi `BEGIN`/`COMMIT` dan pemeriksaan ulang jumlah tabel dikecualikan; bila berubah, transaksi di-rollback. Log harian disimpan, bukan dihapus oleh retensi.

Kredensial dibaca dari `/home/ubuntu/imm-app/.env.production` mode 600 lewat `SUPABASE_SERVICE_ROLE_KEY`. Tidak ada kunci di repo, di frontend, atau di berkas cron. **Riwayat:** Fase 0b tidak memutar kunci sesuai keputusan pemilik; lihat `docs/STATUS-PRODUKSI-SATU-VERSI.md` §3.

## 8. Backup PII

- Format: dump SQL dienkripsi dengan `age` (X25519) atau `gpg --encrypt --recipient`; direktori aplikasi dan berkas PDF memakai `restic` dengan repositori terenkripsi, atau media LUKS untuk salinan offline.
- Kunci: hanya di workstation Infrastruktur dan satu media offline. Tidak di server, tidak di `.env`, tidak di git.
- Akses: grup Unix `imm-backup` berisi Infrastruktur dan Keamanan. Direktori backup `chgrp imm-backup` dan `chmod 0770`. Semua akses administratif lewat `sudo` dan tercatat di log.
- Retensi: hapus berkas lebih tua dari 14 hari dengan `find <direktori> -type f -mtime +14 -delete`; setiap penghapusan dicatat (nama, ukuran, hash, tanggal, pelaku).
- Salinan rahasia `auth`: **tidak** ikut backup harian otomatis. Salinan penuh disimpan manual di workstation di luar repo. Rotasi kunci tidak dilakukan sesuai keputusan pemilik, sehingga hash kunci baru belum tersedia. Lihat `docs/STATUS-PRODUKSI-SATU-VERSI.md` bagian 1 dan 3.

## 9. Kriteria restore lengkap

Restore dinyatakan berhasil hanya bila semua berikut terpenuhi dan exit code 0:

1. `age -d` atau `gpg --decrypt` berhasil; `restic check` tidak melaporkan error.
2. Restore percobaan ke lokasi terpisah exit 0.
3. `schema_migrations` lengkap sampai versi terpasang.
4. `auth.users` dan `auth.identities` ada dan jumlahnya sesuai sumber.
5. Hash `.env.production` hasil restore sama dengan hash sebelum backup.
6. `count(*)` per tabel hasil restore sama dengan sumber, termasuk tabel dikecualikan di bagian 4.
7. Sidik PDF hasil restore sama dengan baris yang sesuai di `docs/baseline-pdf-sha256.csv` (`35281c2d…`, `24074c18…`, atau `25e4cb95…`).

Uji restore wajib sebelum gate Fase 5 butir 4. Bukti bersifat tertulis bertanggal; tidak memakai nama penandatangan.

## 10. Rollback

`retention-apply.sql` berada dalam satu transaksi. Bila post-check gagal, `ROLLBACK` otomatis mengembalikan baris. Untuk rollback setelah commit, restore dump terenkripsi dari backup 03:15 ke database sementara, cocokkan kriteria bagian 9, lalu lakukan restore terencana sesuai `docs/RENCANA-IMPLEMENTASI-KEPUTUSAN.md` bagian 5. Jangan menghapus direktori rollback atau berkas backup yang masih dalam retensi.

## 11. Batasan V1

- Prosedur ini tidak menghapus snapshot, bukti, atau catatan yang dikecualikan.
- Prosedur ini tidak mengubah RLS, grant, FK, atau trigger immutable.
- Satu-satunya grant `anon` baru di Fase 3e adalah `execute` untuk `get_public_event_aggregate(uuid)`.
- Berkas SQL di `scripts/` belum dijalankan terhadap database mana pun.
