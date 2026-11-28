# Progres eksekusi rencana — 28 November 2026

Dokumen ini mencatat bukti per paket kerja saat eksekusi. Status rencana: `RENCANA-IMPLEMENTASI.md`.

| Paket | Status | Bukti | Commit |
|---|---|---|---|
| 0 | Selesai | `security_baseline.sql` lolos; tiga penguji lama (participant scope, allowlist, revision privacy) lolos; `tests/relations.test.ts` memeriksa batas cast; `npm run check` dan `npm run build` exit 0 | |
| 1 | Selesai | Migrasi `20261128010000`, penguji `supabase/tests/revision_privacy.sql` lolos dengan Kader 0 baris dan Admin 1 baris; `npm run check` exit 0; `npm run build` exit 0 | |
| 2 | Selesai | `observer_assignment_scope.sql` lolos; unit `request-base-url.test.ts` lolos; QA browser: Kader tidak melihat 2 kotak penugasan, Admin melihat keduanya; curl host asing redirect ke host default; `npm run check` dan `npm run build` exit 0 | |
| 3 | Selesai | `tests/autosave-policy.test.ts` lolos; QA browser DEV Observer: Ubah skor → "Tersimpan · 06.32.27", tidak ada tombol "Coba lagi"; nilai dikembalikan ke "Belum dinilai"; `npm run check` dan `npm run build` exit 0 | |
| 4 | Selesai | `tests/action-error.test.ts` lolos; QA browser DEV: duplikat nama Komisariat menghasilkan `?error=...` dan banner inline, bukan error boundary; `npm run check` dan `npm run build` exit 0 | |
| 5 | Selesai | `tests/finalize-validation.test.ts` dan `finalize_approval_order.sql` lolos; QA browser DEV: halaman Evaluasi dengan tombol satu klik merender tanpa error boundary; `npm run check` dan `npm run build` exit 0 | |
| 6 | Selesai | `tests/report-snapshot-dto.test.ts` dan `tests/supabase-rows.test.ts` lolos; QA browser DEV: halaman Laporan dua kegiatan merender tanpa error boundary; `npm run check` (19 tes) dan `npm run build` exit 0 | |
| 7 | Selesai | `tests/auto-competency.test.ts` (termasuk multi-versi), `tests/score-derivation.test.ts`, dan `tests/rubric-weights.test.ts` lolos; QA browser DEV: teks peta kompetensi otomatis sesuai aturan baru; `npm run check` (20 tes) dan `npm run build` exit 0 | |
| 8-15 | Belum | | |

## Catatan Paket 1

- Policy `collective_evaluation_revisions_read_authorized` hanya mengizinkan Admin Sistem dan moderator kegiatan.
- `revoke all ... from anon` untuk dua tabel revisi kini ada di migrasi, bukan hanya di server.
- Rollback hanya memulihkan definisi policy, tidak mengembalikan grant `anon`.
- Penguji SQL dijalankan di Supabase lokal port 54322 dengan transaksi di-rollback.

## Catatan Paket 0

- K11 ternyata tidak selesai di database lokal: enam fungsi internal masih memiliki `EXECUTE` eksplisit untuk `anon`. Migrasi `20261128020000_anon_function_grants_harden_v1.sql` mencabutnya; rollback disediakan.
- Penguji `security_baseline.sql` membuktikan tidak ada policy aktif yang memakai `can_manage_events()` dan hanya `get_public_event_aggregate` yang memberi `EXECUTE` ke `anon`.
- Penguji SQL lama `competency_material_mapping_phase4.sql`, `dad_reporting_phase7.sql`, `material_archive.sql`, dan `staff_event_summary.sql` gagal lebih dulu karena data DEV hasil salinan produksi sudah bergeser dari fixture penguji. Ini bukan regresi dari paket ini dan sengaja tidak diubah dalam lingkup Paket 0.

## Catatan Paket 2

- `assertEventAssignment` dan `requireModerator` dipindah ke `lib/authorization.ts`; pemanggil lama memakai helper yang sama.
- Kader tidak lagi bisa menugaskan/mencabut Observer lewat aksi maupun RLS. QA browser DEV: Kader melihat 0 kotak penugasan, Admin melihat 2 kotak dan form "Tugaskan Observer".
- Seleksi Komisariat dan Laporan kini memeriksa penugasan kegiatan di aplikasi, bukan hanya di RPC/RLS.
- `requestBaseUrl` memakai daftar putih host (`IMM_ALLOWED_HOSTS`) dan `safeNextPath` membandingkan origin. QA curl dengan `Host: evil.example` menghasilkan redirect ke `http://43.173.33.195:8080/login`.
- Untuk QA browser DEV, kata sandi dua akun uji lokal di-reset lewat Auth Admin API lokal. Tidak ada akun produksi yang diubah.

## Catatan Paket 3

- Autosave skor dan catatan berhenti setelah kegagalan bukan-konflik, dengan tombol "Coba lagi". Aturan ini ada di `lib/autosave-policy.ts` dan diuji unit.
- BUG-06: Realtime kini memanggil `setAuth` lagi saat `TOKEN_REFRESHED` atau `SIGNED_IN`. QA live lebih dari satu jam tidak dilakukan, jadi perbaikan ini belum terbukti secara runtime dan tetap dicatat sebagai hipotesis.
- BUG-07: event Realtime rekan menyimpan `revision`; penimpa dengan revisi lebih lama atau sama diabaikan bila data server punya revisi.
- QA browser DEV (Observer A, kegiatan `48880b89`, Pelatihan/Ke-IMM-an/Observasi): memilih skor 4 menghasilkan "Tersimpan · 06.32.27" dan tidak ada tombol "Coba lagi". Nilai uji dikembalikan ke "Belum dinilai".

## Catatan Paket 4

- `runAction` di `lib/action-error.ts` menjadi pembungkus umum. `penilaianErrorUrl`/`runPenilaianAction` kini memanggil helper itu.
- Aksi FormData di delapan modul dibungkus: evaluasi (6 aksi), kegiatan (7), pengajuan (7), seleksi komisariat (3), laporan (2), pengguna (3), komisariat (3), impor tes (1). Aksi evaluasi yang sudah memakai `{ok:false}` tidak dibungkus ulang.
- Banner `?error=` kini tampil global di layout dashboard lewat `components/action-error-banner.tsx`, sehingga halaman tidak perlu masing-masing menyimpan pesan. Banner lama di Penilaian dan Evaluasi dihapus agar tidak dobel.
- QA browser DEV: menambah Komisariat dengan nama yang sudah ada menghasilkan URL `?error=Nama+Komisariat+tersebut+sudah+terdaftar.` dan pesan tampil di dalam halaman. Tidak ada "Halaman gagal dimuat".

## Catatan Paket 5

- Validasi keputusan dan alasan dipindah sebelum upsert narasi dan sebelum persetujuan rekomendasi. Helper murni ada di `lib/finalize-validation.ts`.
- Persetujuan rekomendasi dipindah ke dalam `runFinalize` setelah gate coverage/moderasi/keputusan, sebelum snapshot dibuat, sehingga snapshot memuat rekomendasi yang benar-benar disetujui. Kegagalan gate tidak mengunci rekomendasi.
- `finalizeAllEvaluations` memanggil `runFinalize` dengan `approveRecommendation=false`.
- ID snapshot diambil langsung dari `supabase.rpc`, bukan query terpisah setelah RPC.
- Gate approve tidak ditambahkan ke `publish_assessment_report` agar tujuh snapshot lama tanpa rekomendasi tetap bisa diterbitkan. Kontrak ini dijaga oleh `supabase/tests/finalize_approval_order.sql`.
- QA browser DEV memastikan halaman Evaluasi dengan tombol "Setujui, finalisasi, terbitkan, dan unduh rapor" merender normal untuk evaluasi draft. Klik finalisasi penuh tidak dijalankan agar tidak mengubah data uji.

## Catatan Paket 6

- DTO ringkas kini membawa `minimum`, `maximum`, `range`, dan `pending`, sehingga kolom "Rentang" tidak lagi selalu "—". Penguji unit membuktikan keempat field ikut.
- Pemeriksa baris RPC dipindah ke `lib/row-guards.ts` agar bisa diuji dengan `node --test`; `lib/supabase-rows.ts` mengekspornya kembali.
- Cast langsung hasil RPC diganti `asRows` dengan guard di Evaluasi, Laporan, dan Observasi. Satu batas `as unknown as` di `lib/relations.ts:43` tetap dipertahankan.
- QA browser DEV: halaman Laporan untuk dua kegiatan merender normal. Tidak ada baris "Indikator yang perlu perhatian" pada data lokal, jadi tampilan angka Rentang belum terbukti di browser; penguji unit menjadi bukti utama.

## Catatan Paket 7

- `lib/score-derivation.ts` menjadi satu rumus konversi skor 1–5 ke 0–100. Dipakai Phase 6, `lib/scoring.ts`, PDF, dan komponen terkait.
- BUG-08 sesuai keputusan pemilik: peta kompetensi sementara dihitung per versi rubrik lalu digabung rata-rata sederhana. Normalisasi bobot lintas versi dihapus. Penguji baru membuktikan dua versi dengan skor 80 dan 40 menghasilkan 60.
- Teks penjelas di halaman Evaluasi diperbarui agar tidak lagi menyebut normalisasi.
- A07: tujuh pemanggilan `indicators.find` per baris diganti satu `Map` kunci `participantId:indicatorId:scopeKey`.
- A04: `validateRubricForActivation` di `lib/rubric-weights.ts` dipakai halaman dan Server Action. Pengecekan status draf dan versi aktif tetap ada di Server Action. Penguji mencakup bobot 99,999/100,001 dan uraian kosong.
- QA browser DEV: halaman Evaluasi menampilkan teks "dihitung per versi rubrik lalu digabung dengan rata-rata sederhana, tanpa normalisasi bobot lintas versi".
