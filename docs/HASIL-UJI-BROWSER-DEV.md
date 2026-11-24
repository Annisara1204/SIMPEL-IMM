# Hasil Uji Browser — DEV lokal (24 November 2026)

Dokumen ini mencatat apa yang benar-benar dijalankan dan dilihat di browser. Tidak ada klaim di sini yang berasal dari pembacaan kode saja. Semua uji memakai data simulasi di stack Supabase lokal `http://127.0.0.1:54321` dan Next.js di `http://localhost:3100`. Kredensial uji ada di `HANDOVER.md:472` dan tidak ditulis ulang di sini.

## Lingkungan

- Branch kerja: `research/peta-alur-penilaian`.
- `.env.local` mengarah ke `http://127.0.0.1:54321`, sesuai `HANDOVER.md:472`.
- Stack Supabase lokal sudah hidup sebelum sesi ini; server Next.js dinyalakan dengan `npm run dev -- -p 3100`.
- Alat uji: `agent-browser`, dua sesi browser terpisah bernama `obs-a` dan `obs-b`, ditambah sesi `admin`.
- Kegiatan uji: `Darul Arqam Dasar Simulasi`, 5 peserta, 2 Observer ditugaskan.
- Rute Observasi: `?eventId=a3100000-0000-4000-8000-000000000001&stage=training&materialId=a1b6615f-1f59-4bad-83e1-94527191a7d9&typeId=c02bf6cb-a9f2-479d-914f-06464667de99`.

## Skenario yang dijalankan

| # | Skenario | Hasil | Bukti yang dilihat |
|---|---|---|---|
| 1 | Login Observer A, Observer B, Admin Sistem | Lulus | Ketiganya sampai di `/dashboard`, nama dan role tampil benar |
| 2 | Navigasi Observasi: kegiatan → Pelatihan → Materi umum → Penilaian umum | Lulus | Judul "2. Pelatihan · Materi umum · Penilaian umum", 5 kartu peserta |
| 3 | Status Realtime saat halaman dibuka | Lulus | Teks "Realtime tersambung" tampil di Observer A dan B |
| 4 | Observer A mengubah skor Peserta Simulasi 03 menjadi 4 | Lulus | Status sel berubah menjadi "Tersimpan · 13.52.13" setelah jeda 700 ms |
| 5 | Observer B melihat perubahan A tanpa refresh | Lulus | Panel "Penilaian observer lain (1) · Observer A · Draft · Skor 4" muncul di sel yang sama |
| 6 | Nilai Observer B tetap independen | Lulus | `<select>` milik B tetap pada "Belum dinilai" setelah A menyimpan skor |
| 7 | Observer A menekan "Kirim penilaian peserta ini" | Lulus | Pesan "Penilaian peserta ini telah dikirim"; setelah refresh otomatis, status berubah menjadi "Submitted. 1 dari 2 observer mengirim penilaian" |
| 8 | Observer B melihat status kirim A tanpa refresh | Lulus | Panel rekan berubah menjadi "Observer A · Sudah kirim · Skor 4" |
| 9 | Halaman Evaluasi Kolektif sebagai Admin | Lulus | Halaman merender, rekap indikator tampil, tombol-tombol aksi aktif |
| 10 | Tombol aksi akhir di halaman Evaluasi | Terkonfirmasi | Enam tombol: "Finalisasi semua materi yang siap", "Simpan draf evaluasi", "Buat atau perbarui draf rekomendasi", "Finalisasi dan simpan snapshot", "Setujui, finalisasi, terbitkan, dan unduh rapor". Tiga di antaranya adalah jalur finalisasi/publikasi dan semuanya tidak disabled |

## Temuan yang terbukti di runtime

**Dua rumus skor benar-benar berbeda.** Untuk skor 4 pada Peserta Simulasi 03:

- Pratinjau di halaman Observasi: **75.00 / 100**, dengan kategori "Baik".
- Halaman Evaluasi Kolektif: **80.00 / 100**, dengan baris aspek "4.00 / 5 · 80.0 / 100".

Ini sesuai kontradiksi K2 di `docs/ALUR-PENILAIAN-KANONIK.md`. Sumbernya `lib/scoring.ts:72` dan `lib/phase6-scoring.ts:280`.

**Panel rekan benar-benar update lewat Realtime**, bukan lewat refresh halaman. Observer B tidak menyentuh tombol muat ulang antara langkah 4 dan langkah 8.

**Tombol finalisasi ganda benar-benar tersedia bersamaan** di satu halaman, bukan hanya di kode.

## Yang belum diuji

Saya sengaja tidak menjalankan ini karena butuh perubahan data, akun, atau izin yang belum diberikan:

- Penyelesaian konflik dua penilai lewat tombol "Muat data terbaru" dan "Pertahankan draf saya".
- Perilaku N/O terhadap coverage sampai ke halaman Evaluasi.
- Klik tombol finalisasi, publikasi, dan ekspor karena akan menulis snapshot dan audit ke DEV.
- RLS lintas peran secara menyeluruh, termasuk IoT dan Peserta. Akun IoT lokal tidak tersedia; akun Peserta belum dibuat.
- Sesi kedaluwarsa saat autosave.
- Build Windows dan deploy produksi.

Uji browser terdahulu di `HANDOVER.md:473-478` mencatat lima skenario koreksi alur sebagai lulus, termasuk satu klik hingga unduh PDF. Itu bukan hasil dari sesi ini dan belum saya ulangi.

## Catatan kerja

`next-env.d.ts` berubah otomatis saat dev server dinyalakan. Itu perilaku Next.js, bukan perubahan kode yang disengaja.
