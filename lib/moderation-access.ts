import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Satu-satunya penentu akses moderasi untuk satu kegiatan.
 * Memanggil fungsi basis data yang sama dengan gate Server Action dan RLS,
 * sehingga halaman dan server memakai aturan yang identik.
 */
export async function isEventModerator(
  supabase: SupabaseClient,
  eventId: string | undefined | null,
): Promise<boolean> {
  if (!eventId) return false;
  const { data, error } = await supabase.rpc("is_assessment_moderator", {
    target_event_id: eventId,
  });
  return !error && data === true;
}
