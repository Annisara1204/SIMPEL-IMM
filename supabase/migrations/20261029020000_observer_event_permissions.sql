-- Perubahan aturan akses: Observer dan Admin Sistem (Super Admin) boleh mengelola data.
create or replace function public.can_manage_events()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('admin_system', 'observer')
  );
$$;
