-- Phase 5: shared workspace with independent observer-owned assessment records.
-- Existing observations remain untouched as historical shared-score data.
create table public.assessment_submissions (
  id uuid primary key default gen_random_uuid(),
  rubric_version_id uuid not null references public.rubric_versions(id) on delete restrict,
  participant_id uuid not null references public.participants(id) on delete cascade,
  observer_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft','submitted','finalized')),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  finalized_at timestamptz,
  finalized_by uuid references auth.users(id),
  unique (rubric_version_id, participant_id, observer_id),
  unique (id, rubric_version_id, participant_id, observer_id)
);

create table public.assessment_ratings (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null,
  rubric_version_id uuid not null,
  participant_id uuid not null,
  observer_id uuid not null,
  observer_name text not null default 'Akun pengguna',
  indicator_id uuid not null references public.rubric_indicators(id) on delete restrict,
  score smallint check (score between 1 and 5),
  response_status text not null default 'unrated' check (response_status in ('unrated','scored','not_observed')),
  evidence text not null default '' check (char_length(evidence) <= 3000),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_ratings_owner_fk foreign key (submission_id,rubric_version_id,participant_id,observer_id)
    references public.assessment_submissions(id,rubric_version_id,participant_id,observer_id) on delete cascade,
  constraint assessment_ratings_response_check check (
    (response_status = 'scored' and score between 1 and 5) or
    (response_status in ('unrated','not_observed') and score is null)
  ),
  unique (rubric_version_id, participant_id, indicator_id, observer_id)
);

create table public.assessment_submission_revisions (
  id bigint generated always as identity primary key,
  submission_id uuid not null references public.assessment_submissions(id) on delete cascade,
  revision integer not null,
  status_before text not null,
  status_after text not null,
  changed_by uuid not null references auth.users(id),
  changed_at timestamptz not null default now(),
  unique(submission_id,revision)
);
create table public.assessment_rating_revisions (
  id bigint generated always as identity primary key,
  rating_id uuid not null references public.assessment_ratings(id) on delete cascade,
  revision integer not null,
  score_before smallint,
  status_before text not null,
  evidence_before text not null,
  score_after smallint,
  status_after text not null,
  evidence_after text not null,
  changed_by uuid not null references auth.users(id),
  changed_at timestamptz not null default now(),
  unique(rating_id,revision)
);

create index assessment_submissions_version_status_idx on public.assessment_submissions(rubric_version_id,status,observer_id);
create index assessment_ratings_workspace_idx on public.assessment_ratings(rubric_version_id,participant_id,observer_id);
create index assessment_submission_revisions_actor_idx on public.assessment_submission_revisions(changed_by,changed_at desc);

alter table public.assessment_submissions enable row level security;
alter table public.assessment_ratings enable row level security;
alter table public.assessment_submission_revisions enable row level security;
alter table public.assessment_rating_revisions enable row level security;

create policy assessment_submissions_read_assigned on public.assessment_submissions for select to authenticated
using ((select public.can_access_observation(participant_id)));
create policy assessment_submissions_insert_self on public.assessment_submissions for insert to authenticated
with check (observer_id=(select auth.uid()) and status='draft' and finalized_by is null and exists (
  select 1 from public.participants p join public.rubric_versions v on v.event_id=p.event_id
  where p.id=assessment_submissions.participant_id and v.id=assessment_submissions.rubric_version_id and v.status='active'
) and (select public.can_access_observation(assessment_submissions.participant_id)));
create policy assessment_submissions_update_self on public.assessment_submissions for update to authenticated
using ((observer_id=(select auth.uid()) and status <> 'finalized' and (select public.can_access_observation(assessment_submissions.participant_id))) or ((select public.is_admin_system()) and status='submitted'))
with check ((observer_id=(select auth.uid()) and finalized_by is null and status in ('draft','submitted') and (select public.can_access_observation(assessment_submissions.participant_id))) or (status='finalized' and finalized_by=(select auth.uid()) and (select public.is_admin_system())));

create policy assessment_ratings_read_assigned on public.assessment_ratings for select to authenticated
using ((select public.can_access_observation(assessment_ratings.participant_id)));
create policy assessment_ratings_insert_owner on public.assessment_ratings for insert to authenticated
with check (observer_id=(select auth.uid()) and (select public.can_access_observation(participant_id)) and exists (
  select 1 from public.assessment_submissions s join public.rubric_versions v on v.id=s.rubric_version_id
  join public.rubric_indicator_aspects m on m.indicator_id=assessment_ratings.indicator_id
  join public.rubric_aspects a on a.id=m.aspect_id and a.rubric_version_id=v.id
  where s.id=assessment_ratings.submission_id and s.observer_id=(select auth.uid()) and s.status='draft'
    and v.id=assessment_ratings.rubric_version_id and v.status='active' and s.participant_id=assessment_ratings.participant_id
));
create policy assessment_ratings_update_owner on public.assessment_ratings for update to authenticated
using (observer_id=(select auth.uid()) and (select public.can_access_observation(assessment_ratings.participant_id)) and exists (
  select 1 from public.assessment_submissions s where s.id=assessment_ratings.submission_id and s.status='draft' and s.observer_id=(select auth.uid())
)) with check (observer_id=(select auth.uid()) and (select public.can_access_observation(assessment_ratings.participant_id)));
create policy assessment_submission_revisions_read_assigned on public.assessment_submission_revisions for select to authenticated
using (exists (select 1 from public.assessment_submissions s where s.id=submission_id and (select public.can_access_observation(s.participant_id))));
create policy assessment_rating_revisions_read_assigned on public.assessment_rating_revisions for select to authenticated
using (exists (select 1 from public.assessment_ratings r where r.id=assessment_rating_revisions.rating_id and (select public.can_access_observation(r.participant_id))));

grant select,insert,update on public.assessment_submissions to authenticated;
grant select,insert,update on public.assessment_ratings to authenticated;
grant select on public.assessment_submission_revisions to authenticated;
grant select on public.assessment_rating_revisions to authenticated;
revoke all on public.assessment_submissions,public.assessment_ratings,public.assessment_submission_revisions,public.assessment_rating_revisions from anon;
grant usage,select on sequence public.assessment_submission_revisions_id_seq to authenticated;
grant usage,select on sequence public.assessment_rating_revisions_id_seq to authenticated;

drop policy if exists observer_notes_insert_own_assigned on public.observer_notes;
create policy observer_notes_insert_own_assigned on public.observer_notes for insert to authenticated with check (
  author_id=(select auth.uid()) and (select public.can_access_observation(participant_id)) and exists (
    select 1 from public.assessment_submissions s where s.participant_id=observer_notes.participant_id
      and s.rubric_version_id=observer_notes.rubric_version_id and s.observer_id=(select auth.uid()) and s.status='draft'
  )
);
drop policy if exists observer_notes_update_own_assigned on public.observer_notes;
create policy observer_notes_update_own_assigned on public.observer_notes for update to authenticated
using (author_id=(select auth.uid()) and (select public.can_access_observation(participant_id)) and exists (
  select 1 from public.assessment_submissions s where s.participant_id=observer_notes.participant_id
    and s.rubric_version_id=observer_notes.rubric_version_id and s.observer_id=(select auth.uid()) and s.status='draft'
)) with check (author_id=(select auth.uid()) and (select public.can_access_observation(participant_id)));

create or replace function public.track_assessment_submission()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op='UPDATE' then
    if old.id<>new.id or old.rubric_version_id<>new.rubric_version_id or old.participant_id<>new.participant_id or old.observer_id<>new.observer_id then
      raise exception 'Kepemilikan atau cakupan asesmen tidak dapat diubah.';
    end if;
    if old.status='finalized' then raise exception 'Asesmen final tidak dapat diubah.'; end if;
    if new.status='finalized' and (select role from public.profiles where id=auth.uid()) <> 'admin_system' then
      raise exception 'Hanya Admin Sistem yang dapat memfinalisasi asesmen.' using errcode='42501';
    end if;
    if old.status is distinct from new.status then
      if not ((old.status='draft' and new.status='submitted') or (old.status='submitted' and new.status='draft') or (old.status='submitted' and new.status='finalized')) then
        raise exception 'Perubahan status asesmen tidak valid.';
      end if;
      new.revision:=old.revision+1;
      new.updated_at:=now();
      if new.status='submitted' then new.submitted_at:=now(); end if;
      if new.status='finalized' then new.finalized_at:=now(); new.finalized_by:=auth.uid(); end if;
      insert into public.assessment_submission_revisions(submission_id,revision,status_before,status_after,changed_by)
      values(old.id,new.revision,old.status,new.status,auth.uid());
    end if;
  end if;
  return new;
end $$;
create trigger assessment_submissions_track before update on public.assessment_submissions
for each row execute function public.track_assessment_submission();

create or replace function public.track_assessment_rating()
returns trigger language plpgsql security definer set search_path = '' as $$
declare display_name text;
begin
  if tg_op='INSERT' then
    select coalesce(nullif(trim(p.display_name),''),'Akun pengguna') into display_name from public.profiles p where p.id=new.observer_id;
    new.observer_name:=coalesce(display_name,'Akun pengguna');
  end if;
  if tg_op='UPDATE' then
    if old.id<>new.id or old.submission_id<>new.submission_id or old.rubric_version_id<>new.rubric_version_id
      or old.participant_id<>new.participant_id or old.observer_id<>new.observer_id or old.indicator_id<>new.indicator_id then
      raise exception 'Pemilik atau indikator penilaian tidak dapat diubah.';
    end if;
    select coalesce(nullif(trim(p.display_name),''),'Akun pengguna') into display_name from public.profiles p where p.id=new.observer_id;
    new.observer_name:=coalesce(display_name,'Akun pengguna');
    new.revision:=old.revision+1; new.updated_at:=now();
    insert into public.assessment_rating_revisions(rating_id,revision,score_before,status_before,evidence_before,score_after,status_after,evidence_after,changed_by)
    values(old.id,new.revision,old.score,old.response_status,old.evidence,new.score,new.response_status,new.evidence,auth.uid());
  end if;
  return new;
end $$;
create trigger assessment_ratings_track before insert or update on public.assessment_ratings
for each row execute function public.track_assessment_rating();

do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(
    select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='assessment_ratings'
  ) then alter publication supabase_realtime add table public.assessment_ratings; end if;
  if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(
    select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='assessment_submissions'
  ) then alter publication supabase_realtime add table public.assessment_submissions; end if;
end $$;

comment on table public.assessment_ratings is 'Phase 5 independent observer-owned scores and evidence. N/O is not numeric zero.';
comment on table public.assessment_submissions is 'Submission lifecycle per participant, rubric version, and assigned observer.';
