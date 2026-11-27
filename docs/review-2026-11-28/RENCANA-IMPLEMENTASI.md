# Rencana Implementasi hasil Review Kode — 28 November 2026

Versi: draf 2 (hasil revisi setelah review putaran 1). Dokumen ini hanya merencanakan. Tidak ada kode, migrasi, konfigurasi, atau data produksi yang diubah saat menyusun rencana ini.

## 1. Aturan main

- Setiap paket kerja melewati siklus: rencana rinci, review, revisi, persetujuan pemilik, implementasi, verifikasi, lalu baru paket berikutnya. Ini berlaku juga untuk rencana ini sendiri.
- Satu paket dikerjakan dan diverifikasi sebelum paket berikutnya dimulai, sesuai `AGENTS.md`. Pengecualian pengelompokan: Paket 4 dikerjakan satu modul per sesi, dan Paket 9 dibagi menjadi sub-sesi cache, filter, batas revisi, serta revalidate.
- Sebelum mengubah berkas `app/` atau `components/`, baca panduan Next.js yang relevan di `node_modules/next/dist/docs/` sesuai `AGENTS.md`.
- Gunakan data simulasi. Jangan menulis ke database produksi saat pengembangan. Deploy hanya setelah pemilik menyetujui, mengikuti `docs/DEPLOYMENT.md` (backup aplikasi, env, dan dump DB; rsync tanpa `--delete`; build; restart; smoke test).
- Perintah pengembangan untuk laptop Windows memakai PowerShell: `npm.cmd run check`, `npm.cmd run build`, `npm.cmd run dev` (http://localhost:3000). Di Linux/CI: `npm run check`, `npm test`, `npm run build`.
- Penguji SQL ada di `supabase/tests/` dan belum masuk `npm run check`. Bila stack Supabase lokal tidak tersedia, nyatakan penguji SQL belum dijalankan, jangan diklaim lulus.
- Temuan dengan status keputusan terbuka atau sudah diputuskan tidak boleh diubah diam-diam. Jika rencana memerlukan pilihan produk, beri tanda dan tunggu jawaban.

## 2. Pemetaan 33 temuan ke paket kerja

Beberapa temuan adalah satu akar masalah yang dilihat dari sudut berbeda. Pemetaan ini menjaga agar tidak ada ID yang hilang dan tidak ada pekerjaan ganda.

| Paket | ID tercakup | Jenis | Status |
|---|---|---|---|
| 0 | A11, K10, K11 | Verifikasi temuan yang sudah selesai, tanpa perubahan kode aplikasi | Tutup dengan pengawas regresi |
| 1 | K01, K04 | Keamanan privasi: RLS revisi evaluasi dan grant anon | Jalan pertama |
| 2 | K02, K03, K06, K09 | Otorisasi pertahanan tambahan di Server Action dan redirect | Setelah Paket 1; diawali ekstraksi helper otorisasi |
| 3 | BUG-01, BUG-06, BUG-07 | Stabilitas autosave dan Realtime Observasi | Setelah Paket 2 |
| 4 | A01, BUG-02 | Penanganan error Server Action yang seragam | Setelah Paket 3, satu modul per sesi |
| 5 | BUG-04, BUG-09 | Integritas urutan persetujuan, finalisasi, dan snapshot | Setelah Paket 4 |
| 6 | BUG-05, A06 | DTO snapshot dan validasi data RPC | Setelah Paket 5 |
| 7 | A03, A04, A07 | Satu rumus skor, satu validasi rubrik, hapus `find` berulang | Setelah Paket 6; BUG-08 menunggu keputusan |
| 8 | BUG-08 | Aturan agregasi peta kompetensi sementara | Diputus 28 Nov: hitung per versi lalu gabung; setelah Paket 7 |
| 9 | BUG-03 | Optimasi P3/P4 (cache, filter query, batas revisi, revalidate) | Setelah Paket 7, dalam sub-sesi |
| 10 | A05, BUG-10 | Daftar pengujian yang melekat pada setiap paket, plus penutup | Penutup setelah Paket 12 |
| 11 | BUG-11 | AUTH-005: sesi kedaluwarsa menampilkan pesan salah | Setelah Paket 10 |
| 12 | A02 | Pecah enam file UI besar | Terakhir, setelah perilaku stabil |
| 13 | A08, A09, A10 | Perapian label versi, alias CSS, dan warning lint | Setelah Paket 12 |
| 14 | K05, K07 | Keputusan yang sudah diputus pemilik, risiko diterima | Tidak dijadwalkan sebagai kode |
| 15 | K08 | Permintaan akun Instruktur menggantikan `/daftar` | Setelah Paket 13 |

Catatan penggabungan: A01 dan BUG-02 adalah satu pekerjaan (A01 menghitung 273 `throw`, BUG-02 menghitung 269, beda cakupan pencarian). A03 dan BUG-08 bertemu di modul rumus skor, tetapi BUG-08 menunggu keputusan dan tidak boleh diubah di Paket 7. A05 dan BUG-10 adalah satu pekerjaan pengujian. A06 berpasangan dengan A11 (batas cast) dan BUG-05 (DTO), bukan dengan K01/K03. A07 dikerjakan di Paket 7, bukan di Paket 9; BUG-03 di Paket 9 mencakup wire concerns P3/P4 saja. A08 sudah diputus 28 November 2026 dan masuk Paket 13. K08 sudah diputus 28 November 2026 dan masuk Paket 15. BUG-08 sudah diputus 28 November 2026 dan masuk Paket 8. Tidak ada keputusan terbuka yang menghalangi paket kerja.

## 3. Paket 0: tutup temuan yang sudah selesai

- Cakupan: A11, K10, K11.
- Tujuan: memastikan temuan lama tidak dihitung dua kali dan tidak regressions.
- Langkah:
  1. Perkuat penguji yang sudah ada, `supabase/tests/participant_event_scope.sql` dan `supabase/tests/public_aggregate_allowlist.sql`, bukan membuat penguji baru yang sama.
  2. Tambahkan asersi di `tests/relations.test.ts` bahwa batas `as unknown as` hanya ada di `lib/relations.ts:43`. Penguji SQL tidak bisa memeriksa kode TypeScript.
  3. Untuk K11, tambahkan asersi bahwa `can_manage_events()` tidak dipakai policy aktif dan EXECUTE `anon` dicabut kecuali `get_public_event_aggregate`, dengan rujukan `20261106120000` dan `20261124150000`.
- Verifikasi: `npm run check`; penguji SQL dijalankan bila stack lokal tersedia. Tidak ada perubahan kode aplikasi.
- Rollback: revert commit penguji bila mengganggu CI.

## 4. Paket 1: RLS revisi dan grant anon

- Cakupan: K01 (High), K04 (Medium).
- Tujuan: Bidang Kader tidak bisa membaca catatan deliberasi privat dari tabel revisi; pencabutan grant anon reproducible dari migrasi.
- Berkas: `supabase/migrations/20261112170000_dad_scoring_collective_evaluation_v1.sql` (rujukan, jangan diedit), migrasi baru bernomor lebih besar dari `20261127140000`, rollback baru, penguji SQL baru.
- Langkah:
  1. Buat migrasi baru yang mengganti policy `collective_evaluation_revisions_read_authorized` agar hanya `is_admin_system()` atau `is_assessment_moderator(event_id)` yang lolos. Hilangkan cabang `bidang_kader`.
  2. Tambahkan `revoke all on public.assessment_moderation_revisions, public.collective_evaluation_revisions from anon;` dalam migrasi yang sama atau migrasi pasangannya.
  3. Tulis penguji SQL: Kader mendapat 0 baris, Admin dan moderator mendapat baris, `has_table_privilege('anon', 'public.collective_evaluation_revisions', 'SELECT') = false`, dan definisi policy sesuai harapan. Nyatakan bahwa policy `development_recommendations_read_authorized` sengaja tetap memberi Kader rekomendasi berstatus `approved`.
  4. Periksa log akses historis dari log PostgREST atau Supabase API secara baca-saja untuk melihat apakah jalur revisi pernah dipakai Kader. Log nginx port 8080 tidak menunjukkan ini.
- Verifikasi: penguji SQL lolos di DEV dengan transaksi di-rollback; `npm run check`; browser DEV sebagai Kader membuka halaman rekap tanpa perubahan fungsi yang diizinkan; `npm run build`.
- Rollback: file di `supabase/rollback/<nama>_rollback.sql` hanya memulihkan definisi policy sebelumnya. Jangan mengembalikan `grant ... to anon` yang sudah dicabut di produksi.
- Risiko: predicate moderator yang salah bisa menutup akses moderator yang sah. Uji dengan dua moderator dan satu Kader.

## 5. Paket 2: otorisasi pertahanan tambahan

- Cakupan: K02, K03, K06, K09.
- Tujuan: Server Action tidak hanya mempercayai peran atau `id` dari formulir; redirect tidak memercayai host mentah.
- Berkas: `lib/authorization.ts` (baru), `app/dashboard/kegiatan/actions.ts`, `app/dashboard/evaluasi/actions.ts`, `app/dashboard/penilaian/assignment-actions.ts`, `app/dashboard/penilaian/page.tsx`, `app/dashboard/seleksi-komisariat/actions.ts`, `app/dashboard/laporan/actions.ts`, `lib/request-base-url.ts`, `app/auth/callback/route.ts`, migrasi untuk `can_manage_observer_assignments()`, penguji RLS. `proxy.ts` tidak diubah di paket ini.
- Langkah:
  1. Prasyarat: ekstrak `assertEventAssignment` dari `app/dashboard/kegiatan/actions.ts:79` dan `requireModerator` dari `app/dashboard/evaluasi/actions.ts:51` ke `lib/authorization.ts`. Tanda tangan `assertEventAssignment(supabase, userId, role, eventId, actionLabel)`. Perbarui pemanggil lama, lalu pakai helper yang sama di langkah berikutnya dan di Paket 10.
  2. Batasi `staffClient` untuk `assignObserverImpl`/`removeObserverAssignmentImpl` menjadi `admin_system` saja; sembunyikan form penugasan dari Kader; ubah fungsi DB `can_manage_observer_assignments()` menjadi hanya `admin_system`. Rujuk `BLUEPRINT.md:86,147,200` dan `docs/STATUS-PRODUKSI-SATU-VERSI.md` bagian 3, bukan `BLUEPRINT.md:145,198`.
  3. Di Seleksi Komisariat, terjemahkan `submissionId` menjadi `event_id` lebih dulu, lalu panggil `assertEventAssignment` sebelum RPC.
  4. Di Laporan, tambahkan `requireModerator(snapshot.event_id)` pada `publishReport` dan pemeriksaan peran/penugasan eksplisit di `loadReportSnapshots`. Ini satu-satunya perubahan pada jalur ini; Paket 5 tidak mengulangnya.
  5. Di `requestBaseUrl`, pakai daftar putih host dari konfigurasi server; validasi `next` dengan membandingkan origin hasil parsing URL.
  6. Koordinasikan penyuntingan `assignment-actions.ts` dengan Paket 9: lakukan perubahan K02 dan `revalidatePath` dalam satu sesi edit atau urutan eksplisit, lalu ulangi uji Kader setelah Paket 9.
- Verifikasi: penguji RLS untuk penugasan dan publikasi; browser DEV dengan akun Kader, Observer tanpa penugasan, dan Instruktur non-koordinator; uji `curl` dengan `Host`/`x-forwarded-host` asing serta `next` bernilai `//evil.com`, `/\evil.com`, dan `https://evil.com`, semuanya harus jadi `/dashboard`; `npm run check`; `npm run build`.
- Rollback: revert commit aplikasi; rollback migrasi fungsi DB.

## 6. Paket 3: autosave dan Realtime Observasi

- Cakupan: BUG-01 (High), BUG-06, BUG-07.
- Tujuan: sel yang gagal berhenti mencoba; panel rekan tetap segar lebih dari satu jam dan tidak ditimpa data lama. Paket ini menjadi satu-satunya pemilik tampilan error autosave.
- Berkas: `app/dashboard/observasi/assessment-rating-cell.tsx`, `observer-notes.tsx`, `assessment-realtime.tsx`.
- Langkah:
  1. Tambahkan state `failed`/`attempts`. Hentikan autosave setelah gagal, tampilkan status dan tombol "Coba lagi". Bedakan error permanen (validasi/otorisasi) dari error sementara; beri exponential backoff hanya untuk error sementara. Jangan menulis `localStorage` lebih dari sekali per percobaan.
  2. Berikan `accessToken` callback pada klien Realtime atau panggil ulang `setAuth` lewat `onAuthStateChange("TOKEN_REFRESHED")`.
  3. Simpan `revision`/`updated_at` pada `PeerRating`; abaikan event dengan revisi lebih kecil atau sama dengan props; bersihkan `peerOverrides` saat props baru dari `router.refresh()` tiba.
- Verifikasi: `npm run check`; `npm run build`; uji browser DEV dengan dua akun dan skor gagal disengaja (misalnya rubrik diarsipkan); uji konflik lokal dan remote yang sudah terverifikasi 24 Nov. Untuk BUG-06, percepat `JWT_EXPIRY` GoTrue DEV atau pakai token dengan `exp` lampau, jangan hanya menunggu satu jam. Bila tetap tidak bisa dibuktikan, nyatakan hipotesis.
- Rollback: revert commit.

## 7. Paket 4: penanganan error yang seragam

- Cakupan: A01, BUG-02 (High).
- Tujuan: validasi bisnis yang diharapkan tidak menggantikan halaman dengan "Halaman gagal dimuat".
- Berkas: `app/dashboard/penilaian/form-error.ts` (dijadikan dasar), `app/dashboard/**/actions.ts`, halaman yang belum punya banner `?error=`.
- Langkah:
  1. Generalkan helper menjadi `runAction(redirectUrl, action)` dengan daftar kunci konteks per halaman. Pertahankan perlakuan khusus `NEXT_REDIRECT` agar dilempar ulang.
  2. Kembalikan `{ ok: false, message }` untuk validasi yang diharapkan; biarkan error tak terduga tetap dilempar.
  3. Tambahkan banner `?error=` di Observasi, Laporan, Kegiatan, Pengajuan, Seleksi Komisariat, Pengguna, Komisariat, dan Impor Tes.
- Bukan lingkup: penanganan error UI autosave sudah menjadi bagian Paket 3 dan tidak dikerjakan ulang di sini.
- Verifikasi: satu skenario negatif per modul di browser DEV; `npm run check`; `npm run build`; pastikan redirect internal tidak tertelan. Satu modul per sesi.
- Rollback: revert commit per modul, sehingga bisa dilakukan bertahap.

## 8. Paket 5: integritas persetujuan dan snapshot

- Cakupan: BUG-04 (High), BUG-09.
- Tujuan: rekomendasi disetujui hanya setelah semua gate lolos; snapshot baru tidak difinalisasi tanpa rekomendasi disetujui; tidak ada pesan gagal palsu; snapshot lama tetap bisa diterbitkan.
- Berkas: `app/dashboard/evaluasi/actions.ts`, `supabase/migrations/20261124101000_snapshot_revision_max_plus_one_v1.sql` dan `20261124102000_publish_report_hard_gate_v1.sql` sebagai rujukan, migrasi baru bila perlu, penguji SQL.
- Langkah:
  1. Pindahkan validasi `graduation_decision` dan `decision_rationale` ke sebelum upsert narasi di `runFinalize`.
  2. Pindahkan persetujuan rekomendasi ke setelah gate coverage, moderasi, dan keputusan. Mekanisme konkret: gunakan argumen `target_approved_recommendation_id` pada RPC finalisasi, atau lakukan update status rekomendasi terpisah tepat sebelum memanggil RPC. Jangan menjanjikan transaksi tanpa desain RPC yang dibuat.
  3. Tambahkan pemeriksaan rekomendasi aktif berstatus `approved` hanya di `finalize_collective_evaluation`. Jangan menambah syarat ini ke `publish_assessment_report`, karena 7 snapshot lama dan 4 publikasi lama tidak punya rekomendasi dan akan ditolak. Bila diperlukan pembatasan waktu, pakai `finalized_at`, bukan `created_at` yang tidak ada di `assessment_snapshots`.
  4. Gunakan `{ data: snapshotId, error }` dari `supabase.rpc(finalize_collective_evaluation, ...)`. Fungsi SQL sudah mengembalikan UUID snapshot; hapus query `savedSnapshot` terpisah di `actions.ts`. Tidak perlu mengubah SQL untuk `RETURNING`.
  5. Pengecekan peran `publishReport` sudah dilakukan di Paket 2 langkah 4; tidak diulang di sini.
- Verifikasi: penguji SQL membuktikan snapshot lama tetap bisa diterbitkan dan snapshot baru tanpa rekomendasi disetujui ditolak; browser DEV untuk tombol satu klik dengan gate gagal, lalu gate lolos; `npm run check`; `npm run build`.
- Rollback: rollback migrasi + revert commit aplikasi. Uji dengan snapshot simulasi, jangan data produksi.

## 9. Paket 6: DTO snapshot dan validasi RPC

- Cakupan: BUG-05, A06.
- Tujuan: kolom "Rentang" tidak lagi kosong; data RPC yang berubah bentuk ditolak di batas, bukan saat render.
- Berkas: `lib/report-snapshot-dto.ts`, `components/phase7-report-workspace.tsx`, `lib/relations.ts`, `lib/supabase-rows.ts`, halaman Evaluasi/Laporan/Observasi yang masih cast langsung.
- Langkah:
  1. Tambahkan `range`, `minimum`, `maximum`, dan `pending` ke DTO ringkas; ukur dampak ukuran payload. Alternatif bila payload membengkak: hapus kolom "Rentang" dari tabel, dengan persetujuan pemilik.
  2. Ganti cast langsung hasil RPC/relasi dengan `asRows<T>(value, guard)`. Simpan guard di `lib/supabase-rows.ts`. Pertahankan satu `as unknown as` di `lib/relations.ts:43`.
- Verifikasi: `npm run check`; `npm run build`; browser DEV membuka Laporan dan mengecek kolom Rentang terisi; tes baru untuk guard yang menolak baris cacat.
- Rollback: revert commit.

## 10. Paket 7: satu rumus skor dan satu validasi rubrik

- Cakupan: A03, A04, A07. BUG-08 tetap menunggu keputusan dan tidak diubah di sini.
- Tujuan: angka tidak berbeda antarhalaman; aturan bobot dan uraian skor punya satu gate; agregasi tidak O(n²).
- Berkas: `lib/score-derivation.ts` (baru), `lib/scoring.ts`, `lib/phase6-scoring.ts`, `lib/auto-competency.ts`, `lib/participant-summary.ts`, `lib/training-recap.ts`, `app/dashboard/evaluasi/actions.ts`, `app/dashboard/evaluasi/page.tsx`, `app/dashboard/penilaian/page.tsx`, `app/dashboard/penilaian/rubric-actions.ts`, `lib/rubric-weights.ts`.
- Langkah:
  1. Pindahkan konversi skor 0–100, penggabungan aspek berdasarkan nama, dan filter `cross_session` ke `lib/score-derivation.ts`. Modul lama menjadi pemanggil. Pertahankan fallback normalisasi di `auto-competency.ts` dengan label jelas, sesuai keputusan 26 Nov.
  2. Ekstrak `validateRubricForActivation(aspects)` ke `lib/rubric-weights.ts`. Fungsi ini menjadi satu-satunya gate untuk aturan bobot dan uraian skor. Pertahankan pengecekan `status='draft'` dan konflik versi aktif yang sudah ada di `rubric-actions.ts:1539-1546`. Tambahkan tes untuk bobot 99,999/100,001 dan uraian kosong.
  3. Ganti tujuh kali `indicators.find(...)` per baris dengan satu `Map` berisi `participantId:indicatorId:scopeKey`.
  4. Tulis tes kontrak yang membandingkan hasil Phase 6, fallback Evaluasi, rekap Pelatihan, dan ringkasan PDF untuk satu fixture. Untuk hash, bandingkan dengan entri baseline terakhir menurut `created_at` di `docs/baseline-pdf-sha256.csv` untuk `snapshot_id` yang dipakai, karena beberapa baris memiliki `snapshot_id` dan `revision` sama. Catat nomor baris baseline yang dipakai.
- Verifikasi: `npm run check`; `npm run build`; browser DEV membandingkan angka di Evaluasi dan Laporan untuk peserta yang sama.
- Rollback: revert commit. Tidak menyentuh snapshot yang sudah ada.

## 11. Paket 8: aturan peta kompetensi sementara

- Cakupan: BUG-08.
- Tujuan: angka sementara mengikuti aturan yang disetujui, bukan normalisasi tersembunyi.
- Keputusan 28 November 2026: hitung nilai per versi rubrik, lalu gabungkan dengan aturan eksplisit, misalnya rata-rata per versi. Tetap berlabel Sementara. Normalisasi tersembunyi tidak dipakai. Snapshot dan rapor tidak diubah.
- Langkah: implementasi di `lib/auto-competency.ts`, tes multi-versi dengan total bobot lebih dari 100, verifikasi angka di browser DEV dan `npm run check`.

## 12. Paket 9: optimasi P3/P4

- Cakupan: BUG-03 (High). A07 sudah dikerjakan di Paket 7 dan tidak diulang.
- Tujuan: mengurangi ronde kueri dan payload yang pernah menghabiskan Disk IO budget Nano.
- Berkas: `app/dashboard/observasi/page.tsx`, `lib/phase7-home.ts`, `app/dashboard/{pengajuan,pengguna,penilaian/assignment-actions,profil}/actions.ts`, `lib/supabase/server.ts`.
- Langkah, dibagi sub-sesi:
  1. Bungkus `getClaims` dan query `profiles` dengan `cache()` per request.
  2. Ambil `score_descriptors` hanya untuk versi rubrik terpilih.
  3. Batasi embed daftar revisi delapan terakhir. Riwayat penuh tetap tersedia lewat panel atau query terpisah, sesuai kewajiban riwayat di `BLUEPRINT.md:85,247`. Hapus klaim "sesuai permintaan"; `HANDOVER.md:373` hanya mencatat usulan `limit 8`.
  4. Tambahkan filter event pada `observer_assignments`, `rubric_assessment_types`, `rubric_materials`, dan `events(participants(...))`.
  5. Paralelkan empat query `summarizeEvent` yang masih berurutan.
  6. Ganti delapan pemanggil `revalidatePath("/dashboard")` dengan path yang benar-benar terdampak. Koordinasikan dengan Paket 2 langkah 6 karena sama-sama menyentuh `assignment-actions.ts`.
- Verifikasi: catat baseline dan target jumlah request per render memakai log PostgREST lokal atau `pg_stat_statements`; ukur ukuran HTML dengan `curl -w '%{size_download}'`; `npm run check`; `npm run build`; browser DEV Observasi dan dashboard staf; ulangi uji Kader setelah perubahan `assignment-actions.ts`.
- Rollback: revert commit per sub-sesi. Jangan deploy sebelum pengukuran selesai.

## 13. Paket 10: pengujian

- Cakupan: A05, BUG-10. Ini daftar pengujian yang melekat pada setiap paket di atas, dengan penutup setelah Paket 12.
- Tujuan: jalur yang pernah menghasilkan 500 memiliki pengawas otomatis.
- Langkah:
  1. Ekstrak fungsi murni dari Server Action (`parseFinalizeFormData` sudah ada); tambahkan tes untuk parser, `runFinalize`, `evaluationErrorUrl`, `assertEventAssignment`, dan `requireModerator` hasil ekstraksi Paket 2.
  2. Tambahkan tes untuk konflik/autosave, gate coverage versus simpan draf, publish hanya snapshot Final, duplikasi rekomendasi aktif, urutan persetujuan, dan fallback error boundary.
  3. Perbarui skrip di `package.json` (`test:phase6`/`test:phase7` atau skrip baru) agar berkas tes baru ikut berjalan. `npm test` hanya memindai berkas tetap di `tests/`.
  4. Untuk tes sisi klien, ekstrak reducer/status autosave menjadi fungsi murni yang bisa diuji dengan `node --test`, atau gunakan Playwright bila tersedia. Jangan mengandaikan DOM di `node --test`.
  5. Jalankan penguji `supabase/tests/` di CI terpisah bila lingkungan Supabase tersedia. Bila tidak, catat sebagai belum dijalankan.
- Verifikasi: `npm run check` dengan jumlah tes bertambah; daftar skenario yang belum teruji tetap dicatat jujur.

## 14. Paket 11: AUTH-005

- Cakupan: BUG-11.
- Tujuan: sesi kedaluwarsa mengarah ke login, bukan pesan "Profil belum tersedia".
- Berkas: `app/dashboard/page.tsx`, `app/dashboard/profil/page.tsx`, `proxy.ts`, helper sesi bersama baru.
- Langkah: bedakan `error` kueri dari `!profile`; bila `error` atau claims tidak valid, arahkan ke `/auth/signout` dengan pesan "Sesi berakhir, silakan login ulang". Satukan pengecekan sesi di satu helper.
- Verifikasi: uji DEV dengan `JWT_EXPIRY` GoTrue dipercepat atau token dengan `exp` lampau, lalu kembalikan konfigurasi; `npm run check`; `npm run build`.

## 15. Paket 12: pecah enam file UI besar

- Cakupan: A02.
- Tujuan: menurunkan risiko perubahan pada modul penilaian dan rapor.
- Berkas: `app/dashboard/penilaian/page.tsx` (1.684 baris), `components/phase7-report-workspace.tsx` (1.534), `app/dashboard/evaluasi/page.tsx` (1.248), `app/dashboard/observasi/page.tsx` (808), `app/dashboard/impor-tes/import-wizard.tsx` (598), `app/dashboard/pengajuan/page.tsx` (537).
- Langkah: ekstrak loader data per halaman ke `lib/*.ts` yang menerima klien Supabase dan parameter; ekstrak derivasi ke helper murni; pecah JSX menjadi komponen presentasional. Satu halaman per sesi, mulai dari Penilaian.
- Verifikasi: `npm run check`; `npm run build`; uji browser per halaman yang diubah; bandingkan tampilan sebelum dan sesudah.
- Rollback: revert commit per halaman.
- Risiko: tertinggi di rencana ini. Kerjakan terakhir setelah Paket 1 sampai 11 stabil.

## 16. Paket 13: perapian kecil

- Cakupan: A08, A09, A10.
- Keputusan A08 (28 November 2026): status dipakai sebagai judul versi, penanda RESMI atau PERCOBAAN menjadi badge atau teks tambahan.
- Langkah: pakai `status` untuk judul versi dan pindahkan penanda trial ke badge atau teks tambahan; petakan nilai status dinamis ke `statusBadgeClass()` lalu hapus alias modifier lama di `app/styles/primitives.css`; hapus konstanta `WHITE` yang tidak dipakai di `lib/phase7-files.ts:44`.
- Verifikasi: `npm run check` tanpa warning; `npm run build`; browser DEV mengecek badge.

## 17. Paket 14: keputusan pemilik

| ID | Status dan yang perlu diputuskan | Dampak |
|---|---|---|
| K05 | Sudah diputuskan tidak rotasi, risiko diterima. Dibuka ulang hanya bila pemilik meminta. | Kunci lama masih valid; agen server bisa membaca kunci. |
| K07 | Sudah diputuskan final untuk sementara: HTTP polos pada IP `:8080`, tanpa TLS. Tidak ada tindakan tanpa persetujuan baru. | Akun dan rapor Peserta tetap tidak dibagikan. |
| BUG-08 | Diputus 28 November 2026: hitung per versi rubrik lalu gabung dengan aturan eksplisit, tetap berlabel Sementara. | Tidak ada lagi normalisasi tersembunyi; snapshot dan rapor tidak berubah. |

## 17a. Paket 15: alur permintaan akun Instruktur

- Cakupan: K08. Keputusan 28 November 2026: `/daftar` diubah menjadi formulir permintaan akun, `DISABLE_SIGNUP=true` tetap, Admin membuat akun permanen.
- Berkas: `app/daftar/page.tsx`, `app/daftar/actions.ts`, halaman Pengguna milik Admin, `BLUEPRINT.md` bagian "Pendaftaran akun Instruktur".
- Langkah: ganti `supabase.auth.signUp` dengan pembuatan permintaan yang tersimpan sebagai data pending; tampilkan daftar permintaan di halaman Admin dengan aksi buat akun dan tolak; pastikan permintaan tidak membuka akses dashboard sebelum akun dibuat; selaraskan `BLUEPRINT.md`.
- Verifikasi: `npm run check`, `npm run build`; uji browser DEV sebagai pengaju dan sebagai Admin; pastikan permintaan yang ditolak tidak bisa login.
- Rollback: revert commit; kembalikan narasi `BLUEPRINT.md` bila diperlukan.
- Catatan: ini perubahan alur, bukan perapian tampilan. Tidak boleh dijadwalkan sebelum Paket 13 selesai.

## 18. Definisi selesai per paket

1. Rencana rinci paket ditinjau dan direvisi sampai reviewer menyatakan tidak ada temuan penghalang.
2. Perubahan kode/migrasi dibuat di DEV, bukan produksi.
3. `npm run check` dan `npm run build` lolos. Bila menyentuh UI atau akses, uji browser DEV dengan peran terkait. Bila menyentuh SQL, penguji `supabase/tests/` dijalankan bila stack tersedia.
4. Hasil verifikasi dicatat di `HANDOVER.md`, termasuk apa yang belum teruji.
5. Deploy produksi hanya setelah persetujuan pemilik, dengan backup dan smoke test sesuai `docs/DEPLOYMENT.md`.

## 19. Batasan rencana ini

- Rencana disusun dari laporan review statis bertanggal 28 November 2026. Tidak ada uji browser, uji RLS live, atau kueri database yang dijalankan saat menyusun rencana.
- Status produksi bersumber dari `docs/STATUS-PRODUKSI-SATU-VERSI.md` dan `HANDOVER.md`, bukan verifikasi langsung ke server.
- Urutan paket adalah rekomendasi berdasarkan dampak dan ketergantungan, bukan jadwal yang disetujui. Pemilik dapat mengubah urutan.
- Rencana ini masih harus melewati putaran review verifikasi sebelum dipakai sebagai dasar implementasi.

## 20. Catatan loop review

- Putaran 1: dua reviewer paralel. Hasil: 1 Blocker, 12 Major, 14 Minor. Blocker A08 (keputusan terbuka yang sudah masuk langkah implementasi) diperbaiki dengan memindahkannya ke Paket 14.
- Perbaikan utama lain: helper otorisasi diekstrak sebagai prasyarat Paket 2; kepemilikan error autosave disatukan di Paket 3; gate rekomendasi dibatasi ke snapshot baru agar 7 snapshot lama tidak tertolak; mekanisme persetujuan dan ID snapshot dibuat konkret; verifikasi performa dan token kedaluwarsa diberi alat dan angka; duplikasi pekerjaan antar Paket 2, 4, 5, dan 9 dihapus; `npm run build` ditambahkan ke definisi selesai.
- Putaran 2: review verifikasi terhadap draf 2. Semua 24 koreksi dari putaran 1 hadir, tidak ada Blocker baru, rencana dinyatakan layak dipakai. Lima temuan kecil diperbaiki di draf 3: kolom `finalized_at` menggantikan `created_at` pada opsi pembatasan waktu di Paket 5, nomor baris `actions.ts` yang sudah bergeser dihapus, aturan baris baseline PDF ditentukan, dua rujukan di `INDEX.md` diselaraskan, dan dua berkas pemanggil helper ditambahkan ke daftar berkas Paket 2.
- Putaran 3: verifikasi tertutup terhadap lima perbaikan di atas. Hasil: tidak ada temuan baru, loop dihentikan. Rencana siap diajukan untuk persetujuan pemilik, bukan untuk langsung dieksekusi.
