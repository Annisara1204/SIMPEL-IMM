"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f-]{36}$/i;
const photoBucket = "participant-photos";
const maxPhotoSize = 5 * 1024 * 1024;

async function validatePhoto(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size < 1) throw new Error("Pilih foto formal JPG atau PNG.");
  if (file.size > maxPhotoSize) throw new Error("Ukuran foto maksimal 5 MB.");
  const signature = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const isJpeg = file.type === "image/jpeg" && signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff;
  const isPng = file.type === "image/png" && signature[0] === 0x89 && signature[1] === 0x50 && signature[2] === 0x4e && signature[3] === 0x47 && signature[4] === 0x0d && signature[5] === 0x0a && signature[6] === 0x1a && signature[7] === 0x0a;
  if (!isJpeg && !isPng) throw new Error("Isi foto harus benar-benar berupa JPG atau PNG.");
  return { mimeType: isJpeg ? "image/jpeg" : "image/png", extension: isJpeg ? "jpg" : "png" };
}

async function uploadParticipantPhoto(supabase: Awaited<ReturnType<typeof createClient>>, file: FormDataEntryValue | null, eventId: string, participantId: string) {
  if (!(file instanceof File) || file.size === 0) return null;
  const image = await validatePhoto(file);
  const path = `${eventId}/${participantId}/${crypto.randomUUID()}.${image.extension}`;
  const { error } = await supabase.storage.from(photoBucket).upload(path, file as File, { contentType: image.mimeType, cacheControl: "3600", upsert: false });
  if (error) throw new Error("Foto gagal diunggah. Pastikan migrasi penyimpanan foto sudah dijalankan.");
  return path;
}

async function authorizedActor() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (!profile || !["admin_system", "observer"].includes(profile.role ?? "")) throw new Error("Akses ditolak.");
  return { supabase, userId, role: profile.role };
}

async function authorizedClient() {
  return (await authorizedActor()).supabase;
}

export async function updateEvent(formData: FormData) {
  const { supabase, userId, role } = await authorizedActor();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const commissariat = String(formData.get("commissariat") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const startsOn = String(formData.get("startsOn") ?? "");
  const endsOn = String(formData.get("endsOn") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id) || (role === "admin_system" && (name.length < 3 || name.length > 120)) || commissariat.length < 2 || commissariat.length > 120 || location.length < 2 || location.length > 160 || !/^\d{4}-\d{2}-\d{2}$/.test(startsOn) || !/^\d{4}-\d{2}-\d{2}$/.test(endsOn) || endsOn < startsOn || !["planned", "ongoing", "completed"].includes(status)) throw new Error("Data kegiatan tidak valid.");
  if (role === "observer") {
    const { data: assignment, error: assignmentError } = await supabase.from("observer_assignments").select("id").eq("event_id", id).eq("observer_id", userId).maybeSingle();
    if (assignmentError || !assignment) throw new Error("Anda hanya dapat mengubah detail kegiatan yang ditugaskan kepada Anda.");
  }
  const updates = { commissariat, location, starts_on: startsOn, ends_on: endsOn, status, updated_at: new Date().toISOString(), ...(role === "admin_system" ? { name } : {}) };
  const { error } = await supabase.from("events").update(updates).eq("id", id);
  if (error) throw new Error("Kegiatan gagal disimpan. Pastikan migrasi Tahap 3 sudah dijalankan.");
  revalidatePath("/dashboard/kegiatan");
  revalidatePath("/dashboard/peserta");
}

export async function createEvent(formData: FormData) {
  const { supabase, role } = await authorizedActor();
  if (role !== "admin_system") throw new Error("Hanya Admin Sistem yang dapat membuat kegiatan baru.");
  const name = String(formData.get("name") ?? "").trim();
  const commissariat = String(formData.get("commissariat") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const startsOn = String(formData.get("startsOn") ?? "");
  const endsOn = String(formData.get("endsOn") ?? "");
  if (name.length < 3 || name.length > 120 || commissariat.length < 2 || commissariat.length > 120 || location.length < 2 || location.length > 160 || !/^\d{4}-\d{2}-\d{2}$/.test(startsOn) || !/^\d{4}-\d{2}-\d{2}$/.test(endsOn) || endsOn < startsOn) {
    redirect("/dashboard/kegiatan?create=invalid");
  }
  const { error } = await supabase.from("events").insert({ name, commissariat, location, starts_on: startsOn, ends_on: endsOn, status: "planned" });
  if (error) redirect("/dashboard/kegiatan?create=failed");
  revalidatePath("/dashboard/kegiatan");
  revalidatePath("/dashboard/penilaian");
  revalidatePath("/dashboard/pengajuan");
  redirect("/dashboard/kegiatan?create=success");
}

export async function addParticipant(formData: FormData) {
  const supabase = await authorizedClient();
  const eventId = String(formData.get("eventId") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();
  const commissariatId = String(formData.get("commissariatId") ?? "");
  const major = String(formData.get("major") ?? "").trim();
  const entryYear = Number(formData.get("entryYear"));
  const position = String(formData.get("position") ?? "").trim();
  const photo = formData.get("photo");
  if (!uuidPattern.test(eventId) || !uuidPattern.test(commissariatId) || displayName.length < 2 || displayName.length > 120 || major.length < 2 || major.length > 120 || !Number.isInteger(entryYear) || entryYear < 1900 || entryYear > 2100 || position.length > 120) throw new Error("Data peserta tidak valid. Periksa nama, Komisariat, jurusan, dan tahun angkatan.");
  const { data: commissariat, error: commissariatError } = await supabase.from("commissariats").select("name").eq("id", commissariatId).eq("is_active", true).maybeSingle();
  if (commissariatError || !commissariat) throw new Error("Pilih Komisariat yang masih aktif.");
  const participantId = crypto.randomUUID();
  const photoPath = await uploadParticipantPhoto(supabase, photo, eventId, participantId);
  const { error } = await supabase.from("participants").insert({ id: participantId, event_id: eventId, display_name: displayName, commissariat: commissariat.name, commissariat_id: commissariatId, major, entry_year: entryYear, position: position || null, photo_path: photoPath });
  if (error) {
    if (photoPath) await supabase.storage.from(photoBucket).remove([photoPath]);
    throw new Error("Peserta gagal disimpan. Pastikan migrasi profil peserta sudah dijalankan.");
  }
  revalidatePath("/dashboard/kegiatan");
  revalidatePath("/dashboard/peserta");
}

export async function editParticipant(formData: FormData) {
  const supabase = await authorizedClient();
  const participantId = String(formData.get("participantId") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();
  const commissariatId = String(formData.get("commissariatId") ?? "");
  const major = String(formData.get("major") ?? "").trim();
  const entryYear = Number(formData.get("entryYear"));
  const position = String(formData.get("position") ?? "").trim();
  const photo = formData.get("photo");
  if (!uuidPattern.test(participantId) || !uuidPattern.test(commissariatId) || displayName.length < 2 || displayName.length > 120 || major.length < 2 || major.length > 120 || !Number.isInteger(entryYear) || entryYear < 1900 || entryYear > 2100 || position.length > 120) throw new Error("Data profil peserta tidak valid.");
  const { data: commissariat, error: commissariatError } = await supabase.from("commissariats").select("name").eq("id", commissariatId).eq("is_active", true).maybeSingle();
  if (commissariatError || !commissariat) throw new Error("Pilih Komisariat yang masih aktif.");
  const { data: current, error: currentError } = await supabase.from("participants").select("id, event_id, photo_path").eq("id", participantId).maybeSingle();
  if (currentError || !current) throw new Error("Peserta tidak ditemukan atau akses ditolak.");
  const newPhoto = photo instanceof File && photo.size > 0;
  const newPhotoPath = newPhoto ? await uploadParticipantPhoto(supabase, photo, current.event_id, participantId) : current.photo_path;
  const { error } = await supabase.from("participants").update({ display_name: displayName, commissariat: commissariat.name, commissariat_id: commissariatId, major, entry_year: entryYear, position: position || null, photo_path: newPhotoPath }).eq("id", participantId);
  if (error) {
    if (newPhoto && newPhotoPath) await supabase.storage.from(photoBucket).remove([newPhotoPath]);
    throw new Error("Perubahan profil peserta gagal disimpan.");
  }
  if (newPhoto && current.photo_path) await supabase.storage.from(photoBucket).remove([current.photo_path]);
  revalidatePath("/dashboard/kegiatan");
  revalidatePath("/dashboard/peserta");
}

export async function removeParticipant(formData: FormData) {
  const supabase = await authorizedClient();
  const participantId = String(formData.get("participantId") ?? "");
  if (!uuidPattern.test(participantId)) throw new Error("ID peserta tidak valid.");
  const { data: current } = await supabase.from("participants").select("photo_path").eq("id", participantId).maybeSingle();
  const { error } = await supabase.from("participants").delete().eq("id", participantId);
  if (error) throw new Error("Peserta gagal dihapus.");
  if (current?.photo_path) await supabase.storage.from(photoBucket).remove([current.photo_path]);
  revalidatePath("/dashboard/kegiatan");
  revalidatePath("/dashboard/peserta");
}
