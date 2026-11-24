-- Fase 3e — DRY RUN prosedur retensi V1.
-- Simulasi penuh di dalam transaksi yang di-ROLLBACK. Tidak ada perubahan permanen.
-- Jalankan: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/retention-dry-run.sql
\set ON_ERROR_STOP on

drop table if exists pg_temp.retention_counts;
create temp table retention_counts (
  phase text,
  snapshots bigint,
  publications bigint,
  publication_audit bigint,
  export_audit bigint,
  evaluations bigint,
  participant_access bigint,
  participants bigint,
  test_results bigint,
  identity_archives bigint
);

-- Kandidat dan penanda skip. Aturan ini identik dengan retention-apply.sql.
drop table if exists pg_temp.retention_candidates;
create temp table retention_candidates as
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

insert into pg_temp.retention_counts
select 'sebelum',
       (select count(*) from public.assessment_snapshots),
       (select count(*) from public.assessment_report_publications),
       (select count(*) from public.assessment_report_publication_audit),
       (select count(*) from public.assessment_export_audit),
       (select count(*) from public.collective_evaluations),
       (select count(*) from public.participant_access),
       (select count(*) from public.participants),
       (select count(*) from public.test_results),
       (select count(*) from public.retention_identity_archives);

begin;

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
         'fk_restrict_dry_run'
  from pg_temp.retention_candidates c
  join public.participants p on p.id = c.id
  where c.is_restricted
  on conflict (participant_id) do nothing;

  update public.participants p
     set archived_at = now(),
         account_user_id = null
  from pg_temp.retention_candidates c
  where p.id = c.id and c.is_restricted;

  update public.participant_access pa
     set account_user_id = null,
         encrypted_password_at_link = null
  from pg_temp.retention_candidates c
  where pa.participant_id = c.id and c.is_restricted;

  delete from public.test_results t
  using pg_temp.retention_candidates c
  where t.participant_id = c.id;

  delete from public.participants p
  using pg_temp.retention_candidates c
  where p.id = c.id and not c.is_restricted;

  insert into pg_temp.retention_counts
  select 'sesudah_simulasi',
         (select count(*) from public.assessment_snapshots),
         (select count(*) from public.assessment_report_publications),
         (select count(*) from public.assessment_report_publication_audit),
         (select count(*) from public.assessment_export_audit),
         (select count(*) from public.collective_evaluations),
         (select count(*) from public.participant_access),
         (select count(*) from public.participants),
         (select count(*) from public.test_results),
         (select count(*) from public.retention_identity_archives);

  \echo '=== JUMLAH SEBELUM vs SESUDAH SIMULASI ==='
  select * from pg_temp.retention_counts order by phase;

  \echo '=== GATE: tabel dikecualikan wajib before = after ==='
  select
    bool_and(snapshots = after_snapshots and publications = after_publications
         and publication_audit = after_publication_audit
         and export_audit = after_export_audit
         and evaluations = after_evaluations
         and participant_access = after_participant_access) as aman
  from (
    select b.snapshots, b.publications, b.publication_audit, b.export_audit,
           b.evaluations, b.participant_access,
           a.snapshots as after_snapshots,
           a.publications as after_publications,
           a.publication_audit as after_publication_audit,
           a.export_audit as after_export_audit,
           a.evaluations as after_evaluations,
           a.participant_access as after_participant_access
    from pg_temp.retention_counts b
    join pg_temp.retention_counts a
      on b.phase = 'sebelum' and a.phase = 'sesudah_simulasi'
  ) checked;

  \echo '=== DAMPAK SIMULASI (jumlah, bukan identitas) ==='
  select count(*) filter (where is_restricted) as diskip_diarsipkan,
         count(*) filter (where not is_restricted) as dihapus
  from pg_temp.retention_candidates;

rollback;

\echo '=== SIDIK PDF (wajib, di luar SQL) ==='
\echo 'Bandingkan sha256sum/Get-FileHash semua PDF dengan docs/baseline-pdf-sha256.csv; semua baris harus OK.'
\echo 'Simpan keluaran di docs/bukti-gate-siklus2/retensi-dry-run-<tanggal>.txt sebelum apply.'
