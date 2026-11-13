# Refactor Frontend — IMM Observer (13 November 2026)

Dokumen ini mencatat hasil tiga audit subagent paralel (kualitas kode & arsitektur, UI/UX & desain, performa & Next.js), keputusan yang diambil, yang sudah dikerjakan, dan yang sengaja ditunda (dengan alasan). Semua perubahan menunggu verifikasi: `npm run check` (typecheck + lint + format + tes 12/12), `npm run build`, dan uji browser di server lokal (probe `http://localhost:3100`, database DEV) — publik, login, dashboard admin, 7 halaman internal, halaman 404, alur Observasi hingga grid penilaian (label skala terkonsolidasi tampil benar; "Realtime tersambung" terverifikasi).

## Ringkasan eksekutif audit

- **Kode:** sudah rapi di level dasar (0 `any`, 0 `console.log`, batas tipe Supabase di `lib/supabase-rows.ts`), tapi logika tampilan terduplikasi ≥3×, boilerplate auth disalin 17×, tidak ada `error.tsx`/`loading.tsx`, dan satu berkas mati (`observation-cell.tsx`).
- **UI/UX:** sisa "AI slop" dari migrasi palet hijau→maroon: ~1.100 baris CSS mati, `<h2>` tanpa kelas (59×), label simulasi basi di halaman berbasis DB, `<a>` internal mentah (full reload), jargon "migrasi" untuk panitia non-teknis, glyph Unicode alih-alih ikon, event-switch/footer hardcoded "DAD Simulasi 2026".
- **Performa:** fetch signed-URL N+1 (ratusan HTTP call/halaman), waterfall query di laporan, payload RSC berat (`snapshot_data` penuh dikirim ke client component), `router.refresh()` realtime tanpa debounce, derivasi berulang tanpa memo di panel laporan.

## Yang sudah dikerjakan (commit)

### 5dafa37 — Konsolidasi label & validasi

- `lib/scoring.ts`: `SCORE_SCALE_LABELS` (menggantikan 6 salinan inline).
- `lib/decision-labels.ts` (baru): `decisionLabels`/`decisionLabel` — dipakai di rapor PDF (`lib/phase7-files.ts`), `phase7-report-workspace.tsx`, `role-dashboard.tsx` (menggantikan 3 teks keputusan yang berbeda-beda huruf besarnya).
- `lib/validation.ts` (baru): `uuidPattern` + `isUuid` — 11 definisi lokal & ±50 pemakaian inline disatukan.
- `lib/stage-labels.ts`: `stageOrder` (bernomor, alur pilih) & `stageCards` (kartu rekap) — menggantikan 2 salinan `STAGES` yang berbeda labelnya.
- `lib/scoring.ts` `categorizeScore` dipakai ulang di `lib/phase7-files.ts` dan `phase7-report-workspace.tsx` (hapus 2 salinan `category()`).
- `isModeratorPosition` dipakai di `evaluasi/page.tsx` (hapus 2 salinan array posisi moderator).
- **Dihapus:** `app/dashboard/observasi/observation-cell.tsx` (305 baris, tidak pernah diimpor — salinan lama logika rating).

### c54e546 — CSS, error boundary, metadata, link, copy

- `globals.css`: ~1.110 baris aturan mati prototipe lama dihapus (event-banner, stats-grid, stat-card, progress-ring, timeline, agenda-item/main/footer, role-control, nav-count, notification, icon-button, lower-grid, more-button, note-dot, mini-avatars, outline-button, decor-one/two, banner-decoration, chevron, legend-done/pending, status-badge, competency-material-grid + blok media terkait). Duplikat disatukan: `.page-footer` (font-size 9px/10px → 10px), `.rubric-activate` (36/40px → 40px), `.observation-cell` (2 blok 760px), `.mini-bar i`, `.mini-bar { flex:1 }` dikembalikan (bukan duplikat). Selector mustahil dihapus. 5× deklarasi `font: Npx inherit` (invalid, dibuang browser) diperbaiki.
- `h2` global: Manrope 700 16px, `--ink`, letter-spacing -0.25px (aturan berkelas tetap menang).
- `:root`: alias legacy `--ink/--muted/--line` → netral hangat (`#302a2d`/`#6f5a64`/`#eee8eb`); aksen hijau dekoratif → token maroon (`.nav-link.active/hover`, `.event-dot`, `.eyebrow span`, lime `#c8ef7c` → `#f1c5d1`); hijau tersisa hanya untuk status sukses.
- `.users-heading`: `flex-wrap: wrap` (pill tidak memaksa judul mengecil di HP).
- Halaman kosong/galat: `app/error.tsx`, `app/dashboard/error.tsx` (dengan tombol Muat ulang + Link kembali), `app/dashboard/loading.tsx`, `app/not-found.tsx` — semua Bahasa Indonesia, menggantikan halaman error bawaan Next (Inggris).
- `<a href="/…">` internal → `<Link>` (34 literal + 18 dinamis). `<a target="_blank">` dan anchor `#` tetap `<a>`.
- Jargon UI: ±58 pesan "migrasi/README/Tahap N" diganti "Aplikasi belum siap digunakan. Hubungi Admin sistem." / "Data belum dapat dibaca. Hubungi Admin sistem bila masalah berulang."
- Label basi "TAHAP 3 · DATA SIMULASI", tag `SIMULASI`, dan `CONTOH SIMULASI` pada halaman yang sudah berbasis DB (Peserta, Komisariat) dihapus. Event-switch & footer tidak lagi hardcode "DAD Simulasi 2026"/"Data simulasi…" (footer: "Seluruh data pada fase ini bersifat simulasi").
- `robots: { index: false, follow: false }` di root metadata (fase uji coba; portal belum untuk publik indeks); `X-Powered-By` dimatikan (`poweredByHeader: false`).
- `simulated-panels.tsx`: glyph Unicode (▣▤◌✦) → ikon `lucide-react` (`CalendarDays`, `ClipboardList`, `FileText`, `Sparkles`); dekorasi `.score-watermark` dihapus.

### 8ab9286 — Performa

- `lib/signed-urls.ts` (`signMany`): `createSignedUrls` batch; dipakai di 5 halaman (peserta, pengajuan, seleksi-komisariat, profil-instruktur, profil-peserta) — menghapus N+1 panggilan storage (±1 call per foto).
- `laporan/page.tsx`: query independen (moderator RPC, report rows RPC, rubric_versions, framework versions, kandidat peserta, private sources, progress) diparalelkan menjadi 2× `Promise.all` (sebelumnya 6–7 round-trip sekuensial).
- `observasi/page.tsx`: `rubric_versions` aktif difilter `.in("event_id", …)` untuk role non-admin (sebelumnya mengambil semua versi aktif lintas kegiatan).
- `assessment-realtime.tsx`: `router.refresh()` di-debounce 500 ms trailing (dari N refresh per burst autosave menjadi satu).
- `phase7-report-workspace.tsx`: seluruh derivasi mahal (`allGroups`, `allScopes`, `observerNames`, `publishedRows`, `finalized`, `decisionsCount`, `averageOverall`, `aspectSummary`, `aspectColumns`, `attentionRows`, `currentPreview`) di-`useMemo`; `reportFiles` (membangun seluruh data Rapor) kini dibangun hanya saat ekspor, bukan tiap render; lookup aspek per sel O(n·a²) diganti `Map` per baris; heatmap sel memakai kelas `.heat-low/.heat-mid/.heat-high/.heat-none`.
- `dashboard/page.tsx`: 3 query `instructor_event_assignments` → 1 (gate penugasan, cek moderator, dan isi panel diturunkan dari hasil yang sama).

### d43e711 — UX kecil & hotfix

- Login: tombol Tampilkan/Sembunyikan kata sandi (`aria-pressed`, `aria-label`), `.password-field`/`.password-toggle` (specificity menang atas `.login-form button`).
- `assessment-rating-cell.tsx`: listener `assessment-realtime-change` tidak di-subscribe ulang tiap ketikan (nilai `saved`/`value` via ref + effect).
- `pengguna/actions.ts`: `redirect()` dipindah keluar `try/catch` (sebelumnya bocor lewat catch hanya karena `NEXT_REDIRECT` bukan "belum dikonfigurasi").
- Sidebar: blok "Butuh bantuan?" tidak lagi tampil sebagai tombol (dulu `.help-icon` lingkaran "?" yang bukan elemen interaktif) — teks: "Hubungi Admin atau panitia kegiatan". `.help-icon` dihapus dari CSS.

## Verifikasi

- `npm run check` hijau (0 error lint; format & tes 12/12), `npm run build` hijau di Linux (route list sama seperti sebelumnya; `/`, `/login`, `/_not-found` statis; sisanya dinamis).
- Browser (server lokal `npm run start` port 3100, DB DEV): `/`, `/login` (toggle kata sandi berfungsi), dashboard admin (data Phase 7 tampil), `/dashboard/kerangka` (kontainer `.users-page` baru), `/dashboard/observasi` → alur pilih kegiatan → tahap → jenis → grid penilaian terbuka; opsi skala "1 · Sangat Kurang… 5 · Sangat Baik" tampil; "Realtime tersambung" tampil; 7 halaman internal lain render tanpa galat; `/halaman-tidak-ada` → 404 Bahasa Indonesia.
- Tidak ada perubahan skema database, RLS, RPC, atau berkas `.env*`.

## Shell bersama untuk semua halaman (13 Nov, sesi kedua)

Permintaan pemilik: "terkait sidebar dan halaman menurut saya ini aneh, inspect". Diagnosis dikonfirmasi di browser: `/dashboard` memakai app-shell penuh (sidebar + topbar), sedangkan 17 sub-halaman tampil polos tanpa navigasi — hanya teks "← Kembali ke dashboard" — dan beberapa menu adalah tombol mati yang menampilkan "MENU DALAM PENGEMBANGAN". Perbaikan (commit sesi kedua):

- `components/app-shell.tsx` (baru): sidebar + scrim + topbar bersama; breadcrumb diturunkan dari `usePathname()` (`lib/navigation.ts: breadcrumbLabel`); semua item menu adalah `<Link>` nyata; item tanpa halaman disembunyikan (tidak ada tombol mati); aktif = pencocokan `pathname` + prefix.
- `lib/navigation.ts` (baru): satu sumber `navDestinations` + `navHref` + `breadcrumbLabel` + `roleLabels` (dipakai server & client).
- `app/dashboard/layout.tsx` (baru): seluruh `/dashboard/*` dirender di dalam shell (dengan gerbang profil/role masing-masing halaman tetap berlaku sebagai pertahanan berlapis). Akun tanpa role lewat pass-through agar `/dashboard/profil` tetap bisa diisi; `/dashboard` sendiri menampilkan layar "menunggu penetapan akses".
- Portal publik `/` memakai shell yang sama (`AppShell role="public"`) — breadcrumb "Publik / Beranda", satu item menu Dashboard (dead buttons "Jadwal DAD"/"Profil Instruktur" dan "Pengaturan Sistem" dihapus; "Semua jadwal/profil →" publik juga dihapus).
- `components/role-dashboard.tsx` dipecah: `app-shell.tsx` (shell), `home-hero.tsx` (hero H1), `phase7-dashboard-home.tsx` (konten Phase 7), `simulated-panels.tsx` (konten simulasi; `onNavigate` dihapus — tombol internal kini `<Link>`).
- Menu dead-end dihapus/diperbaiki agar sesuai guard halaman: Bidang Kader kehilangan "Kegiatan DAD", "Peserta", "Observasi" (halaman menolak role-nya — nilai mentah memang tidak untuk Bidang Kader); Komisariat kehilangan "Analitik & Rekap" (khusus Admin/Bidang Kader).
- 15 back-link generik "← Kembali ke dashboard" dihapus (sidebar sudah jadi navigasi); "← Pilih … lain" (alur) tetap.
- `.users-page` padding mengikuti shell (`4px 0 0`); `/dashboard/profil` pakai `.login-page.embedded` (tidak lagi tinggi 100vh bersarang).

Verifikasi: `npm run check` + `npm run build` hijau; browser lokal (3100, DEV): publik, dashboard, 6 halaman lain, mobile 390px + drawer (`sidebar-open` toggle) — semua render dalam shell dengan breadcrumb benar.

## Sengaja TIDAK dikerjakan (dan alasannya)

1. **Migrasi shell dashboard ke `app/dashboard/layout.tsx`** (semua sub-halaman memakai sidebar/topbar yang sama, bukan hanya beranda). Perubahan struktural terbesar: menyentuh state sidebar (`mobileOpen`), routing grup, dan sekitar 17 halaman — berisiko tinggi tanpa regresi browser menyeluruh per peran. Rekomendasi: PR terpisah dengan checklist QA per role.
2. **Pemisahan payload `snapshot_data` penuh → DTO ramping + load-on-demand dari panel Laporan** (temuan performa High #1). Menyentuh alur ekspor PDF/ZIP/Excel (`lib/phase7-files.ts`, `toReport`) dan kontrol akses `canViewPrivate`; butuh keputusan desain data-transfer dan pengujian ekspor end-to-end dengan data nyata. Jangan dilakukan tanpa sesi khusus.
3. **`useActionState` / penyatuan pola error server action** (241 `throw`). Perilaku sekarang: error tertangkap `error.tsx` (baru) dengan pesan Indonesia — tidak teknis tapi aman. Penyatuan pola per-form = perubahan besar perilaku form; butuh per-form review.
4. **`proxy.ts` + `getClaims()` per request** — perlu verifikasi konfigurasi signing key Supabase (HS256 vs RS256) di dashboard Supabase, bukan hanya kode; dicatat sebagai temuan.
5. **Konsolidasi 8 nilai breakpoint → 3** dan konsolidasi skala radius/font-size — murni kosmetik, risiko visual luas; lakukan bertahap dengan diff visual per halaman.
6. **`lib/dashboard-results.ts`** adalah kode hampir-mati (hanya dipanggil bila `phase7Home == null`) — dibiarkan; penghapusan menunggu keputusan produk.
7. **Konten publik "DAD Simulasi 2026"** masih tampil (dengan tag `CONTOH SIMULASI` yang jujur) — keputusan pemilik produk: ganti dengan data nyata atau hapus sebelum rilis resmi; portal tetap `noindex` untuk sementara.
8. **Upload/rename `.sample-tag`, `.empty-state` vs `.users-empty`, `.pill` tunggal** — duplikasi lencana ada tapi tidak berbahaya; seragamkan saat kesempatan berikutnya menyentuh komponen tersebut.
9. **Split `components/role-dashboard.tsx` menjadi server shell + island client kecil** — bagian dari #1.
10. **`supabase gen types`** — akan menghapus ±18 cast `as unknown as`; butuh akses skema yang stabil & keputusan tim; dicatat.

## Risiko & tindak lanjut

- Poin 1 dan 2 adalah dua item bernilai terbesar yang belum dikerjakan; keduanya sengaja ditahan agar tidak merusak aplikasi yang sedang dibuka untuk uji coba.
- Setelah deploy, pantau: (a) error boundary (`/dashboard/error.tsx`) — bila sering muncul, ada regresi; (b) log pm2 (`pm2 logs imm`); (c) ukuran bundle `/` dan `/dashboard` dibanding sebelumnya.
- `docs/HANDOVER.md` diperbarui dengan sesi ini.
