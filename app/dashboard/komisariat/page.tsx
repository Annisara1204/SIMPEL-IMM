import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  addCommissariat,
  editCommissariat,
  setCommissariatActive,
} from "./actions";

const messages: Record<string, string> = {
  added: "Komisariat berhasil ditambahkan.",
  updated: "Nama Komisariat berhasil diperbarui.",
  activated: "Komisariat diaktifkan kembali.",
  deactivated: "Komisariat dinonaktifkan. Riwayatnya tetap tersimpan.",
};

export default async function CommissariatsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
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
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.role !== "admin_system") redirect("/dashboard");
  const [{ data: commissariats, error }, params] = await Promise.all([
    supabase
      .from("commissariats")
      .select("id, name, is_active, created_at")
      .order("name"),
    searchParams,
  ]);
  return (
    <main className="users-page">
      <Link className="users-back" href="/dashboard">
        ← Kembali ke dashboard
      </Link>
      <div className="users-heading">
        <div>
          <p className="login-eyebrow">PENGELOLAAN DATA</p>
          <h1>Daftar Komisariat</h1>
          <p>
            Tambah, ganti nama, atau nonaktifkan Komisariat. Entri yang
            dinonaktifkan tetap tersimpan untuk menjaga riwayat.
          </p>
        </div>
      </div>
      {params.status && messages[params.status] && (
        <p className="commission-success" role="status">
          {messages[params.status]}
        </p>
      )}
      <form action={addCommissariat} className="commission-add-form">
        <label>
          Nama Komisariat baru
          <input
            required
            minLength={3}
            maxLength={120}
            name="name"
            placeholder="Contoh: Komisariat Simulasi 04"
          />
        </label>
        <button type="submit">Tambah Komisariat</button>
      </form>
      {error ? (
        <p className="users-error">
          Data belum dapat dibaca. Hubungi Admin sistem bila masalah berulang.
        </p>
      ) : !commissariats?.length ? (
        <p className="users-empty">
          Belum ada Komisariat. Tambahkan nama simulasi di atas.
        </p>
      ) : (
        <div className="users-table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th scope="col">Nama Komisariat</th>
                <th scope="col">Status</th>
                <th scope="col">Ubah nama</th>
                <th scope="col">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {commissariats.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>
                    <span
                      className={`agenda-status ${item.is_active ? "done" : "next"}`}
                    >
                      {item.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td>
                    <form
                      action={editCommissariat}
                      className="commission-edit-form"
                    >
                      <input type="hidden" name="id" value={item.id} />
                      <input
                        required
                        minLength={3}
                        maxLength={120}
                        name="name"
                        defaultValue={item.name}
                        aria-label={`Nama baru untuk ${item.name}`}
                      />
                      <button type="submit">Simpan</button>
                    </form>
                  </td>
                  <td>
                    <form action={setCommissariatActive}>
                      <input type="hidden" name="id" value={item.id} />
                      <input
                        type="hidden"
                        name="active"
                        value={String(!item.is_active)}
                      />
                      <button className="remove-button" type="submit">
                        {item.is_active ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="privacy-note">
        Daftar contoh ini memakai nama simulasi. Nama nyata dapat dimasukkan
        kemudian melalui halaman ini. Nama harus unik; perubahan nama tidak
        mengganti ID Komisariat.
      </p>
    </main>
  );
}
