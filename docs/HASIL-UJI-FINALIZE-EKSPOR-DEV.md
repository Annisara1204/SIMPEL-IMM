# Hasil Uji Finalize, Publish, dan Ekspor di DEV

Tanggal: 24 November 2026. Lingkungan: Supabase lokal `127.0.0.1:54322`, Next.js `localhost:3100` pada branch `research/peta-alur-penilaian`. Akun yang dipakai: `admin@dev.local` dan `kader@dev.local`. Semua data adalah simulasi. Tidak ada deploy atau penulisan ke produksi.

## Uji satu klik

Peserta Simulasi 03 dipilih karena agregatnya siap dan belum punya evaluasi. Di halaman Evaluasi Kolektif, keputusan diisi `Lulus` dan alasan diisi teks lebih dari 10 karakter, lalu tombol **"Setujui, finalisasi, terbitkan, dan unduh rapor"** diklik.

Hasil:

- Redirect ke `/dashboard/laporan?eventId=...&snapshotId=...&published=1`.
- Snapshot baru `39d48a66-9f46-459a-a906-be6cc14ad7d3` dibuat untuk Peserta Simulasi 03 dengan revisi 1 dan status `ready_for_collective_evaluation`.
- Baris publikasi dibuat; `published_by` = `b0fc2e0f-...`, yaitu akun Admin Dev.
- Satu baris audit `individual_pdf` tercatat.

Ini membuktikan rantai setuju → finalisasi → publikasi → unduh PDF masih bekerja setelah perubahan Fase 2 sampai 4.

## Uji ekspor

Tombol-tombol berikut diklik di halaman Laporan dan hasilnya diperiksa lewat tabel `assessment_export_audit`:

| Tombol | `export_type` | Hasil |
|---|---|---|
| PDF per baris rapor Published | `individual_pdf` | 3 baris total, termasuk dari tombol satu klik |
| Unduh semua 2 rapor Published (ZIP) | `bulk_pdf` | 1 baris |
| Excel rekap peserta | `assessment_excel` | 1 baris |
| Excel rekap per materi | `assessment_excel` | 1 baris |
| Excel evaluasi akhir | `assessment_excel` | 1 baris |
| Excel internal Observer | `observer_excel` | 1 baris |
| PDF laporan kegiatan | `event_report_pdf` | 1 baris |

Tidak ada teks "gagal" pada halaman setelah ekspor. Unduhan file tidak diperiksa isinya, hanya audit dan respons halaman.

## Uji tampilan Kader

Akun Kader membuka Laporan. Rekap tampil, tombol Terbit tidak ada, panel "Ekspor dan laporan" tidak ada. Klik Server Action ekspor tetap ditolak di server sesuai pengujian kode Fase 3a, tetapi tidak dicoba ulang lewat browser pada sesi ini.

## Data simulasi yang dibuat

- Satu evaluasi final dan snapshot untuk Peserta Simulasi 03.
- Satu publikasi rapor untuk snapshot itu.
- Sembilan baris audit ekspor selama sesi ini, termasuk `individual_pdf` dari tombol satu klik.

Data ini hanya ada di DEV. Tidak ada snapshot, publikasi, atau akun Peserta yang dibuat di produksi.

## Yang belum diuji

- Gate publish terhadap snapshot provisional lewat klik UI. Pengujian ini sudah dilakukan lewat `supabase/tests/rpc_contract_behavior.sql`.
- Isi byte PDF hasil unduhan dibandingkan dengan baseline. Hanya struktur PDF dan ZIP yang diuji oleh `tests/phase7-files.test.ts`.
- Alur akun Peserta. Tetap ditunda karena pemilik memilih IP tanpa TLS.
- Uji dua akun untuk konflik dan Realtime belum diulang setelah Fase 4.
