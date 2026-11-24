-- FASE 3b: Admin Sistem/koordinator dapat meninjau semua observasi; penilai
-- tetap dapat membaca baris yang ia tulis sendiri pada peserta yang terjangkau.
-- Helper can_access_observation dan policy tulis lain tidak diubah.

create or replace function public.can_review_observation(target_participant_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin_system() or exists (
    select 1 from public.participants p
    where p.id = target_participant_id and public.is_assessment_moderator(p.event_id)
  );
$$;
revoke all on function public.can_review_observation(uuid) from public;
grant execute on function public.can_review_observation(uuid) to authenticated;

drop policy if exists assessment_submissions_read_assigned on public.assessment_submissions;
create policy assessment_submissions_read_assigned on public.assessment_submissions for select to authenticated
using ((select public.can_review_observation(participant_id)) or
  (observer_id = (select auth.uid()) and (select public.can_access_observation(participant_id))));

drop policy if exists assessment_ratings_read_assigned on public.assessment_ratings;
create policy assessment_ratings_read_assigned on public.assessment_ratings for select to authenticated
using ((select public.can_review_observation(participant_id)) or
  (observer_id = (select auth.uid()) and (select public.can_access_observation(participant_id))));

drop policy if exists assessment_submission_revisions_read_assigned on public.assessment_submission_revisions;
create policy assessment_submission_revisions_read_assigned on public.assessment_submission_revisions for select to authenticated
using (exists (select 1 from public.assessment_submissions s
  where s.id = assessment_submission_revisions.submission_id and (
    (select public.can_review_observation(s.participant_id)) or
    (s.observer_id = (select auth.uid()) and (select public.can_access_observation(s.participant_id)))
  )));

drop policy if exists assessment_rating_revisions_read_assigned on public.assessment_rating_revisions;
create policy assessment_rating_revisions_read_assigned on public.assessment_rating_revisions for select to authenticated
using (exists (select 1 from public.assessment_ratings r
  where r.id = assessment_rating_revisions.rating_id and (
    (select public.can_review_observation(r.participant_id)) or
    (r.observer_id = (select auth.uid()) and (select public.can_access_observation(r.participant_id)))
  )));

drop policy if exists observer_notes_read_assigned on public.observer_notes;
create policy observer_notes_read_assigned on public.observer_notes for select to authenticated
using ((
  (select public.can_review_observation(participant_id)) or
  (author_id = (select auth.uid()) and (select public.can_access_observation(participant_id)))
) and exists (
  select 1 from public.participants pt
  join public.rubric_versions v on v.id = observer_notes.rubric_version_id
  where pt.id = observer_notes.participant_id and pt.event_id = v.event_id
));

drop policy if exists observer_note_revisions_read_assigned on public.observer_note_revisions;
create policy observer_note_revisions_read_assigned on public.observer_note_revisions for select to authenticated
using (exists (select 1 from public.observer_notes note
  where note.id = observer_note_revisions.note_id and (
    (select public.can_review_observation(note.participant_id)) or
    (note.author_id = (select auth.uid()) and (select public.can_access_observation(note.participant_id)))
  )));

drop policy if exists observations_read_assigned_observer on public.observations;
create policy observations_read_assigned_observer on public.observations for select to authenticated
using ((select public.can_review_observation(participant_id)) or
  (updated_by = (select auth.uid()) and (select public.can_access_observation(participant_id))));

drop policy if exists observation_history_read_assigned_observer on public.observation_revisions;
create policy observation_history_read_assigned_observer on public.observation_revisions for select to authenticated
using (exists (select 1 from public.observations o
  where o.id = observation_revisions.observation_id and (
    (select public.can_review_observation(o.participant_id)) or
    (o.updated_by = (select auth.uid()) and (select public.can_access_observation(o.participant_id)))
  )));

-- Daftar peserta tetap terlihat oleh keenam subrole Instruktur yang ditugaskan
-- supaya IoT/Vice IoT bisa mengisi Observasi. Nilai, catatan, dan rekap tetap
-- dibatasi oleh policy SELECT pada tabel penilaian di atas.
drop policy if exists participants_read_assigned_instructor on public.participants;
create policy participants_read_assigned_instructor on public.participants
for select to authenticated using ((select public.is_assigned_instructor_for_event(event_id)));

-- Tulis Observasi dipisah dari SELECT: INSERT/UPDATE memakai predikat lama.
drop policy if exists observations_write_assigned_observer on public.observations;
drop policy if exists observations_update_assigned_observer on public.observations;
create policy observations_write_assigned_observer on public.observations for insert to authenticated
with check ((select public.can_access_observation(participant_id)));
create policy observations_update_assigned_observer on public.observations for update to authenticated
using ((select public.can_access_observation(participant_id)))
with check ((select public.can_access_observation(participant_id)));
