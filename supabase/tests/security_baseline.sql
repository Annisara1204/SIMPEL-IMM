-- Pengawas regresi K10/K11: policy aktif tidak memakai can_manage_events dan
-- hanya RPC agregat publik yang memberi EXECUTE eksplisit kepada anon.
-- Jalankan di DEV; transaksi di-rollback.
\set ON_ERROR_STOP on
begin;

do $$
declare
  stale_policies integer;
  anon_functions text;
begin
  select count(*) into stale_policies
  from pg_policies
  where schemaname = 'public'
    and (coalesce(qual, '') || coalesce(with_check, '')) like '%can_manage_events%';
  if stale_policies <> 0 then
    raise exception 'Masih ada % policy aktif yang memakai can_manage_events.', stale_policies;
  end if;

  select string_agg(p.proname, ', ' order by p.proname) into anon_functions
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and array_to_string(coalesce(p.proacl, '{}'), ',') like '%anon=X%'
    and p.proname <> 'get_public_event_aggregate';
  if anon_functions is not null then
    raise exception 'Fungsi internal masih memberi EXECUTE ke anon: %.', anon_functions;
  end if;
end $$;

select 'Security baseline checks passed.' as result;
rollback;
