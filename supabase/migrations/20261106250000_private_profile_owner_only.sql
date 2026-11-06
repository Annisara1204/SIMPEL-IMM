-- Data pribadi Profil saya hanya dapat dibaca pemilik akun.
drop policy if exists account_personal_profiles_select_owner_admin on public.account_personal_profiles;
drop policy if exists account_personal_profiles_select_owner on public.account_personal_profiles;
create policy account_personal_profiles_select_owner on public.account_personal_profiles
  for select to authenticated using (user_id = (select auth.uid()));
