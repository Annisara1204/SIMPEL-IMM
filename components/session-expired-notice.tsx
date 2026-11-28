"use client";

import { useSearchParams } from "next/navigation";

/** Pesan sesi berakhir pada halaman login. */
export function SessionExpiredNotice() {
  const params = useSearchParams();
  if (params.get("reason") !== "session") return null;
  return (
    <p className="notice notice--danger" role="alert">
      Sesi Anda sudah berakhir. Masuk lagi untuk melanjutkan.
    </p>
  );
}
