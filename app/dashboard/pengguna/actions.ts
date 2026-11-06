"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const roles = ["admin_system", "bidang_kader", "observer", "instruktur", "komisariat", "peserta"] as const;

export async function updateUserRole(formData: FormData) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: actor } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (actor?.role !== "admin_system") throw new Error("Akses ditolak.");

  const targetId = String(formData.get("userId") ?? "");
  const selectedRole = String(formData.get("role") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(targetId)) throw new Error("ID pengguna tidak valid.");
  if (targetId === userId) throw new Error("Role akun yang sedang digunakan tidak dapat diubah dari halaman ini.");
  if (selectedRole !== "none" && !roles.includes(selectedRole as (typeof roles)[number])) throw new Error("Role tidak dikenal.");

  const updates = selectedRole === "komisariat" ? { role: selectedRole } : { role: selectedRole === "none" ? null : selectedRole, commissariat_id: null };
  const { error } = await supabase.from("profiles").update(updates).eq("id", targetId);
  if (error) throw new Error("Perubahan role gagal disimpan. Periksa kebijakan RLS dan koneksi Supabase.");
  revalidatePath("/dashboard/pengguna");
  revalidatePath("/dashboard");
}

export async function assignUserCommissariat(formData: FormData) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");
  const { data: actor } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (actor?.role !== "admin_system") throw new Error("Akses ditolak.");

  const targetId = String(formData.get("userId") ?? "");
  const commissariatId = String(formData.get("commissariatId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(targetId) || !/^[0-9a-f-]{36}$/i.test(commissariatId)) throw new Error("Pilih akun dan Komisariat yang valid.");
  const [{ data: target }, { data: commissariat }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", targetId).maybeSingle(),
    supabase.from("commissariats").select("id").eq("id", commissariatId).eq("is_active", true).maybeSingle(),
  ]);
  if (target?.role !== "komisariat" || !commissariat) throw new Error("Akun harus ber-role Komisariat dan Komisariat harus aktif.");
  const { error } = await supabase.from("profiles").update({ commissariat_id: commissariatId }).eq("id", targetId);
  if (error) throw new Error("Akun gagal ditautkan. Pastikan migrasi pengajuan Komisariat sudah dijalankan.");
  revalidatePath("/dashboard/pengguna");
  revalidatePath("/dashboard");
}
