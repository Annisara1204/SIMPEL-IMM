-- Akun Instruktur permanen mendaftar sendiri; akun perbantuan memakai username internal.
alter table public.profiles
  add column if not exists account_type text not null default 'permanent'
    check (account_type in ('permanent', 'temporary')),
  add column if not exists username text;

create unique index if not exists profiles_username_unique
  on public.profiles (lower(username)) where username is not null;

create or replace function public.own_profile_privileges_unchanged(
  profile_id uuid, new_role text, new_account_type text, new_username text, new_commissariat_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select profile_id = (select auth.uid()) and exists (
    select 1 from public.profiles own
    where own.id = (select auth.uid())
      and own.role is not distinct from new_role
      and own.account_type = new_account_type
      and own.username is not distinct from new_username
      and own.commissariat_id is not distinct from new_commissariat_id
  );
$$;
revoke all on function public.own_profile_privileges_unchanged(uuid, text, text, text, uuid) from public;
grant execute on function public.own_profile_privileges_unchanged(uuid, text, text, text, uuid) to authenticated;

drop policy if exists profiles_update_self_limited on public.profiles;
create policy profiles_update_self_limited on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check ((select public.own_profile_privileges_unchanged(id, role, account_type, username, commissariat_id)));

-- Pendaftaran publik tidak dapat memilih role atau tipe akun dari metadata kiriman.
create or replace function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role, account_type)
  values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''), null, 'permanent')
  on conflict (id) do nothing;
  return new;
end;
$$;
