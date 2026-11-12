import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signMany } from "@/lib/signed-urls";
import { PrivateImg } from "@/components/private-img";

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
  const instructorPhotoUrls = await signMany(
    supabase,
    "account-profile-photos",
    publicIdentities.map((person) => person.photo_path),
    1800,
  );
  const instructors = publicIdentities.map((person, index) => ({
    id: index,
    fullName: person.full_name,
    photoUrl: person.photo_path
      ? (instructorPhotoUrls.get(person.photo_path) ?? null)
      : null,
  }));

  return (
    <main className="users-page">
      <Link className="users-back" href="/dashboard">
        ← Kembali ke dashboard
      </Link>
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
          Data belum dapat dibaca. Hubungi Admin sistem bila masalah berulang.
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
                <PrivateImg
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
