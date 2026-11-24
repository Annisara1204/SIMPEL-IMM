# Perbaikan Sel Penilaian Al-Islam Kemuhammadiyahan

Tanggal: 24 November 2026. Masalah dilaporkan lewat screenshot: halaman Observasi materi Al-Islam Kemuhammadiyahan hanya menampilkan nama aspek dan bobot, tanpa dropdown skor atau kolom bukti. Materi Ke-IMM-an normal.

## Penyebab

Data produksi:

- Versi rubrik aktif Al-Islam Kemuhammadiyahan memiliki 15 indikator.
- Ke-15 indikator itu memiliki `competency_indicator_id` kosong.
- Materi ini memiliki 4 pemetaan indikator aktif di `competency_material_indicators`, tetapi tidak ada yang bisa cocok karena kolom master di rubrik kosong.
- Halaman `app/dashboard/observasi/page.tsx:517-523` dan `:638-650` menyaring indikator dengan `mappedIndicators.has(indicator.competency_indicator_id)`. Karena tidak ada yang cocok, semua indikator dibuang, sehingga hanya aspek yang tersisa.
- Ke-IMM-an memiliki 3 indikator dan ketiganya memiliki `competency_indicator_id` terisi, sehingga selnya tampil normal.

Ini masalah konfigurasi rubrik trial, bukan kegagalan autosave, RLS, atau Realtime.

## Perbaikan

Opsi yang dipilih pemilik: bila tidak ada satu pun indikator versi aktif yang cocok dengan pemetaan materi, tampilkan seluruh indikator versi aktif.

Perubahan di `app/dashboard/observasi/page.tsx`:

- Menambah `hasMaterialMapping`, yaitu true hanya bila materi memiliki `competency_material_id` dan minimal satu indikator rubrik cocok dengan pemetaan aktif.
- Dua tempat filter indikator memakai `hasMaterialMapping`, bukan keberadaan `competency_material_id` saja.
- Pemeriksaan versi `competency_indicator_rubric_version_id` juga hanya berlaku bila `hasMaterialMapping` true.

Dengan ini, materi yang belum memiliki pemetaan master yang valid tetap bisa dinilai. Materi yang pemetaannya sebagian benar tetap memakai filter seperti sebelumnya.

## Verifikasi DEV

Karena DEV tidak memiliki materi dengan kondisi sama, skenario dibuat sementara: materi "Materi umum" diberi `competency_material_id` yang tidak cocok dengan indikator rubriknya.

- Sebelum perbaikan: 0 sel penilaian.
- Sesudah perbaikan: 5 sel penilaian aktif, dan menyimpan skor 3 berhasil tercatat di tabel `assessment_ratings`.
- Data uji DEV dikembalikan ke keadaan semula.

`npm run check` dan `npm run build` lolos, 22 tes lulus, 5 peringatan lama.

## Deploy produksi

- Backup aplikasi `/home/ubuntu/imm-app.bak-aikfix-20261124-185326`.
- Backup `.env.production` `/home/ubuntu/.env.production.bak-aikfix-20261124-185326`, hash sama dengan file aktif.
- rsync tanpa `--delete`, build, dan `pm2 restart imm` berhasil.
- Smoke delapan halaman: 200.
- Browser produksi dengan akun QA Observer A: halaman "Pelatihan · Al-Islam Kemuhammadiyahan · Observasi" menampilkan **495 dropdown aktif** (33 peserta × 15 indikator), tanpa banner error.

Tidak ada perubahan database produksi untuk perbaikan ini.
