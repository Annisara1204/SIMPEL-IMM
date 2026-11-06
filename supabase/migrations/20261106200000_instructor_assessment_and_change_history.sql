-- Semua subrole Instruktur dapat menilai hanya pada kegiatan yang ditugaskan.
create or replace function public.can_access_observation(target_participant_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    join public.participants participant on participant.id = target_participant_id
    where p.id = (select auth.uid()) and (
      p.role = 'admin_system'
      or (p.role = 'observer' and exists (
        select 1 from public.observer_assignments assignment
        where assignment.event_id = participant.event_id and assignment.observer_id = (select auth.uid())
      ))
      or (p.role = 'instruktur' and exists (
        select 1 from public.instructor_event_assignments assignment
        where assignment.event_id = participant.event_id and assignment.instructor_id = (select auth.uid())
      ))
    )
  );
$$;
revoke all on function public.can_access_observation(uuid) from public;
grant execute on function public.can_access_observation(uuid) to authenticated;

drop policy if exists participants_read_assigned_instructor on public.participants;
create policy participants_read_assigned_instructor on public.participants
  for select to authenticated using ((select public.is_assigned_instructor_for_event(event_id)));

drop policy if exists rubric_versions_read_assigned_instructor on public.rubric_versions;
create policy rubric_versions_read_assigned_instructor on public.rubric_versions
  for select to authenticated using (
    status = 'active' and (select public.is_assigned_instructor_for_event(event_id))
  );
drop policy if exists rubric_aspects_read_assigned_instructor on public.rubric_aspects;
create policy rubric_aspects_read_assigned_instructor on public.rubric_aspects
  for select to authenticated using (exists (
    select 1 from public.rubric_versions version
    where version.id = rubric_version_id and version.status = 'active'
      and (select public.is_assigned_instructor_for_event(version.event_id))
  ));
drop policy if exists rubric_indicators_read_assigned_instructor on public.rubric_indicators;
create policy rubric_indicators_read_assigned_instructor on public.rubric_indicators
  for select to authenticated using (exists (
    select 1 from public.rubric_aspects aspect
    join public.rubric_versions version on version.id = aspect.rubric_version_id
    where aspect.id = aspect_id and version.status = 'active'
      and (select public.is_assigned_instructor_for_event(version.event_id))
  ));
drop policy if exists rubric_assessment_types_read_assigned_instructor on public.rubric_assessment_types;
create policy rubric_assessment_types_read_assigned_instructor on public.rubric_assessment_types
  for select to authenticated using ((select public.is_assigned_instructor_for_event(event_id)));
drop policy if exists rubric_materials_read_assigned_instructor on public.rubric_materials;
create policy rubric_materials_read_assigned_instructor on public.rubric_materials
  for select to authenticated using ((select public.is_assigned_instructor_for_event(event_id)));

drop policy if exists observer_assignments_read_assigned_instructor on public.observer_assignments;
create policy observer_assignments_read_assigned_instructor on public.observer_assignments
  for select to authenticated using ((select public.is_assigned_instructor_for_event(event_id)));
drop policy if exists observer_rubric_version_completions_read_assigned_instructor on public.observer_rubric_version_completions;
create policy observer_rubric_version_completions_read_assigned_instructor on public.observer_rubric_version_completions
  for select to authenticated using (exists (
    select 1 from public.rubric_versions version
    where version.id = rubric_version_id
      and (select public.is_assigned_instructor_for_event(version.event_id))
  ));

alter table public.observations add column if not exists updated_by_name text;
alter table public.observation_revisions add column if not exists actor_id uuid references auth.users(id) on delete set null;
alter table public.observation_revisions add column if not exists actor_name text;
alter table public.observation_revisions add column if not exists score_after smallint;
alter table public.observation_revisions add column if not exists note_after text;

update public.observations observation
set updated_by_name = coalesce(nullif(trim(profile.display_name), ''), 'Akun pengguna')
from public.profiles profile
where profile.id = observation.updated_by and observation.updated_by_name is null;

create or replace function public.keep_observation_history()
returns trigger language plpgsql security definer set search_path = '' as $$
declare editor_name text;
begin
  select coalesce(nullif(trim(profile.display_name), ''), 'Akun pengguna')
  into editor_name from public.profiles profile where profile.id = new.updated_by;
  new.updated_by_name := coalesce(editor_name, 'Akun pengguna');

  if tg_op = 'UPDATE' and (old.score is distinct from new.score or old.note is distinct from new.note) then
    insert into public.observation_revisions(
      observation_id, score, note, revision, changed_by,
      actor_id, actor_name, score_after, note_after, changed_at
    ) values (
      old.id, old.score, old.note, old.revision + 1, old.updated_by,
      new.updated_by, new.updated_by_name, new.score, new.note, now()
    );
    new.revision := old.revision + 1;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists observations_capture_revision on public.observations;
drop trigger if exists observations_track_changes on public.observations;
create trigger observations_track_changes before insert or update on public.observations
for each row execute function public.keep_observation_history();

create or replace function public.log_initial_observation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.observation_revisions(
    observation_id, score, note, revision, changed_by,
    actor_id, actor_name, score_after, note_after, changed_at
  ) values (
    new.id, null, null, new.revision, new.updated_by,
    new.updated_by, new.updated_by_name, new.score, new.note, new.updated_at
  );
  return new;
end;
$$;
drop trigger if exists observations_log_initial_state on public.observations;
create trigger observations_log_initial_state after insert on public.observations
for each row execute function public.log_initial_observation();

-- Catatan lama tetap terlihat sebagai riwayat, tetapi tidak mengarang pelaku perubahan.
comment on column public.observation_revisions.actor_name is
  'Nama akun yang melakukan perubahan ini; data historis sebelum migrasi ini dibiarkan kosong.';
