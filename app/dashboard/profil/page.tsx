import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateOwnProfile } from "./actions";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const query = await searchParams;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return <main className="setup-message"><h1>Supabase belum dikonfigurasi</h1><a href="/login">Kembali ke login</a></main>;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");
  const [{ data: profile }, { data: personalProfile }] = await Promise.all([
    supabase.from("profiles").select("display_name, account_type, username").eq("id", userId).maybeSingle(),
    supabase.from("account_personal_profiles").select("full_name, birth_place, birth_date, gender, phone_number, domicile_address, photo_path").eq("user_id", userId).maybeSingle(),
  ]);
  if (!profile) return <main className="setup-message"><h1>Profil belum tersedia</h1><p>Pastikan migrasi pendaftaran akun sudah dijalankan.</p></main>;
  const { data: photo } = personalProfile?.photo_path ? await supabase.storage.from("account-profile-photos").createSignedUrl(personalProfile.photo_path, 1800) : { data: null };
  return <main className="login-page"><a href="/dashboard" className="login-back">← Kembali ke dashboard</a><section className="login-card personal-profile-card"><p className="login-eyebrow">PROFIL AKUN</p><h1>Profil saya</h1><p className="login-description">Isi informasi diri Anda. Data pribadi hanya dapat dilihat oleh Anda dan Admin Sistem.</p>
    {query.status === "saved" && <p className="profile-success" role="status">Profil berhasil disimpan.</p>}
    {query.status === "invalid" && <p className="login-error" role="alert">Periksa kembali data wajib. Pilih Laki-laki atau Perempuan; nomor handphone harus berisi 8–15 angka dan tanggal lahir tidak boleh di masa depan.</p>}
    {query.status === "photo" && <p className="login-error" role="alert">Foto harus berformat JPG atau PNG dengan ukuran maksimal 5 MB.</p>}
    {query.status === "failed" && <p className="login-error" role="alert">Profil gagal disimpan. Pastikan migrasi profil terbaru sudah dijalankan.</p>}
    {photo?.signedUrl && <img className="account-profile-photo" src={photo.signedUrl} alt="Foto profil Anda"/>}
    <form action={updateOwnProfile} encType="multipart/form-data" className="login-form personal-profile-form"><label>Nama lengkap *<input name="fullName" defaultValue={personalProfile?.full_name ?? profile.display_name ?? ""} minLength={2} maxLength={120} required autoComplete="name"/></label><label>Tempat lahir *<input name="birthPlace" defaultValue={personalProfile?.birth_place ?? ""} minLength={2} maxLength={120} required autoComplete="off"/></label><label>Tanggal lahir *<input name="birthDate" type="date" defaultValue={personalProfile?.birth_date ?? ""} max={new Date().toISOString().slice(0, 10)} required/></label><label>Jenis kelamin *<select name="gender" defaultValue={personalProfile?.gender === "Laki-laki" || personalProfile?.gender === "Perempuan" ? personalProfile.gender : ""} required><option value="" disabled>Pilih jenis kelamin</option><option value="Laki-laki">Laki-laki</option><option value="Perempuan">Perempuan</option></select></label><label>Nomor handphone *<input name="phoneNumber" type="tel" defaultValue={personalProfile?.phone_number ?? ""} minLength={8} maxLength={24} required autoComplete="tel" placeholder="Contoh: 08… atau +62…"/></label><label>Alamat domisili *<textarea name="domicileAddress" defaultValue={personalProfile?.domicile_address ?? ""} minLength={5} maxLength={500} required autoComplete="street-address" rows={3}/></label><label className="profile-photo-field">Foto terbaru (opsional)<input type="file" name="photo" accept="image/jpeg,image/png"/><small>JPG atau PNG, maksimal 5 MB. Jika dikosongkan, foto lama tetap digunakan.</small></label><div className="profile-account-meta">{profile.username && <span>Username: <strong>{profile.username}</strong></span>}<span>Jenis akun: <strong>{profile.account_type === "temporary" ? "Sementara · instruktur perbantuan" : "Permanen · instruktur tetap"}</strong></span></div><button type="submit">Simpan profil</button></form>
  </section></main>;
}
