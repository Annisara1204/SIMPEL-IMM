-- Alur pengajuan Komisariat: tautan akun, draf pengajuan, berkas privat, dan peserta.
alter table public.profiles
  add column if not exists commissariat_id uuid references public.commissariats(id) on delete restrict;

create table public.commissariat_submissions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  commissariat_id uuid not null references public.commissariats(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'under_review', 'administrative_published', 'screening', 'screening_published', 'cancelled')),
  mandate_path text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  review_started_at timestamptz,
  administrative_published_at timestamptz,
  screening_started_at timestamptz,
  screening_published_at timestamptz
);

create unique index commissariat_one_active_submission_per_event
on public.commissariat_submissions(event_id, commissariat_id) where status <> 'cancelled';
create index commissariat_submissions_event_status_idx on public.commissariat_submissions(event_id, status);

create table public.commissariat_submission_participants (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.commissariat_submissions(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 120),
  major text not null check (char_length(trim(major)) between 2 and 120),
  entry_year integer not null check (entry_year between 1900 and 2100),
  position text check (position is null or char_length(trim(position)) <= 120),
  photo_path text not null,
  source text not null default 'application' check (source in ('application', 'screening_addition')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index commissariat_submission_participants_submission_idx on public.commissariat_submission_participants(submission_id, created_at);

create table public.commissariat_submission_decisions (
  id uuid primary key default gen_random_uuid(),
  submission_participant_id uuid not null references public.commissariat_submission_participants(id) on delete cascade,
  stage text not null check (stage in ('administrative', 'screening')),
  status text not null check (status in ('pass', 'fail')),
  public_reason text check (public_reason is null or char_length(trim(public_reason)) <= 500),
  reviewed_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  unique (submission_participant_id, stage)
);

create table public.commissariat_submission_internal_notes (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null unique references public.commissariat_submission_decisions(id) on delete cascade,
  note text not null check (char_length(trim(note)) between 1 and 2000),
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now()
);

create or replace function public.current_commissariat_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select commissariat_id from public.profiles where id = (select auth.uid()) and role = 'komisariat';
$$;

create or replace function public.is_commissariat_member(target_commissariat_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'komisariat' and commissariat_id = target_commissariat_id);
$$;

create or replace function public.can_read_commissariat_submission(target_submission_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.commissariat_submissions s
    where s.id = target_submission_id and (
      (select public.is_admin_system()) or (select public.can_access_event(s.event_id)) or (select public.is_commissariat_member(s.commissariat_id))
    )
  );
$$;

create or replace function public.can_edit_commissariat_submission(target_submission_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.commissariat_submissions s
    where s.id = target_submission_id and s.status = 'draft' and (
      (select public.is_admin_system()) or (select public.is_commissariat_member(s.commissariat_id))
    )
  );
$$;

create or replace function public.can_review_commissariat_submission(target_submission_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.commissariat_submissions s
    where s.id = target_submission_id and (
      (select public.is_admin_system()) or exists (
        select 1 from public.profiles p
        join public.observer_assignments a on a.observer_id = p.id and a.event_id = s.event_id
        where p.id = (select auth.uid()) and p.role = 'observer'
      )
    )
  );
$$;

create or replace function public.can_edit_commissariat_decision(target_participant_id uuid, target_stage text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.commissariat_submission_participants p
    join public.commissariat_submissions s on s.id = p.submission_id
    where p.id = target_participant_id and (select public.can_review_commissariat_submission(s.id))
      and ((target_stage = 'administrative' and s.status = 'under_review') or (target_stage = 'screening' and s.status = 'screening'))
  );
$$;

create or replace function public.can_read_commissariat_file(object_name text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare event_part text := split_part(object_name, '/', 1);
declare commissariat_part text := split_part(object_name, '/', 2);
declare submission_part text := split_part(object_name, '/', 3);
begin
  if event_part !~* '^[0-9a-f-]{36}$' or commissariat_part !~* '^[0-9a-f-]{36}$' or submission_part !~* '^[0-9a-f-]{36}$' then return false; end if;
  return exists (
    select 1 from public.commissariat_submissions s
    where s.id = submission_part::uuid and s.event_id = event_part::uuid and s.commissariat_id = commissariat_part::uuid
      and ((select public.is_admin_system()) or (select public.can_access_event(s.event_id)) or (select public.is_commissariat_member(s.commissariat_id)))
  );
end;
$$;

create or replace function public.can_write_commissariat_file(object_name text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare event_part text := split_part(object_name, '/', 1);
declare commissariat_part text := split_part(object_name, '/', 2);
declare submission_part text := split_part(object_name, '/', 3);
begin
  if event_part !~* '^[0-9a-f-]{36}$' or commissariat_part !~* '^[0-9a-f-]{36}$' or submission_part !~* '^[0-9a-f-]{36}$' then return false; end if;
  return exists (
    select 1 from public.commissariat_submissions s
    where s.id = submission_part::uuid and s.event_id = event_part::uuid and s.commissariat_id = commissariat_part::uuid
      and (select public.can_edit_commissariat_submission(s.id))
  );
end;
$$;

revoke all on function public.current_commissariat_id(), public.is_commissariat_member(uuid), public.can_read_commissariat_submission(uuid), public.can_edit_commissariat_submission(uuid), public.can_review_commissariat_submission(uuid), public.can_edit_commissariat_decision(uuid, text), public.can_read_commissariat_file(text), public.can_write_commissariat_file(text) from public;
grant execute on function public.current_commissariat_id(), public.is_commissariat_member(uuid), public.can_read_commissariat_submission(uuid), public.can_edit_commissariat_submission(uuid), public.can_review_commissariat_submission(uuid), public.can_edit_commissariat_decision(uuid, text), public.can_read_commissariat_file(text), public.can_write_commissariat_file(text) to authenticated;

alter table public.commissariat_submissions enable row level security;
alter table public.commissariat_submission_participants enable row level security;
alter table public.commissariat_submission_decisions enable row level security;
alter table public.commissariat_submission_internal_notes enable row level security;

create policy "commissariat_submissions_read_scoped" on public.commissariat_submissions for select to authenticated using ((select public.can_read_commissariat_submission(id)));
create policy "commissariat_submissions_update_draft_mandate" on public.commissariat_submissions for update to authenticated using ((select public.can_edit_commissariat_submission(id))) with check ((select public.can_edit_commissariat_submission(id)));
grant select on public.commissariat_submissions to authenticated;
grant update (mandate_path, updated_at) on public.commissariat_submissions to authenticated;
revoke all on public.commissariat_submissions from anon;

create policy "submission_participants_read_scoped" on public.commissariat_submission_participants for select to authenticated using ((select public.can_read_commissariat_submission(submission_id)));
create policy "submission_participants_insert_draft" on public.commissariat_submission_participants for insert to authenticated with check ((select public.can_edit_commissariat_submission(submission_id)) and created_by = (select auth.uid()));
create policy "submission_participants_update_draft" on public.commissariat_submission_participants for update to authenticated using ((select public.can_edit_commissariat_submission(submission_id))) with check ((select public.can_edit_commissariat_submission(submission_id)));
create policy "submission_participants_delete_draft" on public.commissariat_submission_participants for delete to authenticated using ((select public.can_edit_commissariat_submission(submission_id)));
grant select, insert, update, delete on public.commissariat_submission_participants to authenticated;
revoke all on public.commissariat_submission_participants from anon;

create policy "submission_decisions_read_scoped" on public.commissariat_submission_decisions for select to authenticated using (
  exists (
    select 1 from public.commissariat_submission_participants p
    join public.commissariat_submissions s on s.id = p.submission_id
    where p.id = submission_participant_id and (
      (select public.can_review_commissariat_submission(s.id)) or
      ((stage = 'administrative' and s.status = 'administrative_published' or stage = 'screening' and s.status = 'screening_published') and (select public.is_commissariat_member(s.commissariat_id)))
    )
  )
);
create policy "submission_decisions_insert_reviewer" on public.commissariat_submission_decisions for insert to authenticated with check ((select public.can_edit_commissariat_decision(submission_participant_id, stage)) and reviewed_by = (select auth.uid()));
create policy "submission_decisions_update_reviewer" on public.commissariat_submission_decisions for update to authenticated using ((select public.can_edit_commissariat_decision(submission_participant_id, stage))) with check ((select public.can_edit_commissariat_decision(submission_participant_id, stage)) and reviewed_by = (select auth.uid()));
grant select, insert, update on public.commissariat_submission_decisions to authenticated;
revoke all on public.commissariat_submission_decisions from anon;

create policy "submission_internal_notes_read_reviewer" on public.commissariat_submission_internal_notes for select to authenticated using (
  exists (select 1 from public.commissariat_submission_decisions d where d.id = decision_id and (select public.can_review_commissariat_submission((select submission_id from public.commissariat_submission_participants where id = d.submission_participant_id))))
);
create policy "submission_internal_notes_insert_reviewer" on public.commissariat_submission_internal_notes for insert to authenticated with check (
  updated_by = (select auth.uid()) and exists (select 1 from public.commissariat_submission_decisions d where d.id = decision_id and (select public.can_review_commissariat_submission((select submission_id from public.commissariat_submission_participants where id = d.submission_participant_id))))
);
create policy "submission_internal_notes_update_reviewer" on public.commissariat_submission_internal_notes for update to authenticated using (
  exists (select 1 from public.commissariat_submission_decisions d where d.id = decision_id and (select public.can_review_commissariat_submission((select submission_id from public.commissariat_submission_participants where id = d.submission_participant_id))))
) with check (updated_by = (select auth.uid()));
create policy "submission_internal_notes_delete_reviewer" on public.commissariat_submission_internal_notes for delete to authenticated using (
  exists (select 1 from public.commissariat_submission_decisions d where d.id = decision_id and (select public.can_review_commissariat_submission((select submission_id from public.commissariat_submission_participants where id = d.submission_participant_id))))
);
grant select, insert, update, delete on public.commissariat_submission_internal_notes to authenticated;
revoke all on public.commissariat_submission_internal_notes from anon;

create policy "events_read_commissariat_accounts" on public.events for select to authenticated using ((select public.current_commissariat_id()) is not null);
create policy "commissariats_read_member_self" on public.commissariats for select to authenticated using (id = (select public.current_commissariat_id()));

create or replace function public.create_commissariat_submission(p_event_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := (select auth.uid());
  commissariat_id_value uuid;
  submission_id_value uuid;
begin
  select commissariat_id into commissariat_id_value from public.profiles where id = actor_id and role = 'komisariat';
  if commissariat_id_value is null then raise exception 'Akun Komisariat belum ditautkan oleh Admin Sistem.'; end if;
  if not exists (select 1 from public.commissariats where id = commissariat_id_value and is_active) then raise exception 'Komisariat tidak aktif.'; end if;
  if not exists (select 1 from public.events where id = p_event_id and status in ('planned', 'ongoing')) then raise exception 'Kegiatan tidak tersedia untuk pengajuan.'; end if;
  insert into public.commissariat_submissions(event_id, commissariat_id, created_by)
  values (p_event_id, commissariat_id_value, actor_id) returning id into submission_id_value;
  return submission_id_value;
end;
$$;

create or replace function public.submit_commissariat_submission(p_submission_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  submission_row public.commissariat_submissions%rowtype;
begin
  select * into submission_row from public.commissariat_submissions where id = p_submission_id for update;
  if not found or not (select public.is_commissariat_member(submission_row.commissariat_id)) then raise exception 'Pengajuan tidak ditemukan atau akses ditolak.'; end if;
  if submission_row.status <> 'draft' then raise exception 'Pengajuan ini tidak lagi dapat dikirim.'; end if;
  if submission_row.mandate_path is null then raise exception 'Unggah Surat Mandat Komisariat terlebih dahulu.'; end if;
  if not exists (select 1 from public.commissariat_submission_participants where submission_id = p_submission_id) then raise exception 'Tambahkan setidaknya satu peserta.'; end if;
  update public.commissariat_submissions set status = 'submitted', submitted_at = now(), updated_at = now() where id = p_submission_id;
end;
$$;

create or replace function public.cancel_commissariat_submission(p_submission_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare current_status text;
declare commissariat_id_value uuid;
begin
  select status, commissariat_id into current_status, commissariat_id_value from public.commissariat_submissions where id = p_submission_id for update;
  if not found or not (select public.is_commissariat_member(commissariat_id_value)) then raise exception 'Pengajuan tidak ditemukan atau akses ditolak.'; end if;
  if current_status not in ('draft', 'submitted') then raise exception 'Pengajuan sudah ditinjau dan tidak dapat dibatalkan.'; end if;
  update public.commissariat_submissions set status = 'cancelled', updated_at = now() where id = p_submission_id;
end;
$$;

create or replace function public.start_commissariat_review(p_submission_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare event_id_value uuid;
declare submission_status text;
begin
  select event_id, status into event_id_value, submission_status from public.commissariat_submissions where id = p_submission_id for update;
  if not found or not (select public.can_review_commissariat_submission(p_submission_id)) then raise exception 'Pengajuan tidak ditemukan atau akses ditolak.'; end if;
  if submission_status <> 'submitted' then raise exception 'Pengajuan tidak dalam status menunggu tinjauan.'; end if;
  update public.commissariat_submissions set status = 'under_review', review_started_at = now(), updated_at = now() where id = p_submission_id;
end;
$$;

create or replace function public.publish_administrative_selection(p_submission_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare participant_count integer;
declare decision_count integer;
begin
  if not (select public.can_review_commissariat_submission(p_submission_id)) then raise exception 'Akses ditolak.'; end if;
  if not exists (select 1 from public.commissariat_submissions where id = p_submission_id and status = 'under_review') then raise exception 'Pengajuan tidak sedang ditinjau.'; end if;
  select count(*) into participant_count from public.commissariat_submission_participants where submission_id = p_submission_id;
  select count(*) into decision_count from public.commissariat_submission_decisions d join public.commissariat_submission_participants p on p.id = d.submission_participant_id where p.submission_id = p_submission_id and d.stage = 'administrative';
  if participant_count < 1 or decision_count <> participant_count then raise exception 'Tinjau semua peserta sebelum menerbitkan hasil.'; end if;
  update public.commissariat_submissions set status = 'administrative_published', administrative_published_at = now(), updated_at = now() where id = p_submission_id;
end;
$$;

revoke all on function public.create_commissariat_submission(uuid), public.submit_commissariat_submission(uuid), public.cancel_commissariat_submission(uuid), public.start_commissariat_review(uuid), public.publish_administrative_selection(uuid) from public;
grant execute on function public.create_commissariat_submission(uuid), public.submit_commissariat_submission(uuid), public.cancel_commissariat_submission(uuid), public.start_commissariat_review(uuid), public.publish_administrative_selection(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
('commissariat-mandates', 'commissariat-mandates', false, 10485760, array['application/pdf']::text[]),
('submission-photos', 'submission-photos', false, 5242880, array['image/jpeg', 'image/png']::text[])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "submission_files_read_scoped" on storage.objects for select to authenticated using (
  bucket_id in ('commissariat-mandates', 'submission-photos') and (select public.can_read_commissariat_file(name))
);
create policy "submission_files_insert_draft" on storage.objects for insert to authenticated with check (
  bucket_id in ('commissariat-mandates', 'submission-photos') and (select public.can_write_commissariat_file(name))
);
create policy "submission_files_update_draft" on storage.objects for update to authenticated using (
  bucket_id in ('commissariat-mandates', 'submission-photos') and (select public.can_write_commissariat_file(name))
) with check (
  bucket_id in ('commissariat-mandates', 'submission-photos') and (select public.can_write_commissariat_file(name))
);
create policy "submission_files_delete_draft" on storage.objects for delete to authenticated using (
  bucket_id in ('commissariat-mandates', 'submission-photos') and (select public.can_write_commissariat_file(name))
);
