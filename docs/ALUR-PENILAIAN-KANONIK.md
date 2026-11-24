# Alur Penilaian: Versi yang Benar

Dokumen ini menjelaskan apa yang **benar-benar terjadi** di aplikasi sekarang, bukan apa yang tertulis di dokumen lama. Sumbernya adalah kode di `app/`, `lib/`, `supabase/migrations/`, dan uji browser lokal 24 November 2026. Bila ada perbedaan dengan `BLUEPRINT.md` atau `KEPUTUSAN-KOREKSI-ALUR.md`, beda itu dicatat di bagian terakhir. Keputusannya ada di `MATRIKS-KEPUTUSAN-PRODUK.md` yang sudah diisi pada 24 November 2026. K1, K2, K3, K6, dan K9 sudah diputus; sisanya mengikuti matriks yang sama.

Bacaan untuk panitia: "Observer mengisi nilai sendiri-sendiri. Sistem merangkum nilai yang sudah dikirim. Koordinator meninjau selisih, menulis kesimpulan, lalu mengunci rapor."

---

## 1. Siapa melakukan apa

| Peran | Yang boleh dilakukan di alur penilaian |
|---|---|
| Observer | Mengisi skor, bukti, dan catatan untuk peserta yang ditugaskan; Kirim/Buka kembali |
| Instruktur | Sama seperti Observer bila ditugaskan; subrole MoT, Vice MoT, Master Observer, Vice Observer juga menjadi moderator |
| Admin Sistem | Mengatur rubrik dan penugasan, membaca semua nilai, memfinalisasi kiriman Observer, menerbitkan rapor |
| Bidang Kader | Membaca rekap, tetapi tidak mengisi nilai mentah; di kode juga boleh menerbitkan rapor (lihat kontradiksi K9) |
| Peserta | Membaca rapor yang sudah diterbitkan dan ditautkan ke akunnya (belum teruji penuh) |
| IoT / Vice IoT | Tidak menilai. Menu Evaluasi dan Laporan masih muncul, lalu halaman mengarahkan ke dashboard |

---

## 2. Rantai dari penugasan sampai rapor

### Langkah 1: Penugasan menentukan apa yang terlihat

Observer tercatat di `observer_assignments`, Instruktur di `instructor_event_assignments` beserta subrole. Halaman Observasi mengambil hanya kegiatan yang ditugaskan, lalu hanya versi rubrik berstatus `active`.

Bukti: `app/dashboard/observasi/page.tsx:70-117`; tabel penugasan di `supabase/migrations/20261029070000_rubrics_observations.sql:14-21` dan `20261106180000_dashboard_results_categories_instructor_role.sql:15-29`.

### Langkah 2: Pemilihan berlapis

Pilihan lewat query param: kegiatan → tahap (Screening, Pelatihan, Rencana Tindak Lanjut) → materi khusus Pelatihan → jenis penilaian. Grid tidak muncul sebelum keempatnya cocok dengan versi rubrik aktif.

Bukti: `app/dashboard/observasi/page.tsx:253-288`, `:145-159`, `:500-504`.

### Langkah 3: Grid berisi peserta × indikator

Nilai awal berasal dari `assessment_ratings` milik akun yang sedang login. Rating Observer lain tetap diambil untuk panel baca-saja. Pratinjau angka dihitung di browser dari skor sendiri.

Bukti: `:177-224`, `:506-535`, `:542-555`; komponen sel di `assessment-rating-cell.tsx:39-88`.

### Langkah 4: Mengisi skor dan bukti

Pilihan: skor bulat 1–5, N/O (tidak teramati, bukan nol), atau Belum dinilai. Setelah berhenti mengetik 700 ms, draf disimpan ke `localStorage` lalu ke server lewat `saveAssessmentRating` dengan `expectedRevision`.

Bukti: `assessment-rating-cell.tsx:180-222`; `app/dashboard/penilaian/assessment-actions.ts:181-350`.

### Langkah 5: Server memeriksa hak dan revisi

Action memeriksa UUID, panjang bukti maksimal 3000 karakter, peran, penugasan, dan status submission yang harus masih `draft`. Bila revisi server sudah berubah, pengguna melihat panel konflik dengan dua pilihan: muat data terbaru atau pertahankan draf.

Bukti: `assessment-actions.ts:202-267`, `:268-350`; panel konflik di `assessment-rating-cell.tsx:243-256`.

### Langkah 6: Riwayat ditulis oleh database

Trigger `assessment_ratings_track` menaikkan `revision` dan menulis nilai sebelum serta sesudah ke `assessment_rating_revisions`, lengkap dengan pelaku.

Bukti: `supabase/migrations/20261111160000_dad_assessment_workspace_v1.sql:156-178`.

### Langkah 7: Catatan per penulis

Ada empat kategori: Observasi/bukti, Kekuatan, Area pengembangan, Catatan khusus. Tiap penulis punya editor dan revisi sendiri. CATATAN PENULIS LAIN TIDAK BISA DITIMPA. Autosave juga 700 ms.

Bukti: `observer-notes.tsx:36-57`, `:76-176`, `:312-317`; `assessment-actions.ts:491-672`; RLS di `20261111160000:114-126`.

### Langkah 8: Realtime menyinkronkan tampilan, bukan nilai

Token dipasang sebelum join channel. Channel difilter per versi rubrik. Perubahan skor dan catatan langsung mengubah sel di klien lain lewat event buatan. Hanya perubahan status kirim yang memicu `router.refresh()` setelah 1 detik.

Bukti: `assessment-realtime.tsx:36-100`, `:12-18`; pemakai event di `assessment-rating-cell.tsx:126-178` dan `observer-notes.tsx:258-292`.

Bukti browser 24 Nov: Observer B melihat "Penilaian observer lain (1) · Observer A · Sudah kirim · Skor 4" tanpa refresh, sementara nilai B sendiri tetap kosong.

### Langkah 9: Kirim, buka kembali, kunci

Status: `draft`, `submitted`, `finalized`. Observer membuka kembali kirimannya lewat tombol yang hanya muncul di status `submitted`. Admin mengunci semua kiriman lewat tombol Finalisasi yang hanya muncul bila semua Observer sudah submit. Trigger database mengizinkan hanya tiga transisi: `draft→submitted`, `submitted→draft`, `submitted→finalized`. Setelah `finalized`, tidak bisa diubah.

Bukti: `submission-controls.tsx:43-89`; `assessment-actions.ts:353-488`; trigger di `20261111160000:128-154`.

Yang perlu diingat: tombol Kirim **tidak** memeriksa kelengkapan indikator.Observer boleh mengirim dengan sebagian indikator kosong.

### Langkah 10: Rekap mengubah rating jadi angka

RPC `get_event_assessment_summary` merangkum per peserta, indikator, dan cakupan: rata-rata, jumlah penilai valid, minimum, maksimum, rentang, N/O, pending. Yang dihitung hanya submission `submitted`/`finalized` dengan skor 1–5. Draf tidak masuk. Selisih minimal 2 poin memunculkan flag moderasi.

Bukti: `20261112190000_fix_get_event_assessment_summary_ambiguous.sql:25-69`; policy `review_score_delta=2` dan `minimum_coverage=80` di `20261112170000_dad_scoring_collective_evaluation_v1.sql:111-118`.

Keterbatasan yang sudah pernah terjadi: RPC mengembalikan 3069 baris, sementara batas PostgREST dulu 1000, sehingga 22 dari 33 peserta tidak mendapat rekap. Perbaikan sementara di produksi menaikkan batas ke 100000. Perbaikan yang benar, yaitu filter peserta di SQL, belum dikerjakan. Lihat `HANDOVER.md:431-455`.

### Langkah 11: Evaluasi kolektif dan moderasi

Halaman Evaluasi menghitung nilai aspek dan `overall` dengan rumus `Σ(skor aspek / 5 × bobot aspek)`. Status `ready_for_collective_evaluation` muncul bila bobot aspek berjumlah 100% dan coverage tiap aspek minimal 80%. Koordinator (Admin atau MoT, Vice MoT, Master Observer, Vice Observer) meninjau indikator yang flagged. Nilai Observer asli **tidak pernah ditimpa**; keputusan moderasi hanya tersimpan sebagai catatan privat.

Bukti: `lib/phase6-scoring.ts:140-296`; `app/dashboard/evaluasi/page.tsx:444-724`; `evaluasi/actions.ts:165-236`; `is_assessment_moderator` di `20261112170000:13-25`.

Rekomendasi pengembangan dibuat otomatis satu teks per evaluasi. Nama indikator dengan rata-rata di bawah 3/5 disebut, angkanya tidak ditulis, saran berupa latihan umum per aspek. Teks harus disetujui koordinator sebelum masuk snapshot.

Bukti: `lib/phase6-recommendations.ts:42-86`; `evaluasi/actions.ts:365-483`, `:723-728`.

### Langkah 12: Finalisasi, publikasi, rapor

`runFinalize` memeriksa policy, agregat, moderasi, keputusan, dan alasan minimal 10 karakter, lalu memanggil RPC `finalize_collective_evaluation`. RPC membuat snapshot bernomor dan sumber privat berisi rating mentah, bukti, dan catatan moderasi. Trigger menolak UPDATE dan DELETE pada snapshot.

Publikasi lewat `publish_assessment_report`. Halaman Laporan membaca `get_event_report_rows`, lalu PDF/ZIP/Excel diunduh setelah audit `record_assessment_export`.

Tombol satu klik "Setujui, finalisasi, terbitkan, dan unduh rapor" merangkai: setujui rekomendasi → finalisasi → publikasi → redirect ke Laporan dengan `published=1` → unduh satu PDF. Hasil akhir: satu evaluasi `finalized`, satu snapshot, satu publikasi, satu baris audit `individual_pdf`, satu PDF terunduh.

Bukti: `evaluasi/actions.ts:568-864`; `20261113120000_scope_finalize_moderation_to_penilaian_v1.sql:11-77`; `20261113130000_publish_latest_per_evaluation_v1.sql:11-31`; `laporan/page.tsx:51-55`, `:223-225`; `phase7-report-workspace.tsx:327-371`.

---

## 3. Aturan angka yang dipakai sekarang

| Aturan | Nilai | Sumber |
|---|---|---|
| Skala observer | 1 Sangat Kurang … 5 Sangat Baik, N/O bukan nol | teks skala di `observasi/page.tsx` |
| Ambang flag moderasi | 2 poin, bisa diubah lewat tabel policy | `20261112170000:111-118` |
| Coverage minimum | 80% per aspek | sama |
| Rumus overall | `Σ(skor aspek / 5 × bobot aspek)` | `lib/phase6-scoring.ts:269-283` |
| Kategori | 0–<60, 60–<75, 75–<90, 90–100 | `lib/scoring.ts:19-40` |
| Pembulatan | snapshot 2 desimal, PDF tampilkan 1 desimal, coverage 1 desimal | `evaluasi/actions.ts:754`, `lib/phase7-files.ts:122`, `phase6-scoring.ts:294` |

**Bukti runtime penting.** Untuk skor 4, pratinjau Observasi menampilkan 75.00/100, sedangkan halaman Evaluasi menampilkan 80.00/100. Ini karena dua rumus berbeda masih dipakai bersamaan. Lihat kontradiksi K2.

---

## 4. Kontradiksi dan status keputusannya

K1. **Tiga tombol "final" dengan syarat berbeda.** Finalisasi kiriman mensyaratkan semua Observer submit (`assessment-actions.ts:398-413`). Finalisasi evaluasi memakai coverage, moderasi, dan alasan (`evaluasi/actions.ts:646-698`). Tombol satu klik menambah publikasi dan unduh PDF (`:821-864`). `KEPUTUSAN-KOREKSI-ALUR.md:71` sudah membatalkan syarat "semua Observer submit", tetapi tombol dan kodenya masih ada.

K2. **Dua rumus skor.** Pratinjau memakai `((rata-rata-1)/4)×100` (`lib/scoring.ts:72`), hasil akhir memakai `(skor/5)×bobot` (`lib/phase6-scoring.ts:280`). `BLUEPRINT.md:272` masih terbuka.

K3. **N/O menurunkan coverage.** `tests/phase6-scoring.test.ts:92-111` menetapkan 1 dari 3 indikator berskor sebagai coverage 33% dan aspek invalid. `BLUEPRINT.md:45-47` meminta bobot N/O dihapus dan bobot sisa dinormalisasi ulang.

K4. **Kunci draf lokal tanpa observer.** `assessment-rating-cell.tsx:46` memakai kunci yang tidak memuat `observer_id`, sehingga draf antarobserver bisa tertukar di satu browser.

K5. **Catatan membuat submission.** `assessment-actions.ts:569-576` membuat baris submission saat menyimpan catatan, sehingga penghitung "sudah mengisi" bisa bertambah tanpa skor.

K6. **Rapor revisi tidak ada jalur.** Snapshot selalu `revision = 1` (`20261113120000:71-74`), padahal `BLUEPRINT.md:70` menjanjikan snapshot baru untuk revisi.

K7. **Jalur lama masih terbuka.** `saveObservation` masih bisa menulis `observations` (`assessment-actions.ts:6-165`) dan dashboard lama masih membacanya (`lib/dashboard-results.ts:84-88`).

K8. **Hitungan rekap bisa dobel.** `get_event_report_rows` menghasilkan satu baris per snapshot, tetapi `lib/phase7-home.ts:108-111` menghitung jumlah peserta dari panjang array.

K9. **Bidang Kader boleh menerbitkan rapor** di `app/dashboard/laporan/actions.ts:26` dan `20261113130000:11-14`, padahal `KEPUTUSAN-KOREKSI-ALUR.md:21` menyebut hanya Admin dan empat subrole koordinator.

K10. **IoT bisa membaca nilai lewat API** karena `can_access_observation` memberi akses ke semua Instruktur yang ditugaskan (`20261106200000_instructor_assessment_and_change_history.sql:13-16`), walaupun halamannya mengarahkan IoT ke dashboard.

Rincian K1 sampai K10 ada di `docs/MATRIKS-KEPUTUSAN-PRODUK.md`. Rincian jalur lama ada di `docs/INVENTARIS-JALUR-LAMA.md`. Kontrak RPC ada di `docs/MATRIKS-RPC-AKSES.md`.
