# Hasil Fase 2 di DEV

Tanggal: 24 November 2026. Branch: `research/peta-alur-penilaian`. Pekerjaan memakai data simulasi di stack Supabase lokal `127.0.0.1:54322` dan Next.js `localhost:3100`. Tidak ada deploy atau penulisan ke produksi.

## Yang diubah

- `lib/scoring.ts`: konversi skor 1–5 ke 0–100 memakai `(skor/5)*100`. Skor 4 kini 80, skor 3 kini 60, skor 3.5 kini 70. Kategori tidak diubah.
- `lib/phase6-scoring.ts`: N/O dibuang dari denominator coverage. Indikator yang berskor tetapi juga memiliki N/O tetap dihitung. `AspectAggregate` punya field `coverageDenominator`, dipakai pada teks alasan.
- `tests/scoring.test.ts` baru dan `tests/phase6-scoring.test.ts` ditulis ulang dengan enam kasus coverage. `package.json` `test:phase6` memuat tiga berkas uji.
- `app/dashboard/penilaian/assessment-actions.ts`: blok finalisasi lama dihapus; tipe status action menjadi `submitted | draft`.
- `app/dashboard/observasi/submission-controls.tsx`: tombol finalisasi Admin dihapus; teks penghitung menjadi informasi, bukan penolakan.
- Format tampilan satu angka desimal di Observasi, Evaluasi, komponen hasil, workspace laporan, dan generator PDF. `snapshot_data` tetap menyimpan dua angka desimal.
- Tiga migrasi baru: `20261124100000` memberi izin `is_assessment_moderator` menulis status `finalized`; `20261124101000` memakai `max(revision)+1`; `20261124102000` menimpa `publish_assessment_report` dengan gate keras tanpa `bidang_kader`.
- `supabase/tests/rpc_contract_behavior.sql` baru, read-only, menguji signature delapan argumen, `P0002`, dan gate publish.

## Verifikasi otomatis

- `npm run check`: exit 0, 0 error, 5 peringatan lama, 22 tes lolos.
- `npm run build`: berhasil.
- Tiga migrasi dipasang di DEV lokal tanpa error.
- 8 dari 8 penguji SQL lolos, termasuk penguji kontrak baru. Penguji kontrak memakai profil yang sudah ada sebagai aktor dan seluruh fixture di-`rollback`; tidak membaca `auth.users` karena `service_role` tidak punya hak itu di stack lokal.

## Verifikasi browser

- Observer A membuka Observasi untuk Peserta Simulasi 03 dengan skor 4. Pratinjau menampilkan **80.0 / 100** dan kategori **Baik**.
- Halaman Evaluasi Kolektif untuk peserta yang sama menampilkan **Skor agregat 80.0 / 100**.
- Status kirim masih tampil sebagai "Submitted. 1 dari 2 observer mengirim penilaian (informasi; tidak menghalangi finalisasi)" dengan tombol "Buka kembali untuk revisi".
- Tombol finalisasi Admin tidak lagi ada di kartu peserta Observasi.

## Yang belum diverifikasi

- Perilaku N/O sampai halaman Evaluasi dengan data nyata di browser. Baru terbukti di unit test dan penguji SQL.
- Klik finalize/publish/ekspor di browser. Gate publish sudah diuji lewat SQL, bukan alur klik.
- RLS lintas peran setelah migrasi baru. Penguji SQL memeriksa struktur dan kontrak RPC, bukan seluruh matriks peran.
- Uji dua akun untuk konflik dan Realtime belum diulang setelah perubahan Fase 2.

Tidak ada snapshot, publikasi, atau akun Peserta yang dibuat selama verifikasi ini.
