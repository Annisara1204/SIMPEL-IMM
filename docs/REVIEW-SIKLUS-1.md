# Review Siklus 1 — Rencana Implementasi Keputusan

Arsip temuan tiga reviewer terhadap `docs/RENCANA-IMPLEMENTASI-KEPUTUSAN.md` versi siklus 1. Temuan ini menjadi dasar revisi siklus 2. Tidak ada kode atau data yang diubah.

## Skor reviewer

| Reviewer | Skor | Kesimpulan singkat |
|---|---|---|
| Kelayakan eksekusi | 4/10 | Backup setelah migrasi membuat rollback palsu; Fase 0 memerintahkan penulisan PROD; daftar dokumen status belum lengkap; keputusan 7 dan 11 hilang dari langkah kerja |
| Keamanan dan privasi | 5/10 | IoT masih bisa lewat API; RPC Komisariat tanpa filter; `participant_access` tanpa RLS; gate prasyarat hanya tinjauan, bukan remediasi; TLS belum jadi syarat kredensial |
| Teknis | 5/10 | Backup setelah migrasi; `participant_access` tidak pernah diisi; nomor revisi adalah kode mati; perbaikan skor dan coverage tanpa uji otomatis |

## Temuan kelayakan eksekusi

- `[BLOCKER]` Urutan deploy membuat rollback mustahil. Migrasi dipasang lebih dulu, baru dump diambil. Pindahkan backup ke sebelum migrasi. (Fase 5, Bagian 4)
- `[BLOCKER]` Fase 0 melarang diri sendiri. Butir 6 memerintahkan uji alur penuh di PROD yang menulis, sementara baris berikutnya melarang penulisan. Tandai `[IZIN]` atau pindahkan ke Fase 5.
- `[BLOCKER]` "Satu versi status" tidak tercapai. Tambahkan `VERIFIKASI-PRODUKSI...`, `RENCANA-IMPLEMENTASI-KOREKSI-ALUR.md`, `PETA-ALUR-PENILAIAN.md`, dan `QA_PHASE8_TEST_PLAN.md` ke Fase 6.
- `[MAJOR]` Keputusan 7 (impor/PDF) dan 11 (rubrik trial) hanya ada di tabel, tanpa langkah kerja.
- `[MAJOR]` Keputusan 5 hanya setengah. `max+1` tidak terpakai karena evaluasi sudah `finalized` dan index unik melarang baris kedua.
- `[MAJOR]` Definisi "kelompok" menghalangi Fase 3c. Jadikan gate masuk.
- `[MAJOR]` Pembulatan dipakai seolah sudah diputus pada uji "3.5 → 70".
- `[MAJOR]` Penandatangan matriks tidak bisa dilakukan karena penanggung jawab masih terbuka.
- `[MAJOR]` Tidak ada gate "pemilik menyatakan tahap ini sesuai" di Fase 1-4 dan 6.
- `[MAJOR]` Fase 2, 3, 4, dan 6 tidak punya gate masuk eksplisit.
- `[MAJOR]` Bukti "snapshot lama tidak berubah" tidak punya artifact dan lokasi.
- `[MAJOR]` Baseline PDF dari Fase 1 bukan pembanding yang sah karena Fase 1 membuat snapshot baru dengan rumus lama. Pisahkan PDF snapshot immutable dari PDF uji.
- `[MAJOR]` "Tidak ada 5xx baru" tanpa baseline angka dari Fase 0.
- `[MAJOR]` `.env.bak-20261123-202146` dipakai rollback tetapi tidak diverifikasi keberadaannya.
- `[MAJOR]` Dua aturan RPC bertabrakan: "jangan ubah 17 kontrak" versus "drop function bila signature berubah".
- `[MAJOR]` Lima kontradiksi status tanpa kriteria selesai.
- `[MAJOR]` RPT-001..005 tidak menguji kedaluwarsa dan ganti kata sandi pertama.
- `[MAJOR]` Fase 3e tanpa nama file prosedur dan tanpa bukti cron/salinan `auth`.
- `[MINOR]` Rencana terlalu teknis untuk pemilik; tambahkan ringkasan kriteria "selesai" per fase.
- `[MINOR]` Daftar `[TERBUKA]` tidak konsisten: 4 di Fase 0, 6 di Bagian 7.
- `[MINOR]` "Tidak ada data nyata" sulit dibuktikan; ganti dengan kriteria akun `@invalid`/QA.
- `[MINOR]` Dampak kategori skor tidak diuji.
- `[MINOR]` Lokasi baseline tidak ditentukan.
- `[MINOR]` "Smoke 8080" tanpa kriteria HTTP 200.

## Temuan keamanan dan privasi

- `[BLOCKER]` Fase 3b masih mengandalkan penyembunyian menu. `can_access_observation` (`20261106200000:13-16`) tetap memberi IoT akses lewat API. Jadikan pembatasan policy sebagai gate keluar Fase 3.
- `[BLOCKER]` RPC Komisariat tidak disebut memfilter komisariat pemanggil. Tambahkan `is_commissariat_member`/`commissariat_id` di badan fungsi.
- `[BLOCKER]` `participant_access` tidak punya RLS/grant. Aktifkan RLS, `revoke` dari `authenticated`/`anon`, akses Peserta hanya lewat RPC.
- `[BLOCKER]` Gate Fase 0 hanya "tinjauan tertulis", bukan remediasi. Butir kritis A1/A5/A7/A8/TLS/backup `auth` harus berstatus sudah dengan bukti.
- `[BLOCKER]` TLS bukan syarat sebelum akun kata sandi Peserta dibuat. Jadikan gate masuk Fase 3d dan Fase 5.
- `[MAJOR]` Kewenangan ekspor Kader/Istruktur masih terbuka di `laporan/actions.ts:78` dan `20261112180000:192`. Putuskan sebelum Fase 3a.
- `[MAJOR]` Ambang 10 tidak bisa diimplementasi tanpa definisi "kelompok". Gate keluar Fase 0.
- `[MAJOR]` Grant/EXECUTE RPC agregat tidak ditentukan: `revoke all ... from public`, grant ke `authenticated` untuk komisariat dan `anon` untuk publik.
- `[MAJOR]` `expires_at` belum menjadi syarat RPC rapor. Tulis `pa.revoked_at is null and pa.expires_at > now()`.
- `[MAJOR]` `must_change_password` hanya kolom tanpa penegakan. Tambah mekanisme server-side.
- `[MAJOR]` Pembuatan baris `participant_access` tidak dijelaskan. Harus terjadi di `assign_participant_account` dalam satu transaksi.
- `[MAJOR]` Rotasi kunci tidak menjadi gate deploy. Tambah ke Fase 5 sebelum `pm2 restart`.
- `[MAJOR]` Arsip identitas di snapshot privat belum diputus tapi retensi sudah direncanakan.
- `[MAJOR]` Backup berisi PII tanpa enkripsi, lokasi, retensi, dan uji restore.
- `[MAJOR]` Uji RLS per peran bukan syarat kegagalan gate. Tambah bukti respons HTTP/sql per peran.
- `[MINOR]` Distribusi keputusan pada sel kecil masih bisa mengungkap individu.
- `[MINOR]` Kontradiksi uji PROD di Fase 0.
- `[MINOR]` Prosedur retensi tanpa mekanisme eksekusi dan daftar tabel yang dikecualikan.
- `[MINOR]` Filter `target_participant_id` berpotensi mengubah kontrak RPC.
- `[MINOR]` Audit publish tidak diverifikasi ulang setelah perubahan peran; cek tiga pemanggil dan `actor_id`.

## Temuan teknis

- `[BLOCKER]` Backup setelah migrasi, sama seperti temuan kelayakan. Contoh: `20261123130000` mengubah 11 baris.
- `[BLOCKER]` `participant_access` tidak punya jalur pembuatan. `assign_participant_account` hanya menulis `participants.account_user_id`; setelah migrasi semua peserta kena `P0002`. Upsert di RPC atau fallback.
- `[BLOCKER]` RPC agregat tanpa pemeriksaan hak akses dan grant/revoke eksplisit.
- `[MAJOR]` Nomor revisi adalah kode mati karena fungsi hanya menerima evaluasi `draft`.
- `[MAJOR]` Fase 3a memerintahkan penyuntingan migrasi lama. Harus migrasi baru `create or replace`.
- `[MAJOR]` Fase 4 mengubah kontrak yang dilarang diubah. Tulis paket eksplisit: drop, recreate dengan argumen opsional, ulangi grant, uji 4 pemanggil.
- `[MAJOR]` Gate "angka Observasi sama Evaluasi" tidak tercapai umum karena normalisasi bobot berbeda. Batasi ke kasus cakupan lengkap.
- `[MAJOR]` Rumus skor baru tanpa `tests/scoring.test.ts`.
- `[MAJOR]` Penguji SQL hanya memeriksa nama di `pg_proc`, bukan perilaku.
- `[MAJOR]` `must_change_password` tidak ditegakkan.
- `[MAJOR]` String alasan coverage menjadi "1/3 indikator valid" walau coverage 100%. Tambah `coverageDenominator` ke `AspectAggregate`.
- `[MAJOR]` Tombol finalisasi Observer hilang tanpa pengganti; `finalized_count` selalu 0 dan status Admin tidak pernah "Finalized".
- `[MAJOR]` Definisi "kelompok" belum ada tapi RPC dijadwalkan.
- `[MAJOR]` `publishReport` hanya menerima `snapshotId`, bukan `event_id`; jadikan SQL otoritas atau tambah lookup eksplisit.
- `[MINOR]` Variabel `next_revision` belum dideklarasikan di blok `declare`.
- `[MINOR]` Jebakan reuse `notObservedIndicators` yang menghitung indikator berskor juga.
- `[MINOR]` Timestamp migrasi baru terlalu longgar; tetapkan > `20261123130000`.
- `[MINOR]` Fase 3b menduplikasi gate yang sudah ada di halaman Evaluasi dan Laporan; ekstrak helper bersama.
- `[MINOR]` Kasus uji N/O tidak menentukan ambang.
- `[MINOR]` Penunjuk baris `assessment-actions.ts` dan `submission-controls.tsx` sedikit meleset.
- `[MINOR]` Fase 2e menggambarkan gate RPC secara tidak lengkap; jangan "hanya memakai", tapi "verifikasi gate lama tidak ada".
- `[MINOR]` Tidak ada uji regresi hash PDF di Fase 2.

## Keputusan revisi siklus 2

Tiga agen revisi memperbaiki tiga kelompok bagian: Fase 0/1/5/6 dan gate, Fase 2 dan pengujian skor, serta Fase 3/4 dan keamanan. Hasilnya digabungkan menjadi `docs/RENCANA-IMPLEMENTASI-KEPUTUSAN.md` versi siklus 2, lalu dikirim ke reviewer baru.
