-- Kontrak daftar putih agregat publik. Jalankan di DEV; transaksi di-rollback.
\set ON_ERROR_STOP on
begin;

select id::text as allowed_event from public.events
where archived_at is null order by starts_on desc limit 1 \gset
select gen_random_uuid()::text as denied_event \gset
select set_config('imm_test.allowed_event', :'allowed_event', false);
select set_config('imm_test.denied_event', :'denied_event', false);

insert into public.public_aggregate_settings(event_id)
values (:'allowed_event'::uuid)
on conflict (event_id) do nothing;

create or replace function pg_temp.try_read_settings()
returns boolean language plpgsql as $$
begin
  perform 1 from public.public_aggregate_settings;
  return found;
exception when others then
  return false;
end $$;

set local role anon;

do $$
declare
  allowed_count integer;
  denied_count integer;
  settings_readable boolean;
begin
  select count(*) into allowed_count
  from public.get_public_event_aggregate(
    current_setting('imm_test.allowed_event', true)::uuid
  );
  if allowed_count <> 1 then
    raise exception 'Event dalam daftar putih harus mengembalikan satu baris, ditemukan %.', allowed_count;
  end if;

  select count(*) into denied_count
  from public.get_public_event_aggregate(
    current_setting('imm_test.denied_event', true)::uuid
  );
  if denied_count <> 0 then
    raise exception 'Event di luar daftar putih mengembalikan % baris.', denied_count;
  end if;

  select pg_temp.try_read_settings() into settings_readable;
  if settings_readable then
    raise exception 'anon dapat membaca tabel daftar putih.';
  end if;
end $$;

select 'Public aggregate allowlist checks passed.' as result;
rollback;
