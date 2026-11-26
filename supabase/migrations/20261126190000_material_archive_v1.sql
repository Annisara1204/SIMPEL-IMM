-- Arsip materi Pelatihan tanpa penghapusan data.
-- Kolom baru menandai materi yang disembunyikan dari pemilih. Nilai, catatan,
-- evaluasi, dan snapshot tidak berubah.
alter table public.rubric_materials
  add column if not exists archived_at timestamptz;

create index if not exists rubric_materials_active_idx
  on public.rubric_materials(event_id, position)
  where archived_at is null;

comment on column public.rubric_materials.archived_at is
  'Materi terarsipkan disembunyikan dari pemilih; data penilaian lama tetap tersimpan.';

-- Penghapusan materi tidak dipakai. Pengarsipan hanya boleh bila tidak ada
-- rubrik aktif, supaya Observer yang sedang mengisi tidak kehilangan akses.
create or replace function public.prevent_material_archive_with_active_rubric()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.archived_at is not null
     and old.archived_at is null
     and exists (
       select 1
       from public.rubric_versions v
       where v.material_id = new.id
         and v.status = 'active'
     ) then
    raise exception 'Materi masih memiliki rubrik aktif. Arsipkan rubrik terlebih dahulu.';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_material_archive_with_active_rubric
  on public.rubric_materials;
create trigger prevent_material_archive_with_active_rubric
before update of archived_at on public.rubric_materials
for each row
execute function public.prevent_material_archive_with_active_rubric();

-- Draf rubrik materi turut diarsipkan. RLS yang sudah ada hanya mengizinkan
-- perubahan aspek/indikator pada versi berstatus draf, jadi tidak ada lagi
-- jalur tulis ke rubrik materi yang tersembunyi.
create or replace function public.archive_material_draft_versions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.archived_at is not null and old.archived_at is null then
    update public.rubric_versions
       set status = 'archived'
     where material_id = new.id
       and status = 'draft';
  end if;
  return new;
end;
$$;

drop trigger if exists archive_material_draft_versions
  on public.rubric_materials;
create trigger archive_material_draft_versions
after update of archived_at on public.rubric_materials
for each row
execute function public.archive_material_draft_versions();
