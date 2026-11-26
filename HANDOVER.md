# Handover — IMM Observer

**Terakhir diperbarui:** 24 November 2026 (penyelarasan narasi status produksi; Fase 6)
**Lokasi proyek:** `C:\Users\Lenovo\Documents\project` (dev Windows); salinan kerja sesi ini: `/home/ibaysander/Documents/Freelance/SIMPEL-IMM` (Linux)

Dokumen ini hanya mencatat kondisi terkini. Riwayat sesi dan bukti verifikasi lama tersimpan verbatim di `docs/archive/`:

- `docs/archive/HANDOVER-2026-11-12.md` — log sesi lengkap sampai 12 November 2026
- `docs/archive/BLUEPRINT-status-2026-11-12.md` — status proyek yang semula di BLUEPRINT.md

Keputusan produk tetap di `BLUEPRINT.md`; urutan fase dan ketergantungan di `IMPLEMENTATION_PLAN.md`. Dokumen di root proyek: `AGENTS.md` (aturan kerja), `README.md` (cara menjalankan), `docs/QA_PHASE8_TEST_PLAN.md` (rencana uji), `docs/TRIAL_DAD_COMPETENCY_FRAMEWORK.md` (spesifikasi trial).

## Status produksi — satu versi

Otoritas tunggal untuk keadaan aplikasi dan produksi per 24 November 2026 adalah `docs/STATUS-PRODUKSI-SATU-VERSI.md`. Bila ada perbedaan dengan entri di bawah, pakai dokumen itu. Semua entri bertanggal sebelum ringkasan ini dibaca sebagai catatan pada tanggalnya masing-masing, bukan klaim status terkini; entri yang benar-benar bertentangan diberi penanda "Riwayat" dan tidak dihapus.

Narasi yang berlaku sekarang:

- Keadaan produksi, kode aktif, migrasi, dan keputusan pemilik menjadi otoritas tunggal di `docs/STATUS-PRODUKSI-SATU-VERSI.md`. Entri di bawah ini adalah catatan pada tanggal masing-masing; bila bertentangan, pakai dokumen status.
- Deploy 24 November pagi (`0448100`) dan 24 November sore (`69e257f`) adalah riwayat. Kode aktif terakhir tercatat di dokumen status.
- `DISABLE_SIGNUP=true` dan pencabutan grant `anon` sudah dijalankan. Rotasi PAT dan service-role key tidak dilakukan sesuai keputusan pemilik. Rincian backup, verifikasi, dan rollback ada di `docs/HASIL-FASE5-DEPLOY.md`.

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

- **Live:** http://43.173.33.195:8080/ (IMM Observer; HTTP saja. Pemilik memutuskan tetap memakai IP tanpa TLS; lihat `docs/STATUS-PRODUKSI-SATU-VERSI.md`)
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

## Sapuan & perbaikan lanjutan (14 November 2026, sore/malam)

**Tinjauan pasca-insiden (read-only):** DB 17 MB (jauh di bawah batas 500 MB paket gratis); 53 tabel public **semuanya RLS-aktif** (126 policy); 4 bucket storage **semuanya privat** + policy ada; grants anon SELECT di 2 tabel moderasi (`assessment_moderation_revisions`, `collective_evaluation_revisions`) — RLS menahan (`set role anon` → 0 baris; dua tabel kosong) → tidak bocor, tapi grant tetap sebaiknya dicabut (belum disetujui, menunggu pemilik); `disable_signup: false` di Auth PROD (siapa pun bisa mendaftar akun tanpa role — menunggu keputusan pemilik, juga A1 usulan yang belum dikerjakan).

**Serangan sampah hari ini:** 4 probe (`/etc/passwd`, `/wp-*`, `.env`) — semuanya 400/404; `wms_prod_frontend/backend/postgres` healthy; disk 19% (setelah pembersihan); logrotate nginx harian ×14; tidak ada error 5xx baru di log setelah deploy sore (409 = stale action ID tab lama setelah deploy, sembuh setelah refresh — 1 laptop Safari, 36× 409 jam 17:15, **bukan** bug kode).

**Selesai dikerjakan (persetujuan pemilik):**
- A4 — symlink duplikat `sites-enabled/imm-8080.bak-2026-11-14` (→ `sites-available/imm-8080`, memicu warning `conflicting server name "_" ignored`) dihapus; `nginx -t` bersih; reload; 8080 tetap 200.
- A3 — 4 backup aplikasi tertua di server dihapus (`imm-app.bak-2026-11-13-0317/0818/0856/1430-full`, ~3 GB); tersisa `imm-app.bak-2026-11-13-1436-full` dan `imm-app.bak-2026-11-14-1705-full`. `.env.production` aman (dipulihkan saat insiden rsync — sha256 cocok).
- Backup database **harian 03:15** dipasang: `/etc/cron.d/imm-db-backup` (user `ubuntu`) → `/home/ubuntu/imm-db-backup.py` → `/home/ubuntu/imm-db-backups/imm-prod-YYYY-MM-DD/` (retensi 14 hari). Script dump JSON via PostgREST dengan service key di `.env.production` (dibaca saat runtime, tidak disalin), 53 tabel publik; **schema `auth` tidak termasuk** (akun 7 orang re-create via dashboard/pengguna). Run pertama sukses: 53/53 tabel, 2.374 baris, 0 error.
- Salinan lengkap (termasuk **auth.users + auth.identities**, berisi hash kata sandi — rahasia) ada di komputer workstation: `~/Documents/backup-prod-2026-11-14/` (57 berkas, 1.3 MB, sha256 cocok; lihat `README-BACKUP.md` untuk prosedur restore). File ini **di luar repo**; jangan di-commit/dibagikan.

**Belum dikerjakan / menunggu pemilik:** A1 (`disable_signup=true`), A5 (revoke grant anon di 2 tabel moderasi), A7 (rotasi PAT + service-role key), A8 (8 moderate npm audit), A9 (AUTH-005: sesi kedaluwarsa → "Profil belum tersedia", bukan redirect login), domain+TLS (HTTP polos + IP terbuka), backup `auth.*` harian (saat ini tidak; cukup re-create akun), monitoring/alert 5xx.

## Hotfix: Disk IO budget Supabase habis karena prefetch RSC (14 Nov 2026, malam, DEPLOYED)

Gejala berulang sepanjang hari (termasuk screenshot Salma 20:11 — banner instruksi tetap tampil, kueri gagal). Email Supabase 17:30: **"Your Supabase project production imm is running out of Disk IO Budget"**.

**Akar penyebab:** 60.041 dari 65.851 request hari ini (91%) adalah `?_rsc=` — prefetch otomatis Next.js untuk **setiap tautan sidebar di setiap halaman** (~6.000 per rute per hari: kegiatan 6.264, peserta 6.237, kerangka 6.217, seleksi-komisariat 6.130, profil-instruktur 5.982, profil 5.825, observasi 14.111). Tiap prefetch = render server penuh = 3–10 kueri ke Nano instance → IO budget habis → instance intermiten unresponsive → banner/error di semua halaman.

**Fix terdeploy (21:15):** `prefetch={false}` ditambahkan pada **semua 51 `<Link>`** (23 berkas) — Next.js tidak lagi memuat halaman di belakang layar; data hanya dimuat saat diklik. Verifikasi: `npm run check` exit 0 (12/12 tes, lint 0 error/5 warning pra-ada), build lokal hijau, backup `imm-app.bak-2026-11-14-2115-full`, deploy tanpa `--delete`, smoke 8080 200 semua, pm2 restart #10 (pid 2056839). 6× 502 pada 21:18 adalah blip restart (`connect() failed`), bukan regresi; error "too big header" tidak terulang sejak A3 (buffer 32k). **Pengguna harus refresh halaman** agar mendapat bundle JS baru (halaman lama masih mem-prefetch sendiri).

**Belum dikerjakan:** upgrade Compute add-on Supabase (Nano→Micro/Small, berbayar — keputusan pemilik) sebagai pengaman hari demo; revoke anon grant 2 tabel moderasi (A5); `disable_signup=true` (A1); rotasi PAT + service-role key (A7); `AUTH-005` ("Profil belum tersedia"); domain+TLS; monitoring 5xx.

## Hotfix P1+P2: hilangkan re-render halaman per simpan (14 Nov 2026, 21:30, DEPLOYED)

Setelah investigasi mendalam (3 subagent + audit DB/logs):

**Akar masalah "kenapa masalah terjadi":** instance free Nano (250 IOPS baseline) dibombardir 60.041 dari 68.223 request (91%) berupa prefetch RSC Next.js (diperbaiki sebelumnya) PLUS setiap autosave (debounce 700 ms per sel × observer yang mengetik) memicu `router.refresh()` → render penuh `/dashboard/observasi` (12 query + ±3 rondetp Auth + JSONB `score_descriptors` semua versi aktif + revisions embed) oleh pengirim DAN oleh semua observer lain yang membuka rubrik yang sama (realtime broadcast → `router.refresh()` di semua klien). ~500–760 ribu query/hari → Disk IO budget habis → instance unresponsive → banner/error acak (termasuk screenshot Salma 20:11).

**P1 — hapus `router.refresh()` per autosave:** `assessment-rating-cell.tsx` (score & evidence) dan `observer-notes.tsx` (catatan) — state lokal sudah di-update dari return value action (`setSaved`/`setRevision`); setiap sel juga sudah mendengarkan `assessment-realtime-change` untuk perubahan lokal & remote. Tidak ada ketergantungan UI lain pada re-render per simpan (status Submit/Reopen tetap direfresh via `SubmissionControls`).

**P2 — realtime:** listener `observations` tanpa filter (tidak dipakai siapa pun) **dihapus**; `assessment_ratings` remote kini hanya `emit()` ke sel (tidak memicu re-render klien mana pun); `assessment_submissions` tetap memicu `router.refresh()` debounce **1000 ms** (jarang terjadi, diperlukan agar semua klien melihat status submit/reopen). `assessment-realtime.tsx` mengekspos status tetap sama.

**Endpoint UI yang ditinggalkan:** "Pratinjau penilaian Anda" (agregat di atas sel) sekarang mengikuti realtime (dibuang dari re-render per action; sel membaca ulang lokal) — tetap akurat karena setiap simpan mem-broadcast ke semua klien.

**Verifikasi:** `npm run check` exit 0 (12/12 tes; lint 0 error/5 warning pra-ada), build lokal hijau; backup `imm-app.bak-2026-11-14-2130-full`; `.env.production` sha256 cocok setelah rsync; deploy restart #11 (pid 2071112); smoke 8080 200 semua. Commit a658af2 → push. **Pengguna WAJIB refresh (F5/Ctrl+F5)** agar bundle baru berlaku; sesi lama masih menjalankan JS lama (reload menyelesaikan).

**Sisa pekerjaan (prioritas berikutnya, belum dikerjakan):** P3 (React `cache()` getClaims+profiles; embed score_descriptors hanya versi terpilih; revisions `limit 8`; staff home pakai RPC agregat, bukan `snapshot_data` semua peserta), P4 (standardisasi `revalidatePath`; hilangkan `revalidatePath("/dashboard")` di aksi kecil), index FK terpilih (hygiene, bukan akar masalah), monitoring 5xx harian, upgrade instance Supabase (Pro ~Rp 410 rb/bln) bila hari demo tetap berat, `AUTH-005`, domain+TLS, A1/A5/A7/A8.

## MIGRASI KE SELF-HOSTED SUPABASE (Jalur B) — SELESAI & TERVERIFIKASI (14 Nov 2026, malam)

**Arsitektur baru (PROD, 43.173.33.195):**
- Stack di `/home/ubuntu/supabase/` (docker-compose resmi Supabase, image fixed): `db` (supabase/postgres 17.6.1.136), `auth` (gotrue v2.197.0), `rest` (postgrest v14.18), `realtime` (v2.148.3), `storage` (v1.89.12), `imgproxy`, `meta`, `studio`, `api-gw` (Envoy v1.39.6), `pooler` (supavisor), edge-functions **dicabut** (tidak dipakai).
- Semua port terikat ke `127.0.0.1` (api-gw 8180, studio 8181 internal, pooler 5433/5434) KECUALI **8081** publik (nginx → 127.0.0.1:8180) supaya browser bisa Realtime & login; ufw mengizinkan 8081/tcp.
- `.env` self-hosted (`/home/ubuntu/supabase/.env`, mode 600): secret saya generate (JWT_SECRET HS256, Postgres password, dst). API key lama cloud TIDAK dipakai lagi.
- Aplikasi `/home/ubuntu/imm-app/.env.production` kini menunjuk ke `http://43.173.33.195:8081` (url app tetap 8080; hanya url Supabase + anon/service key yang berubah). SEBELUM swap: backup `.env.production.pre-selfhost-2026-11-14` (rollback = restore + rebuild + pm2 restart).
- `next.config` TIDAK berubah; kode aplikasi TIDAK diubah sama sekali (Jalur B = nol rewrite).

**Migrasi data:** 39/39 migrasi dari repo terpasang (53 tabel); 2.374 baris dari backup 17:29/14 Nov terimport (`import.sql` dari dump Management API; pola: skip `users/identities` (auth schema), skip kolom generated (`observer_notes.scope_id`, `auth.users.confirmed_at`, `identities.email`), identity `ALWAYS`→`BY DEFAULT` + setval). `auth.users`+`auth.identities` (7 akun, hash password utuh) terimport interseksi kolom cloud∩lokal.

**Verifikasi:** daftar tabel 53; ratings 1020; peserta 51; akun 7/7; login QA (qa-prod-observer-a) OK via jalur internal; PostgREST RLS membalas profil dengan benar; smoke 8080 semua 200; **browser login QA Kader menampilkan data PROD (3 kegiatan / 51 peserta / 9 rubrik / 6 penilai / 51 provisional)** — data benar-benar dibaca dari database lokal.

**Operasional:**
- App PROD sekarang 100% mandiri — tidak tergantung cloud Supabase (cloud tetap ada, tidak disentuh; bisa dihapus/di-*pause* nanti jika diinginkan).
- Backup harian 03:15 (`/etc/cron.d/imm-db-backup`) kini otomatis menembak instance lokal (baca URL dari `.env.production`). Retensi 14 hari di `/home/ubuntu/imm-db-backups/`.
- Restart/rebuild prosedur biasa (docs/DEPLOYMENT.md). Tidak ada migrasi cloud yang perlu dijalankan ulang.
- Peringatan: 8081 publik adalah permukaan API (PostgREST/Auth) — sama sifatnya dengan Supabase cloud yang dulu publik; diterima untuk trial.
- **Pemakai/panitia harus refresh (F5/Ctrl+F5)** — bundle JS baru memuat URL+key baru; sesi lama bisa gagal sampai refresh.
- Jika ingin menghapus cloud project: tunggu beberapa hari dan HANYA setelah diverifikasi tidak ada tim lain yang memakainya; atau cukup biarkan (tidak ditagih).

## Fix: redirect logout (dan auth callback) ke http://localhost:3000 (14 Nov 2026, 22:35, DEPLOYED)

Gejala: klik "Keluar" mengarah ke `http://localhost:3000/`. Akar masalah: Next.js `next start` selalu menghasilkan `request.url`/`request.nextUrl` sebagai `http://localhost:3000/...` dan **mengabaikan header Host/X-Forwarded-Host**; semua redirect absolut dari route handler yang memakai `request.url` rusak (`/auth/signout` dan `/auth/callback` — callback konfirmasi email juga terkena).

Fix: `lib/request-base-url.ts` — susun base URL dari header `x-forwarded-host` → `host` → `x-forwarded-proto` (nginx sudah mengirim `$http_host` + `$scheme`); dipakai di `app/auth/signout/route.ts` dan `app/auth/callback/route.ts`. Verifikasi: `POST /auth/signout` via nginx → `location: http://43.173.33.195:8080/`; browser login QA Kader → klik Keluar → URL = `http://43.173.33.195:8080/` + halaman publik tampil. Deploy: backup `imm-app.bak-2026-11-14-2235-full` → rsync (tanpa --delete) → npm ci → build → pm2 restart #13. Catatan: akses langsung 127.0.0.1:3000 memberi location `http://127.0.0.1:3000/` — benar, port itu tidak dibuka publik.

## Insiden: data hilang 83→50 (input Salma) — AWAS: cutover dengan dump basi (14 Nov 2026, 23:00, DIPULIHKAN)

Gejala: pengguna (Salma) melapor jumlah input nilai berkurang (“83 → 50”). Penyebab: migrasi ke self-hosted di-restore dari dump 17:29, sementara app baru dipakai sampai cutover ~22:16 — **semua input antara 17:29 → 22:16 hanya ada di cloud, tidak terimpor ke lokal** (~1.288 rating, 111 submission, +2 peserta, dst).

Pemulihan (merge aman "cloud lebih baru menang" ke DB lokal):
1. Dump fresh cloud via Management API → `/home/ubuntu/cloud-dump-2300/` (53 tabel, 4.048 baris).
2. `/home/ubuntu/merge-cloud.py` — per tabel: baris yang tidak ada lokal INSERT; baris ada di keduanya hanya bila `updated_at|changed_at|created_at` versi cloud lebih baru (baris lokal yang lebih baru, mis. input setelah cutover, TIDAK disentuh). Master/seed statis (framework/rubrik/kompetensi) **sengaja di-skip** (id berbeda antara cloud & lokal; isinya sama). ON CONFLICT tanpa target utk toleransi unique constraint lain.
3. Apply via psql ON_ERROR_STOP=1 dalam satu transaksi; `setval` identity columns diulang.

Hasil verifikasi (psql): ratings 1020 → **2308**, submissions 83 → **201**, rating_revisions 417 → **654**, submission_revisions 84 → **218**, participants 51 → **53**, dev_recommendations 12, report_publications 1, collective_evaluations (finalized) restored. Browser: halaman Observasi memuat "DAD PK IMM FEB 2026" tanpa banner error.

**Pelajaran untuk cutover/backup antar lingkungan:** JANGAN restore dari dump yang diambil jauh sebelum cutover. Dump tepat sebelum/menempel pada cutover; atau merge dump segar pasca-cutover seperti tadi. Saat ini cloud asli tetap ada (tidak disentuh) sebagai cadangan.

## Audit pasca-migrasi: rekonsiliasi penuh lokal vs dump cloud (14 Nov 2026, 23:40)

Tabel-per-tabel (53 tabel) dibandingkan antara dump lokal terbaru vs dump cloud 23:00. Temuan & tindakan:

1. **Duplikat master/seed lokal** (kerangka kompetensi & rubrik: lokal 2 rantai seed+impor, 54 vs 27 indikator dll.) — id berbeda, isi sama. Bukan kehilangan data; kosmetik. Dibiarkan supaya demo tetap jalan; pembersihan bisa sesi terpisah.
2. **Framework cloud `b29a2df2…` tidak ada di lokal** → 1 baris `competency_framework_versions` yatim → **diperbaiki**: di-repoint ke framework lokal `fa1c3e32…` (isi identik), `version=2`; `versions_orphan=0`.
3. **Komisariat `a3200000-…0003` tertimpa seed lokal** (`Komisariat Simulasi 03` vs cloud `PK IMM UPI`; 2 peserta terdampak) → **diperbaiki**: `PK IMM UPI` (sesuai cloud).
4. **Instructor assignment & commissariats** perbedaan timestamp saja (seed time vs cloud) — konten identik.
5. **`competency_indicator_rubrics`** 27 lokal vs 27 cloud, id berbeda, isi sama — kosmetik.
6. **Semua tabel data pengguna**: `cld-only = 0` (tidak ada satu pun baris cloud yang hilang di lokal setelah merge+fix). `loc-only` = input panitia pasca-cutover — baik, dan sekarang terus bertambah (ratings 2259+).
7. **Verdict**: tidak ada lagi data pengguna yang hilang; integritas FK terverifikasi (0 yatim).

**Catatan untuk drift berikutnya:** aplikasi sekarang hanya membaca/menulis database lokal. Risiko tersisa: (a) cloud masih terbuka untuk siapa pun dengan key lama (sudah tercetak di chat) — disarankan di-pause/rotate; (b) tab lama browser panitia yang belum Ctrl+F5 masih menunjuk cloud; (c) backup harian 03:15 menembak database lokal — sudah benar.

## Pause project cloud PROD (14 Nov 2026, 23:55)

`POST /v1/projects/crrqlwlfndhugcqcnkex/pause` — disetujui pemilik. Status akhir `INACTIVE`. Sekarang:
- API cloud tidak lagi melayani (semua request akan ditolak / tidak terjangkau).
- Tidak ada yang bisa menulis/membaca cloud → drift lokal↔cloud mustahil lagi; backup lokal harian 03:15 tetap berjalan (menembak database self-hosted).
- Cloud tetap ada sebagai cadangan beku; bisa di-restore kapan pun via `restore-a-project` (biaya: tidak ada; paket free).
- Aplikasi PROD tidak terpengaruh (semua sudah menunjuk ke instance self-hosted).

## Diagnosis: rekap indikator kosong di `/dashboard/evaluasi` (23 Nov 2026, read-only)

Gejala: untuk event `48880b89…` (DAD PK IMM FEB 2026), peserta `45238a81…` (Aliyya Maulida Fajrin) menampilkan tabel "Rekap indikator per cakupan" kosong, baik saat login sebagai Instruktur MoT maupun Bidang Kader. Peserta `0e7b748b…` (Albian) pada event yang sama menampilkan 15 baris normal.

Akar penyebab: **bukan role/RLS, melainkan batas baris PostgREST self-hosted.** RPC `get_event_assessment_summary(event)` mengembalikan **3069 baris** (33 peserta × 93 baris). Container `supabase-rest` berjalan dengan `PGRST_DB_MAX_ROWS=1000` (default compose; tidak di-set di `/home/ubuntu/supabase/.env`), sehingga `supabase.rpc(...)` di halaman hanya menerima 1000 baris pertama. Data diverifikasi dengan token sesi browser asli: `total=1000`, `mine=0` untuk Aliyya. Posisi baris Aliyya = 1117–1209; Albian = 187–279. Peserta dari `Elvando Hadi` (baris 1024) ke bawah (22 dari 33 peserta) tidak mendapat rekap sama sekali; `Zibran Achmad Fauzan` (931–1023) hanya dapat 70 dari 93 baris (data sebagian).

Role observer **tidak dapat** membuka `/dashboard/evaluasi` (halaman redirect ke `/dashboard`); nilai yang mereka lihat berasal dari halaman Observasi yang membaca `assessment_ratings` langsung per submission miliknya, jadi tidak terkena batas ini. Data nilai Aliyya sendiri ada dan lengkap di DB (7 submission, 6 submitted + 1 draft, 15 skor submitted per versi).

Dampak lain: aksi di `app/dashboard/evaluasi/actions.ts` (draf rekomendasi otomatis, finalisasi) memakai RPC yang sama, sehingga peserta setelah baris ke-1000 berisiko salah agregasi saat difinalisasi.

**Belum diperbaiki** (butuh persetujuan pemilik; perubahan menyentuh PROD):
- Cepat: set `PGRST_DB_MAX_ROWS` (mis. 100000 atau -1) di `/home/ubuntu/supabase/.env`, recreate container `rest`, verifikasi ulang halaman.
- Robust: ubah RPC menjadi menerima `target_participant_id` opsional dan filter di SQL, lalu perbarui 3 pemanggil di `app/dashboard/evaluasi/` — menghilangkan transfer 3069 baris per halaman sekaligus.

## Dokumentasi visual untuk stakeholder (23 Nov 2026)

- Folder baru: `docs/diagrams/`. Isi: 7 berkas `.drawio` (sumber editable), 7 berkas `.png` (hasil render), `index.html` (galeri satu halaman), `PANDUAN-DIAGRAM.md` (penjelasan singkat + glosarium), dan `render.sh` (cara membuat ulang PNG).
- Topik diagram: arsitektur sistem; peran & batas akses; alur pengajuan/seleksi; alur penilaian sampai rapor; aturan perhitungan skor; model data; peta menu per peran.
- Sumber isi: `BLUEPRINT.md`, `HANDOVER.md`, `IMPLEMENTATION_PLAN.md`, kode `app/`/`lib/`/`components/`, dan 39 migrasi di `supabase/migrations/`. Tidak ada kode aplikasi yang diubah.
- Cara render: `bash docs/diagrams/render.sh` (butuh `google-chrome`, `python3`, internet ke viewer.diagrams.net). Viewer menolak teks bertanda `%`, sehingga di `.drawio` ditulis `&#37;`.
- Pemeriksaan: seluruh XML valid; 7 PNG dirender dan diperiksa visual; galeri `index.html` dirender di headless Chrome tanpa gambar rusak.

## Fix blocker rekap evaluasi: PGRST_DB_MAX_ROWS (23 Nov 2026, PROD, DEPLOYED)

- Sesuai diagnosis read-only di atas: `PGRST_DB_MAX_ROWS=1000` memotong RPC `get_event_assessment_summary` yang menghasilkan 3069 baris, sehingga 22 dari 33 peserta tidak mendapat rekap.
- Perubahan: `/home/ubuntu/supabase/.env` baris `PGRST_DB_MAX_ROWS` diubah 1000 → **100000**. Backup dibuat lebih dulu: `.env.bak-20261123-202146`. Container `supabase-rest` dibuat ulang dengan `docker compose up -d --force-recreate --no-deps rest` (container lain tidak disentuh), health `healthy`, env container terbaca `PGRST_DB_MAX_ROWS=100000`.
- Verifikasi memakai akun QA Kader produksi (kredensial tidak dicetak): RPC mengembalikan **3069 baris** dan **33 peserta unik**; peserta yang sebelumnya hilang (Aliyya, duluan di baris 1117) kini mendapat **93 baris, 77 dengan skor**.
- Smoke 8080: `/`, `/login`, `/daftar`, `/dashboard` → 200. Tidak ada perubahan kode aplikasi, migrasi, atau data.
- Catatan lanjutan: perbaikan ini hanya membuka rekap. Data masih mandek di tahap berikutnya: 45 dari 48 peserta belum punya evaluasi kolektif, 2 evaluasi yang dibuat 23 Nov masih kosong narasinya, dan hanya 1 rapor yang diterbitkan.

## Keputusan koreksi alur (23 Nov 2026)

- Pemilik memutuskan delapan poin dari catatan koreksi teman. Rincian, alasan, dan dampak pada BLUEPRINT ada di `docs/KEPUTUSAN-KOREKSI-ALUR.md`.
- Ringkas: tampilan penilai tersinkron tetapi nilai tetap independen; yang menyetujui dan finalisasi adalah Admin plus MoT, Vice MoT, Master Observer, Vice Observer; satu rekomendasi per peserta per jenis penilaian; tombol satu klik setuju → finalisasi → terbit → unduh PDF per peserta; satu tombol finalisasi semua materi dengan snapshot tetap per jenis; rapor web dirapikan tetapi PDF tidak diubah; cara input nilai tidak diubah.
- **Riwayat (23 Nov, sebelum implementasi):** belum ada kode aplikasi yang diubah untuk koreksi ini. Entri "Tahap 1–7" di bawah mencatat kode yang kemudian diubah; batas DEV/PROD-nya ada di ringkasan status di atas.
- Tahap 0 selesai (lihat dokumen keputusan). Tahap 1 selesai: daftar empat subrole koordinator konsisten di `lib/phase7-home.ts`, `lib/instructor-roles.ts`, fungsi `is_assessment_moderator` di migrasi `20261112170000`, serta halaman Evaluasi dan Laporan. Tidak perlu perubahan kode. `npm run check` exit 0 (0 error, 5 warning lama, tes 12/12). Satu catatan UX: menu Evaluasi dan Laporan tampil untuk semua Instruktur, tetapi halaman mengarahkan IoT/Vice IoT ke dashboard. Ini bukan masalah keamanan.
- **Tahap 2 selesai (23 Nov 2026).** Berubah: `app/dashboard/observasi/assessment-rating-cell.tsx`, `app/dashboard/observasi/page.tsx`, `app/globals.css`. Panel "Penilaian observer lain" kini tampil bila ada rating rekan, memperbarui nilai dan status Draft/Submitted dari event Realtime tanpa `router.refresh()` per autosave. Nilai tetap independen; RLS, constraint, autosave 700 ms, dan konflik tidak diubah. Verifikasi: `npm run check` exit 0, format bersih, tes 12/12; `npm run build` lolos setelah diulang sekali (perintah pertama berhenti karena pemeriksaan keamanan Next.js). **Belum diuji di browser dua akun** karena server dev tidak berjalan dan proyek Supabase DEV tidak terjangkau dari sesi ini.
- **Upgrade Next.js selesai (23 Nov 2026).** 16.4.3 → 16.4.6, `eslint-config-next` diselaraskan, `experimental.agentUpgrade: "security"` ditambahkan. Commit `64fa100` (hanya package.json, package-lock.json, next.config.ts). Tidak ada branch/PR duplikat. `npm run check` dan `npm run build` lolos. Sisa 7 kerentanan moderat dari `npm audit` belum ditindak.
- **Tahap 3 selesai (23 Nov 2026).** Berubah: `lib/phase6-recommendations.ts`, `tests/phase6-recommendations.test.ts`, `app/dashboard/evaluasi/actions.ts`, `app/dashboard/evaluasi/page.tsx`. Rekomendasi otomatis kini satu teks per evaluasi, menyebut semua indikator di bawah 3/5 tanpa angka, dengan saran umum per aspek. Input manual dihapus; koordinator menyunting draf lalu menyetujui. Migrasi baru `20261123130000_dad_single_recommendation_per_evaluation_v1.sql` menambah `is_active` dan indeks unik parsial tanpa menghapus baris lama; penguji `supabase/tests/dad_single_recommendation.sql`. Verifikasi: `npm run check` exit 0, tes 12/12. **Riwayat (23 Nov):** migrasi `20261123130000` belum dijalankan. Migrasi itu kemudian dipasang di PROD pada deploy 24 Nov pagi (commit `0448100`); migrasi branch yang lebih baru tetap hanya di DEV. Lihat ringkasan status di atas.
- **Tahap 4 selesai (24 Nov 2026).** Berubah: `app/dashboard/evaluasi/actions.ts`, `app/dashboard/evaluasi/page.tsx`, `app/dashboard/laporan/page.tsx`, `components/phase7-report-workspace.tsx`. Logika finalisasi diekstrak ke `runFinalize` agar dua tombol memakai gate yang sama. Tombol baru "Setujui, finalisasi, terbitkan, dan unduh rapor" menyetujui rekomendasi aktif, memfinalisasi, memanggil `publish_assessment_report`, lalu mengarahkan ke halaman laporan dengan penanda `published=1`; komponen laporan mengunduh satu PDF sekali lewat `exportIndividual` sehingga audit `individual_pdf` tetap tercatat. Tombol finalisasi lama tetap ada. Verifikasi: `npm run check` exit 0, tes 12/12, `npm run build` exit 0. **Riwayat (24 Nov, sebelum uji browser):** belum diuji browser dan masih bergantung pada migrasi Tahap 3. Uji browser DEV kemudian LULUS (entri "Hasil uji browser dengan agent-browser" di bawah).
- **Tahap 5 selesai (24 Nov 2026).** Berubah: `app/dashboard/evaluasi/actions.ts`, `app/dashboard/evaluasi/page.tsx`. `saveCollectiveEvaluation` kini menyimpan `graduation_decision` dan `decision_rationale` per evaluasi. Aksi `finalizeAllEvaluations` memeriksa versi rubrik aktif yang belum punya evaluasi, lalu memfinalisasi evaluasi draf yang sudah memiliki keputusan dan alasan; yang belum siap dilewati. Snapshot tetap satu per jenis. Halaman menampilkan rekap jumlah berhasil, dilewati, dan versi tanpa evaluasi. Verifikasi: `npm run check` exit 0, tes 12/12, `npm run build` exit 0. **Riwayat (24 Nov):** belum diuji browser dan masih bergantung pada migrasi Tahap 3. Uji browser DEV kemudian LULUS (lihat entri di bawah).
- **Tahap 6 selesai (24 Nov 2026).** Berubah: `app/globals.css` dan `app/dashboard/observasi/assessment-rating-cell.tsx` (hanya kelas status). Perapian tampilan: kartu peserta diberi border dan latar, jarak antar indikator dan sel diperbesar, uraian anchor dibuat seperti catatan ringkas, panel anchor dan catatan memakai latar lembut, dan status simpan diberi kelas khusus. Mechanisme autosave 700 ms, draf lokal, revisi, konflik, Kirim/Buka kembali, dan Realtime **tidak diubah**. Verifikasi: `npm run check` exit 0, tes 12/12, `npm run build` exit 0. **Riwayat (24 Nov):** perubahan visual belum diverifikasi di browser. Pemeriksaan visual DEV kemudian LULUS (lihat entri di bawah).
- **Tahap 7 selesai (24 Nov 2026).** Berubah: `components/phase7-report-workspace.tsx`, `app/globals.css`. Rapor web: empat blok naratif (Kekuatan, Area pengembangan, Rekomendasi, Alasan keputusan) dilipat; identitas, nilai akhir, rekap aspek, dan keputusan tetap tampil. Metrik diringkas jadi empat kartu dengan rincian keputusan di dalamnya; jumlah provisional tetap tampil sebagai keterangan. Tombol ekspor dikelompokkan dalam panel tersendiri. Generator PDF, snapshot, dan RPC tidak diubah, sehingga isi PDF resmi tetap sama. Verifikasi: `npm run check` exit 0, tes 12/12, `npm run build` exit 0.
- **Tahap 8 — riwayat (24 Nov 2026, sebelum deploy).** Selesai: `npm run check` dan `npm run build` hijau; commit upgrade Next.js sudah dibuat terpisah. **Pada titik itu belum selesai:** migrasi `20261123130000` belum dipasang, penguji SQL belum dijalankan, uji browser dua akun/konflik/Realtime/alur penuh belum dilakukan, dan belum ada deploy PROD. Kode Tahap 3–5 bergantung pada kolom `is_active`, jadi tidak boleh di-deploy sebelum migrasi terpasang. Lihat entri "Deploy PROD selesai (24 Nov 2026)" di bawah untuk keadaan setelahnya.
- **Riwayat (sebelum deploy 24 Nov):** urutan lengkap pasang migrasi dan uji browser ada di `docs/LANGKAH-PASANG-MIGRASI-DAN-UJI.md`; pemilik saat itu memilih menunda deploy dan tidak ada perubahan ke PROD selain perbaikan PGRST_DB_MAX_ROWS. Keputusan itu berubah pada deploy 24 Nov pagi.
- **DEV lokal aktif (24 Nov 2026).** Supabase CLI 3.3.0 di `/tmp/opencode/supabase-cli`, stack di `/tmp/opencode/imm-supabase` (API 54321, Studio 54323, DB 54322), Next.js dev di port 3100. `.env.local` diarahkan ke stack lokal; backup lama `.env.local.cloud-backup`. Akun uji: `admin@dev.local`, `observera@dev.local`, `observerb@dev.local`, `instruktur@dev.local`, `kader@dev.local`, kata sandi `Devpass123!`. Rubrik dan dua evaluasi di-seed via SQL untuk keperluan uji.
- **Hasil uji browser dengan agent-browser (24 Nov 2026).** Catatan: agent-browser sebelumnya timeout CDP; hiccup hilang setelah dev server di-restart dan memakai `localhost` bukan `127.0.0.1` (Next.js memblokir resource dev dari host 127.0.0.1).
  - Tahap 2 LULUS: Observer A mengubah skor menjadi 4, autosave "Tersimpan" muncul; Observer B melihat panel "Penilaian observer lain (1) · Observer A · Draft · Skor 4" tanpa refresh; setelah Kirim, B melihat "Sudah kirim" dan "1 dari 2 observer mengirim"; nilai B tetap independen.
  - Tahap 3 LULUS: dengan rata-rata 1.50/5, tombol "Buat atau perbarui draf rekomendasi" menghasilkan tepat satu draf berisi nama indikator dan saran umum tanpa angka; klik ulang tetap satu baris; tidak ada form manual.
  - Tahap 4 LULUS: tombol "Setujui, finalisasi, terbitkan, dan unduh rapor" menghasilkan 1 snapshot, 1 publikasi, 1 baris audit `individual_pdf`, rekomendasi berubah jadi `approved`, dan halaman dialihkan ke Laporan dengan `published=1`.
  - Tahap 5 LULUS: tombol "Finalisasi semua materi yang siap" menghasilkan 1 evaluasi berhasil, 0 dilewati, 0 versi tanpa evaluasi; total snapshot jadi 2.
  - Tahap 6/7 LULUS visual: preview rapor hanya menampilkan heading Kekuatan, Area pengembangan, Rekomendasi, dan Alasan keputusan dalam keadaan terlipat; nilai akhir, rekap aspek, dan keputusan tetap tampil; metrik diringkas jadi empat kartu.
- **Deploy PROD selesai (24 Nov 2026).** Backup DB `pre-migration-20261124-045542.sql` (2,1 MB) dibuat lebih dulu. Migrasi `20261123130000` dipasang di DB self-hosted PROD (ALTER TABLE, UPDATE 11, CREATE INDEX, COMMENT) dan penguji `dad_single_recommendation.sql` lolos; 12 baris rekomendasi lama tetap ada dengan 1 baris aktif. Backup aplikasi `/home/ubuntu/imm-app.bak-20261124-045659`, lalu rsync tanpa `--delete`, `npm ci --include=dev`, `npm run build`, `pm2 restart imm` (restart ke-14, online). Smoke test 8080: `/`, `/login`, `/daftar`, `/dashboard`, `/dashboard/observasi`, `/dashboard/evaluasi`, `/dashboard/laporan` semuanya 200. Marker kode baru ada di bundle server. Log error PM2 terakhir ditulis 04:28, sebelum deploy, jadi tidak ada error baru setelah restart. Kode yang aktif: commit `0448100`. Deploy ini tidak memasukkan pekerjaan branch `research/peta-alur-penilaian` sampai `a6d61be`; pekerjaan itu masih di DEV dan belum di-deploy.

## Tindak lanjut kondisi codebase (25 November 2026)

- Delapan belas commit yang tertahan di `main` sudah di-push ke `origin/main`. `npm run check` dan `npm run build` lolos.
- Lima peringatan lint terakhir dihapus: empat import `Link` tak terpakai dan satu `eventError` tak terpakai. Hasil `npm run check`: 0 error, 0 peringatan, 22 tes lolos. Commit `76c653b` sudah di-push.
- `NEXT_PUBLIC_PUBLIC_AGGREGATE_EVENT_ID` diisi di `.env.production` dengan event `48880b89-de78-4e72-a82b-e2bb89f74fbd`. Backup aplikasi `/home/ubuntu/imm-app.bak-2026-11-25-1532` dan backup env `/home/ubuntu/.env.production.bak-2026-11-25-1532` dibuat lebih dulu. rsync tanpa `--delete`, `npm ci --include=dev`, `npm run build`, dan `pm2 restart imm --update-env` berhasil (restart ke-19, online). Smoke 8080: tujuh halaman 200. Variabel terbaca di bundle server.
- Agregat publik belum tampil: `get_public_event_aggregate` mengembalikan `groups = NULL` untuk ketiga kegiatan karena jumlah peserta dengan rapor Published masih 2, di bawah ambang 10 per komisariat. Ini sesuai peraturan di `BLUEPRINT.md`, bukan galat.
- `docs/STATUS-PRODUKSI-SATU-VERSI.md`, `docs/DEPLOYMENT.md`, dan `docs/QA_PHASE8_TEST_PLAN.md` diselaraskan dengan kondisi ini. Otoritas status tetap `docs/STATUS-PRODUKSI-SATU-VERSI.md`.
- **Optimasi `snapshot_data` bagian dashboard staf selesai (25 Nov 2026).** `lib/phase7-home.ts` tidak lagi memanggil `get_event_report_rows`; ia memanggil RPC baru `get_staff_event_summary` dari migrasi `20261125100000_staff_event_summary_rpc_v1.sql`. RPC hanya mengembalikan delapan angka, tanpa `snapshot_data` atau identitas rinci. Jalur ekspor PDF/ZIP/Excel, struktur `snapshot_data`, dan RPC rapor Peserta tidak disentuh. Penguji `supabase/tests/staff_event_summary.sql` lolos di DEV: angka baru identik dengan perhitungan lama untuk semua kegiatan, akses tanpa peran ditolak 42501, dan Kader tetap menerima nol/null untuk angka bergantung snapshot. Browser lokal: dashboard Admin menampilkan `5 peserta · 3 final · 2 published · 2 provisional · rata-rata 63.3`, sesuai SQL; halaman Laporan & Rapor merender tanpa error. `npm run check` 0 error/0 warning, 22 tes lolos, `npm run build` lolos. **Deploy produksi selesai 25 November 2026:** backup aplikasi `/home/ubuntu/imm-app.bak-2026-11-25-1552`, backup env `/home/ubuntu/.env.production.bak-2026-11-25-1552`, dan dump DB `manual-pre-staff-summary-2026-11-25-1552.dump`; migrasi `20261125100000` dipasang, fungsi terbaca di produksi (36 baris laporan, 5 final, 2 published, rata-rata 59.2 untuk event trial), rsync tanpa `--delete`, build, `pm2 restart imm --update-env` (restart ke-20, online). Smoke 8080 tujuh halaman 200; bundle memuat `get_staff_event_summary`; tidak ada error baru pada log setelah restart. Kode aktif produksi saat deploy itu: `6efa0d8`, kemudian digantikan `694dfa3`.
- **Pemisahan penuh `snapshot_data` panel Laporan selesai (25 Nov 2026, DEV).** Baseline diambil lebih dulu: PDF snapshot `39d48a66-…` revision 1 diunduh dari DEV, hash PDF: 35281c2d66e4e17447b53cae00926c071c8bc9dbd36ccd3fdbeed2d7e2765604, hash `snapshot_data` 9dd3881e1ea60201d97eb0da107db9a344b26b7ea963ff922dfd17f044d58c14, audit id 11; catatan di `docs/baseline-pdf-sha256.csv`. Berubah: `lib/report-snapshot-dto.ts` (baru), `app/dashboard/laporan/page.tsx` (DTO ringkas), `app/dashboard/laporan/actions.ts` (`loadReportSnapshots`), `components/phase7-report-workspace.tsx` (muat snapshot penuh saat ekspor), `lib/phase7-files.ts` (hanya menambah field opsional `snapshotId`, generator PDF tidak diubah). RLS, `canViewPrivate`, RPC rapor Peserta, dan struktur `snapshot_data` tidak disentuh. Verifikasi: PDF individual setelah perubahan identik byte-for-byte dengan baseline; PDF dalam ZIP juga identik; ZIP berisi 2 rapor, Excel evaluasi dan PDF laporan kegiatan berhasil diunduh. Payload `snapshot_data` pada data produksi turun 44,3% (45.260 → 25.232 karakter, dihitung read-only). `npm run check` 0 error/0 warning, 22 tes lolos, build lolos. **Deploy produksi selesai 25 November 2026:** backup `/home/ubuntu/imm-app.bak-2026-11-25-1618` dan `/home/ubuntu/.env.production.bak-2026-11-25-1618`, rsync tanpa `--delete`, build, `pm2 restart imm --update-env` (restart ke-21, online), smoke 8080 tujuh halaman 200, bundle memuat `loadReportSnapshots`, tidak ada error baru pada log. Kode aktif produksi: `694dfa3`.
- **Fitur arsip kegiatan dibuat (25 Nov 2026, DEV).** Sesuai keputusan pemilik, kegiatan tidak dihapus permanen. Migrasi `20261125110000_event_archive_v1.sql` menambah `events.archived_at`, indeks kegiatan aktif, dan trigger `prevent_observer_event_archive`. Server Action baru `archiveEvent`/`restoreEvent` hanya untuk `admin_system`; `updateEvent` kini menolak mengubah kegiatan yang sudah diarsipkan. Halaman `/dashboard/kegiatan` menampilkan tombol Arsipkan/Pulihkan, badge "Arsip", tautan "Lihat kegiatan yang diarsipkan", dan menyaring daftar aktif. Verifikasi DEV: arsip menyembunyikan kegiatan dan mengisi `archived_at`; pulihkan mengosongkannya dan kegiatan muncul kembali; Observer ditolak trigger dengan pesan "Observer tidak dapat mengarsipkan atau memulihkan kegiatan." `npm run check` 0 error/0 warning, 22 tes lolos, build lolos. Komit `50322aa` juga menyaring kegiatan berarsip dari semua pemilih kegiatan; uji DEV menunjukkan kegiatan hilang dari Laporan, Dashboard, dan Peserta lalu muncul kembali setelah dipulihkan. **Deploy produksi selesai 25 November 2026:** backup `/home/ubuntu/imm-app.bak-2026-11-25-1706`, `/home/ubuntu/.env.production.bak-2026-11-25-1706`, dan dump DB `manual-pre-archive-2026-11-25-1706.dump`; migrasi `20261125110000` terpasang; rsync tanpa `--delete`, build, `pm2 restart imm --update-env` (restart ke-22, online); smoke delapan halaman 200; trigger penolakan arsip oleh Observer terverifikasi di produksi dengan transaksi rollback. Kode aktif produksi: `50322aa`.
- **Perbaikan rekap Kader dan angka peserta selesai (25 Nov 2026, DEV).** Keputusan pemilik: peserta dihitung unik; final dan published dihitung sekali per peserta memakai snapshot terbaru. Migrasi `20261125120000_staff_summary_unique_participants_v1.sql` menimpa `get_staff_event_summary`: satu baris per peserta, agregat keputusan dan rata-rata juga diberikan ke Bidang Kader. `app/dashboard/analitik/page.tsx` tidak lagi membaca `assessment_snapshots` lewat REST; memakai RPC yang sama. Penguji `supabase/tests/staff_event_summary.sql` diperbarui dan lolos: angka cocok dengan peserta unik, rekap Kader sama dengan Admin, akses tanpa peran ditolak 42501. Browser DEV: Analitik Kader menampilkan `5 / 3 / 2 / 2 / 0 / 1`, dashboard Admin `5 peserta · 3 final · 2 published · rata-rata 63.3`. `npm run check` 0 error/0 warning, 22 tes lolos, build lolos. **Deploy produksi selesai 25 November 2026:** backup `/home/ubuntu/imm-app.bak-2026-11-25-1800`, `/home/ubuntu/.env.production.bak-2026-11-25-1800`, dan dump DB `manual-pre-unique-count-2026-11-25-1800.dump`; migrasi `20261125120000` terpasang; rsync tanpa `--delete`, build, `pm2 restart imm --update-env` (restart ke-23, online); smoke delapan halaman 200. Verifikasi DB produksi dengan transaksi rollback: Admin dan Kader sama-sama mendapat `33 peserta · 2 final · 2 published · 1 lulus · 1 perlu pembahasan · rata-rata 47.0`; tidak ada error baru pada log. Kode aktif produksi: `a43bd27`.
- **Penutupan inkonsistensi tersisa (25 Nov 2026, DEV).** Server Action `addParticipant`, `editParticipant`, dan `removeParticipant` kini menolak kegiatan berarsip lewat `assertEventActive` (`app/dashboard/kegiatan/actions.ts`). `requireModerator` di `app/dashboard/evaluasi/actions.ts` juga menolak kegiatan berarsip untuk seluruh aksi penilaian. Di `app/dashboard/laporan/actions.ts`, terbit rapor, pengaitan akun, audit ekspor, dan `loadReportSnapshots` tidak memproses kegiatan berarsip. Dokumen yang masih menyebut kode `0448100`/deploy belum terjadi (`KEPUTUSAN-KOREKSI-ALUR.md`, `RENCANA-IMPLEMENTASI-KOREKSI-ALUR.md`, `ALUR-PENILAIAN-KANONIK.md`, `MATRIKS-KEPUTUSAN-PRODUK.md`, `LANGKAH-PASANG-MIGRASI-DAN-UJI.md`, `HASIL-FASE6-DOKUMEN.md`, `VERIFIKASI-PRODUKSI-YANG-BELUM-DILAKUKAN.md`, `INVENTARIS-JALUR-LAMA.md`, `FRONTEND_REFACTOR.md`) ditandai sebagai riwayat lalu diarahkan ke `docs/STATUS-PRODUKSI-SATU-VERSI.md`. Aturan gate di `BLUEPRINT.md` dan STATUS diperjelas: draf lunak, finalisasi keras. `npm run check` 0 error/0 warning, 22 tes lolos, build lolos. **Deploy produksi selesai 25 November 2026:** backup `/home/ubuntu/imm-app.bak-2026-11-25-1816` dan `/home/ubuntu/.env.production.bak-2026-11-25-1816`, rsync tanpa `--delete`, build, `pm2 restart imm --update-env` (restart ke-24, online), smoke delapan halaman 200, tidak ada error baru pada log. Kode aktif produksi: `a9ae78b`.
- Masih terbuka dan belum dikerjakan: cron retensi otomatis dan alerting 5xx. **Prioritas cron retensi diturunkan pemilik pada 25 November 2026**; retensi V1 sudah dijalankan sekali dan tidak ada kandidat, sehingga tidak mendesak. Alerting 5xx tetap perlu keputusan tersendiri.

## Perbaikan error tombol finalisasi Evaluasi (26 November 2026, DEV)

- Pemicu di PROD: pada 26 November 17:23–17:27 WIB ada 4 `POST /dashboard/evaluasi` yang balas 500 untuk peserta `4ea50aed…` (Fadilla Marta Kusuma). Log server: `Error: Pilih keputusan kelulusan dan isi alasan minimal 10 karakter.` dari `runFinalize`. Dua evaluasi draft peserta itu memang memiliki `graduation_decision` kosong dan `decision_rationale` 0 karakter. Karena aksi melempar `Error`, error boundary `app/dashboard/error.tsx` mengganti seluruh halaman dengan "Halaman gagal dimuat". Halaman (GET) tetap 200.
- `app/dashboard/evaluasi/actions.ts`: validasi yang diharapkan kini dikembalikan sebagai `{ ok: false, message }` (`parseFinalizeFormData`, `runFinalize`, `finalizeFromForm`). `finalizeCollectiveEvaluation` dan `approveFinalizePublishReport` mengalihkan ke `/dashboard/evaluasi?...&error=...`; `finalizeAllEvaluations` tetap menghitung evaluasi yang dilewati. Redirect internal Next.js sengaja dilempar ulang agar tidak tertelan penanganan error.
- `app/dashboard/evaluasi/page.tsx`: kolom Keputusan kelulusan dan Alasan keputusan memakai `required` sehingga tombol finalisasi ditahan browser bila kosong. "Simpan draf evaluasi" memakai `formNoValidate` agar draf tanpa keputusan tetap bisa disimpan. Pesan `?error=` dirender sebagai `<p role="alert">`.
- Verifikasi: `npm run typecheck`, lint, format:check, tes 22/22, dan `npm run build` lolos. Browser DEV: pesan `?error=` tampil sebagai alert dan atribut `required`/`minLength` terbaca. Tidak ada evaluasi berstatus draft di data DEV, jadi jalur klik finalisasi dengan kolom kosong belum diuji langsung di browser.
- **Deploy produksi selesai 26 November 2026** setelah persetujuan pemilik: backup `/home/ubuntu/imm-app.bak-2026-11-26-1839-full` dan `/home/ubuntu/.env.production.bak-2026-11-26-1839`; hash env identik sebelum/sesudah; rsync tanpa `--delete`; `npm ci --include=dev`; build OK; `pm2 restart imm --update-env` (restart ke-25, online). Smoke 8080 delapan halaman 200; bundle memuat kode validasi baru; tidak ada error baru di log setelah restart. Kode aktif: `f6223c5`. Tidak ada migrasi atau perubahan data. Pengguna wajib Ctrl+F5 agar bundle dan action ID baru dipakai.

## Rancangan arsip materi Pelatihan (26 November 2026)

- Analisis read-only: aplikasi tidak memiliki tombol hapus materi. Di database, Admin Sistem punya hak `DELETE` pada `rubric_materials`, tetapi `assessment_submissions` dan `assessment_moderations` memakai `RESTRICT`, sehingga semua materi yang sudah dipakai gagal dihapus. Penghapusan yang dipaksa akan menghapus versi rubrik aktif/arsip secara cascade dan merusak catatan, evaluasi, serta snapshot.
- Rancangan fitur arsip tanpa penghapusan ditulis di `docs/RANCANGAN-ARSIP-MATERI.md`: kolom `archived_at`, trigger penolakan bila masih ada rubrik aktif, dua Server Action Admin Sistem, pembaruan pemilih materi di Penilaian dan Observasi, serta pengujian dan rollback.
- Pemilik menyetujui rancangan dan meminta implementasi plus deploy. Aturan yang dipakai: arsip hanya bila tidak ada rubrik aktif; master Kerangka DAD tidak ikut diarsipkan; materi terarsipkan tetap bisa dibaca lewat URL langsung; nama materi tetap unik.
- Diterapkan: migrasi `20261126190000` (kolom `archived_at`, indeks, trigger penolakan rubrik aktif, trigger pengarsipan versi draf), Server Action `archiveMaterial`/`restoreMaterial` dengan pesan inline, guard di `createRubricVersion` dan `setTrainingMaterialFramework`, daftar arsip di Penilaian, dan banner baca-saja di Observasi. Penguji `supabase/tests/material_archive.sql` lolos di DEV.
- Verifikasi DEV: browser Admin mengarsipkan materi uji tanpa versi, materi hilang dari daftar aktif, muncul dengan badge "Arsip" di daftar arsip, banner tampil di URL langsung, lalu berhasil dipulihkan. Mencoba mengarsipkan "Materi umum" yang masih punya versi aktif menampilkan pesan inline, bukan halaman error. Materi uji dihapus setelah pengujian.
- `npm run check` 0 error/0 warning, 22 tes lolos, `npm run build` lolos.
- **Deploy produksi selesai 26 November 2026 19:09 WIB:** backup aplikasi `/home/ubuntu/imm-app.bak-2026-11-26-190850-full`, env `/home/ubuntu/.env.production.bak-2026-11-26-190850`, dan dump DB `manual-pre-material-archive-2026-11-26-190850/postgres.dump`. Migrasi dipasang; hash env identik; rsync tanpa `--delete`; build OK; `pm2 restart imm --update-env` (restart ke-26, online). Smoke sembilan halaman 200; bundle memuat kode arsip; tidak ada error baru di log. Hitungan data sebelum/sesudah identik (10/16/229/2740/12/7). Kode aktif: `5dbfde5`. Tidak ada materi produksi yang diarsipkan saat deploy. Pengguna wajib Ctrl+F5.
- **Tambahan 26 November 2026:** pemilik mencoba mengarsipkan "Al-Islam Kemuhammadiyahan" dan mendapat pesan "Materi masih memiliki rubrik aktif". Ternyata aplikasi belum punya jalur UI untuk menutup versi aktif tanpa mengaktifkan versi baru. Ditambah Server Action `archiveRubricVersion` dan tombol "Arsipkan versi" pada versi aktif di halaman Penilaian. Pengujian DEV: versi aktif materi uji ditutup, lalu "Arsipkan materi" berhasil dan materi tampil di daftar arsip; data uji dihapus setelahnya. `npm run check` dan build lolos. **Deploy produksi selesai 26 November 2026 19:25 WIB:** backup `/home/ubuntu/imm-app.bak-2026-11-26-192501-full` dan `/home/ubuntu/.env.production.bak-2026-11-26-192501`; hash env identik; rsync tanpa `--delete`; build OK; `pm2 restart imm --update-env` (restart ke-27, online). Smoke delapan halaman 200; bundle memuat "Arsipkan versi"; log bersih; hitungan data tidak berubah. Kode aktif: `cb44235`. Pengguna wajib Ctrl+F5.

## Nilai gabungan peserta di Peta kompetensi (26 November 2026, DEV)

- Pemilik memutuskan nilai akhir di tabel ringkas diganti dari per jenis menjadi satu angka gabungan per peserta. Cara gabung: rata-rata sederhana dari semua snapshot final peserta. Keputusan ringkas diambil dari snapshot dengan `finalized_at` terbaru. Snapshot per jenis dan PDF tidak diubah.
- Bug tampilan: kolom aspek diambil dari snapshot pertama dan sel dicocokkan memakai `aspectId`, padahal tiap versi rubrik memakai UUID aspek berbeda. Akibatnya Angga dan Fadilla menampilkan "—". sekarang kolom dan sel disatukan berdasarkan `aspectName`.
- Berubah: `components/phase7-report-workspace.tsx`, `lib/participant-summary.ts` (baru), `tests/participant-summary.test.ts` (baru), `package.json`, `BLUEPRINT.md`.
- Verifikasi: `npm run check` lolos dengan 27 tes (tambah 3 tes gabungan), build lolos, browser DEV merender halaman Laporan tanpa error. Hitungan memakai data produksi yang dibaca read-only menghasilkan Angga 66,25 (Lulus), Fadilla 59,50 (Tidak Lulus), Albian 31,00 (Perlu Pembahasan Lanjutan), dengan sel aspek terisi.
- **Deploy produksi selesai 26 November 2026 19:56 WIB:** backup `/home/ubuntu/imm-app.bak-2026-11-26-195606-full` dan `/home/ubuntu/.env.production.bak-2026-11-26-195606`; hash env identik; rsync tanpa `--delete`; build OK; `pm2 restart imm --update-env` (restart ke-28, online). Smoke delapan halaman 200; bundle memuat ringkasan baru; log bersih; hitungan data tidak berubah. Kode aktif: `7ae5941`. Tidak ada migrasi. Pengguna wajib Ctrl+F5.
