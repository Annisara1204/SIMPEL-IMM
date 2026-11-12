import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function staffClient(roles: string[]) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (!profile || !roles.includes(profile.role ?? ""))
    throw new Error("Akses ditolak.");
  return { supabase, userId, role: profile.role };
}
