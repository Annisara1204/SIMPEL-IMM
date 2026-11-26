-- Kontrak arsip materi: Admin Sistem dapat mengarsipkan dan memulihkan,
-- Observer tidak dapat, dan materi dengan rubrik aktif ditolak.
-- Jalankan di DEV. Transaksi di-rollback di akhir penguji.
begin;

select id::text as ev_id from public.events order by starts_on desc limit 1 \gset
select id::text as admin_id from public.profiles where role='admin_system' limit 1 \gset
select id::text as observer_id from public.profiles where role='observer' limit 1 \gset
select id::text as at_id from public.rubric_assessment_types where stage='training' limit 1 \gset

insert into public.rubric_materials(event_id, name)
values (:'ev_id'::uuid, 'Uji Arsip ' || substr(gen_random_uuid()::text, 1, 8))
returning id::text as m_id \gset
select set_config('imm_test.material', :'m_id', true);

insert into public.rubric_versions(
  event_id, stage, assessment_type_id, material_id, version, status, created_by
) values (
  :'ev_id'::uuid, 'training', :'at_id'::uuid,
  current_setting('imm_test.material', true)::uuid, 998, 'draft',
  (select id from public.profiles where role='admin_system' limit 1)
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'admin_id', true);

do $$
declare archived_count integer; restored_count integer;
begin
  update public.rubric_materials
     set archived_at = now()
   where id = current_setting('imm_test.material', true)::uuid;
  get diagnostics archived_count = row_count;
  if archived_count <> 1 then
    raise exception 'Admin gagal mengarsipkan materi uji.';
  end if;
  if not exists (
    select 1 from public.rubric_materials
    where id = current_setting('imm_test.material', true)::uuid and archived_at is not null
  ) then
    raise exception 'archived_at tidak terisi setelah pengarsipan.';
  end if;
  if not exists (
    select 1 from public.rubric_versions
    where material_id = current_setting('imm_test.material', true)::uuid
      and version = 998 and status = 'archived'
  ) then
    raise exception 'Versi draf tidak turut diarsipkan.';
  end if;

  update public.rubric_materials
     set archived_at = null
   where id = current_setting('imm_test.material', true)::uuid;
  get diagnostics restored_count = row_count;
  if restored_count <> 1 then
    raise exception 'Admin gagal memulihkan materi uji.';
  end if;
  raise notice 'Admin dapat mengarsipkan dan memulihkan materi.';
end $$;

select set_config('request.jwt.claim.sub', :'observer_id', true);

do $$
declare blocked_count integer;
begin
  update public.rubric_materials
     set archived_at = now()
   where id = current_setting('imm_test.material', true)::uuid;
  get diagnostics blocked_count = row_count;
  if blocked_count <> 0 then
    raise exception 'Observer tidak boleh mengarsipkan materi.';
  end if;
  raise notice 'Observer ditolak saat mencoba mengarsipkan materi.';
end $$;

set local role postgres;

insert into public.rubric_versions(
  event_id, stage, assessment_type_id, material_id, version, status, created_by
) values (
  :'ev_id'::uuid, 'training', :'at_id'::uuid,
  current_setting('imm_test.material', true)::uuid, 999, 'active',
  (select id from public.profiles where role='admin_system' limit 1)
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'admin_id', true);

do $$
declare rejected boolean := false;
begin
  begin
    update public.rubric_materials
       set archived_at = now()
     where id = current_setting('imm_test.material', true)::uuid;
  exception when others then
    if sqlerrm like '%rubrik aktif%' then
      rejected := true;
    else
      raise;
    end if;
  end;
  if not rejected then
    raise exception 'Materi dengan rubrik aktif seharusnya ditolak.';
  end if;
  raise notice 'Materi dengan rubrik aktif ditolak oleh trigger.';
end $$;

rollback;
