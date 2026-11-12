-- Phase 5 structural regression checks. Run after 20261111160000.
-- Real cross-account behavior must also be exercised in the app with two assigned users.
begin;

do $$
declare
  rating_owner_unique boolean;
  status_constraint boolean;
  no_zero_constraint boolean;
  rls_enabled boolean;
  policy_names text[];
  trigger_names text[];
begin
  if to_regclass('public.assessment_submissions') is null or to_regclass('public.assessment_ratings') is null then
    raise exception 'Tabel Phase 5 belum tersedia.';
  end if;

  select exists(select 1 from pg_constraint c where c.conrelid='public.assessment_ratings'::regclass and c.contype='u'
    and pg_get_constraintdef(c.oid) like '%rubric_version_id, participant_id, indicator_id, observer_id%')
    into rating_owner_unique;
  if not rating_owner_unique then raise exception 'Unique constraint rating per observer/workspace belum tersedia.'; end if;

  select exists(select 1 from pg_constraint where conrelid='public.assessment_ratings'::regclass and conname='assessment_ratings_response_check') into status_constraint;
  if not status_constraint then raise exception 'Constraint scored/N-O/unrated belum tersedia.'; end if;
  select pg_get_constraintdef(oid) like '%score >= 1%' and pg_get_constraintdef(oid) like '%score <= 5%' from pg_constraint
    where conrelid='public.assessment_ratings'::regclass and conname='assessment_ratings_score_check' into no_zero_constraint;
  if not coalesce(no_zero_constraint,false) then raise exception 'Skor numerik harus dibatasi 1–5.'; end if;

  select relrowsecurity into rls_enabled from pg_class where oid='public.assessment_ratings'::regclass;
  if not rls_enabled then raise exception 'RLS ratings tidak aktif.'; end if;
  select array_agg(policyname) into policy_names from pg_policies where schemaname='public' and tablename='assessment_ratings';
  if not ('assessment_ratings_read_assigned'=any(policy_names) and 'assessment_ratings_insert_owner'=any(policy_names) and 'assessment_ratings_update_owner'=any(policy_names)) then
    raise exception 'Kebijakan baca/insert/update ownership ratings tidak lengkap: %',policy_names;
  end if;

  select array_agg(t.tgname) into trigger_names from pg_trigger t where t.tgrelid='public.assessment_ratings'::regclass and not t.tgisinternal;
  if not ('assessment_ratings_track'=any(trigger_names)) then raise exception 'Trigger audit perubahan rating tidak ada.'; end if;
  if not exists(select 1 from pg_trigger where tgrelid='public.assessment_submissions'::regclass and tgname='assessment_submissions_track') then
    raise exception 'Trigger status submission dan histori tidak ada.';
  end if;

  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='assessment_ratings' and column_name='rubric_version_id') then
    raise exception 'Versi rubrik tidak dicatat pada rating.';
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='assessment_ratings') then
    raise exception 'Ratings belum masuk publikasi Realtime.';
  end if;
end $$;

rollback;
