-- Role Instruktur dan akses rekap hasil yang dibatasi ke kegiatan tugasnya.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role is null or role in ('admin_system', 'bidang_kader', 'observer', 'instruktur', 'komisariat', 'peserta'));

alter table public.rubric_assessment_types drop constraint if exists rubric_assessment_types_stage_check;
alter table public.rubric_assessment_types add constraint rubric_assessment_types_stage_check
  check (stage in ('screening', 'training', 'follow_up'));

create unique index if not exists rubric_follow_up_version_number
  on public.rubric_versions(event_id, assessment_type_id, version) where stage = 'follow_up';
create unique index if not exists rubric_one_active_follow_up_per_type
  on public.rubric_versions(event_id, assessment_type_id) where status = 'active' and stage = 'follow_up';

create table public.instructor_event_assignments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  instructor_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (event_id, instructor_id)
);
alter table public.instructor_event_assignments enable row level security;
create policy instructor_event_assignments_read_self_or_admin on public.instructor_event_assignments
  for select to authenticated using (instructor_id = (select auth.uid()) or (select public.is_admin_system()));
create policy instructor_event_assignments_manage_admin on public.instructor_event_assignments
  for all to authenticated using ((select public.is_admin_system())) with check ((select public.is_admin_system()));
grant select, insert, update, delete on public.instructor_event_assignments to authenticated;
revoke all on public.instructor_event_assignments from anon;

create or replace function public.is_assigned_instructor_for_event(target_event_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.instructor_event_assignments a
    join public.profiles p on p.id = a.instructor_id and p.role = 'instruktur'
    where a.event_id = target_event_id and a.instructor_id = (select auth.uid())
  );
$$;
revoke all on function public.is_assigned_instructor_for_event(uuid) from public;
grant execute on function public.is_assigned_instructor_for_event(uuid) to authenticated;

drop policy if exists events_read_scoped_staff on public.events;
create policy events_read_scoped_staff on public.events for select to authenticated using (
  (select public.is_admin_system())
  or (select public.can_view_rubrics())
  or (select public.is_assigned_observer_for_event(id))
  or (select public.is_assigned_instructor_for_event(id))
);

-- Instruktur hanya menerima agregat, kategori, dan status; identitas peserta dan catatan privat tidak dikirim RPC ini.
create or replace function public.get_instructor_dashboard_results()
returns table (
  event_id uuid,
  event_name text,
  stage text,
  material_name text,
  assessment_type_name text,
  rubric_version integer,
  participant_count integer,
  scored_count integer,
  average_score numeric,
  category_development integer,
  category_adequate integer,
  category_good integer,
  category_excellent integer,
  observer_count integer,
  completed_observer_count integer,
  is_official boolean
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'instruktur'
  ) then
    raise exception 'Akses hanya untuk Instruktur.' using errcode = '42501';
  end if;

  return query
  with active_versions as (
    select rv.id, rv.event_id, rv.stage, rv.material_id, rv.assessment_type_id, rv.version,
      e.name as event_title, m.name as material_title, t.name as type_title
    from public.rubric_versions rv
    join public.events e on e.id = rv.event_id
    join public.rubric_assessment_types t on t.id = rv.assessment_type_id
    left join public.rubric_materials m on m.id = rv.material_id
    join public.instructor_event_assignments ia on ia.event_id = rv.event_id and ia.instructor_id = (select auth.uid())
    where rv.status = 'active'
  ),
  aspect_results as (
    select v.id as version_id, p.id as participant_id, a.id as aspect_id, a.weight as aspect_weight,
      sum(o.score::numeric * i.weight) / nullif(sum(i.weight) filter (where o.score is not null), 0) as aspect_score
    from active_versions v
    join public.participants p on p.event_id = v.event_id
    join public.rubric_aspects a on a.rubric_version_id = v.id
    join public.rubric_indicators i on i.aspect_id = a.id
    left join public.observations o on o.participant_id = p.id and o.indicator_id = i.id
    group by v.id, p.id, a.id, a.weight
  ),
  participant_scores as (
    select ar.version_id, ar.participant_id,
      ((sum(ar.aspect_score * ar.aspect_weight) / nullif(sum(ar.aspect_weight), 0) - 1) / 4) * 100 as score
    from aspect_results ar
    where ar.aspect_score is not null
    group by ar.version_id, ar.participant_id
  ),
  completion_counts as (
    select v.id as version_id, count(distinct a.id)::integer as assigned_count,
      count(distinct c.assignment_id)::integer as completed_count
    from active_versions v
    left join public.observer_assignments a on a.event_id = v.event_id
    left join public.observer_rubric_version_completions c on c.assignment_id = a.id and c.rubric_version_id = v.id
    group by v.id
  )
  select v.event_id, v.event_title, v.stage, v.material_title, v.type_title, v.version,
    count(distinct p.id)::integer as participant_count,
    count(distinct ps.participant_id)::integer as scored_count,
    round(avg(ps.score), 2) as average_score,
    count(distinct ps.participant_id) filter (where ps.score < 60)::integer as category_development,
    count(distinct ps.participant_id) filter (where ps.score >= 60 and ps.score < 75)::integer as category_adequate,
    count(distinct ps.participant_id) filter (where ps.score >= 75 and ps.score < 90)::integer as category_good,
    count(distinct ps.participant_id) filter (where ps.score >= 90)::integer as category_excellent,
    cc.assigned_count, cc.completed_count,
    (cc.assigned_count > 0 and cc.assigned_count = cc.completed_count) as is_official
  from active_versions v
  join completion_counts cc on cc.version_id = v.id
  left join public.participants p on p.event_id = v.event_id
  left join participant_scores ps on ps.version_id = v.id and ps.participant_id = p.id
  group by v.id, v.event_id, v.event_title, v.stage, v.material_title, v.type_title, v.version,
    cc.assigned_count, cc.completed_count
  order by v.event_title, v.stage, v.material_title, v.type_title;
end;
$$;
revoke all on function public.get_instructor_dashboard_results() from public;
grant execute on function public.get_instructor_dashboard_results() to authenticated;
