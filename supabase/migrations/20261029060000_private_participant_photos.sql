-- Foto peserta disimpan privat dan hanya dapat dikelola Observer/Admin Sistem.
alter table public.participants
  add column if not exists photo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('participant-photos', 'participant-photos', false, 5242880, array['image/jpeg', 'image/png']::text[])
on conflict (id) do update
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png']::text[];

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
