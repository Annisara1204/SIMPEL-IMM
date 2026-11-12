-- Tahap 13 Nov 2026: gate moderasi finalisasi dibatasi ke jenis penilaian
-- yang difinalisasi (bukan seluruh event), selaras dengan evaluasi per jenis.
-- Logika lain tidak diubah; perilaku review/resolved tetap sama.
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
  if exists(select 1 from public.assessment_moderations m where m.event_id=target_event and m.participant_id=target_participant and m.status not in ('reviewed','resolved')
      and m.rubric_version_id = any(array(select jsonb_array_elements_text(target_rubric_versions))::uuid[])) then
    raise exception 'Masih ada perbedaan skor yang belum dimoderasi.';
  end if;
  if exists(
    select 1 from public.get_event_assessment_summary(target_event) a
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
  insert into public.assessment_snapshots(event_id,participant_id,collective_evaluation_id,revision,framework_version_ids,rubric_version_ids,source_rating_ids,snapshot_data,finalized_by)
  values(target_event,target_participant,target_evaluation_id,1,coalesce(target_framework_versions,'[]'::jsonb),
    coalesce(target_rubric_versions,'[]'::jsonb),coalesce(target_rating_ids,'[]'::jsonb),target_snapshot,auth.uid())
  returning id into created_snapshot;
  insert into public.assessment_snapshot_private_sources(snapshot_id,private_payload)
  values(created_snapshot,coalesce(target_private_sources,'{}'::jsonb));
  return created_snapshot;
end $$;
