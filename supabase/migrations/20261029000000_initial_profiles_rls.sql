-- Tahap 2: profil dan role pengguna. Jalankan melalui Supabase SQL Editor.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text check (role in ('admin_system', 'bidang_kader', 'observer', 'komisariat', 'peserta')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.is_admin_system()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin_system'
  );
$$;
revoke all on function public.is_admin_system() from public;
grant execute on function public.is_admin_system() to authenticated;

create policy "profiles_select_self_or_admin"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select public.is_admin_system()));

create policy "profiles_admin_insert"
on public.profiles for insert to authenticated
with check ((select public.is_admin_system()));

create policy "profiles_admin_update"
on public.profiles for update to authenticated
using ((select public.is_admin_system()))
with check ((select public.is_admin_system()));

create or replace function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''), null)
  on conflict (id) do nothing;
  return new;
end;
$$;

 drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute procedure public.create_profile_for_auth_user();

-- Hak SQL ini tetap dibatasi oleh kebijakan RLS di atas.
grant select, insert, update on public.profiles to authenticated;
revoke all on public.profiles from anon;
