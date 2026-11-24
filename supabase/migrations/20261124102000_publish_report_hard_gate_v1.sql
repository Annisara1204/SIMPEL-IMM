-- Fase 2 / 2f: gate terbit keras. Bidang Kader tidak lagi dapat menerbitkan
-- rapor; otoritas ada di Admin Sistem dan koordinator kegiatan.
-- Salinan publish_assessment_report() dari
-- 20261113130000_publish_latest_per_evaluation_v1.sql:4-32 dengan tambahan
-- pemeriksaan isi snapshot sebelum insert publikasi.
create or replace function public.publish_assessment_report(target_snapshot_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare ev uuid; person uuid; evaluation uuid; revision_number integer; latest_snapshot uuid;
        policy_minimum numeric; snapshot_payload jsonb; snapshot_rubrics jsonb; rationale_text text;
begin
  select s.event_id, s.participant_id, s.collective_evaluation_id into ev, person, evaluation
  from public.assessment_snapshots s where s.id = target_snapshot_id;
  if ev is null then raise exception 'Snapshot final tidak ditemukan.'; end if;
  select pol.minimum_coverage, snap.snapshot_data, snap.rubric_version_ids, evl.decision_rationale
    into policy_minimum, snapshot_payload, snapshot_rubrics, rationale_text
  from public.assessment_snapshots snap
  join public.collective_evaluations evl on evl.id = snap.collective_evaluation_id
  join public.assessment_scoring_policies pol on pol.id = true
  where snap.id = target_snapshot_id;
  if policy_minimum is null then
    raise exception 'Konfigurasi minimum_coverage tidak ditemukan.';
  end if;
  if not (public.is_admin_system() or public.is_assessment_moderator(ev)) then
    raise exception 'Akun tidak berwenang menerbitkan rapor.' using errcode='42501';
  end if;
  if not exists(select 1 from public.collective_evaluations e
      where e.id = evaluation and e.status='finalized') then
    raise exception 'Rapor hanya dapat diterbitkan dari evaluasi final.';
  end if;
  select s.id into latest_snapshot
  from public.assessment_snapshots s
  where s.collective_evaluation_id = evaluation
  order by s.revision desc
  limit 1;
  if latest_snapshot is distinct from target_snapshot_id then raise exception 'Hanya snapshot final terbaru yang dapat diterbitkan.'; end if;
  if coalesce(snapshot_payload->'overall'->>'status','') <> 'ready_for_collective_evaluation'
     or coalesce(jsonb_typeof(snapshot_payload->'aspects'),'') <> 'array'
     or exists (select 1 from jsonb_array_elements(snapshot_payload->'aspects') a
                where coalesce((a->>'valid')::boolean,false) is not true
                   or coalesce((a->>'coverage')::numeric,0) < policy_minimum
                   or (a->>'score') is null)
     or char_length(trim(coalesce(rationale_text,''))) < 10
     or jsonb_array_length(snapshot_rubrics) = 0
     or exists (select 1 from public.assessment_moderations m
                where m.event_id=ev and m.participant_id=person
                  and m.status not in ('reviewed','resolved')
                  and m.rubric_version_id = any(array(select jsonb_array_elements_text(snapshot_rubrics))::uuid[]))
  then raise exception 'Snapshot belum memenuhi syarat terbit.'; end if;
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
