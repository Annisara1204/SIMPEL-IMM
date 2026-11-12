-- Regression checks for Phase 2–6. Run after migrations 1100–1700 in Supabase SQL Editor.
do $$
declare
  framework_version uuid;
  aspect_count integer;
  indicator_count integer;
  aspect_weight numeric;
  rubric_count integer;
  anchor_count integer;
  context_count integer;
  mapping_count integer;
  rls_missing text;
begin
  select version.id into framework_version
  from public.competency_frameworks framework
  join public.competency_framework_versions version on version.framework_id=framework.id and version.version=1
  where framework.code='DAD_IMM';
  if framework_version is null then raise exception 'Framework DAD trial v1 tidak ditemukan.'; end if;

  select count(*),coalesce(sum(weight),0) into aspect_count,aspect_weight from public.competency_aspects where framework_version_id=framework_version;
  select count(*) into indicator_count from public.competency_indicators where framework_version_id=framework_version;
  if aspect_count<>6 or abs(aspect_weight-100)>=0.001 then raise exception 'Phase 2 gagal: aspek %, bobot %.',aspect_count,aspect_weight; end if;
  if indicator_count<>27 then raise exception 'Phase 2 gagal: indikator %, seharusnya 27.',indicator_count; end if;
  if exists(select 1 from public.competency_aspects where framework_version_id=framework_version group by code having count(*)>1)
    or exists(select 1 from public.competency_indicators where framework_version_id=framework_version group by code having count(*)>1)
    then raise exception 'Kode aspek/indikator framework tidak unik.'; end if;
  if exists(select 1 from public.competency_indicators indicator where indicator.framework_version_id=framework_version and not exists(select 1 from public.competency_indicator_aspects link where link.indicator_id=indicator.id and link.framework_version_id=framework_version))
    then raise exception 'Ada indikator yang tidak terhubung ke aspek.'; end if;

  select count(*) into rubric_count from public.competency_indicator_rubric_versions where framework_version_id=framework_version and status='published';
  select count(*) into anchor_count from public.rubric_behavioral_anchors anchor join public.competency_indicator_rubric_versions rubric on rubric.id=anchor.rubric_version_id where rubric.framework_version_id=framework_version and rubric.status='published';
  if rubric_count<>27 or anchor_count<>135 then raise exception 'Phase 3 gagal: versi rubrik %, anchor %.',rubric_count,anchor_count; end if;
  if exists(select 1 from public.rubric_behavioral_anchors anchor join public.competency_indicator_rubric_versions rubric on rubric.id=anchor.rubric_version_id where rubric.framework_version_id=framework_version and rubric.status='published' group by anchor.rubric_version_id having count(*)<>5) then raise exception 'Setiap rubrik published harus memiliki tepat lima anchor.'; end if;

  select count(*) into context_count from public.competency_materials where framework_version_id=framework_version;
  select count(*) into mapping_count from public.competency_material_indicators where framework_version_id=framework_version and active;
  if context_count<>14 or mapping_count<>56 then raise exception 'Phase 4 gagal: konteks %, mapping %.',context_count,mapping_count; end if;
  if exists(select 1 from public.competency_material_indicators where framework_version_id=framework_version and active and competency_indicator_rubric_version_id is null) then raise exception 'Mapping Phase 4 belum menyimpan versi rubrik sumber.'; end if;

  if not exists(select 1 from public.assessment_scoring_policies where id and review_score_delta=2 and minimum_coverage=80) then raise exception 'Konfigurasi Phase 6 awal harus delta 2 dan coverage 80%%.'; end if;
  if not exists(select 1 from pg_proc where proname='get_event_assessment_summary') or not exists(select 1 from pg_proc where proname='finalize_collective_evaluation') then raise exception 'Fungsi agregasi/finalisasi Phase 6 belum tersedia.'; end if;
  select string_agg(tbl,', ') into rls_missing from (values
    ('assessment_moderations'),('assessment_moderation_revisions'),('collective_evaluations'),
    ('collective_evaluation_revisions'),('development_recommendations'),('assessment_snapshots'),
    ('assessment_snapshot_private_sources'),('assessment_scoring_policies'),('assessment_ratings'),('assessment_submissions')
  ) required(tbl) left join pg_class c on c.relname=required.tbl and c.relnamespace='public'::regnamespace
  where c.oid is null or not c.relrowsecurity;
  if rls_missing is not null then raise exception 'RLS belum aktif pada tabel: %.',rls_missing; end if;
  if not exists(select 1 from pg_trigger where tgrelid='public.assessment_snapshots'::regclass and tgname='assessment_snapshots_immutable' and not tgisinternal) then raise exception 'Trigger snapshot immutable belum aktif.'; end if;
  raise notice 'Phase 2–6 regression checks passed: 6 aspek, 27 indikator, 100%% bobot, 135 anchor, 14 konteks, 56 mapping, RLS Phase 5/6.';
end $$;
