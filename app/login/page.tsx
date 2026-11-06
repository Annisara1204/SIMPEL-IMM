"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: String(form.get("email") ?? "").trim(),
        password: String(form.get("password") ?? ""),
      });
      if (signInError) throw signInError;
      router.replace("/dashboard"); router.refresh();
    } catch (err) {
      setError(err instanceof Error && err.message.includes("belum dikonfigurasi")
        ? "Login belum disambungkan. Admin perlu mengatur Supabase sesuai README.md."
        : "Email atau kata sandi tidak cocok, atau akun belum aktif.");
    } finally { setLoading(false); }
  }
  return <main className="login-page"><a href="/" className="login-back">← Kembali ke informasi publik</a><section className="login-card"><div className="login-mark">i<span>•</span></div><p className="login-eyebrow">IMM OBSERVER · KOTA BANDUNG</p><h1>Masuk ke akun</h1><p className="login-description">Gunakan email dan kata sandi akun yang diberikan Admin.</p>
    <form onSubmit={submit} className="login-form"><label>Email<input name="email" type="email" autoComplete="username" required placeholder="nama@email.com"/></label><label>Kata sandi<input name="password" type="password" autoComplete="current-password" required placeholder="Masukkan kata sandi"/></label>{error && <p className="login-error" role="alert">{error}</p>}<button disabled={loading}>{loading ? "Memeriksa…" : "Masuk"}</button></form>
    <p className="login-footnote">Akun dibuat oleh Admin. Pendaftaran umum tidak tersedia.</p></section></main>;
}
