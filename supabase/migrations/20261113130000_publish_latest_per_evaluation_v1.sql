-- Tahap 13 Nov 2026: rapor diterbitkan per evaluasi (per jenis penilaian);
-- snapshot terbaru yang bisa diterbitkan dinilai dalam evaluasi yang sama,
-- bukan lintas jenis lintas evaluasi.
create or replace function public.publish_assessment_report(target_snapshot_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare ev uuid; person uuid; evaluation uuid; revision_number integer; latest_snapshot uuid;
begin
  select s.event_id, s.participant_id, s.collective_evaluation_id into ev, person, evaluation
  from public.assessment_snapshots s where s.id = target_snapshot_id;
  if ev is null then raise exception 'Snapshot final tidak ditemukan.'; end if;
  if not (public.is_admin_system() or public.is_assessment_moderator(ev)
    or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='bidang_kader')) then
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
  select coalesce(max(p.revision),0)+1 into revision_number from public.assessment_report_publications p where p.participant_id=person;
  insert into public.assessment_report_publications(snapshot_id,event_id,participant_id,published_by,published_at,revision)
  values(target_snapshot_id,ev,person,(select auth.uid()),now(),revision_number)
  on conflict(snapshot_id) do update set published_by=excluded.published_by,published_at=excluded.published_at,revision=excluded.revision;
  insert into public.assessment_report_publication_audit(snapshot_id,event_id,participant_id,action,actor_id,publication_revision)
  values(target_snapshot_id,ev,person,case when revision_number=1 then 'published' else 'republished' end,(select auth.uid()),revision_number);
  return target_snapshot_id;
end $$;
