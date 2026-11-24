# Revisi Akhir Siklus 5 — Konsolidasi dua review penutup

Teks siap disalin ke `docs/RENCANA-IMPLEMENTASI-KEPUTUSAN.md` (disingkat `RENCANA`). Dokumen ini tidak mengubah rencana utama secara fisik, tidak menyentuh kode, migrasi, data, atau produksi; tanpa commit. Berlaku aturan `RENCANA:9`: rencana utama menang atas berkas revisi. Semua `path:line` diverifikasi terhadap repo per 24 November 2026. Angka 14 digit = `supabase/migrations/<nama>:baris`.

## A. Temuan keamanan

**A1 — BLOCKER. Ganti `RENCANA:146` (3b).**
> Policy tulis `observations_write_assigned_observer` (`20261029070000:139`) bertipe `FOR ALL`, sehingga SELECT ikut lolos ke IoT lewat policy tulis. Hapus policy itu dan buat ulang hanya sebagai `FOR INSERT` dan `FOR UPDATE` dengan predikat lama. SELECT sepenuhnya pada policy SELECT baru `observations_read_assigned_observer` (`20261029070000:138`) yang ditimpa di 3b.

```sql
drop policy if exists observations_write_assigned_observer on public.observations;
create policy observations_insert_assigned_observer on public.observations for insert to authenticated with check ((select public.can_access_observation(participant_id)));
create policy observations_update_assigned_observer on public.observations for update to authenticated using ((select public.can_access_observation(participant_id))) with check ((select public.can_access_observation(participant_id)));
```
Uji `RENCANA:224`: IoT 0 baris `observations`, tetapi INSERT draft submission dan rating tetap 200.

**A2 — MAJOR. Ganti frasa `pemilik=auth.uid()` di `RENCANA:146` dengan daftar kolom eksplisit.**
> `pemilik` = `observer_id` pada `assessment_submissions`/`assessment_ratings` (`20261111160000:83-85`); `changed_by` pada `assessment_submission_revisions`/`assessment_rating_revisions` (`20261111160000:147,172`); `author_id` pada `observer_notes` (`20261111100000:141`); `changed_by` pada `observer_note_revisions` — tabel ini tidak punya `author_id`, hanya `note_id` dan `changed_by` (`20261111100000:145-151`); `updated_by` pada `observations` (`20261029070000:51`); `changed_by` pada `observation_revisions` (`20261029070000:154`). Tiap policy SELECT memakai `can_review_observation(...) OR (kolom=auth.uid() AND can_access_observation(...))`.

**A3 — MAJOR. `RENCANA:152` (3d), kata "tetap" diganti perintah pembuatan.**
> `has_active_participant_access()` tanpa argumen belum ada di migrasi mana pun. Buat di migrasi 3d:

```sql
create or replace function public.has_active_participant_access()
returns boolean language sql stable security definer set search_path='' as $$
  select exists (select 1 from public.participant_access pa
    where pa.account_user_id=(select auth.uid())
      and pa.revoked_at is null and pa.expires_at>now());
$$;
revoke all on function public.has_active_participant_access() from public;
grant execute on function public.has_active_participant_access() to authenticated;
```
> Versi tanpa argumen dipakai policy `participants_read_own_published_report` (`20261112180000:8`) dan `assessment_report_publications_read` (`20261112180000:25`); helper satu argumen tetap mengembalikan `false` untuk UUID orang lain.

**A4 — MAJOR. `RENCANA:77,79,248` (Opsi B).**
> Sampai `[TERBUKA-12]` ditandatangani, jalur opsi (b) memakai RPC `finalize_submission_as_admin(target_participant uuid, target_rubric_versions jsonb)` di migrasi baru, `security definer set search_path=''`: tolak `42501` bila `not public.is_admin_system()`, lalu jalankan penulis server `update assessment_submissions set status='finalized', finalized_at=now(), finalized_by=(select auth.uid()) where participant_id=target_participant and status='submitted' and rubric_version_id in (select jsonb_array_elements_text(target_rubric_versions)::uuid);` (`20261113120000:70`). RPC ini dipanggil Admin, bukan koordinator; penulis status server tidak dipakai koordinator. Tombol Admin `submission-controls.tsx:76-88` **tidak dihapus sebelum tanda tangan**; penghapusan di `RENCANA:77` berlaku saat `[TERBUKA-12]` ditutup. Bukti gate tidak boleh mengklaim Opsi B aktif.

**A5 — MAJOR. Sisipkan di `RENCANA:150` (3d).**
> Tambah `create unique index if not exists participant_access_account_user_unique on public.participant_access(account_user_id) where account_user_id is not null;`. Tanpa ini satu akun bisa ditaut lintas event, karena `participants` hanya unik per `(event_id, account_user_id)` (`20261112180000:6`). `assign_participant_account` menolak `42501` bila akun sudah terikat di baris `participant_access` lain.

**A6 — Minor. Ganti `RENCANA:131`.**
> Di `app/dashboard/laporan/actions.ts:78` jangan pakai `["admin_system","instruktur"]`: IoT lolos lalu kena `42501` di RPC. Pakai empat subrole koordinator `mot`, `vice_mot`, `master_observer`, `vice_observer` dari `instructor_event_assignments.position` (`20261112170000:21`); `iot` (`lib/instructor-roles.ts:15`) ditolak di UI sebelum RPC.

**A7 — Minor. `RENCANA:154` (3e): saat arsip, hapus juga `encrypted_password_at_link` bersama `account_user_id=null` di `participant_access`.**

**A8 — Minor. Gate Fase 4 (`RENCANA:164`, baris anon `RENCANA:231`).**
> Verifikasi lewat `information_schema.role_table_grants` dan ACL `pg_proc`: tidak ada grant anon lain selain `get_public_event_aggregate` (`RENCANA:158`). Migrasi berisi hanya `revoke ... from anon` (`20261112180000:28-29`, `20261112170000:127-325`), belum ada `grant ... to anon`.

## B. Temuan teknis

**B1 — MAJOR. `RENCANA:123` (2f).**
> Kalimat "Bagian `:10-24` tidak diubah" dikecualikan untuk `:12`: hapus cabang `or exists(... p.role='bidang_kader')` (`20261113130000:12`) pada timpaan 2f, sehingga pengecekan peran hanya `is_admin_system() or is_assessment_moderator(ev)` (`:11`). Gate Fase 2 (`RENCANA:71`) ditambah uji Kader publish `42501`.

**B2 — MAJOR. `RENCANA:110`.**
> `jsonb_typeof(null)` menghasilkan null, jadi snapshot tanpa `aspects` lolos. Ganti dengan `coalesce(jsonb_typeof(snapshot_payload->'aspects'),'') <> 'array'` (atau tambah `or snapshot_payload->'aspects' is null`).

**B3 — MAJOR. `RENCANA:117-119` (2f).**
> Kembalikan filter rubric pada cek moderasi:
> `and m.rubric_version_id = any(array(select jsonb_array_elements_text(snapshot_rubrics))::uuid[])`
> `snapshot_rubrics` kosong sudah ditolak di gate `RENCANA:116`, jadi `any('{}')` tidak lagi menyembunyikan moderasi. `revisi-siklus4-b.md:52-55` tidak dipakai (lihat B7).

**B4 — MAJOR. `RENCANA:148` dan `:158` (3c/3e).**
> `having count(*)>=10` bentrok dengan aturan "Lainnya". Pakai agregasi dua tahap: tahap 1 hitung `count(*)` dan rata-rata per bucket tanpa `having`; tahap 2 keluarkan bucket dengan `count>=10`, gabungkan semua bucket `count<10` menjadi satu bucket `"Lainnya"` dengan `count=sum(cnt)` dan rata-rata berbobot `sum(cnt*avg)/sum(cnt)`. Tampilkan `"Lainnya"` hanya bila `sum(cnt)>=10`. Total <10 → `distribution=null` (3c) / `groups=null` (3e). Uji: 9:1 → null; 18:2 → 18.

**B5 — Minor. `RENCANA:152`.** `clear_my_must_change_password()` tidak hanya menolak bila `password_changed_at is null`, tetapi setelah konfirmasi sukses men-set `must_change_password=false` untuk baris ber-`account_user_id=auth.uid()`.

**B6 — Minor. `RENCANA:156`.** Salin cek peran Kader eksplisit dari `docs/revisi-siklus4-a.md:21-23`: `if not exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='bidang_kader') then raise exception ... using errcode='42501'; end if;` di awal `get_event_report_summary_for_kader`.

**B7 — Minor.** Tandai `docs/revisi-siklus4-b.md:52-55` **KEDALUWARSA** (filter rubric lama, tanpa penolakan `snapshot_rubrics` kosong). Penggantinya B3.

**B8 — Minor. `RENCANA:123,131`.** Perjelas path lengkap: `app/dashboard/laporan/actions.ts:26` = daftar role aksi publish `publishReport` (RPC di `:28`); `app/dashboard/laporan/actions.ts:78` = daftar role aksi ekspor `auditReportExport` (RPC di `:82`).

**B9 — Minor. `RENCANA:152`.** Typo "untukPolicy" → "untuk Policy".
