"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function registerPermanentInstructor(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (
    !email ||
    email.endsWith("@login.imm-observer.invalid") ||
    password.length < 10 ||
    displayName.length < 2 ||
    displayName.length > 100
  ) {
    redirect("/daftar?error=data");
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback?next=/dashboard`,
    },
  });
  // Pesan error Supabase bisa memuat alamat email atau detail internal —
  // kirim hanya kode generik ke URL, bukan pesan mentah.
  if (error) redirect("/daftar?error=gagal");
  if (data.session) redirect("/dashboard");
  redirect("/daftar?status=email");
}
