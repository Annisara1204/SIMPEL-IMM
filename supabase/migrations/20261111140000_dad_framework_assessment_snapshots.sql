-- Phase 4: link event assessment snapshots to the exact DAD framework source.
-- Existing rubrics remain unchanged and unlinked.

alter table public.rubric_versions
  add column if not exists competency_framework_version_id uuid
    references public.competency_framework_versions(id) on delete restrict;

alter table public.rubric_materials
  add column if not exists competency_material_id uuid
    references public.competency_materials(id) on delete restrict;

create index if not exists rubric_versions_framework_source_idx
  on public.rubric_versions(competency_framework_version_id)
  where competency_framework_version_id is not null;
create index if not exists rubric_materials_framework_source_idx
  on public.rubric_materials(competency_material_id)
  where competency_material_id is not null;

comment on column public.rubric_versions.competency_framework_version_id is
  'Versi framework master yang menjadi sumber snapshot rubrik kegiatan; NULL untuk rubrik lama/manual.';
comment on column public.rubric_materials.competency_material_id is
  'Materi master DAD yang dipetakan ke materi kegiatan; snapshot penilaian tetap tersimpan pada rubric_versions.';
