# Revisi Akhir A Siklus 4 — Keamanan

Usulan revisi `docs/REVIEW-SIKLUS-4.md`. RENCANA, kode, migrasi, data, produksi tidak diubah; tanpa commit. `RENCANA` = `docs/RENCANA-IMPLEMENTASI-KEPUTUSAN.md`; angka 14 digit = `supabase/migrations/<nama>:baris`. Publish, RLS, grant, audit tetap keras (`RENCANA:7,228-230`).

## 1. BLOCKER — `get_event_report_summary_for_kader` (`RENCANA:119`)

Grant `authenticated` saja tidak cukup: semua akun memakai peran database sama, jadi IoT (`instruktur`, posisi `iot`, `lib/instructor-roles.ts:15`) bisa memanggil RPC. Tetap `security definer`, tapi tolak di dalam fungsi bila `role<>'bidang_kader'`. Admin sudah punya `get_event_report_rows` (`20261112180000:142-156`); RPC ini khusus Kader.

Ganti kalimat `RENCANA:119` untuk RPC ini dengan:

> Buat `get_event_report_summary_for_kader(target_event_id uuid)`, `security definer set search_path=''`, keluaran `participant_id uuid, display_name text, commissariat text, overall_score numeric, graduation_decision text, published_at timestamptz, publication_revision integer`, hanya dari snapshot yang dipublikasi (`20261112180000:10-29`). **Awali dengan cek internal** `role='bidang_kader'` (Admin dan IoT ditolak). `overall_score` = `snapshot_data->'overall'->>'score'` (`20261113120000:31`), `graduation_decision` dari `collective_evaluations` (`20261112170000:211`). Tanpa `snapshot_data`/bukti/catatan. `revoke all ... from public; grant execute ... to authenticated;` — grant tetap `authenticated`, keputusan di cek internal.

Isi fungsi:

```sql
create or replace function public.get_event_report_summary_for_kader(target_event_id uuid)
returns table(participant_id uuid,display_name text,commissariat text,overall_score numeric,
  graduation_decision text,published_at timestamptz,publication_revision integer)
language plpgsql stable security definer set search_path='' as $$
begin
  if not exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='bidang_kader') then
    raise exception 'Akses ringkasan Kader ditolak.' using errcode='42501';
  end if;
  return query
  select p.id,p.display_name,p.commissariat,(s.snapshot_data->'overall'->>'score')::numeric,
    e.graduation_decision,pub.published_at,pub.revision
  from public.participants p
  join public.assessment_report_publications pub on pub.participant_id=p.id and pub.event_id=target_event_id
  join public.assessment_snapshots s on s.id=pub.snapshot_id
  join public.collective_evaluations e on e.id=s.collective_evaluation_id
  where p.event_id=target_event_id order by p.display_name;
end $$;
revoke all on function public.get_event_report_summary_for_kader(uuid) from public;
grant execute on function public.get_event_report_summary_for_kader(uuid) to authenticated;
```

Uji gate (`20261112190000` style, JWT `@invalid`): Kader → 200 dan kolom tidak mengandung `snapshot_data`; IoT → `42501`; observer, admin, anon → `42501`/`401`.

## 2. BLOCKER — policy SELECT menghilangkan baca sendiri (`RENCANA:111`)

`can_review_observation` tetap moderator/admin saja. Tambahkan cabang **pemilik** di tiap policy SELECT: Observer/Instruktur baca baris yang ditulisnya sendiri pada participant yang terjangkau `can_access_observation`. Fungsi itu (`20261106200000:2-19`) dan policy tulis tidak diubah.

Ganti bagian `RENCANA:111` yang menyamakan semua SELECT dengan `can_review_observation` menjadi:

> `public.can_review_observation(uuid)`, `security definer set search_path=''`, hanya `is_admin_system() or is_assessment_moderator(event_id participant)` (`20261112170000:13-25`). Policy SELECT memakai **`can_review_observation(...) OR (pemilik=auth.uid() AND can_access_observation(...))`**; `pemilik` = `observer_id` pada submission/rating/revisinya, `author_id` pada catatan, `updated_by`/`changed_by` pada observations/history. `participants_read_assigned_instructor` (`20261106200000:23-25`) moderator-only; `participants_read_assigned_observer` (`20261029070000:117`) tidak diubah. IoT: 0 baris `participants` dan 0 baris orang lain.

```sql
create or replace function public.can_review_observation(target_participant_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select public.is_admin_system() or exists (
    select 1 from public.participants p
    where p.id=target_participant_id and public.is_assessment_moderator(p.event_id));
$$;
revoke all on function public.can_review_observation(uuid) from public;
grant execute on function public.can_review_observation(uuid) to authenticated;

create policy assessment_submissions_read_assigned on public.assessment_submissions for select to authenticated
using ((select public.can_review_observation(participant_id)) or
  (observer_id=(select auth.uid()) and (select public.can_access_observation(participant_id))));
create policy assessment_ratings_read_assigned on public.assessment_ratings for select to authenticated
using ((select public.can_review_observation(participant_id)) or
  (observer_id=(select auth.uid()) and (select public.can_access_observation(participant_id))));
create policy assessment_submission_revisions_read_assigned on public.assessment_submission_revisions for select to authenticated
using (exists (select 1 from public.assessment_submissions s where s.id=submission_id and (
  (select public.can_review_observation(s.participant_id)) or
  (s.observer_id=(select auth.uid()) and (select public.can_access_observation(s.participant_id))))));
create policy assessment_rating_revisions_read_assigned on public.assessment_rating_revisions for select to authenticated
using (exists (select 1 from public.assessment_ratings r where r.id=assessment_rating_revisions.rating_id and (
  (select public.can_review_observation(r.participant_id)) or
  (r.observer_id=(select auth.uid()) and (select public.can_access_observation(r.participant_id))))));
create policy observer_notes_read_assigned on public.observer_notes for select to authenticated using ((
  (select public.can_review_observation(participant_id)) or
  (author_id=(select auth.uid()) and (select public.can_access_observation(participant_id))))
  and exists (select 1 from public.participants pt join public.rubric_versions v on v.id=observer_notes.rubric_version_id
    where pt.id=observer_notes.participant_id and pt.event_id=v.event_id));
create policy observations_read_assigned_observer on public.observations for select to authenticated
using ((select public.can_review_observation(participant_id)) or
  (updated_by=(select auth.uid()) and (select public.can_access_observation(participant_id))));
create policy observation_history_read_assigned_observer on public.observation_revisions for select to authenticated
using (exists (select 1 from public.observations o where o.id=observation_id and (
  (select public.can_review_observation(o.participant_id)) or
  (changed_by=(select auth.uid()) and (select public.can_access_observation(o.participant_id))))));
create policy participants_read_assigned_instructor on public.participants
for select to authenticated using ((select public.is_assessment_moderator(event_id)));
```

`drop policy if exists` sebelum tiap `create policy`. Uji: Observer → baris sendiri >0, participant lain 0; moderator sesuai penugasan; IoT `can_review_observation=false`, 0 baris `participants`/`observations`/orang lain, INSERT draft submission+rating tetap 200 (`RENCANA:187-188`).

## 3. `observer_note_revisions_read_assigned` (`20261111100000:214-217`)

Masukkan policy ini ke daftar perubahan `RENCANA:111`. Predicate lama `can_access_observation(note.participant_id)` memberi IoT riwayat catatan privat orang lain. Ganti dengan:

```sql
drop policy if exists observer_note_revisions_read_assigned on public.observer_note_revisions;
create policy observer_note_revisions_read_assigned on public.observer_note_revisions
for select to authenticated using (exists (select 1 from public.observer_notes note
  where note.id=observer_note_revisions.note_id and (
    (select public.can_review_observation(note.participant_id)) or
    (note.author_id=(select auth.uid()) and (select public.can_access_observation(note.participant_id))))));
```

## 4. `must_change_password` (`RENCANA:115`) — proksi tidak cukup

`auth.users.updated_at` naik juga lewat `updateUser({data:...})`, jadi pembuktian lama bisa dipalsukan klien. Ganti `confirm_participant_password_change` dengan perbandingan hash sandi saat penautan. Klien tidak bisa menulis `auth.users.encrypted_password` maupun `participant_access` (RLS tanpa policy), jadi ini bukti server.

Tambahkan `encrypted_password_at_link text` ke `participant_access` di migrasi baru 3d. `assign_participant_account(uuid,uuid)` (`20261112180000:67-78`) saat `target_user_id` tidak null membaca `select encrypted_password into linked_hash from auth.users where id=target_user_id;` lalu menyimpan `encrypted_password_at_link=linked_hash, linked_at=now(), password_changed_at=null, must_change_password=true, revoked_at=null` dalam satu upsert; hash null → tolak `42501`. `encrypted_password_at_link` bukan kolom publik (RLS tetap tanpa policy).

```sql
create or replace function public.confirm_participant_password_change()
returns void language plpgsql security definer set search_path='' as $$
declare pa public.participant_access; current_hash text;
begin
  select * into pa from public.participant_access pa where pa.account_user_id=(select auth.uid());
  if not found or pa.revoked_at is not null or pa.expires_at<=now()
     or pa.must_change_password is not true then
    raise exception 'Akses peserta tidak aktif.' using errcode='42501';
  end if;
  if pa.encrypted_password_at_link is null then
    raise exception 'Bukti penautan kata sandi tidak tersedia.' using errcode='42501';
  end if;
  select encrypted_password into current_hash from auth.users where id=(select auth.uid());
  if current_hash is null or current_hash=pa.encrypted_password_at_link then
    raise exception 'Kata sandi belum terbukti diganti.' using errcode='42501';
  end if;
  update public.participant_access
    set password_changed_at=now(), encrypted_password_at_link=current_hash
    where participant_id=pa.participant_id and account_user_id=(select auth.uid());
end $$;
revoke all on function public.confirm_participant_password_change() from public;
grant execute on function public.confirm_participant_password_change() to authenticated;
```

Hapus syarat `updated_at <= created_at` / `greatest(linked_at, ...)` dari RPC konfirmasi (`revisi-siklus3-c.md:20`). `clear_my_must_change_password()` tetap menolak bila `password_changed_at is null`; `get_my_published_assessment_report()` tetap `P0003` sebelum flag false. Uji `rpc_contract_behavior.sql`: (a) `updateUser({data})` → hash sama → konfirmasi `42501`, clear ditolak, rapor `P0003`; (b) `updateUser({password})` → hash beda → konfirmasi sukses, `password_changed_at` terisi, clear sukses, rapor terbaca; (c) panggil konfirmasi dua kali → yang kedua ditolak.

`[TERBUKA-13]` **baru:** bila `auth.users.encrypted_password` tidak dapat dibaca fungsi `security definer` ini di project target, jangan pakai proksi `updated_at` dan **jangan klaim keputusan 1 terpenuhi** (`RENCANA:17`). Putuskan dulu jalur OTP/email (nonce server di `participant_access` + verifikasi OTP) sebelum gate Fase 3; sampai itu selesai, butir Peserta normal di `RENCANA:195` tetap gagal.

## 5. Retensi — `participant_access` (`RENCANA:117`)

Tambahkan ke daftar FK restrict yang diskip: **`participant_access.participant_id`** (migrasi baru 3d, `references public.participants(id) on delete restrict`). Sisipan `RENCANA:117`:

> ... `development_recommendations` (`20261112170000:267`), `test_results` (`20261029080000:16`), dan `participant_access.participant_id` (migrasi baru 3d): peserta dengan baris tersebut **diskip dari delete**, identitas diarsipkan di `private_payload`, baris ditandai `archived_at` (kolom baru) dengan `account_user_id=null` dan `participant_access.account_user_id=null`. Dry-run menyertakan `count(*)` `participant_access` sebelum=sesudah untuk baris yang diskip.

## 6. Cabang Kader di revisi evaluasi (`20261112170000:243-244`)

`decision_rationale`, `discussion_notes`, `strengths`, `development_areas` ada di `snapshot` revision. Hilangkan Kader; Admin tetap lewat `is_assessment_moderator` (`20261112170000:16`).

```sql
drop policy if exists collective_evaluation_revisions_read_authorized on public.collective_evaluation_revisions;
create policy collective_evaluation_revisions_read_authorized on public.collective_evaluation_revisions
for select to authenticated using (exists (select 1 from public.collective_evaluations e
  where e.id=evaluation_id and (select public.is_assessment_moderator(e.event_id))));
```

Uji: Kader 0 baris; moderator sesuai event. Cabang Kader di `development_recommendations_read_authorized` (`20261112170000:281`) tidak diubah.

## 7. Minor

- **`has_active_participant_access`** (helper 3d, `revisi-siklus2-b.md:42`): pertahankan `pa.account_user_id=(select auth.uid())`, tambahkan `and target_participant_id is not null`. Sediakan juga `public.has_active_participant_access()` tanpa argumen yang mencari baris lewat `account_user_id=auth.uid()`. Helper satu argumen tetap dipakai policy, mengembalikan `false` untuk UUID orang lain; tidak pernah mengembalikan data. Grant hanya `authenticated`, `security definer set search_path=''`.
- **Array kosong** (`RENCANA:97`): `any('{}'::uuid[])` selalu false, jadi moderasi tak terlihat bila `snapshot_rubrics` kosong. Tambahkan `or jsonb_array_length(snapshot_rubrics)=0` pada syarat tolak, lalu hilangkan filter rubric: `or exists (select 1 from public.assessment_moderations m where m.event_id=ev and m.participant_id=person and m.status not in ('reviewed','resolved'))`. Tidak melonggarkan publish.
- **Uji IoT `get_instructor_dashboard_results`** (`20261106180000:51-77`, definisi berlaku `20261111100000:346-410`): cek role `:355-357` hanya `instruktur`, jadi IoT lolos, tetapi filter posisi `:369` mengecualikan `iot`. JWT IoT → 0 baris tanpa identitas; JWT MoT → agregat. Tambahkan ke `RENCANA:187,174`.
- **Helper tulis pertahankan Admin** (`20261111160000:84-85`): saat `EXISTS` diganti helper `security definer`, cabang `or ((select public.is_admin_system()) and status='submitted')` (USING) dan `or (status='finalized' and finalized_by=(select auth.uid()) and (select public.is_admin_system()))` (WITH CHECK) wajib utuh. Teruskan `new_status`/`new_finalized_by` sebagai argumen helper karena `WITH CHECK` menilai baris baru.
