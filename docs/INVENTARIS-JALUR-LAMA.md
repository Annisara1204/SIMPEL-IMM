# Inventaris jalur lama penilaian

Dibuat 24 November 2026 pada branch `research/peta-alur-penilaian`.
Tujuan: daftar lengkap objek dan jalur lama yang masih hidup berdampingan dengan alur Phase 5/6, supaya pemilik bisa memilih mana yang dimatikan.

Batas pemeriksaan awal: hanya membaca berkas di repo. Karena itu semua angka jumlah baris, jumlah duplikat, dan isi baris lama ditulis **tidak diverifikasi**. Bukti asal berupa `path:line` dari repo. Pembaruan 24 November memakai hasil Fase 4 di DEV, bukan pemeriksaan produksi. Otoritas status ada di `docs/STATUS-PRODUKSI-SATU-VERSI.md`; bukti pembersihan ada di `docs/HASIL-FASE4-DEV.md`.

## Ringkasan

Daftar asal berisi **14 entri**: 10 aktif (8 dipakai kode/UI, 2 hanya di trigger database) dan 4 tidak aktif (1 action tanpa pemanggil, 2 data historis/duplikat, 1 definisi SQL lama yang sudah tertimpa). Arti "aktif" di sini: masih bisa dipanggil dari halaman yang bisa dibuka pengguna, atau masih dijalankan trigger/RPC database. Action yang tidak punya pemanggil di seluruh repo dihitung mati.

Status DEV per 24 November 2026 setelah Fase 4:

| Entri | Objek | Status sekarang |
|---|---|---|
| 1 | `saveObservation` | **Dihapus**; tidak punya pemanggil |
| 2 | `observations` dan `observation_revisions` | Dipertahankan; perlu migrasi data |
| 3 | `lib/dashboard-results.ts` | Dipertahankan |
| 4 | `observer_assignment_completions` | **Dihapus** beserta policy; trigger ditulis ulang |
| 5 | `observer_rubric_completions` | **Dihapus** beserta policy; trigger ditulis ulang |
| 6 | `observer_rubric_version_completions` | Tabel dipertahankan; dua action mati **dihapus** |
| 7 | Evaluasi dengan `rubric_version_id` NULL | Dipertahankan |
| 8 | Duplikat seed kerangka | Dipertahankan; perlu migrasi data |
| 9 | `lib/scoring.ts` | Dipertahankan; konversi skor kini `(skor/5)*100` |
| 10 | Definisi lama `get_event_report_rows` | Tidak perlu aksi |
| 11 | Finalisasi A `setAssessmentSubmissionStatus` | Dipertahankan; cabang `finalized` dan tombol Admin dihapus di Fase 2 |
| 12 | Finalisasi B `runFinalize` | Dipertahankan; jalur utama Phase 6 |
| 13 | Finalisasi C `approveFinalizePublishReport` | Dipertahankan |
| 14 | Fallback nama "Akun pengguna" | Dipertahankan |

Perubahan di atas hanya dibuktikan di DEV dengan data simulasi. Tidak ada penghapusan di produksi.

Urutan aman mematikan, satu per satu:

1. **Ambil backup dan verifikasi data dulu.** Bandingkan baris `observations` dengan `assessment_ratings`/`observer_notes`, cek evaluasi NULL, cek duplikat seed. Langkah verifikasi ini belum dilakukan di tugas ini.
2. **Hapus `saveObservation`** (entri 1). **Sudah dilakukan di Fase 4.** Risiko kecil: API lama hilang bila ada klien luar yang memakainya; hal itu tidak diverifikasi.
3. **Hapus dua action penugasan yang tidak dipanggil**, `completeObserverAssignment` dan `reopenObserverAssignment` (entri 6). **Sudah dilakukan di Fase 4.** Dua tabel status (entri 4–5) juga sudah dihapus; tiga trigger ditulis ulang supaya hanya menyentuh entri 6.
4. **Alihkan pembaca lama dulu.** `/dashboard/profil-peserta` dan fallback `/dashboard` masih memakai `lib/dashboard-results.ts` (entri 3). Entri 3 dan tabel `observations` (entri 2) masih dipertahankan; pembersihannya menunggu keputusan produk dan migrasi data.
5. **Bersihkan data historis lewat migrasi data**, bukan hapus langsung: evaluasi NULL (entri 7) dan duplikat seed (entri 8).
6. **Jangan matikan mesin skor lama mendadak** (entri 9). Pindahkan dulu label dan kategori ke modul bersama, lalu ganti pemakaian `calculateWeightedScore` di halaman Observasi bila aturannya disepakati.
7. **Tahan tiga jalur finalisasi dan fallback nama** (entri 11–14). Semua masih dipakai. Penggabungan fungsi bisa dibahas, tetapi bukan penghapusan.
8. **Entri 10 tidak perlu aksi.** Definisi lama hanya catatan dalam file migrasi dan sudah ditimpa migrasi yang lebih baru.

---

## 1. Action `saveObservation`

1. **Definisi:** `app/dashboard/penilaian/assessment-actions.ts:6-165`. Keputusan penggantinya ada di `BLUEPRINT.md:29`.
2. **Penulis:** action ini sendiri menulis `observations` di baris 132 (insert) dan 150 (update). **Pemanggil:** tidak ada. Pencarian menyeluruh menemukan satu kecocokan saja, yaitu definisinya di baris 6. **Pembaca:** action ini membaca tabel yang sama di baris 90, 107, dan lewat `readLatest` di baris 88-105.
3. **UI:** tidak ada halaman yang memanggil action ini. Halaman Observasi memakai `saveAssessmentRating` (`app/dashboard/observasi/assessment-rating-cell.tsx:4`) dan `saveObserverNote` (`app/dashboard/observasi/observer-notes.tsx:4`).
4. **Data:** satu nilai bersama per peserta-indikator. Jalur baru menyimpan nilai per Observer di `assessment_ratings` (`assessment-actions.ts:167-351`), jadi ini duplikat konsep dengan jalur baru.
5. **Status: SUDAH DIHAPUS di Fase 4.** Fungsi dihapus dari `assessment-actions.ts`; enam kecocokan lain hanya di dokumen. Lihat `docs/HASIL-FASE4-DEV.md`. Rekomendasi awal: AMAN DIMATIKAN, karena tidak ada pemanggil dan penghapusan tidak mengubah data.
6. **Risiko:** bila ada klien atau skrip di luar repo yang masih memanggil Server Action ini, pemanggil itu akan gagal. Keberadaan klien tersebut tidak diverifikasi.

## 2. Tabel `observations` dan `observation_revisions`

1. **Definisi:** tabel di `supabase/migrations/20261029070000_rubrics_observations.sql:44-58`; tabel riwayat di baris 58 dan 150-164. Kolom nama pelaku ditambah di `20261106200000_instructor_assessment_and_change_history.sql:65-69`.
2. **Penulis:** dulu oleh `saveObservation` (`assessment-actions.ts:132,150`). Riwayat ditulis trigger `20261029070000:150-164`, `20261106200000:76-99`, dan versi terakhir `20261111100000:327-343`. Kini tidak ada penulis dari UI. **Pembaca:** `lib/dashboard-results.ts:84,125-137`; RPC `get_instructor_dashboard_results` versi terakhir di `20261111100000:380` (versi sebelumnya `20261106180000:97` dan `20261106190000:137`); migrasi sekali jalan `20261111100000:157-179` menyalin catatan lama ke `observer_notes`.
3. **UI:** tidak ada kontrol penilaian yang menulis tabel ini. Data masih tampil tidak langsung lewat `/dashboard` saat `phase7Home == null` (`app/dashboard/page.tsx:130-132,191-192`) dan lewat `/dashboard/profil-peserta` (`app/dashboard/profil-peserta/page.tsx:52,186-188`).
4. **Data:** nilai sudah punya jalur baru di `assessment_ratings` dan `assessment_submissions` (`20261111160000:2,15-34`). Catatan lama sudah disalin ke `observer_notes` (`20261111100000:156-168`) dan masih ditampilkan sebagai "Catatan lama per indikator" di `app/dashboard/observasi/observer-notes.tsx:312-314,366-380`. Jadi duplikat historis. Jumlah baris tidak diverifikasi.
5. **Status: dipertahankan di Fase 4.** Rekomendasi: PERLU MIGRASI DATA. Pastikan salinan ke jalur baru lengkap dan dibaca ulang sebelum tabel dihapus. Pembaca `lib/dashboard-results.ts` harus dialihkan lebih dulu.
6. **Risiko:** nilai lama dan catatan per indikator bisa hilang dari tampilan bila dihapus sebelum salinan diverifikasi. Realtime `observations` juga aktif di `20261111100000:414-425`.

## 3. `lib/dashboard-results.ts`

1. **Definisi:** `lib/dashboard-results.ts:56-195`, fungsi `loadDashboardAssessmentData`. Fungsi ini membaca `observations` di baris 84 dan `observer_rubric_version_completions` di baris 87.
2. **Penulis:** tidak ada; ini hanya pembaca. **Pemanggil:** `app/dashboard/page.tsx:9,130-132` (hanya bila Phase 7 Home bernilai null) dan `app/dashboard/profil-peserta/page.tsx:6,52` (selalu dipanggil untuk peran Instruktur). Tipe hasilnya dipakai `components/dashboard-assessment-results.tsx:3-6`.
3. **UI:** `/dashboard/profil-peserta` menampilkan komponen itu di baris 186-188. `/dashboard` menampilkannya di baris 191-192 hanya sebagai fallback. Menu keduanya ada di `lib/navigation.ts:98-100` dan beranda dashboard.
4. **Data:** perhitungan memakai satu nilai bersama dari `observations`, bukan nilai independen Phase 5. Jadi duplikat hasil dengan agregat Phase 6/7.
5. **Status: dipertahankan di Fase 4.** Rekomendasi: TAHAN DULU. Halaman Profil Peserta masih bergantung pada file ini. Catatan `docs/FRONTEND_REFACTOR.md:80` menyebut kode ini hampir mati, tetapi penghapusannya menunggu keputusan produk.
6. **Risiko:** pada `/dashboard/profil-peserta`, bagian "Hasil penilaian" hilang. Pada `/dashboard`, fallback saat Phase 7 gagal dimuat ikut hilang.

## 4. `observer_assignment_completions`

1. **Definisi:** `supabase/migrations/20261029070000_rubrics_observations.sql:186-209`. Status selesai untuk satu kegiatan, bukan per jenis penilaian.
2. **Penulis:** awalnya ditulis Observer lewat kebijakan RLS di baris 197-207; migrasi `20261106160000:12-18` menyalin barisnya ke `observer_rubric_completions`. Kini tidak ada action aplikasi yang menulis atau menghapus tabel ini. Yang masih terjadi adalah penghapusan oleh trigger: `20261029070000:213-227`, `20261106160000:60-83`, `20261106170000:101-126`, dan versi terakhir `20261111100000:252-277,279-302`. **Pembaca:** tidak ada di kode aplikasi. Kebijakan baca ada di `20261029070000:194-196`.
3. **UI:** tidak ada. Action `completeObserverAssignment`/`reopenObserverAssignment` tidak lagi menulis tabel ini dan juga tidak punya pemanggil.
4. **Data:** status yang sama sudah tercatat lebih rinci di `observer_rubric_completions` dan `observer_rubric_version_completions`. Duplikat lama.
5. **Status: SUDAH DIHAPUS di Fase 4.** Migrasi `20261124131000` menghapus tabel dan policy-nya. Tiga trigger ditulis ulang supaya hanya menghapus baris di `observer_rubric_version_completions` (entri 6); trigger tidak dihapus. Lihat `docs/HASIL-FASE4-DEV.md`.
6. **Risiko:** hanya riwayat status lama di DEV yang hilang. Tidak ada fitur UI yang berubah.

## 5. `observer_rubric_completions`

1. **Definisi:** `supabase/migrations/20261106160000_observer_stage_type_completions.sql:2-18`. Status selesai per jenis penilaian.
2. **Penulis:** migrasi `20261106160000:12-18` sekali jalan dari tabel entri 4; `20261106170000:63-70` menyalin barisnya ke `observer_rubric_version_completions`. Kini tidak ada action aplikasi yang menulis. Penghapusan masih terjadi lewat trigger `20261106160000:60-97`, `20261106170000:101-139`, dan versi terakhir `20261111100000:252-302`. **Pembaca:** tidak ada di kode aplikasi. Kebijakan baca di `20261106160000:21-27`.
3. **UI:** tidak ada. Halaman Observasi memakai status submission (`assessment_submissions`), bukan tabel ini.
4. **Data:** duplikat dari entri 4 dan entri 6 dengan tingkat rincian di antaranya.
5. **Status: SUDAH DIHAPUS di Fase 4.** Migrasi `20261124131000` menghapus tabel dan policy-nya; trigger yang memakainya ditulis ulang. Lihat `docs/HASIL-FASE4-DEV.md`.
6. **Risiko:** hanya riwayat status per jenis penilaian di DEV yang hilang; tidak ada tampilan yang berubah.

## 6. `observer_rubric_version_completions`

1. **Definisi:** `supabase/migrations/20261106170000_training_material_rubrics.sql:54-70`. Status selesai per versi rubrik, ini yang paling rinci dari tiga tabel status.
2. **Penulis:** `completeObserverAssignment` di `app/dashboard/penilaian/assignment-actions.ts:173-212` (upsert di baris 196-206) dan `reopenObserverAssignment` di baris 214-234 (delete di baris 227-231). Kedua action tidak punya pemanggil di seluruh repo; pencarian nama keduanya hanya menemukan definisinya. Penulis lain adalah trigger penghapusan `20261111100000:252-302` dan kebijakan RLS `20261106170000:77-98`. **Pembaca:** `lib/dashboard-results.ts:86-88,151-157,180-182` untuk menghitung `isOfficial`; RPC `get_instructor_dashboard_results` versi terakhir di `20261111100000:388-402` (versi awal `20261106180000:108-134`, `20261106190000:146-171`, kebijakan baca instruktur `20261106200000:57-58`).
3. **UI:** tidak ada tombol yang memanggil dua action itu. Status ini hanya muncul lewat `lib/dashboard-results.ts` di halaman yang disebut entri 3.
4. **Data:** status ini turunan dari status submission dan dari nilai Observer. Bukan sumber unik bagi Phase 5/6.
5. **Status: dipertahankan, action mati sudah dihapus.** `completeObserverAssignment` dan `reopenObserverAssignment` dihapus di Fase 4 karena tidak punya pemanggil. Tabel tetap dipertahankan: masih dibaca `lib/dashboard-results.ts` dan trigger `20261111100000:252-302` masih menghapus barisnya. Lihat `docs/HASIL-FASE4-DEV.md`.
6. **Risiko:** penanda "resmi/selesai" di ringkasan lama berubah bila tabel dihapus lebih awal. Trigger masih mengharapkan tabel ini ada.

## 7. Evaluasi lama dengan `rubric_version_id` NULL

1. **Definisi/keputusan:** `supabase/migrations/20261113000000_dad_collective_evaluation_per_penilaian_v1.sql:6,8-13,15-23`. Kolom baru ditambahkan, draf lama sengaja dibiarkan NULL dan dikelompokkan satu oleh indeks unik `NULLS NOT DISTINCT`.
2. **Penulis:** tidak ada kode yang membuat evaluasi NULL baru. `saveCollectiveEvaluation` selalu mengirim `rubric_version_id` (`app/dashboard/evaluasi/actions.ts:262,289-293,323-327`) dan `runFinalize` juga memakainya (`actions.ts:573,671-683`). **Pembaca:** tidak ada query aplikasi yang mencari baris NULL; halaman evaluasi memakai `.eq("rubric_version_id", ...)` di `actions.ts:275,591,661,829`. RPC finalisasi Publikasi terbaru memeriksa evaluasi berdasarkan id, bukan NULL (`20261113130000_publish_latest_per_evaluation_v1.sql:15-18`).
3. **UI:** tidak ada. Baris lama tidak muncul di halaman Evaluasi Kolektif maupun Laporan.
4. **Data:** data historis, bukan duplikat jalur baru. Jumlah baris dan isinya tidak diverifikasi.
5. **Status: dipertahankan di Fase 4.** Rekomendasi: TAHAN DULU. Jangan hapus sebelum ada keputusan arsip. Bila ingin membereskan, lakukan migrasi data yang menetapkan versi rubrik atau memindahkan baris ke tabel arsip.
6. **Risiko:** penghapusan langsung menghilangkan catatan keputusan lama. Indeks `NULLS NOT DISTINCT` juga hanya mengizinkan satu baris NULL per kegiatan-peserta, jadi perubahan skema perlu hati-hati.

## 8. Duplikat seed kerangka kompetensi

1. **Definisi:** seed resmi ada di `supabase/migrations/20261111110000_dad_competency_framework_v1.sql:124-159` dan seterusnya. Kode `DAD_IMM` unik di `20261111110000:4-10`; versi unik per framework di `20261111110000:12-22`. Temuan duplikat dicatat di `HANDOVER.md:409-413`.
2. **Penulis:** seed migrasi `20261111110000:124-159` memakai `ON CONFLICT DO NOTHING`. Catatan `HANDOVER.md:398,409` menyebut ada rantai seed dan impor lokal kedua dengan id berbeda. **Pembaca:** `app/dashboard/kerangka/page.tsx:28-32` mengambil framework berdasarkan kode `DAD_IMM` dengan `maybeSingle`, lalu versi 1 di baris 45-50; `app/dashboard/laporan/page.tsx:135-140` mengambil versi framework dari id yang ada di snapshot.
3. **UI:** `/dashboard/kerangka` (menu `lib/navigation.ts:57-61`) dan daftar framework di halaman Laporan.
4. **Data:** `HANDOVER.md:409` menyebut 54 berbanding 27 indikator dengan isi sama, dan `HANDOVER.md:413` menyebut 27 rubrik indikator lokal berbanding 27 cloud dengan id berbeda. Angka itu berasal dari catatan lama, **tidak diverifikasi** di tugas ini. Duplikat berada di level data, bukan di file seed kedua yang ditemukan di repo.
5. **Status: dipertahankan di Fase 4.** Rekomendasi: PERLU MIGRASI DATA. Tentukan id mana yang dipakai rubrik dan snapshot, baru hapus baris yang tidak direferensikan. Jangan hapus berdasarkan "isi sama" saja karena FK bisa menunjuk ke id tertentu.
6. **Risiko:** `maybeSingle()` di `/dashboard/kerangka` bisa gagal bila ada lebih dari satu baris dengan kode yang sama. Penghapusan yang salah bisa memutus FK dari `rubric_versions`, `assessment_snapshots`, atau pemetaan materi.

## 9. Mesin skor lama `lib/scoring.ts`

1. **Definisi:** `lib/scoring.ts:43-78`, dengan rumus konversi ke 0–100 di baris 72. Phase 6 memakai `lib/phase6-scoring.ts:269-297`, rumus agregat di baris 280.
2. **Penulis:** tidak ada; ini fungsi murni. **Pembaca:** `lib/dashboard-results.ts:2-6,137-138`; `components/dashboard-assessment-results.tsx:1,11`; `components/phase7-report-workspace.tsx:19`; `app/dashboard/penilaian/page.tsx:31`; `app/dashboard/observasi/assessment-rating-cell.tsx:5`; `app/dashboard/observasi/page.tsx:10-14,550-554` yang menghitung pratinjau skor dari `assessment_ratings` milik Observer sendiri.
3. **UI:** halaman Observasi, Pengaturan Penilaian, dan panel Laporan/Rapor.
4. **Data:** bukan tabel. `calculateWeightedScore` memakai satu peta nilai dan menormalisasi ulang bobot aspek yang diamati; `calculateOverallScore` memakai rating terverifikasi dan menolak bobot yang tidak berjumlah 100%. Keduanya masih dipakai untuk tujuan berbeda. Label skala dan kategori di `lib/scoring.ts:9-41` juga dipakai komponen Phase 7.
5. **Status: dipertahankan di Fase 4.** Konversi skor di `lib/scoring.ts:72` sudah diubah di Fase 2 menjadi `(skor/5)*100`, sehingga pratinjau Observasi dan hasil Evaluasi memakai satu rumus. Rekomendasi: TAHAN DULU. Bila ingin satu mesin, pindahkan dulu `SCORE_SCALE_LABELS`, `scoreCategories`, dan `categorizeScore` ke modul bersama.
6. **Risiko:** label skala, warna kategori, dan pratinjau skor Observer hilang dari UI bila dihapus mendadak.

## 10. Definisi lama `get_event_report_rows`

1. **Definisi:** versi lama `supabase/migrations/20261112180000_dad_reporting_publication_v1.sql:142-156`, mengambil satu snapshot terakhir per peserta berdasarkan `revision desc limit 1` (baris 151). Versi pengganti `supabase/migrations/20261113000000_dad_collective_evaluation_per_penilaian_v1.sql:35-90`, mengambil semua snapshot per peserta diurutkan berdasarkan `finalized_at` (baris 76-86).
2. **Penulis:** `create or replace function` pada kedua file migrasi. Tidak ada penulis lain. **Pembaca RPC di aplikasi:** `app/dashboard/laporan/page.tsx:101-103` dan `lib/phase7-home.ts:80-92`. Pemeriksaan keberadaan fungsi di `supabase/tests/dad_reporting_phase7.sql:7` hanya untuk tes.
3. **UI:** `/dashboard/laporan` dan ringkasan beranda `/dashboard` lewat `lib/phase7-home.ts`.
4. **Data:** fungsi, bukan tabel. Migrasi yang dijalankan berurutan membuat definisi 13 November menjadi definisi aktif. Definisi 12 November hanya tersisa sebagai teks dalam file migrasi lama.
5. **Status: TIDAK PERLU AKSI.** Tidak ada perubahan di Fase 4; file migrasi lama tetap disimpan sebagai riwayat dan definisi 13 November tetap aktif. Cukup jangan pakai definisi lama sebagai acuan.
6. **Risiko:** bila ada lingkungan yang hanya memasang migrasi sampai 12 November, perilakunya tetap satu baris per peserta dan rapor per jenis tidak tampil. Ini tidak diverifikasi.

## 11. Finalisasi A: `setAssessmentSubmissionStatus(..., "finalized")`

1. **Definisi:** `app/dashboard/penilaian/assessment-actions.ts:353-489`, cabang finalisasi di baris 383-423; pemeriksaan semua Observer sudah mengirim ada di baris 398-413.
2. **Penulis:** action ini mengubah `assessment_submissions.status` menjadi `finalized` dan mengisi `finalized_by` di baris 414-419. **Pemanggil:** `app/dashboard/observasi/submission-controls.tsx:5,25-31`; tombol untuk Admin Sistem ada di baris 66 ke bawah. **Pembaca:** halaman yang sama menampilkan status dan jumlah kiriman di baris 45-55; `app/dashboard/observasi/page.tsx:555-575` menghitung `submittedCount` dan `finalizedCount`.
3. **UI:** `/dashboard/observasi` (menu `lib/navigation.ts:93-96`).
4. **Data:** ini finalisasi pengiriman Observer per peserta dan versi rubrik, bukan snapshot rapor. Masih jalur resmi Phase 5.
5. **Status: dipertahankan, tetapi sebagian diubah di Fase 2.** Action `setAssessmentSubmissionStatus` masih dipakai untuk Kirim/Buka kembali. Cabang `"finalized"` dan tombol finalisasi Admin sudah dihapus; syarat "semua Observer submit" tidak lagi menghalangi agregasi Phase 6. Lihat `docs/HASIL-FASE2-DEV.md`.
6. **Risiko:** status `finalized` masih dicek di action untuk mencegah edit kiriman yang sudah dikunci; tombol Admin tidak lagi tersedia.

## 12. Finalisasi B: `runFinalize` di Evaluasi Kolektif

1. **Definisi:** `app/dashboard/evaluasi/actions.ts:568-812`. Pemeriksaan coverage dan moderasi ada di baris 646-666, penyimpanan draf evaluasi dan validasi keputusan di baris 667-698.
2. **Penulis:** menulis `collective_evaluations` (baris 680-686), lalu memanggil RPC `finalize_collective_evaluation` (baris 777-797) yang menulis `assessment_snapshots` dan sumber privat di `20261113120000_scope_finalize_moderation_to_penilaian_v1.sql:68-77`. **Pemanggil:** tiga action di `actions.ts`, yaitu `finalizeCollectiveEvaluation` (814-819), `approveFinalizePublishReport` (821-864), dan `finalizeAllEvaluations` (866 ke bawah). Ketiganya dipakai `app/dashboard/evaluasi/page.tsx:954,1031,742`.
3. **UI:** `/dashboard/evaluasi` (menu `lib/navigation.ts:67-71`).
4. **Data:** jalur utama Phase 6. Bukan duplikat dari entri 11; entri 11 mengunci nilai Observer, entri ini mengunci keputusan kolektif dan snapshot.
5. **Status: dipertahankan.** Rekomendasi: TAHAN DULU. Ini jalur yang diperbaiki migrasi 13 November dan pemanggil rekapnya diperbarui di `20261124140000`, jadi jangan dimatikan.
6. **Risiko:** tidak ada snapshot final, Evaluasi Kolektif tidak bisa diterbitkan, dan halaman Laporan kehilangan sumber data.

## 13. Finalisasi C: `approveFinalizePublishReport`

1. **Definisi:** `app/dashboard/evaluasi/actions.ts:821-864`.
2. **Penulis:** action ini menyetujui rekomendasi draf (baris 831-851), memanggil `runFinalize` (baris 852), lalu memanggil RPC `publish_assessment_report` (baris 853-858) dan mengalihkan ke `/dashboard/laporan` (baris 861-863). **Pemanggil:** `app/dashboard/evaluasi/page.tsx:19,1031`. RPC Publikasi terakhir ada di `20261113130000_publish_latest_per_evaluation_v1.sql:4-32`.
3. **UI:** tombol pada `/dashboard/evaluasi`, lalu halaman `/dashboard/laporan`.
4. **Data:** ini gabungan persetujuan rekomendasi, finalisasi, dan publikasi. Jalur terpisah `finalizeCollectiveEvaluation` tidak mempublikasi. Keduanya masih tersedia, jadi ada tiga pintu masuk finalisasi di halaman yang sama.
5. **Status: dipertahankan.** Rekomendasi: TAHAN DULU. Bisa disederhanakan menjadi satu alur dengan `finalizeCollectiveEvaluation`, tetapi itu perubahan perilaku dan perlu persetujuan, bukan penghapusan.
6. **Risiko:** bila dimatikan, tombol setuju-plus-terbitkan hilang dan rapor tidak otomatis masuk ke halaman Laporan.

## 14. Nama pelaku lama "Akun pengguna"

1. **Definisi:** nilai default dan fallback ada di `supabase/migrations/20261111100000_dynamic_rubric_mappings_and_observer_notes.sql:132,159,172,236-238,332-334` serta `supabase/migrations/20261111160000_dad_assessment_workspace_v1.sql:25,161-170`. Fallback UI ada di `components/app-shell.tsx:241`.
2. **Penulis:** trigger database mengisi nama itu bila `profiles.display_name` kosong. Tidak ada kode aplikasi yang menulis nama ini secara langsung. **Pembaca:** `app/dashboard/observasi/page.tsx:186,198,485`; `app/dashboard/observasi/assessment-rating-cell.tsx:145-147,346`; `app/dashboard/observasi/observer-notes.tsx:82,96,116,356,372`; `app/dashboard/evaluasi/page.tsx:604`; `app/dashboard/evaluasi/actions.ts:718` yang memasukkan nama ke snapshot; `components/phase7-report-workspace.tsx:165,521-524,925`. Definisi tipe ada di `lib/supabase-rows.ts:121,163`.
3. **UI:** Observasi, Evaluasi Kolektif, Laporan/Rapor, dan nama akun di header aplikasi.
4. **Data:** teks ini muncul di baris lama maupun baris baru bila profil belum punya `display_name`. Ia juga tersimpan di `snapshot_data` yang bersifat final. Bukan duplikat tabel, melainkan jejak atribusi. Jumlah baris yang memakai teks ini tidak diverifikasi.
5. **Status: dipertahankan.** Rekomendasi: TAHAN DULU. Fallback menjaga atribusi tetap ada saat nama profil kosong. Menggantinya perlu kebijakan penulisan nama dan pengecekan baris lama, termasuk isi snapshot.
6. **Risiko:** daftar Observers dan riwayat perubahan menampilkan "Akun pengguna" tanpa identitas. Bila fallback dihapus, atribusi bisa hilang sama sekali.

## Bukti pembaruan 24 November 2026

Rincian penghapusan entri 1, dua action mati di entri 6, dan tabel entri 4–5 ada di `docs/HASIL-FASE4-DEV.md`. Migrasi `20261124131000` hanya dipasang di DEV; tidak ada penghapusan tabel atau data di produksi. Entri 2, 3, 7, 8, 9, dan 11–14 sengaja dipertahankan. Status produksi mengikuti `docs/STATUS-PRODUKSI-SATU-VERSI.md`.
