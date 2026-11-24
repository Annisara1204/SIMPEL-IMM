-- FASE 4 -- entri 4 dan 5 docs/INVENTARIS-JALUR-LAMA.md
--
-- Alasan: dua tabel status lama di bawah sudah tidak dibaca aplikasi. Pemeriksaan
-- grep seluruh repo (24 November 2026) menemukan nama keduanya hanya di docs/ dan
-- supabase/migrations/. Tidak ada referensi di app/, lib/, components/, lib/supabase-rows.ts,
-- atau RPC aktif. Status yang sama tercatat lebih rinci di
-- public.observer_rubric_version_completions.
--
-- Yang sengaja TIDAK dihapus:
--   * public.observer_rubric_version_completions. Masih dibaca oleh
--     lib/dashboard-results.ts:87 (dipakai /dashboard/profil-peserta dan fallback
--     /dashboard) serta RPC dashboard lama, dan masih dihapus oleh trigger.
--   * Tiga trigger yang masih menjalankan logika status:
--       observations_reopen_assignments      on public.observations
--       rubric_status_reopens_assignments    on public.rubric_versions
--       observer_notes_reopen_completions    on public.observer_notes
--     Trigger ini TIDAK di-drop. Isi fungsinya saja yang ditulis ulang untuk
--     membuang DELETE ke dua tabel yang dihapus. DELETE ke
--     observer_rubric_version_completions dipertahankan persis seperti semula.
--     Tanpa penulisan ulang ini, setiap INSERT/UPDATE pada observer_notes atau
--     observations akan menghasilkan "relation does not exist" saat trigger jalan.
--   * Tabel observations, observer_notes, rubric_versions, dan objek lain tidak
--     disentuh. Tidak ada trigger yang secara eksplisit hanya melayani kedua tabel
--     yang dihapus, jadi tidak ada trigger yang dihapus di migrasi ini.
--
-- Asumsi yang belum diverifikasi: tidak ada klien di luar repo yang masih memakai
-- policy RLS baca langsung pada kedua tabel ini. Riwayat status lama ikut hilang,
-- sesuai rekomendasi inventaris. Migrasi ini hanya disiapkan, belum dijalankan.

-- 1. Fungsi trigger: buang hanya DELETE ke tabel yang akan dihapus.
create or replace function public.reopen_observer_assignments_on_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_event_id uuid; target_version_id uuid;
begin
  if tg_op = 'INSERT' or old.score is distinct from new.score then
    select event_id into target_event_id from public.participants where id = new.participant_id;
    select distinct version.id into target_version_id
    from public.rubric_indicator_aspects mapping
    join public.rubric_aspects aspect on aspect.id = mapping.aspect_id
    join public.rubric_versions version on version.id = aspect.rubric_version_id
    where mapping.indicator_id = new.indicator_id;
    delete from public.observer_rubric_version_completions completion
    using public.observer_assignments assignment
    where completion.assignment_id = assignment.id and assignment.event_id = target_event_id
      and completion.rubric_version_id = target_version_id;
  end if;
  return new;
end;
$$;

create or replace function public.reopen_observer_assignments_on_note_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_event_id uuid;
begin
  if tg_op = 'INSERT' or (tg_op = 'UPDATE' and old.content is distinct from new.content) then
    select event_id into target_event_id from public.participants where id = new.participant_id;
    delete from public.observer_rubric_version_completions completion
    using public.observer_assignments assignment
    where completion.assignment_id = assignment.id and assignment.event_id = target_event_id
      and completion.rubric_version_id = new.rubric_version_id;
  end if;
  return new;
end;
$$;

create or replace function public.reopen_assignments_on_rubric_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status is distinct from new.status and (old.status = 'active' or new.status = 'active') then
    delete from public.observer_rubric_version_completions where rubric_version_id = new.id;
  end if;
  return new;
end;
$$;

-- 2. Policy milik kedua tabel lama.
drop policy if exists "assignment_completion_read_event_staff" on public.observer_assignment_completions;
drop policy if exists "assignment_completion_insert_self" on public.observer_assignment_completions;
drop policy if exists "assignment_completion_update_self" on public.observer_assignment_completions;
drop policy if exists "assignment_completion_delete_self" on public.observer_assignment_completions;

drop policy if exists observer_rubric_completions_read_scoped on public.observer_rubric_completions;
drop policy if exists observer_rubric_completions_insert_self on public.observer_rubric_completions;
drop policy if exists observer_rubric_completions_update_self on public.observer_rubric_completions;
drop policy if exists observer_rubric_completions_delete_self on public.observer_rubric_completions;

-- 3. Tabel lama. Index observer_rubric_completions_type_idx dan grant ikut hilang bersama tabel.
drop table if exists public.observer_rubric_completions;
drop table if exists public.observer_assignment_completions;
