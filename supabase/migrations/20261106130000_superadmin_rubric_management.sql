-- Pengelolaan rubrik hanya untuk Admin Sistem (Super Admin).
-- Bidang Kader tetap dapat membaca rubrik dan mengelola penugasan Observer.
create or replace function public.can_manage_rubrics()
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

create or replace function public.can_view_rubrics()
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

revoke all on function public.can_manage_rubrics(), public.can_view_rubrics(), public.can_manage_observer_assignments() from public;
grant execute on function public.can_manage_rubrics(), public.can_view_rubrics(), public.can_manage_observer_assignments() to authenticated;

drop policy if exists "events_read_scoped_staff" on public.events;
create policy "events_read_scoped_staff" on public.events
for select to authenticated
using (
  (select public.is_admin_system())
  or (select public.can_view_rubrics())
  or (select public.is_assigned_observer_for_event(id))
);

drop policy if exists "profiles_observer_list_for_assignment" on public.profiles;
create policy "profiles_observer_list_for_assignment" on public.profiles for select to authenticated using (
  role = 'observer' and (select public.can_manage_observer_assignments())
);

drop policy if exists "assignments_read_self_or_manager" on public.observer_assignments;
create policy "assignments_read_self_or_manager" on public.observer_assignments for select to authenticated using (
  observer_id = (select auth.uid()) or (select public.can_manage_observer_assignments())
);

drop policy if exists "assignments_manage" on public.observer_assignments;
create policy "assignments_manage" on public.observer_assignments for all to authenticated
using ((select public.can_manage_observer_assignments()))
with check ((select public.can_manage_observer_assignments()));

drop policy if exists "rubric_versions_read_staff" on public.rubric_versions;
create policy "rubric_versions_read_staff" on public.rubric_versions for select to authenticated using (
  (select public.can_observe()) or (select public.can_view_rubrics())
);

drop policy if exists "rubric_aspects_read_staff" on public.rubric_aspects;
create policy "rubric_aspects_read_staff" on public.rubric_aspects for select to authenticated using (
  (select public.can_observe()) or (select public.can_view_rubrics())
);

drop policy if exists "rubric_indicators_read_staff" on public.rubric_indicators;
create policy "rubric_indicators_read_staff" on public.rubric_indicators for select to authenticated using (
  (select public.can_observe()) or (select public.can_view_rubrics())
);
