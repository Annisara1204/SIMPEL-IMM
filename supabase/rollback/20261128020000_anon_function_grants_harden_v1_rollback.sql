-- Kembalikan EXECUTE anon pada fungsi internal yang dicabut migrasi
-- 20261128020000. Hanya dipakai bila pengerasan terbukti memutus alur publik.
-- Daftar di bawah adalah keadaan sebelum pengerasan di database DEV.

grant execute on function public.archive_material_draft_versions() to anon;
grant execute on function public.can_read_observation_peer(uuid) to anon;
grant execute on function public.get_event_report_rows(uuid) to anon;
grant execute on function public.get_staff_event_summary(uuid) to anon;
grant execute on function public.prevent_material_archive_with_active_rubric() to anon;
grant execute on function public.prevent_observer_event_archive() to anon;
