"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="setup-message">
      <h1>Halaman gagal dimuat</h1>
      <p>
        Maaf, terjadi kesalahan saat memuat halaman ini. Coba muat ulang; bila
        masalah berulang, hubungi Admin sistem.
      </p>
      <button type="button" onClick={reset}>
        Muat ulang
      </button>{" "}
      <Link prefetch={false} className="users-back" href="/dashboard">
        Kembali ke Ringkasan
      </Link>
    </main>
  );
}
