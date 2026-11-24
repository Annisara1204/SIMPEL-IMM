-- Fase 2 / Opsi B: yang boleh menulis status 'finalized' adalah Admin Sistem
-- dan empat subrole koordinator kegiatan. is_assessment_moderator() sudah
-- mencakup admin_system (20261112170000:13-25).
-- Salinan track_assessment_submission() dari 20261111160000:128-154; satu-satunya
-- perubahan ada pada pemeriksaan status finalized.
drop trigger if exists assessment_submissions_track on public.assessment_submissions;
create or replace function public.track_assessment_submission()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op='UPDATE' then
    if old.id<>new.id or old.rubric_version_id<>new.rubric_version_id or old.participant_id<>new.participant_id or old.observer_id<>new.observer_id then
      raise exception 'Kepemilikan atau cakupan asesmen tidak dapat diubah.';
    end if;
    if old.status='finalized' then raise exception 'Asesmen final tidak dapat diubah.'; end if;
    if new.status='finalized' and not public.is_assessment_moderator((select p.event_id from public.participants p where p.id=new.participant_id)) then raise exception 'Hanya Admin Sistem atau koordinator yang dapat memfinalisasi.' using errcode='42501'; end if;
    if old.status is distinct from new.status then
      if not ((old.status='draft' and new.status='submitted') or (old.status='submitted' and new.status='draft') or (old.status='submitted' and new.status='finalized')) then
        raise exception 'Perubahan status asesmen tidak valid.';
      end if;
      new.revision:=old.revision+1;
      new.updated_at:=now();
      if new.status='submitted' then new.submitted_at:=now(); end if;
      if new.status='finalized' then new.finalized_at:=now(); new.finalized_by:=auth.uid(); end if;
      insert into public.assessment_submission_revisions(submission_id,revision,status_before,status_after,changed_by)
      values(old.id,new.revision,old.status,new.status,auth.uid());
    end if;
  end if;
  return new;
end $$;
create trigger assessment_submissions_track before update on public.assessment_submissions
for each row execute function public.track_assessment_submission();
