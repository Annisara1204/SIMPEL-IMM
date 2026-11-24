# Rencana Implementasi Koreksi Alur

Dokumen ini menjabarkan `KEPUTUSAN-KOREKSI-ALUR.md` menjadi tahap kerja. Urutan sudah memperhatikan ketergantungan. Tahap 0 sampai 7 sudah diimplementasikan dan diuji di DEV pada branch `research/peta-alur-penilaian`; deploy branch ini ke PROD belum dilakukan. Otoritas status ada di `docs/STATUS-PRODUKSI-SATU-VERSI.md`. Setiap tahap harus diverifikasi dulu sebelum lanjut.

## Prinsip

- Kerjakan di DEV dengan data simulasi. Jangan menulis ke PROD selama pengembangan.
- Hak akses tetap diperiksa di server dan RLS. Jangan melebarkan `is_assessment_moderator`.
- Dua keputusan tidak boleh dilanggar: nilai penilai tetap independen, dan isi PDF resmi tidak diubah.
- Gunakan migrasi baru. Jangan menyunting migrasi yang sudah dipakai.

## Pemetaan keputusan ke tahap

| Keputusan | Tahap |
|---|---|
| 1. Tampilan tersinkron, nilai independen | 2 |
| 2. Empat subrole koordinator | 1 (verifikasi, tanpa perubahan) |
| 3. Satu rekomendasi per peserta per jenis | 3 |
| 4. Setuju langsung terbit + 8. RPF = PDF per peserta | 4 |
| 5. Satu tombol finalisasi semua materi | 5 |
| 7. Cara input tidak diubah, tampilan diperbarui | 6 |
| 6. Rapor web dirapikan, PDF tetap | 7 |

## Tahap 0 — Keputusan lanjutan (SELESAI, 23 Nov 2026)

1. **Gate "semua penilai submit":** bukan syarat keras. Tampilkan peringatan berisi penilai yang belum submit. Gate tetap coverage 80% per aspek.
2. **Rekomendasi manual:** dihapus. Hanya rekomendasi otomatis yang dipakai, lalu koordinator menyetujui atau menyunting.
3. **Isi rekomendasi otomatis:** sebutkan semua indikator dengan rata-rata di bawah 3/5, tanpa angka, dengan saran latihan umum per aspek.
4. **Blok rapor web yang dilipat:** Kekuatan, Area pengembangan, Rekomendasi, dan Alasan keputusan. Identitas, nilai akhir, rekap aspek, dan keputusan tetap tampil.

Tahap 0 selesai. Rincian alasan ada di `KEPUTUSAN-KOREKSI-ALUR.md`.

## Tahap 1 — Verifikasi kewenangan

Keputusan 2 sudah sesuai kode saat ini, jadi tidak ada perubahan fungsi maupun RLS.

- Periksa `lib/phase7-home.ts` (`MODERATOR_POSITIONS`, `isModeratorPosition`) dan `lib/instructor-roles.ts` agar konsisten dengan `is_assessment_moderator` di `supabase/migrations/20261112170000_dad_scoring_collective_evaluation_v1.sql`.
- Pastikan `app/dashboard/evaluasi/page.tsx` dan `app/dashboard/laporan/page.tsx` masih menolak IoT dan Vice IoT.
- Perintah: `npm.cmd run check`.
- Hasil: tidak ada error; daftar subrole di UI dan basis data sama.

## Tahap 2 — Sinkron tampilan antar penilai

**Berkas yang berubah**

- `app/dashboard/observasi/assessment-realtime.tsx`
- `app/dashboard/observasi/assessment-rating-cell.tsx`
- `app/dashboard/observasi/page.tsx`

**Pendekatan**

- Saat event `assessment_ratings` diterima, perbarui panel rekan di semua klien. Jangan hanya memfilter `observer_id === props.observerId`.
- Ubah syarat tampil panel rekan di `assessment-rating-cell.tsx` agar tetap muncul walaupun penilai sendiri belum mengisi indikator itu.
- Kirim status per penilai dari `page.tsx` sebagai prop, memakai data `assessment_submissions` yang sudah di-fetch.
- Pertahankan `scheduleRefresh()` hanya untuk perubahan `assessment_submissions`.
- Jangan menyentuh RLS, constraint unik, kunci localStorage, `expectedRevision`, `disabled`, dan `chooseScore`/`acceptLatest`/`applyMine`.

**Verifikasi**

- Dua akun observer dibuka berdampingan. A mengubah skor lalu menekan Kirim. B melihat status dan nilai A dalam kurang lebih satu detik tanpa refresh.
- B tidak bisa menimpa nilai A lewat UI maupun request langsung.
- Skenario konflik revisi masih menampilkan pilihan data terbaru atau draf lokal.
- `npm.cmd run check`.

**Risiko**

- Re-render seluruh grid bila memakai refresh halaman. Pakai pembaruan state terarah seperti pola di `observer-notes.tsx`.

## Tahap 3 — Satu rekomendasi per evaluasi

**Berkas yang berubah**

- `lib/phase6-recommendations.ts`
- `tests/phase6-recommendations.test.ts`
- `app/dashboard/evaluasi/actions.ts`
- `app/dashboard/evaluasi/page.tsx`
- migrasi baru di `supabase/migrations/`
- penguji baru di `supabase/tests/`

**Pendekatan**

- Ubah `buildLowScoreRecommendations` menjadi satu hasil per evaluasi. Sebutkan semua indikator dengan rata-rata di bawah 3/5, tanpa menulis angka rata-rata, dan beri saran latihan umum per aspek.
- `generateAutomaticRecommendations` memakai upsert satu baris per `evaluation_id`.
- Hapus jalur input manual `addDevelopmentRecommendation` dari UI dan action. Koordinator tetap boleh menyunting teks otomatis sebelum menyetujui.
- Tambah constraint unik `(evaluation_id)` pada `development_recommendations` lewat migrasi baru. Sesuaikan RLS UPDATE agar upsert dan suntingan diizinkan untuk moderator pada evaluasi berstatus draft.
- Teks tombol dan daftar di halaman evaluasi disesuaikan.
- Rekomendasi lama pada snapshot yang sudah finalized tidak diubah karena snapshot bersifat immutable.

**Verifikasi**

- `npm.cmd run test:phase6` dan `npm.cmd run check`.
- SQL regression di DEV: dua kali klik "buat draf" tetap satu baris.
- Browser: satu peserta dengan beberapa indikator rendah hanya menampilkan satu rekomendasi.

**Risiko**

- Rekomendasi manual yang sudah ada bisa bertabrakan dengan constraint baru. Migrasi perlu menangani baris lama dengan jelas, misalnya menggabungkan atau membiarkan yang sudah approved.

## Tahap 4 — Satu klik setuju, finalisasi, terbit, unduh

**Berkas yang berubah**

- `app/dashboard/evaluasi/actions.ts`
- `app/dashboard/evaluasi/page.tsx`
- `app/dashboard/laporan/actions.ts`

**Pendekatan**

- Buat satu server action baru yang menjalankan berurutan: setujui rekomendasi, finalisasi evaluasi, publikasi snapshot, lalu kembalikan id snapshot untuk unduh `individual_pdf`.
- Pertahankan semua gate yang ada di `finalize_collective_evaluation` dan `publish_assessment_report`. Jangan mengubah RPC-nya.
- Catat setiap sub-aksi ke `development_recommendations`, `assessment_export_audit`, dan `assessment_report_publication_audit`.
- Tombol hanya muncul untuk keempat subrole koordinator atau Admin, dan hanya bila gate terpenuhi.
- Unduh memakai `downloadIndividualReport` di `lib/phase7-files.ts`. File PDF tidak diubah isinya.

**Verifikasi**

- Uji gate: coverage kurang dari 80%, bobot bukan 100%, moderasi belum selesai, dan alasan kurang dari 10 karakter harus menolak aksi.
- Setelah sukses: satu baris snapshot baru, satu baris publikasi, satu baris audit unduh, dan PDF terbuka.
- `npm.cmd run check` dan `npm.cmd run test:phase7`.

**Risiko**

- Aksi berurutan bisa gagal di tengah. Tampilkan hasil per langkah dan jangan menganggap publikasi berhasil bila langkah sebelumnya gagal.
- Publikasi tidak lagi memiliki konfirmasi terpisah. Audit wajib diperkuat.

## Tahap 5 — Satu tombol finalisasi semua materi

**Berkas yang berubah**

- `app/dashboard/evaluasi/page.tsx`
- `app/dashboard/evaluasi/actions.ts`

**Pendekatan**

- Kumpulkan semua evaluasi draft untuk kegiatan yang ditugaskan, kelompokkan per `rubric_version_id`.
- Tampilkan daftar jenis yang siap dan yang belum, lengkap dengan alasannya.
- Tampilkan pula peringatan penilai yang belum submit. Ini **bukan gate**, sesuai keputusan Tahap 0.
- Tombol "Finalisasi semua" memanggil fungsi finalisasi per evaluasi secara berurutan. Hasil tetap satu snapshot per jenis.
- Jangan membuat snapshot gabungan lintas jenis.

**Verifikasi**

- Kegiatan dengan dua jenis berhasil menghasilkan dua snapshot bernomor.
- Kegiatan dengan satu jenis belum siap menampilkan alasan dan tidak memfinalisasi jenis itu.
- `npm.cmd run check`.

**Risiko**

- Kegagalan sebagian. Sertakan ringkasan per jenis dan izinkan mengulang hanya untuk yang gagal.

## Tahap 6 — Perapian tampilan input nilai

**Berkas yang berubah**

- `app/dashboard/observasi/assessment-rating-cell.tsx` (bagian JSX saja)
- `app/dashboard/observasi/observer-notes.tsx` (bagian JSX saja)
- `app/dashboard/observasi/submission-controls.tsx` (teks dan tombol)
- `app/dashboard/observasi/page.tsx` (markup)
- `app/globals.css` (blok `.observation-*` dan `.rubric-*`, `.observer-notes`)

**Pendekatan**

- Ubah warna, spasi, tipografi, grid, dan pengelompokan `<details>`.
- Jangan mengubah label skala di `lib/scoring.ts`, karena sudah menjadi keputusan produk.
- Jangan menghapus `aria-live` pada status simpan.
- Jangan menambah refresh halaman.

**Verifikasi**

- Uji browser dua akun: autosave, status Tersimpan, konflik, Kirim, Buka kembali masih berfungsi.
- `npm.cmd run check`.

## Tahap 7 — Perapian tampilan rapor web

**Berkas yang berubah**

- `components/phase7-report-workspace.tsx`
- `app/globals.css` blok `.report-*`

**Pendekatan**

- Lipat empat blok sesuai keputusan Tahap 0: Kekuatan, Area pengembangan, Rekomendasi, dan Alasan keputusan.
- Identitas, nilai akhir, rekap aspek, dan keputusan tetap tampil tanpa klik.
- Ringkas metrik, grupkan tombol ekspor, dan perpendek teks baku yang bukan berasal dari snapshot.
- Sembunyikan panel monitoring di balik tombol "Detail penilaian".
- **Jangan** menyentuh `lib/phase7-files.ts`, payload `get_my_published_assessment_report`, atau struktur `snapshot_data`.

**Verifikasi**

-Bandingkan PDF sebelum dan sesudah perubahan untuk satu snapshot yang sama. Isi harus identik.
- Halaman Peserta dan halaman staf tetap menampilkan data yang sama, hanya beda kerapatan.
- `npm.cmd run check`.

## Tahap 8 — QA dan rilis

1. jalankan `npm.cmd run check`, `npm.cmd run build`, dan seluruh regression SQL di DEV.
2. Uji peran: Admin, MoT, Master Observer, Bidang Kader, Observer, IoT, Komisariat, Peserta.
3. Uji lintas kegiatan dan pastikan tidak ada kebocoran nilai antar kegiatan.
4. Deploy ke PROD mengikuti `docs/DEPLOYMENT.md`: backup dulu, rsync tanpa `--delete`, `npm ci`, `npm run build`, lalu `pm2 restart`.
5. Jangan memakai data peserta nyata sebelum tinjauan keamanan, privasi, backup, dan biaya selesai.

## Perintah Windows yang dipakai tiap tahap

```powershell
cd "C:\Users\Lenovo\Documents\project"
npm.cmd run check
npm.cmd run test:phase6
npm.cmd run test:phase7
npm.cmd run build
```

Migrasi baru dijalankan lewat SQL Editor Supabase DEV sesuai urutan nama berkas, lalu regression SQL yang menyertainya.

## Yang sengaja tidak diubah

- `is_assessment_moderator`, RLS, dan konstanta subrole.
- Constraint unik `assessment_ratings` dan model nilai independen.
- Mekanisme autosave 700 ms, draf localStorage, revisi, dan konflik.
- Generator PDF `lib/phase7-files.ts` dan isi snapshot.
- Struktur snapshot per jenis penilaian.

## Status

Rencana dibuat 23 Nov 2026. Tahap 0 sampai 7 selesai di kode dan diuji di DEV pada branch `research/peta-alur-penilaian`. Tahap 8 sebagian: `npm run check` 0 error dengan 5 peringatan lama, 22 tes lolos, `npm run build` berhasil, dan 8 dari 8 penguji SQL lolos di DEV. Yang belum: uji dua akun untuk konflik dan Realtime belum diulang setelah Fase 4, isi byte PDF unduhan belum dibandingkan dengan baseline, dan **deploy branch ini ke PROD belum ada**.

Deploy 24 November pagi memang pernah terjadi, tetapi untuk kode lama, commit `0448100`, bukan untuk branch ini. Migrasi baru branch ini juga belum dipasang di PROD yang masih mencatat 39 migrasi lama. Rincian ada di `docs/STATUS-PRODUKSI-SATU-VERSI.md`. Jangan deploy sebelum migrasi terpasang dan konfirmasi eksplisit diterima.
