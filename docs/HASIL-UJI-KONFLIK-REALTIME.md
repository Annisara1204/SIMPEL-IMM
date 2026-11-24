# Hasil Uji Konflik Dua Penilai dan Realtime

Tanggal: 24 November 2026. Uji konflik dan Realtime dilakukan di DEV dengan data simulasi. Perbaikan policy agar panel rekan tampil dipasang di DEV dan produksi dengan backup masing-masing: `pre-rls-fix-20261124-182946.sql` dan `pre-peer-read-20261124-184138.sql`.

## Realtime

- Dua sesi browser Observer A dan B membuka rubrik yang sama pada Peserta Simulasi 05. Keduanya menampilkan "Realtime tersambung".
- A mengubah skor menjadi 4, lalu 5. B melihat panel "Penilaian observer lain (1) · Observer A · Draft · Skor 4", lalu berubah menjadi "Skor 5" tanpa refresh halaman.
- Panel hanya membaca. Nilai B tetap independen dan tidak ikut berubah.

## Konflik dua penilai

Konflik dibuat dengan cara memberi B draf lokal, lalu menaikkan revisi nilai di server sebelum autosave B selesai.

- Panel "Konflik di perangkat Anda" muncul dengan keterangan "Nilai server: 2; versi 3".
- Tombol "Muat data terbaru": nilai B berubah mengikuti server, konflik hilang.
- Tombol "Pertahankan draf saya": draf B dikirim ulang dengan revisi baru; server menyimpan nilai 5 revisi 5, konflik hilang.
- Tidak ada perubahan permanen dari prosedur uji selain data simulasi di DEV.

## Regresi yang ditemukan dan diperbaiki

Setelah pengerasan RLS sebelumnya, Observer hanya bisa membaca barisnya sendiri, sehingga panel "Penilaian observer lain" hilang. Ini bertentangan dengan aturan bahwa Observer yang ditugaskan boleh melihat nilai rekan secara baca-saja.

Migrasi `20261124160000_observer_peer_read_v1.sql` menambah helper `can_read_observation_peer(uuid)` dan cabang pada policy SELECT untuk submission, rating, revisi, catatan, dan observasi. Helper hanya bernilai benar untuk akun ber-role `observer` pada peserta yang terjangkau. IoT dan Instruktur non-koordinator tetap tidak mendapat akses baca melalui cabang ini.

## Verifikasi produksi

- Backup `pre-peer-read-20261124-184138.sql` dibuat sebelum migrasi.
- Migrasi `20261124160000` terpasang di produksi.
- Dengan JWT Observer produksi yang memiliki data, query sebagai peran `authenticated` melihat 2.739 rating, 228 submission, dan 2 catatan, sesuai hak Observer yang ditugaskan.
- Kader tetap tidak bisa membaca tabel snapshot atau `snapshot_data`; hasil uji sebelumnya di `docs/HASIL-UJI-RLS-PROD.md` masih berlaku.
- Tidak ada akun IoT produksi yang bisa dipakai. Hak IoT sudah diuji di DEV: 0 baris data evaluasi, tetapi tetap bisa mengisi Observasi.

## Yang belum

- Uji konflik dan Realtime belum diulang di produksi karena akan menulis nilai ke data trial. Mekanismenya identik dengan DEV dan Realtime production sudah terverifikasi tersambung pada uji browser sebelumnya.
- Tidak ada pengujian dengan dua perangkat fisik; dua sesi browser terpisah dipakai sebagai pengganti.
