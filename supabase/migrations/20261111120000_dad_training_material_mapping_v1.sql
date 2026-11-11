-- Phase 3: fixed trial mapping from DAD training materials to relevant aspects/indicators.
-- Mapping is master data; rubric_materials remain event-specific working copies.

create table if not exists public.competency_materials (
  id uuid primary key default gen_random_uuid(),
  framework_version_id uuid not null references public.competency_framework_versions(id) on delete restrict,
  code text not null check (code ~ '^[A-Z0-9_-]{2,40}$'),
  name text not null check (char_length(trim(name)) between 2 and 160),
  description text not null,
  position integer not null check (position > 0),
  unique (framework_version_id, code),
  unique (framework_version_id, name),
  unique (id, framework_version_id)
);

create table if not exists public.competency_material_aspects (
  id uuid primary key default gen_random_uuid(),
  framework_version_id uuid not null,
  material_id uuid not null,
  aspect_id uuid not null,
  position integer not null check (position > 0),
  foreign key (material_id, framework_version_id)
    references public.competency_materials(id, framework_version_id) on delete restrict,
  foreign key (aspect_id, framework_version_id)
    references public.competency_aspects(id, framework_version_id) on delete restrict,
  unique (material_id, aspect_id),
  unique (material_id, aspect_id, framework_version_id)
);

create unique index if not exists competency_indicator_aspects_framework_triplet_unique
  on public.competency_indicator_aspects(indicator_id, aspect_id, framework_version_id);

create table if not exists public.competency_material_indicators (
  id uuid primary key default gen_random_uuid(),
  framework_version_id uuid not null,
  material_id uuid not null,
  aspect_id uuid not null,
  indicator_id uuid not null,
  position integer not null check (position > 0),
  foreign key (material_id, aspect_id, framework_version_id)
    references public.competency_material_aspects(material_id, aspect_id, framework_version_id) on delete restrict,
  foreign key (indicator_id, aspect_id, framework_version_id)
    references public.competency_indicator_aspects(indicator_id, aspect_id, framework_version_id) on delete restrict,
  unique (material_id, indicator_id, aspect_id)
);

create index if not exists competency_materials_version_position_idx
  on public.competency_materials(framework_version_id, position);
create index if not exists competency_material_aspects_material_position_idx
  on public.competency_material_aspects(material_id, position);
create index if not exists competency_material_indicators_material_position_idx
  on public.competency_material_indicators(material_id, position);
create index if not exists competency_material_indicators_indicator_idx
  on public.competency_material_indicators(indicator_id);

alter table public.competency_materials enable row level security;
alter table public.competency_material_aspects enable row level security;
alter table public.competency_material_indicators enable row level security;

drop policy if exists competency_materials_read_assessment_staff on public.competency_materials;
create policy competency_materials_read_assessment_staff on public.competency_materials
for select to authenticated using (exists (
  select 1 from public.profiles profile where profile.id = (select auth.uid())
    and profile.role in ('admin_system', 'bidang_kader', 'observer', 'instruktur')
));
drop policy if exists competency_material_aspects_read_assessment_staff on public.competency_material_aspects;
create policy competency_material_aspects_read_assessment_staff on public.competency_material_aspects
for select to authenticated using (exists (
  select 1 from public.profiles profile where profile.id = (select auth.uid())
    and profile.role in ('admin_system', 'bidang_kader', 'observer', 'instruktur')
));
drop policy if exists competency_material_indicators_read_assessment_staff on public.competency_material_indicators;
create policy competency_material_indicators_read_assessment_staff on public.competency_material_indicators
for select to authenticated using (exists (
  select 1 from public.profiles profile where profile.id = (select auth.uid())
    and profile.role in ('admin_system', 'bidang_kader', 'observer', 'instruktur')
));
grant select on public.competency_materials, public.competency_material_aspects, public.competency_material_indicators to authenticated;
revoke insert, update, delete, truncate, references, trigger on public.competency_materials,
  public.competency_material_aspects, public.competency_material_indicators from anon, authenticated;

-- Seed materi bersifat idempotent dan hanya berlaku untuk DAD_IMM framework v1.
insert into public.competency_materials(framework_version_id, code, name, description, position)
select version.id, seed.code, seed.name, seed.description, seed.position
from public.competency_frameworks framework
join public.competency_framework_versions version on version.framework_id = framework.id and version.version = 1
cross join (values
  ('KEISLAMAN','Keislaman','Uji pemahaman materi keislaman dan kemampuan menghubungkannya secara proporsional dengan gagasan intelektual.',1),
  ('KEMUHAMMADIYAHAN','Kemuhammadiyahan','Uji pemahaman gerakan dan nilai Kemuhammadiyahan melalui penalaran dan contoh yang relevan.',2),
  ('KE-IMM-AN','Ke-IMM-an','Uji pemahaman ke-IMM-an dan refleksi tentang proses serta kontribusi perkaderan.',3),
  ('FILSAFAT-ILMU','Filsafat Ilmu','Uji pemahaman, penalaran, argumentasi, analisis konsep, dan alternatif solusi terkait filsafat ilmu.',4),
  ('ANALISIS-SOSIAL','Analisis Sosial','Uji analisis persoalan sosial dengan mempertimbangkan konteks, pihak terdampak, dan alternatif tindakan.',5),
  ('KEPEMIMPINAN','Kepemimpinan','Uji inisiatif, komunikasi, kontribusi, kolaborasi, dan tanggung jawab dalam konteks kepemimpinan.',6),
  ('KEORGANISASIAN','Keorganisasian','Uji kerja sama, penghargaan terhadap perbedaan, partisipasi, dan tanggung jawab dalam organisasi.',7)
) as seed(code,name,description,position)
where framework.code = 'DAD_IMM'
on conflict (framework_version_id, code) do nothing;

insert into public.competency_material_aspects(framework_version_id, material_id, aspect_id, position)
select version.id, material.id, aspect.id, seed.position
from public.competency_frameworks framework
join public.competency_framework_versions version on version.framework_id = framework.id and version.version = 1
join public.competency_materials material on material.framework_version_id = version.id
cross join (values
  ('KEISLAMAN','REL',1),('KEISLAMAN','INT',2),
  ('KEMUHAMMADIYAHAN','INT',1),('KEMUHAMMADIYAHAN','REL',2),
  ('KE-IMM-AN','INT',1),('KE-IMM-AN','KOM',2),
  ('FILSAFAT-ILMU','INT',1),
  ('ANALISIS-SOSIAL','HUM',1),('ANALISIS-SOSIAL','INT',2),
  ('KEPEMIMPINAN','PAR',1),('KEPEMIMPINAN','DIS',2),
  ('KEORGANISASIAN','HUM',1),('KEORGANISASIAN','PAR',2),('KEORGANISASIAN','DIS',3)
) as seed(material_code, aspect_code, position)
join public.competency_aspects aspect on aspect.framework_version_id = version.id and aspect.code = seed.aspect_code
where framework.code = 'DAD_IMM' and material.code = seed.material_code
on conflict (material_id, aspect_id) do nothing;

insert into public.competency_material_indicators(framework_version_id, material_id, aspect_id, indicator_id, position)
select version.id, material.id, aspect.id, indicator.id, seed.position
from public.competency_frameworks framework
join public.competency_framework_versions version on version.framework_id = framework.id and version.version = 1
join public.competency_materials material on material.framework_version_id = version.id
cross join (values
  ('KEISLAMAN','REL','REL-01',1),('KEISLAMAN','REL','REL-04',2),('KEISLAMAN','INT','INT-01',3),('KEISLAMAN','INT','INT-02',4),
  ('KEMUHAMMADIYAHAN','INT','INT-01',1),('KEMUHAMMADIYAHAN','INT','INT-02',2),('KEMUHAMMADIYAHAN','INT','INT-04',3),('KEMUHAMMADIYAHAN','REL','REL-01',4),('KEMUHAMMADIYAHAN','REL','REL-04',5),
  ('KE-IMM-AN','INT','INT-01',1),('KE-IMM-AN','INT','INT-03',2),('KE-IMM-AN','INT','INT-04',3),('KE-IMM-AN','KOM','KOM-02',4),('KE-IMM-AN','KOM','KOM-03',5),
  ('FILSAFAT-ILMU','INT','INT-01',1),('FILSAFAT-ILMU','INT','INT-02',2),('FILSAFAT-ILMU','INT','INT-03',3),('FILSAFAT-ILMU','INT','INT-04',4),('FILSAFAT-ILMU','INT','INT-05',5),
  ('ANALISIS-SOSIAL','HUM','HUM-03',1),('ANALISIS-SOSIAL','HUM','HUM-05',2),('ANALISIS-SOSIAL','INT','INT-02',3),('ANALISIS-SOSIAL','INT','INT-04',4),('ANALISIS-SOSIAL','INT','INT-05',5),
  ('KEPEMIMPINAN','PAR','PAR-02',1),('KEPEMIMPINAN','PAR','PAR-03',2),('KEPEMIMPINAN','PAR','PAR-04',3),('KEPEMIMPINAN','PAR','PAR-05',4),('KEPEMIMPINAN','DIS','DIS-02',5),
  ('KEORGANISASIAN','HUM','HUM-04',1),('KEORGANISASIAN','HUM','HUM-05',2),('KEORGANISASIAN','PAR','PAR-02',3),('KEORGANISASIAN','PAR','PAR-04',4),('KEORGANISASIAN','PAR','PAR-05',5),('KEORGANISASIAN','DIS','DIS-02',6),('KEORGANISASIAN','DIS','DIS-03',7)
) as seed(material_code, aspect_code, indicator_code, position)
join public.competency_aspects aspect on aspect.framework_version_id = version.id and aspect.code = seed.aspect_code
join public.competency_indicators indicator on indicator.framework_version_id = version.id and indicator.code = seed.indicator_code
where framework.code = 'DAD_IMM' and material.code = seed.material_code
on conflict (material_id, indicator_id, aspect_id) do nothing;

do $$
declare framework_version uuid; material_count integer; aspect_mapping_count integer; indicator_mapping_count integer;
begin
  select version.id into framework_version from public.competency_frameworks framework
  join public.competency_framework_versions version on version.framework_id = framework.id and version.version = 1
  where framework.code = 'DAD_IMM';
  select count(*) into material_count from public.competency_materials where framework_version_id = framework_version;
  select count(*) into aspect_mapping_count from public.competency_material_aspects where framework_version_id = framework_version;
  select count(*) into indicator_mapping_count from public.competency_material_indicators where framework_version_id = framework_version;
  if material_count <> 7 then raise exception 'DAD trial harus memiliki 7 materi; ditemukan %.', material_count; end if;
  if aspect_mapping_count <> 14 then raise exception 'DAD trial harus memiliki 14 pemetaan aspek-materi; ditemukan %.', aspect_mapping_count; end if;
  if indicator_mapping_count <> 36 then raise exception 'DAD trial harus memiliki 36 pemetaan indikator-materi; ditemukan %.', indicator_mapping_count; end if;
  if exists (
    select 1 from public.competency_materials material
    where material.framework_version_id = framework_version
      and not exists (select 1 from public.competency_material_aspects link where link.material_id = material.id)
  ) then raise exception 'Setiap materi DAD trial harus memetakan sedikitnya satu aspek.'; end if;
  if exists (
    select 1 from public.competency_material_indicators link
    where link.framework_version_id = framework_version
      and not exists (select 1 from public.competency_material_aspects aspect where aspect.material_id = link.material_id and aspect.aspect_id = link.aspect_id)
  ) then raise exception 'Pemetaan indikator-materi harus memakai aspek yang terpetakan pada materi tersebut.'; end if;
end;
$$;

comment on table public.competency_materials is 'Master materi training DAD untuk versi framework tertentu; berbeda dari materi aktual tiap kegiatan.';
comment on table public.competency_material_aspects is 'Aspek kompetensi relevan pada setiap materi master.';
comment on table public.competency_material_indicators is 'Indikator terpilih per materi dan aspek; bukan seluruh indikator bank untuk semua materi.';
