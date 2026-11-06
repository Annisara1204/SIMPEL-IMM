-- Nama sama dalam Komisariat yang sama boleh terjadi pada dua orang berbeda.
-- Peringatan duplikat kelak ditampilkan pada preview pengajuan, bukan ditolak basis data.
alter table public.participants
drop constraint if exists participants_event_id_display_name_commissariat_key;
