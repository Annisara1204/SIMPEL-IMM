import Link from "next/link";
import { requestInstructorAccount } from "./actions";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const query = await searchParams;
  return (
    <main className="login-page">
      <Link prefetch={false} href="/login" className="login-back">
        ← Kembali ke login
      </Link>
      <section className="login-card">
        <div className="login-mark">
          i<span>•</span>
        </div>
        <p className="login-eyebrow">INSTRUKTUR TETAP</p>
        <h1>Ajukan akun permanen</h1>
        <p className="login-description">
          Kirim nama dan email untuk diajukan. Admin Sistem akan membuat akun
          dan menetapkan peran. Belum ada kata sandi yang dibuat di halaman ini.
        </p>
        {query.status === "permintaan" && (
          <p className="profile-success" role="status">
            Permintaan diterima. Admin Sistem akan memproses akun Anda.
          </p>
        )}
        {query.error && (
          <p className="login-error" role="alert">
            {query.error === "data"
              ? "Isi nama dan email yang valid."
              : "Permintaan gagal dikirim. Coba lagi atau hubungi Admin sistem."}
          </p>
        )}
        <form action={requestInstructorAccount} className="login-form">
          <label>
            Nama lengkap
            <input
              name="displayName"
              autoComplete="name"
              minLength={2}
              maxLength={100}
              required
              placeholder="Nama lengkap"
            />
          </label>
          <label>
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="nama@email.com"
            />
          </label>
          <button type="submit">Kirim permintaan</button>
        </form>
        <p className="login-footnote">
          Instruktur perbantuan dibuat oleh Admin menggunakan username dan kata
          sandi.
        </p>
      </section>
    </main>
  );
}
