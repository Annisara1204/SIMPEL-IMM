"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  instructorDuties,
  instructorPositions,
  type InstructorPosition,
} from "@/lib/instructor-roles";
import { staffClient } from "./internal";

export async function assignObserver(formData: FormData) {
  const { supabase, userId } = await staffClient([
    "admin_system",
    "bidang_kader",
  ]);
  const eventId = String(formData.get("eventId") ?? "");
  const observerId = String(formData.get("observerId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(eventId) || !/^[0-9a-f-]{36}$/i.test(observerId))
    throw new Error("Kegiatan atau akun Observer tidak valid.");
  const { data: observer } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", observerId)
    .eq("role", "observer")
    .maybeSingle();
  if (!observer) throw new Error("Pilih akun yang memiliki role Observer.");
  const { data: existingAssignment, error: existingError } = await supabase
    .from("observer_assignments")
    .select("id")
    .eq("event_id", eventId)
    .eq("observer_id", observerId)
    .maybeSingle();
  if (existingError)
    redirect(
      `/dashboard/penilaian?eventId=${encodeURIComponent(eventId)}&assignment=error`,
    );
  if (existingAssignment)
    redirect(
      `/dashboard/penilaian?eventId=${encodeURIComponent(eventId)}&assignment=already`,
    );
  const { error } = await supabase.from("observer_assignments").insert({
    event_id: eventId,
    observer_id: observerId,
    assigned_by: userId,
  });
  if (error?.code === "23505")
    redirect(
      `/dashboard/penilaian?eventId=${encodeURIComponent(eventId)}&assignment=already`,
    );
  if (error)
    redirect(
      `/dashboard/penilaian?eventId=${encodeURIComponent(eventId)}&assignment=error`,
    );
  revalidatePath("/dashboard/penilaian");
  revalidatePath("/dashboard/observasi");
  redirect(
    `/dashboard/penilaian?eventId=${encodeURIComponent(eventId)}&assignment=success`,
  );
}

export async function removeObserverAssignment(formData: FormData) {
  const { supabase } = await staffClient(["admin_system", "bidang_kader"]);
  const assignmentId = String(formData.get("assignmentId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(assignmentId))
    throw new Error("Penugasan tidak valid.");
  const { error } = await supabase
    .from("observer_assignments")
    .delete()
    .eq("id", assignmentId);
  if (error) throw new Error("Penugasan gagal dihapus.");
  revalidatePath("/dashboard/penilaian");
  revalidatePath("/dashboard/observasi");
}

export async function assignInstructorEvent(formData: FormData) {
  const { supabase, userId } = await staffClient(["admin_system"]);
  const eventId = String(formData.get("eventId") ?? "");
  const instructorId = String(formData.get("instructorId") ?? "");
  const position = String(formData.get("position") ?? "") as InstructorPosition;
  if (
    !/^[0-9a-f-]{36}$/i.test(eventId) ||
    !/^[0-9a-f-]{36}$/i.test(instructorId) ||
    !instructorPositions.some((item) => item.id === position)
  )
    throw new Error("Kegiatan, akun, atau subrole Instruktur tidak valid.");
  const { data: instructor } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", instructorId)
    .eq("role", "instruktur")
    .maybeSingle();
  if (!instructor) throw new Error("Pilih akun dengan role Instruktur.");
  const { data: assignment, error } = await supabase
    .from("instructor_event_assignments")
    .insert({
      event_id: eventId,
      instructor_id: instructorId,
      assigned_by: userId,
      position,
    })
    .select("id")
    .single();
  if (error?.code === "23505")
    throw new Error(
      "Akun tersebut sudah mendapat subrole itu pada kegiatan ini.",
    );
  if (error || !assignment)
    throw new Error("Penugasan Instruktur gagal disimpan.");
  const { error: dutyError } = await supabase
    .from("instructor_duty_items")
    .insert(
      instructorDuties[position].map((title) => ({
        instructor_assignment_id: assignment.id,
        title,
      })),
    );
  if (dutyError) {
    await supabase
      .from("instructor_event_assignments")
      .delete()
      .eq("id", assignment.id);
    throw new Error(
      "Daftar tugas subrole gagal dibuat. Pastikan migrasi Instruktur terbaru sudah dijalankan.",
    );
  }
  revalidatePath("/dashboard/penilaian");
  revalidatePath("/dashboard");
}

export async function removeInstructorEventAssignment(formData: FormData) {
  const { supabase } = await staffClient(["admin_system"]);
  const assignmentId = String(formData.get("assignmentId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(assignmentId))
    throw new Error("Penugasan tidak valid.");
  const { error } = await supabase
    .from("instructor_event_assignments")
    .delete()
    .eq("id", assignmentId);
  if (error) throw new Error("Penugasan Instruktur gagal dihapus.");
  revalidatePath("/dashboard/penilaian");
  revalidatePath("/dashboard");
}

export async function updateInstructorDutyItem(formData: FormData) {
  const { supabase, userId } = await staffClient(["instruktur"]);
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const dutyItemId = String(formData.get("dutyItemId") ?? "");
  const isDone = formData.get("isDone") === "on";
  if (
    !/^[0-9a-f-]{36}$/i.test(assignmentId) ||
    !/^[0-9a-f-]{36}$/i.test(dutyItemId)
  )
    throw new Error("Tugas tidak valid.");
  const { data: assignment } = await supabase
    .from("instructor_event_assignments")
    .select("id")
    .eq("id", assignmentId)
    .eq("instructor_id", userId)
    .maybeSingle();
  if (!assignment)
    throw new Error("Tugas ini tidak diberikan kepada akun Anda.");
  const { error } = await supabase
    .from("instructor_duty_items")
    .update({ is_done: isDone, updated_at: new Date().toISOString() })
    .eq("id", dutyItemId)
    .eq("instructor_assignment_id", assignmentId);
  if (error)
    throw new Error(
      "Status tugas gagal diperbarui. Pastikan migrasi subrole Instruktur sudah dijalankan.",
    );
  revalidatePath("/dashboard");
}

export async function completeObserverAssignment(formData: FormData) {
  const { supabase, userId } = await staffClient(["observer"]);
  const eventId = String(formData.get("eventId") ?? "");
  const versionId = String(formData.get("versionId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(eventId) || !/^[0-9a-f-]{36}$/i.test(versionId))
    throw new Error("Kegiatan atau rubrik tidak valid.");
  const { data: assignment, error: assignmentError } = await supabase
    .from("observer_assignments")
    .select("id")
    .eq("event_id", eventId)
    .eq("observer_id", userId)
    .maybeSingle();
  if (assignmentError || !assignment)
    throw new Error("Anda tidak ditugaskan pada kegiatan ini.");
  const { data: activeVersion } = await supabase
    .from("rubric_versions")
    .select("id")
    .eq("id", versionId)
    .eq("event_id", eventId)
    .eq("status", "active")
    .maybeSingle();
  if (!activeVersion)
    throw new Error("Rubrik ini tidak aktif untuk kegiatan tersebut.");
  const { error } = await supabase
    .from("observer_rubric_version_completions")
    .upsert(
      {
        assignment_id: assignment.id,
        rubric_version_id: versionId,
        completed_by: userId,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "assignment_id,rubric_version_id" },
    );
  if (error)
    throw new Error(
      "Status selesai gagal disimpan. Pastikan migrasi Tahap 4 terbaru sudah dijalankan.",
    );
  revalidatePath("/dashboard/observasi");
}

export async function reopenObserverAssignment(formData: FormData) {
  const { supabase, userId } = await staffClient(["observer"]);
  const eventId = String(formData.get("eventId") ?? "");
  const versionId = String(formData.get("versionId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(eventId) || !/^[0-9a-f-]{36}$/i.test(versionId))
    throw new Error("Kegiatan atau rubrik tidak valid.");
  const { data: assignment } = await supabase
    .from("observer_assignments")
    .select("id")
    .eq("event_id", eventId)
    .eq("observer_id", userId)
    .maybeSingle();
  if (!assignment) throw new Error("Anda tidak ditugaskan pada kegiatan ini.");
  const { error } = await supabase
    .from("observer_rubric_version_completions")
    .delete()
    .eq("assignment_id", assignment.id)
    .eq("rubric_version_id", versionId);
  if (error) throw new Error("Status selesai gagal dibuka kembali.");
  revalidatePath("/dashboard/observasi");
}
