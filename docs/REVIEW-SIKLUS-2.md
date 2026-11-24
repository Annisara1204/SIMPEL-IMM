# Review Siklus 2 — Rencana Implementasi Keputusan

Arsip penilaian reviewer terhadap rencana siklus 2 di `docs/RENCANA-IMPLEMENTASI-KEPUTUSAN.md`. Tidak ada kode, migrasi, atau data yang diubah.

## Skor

| Reviewer | Skor | Kesimpulan |
|---|---|---|
| Teknis dan penutupan blocker | 6/10 teknis, 7/10 penutupan blocker | 9 dari 11 blocker siklus 1 tertutup; dua blocker nyata tersisa: IoT lewat RLS dan ekspor Kader lewat RPC |
| Keamanan dan privasi | 5/10 | IoT masih bisa lewat policy lain; publish hasil provisional belum diblokir; smoke memakai HTTP |
| Kelayakan eksekusi | 6/10 | Urutan backup dan uji PROD sudah benar; deadlock Fase 0: enam butir kritis wajib "sudah" tetapi tidak ada fase yang boleh memperbaikinya |

## Blocker dan temuan utama

1. IoT masih bisa mengambil `participants` lewat policy `participants_read_assigned_instructor` (`20261106200000_instructor_assessment_and_change_history.sql:24-25`) yang memakai `is_assigned_instructor_for_event` (`20261106180000_dashboard_results_categories_instructor_role.sql:31-40`). Mengubah `can_access_observation` saja tidak cukup. Uji harus REST langsung ke tabel.
2. Publish bisa menerima snapshot `provisional` karena `publish_assessment_report` hanya mengecek `collective_evaluations.status='finalized'` (`20261113130000:15-18`). Pelonggaran coverage/moderasi belum dibarengi penandaan yang memblokir publish. Ini berbenturan dengan instruksi "guard aplikasi jangan terlalu ketat" dan perlu keputusan pemilik.
3. Frasa "selisih 2 poin jadi peringatan" kontradiktif dengan daftar gate integritas yang tetap keras (`20261113120000:26-33`). Hapus dari pelonggaran.
4. Ekspor Kader masih diizinkan oleh RPC `record_assessment_export` (`20261112180000:192-197`). Perlu `create or replace` di migrasi baru, bukan hanya hapus daftar di UI.
5. Deadlock Fase 0: gate keluar mensyaratkan `disable_signup`, grant anon dicabut, rotasi kunci, `npm audit`, TLS, dan salinan `auth` berstatus "sudah", tetapi Fase 0 read-only dan Fase 1-4 di DEV. Perlu fase remediasi berizin atau pengecualian eksplisit.
6. Smoke test memakai `http://43.173.33.195:8080/` untuk login QA, padahal gate TLS aktif. Perlu HTTPS domain atau 8080 hanya untuk cek non-kredensial.
7. `get_public_event_aggregate(uuid)` tidak ada di repo; `app/page.tsx:9` hanya merender `DashboardContent`. Gate anon tidak bisa diverifikasi.
8. `participants.commissariat` bertipe `text` (`20261029010000:5`), tetapi `current_commissariat_id()` dan `is_commissariat_member()` memakai `uuid` (`20261029100000:59-67`). Filter RPC tidak akan compile tanpa cast atau kolom baru.
9. `account_user_id` tidak dicabut saat akses expired/revoked; policy lama masih bisa membaca tabel lewat REST meski RPC rapor gagal.
10. Tipe status di `submission-controls.tsx:17,25` dipersempit, tetapi Opsi B mempertahankan "Finalized"; kontrak akan gagal build sampai A/B diputus.
11. Join `participant_access` belum mengikat `pa.participant_id = p.id`, sehingga satu akses aktif bisa membuka rapor peserta lain.
12. Rincian lain: penandatangan matriks menggantung, Fase 6 belum memuat `MATRIKS-RPC-AKSES.md` dan `INVENTARIS-JALUR-LAMA.md`, ringkasan pemilik melompati Fase 4, perintah server belum dibedakan dari PowerShell, lokasi bukti belum seragam, klausul `security definer` belum disalin ke migrasi baru, dan tiga kasus uji RPT tambahan belum masuk kriteria keluar.

## Keputusan yang diminta sebelum revisi siklus 3

Apakah snapshot berstatus `provisional` boleh diterbitkan menjadi rapor? Reviewer keamanan menyatakan tidak, karena keputusan 3 mensyaratkan coverage 80%, moderasi selesai, dan alasan. Instruksi pemilik 24 November menyatakan guard aplikasi boleh lunak. Jawaban pemilik akan menentukan apakah publish tetap menjadi gate keras atau hanya memberi label provisional pada rapor.
