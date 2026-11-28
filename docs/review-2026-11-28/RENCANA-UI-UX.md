# Rencana Perbaikan UI/UX hasil Review Empat Agen — 28 November 2026

Versi: draf 3. Hasil revisi akhir setelah putaran review 3. Dokumen ini hanya merencanakan. Belum ada kode aplikasi, CSS, migrasi, data, atau deploy yang diubah. Satu-satunya berkas baru adalah dokumen rencana ini dan `EVIDEN-UI-UX.md`.

## 1. Aturan main

- Sumber temuan: tiga review memakai agent-browser dan satu review statis. Bukti per ID ada di `EVIDEN-UI-UX.md`; screenshot di `/home/ibaysander/.agent-browser/tmp/screenshots/`.
- Penanda bukti: `[B]` terverifikasi di browser, `[C]` hanya dari kode atau statis. Temuan `[C]` wajib diverifikasi ulang saat paketnya dikerjakan.
- Gate akun uji, dijalankan sebelum tiap subpaket:
  - State tersedia di `~/.agent-browser/auth/imm-admin-dev.json`, `imm-kader-dev.json`, `imm-ins-dev.json`, `imm-obs-dev.json`, dan `imm-kom-dev.json`. Belum ada state IoT/Vice IoT.
  - Cek dengan `AGENT_BROWSER_SESSION=rencana-ui agent-browser --state ~/.agent-browser/auth/imm-admin-dev.json open http://localhost:3100/dashboard`, lalu `agent-browser --session rencana-ui snapshot -i -c`, lalu `agent-browser --session rencana-ui close`. Pakai nama sesi unik per reviewer, jangan sesi default.
  - Bila redirect ke `/login`, reset kata sandi akun uji DEV lewat Auth Admin lokal. Kunci ada di `.env.local` (gitignore), bukan di `.env.qa-test`. Jangan mencetak nilainya. Siapkan variabel tanpa output:
    `SUPABASE_URL=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | cut -d= -f2-)`
    `SERVICE_KEY=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' .env.local | cut -d= -f2-)`
    `ANON_KEY=$(grep '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' .env.local | cut -d= -f2-)`
    Cari ID akun dari email akun uji yang valid (`$EMAIL_UJI`, ambil dari state/vault, bukan dari dokumen):
    `USER_ID=$(curl -sS "$SUPABASE_URL/auth/v1/admin/users?email=$EMAIL_UJI" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $SERVICE_KEY" | jq -r '.users[0].id')`
    Perbarui kata sandi:
    `curl -sS -o /dev/null -w '%{http_code}\n' -X PUT "$SUPABASE_URL/auth/v1/admin/users/$USER_ID" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $SERVICE_KEY" -H 'Content-Type: application/json' -d "{\"password\":\"$NEW_PASSWORD\"}"`
    Nilai `$NEW_PASSWORD` diambil dari vault dan tidak dicetak. Setelah login lewat UI, simpan ulang state dengan `agent-browser --session <nama> state save ~/.agent-browser/auth/<file>.json`. Path lama `/tmp/opencode/supabase-cli` dan isi `/tmp/opencode/imm-supabase` tidak bisa dipakai sebagai sumber kunci.
  - Bila masih gagal, subpaket berhenti dan temuan tetap `[C]`. Jangan mengklaim "teruji di browser".
- Satu subpaket dikerjakan, diverifikasi, lalu dilaporkan sebelum subpaket berikutnya, sesuai `AGENTS.md`. Rencana ini bukan izin eksekusi.
- Sebelum menyunting `app/` atau `components/`, baca panduan Next.js yang relevan di `node_modules/next/dist/docs/` (Next 16.4.6), terutama perilaku `redirect()` di Server Component vs Server Action, `revalidatePath`/`refresh`, dan berkas `next-env.d.ts`.
- Perintah lintas platform: `npm run check`, `npm test`, `npm run build`. Di Windows: `npm.cmd run check`, `npm.cmd run build`, `npm.cmd run dev`, lalu buka `http://localhost:3000`. Cek `git status --short` setelah tiap subpaket.
- Semua perubahan memakai data simulasi DEV. Jangan menulis ke produksi. Deploy hanya setelah pemilik menyetujui.

Matriks verifikasi. Kolom "Hasil lulus" wajib diisi saat laporan subpaket.

| Subpaket | Verifikasi wajib | Hasil lulus |
|---|---|---|
| 1a, 1c | Tiga redirect bernama: `/dashboard/observasi`, `/dashboard/evaluasi`, dan `kegiatan/actions.ts`; `/login` biasa tanpa notice; satu form action; snapshot notice | Notice muncul hanya dengan `?reason=session`; form action tidak tertelan `try/catch` |
| 1b | Snapshot shell Admin dan Kader | Pill statis tidak muncul |
| 2a | Snapshot Evaluasi dan Laporan; unit test kamus | Tidak ada `pass` mentah; dua kamus terpisah; `aria-current="page"` pada tiga tempat |
| 2b | Snapshot `/login` sebelum/sesudah toggle | Nama textbox tetap "Kata sandi" |
| 2c | Snapshot Publik, Kerangka, dan laporan | Tombol PDF punya nama unik; teks kosong tidak menyebut migration |
| 3a | Uji Tab 390 px; kontras breadcrumb dan tombol ZIP | Sidebar tertutup tidak menerima fokus; kontras ≥3:1 dengan angka terukur |
| 3b | Hitung `[aria-live]` sebelum/sesudah dengan selektor sama; label Observasi | Jumlah turun dan status per sel plus tombol "Coba lagi" tetap ada |
| 3c | Heading outline Kerangka | Indikator memakai `<h3>` |
| 4a | Snapshot menu dan teks dengan state Kader | Menu dan catatan sesuai kemampuan Kader |
| 4b | Snapshot `/dashboard/profil-instruktur` dan `/dashboard/profil-peserta` | Satu menu aktif; fallback `navHref` tidak menyasar Dashboard diam-diam |
| 4c | Direct URL dan Server Action dengan state Instruktur; `npm run test:sql` untuk `is_assessment_moderator` | Non-moderator ditolak server; UI IoT/Vice IoT ditandai `[C]` bila state tidak ada, penguji SQL tetap jalan |
| 5a | Skenario imporDEV; cek riwayat sebelum/sesudah | "Cek peserta" punya teks loading; riwayat segar; sukses punya `role="status"` |
| 5b | Regresi `tests/action-error.test.ts`; satu skenario negatif per modul | URL hanya kode, tidak ada pesan mentah atau nama peserta |
| 5c | Buka `?error=` dengan `field` | Banner punya tautan ke field yang benar |
| 5d | Skenario nama hanya spasi di Pengajuan | Pesan menyebut field dan muncul dekat input |
| 6a, 6b, 6c | Klik batal/lanjut tiap tombol; percobaan aksi lewat URL | Batal tidak mengubah data; aksi tanpa izin tetap ditolak server |
| 7a | `scrollWidth <= clientWidth + 1` pada Kerangka, Evaluasi, Peserta, Laporan, Analitik di 1280/768/390/320 px | Tidak ada pelanggaran; screenshot tersedia |
| 7b, 7c, 7d | Screenshot 768/390 px; daftar selector tipografi disetujui sebelum eksekusi | Tidak ada teks terpotong; kontras dan ukuran target memenuhi angka yang ditulis |
| 8 | Alur penutup untuk Admin, Kader, Observer, Instruktur, Komisariat | Tidak ada regresi; IoT/Vice IoT tidak diklaim teruji |

Cara mengukur kontras: ambil `color` computed dan latar efektif dari elemen, naik ke induk bila transparan, hitung luminansi relatif WCAG 2.1, lalu `(L1+0.05)/(L2+0.05)`. Catat angka sebelum dan sesudah lewat `agent-browser eval` atau skrip Node kecil. Pakai cara yang sama untuk UX-31 dan UX-32.

- Rollback server. Jalankan lima langkah ini dalam satu sesi `ssh` karena backup ada di server, bukan di workstation. Bagian Rollback di `docs/DEPLOYMENT.md` masih memuat `git reset --hard` dan belum dipakai sebagai rujukan.
  ```bash
  ssh -i ~/.ssh/imm_prod_43-173-33-195 ubuntu@43.173.33.195
  sha256sum /home/ubuntu/imm-app/.env.production | cut -c1-8   # harus 0e854f9c
  stat -c '%a' /home/ubuntu/imm-app/.env.production            # harus 600
  ls -1dt /home/ubuntu/imm-deploy-backups/*/ | head -1         # mis. 20261128-092719/
  ```
  Lalu, masih di server, pulihkan hanya berkas aplikasi dari path backup yang dipilih:
  ```bash
  rsync -az --exclude .git --exclude node_modules --exclude .next --exclude '.env*' \
    /home/ubuntu/imm-deploy-backups/20261128-092719/ /home/ubuntu/imm-app/
  cd /home/ubuntu/imm-app && npm ci --include=dev && npm run build && pm2 restart imm --update-env
  ```
  Smoke 13 halaman dari `docs/STATUS-PRODUKSI-SATU-VERSI.md` harus 200, `pm2 status` online, dan `sha256sum … | cut -c1-8` masih `0e854f9c`. Jangan `git reset --hard` karena `.git` tidak dibawa. Hapus berkas yang ditambahkan setelah backup hanya setelah konfirmasi pemilik. Prosedur ini tidak memulihkan skema `auth`; bila deploy mengubah DB, hentikan rollback dan minta keputusan pemilik.
- Prasyarat dokumen sebelum eksekusi: bersihkan bagian Rollback di `docs/DEPLOYMENT.md` dari perintah `git reset --hard`. Ini perubahan dokumen, bukan kode aplikasi, dan butuh persetujuan.

## 2. Daftar temuan

ID mengikat temuan ke paket kerja. Rujukan memakai nama fungsi, kelas, atau komponen, bukan nomor baris.

| ID | Sev | Bukti | Temuan | Lokasi |
|---|---|---|---|---|
| UX-01 | High | [B][C] | Sesi habis mengarah ke `/login` polos; notice hanya muncul dengan `?reason=session` | ≈30 `redirect("/login")` di `app/dashboard/**`; 8 di antaranya Server Action |
| UX-02 | High | [B][C] | Nama textbox kata sandi ikut berubah saat tombol tampil/sembunyi ditekan | `app/login/page.tsx`, `password-field` |
| UX-03 | High | [B][C] | Keputusan final tampil sebagai `pass`, bukan "Lulus" | blok `graduation_decision` di `app/dashboard/evaluasi/page.tsx`; `lib/decision-labels.ts` |
| UX-04 | High | [B][C] | Aksi merusak tanpa konfirmasi | `components/submission-card.tsx`, "Arsipkan materi" di `penilaian/page.tsx`, "Arsipkan kegiatan" di `kegiatan/page.tsx` |
| UX-05 | High | [B] | 15 kolom penilaian Observasi memakai label identik "Penilaian Anda" | `app/dashboard/observasi/assessment-rating-cell.tsx` |
| UX-06 | High | [B] | Mobile sidebar tertutup masih bisa menerima fokus Tab | `components/app-shell.tsx`, `app/styles/responsive.css` |
| UX-07 | High | [B] | Tabel lebar disembunyikan di wadah geser tanpa petunjuk; matriks 1525 px pada wadah 332 px | `.competency-matrix-scroll`, `.table-wrap` di Kerangka, Evaluasi, Peserta, Laporan, Analitik |
| UX-08 | Medium | [C] | Menu Evaluasi/Laporan tampil untuk Instruktur IoT/Vice IoT, halamannya mengalihkan tanpa pesan | `components/app-shell.tsx`; guard `evaluasi/page.tsx`, `laporan/page.tsx`; `BLUEPRINT.md:175` |
| UX-09 | Medium | [C] | Admin diizinkan membuka Observasi, tapi menu Observasi tidak ada | guard `observasi/page.tsx`; `menuByRole.admin_system`; `navDestinations` |
| UX-10 | Medium | [C] | `/dashboard/profil-instruktur` dan `/dashboard/profil-peserta` menyalakan dua menu karena `startsWith(href)` | `components/app-shell.tsx` |
| UX-11 | Medium | [C] | Catatan Penilaian menjanjikan Kader mengatur Observer, padahal kontrol hanya Admin | blok `!canManageRubric` di `penilaian/page.tsx`; `menuByRole` di `app-shell.tsx` |
| UX-12 | Medium | [C] | Akun tanpa role melihat halaman "menunggu penetapan akses" tanpa shell | `app/dashboard/layout.tsx`, `dashboard/page.tsx` |
| UX-13 | Medium | [B][C] | Istilah status tidak konsisten: `Draft`, `draft`, `Submitted`, `Finalized`, `pass`, "Sementara/Final" | Dashboard, Observasi, Evaluasi, Laporan; `lib/submission-status.ts`, `components/phase7-report-table.tsx` |
| UX-14 | Medium | [B] | Banner `?error=` di y≈102 px, formulir yang salah di y≈1609 px, tanpa tautan | `components/action-error-banner.tsx`, `lib/action-error-url.ts` |
| UX-15 | Medium | [B] | Form "Tambah kegiatan untuk trial" 3 kolom × 133 px di 768 px, label dan input terpotong | `app/dashboard/kegiatan`, `.event-edit-form` |
| UX-16 | Medium | [B] | Tombol aksi Evaluasi tidak sejajar di 768 px; tombol utama turun sendiri | `.evaluation-actions-row` |
| UX-17 | Medium | [B] | Target sentuh kecil: tautan 13 px, `select` 22 px, checkbox 13×13 px, tautan nama 18 px | `.btn--quiet`, `/dashboard/laporan` @390 px |
| UX-18 | Medium | [B] | Teks pendukung 8–10 px: label sidebar 9 px, `.tag` dan `.metric-row span` 8 px, breadcrumb/footer 10 px | `primitives.css`, `shell.css`, `views.css`, `responsive.css` |
| UX-19 | Medium | [B] | 27 kartu indikator Kerangka memakai `<h2>`, setara dengan bagian utama | `components/rubric-preview.tsx` |
| UX-20 | Medium | [B] | 666 elemen `aria-live="polite"` pada satu halaman Observasi | `assessment-rating-cell.tsx`, `observer-notes.tsx`, `assessment-realtime.tsx` di `app/dashboard/observasi/` |
| UX-21 | Medium | [B][C] | Istilah teknis tidak dijelaskan: `DAD`, `agregat`, `ambang`, `snapshot`, `coverage 80%`, `RLS` | Publik, Dashboard, Evaluasi, Observasi |
| UX-22 | Medium | [B][C] | Nama tombol dan kolom rapor kurang jelas: empat tombol hanya "PDF", tombol ZIP terbaca menyatu | `components/phase7-report-table.tsx` |
| UX-23 | Medium | [C] | Validasi Pengajuan baru muncul setelah submit dan tidak menyebut field | `app/dashboard/pengajuan/actions.ts` |
| UX-24 | Medium | [C] | "Cek peserta" hanya disabled saat pending, tanpa teks loading | `app/dashboard/impor-tes/import-wizard.tsx`, tombol Cek peserta |
| UX-25 | Medium | [C] | Dugaan: riwayat impor basi setelah simpan. `commitImport` sudah memanggil `revalidatePath`, jadi belum terbukti | `app/dashboard/impor-tes/actions.ts`, `import-wizard.tsx` |
| UX-26 | Medium | [B][C] | Pesan error database mentah bisa tampil ke pengguna; 7 titik `throw new Error(error.message…)`, 9 pemanggilan `penilaianErrorUrl`, dan `evaluationErrorUrl()` dengan `message.slice(0, 300)` | `app/dashboard/**/actions.ts`, `evaluasi/actions.ts`, `lib/action-error.ts`, `lib/action-error-url.ts`, `penilaian/form-error.ts` |
| UX-27 | Low | [C] | Bug latent: `navHref()` bisa `null`, `app-shell.tsx` menggantinya dengan home. Semua menu saat ini masih punya pasangan, jadi belum terjadi | `components/app-shell.tsx`, `lib/navigation.ts` |
| UX-28 | Low | [B] | Menu "Dashboard" dan breadcrumb "Publik / Beranda" menyebut halaman yang sama dengan nama beda | Halaman publik |
| UX-29 | Low | [B] | Teks `/daftar` mengira sudah mendaftar, padahal ini permintaan akun untuk Admin | `/login`, `/daftar` |
| UX-30 | Low | [B][C] | Pill "Sesi terverifikasi" statis tampil walau sesi bisa sudah habis | `components/app-shell.tsx` |
| UX-31 | Low | [B] | Pemisah breadcrumb `/` kontras 1,66:1 | `app/styles/shell.css` |
| UX-32 | Low | [B] | Tombol ZIP nonaktif kontras ≈2,3:1 dan label terpotong 3 baris @390 px | `components/phase7-report-table.tsx`, CSS laporan |
| UX-33 | Low | [C] | `aria-current="true"` pada navigasi Evaluasi; `"page"` lebih spesifik, bukan nilainya salah | `evaluasi/page.tsx`, tiga kemunculan |
| UX-34 | Low | [C] | Pesan sukses impor tanpa `role="status"` | `app/dashboard/impor-tes/import-wizard.tsx` |
| UX-35 | Low | [C] | Teks kosong Kerangka ditujukan ke pengembang: "Pastikan migration …" | `app/dashboard/kerangka/page.tsx` |
| UX-36 | Low | [C] | `min-width` pada 4 form dan select masih berisiko di panel sempit: 360/280, 240, 220, 210/170 px | `views.css`, `responsive.css` |

## 3. Subpaket kerja

Tiap ID muncul tepat satu kali di kolom ini. Subpaket tanpa ID hanya melakukan verifikasi atau kelanjutan pekerjaan.

| Subpaket | ID | Fokus |
|---|---|---|
| 1a | UX-01 | Helper session login dan redirect `!userId` |
| 1b | UX-30 | Hapus pill status statis |
| 1c | — | Uji lanjut redirect dan form action |
| 2a | UX-03, UX-13, UX-33 | Label keputusan, kamus status, `aria-current` |
| 2b | UX-02 | Label kata sandi login |
| 2c | UX-21, UX-22, UX-35 | Penjelasan istilah, tombol rapor, teks kosong |
| 3a | UX-06, UX-31 | Sidebar tertutup dan kontras breadcrumb |
| 3b | UX-05, UX-20 | Label indikator dan `aria-live` Observasi |
| 3c | UX-19 | Heading indikator Kerangka |
| 4a | UX-11, UX-28, UX-29 | Teks per peran dan halaman publik |
| 4b | UX-10, UX-27 | Menu aktif dan fallback `navHref` |
| 4c | UX-08, UX-09, UX-12 | Akses per subrole, menu Admin, shell tanpa role |
| 5a | UX-24, UX-25, UX-34 | Loading, riwayat, dan status impor |
| 5b | UX-26 | Pemetaan pesan error server |
| 5c | UX-14 | Tautan dari banner ke field |
| 5d | UX-23 | Validasi Pengajuan |
| 6a | UX-04 | Konfirmasi aksi di Penilaian |
| 6b | — | Lanjut konfirmasi: Pengajuan dan `submission-card.tsx` |
| 6c | — | Lanjut konfirmasi: Kegiatan |
| 7a | UX-07 | Petunjuk geser tabel |
| 7b | UX-15, UX-16 | Layout 768/980 px |
| 7c | UX-17, UX-32 | Target sentuh dan kontras tombol nonaktif |
| 7d | UX-18, UX-36 | Tipografi dan `min-width` |
| 8 | — | Regresi penutup |

### Subpaket 1a — Helper session login

- `sessionLoginUrl(expired)` menghasilkan `/login?reason=session` bila `expired` true, dan `/login` tanpa notice bila false. K6 wajib diputus sebelum subpaket ini.
- Tandai sesi yang pernah ada dengan cookie `imm_known_session=1`, ditulis saat login berhasil dan dihapus di `app/auth/signout/route.ts`. Helper memakai keberadaan cookie ini, bukan halaman yang dikunjungi sebelumnya.
- Empat kasus yang harus sama:
  1. Pengunjung baru langsung ke `/dashboard`: tanpa cookie → `/login` tanpa notice.
  2. Pengunjung baru lewat `/`: tanpa cookie → `/login` tanpa notice.
  3. Sesi habis lalu mampir ke `/`: cookie masih ada → `/login?reason=session`.
  4. Sesi habis langsung ke `/dashboard`: cookie masih ada → `/login?reason=session`.
  Logout sengaja menghapus cookie, sehingga logout biasa tidak memunculkan notice.
- Pakai helper di semua `if (!userId)` pada `app/dashboard/**`. Kecualikan dua pemeriksaan env belum dikonfigurasi di `profil-instruktur/page.tsx` dan `profil-peserta/page.tsx`.
- Batas dengan BUG-11/AUTH-005: jalur error profil sudah selesai di `dashboard/page.tsx` dan `profil/page.tsx`, tidak diubah di sini.

### Subpaket 1b — Pill status statis

- Hapus pill "Sesi terverifikasi" dari `app-shell.tsx`. Pill tidak mencerminkan validasi sesi yang dilakukan tiap halaman.

### Subpaket 1c — Uji redirect

- Uji `/dashboard/observasi`, `/dashboard/evaluasi`, dan Server Action `app/dashboard/kegiatan/actions.ts`. Uji `/login` biasa tanpa notice.
- Perhatikan beda `redirect()` di Server Component dan Server Action sesuai panduan Next 16; `redirect()` harus di luar `try/catch`.

### Subpaket 2a — Keputusan, kamus, dan aria-current

- `UX-03`: impor `decisionLabel` dari `@/lib/decision-labels` di `evaluasi/page.tsx`, lalu pakai untuk `graduation_decision`.
- `UX-13`: setelah K3 diputus, pakai dua kamus terpisah. `submissionStatusLabel()` di `lib/submission-status.ts` untuk status alur Pengajuan dan Observasi/Evaluasi. `reportStatusLabel()` untuk status snapshot rapor `Provisional`, `Finalized`, `Published`, menggantikan `STATUS_LABELS` lokal di `components/phase7-report-table.tsx`. Jangan menggabungkan kedua kamus dan jangan menyentuh status versi rubrik `Aktif/Draf/Diarsipkan` (A08).
- `UX-33`: ganti `aria-current` menjadi `"page"` pada tiga kemunculan di `evaluasi/page.tsx`. Ini perbaikan spesifisitas, bukan perbaikan error.
- Daftarkan berkas tes baru ke `test:rubric` atau `test:security` di `package.json` sebelum `npm run check`.

### Subpaket 2b — Login

- Pindahkan tombol tampil/sembunyi kata sandi keluar dari `<label>`, beri `id` pada input, lalu hubungkan dengan `htmlFor`. Nama textbox tetap "Kata sandi" sebelum dan sesudah toggle.
- Pesan login "Email atau kata sandi tidak cocok, atau akun belum aktif." sengaja tidak diubah.

### Subpaket 2c — Istilah, tombol, teks kosong

- `UX-21`: tambahkan penjelasan singkat sekali per halaman untuk `DAD`, `agregat`, `ambang`, `snapshot`, `coverage 80%`, dan `RLS`. Kalimat `RLS` diusulkan: "Aturan akses di sistem memisahkan penilaian tiap penilai." Jangan memasukkan nilai query, catatan privat, atau nama peserta ke breadcrumb dan label publik. Pengecualian: pada halaman rapor internal yang sudah terotorisasi, nama peserta boleh muncul di `aria-label` tombol sesuai UX-22.
- `UX-22`: beri `aria-label` yang menyebut nama peserta dan materi pada tiap tombol PDF, dan tambahkan spasi pada tombol ZIP. Satu sesi dengan kontras di subpaket 7c.
- `UX-35`: ganti teks kosong Kerangka menjadi "Kerangka belum siap. Hubungi Admin sistem."

### Subpaket 3a — Sidebar dan breadcrumb

- `UX-06`: pada `@media (max-width: 760px)`, pakai `.sidebar:not(.sidebar-open) { visibility: hidden; }` dan `.sidebar-open { visibility: visible; }`. Jangan pakai `inert`; itu mematikan tautan di desktop. Tombol "Buka menu" ada di header, di luar `<aside>`.
- `UX-31`: gelapkan pemisah breadcrumb sampai kontras ≥3:1; ukur dengan resep di Bagian 1. `aria-hidden="true"` boleh ditambahkan sebagai pelengkap.

### Subpaket 3b — Observasi

- `UX-05`: ubah label di `app/dashboard/observasi/assessment-rating-cell.tsx`, teruskan nama indikator dari halaman Observasi sebagai prop baru. Tambahkan `<span className="sr-only"> — {nama indikator}</span>` di dalam `<label>` agar teks tampilan tidak berubah.
- `UX-20`: hapus pengumuman ganda, pertahankan status per sel dan tombol "Coba lagi" yang menjadi pemilik tampilan error autosave dari paket lama. Satu status global hanya untuk "Menyimpan…/Tersimpan" dan menyebut nama peserta serta indikator. Error dan konflik tetap `role="alert"` per sel. Ukur `[aria-live]` dengan selektor sama sebelum dan sesudah.

### Subpaket 3c — Heading Kerangka

- `UX-19`: ubah `<h2>` menjadi `<h3>` di `components/rubric-preview.tsx`.

### Subpaket 4a — Teks per peran

- `UX-11`: perbarui catatan pada blok `!canManageRubric` di `app/dashboard/penilaian/page.tsx` menjadi "Pengelolaan rubrik hanya oleh Admin Sistem. Kader dapat melihat rubrik dan menugaskan Observer." Hapus `bidang_kader` dari entri "Pengaturan Penilaian" di `menuByRole`, `components/app-shell.tsx`. `lib/navigation.ts` diubah hanya bila label ikut diganti. Teks final menunggu konfirmasi dengan state Kader.
- `UX-28`: samakan menu "Dashboard" dan breadcrumb "Beranda" pada halaman publik.
- `UX-29`: ubah catatan kaki login menjadi "Ajukan akun permanen untuk Instruktur" menunggu konfirmasi.

### Subpaket 4b — Menu aktif dan fallback

- `UX-10`: buat `isActiveNav(pathname, href)` di `lib/navigation.ts` dengan `if (href === "/" || href === "/dashboard") return pathname === href;` lalu `return pathname === href || pathname.startsWith(href + "/") || pathname.startsWith(href + "?")`. Ganti seluruh blok `isCurrent` di `app-shell.tsx`, bukan hanya `startsWith(href)`. Kode saat ini sengaja mengecualikan `/` dan `/dashboard` agar `/dashboard/observasi` tidak menyalakan dua menu. `breadcrumbLabel()` tetap dipakai untuk breadcrumb saja.
- `UX-27`: lewati item menu bila `navHref()` mengembalikan `null`. Tandai sebagai pencegahan, bukan temuan aktif.

### Subpaket 4c — Akses per subrole dan shell tanpa role

- `UX-08`: subrole Instruktur bukan `AppRole`, melainkan id `iot` dan `vice_iot` pada `instructor_event_assignments.position` per kegiatan; label ada di `lib/instructor-roles.ts`. Sesuai K1, menu tetap tampil dan tetap mengarah ke `/dashboard/evaluasi`. `app/dashboard/layout.tsx` menghitung flag moderator di server lewat `isEventModerator()` dari `lib/moderation-access.ts` dan meneruskan boolean ke `AppShell` hanya untuk menampilkan pesan, bukan mengubah href. `isEventModerator()` adalah RPC async server-only, jangan dipanggil dari komponen klien.
- Perkuat dan pindahkan guard lebih awal, dengan satu hasil per skenario:
  - Di `evaluasi/page.tsx`, pertahankan kondisi ada `eventId`. Bila `eventId` ada dan `profile.role === "instruktur"` serta `!isModerator`, redirect 307 ke `/dashboard?reason=akses`. Bila `eventId` tidak ada, halaman tetap merender pemilih kegiatan seperti sekarang.
  - Di `laporan/page.tsx`, hitung `canManage` lebih dulu, redirect 307 ke `/dashboard?reason=akses` untuk Instruktur non-moderator, baru jalankan `Promise.all` yang memanggil `get_event_report_rows`.
  - Tambahkan notice di `app/dashboard/page.tsx` untuk `?reason=akses`: "Rekap penilaian tidak tersedia untuk subrole ini." Tidak membuat rute baru `/dashboard/akses-terbatas`.
- `UX-09`: tambahkan entri Observasi ke `menuByRole.admin_system` dalam satu sesi penyuntingan. `navDestinations` sudah memuatnya. Guard halaman Observasi tidak diubah; itu berbeda dari guard Evaluasi/Laporan yang diperkuat di atas.
- `UX-12`: ubah prop menjadi `role: AppRole | null`, lalu ubah `app/dashboard/layout.tsx` agar cabang `!rawRole` merender `<AppShell role={null} ...>` menggantikan `return <>{children}</>`. Bila `role === null`, jangan render `<nav>`, pill "Sesi terverifikasi", `roleLabels[role]`, dan form Keluar milik shell. Topbar cukup memuat breadcrumb "Dashboard / Ringkasan". Halaman `/dashboard` sudah punya form Keluar sendiri.
- Verifikasi otorisasi wajib, satu hasil per skenario:
  - `/dashboard/evaluasi` tanpa `eventId`: 200 dengan pemilih kegiatan, untuk Instruktur maupun Admin.
  - `/dashboard/evaluasi?eventId=<ada>` dengan state `imm-ins-dev`: 307 ke `/dashboard?reason=akses` bila bukan moderator.
  - `/dashboard/laporan` dengan state `imm-ins-dev`: 307 ke `/dashboard?reason=akses`; RPC `get_event_report_rows` tidak terpanggil.
  - Kirim satu Server Action baca/validasi yang aman, bukan aksi mutasi seperti `publishReport`; respons ditolak dan jumlah baris sebelum/sesudah sama.
  - `assignParticipantAccount`: pesan "Hanya Admin Sistem yang dapat menghubungkan akun peserta."
  - Buat `supabase/tests/is_assessment_moderator.sql` dan daftarkan ke `scripts/run-sql-tests.sh`, lalu jalankan `npm run test:sql` dan lampirkan outputnya. Penguji ini belum ada; yang sekarang hanya menyebut substring di `revision_privacy.sql`.
  - Bila state IoT tidak ada, UI ditandai `[C]`; penguji SQL tetap wajib.

### Subpaket 5a — Loading, riwayat, dan status impor

- Satu sesi penyuntingan `import-wizard.tsx`:
  - `UX-24`: teks tombol menjadi "Mencocokkan…" saat pending.
  - `UX-25`: anggap basi bila `commitImport` sudah memanggil `revalidatePath("/dashboard/impor-tes")` tetapi tabel riwayat masih menampilkan baris lama setelah navigasi. Bila terbukti, tambahkan `refresh()` dari `next/cache` di akhir `commitImport`, bukan `router.refresh()` di klien, karena komponen belum mengimpor `useRouter`.
  - `UX-34`: tambahkan `role="status"` pada blok sukses.

### Subpaket 5b — Pemetaan error

- `UX-26`: buat `lib/action-error-messages.ts` berisi kode tetap → kalimat Indonesia dan fallback umum. Ubah `lib/action-error.ts` (`runAction`), `app/dashboard/penilaian/form-error.ts` (`penilaianErrorUrl`), dan `app/dashboard/evaluasi/actions.ts` (`evaluationErrorUrl`) agar mengirim kode, bukan `message.slice(0, 300)`. Ubah `lib/action-error-url.ts` menerima kode dan memetakannya di server.
- Ganti tujuh titik `throw new Error(error.message…)`, sembilan pemanggilan `penilaianErrorUrl(...)`, dan pemanggilan `evaluationErrorUrl()` pada `finalizeCollectiveEvaluation` serta `approveFinalizePublishReport`. `runAction` dilarang memasukkan `error.message` ke URL.
- Banner hanya membaca kamus; kode tidak dikenal menjadi kalimat umum. Log server cukup menyimpan kode dan ID opak, bukan nama peserta atau nama tabel. URL tidak boleh memuat detail tabel atau catatan privat.
- Perbarui `tests/action-error.test.ts` dengan asersi bahwa tidak ada pesan mentah di URL, termasuk URL Evaluasi yang dihasilkan `evaluationErrorUrl`.

### Subpaket 5c — Tautan dari banner

- `UX-14`: tambahkan parameter `field` ke `lib/action-error-url.ts` bila tersedia, beri `id` pada field, lalu tautkan `ActionErrorBanner` ke `#${field}`. Delapan modul yang sudah dibungkus `runAction` tidak dibungkus ulang: Observasi, Laporan, Kegiatan, Pengajuan, Seleksi Komisariat, Pengguna, Komisariat, dan Impor Tes.

### Subpaket 5d — Validasi Pengajuan

- `UX-23`: tampilkan pesan inline dekat field pada Pengajuan dan sebut nama field, misalnya skenario nama hanya berisi spasi.

### Paket 6 — Konfirmasi aksi merusak

- Buat satu komponen klien `ConfirmFormAction` yang menerima server action sebagai prop. Wajib memakai `role="dialog"`, `aria-modal="true"`, fokus awal ke tombol Batal, Escape menutup dialog, dan fokus kembali ke tombol pemicu setelah ditutup. Jangan pakai `window.confirm`.
- `6a`: "Arsipkan materi" di `penilaian/page.tsx`. `6b`: "Batalkan pengajuan" dan "Hapus dari draf" di `components/submission-card.tsx`, serta "Cabut akses/tugas" di Pengajuan. `6c`: "Arsipkan kegiatan" di `kegiatan/page.tsx`.
- Jangan mengubah aksi server. Verifikasi: batal tidak mengubah data, lanjut mengubah data simulasi, dan percobaan aksi lewat URL/Server Action tanpa izin tetap ditolak server.

### Subpaket 7a — Tabel

- Tambahkan petunjuk "Geser tabel →" yang terlihat pada `.competency-matrix-scroll` dan `.table-wrap`. K4 dikunci ke petunjuk geser saja; tampilan kartu menunggu paket terpisah.
- Ukur `scrollWidth <= clientWidth + 1` pada halaman Kerangka, Evaluasi, Peserta, Laporan, dan Analitik di 1280/768/390/320 px; sertakan screenshot.

### Subpaket 7b — Layout 768/980 px

- `.event-edit-form`: tambahkan `@media (max-width: 980px)` untuk 2 kolom sebelum aturan 760 px yang sudah ada.
- `.evaluation-actions-row`: terapkan lebar penuh atau grid 2/1 mulai 980 px; aturan 760 px tetap menang.

### Subpaket 7c — Sentuh dan kontras

- Beri `min-height: 44px` dan padding pada tautan serta kontrol yang dipakai di layar sentuh.
- `UX-32`: pendekkan label tombol ZIP dan pakai token teks nonaktif lebih gelap. Target kontras ≥3:1, ukur dengan resep Bagian 1 dan laporkan angkanya. Satu sesi dengan `UX-22` di subpaket 2c.

### Subpaket 7d — Tipografi dan min-width

- Buat daftar selector yang disetujui sebelum eksekusi, lalu naikkan teks pendukung 8–10 px menjadi 11–12 px hanya untuk selector itu. Jangan mengubah puluhan deklarasi sekaligus tanpa daftar.
- Uji ulang `min-width` pada panel 320 px untuk empat form/select yang disebut UX-36.

### Paket 8 — Regresi penutup

- Uji alur publik → login → dashboard → Observasi → Evaluasi → Laporan → Impor Tes pada 1280 px dan 390 px untuk Admin, Kader, Observer, Instruktur, dan Komisariat.
- Pastikan label ganda, `aria-live` berulang, dan `pass` mentah tidak muncul kembali.
- `npm run check`, `npm run build`, lalu ajukan persetujuan deploy. Tidak ada deploy otomatis.

## 4. Keputusan yang perlu pemilik

| Kode | Pertanyaan | Status | Rekomendasi / dampak |
|---|---|---|---|
| K1 | Bentuk penjelasan untuk IoT dan Vice IoT pada Evaluasi/Laporan. Aksesnya sudah diputus, tidak ditanyakan ulang. | Diputus 28 Nov 2026 | Menu tetap tampil; non-moderator yang membuka halaman dengan `eventId` atau Laporan mendapat 307 ke `/dashboard?reason=akses` dengan notice. Tidak membuat rute baru |
| K2 | Ketiadaan menu Observasi untuk Admin disengaja atau bug? | Diputus 28 Nov 2026 | Tambahkan entri Observasi ke `menuByRole.admin_system`. Guard Observasi tidak diubah |
| K3 | Kata untuk status alur, dan apakah label Inggris status rapor diganti Indonesia? | Diputus 28 Nov 2026 | Pakai dua kamus terpisah dari label yang sudah ada: `submissionStatusLabel()` dan `reportStatusLabel()`. Jangan sentuh judul versi rubrik (A08) |
| K4 | Tabel lebar di ≤760 px: petunjuk geser atau kartu? | Diputus di rencana ini | Petunjuk geser saja; kartu menunggu paket terpisah |
| K5 | Perlakuan `next-env.d.ts` yang diubah `next dev`? | Diputus 28 Nov 2026 | Jangan commit varian dev/build. Tambahkan ke `.gitignore` dan `git rm --cached next-env.d.ts`. Sebelum `npm run check` jalankan `npx next typegen` |
| K6 | Bagaimana membedakan pengunjung baru dari sesi yang habis? | Diputus 28 Nov 2026 | Pakai cookie `imm_known_session`, ditulis saat login dan dihapus saat logout. Empat kasus di subpaket 1a berlaku |
| K7 | Boleh mengubah `docs/DEPLOYMENT.md` untuk menghapus `git reset --hard` dari bagian Rollback? | Diputus 28 Nov 2026 | Boleh, sudah dikerjakan: `docs/DEPLOYMENT.md` memakai prosedur backup ber-timestamp, rsync, build, restart, dan smoke |

Ketujuh keputusan sudah ditutup, sehingga tidak ada subpaket yang menunggu keputusan. Teks yang masih berupa usulan pada langkah teknis tinggal mengikuti keputusan ini saat dieksekusi. Keputusan lama yang tetap: `DISABLE_SIGNUP=true`, `/daftar` sebagai permintaan akun, status sebagai judul versi rubrik, dan rapor/Peserta belum dibagikan ke produksi.

## 5. Berkas bersama dan aturan penyuntingan

| Berkas | Dipakai oleh | Aturan |
|---|---|---|
| `app/login/page.tsx` | 2b, 4a | Satu sesi untuk label kata sandi dan catatan kaki |
| `app/dashboard/evaluasi/page.tsx` | 1a, 2a, 4c, 7a | Satu sesi untuk redirect, `decisionLabel`, `aria-current`, guard, dan pengukuran tabel |
| `app/dashboard/penilaian/page.tsx` | 4a, 6a | Satu sesi untuk catatan Kader dan tombol arsip |
| `components/app-shell.tsx` | 1b, 3a, 4b, 4c | Satu sesi untuk pill, sidebar, menu aktif, dan `role: AppRole | null` |
| `app/dashboard/layout.tsx` | 4c | Satu sesi untuk `role: null` dan flag subrole |
| `app/dashboard/laporan/page.tsx` | 2a, 4c, 5b, 7a | Satu sesi untuk guard, label, error, dan pengukuran tabel |
| `app/dashboard/observasi/page.tsx` dan tiga berkas komponen Observasi | 1a, 3a, 3b | Satu sesi untuk redirect, prop indikator, dan `aria-live` |
| `app/dashboard/impor-tes/import-wizard.tsx` | 5a | Satu sesi untuk loading, riwayat, dan `role="status"` |
| `app/dashboard/impor-tes/actions.ts` | 5a, 5b | Satu sesi untuk `refresh()` dan regresi |
| `lib/action-error-url.ts`, `lib/action-error.ts`, `components/action-error-banner.tsx`, `penilaian/form-error.ts` | 5b, 5c | Satu sesi untuk kode error, `field`, dan tautan anchor |
| `components/phase7-report-table.tsx` | 2a, 2c, 7c | Satu sesi untuk kamus, label tombol, dan kontras |
| `app/styles/primitives.css`, `shell.css`, `views.css`, `responsive.css` | 3a, 7a–7d | Urutan: aksesibilitas, layout, lalu tipografi |
| `lib/navigation.ts` | 4a, 4b, 4c | Satu sesi; `breadcrumbLabel()` tidak berubah perilaku |

## 6. Yang tidak menjadi lingkup

- Perbaikan otorisasi, RLS, rumus skor, snapshot, dan performa dari review 28 November sudah dikerjakan dan sebagian diverifikasi; sisa catatan ada di `PROGRESS.md`.
- Tidak ada rotasi kunci, perubahan TLS, atau perubahan konfigurasi produksi.
- Tidak ada perubahan pada `BLUEPRINT.md` atau `HANDOVER.md` sebelum rencana ini disetujui.

## 7. Riwayat loop

| Putaran | Aksi | Hasil |
|---|---|---|
| 0 | Planning: empat laporan reviewer dipetakan jadi 36 ID dan 8 paket | Draf 0 |
| 1 | Review: tiga pembaca independen | 4 Blocker, ≈20 Major, ≈15 Minor |
| 1 | Revisi: draf 1 | Gate akun, matriks verifikasi, subpaket dipecah, K1–K6, berkas bersama |
| 2 | Review: dua pembaca independen | 4 Blocker lama belum tertutup, 12 Major baru: rollback, K5, otorisasi IoT, UX-26, duplikat ID, path komponen, helper `isActiveNav`, dan paket besar |
| 2 | Revisi: draf 2 | Prosedur reset dan rollback lengkap, K1/K3/K5/K6/K7 diperjelas, guard diperkuat, 36 ID unik, subpaket maksimal 3 ID, matriks hasil lulus, bukti dan ukuran kontras |
| 3 | Review penutup | 5 Blocker: rute `akses-terbatas` belum ada, K6 belum membedakan kasus, `evaluationErrorUrl` belum masuk 5b, status K belum jelas, resep reset belum bisa dijalankan; plus 7 Major |
| 3 | Revisi: draf 3 | Tanpa rute baru, pakai notice `?reason=akses`; K6 pakai cookie `imm_known_session` dengan empat kasus; `evaluationErrorUrl` masuk 5b; K1–K7 dapat kolom Status; resep reset memakai kunci dari `.env.local`; rollback seluruhnya di `ssh`; kontradiksi label diperbaiki; penguji SQL baru didaftarkan |

Draf 3 siap diajukan sebagai hasil akhir loop planning > review > revisi. Belum ada eksekusi subpaket dan belum ada persetujuan deploy.

| 4 | Keputusan pemilik 28 Nov 2026 | K1–K7 semua diputus; tabel status diperbarui dan `docs/DEPLOYMENT.md` diperbaiki sesuai K7 |
