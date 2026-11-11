-- Engine penilaian bersama: satu skor per indikator, pemetaan indikator multi-aspek,
-- uraian rubrik per skor, catatan per penulis, dan publikasi perubahan ke Realtime.

alter table public.rubric_indicators
  add column if not exists score_descriptors jsonb not null default '{}'::jsonb;

alter table public.rubric_indicators
  drop constraint if exists rubric_indicators_score_descriptors_object;
alter table public.rubric_indicators
  add constraint rubric_indicators_score_descriptors_object
  check (jsonb_typeof(score_descriptors) = 'object');

create table if not exists public.rubric_indicator_aspects (
  id uuid primary key default gen_random_uuid(),
  indicator_id uuid not null references public.rubric_indicators(id) on delete cascade,
  aspect_id uuid not null references public.rubric_aspects(id) on delete cascade,
  weight numeric(5,2) not null check (weight > 0 and weight <= 100),
  created_at timestamptz not null default now(),
  unique (indicator_id, aspect_id)
);

insert into public.rubric_indicator_aspects(indicator_id, aspect_id, weight)
select id, aspect_id, weight from public.rubric_indicators
on conflict (indicator_id, aspect_id) do nothing;

create or replace function public.validate_rubric_activation()
returns trigger language plpgsql security definer set search_path = '' as $$
declare aspect_total numeric; aspect_count integer;
begin
  if new.status = 'active' and old.status is distinct from new.status then
    select count(*), coalesce(sum(weight), 0) into aspect_count, aspect_total
    from public.rubric_aspects where rubric_version_id = new.id;
    if aspect_count = 0 or abs(aspect_total - 100) >= 0.001 then
      raise exception 'Bobot aspek harus berjumlah 100%% dan sedikitnya satu aspek harus tersedia.';
    end if;
    if exists (
      select 1 from public.rubric_aspects aspect
      left join public.rubric_indicator_aspects mapping on mapping.aspect_id = aspect.id
      left join public.rubric_indicators indicator on indicator.id = mapping.indicator_id
      where aspect.rubric_version_id = new.id
      group by aspect.id
      having count(mapping.id) = 0 or abs(coalesce(sum(mapping.weight), 0) - 100) >= 0.001
    ) then
      raise exception 'Bobot pemetaan indikator dalam tiap aspek harus berjumlah 100%% dan aspek tidak boleh kosong.';
    end if;
    if exists (
      select 1 from public.rubric_indicator_aspects mapping
      join public.rubric_aspects aspect on aspect.id = mapping.aspect_id
      join public.rubric_indicators indicator on indicator.id = mapping.indicator_id
      where aspect.rubric_version_id = new.id
        and exists (select 1 from generate_series(1, 5) as scores(score_value) where length(trim(coalesce(indicator.score_descriptors ->> score_value::text, ''))) < 3)
    ) then
      raise exception 'Setiap indikator harus memiliki uraian perilaku minimal 3 karakter untuk skor 1 sampai 5.';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists rubric_versions_validate_activation on public.rubric_versions;
create trigger rubric_versions_validate_activation before update of status on public.rubric_versions
for each row execute function public.validate_rubric_activation();

create or replace function public.ensure_indicator_aspect_same_version()
returns trigger language plpgsql security definer set search_path = '' as $$
declare indicator_version uuid; aspect_version uuid;
begin
  select aspect.rubric_version_id into indicator_version
  from public.rubric_indicators indicator
  join public.rubric_aspects aspect on aspect.id = indicator.aspect_id
  where indicator.id = new.indicator_id;
  select rubric_version_id into aspect_version
  from public.rubric_aspects where id = new.aspect_id;
  if indicator_version is null or aspect_version is null or indicator_version <> aspect_version then
    raise exception 'Indikator dan aspek harus berasal dari versi rubrik yang sama.';
  end if;
  return new;
end;
$$;
drop trigger if exists rubric_indicator_aspects_same_version on public.rubric_indicator_aspects;
create trigger rubric_indicator_aspects_same_version
before insert or update of indicator_id, aspect_id on public.rubric_indicator_aspects
for each row execute function public.ensure_indicator_aspect_same_version();

alter table public.rubric_indicator_aspects enable row level security;
create policy rubric_indicator_aspects_read_staff on public.rubric_indicator_aspects
for select to authenticated using (
  exists (
    select 1 from public.rubric_indicators indicator
    join public.rubric_aspects aspect on aspect.id = indicator.aspect_id
    join public.rubric_versions version on version.id = aspect.rubric_version_id
    where indicator.id = rubric_indicator_aspects.indicator_id
      and ((select public.can_view_rubrics())
        or (version.status = 'active' and (
          (select public.is_assigned_observer_for_event(version.event_id))
          or (select public.is_assigned_instructor_for_event(version.event_id))
        )))
  )
);
create policy rubric_indicator_aspects_manage_draft on public.rubric_indicator_aspects
for all to authenticated using (
  (select public.can_manage_rubrics()) and exists (
    select 1 from public.rubric_indicators indicator
    join public.rubric_aspects aspect on aspect.id = indicator.aspect_id
    join public.rubric_versions version on version.id = aspect.rubric_version_id
    where indicator.id = rubric_indicator_aspects.indicator_id and version.status = 'draft'
  ) and exists (
    select 1 from public.rubric_aspects aspect
    join public.rubric_versions version on version.id = aspect.rubric_version_id
    where aspect.id = rubric_indicator_aspects.aspect_id and version.status = 'draft'
  )
) with check (
  (select public.can_manage_rubrics()) and exists (
    select 1 from public.rubric_indicators indicator
    join public.rubric_aspects aspect on aspect.id = indicator.aspect_id
    join public.rubric_versions version on version.id = aspect.rubric_version_id
    where indicator.id = rubric_indicator_aspects.indicator_id and version.status = 'draft'
  ) and exists (
    select 1 from public.rubric_aspects aspect
    join public.rubric_versions version on version.id = aspect.rubric_version_id
    where aspect.id = rubric_indicator_aspects.aspect_id and version.status = 'draft'
  )
);
grant select, insert, update, delete on public.rubric_indicator_aspects to authenticated;
revoke all on public.rubric_indicator_aspects from anon;

create table if not exists public.observer_notes (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  rubric_version_id uuid not null references public.rubric_versions(id) on delete cascade,
  indicator_id uuid references public.rubric_indicators(id) on delete restrict,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default 'Akun pengguna',
  note_type text not null check (note_type in ('observation', 'strength', 'development', 'special')),
  content text not null check (char_length(content) <= 3000),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  scope_id uuid generated always as (coalesce(indicator_id, '00000000-0000-0000-0000-000000000000'::uuid)) stored
);
create unique index if not exists observer_notes_author_scope_unique
  on public.observer_notes(participant_id, rubric_version_id, author_id, note_type, scope_id);
create index if not exists observer_notes_version_participant_idx
  on public.observer_notes(rubric_version_id, participant_id, updated_at desc);

create table if not exists public.observer_note_revisions (
  id bigint generated always as identity primary key,
  note_id uuid not null references public.observer_notes(id) on delete cascade,
  content_before text not null,
  revision integer not null,
  changed_by uuid not null references auth.users(id),
  actor_name text not null,
  content_after text not null,
  changed_at timestamptz not null default now()
);

-- Pindahkan catatan lama tanpa menggabungkan catatan dari indikator yang berbeda.
insert into public.observer_notes(participant_id, rubric_version_id, indicator_id, author_id, author_name, note_type, content, revision, created_at, updated_at)
select observation.participant_id, version.id, indicator.id, observation.updated_by,
  coalesce(nullif(trim(profile.display_name), ''), observation.updated_by_name, 'Akun pengguna'),
  'observation', observation.note, observation.revision, observation.updated_at, observation.updated_at
from public.observations observation
join public.participants participant on participant.id = observation.participant_id
join public.rubric_indicators indicator on indicator.id = observation.indicator_id
join public.rubric_aspects aspect on aspect.id = indicator.aspect_id
join public.rubric_versions version on version.id = aspect.rubric_version_id
left join public.profiles profile on profile.id = observation.updated_by
where nullif(trim(observation.note), '') is not null
on conflict (participant_id, rubric_version_id, author_id, note_type, scope_id) do nothing;

insert into public.observer_note_revisions(note_id, content_before, revision, changed_by, actor_name, content_after, changed_at)
select note.id, coalesce(history.note, ''), history.revision, coalesce(history.actor_id, history.changed_by),
  coalesce(history.actor_name, 'Akun pengguna'), coalesce(history.note_after, ''), history.changed_at
from public.observation_revisions history
join public.observations observation on observation.id = history.observation_id
join public.rubric_indicators indicator on indicator.id = observation.indicator_id
join public.rubric_aspects aspect on aspect.id = indicator.aspect_id
join public.rubric_versions version on version.id = aspect.rubric_version_id
join public.observer_notes note on note.participant_id = observation.participant_id
  and note.rubric_version_id = version.id and note.indicator_id = indicator.id
  and note.author_id = observation.updated_by and note.note_type = 'observation'
where history.note is not null or history.note_after is not null;

alter table public.observer_notes enable row level security;
create policy observer_notes_read_assigned on public.observer_notes
for select to authenticated using (
  (select public.can_access_observation(participant_id)) and exists (
    select 1 from public.participants participant
    join public.rubric_versions version on version.id = observer_notes.rubric_version_id
    where participant.id = observer_notes.participant_id and version.id = observer_notes.rubric_version_id and participant.event_id = version.event_id
  )
);
create policy observer_notes_insert_own_assigned on public.observer_notes
for insert to authenticated with check (
  author_id = (select auth.uid()) and (select public.can_access_observation(participant_id)) and exists (
    select 1 from public.participants participant
    join public.rubric_versions version on version.id = observer_notes.rubric_version_id
    where participant.id = observer_notes.participant_id and version.id = observer_notes.rubric_version_id and participant.event_id = version.event_id and version.status = 'active'
  )
);
create policy observer_notes_update_own_assigned on public.observer_notes
for update to authenticated using (
  author_id = (select auth.uid()) and (select public.can_access_observation(participant_id)) and exists (
    select 1 from public.rubric_versions version
    where version.id = observer_notes.rubric_version_id and version.status = 'active'
  )
) with check (
  author_id = (select auth.uid()) and (select public.can_access_observation(participant_id)) and exists (
    select 1 from public.participants participant
    join public.rubric_versions version on version.id = observer_notes.rubric_version_id
    where participant.id = observer_notes.participant_id and participant.event_id = version.event_id and version.status = 'active'
  )
);
alter table public.observer_note_revisions enable row level security;
create policy observer_note_revisions_read_assigned on public.observer_note_revisions
for select to authenticated using (
  exists (select 1 from public.observer_notes note where note.id = observer_note_revisions.note_id and (select public.can_access_observation(note.participant_id)))
);
grant select, insert, update on public.observer_notes to authenticated;
grant select on public.observer_note_revisions to authenticated;
revoke all on public.observer_notes, public.observer_note_revisions from anon;

create or replace function public.keep_observer_note_history()
returns trigger language plpgsql security definer set search_path = '' as $$
declare editor_name text;
begin
  if tg_op = 'INSERT' then
    new.revision := 1;
    new.created_at := now();
  else
    if old.author_id <> new.author_id or old.participant_id <> new.participant_id
      or old.rubric_version_id <> new.rubric_version_id or old.indicator_id is distinct from new.indicator_id
      or old.note_type <> new.note_type or old.created_at <> new.created_at then
      raise exception 'Kepemilikan dan cakupan catatan tidak dapat diubah.';
    end if;
  end if;
  select coalesce(nullif(trim(profile.display_name), ''), 'Akun pengguna') into editor_name
  from public.profiles profile where profile.id = new.author_id;
  new.author_name := coalesce(editor_name, 'Akun pengguna');
  if tg_op = 'UPDATE' and old.content is distinct from new.content then
    insert into public.observer_note_revisions(note_id, content_before, revision, changed_by, actor_name, content_after, changed_at)
    values (old.id, old.content, old.revision + 1, new.author_id, new.author_name, new.content, now());
    new.revision := old.revision + 1;
    new.updated_at := now();
  end if;
  return new;
end;
$$;
drop trigger if exists observer_notes_track_changes on public.observer_notes;
create trigger observer_notes_track_changes before insert or update on public.observer_notes
for each row execute function public.keep_observer_note_history();

create or replace function public.reopen_observer_assignments_on_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_event_id uuid; target_version_id uuid;
begin
  if tg_op = 'INSERT' or old.score is distinct from new.score then
    select event_id into target_event_id from public.participants where id = new.participant_id;
    select distinct version.id into target_version_id
    from public.rubric_indicator_aspects mapping
    join public.rubric_aspects aspect on aspect.id = mapping.aspect_id
    join public.rubric_versions version on version.id = aspect.rubric_version_id
    where mapping.indicator_id = new.indicator_id;
    delete from public.observer_rubric_version_completions completion
    using public.observer_assignments assignment
    where completion.assignment_id = assignment.id and assignment.event_id = target_event_id
      and completion.rubric_version_id = target_version_id;
    delete from public.observer_rubric_completions completion
    using public.observer_assignments assignment
    where completion.assignment_id = assignment.id and assignment.event_id = target_event_id
      and completion.assessment_type_id = (select assessment_type_id from public.rubric_versions where id = target_version_id);
    delete from public.observer_assignment_completions completion
    using public.observer_assignments assignment
    where completion.assignment_id = assignment.id and assignment.event_id = target_event_id;
  end if;
  return new;
end;
$$;

create or replace function public.reopen_observer_assignments_on_note_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_event_id uuid;
begin
  if tg_op = 'INSERT' or (tg_op = 'UPDATE' and old.content is distinct from new.content) then
    select event_id into target_event_id from public.participants where id = new.participant_id;
    delete from public.observer_rubric_version_completions completion
    using public.observer_assignments assignment
    where completion.assignment_id = assignment.id and assignment.event_id = target_event_id
      and completion.rubric_version_id = new.rubric_version_id;
    delete from public.observer_rubric_completions completion
    using public.observer_assignments assignment
    where completion.assignment_id = assignment.id and assignment.event_id = target_event_id
      and completion.assessment_type_id = (select assessment_type_id from public.rubric_versions where id = new.rubric_version_id);
    delete from public.observer_assignment_completions completion
    using public.observer_assignments assignment
    where completion.assignment_id = assignment.id and assignment.event_id = target_event_id;
  end if;
  return new;
end;
$$;
drop trigger if exists observer_notes_reopen_completions on public.observer_notes;
create trigger observer_notes_reopen_completions after insert or update on public.observer_notes
for each row execute function public.reopen_observer_assignments_on_note_change();

-- Identitas pelaku skor berasal dari sesi login dan indikator harus berada pada rubrik aktif milik kegiatan peserta.
create or replace function public.validate_shared_observation()
returns trigger language plpgsql security definer set search_path = '' as $$
declare participant_event uuid; indicator_event uuid; indicator_active boolean;
begin
  if auth.uid() is not null then new.updated_by := auth.uid(); end if;
  select event_id into participant_event from public.participants where id = new.participant_id;
  select version.event_id, version.status = 'active' into indicator_event, indicator_active
  from public.rubric_indicators indicator
  join public.rubric_indicator_aspects mapping on mapping.indicator_id = indicator.id
  join public.rubric_aspects aspect on aspect.id = mapping.aspect_id
  join public.rubric_versions version on version.id = aspect.rubric_version_id
  where indicator.id = new.indicator_id limit 1;
  if participant_event is null or indicator_event is null or participant_event <> indicator_event or indicator_active is not true then
    raise exception 'Skor hanya dapat ditulis untuk indikator rubrik aktif pada kegiatan peserta yang sama.';
  end if;
  return new;
end;
$$;
drop trigger if exists observations_validate_scope on public.observations;
create trigger observations_validate_scope before insert or update on public.observations
for each row execute function public.validate_shared_observation();

create or replace function public.keep_observation_history()
returns trigger language plpgsql security definer set search_path = '' as $$
declare editor_name text;
begin
  if auth.uid() is not null then new.updated_by := auth.uid(); end if;
  select coalesce(nullif(trim(profile.display_name), ''), 'Akun pengguna') into editor_name
  from public.profiles profile where profile.id = new.updated_by;
  new.updated_by_name := coalesce(editor_name, 'Akun pengguna');
  if tg_op = 'UPDATE' and (old.score is distinct from new.score or old.note is distinct from new.note) then
    insert into public.observation_revisions(observation_id, score, note, revision, changed_by, actor_id, actor_name, score_after, note_after, changed_at)
    values (old.id, old.score, old.note, old.revision + 1, old.updated_by, new.updated_by, new.updated_by_name, new.score, new.note, now());
    new.revision := old.revision + 1;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

-- Gunakan bobot pemetaan baru pada ringkasan hasil Instruktur, tanpa mengubah aturan kategori/penyelesaian.
create or replace function public.get_instructor_dashboard_results()
returns table (
  event_id uuid, event_name text, stage text, material_name text, assessment_type_name text,
  rubric_version integer, participant_count integer, scored_count integer, average_score numeric,
  category_development integer, category_adequate integer, category_good integer, category_excellent integer,
  observer_count integer, completed_observer_count integer, is_official boolean
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'instruktur') then
    raise exception 'Akses hanya untuk Instruktur.' using errcode = '42501';
  end if;
  return query
  with active_versions as (
    select rv.id, rv.event_id, rv.stage, rv.material_id, rv.assessment_type_id, rv.version,
      e.name as event_title, m.name as material_title, t.name as type_title
    from public.rubric_versions rv
    join public.events e on e.id = rv.event_id
    join public.rubric_assessment_types t on t.id = rv.assessment_type_id
    left join public.rubric_materials m on m.id = rv.material_id
    where rv.status = 'active' and exists (
      select 1 from public.instructor_event_assignments ia
      where ia.event_id = rv.event_id and ia.instructor_id = (select auth.uid())
        and ia.position in ('mot', 'vice_mot', 'master_observer', 'vice_observer')
    )
  ),
  aspect_results as (
    select v.id as version_id, p.id as participant_id, a.id as aspect_id, a.weight as aspect_weight,
      sum(o.score::numeric * mapping.weight) / nullif(sum(mapping.weight) filter (where o.score is not null), 0) as aspect_score
    from active_versions v
    join public.participants p on p.event_id = v.event_id
    join public.rubric_aspects a on a.rubric_version_id = v.id
    join public.rubric_indicator_aspects mapping on mapping.aspect_id = a.id
    join public.rubric_indicators i on i.id = mapping.indicator_id
    left join public.observations o on o.participant_id = p.id and o.indicator_id = i.id
    group by v.id, p.id, a.id, a.weight
  ),
  participant_scores as (
    select ar.version_id, ar.participant_id,
      ((sum(ar.aspect_score * ar.aspect_weight) / nullif(sum(ar.aspect_weight), 0) - 1) / 4) * 100 as score
    from aspect_results ar where ar.aspect_score is not null group by ar.version_id, ar.participant_id
  ),
  completion_counts as (
    select v.id as version_id, count(distinct a.id)::integer as assigned_count,
      count(distinct c.assignment_id)::integer as completed_count
    from active_versions v
    left join public.observer_assignments a on a.event_id = v.event_id
    left join public.observer_rubric_version_completions c on c.assignment_id = a.id and c.rubric_version_id = v.id
    group by v.id
  )
  select v.event_id, v.event_title, v.stage, v.material_title, v.type_title, v.version,
    count(distinct p.id)::integer, count(distinct ps.participant_id)::integer, round(avg(ps.score), 2),
    count(distinct ps.participant_id) filter (where ps.score < 60)::integer,
    count(distinct ps.participant_id) filter (where ps.score >= 60 and ps.score < 75)::integer,
    count(distinct ps.participant_id) filter (where ps.score >= 75 and ps.score < 90)::integer,
    count(distinct ps.participant_id) filter (where ps.score >= 90)::integer,
    cc.assigned_count, cc.completed_count, (cc.assigned_count > 0 and cc.assigned_count = cc.completed_count)
  from active_versions v
  join completion_counts cc on cc.version_id = v.id
  left join public.participants p on p.event_id = v.event_id
  left join participant_scores ps on ps.version_id = v.id and ps.participant_id = p.id
  group by v.id, v.event_id, v.event_title, v.stage, v.material_title, v.type_title, v.version, cc.assigned_count, cc.completed_count
  order by v.event_title, v.stage, v.material_title, v.type_title;
end;
$$;
revoke all on function public.get_instructor_dashboard_results() from public;
grant execute on function public.get_instructor_dashboard_results() to authenticated;

-- Catatan dan skor yang berubah diterbitkan melalui Supabase Realtime untuk staf berwenang.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'observations') then
      alter publication supabase_realtime add table public.observations;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'observer_notes') then
      alter publication supabase_realtime add table public.observer_notes;
    end if;
  end if;
end;
$$;

comment on table public.rubric_indicator_aspects is 'Many-to-many hubungan indikator-aspek; bobot berlaku per aspek dan total pemetaan per aspek harus 100% saat aktivasi.';
comment on table public.observer_notes is 'Catatan privat per penulis, kategori, peserta, dan versi rubrik; skor numerik tetap satu nilai bersama pada observations.';
