-- Keputusan akses terbaru: impor hasil tes hanya untuk Admin Sistem/Super Admin.
drop policy if exists "participants_read_for_test_managers" on public.participants;
drop policy if exists "events_read_test_managers" on public.events;
drop policy if exists "test_imports_read_managers" on public.test_imports;
drop policy if exists "test_results_read_managers" on public.test_results;

create policy "participants_read_for_test_admin" on public.participants for select to authenticated using ((select public.is_admin_system()));
create policy "events_read_test_admin" on public.events for select to authenticated using ((select public.is_admin_system()));
create policy "test_imports_read_admin" on public.test_imports for select to authenticated using ((select public.is_admin_system()));
create policy "test_results_read_admin" on public.test_results for select to authenticated using ((select public.is_admin_system()));

revoke all on function public.commit_test_import(uuid, text, text, jsonb) from public, authenticated;

create or replace function public.commit_test_import_admin(
  p_event_id uuid,
  p_test_type text,
  p_source_filename text,
  p_rows jsonb
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := (select auth.uid());
  new_import_id uuid;
  row_item record;
begin
  if not public.is_admin_system() then raise exception 'Akses impor hasil tes hanya untuk Admin Sistem.'; end if;
  if p_test_type not in ('pretest', 'posttest') then raise exception 'Jenis tes tidak valid.'; end if;
  if p_source_filename is null or char_length(p_source_filename) not between 1 and 255 then raise exception 'Nama berkas tidak valid.'; end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) < 1 or jsonb_array_length(p_rows) > 500 then raise exception 'Impor harus berisi 1 sampai 500 baris hasil.'; end if;
  if exists (
    select 1 from jsonb_to_recordset(p_rows) as r(participant_id uuid, is_current boolean)
    group by participant_id having sum(case when is_current then 1 else 0 end) > 1
  ) then raise exception 'Pilih maksimal satu nilai yang dipakai untuk setiap peserta dan jenis tes.'; end if;
  if exists (
    select 1 from jsonb_to_recordset(p_rows) as r(participant_id uuid, source_row_number integer, source_name text, source_commissariat text, score numeric, is_current boolean)
    left join public.participants p on p.id = r.participant_id and p.event_id = p_event_id
    where p.id is null or r.participant_id is null or r.source_row_number <= 1 or r.source_name is null or char_length(trim(r.source_name)) not between 1 and 300 or r.source_commissariat is null or char_length(trim(r.source_commissariat)) not between 1 and 300 or r.score is null or r.is_current is null
  ) then raise exception 'Ada baris hasil tidak lengkap atau peserta bukan bagian dari kegiatan.'; end if;
  if exists (
    select 1 from (
      select r.participant_id, sum(case when r.is_current then 1 else 0 end) as current_count
      from jsonb_to_recordset(p_rows) as r(participant_id uuid, is_current boolean)
      group by r.participant_id
    ) selected
    where selected.current_count = 0 and not exists (select 1 from public.test_results existing where existing.event_id = p_event_id and existing.participant_id = selected.participant_id and existing.test_type = p_test_type and existing.is_current)
  ) then raise exception 'Pilih hasil saat ini untuk peserta yang belum memiliki nilai tersimpan.'; end if;

  insert into public.test_imports(event_id, test_type, source_filename, imported_by, row_count)
  values (p_event_id, p_test_type, p_source_filename, actor_id, jsonb_array_length(p_rows))
  returning id into new_import_id;

  for row_item in select * from jsonb_to_recordset(p_rows) as r(participant_id uuid, source_row_number integer, source_name text, source_commissariat text, score numeric, is_current boolean)
  loop
    if row_item.is_current then
      update public.test_results set is_current = false
      where event_id = p_event_id and participant_id = row_item.participant_id and test_type = p_test_type and is_current;
    end if;
    insert into public.test_results(import_id, event_id, participant_id, test_type, source_row_number, source_name, source_commissariat, score, is_current)
    values (new_import_id, p_event_id, row_item.participant_id, p_test_type, row_item.source_row_number, row_item.source_name, row_item.source_commissariat, row_item.score, row_item.is_current);
  end loop;
  return new_import_id;
end;
$$;

revoke all on function public.commit_test_import_admin(uuid, text, text, jsonb) from public;
grant execute on function public.commit_test_import_admin(uuid, text, text, jsonb) to authenticated;
