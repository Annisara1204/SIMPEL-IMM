"use client";

import { useEffect, useState } from "react";
import { subscribeAutosave } from "@/lib/autosave-announcer";

/** Satu wilayah pengumuman untuk status simpan di halaman Observasi. */
export function AutosaveStatusRegion() {
  const [message, setMessage] = useState("");
  useEffect(() => subscribeAutosave(setMessage), []);
  return (
    <span className="sr-only" role="status" aria-live="polite">
      {message}
    </span>
  );
}
