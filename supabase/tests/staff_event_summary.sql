-- Kontrak dan kesetaraan angka get_staff_event_summary. Jalankan di DEV.
-- Fixture tidak dibuat; transaksi di-rollback di akhir penguji.
begin;

do $$
declare actor uuid;
begin
  select p.id into actor from public.profiles p
   where p.role = 'admin_system'
   order by p.created_at nulls last, p.id limit 1;
  if actor is null then
    raise exception 'Penguji memerlukan profil admin_system.';
  end if;
  perform set_config('imm_test.actor', actor::text, true);
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('imm_test.actor'), true);

do $$
declare
  ev record;
  summary record;
  old_participants integer;
  old_finalized integer;
  old_published integer;
  old_provisional integer;
  old_passed integer;
  old_not_passed integer;
  old_further integer;
  old_average numeric;
begin
  for ev in select id, name from public.events loop
    select
      count(*)::integer,
      count(snapshot_id)::integer,
      count(published_at)::integer,
      (count(*) - count(snapshot_id))::integer,
      count(*) filter (
        where snapshot_id is not null
          and snapshot_data->'collective'->>'decision' = 'pass'
      )::integer,
      count(*) filter (
        where snapshot_id is not null
          and snapshot_data->'collective'->>'decision' = 'not_pass'
      )::integer,
      count(*) filter (
        where snapshot_id is not null
          and snapshot_data->'collective'->>'decision' = 'further_discussion'
      )::integer,
      avg(case
            when snapshot_id is null or snapshot_data->'overall' is null
                 or not (snapshot_data->'overall' ? 'score')
              then null::numeric
            when nullif(btrim(snapshot_data->'overall'->>'score'), '') is null
              then 0::numeric
            when nullif(btrim(snapshot_data->'overall'->>'score'), '') ~ '^-?[0-9]+(\.[0-9]+)?$'
              then nullif(btrim(snapshot_data->'overall'->>'score'), '')::numeric
            else null::numeric
          end)
    into old_participants, old_finalized, old_published, old_provisional,
         old_passed, old_not_passed, old_further, old_average
    from public.get_event_report_rows(ev.id);

    select * into summary from public.get_staff_event_summary(ev.id);

    if summary.participants is distinct from old_participants
      or summary.finalized is distinct from old_finalized
      or summary.published is distinct from old_published
      or summary.provisional is distinct from old_provisional
      or summary.passed is distinct from old_passed
      or summary.not_passed is distinct from old_not_passed
      or summary.further_discussion is distinct from old_further
      or summary.average_score is distinct from old_average then
      raise exception 'Ringkasan berbeda untuk event % (%)', ev.name, ev.id;
    end if;
  end loop;
  raise notice 'get_staff_event_summary cocok dengan get_event_report_rows untuk semua event.';
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
