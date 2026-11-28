-- Permintaan akun Instruktur permanen. /daftar tidak lagi memanggil signUp
-- karena DISABLE_SIGNUP=true. Admin Sistem yang membuat akun setelah meninjau.
create table if not exists public.account_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  display_name text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'done')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);

alter table public.account_requests enable row level security;

drop policy if exists account_requests_insert_public on public.account_requests;
create policy account_requests_insert_public on public.account_requests
for insert to anon, authenticated
with check (
  status = 'pending'
  and char_length(trim(email)) between 5 and 254
  and char_length(trim(display_name)) between 2 and 100
);

drop policy if exists account_requests_read_admin on public.account_requests;
create policy account_requests_read_admin on public.account_requests
for select to authenticated using ((select public.is_admin_system()));

drop policy if exists account_requests_update_admin on public.account_requests;
create policy account_requests_update_admin on public.account_requests
for update to authenticated
using ((select public.is_admin_system()))
with check ((select public.is_admin_system()));

revoke all on public.account_requests from anon, authenticated;
grant insert on public.account_requests to anon;
grant insert, select, update on public.account_requests to authenticated;
