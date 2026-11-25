-- Ringkasan kegiatan untuk dashboard staf.
-- Sebelumnya halaman mengambil seluruh baris get_event_report_rows (termasuk
-- snapshot_data penuh) hanya untuk membaca skor dan keputusan. Fungsi ini
-- mengembalikan delapan angka saja, tanpa data peserta rinci atau bukti.
-- Perhitungan sengaja mengikuti perilaku lama: satu baris per snapshot,
-- provisional dihitung dari baris tanpa snapshot, dan angka yang bergantung
-- pada snapshot hanya dibaca Admin/koordinator (Kader tetap menerima nol/null
-- seperti sebelumnya).

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
declare
  v_can_read_private boolean := public.is_admin_system()
    or public.is_assessment_moderator(target_event_id);
begin
  if not (v_can_read_private
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'bidang_kader'
    )) then
    raise exception 'Akses ringkasan kegiatan ditolak.' using errcode = '42501';
  end if;

  return query
  with report_rows as (
    select s.id as snapshot_id,
           s.snapshot_data,
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
  ), scored as (
    select rr.snapshot_id,
           rr.published_at,
           case when v_can_read_private
             then rr.snapshot_data->'collective'->>'decision'
           end as decision,
           case
             when not v_can_read_private
               or rr.snapshot_data->'overall' is null
               or not (rr.snapshot_data->'overall' ? 'score')
               then null::numeric
             when nullif(btrim(rr.snapshot_data->'overall'->>'score'), '') is null
               then 0::numeric
             when nullif(btrim(rr.snapshot_data->'overall'->>'score'), '') ~ '^-?[0-9]+(\.[0-9]+)?$'
               then nullif(btrim(rr.snapshot_data->'overall'->>'score'), '')::numeric
             else null::numeric
           end as score_value
    from report_rows rr
  )
  select count(*)::integer,
         count(snapshot_id)::integer,
         count(published_at)::integer,
         (count(*) - count(snapshot_id))::integer,
         count(*) filter (where decision = 'pass')::integer,
         count(*) filter (where decision = 'not_pass')::integer,
         count(*) filter (where decision = 'further_discussion')::integer,
         avg(score_value) filter (where snapshot_id is not null)
  from scored;
end $$;

revoke all on function public.get_staff_event_summary(uuid) from public;
grant execute on function public.get_staff_event_summary(uuid) to authenticated;

comment on function public.get_staff_event_summary(uuid) is
  'Ringkasan dashboard staf: jumlah peserta, final/published/provisional, keputusan, dan rata-rata skor. Tanpa snapshot_data, bukti, catatan, atau identitas rinci.';
