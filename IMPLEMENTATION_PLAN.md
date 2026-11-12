# Rencana Implementasi — DAD Assessment & Cadre Development System

Acuan produk dan aturan akses: `BLUEPRINT.md`. Kondisi terkini: `HANDOVER.md`. Riwayat sesi dan status lama: `docs/archive/`.

Prinsip kerja: tetap pada Next.js + Supabase yang sudah berjalan; otorisasi di server dan RLS; migrasi SQL bertahap dan dapat ditinjau; keputusan terakhir pengguna mengalahkan dokumen; data simulasi saja sampai tinjauan keamanan/privasi; jangan menambah dependensi tanpa kebutuhan.

## Tahapan dan ketergantungan (per 12 Nov 2026)

| # | Tahap | Status |
|---|-------|--------|
| 1 | Fondasi — audit, skema, autentikasi, role, RLS | Selesai dan diterima (Tahap 1–2) |
| 2 | Kegiatan dan peserta — kegiatan, peserta, komisariat, materi, penugasan | Selesai dan diterima (Tahap 3, 29 Okt 2026) |
| 3 | Competency Framework v1 — enam aspek, 27 indikator, bobot, relasi | Migration diterapkan; regression SQL lulus |
| 4 | Rubric Engine — rubrik master per indikator, anchor 1–5, mapping materi/aktivitas | Migration diterapkan; regression SQL lulus; `/dashboard/kerangka` tampil |
| 5 | Assessment Workspace — nilai independen per Observer/Instruktur, autosave, offline, Realtime, submission, audit | Migration terpasang; regression SQL lulus (12 Nov); uji browser/dua akun/konflik/Realtime **belum** dijalankan |
| 6 | Scoring & Collective Evaluation — agregasi, coverage 80%, moderasi, keputusan manual, snapshot immutable | Migration terpasang; regression SQL lulus; uji browser/finalisasi **belum** |
| 7 | Dashboard, Rapor & Export — snapshot publikasi, PDF/ZIP/Excel, audit ekspor | Migration terpasang; regression SQL dilaporkan berhasil; uji browser/publikasi/ekspor **belum** |
| 8 | Analitik & rekap lintas kegiatan | Belum dikerjakan |
| 9 | Evaluasi program & impor tes (.xlsx, khusus Admin Sistem bila dilanjutkan) | Ditunda atas arahan pengguna |
| 10 | Pengembangan kader 30/60/90 hari | Belum dikerjakan; bergantung hasil final dan kebijakan akses |
| 11 | QA & persiapan rilis — uji alur, RLS lintas role, backup, deployment | Menunggu tahap 5–7 terverifikasi; data nyata dilarang sebelum tinjauan |

## Backlog kualitas kode (12 Nov 2026 — sebagian besar selesai)

Ditemukan audit 12 Nov 2026; detail di HANDOVER.md:

1. Gate kualitas (selesai 12 Nov): ESLint + Prettier + CI; seluruh sumber diformat.
2. Ekstrak helper normalisasi relasi Supabase (`firstRelated`/`relatedRows`) ke `lib/relations.ts`; label tahap ke `lib/stage-labels.ts` — selesai.
3. Ganti seluruh pemakaian `any` (66 titik) dengan tipe `lib/supabase-rows.ts`; `no-explicit-any` kembali ke error — selesai.
4. Pecah `app/dashboard/penilaian/actions.ts` menjadi `rubric-actions.ts` (rubrik), `assignment-actions.ts` (penugasan), `assessment-actions.ts` (simpan nilai/catatan), `internal.ts` (staffClient) — selesai.
5. Konten demo statis dipindah ke `components/simulated-panels.tsx`; navigasi `label → href` jadi tabel data — selesai.
6. Logika data ringkasan dashboard dipindah ke `lib/phase7-home.ts`; duplikasi cabang role diciutkan; `snapshotIds` → `rubricVersionIds` — selesai.
7. Sisa: sel autosave/konflik offline (`set-state-in-effect`, 6 titik) dan `<img>` foto privat (6 titik) — menunggu uji browser; semua refactor 12 Nov belum dicek di browser.

## Update 13 November 2026

- **Tahap 5–7 — verifikasi browser sebagian berjalan.** Nilai independen dua observer, autosave, konflik draf (lokal & remote), catatan per penulis, Evaluasi Kolektif (agregasi, moderasi flag, draf rekomendasi otomatis, draf evaluasi), dan Realtime terverifikasi live. **Finalisasi → publikasi rapor → ekspor belum bisa dijalankan** karena BUG-003 (agregator `overall` mensyaratkan total bobot rubrik = 100%; event trial berbobot 200%). Perlu keputusan produk sebelum finalisasi dapat diuji.
- **Tahap 8 — implementasi v1 terpasang & diverifikasi di browser** (`/dashboard/analitik`; role admin_system & bidang_kader; agregat lintas kegiatan: jumlah kegiatan/peserta, peserta final, rapor terbit, distribusi keputusan — tanpa skor individu atau catatan pribadi). Menu "Analitik & Rekap" kini aktif untuk kedua role (admin_system & bidang_kader). Upgrade lanjutan (tren waktu, ekspor, lintas-event per aspek) masih terbuka.
- **Tahap 10** — belum dimulai (bergantung 5–8 terverifikasi penuh).
- **Tahap 11** — belum (menunggu BUG-003 + keputusan rilis manusia).

## Update kedua 13 November 2026

- **BUG-003 ditutup (per jenis penilaian).** Finalisasi/Rapor/Publish/Ekspor kini jalan end-to-end untuk Peserta 01 (2 penilaian, 2 snapshot, 2 publikasi, audit ekspor). Verifikasi penuh 6 migration Phase 5–7 + 3 migration baru (evaluasi per penilaian, gate moderasi per jenis, publish per evaluasi).
- **Tahap 6/7 — verifikasi browser selesai untuk alur inti** (draft → submit → moderasi → finalisasi → snapshot immutability (trigger) → publish → rapor → ekspor + audit).
- **Manajemen:** peserta masih belum punya akun; RPT-001..005 menunggu keputusan metode akses peserta.
