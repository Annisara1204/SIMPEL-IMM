# Rencana Implementasi — DAD Assessment & Cadre Development System

Acuan produk dan aturan akses: `BLUEPRINT.md`. Otoritas tunggal untuk keadaan produksi dan branch kerja per 24 November 2026: `docs/STATUS-PRODUKSI-SATU-VERSI.md`. Rincian dan riwayat: `HANDOVER.md` dan `docs/archive/`.

Prinsip kerja: tetap pada Next.js + Supabase yang sudah berjalan; otorisasi di server dan RLS; migrasi SQL bertahap dan dapat ditinjau; keputusan terakhir pengguna mengalahkan dokumen; data simulasi saja sampai tinjauan keamanan/privasi; jangan menambah dependensi tanpa kebutuhan.

## Status rilis per 24 November 2026

- Produksi aktif memakai commit `0448100`, hasil deploy 24 November pagi. Rincian server, basis data, akun, backup, dan sisa risiko ada di `docs/STATUS-PRODUKSI-SATU-VERSI.md`.
- Pekerjaan branch `research/peta-alur-penilaian` sampai commit `a6d61be` (Fase 1–4 dan uji finalize/ekspor) selesai di DEV dan **belum di-deploy ke PROD**. Migrasi baru branch `20261124100000` sampai `20261124140000` hanya terpasang di DEV.
- Status rilis masih **menunggu izin tertulis pemilik**. Sebelum deploy, jalankan Fase 0b (nonaktifkan pendaftaran, cabut grant anon, putar kunci, lengkapi backup, verifikasi 14 butir) seperti tercatat di dokumen status, lalu ikuti `docs/DEPLOYMENT.md` (backup dulu, rsync tanpa `--delete`).
- Bukti per fase (semua DEV, data simulasi):
  - Fase 1 (keputusan dan rencana): `docs/KEPUTUSAN-KOREKSI-ALUR.md`, `docs/PERSETUJUAN-OWNER-16-PERTANYAAN.md`.
  - Fase 2: `docs/HASIL-FASE2-DEV.md`.
  - Fase 3a–3c: `docs/HASIL-FASE3-DEV.md`; Fase 3e–3g: `docs/HASIL-FASE3EFG-DEV.md`; Fase 3f: `docs/HASIL-FASE3F-DEV.md`.
  - Fase 4: `docs/HASIL-FASE4-DEV.md`.
  - Uji finalize, publish, dan ekspor: `docs/HASIL-UJI-FINALIZE-EKSPOR-DEV.md`.
- Urutan pasang migrasi dan uji browser: `docs/LANGKAH-PASANG-MIGRASI-DAN-UJI.md`.

## Tahapan dan ketergantungan (diperbarui 24 Nov 2026)

| # | Tahap | Status |
|---|-------|--------|
| 1 | Fondasi — audit, skema, autentikasi, role, RLS | Selesai dan diterima (Tahap 1–2) |
| 2 | Kegiatan dan peserta — kegiatan, peserta, komisariat, materi, penugasan | Selesai dan diterima (Tahap 3, 29 Okt 2026) |
| 3 | Competency Framework v1 — enam aspek, 27 indikator, bobot, relasi | Migration diterapkan; regression SQL lulus |
| 4 | Rubric Engine — rubrik master per indikator, anchor 1–5, mapping materi/aktivitas | Migration diterapkan; regression SQL lulus; `/dashboard/kerangka` tampil |
| 5 | Assessment Workspace — nilai independen per Observer/Instruktur, autosave, offline, Realtime, submission, audit | Migration terpasang; regression SQL lulus. Uji browser dua akun/konflik/Realtime selesai di DEV (13 Nov dan 24 Nov). Verifikasi PROD untuk perubahan branch belum ada |
| 6 | Scoring & Collective Evaluation — agregasi, coverage 80%, moderasi, keputusan manual, snapshot immutable | Migration terpasang; regression SQL lulus. Uji browser/finalisasi selesai di DEV (13 Nov dan 24 Nov) |
| 7 | Dashboard, Rapor & Export — snapshot publikasi, PDF/ZIP/Excel, audit ekspor | Migration terpasang; regression SQL lulus. Uji browser/publikasi/ekspor selesai di DEV, termasuk finalize satu klik dan semua tombol ekspor |
| 8 | Analitik & rekap lintas kegiatan | Selesai dan terverifikasi di browser sebagai Kader (13 Nov): agregat lintas kegiatan, tanpa identitas/skor individu/catatan pribadi. Upgrade lanjutan masih terbuka |
| 9 | Evaluasi program & impor tes (.xlsx, khusus Admin Sistem bila dilanjutkan) | Ditunda atas arahan pengguna |
| 10 | Pengembangan kader 30/60/90 hari | Belum dikerjakan; bergantung hasil final dan kebijakan akses |
| 11 | QA & persiapan rilis — uji alur, RLS lintas role, backup, deployment | Fase 1–4 branch `research/peta-alur-penilaian` selesai di DEV; deploy PROD **belum** dan menunggu izin tertulis pemilik. Fase 0b wajib sebelum deploy. Data nyata dilarang sebelum tinjauan |

Catatan: status di tabel ini adalah ringkasan per 24 November 2026. Bagian "Backlog kualitas kode" dan "Update ... 13 November 2026" di bawah adalah riwayat; klaim "belum" di sana sudah diganti oleh ringkasan dan tabel di atas.

## Backlog kualitas kode (12 Nov 2026 — sebagian besar selesai)

Ditemukan audit 12 Nov 2026; detail di HANDOVER.md:

1. Gate kualitas (selesai 12 Nov): ESLint + Prettier + CI; seluruh sumber diformat.
2. Ekstrak helper normalisasi relasi Supabase (`firstRelated`/`relatedRows`) ke `lib/relations.ts`; label tahap ke `lib/stage-labels.ts` — selesai.
3. Ganti seluruh pemakaian `any` (66 titik) dengan tipe `lib/supabase-rows.ts`; `no-explicit-any` kembali ke error — selesai.
4. Pecah `app/dashboard/penilaian/actions.ts` menjadi `rubric-actions.ts` (rubrik), `assignment-actions.ts` (penugasan), `assessment-actions.ts` (simpan nilai/catatan), `internal.ts` (staffClient) — selesai.
5. Konten demo statis dipindah ke `components/simulated-panels.tsx`; navigasi `label → href` jadi tabel data — selesai.
6. Logika data ringkasan dashboard dipindah ke `lib/phase7-home.ts`; duplikasi cabang role diciutkan; `snapshotIds` → `rubricVersionIds` — selesai.
7. **Riwayat (12 Nov):** sisa sel autosave/konflik offline (`set-state-in-effect`, 6 titik) dan `<img>` foto privat (6 titik) menunggu uji browser; semua refactor 12 Nov belum dicek di browser. Sesuai `HANDOVER.md`, kedua aturan kembali ke `error` dan sudah diverifikasi di browser pada 13 Nov.

## Update 13 November 2026

- **Tahap 5–7 — verifikasi browser sebagian berjalan.** Nilai independen dua observer, autosave, konflik draf (lokal & remote), catatan per penulis, Evaluasi Kolektif (agregasi, moderasi flag, draf rekomendasi otomatis, draf evaluasi), dan Realtime terverifikasi live. **Finalisasi → publikasi rapor → ekspor belum bisa dijalankan** karena BUG-003 (agregator `overall` mensyaratkan total bobot rubrik = 100%; event trial berbobot 200%). Perlu keputusan produk sebelum finalisasi dapat diuji.
- **Tahap 8 — implementasi v1 terpasang & diverifikasi di browser** (`/dashboard/analitik`; role admin_system & bidang_kader; agregat lintas kegiatan: jumlah kegiatan/peserta, peserta final, rapor terbit, distribusi keputusan — tanpa skor individu atau catatan pribadi). Menu "Analitik & Rekap" kini aktif untuk kedua role (admin_system & bidang_kader). Upgrade lanjutan (tren waktu, ekspor, lintas-event per aspek) masih terbuka.
- **Tahap 10** — belum dimulai (bergantung 5–8 terverifikasi penuh).
- **Tahap 11 — riwayat (13 Nov):** belum (menunggu BUG-003 + keputusan rilis manusia). BUG-003 sudah ditutup di bagian "Update kedua", dan status release per 24 Nov ada di ringkasan di atas.

## Update kedua 13 November 2026

- **BUG-003 ditutup (per jenis penilaian).** Finalisasi/Rapor/Publish/Ekspor kini jalan end-to-end untuk Peserta 01 (2 penilaian, 2 snapshot, 2 publikasi, audit ekspor). Verifikasi penuh 6 migration Phase 5–7 + 3 migration baru (evaluasi per penilaian, gate moderasi per jenis, publish per evaluasi).
- **Tahap 6/7 — verifikasi browser selesai untuk alur inti** (draft → submit → moderasi → finalisasi → snapshot immutability (trigger) → publish → rapor → ekspor + audit).
- **Manajemen — riwayat (13 Nov):** peserta masih belum punya akun; RPT-001..005 menunggu keputusan metode akses peserta. Metode akses sudah diputuskan sebagai username dan kata sandi biasa, tanpa SMTP/TOTP, tetapi akun dan rapor Peserta tidak dibagikan karena produksi memakai IP tanpa domain/TLS; RPT-001..005 ditunda.
