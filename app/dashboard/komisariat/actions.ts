"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (profile?.role !== "admin_system") throw new Error("Akses ditolak.");
  return supabase;
}

function validName(value: string) {
  return value.trim().length >= 3 && value.trim().length <= 120;
}

export async function addCommissariat(formData: FormData) {
  const supabase = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!validName(name)) throw new Error("Nama Komisariat harus 3–120 karakter.");
  const { error } = await supabase.from("commissariats").insert({ name });
  if (error) throw new Error(error.code === "23505" ? "Nama Komisariat tersebut sudah terdaftar." : "Komisariat gagal ditambahkan. Pastikan migrasi daftar Komisariat sudah dijalankan.");
  revalidatePath("/dashboard/komisariat");
  redirect("/dashboard/komisariat?status=added");
}

export async function editCommissariat(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(id) || !validName(name)) throw new Error("Data Komisariat tidak valid.");
  const { error } = await supabase.from("commissariats").update({ name, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.code === "23505" ? "Nama Komisariat tersebut sudah terdaftar." : "Perubahan Komisariat gagal disimpan.");
  revalidatePath("/dashboard/komisariat");
  redirect("/dashboard/komisariat?status=updated");
}

export async function setCommissariatActive(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("ID Komisariat tidak valid.");
  const { error } = await supabase.from("commissariats").update({ is_active: active, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error("Status Komisariat gagal diubah.");
  revalidatePath("/dashboard/komisariat");
  redirect(`/dashboard/komisariat?status=${active ? "activated" : "deactivated"}`);
}
