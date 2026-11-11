-- Regression checks for Phase 2 master framework.
-- Run in Supabase SQL Editor after migration 20261111110000.
-- The transaction is rolled back; no project data is changed by this check.
begin;

do $$
declare
  framework_version uuid;
  before_frameworks integer;
  before_versions integer;
  before_aspects integer;
  before_indicators integer;
  before_mappings integer;
  after_count integer;
  total_weight numeric;
  policy_count integer;
begin
  select version.id into framework_version
  from public.competency_frameworks framework
  join public.competency_framework_versions version on version.framework_id = framework.id
  where framework.code = 'DAD_IMM' and version.version = 1;
  if framework_version is null then raise exception 'Framework DAD_IMM v1 tidak ditemukan.'; end if;

  select count(*), coalesce(sum(weight), 0) into before_aspects, total_weight
  from public.competency_aspects where framework_version_id = framework_version;
  if before_aspects <> 6 then raise exception 'Expected 6 aspects, got %.', before_aspects; end if;
  if abs(total_weight - 100) >= 0.001 then raise exception 'Aspect weights total %, expected 100.', total_weight; end if;

  select count(*) into before_indicators from public.competency_indicators where framework_version_id = framework_version;
  if before_indicators <> 27 then raise exception 'Expected 27 indicators, got %.', before_indicators; end if;
  select count(*) into before_mappings from public.competency_indicator_aspects where framework_version_id = framework_version;
  if before_mappings <> 27 then raise exception 'Expected 27 indicator-aspect links, got %.', before_mappings; end if;

  if exists (
    select code from public.competency_aspects where framework_version_id = framework_version group by code having count(*) > 1
  ) or exists (
    select code from public.competency_indicators where framework_version_id = framework_version group by code having count(*) > 1
  ) then raise exception 'Aspect or indicator codes are duplicated.'; end if;
  if exists (
    select 1 from public.competency_indicators indicator
    where indicator.framework_version_id = framework_version
      and (trim(indicator.description) = '' or trim(indicator.measurement_objective) = ''
        or trim(indicator.observable_behaviors) = '' or trim(indicator.measurement_method) = ''
        or trim(indicator.evidence_guidance) = '')
  ) then raise exception 'Indicator content fields must be populated.'; end if;
  if exists (
    select 1 from public.competency_indicators indicator
    where indicator.framework_version_id = framework_version
      and not exists (select 1 from public.competency_indicator_aspects mapping where mapping.indicator_id = indicator.id)
  ) then raise exception 'An indicator has no aspect link.'; end if;

  -- Reinsert every seeded row using the same unique keys and conflict behavior.
  -- Counts must remain unchanged, proving the seed statements are repeatable.
  select count(*) into before_frameworks from public.competency_frameworks;
  select count(*) into before_versions from public.competency_framework_versions;
  insert into public.competency_frameworks(code, name, description)
    select code, name, description from public.competency_frameworks where code = 'DAD_IMM'
    on conflict (code) do nothing;
  insert into public.competency_framework_versions(framework_id, version, status, is_official, source_note)
    select framework_id, version, status, is_official, source_note from public.competency_framework_versions where id = framework_version
    on conflict (framework_id, version) do nothing;
  insert into public.competency_aspects(framework_version_id, code, name, description, purpose, weight, position)
    select framework_version_id, code, name, description, purpose, weight, position from public.competency_aspects where framework_version_id = framework_version
    on conflict (framework_version_id, code) do nothing;
  insert into public.competency_indicators(framework_version_id, code, name, description, measurement_objective, observable_behaviors, measurement_method, evidence_guidance, position)
    select framework_version_id, code, name, description, measurement_objective, observable_behaviors, measurement_method, evidence_guidance, position from public.competency_indicators where framework_version_id = framework_version
    on conflict (framework_version_id, code) do nothing;
  insert into public.competency_indicator_aspects(framework_version_id, indicator_id, aspect_id)
    select framework_version_id, indicator_id, aspect_id from public.competency_indicator_aspects where framework_version_id = framework_version
    on conflict (indicator_id, aspect_id) do nothing;
  select count(*) into after_count from public.competency_frameworks;
  if after_count <> before_frameworks then raise exception 'Framework seed is not idempotent.'; end if;
  select count(*) into after_count from public.competency_framework_versions;
  if after_count <> before_versions then raise exception 'Framework version seed is not idempotent.'; end if;
  select count(*) into after_count from public.competency_aspects where framework_version_id = framework_version;
  if after_count <> before_aspects then raise exception 'Aspect seed is not idempotent.'; end if;
  select count(*) into after_count from public.competency_indicators where framework_version_id = framework_version;
  if after_count <> before_indicators then raise exception 'Indicator seed is not idempotent.'; end if;
  select count(*) into after_count from public.competency_indicator_aspects where framework_version_id = framework_version;
  if after_count <> before_mappings then raise exception 'Indicator-aspect seed is not idempotent.'; end if;

  select count(*) into policy_count from pg_policies where schemaname = 'public'
    and policyname in (
      'competency_frameworks_read_assessment_staff',
      'competency_framework_versions_read_assessment_staff',
      'competency_aspects_read_assessment_staff',
      'competency_indicators_read_assessment_staff',
      'competency_indicator_aspects_read_assessment_staff'
    );
  if policy_count <> 5 then raise exception 'Expected 5 competency framework RLS read policies, got %.', policy_count; end if;

  raise notice 'PASS: 6 aspects, 27 indicators, 100%% weights, valid mappings, idempotent inserts, and RBAC policies.';
end;
$$;

rollback;
