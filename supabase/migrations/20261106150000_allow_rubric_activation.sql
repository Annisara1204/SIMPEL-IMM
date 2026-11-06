-- Izinkan Super Admin mengubah draf menjadi aktif.
-- Sebelumnya kebijakan UPDATE hanya mengizinkan hasil draft/archived,
-- sehingga perubahan status ke active ditolak oleh RLS.
drop policy if exists "rubric_versions_update_draft_or_archive" on public.rubric_versions;
create policy "rubric_versions_update_draft_or_archive" on public.rubric_versions
for update to authenticated
using (
  (select public.can_manage_rubrics())
  and status in ('draft', 'active')
)
with check (
  (select public.can_manage_rubrics())
  and status in ('draft', 'active', 'archived')
);
