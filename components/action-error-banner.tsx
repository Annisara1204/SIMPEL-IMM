"use client";

import { useSearchParams } from "next/navigation";
import { safeActionMessage } from "@/lib/action-error-messages";

/** Pesan kegagalan Server Action yang dikirim lewat query `?error=`. */
export function ActionErrorBanner() {
  const params = useSearchParams();
  const error = params.get("error");
  if (!error) return null;
  const field = params.get("field");
  return (
    <p className="notice notice--danger" role="alert">
      {safeActionMessage(error)}
      {field && /^[a-zA-Z0-9_-]+$/.test(field) && (
        <>
          {" "}
          <a href={`#${field}`}>Kembali ke kolom yang bermasalah</a>
        </>
      )}
    </p>
  );
}
