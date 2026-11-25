# Langkah Pasang Migrasi dan Uji Browser

Dokumen ini untuk memastikan perubahan koreksi alur aman sebelum deploy. **Jangan menjalankan langkah ini di proyek PROD untuk uji coba.** Gunakan proyek DEV. Otoritas status ada di `docs/STATUS-PRODUKSI-SATU-VERSI.md`.

## Keadaan migrasi (24 November 2026)

- **Catatan 25 November 2026:** bagian "keadaan migrasi" di bawah adalah riwayat saat dokumen dibuat. Status terkini ada di `docs/STATUS-PRODUKSI-SATU-VERSI.md`.
- **DEV** (`127.0.0.1:54322`): migrasi baru terpasang sampai `20261125120000`.
- **PROD** (Supabase self-hosted di `43.173.33.195`): migrasi `20261123130000`, `20261124100000` sampai `20261124160000`, serta `20261125100000`/`20261125110000`/`20261125120000` sudah terpasang.
- Kode aktif produksi per 25 November 2026: `a43bd27`. Branch `research/peta-alur-penilaian` sudah masuk `main` dan di-deploy.

Kode saat ini bergantung pada kolom `is_active` di tabel `development_recommendations`. Tanpa migrasi di bawah, halaman Evaluasi Kolektif akan gagal memuat. Itu sebabnya migrasi harus dipasang lebih dulu.

Migrasi yang **sudah ada di DEV** dan **belum ada di PROD**:

- `supabase/migrations/20261123130000_dad_single_recommendation_per_evaluation_v1.sql`
- Penguji: `supabase/tests/dad_single_recommendation.sql`

Migrasi ini **tidak menghapus baris**. Ia menambah kolom `is_active`, menandai semua baris lama bukan aktif kecuali satu per evaluasi, lalu membuat indeks unik parsial. Baris lama tetap ada sebagai riwayat, dan snapshot yang sudah finalized menyimpan salinan sendiri.

Penanda status di bawah: **[SUDAH]** = dijalankan di DEV pada branch ini dan tercatat di `docs/STATUS-PRODUKSI-SATU-VERSI.md`; **[SEBAGIAN]** = sebagian langkah belum ada bukti; **[BELUM]** = belum ada bukti.

## 1. Pasang migrasi di DEV — [SUDAH]

Migrasi baru sudah terpasang di DEV sampai `20261124140000`. Prosedur di bawah dipertahankan untuk mengulang di lingkungan DEV lain, bukan untuk produksi.

1. Buka Supabase Dashboard proyek **DEV**.
2. Buka **SQL Editor**, buat query baru.
3. Salin seluruh isi `supabase/migrations/20261123130000_dad_single_recommendation_per_evaluation_v1.sql`, lalu jalankan.
4. Buat query baru lagi, salin isi `supabase/tests/dad_single_recommendation.sql`, lalu jalankan.
5. Pastikan muncul pesan `Single active recommendation structural checks passed.`

Pemeriksaan tambahan yang bisa dijalankan di SQL Editor:

```sql
select evaluation_id, count(*)
from public.development_recommendations
where is_active
group by evaluation_id
having count(*) > 1;
```

Hasil harus kosong. Total 8 dari 8 penguji SQL lolos di DEV pada branch ini.

## 2. Jalankan aplikasi di Windows

```powershell
cd "C:\Users\Lenovo\Documents\project"
npm.cmd install
npm.cmd run dev
```

Buka `http://localhost:3000`. Tekan `Ctrl+C` untuk menghentikan server. Pada sesi DEV terakhir, Next.js berjalan di `localhost:3100` (lihat status dokumen); sesuaikan port dengan lingkungan Anda.

Pastikan `.env.local` menunjuk ke proyek DEV. Jangan memakai kredensial PROD di mesin pengembangan.

## 3. Uji alur Observasi (Tahap 2) — [SEBAGIAN]

Uji Observasi dasar, autosave, dan status "Tersimpan" sudah berhasil di DEV (`docs/HASIL-FASE4-DEV.md`). Yang **belum diulang setelah Fase 4**: uji dua akun untuk konflik dan Realtime, serta uji RLS lintas peran penuh (`docs/STATUS-PRODUKSI-SATU-VERSI.md` bagian 4).

1. Buka `/dashboard/observasi` di dua browser atau dua tab profil berbeda. **[BELUM diulang]**
2. Penilai A mengubah satu skor, lalu menekan Kirim. **[BELUM diulang]**
3. Penilai B harus melihat status dan nilai A muncul tanpa menekan refresh. **[BELUM diulang]**
4. Nilai A tidak boleh menimpa nilai B. Panel rekan bersifat baca-saja. **[BELUM diulang]**
5. Uji autosave: ubah skor, tunggu sekitar 700 ms, muncul status "Tersimpan". **[SUDAH]**
6. Uji konflik: ubah nilai yang sama dari dua perangkat, lalu pastikan muncul pilihan "Muat data terbaru" atau "Pertahankan draf saya". **[BELUM diulang]**
7. Uji Kirim dan Buka kembali masih berfungsi. **[SEBAGIAN]**

## 4. Uji rekomendasi (Tahap 3) — [SUDAH di DEV]

1. Buka `/dashboard/evaluasi` sebagai MoT atau Admin.
2. Pilih satu peserta dan satu jenis penilaian.
3. Klik "Buat atau perbarui draf rekomendasi". Harus muncul **satu** draf, bukan satu per indikator.
4. Teks harus menyebut indikator yang memicu, tanpa angka rata-rata.
5. Klik dua kali tombol yang sama. Jumlah draf harus tetap satu.
6. Sunting teks draf, simpan, lalu setujui.
7. Pastikan tombol "Tambahkan rekomendasi manual" sudah tidak ada.

Bukti: penguji SQL `dad_single_recommendation.sql` lolos di DEV dan uji browser Evaluasi berhasil (status dokumen bagian 2).

## 5. Uji finalisasi dan rapor (Tahap 4) — [SUDAH di DEV]

1. Isi keputusan dan alasan minimal 10 karakter pada form evaluasi.
2. Klik "Finalisasi dan simpan snapshot" seperti biasa. Pastikan masih berfungsi.
3. Untuk peserta lain, klik "Setujui, finalisasi, terbitkan, dan unduh rapor".
4. Setelah halaman berpindah ke Laporan, satu PDF rapor harus terunduh otomatis.
5. Cek `assessment_export_audit`: harus ada baris `individual_pdf` untuk unduhan itu.
6. Pastikan tombol "Terbitkan rapor" manual di halaman Laporan masih berfungsi. **[SEBAGIAN, tidak ada bukti khusus di status dokumen]**

Bukti rantai setuju → finalisasi → publikasi → unduh PDF dan tujuh tombol ekspor ada di `docs/HASIL-UJI-FINALIZE-EKSPOR-DEV.md`. Isi byte PDF belum dibandingkan (lihat bagian 7).

## 6. Uji finalisasi semua (Tahap 5) — [BELUM ada bukti khusus]

Kode Tahap 5 selesai di branch ini, tetapi status dokumen mencatat uji browser untuk **finalize satu klik**, bukan rangkaian "Finalisasi semua" di bawah. Jalankan uji ini sebelum deploy.

1. Siapkan beberapa evaluasi draf, ada yang sudah berisi keputusan dan ada yang belum.
2. Pastikan keputusan dan alasan sudah tersimpan lewat tombol "Simpan draf evaluasi".
3. Klik "Finalisasi semua materi yang siap".
4. Akan muncul rekap jumlah berhasil, dilewati, dan versi rubrik tanpa evaluasi.
5. Pastikan yang belum berisi keputusan tidak ikut finalisasi.
6. Pastikan tiap jenis penilaian tetap menghasilkan snapshot tersendiri.

## 7. Uji tampilan (Tahap 6 dan 7) — [SEBAGIAN]

1. Halaman Observasi: kartu peserta, jarak antar indikator, uraian anchor, dan panel catatan tampak lebih rapi. **[SUDAH di DEV]**
2. Halaman Laporan: empat blok naratif di rapor.web dalam keadaan terlipat. Klik untuk membuka. **[SUDAH di DEV]**
3. Nilai akhir, rekap aspek, identitas, dan keputusan tetap tampil tanpa klik. **[SUDAH di DEV]**
4. Metrik ringkas menjadi empat kartu; jumlah provisional tetap terbaca. **[SUDAH di DEV]**
5. Unduh satu PDF dan bandingkan isinya dengan rapor sebelum perubahan. Isi PDF harus sama. **[BELUM]** — status dokumen bagian 4 dan `docs/HASIL-UJI-FINALIZE-EKSPOR-DEV.md` mencatat bahwa isi byte unduhan belum dibandingkan dengan baseline.

## 8. Baru deploy ke PROD — [BELUM]

Lakukan hanya bila seluruh uji di atas lolos dan ada izin tertulis eksplisit. Deploy 24 November pagi pernah terjadi, tetapi untuk kode lama `0448100`, bukan branch ini.

1. Pasang di PROD semua migrasi yang belum ada: `20261123130000` dan `20261124100000` sampai `20261124140000`, lalu jalankan pengujinya. Keadaan sekarang: baru 39 migrasi lama.
2. Ikuti `docs/DEPLOYMENT.md`: backup dulu, rsync **tanpa** `--delete` maupun `--delete-excluded`, `npm ci`, `npm run build`, lalu `pm2 restart imm`.
3. Smoke test `/`, `/login`, `/dashboard`, `/dashboard/observasi`, `/dashboard/evaluasi`, `/dashboard/laporan`.
4. Jangan menjalankan pengujian yang menulis ke PROD dengan data nyata sebelum tinjauan keamanan, privasi, backup, dan biaya selesai.

## Catatan lingkungan sesi ini

Pada sesi penulisan dokumen ini, server dev tidak berjalan dan proyek Supabase DEV tidak dapat dijangkau. Karena itu uji browser di atas harus dilakukan dari laptop Windows Anda. Semua perintah `npm.cmd` di atas dijalankan di PowerShell. Rincian hasil uji yang sudah berjalan ada di `docs/HASIL-FASE2-DEV.md`, `docs/HASIL-FASE3-DEV.md`, `docs/HASIL-FASE3EFG-DEV.md`, `docs/HASIL-FASE3F-DEV.md`, `docs/HASIL-FASE4-DEV.md`, dan `docs/HASIL-UJI-FINALIZE-EKSPOR-DEV.md` serta `docs/STATUS-PRODUKSI-SATU-VERSI.md` bagian 2 dan 4.
