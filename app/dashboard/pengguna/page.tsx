import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assignUserCommissariat, updateUserRole } from "./actions";

const roles = [
  ["admin_system", "Admin Sistem"],
  ["bidang_kader", "Bidang Kader"],
  ["observer", "Observer"],
  ["komisariat", "Komisariat"],
  ["peserta", "Peserta"],
] as const;

export default async function UsersPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return <main className="setup-message"><h1>Supabase belum dikonfigurasi</h1><p>Atur koneksi lokal mengikuti README.md sebelum membuka pengelolaan akun.</p><a href="/login">Kembali ke login</a></main>;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");
  const { data: actor } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (actor?.role !== "admin_system") redirect("/dashboard");

  const [{ data: users, error }, { data: commissariats }] = await Promise.all([
    supabase.from("profiles").select("id, display_name, role, commissariat_id, created_at").order("created_at", { ascending: true }),
    supabase.from("commissariats").select("id, name").eq("is_active", true).order("name"),
  ]);

  return <main className="users-page">
    <a className="users-back" href="/dashboard">← Kembali ke dashboard</a>
    <div className="users-heading"><div><p className="login-eyebrow">PENGELOLAAN AKUN</p><h1>Pengguna dan role</h1><p>Tetapkan wewenang untuk akun yang sudah dibuat di Supabase Authentication.</p></div><span className="sample-tag">TAHAP 2</span></div>
    <div className="users-notice"><strong>Catatan</strong><p>Halaman ini mengatur role akun yang sudah ada. Untuk membuat akun baru, Admin tetap menggunakan Supabase Authentication → Users. Akun tanpa role belum dapat masuk ke dashboard.</p></div>
    {error ? <p className="users-error">Daftar pengguna belum dapat dibaca. Pastikan migrasi RLS sudah dijalankan.</p> : !users?.length ? <p className="users-empty">Belum ada profil pengguna.</p> : <div className="users-table-wrap"><table className="users-table"><thead><tr><th>Nama tampilan</th><th>ID akun</th><th>Role</th><th>Tautan Komisariat</th><th>Aksi</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td>{user.display_name || "Belum diisi"}{user.id === userId && <small className="you-label">Akun Anda</small>}</td><td><code>{user.id}</code></td><td>{user.role ? roles.find(([value]) => value === user.role)?.[1] ?? user.role : "Belum diberi role"}</td><td>{user.role === "komisariat" ? user.commissariat_id ? <form action={assignUserCommissariat} className="role-edit-form"><input type="hidden" name="userId" value={user.id}/><select name="commissariatId" defaultValue={user.commissariat_id} required aria-label={`Komisariat untuk ${user.display_name || user.id}`}>{commissariats?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button type="submit">Tautkan</button></form> : <form action={assignUserCommissariat} className="role-edit-form"><input type="hidden" name="userId" value={user.id}/><select name="commissariatId" defaultValue="" required aria-label={`Pilih Komisariat untuk ${user.display_name || user.id}`}><option value="" disabled>Pilih Komisariat</option>{commissariats?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button type="submit">Tautkan</button></form> : <span className="self-role-note">—</span>}</td><td>{user.id === userId ? <span className="self-role-note">Role akun aktif dikunci</span> : <form action={updateUserRole} className="role-edit-form"><input type="hidden" name="userId" value={user.id}/><select name="role" defaultValue={user.role ?? "none"} aria-label={`Role untuk ${user.display_name || user.id}`}><option value="none">Tanpa akses</option>{roles.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><button type="submit">Simpan role</button></form>}</td></tr>)}</tbody></table></div>}
  </main>;
}
