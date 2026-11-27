# Indeks Review Kode — 28 November 2026

Tiga review read-only terhadap kode IMM Observer. Tidak ada kode aplikasi, migrasi, konfigurasi, atau data produksi yang diubah. Tidak ada berkas `.env*`, token, atau kredensial yang dibaca/dicetak.

Laporan lengkap:

- `01-arsitektur-kualitas.md` — 11 temuan (2 High, 5 Medium, 4 Low)
- `02-keamanan-privasi.md` — 11 temuan (1 High, 4 Medium, 6 Low)
- `03-bug-performa.md` — 11 temuan (4 High, 5 Medium, 2 Low)

**Total 33 temuan: 7 High, 14 Medium, 12 Low.** Angka High/Medium/Low di bawah ini bukan hasil pengukuran produksi; tiap temuan memuat tingkat keyakinan (Terverifikasi dari kode vs Hipotesis) di laporan asalnya.

## Temuan yang perlu ditangani lebih dulu

| Urutan | ID | Severity | Masalah | Kenapa duluan |
|---|---|---|---|---|
| 1 | K01 | High | Policy `collective_evaluation_revisions_read_authorized` memberi Bidang Kader SELECT atas salinan evaluasi berisi catatan/deliberasi privat | Pelanggaran aturan privasi yang sudah disepakati; jalur PostgREST langsung tidak lewat UI |
| 2 | BUG-01 | High | Autosave mengulang tiap ~700 ms tanpa batas setelah gagal | Bisa memicu ratusan kueri/menit dari satu sel; pernah menghabiskan Disk IO budget instance Nano |
| 3 | BUG-04 | High | Tombol "setuju → finalisasi → terbit" menyetujui rekomendasi sebelum gate; SQL tidak memeriksa rekomendasi disetujui | Rekomendasi terkunci saat gate gagal; snapshot bisa terbit tanpa persetujuan |
| 4 | A01 + BUG-02 | High | Validasi bisnis masih melempar `Error` dan meruntuhkan halaman di luar Penilaian/Evaluasi | Sudah dua kali menyebabkan 500 dan "Halaman gagal dimuat" di produksi |
| 5 | BUG-03 | High | P3/P4 (cache `getClaims`, descriptor/revisi tanpa batas, query tanpa filter, `revalidatePath("/dashboard")` 8×) belum dikerjakan | Biaya server dan payload; tercatat sebagai sisa pekerjaan sejak 14 Nov |
| 6 | K02 | Medium | Kader masih bisa menugaskan/cabut Observer lewat aksi dan RLS | Bertentangan dengan keputusan yang sudah ada di `BLUEPRINT.md:86,147,200` |
| 7 | K04 | Medium | `revoke ... from anon` untuk dua tabel revisi hanya ada di server, bukan di migrasi | Instalasi ulang dari migrasi mengembalikan grant default |
| 8 | BUG-05 | Medium | DTO ringkas membuang `range`, sehingga kolom "Rentang" selalu "—" | Regresi visual yang terlihat pengguna |
| 9 | A03 + BUG-08 | Medium | Rumus skor/filter cakupan multiimplementasi; peta kompetensi sementara menormalisasi ulang bobot | Angka sementara bisa berbeda dari aturan resmi |
| 10 | BUG-09 | Medium | Upsert narasi sebelum validasi; query snapshot terpisah setelah RPC | Pesan gagal walaupun snapshot sudah dibuat; percobaan kedua ditolak |

A02 (enam file UI 537–1.684 baris) berstatus High, tetapi risikonya jangka panjang dan biaya regresinya besar. Ditempatkan di batch refactor, bukan di urutan di atas. K05 dan K07 sudah diputus pemilik dan risikonya diterima. K08 dan A08 sudah diputus 28 November 2026, masing-masing menjadi permintaan akun untuk Admin dan status sebagai judul versi.

## Temuan yang saling tumpang tindih

Satu masalah bisa muncul di dua laporan karena sudut pandang berbeda. Ini daftar penggabungannya supaya tidak dihitung dua kali saat dibuatkan rencana kerja:

- **Error handling:** A01 (arsitektur) = BUG-02 (bug). A01 menghitung 273 `throw`, BUG-02 menghitung 269; beda cakupan pencarian, bukan data yang bertentangan. Satu perbaikan helper penanganan error menjawab keduanya.
- **Rumus skor:** A03 = sebagian BUG-08. A03 melihat duplikasi implementasi; BUG-08 melihat dampaknya pada peta kompetensi sementara.
- **Validasi rubrik:** A04 (validasi UI vs server terpisah) berdekatan dengan A03, tapi objeknya berbeda.
- **Tes:** A05 = BUG-10. Keduanya mencatat tidak ada tes Server Action kritis.
- **Performa:** BUG-03 mencakup A07 (`find` berulang di `calculateAspectAggregates`).
- **RPC/relasi tanpa validasi:** A06 berpasangan dengan A11 (batas cast) dan BUG-05 (DTO); K01 dan K03 tetap di paket keamanan/otorisasi.
- **DTO snapshot:** BUG-05 adalah regresi dari optimasi `snapshot_data` yang dicatat di HANDOVER 25 Nov.

## Yang sudah diverifikasi selesai (jangan dihitung lagi)

- Cast `as unknown as` sudah dibersihkan; satu batas yang tersengaja ada di `lib/relations.ts:43` (A11).
- `prefetch={false}` ada di semua `<Link>` yang diperiksa; `router.refresh()` per autosave sudah hilang (BUG-03 catatan "sudah diverifikasi").
- BUG-003 lama tuntas untuk finalisasi per jenis. Sisa yang masih memakai asumsi bobot 100% ada di BUG-08 (peta kompetensi sementara).
- RPC `get_event_assessment_summary` sudah menerima `target_participant_id`, jadi temuan pemotongan 3.069 baris sudah tidak berlaku di jalur yang memakai parameter itu.
- Scope peserta/foto (`20261127000000`) dan allowlist agregat publik (`20261127010000`) sudah benar (K10).
- `can_manage_events()` tidak lagi dipakai policy aktif; `disable_signup=true` sudah diterapkan di server (K11). Konsekuensinya K08 sudah diputus 28 November 2026: `/daftar` menjadi permintaan akun untuk Admin.

## Keputusan pemilik, status per 28 November 2026

Semua kolom di bawah sudah diputus atau dinyatakan risikonya diterima. Tidak ada keputusan terbuka yang menghalangi paket kerja.

| ID | Topik | Kenapa tidak langsung dikerjakan |
|---|---|---|
| K05 | Rotasi PAT dan service-role key; bot debugging berjalan sebagai `ubuntu` dan bisa membaca `.env.production` | Pemilik sudah memutuskan tidak rotasi dan menerima risiko; perlu keputusan ulang bila ingin mengubah |
| K07 | HTTP polos pada IP `:8080`, tanpa TLS/header keamanan | Sudah diputuskan final untuk sementara; akun dan rapor Peserta sengaja tidak dibagikan |
| K08 | `DISABLE_SIGNUP=true` membuat `/daftar` gagal | Diputus 28 Nov: `/daftar` menjadi permintaan akun untuk Admin, tidak ada sign-up terbatas |
| BUG-08 | Cara menggabungkan bobot untuk peta kompetensi sementara | Diputus 28 Nov: hitung per versi rubrik lalu gabung dengan aturan eksplisit, tetap berlabel Sementara |
| A08 | Judul "Versi 2 · RESMI" dengan badge "Draf" | Diputus 28 Nov: status dipakai sebagai judul, penanda trial sebagai badge atau teks tambahan |

## Pemeriksaan yang sudah dijalankan

- `npm test`: 49/49 lolos, 0 gagal (dijalankan dua review secara terpisah).
- `npm run lint` (review arsitektur): 0 error, 1 warning (konstanta `WHITE` mati di `lib/phase7-files.ts`, A10).
- Pemeriksaan struktural: 98 berkas `.ts`/`.tsx`, 6 berkas CSS, 60 migrasi, 12 penguji SQL.
- Tidak dijalankan: `npm run build`, uji browser, penguji RLS live, kueri ke database DEV/PROD. Status produksi bersumber dari `docs/STATUS-PRODUKSI-SATU-VERSI.md` dan `HANDOVER.md`.

## Cara memakai dokumen ini

Ini daftar usulan, bukan perintah untuk langsung mengerjakan. Sesuai `AGENTS.md`, pilih satu temuan atau satu batch, minta persetujuan, lalu kerjakan dan verifikasi sesuai tahapnya. Sertakan bukti (perubahan berkas, hasil `npm run check`, dan uji browser bila menyentuh UI/akses) sebelum berpindah ke temuan berikutnya.
