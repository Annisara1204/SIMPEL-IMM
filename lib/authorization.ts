import { redirect } from "next/navigation";
import { uuidPattern } from "@/lib/validation";
import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/** Observer hanya boleh bertindak pada kegiatan yang ditugaskan. Admin lolos. */
export async function assertEventAssignment(
  supabase: SupabaseClient,
  userId: string,
  role: string | null,
  eventId: string,
  actionLabel: string,
) {
  if (!uuidPattern.test(eventId)) throw new Error("Kegiatan tidak valid.");
  if (role === "admin_system") return;
  const { data: assignment, error } = await supabase
    .from("observer_assignments")
    .select("id")
    .eq("event_id", eventId)
    .eq("observer_id", userId)
    .maybeSingle();
  if (error || !assignment)
    throw new Error(
      `Anda hanya dapat ${actionLabel} pada kegiatan yang ditugaskan.`,
    );
}

/** Admin Sistem atau koordinator instruktur yang ditugaskan pada kegiatan. */
export async function requireModerator(eventId: string) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");
  const { data: allowed, error } = await supabase.rpc(
    "is_assessment_moderator",
    { target_event_id: eventId },
  );
  if (error || allowed !== true)
    throw new Error(
      "Hanya Admin Sistem atau koordinator instruktur kegiatan yang dapat memoderasi hasil.",
    );
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("archived_at")
    .eq("id", eventId)
    .maybeSingle();
  if (eventError || !event)
    throw new Error("Kegiatan tidak ditemukan atau akses ditolak.");
  if (event.archived_at)
    throw new Error("Kegiatan sudah diarsipkan. Pulihkan terlebih dahulu.");
  return { supabase, userId };
}
