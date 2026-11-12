# Handover — IMM Observer

**Terakhir diperbarui:** 12 November 2026 (konsolidasi dokumen)
**Lokasi proyek:** `C:\Users\Lenovo\Documents\project` (dev Windows); salinan kerja sesi ini: `/home/ibaysander/Documents/Freelance/SIMPEL-IMM` (Linux)

Dokumen ini hanya mencatat kondisi terkini. Riwayat sesi dan bukti verifikasi lama tersimpan verbatim di `docs/archive/`:

- `docs/archive/HANDOVER-2026-11-12.md` — log sesi lengkap sampai 12 November 2026
- `docs/archive/BLUEPRINT-status-2026-11-12.md` — status proyek yang semula di BLUEPRINT.md

Keputusan produk tetap di `BLUEPRINT.md`; urutan fase dan ketergantungan di `IMPLEMENTATION_PLAN.md`. Dokumen di root proyek: `AGENTS.md` (aturan kerja), `README.md` (cara menjalankan), `docs/QA_PHASE8_TEST_PLAN.md` (rencana uji), `docs/TRIAL_DAD_COMPETENCY_FRAMEWORK.md` (spesifikasi trial).

## Kondisi saat ini

- Stack: Next.js 16.4.3, React 19.2, TypeScript strict, Supabase (Auth, PostgreSQL RLS, Storage). Dev menggunakan Windows (PowerShell); verifikasi otomatis berjalan di Linux via GitHub Actions (`.github/workflows/ci.yml`).
- Kualitas kode (12 Nov): ESLint 9 flat config + Prettier terpasang; `npm run check` = typecheck + lint + format:check + test. Hasil terakhir: **0 error lint** (18 warning), typecheck lolos, tes **12/12**, `npm run build` lolos di Linux. Build Windows sebelumnya gagal `EPERM` di prerender — belum diuji ulang.
- CI belum pernah berjalan (baru ditulis, belum di-push).
- `@typescript-eslint/no-explicit-any` sudah kembali ke aturan default (error) sejak refactor tipe 12 Nov 2026 — pemakaian `any` di seluruh app/components/lib telah dihapus (tipe baris RPC/relasi didefinisikan di `lib/supabase-rows.ts`, batas konversi).
- Dua aturan sengaja masih dijadikan peringatan: `react-hooks/set-state-in-effect` (sel autosave/konflik offline; perlu refactor dengan uji browser) dan `@next/next/no-img-element` (foto privat signed URL). `react-hooks/exhaustive-deps` menyisakan 5 peringatan pada sel yang sama.

## Refactor kode (12 Nov 2026)

- Helper normalisasi relasi Supabase dipusatkan di `lib/relations.ts` (`relatedRows`, `firstRelated`, tipe `Relation`) dan label tahap di `lib/stage-labels.ts` — menggantikan ≥5 salinan sebaris.
- Pemuatan data dashboard (ringkasan staf, progres pribadi, rapor Peserta) dipindah dari `app/dashboard/page.tsx` ke `lib/phase7-home.ts`; tipe `Phase7Home` dipakai bersama `components/role-dashboard.tsx`. Cabang role ganda (admin/bidang_kader vs koordinator Instruktur) diciutkan; tabel ringkasan memakai `MODERATOR_POSITIONS`.
- `components/role-dashboard.tsx`: konten demo statis (agenda, profil instruktur simulasi, kartu kegiatan) dipindah ke `components/simulated-panels.tsx` dengan penanda "KONTEN SIMULASI"; navigasi `label → href` kini tabel data `navDestinations` menggantikan kondisi berantai panjang; lencana jumlah "Observasi 3" yang dikarang dan tidak bersumber data dihapus; `AppRole` dipindah ke `lib/roles.ts`.
- `app/dashboard/penilaian/actions.ts` (±2.200 baris setelah formatting) dipecah per domain: `rubric-actions.ts` (14 action rubrik), `assignment-actions.ts` (7 action penugasan), `assessment-actions.ts` (4 action simpan nilai/catatan), `internal.ts` (staffClient). Situs impor di halaman/komponen diperbarui; file lama dihapus (riwayat ada di git).
- Perbaikan kecil: `app/login/page.tsx` memakai `<Link>`; variabel `snapshotIds` di halaman laporan diganti nama menjadi `rubricVersionIds`.

## Terpasang dan terverifikasi (laporan pengguna)

- Phase 2–4: migration framework kompetensi DAD, rubric engine, mapping materi — migration dan SQL regression dilaporkan lulus di Supabase pengguna; halaman `/dashboard/kerangka` tampil.
- Phase 5: migration `20261111160000_dad_assessment_workspace_v1.sql` terpasang; regression `dad_assessment_phase5.sql` lulus.
- Phase 6: migration `20261112170000_dad_scoring_collective_evaluation_v1.sql` terpasang; regression `dad_scoring_phase6.sql` lulus (setelah perbaikan placeholder `80%%`).
- Phase 7: migration `20261112180000_dad_reporting_publication_v1.sql` terpasang (dijalankan dalam tiga bagian; idempotent); regression `dad_reporting_phase7.sql` dilaporkan berhasil.
- Alur yang sudah diuji browser pengguna: login Admin & Observer, dashboard Admin, Observasi (autosave, submit/buka kembali), perbaikan BUG-001 (RPC ambiguous) dan BUG-002 (indikator tidak tampil) pada 12 Nov pagi.

## Belum diuji (jangan diklaim jalan)

- Dua akun dengan rubrik sama, konflik skor/catatan, Realtime, finalisasi, publikasi rapor, ekspor PDF/ZIP/Excel
- RLS lintas role end-to-end (Observer/Instruktur/Peserta/Bidang Kader/Komisariat)
- Akun Instruktur dan Peserta di browser; impor hasil tes (.xlsx)
- Build di Windows (error `EPERM` lama)
- Data masih simulasi. Jangan masukkan data nyata sebelum tinjauan keamanan, privasi, backup, dan biaya.

## Langkah berikutnya (urutan)

1. Uji browser dua akun dan konflik/Realtime sesuai `docs/QA_PHASE8_TEST_PLAN.md` (penting: semua refactor 12 Nov belum diperiksa di browser sama sekali).
2. Refactor sel autosave/konflik offline (`set-state-in-effect`, 6 titik) agar lulus rule — hanya dengan uji browser; lalu kembalikan aturan tersebut ke `error`.
3. Tinjau pemakaian `<img>` untuk foto privat (6 titik): tetap `<img>` atau optimasi gambar; kembalikan aturan ke `error` bila diputuskan.
4. Build Windows dan jalankan CI setelah push.

## Cara menjalankan

```powershell
cd "C:\Users\Lenovo\Documents\project"
npm.cmd run dev    # http://localhost:3000
npm.cmd run check  # verifikasi lokal
```

Hentikan server dengan `Ctrl+C`.
