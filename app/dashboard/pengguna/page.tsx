import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  assignUserCommissariat,
  createTemporaryInstructor,
  updateUserRole,
} from "./actions";

const roles = [
  ["admin_system", "Admin Sistem"],
  ["bidang_kader", "Bidang Kader"],
  ["observer", "Observer"],
  ["instruktur", "Instruktur"],
  ["komisariat", "Komisariat"],
  ["peserta", "Peserta"],
] as const;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ akun?: string }>;
}) {
  const query = await searchParams;
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
    return (
      <main className="setup-message">
        <h1>Supabase belum dikonfigurasi</h1>
        <p>Aplikasi belum siap digunakan. Hubungi Admin sistem.</p>
        <Link href="/login">Kembali ke login</Link>
      </main>
    );
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");
  const { data: actor } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (actor?.role !== "admin_system") redirect("/dashboard");

  const [{ data: users, error }, { data: commissariats }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, display_name, role, account_type, username, commissariat_id, created_at",
      )
      .order("created_at", { ascending: true }),
    supabase
      .from("commissariats")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
  ]);

  return (
    <main className="users-page">
      <Link className="users-back" href="/dashboard">
        ← Kembali ke dashboard
      </Link>
      <div className="users-heading">
        <div>
          <p className="login-eyebrow">PENGELOLAAN AKUN</p>
          <h1>Pengguna dan role</h1>
          <p>
            Kelola akun, tetapkan role, lalu tugaskan subrole Instruktur per
            kegiatan.
          </p>
        </div>
        <span className="sample-tag">ADMIN</span>
      </div>
      <div className="users-notice">
        <strong>Akun permanen dan sementara</strong>
        <p>
          Instruktur tetap mendaftar sendiri. Instruktur perbantuan dibuat dari
          formulir ini. Akun baru belum mendapat akses dashboard sampai role
          ditetapkan.
        </p>
      </div>
      {query.akun === "setup" && (
        <p className="users-error">
          Pembuatan akun sementara perlu SUPABASE_SERVICE_ROLE_KEY di
          konfigurasi server.
        </p>
      )}
      {query.akun === "failed" && (
        <p className="users-error">
          Akun gagal dibuat. Periksa username, kata sandi, dan koneksi Supabase.
        </p>
      )}
      {query.akun === "invalid" && (
        <p className="users-error">
          Periksa nama, username (3–32 karakter), dan kata sandi minimal 10
          karakter.
        </p>
      )}
      <form action={createTemporaryInstructor} className="commission-add-form">
        <label>
          Nama tampilan
          <input
            name="displayName"
            minLength={2}
            maxLength={100}
            required
            placeholder="Nama instruktur"
          />
        </label>
        <label>
          Username
          <input
            name="username"
            minLength={3}
            maxLength={32}
            pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,31}"
            required
            placeholder="contoh: instruktur01"
            autoComplete="off"
          />
        </label>
        <label>
          Kata sandi sementara
          <input
            name="password"
            type="password"
            minLength={10}
            required
            autoComplete="new-password"
            placeholder="Minimal 10 karakter"
          />
        </label>
        <button type="submit">Buat akun perbantuan</button>
      </form>
      {error ? (
        <p className="users-error">
          Data belum dapat dibaca. Hubungi Admin sistem bila masalah berulang.
        </p>
      ) : !users?.length ? (
        <p className="users-empty">Belum ada profil pengguna.</p>
      ) : (
        <div className="users-table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th scope="col">Jenis akun</th>
                <th scope="col">Nama / username</th>
                <th scope="col">ID akun</th>
                <th scope="col">Role</th>
                <th scope="col">Tautan Komisariat</th>
                <th scope="col">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    {user.account_type === "temporary"
                      ? "Sementara · perbantuan"
                      : "Permanen · tetap"}
                  </td>
                  <td>
                    {user.display_name || "Belum diisi"}
                    {user.username && (
                      <small className="you-label">@{user.username}</small>
                    )}
                    {user.id === userId && (
                      <small className="you-label">Akun Anda</small>
                    )}
                  </td>
                  <td>
                    <code>{user.id}</code>
                  </td>
                  <td>
                    {user.role
                      ? (roles.find(([value]) => value === user.role)?.[1] ??
                        user.role)
                      : "Belum diberi role"}
                  </td>
                  <td>
                    {user.role === "komisariat" ? (
                      user.commissariat_id ? (
                        <form
                          action={assignUserCommissariat}
                          className="role-edit-form"
                        >
                          <input type="hidden" name="userId" value={user.id} />
                          <select
                            name="commissariatId"
                            defaultValue={user.commissariat_id}
                            required
                            aria-label={`Komisariat untuk ${user.display_name || user.id}`}
                          >
                            {commissariats?.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                          <button type="submit">Tautkan</button>
                        </form>
                      ) : (
                        <form
                          action={assignUserCommissariat}
                          className="role-edit-form"
                        >
                          <input type="hidden" name="userId" value={user.id} />
                          <select
                            name="commissariatId"
                            defaultValue=""
                            required
                            aria-label={`Pilih Komisariat untuk ${user.display_name || user.id}`}
                          >
                            <option value="" disabled>
                              Pilih Komisariat
                            </option>
                            {commissariats?.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                          <button type="submit">Tautkan</button>
                        </form>
                      )
                    ) : (
                      <span className="self-role-note">—</span>
                    )}
                  </td>
                  <td>
                    {user.id === userId ? (
                      <span className="self-role-note">
                        Role akun aktif dikunci
                      </span>
                    ) : (
                      <form action={updateUserRole} className="role-edit-form">
                        <input type="hidden" name="userId" value={user.id} />
                        <select
                          name="role"
                          defaultValue={user.role ?? "none"}
                          aria-label={`Role untuk ${user.display_name || user.id}`}
                        >
                          <option value="none">Tanpa akses</option>
                          {roles.map(([value, label]) => (
                            <option value={value} key={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <button type="submit">Simpan role</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
