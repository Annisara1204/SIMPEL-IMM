-- Kembalikan get_public_event_aggregate ke definisi sebelum daftar putih.
drop table if exists public.public_aggregate_settings;

create or replace function public.get_public_event_aggregate(target_event_id uuid)
returns table (
  event_id uuid,
  total_participants integer,
  groups jsonb
)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_event_id uuid := target_event_id;
begin
  return query
  with eligible as (
    -- Satu baris per publikasi yang memenuhi syarat. Tidak ada kolom identitas
    -- yang pernah dibaca oleh fungsi ini kecuali id internal untuk deduplikasi.
    select p.id as participant_id,
           p.commissariat_id,
           (nullif(s.snapshot_data->'overall'->>'score', ''))::numeric as score,
           pub.revision as publication_revision,
           pub.published_at
    from public.participants p
    join public.assessment_report_publications pub
      on pub.participant_id = p.id
     and pub.event_id = p.event_id
    join public.assessment_snapshots s
      on s.id = pub.snapshot_id
     and s.event_id = p.event_id
     and s.participant_id = p.id
    where p.event_id = v_event_id
      and coalesce(s.snapshot_data->'overall'->>'status', '') = 'ready_for_collective_evaluation'
  ), latest_publication as (
    -- Satu peserta dihitung sekali: publikasi revisi terakhir yang dipakai.
    select distinct on (e.participant_id)
           e.participant_id, e.commissariat_id, e.score
    from eligible e
    order by e.participant_id, e.publication_revision desc, e.published_at desc
  ), bucketed as (
    -- Tahap 1: hitung count(*) dan rata-rata per kelompok tanpa HAVING.
    select coalesce(nullif(trim(c.name), ''), 'Tanpa komisariat') as bucket_key,
           count(*)::integer as cnt,
           avg(l.score)::numeric as avg_score
    from latest_publication l
    left join public.commissariats c on c.id = l.commissariat_id
    group by 1
  ), totals as (
    select coalesce(sum(cnt), 0)::integer as total,
           coalesce(max(cnt), 0) >= 10 as has_qualifying_bucket
    from bucketed
  ), remaining as (
    select sum(cnt)::integer as cnt,
           case when sum(cnt) > 0
                then sum(cnt::numeric * avg_score) / sum(cnt)::numeric
                else null::numeric end as avg_score
    from bucketed
    where cnt < 10
  ), parts as (
    select jsonb_build_object(
             'key', b.bucket_key,
             'count', b.cnt,
             'average_score', round(b.avg_score, 2)
           ) as bucket,
           b.bucket_key as sort_key,
           false as is_other
    from bucketed b
    cross join totals t
    where t.has_qualifying_bucket and b.cnt >= 10
    union all
    select jsonb_build_object(
             'key', 'Lainnya',
             'count', r.cnt,
             'average_score', round(r.avg_score, 2)
           ) as bucket,
           'Lainnya' as sort_key,
           true as is_other
    from remaining r
    cross join totals t
    where t.has_qualifying_bucket and r.cnt >= 10
  )
  select v_event_id,
         t.total,
         case when t.total >= 10 and t.has_qualifying_bucket
              then (select coalesce(jsonb_agg(p.bucket order by p.sort_key, p.is_other), '[]'::jsonb)
                    from parts p)
              else null::jsonb
         end
  from totals t;
end $$;
revoke all on function public.get_public_event_aggregate(uuid) from public;
grant execute on function public.get_public_event_aggregate(uuid) to anon, authenticated;

comment on function public.get_public_event_aggregate(uuid) is
  'Fase 3e: satu-satunya grant anon baru. Hanya event_id, total_participants, dan groups {key,count,average_score}; tanpa identitas, bukti, catatan, atau snapshot_data.';
