-- Tahap 13 Nov 2026: evaluasi kolektif dilakukan PER JENIS PENILAIAN
-- (satu rubrik versi aktif per kegiatan = satu jenis penilaian:
--  Screening/Inteview, Pelatihan per materi, Rencana Tindak Lanjut).
-- Keputusan pengguna (13 Nov 2026): nilai resmi menjadi per jenis;
-- status selesai dinilai terpisah per jenis (BLUEPRINT §Phase 6).
-- Migrasi ini tidak mengubah hasil historis; evaluasi lama (NULL) tetap utuh.

alter table public.collective_evaluations
  add column if not exists rubric_version_id uuid
    references public.rubric_versions(id) on delete set null;

comment on column public.collective_evaluations.rubric_version_id is
  'Rubrik versi aktif per kegiatan = per jenis penilaian. NULL hanya untuk draf lama pra-migrasi.';

alter table public.collective_evaluations
  drop constraint if exists collective_evaluations_event_id_participant_id_key;

-- Beberapa jenis penilaian dapat memiliki evaluasi untuk peserta yang sama;
-- draf lama (ruprik_version_id NULL) dikelompokkan satu.
create unique index if not exists
  collective_evaluations_event_participant_version_key
  on public.collective_evaluations
  (event_id, participant_id, rubric_version_id) nulls not distinct;

alter table public.assessment_snapshots
  drop constraint if exists assessment_snapshots_event_id_participant_id_revision_key;

-- Revisi snapshot kini bernomor per evaluasi (per jenis penilaian).
create unique index if not exists
  assessment_snapshots_evaluation_revision_key
  on public.assessment_snapshots (collective_evaluation_id, revision);

-- Rapor perlu menampilkan satu baris per snapshot (per jenis), bukan hanya
-- revisi terakhir lintas jenis.
create or replace function public.get_event_report_rows(target_event_id uuid)
returns table(
  participant_id uuid,
  display_name text,
  student_number text,
  group_name text,
  commissariat text,
  account_linked boolean,
  snapshot_id uuid,
  snapshot_data jsonb,
  rubric_version_ids jsonb,
  framework_version_ids jsonb,
  finalized_at timestamptz,
  published_at timestamptz,
  publication_revision integer
)
language plpgsql stable security definer set search_path = '' as
$$
begin
  if not (public.is_admin_system()
    or exists(select 1 from public.profiles p
              where p.id = (select auth.uid()) and p.role = 'bidang_kader')
    or public.is_assessment_moderator(target_event_id)) then
    raise exception 'Akses laporan kegiatan ditolak.' using errcode = '42501';
  end if;

  return query
    select p.id,
           p.display_name,
           p.student_number,
           p.group_name,
           p.commissariat,
           p.account_user_id is not null,
           s.id,
           s.snapshot_data,
           s.rubric_version_ids,
           s.framework_version_ids,
           s.finalized_at,
           pub.published_at,
           pub.revision
    from public.participants p
    left join lateral (
      select snap.*
      from public.assessment_snapshots snap
      where snap.event_id = p.event_id
        and snap.participant_id = p.id
      order by snap.finalized_at desc nulls last
    ) s on true
    left join public.assessment_report_publications pub
      on pub.snapshot_id = s.id
    where p.event_id = target_event_id
    order by p.display_name, s.finalized_at nulls last;
end $$;

revoke all on function public.get_event_report_rows(uuid) from public;
grant execute on function public.get_event_report_rows(uuid) to authenticated;
