# Alur Penilaian: Versi yang Benar

Dokumen ini menjelaskan apa yang **benar-benar terjadi** di aplikasi di branch `research/peta-alur-penilaian`, bukan apa yang tertulis di dokumen lama. Sumbernya adalah kode di `app/`, `lib/`, `supabase/migrations/`, hasil Fase 2–4 (`docs/HASIL-FASE2-DEV.md`, `docs/HASIL-FASE3-DEV.md`, `docs/HASIL-FASE3EFG-DEV.md`, `docs/HASIL-FASE4-DEV.md`), dan uji browser lokal 24 November 2026. Status produksi mengikuti `docs/STATUS-PRODUKSI-SATU-VERSI.md`; perubahan di bawah baru berlaku di DEV. Bagian 4 mencatat status akhir K1–K10.

Bacaan untuk panitia: "Observer mengisi nilai sendiri-sendiri. Sistem merangkum nilai yang sudah dikirim. Koordinator meninjau selisih, menulis kesimpulan, lalu mengunci rapor."

---

## 1. Siapa melakukan apa

| Peran | Yang boleh dilakukan di alur penilaian |
|---|---|
| Observer | Mengisi skor, bukti, dan catatan untuk peserta yang ditugaskan; Kirim/Buka kembali |
| Instruktur | Sama seperti Observer bila ditugaskan; subrole MoT, Vice MoT, Master Observer, Vice Observer juga menjadi moderator |
| Admin Sistem | Mengatur rubrik dan penugasan, membaca semua nilai, memfinalisasi evaluasi kolektif, menerbitkan rapor |
| Bidang Kader | Membaca rekap, tanpa `snapshot_data`, bukti, atau catatan rinci; tidak bisa menerbitkan atau mengekspor (K9) |
| Peserta | Rapor ditautkan ke akun, tetapi Fase 3d ditunda karena tidak ada domain/TLS; RPT-001..005 belum diuji |
| IoT / Vice IoT | Tetap mengisi Observasi untuk peserta yang ditugaskan, tetapi tidak bisa membaca nilai/rekap; menu Evaluasi dan Laporan masih mengarahkan ke dashboard (K10) |

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

Status di database: `draft`, `submitted`, `finalized`. Aplikasi sekarang hanya memakai `draft` dan `submitted`: Observer membuka kembali kirimannya lewat tombol yang muncul di status `submitted`. Tombol finalisasi Admin dan syarat "semua Observer sudah submit" sudah dihapus di Fase 2 (K1). Trigger database masih mengenal tiga transisi, termasuk `submitted→finalized`, untuk baris yang sudah dikunci.

Bukti: `submission-controls.tsx`; `assessment-actions.ts:192-196` (tipe status hanya `submitted | draft`); trigger di `20261111160000:128-154`; `docs/HASIL-FASE2-DEV.md`.

Yang perlu diingat: tombol Kirim **tidak** memeriksa kelengkapan indikator. Observer boleh mengirim dengan sebagian indikator kosong.

### Langkah 10: Rekap mengubah rating jadi angka

RPC `get_event_assessment_summary` merangkum per peserta, indikator, dan cakupan: rata-rata, jumlah penilai valid, minimum, maksimum, rentang, N/O, pending. Yang dihitung hanya submission `submitted`/`finalized` dengan skor 1–5. Draf tidak masuk. Selisih minimal 2 poin memunculkan flag moderasi.

Bukti: `20261112190000_fix_get_event_assessment_summary_ambiguous.sql:25-69`; policy `review_score_delta=2` dan `minimum_coverage=80` di `20261112170000_dad_scoring_collective_evaluation_v1.sql:111-118`.

Keterbatasan yang sudah pernah terjadi: RPC mengembalikan 3069 baris, sementara batas PostgREST dulu 1000, sehingga 22 dari 33 peserta tidak mendapat rekap. Perbaikan sementara di produksi menaikkan batas ke 100000.

Di Fase 4, RPC diganti menjadi `get_event_assessment_summary(target_event_id, target_participant_id)` oleh `20261124140000`. Filter peserta ada di CTE `planned`. Finalisasi mengirim peserta evaluasi; halaman Evaluasi mengirim `null` bila belum ada peserta terpilih, jadi rekap seluruh kegiatan masih bisa besar dan terkena batas PostgREST. Lihat `docs/HASIL-FASE4-DEV.md` dan `docs/MATRIKS-RPC-AKSES.md`.

### Langkah 11: Evaluasi kolektif dan moderasi

Halaman Evaluasi menghitung nilai aspek dan `overall` dengan rumus `Σ(skor aspek / 5 × bobot aspek)`. N/O dibuang dari penyebut coverage sejak Fase 2; indikator yang berskor tetapi juga punya N/O tetap dihitung. Status `ready_for_collective_evaluation` muncul bila bobot aspek berjumlah 100% dan coverage tiap aspek minimal 80%. Koordinator (Admin atau MoT, Vice MoT, Master Observer, Vice Observer) meninjau indikator yang flagged. Nilai Observer asli **tidak pernah ditimpa**; keputusan moderasi hanya tersimpan sebagai catatan privat. Tampilan memakai satu angka desimal.

Bukti: `lib/phase6-scoring.ts:140-296`; `app/dashboard/evaluasi/page.tsx:444-724`; `evaluasi/actions.ts:165-236`; `is_assessment_moderator` di `20261112170000:13-25`.

Rekomendasi pengembangan dibuat otomatis satu teks per evaluasi. Nama indikator dengan rata-rata di bawah 3/5 disebut, angkanya tidak ditulis, saran berupa latihan umum per aspek. Teks harus disetujui koordinator sebelum masuk snapshot.

Bukti: `lib/phase6-recommendations.ts:42-86`; `evaluasi/actions.ts:365-483`, `:723-728`.

### Langkah 12: Finalisasi, publikasi, rapor

`runFinalize` memeriksa policy, agregat, moderasi, keputusan, dan alasan minimal 10 karakter, lalu memanggil RPC `finalize_collective_evaluation`. RPC membuat snapshot bernomor dan sumber privat berisi rating mentah, bukti, dan catatan moderasi. Trigger menolak UPDATE dan DELETE pada snapshot.

Publikasi lewat `publish_assessment_report`. Gate sekarang keras (`20261124102000`): hanya Admin dan koordinator, evaluasi harus `finalized`, snapshot terbaru `ready_for_collective_evaluation`, alasan minimal 10 karakter, dan moderasi selesai. Kader tidak bisa menerbitkan (`20261124102000`) maupun mengekspor (`20261124113000`). Halaman Laporan membaca `get_event_report_rows`, lalu PDF/ZIP/Excel diunduh setelah audit `record_assessment_export`.

Tombol satu klik "Setujui, finalisasi, terbitkan, dan unduh rapor" merangkai: setujui rekomendasi → finalisasi → publikasi → redirect ke Laporan dengan `published=1` → unduh satu PDF. Hasil akhir: satu evaluasi `finalized`, satu snapshot, satu publikasi, satu baris audit `individual_pdf`, satu PDF terunduh.

Bukti: `evaluasi/actions.ts:568-864`; `20261124140000...:87-162` (finalisasi dengan pemanggil rekap dua argumen); `20261124102000...:6-58` (publikasi); `laporan/page.tsx`; `phase7-report-workspace.tsx`. Uji klik 24 November menghasilkan satu snapshot, satu publikasi, satu audit `individual_pdf`, dan unduhan PDF; tujuh tombol ekspor lain juga teraudit. Lihat `docs/HASIL-UJI-FINALIZE-EKSPOR-DEV.md`.

---

## 3. Aturan angka yang dipakai sekarang

| Aturan | Nilai | Sumber |
|---|---|---|
| Skala observer | 1 Sangat Kurang … 5 Sangat Baik, N/O bukan nol | teks skala di `observasi/page.tsx` |
| Ambang flag moderasi | 2 poin, bisa diubah lewat tabel policy | `20261112170000:111-118` |
| Coverage minimum | 80% per aspek; N/O dibuang dari penyebut | `20261112170000:111-118`, `lib/phase6-scoring.ts` |
| Rumus overall | `Σ(skor aspek / 5 × bobot aspek)` | `lib/phase6-scoring.ts:269-283` |
| Konversi skor observer | `(skor / 5) × 100`, satu rumus dengan Phase 6 | `lib/scoring.ts:72`, `docs/HASIL-FASE2-DEV.md` |
| Kategori | 0–<60, 60–<75, 75–<90, 90–100 | `lib/scoring.ts:9-41` |
| Pembulatan | snapshot 2 desimal; Observasi, Evaluasi, dan PDF tampil 1 desimal | `lib/phase6-scoring.ts`, `lib/phase7-files.ts`, `docs/HASIL-FASE2-DEV.md` |

**Bukti runtime terbaru (24 November 2026).** Skor 4 kini tampil sebagai **80.0/100** di pratinjau Observasi dan **80.0/100** di Evaluasi Kolektif. Sebelum Fase 2, pratinjau menampilkan 75.00/100 karena memakai `((rata-rata-1)/4)×100`. Status K2 di bawah.

---

## 4. Kontradiksi K1–K10: status akhir

Status di bawah adalah hasil Fase 2–4 dan uji browser 24 November 2026 di DEV. Semua klaim produksi mengikuti `docs/STATUS-PRODUKSI-SATU-VERSI.md`. Tanda **selesai** berarti sudah diubah di DEV dan dibuktikan, bukan berhasil deploy ke produksi.

K1. **Gate "semua Observer submit" — SELESAI DIHAPUS.** `assessment-actions.ts:192-196` hanya menerima `submitted` dan `draft`; tombol finalisasi Admin di `submission-controls.tsx` dihapus. Hitungan kiriman kini informasi, bukan penolakan. Finalisasi evaluasi tetap memakai coverage, moderasi, dan alasan; tombol satu klik menambah publikasi dan unduh PDF. Bukti: `docs/HASIL-FASE2-DEV.md`, uji browser 24 November.

K2. **Dua rumus skor — SELESAI, satu rumus dipakai.** `lib/scoring.ts:72` kini memakai `(skor/5)*100`, sama dengan Phase 6. Skor 4 = 80.0/100 di Observasi dan di Evaluasi. Tampilan memakai satu angka desimal; snapshot tetap dua desimal. Bukti: `docs/HASIL-FASE2-DEV.md`.

K3. **N/O menurunkan coverage — SELESAI DI DEV.** `lib/phase6-scoring.ts` membuang N/O dari penyebut coverage; indikator berskor yang juga punya N/O tetap dihitung. `coverageDenominator` dipakai pada teks alasan. Bukti unit test dan penguji SQL di `docs/HASIL-FASE2-DEV.md`. Perilaku N/O sampai halaman Evaluasi dengan data browser belum diulang.

K4. **Kunci draf lokal tanpa observer — BELUM DIUBAH.** `assessment-rating-cell.tsx:46` masih memakai `dad-assessment:{rubricVersionId}:{participantId}:{indicatorId}` tanpa `observer_id`. Draf dua Observer di satu browser masih bisa tertukar. Tidak ada perubahan Fase 2–4 untuk ini.

K5. **Catatan membuat submission — MASIH BERLAKU.** `assessment-actions.ts:367-374` membuat baris `assessment_submissions` bila belum ada saat catatan disimpan. Penghitung "sudah mengisi" masih bisa bertambah tanpa skor. Belum ada keputusan produk untuk memisahkannya.

K6. **Jalur revisi — BELUM DIPUTUS.** Nomor revisi snapshot sudah diperbaiki menjadi `max(revision)+1` (`20261124101000` dan `20261124140000:154`), jadi tidak lagi selalu 1. Belum ada tombol atau alur produk untuk revisi rapor setelah publikasi. Lihat `docs/STATUS-PRODUKSI-SATU-VERSI.md`.

K7. **Jalur lama — SEBAGIAN DIBERSIHKAN.** `saveObservation`, `completeObserverAssignment`, dan `reopenObserverAssignment` dihapus. Tabel `observer_assignment_completions` dan `observer_rubric_completions` dihapus; tiga trigger ditulis ulang supaya hanya menyentuh `observer_rubric_version_completions`. Masih dipertahankan: `observations`, `lib/dashboard-results.ts`, evaluasi NULL, duplikat seed, `lib/scoring.ts`, tiga jalur finalisasi, dan fallback nama pelaku. Rincian di `docs/INVENTARIS-JALUR-LAMA.md` dan `docs/HASIL-FASE4-DEV.md`.

K8. **Agregat publik — SELESAI DIBUAT DENGAN AMBANG 10.** `20261124120000` membuat `get_public_event_aggregate(uuid)` dan `app/page.tsx` memakainya. Hanya publikasi dan snapshot `ready_for_collective_evaluation` yang dihitung; distribusi baru tampil bila ada komisariat dengan minimal 10 peserta, tanpa identitas atau skor individu. Hitungan `lib/phase7-home.ts:108` yang menjumlahkan panjang array snapshot masih bisa dobel dan belum diubah. `NEXT_PUBLIC_PUBLIC_AGGREGATE_EVENT_ID` perlu diisi di produksi. Bukti: `docs/HASIL-FASE3EFG-DEV.md`.

K9. **Bidang Kader tidak bisa terbit/ekspor — SELESAI DI DEV.** `20261124102000` mencabut `bidang_kader` dari `publish_assessment_report`, `20261124113000` mencabutnya dari `record_assessment_export`. Halaman Laporan menyembunyikan tombol Terbit dan panel ekspor. Uji browser Kader 24 November: rekap tampil, tombol tidak ada, akses Server Action tetap ditolak di server. Bukti: `docs/HASIL-FASE3-DEV.md`, `docs/HASIL-UJI-FINALIZE-EKSPOR-DEV.md`.

K10. **IoT — TIDAK BACA REKAP, TETAP MENGGISI OBSERVASI.** `20261124110000` membatasi baca penilaian dan memulihkan policy `is_assigned_instructor_for_event` supaya IoT melihat daftar peserta. Uji browser 24 November: 5 peserta tampil di Observasi, 0 baris `assessment_ratings`, `can_review_observation` false, rekap tidak terlihat. Menu Evaluasi dan Laporan masih muncul lalu mengarahkan ke dashboard; ini UX, bukan pengamanan. Bukti: `docs/HASIL-FASE3-DEV.md`.

Rincian keputusan asal ada di `docs/MATRIKS-KEPUTUSAN-PRODUK.md`. Rincian jalur lama ada di `docs/INVENTARIS-JALUR-LAMA.md`. Kontrak RPC ada di `docs/MATRIKS-RPC-AKSES.md`. Otoritas status ada di `docs/STATUS-PRODUKSI-SATU-VERSI.md`.
