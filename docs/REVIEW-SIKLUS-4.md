# Review Siklus 4 — Rencana Implementasi Keputusan

Arsip penilaian reviewer terhadap rencana siklus 4. Tidak ada kode, migrasi, atau data yang diubah.

## Skor

| Reviewer | Skor | Putusan |
|---|---|---|
| Kelayakan pemilik | 9/10 | LAYAK dengan pendampingan; tidak ada BLOCKER/MAJOR |
| Teknis | 7/10 | Perlu satu siklus lagi; 13 dari 14 blocker siklus 3 tertutup |
| Keamanan | 4/10 | Tidak aman apa adanya; dua BLOCKER dan lima MAJOR |

## BLOCKER keamanan

1. `get_event_report_summary_for_kader` hanya di-`grant authenticated`, tanpa cek peran di dalam fungsi. IoT adalah `instruktur` dengan posisi `iot` (`lib/instructor-roles.ts:15`), sehingga bisa memanggil RPC itu dan membaca `participant_id`, `display_name`, `overall_score`, dan `graduation_decision`. Rencana `RENCANA:119`.
2. Semua policy SELECT di `20261111160000:76-77,87-88,101-104`, `20261111100000:184-186`, `20261029070000:138,140` diusulkan diubah ke `can_review_observation`, yang hanya true untuk admin/moderator. Observer biasa kehilangan akses membaca submission, rating, revisi, dan catatannya sendiri. Bertentangan dengan gate `RENCANA:188`. Rencana `RENCANA:111`.

## MAJOR keamanan

3. Bukti `must_change_password` memakai proksi `auth.users.updated_at`; `updateUser({data:...})` bisa menaikkannya tanpa mengganti sandi. `RENCANA:115`.
4. `observer_note_revisions_read_assigned` (`20261111100000:214-217`) tidak masuk daftar perubahan policy dan masih memakai `can_access_observation`, sehingga IoT bisa membaca riwayat catatan privat. `RENCANA:111`.
5. Predicate publish memakai `policy_minimum`, `snapshot_payload`, `snapshot_rubrics`, `rationale_text` tanpa deklarasi atau pengambilan nilai di `declare` (`20261113130000:6-9`). RPC gagal kompilasi. `RENCANA:83-99`.
6. Retensi tidak mencantumkan `participant_access`; FK `participant_id` default `NO ACTION` menggagalkan DELETE atau membuat retensi parsial. `RENCANA:115,117`.
7. Cabang `bidang_kader` pada `collective_evaluation_revisions_read_authorized` (`20261112170000:243-244`) tidak dihapus, sehingga Kader masih membaca `decision_rationale`, `discussion_notes`, `strengths`, `development_areas`. `RENCANA:119`.

## MAJOR teknis

1. Filter agregat publik ditulis `snapshot_data->overall->status`; kunci tanpa tanda kutip dibaca sebagai kolom. Harus `snapshot_data->'overall'->>'status'`. `RENCANA:121`.
2. Deklarasi variabel predicate publish hilang karena aturan prioritas rencana utama mengalahkan `revisi-siklus3-b.md:35`. Sama dengan MAJOR keamanan 5.
3. Kontradiksi `[TERBUKA-12]`: `RENCANA:211` menyatakan Opsi B belum aktif sebelum tanda tangan, `:212` menyatakan tidak lagi di daftar terbuka, gate `:71` mensyaratkan Opsi B aktif.
4. `revisi-siklus3-b.md:30-34` masih memerintahkan migrasi penandaan snapshot provisional, bertentangan dengan `RENCANA:7,83`. Perlu ditandai kedaluwarsa walaupun aturan prioritas sudah menyelamatkan eksekusi.

## Minor yang perlu dirapikan

Urutan tanda tangan di `RENCANA:36` versus `:38`; tanggal pengisian statis di `:145` dipakai ulang untuk Fase 6; TERBUKA-3 tidak punya gate; helper tulis harus mempertahankan cabang Admin (`20261111160000:84-85`); kolom `archived_at` harus disebut sebagai kolom baru; TERBUKA-2 sinkron dengan desain agregat; butir 11 muncul di dua lingkup tanda tangan; gate publish provisional bersifat defensif; pemanggil publish sebenarnya `evaluasi/actions.ts:854`; entri "Tertutup" dipindah dari daftar terbuka; uji IoT tambahan `get_instructor_dashboard_results` (`20261106180000:51-77`); `has_active_participant_access` bisa dipanggil untuk UUID orang lain; cek moderasi `any('{}')` selalu false pada array kosong.
