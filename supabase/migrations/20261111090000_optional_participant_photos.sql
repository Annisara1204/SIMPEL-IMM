-- Foto peserta menjadi pilihan; profil peserta tetap dapat disimpan tanpa foto.
alter table public.commissariat_submission_participants
  alter column photo_path drop not null;
