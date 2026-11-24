# Revisi A — Siklus 1

Pengganti bagian Fase 0, 1, 5, 6, Rollback, Pembaruan dokumen, Daftar terbuka, dan Ringkasan per fase di `docs/RENCANA-IMPLEMENTASI-KEPUTUSAN.md`. Rencana utama tidak diubah. Semua path:line merujuk dokumen per 24 November 2026.

Aturan gate masuk seragam: **pemilik menyatakan fase sebelumnya sesuai dan bukti tersimpan** (`AGENTS.md:19-21`, `docs/REVIEW-SIKLUS-1.md:23`). Tanpa itu, fase berikutnya tidak dimulai.

Catatan diterima 24 November 2026: "aplikasi jangan terlalu ketat dalam guard/gate". Ini hanya **gate aplikasi** (coverage, moderasi, publish, finalisasi): boleh jadi peringatan/provisional bila aman. **Gate keamanan/proses** (RLS, privasi, Fase 0, tanda tangan matriks, 14 butir verifikasi produksi) tetap keras, tidak dilonggarkan.

---

## Pengganti Fase 0 — Prasyarat, read-only

Gate masuk: tidak ada fase sebelumnya. Prasyarat: pemilik menandatangani matriks (`docs/MATRIKS-KEPUTUSAN-PRODUK.md:201-203`, keputusan 10 di `:165-166`).

Gate keluar: 14 butir `docs/VERIFIKASI-PRODUKSI-YANG-BELUM-DILAKUKAN.md:22-37` berstatus "sudah" dengan bukti; lima kontradiksi `:14-18` terselesaikan; **enam butir kritis berstatus "sudah" dan berbukti**: `disable_signup` (`:29`), grant `anon` dicabut (`:30`), rotasi PAT/service-role (`:31`), `npm audit` (`HANDOVER.md:337,347`), domain + TLS (`:32`, `docs/DEPLOYMENT.md:19`), salinan rahasia `auth` (`:33`). Status "belum" menggagalkan gate, bukan sekadar dicatat. Ini gate keamanan/proses; tidak dilonggarkan.

Kerja (read-only; tidak ada penulisan ke PROD):

1. `[IZIN]` Pemilik Produk menandatangani matriks di `:201-203`.
2. `[IZIN]` Pemilik Infrastruktur mengisi 14 butir `:22-37` dengan bukti: `git rev-parse HEAD`, `schema_migrations`, env tanpa mencetak kunci, grant, log nginx, `df -h`.
3. Selesaikan lima kontradiksi `:14-18` menjadi satu versi status.
4. `[IZIN]` Pemilik Keamanan/Privasi membuktikan enam butir kritis di atas. Konfirmasi rotasi kunci tanpa mencetak kunci.
5. **Verifikasi `.env.bak-20261123-202146`** di server (nama, ukuran, hash; jangan buka isi). Bila tidak ada, alternatif: salinan `.env.production` baru di gate masuk Fase 5, sebelum migrasi. Catat di `:22-37`.
6. Rekam **baseline angka rasio 5xx/502 nginx** dari log pasca-deploy terakhir (`docs/VERIFIKASI-PRODUKSI-YANG-BELUM-DILAKUKAN.md:36`): waktu, total request, jumlah 5xx/502, persentase. Dipakai gate keluar Fase 5.
7. Isi daftar `[TERBUKA]` (lihat bagian Daftar terbuka). Tandai mana yang menghalangi Fase 1/3/5.

Dilarang di Fase 0: menulis ke PROD, memutar kunci, menghapus backup, memakai data peserta nyata. Butir lama "ulang uji alur penuh di PROD" dipindah ke Fase 5 langkah 8 karena ia menulis data.

---

## Pengganti Fase 1 — Baseline DEV, tanpa fitur baru

Gate masuk: pemilik menyatakan Fase 0 sesuai, bukti tersimpan. Gate keluar: baseline tersimpan, alat verifikasi hijau, hash PDF immutable tercatat.

- Pastikan `20261123130000` terpasang di DEV dan jalankan 7 penguji SQL di `supabase/tests/`.
- Uji browser yang belum: konflik dua penilai, N/O sampai Evaluasi, finalize/publish/ekspor, RLS lintas peran, sesi kedaluwarsa (`docs/HASIL-UJI-BROWSER-DEV.md:42-53`).
- **Pisahkan dua kelompok PDF.**
  - **PDF snapshot immutable** (sudah terbit): wajib identik. Hitung `sha256sum` PDF **dan** `sha256` `snapshot_data`, simpan di `docs/baseline-pdf-sha256.csv` (dibuat di sini) beserta `snapshot_id`, `revision`, baris audit. Ini pembanding sah; Fase 1 tidak boleh membuat snapshot baru untuk ini.
  - **PDF alur uji Fase 1**: boleh berbeda karena dibuat dengan rumus lama. Catat hashnya terpisah, jangan dipakai sebagai pembanding immutable.
- Gate keluar Fase 2 (revisi B) membandingkan hash PDF immutable dengan `docs/baseline-pdf-sha256.csv` (cukup disebut di sini untuk koordinasi).
- `npm run check` dan `npm run build` hijau.
- "Tidak ada data nyata" diganti terukur: hanya akun `@invalid`/QA simulasi dipakai; tanpa email, NIM, foto, atau nilai peserta nyata (`docs/QA_PHASE8_TEST_PLAN.md:4-6,250`). Bukti: daftar akun uji + hasil query domainnya.

---

## Sisipan langkah kerja keputusan 7 dan 11

Taruh sebagai butir baru di Fase 3 DEV (3f/3g). Keduanya punya gate dan kriteria bisa dicek.

**3f. Keputusan 7 — impor `.xlsx`, riwayat + pilihan Admin, PDF tetap** (`docs/MATRIKS-KEPUTUSAN-PRODUK.md:112-122`). Gate masuk: daftar terbuka nomor 1 (pembulatan) diputus. Kerja: pertahankan batas 5 MB/500 baris/50 kolom dan pencocokan nama + komisariat (`app/dashboard/impor-tes/actions.ts:9-11,190-204`); impor hanya Admin Sistem (`:29-32`); duplikat jadi riwayat `is_current`, Admin memilih nilai aktif (`:153-181`); rapor tetap PDF browser + web, ruang pengesahan kosong. Gate keluar: impor ulang dua duplikat menghasilkan dua baris riwayat dan satu nilai aktif pilihan Admin; PDF masih terbuka; `npm run check` hijau. Bukti: screenshot wizard + baris `test_imports`.

**3g. Keputusan 11 — rubrik trial dibedakan dari rubrik resmi** (`docs/MATRIKS-KEPUTUSAN-PRODUK.md:171-181`). Gate masuk: Koordinator Instruktur menyetujui silabus/rubrik resmi; bila belum, pakai template trial bertanda. Kerja: beri penanda trial pada `competency_frameworks` dan `rubric_versions` (`BLUEPRINT.md:40`), tanpa mengubah snapshot lama berisi `framework_version_ids`/`rubric_version_ids` (`BLUEPRINT.md:28,58`). Gate keluar: daftar rubrik berlabel "trial"/"resmi"; perubahan memakai versi baru; hash di `docs/baseline-pdf-sha256.csv` tetap cocok. Bukti: screenshot daftar rubrik + diff hash.

---

## Pengganti Fase 5 — Deploy PROD dan uji ulang

Gate masuk (semua berstatus sudah + bukti, diverifikasi satu per satu; ini gate keamanan/proses, tidak dilonggarkan):

1. Pemilik menyatakan Fase 1-4 sesuai, bukti tersimpan.
2. Izin tertulis Pemilik Produk dan Infrastruktur.
3. Enam butir kritis Fase 0 masih "sudah"; TLS aktif sebelum kredensial Peserta dipakai.
4. **Backup terverifikasi SEBELUM migrasi**: dump `pre-migration-*.sql`, direktori `imm-app.bak-$(date +%F)`, hash `.env.production`, salinan `auth`. Uji restore terpisah, catat hasilnya.
5. `.env.bak-20261123-202146` terverifikasi atau alternatif Fase 0 butir 5 dipakai.
6. Rotasi kunci yang dipakai deploy sudah dilakukan dan tercatat tanpa mencetak kunci. **Gate ini harus lolos sebelum `pm2 restart imm`.**

Urutan (backup mendahului migrasi):

1. Backup (gate 4): verifikasi ukuran dan hash sebelum migrasi.
2. Pasang migrasi baru + penguji SQL.
3. rsync **tanpa `--delete` dan tanpa `--delete-excluded`** (`docs/DEPLOYMENT.md:35-39`).
4. `npm ci --include=dev` → `npm run build`.
5. Rotasi kunci (gate 6 di atas), lalu `pm2 restart imm`.
6. **Smoke 8080**: `curl -s -o /dev/null -w "%{http_code}" http://43.173.33.195:8080/` harus **HTTP 200**, dan halaman login serta dashboard QA simulasi tampil saat login dengan akun `@invalid` (`docs/DEPLOYMENT.md:16,19,82-93`).
7. Uji RPT-001..005 dan alur penuh dengan akun QA simulasi (`docs/QA_PHASE8_TEST_PLAN.md:183-187`).
8. Ulangi uji alur penuh di PROD sesuai keputusan 10 (`docs/MATRIKS-KEPUTUSAN-PRODUK.md:165-166`), memakai akun QA simulasi, bukan data peserta nyata.

Gate keluar: 14 butir diisi ulang; rasio 5xx/502 **tidak lebih tinggi dari baseline angka Fase 0 butir 6** (bukan "tidak ada 5xx baru" tanpa pembanding); bukti uji per peran dan smoke 8080 terkumpul; hash PDF immutable masih cocok.

---

## Pengganti Fase 6 — Penutupan dokumen

Gate masuk: pemilik menyatakan Fase 5 sesuai, bukti tersimpan.

Perbarui daftar lama ditambah empat berkas ini: `docs/VERIFIKASI-PRODUKSI-YANG-BELUM-DILAKUKAN.md`, `docs/RENCANA-IMPLEMENTASI-KOREKSI-ALUR.md`, `docs/PETA-ALUR-PENILAIAN.md`, `docs/QA_PHASE8_TEST_PLAN.md`, di samping `BLUEPRINT.md:45-48,57,70`, `HANDOVER.md:461-479`, `IMPLEMENTATION_PLAN.md:15-21,37,44-46`, `docs/DEPLOYMENT.md:23-29,59-65`, `docs/LANGKAH-PASANG-MIGRASI-DAN-UJI.md:9,96-103`, `docs/KEPUTUSAN-KOREKSI-ALUR.md:3,76-78`.

Kriteria selesai: satu versi status produksi. Tidak ada klaim "belum ada migrasi", "deploy ditunda", "database kosong", "belum ada admin" yang bertentangan (`docs/VERIFIKASI-PRODUKSI-YANG-BELUM-DILAKUKAN.md:14-18`, `docs/DEPLOYMENT.md:23-29`). `docs/QA_PHASE8_TEST_PLAN.md:72,279` (RPT-001..005 dihentikan) diperbarui setelah akun Peserta tersedia atau diberi catatan status. Gate keluar: pemilik menandatangani status akhir.

---

## Pengganti Bagian Rollback

Backup wajib **sebelum** migrasi (Fase 5 gate 4): dump, direktori aplikasi, hash `.env.production`, salinan `auth`. Rollback memulihkan kondisi persis sebelum migrasi:

1. Hentikan deploy, restore dump dalam satu transaksi, kembalikan direktori aplikasi dari `imm-app.bak-*`, kembalikan `.env.production` dari `.env.bak-20261123-202146` atau salinan gate Fase 5, verifikasi hashnya.
2. `npm ci && npm run build && pm2 restart imm`, lalu smoke 8080 harus HTTP 200.
3. Bila migrasi gagal, jangan hapus baris historis. Bila RPC error, restore definisi lewat `create or replace` atau `drop function` untuk signature baru; grant mengikat signature (`docs/DEPLOYMENT.md:44-53`).
4. Bila rekap terpotong, restore `PGRST_DB_MAX_ROWS=100000` dan buat ulang container `rest`; pakai salinan yang sudah diverifikasi di Fase 0 butir 5.
5. Jangan hapus direktori rollback. Bukti restore wajib disimpan.

---

## Pengganti Bagian Pembaruan dokumen

Lihat Fase 6. Pemilik dokumen: Pemilik Produk untuk status, Pemilik Infrastruktur untuk angka dan backup, Pemilik Keamanan untuk enam butir kritis. Satu daftar status, tanpa duplikasi klaim.

---

## Pengganti Bagian Daftar terbuka

Satu daftar bernomor di sini. Bagian lain merujuk nomor ini; hapus `[TERBUKA]` yang tersebar di Fase 0, 2d, 3a-3e.

1. Pembulatan angka tampil di Observasi, Evaluasi, PDF, snapshot. Menghalangi uji "3.5 → 70". Rujuk Fase 1, 3f.
2. Definisi "kelompok" untuk ambang 10. Menghalangi RPC Fase 3c; gate keluar Fase 0.
3. Kewenangan ekspor Bidang Kader. Rujuk Fase 3a; putuskan sebelum Fase 3a.
4. Arsip identitas di dalam snapshot saat data operasional dihapus. Rujuk Fase 3e.
5. Jalur revisi evaluasi tanpa melanggar status `finalized` dan index unik. Rujuk Fase 2d.
6. Penanggung jawab penandatanganan matriks dan **siapa yang memberi izin produksi**. Rujuk Fase 0 butir 1, Fase 5 gate 2, Fase 6.
7. Filter `target_participant_id` dan aturan RPC empat definisi (`docs/REVIEW-SIKLUS-1.md:29,60`) — koordinasikan dengan revisi B/C.

---

## Ringkasan per fase (bahasa pemilik)

Gate aplikasi = peringatan/provisional bila aman; gate keamanan/proses = wajib keras (lihat catatan atas).

- **Fase 0 (gate keamanan):** Tombol belum berubah. Tampil: 14 pemeriksaan produksi + lima kontradiksi status. Bisa diulang: baca commit, migrasi, TLS, log 5xx/502 tanpa mengubah apa pun.
- **Fase 1:** Tombol belum berubah. Tampil: angka baseline dan hash PDF di `docs/baseline-pdf-sha256.csv`. Bisa diulang: unduh PDF lama, cocokkan hash.
- **Fase 3 (3f/3g):** Tombol impor ulang ada dengan pilihan nilai Admin; rubrik berlabel trial/resmi. Tampil: riwayat nilai, daftar rubrik. Bisa diulang: impor duplikat dua kali, lihat riwayat.
- **Fase 5:** Gate aplikasi: Kirim/Finalisasi jadi peringatan, penghitung "X dari Y" informasi, coverage provisional. Gate keamanan/proses tetap: RLS, 14 butir, TLS, rotasi kunci, backup, HTTP 200, rasio 5xx/502 tidak melebihi baseline. Bisa diulang: smoke 8080 dan uji per peran dengan akun `@invalid`.
- **Fase 6:** Tombol tidak berubah. Tampil: satu status produksi di semua dokumen. Bisa diulang: cari "ditunda"/"belum" yang bertentangan; harus tidak ada.
