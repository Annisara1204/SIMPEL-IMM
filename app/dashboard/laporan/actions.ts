"use server";
import { uuidPattern } from "@/lib/validation";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { asRow } from "@/lib/relations";
import type { ReportSnapshotData } from "@/lib/supabase-rows";

async function currentUser() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  return { supabase, userId, role: profile?.role ?? null };
}

async function assertEventActive(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
) {
  const { data: event, error } = await supabase
    .from("events")
    .select("archived_at")
    .eq("id", eventId)
    .maybeSingle();
  if (error || !event)
    throw new Error("Kegiatan tidak ditemukan atau akses ditolak.");
  if (event.archived_at)
    throw new Error("Kegiatan sudah diarsipkan. Pulihkan terlebih dahulu.");
}

export async function publishReport(formData: FormData) {
  const snapshotId = String(formData.get("snapshotId") ?? "");
  if (!uuidPattern.test(snapshotId))
    throw new Error("Snapshot rapor tidak valid.");
  const { supabase, role } = await currentUser();
  if (!["admin_system", "instruktur"].includes(role ?? ""))
    throw new Error("Akun tidak berwenang menerbitkan rapor.");
  const { data: snapshot } = await supabase
    .from("assessment_snapshots")
    .select("event_id")
    .eq("id", snapshotId)
    .maybeSingle();
  if (!snapshot) throw new Error("Snapshot rapor tidak ditemukan.");
  await assertEventActive(supabase, snapshot.event_id);
  const { error } = await supabase.rpc("publish_assessment_report", {
    target_snapshot_id: snapshotId,
  });
  if (error) throw new Error(error.message || "Rapor gagal diterbitkan.");
  revalidatePath("/dashboard/laporan");
}

export async function assignParticipantAccount(formData: FormData) {
  const participantId = String(formData.get("participantId") ?? "");
  const rawUserId = String(formData.get("userId") ?? "");
  const userId = rawUserId || null;
  if (!uuidPattern.test(participantId) || (userId && !uuidPattern.test(userId)))
    throw new Error("Akun peserta tidak valid.");
  const { supabase, role } = await currentUser();
  if (role !== "admin_system")
    throw new Error(
      "Hanya Admin Sistem yang dapat menghubungkan akun peserta.",
    );
  const { data: participant } = await supabase
    .from("participants")
    .select("event_id")
    .eq("id", participantId)
    .maybeSingle();
  if (!participant) throw new Error("Peserta tidak ditemukan.");
  await assertEventActive(supabase, participant.event_id);
  const { error } = await supabase.rpc("assign_participant_account", {
    target_participant_id: participantId,
    target_user_id: userId,
  });
  if (error) throw new Error(error.message || "Pengaitan akun peserta gagal.");
  revalidatePath("/dashboard/laporan");
}

export async function auditReportExport(input: {
  eventId: string;
  exportType:
    | "individual_pdf"
    | "bulk_pdf"
    | "assessment_excel"
    | "observer_excel"
    | "event_report_pdf";
  filters?: Record<string, string>;
}) {
  if (
    !input ||
    !uuidPattern.test(input.eventId) ||
    ![
      "individual_pdf",
      "bulk_pdf",
      "assessment_excel",
      "observer_excel",
      "event_report_pdf",
    ].includes(input.exportType)
  )
    throw new Error("Permintaan ekspor tidak valid.");
  const { supabase, userId, role } = await currentUser();
  let isAssignedCoordinator = false;
  if (role === "instruktur") {
    const { data: assignment } = await supabase
      .from("instructor_event_assignments")
      .select("instructor_id")
      .eq("event_id", input.eventId)
      .eq("instructor_id", userId)
      .in("position", ["mot", "vice_mot", "master_observer", "vice_observer"])
      .limit(1)
      .maybeSingle();
    isAssignedCoordinator = assignment !== null;
  }
  if (
    role !== "admin_system" &&
    !isAssignedCoordinator &&
    !(role === "peserta" && input.exportType === "individual_pdf")
  )
    throw new Error("Akun tidak berwenang mengekspor laporan kegiatan.");
  await assertEventActive(supabase, input.eventId);
  const { error } = await supabase.rpc("record_assessment_export", {
    target_event_id: input.eventId,
    target_export_type: input.exportType,
    target_filters: input.filters ?? {},
  });
  if (error) throw new Error(error.message || "Audit ekspor gagal disimpan.");
}

/**
 * Snapshot penuh untuk PDF/ZIP. Halaman Laporan mengirim hanya DTO ringkas;
 * fungsi dipanggil saat ekspor. RLS tabel assessment_snapshots sendiri yang
 * membatasi hasil ke Admin Sistem dan koordinator kegiatan yang ditugaskan.
 */
export async function loadReportSnapshots(
  snapshotIds: string[],
): Promise<Record<string, ReportSnapshotData>> {
  const ids = [...new Set(snapshotIds.filter((id) => uuidPattern.test(id)))];
  if (!ids.length) return {};
  const supabase = await createClient();
  const { data } = await supabase
    .from("assessment_snapshots")
    .select("id,event_id,snapshot_data")
    .in("id", ids);
  const eventIds = [...new Set((data ?? []).map((row) => row.event_id))];
  const { data: events } = eventIds.length
    ? await supabase.from("events").select("id,archived_at").in("id", eventIds)
    : { data: [] };
  const archivedIds = new Set(
    (events ?? [])
      .filter((event) => event.archived_at)
      .map((event) => event.id),
  );
  const result: Record<string, ReportSnapshotData> = {};
  for (const row of data ?? []) {
    if (!archivedIds.has(row.event_id)) {
      const snapshot = asRow<ReportSnapshotData>(
        row.snapshot_data,
        (value) =>
          "schemaVersion" in value ||
          "aspects" in value ||
          "indicators" in value,
      );
      if (snapshot) result[row.id] = snapshot;
    }
  }
  return result;
}
