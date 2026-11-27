-- Kontrak otorisasi penugasan Observer: hanya Admin Sistem yang boleh
-- menambah atau mencabut penugasan. Jalankan di DEV; transaksi di-rollback.
\set ON_ERROR_STOP on
begin;

select id::text as ev from public.events
where archived_at is null order by starts_on desc limit 1 \gset
select id::text as admin_id from public.profiles where role='admin_system' limit 1 \gset
select id::text as kader_id from public.profiles where role='bidang_kader' limit 1 \gset
select id::text as observer_id from public.profiles where role='observer' limit 1 \gset
select gen_random_uuid()::text as assignment_id \gset

select set_config('imm_test.ev', :'ev', false);
select set_config('imm_test.admin_id', :'admin_id', false);
select set_config('imm_test.kader_id', :'kader_id', false);
select set_config('imm_test.observer_id', :'observer_id', false);
select set_config('imm_test.assignment_id', :'assignment_id', false);

do $$
declare
  src text;
begin
  select pg_get_functiondef('public.can_manage_observer_assignments()'::regprocedure) into src;
  if src like '%bidang_kader%' then
    raise exception 'can_manage_observer_assignments masih memberi akses ke Bidang Kader.';
  end if;
end $$;

create or replace function pg_temp.try_insert_assignment(p_uid uuid)
returns boolean language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  insert into public.observer_assignments(id,event_id,observer_id,assigned_by)
  values (current_setting('imm_test.assignment_id', true)::uuid,
          current_setting('imm_test.ev', true)::uuid,
          current_setting('imm_test.observer_id', true)::uuid,
          p_uid);
  return true;
exception when others then
  return false;
end $$;

create or replace function pg_temp.try_delete_assignment(p_uid uuid)
returns boolean language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  delete from public.observer_assignments
  where id=current_setting('imm_test.assignment_id', true)::uuid;
  return found;
exception when others then
  return false;
end $$;

set local role authenticated;

do $$
declare
  kader_insert boolean;
  admin_insert boolean;
  kader_delete boolean;
begin
  kader_insert := pg_temp.try_insert_assignment(current_setting('imm_test.kader_id', true)::uuid);
  if kader_insert then
    raise exception 'Bidang Kader berhasil menambah penugasan Observer.';
  end if;

  admin_insert := pg_temp.try_insert_assignment(current_setting('imm_test.admin_id', true)::uuid);
  if not admin_insert then
    raise exception 'Admin Sistem gagal menambah penugasan Observer.';
  end if;

  kader_delete := pg_temp.try_delete_assignment(current_setting('imm_test.kader_id', true)::uuid);
  if kader_delete then
    raise exception 'Bidang Kader berhasil mencabut penugasan Observer.';
  end if;
end $$;

select 'Observer assignment scope checks passed.' as result;
rollback;
