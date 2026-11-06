-- Akses halaman profil Instruktur dibatasi hanya pada kegiatan yang ditugaskan.
create or replace function public.is_assigned_instructor_colleague(target_profile_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.profiles caller
    join public.instructor_event_assignments own_assignment
      on own_assignment.instructor_id = caller.id
    join public.instructor_event_assignments colleague_assignment
      on colleague_assignment.event_id = own_assignment.event_id
    join public.profiles colleague
      on colleague.id = colleague_assignment.instructor_id and colleague.role = 'instruktur'
    where caller.id = (select auth.uid())
      and caller.role = 'instruktur'
      and colleague.id = target_profile_id
  );
$$;
revoke all on function public.is_assigned_instructor_colleague(uuid) from public;
grant execute on function public.is_assigned_instructor_colleague(uuid) to authenticated;

drop policy if exists instructor_event_assignments_read_self_or_admin on public.instructor_event_assignments;
create policy instructor_event_assignments_read_self_or_admin on public.instructor_event_assignments
  for select to authenticated using (
    instructor_id = (select auth.uid())
    or (select public.is_admin_system())
    or (select public.is_assigned_instructor_for_event(event_id))
  );

drop policy if exists profiles_read_assigned_instructor_team on public.profiles;
create policy profiles_read_assigned_instructor_team on public.profiles
  for select to authenticated using (
    role = 'instruktur' and (select public.is_assigned_instructor_colleague(id))
  );

drop policy if exists participant_photos_read_by_assigned_instructors on storage.objects;
create policy participant_photos_read_by_assigned_instructors on storage.objects
  for select to authenticated using (
    bucket_id = 'participant-photos'
    and split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (select public.is_assigned_instructor_for_event(split_part(name, '/', 1)::uuid))
  );
