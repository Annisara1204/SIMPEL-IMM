"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function staffClient(roles: string[]) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (!profile || !roles.includes(profile.role ?? "")) throw new Error("Akses ditolak.");
  return { supabase, userId };
}

export async function createRubricVersion(formData: FormData) {
  const { supabase, userId } = await staffClient(["admin_system"]);
  const eventId = String(formData.get("eventId") ?? "");
  const stage = String(formData.get("stage") ?? "");
  const assessmentTypeId = String(formData.get("assessmentTypeId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(eventId) || !["screening", "training"].includes(stage) || !/^[0-9a-f-]{36}$/i.test(assessmentTypeId)) throw new Error("Kegiatan, tahap, atau jenis penilaian tidak valid.");
  const { data: type } = await supabase.from("rubric_assessment_types").select("id").eq("id", assessmentTypeId).eq("event_id", eventId).eq("stage", stage).maybeSingle();
  if (!type) throw new Error("Jenis penilaian tidak ditemukan pada tahap ini.");
  const { data: versions, error: readError } = await supabase.from("rubric_versions").select("id, version, status, rubric_aspects(id, name, weight, position, rubric_indicators(name, weight, target, position))").eq("event_id", eventId).eq("stage", stage).eq("assessment_type_id", assessmentTypeId).order("version", { ascending: false }).limit(1);
  if (readError) throw new Error("Versi rubrik belum dapat dibaca. Jalankan migrasi Tahap 4.");
  if (versions?.[0]?.status === "draft") throw new Error("Selesaikan atau hapus draf yang sedang berjalan terlebih dahulu.");
  const { data: created, error } = await supabase.from("rubric_versions").insert({ event_id: eventId, stage, assessment_type_id: assessmentTypeId, version: (versions?.[0]?.version ?? 0) + 1, status: "draft", created_by: userId }).select("id").single();
  if (error) throw new Error("Versi baru gagal dibuat.");
  for (const aspect of versions?.[0]?.rubric_aspects ?? []) {
    const { data: copiedAspect, error: aspectError } = await supabase.from("rubric_aspects").insert({ rubric_version_id: created.id, name: aspect.name, weight: aspect.weight, position: aspect.position }).select("id").single();
    if (aspectError) { await supabase.from("rubric_versions").delete().eq("id", created.id); throw new Error("Aspek versi sebelumnya gagal disalin ke draf baru."); }
    if (aspect.rubric_indicators.length) {
      const { error: indicatorsError } = await supabase.from("rubric_indicators").insert(aspect.rubric_indicators.map((indicator) => ({ aspect_id: copiedAspect.id, name: indicator.name, weight: indicator.weight, target: indicator.target, position: indicator.position })));
      if (indicatorsError) { await supabase.from("rubric_versions").delete().eq("id", created.id); throw new Error("Indikator versi sebelumnya gagal disalin ke draf baru."); }
    }
  }
  revalidatePath("/dashboard/penilaian");
}

export async function createAssessmentType(formData: FormData) {
  const { supabase } = await staffClient(["admin_system"]);
  const eventId = String(formData.get("eventId") ?? "");
  const stage = String(formData.get("stage") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(eventId) || !["screening", "training"].includes(stage) || name.length < 2 || name.length > 80) throw new Error("Nama jenis penilaian atau tahap tidak valid.");
  const { data: previous } = await supabase.from("rubric_assessment_types").select("position").eq("event_id", eventId).eq("stage", stage).order("position", { ascending: false }).limit(1);
  const { error } = await supabase.from("rubric_assessment_types").insert({ event_id: eventId, stage, name, position: (previous?.[0]?.position ?? -1) + 1 });
  if (error) throw new Error("Jenis penilaian gagal ditambahkan. Periksa apakah nama sudah ada.");
  revalidatePath("/dashboard/penilaian");
}

export async function addAspect(formData: FormData) {
  const { supabase } = await staffClient(["admin_system"]);
  const versionId = String(formData.get("versionId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const weight = Number(formData.get("weight"));
  if (!/^[0-9a-f-]{36}$/i.test(versionId) || name.length < 2 || name.length > 120 || !Number.isFinite(weight) || weight <= 0 || weight > 100) throw new Error("Nama atau bobot aspek tidak valid.");
  const { data: aspects } = await supabase.from("rubric_aspects").select("position").eq("rubric_version_id", versionId).order("position", { ascending: false }).limit(1);
  const { error } = await supabase.from("rubric_aspects").insert({ rubric_version_id: versionId, name, weight, position: (aspects?.[0]?.position ?? -1) + 1 });
  if (error) throw new Error("Aspek gagal ditambahkan. Pastikan versi masih berupa draf dan nama tidak duplikat.");
  revalidatePath("/dashboard/penilaian");
}

export async function editAspect(formData: FormData) {
  const { supabase } = await staffClient(["admin_system"]);
  const id = String(formData.get("aspectId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const weight = Number(formData.get("weight"));
  if (!/^[0-9a-f-]{36}$/i.test(id) || name.length < 2 || name.length > 120 || !Number.isFinite(weight) || weight <= 0 || weight > 100) throw new Error("Nama atau bobot aspek tidak valid.");
  const { error } = await supabase.from("rubric_aspects").update({ name, weight }).eq("id", id);
  if (error) throw new Error("Perubahan aspek gagal disimpan. Versi harus masih berupa draf.");
  revalidatePath("/dashboard/penilaian");
}

export async function addIndicator(formData: FormData) {
  const { supabase } = await staffClient(["admin_system"]);
  const aspectId = String(formData.get("aspectId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const target = String(formData.get("target") ?? "").trim();
  const weight = Number(formData.get("weight"));
  if (!/^[0-9a-f-]{36}$/i.test(aspectId) || name.length < 2 || name.length > 200 || target.length > 300 || !Number.isFinite(weight) || weight <= 0 || weight > 100) throw new Error("Nama, target, atau bobot indikator tidak valid.");
  const { data: indicators } = await supabase.from("rubric_indicators").select("position").eq("aspect_id", aspectId).order("position", { ascending: false }).limit(1);
  const { error } = await supabase.from("rubric_indicators").insert({ aspect_id: aspectId, name, target: target || null, weight, position: (indicators?.[0]?.position ?? -1) + 1 });
  if (error) throw new Error("Indikator gagal ditambahkan. Pastikan versinya masih draf dan nama tidak duplikat.");
  revalidatePath("/dashboard/penilaian");
}

export async function editIndicator(formData: FormData) {
  const { supabase } = await staffClient(["admin_system"]);
  const id = String(formData.get("indicatorId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const target = String(formData.get("target") ?? "").trim();
  const weight = Number(formData.get("weight"));
  if (!/^[0-9a-f-]{36}$/i.test(id) || name.length < 2 || name.length > 200 || target.length > 300 || !Number.isFinite(weight) || weight <= 0 || weight > 100) throw new Error("Nama, target, atau bobot indikator tidak valid.");
  const { error } = await supabase.from("rubric_indicators").update({ name, target: target || null, weight }).eq("id", id);
  if (error) throw new Error("Perubahan indikator gagal disimpan. Versi harus masih berupa draf.");
  revalidatePath("/dashboard/penilaian");
}

export async function assignObserver(formData: FormData) {
  const { supabase, userId } = await staffClient(["admin_system", "bidang_kader"]);
  const eventId = String(formData.get("eventId") ?? "");
  const observerId = String(formData.get("observerId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(eventId) || !/^[0-9a-f-]{36}$/i.test(observerId)) throw new Error("Kegiatan atau akun Observer tidak valid.");
  const { data: observer } = await supabase.from("profiles").select("id").eq("id", observerId).eq("role", "observer").maybeSingle();
  if (!observer) throw new Error("Pilih akun yang memiliki role Observer.");
  const { data: existingAssignment, error: existingError } = await supabase.from("observer_assignments").select("id").eq("event_id", eventId).eq("observer_id", observerId).maybeSingle();
  if (existingError) redirect(`/dashboard/penilaian?eventId=${encodeURIComponent(eventId)}&assignment=error`);
  if (existingAssignment) redirect(`/dashboard/penilaian?eventId=${encodeURIComponent(eventId)}&assignment=already`);
  const { error } = await supabase.from("observer_assignments").insert({ event_id: eventId, observer_id: observerId, assigned_by: userId });
  if (error?.code === "23505") redirect(`/dashboard/penilaian?eventId=${encodeURIComponent(eventId)}&assignment=already`);
  if (error) redirect(`/dashboard/penilaian?eventId=${encodeURIComponent(eventId)}&assignment=error`);
  revalidatePath("/dashboard/penilaian");
  revalidatePath("/dashboard/observasi");
  redirect(`/dashboard/penilaian?eventId=${encodeURIComponent(eventId)}&assignment=success`);
}

export async function removeObserverAssignment(formData: FormData) {
  const { supabase } = await staffClient(["admin_system", "bidang_kader"]);
  const assignmentId = String(formData.get("assignmentId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(assignmentId)) throw new Error("Penugasan tidak valid.");
  const { error } = await supabase.from("observer_assignments").delete().eq("id", assignmentId);
  if (error) throw new Error("Penugasan gagal dihapus.");
  revalidatePath("/dashboard/penilaian");
  revalidatePath("/dashboard/observasi");
}

export async function completeObserverAssignment(formData: FormData) {
  const { supabase, userId } = await staffClient(["observer"]);
  const eventId = String(formData.get("eventId") ?? "");
  const assessmentTypeId = String(formData.get("assessmentTypeId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(eventId) || !/^[0-9a-f-]{36}$/i.test(assessmentTypeId)) throw new Error("Kegiatan atau jenis penilaian tidak valid.");
  const { data: assignment, error: assignmentError } = await supabase.from("observer_assignments").select("id").eq("event_id", eventId).eq("observer_id", userId).maybeSingle();
  if (assignmentError || !assignment) throw new Error("Anda tidak ditugaskan pada kegiatan ini.");
  const { data: activeType } = await supabase.from("rubric_versions").select("id").eq("event_id", eventId).eq("assessment_type_id", assessmentTypeId).eq("status", "active").maybeSingle();
  if (!activeType) throw new Error("Jenis penilaian ini belum memiliki rubrik aktif.");
  const { error } = await supabase.from("observer_rubric_completions").upsert({ assignment_id: assignment.id, assessment_type_id: assessmentTypeId, completed_by: userId, completed_at: new Date().toISOString() }, { onConflict: "assignment_id,assessment_type_id" });
  if (error) throw new Error("Status selesai gagal disimpan. Pastikan migrasi Tahap 4 terbaru sudah dijalankan.");
  revalidatePath("/dashboard/observasi");
}

export async function reopenObserverAssignment(formData: FormData) {
  const { supabase, userId } = await staffClient(["observer"]);
  const eventId = String(formData.get("eventId") ?? "");
  const assessmentTypeId = String(formData.get("assessmentTypeId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(eventId) || !/^[0-9a-f-]{36}$/i.test(assessmentTypeId)) throw new Error("Kegiatan atau jenis penilaian tidak valid.");
  const { data: assignment } = await supabase.from("observer_assignments").select("id").eq("event_id", eventId).eq("observer_id", userId).maybeSingle();
  if (!assignment) throw new Error("Anda tidak ditugaskan pada kegiatan ini.");
  const { error } = await supabase.from("observer_rubric_completions").delete().eq("assignment_id", assignment.id).eq("assessment_type_id", assessmentTypeId);
  if (error) throw new Error("Status selesai gagal dibuka kembali.");
  revalidatePath("/dashboard/observasi");
}

export async function activateRubric(formData: FormData) {
  const { supabase } = await staffClient(["admin_system"]);
  const versionId = String(formData.get("versionId") ?? "");
  const { data: aspects, error } = await supabase.from("rubric_aspects").select("id, weight, rubric_indicators(id, weight)").eq("rubric_version_id", versionId);
  if (error || !aspects?.length) throw new Error("Tambahkan aspek dan indikator sebelum mengaktifkan rubrik.");
  const close = (n: number) => Math.abs(n - 100) < 0.001;
  if (!close(aspects.reduce((sum, aspect) => sum + Number(aspect.weight), 0)) || aspects.some((aspect) => !aspect.rubric_indicators.length || !close(aspect.rubric_indicators.reduce((sum, indicator) => sum + Number(indicator.weight), 0)))) throw new Error("Bobot antar-aspek dan bobot indikator di setiap aspek masing-masing harus berjumlah 100%.");
  const { data: version } = await supabase.from("rubric_versions").select("event_id, stage, assessment_type_id").eq("id", versionId).eq("status", "draft").maybeSingle();
  if (!version) throw new Error("Versi draf tidak ditemukan.");
  const { error: archiveError } = await supabase.from("rubric_versions").update({ status: "archived" }).eq("event_id", version.event_id).eq("stage", version.stage).eq("assessment_type_id", version.assessment_type_id).eq("status", "active");
  if (archiveError) throw new Error("Versi aktif sebelumnya gagal diarsipkan.");
  const { error: activateError } = await supabase.from("rubric_versions").update({ status: "active" }).eq("id", versionId);
  if (activateError) throw new Error("Rubrik gagal diaktifkan.");
  revalidatePath("/dashboard/penilaian");
}

export async function saveObservation(input: { participantId: string; indicatorId: string; score: number | null; note: string; expectedRevision: number }) {
  const { supabase, userId } = await staffClient(["admin_system", "observer"]);
  if (!/^[0-9a-f-]{36}$/i.test(input.participantId) || !/^[0-9a-f-]{36}$/i.test(input.indicatorId) || (input.score !== null && (!Number.isInteger(input.score) || input.score < 1 || input.score > 5)) || input.note.length > 2000 || !Number.isInteger(input.expectedRevision) || input.expectedRevision < 0) return { ok: false as const, message: "Isian tidak valid." };
  const { data: current, error: readError } = await supabase.from("observations").select("id, revision").eq("participant_id", input.participantId).eq("indicator_id", input.indicatorId).maybeSingle();
  if (readError) return { ok: false as const, message: "Data belum dapat disimpan." };
  if ((current?.revision ?? 0) !== input.expectedRevision) return { ok: false as const, conflict: true as const, message: "Ada perubahan dari pengguna lain. Muat ulang untuk melihat nilai terbaru." };
  const values = { score: input.score, note: input.note.trim() || null, updated_by: userId };
  if (!current) {
    const { error } = await supabase.from("observations").insert({ ...values, participant_id: input.participantId, indicator_id: input.indicatorId });
    if (error) return { ok: false as const, conflict: error.code === "23505", message: error.code === "23505" ? "Pengguna lain baru saja mengisi indikator ini. Muat ulang." : "Data belum dapat disimpan." };
    return { ok: true as const, revision: 1 };
  }
  const { data: updated, error } = await supabase.from("observations").update(values).eq("id", current.id).eq("revision", input.expectedRevision).select("revision").maybeSingle();
  if (error || !updated) return { ok: false as const, conflict: true as const, message: "Ada perubahan dari pengguna lain. Muat ulang untuk melihat nilai terbaru." };
  return { ok: true as const, revision: updated.revision as number };
}
