-- Structural checks for reporting/publication. Run after migrations 1600, 1700, and 1800.
do $$
declare missing_rls text;
begin
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='participants' and column_name='account_user_id') then raise exception 'Tautan akun peserta belum dibuat.'; end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='events' and column_name in ('theme','organizer') group by table_name having count(*)=2) then raise exception 'Kolom tema/penyelenggara kegiatan belum lengkap.'; end if;
  if not exists(select 1 from pg_proc where proname='publish_assessment_report') or not exists(select 1 from pg_proc where proname='get_my_published_assessment_report') or not exists(select 1 from pg_proc where proname='get_event_report_rows') or not exists(select 1 from pg_proc where proname='get_event_assessment_progress') then raise exception 'RPC publikasi/laporan/progres belum tersedia.'; end if;
  select string_agg(required.table_name,', ') into missing_rls from (values ('assessment_report_publications'),('assessment_report_publication_audit'),('assessment_export_audit')) required(table_name)
    left join pg_class c on c.relname=required.table_name and c.relnamespace='public'::regnamespace where c.oid is null or not c.relrowsecurity;
  if missing_rls is not null then raise exception 'RLS belum aktif: %',missing_rls; end if;
  if exists(select 1 from public.assessment_report_publications publication join public.collective_evaluations evaluation on evaluation.event_id=publication.event_id and evaluation.participant_id=publication.participant_id where evaluation.status<>'finalized') then
    raise exception 'Ada publication tanpa evaluasi finalized.';
  end if;
  raise notice 'Phase 7 reporting structural checks passed.';
end $$;
