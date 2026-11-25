-- Perbaikan makna angka ringkasan staf.
-- Sebelumnya "participants" menghitung baris get_event_report_rows (satu baris
-- per snapshot), sehingga peserta dengan beberapa snapshot dihitung ber kali.
-- Sekarang setiap peserta dihitung sekali memakai snapshot terbarunya.
-- Agregat keputusan dan rata-rata juga diberikan ke Bidang Kader karena hanya
-- berupa rekap tanpa identitas, bukti, atau catatan rinci.

create or replace function public.get_staff_event_summary(target_event_id uuid)
returns table (
  participants integer,
  finalized integer,
  published integer,
  provisional integer,
  passed integer,
  not_passed integer,
  further_discussion integer,
  average_score numeric
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.is_admin_system()
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'bidang_kader'
    )
    or public.is_assessment_moderator(target_event_id)) then
    raise exception 'Akses ringkasan kegiatan ditolak.' using errcode = '42501';
  end if;

  return query
  with participant_state as (
    select distinct on (p.id)
           p.id as participant_id,
           s.snapshot_data,
           s.id is not null as has_snapshot,
           exists (
             select 1 from public.assessment_report_publications pub
             where pub.participant_id = p.id and pub.event_id = p.event_id
           ) as has_publication
    from public.participants p
    left join lateral (
      select snap.*
      from public.assessment_snapshots snap
      where snap.event_id = p.event_id
        and snap.participant_id = p.id
      order by snap.finalized_at desc nulls last, snap.revision desc, snap.id
    ) s on true
    where p.event_id = target_event_id
    order by p.id, s.finalized_at desc nulls last, s.revision desc, s.id
  ), scored as (
    select ps.has_snapshot,
           ps.has_publication,
           case
             when ps.snapshot_data->'overall' is null
               or not (ps.snapshot_data->'overall' ? 'score')
               then null::numeric
             when nullif(btrim(ps.snapshot_data->'overall'->>'score'), '') is null
               then 0::numeric
             when nullif(btrim(ps.snapshot_data->'overall'->>'score'), '') ~ '^-?[0-9]+(\.[0-9]+)?$'
               then nullif(btrim(ps.snapshot_data->'overall'->>'score'), '')::numeric
             else null::numeric
           end as score_value,
           ps.snapshot_data->'collective'->>'decision' as decision
    from participant_state ps
  )
  select count(*)::integer,
         count(*) filter (where has_snapshot)::integer,
         count(*) filter (where has_publication)::integer,
         count(*) filter (where not has_snapshot)::integer,
         count(*) filter (where decision = 'pass')::integer,
         count(*) filter (where decision = 'not_pass')::integer,
         count(*) filter (where decision = 'further_discussion')::integer,
         avg(score_value) filter (where has_snapshot)
  from scored;
end $$;

revoke all on function public.get_staff_event_summary(uuid) from public;
grant execute on function public.get_staff_event_summary(uuid) to authenticated;

comment on function public.get_staff_event_summary(uuid) is
  'Ringkasan dashboard staf per peserta unik: jumlah peserta, final/published/provisional, distribusi keputusan dari snapshot terbaru, dan rata-rata skor. Tanpa snapshot_data, bukti, catatan, atau identitas rinci.';
