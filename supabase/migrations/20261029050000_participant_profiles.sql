-- Profil dasar peserta untuk data simulasi Tahap 3.
alter table public.participants
  add column if not exists commissariat_id uuid references public.commissariats(id) on delete restrict,
  add column if not exists major text,
  add column if not exists entry_year integer,
  add column if not exists position text;

-- Data lama yang dibuat aplikasi adalah data simulasi; tautkan ke Komisariat simulasi pertama.
update public.participants
set commissariat_id = 'a3200000-0000-4000-8000-000000000001',
    commissariat = 'Komisariat Simulasi 01'
where commissariat_id is null;

update public.participants
set major = 'Program Studi Simulasi'
where major is null or char_length(trim(major)) < 2;

update public.participants
set entry_year = 2024
where entry_year is null;

alter table public.participants alter column commissariat_id set not null;
alter table public.participants alter column major set not null;
alter table public.participants alter column entry_year set not null;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'participants_major_length_check') then
    alter table public.participants add constraint participants_major_length_check
      check (char_length(trim(major)) between 2 and 120);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'participants_entry_year_check') then
    alter table public.participants add constraint participants_entry_year_check
      check (entry_year between 1900 and 2100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'participants_position_length_check') then
    alter table public.participants add constraint participants_position_length_check
      check (position is null or char_length(trim(position)) <= 120);
  end if;
end $$;
