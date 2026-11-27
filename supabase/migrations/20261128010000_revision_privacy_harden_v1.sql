-- Tutup jalur baca catatan deliberasi privat pada tabel revisi evaluasi.
-- Tabel induk collective_evaluations sudah membatasi Bidang Kader, tetapi policy
-- revisi masih menambah cabang bidang_kader dan membuka salinan to_jsonb(old).
-- Pencabutan grant anon di tabel revisi juga dibuat reproducible dari migrasi.

drop policy if exists collective_evaluation_revisions_read_authorized on public.collective_evaluation_revisions;
create policy collective_evaluation_revisions_read_authorized on public.collective_evaluation_revisions for select to authenticated
  using (exists(select 1 from public.collective_evaluations e
                where e.id=evaluation_id
                  and ((select public.is_admin_system()) or (select public.is_assessment_moderator(e.event_id)))));

revoke all on public.assessment_moderation_revisions from anon;
revoke all on public.collective_evaluation_revisions from anon;
