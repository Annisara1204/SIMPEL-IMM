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

## Otomasi `/goal` & akun QA (12 Nov 2026, malam)

- OpenCode terpasang **v2.2.7** — `/goal` bawaan sejak v2.2.1 (release notes anomalyco/opencode); tidak perlu plugin. `docs/GOAL.md` berisi objective paste-ready + kriteria selesai + batas otonom (project DEV saja, data simulasi, tanpa destruktif, rilis tetap keputusan manusia).
- Project dev `thtwrkovcorgxzuqttal` dijangkau dari Linux; `.env.local` berformat **CRLF** — saat load di shell, buang `\r` dulu (`tr -d '\r'`), kalau tidak URL Supabase "Malformed input". Project `production imm` (crrqlwlfndhugcqcnkex) **tidak boleh** disentuh. `SUPABASE_SERVICE_ROLE_KEY` tidak ada di `.env.local`; yang tersedia personal access token (ditempel di chat sesi ini — **rotate setelah selesai**) dipakai hanya via shell env, tidak ditulis ke file/git.
- 5 akun QA sintetik dibuat di project dev (email `qa-auto-*@qa.imm-observer.invalid`, password acak, di **`.env.qa-test`** — di-gitignore lewat `.env*`): admin_system, 2× observer (ditugaskan ke `PK IMM FEB UM Bandung`), instruktur (MoT), bidang_kader. Kelimanya terverifikasi login HTTP 200. Akun lama tidak diubah. `observer_assignments`/`instructor_event_assignments` untuk A & B tercatat.
- `npm run check` exit 0 (typecheck + lint + format + tes 12/12; build Linux lolos). Belum ada Playwright; `agent-browser` (skill) dipakai untuk e2e. Akun Peserta belum ada (metode akses masih terbuka).
- Belum dijalankan di sesi ini: uji browser dua akun/konflik/Realtime, build Windows, dan seluruh isi `docs/GOAL.md` — itu tugas sesi otonom `/goal` berikutnya.

## Cara menjalankan

```powershell
cd "C:\Users\Lenovo\Documents\project"
npm.cmd run dev    # http://localhost:3000
npm.cmd run check  # verifikasi lokal
```

Hentikan server dengan `Ctrl+C`.

## Sesi otomasi & verifikasi browser (13 November 2026)

Tujuan: menindaklanjuti `docs/GOAL.md` (otomasi penyelesaian aplikasi via `/goal`). Sebelum eksekusi, riset menetapkan: `/goal` bawaan OpenCode ≥ v2.2.1 (terpasang: v2.2.7); OpenCode V2 **tidak** memiliki `/goal` sebagai perintah Markdown Bawaan — yang tersedia adalah native goal mode; plugin pihak ketiga (`@prevalentware/opencode-goal-plugin`) tidak diperlukan.

### Yang diselesaikan

- Verifikasi browser dua sesi (Observer A/B): nilai independen, autosave, konflik (lokal & remote), catatan per penulis + riwayat, Evaluasi Kolektif, draf rekomendasi, Realtime (setelah fix BUG-002).
- **BUG-002 (High) diperbaiki:** realtime tidak tiba; token sesi kini di-`setAuth()` sebelum join channel (`assessment-realtime.tsx`). Terverifikasi live.
- **BUG-001 (Low) diperbaiki:** `acceptLatest` tidak membersihkan draf localStorage → konflik berulang. Diperbaiki + terverifikasi.
- **Refactor `set-state-in-effect` (6 titik) selesai** → rule kembali ke `error`: pola lazy initializer untuk draf localStorage + status online, pola render-time guarded "adjust state" untuk sinkronisasi props (observation-cell, observer-notes), `setTimeout(0)` untuk status offline. Verifikasi: `npm run check` exit 0; konflik berulang sudah terbukti hilang di browser.
- **`@next/next/no-img-element` kembali ke `error`**: 6 titik `<img>` (signed URL privat) dipindah ke komponen `components/private-img.tsx` (cerukan tunggal, alt wajib); tidak ada `<img>` bebas lain.
- **Tahap 8 selesai:** `app/dashboard/analitik/page.tsx` (agregat lintas kegiatan; admin_system + bidang_kader; tanpa skor individu/catatan privat). Menu "Analitik & Rekap" aktif; terverifikasi di browser sebagai Kader (3 kegiatan, 10 peserta, semua final=0 sesuai data riil).
- Lint: 0 error; warning tersisa semuanya pra-existing + 2 exhaustive-deps lama.

### Pemblokir (butuh keputusan pengguna)

- **BUG-003 (BLOCKER):** evaluasi final mustahil — agregator mensyaratkan Σ bobot aspek = 100, padahal dua rubrik aktif menyumbang 200 (Screening 100% + Pelatihan 100%). Rapor/ekspor/publish semuanya terblokir sampai skema agregasi diputuskan (per tahap? per scope cross_session? dinormalisasi?). Uji konsistensi sistem (`npm run check` / build) tetap hijau; blokirnya deterministik dan diverifikasi lewat UI + kode (`lib/phase6-scoring.ts`).
- Setelah skema dipilih: moderasi manusia ("Perlu ditinjau", rentang ≥2 poin) harus diselesaikan koordinator via Evaluasi Kolektif; agen tidak mengarang konsensus; finalize juga menuntut evaluasi berstatus `draft` di `collective_evaluations`.
- AUTH-005: sesi kedaluwarsa → "Profil belum tersedia" (bukan redirect login). BUG-004, belum diperbaiki.
- Build Windows `EPERM` dan CI (`.github/workflows/ci.yml`) tetap belum diverifikasi/pernah jalan.
- Token Supabase personal access yang dipakai sesi ini: **rotate setelah selesai** (sudah dicatat; jangan di-commit).

### Akun QA sintetik

`.env.qa-test` (gitignored): `qa-auto-admin@qa.imm-observer.invalid`, `qa-auto-observer-{a,b}@qa.imm-observer.invalid` (ditugaskan `PK IMM FEB UM Bandung`), `qa-auto-instruktur@qa.imm-observer.invalid` (MoT), `qa-auto-kader@qa.imm-observer.invalid`. Semua password acak kuat. Project `production imm` (crrqlwlfndhugcqcnkex) TIDAK disentuh.

## Finalisasi per jenis penilaian (13 November 2026, malam)

Keputusan pengguna 13 Nov 2026: nilai resmi berakhir ("official") **per jenis penilaian** (per rubrik versi aktif per kegiatan — BLUEPRINT §Phase 6: status selesai terpisah per jenis).

Perubahan & alur (diverifikasi end-to-end di browser + DB, data simulasi):

- Migrasi `20261113000000_dad_collective_evaluation_per_penilaian_v1.sql` (terpasang di DEV): `collective_evaluations.rubric_version_id`, unique `(event_id, participant_id, rubric_version_id)` NULLS NOT DISTINCT; `assessment_snapshots` unique key jadi `(collective_evaluation_id, revision)`; `get_event_report_rows` mengembalikan satu baris per snapshot.
- Migrasi `20261113120000_scope_finalize_moderation_to_penilaian_v1.sql` (terpasang di DEV): gate moderasi finalize dibatasi ke penilaian yang difinalisasi (sebelumnya satu selisih di mana pun mengunci semua penilaian).
- Migrasi `20261113130000_publish_latest_per_evaluation_v1.sql` (terpasang di DEV): terbitkan rapor dibandingkan "latest revision" **per evaluasi (per jenis)**, bukan lintas peserta.
- Evaluasi Kolektif: penilaian tabs (Screening · Interview / Pelatihan · Kognitif · AIK · …) per peserta; agregasi/coverage/overall dihitung hanya untuk penilaian terpilih (bobot = 100%, bukan 200%); aksi simpan draf/rekomendasi/finalisasi selalu membawa `rubricVersionId`; snapshot history memuat jenis; panel finalisasi menyebut jenis yang difinalisasi.
- Screening Peserta 01: skor agregat **76.00/100**, coverage 100%, Finalisasi → snapshot revision 1 (decision `pass`). AIK Kognitif: **74.00/100**, moderasi dua selisih ditinjau & dipertahankan rata-rata, Finalisasi → snapshot revision 1 (decision `further_discussion`). Keduanya dipublikasikan (`published_at` 18:59 / 19:02); ekspor individual_pdf, bulk_pdf, assessment_excel×3 klik, observer_excel, event_report_pdf — semua tercatat di `assessment_export_audit`; ZIP "2 rapor Published" terunduh tanpa error.
- Laporan & Rapor: dua baris per peserta per jenis (label "Screening v1" / "Pelatihan v1 · AIK"); checkbox bulk memakai `snapshot_id` (duplicate React key diperbaiki); "Terbitkan rapor" bekerja per snapshot.
- Peserta 02 (B mengisi Screening tanpa sengaja) sengaja dibiarkan — data simulasi, belum difinalisasi.
- Catatan: evaluasi kolektif lama (legacy draft id `02afc62c…`, tanpa versi) dibiarkan, tidak dihapus (terhubung ke `collective_evaluation_revisions`).
- Peserta masih tidak punya akun (metode akses belum diputuskan pengguna) — rapor hanya bisa dibuka Admin/Kader/Instruktur; RPT-001..005 tetap belum teruji end-to-end.
- Consensus: `assessment_moderations` berisi 2 record resolved (retain_average) untuk indikator menyimpang — dilakukan sebagai koordinator (simulasi).

## Role tambahan diverifikasi + lint bersih (13 November 2026, akhir sesi)

- **Akun QA baru (DEV, data simulasi):** `qa-auto-iot@qa.imm-observer.invalid` (instruktur, subrole IoT, penugasan `PK IMM FEB UM Bandung` + 5 duty ter-seed, 1 tercentang selesai) dan `qa-auto-komisariat@qa.imm-observer.invalid` (komisariat, ditautkan `PK IMM FEB UM Bandung`). Kredensial di `.env.qa-test`.
- **DASH-007 IoT** terverifikasi di browser (checklist tampil & persist; `/dashboard/laporan` redirect; agregat penilaian tidak ditampilkan di dashboard IoT). **Komisariat** terverifikasi (menu kosong sesuai peran; menu lain dialihkan; tidak ada data pengajuan milik komisariat lain yang tampil).
- **BUG-005 (Medium, diperbaiki & terverifikasi di browser untuk MoT dan IoT):** `InstructorDutyDashboard` tidak pernah dirender — panel tugas Instruktur kini tampil setelah dashboard phase 7.
- **Lint-debt = 0 peringatan** (perbaikan 2 exhaustive-deps + `location.assign` → `useRouter().push`). `npm run check` hijau; `npm run lint` tanpa output (bersih).
- **Bug riwayat:** legacy evaluation draft (`02afc62c…`, kosong) tetap ada — sengaja tidak dihapus (terhubung ke tabel riwayat).
- Production project `crrqlwlfndhugcqcnkex` TIDAK disentuh; 3 migration baru terpasang hanya di DEV via Management API.

## Deploy produksi (13 November 2026)

- **Live:** http://43.173.33.195:8080/ (IMM Observer; HTTP saja, belum ada domain/TLS)
- **Server:** 43.173.33.195 (Ubuntu 24.04) — **workload produksi lain ikut berjalan** (`api-jkstok.my.id` + Docker `wms_prod_backend`); semua config/certificate/container mereka **tidak disentuh**. nginx kini juga mendengarkan 8080 (vhost baru `imm-8080`); ufw kini juga mengizinkan 8080/tcp (Nginx Full sudah diizinkan sebelum).
- **Stack:** Node v22.23.5 (NodeSource), pm2 `imm` di `127.0.0.1:3000` (systemd-managed, `pm2 save` + `pm2 startup`), nginx sebagai reverse proxy, kode di `/home/ubuntu/imm-app`.
- **SSH:** key khusus `~/.ssh/imm_prod_43-173-33-195` (ed25519) — private key tidak keluar dari workstation; password server hanya dipakai sekali untuk memasang key.
- **Database produksi** `crrqlwlfndhugcqcnkex`: kosong sebelum deploy; **39/39 migration terpasang** (via Management API, semua OK). **Belum ada akun admin/user** — aplikasi render tapi login pertama belum mungkin. Halaman publik/login/daftar teruji HTTP 200.
- **Belum ada** service-role key di server (fitur buat akun Instruktur akan gagal); tidak ada backup; tidak ada domain/TLS (sensitif terhadap penyadapan sampai ada TLS); regression SQL belum dijalankan di produksi.
- Detail lengkap + prosedur redeploy/rollback: `docs/DEPLOYMENT.md`.


### Admin produksi dibuat (13 Nov 2026, malam)

- `annisa@swamedia.co.id`, role `admin_system`, password acak (diserahkan ke pemilik, tidak disimpan di repo). Login produksi terverifikasi (dashboard Admin merender, nilai 0 — DB kosong). Regression SQL tetap di DEV.
- TODO tertunda: domain+TLS, backup, service-role key, monitoring, seed data produksi.

## Seed trial PROD (13 Nov 2026)

- PROD kini berisi trial set DEV: kegiatan PK IMM FEB UM Bandung + rubrik aktif (Interview/Screening 10 indikator, Kognitif/AIK Pre-Post 50/50) + 3 peserta simulasi. Tanpa akun/nilai/snapshot.
- DEV tidak berubah (sumber dibaca saja). Apabila DEV perlu diperbarui, terpisah dari prosedur ini.
- Produksi masih kosong untuk: akun penilai, pengajuan, nilai, snapshot.


## Akun sintetik PROD (13 November 2026, malam)

Empat akun uji untuk trial produksi (data simulasi, hapus kapan pun, password acak diserahkan ke pemilik):

| Akun | Role | Penugasan |
|---|---|---|
| `qa-prod-observer-a@imm-observer.invalid` | Observer | `PK IMM FEB UM Bandung` |
| `qa-prod-observer-b@imm-observer.invalid` | Observer | `PK IMM FEB UM Bandung` |
| `qa-prod-instruktur@imm-observer.invalid` | Instruktur (MoT) | `PK IMM FEB UM Bandung`, 5 tugas checklist |
| `qa-prod-kader@imm-observer.invalid` | Bidang Kader | — |

Semuanya login terverifikasi di produksi (Observer melihat kegiatan tugasnya; Instruktur melihat monitoring + checklist MoT; Kader dashboard pemantauan). Kredensial tersimpan lokal di `.env.qa-test` (gitignored). Akun produksi nyata untuk anggota panitia belum dibuat — belum ada daftar email/peran.

## Sesi refactor frontend (13 November 2026, dini hari — otonom)

Instruksi pemilik (tidur): semua keputusan refactor didelegasikan; mulai dari aplikasi yang baru live di PROD dan terbuka untuk uji coba; frontend dinilai "sangat AI slop dan tidak efisien". Tiga subagent audit paralel (arsitektur & kualitas kode, UI/UX & desain, performa & Next.js) → rencana → implementasi. Laporan lengkap: `docs/FRONTEND_REFACTOR.md`.

Hasil (commit di `main`):

- `5dafa37` Konsolidasi: `SCORE_SCALE_LABELS`, `lib/decision-labels.ts`, `lib/validation.ts` (uuidPattern), `stageOrder`/`stageCards`; `categorizeScore` & `isModeratorPosition` dipakai ulang; file mati `observation-cell.tsx` (305 baris) dihapus.
- `c54e546` CSS: ~1.110 baris aturan mati dihapus; duplikat disatukan; `h2` global Manrope 16/700; alias legacy `--ink/--muted/--line` netral-hangat; nav/hover aktif → token maroon; `font: Npx inherit` invalid diperbaiki; halaman `error.tsx`/`loading.tsx`/`not-found.tsx` (id); `<a>` internal → `<Link>` (52 tautan); jargon "migrasi" → pesan ramah; label basi SIMULASI di halaman berbasis DB dihapus; `robots noindex`; `poweredByHeader: false`; glyph Unicode → lucide.
- `8ab9286` Performa: `createSignedUrls` batch (5 halaman, hapus N+1); query laporan diparalelkan (2× Promise.all); `rubric_versions` observasi difilter per event (non-admin); refresh realtime di-debounce 500 ms; derivasi `phase7-report-workspace` di-useMemo + build file ekspor hanya saat ekspor + Map per baris; 3 query instruktur → 1.
- `d43e711` UX: toggle kata sandi login; listener realtime rating-cell tidak berlangganan ulang per ketikan; `redirect()` di luar try/catch; sidebar "Butuh bantuan?" bukan lagi mirip tombol.

Verifikasi: `npm run check` hijau, `npm run build` hijau; browser lokal (3100, DB DEV): publik, login (toggle), dashboard admin, 7 halaman internal, 404 id, alur Observasi sampai grid penilaian + "Realtime tersambung". **Belum dideploy ke PROD** — menunggu keputusan deploy sesi ini (lihat di bawah).

Yang sengaja TIDAK dikerjakan: migrasi shell dashboard ke `app/dashboard/layout.tsx`; pemisahan payload `snapshot_data` → DTO (temuan performa High #1) — keduanya butuh sesi khusus + regresi browser per peran; penyatuan pola `useActionState`; konsolidasi breakpoint; hapus `dashboard-results`; seragamkan lencana. Lihat `docs/FRONTEND_REFACTOR.md`.

**Deploy produksi (13 Nov 2026, dini hari) — selesai & terverifikasi:** `cp -a /home/ubuntu/imm-app /home/ubuntu/imm-app.bak-2026-11-13-0317` (rollback siap) → rsync (tanpa `.git`, `.env*`, `.next`) → file mati `observation-cell.tsx` dihapus di server → `npm ci --include=dev` → `npm run build` OK → `pm2 restart imm` (pid baru, online). Verifikasi: `/`, `/login`, `/dashboard` HTTP 200; header `X-Powered-By` hilang; meta `robots noindex, nofollow` tampil; smoke browser di prod (home, login, dashboard Bidang Kader, Laporan & Rapor, Analitik, Kerangka) — semua merender tanpa galat. Tidak ada perubahan DB; `wms_prod_backend`/nginx/port 80/443 tidak tersentuh. Rollback: `ssh -i ~/.ssh/imm_prod_43-173-33-195 ubuntu@43.173.33.195 'rm -rf /home/ubuntu/imm-app && cp -a /home/ubuntu/imm-app.bak-2026-11-13-0317 /home/ubuntu/imm-app' && npm ci && npm run build && pm2 restart imm`.

**Catatan deploy:** PROD memakai DB `crrqlwlfndhugcqcnkex`; jangan jalankan pengujian yang menulis ke PROD. Regression SQL tetap di DEV. Backup aplikasi di server berupa direktori utuh; belum ada backup DB (masih TODO lama).


## Fix Server Actions lewat port 8080 (13 November 2026, sore — hotfix produksi)

Pemilik melaporkan `/dashboard/kegiatan` tampil "Halaman gagal dimuat". Diagnosis lewat log produksi:

- Semua `GET /dashboard/kegiatan` → 200 (halaman tidak crash); yang 500 adalah **Server Action** (`POST /dashboard/kegiatan`, 13:59:09, 14:00:11, 14:02:01) → `error.tsx` tampil di browser.
- Penyebab: vhost nginx `imm-8080` mem-proxy `proxy_set_header Host $host` — nginx `$host` **tidak membawa port** → Next.js menerima `x-forwarded-host: 43.173.33.195` (default dari `Host`, lihat `base-server.js`), sementara browser mengirim `Origin: http://43.173.33.195:8080`. Next.js menganggap cross-origin → aksi dibatalkan (`Invalid Server Actions request`, digest `3085324822`). **Berdampak ke semua Server Action lewat 8080**, bukan hanya Kegiatan (`POST /dashboard/penilaian` juga 500 pada 14:04:34).
- Fix: satu baris `proxy_set_header X-Forwarded-Host $http_host;` di vhost `imm-8080` (backup `/etc/nginx/imm-8080.bak-2026-11-13-1430`), `nginx -t` + `systemctl reload nginx`. Tidak menyentuh vhost situs lain, tidak perlu rebuild.
- Verifikasi: GET `/login` & `/dashboard/kegiatan` via 8080 → 200; POST uji dengan action ID palsu → 400 di tahap validasi action (bukan di gerbang host; gerbang lolos). Belum diverifikasi dengan submit form asli dari browser (akan menjalankan action sungguhan di PROD).
- Catatan: dua error `Server Reference ID did not match the expected format. Received "x"` di `imm-error.log` (pra-existing) bukan penyebab; kemungkinan probe/request manual.
- Akar jangka panjang (sudah TODO lama): domain + TLS di port standar.

## 500 pada "Buat versi (draf)" di PROD (13 November 2026, sore) — BUKAN bug CSRF

Setelah upload fix `X-Forwarded-Host` terpasang, aksi di `/dashboard/penilaian` berjalan (POST kegiatan 200 pada 14:11:05 → kegiatan baru `48880b89-de78-4e72-a82b-e2bb89f74fbd`; POST penilaian 200 pada 14:13:15 & 14:14:46). Tetapi tombol **"Buat versi 1 (draf)"** gagal dengan 500 berulang (14:15:02, 14:15:09, 14:16:14, 14:16:30, 14:18:14) dan memicu error boundary `error.tsx` ("Halaman gagal dimuat").

- Bukan lagi `Invalid Server Actions request`; yang tampil di `imm-error.log`: `Error: Mapping materi belum lengkap sehingga rubrik draf tidak dapat dibuat.` (digest `4270062910`), asal `createRubricVersion` di `app/dashboard/penilaian/rubric-actions.ts:157`.
- Sebab (deterministik, aplikasi menolak secara sengaja): belum ada `rubric_versions` untuk (event, tahap, jenis, materi); tahap training; materi punya `competency_material_id`; tetapi link master di `competency_material_aspects` / `competency_material_indicators` kosong (atau tidak terbaca), sehingga draf dari data master tidak dapat dibuat. Throw terjadi **sebelum** ada INSERT — tidak ada data setengah jadi.
- UX defect terkait: `createRubricVersion` (dan form aksi lain yang "plain `<form action>`") melempar `Error` untuk kegagalan validasi bisnis yang **diharapkan**; rejection flight ditangkap error boundary terdekat → seluruh halaman tergantikan "Halaman gagal dimuat", bukan pesan inline yang ramah.
- Belum diketahui produk/materi mana yang dipilih pengguna (nama materi tidak tercermin di URL) dan isi pasti master mapping di PROD. Seed PROD sebelumnya menyalin rubrik versi + materi ("AIK" 7 indikator; "Materi umum" kosong) dan menampilkan Kerangka DAD (6 aspek, 27 indikator, 135 anchor), tetapi **belum diverifikasi** bahwa tabel link materi→aspek/indikator terisi di PROD.
- Opsi: (a) diagnosis read-only via SQL Editor Supabase PROD (perlu akses owner atau query yang dijalankan owner); (b) seed/copy mapping dari DEV ke PROD (tulis ke PROD — butuh izin eksplisit + backup); (c) perbaiki UX: aksi mengembalikan error bisnis secara inline/redirect, bukan throw; (d) kerjakan hanya penjelasan.


## Akar penyebab 500 "Buat versi (draf)" — embedded select gagal (13 November 2026, sore)

Diagnosis dengan token personal Supabase (read-only; project PROD `crrqlwlfndhugcqcnkex`, cross-check schema DEV):

- Event `48880b89` material `437e27d5` "Al-Islam Kemuhammadiyahan" → `competency_material_id` = master `KEISLAMAN` (`2c709293-…`, v1 trial). **Master mapping LENGKAP**: 2 aspect link (`REL`, `INT`), 4 indicator link (`REL-01`, `REL-04`, `INT-01`, `INT-02`). RLS: `admin_system` boleh SELECT; FK (aspects→aspects, indicators→indicator_aspects) ada; annisa = admin_system ✓.
- **Embed `competency_indicators(...)` dari `competency_material_indicators` mustahil dieksekusi PostgREST**: tidak ada FK langsung dari `competency_material_indicators` ke `competency_indicators`. FK yang ada: `(indicator_id, aspect_id, framework_version_id)` → `competency_indicator_aspects`. PostgREST balas error (PGRST200 "relationship not found") → `indicatorLinkError` truthy di `createRubricVersion` (`rubric-actions.ts`) → melempar "Mapping materi belum lengkap…" (pesan **menyesatkan**: mapping ada, querynya yang gagal) → flight 500 → `error.tsx` "Halaman gagal dimuat".
- Embed `competency_aspects(...)` di query aspek **valid** (FK langsung `aspect_id+framework_version_id` → `competency_aspects`).
- Schema DEV identik (dicek) — jalur "draf dari master" ini tidak pernah berhasil di mana pun; rubrik seed dibuat di luar jalur UI. Tidak ada write ke PROD sepanjang diagnosis.
- **Fix yang diusulkan (belum disetujui, belum dikerjakan):** ganti embedded select di `createRubricVersion` menjadi two-step fetch (ambil `indicator_id` dari `competency_material_indicators`, lalu `select … in (ids)` ke `competency_indicators`) — konsisten dengan pola `anchorVersions` yang sudah ada di fungsi yang sama. Build + deploy penuh setelahnya. Catatan: pesan error "Mapping belum lengkap" sebaiknya dibedakan (query error vs memang kosong). Follow-up terpisah: kegagalan validasi bisnis tidak seharusnya meruntuhkan halaman (error boundary), melainkan tampil inline.

## Fix buat draf rubrik dari master ter-deploy (13 November 2026, sore)

Persetujuan pemilik: Opsi A. Perubahan kode `0a823b4`: `createRubricVersion` (`app/dashboard/penilaian/rubric-actions.ts`) membaca indikator master dengan two-step fetch (`competency_material_indicators` → `.in("id", indicatorIds)` ke `competency_indicators`), menggantikan embedded select yang selalu gagal di PostgREST (lihat entri "Akar penyebab"). Jika query master gagal, kini dicatat ke log server (`console.error "createRubricVersion indicator master query"`) dan tetap menempuh jalur error yang sama. `npm run check` exit 0 (5 warning pra-existing di berkas lain; 0 error). Build penuh di server: backup `imm-app.bak-2026-11-13-1436-full` → rsync → `npm ci --include=dev` → `npm run build` OK → `pm2 restart imm` (pid 954697, restart ke-6) → smoke 200 (`/`, `/login`, `/dashboard`, `/dashboard/kegiatan`, `/dashboard/penilaian`) via 8080; `wms_prod_*` tidak tersentuh. **Belum diverifikasi di browser**: pemilik perlu menekan ulang "Buat versi 1 (draf)" sendiri (tombol akan membuat draf = tulis ke PROD); bila masih gagal, cek `imm-error.log` untuk baris `indicator master query`.

## Deploy penuh (13 November 2026, sore)

Pemilik meminta deploy penuh. Prod saat itu tanpa perubahan kode (hanya docs sejak deploy `f83bf7e`); tetap dijalankan sesuai prosedur `docs/DEPLOYMENT.md`: backup `/home/ubuntu/imm-app.bak-2026-11-13-1430-full` (765M) → rsync → `npm ci --include=dev` (376 paket, OK; 8 moderate vulnerabilities, belum ditindak) → `npm run build` OK → `pm2 restart imm` (pid 940896, restart ke-5) → smoke 200 untuk `/`, `/login`, `/daftar`, `/dashboard`, `/dashboard/kegiatan`, `/dashboard/peserta`, `/dashboard/kerangka` via 8080; header `X-Powered-By` tetap absen; `wms_prod_*` di Docker tidak tersentuh (semua healthy). Disk server tinggal ~15 GB (89%) — kandidat pembersihan backup lama, **belum dihapus**.

## Shell bersama untuk semua halaman (13 November 2026, pagi — otonom sesi kedua)

Instruksi pemilik: "terkait sidebar dan halaman menurut saya ini aneh, inspect" (kelanjutan refactor semalam). Diagnosis dikonfirmasi di browser: hanya `/dashboard` yang memakai app-shell; 17 sub-halaman polos tanpa navigasi (hanya "← Kembali ke dashboard"), item menu tanpa halaman adalah tombol mati, breadcrumb statis `Ruang kerja / {state}`.

Yang dikerjakan (commit `5d985aa`, lihat juga `docs/FRONTEND_REFACTOR.md`):

- `components/app-shell.tsx` + `app/dashboard/layout.tsx`: shell sidebar+topbar membungkus seluruh `/dashboard/*`; portal publik `/` memakai shell yang sama. Breadcrumb diturunkan dari `usePathname()`. Semua item menu adalah `<Link>` nyata; item tanpa halaman (Jadwal DAD, Profil Instruktur publik, Pengaturan Sistem) disembunyikan.
- Menu dead-end dihapus sesuai guard halaman: Bidang Kader kehilangan "Kegiatan DAD", "Peserta", "Observasi" (halaman menolak role-nya; nilai mentah memang bukan untuk Bidang Kader); Komisariat kehilangan "Analitik & Rekap" (khusus Admin Sistem/Bidang Kader).
- `role-dashboard.tsx` dipecah → `app-shell.tsx` / `home-hero.tsx` / `phase7-dashboard-home.tsx` / `simulated-panels.tsx` (`onNavigate` dihapus; tombol internal jadi `<Link>`).
- 15 back-link generik "← Kembali ke dashboard" dihapus; `.users-page` menyesuaikan shell; `/dashboard/profil` memakai `.login-page.embedded`.
- Verifikasi: `npm run check`, `npm run build` hijau; browser lokal (3100): publik, dashboard, 6 halaman, mobile 390px + drawer; PROD: backup `imm-app.bak-2026-11-13-0818` → rsync → file sisa `role-dashboard.tsx` di server dihapus → build OK → pm2 restart → smoke browser (publik + login QA Kader + `/dashboard/penilaian` render dalam shell; menu bidang_kader tanpa dead-end). Prod sehat; `wms_prod_backend` tidak tersentuh.
- Pelajaran: server deploy memakai rsync tanpa `--delete` — berkas yang dihapus dari repo tetap ada di server dan dapat menggagalkan build (stale TS error). Setelah setiap refactor yang menghapus berkas, cek `ls` di server atau hapus manual.

## Service-role key terpasang di PROD (13 November 2026, sore)

- Pemicu: pemilik mengirim screenshot `/dashboard/pengguna?akun=setup` — banner merah "Pembuatan akun sementara perlu SUPABASE_SERVICE_ROLE_KEY di konfigurasi server." (redirect dari `createTemporaryInstructor` saat `createAdminClient()` melempar karena env belum ada).
- Pemilik memberikan `service_role` key project PROD `crrqlwlfndhugcqcnkex` (disalin dari Supabase Dashboard → Settings → API). Key **tidak** ditulis ke repo/git/frontend; hanya ditambahkan ke `/home/ubuntu/imm-app/.env.production` di server lewat stdin (mode tetap 600, nilai tidak dicetak). **Key terekam di riwayat chat** — jangan dibagikan; rotate dari dashboard Supabase bila perlu, lalu perbarui file yang sama.
- `pm2 restart imm --update-env`; aplikasi online, log bersih (error lama `refresh_token_not_found` pra-existing, tidak terkait). Tidak ada perubahan DB/kode.
- Belum diuji end-to-end: tombol "Buat akun perbantuan" belum ditekan (akan membuat akun Instruktur nyata di PROD — butuh keputusan pemilik). Catatan: banner merah `?akun=setup` tampil murni dari query param URL — setelah perbaikan, mengunjungi URL itu tetap menampilkan banner; yang menentukan berhasil/gagal adalah hasil submit formulir.

## Fix Kerangka overflow (13 November 2026, pagi — follow-up sesi kedua)

Pemilik mengirim screenshot `/dashboard/kerangka` (prod): baris kartu aspek terpotong di tepi kanan (horizontal overflow). Diagnosis: `.competency-aspect-grid` memintakan **1527px** (min-content memaksa 6 kolom 1 baris) sementara kolom `.users-page` hanya **1100px**. Fix: `.competency-framework-page > * { min-width: 0; }` (commit `5a3464b`) — kartu aspek kini wrap 2 baris; `html.scrollWidth == clientWidth == 1920`. Build OK, pm2 restart, verifikasi prod (Kader QA, 1920px): grid 1058px, kartu "Kedisiplinan dan Tanggung Jawab" & "Komitmen dan Tindak Lanjut" tampil utuh di baris 2; tidak ada scroll horizontal. `.competency-matrix-scroll` memang sudah overflow:auto sejak awal.

## Sweep layout serupa (13 November 2026, pagi — follow-up Kerangka fix)

Permintaan pemilik: "sweep lagi untuk mencari masalah serupa" (overflow/grid-blowout ala Kerangka). Metode: ukur `document.documentElement.scrollWidth` vs `clientWidth` + scan seluruh elemen (`el.scrollWidth > el.clientWidth`, kecuali `overflow-x:auto/scroll/hidden`) di browser — 17 halaman × 5 peran × viewport 390/1280/1920 px; plus audit selector `minmax()` di `globals.css` dan semua `<table>` (semua punya wrapper scroll).

Hasil: satu-satunya temuan page-level sebelumnya (Kerangka) sudah diperbaiki di `5a3464b`. Sweep ini menemukan dua titik `.participant-edit-form` (di editor baris `/dashboard/peserta`) yang menyembul secara visual:

- `<input type="file">` punya min-width:auto → min-content ~256px memaksa label grid meluber 94px keluar track (`grid-template-columns: minmax(0,1fr)` + `input { min-width: 0 }` + anak form `min-width: 0`).
- `white-space: nowrap` diwariskan dari `.participant-table td` ke `small` catatan → override scoped `white-space: normal`.
- `participant-delete-form` tombol 110px menempel keluar form 49px → tombol diubah jadi "Hapus" (+aria-label), form `width: max-content`.

Verifikasi (lokal 3100 & PROD): peserta 0 overflow di 3 viewport; kerangka (41 details terbuka) 0 overflow di 3 viewport; halaman lain bersih; tabel peserta/laporan tetap di dalam wrapper overflow-x:auto sesuai desain. Commit `f83bf7e`; prod: backup `imm-app.bak-2026-11-13-0856` → rsync → build OK → pm2 restart → smoke 3 viewport (peserta/kader-kerangka) bersih.

Catatan desain peran: tidak ada regresi akses — sweep hanya membaca halaman sesuai izin role (observer/peserta/kader); tidak ada penulisan data.

## Insiden error massal saat demo (14 November 2026, pagi) — investigasi read-only

Lapor pemilik: banyak error hari ini ~jam 11 siang (WIB), kemarin malam nampak aman. Screenshot: banner "Data belum dapat dibaca" + "Kegiatan tidak ditemukan" di Observasi & `/dashboard/penilaian` (akun Annisa admin, 10:51/11:51 WIB).

**Tidak ada kerusakan permanen** — diverifikasi hari ini (14 Nov, ~15:00 WIB): database sehat (3 kegiatan, 46 peserta, 5 observer_assignments, 15 rubric_versions, 7 profil), data utuh; kunci API (legacy anon/service + sb_publishable/secret) **tidak diputar** sejak 10 Nov; kedua project Supabase ACTIVE_HEALTHY; login QA sintetik PROD + replay kueri persis halaman Observasi (termasuk embed rubrik lengkap) semuanya 200; koneksi VPS→Supabase ~16 ms connect / 65–90 ms total; halaman (GET) mayoritas 200.

**Gejala hari ini (log nginx `imm.access.log`, server UTC+8):**
- 00:29 (+0800): POST `/dashboard/penilaian` → 500 (189 B).
- 11:03:26 (+0800; = 10:03 WIB): POST `/dashboard/observasi` (eventId `48880b89-…`) → **502** "upstream sent too big header" (166 B).
- 12:00–12:09 (+0800; = 11:00–11:09 WIB): **1.345 request semuanya 200** — sistem sehat tepat jam 11 WIB.
- 12:42–12:44 (+0800; = 11:42–11:44 WIB, bertepatan chat WhatsApp 11.44): burst POST autosave Observasi → **500 bertubi** (×6, 252 B) dari beberapa laptop Windows (IP 114.10.145.85 / .148.85) dan Mac Safari (114.10.146.10: 12:43/12:44 500; 499 12:40).
- Error berselang dengan 200 setelahnya (13:17–13:21 200, 13:33 200, 13:42 500, 13:55 ×4 500, 15:56/16:10 200); 499 = klien menutup koneksi duluan. Total hari ini: 14 × 500, 1 × 502, 4 × 499, 13 × 400.
- 502 yang sama juga terjadi kemarin 23:04 (+0800) pada POST `/dashboard/penilaian`; 500 pada penilaian 00:29 hari ini → masalah sudah ada sejak kemarin malam, baru terasa saat demo.

**Akar penyebab:** sesi Supabase — access token berlaku **3600 detik**; setelah kedaluwarsa, SETIAP request perlu refresh token (single-use/rotasi). Autosave yang konkuren (per indikator/ketikan, plus tab ganda di laptop demo — screenshot menunjukkan dua tab Observasi) memicu **race refresh**: request yang menang me-rotasi refresh token; yang kalah mendapat `Invalid Refresh Token: Refresh Token Not Found` (8× di `imm-error.log`, terselang dengan 13× `Error: Akses ditolak.` dari `staffClient` di `app/dashboard/penilaian/internal.ts`). Client lalu mengirim kueri PostgREST dengan JWT kedaluwarsa/invalid → 401 → kueri error → banner "Data belum dapat dibaca"; `observer_assignments`/events yang 401 menghasilkan list kosong tanpa error → teks "Kegiatan tidak ditemukan atau Anda tidak ditugaskan padanya."; aksi server gagal → 500. Kueri GET tetap 200 karena halaman merender apa adanya (banner adalah hasil query error, bukan crash).

**Penyebab pendukung:**
1. `proxy_buffer_size` default nginx (vhost `imm-8080`) terlalu kecil untuk response Server Action yang membawa cookie sesi hasil refresh → "upstream sent too big header" (502). Terjadi 2× total (13 Nov 23:04, 14 Nov 11:03).
2. Insiden Supabase 13 Nov 03:35–06:40 WIB ("Database Connection Errors", semua region, Postgres) + "Elevated Error rates for All Supabase project APIs" 05:13 WIB — mungkin turut memperburuk stabilitas sesi; jam 11 WIB hari ini tidak ada di status page (sehat).
3. App kurang ramah kegagalan sesi: banner tidak menyebut penyebab (kueri mana/401), aksi server melempar Error polos → 500 tanpa fallback inline.
4. Autosave tidak di-debounce cukup (burst cepat).
5. Tab ganda pada satu akun menggandakan race.

**Belum terbukti/berarti:** bukan rotasi kunci, bukan penghapusan data, bukan RLS berubah, bukan disk penuh (60G bebas, pm2 online 21 jam, tidak ada restart 11:00), bukan error kode build terbaru (deploy 13 Nov sore sehat; `npm run check` hijau sebelumnya).

**Status:** diagnosis read-only; BELUM ada perbaikan yang diterapkan. Pemulihan sementara bagi pengguna: tutup tab ganda, login ulang (sesi fresh bekerja — diverifikasi). Usulan perbaikan (menunggu persetujuan pemilik): (a) perpanjang `exp` JWT di settings Supabase (mis. 8–12 jam untuk periode trial) → refresh jauh lebih jarang → race hampir hilang; (b) debounce autosave ~700 ms + serialisasi refresh/retry-once di `staffClient`; (c) nginx `proxy_buffer_size 32k; proxy_buffers 8 32k;` (hilangkan 502); (d) banner/500 inline yang menyebut "sesi kedaluwarsa — muat ulang/login ulang"; (e) rotasi PAT & service-role key (terekspos di output sesi ini & riwayat chat 13 Nov).

## Perbaikan insiden demo + deploy (14 November 2026, sore)

Konteks lengkap investigasi: lihat entri "Insiden error massal saat demo" di atas. Ringkasan eksekusi:

**A1 — JWT expiry tetap 3600 s** (keputusan pemilik; rekomendasi dokumen Supabase). Tidak ada perubahan.

**A2 — RS256 DIBATALKAN: signing key ES256 `in_use` sudah aktif sejak project dibuat (10 Nov 2026; HS256 = `previously_used`)**. Diverifikasi via Management API (`GET /config/auth/signing-keys`), login QA PROD (header token: `alg=ES256, kid=d4af74c2-…`), dan JWKS (`/.well-known/jwks.json` terbit). `getClaims()` sudah terverifikasi **lokal** (WebCrypto + JWKS edge-cache) — tidak ada network call per request seperti yang diasumsikan di investigasi awal. Membuat key baru hanya menambah perubahan tanpa manfaat — tidak dilakukan.

**A3 — nginx `imm-8080`**: `proxy_buffer_size` 16k→**32k**, `proxy_buffers 8 16k`→**8 32k**, `proxy_busy_buffers_size` 32k→**64k** (backup `/etc/nginx/imm-8080.bak-2026-11-14-1701`). `nginx -t` OK + reload. (Mencatat: buffer 16k sudah ada di vhost tapi 502 tetap terjadi 2× — penyebab persis besarnya header tidak bisa diukur dari luar; jika 502 berulang, langkah berikutnya adalah mengukur ukuran cookie sesi atau menaikkan buffer lagi.)

**B1 — `app/dashboard/penilaian/internal.ts` (`staffClient`)**: kueri profil kini `retry 1×` (300 ms) saat error; error kueri (±bukan "tidak berhak") melempar `Layanan data sedang bermasalah. Muat ulang halaman; bila masih gagal, keluar lalu login ulang.` + `console.error` detail; `"Akses ditolak."` hanya jika profil memang tidak berhak/tidak ada. Semua Server Action nilai/catatan (`assessment-actions.ts`) lewat sini.

**B2 — banner "Data belum dapat dibaca" disatukan ke komponen bersama `components/data-unavailable.tsx`** (`<DataUnavailable />`, `role="alert"`): teks kini "…Sesi atau layanan mungkin bermasalah — muat ulang halaman; bila masih gagal, keluar lalu login ulang. Hubungi Admin sistem bila masalah berulang." 21 kemunculan di 17 berkas diganti; teks "muat ulang halaman" adalah link reload (`href=""`). `proxy.ts` sengaja tidak diubah.

**Verifikasi**
- `npm run check` exit 0 (typecheck OK, lint 0 error/5 warning pra-ada — termasuk `analitik`/`eventError` yang tidak disentuh), format OK, tes **12/12**. Build lokal OK.
- **Uji sesi kedaluwarsa di DEV** (`jwt_exp` DEV → 60 s sementara, lalu **dikembalikan ke 3600**, terverifikasi via GET config): dev server lokal, login QA `qa-auto-observer-a`, buka Observasi (Kognitif PK IMM FEB & Screening Interview), token sudah kedaluwarsa → klik skor Screening Peserta 02 → **"Tersimpan · 16.11.11"**; halaman sebelum/sesudah tanpa banner/error boundary. Sel dikembalikan ke "Belum dinilai". TIDAK ADA perubahan data permanen di DEV.
- **PROD deploy**: backup `/home/ubuntu/imm-app.bak-2026-11-14-1705-full` → rsync → `npm ci --include=dev` → `npm run build` OK → `pm2 restart imm` (restart #9, pid 1903175). Smoke 8080: `/`, `/login`, `/dashboard`, `/dashboard/observasi`, `/dashboard/penilaian` → **200**; POST dengan action ID palsu → 400 (gerbang validasi, bukan 502). Build memuat `muat ulang halaman` (kode baru live). Tidak ada error baru di `imm-error.log`/`imm.error.log` setelah restart.
- **Kecelakaan deploy yang harus diperhatikan**: rsync deploy pertama memakai `--delete-excluded` (menyimpang dari prosedur) → **menghapus `.env.production` (+`.env.example`, `HANDOVER.md.bak-2026-11-13-1430`) di server**. Semua **dipulihkan dari backup** (`.env.production` sha256 cocok persis, mode 600 utuh); `node_modules`/`.next` terhapus juga tapi itu memang di-rebuild. Pelajaran: **JANGAN PERNAH pakai `--delete`/`--delete-excluded` pada deploy rsync PROD**; ikuti prosedur `docs/DEPLOYMENT.md` (tanpa delete). Baru setelah build di-verify, pm2 restart.

**Sisa risiko / tindak lanjut pemilik**
- Akar-detail mengapa sebagian kueri gagal saat burst 11:42 (sejauh ini: race refresh token + kemungkinan degradasi mikro Supabase) tidak bisa dibuktikan dari luar secara definitif; kedua jalur sudah ditangani (B1/B2 + R4 fix). Pantau 24 jam: `grep -E " (500|502) " /var/log/nginx/imm.access.log`.
- Setelah demo/ujian berikutnya, cek `auth.refresh_tokens` yang `revoked` (reuse detection) — bila masih sering, evaluasi SOP satu-tab-per-akun.
- **Rotasi PAT + service-role key** (keduanya terekspos di output sesi ini & riwayat chat 13 Nov).
- 502 tidak dijamin hilang bila header sesi jauh lebih besar dari 32k — jika terulang, naikkan buffer / ukur cookie.
- SOP pemakaian: satu tab per akun; bila banner muncul → tombol "muat ulang halaman"; bila masih gagal → keluar & login ulang.
