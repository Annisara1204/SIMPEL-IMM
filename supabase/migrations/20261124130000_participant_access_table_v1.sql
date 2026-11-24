-- Prasarana Fase 3d. Tabel ini dibuat tanpa akun, kredensial, atau RPC.
-- Fase 3d tetap ditunda karena pemilik memutuskan memakai IP tanpa TLS.
create table if not exists public.participant_access (
  participant_id uuid primary key references public.participants(id) on delete restrict,
  account_user_id uuid,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  must_change_password boolean not null default true,
  linked_at timestamptz not null default now(),
  password_changed_at timestamptz,
  encrypted_password_at_link text
);

create unique index if not exists participant_access_account_user_unique
  on public.participant_access(account_user_id)
  where account_user_id is not null;

alter table public.participant_access enable row level security;
revoke all on public.participant_access from authenticated, anon;

comment on table public.participant_access is
  'Prasarana akses Peserta. Belum dipakai sampai domain dan TLS tersedia.';
