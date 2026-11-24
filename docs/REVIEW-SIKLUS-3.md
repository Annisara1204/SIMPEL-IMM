# Review Siklus 3 — Rencana Implementasi Keputusan

Arsip penilaian reviewer terhadap rencana siklus 3. Tidak ada kode, migrasi, atau data yang diubah.

## Skor dan arah

| Reviewer | Skor | Arah |
|---|---|---|
| Kelayakan | 7/10 | Bisa dijalankan dengan pendampingan setelah tiga MAJOR: format tiga tanda tangan, perintah PowerShell di rencana utama, ringkasan pemula menyebut tindakan pemilik |
| Keamanan | blocker + 6 MAJOR | Tidak aman apa adanya; wajib: bukti server `must_change_password`, predicate publish konkret, retensi vs FK, sumber `target_commissariat_id` |
| Teknis | 6/10 teknis, 6/10 penutupan blocker | Perlu satu siklus revisi; 9 dari 12 blocker siklus 2 tertutup, tiga masih nyata |

## Blocker yang harus ditutup

1. **`must_change_password` bisa diclear tanpa bukti** (`RENCANA:105`, `revisi-siklus2-b:47`). `clear_my_must_change_password()` hanya cek `auth.uid()` pada baris aktif. Peserta bisa clear flag lalu ambil rapor tanpa mengganti sandi. Perlu bukti server, misalnya `auth.users.updated_at` lebih baru dari waktu penautan atau kolom `password_changed_at`.
2. **Server write `finalized` ditolak trigger untuk Moderator** (`RENCANA:82`; trigger `20261111160000:136-138`). Trigger hanya mengizinkan `admin_system`, sementara pemanggil `finalize_collective_evaluation` adalah `requireModerator` yang menerima empat subrole koordinator. Finalisasi koordinator akan 42501.
3. **"Snapshot provisional tetap tersimpan" bertentangan dengan gate keras** (`RENCANA:146` vs `20261113120000:19-21,34-40`). Rencana tidak memerintahkan mengubah dua gate itu, jadi provisional tidak bisa dibuat. Perlu keputusan: longgarkan gate pembuatan snapshot menjadi peringatan sementara publish tetap keras, atau hapus klaim provisional tersimpan.
4. **IoT lewat RLS masih nyata menurut reviewer teknis** walaupun reviewer keamanan menilai sudah tertutup di policy lain. Perlu uji REST langsung dan pastikan perbaikan `can_access_observation` tidak memutus hak tulis Observasi semua subrole (`20261111160000:79,82,88,90,98,100`).
5. **RPC agregat publik dihapus, bukan diimplementasi** (`RENCANA:103`). Keputusan 6 tetap mensyaratkan ambang 10 di query/RPC sebelum data sampai ke halaman publik; belum ada pengganti.

## Major yang perlu dirapikan

- Deadlock Fase 0: 0b harus dijalankan sebelum gate keluar Fase 0, bukan sesudahnya; 0b perlu gate masuk/keluar sendiri.
- `tests/scoring.test.ts` baru tidak masuk `package.json` `test:phase6`, jadi gate "uji scoring hijau" tidak bisa diverifikasi.
- `participants.commissariat_id uuid` sudah ada dan `NOT NULL` sejak `20261029050000_participant_profiles.sql:3,22`; perintah `add column ... on delete set null` menjadi no-op. Perlu gate backfill 100% dan aturan data tak cocok.
- `target_commissariat_id` dipakai RPC bersignature `(uuid)` tanpa sumber; harus dari `current_commissariat_id()`.
- Helper moderator di `app/dashboard/layout.tsx:18-33` tidak punya konteks `event_id`; perlu sumber event.
- Rentang hapus di 2d menyisakan cek Admin `:384-388` dan `return error` `:420-423` dengan variabel tak terdefinisi.
- Kader masih bisa membaca `snapshot_data` lewat policy `assessment_snapshots_read_authorized` (`20261112170000:306`) dan `get_event_report_rows`; perlu putusan tertulis.
- Retensi `participants` tertahan FK `on delete restrict` pada snapshot, publikasi, dan audit; perlu aturan skip/arsip.
- `set search_path=''` belum dicantumkan pada helper akses Peserta.
- `auditReportExport` di `app/dashboard/laporan/actions.ts:78` masih memasukkan `bidang_kader` meski RPC akan menolak.
- Fase 0b mencantumkan enam butir kritis padahal daftar kritis hanya lima; butir 11 (monitoring) tidak ada di tabel 0b.
- Sumber ambang coverage: RPC membaca `assessment_scoring_policies.minimum_coverage`, bukan konstanta di `lib/phase6-scoring.ts`.

## Minor

Hitungan penguji SQL masih tujuh padahal ada berkas kedelapan; "tiga pemanggil publish" sebenarnya dua; format tiga tanda tangan belum ada di matriks; perintah PowerShell hanya ada di berkas revisi; ringkasan pemula belum menyebut tindakan pemilik; `[TERBUKA-8` masih tercantum walau tertutup; daftar terbuka perlu dirapikan; bukti 14 butir menampilkan nilai harapan seolah hasil; konvensi bukti folder belum dibuat; aturan prioritas antarberkas revisi belum ditulis; rotasi kunci belum disinkronkan ke cron backup; uji anon belum mencakup RPC baru; uji IoT belum mencakup `get_event_assessment_summary`; uji REST `/rest/v1/participant_access` belum ada.
