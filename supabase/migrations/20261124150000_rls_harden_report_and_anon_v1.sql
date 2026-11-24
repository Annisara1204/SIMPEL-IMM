-- Temuan uji RLS produksi 24 November 2026.
-- 1) Bidang Kader tidak boleh membaca snapshot_data mentah lewat REST maupun RPC.
-- 2) anon masih memiliki EXECUTE eksplisit pada banyak fungsi internal dari migrasi lama.
-- Hanya get_public_event_aggregate yang boleh dijangkau anon.

drop policy if exists assessment_snapshots_read_authorized on public.assessment_snapshots;
create policy assessment_snapshots_read_authorized on public.assessment_snapshots
for select to authenticated using (
  (select public.is_admin_system())
  or (select public.is_assessment_moderator(event_id))
);

create or replace function public.get_event_report_rows(target_event_id uuid)
returns table(
  participant_id uuid,
  display_name text,
  student_number text,
  group_name text,
  commissariat text,
  account_linked boolean,
  snapshot_id uuid,
  snapshot_data jsonb,
  rubric_version_ids jsonb,
  framework_version_ids jsonb,
  finalized_at timestamptz,
  published_at timestamptz,
  publication_revision integer
)
language plpgsql stable security definer set search_path = '' as
$$
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
           p.commissariat,
           p.account_user_id is not null,
           s.id,
           case when public.is_admin_system() or public.is_assessment_moderator(target_event_id)
                then s.snapshot_data else null::jsonb end,
           s.rubric_version_ids,
           s.framework_version_ids,
           s.finalized_at,
           pub.published_at,
           pub.revision
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

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname <> 'get_public_event_aggregate'
      and has_function_privilege('anon', p.oid, 'EXECUTE')
  loop
    execute format('revoke all on function %s from anon', f.signature);
  end loop;
end $$;
