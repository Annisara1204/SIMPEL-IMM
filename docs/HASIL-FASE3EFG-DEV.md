# Hasil Fase 3e–3g di DEV

Tanggal: 24 November 2026. Branch: `research/peta-alur-penilaian`. Data simulasi di Supabase lokal dan Next.js `localhost:3100`. Tidak ada deploy atau penulisan ke produksi.

## Yang diubah

- **3e:** migrasi `20261124120000` membuat `get_public_event_aggregate(uuid)` dengan `security definer set search_path=''`, hanya dari publikasi dan snapshot `ready_for_collective_evaluation`, agregasi dua tahap, ambang 10, tanpa identitas. Satu-satunya grant anon baru. Menambah `participants.archived_at` dan tabel arsip `retention_identity_archives`.
- **3e:** `app/page.tsx` tidak lagi memakai panel simulasi. Halaman publik membaca RPC agregat dan menampilkan "data belum tersedia" bila agregat kosong atau RPC gagal.
- **3e:** `docs/PROSEDUR-RETENSI-DATA-V1.md`, `scripts/retention-dry-run.sql`, dan `scripts/retention-apply.sql` ditulis. Tidak ada penghapusan data yang dijalankan.
- **3f:** ditemukan bug nyata pada batas 500 baris impor. Opsi `sheetRows: maxRows + 1` membuat `xlsx` memotong lembar menjadi 501 baris sebelum validasi, sehingga berkas 600 baris diterima dengan 99 baris hilang. Opsi itu dihapus di `app/dashboard/impor-tes/actions.ts`. Rincian ada di `docs/HASIL-FASE3F-DEV.md`.
- **3g:** migrasi `20261124124500` menambah `is_trial` pada `competency_frameworks` dan `rubric_versions`. Halaman Kerangka DAD dan Pengaturan Penilaian menampilkan `PERCOBAAN` atau `RESMI`.
- **Prasarana tambahan:** migrasi `20261124130000` membuat tabel `participant_access` tanpa akun, kredensial, atau RPC. Fase 3d tetap ditunda karena pemilik memakai IP tanpa TLS. Tabel ini diperlukan prosedur retensi.
- `.env.example` mendapat `NEXT_PUBLIC_PUBLIC_AGGREGATE_EVENT_ID`.

## Verifikasi

- `npm run check`: 0 error, 5 peringatan lama, 22 tes lolos.
- `npm run build`: berhasil.
- Tiga migrasi baru dipasang di DEV.
- 8 dari 8 penguji SQL lolos.
- Dry-run retensi berhasil: jumlah snapshot, publikasi, kedua audit, evaluasi, `participant_access`, peserta, dan hasil tes sebelum sama dengan sesudah simulasi; gate `aman = true`; transaksi di-`rollback`.
- RPC agregat dipanggil sebagai `anon`: hanya 1 peserta yang punya rapor Published, sehingga `groups=null`. Sesuai ambang 10.
- Halaman publik menampilkan "data belum tersedia" dan tidak menampilkan identitas atau nilai individu.
- Halaman Kerangka DAD menampilkan `v1 · trial · PERCOBAAN`.

## Yang belum diverifikasi

- Uji impor `.xlsx` lewat browser setelah perbaikan batas 500 baris. Bukti yang ada berupa percobaan lokal pada pustaka `xlsx` dan pembacaan kode.
- `scripts/retention-apply.sql` belum dijalankan. Hanya dry-run yang diuji.
- Rapor peserta dan akun Peserta masih tidak tersedia karena keputusan IP tanpa TLS.
- Uji RLS lintas peran penuh dan uji dua akun untuk konflik serta Realtime belum diulang setelah Fase 3e–3g.
- `NEXT_PUBLIC_PUBLIC_AGGREGATE_EVENT_ID` perlu diisi di lingkungan produksi bila halaman publik ingin menampilkan agregat.
