-- Structural checks for one active recommendation per evaluation.
-- Run after migration 20261123130000.
do $$
declare duplicate_count integer;
begin
  if not exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='development_recommendations'
      and column_name='is_active'
  ) then raise exception 'Kolom is_active belum dibuat.'; end if;

  if not exists(
    select 1 from pg_indexes
    where schemaname='public' and tablename='development_recommendations'
      and indexname='development_recommendations_one_active_per_evaluation'
  ) then raise exception 'Indeks unik rekomendasi aktif belum dibuat.'; end if;

  select count(*) into duplicate_count from (
    select evaluation_id from public.development_recommendations
    where is_active group by evaluation_id having count(*) > 1
  ) duplicates;
  if duplicate_count > 0 then raise exception 'Masih ada evaluasi dengan lebih dari satu rekomendasi aktif.'; end if;

  raise notice 'Single active recommendation structural checks passed.';
end $$;
