"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { instructorDuties, instructorPositions, type InstructorPosition } from "@/lib/instructor-roles";

async function staffClient(roles: string[]) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (!profile || !roles.includes(profile.role ?? "")) throw new Error("Akses ditolak.");
  return { supabase, userId, role: profile.role };
}

function readScoreDescriptors(formData: FormData) {
  const entries = [1, 2, 3, 4, 5].map((score) => [String(score), String(formData.get(`descriptor${score}`) ?? "").trim()] as const);
  if (entries.some(([, description]) => description.length < 3 || description.length > 500)) return null;
  return Object.fromEntries(entries);
}

export async function createRubricVersion(formData: FormData) {
  const { supabase, userId } = await staffClient(["admin_system"]);
  const eventId = String(formData.get("eventId") ?? "");
  const stage = String(formData.get("stage") ?? "");
  const assessmentTypeId = String(formData.get("assessmentTypeId") ?? "");
  const materialId = String(formData.get("materialId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(eventId) || !["screening", "training", "follow_up"].includes(stage) || !/^[0-9a-f-]{36}$/i.test(assessmentTypeId) || (stage === "training" && !/^[0-9a-f-]{36}$/i.test(materialId)) || (stage !== "training" && materialId)) throw new Error("Kegiatan, tahap, materi, atau jenis penilaian tidak valid.");
  const { data: type } = await supabase.from("rubric_assessment_types").select("id").eq("id", assessmentTypeId).eq("event_id", eventId).eq("stage", stage).maybeSingle();
  if (!type) throw new Error("Jenis penilaian tidak ditemukan pada tahap ini.");
  if (stage === "training") {
    const { data: material } = await supabase.from("rubric_materials").select("id").eq("id", materialId).eq("event_id", eventId).maybeSingle();
    if (!material) throw new Error("Materi tidak ditemukan pada kegiatan ini.");
  }
  let versionQuery = supabase.from("rubric_versions").select("id, version, status, rubric_aspects(id, name, weight, position, rubric_indicator_aspects(weight, rubric_indicators(id, name, target, position, score_descriptors)))").eq("event_id", eventId).eq("stage", stage).eq("assessment_type_id", assessmentTypeId);
  versionQuery = stage === "training" ? versionQuery.eq("material_id", materialId) : versionQuery.is("material_id", null);
  const { data: versions, error: readError } = await versionQuery.order("version", { ascending: false }).limit(1);
  if (readError) throw new Error("Versi rubrik belum dapat dibaca. Jalankan migrasi Tahap 4.");
  if (versions?.[0]?.status === "draft") throw new Error("Selesaikan atau hapus draf yang sedang berjalan terlebih dahulu.");
  const { data: created, error } = await supabase.from("rubric_versions").insert({ event_id: eventId, stage, material_id: stage === "training" ? materialId : null, assessment_type_id: assessmentTypeId, version: (versions?.[0]?.version ?? 0) + 1, status: "draft", created_by: userId }).select("id").single();
  if (error) throw new Error("Versi baru gagal dibuat.");
  const aspectIds = new Map<string, string>();
  for (const aspect of versions?.[0]?.rubric_aspects ?? []) {
    const { data: copiedAspect, error: aspectError } = await supabase.from("rubric_aspects").insert({ rubric_version_id: created.id, name: aspect.name, weight: aspect.weight, position: aspect.position }).select("id").single();
    if (aspectError) { await supabase.from("rubric_versions").delete().eq("id", created.id); throw new Error("Aspek versi sebelumnya gagal disalin ke draf baru."); }
    aspectIds.set(aspect.id, copiedAspect.id);
  }
  const copiedIndicators = new Map<string, string>();
  for (const aspect of versions?.[0]?.rubric_aspects ?? []) {
    for (const mapping of aspect.rubric_indicator_aspects ?? []) {
      const original = Array.isArray(mapping.rubric_indicators) ? mapping.rubric_indicators[0] : mapping.rubric_indicators;
      if (!original || copiedIndicators.has(original.id)) continue;
      const { data: copied, error: indicatorError } = await supabase.from("rubric_indicators").insert({ aspect_id: aspectIds.get(aspect.id)!, name: original.name, weight: mapping.weight, target: original.target, position: original.position, score_descriptors: original.score_descriptors }).select("id").single();
      if (indicatorError || !copied) { await supabase.from("rubric_versions").delete().eq("id", created.id); throw new Error("Indikator versi sebelumnya gagal disalin ke draf baru."); }
      copiedIndicators.set(original.id, copied.id);
    }
  }
  for (const aspect of versions?.[0]?.rubric_aspects ?? []) {
    const rows = (aspect.rubric_indicator_aspects ?? []).flatMap((mapping) => {
      const originalId = (Array.isArray(mapping.rubric_indicators) ? mapping.rubric_indicators[0] : mapping.rubric_indicators)?.id;
      const indicatorId = originalId ? copiedIndicators.get(originalId) : null;
      const targetAspectId = aspectIds.get(aspect.id);
      return indicatorId && targetAspectId ? [{ indicator_id: indicatorId, aspect_id: targetAspectId, weight: mapping.weight }] : [];
    });
    if (rows.length) {
      const { error: mappingsError } = await supabase.from("rubric_indicator_aspects").insert(rows);
      if (mappingsError) { await supabase.from("rubric_versions").delete().eq("id", created.id); throw new Error("Pemetaan indikator-aspek gagal disalin ke draf baru."); }
    }
  }
  revalidatePath("/dashboard/penilaian");
}

export async function createTrainingMaterial(formData: FormData) {
  const { supabase } = await staffClient(["admin_system"]);
  const eventId = String(formData.get("eventId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(eventId) || name.length < 2 || name.length > 120) throw new Error("Nama materi tidak valid.");
  const { data: previous } = await supabase.from("rubric_materials").select("position").eq("event_id", eventId).order("position", { ascending: false }).limit(1);
  const { error } = await supabase.from("rubric_materials").insert({ event_id: eventId, name, position: (previous?.[0]?.position ?? -1) + 1 });
  if (error) throw new Error("Materi gagal ditambahkan. Pastikan namanya belum digunakan pada kegiatan ini.");
  revalidatePath("/dashboard/penilaian");
  revalidatePath("/dashboard/observasi");
}

export async function createAssessmentType(formData: FormData) {
  const { supabase } = await staffClient(["admin_system"]);
  const eventId = String(formData.get("eventId") ?? "");
  const stage = String(formData.get("stage") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(eventId) || !["screening", "training", "follow_up"].includes(stage) || name.length < 2 || name.length > 80) throw new Error("Nama jenis penilaian atau tahap tidak valid.");
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
  const scoreDescriptors = readScoreDescriptors(formData);
  if (!/^[0-9a-f-]{36}$/i.test(aspectId) || name.length < 2 || name.length > 200 || target.length > 300 || !Number.isFinite(weight) || weight <= 0 || weight > 100 || !scoreDescriptors) throw new Error("Isi nama, bobot, target, dan uraian perilaku skor 1–5 dengan benar.");
  const { data: indicators } = await supabase.from("rubric_indicators").select("position").eq("aspect_id", aspectId).order("position", { ascending: false }).limit(1);
  const { data: indicator, error } = await supabase.from("rubric_indicators").insert({ aspect_id: aspectId, name, target: target || null, weight, position: (indicators?.[0]?.position ?? -1) + 1, score_descriptors: scoreDescriptors }).select("id").single();
  if (error || !indicator) throw new Error("Indikator gagal ditambahkan. Pastikan versinya masih draf dan nama tidak duplikat.");
  const { error: mappingError } = await supabase.from("rubric_indicator_aspects").insert({ indicator_id: indicator.id, aspect_id: aspectId, weight });
  if (mappingError) { await supabase.from("rubric_indicators").delete().eq("id", indicator.id); throw new Error("Pemetaan indikator ke aspek gagal disimpan."); }
  revalidatePath("/dashboard/penilaian");
}

export async function editIndicator(formData: FormData) {
  const { supabase } = await staffClient(["admin_system"]);
  const id = String(formData.get("indicatorId") ?? "");
  const mappingId = String(formData.get("mappingId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const target = String(formData.get("target") ?? "").trim();
  const weight = Number(formData.get("weight"));
  const scoreDescriptors = readScoreDescriptors(formData);
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f-]{36}$/i.test(mappingId) || name.length < 2 || name.length > 200 || target.length > 300 || !Number.isFinite(weight) || weight <= 0 || weight > 100 || !scoreDescriptors) throw new Error("Periksa nama, target, bobot pemetaan, dan uraian skor 1–5.");
  const { error } = await supabase.from("rubric_indicators").update({ name, target: target || null, score_descriptors: scoreDescriptors }).eq("id", id);
  const { error: mappingError } = await supabase.from("rubric_indicator_aspects").update({ weight }).eq("id", mappingId).eq("indicator_id", id);
  if (error || mappingError) throw new Error("Perubahan indikator gagal disimpan. Versi harus masih berupa draf.");
  revalidatePath("/dashboard/penilaian");
}

export async function linkIndicatorToAspect(formData: FormData) {
  const { supabase } = await staffClient(["admin_system"]);
  const indicatorId = String(formData.get("indicatorId") ?? "");
  const aspectId = String(formData.get("aspectId") ?? "");
  const weight = Number(formData.get("weight"));
  if (!/^[0-9a-f-]{36}$/i.test(indicatorId) || !/^[0-9a-f-]{36}$/i.test(aspectId) || !Number.isFinite(weight) || weight <= 0 || weight > 100) throw new Error("Aspek atau bobot pemetaan tidak valid.");
  const { error } = await supabase.from("rubric_indicator_aspects").insert({ indicator_id: indicatorId, aspect_id: aspectId, weight });
  if (error) throw new Error("Pemetaan gagal. Pastikan indikator dan aspek berada pada versi draf yang sama dan belum dipetakan.");
  revalidatePath("/dashboard/penilaian");
}

export async function unlinkIndicatorFromAspect(formData: FormData) {
  const { supabase } = await staffClient(["admin_system"]);
  const mappingId = String(formData.get("mappingId") ?? "");
  const indicatorId = String(formData.get("indicatorId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(mappingId) || !/^[0-9a-f-]{36}$/i.test(indicatorId)) throw new Error("Pemetaan indikator tidak valid.");
  const { data: mappings, error: readError } = await supabase.from("rubric_indicator_aspects").select("id").eq("indicator_id", indicatorId);
  if (readError || !mappings || mappings.length <= 1 || !mappings.some((mapping) => mapping.id === mappingId)) throw new Error("Setiap indikator harus tetap terhubung ke sedikitnya satu aspek.");
  const { error } = await supabase.from("rubric_indicator_aspects").delete().eq("id", mappingId).eq("indicator_id", indicatorId);
  if (error) throw new Error("Pemetaan indikator gagal dilepas. Pastikan rubrik masih berupa draf.");
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

export async function assignInstructorEvent(formData: FormData) {
  const { supabase, userId } = await staffClient(["admin_system"]);
  const eventId = String(formData.get("eventId") ?? "");
  const instructorId = String(formData.get("instructorId") ?? "");
  const position = String(formData.get("position") ?? "") as InstructorPosition;
  if (!/^[0-9a-f-]{36}$/i.test(eventId) || !/^[0-9a-f-]{36}$/i.test(instructorId) || !instructorPositions.some((item) => item.id === position)) throw new Error("Kegiatan, akun, atau subrole Instruktur tidak valid.");
  const { data: instructor } = await supabase.from("profiles").select("id").eq("id", instructorId).eq("role", "instruktur").maybeSingle();
  if (!instructor) throw new Error("Pilih akun dengan role Instruktur.");
  const { data: assignment, error } = await supabase.from("instructor_event_assignments").insert({ event_id: eventId, instructor_id: instructorId, assigned_by: userId, position }).select("id").single();
  if (error?.code === "23505") throw new Error("Akun tersebut sudah mendapat subrole itu pada kegiatan ini.");
  if (error || !assignment) throw new Error("Penugasan Instruktur gagal disimpan.");
  const { error: dutyError } = await supabase.from("instructor_duty_items").insert(instructorDuties[position].map((title) => ({ instructor_assignment_id: assignment.id, title })));
  if (dutyError) {
    await supabase.from("instructor_event_assignments").delete().eq("id", assignment.id);
    throw new Error("Daftar tugas subrole gagal dibuat. Pastikan migrasi Instruktur terbaru sudah dijalankan.");
  }
  revalidatePath("/dashboard/penilaian");
  revalidatePath("/dashboard");
}

export async function removeInstructorEventAssignment(formData: FormData) {
  const { supabase } = await staffClient(["admin_system"]);
  const assignmentId = String(formData.get("assignmentId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(assignmentId)) throw new Error("Penugasan tidak valid.");
  const { error } = await supabase.from("instructor_event_assignments").delete().eq("id", assignmentId);
  if (error) throw new Error("Penugasan Instruktur gagal dihapus.");
  revalidatePath("/dashboard/penilaian");
  revalidatePath("/dashboard");
}

export async function updateInstructorDutyItem(formData: FormData) {
  const { supabase, userId } = await staffClient(["instruktur"]);
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const dutyItemId = String(formData.get("dutyItemId") ?? "");
  const isDone = formData.get("isDone") === "on";
  if (!/^[0-9a-f-]{36}$/i.test(assignmentId) || !/^[0-9a-f-]{36}$/i.test(dutyItemId)) throw new Error("Tugas tidak valid.");
  const { data: assignment } = await supabase.from("instructor_event_assignments").select("id").eq("id", assignmentId).eq("instructor_id", userId).maybeSingle();
  if (!assignment) throw new Error("Tugas ini tidak diberikan kepada akun Anda.");
  const { error } = await supabase.from("instructor_duty_items").update({ is_done: isDone, updated_at: new Date().toISOString() }).eq("id", dutyItemId).eq("instructor_assignment_id", assignmentId);
  if (error) throw new Error("Status tugas gagal diperbarui. Pastikan migrasi subrole Instruktur sudah dijalankan.");
  revalidatePath("/dashboard");
}

export async function completeObserverAssignment(formData: FormData) {
  const { supabase, userId } = await staffClient(["observer"]);
  const eventId = String(formData.get("eventId") ?? "");
  const versionId = String(formData.get("versionId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(eventId) || !/^[0-9a-f-]{36}$/i.test(versionId)) throw new Error("Kegiatan atau rubrik tidak valid.");
  const { data: assignment, error: assignmentError } = await supabase.from("observer_assignments").select("id").eq("event_id", eventId).eq("observer_id", userId).maybeSingle();
  if (assignmentError || !assignment) throw new Error("Anda tidak ditugaskan pada kegiatan ini.");
  const { data: activeVersion } = await supabase.from("rubric_versions").select("id").eq("id", versionId).eq("event_id", eventId).eq("status", "active").maybeSingle();
  if (!activeVersion) throw new Error("Rubrik ini tidak aktif untuk kegiatan tersebut.");
  const { error } = await supabase.from("observer_rubric_version_completions").upsert({ assignment_id: assignment.id, rubric_version_id: versionId, completed_by: userId, completed_at: new Date().toISOString() }, { onConflict: "assignment_id,rubric_version_id" });
  if (error) throw new Error("Status selesai gagal disimpan. Pastikan migrasi Tahap 4 terbaru sudah dijalankan.");
  revalidatePath("/dashboard/observasi");
}

export async function reopenObserverAssignment(formData: FormData) {
  const { supabase, userId } = await staffClient(["observer"]);
  const eventId = String(formData.get("eventId") ?? "");
  const versionId = String(formData.get("versionId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(eventId) || !/^[0-9a-f-]{36}$/i.test(versionId)) throw new Error("Kegiatan atau rubrik tidak valid.");
  const { data: assignment } = await supabase.from("observer_assignments").select("id").eq("event_id", eventId).eq("observer_id", userId).maybeSingle();
  if (!assignment) throw new Error("Anda tidak ditugaskan pada kegiatan ini.");
  const { error } = await supabase.from("observer_rubric_version_completions").delete().eq("assignment_id", assignment.id).eq("rubric_version_id", versionId);
  if (error) throw new Error("Status selesai gagal dibuka kembali.");
  revalidatePath("/dashboard/observasi");
}

export async function activateRubric(formData: FormData) {
  const { supabase } = await staffClient(["admin_system"]);
  const versionId = String(formData.get("versionId") ?? "");
  const { data: aspects, error } = await supabase.from("rubric_aspects").select("id, weight, rubric_indicator_aspects(id, weight, rubric_indicators(id, score_descriptors))").eq("rubric_version_id", versionId);
  if (error || !aspects?.length) throw new Error("Tambahkan aspek dan indikator sebelum mengaktifkan rubrik.");
  const close = (n: number) => Math.abs(n - 100) < 0.001;
  if (!close(aspects.reduce((sum, aspect) => sum + Number(aspect.weight), 0)) || aspects.some((aspect) => !aspect.rubric_indicator_aspects.length || !close(aspect.rubric_indicator_aspects.reduce((sum, mapping) => sum + Number(mapping.weight), 0)))) throw new Error("Bobot antar-aspek dan bobot pemetaan indikator pada setiap aspek masing-masing harus berjumlah 100%.");
  if (aspects.some((aspect) => aspect.rubric_indicator_aspects.some((mapping) => {
    const indicator = Array.isArray(mapping.rubric_indicators) ? mapping.rubric_indicators[0] : mapping.rubric_indicators;
    return [1, 2, 3, 4, 5].some((score) => String(indicator?.score_descriptors?.[String(score)] ?? "").trim().length < 3);
  }))) throw new Error("Lengkapi uraian perilaku untuk skor 1 sampai 5 pada setiap indikator.");
  const { data: version } = await supabase.from("rubric_versions").select("event_id, stage, material_id, assessment_type_id").eq("id", versionId).eq("status", "draft").maybeSingle();
  if (!version) throw new Error("Versi draf tidak ditemukan.");
  let activeQuery = supabase.from("rubric_versions").update({ status: "archived" }).eq("event_id", version.event_id).eq("stage", version.stage).eq("assessment_type_id", version.assessment_type_id).eq("status", "active");
  activeQuery = version.stage === "training" ? activeQuery.eq("material_id", version.material_id) : activeQuery.is("material_id", null);
  const { error: archiveError } = await activeQuery;
  if (archiveError) throw new Error("Versi aktif sebelumnya gagal diarsipkan.");
  const { error: activateError } = await supabase.from("rubric_versions").update({ status: "active" }).eq("id", versionId);
  if (activateError) throw new Error("Rubrik gagal diaktifkan.");
  revalidatePath("/dashboard/penilaian");
}

export async function saveObservation(input: { participantId: string; indicatorId: string; score: number | null; expectedRevision: number }) {
  const { supabase, userId, role } = await staffClient(["admin_system", "observer", "instruktur"]);
  if (!/^[0-9a-f-]{36}$/i.test(input.participantId) || !/^[0-9a-f-]{36}$/i.test(input.indicatorId) || (input.score !== null && (!Number.isInteger(input.score) || input.score < 1 || input.score > 5)) || !Number.isInteger(input.expectedRevision) || input.expectedRevision < 0) return { ok: false as const, message: "Isian tidak valid." };
  const { data: participant } = await supabase.from("participants").select("event_id").eq("id", input.participantId).maybeSingle();
  const { data: indicator } = await supabase.from("rubric_indicators").select("aspect_id").eq("id", input.indicatorId).maybeSingle();
  const { data: aspect } = indicator ? await supabase.from("rubric_aspects").select("rubric_version_id").eq("id", indicator.aspect_id).maybeSingle() : { data: null };
  const { data: version } = aspect ? await supabase.from("rubric_versions").select("id, event_id, status").eq("id", aspect.rubric_version_id).maybeSingle() : { data: null };
  if (!participant || !version || version.event_id !== participant.event_id || version.status !== "active") return { ok: false as const, message: "Peserta dan indikator tidak berada pada rubrik aktif yang sama." };
  if (role === "observer") {
    const { data: assignment } = await supabase.from("observer_assignments").select("id").eq("event_id", participant.event_id).eq("observer_id", userId).maybeSingle();
    if (!assignment) return { ok: false as const, message: "Anda tidak ditugaskan pada kegiatan ini." };
  }
  if (role === "instruktur") {
    const { data: assignment } = await supabase.from("instructor_event_assignments").select("id").eq("event_id", participant.event_id).eq("instructor_id", userId).limit(1).maybeSingle();
    if (!assignment) return { ok: false as const, message: "Anda tidak ditugaskan pada kegiatan ini." };
  }
  const readLatest = async () => {
    const { data } = await supabase.from("observations").select("id, score, revision, updated_at, updated_by_name, updated_by").eq("participant_id", input.participantId).eq("indicator_id", input.indicatorId).maybeSingle();
    return data ?? { id: null, score: null, revision: 0, updated_at: null, updated_by_name: null, updated_by: null };
  };
  const { data: current, error: readError } = await supabase.from("observations").select("id, score, revision, updated_at, updated_by_name, updated_by").eq("participant_id", input.participantId).eq("indicator_id", input.indicatorId).maybeSingle();
  if (readError) return { ok: false as const, message: "Data belum dapat disimpan." };
  const latest = current ?? { id: null, score: null, revision: 0, updated_at: null, updated_by_name: null, updated_by: null };
  if (latest.revision !== input.expectedRevision) return { ok: false as const, conflict: true as const, latest, message: "Nilai berubah di perangkat lain. Pilih nilai terbaru atau terapkan ulang pilihan Anda." };
  const values = { score: input.score, updated_by: userId };
  if (!current) {
    const { error } = await supabase.from("observations").insert({ ...values, participant_id: input.participantId, indicator_id: input.indicatorId });
    if (error) return error.code === "23505" ? { ok: false as const, conflict: true as const, latest: await readLatest(), message: "Nilai berubah di perangkat lain. Pilih nilai terbaru atau terapkan ulang pilihan Anda." } : { ok: false as const, message: "Data belum dapat disimpan." };
    return { ok: true as const, revision: 1 };
  }
  const { data: updated, error } = await supabase.from("observations").update(values).eq("id", current.id).eq("revision", input.expectedRevision).select("revision").maybeSingle();
  if (error || !updated) return { ok: false as const, conflict: true as const, latest: await readLatest(), message: "Nilai berubah di perangkat lain. Pilih nilai terbaru atau terapkan ulang pilihan Anda." };
  return { ok: true as const, revision: updated.revision as number };
}

export async function saveObserverNote(input: { participantId: string; rubricVersionId: string; noteType: "observation" | "strength" | "development" | "special"; content: string; expectedRevision: number }) {
  const { supabase, userId, role } = await staffClient(["admin_system", "observer", "instruktur"]);
  if (!/^[0-9a-f-]{36}$/i.test(input.participantId) || !/^[0-9a-f-]{36}$/i.test(input.rubricVersionId) || !["observation", "strength", "development", "special"].includes(input.noteType) || input.content.length > 3000 || !Number.isInteger(input.expectedRevision) || input.expectedRevision < 0) return { ok: false as const, message: "Isian catatan tidak valid." };
  const { data: participant } = await supabase.from("participants").select("event_id").eq("id", input.participantId).maybeSingle();
  const { data: version } = await supabase.from("rubric_versions").select("id, event_id, status").eq("id", input.rubricVersionId).maybeSingle();
  if (!participant || !version || version.event_id !== participant.event_id || version.status !== "active") return { ok: false as const, message: "Catatan hanya dapat ditulis pada rubrik aktif untuk kegiatan peserta ini." };
  if (role === "observer") {
    const { data: assignment } = await supabase.from("observer_assignments").select("id").eq("event_id", participant.event_id).eq("observer_id", userId).maybeSingle();
    if (!assignment) return { ok: false as const, message: "Anda tidak ditugaskan pada kegiatan ini." };
  }
  if (role === "instruktur") {
    const { data: assignment } = await supabase.from("instructor_event_assignments").select("id").eq("event_id", participant.event_id).eq("instructor_id", userId).limit(1).maybeSingle();
    if (!assignment) return { ok: false as const, message: "Anda tidak ditugaskan pada kegiatan ini." };
  }
  const queryLatest = () => supabase.from("observer_notes").select("id, participant_id, rubric_version_id, author_id, author_name, note_type, content, revision, updated_at").eq("participant_id", input.participantId).eq("rubric_version_id", input.rubricVersionId).eq("author_id", userId).eq("note_type", input.noteType).is("indicator_id", null).maybeSingle();
  const { data: current, error: readError } = await queryLatest();
  if (readError) return { ok: false as const, message: "Catatan belum dapat dibaca." };
  const latest = current ?? { id: null, participant_id: input.participantId, rubric_version_id: input.rubricVersionId, author_id: userId, author_name: "Anda", note_type: input.noteType, content: "", revision: 0, updated_at: null };
  if (latest.revision !== input.expectedRevision) return { ok: false as const, conflict: true as const, latest, message: "Catatan Anda berubah di perangkat lain. Pilih versi terbaru atau terapkan ulang tulisan Anda." };
  const content = input.content.trim();
  if (!current && !content) return { ok: true as const, record: latest };
  if (!current) {
    const { data: inserted, error } = await supabase.from("observer_notes").insert({ participant_id: input.participantId, rubric_version_id: input.rubricVersionId, author_id: userId, note_type: input.noteType, content }).select("id, participant_id, rubric_version_id, author_id, author_name, note_type, content, revision, updated_at").single();
    if (error || !inserted) {
      const { data: raced } = await queryLatest();
      return raced ? { ok: false as const, conflict: true as const, latest: raced, message: "Catatan Anda baru saja berubah. Pilih versi terbaru atau terapkan ulang tulisan Anda." } : { ok: false as const, message: "Catatan gagal disimpan." };
    }
    return { ok: true as const, record: inserted };
  }
  const { data: updated, error } = await supabase.from("observer_notes").update({ content }).eq("id", current.id).eq("revision", input.expectedRevision).select("id, participant_id, rubric_version_id, author_id, author_name, note_type, content, revision, updated_at").maybeSingle();
  if (error || !updated) {
    const { data: raced } = await queryLatest();
    return { ok: false as const, conflict: true as const, latest: raced ?? latest, message: "Catatan Anda berubah di perangkat lain. Pilih versi terbaru atau terapkan ulang tulisan Anda." };
  }
  return { ok: true as const, record: updated };
}
