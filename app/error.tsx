"use client";
import Link from "next/link";

import { useEffect } from "react";

export default function GlobalError({
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
      <h1>Terjadi kesalahan</h1>
      <p>
        Maaf, terjadi kesalahan saat memuat halaman ini. Coba muat ulang; bila
        masih bermasalah, hubungi Admin sistem.
      </p>
      <button type="button" onClick={reset}>
        Muat ulang
      </button>{" "}
      <Link prefetch={false} className="users-back" href="/">
        Kembali ke beranda
      </Link>
    </main>
  );
}
