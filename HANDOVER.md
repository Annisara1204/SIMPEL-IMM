# Handover — IMM Observer

**Terakhir diperbarui:** 12 November 2026 (perbaikan UI/UX + QA browser)
**Lokasi proyek:** `C:\Users\Lenovo\Documents\project` (dev Windows); salinan kerja sesi ini: `/home/ibaysander/Documents/Freelance/SIMPEL-IMM` (Linux)

Dokumen ini hanya mencatat kondisi terkini. Riwayat sesi dan bukti verifikasi lama tersimpan verbatim di `docs/archive/`:

- `docs/archive/HANDOVER-2026-11-12.md` — log sesi lengkap sampai 12 November 2026
- `docs/archive/BLUEPRINT-status-2026-11-12.md` — status proyek yang semula di BLUEPRINT.md

Keputusan produk tetap di `BLUEPRINT.md`; urutan fase dan ketergantungan di `IMPLEMENTATION_PLAN.md`. Dokumen di root proyek: `AGENTS.md` (aturan kerja), `README.md` (cara menjalankan), `docs/QA_PHASE8_TEST_PLAN.md` (rencana uji), `docs/TRIAL_DAD_COMPETENCY_FRAMEWORK.md` (spesifikasi trial).

## Kondisi saat ini

- Stack: Next.js 16.4.3, React 19.2, TypeScript strict, Supabase (Auth, PostgreSQL RLS, Storage). Dev menggunakan Windows (PowerShell); verifikasi otomatis berjalan di Linux via GitHub Actions (`.github/workflows/ci.yml`).
- Kualitas kode (12 Nov): ESLint 9 flat config + Prettier terpasang; `npm run check` = typecheck + lint + format:check + test. Hasil terakhir: **0 error lint** (18 warning), typecheck lolos, tes **12/12**, `npm run build` lolos di Linux. Build Windows sebelumnya gagal `EPERM` di prerender — belum diuji ulang.
- **Perbaikan UI/UX (12 Nov, sore)** — di-commit 12 Nov 2026 (belum push):
  - Navigasi internal memakai `<Link>` + `usePathname()`; item href kini dapat kelas `.active` dan `aria-current="page"`. Breadcrumb untuk halaman pratinjau konsisten dengan judul.
  - Menu tanpa halaman kini menampilkan empty state ("MENU DALAM PENGEMBANGAN" + "Kembali ke Ringkasan") — sebelumnya banner "Pratinjau navigasi" tampil di atas seluruh isi dashboard.
  - Fokus keyboard global: rule `:focus-visible` (outline maroon) untuk semua elemen interaktif; `outline: none` pada select dihapus.
  - Kontras teks muted dinaikkan ke minimal 4.5:1 (nilai tunggal `#56665d` sage, `#6f5a64` maroon; status selesai/berjalan → `#3e7c57` / `#8a5a1d`).
  - `.signout-button` ("Keluar") dan `.login-footnote a` kini ter-style; logo `.login-mark` dot tidak lagi turun ke bawah kotak; sidebar di layar pendek bisa di-scroll (`overflow-y: auto`); tombol "Login pengguna" tidak pecah baris di mobile.
  - `app/icon.svg` baru (favicon); tautan internal di `app/dashboard/page.tsx`, `app/dashboard/profil/page.tsx`, `components/role-dashboard.tsx` dipindah ke `<Link>`.
- **Design system batch 2 (12 Nov, malam)** — di-commit 12 Nov 2026 (belum push):
  - `next/font/google` (DM Sans + Manrope) menggantikan `@import` Google Fonts; font disajikan self-hosted dari `/_next/static/media` (tidak ada request ke Google; diverifikasi via computed style & tanpa error dev server).
  - `lucide-react@1.72.0` terpasang; glyph Unicode (`▦ ◷ ♧ …` ☰ ×) diganti komponen Lucide di seluruh menu & tombol mobile; `.nav-icon` kini inline-flex SVG.
  - Token warna diperluas di `:root` (`--color-primary(-dark/-soft/-wash)`, `--color-surface(-soft)`, `--color-border(-soft/-input)`, `--color-label`, `--muted-warm`); seluruh `#8b1e3f`, `#64142d`, `#eee8eb`, `#ded7da`, `#62595d`, `#faf8f9`, `#f0ecee`, `#f8f7f8`, `#f8eef1`, `#fbf6f8`, `#fff`, `#56665d`, `#6f5a64` diganti referensi token; variabel menyesatkan `--green`/`--green-dark` (isinya maroon) dihapus. Hex unik: 234 → < 190.
  - Palet hijau halaman Kerangka (`/dashboard/kerangka`) diseragamkan ke brand maroon (aksen status hijau "selesai/diterbitkan" dipertahankan sebagai semantik).
  - 79 `<th>` diberi `scope="col"`/`scope="row"` di 9 berkas; blok `prefers-reduced-motion` ditambahkan; `.chevron`/`.arrow` yang tidak terpakai dihapus.
  - Verifikasi: `npm run check` exit 0 (0 error, 18 warning lint lama, format & tes 12/12); screenshot desktop & iPhone 14 diperiksa (beranda, login, daftar, empty state, drawer mobile, ring fokus); error sesaat "Objects are not valid as a React child" di log dev (01:06) adalah keadaan transien selama edit ikon, tidak berulang setelah state akhir.
  - Belum diverifikasi visual: halaman terautentikasi (butuh kredensial); tombol "Keluar" hanya ditinjau dari CSS. `.sidebar` dan `.empty-state` belum diuji di Windows (target dev pengguna).
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
