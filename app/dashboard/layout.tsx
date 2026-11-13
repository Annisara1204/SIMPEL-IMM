import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { roleLabels } from "@/lib/navigation";
import type { AppRole } from "@/lib/roles";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return <>{children}</>;

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return <>{children}</>; // halaman menentukan sendiri (redirect login)

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", userId)
    .maybeSingle();

  const rawRole = profile?.role as AppRole | undefined;
  // Akun tanpa role tetap boleh masuk ke halaman (profil bisa diisi);
  // /dashboard menampilkan arahan "menunggu penetapan akses" untuk mereka.
  // Halaman lain menggerbang role masing-masing dan mengalihkan ke
  // /dashboard bila tidak berwenang.
  if (!rawRole || !(rawRole in roleLabels)) return <>{children}</>;

  return (
    <AppShell role={rawRole} displayName={profile?.display_name ?? undefined}>
      {children}
    </AppShell>
  );
}
