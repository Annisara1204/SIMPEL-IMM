"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Simpan permintaan akun; pembuatan akun dilakukan Admin Sistem. */
export async function requestInstructorAccount(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (
    !email ||
    email.endsWith("@login.imm-observer.invalid") ||
    displayName.length < 2 ||
    displayName.length > 100
  )
    redirect("/daftar?error=data");
  const supabase = await createClient();
  const { error } = await supabase
    .from("account_requests")
    .insert({ email, display_name: displayName });
  if (error) redirect("/daftar?error=gagal");
  redirect("/daftar?status=permintaan");
}
