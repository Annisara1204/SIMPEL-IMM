-- Observer hanya melihat kegiatan yang ditugaskan dan tidak boleh mengganti nama kegiatan.
create or replace function public.is_assigned_observer_for_event(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join public.observer_assignments a on a.observer_id = p.id
    where p.id = (select auth.uid())
      and p.role = 'observer'
      and a.event_id = target_event_id
  );
$$;

revoke all on function public.is_assigned_observer_for_event(uuid) from public;
grant execute on function public.is_assigned_observer_for_event(uuid) to authenticated;

drop policy if exists "events_manage_by_authorized_roles" on public.events;
drop policy if exists "events_read_rubric_managers" on public.events;
drop policy if exists "events_read_scoped_staff" on public.events;
drop policy if exists "events_manage_admin_system" on public.events;
drop policy if exists "events_update_assigned_observer" on public.events;

create policy "events_read_scoped_staff" on public.events
for select to authenticated
using (
  (select public.is_admin_system())
  or (select public.can_manage_rubrics())
  or (select public.is_assigned_observer_for_event(id))
);

create policy "events_manage_admin_system" on public.events
for all to authenticated
using ((select public.is_admin_system()))
with check ((select public.is_admin_system()));

create policy "events_update_assigned_observer" on public.events
for update to authenticated
using ((select public.is_assigned_observer_for_event(id)))
with check ((select public.is_assigned_observer_for_event(id)));

create or replace function public.prevent_observer_event_rename()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.name is distinct from new.name and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'observer'
  ) then
    raise exception 'Observer tidak memiliki akses untuk mengganti nama kegiatan.';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_observer_event_rename on public.events;
create trigger prevent_observer_event_rename
before update of name on public.events
for each row execute function public.prevent_observer_event_rename();
