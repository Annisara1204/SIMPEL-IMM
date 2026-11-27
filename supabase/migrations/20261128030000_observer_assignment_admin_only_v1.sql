-- Keputusan BLUEPRINT: Bidang Kader hanya menerima rekap, tidak mengelola
-- penugasan Observer. Fungsi ini dipakai policy profiles dan observer_assignments.

create or replace function public.can_manage_observer_assignments()
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
