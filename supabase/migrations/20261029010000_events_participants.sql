-- Tahap 3: satu kegiatan dan peserta simulasi.
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 3 and 120),
  commissariat text not null check (char_length(trim(commissariat)) between 2 and 120),
  location text not null check (char_length(trim(location)) between 2 and 160),
  starts_on date not null,
  ends_on date not null,
  status text not null default 'planned' check (status in ('planned', 'ongoing', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 120),
  commissariat text not null check (char_length(trim(commissariat)) between 2 and 120),
  created_at timestamptz not null default now(),
  constraint participants_event_id_display_name_commissariat_key unique (event_id, display_name, commissariat)
);

alter table public.events enable row level security;
alter table public.participants enable row level security;

create or replace function public.can_manage_events()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('admin_system', 'observer')
  );
$$;
revoke all on function public.can_manage_events() from public;
grant execute on function public.can_manage_events() to authenticated;

create policy "events_manage_by_authorized_roles" on public.events
for all to authenticated
using ((select public.can_manage_events()))
with check ((select public.can_manage_events()));
create policy "participants_manage_by_authorized_roles" on public.participants
for all to authenticated
using ((select public.can_manage_events()))
with check ((select public.can_manage_events()));

grant select, insert, update, delete on public.events to authenticated;
grant select, insert, update, delete on public.participants to authenticated;
revoke all on public.events from anon;
revoke all on public.participants from anon;

-- Seluruh nama berikut rekaan dan hanya untuk memeriksa relasi kegiatan-peserta.
insert into public.events (id, name, commissariat, location, starts_on, ends_on, status)
values ('a3100000-0000-4000-8000-000000000001', 'Darul Arqam Dasar Simulasi', 'Komisariat Contoh', 'Lokasi Simulasi, Bandung', '2026-10-24', '2026-10-26', 'completed')
on conflict (id) do nothing;

insert into public.participants (event_id, display_name, commissariat) values
('a3100000-0000-4000-8000-000000000001', 'Peserta Simulasi 01', 'Komisariat Contoh'),
('a3100000-0000-4000-8000-000000000001', 'Peserta Simulasi 02', 'Komisariat Contoh'),
('a3100000-0000-4000-8000-000000000001', 'Peserta Simulasi 03', 'Komisariat Contoh'),
('a3100000-0000-4000-8000-000000000001', 'Peserta Simulasi 04', 'Komisariat Contoh'),
('a3100000-0000-4000-8000-000000000001', 'Peserta Simulasi 05', 'Komisariat Contoh')
on conflict (event_id, display_name, commissariat) do nothing;
