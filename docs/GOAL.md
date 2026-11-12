# GOAL — Otomasi Penyelesaian SIMPEL-IMM

**Dibuat:** 12 November 2026
**Prasyarat:** OpenCode v2.2.1+ (terpasang di mesin ini: **v2.2.7**, perintah `/goal` sudah bawaan — tidak perlu plugin)
**Data:** seluruh data adalah **simulasi**. Jangan pernah memasukkan data pribadi nyata.

> Dokumen ini adalah sumber kebenaran untuk sesi otonom `/goal`. Jalankan di TUI OpenCode:
> ketik `/goal`, tempel isi bagian **Objective** di bawah, Enter.
> Kontrol: `/goal pause` (jeda) · `/goal resume` (lanjut) · `/goal clear` (berhenti & arsipkan).

---

## Objective (tempel apa adanya)

```text
Selesaikan seluruh pekerjaan yang tersisa untuk aplikasi IMM Observer (SIMPEL-IMM) sampai IMPLEMENTATION_PLAN.md Tahap 5–8 dan Tahap 11 terverifikasi, dan Tahap 10 siap dimulai — dengan bukti, bukan klaim.

Sumber utama: BLUEPRINT.md (keputusan produk), HANDOVER.md (kondisi terkini), IMPLEMENTATION_PLAN.md (urutan tahap), docs/QA_PHASE8_TEST_PLAN.md (rencana uji), docs/GOAL.md (dokumen ini).

Kriteria selesai (semuanya harus terbukti):
1. Semua item di docs/QA_PHASE8_TEST_PLAN.md berstatus Lulus atau Deferred dengan alasan tertulis — bukan "katanya jalan". Bukti tiap PASS: screenshot, entri audit DB, atau hasil otomatis.
2. Dua akun Observer (qa-auto-observer-a / qa-auto-observer-b, kredensial di .env.qa-test) diuji mengisi peserta/indikator yang sama: nilai independen, konflik terdeteksi saat revisi, catatan per penulis terpisah.
3. Alur submit → finalisasi (Admin) → terbitkan rapor → peserta membuka rapornya (dan ditolak membuka rapor milik orang lain) terverifikasi end-to-end di browser.
4. Ekspor PDF individual + Excel rekap + audit ekspor (assessment_export_audit) terverifikasi; Excel tidak memuat catatan privat.
5. RLS lintas role diverifikasi: Observer (hanya kegiatan tugasnya), Instruktur (tugas subrole, IoT tidak melihat nilai peserta), Bidang Kader (agregat tanpa skor mentah/bukti), Peserta (hanya ringkasan miliknya), Komisariat (hanya miliknya) — via browser dengan akun di .env.qa-test.
6. Realtime dua sesi (perubahan Observer A tampil di Observer B tanpa reload) terverifikasi.
7. Build produksi lolos (`npm run build`) dan `npm run check` (typecheck + lint + format:check + test) exit 0. Build Windows (EPERM lama) diperiksa dan dilaporkan hasilnya.
8. Sel autosave/konflik offline (`react-hooks/set-state-in-effect`) direfactor sampai aturan lint bisa kembali ke `error`, dengan uji browser sebelum dan sesudah. Keputusan `<img>` foto privat dibuat (optimasi atau tetap; kembalikan aturan ke `error` jika diputuskan).
9. Tahap 8 (analitik & rekap lintas kegiatan) diimplementasikan dan diverifikasi. Tahap 10 dimulai hanya jika Tahap 5–8 terverifikasi. Tahap 9 (impor tes) TETAP DITUNDA atas arahan pengguna.
10. docs/QA_PHASE8_TEST_PLAN.md, HANDOVER.md, dan IMPLEMENTATION_PLAN.md diperbarui sesuai hasil; semua temuan bug dicatat + diperbaiki, atau dilaporkan dengan severity.

Batas yang TIDAK BOLEH dilanggar:
- Hanya project Supabase DEV `thtwrkovcorgxzuqttal`. Project "production imm" (crrqlwlfndhugcqcnkex) DILARANG disentuh.
- Data simulasi saja. Jangan seed/menulis data nyata.
- Jangan menaruh kredensial ke git, frontend, atau commit. .env* sudah di-gitignore; kredensial QA ada di .env.qa-test (tidak di-commit).
- Jangan `git push --force`, `git reset --hard`, hapus file/tabel/migrations yang sudah terpasang, atau migrasi destruktif tanpa konfirmasi eksplisit pengguna.
- Jangan publikasikan aplikasi. Keputusan rilis/deployment (Tahap 11) adalah keputusan manusia setelah tinjauan keamanan/privasi/backup/biaya — agen hanya menyiapkan checklist dan laporan.
- Jangan memutuskan keputusan terbuka BLUEPRINT.md. Tanya pengguna satu per satu (rubrik final, rumus/pembulatan, ambang publikasi, format ekspor, akses Komisariat, token peserta, retensi data).
- Jangan mengubah hasil historis secara diam-diam; konfigurasi penilaian berversi.

Cara kerja:
- Riset dulu (baca docs, kode, hasil tes), perbaiki yang bisa, verifikasi tiap langkah. Baca BLUEPRINT §Status/keputusan sebelum bertanya.
- Uji browser via agent-browser (tersedia sebagai skill) terhadap http://localhost:3000 (`npm run dev`). Playwright belum terpasang — jangan tambah dependency tanpa izin pengguna.
- Kredensial QA di `.env.qa-test` — jangan cetak password ke layar/log bila tidak perlu, jangan commit.
- Jika butuh keputusan produk, konfirmasi pengguna, atau tindakan destruktif: berhenti (pause) dan minta input; laporkan apa yang sudah terbukti dan apa yang belum.
- Setiap klaim "selesai" harus disertai bukti (output pernittah, screenshot, atau ID test case yang Lulus).
```

---

## Infrastruktur yang sudah disiapkan (12 Nov 2026)

Di project **dev** `thtwrkovcorgxzuqttal` (data simulasi) sudah dibuat 5 akun QA sintetik
(email `qa-auto-*@qa.imm-observer.invalid`, password acak kuat, tersimpan di **`.env.qa-test`** — gitignored, bukan di-commit):

| Akun (nama variabel di `.env.qa-test`) | Role | Penugasan |
|---|---|---|
| `QA_ADMIN_SYSTEM_EMAIL` | admin_system | — |
| `QA_OBSERVER_A_EMAIL` | observer | `PK IMM FEB UM Bandung` |
| `QA_OBSERVER_B_EMAIL` | observer | `PK IMM FEB UM Bandung` |
| `QA_INSTRUKTUR_EMAIL` | instruktur (MoT) | `PK IMM FEB UM Bandung` |
| `QA_BIDANG_KADER_EMAIL` | bidang_kader | — |

Akun lama tetap utuh: `sals120401@gmail.com` (admin), `observer01@gmail.com`, `qa-imm-observer2@gmail.com`,
`instruktur01@gmail.com`, `bidertest@gmail.com`, `komisariattest@gmail.com`.

Verifikasi kesehatan: Management API Supabase terjangkau (`api.supabase.com`), health check GoTrue project dev menjawab HTTP 200,
login `QA_ADMIN_SYSTEM_EMAIL` mengeluarkan access token, dan `observer_assignments` untuk A & B tercatat.

**Belum ada**: akun Peserta tertaut (metode akses peserta masih terbuka — keputusan produk), dan tidak ada Playwright terpasang (pakai agent-browser).

## Urutan yang disarankan

1. `npm run check` — harus exit 0 (sudah terverifikasi 12 Nov 2026, termasuk build Linux yang lolos).
2. AUTH → PST/ACC/ASN → PEN/SKL/ATS/RT/NOTE → SCR/EVA/FIN → DASH/RPT/COH/EXP (sesuai `docs/QA_PHASE8_TEST_PLAN.md`).
3. Perbaiki bug temuan; commit per bug (tanpa atribusi AI di pesan commit).
4. Tahap 8 → Tahap 10 (bila 5–8 beres) → dokumentasi HANDOVER/plan; berhenti di gerbang rilis.

## Catatan keamanan

- Personal access token Supabase yang dipakai sesi ini pernah ditempel di chat — setelah otomasi selesai, **rotate token** di dashboard Supabase (Account → Access Tokens).
- Token tidak ditulis ke file mana pun; dipakai hanya sebagai environment variable di shell.
- Jangan gunakan token ini untuk project production.
