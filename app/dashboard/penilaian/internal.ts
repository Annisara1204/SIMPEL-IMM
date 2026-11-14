import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function staffClient(roles: string[]) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");

  const fetchProfile = () =>
    supabase.from("profiles").select("role").eq("id", userId).maybeSingle();

  let { data: profile, error } = await fetchProfile();
  if (error) {
    // Gangguan sesaat Supabase/PostgREST terjadi lebih sering daripada
    // kesalahan permanen — beri satu kesempatan kedua.
    await sleep(300);
    ({ data: profile, error } = await fetchProfile());
  }
  if (error) {
    // Kueri gagal: jangan disalahartikan sebagai "tidak berhak".
    console.error("staffClient profiles query:", error);
    throw new Error(
      "Layanan data sedang bermasalah. Muat ulang halaman; bila masih gagal, keluar lalu login ulang.",
    );
  }
  if (!profile || !roles.includes(profile.role ?? ""))
    throw new Error("Akses ditolak.");
  return { supabase, userId, role: profile.role };
}
