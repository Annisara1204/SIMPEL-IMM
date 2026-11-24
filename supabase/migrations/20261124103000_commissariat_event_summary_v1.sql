-- Fase 3c — Rekap Komisariat tanpa identitas.
-- Kelompok = komisariat dalam satu kegiatan. Sumber agregat hanya peserta
-- dengan publikasi rapor dan snapshot ready_for_collective_evaluation.
create or replace function public.get_commissariat_event_summary(target_event_id uuid)
returns table (
  total_participants integer,
  average_score numeric,
  distribution jsonb
)
language plpgsql stable security definer set search_path = '' as $$
declare
  target_commissariat_id uuid;
begin
  -- Admin Sistem dan moderator kegiatan boleh melihat semua komisariat.
  -- Peran lain, termasuk komisariat, wajib lolos filter dari profilnya sendiri.
  if public.is_admin_system() or public.is_assessment_moderator(target_event_id) then
    target_commissariat_id := null;
  else
    target_commissariat_id := public.current_commissariat_id();
    if target_commissariat_id is null then
      raise exception 'Akses rekap komisariat ditolak: akun belum ditautkan ke komisariat.'
        using errcode = '42501';
    end if;
  end if;

  return query
  with eligible as (
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
    where p.event_id = target_event_id
      and (target_commissariat_id is null or p.commissariat_id = target_commissariat_id)
      and coalesce(s.snapshot_data->'overall'->>'status', '') = 'ready_for_collective_evaluation'
  ), latest_publication as (
    -- Satu peserta dihitung sekali, memakai publikasi revisi terbaru.
    select distinct on (e.participant_id)
           e.participant_id, e.commissariat_id, e.score
    from eligible e
    order by e.participant_id, e.publication_revision desc, e.published_at desc
  ), bucketed as (
    -- Tahap 1: hitung count(*) dan rata-rata per komisariat, tanpa HAVING.
    select c.name as bucket_key,
           count(*)::integer as cnt,
           avg(l.score)::numeric as avg_score
    from latest_publication l
    join public.commissariats c on c.id = l.commissariat_id
    group by c.name
  ), totals as (
    select coalesce(sum(cnt), 0)::integer as total,
           case when coalesce(sum(cnt), 0) = 0 then null::numeric
                else sum(cnt::numeric * avg_score) / sum(cnt)::numeric end as overall_avg,
           coalesce(max(cnt), 0) >= 10 as has_qualifying_bucket
    from bucketed
  ), remaining as (
    -- Tahap 2: bucket di bawah ambang digabung menjadi satu bucket "Lainnya".
    select sum(cnt)::integer as cnt,
           sum(cnt::numeric * avg_score) / sum(cnt)::numeric as avg_score
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
  select t.total,
         t.overall_avg,
         case when t.has_qualifying_bucket then
                (select coalesce(jsonb_agg(p.bucket order by p.sort_key, p.is_other), '[]'::jsonb)
                 from parts p)
              else null::jsonb end
  from totals t;
end $$;
revoke all on function public.get_commissariat_event_summary(uuid) from public;
grant execute on function public.get_commissariat_event_summary(uuid) to authenticated;

-- Gate 3c: setiap peserta harus memiliki commissariat_id yang cocok dengan
-- nama komisariat. Baris yang tidak cocok tidak diubah; Admin memilih dulu.
do $$
declare
  mismatch_count integer;
  sample text;
begin
  select count(*) into mismatch_count
  from public.participants p
  left join public.commissariats c on c.id = p.commissariat_id
  where c.id is null
     or lower(trim(coalesce(c.name, ''))) <> lower(trim(coalesce(p.commissariat, '')));

  if mismatch_count > 0 then
    select string_agg(distinct coalesce(nullif(trim(p.commissariat), ''), '(kosong)'), ', ')
      into sample
    from public.participants p
    left join public.commissariats c on c.id = p.commissariat_id
    where c.id is null
       or lower(trim(coalesce(c.name, ''))) <> lower(trim(coalesce(p.commissariat, '')));

    raise exception 'Gate 3c gagal: % peserta memiliki commissariat_id yang tidak cocok dengan nama komisariat. Nilai commissariat bermasalah: %. Admin harus memilih padanan sebelum rekap dipakai.', mismatch_count, coalesce(sample, '-');
  end if;
end $$;
