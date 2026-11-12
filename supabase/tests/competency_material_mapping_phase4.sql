-- Phase 4 regression checks. Read-only except for duplicate insert simulations,
-- which are rolled back at the end. Run after migration 20261111150000.
begin;

do $$
declare
  framework_version uuid;
  context_count integer;
  mapping_count integer;
  aspect_link_count integer;
  missing_codes text;
  rubric_count integer;
  policy_count integer;
  policy_expression text;
  count_before integer;
begin
  select version.id into framework_version
  from public.competency_frameworks framework
  join public.competency_framework_versions version on version.framework_id=framework.id and version.version=1
  where framework.code='DAD_IMM';
  if framework_version is null then raise exception 'Framework DAD_IMM v1 tidak ditemukan.'; end if;

  select count(*) into context_count from public.competency_materials where framework_version_id=framework_version;
  select count(*) into mapping_count from public.competency_material_indicators where framework_version_id=framework_version and active;
  select count(*) into aspect_link_count from public.competency_material_aspects where framework_version_id=framework_version;
  if context_count<>14 then raise exception 'Diharapkan 14 konteks (13 materi/aktivitas dan 1 lintas sesi), ditemukan %.',context_count; end if;
  if mapping_count<>56 then raise exception 'Diharapkan 56 mapping indikator-konteks, ditemukan %.',mapping_count; end if;
  if aspect_link_count<>29 then raise exception 'Diharapkan 29 relasi konteks-aspek, ditemukan %.',aspect_link_count; end if;

  if exists (
    select 1 from public.competency_material_indicators mapping
    where mapping.framework_version_id=framework_version and mapping.active
      and (mapping.assessment_method not in ('direct_observation','group_discussion','individual_assignment','group_assignment','simulation','reflection','pre_post_test','attendance_activity_record','follow_up_assessment')
        or trim(mapping.observation_guidance)='' or mapping.assessment_scope not in ('session','cross_session')
        or mapping.competency_indicator_rubric_version_id is null)
  ) then raise exception 'Ditemukan mapping tanpa metode, panduan, cakupan, atau rubrik.'; end if;

  if exists (
    select 1 from public.competency_material_indicators mapping
    join public.competency_indicators indicator on indicator.id=mapping.indicator_id
    join public.competency_indicator_rubric_versions rubric on rubric.id=mapping.competency_indicator_rubric_version_id
    where mapping.framework_version_id=framework_version
      and (indicator.framework_version_id<>framework_version or rubric.indicator_id<>indicator.id or rubric.status<>'published')
  ) then raise exception 'Mapping merujuk indikator/rubrik yang salah atau belum published.'; end if;

  if exists (
    select 1 from public.competency_material_indicators mapping
    join public.competency_materials context on context.id=mapping.material_id
    where mapping.framework_version_id=framework_version
    group by mapping.material_id,mapping.indicator_id having count(*)>1
  ) then raise exception 'Terdapat mapping indikator-konteks duplikat.'; end if;

  if exists (
    select 1 from (values
      ('KEISLAMAN',4),('KEMUHAMMADIYAHAN',4),('KE-IMM-AN',3),('FILSAFAT-ILMU',4),
      ('ANALISIS-SOSIAL',5),('KEPEMIMPINAN',5),('KEORGANISASIAN',5),('DISKUSI-KELOMPOK',5),
      ('SIMULASI-PROBLEM-SOLVING',4),('PENUGASAN-INDIVIDU',3),('REFLEKSI-AKHIR',4),
      ('RENCANA-TINDAK-LANJUT',3),('OBSERVASI-KEDISIPLINAN',3),('OBSERVASI-LINTAS-SESI',4)
    ) expected(context_code,expected_count)
    join public.competency_materials context on context.code=expected.context_code and context.framework_version_id=framework_version
    left join public.competency_material_indicators mapping on mapping.material_id=context.id and mapping.active
    group by context.code,expected.expected_count having count(mapping.indicator_id)<>expected.expected_count
  ) then raise exception 'Daftar indikator per materi/aktivitas tidak sesuai mapping Phase 4.'; end if;

  select string_agg(indicator.code,', ' order by indicator.code) into missing_codes
  from public.competency_indicators indicator where indicator.framework_version_id=framework_version
    and not exists (select 1 from public.competency_material_indicators mapping where mapping.indicator_id=indicator.id and mapping.active);
  if missing_codes is distinct from 'HUM-01, HUM-02' then
    raise exception 'Indikator tanpa konteks seharusnya HUM-01 dan HUM-02 untuk ditinjau, ditemukan: %.',coalesce(missing_codes,'(tidak ada)');
  end if;

  if (select count(*) from public.competency_material_indicators mapping
      join public.competency_materials context on context.id=mapping.material_id
      join public.competency_indicators indicator on indicator.id=mapping.indicator_id
      where context.context_type='cross_session' and mapping.assessment_scope='cross_session'
        and indicator.code in ('REL-03','DIS-01','DIS-03','DIS-04'))<>4 then
    raise exception 'REL-03, DIS-01, DIS-03, dan DIS-04 harus memiliki mapping lintas sesi.';
  end if;

  if not (select relrowsecurity from pg_class where oid='public.competency_material_indicators'::regclass) then
    raise exception 'RLS atau kebijakan baca staff untuk mapping tidak aktif.';
  end if;
  select qual into policy_expression from pg_policies where schemaname='public' and tablename='competency_material_indicators' and policyname='competency_material_indicators_read_assessment_staff' and cmd='SELECT';
  if policy_expression is null or policy_expression not ilike '%admin_system%' or policy_expression not ilike '%bidang_kader%' or policy_expression not ilike '%observer%' or policy_expression not ilike '%instruktur%' then
    raise exception 'Kebijakan SELECT harus membatasi data ke role assessment staff yang disetujui.';
  end if;
  select count(*) into policy_count from pg_policies where schemaname='public' and tablename='competency_material_indicators';
  if policy_count<>1 then raise exception 'Kebijakan mapping seharusnya hanya read-only; ditemukan %.',policy_count; end if;
  if not has_table_privilege('authenticated','public.competency_material_indicators','SELECT')
    or has_table_privilege('authenticated','public.competency_material_indicators','INSERT')
    or has_table_privilege('authenticated','public.competency_material_indicators','UPDATE')
    or has_table_privilege('authenticated','public.competency_material_indicators','DELETE') then
    raise exception 'Grant mapping harus read-only untuk authenticated.';
  end if;

  -- Seed idempotency simulation: retrying the same rows must not increase counts.
  select count(*) into count_before from public.competency_material_indicators where framework_version_id=framework_version;
  insert into public.competency_material_indicators(framework_version_id,material_id,aspect_id,indicator_id,position,assessment_method,observation_guidance,is_required,assessment_scope,active,competency_indicator_rubric_version_id)
    select framework_version_id,material_id,aspect_id,indicator_id,position,assessment_method,observation_guidance,is_required,assessment_scope,active,competency_indicator_rubric_version_id
    from public.competency_material_indicators where framework_version_id=framework_version
    on conflict (material_id,indicator_id,aspect_id) do nothing;
  if (select count(*) from public.competency_material_indicators where framework_version_id=framework_version)<>count_before then
    raise exception 'Seed mapping tidak idempotent.';
  end if;

  select count(*) into rubric_count from public.competency_indicator_rubrics where framework_version_id=framework_version;
  raise notice 'PASS Phase 4: % konteks, % relasi konteks-aspek, % mapping, % rubrik published. HUM-01/HUM-02 belum memiliki konteks.',context_count,aspect_link_count,mapping_count,rubric_count;
end;
$$;

rollback;
