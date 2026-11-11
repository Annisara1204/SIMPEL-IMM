-- Regression checks for Phase 3 material mapping and rubric anchors.
-- Run in Supabase SQL Editor after migrations 20261111120000 and 20261111130000.
-- The transaction is rolled back; no project data is changed by this check.
begin;

do $$
declare
  framework_version uuid;
  material_count integer;
  aspect_mapping_count integer;
  indicator_mapping_count integer;
  rubric_count integer;
  published_count integer;
  anchor_count integer;
  policy_count integer;
  duplicate_count integer;
begin
  select version.id into framework_version
  from public.competency_frameworks framework
  join public.competency_framework_versions version on version.framework_id = framework.id
  where framework.code = 'DAD_IMM' and version.version = 1;
  if framework_version is null then raise exception 'DAD_IMM v1 framework is missing.'; end if;

  select count(*) into material_count from public.competency_materials where framework_version_id = framework_version;
  select count(*) into aspect_mapping_count from public.competency_material_aspects where framework_version_id = framework_version;
  select count(*) into indicator_mapping_count from public.competency_material_indicators where framework_version_id = framework_version;
  if material_count <> 7 then raise exception 'Expected 7 materials, got %.', material_count; end if;
  if aspect_mapping_count <> 14 then raise exception 'Expected 14 material-aspect mappings, got %.', aspect_mapping_count; end if;
  if indicator_mapping_count <> 36 then raise exception 'Expected 36 material-indicator mappings, got %.', indicator_mapping_count; end if;

  select count(*) into rubric_count from public.competency_indicator_rubrics where framework_version_id = framework_version;
  select count(*) into published_count from public.competency_indicator_rubric_versions where framework_version_id = framework_version and status = 'published';
  select count(*) into anchor_count
    from public.rubric_behavioral_anchors anchor
    join public.competency_indicator_rubric_versions version on version.id = anchor.rubric_version_id
    where version.framework_version_id = framework_version and version.status = 'published';
  if rubric_count <> 27 then raise exception 'Expected 27 indicator rubrics, got %.', rubric_count; end if;
  if published_count <> 27 then raise exception 'Expected 27 published trial versions, got %.', published_count; end if;
  if anchor_count <> 135 then raise exception 'Expected 135 anchors, got %.', anchor_count; end if;

  if exists (
    select 1 from public.competency_indicator_rubric_versions version
    left join public.rubric_behavioral_anchors anchor on anchor.rubric_version_id = version.id
    where version.framework_version_id = framework_version and version.status = 'published'
    group by version.id having count(anchor.id) <> 5 or count(distinct anchor.score) <> 5
  ) then raise exception 'Every published indicator rubric must contain exactly five unique numeric anchors.'; end if;
  if exists (
    select 1 from public.rubric_behavioral_anchors anchor
    join public.competency_indicator_rubric_versions version on version.id = anchor.rubric_version_id
    where version.framework_version_id = framework_version
      and (anchor.score not between 1 and 5 or trim(anchor.description) = ''
        or anchor.label <> case anchor.score when 1 then 'Sangat Kurang' when 2 then 'Kurang' when 3 then 'Cukup' when 4 then 'Baik' when 5 then 'Sangat Baik' end)
  ) then raise exception 'Anchor labels, numeric range, or description are invalid.'; end if;
  select count(*) into duplicate_count from (
    select lower(trim(anchor.description)) from public.rubric_behavioral_anchors anchor
    join public.competency_indicator_rubric_versions version on version.id = anchor.rubric_version_id
    where version.framework_version_id = framework_version group by lower(trim(anchor.description)) having count(*) > 1
  ) repeated;
  if duplicate_count > 0 then raise exception 'Found % duplicate anchor descriptions; anchors should be indicator-specific.', duplicate_count; end if;
  if exists (
    select 1 from public.competency_indicator_rubrics rubric
    where rubric.framework_version_id = framework_version
      and not exists (select 1 from public.competency_indicators indicator where indicator.id = rubric.indicator_id and indicator.framework_version_id = framework_version)
  ) then raise exception 'A rubric does not reference an indicator in the same framework version.'; end if;

  -- Simulate repeat seeding via the declared unique keys and no-op conflict behavior.
  insert into public.competency_materials(framework_version_id, code, name, description, position)
    select framework_version_id, code, name, description, position from public.competency_materials where framework_version_id = framework_version
    on conflict (framework_version_id, code) do nothing;
  insert into public.competency_material_aspects(framework_version_id, material_id, aspect_id, position)
    select framework_version_id, material_id, aspect_id, position from public.competency_material_aspects where framework_version_id = framework_version
    on conflict (material_id, aspect_id) do nothing;
  insert into public.competency_material_indicators(framework_version_id, material_id, aspect_id, indicator_id, position)
    select framework_version_id, material_id, aspect_id, indicator_id, position from public.competency_material_indicators where framework_version_id = framework_version
    on conflict (material_id, indicator_id, aspect_id) do nothing;
  insert into public.competency_indicator_rubrics(framework_version_id, indicator_id, code, title)
    select framework_version_id, indicator_id, code, title from public.competency_indicator_rubrics where framework_version_id = framework_version
    on conflict (framework_version_id, indicator_id) do nothing;
  insert into public.competency_indicator_rubric_versions(framework_version_id, rubric_id, indicator_id, version, status, source_note)
    select framework_version_id, rubric_id, indicator_id, version, status, source_note from public.competency_indicator_rubric_versions where framework_version_id = framework_version
    on conflict (rubric_id, version) do nothing;
  insert into public.rubric_behavioral_anchors(rubric_version_id, score, label, description)
    select anchor.rubric_version_id, anchor.score, anchor.label, anchor.description
    from public.rubric_behavioral_anchors anchor
    join public.competency_indicator_rubric_versions version on version.id = anchor.rubric_version_id
    where version.framework_version_id = framework_version
    on conflict (rubric_version_id, score) do nothing;
  select count(*) into duplicate_count from public.competency_materials where framework_version_id = framework_version;
  if duplicate_count <> material_count then raise exception 'Material seed is not idempotent.'; end if;
  select count(*) into duplicate_count from public.competency_material_aspects where framework_version_id = framework_version;
  if duplicate_count <> aspect_mapping_count then raise exception 'Material-aspect seed is not idempotent.'; end if;
  select count(*) into duplicate_count from public.competency_material_indicators where framework_version_id = framework_version;
  if duplicate_count <> indicator_mapping_count then raise exception 'Material-indicator seed is not idempotent.'; end if;
  select count(*) into duplicate_count from public.competency_indicator_rubrics where framework_version_id = framework_version;
  if duplicate_count <> rubric_count then raise exception 'Rubric seed is not idempotent.'; end if;
  select count(*) into duplicate_count from public.competency_indicator_rubric_versions where framework_version_id = framework_version and status = 'published';
  if duplicate_count <> published_count then raise exception 'Rubric version seed is not idempotent.'; end if;
  select count(*) into duplicate_count from public.rubric_behavioral_anchors anchor
    join public.competency_indicator_rubric_versions version on version.id = anchor.rubric_version_id
    where version.framework_version_id = framework_version;
  if duplicate_count <> anchor_count then raise exception 'Anchor seed is not idempotent.'; end if;

  select count(*) into policy_count from pg_policies where schemaname = 'public'
    and policyname in (
      'competency_materials_read_assessment_staff',
      'competency_material_aspects_read_assessment_staff',
      'competency_material_indicators_read_assessment_staff',
      'competency_indicator_rubrics_read_assessment_staff',
      'competency_indicator_rubric_versions_read_assessment_staff',
      'rubric_behavioral_anchors_read_assessment_staff'
    );
  if policy_count <> 6 then raise exception 'Expected 6 assessment-staff RLS policies, got %.', policy_count; end if;

  raise notice 'PASS: material mapping, 27 rubrics, 135 unique anchors, N/O exclusion, seed idempotency, and RLS policies.';
end;
$$;

rollback;
