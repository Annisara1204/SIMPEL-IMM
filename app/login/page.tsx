"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const supabase = createClient();
      const identity = String(form.get("email") ?? "").trim();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: identity.includes("@")
          ? identity
          : `${identity.toLowerCase()}@login.imm-observer.invalid`,
        password: String(form.get("password") ?? ""),
      });
      if (signInError) throw signInError;
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes("belum dikonfigurasi")
          ? "Login belum disambungkan. Admin perlu mengatur Supabase sesuai README.md."
          : "Email atau kata sandi tidak cocok, atau akun belum aktif.",
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="login-page">
      <Link href="/" className="login-back">
        ← Kembali ke informasi publik
      </Link>
      <section className="login-card">
        <div className="login-mark">
          i<span>•</span>
        </div>
        <p className="login-eyebrow">IMM OBSERVER · KOTA BANDUNG</p>
        <h1>Masuk ke akun</h1>
        <p className="login-description">
          Gunakan email dan kata sandi akun yang diberikan Admin.
        </p>
        <form onSubmit={submit} className="login-form">
          <label>
            Email atau username
            <input
              name="email"
              autoComplete="username"
              required
              placeholder="nama@email.com atau username"
            />
          </label>
          <label>
            Kata sandi
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Masukkan kata sandi"
            />
          </label>
          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}
          <button disabled={loading}>{loading ? "Memeriksa…" : "Masuk"}</button>
        </form>
        <p className="login-footnote">
          Instruktur tetap dapat{" "}
          <Link href="/daftar">mendaftar dengan email</Link>. Instruktur
          perbantuan memakai username yang diberikan Superadmin.
        </p>
      </section>
    </main>
  );
}
