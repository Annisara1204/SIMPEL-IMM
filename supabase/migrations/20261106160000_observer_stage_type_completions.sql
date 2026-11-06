-- Status selesai Observer dicatat terpisah untuk setiap jenis penilaian.
create table if not exists public.observer_rubric_completions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.observer_assignments(id) on delete cascade,
  assessment_type_id uuid not null references public.rubric_assessment_types(id) on delete cascade,
  completed_by uuid not null references auth.users(id),
  completed_at timestamptz not null default now(),
  unique (assignment_id, assessment_type_id)
);

-- Pertahankan status selesai lama untuk rubrik umum yang telah dimigrasikan.
insert into public.observer_rubric_completions(assignment_id, assessment_type_id, completed_by, completed_at)
select old.assignment_id, types.id, old.completed_by, old.completed_at
from public.observer_assignment_completions old
join public.observer_assignments assignments on assignments.id = old.assignment_id
join public.rubric_assessment_types types on types.event_id = assignments.event_id
  and types.stage = 'training' and types.name = 'Penilaian umum'
on conflict (assignment_id, assessment_type_id) do nothing;

alter table public.observer_rubric_completions enable row level security;
create policy observer_rubric_completions_read_scoped on public.observer_rubric_completions
for select to authenticated using (
  exists (
    select 1 from public.observer_assignments a
    where a.id = assignment_id and (select public.can_access_event(a.event_id))
  )
);
create policy observer_rubric_completions_insert_self on public.observer_rubric_completions
for insert to authenticated with check (
  completed_by = (select auth.uid()) and exists (
    select 1 from public.observer_assignments a
    join public.rubric_assessment_types t on t.id = assessment_type_id and t.event_id = a.event_id
    where a.id = assignment_id and a.observer_id = (select auth.uid())
  )
);
create policy observer_rubric_completions_update_self on public.observer_rubric_completions
for update to authenticated using (
  completed_by = (select auth.uid()) and exists (
    select 1 from public.observer_assignments a
    where a.id = assignment_id and a.observer_id = (select auth.uid())
  )
) with check (
  completed_by = (select auth.uid()) and exists (
    select 1 from public.observer_assignments a
    join public.rubric_assessment_types t on t.id = assessment_type_id and t.event_id = a.event_id
    where a.id = assignment_id and a.observer_id = (select auth.uid())
  )
);
create policy observer_rubric_completions_delete_self on public.observer_rubric_completions
for delete to authenticated using (
  exists (
    select 1 from public.observer_assignments a
    where a.id = assignment_id and a.observer_id = (select auth.uid())
  )
);
grant select, insert, update, delete on public.observer_rubric_completions to authenticated;
revoke all on public.observer_rubric_completions from anon;

-- Perubahan nilai hanya membuka kembali status untuk jenis rubrik yang berubah.
create or replace function public.reopen_observer_assignments_on_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  target_event_id uuid;
  target_type_id uuid;
begin
  if tg_op = 'INSERT' or old.score is distinct from new.score or old.note is distinct from new.note then
    select event_id into target_event_id from public.participants where id = new.participant_id;
    select v.assessment_type_id into target_type_id
    from public.rubric_indicators i
    join public.rubric_aspects a on a.id = i.aspect_id
    join public.rubric_versions v on v.id = a.rubric_version_id
    where i.id = new.indicator_id;
    delete from public.observer_rubric_completions c
    using public.observer_assignments a
    where c.assignment_id = a.id and a.event_id = target_event_id
      and c.assessment_type_id = target_type_id;
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
    delete from public.observer_rubric_completions c
    where c.assessment_type_id = new.assessment_type_id;
    delete from public.observer_assignment_completions c
    using public.observer_assignments a
    where c.assignment_id = a.id and a.event_id = new.event_id;
  end if;
  return new;
end;
$$;

create index if not exists observer_rubric_completions_type_idx
  on public.observer_rubric_completions(assessment_type_id, assignment_id);
