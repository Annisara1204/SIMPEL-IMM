-- Kontrak is_assessment_moderator(): Admin dan subrole koordinator lolos,
-- IoT/Vice IoT tidak. Jalankan di DEV; transaksi di-rollback.
\set ON_ERROR_STOP on
begin;

select id::text as ev from public.events
where archived_at is null order by starts_on desc limit 1 \gset
select id::text as admin_id from public.profiles where role='admin_system' limit 1 \gset
select coalesce(
  (select instructor_id::text from public.instructor_event_assignments
   where event_id=:'ev' and position='mot' limit 1),
  (select id::text from public.profiles where role='instruktur' limit 1)
) as instruktur_id \gset

select set_config('imm_test.ev', :'ev', false);
select set_config('imm_test.admin_id', :'admin_id', false);
select set_config('imm_test.instruktur_id', :'instruktur_id', false);

-- Singkirkan semua penugasan akun uji pada kegiatan ini agar hanya iot yang
-- tersisa. Perubahan ini ikut di-rollback di akhir berkas.
delete from public.instructor_event_assignments
where event_id=current_setting('imm_test.ev', true)::uuid
  and instructor_id=current_setting('imm_test.instruktur_id', true)::uuid;

insert into public.instructor_event_assignments(event_id, instructor_id, assigned_by, position)
values (current_setting('imm_test.ev', true)::uuid,
        current_setting('imm_test.instruktur_id', true)::uuid,
        current_setting('imm_test.admin_id', true)::uuid,
        'iot');

do $$
declare
  v_ev uuid := current_setting('imm_test.ev', true)::uuid;
  v_admin uuid := current_setting('imm_test.admin_id', true)::uuid;
  v_instruktur uuid := current_setting('imm_test.instruktur_id', true)::uuid;
begin
  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  if not coalesce(public.is_assessment_moderator(v_ev), false) then
    raise exception 'Admin Sistem harus dianggap moderator.';
  end if;

  perform set_config('request.jwt.claim.sub', v_instruktur::text, true);
  if coalesce(public.is_assessment_moderator(v_ev), false) then
    raise exception 'Subrole iot tidak boleh dianggap moderator.';
  end if;

  insert into public.instructor_event_assignments(event_id, instructor_id, assigned_by, position)
  values (v_ev, v_instruktur, v_admin, 'mot');

  if not coalesce(public.is_assessment_moderator(v_ev), false) then
    raise exception 'Subrole mot harus dianggap moderator.';
  end if;

  delete from public.instructor_event_assignments
  where event_id=v_ev and instructor_id=v_instruktur and position='mot';

  if coalesce(public.is_assessment_moderator(null), false) then
    raise exception 'Event kosong tidak boleh dianggap moderator.';
  end if;
end $$;

rollback;
