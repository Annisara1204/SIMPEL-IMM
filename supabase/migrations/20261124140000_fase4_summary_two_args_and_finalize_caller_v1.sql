-- Fase 4 — kontrak RPC dua argumen.
-- get_event_assessment_summary(target_event_id, target_participant_id):
-- isi salinan 20261112190000_fix_get_event_assessment_summary_ambiguous.sql
-- dengan satu filter tambahan di CTE planned. Signature lama (uuid) dihapus
-- eksplisit; grant mengikat signature sehingga revoke/grant diulang untuk
-- signature (uuid,uuid).
drop function if exists public.get_event_assessment_summary(uuid);

create or replace function public.get_event_assessment_summary(
  target_event_id uuid, target_participant_id uuid default null
)
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
      and (target_participant_id is null or p.id=target_participant_id)
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
revoke all on function public.get_event_assessment_summary(uuid,uuid) from public;
grant execute on function public.get_event_assessment_summary(uuid,uuid) to authenticated;

-- Pemanggil internal SQL: versi terbaru finalize_collective_evaluation()
-- (20261124101000) memanggil rekap dengan satu argumen. Salinan ini memakai
-- target_participant (peserta evaluasi yang difinalisasi) sebagai argumen
-- kedua agar gate moderasi tetap hanya memeriksa peserta yang bersangkutan.
-- Header, gate, next_revision, RLS, trigger immutable, dan index unik tidak
-- diubah; signature delapan argumen tetap sama sehingga grant lama berlaku.
create or replace function public.finalize_collective_evaluation(
  target_evaluation_id uuid, target_decision text, target_rationale text,
  target_framework_versions jsonb, target_rubric_versions jsonb, target_rating_ids jsonb, target_snapshot jsonb, target_private_sources jsonb
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare target_event uuid; target_participant uuid; created_snapshot uuid; policy_minimum numeric; computed_overall numeric; total_weight numeric; aspect jsonb; next_revision integer;
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
  if exists(select 1 from public.assessment_moderations m where m.event_id=target_event and m.participant_id=target_participant and m.status not in ('reviewed','resolved')
      and m.rubric_version_id = any(array(select jsonb_array_elements_text(target_rubric_versions))::uuid[])) then
    raise exception 'Masih ada perbedaan skor yang belum dimoderasi.';
  end if;
  if exists(
    select 1 from public.get_event_assessment_summary(target_event,target_participant) a
    where a.participant_id=target_participant and a.review_status='needs_review'
      and exists(
        select 1 from unnest(a.source_rubric_version_ids) sv(id)
        join jsonb_array_elements_text(target_rubric_versions) tv on tv.value::uuid = sv.id
      )
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
  select coalesce(max(s.revision),0)+1 into next_revision from public.assessment_snapshots s where s.collective_evaluation_id = target_evaluation_id;
  insert into public.assessment_snapshots(event_id,participant_id,collective_evaluation_id,revision,framework_version_ids,rubric_version_ids,source_rating_ids,snapshot_data,finalized_by)
  values(target_event,target_participant,target_evaluation_id,next_revision,coalesce(target_framework_versions,'[]'::jsonb),
    coalesce(target_rubric_versions,'[]'::jsonb),coalesce(target_rating_ids,'[]'::jsonb),target_snapshot,auth.uid())
  returning id into created_snapshot;
  insert into public.assessment_snapshot_private_sources(snapshot_id,private_payload)
  values(created_snapshot,coalesce(target_private_sources,'{}'::jsonb));
  return created_snapshot;
end $$;
