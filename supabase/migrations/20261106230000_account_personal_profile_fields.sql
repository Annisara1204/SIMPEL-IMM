-- Data pribadi profil akun dipisahkan dari profiles agar tidak terbaca lewat akses profil rekan Instruktur.
create table if not exists public.account_personal_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  birth_place text not null check (char_length(trim(birth_place)) between 2 and 120),
  birth_date date not null,
  gender text not null check (char_length(trim(gender)) between 1 and 40),
  phone_number text not null check (char_length(trim(phone_number)) between 8 and 24),
  domicile_address text not null check (char_length(trim(domicile_address)) between 5 and 500),
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.account_personal_profiles enable row level security;

drop policy if exists account_personal_profiles_select_owner_admin on public.account_personal_profiles;
create policy account_personal_profiles_select_owner_admin on public.account_personal_profiles
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin_system()));
drop policy if exists account_personal_profiles_insert_owner on public.account_personal_profiles;
create policy account_personal_profiles_insert_owner on public.account_personal_profiles
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists account_personal_profiles_update_owner on public.account_personal_profiles;
create policy account_personal_profiles_update_owner on public.account_personal_profiles
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update on public.account_personal_profiles to authenticated;
revoke all on public.account_personal_profiles from anon;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('account-profile-photos', 'account-profile-photos', false, 5242880, array['image/jpeg', 'image/png']::text[])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png']::text[];

drop policy if exists account_profile_photos_read_owner_admin on storage.objects;
create policy account_profile_photos_read_owner_admin on storage.objects for select to authenticated using (
  bucket_id = 'account-profile-photos'
  and (split_part(name, '/', 1) = (select auth.uid())::text or (select public.is_admin_system()))
);
drop policy if exists account_profile_photos_insert_owner on storage.objects;
create policy account_profile_photos_insert_owner on storage.objects for insert to authenticated with check (
  bucket_id = 'account-profile-photos' and split_part(name, '/', 1) = (select auth.uid())::text
);
drop policy if exists account_profile_photos_update_owner on storage.objects;
create policy account_profile_photos_update_owner on storage.objects for update to authenticated using (
  bucket_id = 'account-profile-photos' and split_part(name, '/', 1) = (select auth.uid())::text
) with check (
  bucket_id = 'account-profile-photos' and split_part(name, '/', 1) = (select auth.uid())::text
);
drop policy if exists account_profile_photos_delete_owner on storage.objects;
create policy account_profile_photos_delete_owner on storage.objects for delete to authenticated using (
  bucket_id = 'account-profile-photos' and split_part(name, '/', 1) = (select auth.uid())::text
);
