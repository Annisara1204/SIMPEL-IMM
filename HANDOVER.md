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
