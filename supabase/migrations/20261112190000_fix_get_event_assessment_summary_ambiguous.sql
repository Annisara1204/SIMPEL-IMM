-- Fix: get_event_assessment_summary failed with 42702 (column reference "participant_id" is ambiguous).
-- PL/pgSQL default variable_conflict mode is "error"; the function's OUT parameters share names
-- with table columns. Adding the use_column directive keeps column resolution identical otherwise.
-- No scoring logic, weights, or formula changes.
create or replace function public.get_event_assessment_summary(target_event_id uuid)
returns table (
  participant_id uuid, indicator_id uuid, assessment_scope text, assessment_scope_key text, source_rubric_version_ids uuid[],
  average_score numeric, valid_rating_count integer, minimum_score smallint, maximum_score smallint,
  score_range smallint, not_observed_count integer, pending_count integer, review_status text,
  aspect_id uuid, aspect_name text, aspect_weight numeric, indicator_weight numeric
) language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
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
