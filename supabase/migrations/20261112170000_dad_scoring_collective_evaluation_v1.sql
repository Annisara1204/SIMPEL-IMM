-- Phase 6: keep observer source ratings immutable as source data; collective
-- moderation, decisions, recommendations, and final snapshots are separate.

alter table public.participants add column if not exists student_number text;
alter table public.participants add column if not exists group_name text;
create unique index if not exists participants_event_student_number_unique
  on public.participants(event_id,student_number) where student_number is not null and trim(student_number)<>'';
alter table public.participants drop constraint if exists participants_student_number_length;
alter table public.participants add constraint participants_student_number_length check (student_number is null or char_length(trim(student_number)) between 1 and 40);
alter table public.participants drop constraint if exists participants_group_name_length;
alter table public.participants add constraint participants_group_name_length check (group_name is null or char_length(trim(group_name)) between 1 and 100);

create or replace function public.is_assessment_moderator(target_event_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin_system'
  ) or exists (
    select 1 from public.profiles p
    join public.instructor_event_assignments a on a.instructor_id=p.id
    where p.id=(select auth.uid()) and p.role='instruktur' and a.event_id=target_event_id
      and a.position in ('mot','vice_mot','master_observer','vice_observer')
  );
$$;
revoke all on function public.is_assessment_moderator(uuid) from public;
grant execute on function public.is_assessment_moderator(uuid) to authenticated;

drop function if exists public.get_event_assessment_summary(uuid);
create or replace function public.get_event_assessment_summary(target_event_id uuid)
returns table (
  participant_id uuid, indicator_id uuid, assessment_scope text, assessment_scope_key text, source_rubric_version_ids uuid[],
  average_score numeric, valid_rating_count integer, minimum_score smallint, maximum_score smallint,
  score_range smallint, not_observed_count integer, pending_count integer, review_status text,
  aspect_id uuid, aspect_name text, aspect_weight numeric, indicator_weight numeric
) language plpgsql stable security definer set search_path = '' as $$
declare caller_role text;
begin
  select p.role into caller_role from public.profiles p where p.id=(select auth.uid());
  if caller_role is null or caller_role not in ('admin_system','bidang_kader','instruktur') then
    raise exception 'Akses rekap penilaian ditolak.' using errcode='42501';
  end if;
  if caller_role='instruktur' and not exists(select 1 from public.instructor_event_assignments a where a.event_id=target_event_id and a.instructor_id=(select auth.uid()) and a.position in ('mot','vice_mot','master_observer','vice_observer')) then
    raise exception 'Kegiatan ini tidak ditugaskan kepada akun Anda.' using errcode='42501';
  end if;
  if not exists(select 1 from public.events e where e.id=target_event_id) then return; end if;

  return query
  with planned as (
    select distinct p.id as participant_id, v.id as rubric_version_id, ri.id as local_indicator_id,
      coalesce(ri.competency_indicator_id,ri.id) as indicator_id,
      case when cmi.assessment_scope='cross_session' then 'cross_session' else 'session' end as assessment_scope,
      case when cmi.assessment_scope='cross_session' then 'cross_session' else 'session:'||v.id::text end as assessment_scope_key,
      coalesce(asp.competency_aspect_id,asp.id) as aspect_id, coalesce(master_aspect.name,asp.name) as aspect_name, coalesce(master_aspect.weight,asp.weight) as aspect_weight, link.weight as indicator_weight
    from public.participants p
    join public.rubric_versions v on v.event_id=p.event_id and v.status='active'
    join public.rubric_aspects asp on asp.rubric_version_id=v.id
    join public.rubric_indicator_aspects link on link.aspect_id=asp.id
    join public.rubric_indicators ri on ri.id=link.indicator_id
    left join public.competency_aspects master_aspect on master_aspect.id=asp.competency_aspect_id
    left join public.rubric_materials rm on rm.id=v.material_id
    left join public.competency_material_indicators cmi on cmi.material_id=rm.competency_material_id and cmi.indicator_id=ri.competency_indicator_id and cmi.aspect_id=asp.competency_aspect_id and cmi.active
    where p.event_id=target_event_id
  ), slot_plan as (
    select distinct participant_id,rubric_version_id,local_indicator_id,indicator_id,assessment_scope,assessment_scope_key from planned
  ), evaluators as (
    select oa.event_id,oa.observer_id as user_id from public.observer_assignments oa where oa.event_id=target_event_id
    union
    select ia.event_id,ia.instructor_id from public.instructor_event_assignments ia where ia.event_id=target_event_id
  ), slots as (
    select plan.*, ev.user_id, s.status as submission_status, r.response_status, r.score
    from slot_plan plan
    left join evaluators ev on true
    left join public.assessment_submissions s on s.rubric_version_id=plan.rubric_version_id and s.participant_id=plan.participant_id and s.observer_id=ev.user_id
    left join public.assessment_ratings r on r.submission_id=s.id and r.indicator_id=plan.local_indicator_id and r.participant_id=plan.participant_id
  ), grouped as (
    select participant_id,indicator_id,assessment_scope,assessment_scope_key,
      array_agg(distinct rubric_version_id) as source_rubric_version_ids,
      avg(score::numeric) filter(where submission_status in ('submitted','finalized') and response_status='scored' and score between 1 and 5) as average_score,
      count(*) filter(where submission_status in ('submitted','finalized') and response_status='scored' and score between 1 and 5)::integer as valid_rating_count,
      min(score) filter(where submission_status in ('submitted','finalized') and response_status='scored' and score between 1 and 5) as minimum_score,
      max(score) filter(where submission_status in ('submitted','finalized') and response_status='scored' and score between 1 and 5) as maximum_score,
      count(*) filter(where submission_status in ('submitted','finalized') and response_status='not_observed')::integer as not_observed_count,
      count(*) filter(where user_id is not null and not (submission_status in ('submitted','finalized') and response_status in ('scored','not_observed')))::integer as pending_count
    from slots group by participant_id,indicator_id,assessment_scope,assessment_scope_key
  )
  select g.participant_id,g.indicator_id,g.assessment_scope,g.assessment_scope_key,g.source_rubric_version_ids,g.average_score,g.valid_rating_count,g.minimum_score,g.maximum_score,
    case when g.minimum_score is null then null else g.maximum_score-g.minimum_score end,
    g.not_observed_count,g.pending_count,
    case when g.minimum_score is not null and g.maximum_score-g.minimum_score >= (select policy.review_score_delta from public.assessment_scoring_policies policy where policy.id) then 'needs_review' else 'normal' end,
    plan.aspect_id,plan.aspect_name,plan.aspect_weight,plan.indicator_weight
  from grouped g join planned plan using(participant_id,indicator_id,assessment_scope,assessment_scope_key)
  order by g.participant_id,plan.aspect_name,g.indicator_id;
end $$;
revoke all on function public.get_event_assessment_summary(uuid) from public;
grant execute on function public.get_event_assessment_summary(uuid) to authenticated;

create or replace function public.get_event_assessment_participants(target_event_id uuid)
returns table (id uuid, display_name text, student_number text, group_name text, commissariat text)
language plpgsql stable security definer set search_path = '' as $$
declare caller_role text;
begin
  select p.role into caller_role from public.profiles p where p.id=(select auth.uid());
  if caller_role not in ('admin_system','bidang_kader','instruktur') then raise exception 'Akses daftar peserta ditolak.' using errcode='42501'; end if;
  if caller_role='instruktur' and not exists(select 1 from public.instructor_event_assignments a where a.event_id=target_event_id and a.instructor_id=(select auth.uid()) and a.position in ('mot','vice_mot','master_observer','vice_observer')) then
    raise exception 'Kegiatan ini tidak ditugaskan kepada akun Anda.' using errcode='42501';
  end if;
  return query select p.id,p.display_name,p.student_number,p.group_name,p.commissariat from public.participants p where p.event_id=target_event_id order by p.display_name;
end $$;
revoke all on function public.get_event_assessment_participants(uuid) from public;
grant execute on function public.get_event_assessment_participants(uuid) to authenticated;

create table if not exists public.assessment_scoring_policies (
  id boolean primary key default true check (id),
  review_score_delta smallint not null default 2 check (review_score_delta between 1 and 4),
  minimum_coverage numeric(5,2) not null default 80 check (minimum_coverage between 1 and 100),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
insert into public.assessment_scoring_policies(id) values(true) on conflict(id) do nothing;
alter table public.assessment_scoring_policies enable row level security;
drop policy if exists assessment_scoring_policies_read_staff on public.assessment_scoring_policies;
create policy assessment_scoring_policies_read_staff on public.assessment_scoring_policies
  for select to authenticated using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('admin_system','bidang_kader','instruktur')));
drop policy if exists assessment_scoring_policies_admin_update on public.assessment_scoring_policies;
create policy assessment_scoring_policies_admin_update on public.assessment_scoring_policies
  for update to authenticated using ((select public.is_admin_system())) with check ((select public.is_admin_system()));
grant select,update on public.assessment_scoring_policies to authenticated;
revoke all on public.assessment_scoring_policies from anon;

create table if not exists public.assessment_moderations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  participant_id uuid not null references public.participants(id) on delete restrict,
  rubric_version_id uuid not null references public.rubric_versions(id) on delete restrict,
  indicator_id uuid not null references public.rubric_indicators(id) on delete restrict,
  status text not null default 'needs_review' check (status in ('needs_review','clarification_requested','discussion_scheduled','reviewed','resolved')),
  score_range smallint not null check (score_range >= 2),
  moderator_id uuid references auth.users(id),
  reason text not null default '',
  outcome text not null default '',
  discussion_scheduled_for timestamptz,
  decision text check (decision is null or decision in ('retain_average','consensus')),
  consensus_score numeric(3,2) check (consensus_score is null or consensus_score between 1 and 5),
  additional_notes text not null default '',
  reviewed_at timestamptz,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (participant_id,rubric_version_id,indicator_id)
);
create index if not exists assessment_moderations_event_status_idx on public.assessment_moderations(event_id,status,updated_at desc);
alter table public.assessment_moderations enable row level security;
drop policy if exists assessment_moderations_read_moderators on public.assessment_moderations;
create policy assessment_moderations_read_moderators on public.assessment_moderations for select to authenticated using ((select public.is_assessment_moderator(event_id)));
drop policy if exists assessment_moderations_insert_moderators on public.assessment_moderations;
create policy assessment_moderations_insert_moderators on public.assessment_moderations for insert to authenticated with check ((select public.is_assessment_moderator(event_id)) and moderator_id=(select auth.uid()));
drop policy if exists assessment_moderations_update_moderators on public.assessment_moderations;
create policy assessment_moderations_update_moderators on public.assessment_moderations for update to authenticated using ((select public.is_assessment_moderator(event_id))) with check ((select public.is_assessment_moderator(event_id)) and moderator_id=(select auth.uid()));
grant select,insert,update on public.assessment_moderations to authenticated;
revoke all on public.assessment_moderations from anon;

create table if not exists public.assessment_moderation_revisions (
  id bigint generated always as identity primary key,
  moderation_id uuid not null references public.assessment_moderations(id) on delete restrict,
  revision integer not null,
  status_before text not null,
  status_after text not null,
  reason text not null,
  outcome text not null,
  discussion_scheduled_for timestamptz,
  decision text,
  consensus_score numeric(3,2),
  changed_by uuid not null references auth.users(id),
  changed_at timestamptz not null default now(),
  unique(moderation_id,revision)
);
alter table public.assessment_moderation_revisions enable row level security;
drop policy if exists assessment_moderation_revisions_read_moderators on public.assessment_moderation_revisions;
create policy assessment_moderation_revisions_read_moderators on public.assessment_moderation_revisions for select to authenticated
  using (exists(select 1 from public.assessment_moderations m where m.id=moderation_id and (select public.is_assessment_moderator(m.event_id))));
grant select on public.assessment_moderation_revisions to authenticated;
grant usage,select on sequence public.assessment_moderation_revisions_id_seq to authenticated;

create or replace function public.track_assessment_moderation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op='UPDATE' then
    if old.event_id<>new.event_id or old.participant_id<>new.participant_id or old.rubric_version_id<>new.rubric_version_id or old.indicator_id<>new.indicator_id then
      raise exception 'Cakupan moderasi tidak dapat diubah.';
    end if;
    new.revision:=old.revision+1; new.updated_at:=now();
    if new.status in ('reviewed','resolved') and old.status not in ('reviewed','resolved') then new.reviewed_at:=now(); end if;
    insert into public.assessment_moderation_revisions(moderation_id,revision,status_before,status_after,reason,outcome,discussion_scheduled_for,decision,consensus_score,changed_by)
    values(old.id,new.revision,old.status,new.status,new.reason,new.outcome,new.discussion_scheduled_for,new.decision,new.consensus_score,auth.uid());
  end if;
  return new;
end $$;
drop trigger if exists assessment_moderation_track on public.assessment_moderations;
create trigger assessment_moderation_track before update on public.assessment_moderations for each row execute function public.track_assessment_moderation();

create table if not exists public.collective_evaluations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  participant_id uuid not null references public.participants(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft','finalized')),
  strengths text not null default '' check (char_length(strengths)<=5000),
  development_areas text not null default '' check (char_length(development_areas)<=5000),
  evidence_references jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence_references)='array'),
  discussion_notes text not null default '' check (char_length(discussion_notes)<=10000),
  collective_summary text not null default '' check (char_length(collective_summary)<=10000),
  recommendation_summary text not null default '' check (char_length(recommendation_summary)<=5000),
  graduation_decision text check (graduation_decision is null or graduation_decision in ('pass','not_pass','further_discussion')),
  decision_rationale text not null default '' check (char_length(decision_rationale)<=5000),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  revision integer not null default 1 check (revision > 0),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id,participant_id),
  check ((status='draft' and approved_by is null and approved_at is null) or (status='finalized' and approved_by is not null and approved_at is not null and graduation_decision is not null and char_length(trim(decision_rationale))>=10))
);
alter table public.collective_evaluations enable row level security;
drop policy if exists collective_evaluations_read_authorized on public.collective_evaluations;
create policy collective_evaluations_read_authorized on public.collective_evaluations for select to authenticated using ((select public.is_admin_system()) or (select public.is_assessment_moderator(event_id)));
drop policy if exists collective_evaluations_insert_moderators on public.collective_evaluations;
create policy collective_evaluations_insert_moderators on public.collective_evaluations for insert to authenticated with check ((select public.is_assessment_moderator(event_id)) and updated_by=(select auth.uid()) and status='draft');
drop policy if exists collective_evaluations_update_moderators on public.collective_evaluations;
create policy collective_evaluations_update_moderators on public.collective_evaluations for update to authenticated using ((select public.is_assessment_moderator(event_id)) and status='draft') with check ((select public.is_assessment_moderator(event_id)) and updated_by=(select auth.uid()) and status='draft');
grant select,insert,update on public.collective_evaluations to authenticated;
revoke all on public.collective_evaluations from anon;

create table if not exists public.collective_evaluation_revisions (
  id bigint generated always as identity primary key,
  evaluation_id uuid not null references public.collective_evaluations(id) on delete restrict,
  revision integer not null,
  snapshot jsonb not null,
  changed_by uuid not null references auth.users(id),
  changed_at timestamptz not null default now(),
  unique(evaluation_id,revision)
);
alter table public.collective_evaluation_revisions enable row level security;
drop policy if exists collective_evaluation_revisions_read_authorized on public.collective_evaluation_revisions;
create policy collective_evaluation_revisions_read_authorized on public.collective_evaluation_revisions for select to authenticated
  using (exists(select 1 from public.collective_evaluations e where e.id=evaluation_id and ((select public.is_assessment_moderator(e.event_id)) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('admin_system','bidang_kader')))));
grant select on public.collective_evaluation_revisions to authenticated;
grant usage,select on sequence public.collective_evaluation_revisions_id_seq to authenticated;

create or replace function public.track_collective_evaluation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op='UPDATE' then
    if old.event_id<>new.event_id or old.participant_id<>new.participant_id then raise exception 'Cakupan evaluasi kolektif tidak dapat diubah.'; end if;
    if old.status='finalized' then raise exception 'Evaluasi final terkunci; gunakan proses revisi pada fase berikutnya.'; end if;
    new.revision:=old.revision+1; new.updated_at:=now();
    if new.status='finalized' then new.approved_at:=now(); new.approved_by:=auth.uid(); end if;
    insert into public.collective_evaluation_revisions(evaluation_id,revision,snapshot,changed_by)
    values(old.id,new.revision,to_jsonb(old),auth.uid());
  end if;
  return new;
end $$;
drop trigger if exists collective_evaluation_track on public.collective_evaluations;
create trigger collective_evaluation_track before update on public.collective_evaluations for each row execute function public.track_collective_evaluation();

create table if not exists public.development_recommendations (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.collective_evaluations(id) on delete restrict,
  participant_id uuid not null references public.participants(id) on delete restrict,
  recommendation text not null check (char_length(trim(recommendation)) between 10 and 2000),
  evidence_references jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence_references)='array'),
  status text not null default 'draft' check (status in ('draft','approved')),
  created_by uuid not null references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  check ((status='draft' and approved_by is null and approved_at is null) or (status='approved' and approved_by is not null and approved_at is not null))
);
alter table public.development_recommendations enable row level security;
drop policy if exists development_recommendations_read_authorized on public.development_recommendations;
create policy development_recommendations_read_authorized on public.development_recommendations for select to authenticated using (
  exists(select 1 from public.collective_evaluations e where e.id=evaluation_id and (select public.is_assessment_moderator(e.event_id)))
  or (development_recommendations.status='approved' and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('admin_system','bidang_kader')))
);
drop policy if exists development_recommendations_insert_moderators on public.development_recommendations;
create policy development_recommendations_insert_moderators on public.development_recommendations for insert to authenticated with check (created_by=(select auth.uid()) and status='draft' and exists(select 1 from public.collective_evaluations e where e.id=evaluation_id and e.status='draft' and (select public.is_assessment_moderator(e.event_id))));
drop policy if exists development_recommendations_update_moderators on public.development_recommendations;
create policy development_recommendations_update_moderators on public.development_recommendations for update to authenticated using (exists(select 1 from public.collective_evaluations e where e.id=evaluation_id and e.status='draft' and (select public.is_assessment_moderator(e.event_id)))) with check (exists(select 1 from public.collective_evaluations e where e.id=evaluation_id and (select public.is_assessment_moderator(e.event_id))));
grant select,insert,update on public.development_recommendations to authenticated;
revoke all on public.development_recommendations from anon;

create table if not exists public.assessment_snapshots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  participant_id uuid not null references public.participants(id) on delete restrict,
  collective_evaluation_id uuid not null references public.collective_evaluations(id) on delete restrict,
  revision integer not null default 1 check (revision>0),
  framework_version_ids jsonb not null check (jsonb_typeof(framework_version_ids)='array'),
  rubric_version_ids jsonb not null check (jsonb_typeof(rubric_version_ids)='array'),
  source_rating_ids jsonb not null check (jsonb_typeof(source_rating_ids)='array'),
  snapshot_data jsonb not null check (jsonb_typeof(snapshot_data)='object'),
  finalized_by uuid not null references auth.users(id),
  finalized_at timestamptz not null default now(),
  unique(event_id,participant_id,revision)
);
alter table public.assessment_snapshots enable row level security;
drop policy if exists assessment_snapshots_read_authorized on public.assessment_snapshots;
create policy assessment_snapshots_read_authorized on public.assessment_snapshots for select to authenticated using ((select public.is_admin_system()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='bidang_kader') or (select public.is_assessment_moderator(event_id)));
drop policy if exists assessment_snapshots_insert_moderators on public.assessment_snapshots;
grant select on public.assessment_snapshots to authenticated;
revoke insert on public.assessment_snapshots from authenticated;
revoke all on public.assessment_snapshots from anon;

create table if not exists public.assessment_snapshot_private_sources (
  snapshot_id uuid primary key references public.assessment_snapshots(id) on delete restrict,
  private_payload jsonb not null check (jsonb_typeof(private_payload)='object'),
  created_at timestamptz not null default now()
);
alter table public.assessment_snapshot_private_sources enable row level security;
drop policy if exists assessment_snapshot_private_sources_read_moderators on public.assessment_snapshot_private_sources;
create policy assessment_snapshot_private_sources_read_moderators on public.assessment_snapshot_private_sources for select to authenticated using (
  exists(select 1 from public.assessment_snapshots s where s.id=snapshot_id and (select public.is_assessment_moderator(s.event_id)))
);
drop policy if exists assessment_snapshot_private_sources_insert_moderators on public.assessment_snapshot_private_sources;
grant select on public.assessment_snapshot_private_sources to authenticated;
revoke insert on public.assessment_snapshot_private_sources from authenticated;
revoke all on public.assessment_snapshot_private_sources from anon;

create or replace function public.prevent_assessment_snapshot_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'Snapshot hasil final bersifat tetap; buat revisi bernomor baru.'; end $$;
drop trigger if exists assessment_snapshots_immutable on public.assessment_snapshots;
create trigger assessment_snapshots_immutable before update or delete on public.assessment_snapshots for each row execute function public.prevent_assessment_snapshot_mutation();
drop trigger if exists assessment_snapshot_private_sources_immutable on public.assessment_snapshot_private_sources;
create trigger assessment_snapshot_private_sources_immutable before update or delete on public.assessment_snapshot_private_sources for each row execute function public.prevent_assessment_snapshot_mutation();

drop function if exists public.finalize_collective_evaluation(uuid,text,text,jsonb,jsonb,jsonb,jsonb);
create or replace function public.finalize_collective_evaluation(
  target_evaluation_id uuid, target_decision text, target_rationale text,
  target_framework_versions jsonb, target_rubric_versions jsonb, target_rating_ids jsonb, target_snapshot jsonb, target_private_sources jsonb
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare target_event uuid; target_participant uuid; created_snapshot uuid; policy_minimum numeric; computed_overall numeric; total_weight numeric; aspect jsonb;
begin
  select e.event_id,e.participant_id into target_event,target_participant
  from public.collective_evaluations e where e.id=target_evaluation_id and e.status='draft';
  if target_event is null or not public.is_assessment_moderator(target_event) then
    raise exception 'Evaluasi draf tidak ditemukan atau akun tidak berwenang.' using errcode='42501';
  end if;
  if target_decision not in ('pass','not_pass','further_discussion') or char_length(trim(target_rationale))<10 then
    raise exception 'Keputusan dan alasan minimal 10 karakter wajib diisi.';
  end if;
  if jsonb_typeof(target_snapshot)<>'object' or target_snapshot->'overall'->>'status'<>'ready_for_collective_evaluation' then
    raise exception 'Coverage belum memadai; hasil tetap provisional dan belum dapat difinalisasi.';
  end if;
  if jsonb_typeof(target_private_sources)<>'object' or jsonb_typeof(target_snapshot->'aspects')<>'array' then
    raise exception 'Struktur snapshot atau sumber privat tidak valid.';
  end if;
  select minimum_coverage into policy_minimum from public.assessment_scoring_policies where id=true;
  select coalesce(sum((a->>'weight')::numeric),0),
         sum(((a->>'score')::numeric/5)*(a->>'weight')::numeric)
    into total_weight,computed_overall
    from jsonb_array_elements(target_snapshot->'aspects') a;
  if total_weight not between 99.999 and 100.001 or computed_overall is null
     or abs(computed_overall-(target_snapshot->'overall'->>'score')::numeric)>0.02 then
    raise exception 'Bobot atau nilai keseluruhan snapshot tidak sesuai rumus.';
  end if;
  for aspect in select value from jsonb_array_elements(target_snapshot->'aspects') loop
    if coalesce((aspect->>'valid')::boolean,false) is not true
       or coalesce((aspect->>'coverage')::numeric,0)<policy_minimum
       or (aspect->>'score') is null then
      raise exception 'Setiap aspek harus memenuhi coverage minimum sebelum finalisasi.';
    end if;
  end loop;
  if jsonb_typeof(coalesce(target_rating_ids,'[]'::jsonb))<>'array'
     or exists(select 1 from jsonb_array_elements_text(coalesce(target_rating_ids,'[]'::jsonb)) x(id)
       where not exists(select 1 from public.assessment_ratings r join public.assessment_submissions s on s.id=r.submission_id
         where r.id=(x.id)::uuid and r.participant_id=target_participant and s.participant_id=target_participant
           and s.status in ('submitted','finalized') and exists(select 1 from public.rubric_versions v where v.id=s.rubric_version_id and v.event_id=target_event))) then
    raise exception 'Referensi nilai sumber tidak valid.';
  end if;
  if exists(select 1 from public.assessment_moderations m where m.event_id=target_event and m.participant_id=target_participant and m.status not in ('reviewed','resolved')) then
    raise exception 'Masih ada perbedaan skor yang belum dimoderasi.';
  end if;
  if exists(
    select 1 from public.get_event_assessment_summary(target_event) a
    where a.participant_id=target_participant and a.review_status='needs_review'
      and not exists(
        select 1 from public.assessment_moderations m
        join public.rubric_indicators ri on ri.id=m.indicator_id
        where m.event_id=target_event and m.participant_id=target_participant
          and coalesce(ri.competency_indicator_id,ri.id)=a.indicator_id
          and m.rubric_version_id=any(a.source_rubric_version_ids)
          and m.status in ('reviewed','resolved')
      )
  ) then raise exception 'Semua perbedaan skor yang melewati ambang harus dimoderasi.'; end if;
  update public.collective_evaluations set status='finalized',graduation_decision=target_decision,
    decision_rationale=target_rationale,updated_by=auth.uid()
    where id=target_evaluation_id and status='draft';
  insert into public.assessment_snapshots(event_id,participant_id,collective_evaluation_id,revision,framework_version_ids,rubric_version_ids,source_rating_ids,snapshot_data,finalized_by)
  values(target_event,target_participant,target_evaluation_id,1,coalesce(target_framework_versions,'[]'::jsonb),
    coalesce(target_rubric_versions,'[]'::jsonb),coalesce(target_rating_ids,'[]'::jsonb),target_snapshot,auth.uid())
  returning id into created_snapshot;
  insert into public.assessment_snapshot_private_sources(snapshot_id,private_payload)
  values(created_snapshot,coalesce(target_private_sources,'{}'::jsonb));
  return created_snapshot;
end $$;
revoke all on function public.finalize_collective_evaluation(uuid,text,text,jsonb,jsonb,jsonb,jsonb,jsonb) from public;
grant execute on function public.finalize_collective_evaluation(uuid,text,text,jsonb,jsonb,jsonb,jsonb,jsonb) to authenticated;

comment on table public.assessment_moderations is 'Phase 6: moderation state separate from immutable individual observer ratings.';
comment on table public.collective_evaluations is 'Phase 6: collective instructor discussion and explicit non-automatic graduation decision.';
comment on table public.assessment_snapshots is 'Phase 6: immutable final score/decision snapshot with exact source versions and rating IDs.';
comment on table public.assessment_snapshot_private_sources is 'Private immutable source ratings, evidence, and moderation detail; never exposed to Bidang Kader aggregate readers.';
