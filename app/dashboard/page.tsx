import { redirect } from "next/navigation";
import { RoleDashboard, type AppRole } from "@/components/role-dashboard";
import { createClient } from "@/lib/supabase/server";

const allowedRoles: AppRole[] = ["admin_system", "bidang_kader", "observer", "komisariat", "peserta"];

export default async function DashboardPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return <main className="setup-message"><h1>Login belum dikonfigurasi</h1><p>Siapkan proyek Supabase dan ikuti panduan lokal di README.md. Dashboard internal belum dapat dibuka.</p><a href="/login">Kembali ke login</a></main>;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");
  const { data: profile, error } = await supabase.from("profiles").select("display_name, role").eq("id", userId).maybeSingle();
  if (error) return <main className="setup-message"><h1>Profil belum tersedia</h1><p>Periksa apakah migrasi basis data telah dijalankan. Hubungi Admin sistem bila masalah berlanjut.</p><form action="/auth/signout" method="post"><button>Keluar</button></form></main>;
  if (!profile?.role || !allowedRoles.includes(profile.role as AppRole)) return <main className="setup-message"><h1>Akses belum diberikan</h1><p>Akun Anda belum memiliki role. Hubungi Admin sistem untuk mengatur akses.</p><form action="/auth/signout" method="post"><button>Keluar</button></form></main>;
  return <RoleDashboard role={profile.role as AppRole} displayName={profile.display_name ?? undefined} />;
}

