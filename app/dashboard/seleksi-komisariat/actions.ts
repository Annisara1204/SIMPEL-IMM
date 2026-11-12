"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f-]{36}$/i;

async function reviewerClient() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (!profile || !["observer", "admin_system"].includes(profile.role))
    throw new Error(
      "Akses hanya untuk Observer yang ditugaskan atau Admin Sistem.",
    );
  return { supabase, userId };
}

export async function startReview(formData: FormData) {
  const { supabase } = await reviewerClient();
  const submissionId = String(formData.get("submissionId") ?? "");
  if (!uuidPattern.test(submissionId))
    throw new Error("ID pengajuan tidak valid.");
  const { error } = await supabase.rpc("start_commissariat_review", {
    p_submission_id: submissionId,
  });
  if (error) throw new Error(error.message || "Tinjauan gagal dimulai.");
  revalidatePath("/dashboard/seleksi-komisariat");
  revalidatePath("/dashboard/pengajuan");
}

export async function saveAdministrativeDecision(formData: FormData) {
  const { supabase, userId } = await reviewerClient();
  const participantId = String(formData.get("participantId") ?? "");
  const status = String(formData.get("status") ?? "");
  const reason = String(formData.get("publicReason") ?? "").trim();
  const note = String(formData.get("internalNote") ?? "").trim();
  if (!uuidPattern.test(participantId) || !["pass", "fail"].includes(status))
    throw new Error("Keputusan tidak valid.");
  if (reason.length > 500 || note.length > 2000)
    throw new Error("Catatan melebihi batas karakter.");
  if (status === "fail" && reason.length < 3)
    throw new Error("Isi alasan singkat yang akan terlihat oleh Komisariat.");
  const { data: participant, error: participantError } = await supabase
    .from("commissariat_submission_participants")
    .select("id, submission_id")
    .eq("id", participantId)
    .maybeSingle();
  if (participantError || !participant)
    throw new Error("Peserta tidak ditemukan atau akses ditolak.");
  const { data: submission } = await supabase
    .from("commissariat_submissions")
    .select("id, status")
    .eq("id", participant.submission_id)
    .maybeSingle();
  if (!submission || submission.status !== "under_review")
    throw new Error("Pengajuan tidak sedang ditinjau.");
  const { data: decision, error } = await supabase
    .from("commissariat_submission_decisions")
    .upsert(
      {
        submission_participant_id: participantId,
        stage: "administrative",
        status,
        public_reason: status === "fail" ? reason : null,
        reviewed_by: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "submission_participant_id,stage" },
    )
    .select("id")
    .single();
  if (error || !decision)
    throw new Error(error?.message || "Keputusan gagal disimpan.");
  const { data: existingNote } = await supabase
    .from("commissariat_submission_internal_notes")
    .select("id")
    .eq("decision_id", decision.id)
    .maybeSingle();
  if (note) {
    const noteResult = existingNote
      ? await supabase
          .from("commissariat_submission_internal_notes")
          .update({
            note,
            updated_by: userId,
            updated_at: new Date().toISOString(),
          })
          .eq("decision_id", decision.id)
      : await supabase
          .from("commissariat_submission_internal_notes")
          .insert({ decision_id: decision.id, note, updated_by: userId });
    if (noteResult.error) throw new Error("Catatan internal gagal disimpan.");
  } else if (existingNote) {
    const { error: removeError } = await supabase
      .from("commissariat_submission_internal_notes")
      .delete()
      .eq("decision_id", decision.id);
    if (removeError) throw new Error("Catatan internal gagal dihapus.");
  }
  revalidatePath("/dashboard/seleksi-komisariat");
}

export async function publishAdministrativeResults(formData: FormData) {
  const { supabase } = await reviewerClient();
  const submissionId = String(formData.get("submissionId") ?? "");
  if (!uuidPattern.test(submissionId))
    throw new Error("ID pengajuan tidak valid.");
  const { error } = await supabase.rpc("publish_administrative_selection", {
    p_submission_id: submissionId,
  });
  if (error) throw new Error(error.message || "Hasil belum dapat diterbitkan.");
  revalidatePath("/dashboard/seleksi-komisariat");
  revalidatePath("/dashboard/pengajuan");
}
