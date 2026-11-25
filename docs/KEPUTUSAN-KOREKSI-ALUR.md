# Keputusan Koreksi Alur (23 November 2026)

Dokumen ini mencatat keputusan pemilik atas koreksi alur dari catatan teman pemilik. Keputusan ini mengubah sebagian rancangan di `BLUEPRINT.md`. Koreksi sudah diimplementasikan, diuji di DEV, dan **di-deploy ke produksi 24–25 November 2026**. Otoritas status ada di `docs/STATUS-PRODUKSI-SATU-VERSI.md`, dan pemetaan keputusan ke produk ada di `docs/MATRIKS-KEPUTUSAN-PRODUK.md`.

## Latar belakang

Catatan tangan berisi lima koreksi: rekomendasi per peserta bukan per materi, cara input nilai tidak diubah hanya tampilannya, data dari dua penilai harus saling update dan muncul, tampilan rapor kurang rapi, serta tahapan baru Observer → Instruktur → ekspor rapor dengan satu tombol Finalisasi.

## Keputusan

### 1. Sinkronisasi antar penilai

- Yang tersinkron adalah **tampilan**, bukan nilai.
- Saat penilai A menekan Kirim, penilai B langsung melihat status dan nilai A secara baca-saja.
- Nilai A **tidak menimpa** nilai B. Keputusan Phase 5 di `BLUEPRINT.md:29` tetap berlaku.
- Tidak ada perubahan tabel, constraint unik, atau aturan tulis di basis data.
- Tidak boleh menambah `router.refresh()` pada autosave, karena berisiko memulihkan masalah Disk IO yang sudah diperbaiki.

### 2. Pelaku persetujuan dan finalisasi

- Admin Sistem dan empat subrole koordinator Instruktur: **MoT, Vice MoT, Master Observer, Vice Observer**.
- IoT dan Vice IoT tetap tidak diberi akses nilai, sesuai `BLUEPRINT.md:163`.
- Kata "Instruktur" dalam catatan teman pemilik diartikan sebagai keempat subrole koordinator ini.

### 3. Unit rekomendasi

- Satu rekomendasi **per peserta per jenis penilaian**, bukan satu per indikator dan cakupan.
- Ini menggantikan lebih dari satu draf rekomendasi yang sekarang bisa muncul untuk satu peserta.
- Unit ini konsisten dengan keputusan 13 Nov bahwa evaluasi, snapshot, dan publikasi berlaku per jenis penilaian.

### 4. Aksi setelah menyetujui

- Satu klik: **setuju → finalisasi → publikasi → unduh PDF rapor per peserta**.
- konfirmasi publikasi terpisah dihapus dari alur ini.
- Risiko yang harus dimitigasi: setiap sub-aksi tetap dicatat di tabel audit, dan tombol baru muncul bila gate finalisasi terpenuhi (coverage tiap aspek minimal 80%, total bobot 100%, moderasi selesai, alasan keputusan terisi).

### 5. Finalisasi semua materi

- Satu tombol "Finalisasi semua" yang lebih dulu mengecek apakah semua materi dan jenis penilaian sudah punya evaluasi.
- Tombol lalu menjalankan finalisasi tiap jenis secara berurutan.
- Snapshot dan rapor **tetap per jenis**, seperti desain sekarang. Tidak ada snapshot gabungan lintas materi.
- Bila ada jenis yang belum siap, tampilkan daftar jenis tersebut dan alasannya.

### 6. Tampilan rapor

- Halaman web dirapikan: blok naratif dilipat, metrik diringkas, tombol ekspor dikelompokkan.
- **Isi PDF resmi tidak diubah.** Web dan PDF memang memakai snapshot yang sama, jadi perubahan dibatasi pada sisi tampilan web.

### 7. Input nilai

- Cara input tidak diubah. Yang diperbarui hanya tampilan.
- Debounce autosave 700 ms, draf localStorage, revisi dan konflik, status Tersimpan, tombol Kirim/Buka kembali, serta `router.refresh()` setelah perubahan status tetap dipertahankan.

### 8. Arti "RPF"

- Yang dimaksud adalah **PDF rapor per peserta** (`individual_pdf`), bukan ZIP massal dan bukan laporan kegiatan.

## Dampak pada dokumen lama

| Bagian `BLUEPRINT.md` | Perlakuan |
|---|---|
| `:29` nilai independen per penilai | Dipertahankan, diperkuat oleh keputusan 1 |
| `:48` nilai resmi setelah semua penilai selesai | Masih terbuka, lihat bawah |
| `:56` moderasi oleh koordinator | Sesuai keputusan 2 |
| `:61` rekomendasi per indikator dan perlu persetujuan | Diubah oleh keputusan 3 dan 4 |
| `:66-71` publikasi eksplisit dan audit | Diubah oleh keputusan 4, audit tetap wajib |
| `:139,163` IoT tidak melihat nilai peserta | Dipertahankan |

## Keputusan lanjutan Tahap 0 (23 Nov 2026)

- **Gate submit:** bukan syarat keras. Tampilkan daftar penilai yang belum submit sebagai peringatan. Gate finalisasi tetap coverage 80% per aspek. Pertimbangan: 21 draf sejak 14 Nov akan memblokir finalisasi bila dijadikan syarat.
- **Rekomendasi manual:** dihapus. Hanya rekomendasi otomatis yang dipakai, lalu koordinator menyetujui atau menyunting teksnya.
- **Isi rekomendasi otomatis:** semua indikator dengan rata-rata di bawah 3/5 tetap disebut, tetapi angka rata-rata tidak ditulis. Teks berupa saran latihan umum per aspek.
- **Blok rapor web yang dilipat:** Kekuatan, Area pengembangan, Rekomendasi, dan Alasan keputusan. Identitas, nilai akhir, rekap aspek, dan keputusan tetap tampil. Isi PDF tidak berubah.

## Status implementasi

Semua keputusan sudah lengkap, diimplementasikan, diuji di DEV, dan di-deploy ke produksi 24–25 November 2026. Kode aktif terakhir ada di `docs/STATUS-PRODUKSI-SATU-VERSI.md`. Deploy 24 November pagi untuk `0448100` adalah riwayat kode lama. Rincian kerja ada di `RENCANA-IMPLEMENTASI-KOREKSI-ALUR.md`, dan pemetaan keputusan ke produk ada di `docs/MATRIKS-KEPUTUSAN-PRODUK.md`.
