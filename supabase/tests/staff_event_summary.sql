-- Kontrak get_staff_event_summary: satu peserta dihitung sekali memakai
-- snapshot terbaru, dan Kader menerima rekap agregat yang sama dengan Admin.
-- Jalankan di DEV. Transaksi di-rollback di akhir penguji.
begin;

select id::text as kader_id from public.profiles where role='bidang_kader' limit 1 \gset
select id::text as ev_id from public.events order by starts_on desc limit 1 \gset
select id::text as admin_id from public.profiles where role='admin_system' limit 1 \gset
select set_config('imm_test.kader', :'kader_id', true);
select set_config('imm_test.event', :'ev_id', true);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'admin_id', true);

do $$
declare
  ev record;
  summary record;
  expected record;
begin
  for ev in select id, name from public.events loop
    with report_rows as (
      select * from public.get_event_report_rows(ev.id)
    ), latest as (
      select distinct on (participant_id)
             participant_id, snapshot_id, snapshot_data, published_at, finalized_at
      from report_rows
      order by participant_id, finalized_at desc nulls last
    ), scored as (
      select snapshot_id is not null as has_snapshot,
             published_at is not null as has_publication,
             case
               when snapshot_data->'overall' is null
                 or not (snapshot_data->'overall' ? 'score')
                 then null::numeric
               when nullif(btrim(snapshot_data->'overall'->>'score'), '') is null
                 then 0::numeric
               when nullif(btrim(snapshot_data->'overall'->>'score'), '') ~ '^-?[0-9]+(\.[0-9]+)?$'
                 then nullif(btrim(snapshot_data->'overall'->>'score'), '')::numeric
               else null::numeric
             end as score_value,
             snapshot_data->'collective'->>'decision' as decision
      from latest
    )
    select count(*)::integer as participants,
           count(*) filter (where has_snapshot)::integer as finalized,
           count(*) filter (where has_publication)::integer as published,
           count(*) filter (where not has_snapshot)::integer as provisional,
           count(*) filter (where decision = 'pass')::integer as passed,
           count(*) filter (where decision = 'not_pass')::integer as not_passed,
           count(*) filter (where decision = 'further_discussion')::integer as further_discussion,
           avg(score_value) filter (where has_snapshot) as average_score
    into expected
    from scored;

    select * into summary from public.get_staff_event_summary(ev.id);

    if summary.participants is distinct from expected.participants
      or summary.finalized is distinct from expected.finalized
      or summary.published is distinct from expected.published
      or summary.provisional is distinct from expected.provisional
      or summary.passed is distinct from expected.passed
      or summary.not_passed is distinct from expected.not_passed
      or summary.further_discussion is distinct from expected.further_discussion
      or summary.average_score is distinct from expected.average_score then
      raise exception 'Ringkasan berbeda untuk event % (%)', ev.name, ev.id;
    end if;
  end loop;
  raise notice 'get_staff_event_summary menghitung satu peserta sekali untuk semua event.';
end $$;

do $$
declare admin_summary record; kader_summary record;
begin
  select * into admin_summary
    from public.get_staff_event_summary(current_setting('imm_test.event', true)::uuid);
  perform set_config('request.jwt.claim.sub', current_setting('imm_test.kader', true), true);
  select * into kader_summary
    from public.get_staff_event_summary(current_setting('imm_test.event', true)::uuid);
  if kader_summary is distinct from admin_summary then
    raise exception 'Rekap Kader berbeda dari rekap Admin.';
  end if;
  raise notice 'Kader menerima rekap agregat yang sama dengan Admin.';
end $$;

-- Akun tanpa peran tidak boleh memanggil fungsi ini.
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000000';
do $$
declare caught text;
begin
  begin
    perform public.get_staff_event_summary('00000000-0000-0000-0000-000000000000'::uuid);
  exception when others then
    caught := sqlstate;
  end;
  if caught is distinct from '42501' then
    raise exception 'Akses tanpa peran: diharapkan 42501, diperoleh %', coalesce(caught, 'tanpa exception');
  end if;
  raise notice 'Akses tanpa peran ditolak.';
end $$;

rollback;
