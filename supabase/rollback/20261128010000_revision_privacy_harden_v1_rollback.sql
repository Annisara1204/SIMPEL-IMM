-- Kembalikan policy revisi ke definisi sebelum pengerasan 28 November 2026.
-- GRANT anon sengaja TIDAK dikembalikan: pengerasan itu tetap dipertahankan.

drop policy if exists collective_evaluation_revisions_read_authorized on public.collective_evaluation_revisions;
create policy collective_evaluation_revisions_read_authorized on public.collective_evaluation_revisions for select to authenticated
  using (exists(select 1 from public.collective_evaluations e
                where e.id=evaluation_id
                  and ((select public.is_assessment_moderator(e.event_id))
                       or exists(select 1 from public.profiles p
                                 where p.id=(select auth.uid()) and p.role in ('admin_system','bidang_kader')))));
