-- Pengawas kontrak finalisasi 28 November 2026:
-- finalize mengembalikan UUID snapshot; publish tidak diberi syarat rekomendasi
-- baru agar snapshot lama yang tidak punya rekomendasi tetap bisa diterbitkan.
\set ON_ERROR_STOP on
begin;

do $$
declare
  finalize_src text;
  publish_src text;
begin
  select pg_get_functiondef('public.finalize_collective_evaluation(uuid,text,text,jsonb,jsonb,jsonb,jsonb,jsonb)'::regprocedure)
  into finalize_src;
  if finalize_src not like '%return created_snapshot%' then
    raise exception 'finalize_collective_evaluation tidak mengembalikan ID snapshot.';
  end if;

  select pg_get_functiondef('public.publish_assessment_report(uuid)'::regprocedure)
  into publish_src;
  if publish_src like '%development_recommendations%' then
    raise exception 'publish_assessment_report diberi syarat rekomendasi; snapshot lama akan tertolak.';
  end if;
end $$;

select 'Finalize approval order contract passed.' as result;
rollback;
