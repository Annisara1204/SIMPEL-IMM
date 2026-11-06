import { registerPermanentInstructor } from "./actions";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ status?: string; error?: string }> }) {
  const query = await searchParams;
  return <main className="login-page"><a href="/login" className="login-back">← Kembali ke login</a><section className="login-card"><div className="login-mark">i<span>•</span></div><p className="login-eyebrow">INSTRUKTUR TETAP</p><h1>Daftar akun permanen</h1><p className="login-description">Buat akun menggunakan email dan kata sandi. Akun akan menunggu Superadmin menetapkan role dan subrole sebelum fitur dashboard dapat digunakan.</p>
    {query.status === "email" && <p className="profile-success" role="status">Pendaftaran diterima. Periksa email untuk mengonfirmasi akun, lalu masuk kembali.</p>}
    {query.error && <p className="login-error" role="alert">{query.error === "data" ? "Isi nama, email yang valid, dan kata sandi minimal 10 karakter." : "Pendaftaran gagal. Pastikan email belum digunakan dan pengaturan Supabase sudah benar."}</p>}
    <form action={registerPermanentInstructor} className="login-form"><label>Nama tampilan<input name="displayName" autoComplete="name" minLength={2} maxLength={100} required placeholder="Nama lengkap"/></label><label>Email<input name="email" type="email" autoComplete="email" required placeholder="nama@email.com"/></label><label>Kata sandi<input name="password" type="password" autoComplete="new-password" minLength={10} required placeholder="Minimal 10 karakter"/></label><button type="submit">Daftar</button></form>
    <p className="login-footnote">Pendaftaran ini khusus instruktur tetap. Akun perbantuan dibuat oleh Superadmin menggunakan username dan kata sandi.</p></section></main>;
}
