-- Kembalikan policy participants dan participant-photos ke kondisi
-- sebelum migrasi 20261127000000_participant_event_scope_v1.sql.
-- Jalankan hanya bila perbaikan ini dibatalkan.

drop policy if exists "participants_insert_by_authorized_roles" on public.participants;
create policy "participants_insert_by_authorized_roles" on public.participants
for insert to authenticated
with check ((select public.can_manage_events()));

drop policy if exists "participants_update_by_authorized_roles" on public.participants;
create policy "participants_update_by_authorized_roles" on public.participants
for update to authenticated
using ((select public.can_manage_events()))
with check ((select public.can_manage_events()));

drop policy if exists "participants_delete_by_authorized_roles" on public.participants;
create policy "participants_delete_by_authorized_roles" on public.participants
for delete to authenticated
using ((select public.can_manage_events()));

drop policy if exists "participant_photos_read_by_event_managers" on storage.objects;
create policy "participant_photos_read_by_event_managers" on storage.objects
for select to authenticated
using (bucket_id = 'participant-photos' and (select public.can_manage_events()));

drop policy if exists "participant_photos_insert_by_event_managers" on storage.objects;
create policy "participant_photos_insert_by_event_managers" on storage.objects
for insert to authenticated
with check (bucket_id = 'participant-photos' and (select public.can_manage_events()));

drop policy if exists "participant_photos_delete_by_event_managers" on storage.objects;
create policy "participant_photos_delete_by_event_managers" on storage.objects
for delete to authenticated
using (bucket_id = 'participant-photos' and (select public.can_manage_events()));
