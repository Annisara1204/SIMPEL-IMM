-- Fase 3a: ekspor hanya Admin Sistem dan koordinator yang ditugaskan.
-- Kader tidak lagi berwenang mencatat ekspor; Peserta tetap pada individual_pdf.
create or replace function public.record_assessment_export(target_event_id uuid,target_export_type text,target_filters jsonb default '{}'::jsonb)
returns bigint language plpgsql security definer set search_path='' as $$
declare new_id bigint;
begin
  if target_export_type not in ('individual_pdf','bulk_pdf','assessment_excel','observer_excel','event_report_pdf') then raise exception 'Jenis ekspor tidak valid.'; end if;
  if not (public.is_admin_system() or public.is_assessment_moderator(target_event_id)
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
