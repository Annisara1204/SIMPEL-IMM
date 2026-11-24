-- Fase 3g: penanda kerangka dan rubrik trial versus rubrik resmi
-- Koordinator Instruktur (keputusan produk 11).
--
-- Hanya menambahkan kolom penanda. Tidak ada UPDATE pada kolom lama,
-- snapshot, constraint versi, maupun trigger aktivasi rubrik yang diubah.
-- Baris lama tidak dihapus dan tidak ditulis ulang nilainya.

alter table public.competency_frameworks
  add column if not exists is_trial boolean not null default false;

alter table public.rubric_versions
  add column if not exists is_trial boolean not null default false;

-- Nilai awal diambil dari data yang sudah ada. Ini hanya penandaan,
-- bukan perubahan snapshot atau alur aktivasi.
-- Kerangka trial = punya versi tetapi belum ada versi yang resmi.
update public.competency_frameworks
set is_trial = true
where exists (
  select 1
  from public.competency_framework_versions version
  where version.framework_id = public.competency_frameworks.id
)
  and not exists (
    select 1
    from public.competency_framework_versions version
    where version.framework_id = public.competency_frameworks.id
      and version.is_official = true
  );

-- Rubrik trial = bersumber dari versi framework trial/belum resmi.
update public.rubric_versions
set is_trial = true
where exists (
  select 1
  from public.competency_framework_versions version
  where version.id = public.rubric_versions.competency_framework_version_id
    and (version.status = 'trial' or version.is_official = false)
);

-- Indeks parsial untuk memilih baris trial tanpa menyentuh baris resmi.
create index if not exists competency_frameworks_is_trial_idx
  on public.competency_frameworks (is_trial)
  where is_trial;
create index if not exists rubric_versions_is_trial_idx
  on public.rubric_versions (is_trial)
  where is_trial;

comment on column public.competency_frameworks.is_trial is
  'Penanda kerangka trial/bukan standar resmi Koordinator Instruktur; snapshot lama tidak diubah.';
comment on column public.rubric_versions.is_trial is
  'Penanda rubrik trial/bukan rubrik resmi Koordinator Instruktur; snapshot lama tidak diubah.';
