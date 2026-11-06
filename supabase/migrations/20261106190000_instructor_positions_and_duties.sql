-- Penugasan subrole Instruktur berlaku per kegiatan.
alter table public.instructor_event_assignments
  add column if not exists position text not null default 'mot'
  check (position in ('mot', 'vice_mot', 'iot', 'vice_iot', 'master_observer', 'vice_observer'));

alter table public.instructor_event_assignments
  drop constraint if exists instructor_event_assignments_event_id_instructor_id_key;
create unique index if not exists instructor_event_assignments_position_unique
  on public.instructor_event_assignments(event_id, instructor_id, position);

create table public.instructor_duty_items (
  id uuid primary key default gen_random_uuid(),
  instructor_assignment_id uuid not null references public.instructor_event_assignments(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 180),
  is_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (instructor_assignment_id, title)
);

alter table public.instructor_duty_items enable row level security;
create policy instructor_duty_items_read_assigned on public.instructor_duty_items
  for select to authenticated using (
    exists (
      select 1 from public.instructor_event_assignments a
      where a.id = instructor_assignment_id
        and (a.instructor_id = (select auth.uid()) or (select public.is_admin_system()))
    )
  );
create policy instructor_duty_items_update_assigned on public.instructor_duty_items
  for update to authenticated using (
    exists (
      select 1 from public.instructor_event_assignments a
      where a.id = instructor_assignment_id and a.instructor_id = (select auth.uid())
    )
  ) with check (
    exists (
      select 1 from public.instructor_event_assignments a
      where a.id = instructor_assignment_id and a.instructor_id = (select auth.uid())
    )
  );
create policy instructor_duty_items_insert_admin on public.instructor_duty_items
  for insert to authenticated with check ((select public.is_admin_system()));
grant select, insert, update on public.instructor_duty_items to authenticated;
revoke all on public.instructor_duty_items from anon;

insert into public.instructor_duty_items(instructor_assignment_id, title)
select a.id, duty.title
from public.instructor_event_assignments a
cross join lateral (values
  ('Fasilitasi koordinasi awal dengan panitia dan instruktur', 'mot'),
  ('Pastikan rencana program, materi, jadwal, dan target siap', 'mot'),
  ('Koordinasikan pembagian tugas instruktur dan kebutuhan kegiatan', 'mot'),
  ('Catat kendala penting dan hasil keputusan koordinasi', 'mot'),
  ('Koordinasikan evaluasi akhir dan laporan pasca pelatihan', 'mot'),
  ('Tinjau kesiapan teknis dan jadwal kegiatan', 'vice_mot'),
  ('Catat tindak lanjut koordinasi yang didelegasikan MoT', 'vice_mot'),
  ('Bantu koordinasi panitia, instruktur, dan peserta', 'vice_mot'),
  ('Catat kendala lapangan untuk disampaikan kepada MoT', 'vice_mot'),
  ('Siap mengambil alih koordinasi bila MoT berhalangan', 'vice_mot'),
  ('Susun agenda ibadah dan pembinaan ruhiyah kegiatan', 'iot'),
  ('Koordinasikan petugas salat, kultum, tadarus, dan kegiatan terkait', 'iot'),
  ('Pastikan agenda ibadah tercantum pada jadwal kegiatan', 'iot'),
  ('Pantau pelaksanaan agenda dan catat kebutuhan tindak lanjut', 'iot'),
  ('Evaluasi pelaksanaan agenda ruhiyah setelah kegiatan', 'iot'),
  ('Bantu menyiapkan petugas dan kebutuhan agenda ibadah', 'vice_iot'),
  ('Periksa kesiapan tempat dan perlengkapan kegiatan ibadah', 'vice_iot'),
  ('Bantu mengingatkan jadwal kepada petugas terkait', 'vice_iot'),
  ('Catat perubahan jadwal untuk dikomunikasikan kepada IoT', 'vice_iot'),
  ('Bantu rekap evaluasi agenda ruhiyah', 'vice_iot'),
  ('Koordinasikan pembagian tugas Observer untuk kegiatan', 'master_observer'),
  ('Pastikan Observer memahami rubrik dan alur pengisian', 'master_observer'),
  ('Pantau progres penyelesaian penilaian setiap tahap', 'master_observer'),
  ('Koordinasikan pembahasan hasil agregat dengan tim Observer', 'master_observer'),
  ('Sampaikan ringkasan dan kebutuhan tindak lanjut kepada MoT', 'master_observer'),
  ('Bantu koordinasikan jadwal dan pembagian tugas Observer', 'vice_observer'),
  ('Pantau penilaian yang belum selesai dan sampaikan pengingat', 'vice_observer'),
  ('Bantu Observer memahami alur dan rubrik penilaian', 'vice_observer'),
  ('Siapkan ringkasan progres untuk Master of Observer', 'vice_observer'),
  ('Bantu konsolidasi hasil tanpa membagikan catatan privat', 'vice_observer')
) as duty(title, position)
where a.position = duty.position
and not exists (
  select 1 from public.instructor_duty_items item
  where item.instructor_assignment_id = a.id and item.title = duty.title
);

create or replace function public.get_instructor_dashboard_results()
returns table (
  event_id uuid,
  event_name text,
  stage text,
  material_name text,
  assessment_type_name text,
  rubric_version integer,
  participant_count integer,
  scored_count integer,
  average_score numeric,
  category_development integer,
  category_adequate integer,
  category_good integer,
  category_excellent integer,
  observer_count integer,
  completed_observer_count integer,
  is_official boolean
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'instruktur'
  ) then
    raise exception 'Akses hanya untuk Instruktur.' using errcode = '42501';
  end if;

  return query
  with active_versions as (
    select rv.id, rv.event_id, rv.stage, rv.material_id, rv.assessment_type_id, rv.version,
      e.name as event_title, m.name as material_title, t.name as type_title
    from public.rubric_versions rv
    join public.events e on e.id = rv.event_id
    join public.rubric_assessment_types t on t.id = rv.assessment_type_id
    left join public.rubric_materials m on m.id = rv.material_id
    where rv.status = 'active' and exists (
      select 1 from public.instructor_event_assignments ia
      where ia.event_id = rv.event_id and ia.instructor_id = (select auth.uid())
        and ia.position in ('mot', 'vice_mot', 'master_observer', 'vice_observer')
    )
  ),
  aspect_results as (
    select v.id as version_id, p.id as participant_id, a.id as aspect_id, a.weight as aspect_weight,
      sum(o.score::numeric * i.weight) / nullif(sum(i.weight) filter (where o.score is not null), 0) as aspect_score
    from active_versions v
    join public.participants p on p.event_id = v.event_id
    join public.rubric_aspects a on a.rubric_version_id = v.id
    join public.rubric_indicators i on i.aspect_id = a.id
    left join public.observations o on o.participant_id = p.id and o.indicator_id = i.id
    group by v.id, p.id, a.id, a.weight
  ),
  participant_scores as (
    select ar.version_id, ar.participant_id,
      ((sum(ar.aspect_score * ar.aspect_weight) / nullif(sum(ar.aspect_weight), 0) - 1) / 4) * 100 as score
    from aspect_results ar where ar.aspect_score is not null group by ar.version_id, ar.participant_id
  ),
  completion_counts as (
    select v.id as version_id, count(distinct a.id)::integer as assigned_count,
      count(distinct c.assignment_id)::integer as completed_count
    from active_versions v
    left join public.observer_assignments a on a.event_id = v.event_id
    left join public.observer_rubric_version_completions c on c.assignment_id = a.id and c.rubric_version_id = v.id
    group by v.id
  )
  select v.event_id, v.event_title, v.stage, v.material_title, v.type_title, v.version,
    count(distinct p.id)::integer, count(distinct ps.participant_id)::integer, round(avg(ps.score), 2),
    count(distinct ps.participant_id) filter (where ps.score < 60)::integer,
    count(distinct ps.participant_id) filter (where ps.score >= 60 and ps.score < 75)::integer,
    count(distinct ps.participant_id) filter (where ps.score >= 75 and ps.score < 90)::integer,
    count(distinct ps.participant_id) filter (where ps.score >= 90)::integer,
    cc.assigned_count, cc.completed_count,
    (cc.assigned_count > 0 and cc.assigned_count = cc.completed_count)
  from active_versions v
  join completion_counts cc on cc.version_id = v.id
  left join public.participants p on p.event_id = v.event_id
  left join participant_scores ps on ps.version_id = v.id and ps.participant_id = p.id
  group by v.id, v.event_id, v.event_title, v.stage, v.material_title, v.type_title, v.version,
    cc.assigned_count, cc.completed_count
  order by v.event_title, v.stage, v.material_title, v.type_title;
end;
$$;
revoke all on function public.get_instructor_dashboard_results() from public;
grant execute on function public.get_instructor_dashboard_results() to authenticated;
