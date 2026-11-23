# Langkah Pasang Migrasi dan Uji Browser

Dokumen ini untuk memastikan perubahan koreksi alur aman sebelum deploy. **Jangan menjalankan langkah ini di proyek PROD untuk uji coba.** Gunakan proyek DEV.

## Sebelum mulai

Kode saat ini bergantung pada kolom `is_active` di tabel `development_recommendations`. Tanpa migrasi di bawah, halaman Evaluasi Kolektif akan gagal memuat. Itu sebabnya migrasi harus dipasang lebih dulu.

Migrasi yang belum ada di DEV maupun PROD:

- `supabase/migrations/20261123130000_dad_single_recommendation_per_evaluation_v1.sql`
- Penguji: `supabase/tests/dad_single_recommendation.sql`

Migrasi ini **tidak menghapus baris**. Ia menambah kolom `is_active`, menandai semua baris lama bukan aktif kecuali satu per evaluasi, lalu membuat indeks unik parsial. Baris lama tetap ada sebagai riwayat, dan snapshot yang sudah finalized menyimpan salinan sendiri.

## 1. Pasang migrasi di DEV

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

Hasil harus kosong.

## 2. Jalankan aplikasi di Windows

```powershell
cd "C:\Users\Lenovo\Documents\project"
npm.cmd install
npm.cmd run dev
```

Buka `http://localhost:3000`. Tekan `Ctrl+C` untuk menghentikan server.

Pastikan `.env.local` menunjuk ke proyek DEV. Jangan memakai kredensial PROD di mesin pengembangan.

## 3. Uji alur Observasi (Tahap 2)

Pakai dua akun Observer yang ditugaskan ke kegiatan yang sama, misalnya dua akun QA.

1. Buka `/dashboard/observasi` di dua browser atau dua tab profil berbeda.
2. Penilai A mengubah satu skor, lalu menekan Kirim.
3. Penilai B harus melihat status dan nilai A muncul tanpa menekan refresh.
4. Nilai A tidak boleh menimpa nilai B. Panel rekan bersifat baca-saja.
5. Uji autosave: ubah skor, tunggu sekitar 700 ms, muncul status "Tersimpan".
6. Uji konflik: ubah nilai yang sama dari dua perangkat, lalu pastikan muncul pilihan "Muat data terbaru" atau "Pertahankan draf saya".
7. Uji Kirim dan Buka kembali masih berfungsi.

## 4. Uji rekomendasi (Tahap 3)

1. Buka `/dashboard/evaluasi` sebagai MoT atau Admin.
2. Pilih satu peserta dan satu jenis penilaian.
3. Klik "Buat atau perbarui draf rekomendasi". Harus muncul **satu** draf, bukan satu per indikator.
4. Teks harus menyebut indikator yang memicu, tanpa angka rata-rata.
5. Klik dua kali tombol yang sama. Jumlah draf harus tetap satu.
6. Sunting teks draf, simpan, lalu setujui.
7. Pastikan tombol "Tambahkan rekomendasi manual" sudah tidak ada.

## 5. Uji finalisasi dan rapor (Tahap 4)

1. Isi keputusan dan alasan minimal 10 karakter pada form evaluasi.
2. Klik "Finalisasi dan simpan snapshot" seperti biasa. Pastikan masih berfungsi.
3. Untuk peserta lain, klik "Setujui, finalisasi, terbitkan, dan unduh rapor".
4. Setelah halaman berpindah ke Laporan, satu PDF rapor harus terunduh otomatis.
5. Cek `assessment_export_audit`: harus ada baris `individual_pdf` untuk unduhan itu.
6. Pastikan tombol "Terbitkan rapor" manual di halaman Laporan masih berfungsi.

## 6. Uji finalisasi semua (Tahap 5)

1. Siapkan beberapa evaluasi draf, ada yang sudah berisi keputusan dan ada yang belum.
2. Pastikan keputusan dan alasan sudah tersimpan lewat tombol "Simpan draf evaluasi".
3. Klik "Finalisasi semua materi yang siap".
4. Akan muncul rekap jumlah berhasil, dilewati, dan versi rubrik tanpa evaluasi.
5. Pastikan yang belum berisi keputusan tidak ikut finalisasi.
6. Pastikan tiap jenis penilaian tetap menghasilkan snapshot tersendiri.

## 7. Uji tampilan (Tahap 6 dan 7)

1. Halaman Observasi: kartu peserta, jarak antar indikator, uraian anchor, dan panel catatan tampak lebih rapi.
2. Halaman Laporan: empat blok naratif di rapor.web dalam keadaan terlipat. Klik untuk membuka.
3. Nilai akhir, rekap aspek, identitas, dan keputusan tetap tampil tanpa klik.
4. Metrik ringkas menjadi empat kartu; jumlah provisional tetap terbaca.
5. Unduh satu PDF dan bandingkan isinya dengan rapor sebelum perubahan. Isi PDF harus sama.

## 8. Baru deploy ke PROD

Lakukan hanya bila seluruh uji di atas lolos.

1. Pasang migrasi `20261123130000` di PROD lebih dulu lewat SQL Editor, lalu jalankan pengujinya.
2. Ikuti `docs/DEPLOYMENT.md`: backup dulu, rsync **tanpa** `--delete`, `npm ci`, `npm run build`, lalu `pm2 restart imm`.
3. Smoke test `/`, `/login`, `/dashboard`, `/dashboard/observasi`, `/dashboard/evaluasi`, `/dashboard/laporan`.
4. Jangan menjalankan pengujian yang menulis ke PROD dengan data nyata sebelum tinjauan keamanan, privasi, backup, dan biaya selesai.

## Catatan lingkungan sesi ini

Dari sesi agent ini, server dev tidak berjalan dan proyek Supabase DEV tidak dapat dijangkau. Karena itu uji browser di atas harus dilakukan dari laptop Windows Anda. Semua perintah `npm.cmd` di atas dijalankan di PowerShell.
