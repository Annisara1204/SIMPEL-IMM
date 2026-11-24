# Revisi Siklus 2 — Agen C: Fase 2f, Fase 3e, Daftar terbuka

## Catatan penerimaan instruksi 24 November 2026

Menerima instruksi pemilik di `docs/RENCANA-IMPLEMENTASI-KEPUTUSAN.md:7`: gate **aplikasi** (coverage, moderasi, publish, finalisasi) boleh lunak, cukup peringatan dan status `provisional` bila aman. Gate **keamanan dan proses** tetap keras: RLS, grant, filter akses, tanda tangan matriks (`docs/MATRIKS-KEPUTUSAN-PRODUK.md:201-203`), 14 butir verifikasi produksi, backup, rotasi kunci, TLS.

Keputusan publish keras sudah tertulis, jadi bukan `[TERBUKA]`: tambahan 24 November pada keputusan 3 di `docs/MATRIKS-KEPUTUSAN-PRODUK.md:58` menyatakan snapshot `provisional` **tidak boleh diterbitkan** sampai coverage, moderasi, dan alasan terpenuhi. Reviewer siklus 2 menemukan celah ini di `docs/REVIEW-SIKLUS-2.md:16,30`; jawaban pemilik menutupnya. Publish tetap gate keras, berbeda dari peringatan UI.

Dokumen ini hanya mengganti tiga bagian. Rencana utama, kode, migrasi, data, dan produksi tidak disentuh. Tidak ada commit.

---

## Fase 2f — Verifikasi gate Evaluasi (pengganti)

Kriteria tetap **"verifikasi gate lama tidak ada"**, bukan "hanya memakai coverage, moderasi, alasan". Daftar gate di `supabase/migrations/20261113120000_scope_finalize_moderation_to_penilaian_v1.sql`: alasan ≥10 karakter dan enum keputusan `:16-18`; status overall `:19-21`; struktur snapshot/sumber privat `:22-24`; total bobot 99.999–100.001 dan computed overall `:26-33`; coverage per aspek `:34-40`; referensi rating `:41-47`; moderasi `:48-51` dan `:52-67`.

**Gate keras (tidak dilonggarkan):** struktur `:22-24`, bobot dan computed overall `:26-33`, referensi rating `:41-47`. Frasa "selisih 2 poin jadi peringatan" di `docs/RENCANA-IMPLEMENTASI-KEPUTUSAN.md:78` dicabut; `:26-33` tetap menolak bila bobot atau angka keseluruhan tidak sesuai rumus.

**Gate aplikasi lunak:** error di `app/dashboard/evaluasi/actions.ts:652-655` (overall), `:656-666` (moderasi), `:692-698` (keputusan/alasan), `app/dashboard/penilaian/assessment-actions.ts:398-413`, dan tombol di `submission-controls.tsx:76-88` diubah menjadi penandaan `provisional` plus peringatan. Simpan draf tidak ditolak. Moderasi `:48-51` dan `:52-67` disatukan menjadi satu gate: bila `review_status='needs_review'` belum selesai, publish ditolak, tetapi halaman evaluasi tetap menampilkan peringatan dan tidak menolak simpan draf (`MATRIKS...:56,58`).

**Publish keras — gate yang jelas.** Ubah `publish_assessment_report` lewat migrasi baru ber-timestamp > `20261123130000` (definisi `20261113130000_publish_latest_per_evaluation_v1.sql:4-5`, signature persis, `security definer`, `set search_path=''`). Pertahankan evaluasi final `:15-18`, snapshot terbaru per evaluasi `:19-24`, audit `:29-30`; ulangi revoke/grant `20261112180000:103-104`. Sebelum terbit, RPC wajib menolak bila:

- evaluasi tidak `finalized` (`:15-18`);
- `snapshot_data->overall->status <> 'ready_for_collective_evaluation'` (`20261113120000:19-21`), yakni snapshot `provisional`;
- coverage per aspek di bawah ambang (`20261113120000:34-40`, ambang 80% di `lib/phase6-scoring.ts`);
- masih ada `needs_review`/moderasi belum `reviewed` atau `resolved` (`20261113120000:48-51,52-67`);
- keputusan atau alasan <10 karakter (`20261113120000:16-18`).

Gate publish = coverage 80% + moderasi selesai + alasan terpenuhi, semua sebelum terbit. Kolom `published_by` (`20261112180000:14`) dan `actor_id` (`:37`) tetap `auth.uid()` pada `:26-30`. RLS `:19-29,41-49`, grant `:27-29,46-49`, dan trigger immutable tidak diubah. `[TERBUKA butir 9]` hanya untuk rincian tertulis apakah tombol Finalisasi aplikasi ikut dikunci; publish sudah diputus.

**Bedakan dari UI.** Saat coverage/moderasi belum terpenuhi, halaman evaluasi menampilkan peringatan "provisional, belum dapat diterbitkan" dan draf tetap tersimpan. Peringatan itu tidak menulis snapshot dan tidak mengubah status. Penolakan terjadi di RPC publish.

**Uji audit publish (tiga pemanggil, JWT simulasi `@invalid`):** `app/dashboard/evaluasi/actions.ts:853` (pemanggilan RPC), `app/dashboard/laporan/actions.ts:28` (tombol Laporan), dan tombol gabungan `app/dashboard/evaluasi/actions.ts:821-864`. Untuk masing-masing: (a) snapshot `provisional` ditolak; (b) evaluasi non-final ditolak; (c) snapshot final pada coverage 80% + moderasi selesai + alasan ≥10 karakter berhasil, satu baris publikasi `20261112180000:10-29` dan satu baris audit `:31-49`; (d) `published_by` dan `actor_id` sama dengan `auth.uid()` dari JWT. Simpan bukti di `docs/bukti-gate-siklus2/`.

---

## Fase 3e — Retensi dan backup (pengganti)

Gate masuk: Fase 3d selesai dan pemilik menandatangani definisi arsip identitas di `private_payload` (`20261112170000:312-325`) dengan bukti tersimpan; ini **gate masuk, bukan lagi `[TERBUKA butir 4]`**. Tanpa tanda tangan itu prosedur tidak dijalankan. Gate keluar: bukti `count(*)` dry-run per tabel, hash PDF Fase 1 identik, dan uji restore berhasil sebelum Fase 5.

Buat `docs/PROSEDUR-RETENSI-DATA-V1.md`, `scripts/retention-dry-run.sql`, `scripts/retention-apply.sql`.

**Dikecualikan dari delete (diarsipkan):** `assessment_snapshots` (`20261112170000:294-310`), `assessment_snapshot_private_sources` (`:312-325`), `assessment_report_publications` (`20261112180000:10-29`), `assessment_report_publication_audit` (`:31-49`), `assessment_export_audit` (`:51-65`), `observation_revisions` (`20261106200000:65-99`).

**Dihapus atau diarsipkan eksplisit:** `participants` (`20261029010000:15`), `test_results` (`20261029080000:12`), `commissariat_submissions` (`20261029100000:5`), `observer_notes` (`20261111100000:126`), `participant_access` (dibuat Fase 3d). Kandidat baris: `events.ends_on < now() - interval '2 years'`; Surat Mandat `administrative_published` (`20261029100000:252-262`) > 2 tahun; audit `acted_at` (`20261112180000:38`) dan `created_at` (`:57`) > 5 tahun.

**Bukti dry-run wajib** (keluaran `count(*)` sebelum dan sesudah simulasi, disimpan di `docs/bukti-gate-siklus2/retensi-dry-run-<tanggal>.txt`): `participants`, `test_results`, `commissariat_submissions`, `observer_notes`, `participant_access`, dan `public.assessment_snapshots` (sebelum = sesudah, wajib sama). Sertakan `sha256sum` PDF baseline Fase 1 yang identik. Eksekusi nyata: cron 03:20 `/etc/cron.d/imm-retention` setelah backup 03:15 (`HANDOVER.md:334`); dry-run dulu, baru apply.

**Backup PII — format terverifikasi.** Pakai `age` (X25519) atau GPG (`gpg --encrypt --recipient`) untuk dump SQL dan `restic` dengan repositori terenkripsi untuk direktori, atau LUKS untuk media offline. Verifikasi berarti `age -d` / `gpg --decrypt` berhasil dan `restic check` plus restore percobaan exit 0, bukan sekadar "enkripsi at-rest". Kunci berada di luar server, pada workstation Infrastruktur dan satu media offline; tidak di `.env`, tidak di repo. Hapus otomatis: retensi 14 hari (`HANDOVER.md:334`) via `find <direktori> -type f -mtime +14 -delete`, salinan rahasia skema `auth` 30 hari pasca-rotasi; setiap penghapusan dicatat. Akses hanya anggota grup Unix `imm-backup` (Infrastruktur/Keamanan), direktori `chgrp imm-backup` dan `chmod 0770`, dengan log `sudo`. Kriteria restore: dump terdekripsi, `schema_migrations` lengkap, `auth.users` + `auth.identities` ada (`HANDOVER.md:335`), hash `.env.production` cocok, restore exit 0, dan `count(*)` per tabel sama dengan sumber. Uji restore sebelum Fase 5 gate butir 4.

**Agregat publik (terkait `[butir 2]`).** Agregat hanya dihitung dari snapshot final yang sudah punya baris di `assessment_report_publications` (`20261112180000:10-29`), bukan dari snapshot `provisional`. RPC agregat yang dipanggil `app/page.tsx:9` dan pembaca `get_event_report_rows` (`20261112180000:142-156`) wajib memfilter ke snapshot final/Published. Uji sebagai `anon` dengan JWT simulasi: agregat 0 baris bila hanya ada snapshot `provisional`; tabel alur 401/403; tidak ada `participant_id`, `display_name`, `student_number`, `group_name`, atau `snapshot_data`. `grant anon` tidak ditambah.

---

## 6. Daftar terbuka terpusat (pengganti)

1. Format pembulatan angka tampil di Observasi, Evaluasi, dan PDF (`docs/ALUR-PENILAIAN-KANONIK.md:121`). Tidak menghalangi uji angka mentah "3.5 → 70" (Fase 2a); menghalangi uji **tampilan** Observasi/Evaluasi/PDF (Fase 2g, 3f).
2. Definisi "kelompok" untuk ambang 10 dan sumber agregat publik. Menghalangi RPC Fase 3c dan agregat anon di Fase 3e; gate keluar Fase 0.
3. Kewenangan ekspor Bidang Kader. Rujuk Fase 3a; putuskan sebelum Fase 3a.
4. Arsip identitas di `private_payload` (`20261112170000:312-325`). Sekarang **gate masuk Fase 3e**, bukan penunda; tanda tangan pemilik dan bukti wajib sebelum prosedur berjalan.
5. Jalur revisi evaluasi tanpa melanggar status `finalized` dan index unik `(collective_evaluation_id, revision)`. Rujuk Fase 2e.
6. Penanggung jawab penandatanganan matriks dan pemberi izin produksi. Rujuk Fase 0, 5, 6.
7. Filter `target_participant_id` dan aturan empat definisi RPC. Rujuk Fase 4.
8. Nasib status `finalized`: Opsi A hapus dari submission atau Opsi B ditulis server saat finalisasi. Rujuk Fase 2d.
9. Rincian tertulis apakah tombol Finalisasi aplikasi (`evaluasi/actions.ts:821-864`) ikut dikunci. Publish sudah diputus keras di `docs/MATRIKS-KEPUTUSAN-PRODUK.md:58`; yang tersisa hanya gate tombol aplikasi. Rujuk Fase 2f.
10. `expires_at` default untuk akun Peserta; fallback `coalesce(e.ends_on, now()) + interval '30 days'`. Rujuk Fase 3d.
11. Keputusan tertulis revisi RLS bila perlu: policy `participants_read_assigned_instructor` (`20261106200000:24-25`, `20261106180000:31-40`) dan `participants_read_own_published_report` (`20261112180000:8`) serta RLS `participant_access` (Fase 3d). Temuan `docs/REVIEW-SIKLUS-2.md:15,23`. Rujuk Fase 3b, 3d, 5.
