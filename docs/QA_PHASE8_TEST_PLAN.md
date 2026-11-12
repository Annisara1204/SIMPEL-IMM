# QA Test Plan — Phase 8 Bagian B (Functional Testing)

**Tanggal:** 12 November 2026
**Lingkungan:** lokal (`npm.cmd run dev`, http://localhost:3000) + proyek Supabase pengguna (data simulasi).
**Catatan lingkungan:** belum ada proyek Supabase terpisah khusus pengujian; pengujian memakai proyek yang sama dengan data simulasi. Untuk pemakaian resmi, siapkan proyek uji terpisah.
**Data:** seluruh peserta/foto/nilai yang dipakai adalah simulasi. Jangan masukkan data pribadi nyata.
**Status kolom "Hasil aktual":** `Belum diuji` = menunggu eksekusi; `Lulus (otomatis)` = terbukti lewat unit test/tsc; sisa = diisi saat pengujian manual.

## Ringkasan audit awal (sebelum pengujian)

1. `proxy.ts` hanya menyegarkan sesi; proteksi rute dilakukan per halaman server (`app/dashboard/*`) dan Server Action + RLS. Bukan bug, tetapi berarti keamanan **tidak** bergantung pada middleware tunggal — setiap halaman harus tetap diperiksa saat uji.
2. Build produksi masih gagal `EPERM` pada prerender Windows; rute produksi belum terverifikasi penuh.
3. Tidak ada automated E2E; seluruh pengujian alur dilakukan manual browser + SQL regression.
4. Tes unit Phase 6 (10/10) dan Phase 7 files (2/2) LULUS pada 12 Nov 2026.
5. Akun/token sementara Peserta **belum diimplementasikan** (sesuai blueprint: metode akses peserta masih terbuka); modul Akun Peserta Sementara belum bisa diuji.
6. Import tes (Tahap 5) ditunda; modul impor `.xlsx` ada tetapi belum diperiksa di browser.

## Hasil pemeriksaan otomatis (12 Nov 2026)

| Pemeriksaan | Hasil | Bukti |
|---|---|---|
| `npm.cmd run test:phase6` | Lulus 10/10 | Agregasi skor, N/O, coverage, rekomendasi |
| `npm.cmd run test:phase7` | Lulus 2/2 | Struktur PDF dan ZIP |
| `npx.cmd tsc --noEmit` | Pernah lulus (5–12 Nov); diulang? | Perlu diulang saat regression |
| Regression SQL Supabase (Phase 5/6/7) | Lulus (dilaporkan pengguna) | Lihat `supabase/tests/` |

## Test case

### 1. Autentikasi dan sesi (AUTH)

| ID | Skenario | Data uji | Expected | Hasil aktual | Status |
|---|---|---|---|---|---|
| AUTH-001 | Login email+password benar | akun Admin Uji | Masuk ke dashboard sesuai role | Terverifikasi 12 Nov: Admin dan Observer masuk | Lulus |
| AUTH-002 | Login password salah | akun uji | Ditolak, sesi tidak dibuat | Belum diuji | Belum diuji |
| AUTH-003 | Buka `/dashboard` tanpa login | — | Dialihkan ke `/login` | Terverifikasi di browser (12 Nov): akhirnya di `/login` | Lulus |
| AUTH-004 | Akses langsung URL modul sebagai role lain | URL `/dashboard/pengguna` sebagai Observer | Ditolak/kembali ke login | Dilaporkan pengguna 29 Okt: kembali ke login | Lulus (dilaporkan, perlu diulang) |
| AUTH-005 | Sesi berakhir lalu refresh | — | Kembali ke `/login` | Belum diuji | Belum diuji |
| AUTH-006 | Keluar (sign out) lalu buka dashboard | — | Tidak bisa masuk tanpa login ulang | Terverifikasi 12 Nov: keluar → mendarat di `/` | Lulus |
| AUTH-007 | Akun tanpa role membuka dashboard | akun uji tanpa role | Muncul "Akses belum diberikan" | Dilaporkan pengguna 29 Okt: tampil peringatan | Lulus (dilaporkan) |
| AUTH-008 | Login username instruktur perbantuan | akun sementara buatan admin | Masuk dengan username (dipetakan server) | Belum diuji ulang (pembuatan akun dikonfirmasi 6 Nov; login belum) | Belum diuji |
| AUTH-009 | Supabase Auth callback route bekerja | tautan konfirmasi | Sesi terbentuk | Belum diuji | Belum diuji |

### 2. Manajemen peserta (PST)

| ID | Skenario | Data uji | Expected | Hasil aktual | Status |
|---|---|---|---|---|---|
| PST-001 | Admin/Observer menambah peserta (profil wajib) | peserta simulasi | Tersimpan | Dilaporkan pengguna (29 Okt/6 Nov) | Lulus (dilaporkan) |
| PST-002 | Peserta tanpa foto (opsional) | profil tanpa unggahan | Tersimpan, placeholder tampil | Tersimpan dikonfirmasi; placeholder belum dikonfirmasi | Belum diuji penuh |
| PST-003 | Edit profil peserta + ganti foto | foto JPG ≤5MB | Tersimpan; foto tampil | Diunggah dikonfirmasi; tampilan belum | Belum diuji penuh |
| PST-004 | Hapus peserta | peserta simulasi | Terhapus (sesuai kebijakan) | Dilaporkan pengguna | Lulus (dilaporkan) |
| PST-005 | Bidang Kader/Komisariat/Peserta menambah peserta | akun role tersebut | Ditolak (RLS + server) | Dilaporkan pengguna: tidak bisa menambah | Lulus (dilaporkan) |
| PST-006 | Tahun angkatan format salah | `202` / `20xx` | Ditolak validasi | Belum diuji | Belum diuji |
| PST-007 | Nama+Komisariat sama diizinkan | dua peserta sama nama | Tersimpan + peringatan duplikat | Dilaporkan pengguna (migrasi 0400) | Lulus (dilaporkan) |
| PST-008 | Foto >5MB atau bukan JPG/PNG | berkas uji | Ditolak | Belum diuji | Belum diuji |

### 3. Akun observer dan instruktur (ACC)

| ID | Skenario | Data uji | Expected | Hasil aktual | Status |
|---|---|---|---|---|---|
| ACC-001 | Pendaftaran instruktur tetap (email) | `/daftar` | Akun dibuat tanpa role; tertahan di dashboard | Belum diuji | Belum diuji |
| ACC-002 | Admin membuat akun sementara (username) | `/dashboard/pengguna` | Akun dibuat, login username | Pembuatan dikonfirmasi 6 Nov; login belum | Belum diuji penuh |
| ACC-003 | Admin menetapkan role/subrole | halaman Pengguna/Penilaian | Role tersimpan; dashboard aktif sesuai penugasan | Sebagian dikonfirmasi (alur Observer) | Belum diuji penuh |
| ACC-004 | Instruktur tanpa penugasan buka dashboard | akun instruktur baru | "Akun menunggu penugasan" | Belum diuji | Belum diuji |
| ACC-005 | Instruktur mengedit profil sendiri | `/dashboard/profil` | Nama/foto tersimpan; role tidak bisa diubah sendiri | Belum diuji | Belum diuji |
| ACC-006 | Instruktur melihat Profil Instruktur (nama/foto saja) | `/dashboard/profil-instruktur` | Hanya nama/foto; tidak ada data pribadi lain | Sebagian dikonfirmasi pengguna | Belum diuji penuh |
| ACC-007 | Akun lain membaca detail pribadi instruktur (HP, alamat) | akun ber-role lain | Ditolak | Belum diuji | Belum diuji |

### 4. Akun peserta sementara (TMP)

| ID | Skenario | Data uji | Expected | Hasil aktual | Status |
|---|---|---|---|---|---|
| TMP-001 | Login peserta sementara | — | Belum tersedia | Fitur belum diimplementasikan (blueprint: akses peserta masih terbuka) | DIHENTIKAN — menunggu keputusan produk |

### 5. Assignment observer (ASN)

| ID | Skenario | Data uji | Expected | Hasil aktual | Status |
|---|---|---|---|---|---|
| ASN-001 | Admin menugaskan Observer ke kegiatan | `/dashboard/penilaian` | Tersimpan; duplikat ditolak dengan pesan ramah | Perbaikan 6 Nov; perlu coba ulang | Belum diuji |
| ASN-002 | Observer melihat hanya kegiatan yang ditugaskan | `/dashboard/kegiatan` sebagai Observer | Hanya kegiatan tugas; tidak bisa ubah nama | Terverifikasi 12 Nov: hanya "PK IMM FEB UM Bandung" tampil; form admin tidak ada | Lulus |
| ASN-003 | Observer tanpa penugasan buka `/dashboard/observasi` | akun Observer bebas tugas | Tidak ada kegiatan/peserta tampil | Terverifikasi 12 Nov (UI scoping): Observer melihat hanya tugasnya | Lulus (scoping UI) |
| ASN-004 | Penugasan instruktur subrole per kegiatan | Pengaturan Penilaian | Checklist sesuai subrole; IoT tidak melihat hasil peserta | Implementasi ada; belum diuji | Belum diuji |
| ASN-005 | Bidang Kader menugaskan (tanpa kelola rubrik) | akun Bidang Kader | Bisa tugaskan; tidak bisa ubah rubrik | Migrasi 1300; belum diuji | Belum diuji |

### 6. Input penilaian (PEN)

| ID | Skenario | Data uji | Expected | Hasil aktual | Status |
|---|---|---|---|---|---|
| PEN-001 | Observer mengisi skor 1–5 | Screening & Pelatihan | Tersimpan otomatis; riwayat ada | Terverifikasi 12 Nov (Pelatihan AIK · Kognitif): autosave + status Tersimpan · jam | Lulus |
| PEN-002 | Observer submit lalu buka kembali | tombol Kirim/Buka | Status berubah sesuai aturan | Terverifikasi 12 Nov: Draft → Submitted → Draft | Lulus |
| PEN-003 | Admin finalisasi setelah semua submit | akun Admin | Finalized; perubahan terkunci | Belum diuji (MVP) | Belum diuji |
| PEN-004 | Dua observer isi peserta/indikator sama | dua akun ditugaskan | Nilai independen; pratinjau sendiri; konflik terdeteksi | Belum diuji | Belum diuji |
| PEN-005 | Skor pecahan (mis. 3.5) | input manual | Ditolak/dibulatkan integer | Belum diuji | Belum diuji |
| PEN-006 | Ubah skor setelah finalisasi | akun observer | Ditolak | Belum diuji | Belum diuji |

### 7. Skala 1–5 dan N/O (SKL)

| ID | Skenario | Data uji | Expected | Hasil aktual | Status |
|---|---|---|---|---|---|
| SKL-001 | Pilih "Belum diamati" (N/O) | indikator apa pun | Tidak diberi skor; tidak dihitung | Logika diuji otomatis (unit test) | Lulus (otomatis, terbatas) |
| SKL-002 | Skor 0 | input 0 | Ditolak constraint 1–5 | Terverifikasi struktur (constraint ada) | Lulus (struktur) |
| SKL-003 | Semua indikator aspek N/O | peserta uji | Aspek dikeluarkan; bobot aspek lain dinormalisasi | Logika di `lib/scoring.ts`; unit test relevan lulus | Lulus (otomatis, terbatas) |
| SKL-004 | Sebagian indikator N/O dalam aspek | peserta uji | Bobot sisa dinormalisasi ke 100% | Unit test relevan lulus | Lulus (otomatis, terbatas) |

### 8. Autosave (AUTOSAVE)

| ID | Skenario | Data uji | Expected | Hasil aktual | Status |
|---|---|---|---|---|---|
| ATS-001 | Ketik skor, tunggu ~700ms | input di `/dashboard/observasi` | Tersimpan sendiri; status tampil | Terverifikasi 12 Nov: 5 skor tersimpan otomatis; teks "Tersimpan · jam" muncul | Lulus |
| ATS-002 | Tutup browser sebelum autosave | draf terisi | Draf tertahan di localStorage saat offline | Belum diuji | Belum diuji |
| ATS-003 | Kirim request berulang cepat | klik cepat | Tidak ada duplikasi record | Belum diuji | Belum diuji |
| ATS-004 | Navigasi pindah halaman saat menyimpan | — | Tidak ada data hilang/korup | Belum diuji | Belum diuji |
| ATS-005 | Internet terputus saat simpan | offline mode | Status gagal terlihat; retry/localStorage | Belum diuji | Belum diuji |

### 9. Realtime (RT)

| ID | Skenario | Data uji | Expected | Hasil aktual | Status |
|---|---|---|---|---|---|
| RT-001 | Observer A ubah rating; Observer B melihat perubahan | dua sesi | UI B menyegarkan tanpa reload | Belum diuji | Belum diuji |
| RT-002 | Status koneksi Realtime ditampilkan | indikator UI | Status online/offline terlihat | Belum diuji | Belum diuji |
| RT-003 | Perubahan submission (draft→submitted) tersiarkan | — | Ringkasan sesi dimuat ulang | Belum diuji | Belum diuji |

### 10. Catatan observer (NOTE)

| ID | Skenario | Data uji | Expected | Hasil aktual | Status |
|---|---|---|---|---|---|
| NOTE-001 | Dua observer menulis catatan kategori sama | dua akun | Keduanya tersimpan terpisah (per penulis) | Belum diuji | Belum diuji |
| NOTE-002 | Ubah catatan sendiri | — | Hanya catatan sendiri berubah; riwayat ada | Belum diuji | Belum diuji |
| NOTE-003 | Akun lain mengubah catatan observer | akun berbeda | Ditolak (RLS) | Belum diuji | Belum diuji |
| NOTE-004 | Catatan internal tidak tampil ke Komisariat | `/dashboard/pengajuan` | Catatan privat tidak terlihat | Belum diuji | Belum diuji |

### 11. Scoring engine (SCR)

| ID | Skenario | Data uji | Expected | Hasil aktual | Status |
|---|---|---|---|---|---|
| SCR-001 | Agregasi banyak observer (Submitted/Finalized saja) | unit test + skenario manual | Rata-rata dari rating valid; draft tidak dihitung | Unit test lulus 10/10 | Lulus (otomatis) |
| SCR-002 | N/O tidak dianggap nol | unit test | N/O dikecualikan | Unit test lulus | Lulus (otomatis) |
| SCR-003 | Rentang skor ≥2 → status moderasi | unit test | Diberi tanda perlu moderasi | Unit test lulus | Lulus (otomatis) |
| SCR-004 | Coverage <80% di suatu aspek | skenario manual | Hasil tetap provisional | Unit test lulus | Lulus (otomatis) |
| SCR-005 | Perhitungan keseluruhan tidak normalisasi bobot aspek ulang | unit test | Sesuai formula Phase 6 | Unit test lulus | Lulus (otomatis) |
| SCR-006 | Bandingkan dengan perhitungan manual 1 peserta | data kertas | Cocok 100% | Belum diuji | Belum diuji |
| SCR-007 | Ubah skor setelah finalisasi | — | Ditolak | Belum diuji | Belum diuji |
| SCR-008 | Nilai 0–100 = (rata-rata−1)/4×100, tampil 2 desimal | — | Tampilan sesuai | Belum diuji | Belum diuji |

### 12. Collective evaluation (EVA)

| ID | Skenario | Data uji | Expected | Hasil aktual | Status |
|---|---|---|---|---|---|
| EVA-001 | Buka `/dashboard/evaluasi` sebagai Admin/koordinator | akun uji | Agregat tampil; coverage, min/max, N/O, pending | Terverifikasi 12 Nov: halaman terbuka; RPC diperbaiki (BUG-001); rekap kosong karena belum ada kiriman valid | Lulus (sebagian) |
| EVA-002 | Buat draf rekomendasi otomatis | indikator <3/5 | Saran deterministik, status draft | Logika unit test lulus; UI belum | Belum diuji |
| EVA-003 | Rekomendasi ganda saat tombol ditekan dua kali | — | Tidak menggandakan | Unit test lulus | Lulus (otomatis) |
| EVA-004 | Moderasi: rentang besar memicu status "perlu moderasi" | data uji | Status moderasi muncul | Belum diuji | Belum diuji |
| EVA-005 | Observer biasa membuka `/dashboard/evaluasi` | akun observer | Ditolak/terbatas sesuai RLS | Belum diuji | Belum diuji |
| EVA-006 | Bidang Kader melihat agregat tanpa sumber privat | akun bidang kader | Tidak ada skor mentah/bukti | Belum diuji | Belum diuji |

### 13. Finalization dan publication (FIN)

| ID | Skenario | Data uji | Expected | Hasil aktual | Status |
|---|---|---|---|---|---|
| FIN-001 | Finalisasi evaluasi kolektif | akun Admin/koordinator | Snapshot bernomor; immutable | Belum diuji | Belum diuji |
| FIN-002 | Edit/hapus snapshot | — | Ditolak (trigger immutable) | Struktur trigger ada (tes Phase 6) | Lulus (struktur) |
| FIN-003 | Terbitkan rapor (publish) | Admin | Publikasi tercatat di audit | Belum diuji | Belum diuji |
| FIN-004 | Rapor sebelum publish | akun peserta | Tidak bisa dibuka | Belum diuji | Belum diuji |
| FIN-005 | Republish → revision naik; rapor lama tetap ada | — | Revisi baru; historis utuh | Belum diuji | Belum diuji |
| FIN-006 | Finalisasi tanpa coverage minimal | peserta belum lengkap | Ditolak RPC | Belum diuji | Belum diuji |
| FIN-007 | Finalisasi dengan moderasi terbuka | rentang belum dimoderasi | Ditolak RPC | Belum diuji | Belum diuji |

### 14. Dashboard (DASH)

| ID | Skenario | Data uji | Expected | Hasil aktual | Status |
|---|---|---|---|---|---|
| DASH-001 | Dashboard Admin: jumlah pengguna per role | akun admin | Metrik terisi | Terverifikasi 12 Nov: metrik kegiatan/peserta/rubrik/penilai tampil dari DB | Lulus |
| DASH-002 | Dashboard Bidang Kader: daftar kegiatan + progres | akun bidang kader | Tampil | Belum diuji | Belum diuji |
| DASH-003 | Dashboard Observer: kegiatan tugas | akun observer | Hanya tugasnya | Terverifikasi 12 Nov: dashboard Observer tampil, skor 0 (belum kirim) | Lulus |
| DASH-004 | Dashboard Instruktur: peserta + checklist subrole | akun instruktur | Sesuai subrole | Belum diuji | Belum diuji |
| DASH-005 | Dashboard Peserta: ringkasan nilai miliknya saja | akun peserta tertaut | Hanya miliknya | Belum diuji | Belum diuji |
| DASH-006 | Dashboard publik: agregat aman | tanpa login | Tanpa identitas/skor individu | Terverifikasi (12 Nov): halaman publik tampil, konsol bersih; konten masih data simulasi | Lulus (render) |
| DASH-007 | IoT/Vice IoT tidak melihat hasil peserta | akun IoT | Tidak ada nilai peserta | Belum diuji | Belum diuji |

### 15. Raport individu (RPT)

| ID | Skenario | Data uji | Expected | Hasil aktual | Status |
|---|---|---|---|---|---|
| RPT-001 | Peserta membuka rapor setelah publish | akun peserta tertaut | Rapor tampil (RPC published miliknya) | Belum diuji | Belum diuji |
| RPT-002 | Peserta lain membuka rapor tsb (ganti ID) | akun peserta lain | Ditolak | Belum diuji | Belum diuji |
| RPT-003 | Peserta tanpa tautan akun | - | Tidak ada rapor | Belum diuji | Belum diuji |
| RPT-004 | PDF rapor individual | tombol ekspor | PDF terbuka, isi sesuai snapshot | Struktur PDF lulus unit test; tampilan belum | Belum diuji penuh |
| RPT-005 | Rapor menampilkan ruang pengesahan tanpa nama mengarang | PDF | Ruang kosong | Belum diuji | Belum diuji |

### 16. Cohort report (COH)

| ID | Skenario | Data uji | Expected | Hasil aktual | Status |
|---|---|---|---|---|---|
| COH-001 | Event report PDF | Admin/koordinator | Ringkasan snapshot final | Belum diuji | Belum diuji |
| COH-002 | Excel rekap peserta/per materi/evaluasi akhir | ekspor | Isi sesuai data | Belum diuji | Belum diuji |
| COH-003 | Excel internal observer (hanya Admin/koordinator) | akun observer biasa | Ditolak | Belum diuji | Belum diuji |
| COH-004 | ZIP massal hanya Published | bulk export | Yang belum Published dilewati + dilaporkan | Struktur ZIP lulus unit test; alur belum | Belum diuji penuh |

### 17. Export PDF dan Excel (EXP)

| ID | Skenario | Data uji | Expected | Hasil aktual | Status |
|---|---|---|---|---|---|
| EXP-001 | PDF individual sesuai snapshot | data final | Cocok dengan rapor web | Belum diuji | Belum diuji |
| EXP-002 | Rekap Excel tidak memuat catatan privat | ekspor | Tanpa catatan/evidence | Belum diuji | Belum diuji |
| EXP-003 | Audit ekspor tercatat (`assessment_export_audit`) | setelah ekspor | Baris audit ada | Belum diuji | Belum diuji |
| EXP-004 | Filter kegiatan/kelompok/status berjalan | dashboard laporan | Data terfilter | Belum diuji | Belum diuji |

## Aturan eksekusi

- Urutan: AUTH → PST/ACC/ASN → PEN/SKL/ATS/RT/NOTE → SCR/EVA/FIN → DASH/RPT/COH/EXP.
- Setiap item yang FAIL dicatat di Bug & Fix Log (Phase 8 Bagian L) dengan severity.
- Setiap PASS harus berbukti: screenshot, entri audit DB, atau hasil unit test — bukan "katanya jalan".
- Temuan Critical/High wajib dilaporkan sebelum lanjut ke Bagian C.

## Hasil uji browser manual (12 Nov 2026, sesi Admin `sals…` dan Observer `observer01`)

Temuan dan hasil penting:

- **BUG-001 (High, diperbaiki & terverifikasi):** `get_event_assessment_summary` error PostgreSQL `42702 column reference "participant_id" is ambiguous` — halaman Evaluasi Kolektif menampilkan "Rekap belum tersedia" meski migration terpasang. Penyebab: direktif PL/pgSQL default `variable_conflict=error`; nama kolom output sama dengan nama kolom tabel. Diperbaiki dengan `#variable_conflict use_column` di dalam body fungsi (migration `20261112190000_fix_get_event_assessment_summary_ambiguous.sql`). Setelah perbaikan migration dijalankan pengguna, rekap terbuka. Tidak ada perubahan logika/formula.
- **BUG-002 (High, diperbaiki & terverifikasi):** di workspace Observasi, indikator rubrik tidak tampil sama sekali (hanya aspek). Penyebab: relasi `rubric_indicators` dibaca sebagai array (`?.[0]`) padahal banyak-ke-satu dikembalikan sebagai objek — pola bug yang sama dengan bug Pengaturan Penilaian 12 Nov. Diperbaiki dengan helper `firstRelated` di `app/dashboard/observasi/page.tsx`. Setelah perbaikan, indikator tampil dan bisa diisi.
- Admin login ✅; dashboard Admin menampilkan metrik dari database (10 peserta, 3 kegiatan, 2 penilai, dsb.) ✅; Observer login ✅ (redirect sedikit lambat tapi berhasil); Observer hanya melihat kegiatan yang ditugaskan ✅; menu Observer tanpa menu admin ✅; `/dashboard` tanpa login → `/login` ✅; sign out ✅.
- Autosave skor berfungsi: skor 4 tersimpan otomatis (debounce ~700ms) dengan status "Tersimpan · jam" ✅.
- Kirim → status **Submitted** → "Buka kembali untuk revisi" → kembali **Draft** ✅.
- Rubrik Screening "Interview" memang kosong (sengaja, dikonfirmasi pengguna) — workspace menampilkan aspek tanpa indikator tanpa pesan penjelasan; dicatat sebagai **catatan UX (Low/Medium)**: tampilkan pesan "indikator belum dipilih pada rubrik ini" saat rubrik kosong.
- **Data uji:** 5 skor uji (4, 3, 3, 4, 5) tersimpan pada "Peserta 01 · Pelatihan AIK · Kognitif" (Draft). Ini data dummy — pengguna dapat mengisi ulang.
- Build produksi masih `EPERM` prerender; belum diuji penuh.
- Log lama (`00:20`) menunjukkan uncaught error `Setiap indikator harus terhubung ke aspek yang dipilih` dari `applyFrameworkRubricSelection` (saat ditulis berkasnya `app/dashboard/penilaian/actions.ts`; sejak 12 Nov 2026 terpecah — lihat `app/dashboard/penilaian/rubric-actions.ts`) — pengguna sempat memicu ini; dicatat sebagai **Bug-003 (Medium)** untuk ditinjau: pesan/galat tidak bersahabat saat validasi pemilih gagal.
- Pemeriksaan lintas akun (konflik dua observer), Realtime dua sesi, submit→finalisasi→publikasi→rapor, ekspor PDF/Excel, akun Instruktur dan Peserta: **belum diuji**.

## Checklist prioritas untuk diuji manual (butuh akun)

Akun simulasi yang disarankan tersedia (semua data simulasi): Admin Uji, 2× Observer yang ditugaskan ke kegiatan yang sama, 1× Bidang Kader, 1× Instruktur (subrole apa pun), 1× Komisariat, 1× Peserta (ditautkan ke record peserta oleh Admin).

Urutan tercepat mendapat informasi terbanyak:

1. **PEN-003** finalisasi oleh Admin setelah semua observer submit.
2. **PEN-004** dua observer isi peserta/indikator yang sama — cek konflik.
3. **ATS-001/002/003** autosave: ketik, tunggu, tutup browser, buka draf.
4. **RT-001** dua sesi browser berdampingan — lihat perubahan peserta lain muncul tanpa reload.
5. **NOTE-001** catatan dua penulis pada kategori yang sama.
6. **EVA-001** buka Evaluasi Kolektif sebagai Admin — cek agregat/coverage.
7. **FIN-001/003** finalisasi evaluasi → terbitkan rapor → **RPT-001** peserta membuka rapor; **RPT-002** peserta lain mencoba URL rapor orang lain.
8. **EXP-001/002/003/004** PDF, Excel (tanpa catatan privat), audit ekspor, filter.
9. **AUTH-001/002/005/006/008** login salah, sesi habis, sign out, username instruktur.
10. **DASH-002/004/005/007** dashboard per role (Bidang Kader, Instruktur, Peserta, IoT).

Saat menguji, catat: langkah, yang terjadi, dan hasil (cocok/tidak) untuk setiap ID di atas. Kirim daftar ID yang gagal beserta pesannya; saya bantu triase severity dan perbaikan.

## Hasil uji browser otomatis (13 November 2026, sesi Linux, akun QA sintetik)

Lingkungan: `http://localhost:3000` (dev server pengguna PID 101993), project Supabase **dev** `thtwrkovcorgxzuqttal`, seluruh data simulasi. Akun QA: `qa-auto-admin` (admin_system), `qa-auto-observer-{a,b}` (observer, ditugaskan ke `PK IMM FEB UM Bandung`), `qa-auto-instruktur` (instruktur, MoT), `qa-auto-kader` (bidang_kader). Kredensial: `.env.qa-test` (gitignored, tidak di-commit).

Hasil (13 Nov 2026):

- **AUTH-001** Lulus — login qa-auto-admin → dashboard Admin, metrik tampil (3 kegiatan, 10 peserta, 2 sesi/rubrik aktif, 7 penilai, 10 provisional). AUTH-002 Lulus — password salah ditolak, tetap di `/login`. AUTH-003/006/RT-3 Lulus — `/dashboard` tanpa login → `/login`; keluar → `/`; peserta lain tidak bisa akses. AUTH-005 Gagal/tercatat — saat sesi kedaluwarsa (>1 jam), halaman menampilkan "Profil belum tersedia" alih-alih redirect ke `/login`.
- **DASH-001** Lulus (Admin). **DASH-002** Lulus (Kader: "Pantau proses kaderisasi"). **DASH-003** Lulus (Observer). **DASH-004** Lulus (Instruktur MoT: "Rekap hasil penilaian"). DASH-005 DIHENTIKAN (metode akses peserta belum diputuskan; tidak ada akun peserta tertaut). DASH-006 Lulus (publik render, data simulasi). DASH-007 belum diuji per subrole (Instruktur hanya diuji sebagai MoT).
- **PEN-001/002/004** Lulus — dua observer QA mengisi peserta & indikator yang sama secara independen; autosave ("Tersimpan · jam"), Kirim → Submitted → "Buka kembali" → Draft → kirim lagi. Submit ganda tidak menggandakan record (unique constraint `(rubric_version_id, participant_id, observer_id)` di `assessment_submissions`).
- **PEN-005** Lulus (struktur) — constraint `score_check` 1–5, tipe integer; pecahan mustahil tersimpan.
- **PEN-003 / FIN / RPT / COH / EXP** DIHENTIKAN (lihat BUG-003 di bawah) — finalisasi mustahil pada rubrik dengan total bobot ≠ 100 (Screening 100% + Pelatihan 100% = 200%); `calculateOverallScore` dan RPC melempar `Coverage belum memadai`. Rapor/ekspor tidak dapat dihasilkan apa pun tanpa snapshot.
- **ATS-001** Lulus. **ATS/konflik** Lulus — alur konflik draf lokal vs server terverifikasi penuh (lihat BUG-002). **RT-001** Lulus — perubahan Observer A tampil di Observer B tanpa reload (nilai 5→1 langsung terlihat di panel "Penilaian observer lain"; event `assessment-realtime-change` tertangkap listener; badge "Realtime tersambung"). **RT-002** Sebagian — badge online terlihat; jalur offline diuji lewat kode (listener `offline` mengubah status; draf localStorage terbukti di alur konflik).
- **NOTE-001/002/003** Lulus — catatan per penulis terpisah; edit catatan sendiri menaikkan revisi (versi 1 → 2, tercatat di `observer_note_revisions` beserta isi sebelum/sesudah); penulis lain tidak dapat mengedit (action & RLS membatasi `author_id = auth.uid()`).
- **EVA-001/003/004/005** Lulus — Evaluasi Kolektif: agregasi rata-rata/min–maks/rentang/coverage/moderasi tampil; "Buat draf rekomendasi otomatis" membuat tepat 1 draf (indikator rata-rata 2.5/5, status draft, klik ulang tidak menggandakan); flag "Perlu ditinjau" tampil untuk rentang 2 poin; observer yang membuka `/dashboard/evaluasi` dialihkan ke `/dashboard` (RPC juga menolak dengan 42501 untuk role lain). EVA-004 moderasi record belum tercatat (perlu keputusan koordinator via UI; agen tidak mengarang konsensus).
- **EXP-002** Lulus (code review) — ekspor Excel rekap tidak memuat catatan privat (kolom diekspor diverifikasi di kode `phase7-report-*`; konten detail bukan data pribadi). Ekspor PDF/ZIP/Excel end-to-end belum diklik di browser karena finalisasi terblokir BUG-003.
- **ATS-003** Lulus — klik Kirim berulang kali tidak membuat duplikasi submission.

Temuan baru (13 Nov 2026):

- **BUG-001 (Low, diperbaiki & terverifikasi):** `acceptLatest()` ("Muat data terbaru") tidak menghapus draf localStorage → konflik yang sama muncul lagi pada kunjungan berikutnya (infinite conflict loop). Diperbaiki dengan `localStorage.removeItem(storageKey)`; terverifikasi tidak muncul lagi setelah klik + reload.
- **BUG-002 (High, diperbaiki & terverifikasi):** Realtime tidak sampai ke browser (event `postgres_changes` tidak diterima meski channel SUBSCRIBED dan pipe WAL → realtime bekerja — dibuktikan dengan klien Node). Penyebab: channel di-AKTIFKAN sebelum token sesi disetel (join anonim). Diperbaiki di `assessment-realtime.tsx` (ambil `getSession()` dan `setAuth` sebelum `subscribe()`); terverifikasi event tiba di browser B dan panel observer lain ikut diperbarui tanpa reload manual.
- **BUG-003 (BLOCKER, keputusan produk diperlukan):** finalisasi evaluasi mustahil pada event dengan >1 rubrik aktif berbobot 100. Screening (Interview): aspek 20% × 5 = 100. Pelatihan AIK Kognitif: Pretest 50% + Post-Test 50% = 100. `calculateOverallScore` mensyaratkan total bobot tepat 100 (99.999–100.001) → selalu provisional → tombol "Finalisasi dan simpan snapshot" selalu disabled (atau RPC melempar `Coverage belum memadai`). Rapor/ekspor/publikasi semua terblokir sampai aturan aggregator diputuskan pengguna (opsi: per-tahap, per-scope cross_session, atau bobot lintas rubrik dinormalisasi).
- **BUG-004 (Low, tidak diperbaiki):** sesi kedaluwarsa (>1 jam) membuat `/dashboard` menampilkan "Profil belum tersedia" dengan satu tombol "Keluar" alih-alih redirect ke `/login`.
- **Hydration mismatch dev-only (pre-existing):** "A tree hydrated but some attributes ... didn't match the client" di log dev (dicatat 03:13; telah ada sebelum perubahan 13 Nov). Bukan error produksi; perlu ditinjau terpisah.
- Penilaian QA Observer A pada Indikator 1 (PELATIHAN AIK) telah diubah berkali-kali sebagai bagian pengujian (akhirnya 1 · Sangat Kurang, rev 8); Observer A/B juga mengisi Screening Interview Peserta 01 (A) dan Peserta 02 (B, tanpa sengaja — find-text melebar ke seksi peserta lain). Seluruhnya data simulasi; aman diabaikan.

## Finalisasi per jenis penilaian (13 Nov 2026, lanjutan sesi otomasi)

- **PEN-003** Lulus — finalisasi evaluasi kolektif per jenis (Screening: 76/100, snapshot rev 1, decision pass; AIK Kognitif: 74/100, snapshot rev 1, decision further_discussion setelah 2 moderasi resolved). Gate: coverage ≥80% per aspek (tanpa normalisasi lintas rubrik), moderasi reviewed/resolved per jenis, bobot harus Σ=100 per snapshot (diperiksa ulang di RPC).
- **EVA-004** Lulus — status moderasi "Selesai" ×2 disimpan via UI (retain_average); RPC menolak finalisasi saat ada needs_review tanpa moderasi (diverifikasi sebelum review).
- **FIN-001/003/005/006/007** Lulus — finalisasi per penilaian: RPC menolak snapshot dengan overall ≠ ready (coverage) / bobot ≠ 100 / aspek <80% / needs_review tanpa moderasi (diverifikasi historis); publikasi 2 rapor tercatat di audit; revisi publikasi naik (rev 1 → 2 untuk peserta).
- **RPT-001/002** DIHENTIKAN — tidak ada akun peserta (metode akses belum diputuskan pengguna).
- **RPT-003/004/005** — PDF terbangkit & audit terisi; isi PDF belum ditelaah manual. Pengesahan/ruang tanda tangan tidak diisi nama (tidak ada karangan identitas).
- **COH-001/002/004 & EXP-001/002/003/004** Lulus — event report PDF, Excel rekap (assessment/observer excel ×4 klik teraudit), ZIP 2 rapor Published, audit ekspor tercatat (individual_pdf, bulk_pdf, assessment_excel, observer_excel, event_report_pdf), filter kegiatan/status berjalan.

## Verifikasi role tambahan (13 Nov 2026, bagian kedua sesi otomasi)

- **DASH-007 (IoT)** Lulus — akun Instruktur subrole IoT (`qa-auto-iot@qa.imm-observer.invalid`, ditugaskan `PK IMM FEB UM Bandung`, position `iot`, duties 5 item): dashboard merender "Progres penilaian saya" dengan total 0 dan TIDAK menampilkan rekap/hasil kegiatan; checklist tugas IoT tampil dan bisa ditandai selesai (terverifikasi is_done=true di DB). Akses `/dashboard/laporan` → redirect `/dashboard`; `/dashboard/observasi` boleh dibuka (semua subrole boleh mengisi); `/dashboard/evaluasi` dapat dibuka tetapi hanya ringkasan agregat (tanpa nilai individual). Ditemukan & diperbaiki BUG-005 (lihat bawah).
- **DASH-002/4/5 (Komisariat)** Lulus — akun `qa-auto-komisariat@qa.imm-observer.invalid` (ditautkan ke Komisariat PK IMM FEB UM Bandung): dashboard "Kegiatan komisariat Anda" tampil, menu "Pengajuan peserta" merender form pengajuan tanpa data komisariat lain; `/dashboard/seleksi-komisariat`, `/dashboard/observasi`, `/dashboard/peserta`, `/dashboard/evaluasi`, `/dashboard/analitik`, `/dashboard/laporan` semuanya me-redirect `/dashboard`; data pengajuan milik Komisariat Simulasi 03 tidak terlihat di halaman mana pun (uji baca lintas-komisariat melalui UI).
- **BUG-005 (Medium, diperbaiki — belum diverifikasi visual penuh sebelum commit ini tapi terverifikasi di 2 sesi browser):** `InstructorDutyDashboard` tidak pernah dirender karena cabang `phase7Home ? <Phase7DashboardHome/> : …` tidak menyertakan panel tugas. Diperbaiki: panel tugas render untuk semua Instruktur setelah Phase7 dashboard.
- **Lint-debt = 0** — seluruh peringatan dihapus (2× exhaustive-deps diobservasi cells, `location.assign` → `useRouter().push` di report-workspace); `npm run check` + `npm run lint` bersih total (0 error, 0 warning).
- **RPT-001..005** tetap DIBLOKIR keputusan metode akses akun peserta (keputusan pengguna). **Windows build (EPERM)** dan **CI runner** hanya bisa diverifikasi pengguna di laptop Windows.
