import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Satu verifikasi sesi dan profil per request, dipakai ulang Server Component. */
export const getCurrentProfile = cache(async () => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub ?? null;
  if (!userId) return { supabase, userId, profile: null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, display_name, commissariat_id")
    .eq("id", userId)
    .maybeSingle();
  return { supabase, userId, profile };
});

export async function createClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase belum dikonfigurasi.");
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          /* Perubahan cookie dilakukan oleh Proxy saat merender halaman. */
        }
      },
    },
  });
}
