# Rencana Perombakan Layout PDF Rapor

**Tanggal:** 27 November 2026
**Status:** rencana selesai dan dieksekusi di DEV pada 27 November 2026 (commit `03db8dd`). Baseline lama diarsipkan, baris baseline baru ditambahkan. Deploy produksi menunggu langkah terpisah.
**Pemicu:** pemilik menunjukkan bahwa PDF rapor saat ini masih terasa "asal ada", bukan sekadar kurang aksesibel.

## 1. Kondisi saat ini

Generator ada di `lib/phase7-files.ts` dengan `buildPdf` (`:245-291`) dan diekspor sebagai `createReportPdf` (`:293`). Tidak memakai library PDF; objek PDF, xref, dan trailer dirakit manual. Font tunggal Helvetica (`/F1`).

Contoh PDF yang saya hasilkan dari fixture `tests/phase7-files.test.ts` dan dibaca dengan `pdftotext -layout` berisi satu kolom teks: judul, data kegiatan, identitas, daftar aspek, nilai akhir, indikator, narasi, alasan, tanggal, dan baris tanda tangan. `pdfinfo` menunjukkan A4, satu halaman, 2.894 byte.

Header biru, footer, dan nomor halaman sebenarnya sudah ada (`:257-259`, `:270`), tetapi tampilnya polos. Masalah utama:

1. Semua isi satu kolom. Aspek dan indikator hanya string, bukan tabel (`:123-129`, `:157-159`, `:264`).
2. Properti `bold: true` tidak pernah dirender karena font bold tidak didefinisikan (`:85-86`, `:138`, `:252`, `:264`).
3. Tidak ada garis, border, atau pemisahVisual selain pita header dan batang skor (`:257`, `:266`).
4. Page break naif: perkiraan tinggi `size+8`, batas 730, tanpa `keep-with-next` (`:231-240`).
5. Warna biru `#173b63` bukan warna brand maroon, dan hanya dikenali lewat satu literal string (`:87`, `:262-263`).
6. `wrap` memotong pada 88 karakter dan membuang newline asli (`:46-59`, `:219-227`).
7. Semua karakter non-ASCII jadi spasi (`:31-40`), sehingga tanda kutip kurung dan en dash hilang.
8. Placeholder tidak seragam: "Belum diisi", "Belum tersedia", "-", dan fallback angka `0` untuk data yang sebenarnya kosong (`:60-65`, `:124`, `:137`, `:158`).
9. Status `FINALIZED` ditulis keras (`:137`) dan tanda tangan hanya teks bergaris panjang yang bisa terpotong halaman (`:215`).
10. Tes hanya mengecek awalan `%PDF-1.4`, akhiran `%%EOF`, dan dua substring (`tests/phase7-files.test.ts:37-44`).

## 2. Layout yang diusulkan

### 2.1 Urutan bagian

Rapor individual:

1. Pita header + judul `RAPOR HASIL KOMPETENSI DAD`, nama kegiatan, tema, penyelenggara, lokasi, periode.
2. `IDENTITAS PESERTA`: nama, NIM, kelompok, komisariat.
3. `RINGKASAN NILAI`: nilai akhir `/100`, kategori, status `Diterbitkan`, keputusan, tanggal terbit, versi rubrik.
4. `ASPEK KOMPETENSI`: tabel aspek, bobot, skor `/5`, batang skor.
5. `INDIKATOR YANG DINILAI`: tabel indikator, cakupan, rata-rata, jumlah penilai.
6. `KEKUATAN` dan `AREA PENGEMBANGAN`.
7. `REKOMENDASI DAN TINDAK LANJUT` hanya dari `approvedRecommendations`.
8. `CATATAN METODOLOGI` dan `ALASAN KEPUTUSAN`.
9. `PENGESAHAN`: dua jabatan generik dan garis kosong, tanpa nama rekaan.
10. Footer di setiap halaman.

Varian `eventSummary` memakai pita dan footer sama, judul `LAPORAN KESELURUHAN KEGIATAN DAD`, identitas peserta diganti `RINGKASAN EKSEKUTIF`, tanpa keputusan individu, serta `STATUS CAKUPAN DATA` dan `KETERBATASAN DATA`.

### 2.2 Spesifikasi teknis

| Item | Nilai |
|---|---|
| Kertas | A4, `/MediaBox [0 0 595 842]` |
| Margin | kiri/kanan 40 pt, area isi x = 40..555, y = 56..786 |
| Header | pita maroon `#8b1e3f` (`0.545 0.118 0.247 rg`), 37 pt, teks putih 10 pt; label kanan `RAPOR PESERTA` / `LAPORAN KEGIATAN` 9 pt |
| Font | `F1` Helvetica + `F2` Helvetica-Bold. Keduanya Type1 standar, bukan dependency baru |
| Ukuran | judul 18 pt bold maroon, subjudul 12 pt bold maroon + garis, isi 9 pt, tabel 8,5 pt, catatan/footer 8 pt |
| Tinggi baris | isi 17 pt, judul 26 pt, subjudul 20 pt, baris tabel 17 pt |
| Alignment | kiri. Kolom numerik memakai x tetap: aspek 40, bobot 300, skor 355, batang 420; indikator 40, cakupan 330, rata-rata 400, penilai 490 |
| Batang skor | track abu `x=420, y-2, 135x7`; isi maroon `(skor/5)*135`. Skor null: batang tidak digambar |
| Garis | subjudul `maroon RG 0.6 w`, footer `abu RG 0.4 w` |
| Page break | sebelum subjudul bila sisa < 60 pt; subjudul tidak boleh sendirian di bawah halaman |
| Footer | `Rapor resmi IMM Observer | halaman X dari Y`, 8 pt, abu, y = 25 |

Tabel memakai header 8 pt bold maroon dan garis tipis di bawahnya. Baris data boleh bergantian putih dan sangat muda (`0.97 0.96 0.97`) agar mudah diikuti.

### 2.3 Data kosong dan batas aman

- Field opsional kosong memakai `Belum diisi` secara konsisten.
- Skor, kategori, atau nilai akhir kosong memakai `Belum tersedia`, bukan `0`.
- N/O ditulis `N/O`, tidak menjadi nol dan tidak menambah jumlah penilai.
- Versi rubrik kosong memakai `Versi snapshot: tidak tercatat`, bukan mengarang `v1`.
- Narasi kosong memakai kalimat pengganti yang jelas, misalnya `Belum ada rekomendasi yang disahkan.`
- Bagian pengesahan hanya berisi `Koordinator Instruktur` dan `Penanggung Jawab Kegiatan` plus garis. Tanpa nama, email, atau jabatan rekaan.
- Whitelist field: `participant`, `event`, `publishedAt`, `snapshotData.aspects/indicators/collective/overall/approvedRecommendations/schemaVersion`, `indicatorNames`, `versionInfo`. Catatan per penulis, bukti, deliberasi, dan sumber privat tidak dibaca.

### 2.4 Iterasi pertama dan yang menyusul

Wajib di iterasi pertama: palette maroon, `F2` bold, pita header, footer bernomor, urutan dan label di atas, placeholder konsisten, whitelist field, pengesahan tanpa nama, garis subjudul, dan `keep-with-next`.

Menyusul: tabel empat kolom penuh dengan x tetap, baris bergantian, daftar indikator dengan definisi operasional, foto peserta bila izinnya diputuskan, nomor dokumen/QR bila panitia menyediakan data, dan template terpisah untuk laporan kegiatan.

## 3. Verifikasi

Tool yang tersedia di lingkungan ini: `pdfinfo`, `pdftotext`, `pdftoppm`, `pdfimages`, `gs`, `sha256sum`, `unzip`, `zip`, `python3`, `node`. Tool `qpdf` dan `mutool` **tidak** terpasang; gunakan `gs -q -o /dev/null -sDEVICE=nullpage -` untuk menolak PDF rusak.

Pola verifikasi fixture, dengan `TZ=UTC` dan versi Node dicatat:

```bash
GEN='import { createReportPdf } from "./lib/phase7-files.ts"; /* fixture */ process.stdout.write(Buffer.from(await createReportPdf(sample).arrayBuffer()));'
TZ=UTC node --experimental-strip-types --input-type=module -e "$GEN" | sha256sum
TZ=UTC node --experimental-strip-types --input-type=module -e "$GEN" | pdfinfo - | grep -E '^Pages|^Page size|^Encrypted'
TZ=UTC node --experimental-strip-types --input-type=module -e "$GEN" | pdftotext -layout - - | grep -nE 'RAPOR HASIL|IDENTITAS|Kategori|Pengesahan|Rapor resmi'
TZ=UTC node --experimental-strip-types --input-type=module -e "$GEN" | gs -q -o /dev/null -sDEVICE=nullpage -
```

Assertion minimum yang ditambahkan ke `tests/phase7-files.test.ts`:

1. Judul dan nama kegiatan muncul berurutan.
2. Identitas peserta sebelum bagian hasil.
3. Baris aspek memuat nama, bobot, skor `/5`, dan kategori.
4. Kategori, status, keputusan, dan tanggal terbit tampil.
5. Narasi kekuatan, pengembangan, rekomendasi, dan alasan berurutan.
6. Pengesahan hanya jabatan + garis, tanpa nama.
7. Footer `halaman i dari N` untuk setiap halaman, N sama dengan `pdfinfo Pages`.
8. Tidak ada UUID, `snapshot_data`, `private_payload`, `observer_notes`, alamat email, atau kata `Draft`.
9. Tidak ada fallback angka `0.0/100` untuk data kosong.
10. Fixture multipage diuji agar page break dan footer tidak hilang.

Tambah render `pdftoppm -png -r 80` untuk melihat satu halaman. `pdftotext` tidak mendeteksi teks bertabrakan atau terpotong.

## 4. Baseline hash dan immutability

Perubahan layout mengubah byte PDF, sehingga `pdf_sha256` lama di `docs/baseline-pdf-sha256.csv` untuk snapshot `39d48a66-…` revision 1 tidak lagi cocok dengan generator baru.

Langkah aman:

1. Sebelum kode diubah, salin baseline lama ke `docs/archive/baseline-pdf-sha256-2026-11-25.csv` dan catat `sha256sum`-nya. Simpan pula berkas PDF lama hasil unduhan di luar repo.
2. Minta persetujuan pemilik untuk menambah baseline baru. Gate immutable tidak boleh ditimpa diam-diam.
3. Setelah layout aktif di DEV, unduh snapshot yang **sama**, bukan membuat snapshot baru. Hitung `sha256sum` PDF baru.
4. **Tambah baris baru** di CSV dengan `snapshot_id` dan `revision` sama, `pdf_sha256` baru, `audit_id` baru, `source` menyebut generator layout v2 dan commit, serta `created_at` baru. Baris lama tetap utuh.
5. `snapshot_data_sha256` tetap sama karena snapshot tidak diubah.
6. Tulis catatan di `docs/HANDOVER.md` dan sesuaikan `docs/PROSEDUR-RETENSI-DATA-V1.md` agar restore PDF lama memakai baseline lama, PDF baru memakai baris baru.

## 5. Deploy

### DEV

1. Rekam `git rev-parse HEAD`; `npm run check` dan `npm run build` wajib hijau.
2. Arsipkan baseline dan PDF lama seperti bagian 4.
3. Terapkan layout, perluas tes, jalankan verifikasi fixture dan render PNG.
4. Unduh satu PDF individual dan satu ZIP dari `/dashboard/laporan` DEV. PDF di dalam ZIP harus lolos assertion yang sama. Cek baris audit ekspor.
5. Laporkan hasil. Deploy produksi baru setelah pemilik menyetujui.

### PROD

6. Backup direktori aplikasi dan `.env.production` dengan stempel waktu; catat hash env, commit aktif, `df -h`, dan `docker ps` sebelum deploy.
7. `rsync -az` dengan exclude `.git`, `node_modules`, `.next`, `.env*`, `*.tsbuildinfo`. **Tanpa `--delete` dan tanpa `--delete-excluded`.** Lalu `npm ci --include=dev`, `npm run build`, `pm2 restart imm --update-env`.
8. Smoke HTTP untuk `/`, `/login`, `/dashboard`, `/dashboard/kegiatan`, `/dashboard/penilaian`, `/dashboard/laporan`; cek `pm2 status imm` dan log tanpa 5xx baru.
9. Smoke fungsional: unduh satu PDF dan satu ZIP memakai akun QA simulasi, jalankan assertion, cocokkan hash dengan baseline baru, cek audit ekspor bertambah. Jangan menulis data peserta nyata.
10. Rollback: kembalikan direktori dari backup, `npm ci`, `npm run build`, `pm2 restart`, ulang smoke. Pulihkan `.env.production` hanya bila hash berbeda. Kembalikan CSV baseline dari arsip bila perlu.
11. Perbarui `docs/STATUS-PRODUKSI-SATU-VERSI.md` dan `HANDOVER.md` terlebih dahulu, baru dokumen lain.

## 6. Risiko dan mitigasi

- **Gate immutable PDF pecah.** Mitigasi: arsip baseline lama + PDF lama, tambah baris baru, persetujuan pemilik.
- **Perubahan byte antar lingkungan.** Tetapkan `TZ=UTC`, catat versi Node, dan gunakan assertion teks/urutan sebagai pemeriksaan utama. Hash hanya pembanding dalam lingkungan yang sama.
- **Render tidak teruji oleh teks.** Tambah `pdftoppm` dan tinjau satu halaman.
- **`rsync` pernah menghapus env.** Verifikasi hash env sebelum dan sesudah; dilarang `--delete`.
- **Server dipakai bareng.** Jangan menyentuh `wms_prod_*`, nginx 80/443, cron lain, atau port 8080 layanan lain.
- **Restart pm2 memutus sesi sebentar.** Beri tahu pemilik sebelum deploy.

## 7. Selesai ketika

- [ ] Pemilik menyetujui perubahan baseline hash.
- [ ] Layout baru lolos `npm run check`, `npm run build`, verifikasi fixture, dan render visual di DEV.
- [ ] Satu PDF individual dan satu ZIP diunduh dari DEV dan lolos assertion.
- [ ] Baris baseline baru ditambahkan, baris lama utuh.
- [ ] Setelah izin: deploy PROD dengan backup, smoke HTTP dan fungsional, dokumen status diperbarui.
