-- Tahap 4: konfigurasi rubrik berversi dan lembar observasi bersama.
create table public.rubric_versions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  version integer not null check (version > 0),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  unobserved_aspect_rule text not null default 'exclude_and_renormalize'
    check (unobserved_aspect_rule = 'exclude_and_renormalize'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (event_id, version)
);

create table public.observer_assignments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  observer_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (event_id, observer_id)
);

create unique index rubric_one_active_per_event on public.rubric_versions(event_id) where status = 'active';

create table public.rubric_aspects (
  id uuid primary key default gen_random_uuid(),
  rubric_version_id uuid not null references public.rubric_versions(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 120),
  weight numeric(5,2) not null check (weight > 0 and weight <= 100),
  position integer not null default 0,
  unique (rubric_version_id, name)
);

create table public.rubric_indicators (
  id uuid primary key default gen_random_uuid(),
  aspect_id uuid not null references public.rubric_aspects(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 200),
  weight numeric(5,2) not null check (weight > 0 and weight <= 100),
  target text check (target is null or char_length(trim(target)) <= 300),
  position integer not null default 0,
  unique (aspect_id, name)
);

create table public.observations (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  indicator_id uuid not null references public.rubric_indicators(id) on delete restrict,
  score smallint check (score between 1 and 5),
  note text check (note is null or char_length(note) <= 2000),
  revision integer not null default 1 check (revision > 0),
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  unique (participant_id, indicator_id)
);

create table public.observation_revisions (
  id bigint generated always as identity primary key,
  observation_id uuid not null references public.observations(id) on delete cascade,
  score smallint,
  note text,
  revision integer not null,
  changed_by uuid not null references auth.users(id),
  changed_at timestamptz not null default now()
);

create or replace function public.can_manage_rubrics()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin_system', 'bidang_kader'));
$$;

create or replace function public.can_observe()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin_system', 'observer'));
$$;

create or replace function public.can_access_observation(target_participant_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and (
      p.role = 'admin_system' or (p.role = 'observer' and exists (
        select 1 from public.participants participant
        join public.observer_assignments assignment on assignment.event_id = participant.event_id
        where participant.id = target_participant_id and assignment.observer_id = (select auth.uid())
      ))
    )
  );
$$;

create or replace function public.can_access_event(target_event_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and (
      p.role = 'admin_system' or (p.role = 'observer' and exists (
        select 1 from public.observer_assignments assignment
        where assignment.event_id = target_event_id and assignment.observer_id = (select auth.uid())
      ))
    )
  );
$$;

revoke all on function public.can_manage_rubrics() from public;
revoke all on function public.can_observe() from public;
revoke all on function public.can_access_observation(uuid) from public;
revoke all on function public.can_access_event(uuid) from public;
grant execute on function public.can_manage_rubrics(), public.can_observe(), public.can_access_observation(uuid), public.can_access_event(uuid) to authenticated;

alter table public.rubric_versions enable row level security;
alter table public.rubric_aspects enable row level security;
alter table public.rubric_indicators enable row level security;
alter table public.observations enable row level security;
alter table public.observation_revisions enable row level security;
alter table public.observer_assignments enable row level security;

drop policy if exists "participants_manage_by_authorized_roles" on public.participants;
create policy "participants_read_assigned_observer" on public.participants for select to authenticated using ((select public.can_access_event(event_id)));
create policy "participants_insert_by_authorized_roles" on public.participants for insert to authenticated with check ((select public.can_manage_events()));
create policy "participants_update_by_authorized_roles" on public.participants for update to authenticated using ((select public.can_manage_events())) with check ((select public.can_manage_events()));
create policy "participants_delete_by_authorized_roles" on public.participants for delete to authenticated using ((select public.can_manage_events()));
create policy "events_read_rubric_managers" on public.events for select to authenticated using ((select public.can_manage_rubrics()));

create policy "profiles_observer_list_for_assignment" on public.profiles for select to authenticated using (
  role = 'observer' and (select public.can_manage_rubrics())
);

create policy "assignments_read_self_or_manager" on public.observer_assignments for select to authenticated using (observer_id = (select auth.uid()) or (select public.can_manage_rubrics()));
create policy "assignments_manage" on public.observer_assignments for all to authenticated using ((select public.can_manage_rubrics())) with check ((select public.can_manage_rubrics()));

create policy "rubric_versions_read_staff" on public.rubric_versions for select to authenticated using ((select public.can_observe()) or (select public.can_manage_rubrics()));
create policy "rubric_versions_insert_draft" on public.rubric_versions for insert to authenticated with check ((select public.can_manage_rubrics()) and status = 'draft');
create policy "rubric_versions_update_draft_or_archive" on public.rubric_versions for update to authenticated using ((select public.can_manage_rubrics()) and status in ('draft', 'active')) with check ((select public.can_manage_rubrics()) and status in ('draft', 'archived'));
create policy "rubric_versions_delete_draft" on public.rubric_versions for delete to authenticated using ((select public.can_manage_rubrics()) and status = 'draft');
create policy "rubric_aspects_read_staff" on public.rubric_aspects for select to authenticated using ((select public.can_observe()) or (select public.can_manage_rubrics()));
create policy "rubric_aspects_manage" on public.rubric_aspects for all to authenticated using ((select public.can_manage_rubrics()) and exists (select 1 from public.rubric_versions v where v.id = rubric_version_id and v.status = 'draft')) with check ((select public.can_manage_rubrics()) and exists (select 1 from public.rubric_versions v where v.id = rubric_version_id and v.status = 'draft'));
create policy "rubric_indicators_read_staff" on public.rubric_indicators for select to authenticated using ((select public.can_observe()) or (select public.can_manage_rubrics()));
create policy "rubric_indicators_manage" on public.rubric_indicators for all to authenticated using ((select public.can_manage_rubrics()) and exists (select 1 from public.rubric_aspects a join public.rubric_versions v on v.id = a.rubric_version_id where a.id = aspect_id and v.status = 'draft')) with check ((select public.can_manage_rubrics()) and exists (select 1 from public.rubric_aspects a join public.rubric_versions v on v.id = a.rubric_version_id where a.id = aspect_id and v.status = 'draft'));
create policy "observations_read_assigned_observer" on public.observations for select to authenticated using ((select public.can_access_observation(participant_id)));
create policy "observations_write_assigned_observer" on public.observations for all to authenticated using ((select public.can_access_observation(participant_id))) with check ((select public.can_access_observation(participant_id)));
create policy "observation_history_read_assigned_observer" on public.observation_revisions for select to authenticated using (exists (select 1 from public.observations o where o.id = observation_id and (select public.can_access_observation(o.participant_id))));
create policy "observation_history_insert_assigned_observer" on public.observation_revisions for insert to authenticated with check (exists (select 1 from public.observations o where o.id = observation_id and (select public.can_access_observation(o.participant_id))));

grant select, insert, update, delete on public.rubric_versions, public.rubric_aspects, public.rubric_indicators to authenticated;
grant select, insert, update, delete on public.observations to authenticated;
grant select, insert on public.observation_revisions to authenticated;
grant select, insert, update, delete on public.observer_assignments to authenticated;
grant usage, select on sequence public.observation_revisions_id_seq to authenticated;
revoke all on public.rubric_versions, public.rubric_aspects, public.rubric_indicators, public.observations, public.observation_revisions, public.observer_assignments from anon;

create or replace function public.keep_observation_history()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.score is distinct from new.score or old.note is distinct from new.note then
    insert into public.observation_revisions(observation_id, score, note, revision, changed_by)
    values (old.id, old.score, old.note, old.revision, old.updated_by);
    new.revision := old.revision + 1;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger observations_capture_revision before update on public.observations
for each row execute function public.keep_observation_history();

create or replace function public.validate_observation_version()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.participants p
    join public.rubric_indicators i on i.id = new.indicator_id
    join public.rubric_aspects a on a.id = i.aspect_id
    join public.rubric_versions v on v.id = a.rubric_version_id
    where p.id = new.participant_id and p.event_id = v.event_id and v.status = 'active'
  ) then
    raise exception 'Penilaian hanya dapat disimpan pada rubrik aktif untuk kegiatan peserta.';
  end if;
  return new;
end;
$$;

create trigger observations_validate_active_version before insert or update on public.observations
for each row execute function public.validate_observation_version();

-- Penyelesaian per Observer berlaku untuk satu kegiatan. Perubahan observasi membuka kembali semua penugasan.
create table public.observer_assignment_completions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references public.observer_assignments(id) on delete cascade,
  completed_by uuid not null references auth.users(id),
  completed_at timestamptz not null default now()
);
alter table public.observer_assignment_completions enable row level security;

create policy "assignment_completion_read_event_staff" on public.observer_assignment_completions for select to authenticated using (
  exists (select 1 from public.observer_assignments a where a.id = assignment_id and (select public.can_access_event(a.event_id)))
);
create policy "assignment_completion_insert_self" on public.observer_assignment_completions for insert to authenticated with check (
  completed_by = (select auth.uid()) and exists (select 1 from public.observer_assignments a where a.id = assignment_id and a.observer_id = (select auth.uid()))
);
create policy "assignment_completion_update_self" on public.observer_assignment_completions for update to authenticated using (
  completed_by = (select auth.uid()) and exists (select 1 from public.observer_assignments a where a.id = assignment_id and a.observer_id = (select auth.uid()))
) with check (
  completed_by = (select auth.uid()) and exists (select 1 from public.observer_assignments a where a.id = assignment_id and a.observer_id = (select auth.uid()))
);
create policy "assignment_completion_delete_self" on public.observer_assignment_completions for delete to authenticated using (
  completed_by = (select auth.uid()) and exists (select 1 from public.observer_assignments a where a.id = assignment_id and a.observer_id = (select auth.uid()))
);
grant select, insert, update, delete on public.observer_assignment_completions to authenticated;
revoke all on public.observer_assignment_completions from anon;

create policy "assignments_read_assigned_event" on public.observer_assignments for select to authenticated using ((select public.can_access_event(event_id)));

create or replace function public.reopen_observer_assignments_on_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_event_id uuid;
begin
  if tg_op = 'INSERT' or old.score is distinct from new.score or old.note is distinct from new.note then
    select event_id into target_event_id from public.participants where id = new.participant_id;
    delete from public.observer_assignment_completions c
    using public.observer_assignments a
    where c.assignment_id = a.id and a.event_id = target_event_id;
  end if;
  return new;
end;
$$;
create trigger observations_reopen_assignments after insert or update on public.observations
for each row execute function public.reopen_observer_assignments_on_change();

create or replace function public.reopen_assignments_on_rubric_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status is distinct from new.status and (old.status = 'active' or new.status = 'active') then
    delete from public.observer_assignment_completions c
    using public.observer_assignments a
    where c.assignment_id = a.id and a.event_id = new.event_id;
  end if;
  return new;
end;
$$;
create trigger rubric_status_reopens_assignments after update of status on public.rubric_versions
for each row execute function public.reopen_assignments_on_rubric_change();
