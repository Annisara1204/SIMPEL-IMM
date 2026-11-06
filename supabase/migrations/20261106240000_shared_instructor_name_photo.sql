-- Identitas visual Instruktur dibagikan ke semua akun role, tanpa membuka data pribadi lain.
alter table public.account_personal_profiles
  add constraint account_personal_profiles_gender_options
  check (gender in ('Laki-laki', 'Perempuan')) not valid;

create or replace function public.list_instructor_public_identity()
returns table(full_name text, photo_path text)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(nullif(trim(private_profile.full_name), ''), nullif(trim(profile.display_name), ''), 'Instruktur'),
         private_profile.photo_path
  from public.profiles profile
  left join public.account_personal_profiles private_profile on private_profile.user_id = profile.id
  where profile.role = 'instruktur'
    and exists (select 1 from public.profiles viewer where viewer.id = (select auth.uid()) and viewer.role is not null)
  order by 1;
$$;
revoke all on function public.list_instructor_public_identity() from public;
grant execute on function public.list_instructor_public_identity() to authenticated;

drop policy if exists account_profile_photos_read_owner_admin on storage.objects;
drop policy if exists account_profile_photos_read_all_accounts on storage.objects;
create policy account_profile_photos_read_all_accounts on storage.objects for select to authenticated using (
  bucket_id = 'account-profile-photos'
  and (
    split_part(name, '/', 1) = (select auth.uid())::text
    or exists (select 1 from public.profiles viewer where viewer.id = (select auth.uid()) and viewer.role is not null)
  )
);
