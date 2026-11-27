"use client";

import { useSearchParams } from "next/navigation";

/** Pesan kegagalan Server Action yang dikirim lewat query `?error=`. */
export function ActionErrorBanner() {
  const params = useSearchParams();
  const error = params.get("error");
  if (!error) return null;
  return (
    <p className="notice notice--danger" role="alert">
      {error}
    </p>
  );
}
