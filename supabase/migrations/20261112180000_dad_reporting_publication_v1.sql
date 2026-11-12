-- Phase 7: report publication, participant-account ownership, and export audit.
alter table public.events add column if not exists theme text;
alter table public.events add column if not exists organizer text;
alter table public.participants add column if not exists account_user_id uuid references public.profiles(id) on delete set null;
drop index if exists public.participants_account_user_unique;
create unique index if not exists participants_event_account_user_unique on public.participants(event_id,account_user_id) where account_user_id is not null;
drop policy if exists participants_read_own_published_report on public.participants;
create policy participants_read_own_published_report on public.participants for select to authenticated using (account_user_id=(select auth.uid()) and exists(select 1 from public.profiles profile where profile.id=(select auth.uid()) and profile.role='peserta'));

create table if not exists public.assessment_report_publications (
  snapshot_id uuid primary key references public.assessment_snapshots(id) on delete restrict,
  event_id uuid not null references public.events(id) on delete restrict,
  participant_id uuid not null references public.participants(id) on delete restrict,
  published_by uuid not null references auth.users(id),
  published_at timestamptz not null default now(),
  revision integer not null default 1 check(revision>0)
);
create index if not exists assessment_report_publications_owner_idx on public.assessment_report_publications(participant_id,published_at desc);
alter table public.assessment_report_publications enable row level security;
drop policy if exists assessment_report_publications_read on public.assessment_report_publications;
create policy assessment_report_publications_read on public.assessment_report_publications for select to authenticated using (
  (select public.is_admin_system())
  or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='bidang_kader')
  or (select public.is_assessment_moderator(event_id))
  or (exists(select 1 from public.profiles profile where profile.id=(select auth.uid()) and profile.role='peserta') and participant_id in (select p.id from public.participants p where p.account_user_id=(select auth.uid())))
);
grant select on public.assessment_report_publications to authenticated;
revoke insert,update,delete on public.assessment_report_publications from authenticated,anon;
revoke all on public.assessment_report_publications from anon;

create table if not exists public.assessment_report_publication_audit (
  id bigint generated always as identity primary key,
  snapshot_id uuid not null references public.assessment_snapshots(id) on delete restrict,
  event_id uuid not null references public.events(id) on delete restrict,
  participant_id uuid not null references public.participants(id) on delete restrict,
  action text not null check(action in ('published','republished')),
  actor_id uuid not null references auth.users(id),
  acted_at timestamptz not null default now(),
  publication_revision integer not null
);
alter table public.assessment_report_publication_audit enable row level security;
drop policy if exists assessment_report_publication_audit_read on public.assessment_report_publication_audit;
create policy assessment_report_publication_audit_read on public.assessment_report_publication_audit for select to authenticated using (
  (select public.is_admin_system()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='bidang_kader')
);
grant select on public.assessment_report_publication_audit to authenticated;
grant usage,select on sequence public.assessment_report_publication_audit_id_seq to authenticated;
revoke insert,update,delete on public.assessment_report_publication_audit from authenticated,anon;
revoke all on public.assessment_report_publication_audit from anon;

create table if not exists public.assessment_export_audit (
  id bigint generated always as identity primary key,
  event_id uuid references public.events(id) on delete restrict,
  export_type text not null check(export_type in ('individual_pdf','bulk_pdf','assessment_excel','observer_excel','event_report_pdf')),
  filters jsonb not null default '{}'::jsonb check(jsonb_typeof(filters)='object'),
  actor_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.assessment_export_audit enable row level security;
drop policy if exists assessment_export_audit_read_admin on public.assessment_export_audit;
create policy assessment_export_audit_read_admin on public.assessment_export_audit for select to authenticated using((select public.is_admin_system()));
grant select on public.assessment_export_audit to authenticated;
grant usage,select on sequence public.assessment_export_audit_id_seq to authenticated;
revoke insert,update,delete on public.assessment_export_audit from authenticated,anon;
revoke all on public.assessment_export_audit from anon;

create or replace function public.assign_participant_account(target_participant_id uuid,target_user_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_admin_system() then raise exception 'Hanya Admin Sistem yang dapat menautkan akun peserta.' using errcode='42501'; end if;
  if target_user_id is not null and not exists(select 1 from public.profiles p where p.id=target_user_id and p.role='peserta') then
    raise exception 'Akun tujuan harus memiliki role Peserta.';
  end if;
  update public.participants set account_user_id=target_user_id where id=target_participant_id;
  if not found then raise exception 'Peserta tidak ditemukan.'; end if;
end $$;
revoke all on function public.assign_participant_account(uuid,uuid) from public;
grant execute on function public.assign_participant_account(uuid,uuid) to authenticated;

create or replace function public.publish_assessment_report(target_snapshot_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare ev uuid; person uuid; revision_number integer; latest_snapshot uuid;
begin
  select s.event_id,s.participant_id into ev,person from public.assessment_snapshots s where s.id=target_snapshot_id;
  if ev is null then raise exception 'Snapshot final tidak ditemukan.'; end if;
  if not (public.is_admin_system() or public.is_assessment_moderator(ev)
    or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='bidang_kader')) then
    raise exception 'Akun tidak berwenang menerbitkan rapor.' using errcode='42501';
  end if;
  if not exists(select 1 from public.collective_evaluations e where e.event_id=ev and e.participant_id=person and e.status='finalized') then
    raise exception 'Rapor hanya dapat diterbitkan dari evaluasi final.';
  end if;
  select s.id into latest_snapshot from public.assessment_snapshots s where s.event_id=ev and s.participant_id=person order by s.revision desc limit 1;
  if latest_snapshot is distinct from target_snapshot_id then raise exception 'Hanya snapshot final terbaru yang dapat diterbitkan.'; end if;
  select coalesce(max(p.revision),0)+1 into revision_number from public.assessment_report_publications p where p.participant_id=person;
  insert into public.assessment_report_publications(snapshot_id,event_id,participant_id,published_by,published_at,revision)
  values(target_snapshot_id,ev,person,(select auth.uid()),now(),revision_number)
  on conflict(snapshot_id) do update set published_by=excluded.published_by,published_at=excluded.published_at,revision=excluded.revision;
  insert into public.assessment_report_publication_audit(snapshot_id,event_id,participant_id,action,actor_id,publication_revision)
  values(target_snapshot_id,ev,person,case when revision_number=1 then 'published' else 'republished' end,(select auth.uid()),revision_number);
  return target_snapshot_id;
end $$;
revoke all on function public.publish_assessment_report(uuid) from public;
grant execute on function public.publish_assessment_report(uuid) to authenticated;

create or replace function public.get_my_published_assessment_report()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  select jsonb_build_object('snapshot_id',s.id,'snapshot_data',s.snapshot_data,'finalized_at',s.finalized_at,
    'published_at',pub.published_at,'event',jsonb_build_object('id',e.id,'name',e.name,'theme',e.theme,'organizer',e.organizer,'commissariat',e.commissariat,'location',e.location,'starts_on',e.starts_on,'ends_on',e.ends_on),
    'participant',jsonb_build_object('display_name',p.display_name,'student_number',p.student_number,'group_name',p.group_name,'commissariat',p.commissariat),
    'indicator_names',coalesce(names.indicator_names,'{}'::jsonb),'version_info',coalesce(versions.labels,'[]'::jsonb))
  into result from public.participants p join public.assessment_report_publications pub on pub.participant_id=p.id
    join public.assessment_snapshots s on s.id=pub.snapshot_id join public.events e on e.id=p.event_id
  left join lateral (
    select jsonb_object_agg(coalesce(ri.competency_indicator_id,ri.id)::text,ri.name) as indicator_names
    from public.rubric_versions v join public.rubric_aspects a on a.rubric_version_id=v.id
      join public.rubric_indicator_aspects mapping on mapping.aspect_id=a.id
      join public.rubric_indicators ri on ri.id=mapping.indicator_id
    where v.id in(select jsonb_array_elements_text(s.rubric_version_ids)::uuid)
  ) names on true
  left join lateral (
    select jsonb_agg(distinct label) as labels from (
      select f.name||' v'||fv.version::text as label from jsonb_array_elements_text(s.framework_version_ids) ref(id)
        join public.competency_framework_versions fv on fv.id=ref.id::uuid join public.competency_frameworks f on f.id=fv.framework_id
      union all
      select (case rv.stage when 'training' then 'Pelatihan' when 'screening' then 'Screening' else 'Tindak lanjut' end)||' v'||rv.version::text||coalesce(' · '||rm.name,'')
        from jsonb_array_elements_text(s.rubric_version_ids) ref(id) join public.rubric_versions rv on rv.id=ref.id::uuid
        left join public.rubric_materials rm on rm.id=rv.material_id
    ) version_labels
  ) versions on true
  where p.account_user_id=(select auth.uid()) and pub.published_at is not null
    and exists(select 1 from public.profiles profile where profile.id=(select auth.uid()) and profile.role='peserta')
  order by pub.published_at desc limit 1;
  if result is null then raise exception 'Belum ada rapor yang diterbitkan untuk akun ini.' using errcode='P0002'; end if;
  return result;
end $$;
revoke all on function public.get_my_published_assessment_report() from public;
grant execute on function public.get_my_published_assessment_report() to authenticated;

create or replace function public.get_event_report_rows(target_event_id uuid)
returns table(participant_id uuid,display_name text,student_number text,group_name text,commissariat text,account_linked boolean,snapshot_id uuid,snapshot_data jsonb,rubric_version_ids jsonb,framework_version_ids jsonb,finalized_at timestamptz,published_at timestamptz,publication_revision integer)
language plpgsql stable security definer set search_path='' as $$
begin
  if not (public.is_admin_system() or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='bidang_kader') or public.is_assessment_moderator(target_event_id)) then
    raise exception 'Akses laporan kegiatan ditolak.' using errcode='42501';
  end if;
  return query select p.id,p.display_name,p.student_number,p.group_name,p.commissariat,p.account_user_id is not null,s.id,s.snapshot_data,s.rubric_version_ids,s.framework_version_ids,s.finalized_at,pub.published_at,pub.revision
  from public.participants p
  left join lateral (select snap.* from public.assessment_snapshots snap where snap.event_id=p.event_id and snap.participant_id=p.id order by snap.revision desc limit 1) s on true
  left join public.assessment_report_publications pub on pub.snapshot_id=s.id
  where p.event_id=target_event_id order by p.display_name;
end $$;
revoke all on function public.get_event_report_rows(uuid) from public;
grant execute on function public.get_event_report_rows(uuid) to authenticated;

create or replace function public.get_event_assessment_progress(target_event_id uuid)
returns table(observer_id uuid,observer_name text,expected_submissions integer,draft_count integer,submitted_count integer,finalized_count integer,incomplete_count integer)
language plpgsql stable security definer set search_path='' as $$
begin
  if not (public.is_admin_system() or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='bidang_kader') or public.is_assessment_moderator(target_event_id)) then
    raise exception 'Akses monitoring progres ditolak.' using errcode='42501';
  end if;
  return query
  with evaluators as (
    select oa.observer_id as user_id from public.observer_assignments oa where oa.event_id=target_event_id
    union select ia.instructor_id from public.instructor_event_assignments ia where ia.event_id=target_event_id and ia.position in ('mot','vice_mot','master_observer','vice_observer')
  ), expected as (
    select count(*)::integer as slots from public.participants p
    cross join public.rubric_versions v where p.event_id=target_event_id and v.event_id=target_event_id and v.status='active'
  ), counts as (
    select s.observer_id,count(*) filter(where s.status='draft')::integer as drafts,
      count(*) filter(where s.status='submitted')::integer as submitted,
      count(*) filter(where s.status='finalized')::integer as finalized
    from public.assessment_submissions s join public.rubric_versions v on v.id=s.rubric_version_id and v.status='active'
    where s.rubric_version_id in(select v.id from public.rubric_versions v where v.event_id=target_event_id and v.status='active')
    group by s.observer_id
  )
  select ev.user_id,coalesce(profile.display_name,'Akun penilai'),e.slots,coalesce(c.drafts,0),coalesce(c.submitted,0),coalesce(c.finalized,0),greatest(e.slots-coalesce(c.drafts,0)-coalesce(c.submitted,0)-coalesce(c.finalized,0),0)
  from evaluators ev cross join expected e left join counts c on c.observer_id=ev.user_id
    left join public.profiles profile on profile.id=ev.user_id order by profile.display_name;
end $$;
revoke all on function public.get_event_assessment_progress(uuid) from public;
grant execute on function public.get_event_assessment_progress(uuid) to authenticated;

create or replace function public.record_assessment_export(target_event_id uuid,target_export_type text,target_filters jsonb default '{}'::jsonb)
returns bigint language plpgsql security definer set search_path='' as $$
declare new_id bigint;
begin
  if target_export_type not in ('individual_pdf','bulk_pdf','assessment_excel','observer_excel','event_report_pdf') then raise exception 'Jenis ekspor tidak valid.'; end if;
  if not (public.is_admin_system() or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='bidang_kader') or public.is_assessment_moderator(target_event_id)
    or (target_export_type='individual_pdf' and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='peserta')
      and exists(select 1 from public.assessment_report_publications publication join public.participants participant on participant.id=publication.participant_id
        where publication.event_id=target_event_id and participant.account_user_id=(select auth.uid())))) then
    raise exception 'Akses ekspor ditolak.' using errcode='42501';
  end if;
  insert into public.assessment_export_audit(event_id,export_type,filters,actor_id) values(target_event_id,target_export_type,coalesce(target_filters,'{}'::jsonb),(select auth.uid())) returning id into new_id;
  return new_id;
end $$;
revoke all on function public.record_assessment_export(uuid,text,jsonb) from public;
grant execute on function public.record_assessment_export(uuid,text,jsonb) to authenticated;

comment on table public.assessment_report_publications is 'Phase 7: explicit publication of finalized, immutable assessment snapshots.';
comment on table public.assessment_export_audit is 'Phase 7: server-authorized audit entries for report exports.';
