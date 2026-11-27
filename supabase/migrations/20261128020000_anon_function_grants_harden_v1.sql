-- Pengerasan lanjutan K11: setelah pengerasan 24 November, beberapa fungsi
-- dibuat ulang oleh migrasi berikutnya dan mendapat EXECUTE eksplisit untuk
-- anon. Hanya RPC agregat publik yang boleh dijangkau anon.

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and array_to_string(coalesce(p.proacl, '{}'), ',') like '%anon=X%'
      and p.proname <> 'get_public_event_aggregate'
  loop
    execute format('revoke all on function %s from anon', f.signature);
  end loop;
end $$;
