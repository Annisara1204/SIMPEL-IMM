import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function InstructorProfilesPage() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
    redirect("/login");
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.role) redirect("/dashboard");

  const { data: identities, error } = await supabase.rpc(
    "list_instructor_public_identity",
  );
  const publicIdentities = (identities ?? []) as {
    full_name: string;
    photo_path: string | null;
  }[];
  const instructors = await Promise.all(
    publicIdentities.map(async (person, index) => {
      const photoUrl = person.photo_path
        ? ((
            await supabase.storage
              .from("account-profile-photos")
              .createSignedUrl(person.photo_path, 1800)
          ).data?.signedUrl ?? null)
        : null;
      return { id: index, fullName: person.full_name, photoUrl };
    }),
  );

  return (
    <main className="users-page">
      <a className="users-back" href="/dashboard">
        ← Kembali ke dashboard
      </a>
      <div className="users-heading">
        <div>
          <p className="login-eyebrow">PROFIL INSTRUKTUR</p>
          <h1>Daftar Instruktur</h1>
          <p>Nama lengkap dan foto instruktur yang sudah mengisi profil.</p>
        </div>
        <span className="sample-tag">UNTUK PENGGUNA MASUK</span>
      </div>
      {error ? (
        <p className="users-error">
          Daftar profil belum dapat dibaca. Pastikan migrasi akses nama dan foto
          sudah dijalankan.
        </p>
      ) : !instructors.length ? (
        <p className="users-empty">
          Belum ada Instruktur yang melengkapi profil.
        </p>
      ) : (
        <div className="instructor-duty-grid">
          {instructors.map((person) => (
            <article className="panel instructor-duty-card" key={person.id}>
              {person.photoUrl ? (
                <img
                  className="account-profile-photo directory-profile-photo"
                  src={person.photoUrl}
                  alt={`Foto ${person.fullName}`}
                />
              ) : (
                <div className="instructor-photo">
                  {person.fullName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <h3>{person.fullName}</h3>
            </article>
          ))}
        </div>
      )}
      <p className="privacy-note">
        Semua akun ber-role dapat melihat nama lengkap dan foto. Tempat/tanggal
        lahir, jenis kelamin, nomor handphone, dan alamat hanya terlihat oleh
        pemilik profil.
      </p>
    </main>
  );
}
