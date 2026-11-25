-- Arsip kegiatan: menyembunyikan kegiatan tanpa menghapus data apa pun.
-- Hanya Admin Sistem yang boleh mengarsipkan/memulihkan. Observer tetap bisa
-- mengubah detail kegiatan yang ditugaskan, tetapi tidak boleh mengubah
-- penanda arsip (dijaga trigger, bukan hanya sembunyi tombol).

alter table public.events add column if not exists archived_at timestamptz;

create index if not exists events_active_order_idx
  on public.events (starts_on desc)
  where archived_at is null;

create or replace function public.prevent_observer_event_archive()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.archived_at is distinct from old.archived_at and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'observer'
  ) then
    raise exception 'Observer tidak dapat mengarsipkan atau memulihkan kegiatan.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_observer_event_archive on public.events;
create trigger prevent_observer_event_archive
before update of archived_at on public.events
for each row execute function public.prevent_observer_event_archive();

comment on column public.events.archived_at is
  'Null = kegiatan aktif. Diisi waktu diarsipkan Admin Sistem; data terkait tetap utuh dan dapat dipulihkan.';
