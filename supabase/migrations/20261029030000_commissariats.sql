-- Daftar Komisariat: contoh simulasi, dapat dikelola Admin Sistem.
create table if not exists public.commissariats (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 3 and 120),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists commissariats_name_case_insensitive_unique
on public.commissariats (lower(trim(name)));

alter table public.commissariats enable row level security;

drop policy if exists "commissariats_read_active_or_admin" on public.commissariats;
create policy "commissariats_read_active_or_admin" on public.commissariats
for select to authenticated
using (is_active or (select public.is_admin_system()));

drop policy if exists "commissariats_admin_insert" on public.commissariats;
create policy "commissariats_admin_insert" on public.commissariats
for insert to authenticated
with check ((select public.is_admin_system()));

drop policy if exists "commissariats_admin_update" on public.commissariats;
create policy "commissariats_admin_update" on public.commissariats
for update to authenticated
using ((select public.is_admin_system()))
with check ((select public.is_admin_system()));

grant select, insert, update on public.commissariats to authenticated;
revoke delete on public.commissariats from authenticated;
revoke all on public.commissariats from anon;

insert into public.commissariats (id, name) values
('a3200000-0000-4000-8000-000000000001', 'Komisariat Simulasi 01'),
('a3200000-0000-4000-8000-000000000002', 'Komisariat Simulasi 02'),
('a3200000-0000-4000-8000-000000000003', 'Komisariat Simulasi 03')
on conflict (id) do nothing;
