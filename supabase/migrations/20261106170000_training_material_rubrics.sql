-- Pelatihan memiliki materi; rubrik dan status selesai dibedakan per materi.
create table if not exists public.rubric_materials (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 120),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (event_id, name),
  unique (id, event_id)
);

-- Rubrik Pelatihan yang sudah ada disimpan dalam satu materi "Materi umum".
insert into public.rubric_materials(event_id, name)
select event_id, 'Materi umum'
from (
  select event_id from public.rubric_versions where stage = 'training'
  union
  select event_id from public.rubric_assessment_types where stage = 'training'
) existing_training
on conflict (event_id, name) do nothing;

alter table public.rubric_versions add column if not exists material_id uuid;
update public.rubric_versions rv
set material_id = materials.id
from public.rubric_materials materials
where materials.event_id = rv.event_id and materials.name = 'Materi umum'
  and rv.stage = 'training' and rv.material_id is null;

alter table public.rubric_versions add constraint rubric_versions_material_event_fk
  foreign key (material_id, event_id) references public.rubric_materials(id, event_id) on delete cascade;
alter table public.rubric_versions add constraint rubric_versions_material_stage_check
  check ((stage = 'training' and material_id is not null) or (stage in ('screening', 'follow_up') and material_id is null));

alter table public.rubric_versions drop constraint if exists rubric_versions_event_stage_type_version_key;
drop index if exists public.rubric_one_active_per_type;
create unique index rubric_screening_version_number on public.rubric_versions(event_id, assessment_type_id, version)
  where stage = 'screening';
create unique index rubric_training_version_number on public.rubric_versions(event_id, material_id, assessment_type_id, version)
  where stage = 'training';
create unique index rubric_one_active_screening_per_type on public.rubric_versions(event_id, assessment_type_id)
  where status = 'active' and stage = 'screening';
create unique index rubric_one_active_training_material_type on public.rubric_versions(event_id, material_id, assessment_type_id)
  where status = 'active' and stage = 'training';

alter table public.rubric_materials enable row level security;
create policy rubric_materials_read_staff on public.rubric_materials for select to authenticated
  using (public.can_observe() or public.can_view_rubrics());
create policy rubric_materials_manage_admin on public.rubric_materials for all to authenticated
  using (public.can_manage_rubrics()) with check (public.can_manage_rubrics());
grant select, insert, update, delete on public.rubric_materials to authenticated;
revoke all on public.rubric_materials from anon;

-- Status selesai kini terkait versi aktif tertentu, sehingga materi atau jenis lain tidak tercampur.
create table if not exists public.observer_rubric_version_completions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.observer_assignments(id) on delete cascade,
  rubric_version_id uuid not null references public.rubric_versions(id) on delete cascade,
  completed_by uuid not null references auth.users(id),
  completed_at timestamptz not null default now(),
  unique (assignment_id, rubric_version_id)
);

insert into public.observer_rubric_version_completions(assignment_id, rubric_version_id, completed_by, completed_at)
select old.assignment_id, versions.id, old.completed_by, old.completed_at
from public.observer_rubric_completions old
join public.rubric_versions versions on versions.assessment_type_id = old.assessment_type_id
  and versions.status = 'active'
join public.observer_assignments assignments on assignments.id = old.assignment_id
  and assignments.event_id = versions.event_id
on conflict (assignment_id, rubric_version_id) do nothing;

alter table public.observer_rubric_version_completions enable row level security;
create policy observer_rubric_version_completions_read on public.observer_rubric_version_completions
for select to authenticated using (
  exists (select 1 from public.rubric_versions v where v.id = rubric_version_id and (select public.can_access_event(v.event_id)))
);
create policy observer_rubric_version_completions_insert_self on public.observer_rubric_version_completions
for insert to authenticated with check (
  completed_by = (select auth.uid()) and exists (
    select 1 from public.observer_assignments a join public.rubric_versions v on v.id = rubric_version_id and v.event_id = a.event_id
    where a.id = assignment_id and a.observer_id = (select auth.uid()) and v.status = 'active'
  )
);
create policy observer_rubric_version_completions_update_self on public.observer_rubric_version_completions
for update to authenticated using (
  completed_by = (select auth.uid()) and exists (select 1 from public.observer_assignments a where a.id = assignment_id and a.observer_id = (select auth.uid()))
) with check (
  completed_by = (select auth.uid()) and exists (
    select 1 from public.observer_assignments a join public.rubric_versions v on v.id = rubric_version_id and v.event_id = a.event_id
    where a.id = assignment_id and a.observer_id = (select auth.uid()) and v.status = 'active'
  )
);
create policy observer_rubric_version_completions_delete_self on public.observer_rubric_version_completions
for delete to authenticated using (
  exists (select 1 from public.observer_assignments a where a.id = assignment_id and a.observer_id = (select auth.uid()))
);
grant select, insert, update, delete on public.observer_rubric_version_completions to authenticated;
revoke all on public.observer_rubric_version_completions from anon;

-- Ubah nilai hanya membuka kembali status selesai untuk versi rubrik yang terkait.
create or replace function public.reopen_observer_assignments_on_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_event_id uuid; target_version_id uuid;
begin
  if tg_op = 'INSERT' or old.score is distinct from new.score or old.note is distinct from new.note then
    select event_id into target_event_id from public.participants where id = new.participant_id;
    select v.id into target_version_id
    from public.rubric_indicators i
    join public.rubric_aspects a on a.id = i.aspect_id
    join public.rubric_versions v on v.id = a.rubric_version_id
    where i.id = new.indicator_id;
    delete from public.observer_rubric_version_completions c
    using public.observer_assignments a
    where c.assignment_id = a.id and a.event_id = target_event_id
      and c.rubric_version_id = target_version_id;
    delete from public.observer_rubric_completions c
    using public.observer_assignments a
    where c.assignment_id = a.id and a.event_id = target_event_id
      and c.assessment_type_id = (select v.assessment_type_id from public.rubric_versions v where v.id = target_version_id);
    delete from public.observer_assignment_completions c
    using public.observer_assignments a
    where c.assignment_id = a.id and a.event_id = target_event_id;
  end if;
  return new;
end;
$$;

create or replace function public.reopen_assignments_on_rubric_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status is distinct from new.status and (old.status = 'active' or new.status = 'active') then
    delete from public.observer_rubric_version_completions where rubric_version_id = new.id;
    delete from public.observer_rubric_completions where assessment_type_id = new.assessment_type_id;
    delete from public.observer_assignment_completions c
    using public.observer_assignments a where c.assignment_id = a.id and a.event_id = new.event_id;
  end if;
  return new;
end;
$$;

create index if not exists rubric_materials_event_position_idx on public.rubric_materials(event_id, position);
create index if not exists observer_rubric_version_completions_version_idx on public.observer_rubric_version_completions(rubric_version_id, assignment_id);
