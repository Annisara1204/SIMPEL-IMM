-- Rubrik terpisah untuk tahap dan jenis penilaian.
alter table public.rubric_versions add column if not exists stage text not null default 'training'
  check (stage in ('screening', 'training', 'follow_up'));

create table if not exists public.rubric_assessment_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  stage text not null check (stage in ('screening', 'training')),
  name text not null check (char_length(trim(name)) between 2 and 80),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (event_id, stage, name),
  unique (id, event_id, stage)
);

-- Versi rubrik lama dipertahankan sebagai jenis "Penilaian umum" pada Pelatihan.
insert into public.rubric_assessment_types(event_id, stage, name)
select distinct event_id, 'training', 'Penilaian umum'
from public.rubric_versions
on conflict (event_id, stage, name) do nothing;

alter table public.rubric_versions add column if not exists assessment_type_id uuid;
update public.rubric_versions rv
set assessment_type_id = rat.id
from public.rubric_assessment_types rat
where rat.event_id = rv.event_id and rat.stage = rv.stage and rat.name = 'Penilaian umum'
  and rv.assessment_type_id is null;
alter table public.rubric_versions alter column assessment_type_id set not null;
alter table public.rubric_versions add constraint rubric_versions_type_scope_fk
  foreign key (assessment_type_id, event_id, stage)
  references public.rubric_assessment_types(id, event_id, stage) on delete cascade;

alter table public.rubric_versions drop constraint if exists rubric_versions_event_id_version_key;
alter table public.rubric_versions add constraint rubric_versions_event_stage_type_version_key
  unique (event_id, stage, assessment_type_id, version);
drop index if exists public.rubric_one_active_per_event;
create unique index rubric_one_active_per_type on public.rubric_versions(event_id, stage, assessment_type_id)
  where status = 'active';

alter table public.rubric_assessment_types enable row level security;
drop policy if exists rubric_assessment_types_read_staff on public.rubric_assessment_types;
create policy rubric_assessment_types_read_staff on public.rubric_assessment_types for select to authenticated
  using (public.can_observe() or public.can_view_rubrics());
drop policy if exists rubric_assessment_types_manage_admin on public.rubric_assessment_types;
create policy rubric_assessment_types_manage_admin on public.rubric_assessment_types for all to authenticated
  using (public.can_manage_rubrics()) with check (public.can_manage_rubrics());

create index if not exists rubric_assessment_types_event_stage_idx
  on public.rubric_assessment_types(event_id, stage, position);
