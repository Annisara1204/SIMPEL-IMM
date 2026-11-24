-- Fase 3e — APPLY prosedur retensi V1.
-- Jalankan hanya setelah backup 03:15 terverifikasi dan dry-run 03:20 lolos.
-- Jalankan: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/retention-apply.sql
\set ON_ERROR_STOP on

begin;

  -- Satu eksekusi retensi pada satu waktu.
  select pg_advisory_xact_lock(hashtext('imm-retention-v1'));

  drop table if exists pg_temp.apply_candidates;
  create temp table apply_candidates as
  with candidates as (
    select p.id, p.event_id
    from public.participants p
    join public.events e on e.id = p.event_id
    where e.ends_on < (current_date - interval '2 years')::date
       or exists (
            select 1 from public.commissariat_submissions cs
            where cs.event_id = p.event_id
              and cs.status = 'administrative_published'
              and cs.administrative_published_at < now() - interval '2 years'
          )
  ), restricted as (
    select c.id
    from candidates c
    where exists (select 1 from public.assessment_snapshots t where t.participant_id = c.id)
       or exists (select 1 from public.assessment_report_publications t where t.participant_id = c.id)
       or exists (select 1 from public.assessment_report_publication_audit t where t.participant_id = c.id)
       or exists (select 1 from public.collective_evaluations t where t.participant_id = c.id)
       or exists (select 1 from public.assessment_moderations t where t.participant_id = c.id)
       or exists (select 1 from public.development_recommendations t where t.participant_id = c.id)
       or exists (select 1 from public.participant_access t where t.participant_id = c.id)
       or exists (
            select 1 from public.observations o
            join public.observation_revisions r on r.observation_id = o.id
            where o.participant_id = c.id
          )
  )
  select c.id, c.event_id, (r.id is not null) as is_restricted
  from candidates c
  left join restricted r on r.id = c.id;

  create temp table apply_before as
  select (select count(*) from public.assessment_snapshots) as snapshots,
         (select count(*) from public.assessment_report_publications) as publications,
         (select count(*) from public.assessment_report_publication_audit) as publication_audit,
         (select count(*) from public.assessment_export_audit) as export_audit,
         (select count(*) from public.collective_evaluations) as evaluations,
         (select count(*) from public.participant_access) as participant_access;

  insert into public.retention_identity_archives
    (participant_id, event_id, private_payload, reason)
  select c.id,
         c.event_id,
         jsonb_build_object(
           'display_name', p.display_name,
           'commissariat', p.commissariat,
           'student_number', p.student_number,
           'group_name', p.group_name,
           'account_user_id', p.account_user_id,
           'created_at', p.created_at
         ),
         'fk_restrict'
  from pg_temp.apply_candidates c
  join public.participants p on p.id = c.id
  where c.is_restricted
  on conflict (participant_id) do nothing;

  update public.participants p
     set archived_at = now(),
         account_user_id = null
  from pg_temp.apply_candidates c
  where p.id = c.id and c.is_restricted;

  update public.participant_access pa
     set account_user_id = null,
         encrypted_password_at_link = null
  from pg_temp.apply_candidates c
  where pa.participant_id = c.id and c.is_restricted;

  -- FK restrict pada test_results tidak diubah: hapus hasil yang lewat 2 tahun
  -- lebih dulu agar peserta tanpa turunan wajib-arisp bisa dihapus.
  delete from public.test_results t
  using pg_temp.apply_candidates c
  where t.participant_id = c.id;

  delete from public.participants p
  using pg_temp.apply_candidates c
  where p.id = c.id and not c.is_restricted;

  create temp table apply_after as
  select (select count(*) from public.assessment_snapshots) as snapshots,
         (select count(*) from public.assessment_report_publications) as publications,
         (select count(*) from public.assessment_report_publication_audit) as publication_audit,
         (select count(*) from public.assessment_export_audit) as export_audit,
         (select count(*) from public.collective_evaluations) as evaluations,
         (select count(*) from public.participant_access) as participant_access;

  do $$
  declare before_row record;
          after_row record;
  begin
    select * into before_row from pg_temp.apply_before;
    select * into after_row from pg_temp.apply_after;
    if before_row.snapshots is distinct from after_row.snapshots
       or before_row.publications is distinct from after_row.publications
       or before_row.publication_audit is distinct from after_row.publication_audit
       or before_row.export_audit is distinct from after_row.export_audit
       or before_row.evaluations is distinct from after_row.evaluations
       or before_row.participant_access is distinct from after_row.participant_access then
      raise exception 'Gate retensi gagal: salah satu tabel dikecualikan berubah. Seluruh transaksi dibatalkan.';
    end if;

    if exists (
      select 1 from pg_temp.apply_candidates c
      join public.participants p on p.id = c.id
      where c.is_restricted
        and (p.archived_at is null or p.account_user_id is not null)
    ) then
      raise exception 'Gate retensi gagal: peserta yang diskip belum ditandai archived_at atau account_user_id masih terisi.';
    end if;

    if exists (
      select 1 from pg_temp.apply_candidates c
      join public.participant_access pa on pa.participant_id = c.id
      where c.is_restricted
        and (pa.account_user_id is not null or pa.encrypted_password_at_link is not null)
    ) then
      raise exception 'Gate retensi gagal: participant_access pada peserta yang diskip masih memiliki identitas akun.';
    end if;
  end $$;

  \echo '=== RETENSI V1 SELESAI — simpan jumlah ini sebagai bukti ==='
  select count(*) filter (where is_restricted) as diskip_diarsipkan,
         count(*) filter (where not is_restricted) as dihapus
  from pg_temp.apply_candidates;

  select * from pg_temp.apply_before;
  select * from pg_temp.apply_after;

commit;
