-- Kontrak privasi revisi evaluasi: Bidang Kader tidak boleh membaca salinan
-- evaluasi yang memuat catatan/deliberasi privat. Jalankan di DEV saja.
\set ON_ERROR_STOP on
begin;

select id::text as ev from public.events
where archived_at is null order by starts_on desc limit 1 \gset
select id::text as admin_id from public.profiles where role='admin_system' limit 1 \gset
select id::text as kader_id from public.profiles where role='bidang_kader' limit 1 \gset
select id::text as participant_id from public.participants where event_id=:'ev'::uuid limit 1 \gset
select gen_random_uuid()::text as eval_id \gset

select set_config('imm_test.ev', :'ev', false);
select set_config('imm_test.admin_id', :'admin_id', false);
select set_config('imm_test.kader_id', :'kader_id', false);
select set_config('imm_test.eval_id', :'eval_id', false);

insert into public.collective_evaluations(id,event_id,participant_id,status,updated_by)
values (:'eval_id'::uuid, :'ev'::uuid, :'participant_id'::uuid, 'draft', :'admin_id'::uuid);

insert into public.collective_evaluation_revisions(evaluation_id,revision,snapshot,changed_by)
values (:'eval_id'::uuid, 1,
        jsonb_build_object('strengths','Catatan privat uji','discussion_notes','Deliberasi uji'),
        :'admin_id'::uuid);

-- Definisi policy: tidak boleh ada cabang bidang_kader pada tabel revisi.
do $$
declare
  pol text;
begin
  select coalesce(qual,'') into pol from pg_policies
  where schemaname='public' and tablename='collective_evaluation_revisions'
    and policyname='collective_evaluation_revisions_read_authorized';
  if pol is null then
    raise exception 'Policy collective_evaluation_revisions_read_authorized tidak ditemukan.';
  end if;
  if pol not like '%is_assessment_moderator%' or pol not like '%is_admin_system%' then
    raise exception 'Policy revisi belum membatasi ke Admin dan moderator.';
  end if;
  if pol like '%bidang_kader%' then
    raise exception 'Policy revisi masih memberi akses ke Bidang Kader.';
  end if;
end $$;

-- Grant anon harus dicabut, bukan sekadar dibatasi RLS.
do $$
begin
  if has_table_privilege('anon','public.assessment_moderation_revisions','SELECT')
     or has_table_privilege('anon','public.collective_evaluation_revisions','SELECT') then
    raise exception 'anon masih memiliki SELECT pada tabel revisi.';
  end if;
end $$;

-- Rekomendasi yang sudah disetujui sengaja tetap bisa dibaca Kader.
do $$
declare
  pol text;
begin
  select coalesce(qual,'') into pol from pg_policies
  where schemaname='public' and tablename='development_recommendations'
    and policyname='development_recommendations_read_authorized';
  if pol is null or pol not like '%bidang_kader%' then
    raise exception 'Policy rekomendasi approved untuk Kader berubah di luar rencana.';
  end if;
end $$;

create or replace function pg_temp.try_read_revision(p_uid uuid)
returns integer language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  return (select count(*)::integer from public.collective_evaluation_revisions
          where evaluation_id=current_setting('imm_test.eval_id', true)::uuid);
exception when others then
  return -1;
end $$;

set local role authenticated;

do $$
declare
  kader_rows integer;
  admin_rows integer;
begin
  kader_rows := pg_temp.try_read_revision(current_setting('imm_test.kader_id', true)::uuid);
  if kader_rows <> 0 then
    raise exception 'Bidang Kader membaca % baris revisi evaluasi.', kader_rows;
  end if;

  admin_rows := pg_temp.try_read_revision(current_setting('imm_test.admin_id', true)::uuid);
  if admin_rows <> 1 then
    raise exception 'Admin Sistem gagal membaca revisi evaluasi (baris: %).', admin_rows;
  end if;
end $$;

select 'Revision privacy checks passed.' as result;
rollback;
