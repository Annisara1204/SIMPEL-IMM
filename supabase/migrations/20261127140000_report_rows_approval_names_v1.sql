-- Kirim nama penilai dan pengesah ke halaman laporan agar bisa tampil di PDF.
-- Hanya menambah kolom keluaran; hak akses RPC tidak berubah.
drop function if exists public.get_event_report_rows(uuid);
create or replace function public.get_event_report_rows(target_event_id uuid)
returns table(
  participant_id uuid,
  display_name text,
  student_number text,
  group_name text,
  major text,
  commissariat text,
  account_linked boolean,
  snapshot_id uuid,
  snapshot_data jsonb,
  rubric_version_ids jsonb,
  framework_version_ids jsonb,
  finalized_at timestamptz,
  published_at timestamptz,
  publication_revision integer,
  evaluator_names text,
  approver_name text,
  approved_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.is_admin_system()
    or exists(select 1 from public.profiles p
              where p.id = (select auth.uid()) and p.role = 'bidang_kader')
    or public.is_assessment_moderator(target_event_id)) then
    raise exception 'Akses laporan kegiatan ditolak.' using errcode = '42501';
  end if;

  return query
    select p.id,
           p.display_name,
           p.student_number,
           p.group_name,
           p.major,
           p.commissariat,
           p.account_user_id is not null,
           s.id,
           case when public.is_admin_system() or public.is_assessment_moderator(target_event_id)
                then s.snapshot_data else null::jsonb end,
           s.rubric_version_ids,
           s.framework_version_ids,
           s.finalized_at,
           pub.published_at,
           pub.revision,
           coalesce((
             select string_agg(distinct r.observer_name, ', ' order by r.observer_name)
             from public.assessment_ratings r
             where r.id = any(
               coalesce(
                 (select array_agg((item #>> '{}')::uuid)
                  from jsonb_array_elements(s.source_rating_ids) item),
                 '{}'::uuid[]
               )
             )
           ), 'Belum tercatat'),
           (select pr.display_name from public.profiles pr where pr.id = pub.published_by),
           pub.published_at
    from public.participants p
    left join lateral (
      select snap.*
      from public.assessment_snapshots snap
      where snap.event_id = p.event_id
        and snap.participant_id = p.id
      order by snap.finalized_at desc nulls last
    ) s on true
    left join public.assessment_report_publications pub
      on pub.snapshot_id = s.id
    where p.event_id = target_event_id
    order by p.display_name, s.finalized_at nulls last;
end $$;

revoke all on function public.get_event_report_rows(uuid) from public;
grant execute on function public.get_event_report_rows(uuid) to authenticated;

comment on function public.get_event_report_rows(uuid) is
  'Laporan kegiatan untuk Admin/Kader/moderator. Menambah evaluator_names (dari source_rating_ids), approver_name, dan approved_at untuk PDF.';
