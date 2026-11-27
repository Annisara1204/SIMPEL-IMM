-- Kembalikan can_manage_observer_assignments ke definisi sebelum 28 November 2026.

create or replace function public.can_manage_observer_assignments()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('admin_system', 'bidang_kader')
  );
$$;
