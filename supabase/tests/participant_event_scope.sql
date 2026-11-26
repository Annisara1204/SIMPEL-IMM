-- Kontrak otorisasi peserta dan foto: Observer hanya boleh mengelola
-- peserta/foto pada kegiatan yang ditugaskan. Jalankan di DEV saja.
\set ON_ERROR_STOP on
begin;

select id::text as ev_a from public.events
where archived_at is null order by starts_on desc limit 1 \gset

insert into public.events(name, commissariat, location, starts_on, ends_on, status)
values (
  'Uji Otorisasi B ' || substr(gen_random_uuid()::text, 1, 8),
  'Komisariat Uji', 'Lokasi Uji', current_date, current_date, 'planned'
)
returning id::text as ev_b \gset

select id::text as admin_id from public.profiles where role='admin_system' limit 1 \gset
select id::text as obs_a from public.profiles where role='observer' order by display_name limit 1 \gset
select id::text as obs_b from public.profiles where role='observer' order by display_name offset 1 limit 1 \gset
select id::text as commissariat_id from public.commissariats where is_active order by name limit 1 \gset

select gen_random_uuid()::text as part_a \gset
select gen_random_uuid()::text as part_b \gset
select gen_random_uuid()::text as part_a_delete \gset

-- psql tidak menyubstitusikan :'var' di dalam blok $$; simpan di GUC sesi.
select set_config('imm_test.ev_a', :'ev_a', false);
select set_config('imm_test.ev_b', :'ev_b', false);
select set_config('imm_test.admin_id', :'admin_id', false);
select set_config('imm_test.obs_a', :'obs_a', false);
select set_config('imm_test.obs_b', :'obs_b', false);
select set_config('imm_test.commissariat_id', :'commissariat_id', false);
select set_config('imm_test.part_a', :'part_a', false);
select set_config('imm_test.part_b', :'part_b', false);
select set_config('imm_test.part_a_delete', :'part_a_delete', false);

-- Observer A hanya ditugaskan di kegiatan A, Observer B dihapus penugasannya
-- sehingga menjadi "Observer tanpa penugasan" pada penguji ini.
delete from public.observer_assignments where observer_id in (:'obs_a'::uuid, :'obs_b'::uuid);
insert into public.observer_assignments(event_id, observer_id, assigned_by)
values (:'ev_a'::uuid, :'obs_a'::uuid, :'admin_id'::uuid);

insert into public.participants(
  id, event_id, display_name, commissariat, commissariat_id, major, entry_year, photo_path
) values
  (:'part_a'::uuid, :'ev_a'::uuid, 'Peserta Uji A', 'Komisariat Uji', :'commissariat_id'::uuid, 'Ilmu Uji', 2024, :'ev_a' || '/' || :'part_a' || '/foto.jpg'),
  (:'part_b'::uuid, :'ev_b'::uuid, 'Peserta Uji B', 'Komisariat Uji', :'commissariat_id'::uuid, 'Ilmu Uji', 2024, :'ev_b' || '/' || :'part_b' || '/foto.jpg'),
  (:'part_a_delete'::uuid, :'ev_a'::uuid, 'Peserta Hapus A', 'Komisariat Uji', :'commissariat_id'::uuid, 'Ilmu Uji', 2024, null);

insert into storage.objects(id, bucket_id, name, owner, metadata)
values
  (gen_random_uuid(), 'participant-photos', :'ev_a' || '/' || :'part_a' || '/foto.jpg', :'admin_id'::uuid, '{}'::jsonb),
  (gen_random_uuid(), 'participant-photos', :'ev_b' || '/' || :'part_b' || '/foto.jpg', :'admin_id'::uuid, '{}'::jsonb);

-- Nama policy lama dan baru sama, jadi yang diperiksa adalah definisinya.
do $$
declare
  total integer;
  without_assignment integer;
  with_old_function integer;
begin
  select count(*) into total from pg_policies
  where ((schemaname='public' and tablename='participants' and policyname in (
           'participants_insert_by_authorized_roles',
           'participants_update_by_authorized_roles',
           'participants_delete_by_authorized_roles'))
      or (schemaname='storage' and tablename='objects' and policyname in (
           'participant_photos_read_by_event_managers',
           'participant_photos_insert_by_event_managers',
           'participant_photos_delete_by_event_managers')));
  if total <> 6 then
    raise exception 'Harus ada tepat enam policy yang diperiksa, ditemukan %.', total;
  end if;

  select count(*) into without_assignment from pg_policies
  where ((schemaname='public' and tablename='participants' and policyname in (
           'participants_insert_by_authorized_roles',
           'participants_update_by_authorized_roles',
           'participants_delete_by_authorized_roles'))
      or (schemaname='storage' and tablename='objects' and policyname in (
           'participant_photos_read_by_event_managers',
           'participant_photos_insert_by_event_managers',
           'participant_photos_delete_by_event_managers')))
    and coalesce(qual, '') || coalesce(with_check, '') not like '%is_assigned_observer_for_event%';
  if without_assignment <> 0 then
    raise exception 'Ada % policy yang belum memakai is_assigned_observer_for_event.', without_assignment;
  end if;

  select count(*) into with_old_function from pg_policies
  where ((schemaname='public' and tablename='participants' and policyname in (
           'participants_insert_by_authorized_roles',
           'participants_update_by_authorized_roles',
           'participants_delete_by_authorized_roles'))
      or (schemaname='storage' and tablename='objects' and policyname in (
           'participant_photos_read_by_event_managers',
           'participant_photos_insert_by_event_managers',
           'participant_photos_delete_by_event_managers')))
    and coalesce(qual, '') || coalesce(with_check, '') like '%can_manage_events%';
  if with_old_function <> 0 then
    raise exception 'Ada % policy yang masih memakai can_manage_events.', with_old_function;
  end if;
end $$;

create or replace function pg_temp.try_insert_participant(p_event uuid, p_uid uuid)
returns boolean language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  insert into public.participants(
    id, event_id, display_name, commissariat, commissariat_id, major, entry_year
  ) values (
    gen_random_uuid(), p_event, 'Uji Insert', 'Komisariat Uji',
    current_setting('imm_test.commissariat_id', true)::uuid, 'Ilmu Uji', 2024
  );
  return true;
exception when others then
  return false;
end $$;

create or replace function pg_temp.try_update_participant(p_pid uuid, p_uid uuid)
returns boolean language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  update public.participants set display_name = display_name || ' Uji' where id = p_pid;
  return found;
exception when others then
  return false;
end $$;

create or replace function pg_temp.try_delete_participant(p_pid uuid, p_uid uuid)
returns boolean language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  delete from public.participants where id = p_pid;
  return found;
exception when others then
  return false;
end $$;

create or replace function pg_temp.try_read_photo(p_name text, p_uid uuid)
returns boolean language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform 1 from storage.objects where name = p_name;
  return found;
exception when others then
  return false;
end $$;

set local role authenticated;

do $$
declare
  ev_a uuid := current_setting('imm_test.ev_a', true)::uuid;
  ev_b uuid := current_setting('imm_test.ev_b', true)::uuid;
  admin_id uuid := current_setting('imm_test.admin_id', true)::uuid;
  obs_a uuid := current_setting('imm_test.obs_a', true)::uuid;
  obs_b uuid := current_setting('imm_test.obs_b', true)::uuid;
  part_a uuid := current_setting('imm_test.part_a', true)::uuid;
  part_b uuid := current_setting('imm_test.part_b', true)::uuid;
  part_a_delete uuid := current_setting('imm_test.part_a_delete', true)::uuid;
  photo_a text := current_setting('imm_test.ev_a', true) || '/' || current_setting('imm_test.part_a', true) || '/foto.jpg';
  photo_b text := current_setting('imm_test.ev_b', true) || '/' || current_setting('imm_test.part_b', true) || '/foto.jpg';
begin
  -- Observer A: hanya kegiatan A.
  if not pg_temp.try_insert_participant(ev_a, obs_a) then
    raise exception 'Observer A gagal menambah peserta di kegiatan tugasnya.';
  end if;
  if pg_temp.try_insert_participant(ev_b, obs_a) then
    raise exception 'Observer A berhasil menambah peserta di kegiatan lain.';
  end if;
  if not pg_temp.try_update_participant(part_a, obs_a) then
    raise exception 'Observer A gagal mengubah peserta di kegiatan tugasnya.';
  end if;
  if pg_temp.try_update_participant(part_b, obs_a) then
    raise exception 'Observer A berhasil mengubah peserta di kegiatan lain.';
  end if;
  if not pg_temp.try_delete_participant(part_a_delete, obs_a) then
    raise exception 'Observer A gagal menghapus peserta di kegiatan tugasnya.';
  end if;
  if pg_temp.try_delete_participant(part_b, obs_a) then
    raise exception 'Observer A berhasil menghapus peserta di kegiatan lain.';
  end if;

  -- Observer tanpa penugasan (B): semua aksi ditolak.
  if pg_temp.try_insert_participant(ev_a, obs_b)
     or pg_temp.try_insert_participant(ev_b, obs_b) then
    raise exception 'Observer tanpa penugasan berhasil menambah peserta.';
  end if;
  if pg_temp.try_update_participant(part_a, obs_b)
     or pg_temp.try_update_participant(part_b, obs_b) then
    raise exception 'Observer tanpa penugasan berhasil mengubah peserta.';
  end if;
  if pg_temp.try_delete_participant(part_a, obs_b)
     or pg_temp.try_delete_participant(part_b, obs_b) then
    raise exception 'Observer tanpa penugasan berhasil menghapus peserta.';
  end if;

  -- Foto: Observer A hanya membaca foto kegiatan A.
  if not pg_temp.try_read_photo(photo_a, obs_a) then
    raise exception 'Observer A gagal membaca foto kegiatan tugasnya.';
  end if;
  if pg_temp.try_read_photo(photo_b, obs_a) then
    raise exception 'Observer A berhasil membaca foto kegiatan lain.';
  end if;
  if pg_temp.try_read_photo(photo_a, obs_b) or pg_temp.try_read_photo(photo_b, obs_b) then
    raise exception 'Observer tanpa penugasan berhasil membaca foto.';
  end if;

  -- Admin tetap boleh semua.
  if not pg_temp.try_insert_participant(ev_b, admin_id)
     or not pg_temp.try_update_participant(part_b, admin_id)
     or not pg_temp.try_delete_participant(part_b, admin_id)
     or not pg_temp.try_read_photo(photo_b, admin_id) then
    raise exception 'Admin Sistem gagal mengelola peserta atau foto.';
  end if;
end $$;

select 'Participant and photo event-scope checks passed.' as result;
rollback;
