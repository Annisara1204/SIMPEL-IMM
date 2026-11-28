-- Kontrak permintaan akun: publik hanya boleh mengirim, Admin yang meninjau.
-- Jalankan di DEV; transaksi di-rollback.
\set ON_ERROR_STOP on
begin;

select id::text as admin_id from public.profiles where role='admin_system' limit 1 \gset
select id::text as observer_id from public.profiles where role='observer' limit 1 \gset
select gen_random_uuid()::text as request_id \gset

select set_config('imm_test.admin_id', :'admin_id', false);
select set_config('imm_test.observer_id', :'observer_id', false);
select set_config('imm_test.request_id', :'request_id', false);

create or replace function pg_temp.try_insert_request(p_email text)
returns boolean language plpgsql as $$
begin
  insert into public.account_requests(id,email,display_name)
  values (current_setting('imm_test.request_id', true)::uuid, p_email, 'Pemohon Uji');
  return true;
exception when others then
  return false;
end $$;

create or replace function pg_temp.try_read_request(p_uid uuid)
returns boolean language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform 1 from public.account_requests
  where id=current_setting('imm_test.request_id', true)::uuid;
  return found;
exception when others then
  return false;
end $$;

set local role anon;
do $$
begin
  if not pg_temp.try_insert_request('pemohon-uji@example.invalid') then
    raise exception 'Publik gagal mengirim permintaan akun.';
  end if;
  if pg_temp.try_read_request(current_setting('imm_test.admin_id', true)::uuid) then
    raise exception 'anon dapat membaca permintaan akun.';
  end if;
end $$;

set local role authenticated;
do $$
declare
  observer_sees boolean;
  admin_sees boolean;
begin
  observer_sees := pg_temp.try_read_request(current_setting('imm_test.observer_id', true)::uuid);
  if observer_sees then
    raise exception 'Observer dapat membaca permintaan akun.';
  end if;

  admin_sees := pg_temp.try_read_request(current_setting('imm_test.admin_id', true)::uuid);
  if not admin_sees then
    raise exception 'Admin Sistem tidak dapat membaca permintaan akun.';
  end if;
end $$;

select 'Account request RLS checks passed.' as result;
rollback;
