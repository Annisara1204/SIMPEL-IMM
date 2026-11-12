-- Phase 4: versioned trial mapping from DAD materials/activities to indicators,
-- methods, observation guidance, scope, and the exact published master rubric.
-- Replaces the earlier partial 7-material mapping for the unused DAD v1 template.

alter table public.competency_materials
  add column if not exists context_type text not null default 'material';
alter table public.competency_material_indicators
  add column if not exists assessment_method text,
  add column if not exists observation_guidance text,
  add column if not exists is_required boolean,
  add column if not exists assessment_scope text,
  add column if not exists active boolean,
  add column if not exists competency_indicator_rubric_version_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid='public.competency_materials'::regclass and conname='competency_materials_context_type_check') then
    alter table public.competency_materials add constraint competency_materials_context_type_check
      check (context_type in ('material','activity','cross_session'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.competency_material_indicators'::regclass and conname='competency_material_indicators_method_check') then
    alter table public.competency_material_indicators add constraint competency_material_indicators_method_check
      check (assessment_method in ('direct_observation','group_discussion','individual_assignment','group_assignment','simulation','reflection','pre_post_test','attendance_activity_record','follow_up_assessment'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.competency_material_indicators'::regclass and conname='competency_material_indicators_scope_check') then
    alter table public.competency_material_indicators add constraint competency_material_indicators_scope_check
      check (assessment_scope in ('session','cross_session'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.competency_material_indicators'::regclass and conname='competency_material_indicators_rubric_fk') then
    alter table public.competency_material_indicators add constraint competency_material_indicators_rubric_fk
      foreign key (competency_indicator_rubric_version_id, indicator_id)
      references public.competency_indicator_rubric_versions(id, indicator_id) on delete restrict;
  end if;
end;
$$;

create index if not exists competency_material_indicator_rubric_idx
  on public.competency_material_indicators(competency_indicator_rubric_version_id)
  where competency_indicator_rubric_version_id is not null;
create index if not exists competency_material_indicators_scope_active_idx
  on public.competency_material_indicators(framework_version_id, assessment_scope, active);

do $$
declare framework_version uuid;
begin
  select version.id into framework_version
  from public.competency_frameworks framework
  join public.competency_framework_versions version on version.framework_id=framework.id and version.version=1
  where framework.code='DAD_IMM';
  if framework_version is null then raise exception 'Framework DAD_IMM v1 tidak ditemukan; jalankan migration Phase 2 terlebih dahulu.'; end if;
  if exists (select 1 from public.rubric_versions where competency_framework_version_id=framework_version)
    or exists (select 1 from public.rubric_materials event_material
      join public.competency_materials master_material on master_material.id=event_material.competency_material_id
      where master_material.framework_version_id=framework_version) then
    raise exception 'Mapping DAD v1 sudah dipakai snapshot kegiatan. Mapping lama dipertahankan; buat versi framework baru untuk menggantinya.';
  end if;

  insert into public.competency_materials(framework_version_id,code,name,description,position,context_type)
  values
    (framework_version,'DISKUSI-KELOMPOK','Diskusi Kelompok','Konteks aktivitas diskusi untuk mengamati penalaran, kontribusi, komunikasi, dan penghargaan terhadap perbedaan.',8,'activity'),
    (framework_version,'SIMULASI-PROBLEM-SOLVING','Simulasi/Problem Solving','Konteks simulasi dan pemecahan masalah untuk mengamati penerapan gagasan, inisiatif, kontribusi, serta kolaborasi.',9,'activity'),
    (framework_version,'PENUGASAN-INDIVIDU','Penugasan Individu','Konteks tugas individual untuk mengamati pemahaman, tanggung jawab, dan refleksi pembelajaran.',10,'activity'),
    (framework_version,'REFLEKSI-AKHIR','Refleksi Akhir','Konteks refleksi sukarela untuk merangkum pembelajaran dan langkah pengembangan peserta.',11,'activity'),
    (framework_version,'RENCANA-TINDAK-LANJUT','Rencana Tindak Lanjut','Konteks penyusunan langkah belajar dan kontribusi setelah rangkaian DAD.',12,'activity'),
    (framework_version,'OBSERVASI-KEDISIPLINAN','Observasi Kedisiplinan','Konteks pencatatan waktu, kesepakatan teknis, dan konsistensi partisipasi selama kegiatan.',13,'activity'),
    (framework_version,'OBSERVASI-LINTAS-SESI','Observasi Lintas Sesi DAD','Kumpulan bukti lintas sesi untuk indikator yang memang direncanakan konsisten sepanjang rangkaian kegiatan.',14,'cross_session')
  on conflict (framework_version_id,code) do update set
    name=excluded.name, description=excluded.description, position=excluded.position, context_type=excluded.context_type;

  update public.competency_materials set context_type='material'
  where framework_version_id=framework_version and code in ('KEISLAMAN','KEMUHAMMADIYAHAN','KE-IMM-AN','FILSAFAT-ILMU','ANALISIS-SOSIAL','KEPEMIMPINAN','KEORGANISASIAN');

  -- These DAD v1 mappings are a trial configuration with no event assessment snapshots yet.
  delete from public.competency_material_indicators where framework_version_id=framework_version;
  delete from public.competency_material_aspects where framework_version_id=framework_version;

  insert into public.competency_material_aspects(framework_version_id,material_id,aspect_id,position)
  select framework_version, material.id, aspect.id, row_number() over (partition by material.id order by aspect.position)::integer
  from public.competency_materials material
  join (values
    ('KEISLAMAN','REL'),('KEISLAMAN','INT'),('KEMUHAMMADIYAHAN','INT'),('KEMUHAMMADIYAHAN','REL'),('KE-IMM-AN','INT'),('KE-IMM-AN','KOM'),
    ('FILSAFAT-ILMU','INT'),('ANALISIS-SOSIAL','INT'),('ANALISIS-SOSIAL','HUM'),('KEPEMIMPINAN','PAR'),('KEPEMIMPINAN','DIS'),
    ('KEORGANISASIAN','INT'),('KEORGANISASIAN','HUM'),('KEORGANISASIAN','PAR'),('KEORGANISASIAN','DIS'),
    ('DISKUSI-KELOMPOK','INT'),('DISKUSI-KELOMPOK','PAR'),('DISKUSI-KELOMPOK','HUM'),
    ('SIMULASI-PROBLEM-SOLVING','INT'),('SIMULASI-PROBLEM-SOLVING','PAR'),('PENUGASAN-INDIVIDU','INT'),('PENUGASAN-INDIVIDU','DIS'),('PENUGASAN-INDIVIDU','KOM'),
    ('REFLEKSI-AKHIR','REL'),('REFLEKSI-AKHIR','KOM'),('RENCANA-TINDAK-LANJUT','KOM'),('OBSERVASI-KEDISIPLINAN','DIS'),
    ('OBSERVASI-LINTAS-SESI','REL'),('OBSERVASI-LINTAS-SESI','DIS')
  ) as map(material_code,aspect_code) on map.material_code=material.code
  join public.competency_aspects aspect on aspect.framework_version_id=framework_version and aspect.code=map.aspect_code
  where material.framework_version_id=framework_version;

  insert into public.competency_material_indicators(
    framework_version_id,material_id,aspect_id,indicator_id,position,assessment_method,
    observation_guidance,is_required,assessment_scope,active,competency_indicator_rubric_version_id
  )
  select framework_version, material.id, aspect.id, indicator.id, seed.position, seed.assessment_method,
    'Konteks: '||material.name||'. Amati: '||indicator.observable_behaviors||' Bukti yang dapat digunakan: '||indicator.evidence_guidance||
    ' Gunakan N/O bila kesempatan atau bukti belum tersedia; N/O bukan skor 0.'||
    case indicator.code
      when 'INT-02' then ' Jangan menilai hanya dari banyaknya peserta berbicara.'
      when 'REL-02' then ' Refleksi bersifat sukarela; jangan menyimpulkan kadar iman atau menurunkan nilai karena peserta menjaga privasi.'
      when 'DIS-01' then ' Gunakan catatan waktu/kehadiran yang valid dan pertimbangkan kendala yang dikomunikasikan.'
      when 'DIS-03' then ' Nilai hanya kesepakatan teknis yang telah dijelaskan dan relevan untuk keselamatan/kelancaran.'
      when 'DIS-04' then ' Pertimbangkan rangkaian yang memang dapat diikuti serta alasan ketidakhadiran yang disampaikan.'
      else ''
    end,
    seed.is_required, seed.assessment_scope, true, rubric_version.id
  from public.competency_materials material
  join (values
    ('KEISLAMAN','REL-01','group_discussion',true,'session',1),('KEISLAMAN','REL-02','reflection',false,'session',2),('KEISLAMAN','REL-04','reflection',true,'session',3),('KEISLAMAN','INT-01','group_discussion',true,'session',4),
    ('KEMUHAMMADIYAHAN','INT-01','group_discussion',true,'session',1),('KEMUHAMMADIYAHAN','INT-02','group_discussion',true,'session',2),('KEMUHAMMADIYAHAN','REL-01','group_discussion',true,'session',3),('KEMUHAMMADIYAHAN','REL-04','reflection',true,'session',4),
    ('KE-IMM-AN','INT-01','group_discussion',true,'session',1),('KE-IMM-AN','INT-02','group_discussion',true,'session',2),('KE-IMM-AN','KOM-02','reflection',true,'session',3),
    ('FILSAFAT-ILMU','INT-01','group_discussion',true,'session',1),('FILSAFAT-ILMU','INT-02','group_discussion',true,'session',2),('FILSAFAT-ILMU','INT-03','group_discussion',true,'session',3),('FILSAFAT-ILMU','INT-04','group_discussion',true,'session',4),
    ('ANALISIS-SOSIAL','INT-02','group_discussion',true,'session',1),('ANALISIS-SOSIAL','INT-04','group_discussion',true,'session',2),('ANALISIS-SOSIAL','INT-05','group_discussion',true,'session',3),('ANALISIS-SOSIAL','HUM-03','group_discussion',true,'session',4),('ANALISIS-SOSIAL','HUM-05','group_discussion',true,'session',5),
    ('KEPEMIMPINAN','PAR-02','group_assignment',true,'session',1),('KEPEMIMPINAN','PAR-03','group_assignment',true,'session',2),('KEPEMIMPINAN','PAR-04','group_assignment',true,'session',3),('KEPEMIMPINAN','PAR-05','group_assignment',true,'session',4),('KEPEMIMPINAN','DIS-02','group_assignment',true,'session',5),
    ('KEORGANISASIAN','INT-04','group_discussion',true,'session',1),('KEORGANISASIAN','HUM-04','group_assignment',true,'session',2),('KEORGANISASIAN','PAR-04','group_assignment',true,'session',3),('KEORGANISASIAN','PAR-05','group_assignment',true,'session',4),('KEORGANISASIAN','DIS-02','attendance_activity_record',true,'session',5),
    ('DISKUSI-KELOMPOK','INT-02','group_discussion',true,'session',1),('DISKUSI-KELOMPOK','INT-03','group_discussion',true,'session',2),('DISKUSI-KELOMPOK','PAR-01','group_discussion',true,'session',3),('DISKUSI-KELOMPOK','PAR-03','group_discussion',true,'session',4),('DISKUSI-KELOMPOK','HUM-05','group_discussion',true,'session',5),
    ('SIMULASI-PROBLEM-SOLVING','INT-05','simulation',true,'session',1),('SIMULASI-PROBLEM-SOLVING','PAR-02','simulation',true,'session',2),('SIMULASI-PROBLEM-SOLVING','PAR-04','simulation',true,'session',3),('SIMULASI-PROBLEM-SOLVING','PAR-05','simulation',true,'session',4),
    ('PENUGASAN-INDIVIDU','INT-01','individual_assignment',true,'session',1),('PENUGASAN-INDIVIDU','DIS-02','individual_assignment',true,'session',2),('PENUGASAN-INDIVIDU','KOM-01','individual_assignment',true,'session',3),
    ('REFLEKSI-AKHIR','REL-02','reflection',false,'session',1),('REFLEKSI-AKHIR','KOM-01','reflection',true,'session',2),('REFLEKSI-AKHIR','KOM-02','reflection',true,'session',3),('REFLEKSI-AKHIR','KOM-04','reflection',true,'session',4),
    ('RENCANA-TINDAK-LANJUT','KOM-02','follow_up_assessment',true,'session',1),('RENCANA-TINDAK-LANJUT','KOM-03','follow_up_assessment',true,'session',2),('RENCANA-TINDAK-LANJUT','KOM-04','follow_up_assessment',true,'session',3),
    ('OBSERVASI-KEDISIPLINAN','DIS-01','attendance_activity_record',true,'session',1),('OBSERVASI-KEDISIPLINAN','DIS-03','direct_observation',true,'session',2),('OBSERVASI-KEDISIPLINAN','DIS-04','attendance_activity_record',true,'session',3),
    ('OBSERVASI-LINTAS-SESI','REL-03','direct_observation',false,'cross_session',1),('OBSERVASI-LINTAS-SESI','DIS-01','attendance_activity_record',false,'cross_session',2),('OBSERVASI-LINTAS-SESI','DIS-03','direct_observation',false,'cross_session',3),('OBSERVASI-LINTAS-SESI','DIS-04','attendance_activity_record',false,'cross_session',4)
  ) as seed(material_code,indicator_code,assessment_method,is_required,assessment_scope,position) on seed.material_code=material.code
  join public.competency_indicators indicator on indicator.framework_version_id=framework_version and indicator.code=seed.indicator_code
  join public.competency_indicator_aspects indicator_aspect on indicator_aspect.framework_version_id=framework_version and indicator_aspect.indicator_id=indicator.id
  join public.competency_aspects aspect on aspect.id=indicator_aspect.aspect_id and aspect.code=split_part(indicator.code,'-',1)
  join public.competency_indicator_rubrics master_rubric on master_rubric.framework_version_id=framework_version and master_rubric.indicator_id=indicator.id
  join public.competency_indicator_rubric_versions rubric_version on rubric_version.rubric_id=master_rubric.id and rubric_version.indicator_id=indicator.id and rubric_version.version=1 and rubric_version.status='published'
  where material.framework_version_id=framework_version;

  if exists (select 1 from public.competency_material_indicators where framework_version_id=framework_version and (assessment_method is null or observation_guidance is null or trim(observation_guidance)='' or assessment_scope is null or competency_indicator_rubric_version_id is null)) then
    raise exception 'Mapping Phase 4 harus memiliki metode, panduan, cakupan, dan versi rubrik yang valid.';
  end if;
end;
$$;

alter table public.competency_material_indicators alter column assessment_method set not null;
alter table public.competency_material_indicators alter column observation_guidance set not null;
alter table public.competency_material_indicators alter column is_required set not null;
alter table public.competency_material_indicators alter column assessment_scope set not null;
alter table public.competency_material_indicators alter column active set not null;
alter table public.competency_material_indicators alter column competency_indicator_rubric_version_id set not null;

comment on column public.competency_materials.context_type is 'Konteks master: materi, aktivitas, atau pengamatan lintas sesi.';
comment on column public.competency_material_indicators.assessment_method is 'Metode asesmen terkontrol untuk konteks-indikator.';
comment on column public.competency_material_indicators.observation_guidance is 'Panduan bukti, penggunaan N/O, dan batas penilaian khusus konteks.';
comment on column public.competency_material_indicators.assessment_scope is 'Session untuk konteks lokal; cross_session untuk rekap lintas rangkaian.';
comment on column public.competency_material_indicators.competency_indicator_rubric_version_id is 'Referensi tepat ke versi rubrik master published yang dipakai mapping.';

do $$
declare framework_version uuid; context_count integer; mapping_count integer; missing_contexts text;
begin
  select version.id into framework_version from public.competency_frameworks framework
    join public.competency_framework_versions version on version.framework_id=framework.id and version.version=1
    where framework.code='DAD_IMM';
  select count(*) into context_count from public.competency_materials where framework_version_id=framework_version;
  select count(*) into mapping_count from public.competency_material_indicators where framework_version_id=framework_version and active;
  if context_count <> 14 then raise exception 'Phase 4 mengharapkan 14 konteks (13 materi/aktivitas dan 1 lintas sesi); ditemukan %.',context_count; end if;
  if mapping_count <> 56 then raise exception 'Phase 4 mengharapkan 56 mapping indikator-konteks; ditemukan %.',mapping_count; end if;
  if exists (select 1 from public.competency_material_indicators where framework_version_id=framework_version group by material_id,indicator_id having count(*)>1) then
    raise exception 'Ditemukan mapping indikator-konteks duplikat yang tidak disengaja.';
  end if;
  select string_agg(indicator.code,', ' order by indicator.code) into missing_contexts
  from public.competency_indicators indicator where indicator.framework_version_id=framework_version
    and not exists (select 1 from public.competency_material_indicators mapping where mapping.indicator_id=indicator.id and mapping.active);
  if missing_contexts is distinct from 'HUM-01, HUM-02' then
    raise exception 'Indikator tanpa konteks harus persis HUM-01 dan HUM-02 sampai konteks tervalidasi; ditemukan: %.',coalesce(missing_contexts,'(tidak ada)');
  end if;
end;
$$;
