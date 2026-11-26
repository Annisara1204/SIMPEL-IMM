-- Observer hanya boleh menulis peserta dan mengakses foto peserta
-- pada kegiatan yang benar-benar ditugaskan kepadanya.
-- can_manage_events() sengaja tidak diubah karena masih dipakai jalur lain;
-- policy lama di bawah dihapus agar tidak tersisa jalur berbasis role saja.

drop policy if exists "participants_insert_by_authorized_roles" on public.participants;
create policy "participants_insert_by_authorized_roles" on public.participants
for insert to authenticated
with check (
  (select public.is_admin_system())
  or (select public.is_assigned_observer_for_event(event_id))
);

drop policy if exists "participants_update_by_authorized_roles" on public.participants;
create policy "participants_update_by_authorized_roles" on public.participants
for update to authenticated
using (
  (select public.is_admin_system())
  or (select public.is_assigned_observer_for_event(event_id))
)
with check (
  (select public.is_admin_system())
  or (select public.is_assigned_observer_for_event(event_id))
);

drop policy if exists "participants_delete_by_authorized_roles" on public.participants;
create policy "participants_delete_by_authorized_roles" on public.participants
for delete to authenticated
using (
  (select public.is_admin_system())
  or (select public.is_assigned_observer_for_event(event_id))
);

drop policy if exists "participant_photos_read_by_event_managers" on storage.objects;
create policy "participant_photos_read_by_event_managers" on storage.objects
for select to authenticated
using (
  bucket_id = 'participant-photos'
  and (
    (select public.is_admin_system())
    or case
         when split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         then (select public.is_assigned_observer_for_event(split_part(name, '/', 1)::uuid))
         else false
       end
  )
);

drop policy if exists "participant_photos_insert_by_event_managers" on storage.objects;
create policy "participant_photos_insert_by_event_managers" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'participant-photos'
  and (
    (select public.is_admin_system())
    or case
         when split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         then (select public.is_assigned_observer_for_event(split_part(name, '/', 1)::uuid))
         else false
       end
  )
);

drop policy if exists "participant_photos_delete_by_event_managers" on storage.objects;
create policy "participant_photos_delete_by_event_managers" on storage.objects
for delete to authenticated
using (
  bucket_id = 'participant-photos'
  and (
    (select public.is_admin_system())
    or case
         when split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         then (select public.is_assigned_observer_for_event(split_part(name, '/', 1)::uuid))
         else false
       end
  )
);
