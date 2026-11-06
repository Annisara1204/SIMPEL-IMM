"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const maxPhotoSize = 5 * 1024 * 1024;

async function validateProfilePhoto(value: FormDataEntryValue | null) {
  if (!(value instanceof File) || value.size < 1) return null;
  if (value.size > maxPhotoSize) return null;
  const signature = new Uint8Array(await value.slice(0, 8).arrayBuffer());
  const jpeg = value.type === "image/jpeg" && signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff;
  const png = value.type === "image/png" && signature[0] === 0x89 && signature[1] === 0x50 && signature[2] === 0x4e && signature[3] === 0x47 && signature[4] === 0x0d && signature[5] === 0x0a && signature[6] === 0x1a && signature[7] === 0x0a;
  return jpeg ? { file: value, mimeType: "image/jpeg", extension: "jpg" } : png ? { file: value, mimeType: "image/png", extension: "png" } : null;
}

export async function updateOwnProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const birthPlace = String(formData.get("birthPlace") ?? "").trim();
  const birthDate = String(formData.get("birthDate") ?? "");
  const gender = String(formData.get("gender") ?? "").trim();
  const phoneNumber = String(formData.get("phoneNumber") ?? "").trim();
  const domicileAddress = String(formData.get("domicileAddress") ?? "").trim();
  const normalizedPhone = phoneNumber.replace(/[\s().-]/g, "");
  const parsedBirthDate = /^\d{4}-\d{2}-\d{2}$/.test(birthDate) ? new Date(`${birthDate}T00:00:00.000Z`) : null;
  if (fullName.length < 2 || fullName.length > 120 || birthPlace.length < 2 || birthPlace.length > 120 || !parsedBirthDate || Number.isNaN(parsedBirthDate.getTime()) || parsedBirthDate.toISOString().slice(0, 10) !== birthDate || birthDate > new Date().toISOString().slice(0, 10) || !["Laki-laki", "Perempuan"].includes(gender) || !/^\+?[0-9]{8,15}$/.test(normalizedPhone) || domicileAddress.length < 5 || domicileAddress.length > 500) redirect("/dashboard/profil?status=invalid");

  const photo = await validateProfilePhoto(formData.get("photo"));
  const photoValue = formData.get("photo");
  if (photoValue instanceof File && photoValue.size > 0 && !photo) redirect("/dashboard/profil?status=photo");
  const { data: existing } = await supabase.from("account_personal_profiles").select("photo_path").eq("user_id", userId).maybeSingle();
  let photoPath = existing?.photo_path ?? null;
  let newPhotoPath: string | null = null;
  if (photo) {
    newPhotoPath = `${userId}/${crypto.randomUUID()}.${photo.extension}`;
    const { error: uploadError } = await supabase.storage.from("account-profile-photos").upload(newPhotoPath, photo.file, { contentType: photo.mimeType, cacheControl: "3600", upsert: false });
    if (uploadError) redirect("/dashboard/profil?status=failed");
    photoPath = newPhotoPath;
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("account_personal_profiles").upsert({
    user_id: userId,
    full_name: fullName,
    birth_place: birthPlace,
    birth_date: birthDate,
    gender,
    phone_number: normalizedPhone,
    domicile_address: domicileAddress,
    photo_path: photoPath,
    updated_at: now,
  }, { onConflict: "user_id" });
  if (error) {
    if (newPhotoPath) await supabase.storage.from("account-profile-photos").remove([newPhotoPath]);
    redirect("/dashboard/profil?status=failed");
  }
  const { error: displayNameError } = await supabase.from("profiles").update({ display_name: fullName, updated_at: now }).eq("id", userId);
  if (displayNameError) redirect("/dashboard/profil?status=failed");
  if (newPhotoPath && existing?.photo_path) await supabase.storage.from("account-profile-photos").remove([existing.photo_path]);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profil");
  redirect("/dashboard/profil?status=saved");
}
