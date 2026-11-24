-- Kontrak perilaku RPC Fase 2. Jalankan di DEV, bukan PROD.
-- Seluruh fixture dibuat di dalam transaksi ini dan hilang saat rollback:
-- tidak ada penulisan permanen ke tabel produksi.
-- Urutan: Struktur -> fixture service_role -> assertion authenticated.
begin;

-- 1) Signature delapan argumen finalize_collective_evaluation.
do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'finalize_collective_evaluation'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) =
          'target_evaluation_id uuid, target_decision text, target_rationale text, target_framework_versions jsonb, target_rubric_versions jsonb, target_rating_ids jsonb, target_snapshot jsonb, target_private_sources jsonb'
  ) then
    raise exception 'Signature 8 argumen finalize_collective_evaluation tidak ditemukan.';
  end if;
  raise notice 'Signature 8 argumen finalize_collective_evaluation OK.';
end $$;

-- 2) Fixture. service_role dibutuhkan karena INSERT snapshot dicabut dari authenticated.
set local role service_role;
do $$
declare actor uuid; comm_id uuid;
begin
  -- Penguji tidak membaca auth.users. Aktor diambil dari profil yang sudah ada;
  -- perubahan perannya terjadi di dalam transaksi dan hilang saat rollback.
  select p.id into actor from public.profiles p order by p.created_at nulls last, p.id limit 1;
  select c.id into comm_id from public.commissariats c order by c.id limit 1;
  if actor is null or comm_id is null then
    raise exception 'Fixture penguji memerlukan profil dan komisariat.';
  end if;
  perform set_config('imm_test.actor', actor::text, true);

  insert into public.profiles (id, display_name, role)
  values (actor, 'QA Gate Publish', 'admin_system')
  on conflict (id) do update set role = excluded.role, display_name = excluded.display_name;

  insert into public.assessment_scoring_policies (id, minimum_coverage)
  values (true, 80)
  on conflict (id) do nothing;

  insert into public.events (id, name, commissariat, location, starts_on, ends_on)
  values ('b3100000-0000-4000-8000-000000000099', 'QA Publish Gate', 'Komisariat QA', 'Lokasi QA', date '2026-11-24', date '2026-11-24')
  on conflict (id) do nothing;

  insert into public.participants (id, event_id, display_name, commissariat, commissariat_id, major, entry_year)
  values
    ('b3100000-0000-4000-8000-000000000098', 'b3100000-0000-4000-8000-000000000099', 'Peserta QA Gate Tolak', 'Komisariat QA', comm_id, 'Teknik', 2024),
    ('b3100000-0000-4000-8000-000000000094', 'b3100000-0000-4000-8000-000000000099', 'Peserta QA Gate Terima', 'Komisariat QA', comm_id, 'Teknik', 2024)
  on conflict (id) do nothing;

  -- Dua evaluasi terpisah supaya kedua snapshot menjadi revision terbaru
  -- di evaluasinya masing-masing (gate "latest snapshot" terpenuhi).
  insert into public.collective_evaluations
    (id, event_id, participant_id, status, graduation_decision, decision_rationale, approved_by, approved_at, updated_by)
  values
    ('b3100000-0000-4000-8000-000000000097', 'b3100000-0000-4000-8000-000000000099',
     'b3100000-0000-4000-8000-000000000098', 'finalized', 'further_discussion',
     'Alasan QA yang cukup panjang untuk penguji gate terbit.', actor, now(), actor),
    ('b3100000-0000-4000-8000-000000000093', 'b3100000-0000-4000-8000-000000000099',
     'b3100000-0000-4000-8000-000000000094', 'finalized', 'further_discussion',
     'Alasan QA yang cukup panjang untuk penguji gate terbit.', actor, now(), actor)
  on conflict (id) do nothing;

  -- Snapshot provisional: harus ditolak gate publish.
  -- Snapshot memenuhi syarat: dipakai sebagai kontrol positif.
  insert into public.assessment_snapshots
    (id, event_id, participant_id, collective_evaluation_id, revision,
     framework_version_ids, rubric_version_ids, source_rating_ids, snapshot_data, finalized_by)
  values
    ('b3100000-0000-4000-8000-000000000096', 'b3100000-0000-4000-8000-000000000099',
     'b3100000-0000-4000-8000-000000000098', 'b3100000-0000-4000-8000-000000000097', 1,
     '[]'::jsonb, '["c3100000-0000-4000-8000-000000000099"]'::jsonb, '[]'::jsonb,
     jsonb_build_object('overall', jsonb_build_object('status', 'provisional', 'score', 70),
                        'aspects', jsonb_build_array()),
     actor),
    ('b3100000-0000-4000-8000-000000000095', 'b3100000-0000-4000-8000-000000000099',
     'b3100000-0000-4000-8000-000000000094', 'b3100000-0000-4000-8000-000000000093', 1,
     '[]'::jsonb, '["c3100000-0000-4000-8000-000000000099"]'::jsonb, '[]'::jsonb,
     jsonb_build_object('overall', jsonb_build_object('status', 'ready_for_collective_evaluation', 'score', 80),
                        'aspects', jsonb_build_array(
                          jsonb_build_object('valid', true, 'coverage', 100, 'score', 4, 'weight', 100))),
     actor);
end $$;

-- 3) Rapor tanpa akses harus P0002 (akun QA tidak ditautkan ke peserta mana pun).
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000000';
do $$
declare caught text;
begin
  begin
    perform public.get_my_published_assessment_report();
  exception when others then
    caught := sqlstate;
  end;
  if caught is distinct from 'P0002' then
    raise exception 'Rapor tanpa akses: diharapkan P0002, diperoleh %', coalesce(caught, 'tanpa exception');
  end if;
  raise notice 'Rapor tanpa akses ditolak dengan P0002.';
end $$;

-- 4) Gate publish: provisional ditolak, snapshot yang memenuhi syarat diterima.
select pg_catalog.set_config('request.jwt.claim.sub', current_setting('imm_test.actor', true), true);
do $$
declare caught text;
begin
  begin
    perform public.publish_assessment_report('b3100000-0000-4000-8000-000000000096'::uuid);
  exception when others then
    caught := sqlerrm;
  end;
  if caught is distinct from 'Snapshot belum memenuhi syarat terbit.' then
    raise exception 'Gate publish: snapshot provisional harus ditolak, diperoleh %', coalesce(caught, 'tidak ada exception');
  end if;

  caught := null;
  begin
    perform public.publish_assessment_report('b3100000-0000-4000-8000-000000000095'::uuid);
  exception when others then
    caught := sqlerrm;
  end;
  if caught is not null then
    raise exception 'Gate publish: snapshot yang memenuhi syarat salah ditolak: %', caught;
  end if;
  raise notice 'Gate publish menolak snapshot tidak memenuhi syarat dan menerima snapshot sah.';
end $$;

rollback;
