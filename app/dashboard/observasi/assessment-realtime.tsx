"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AssessmentRealtime({ versionId }: { versionId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState("Menghubungkan Realtime…");
  useEffect(() => {
    const client = createClient();
    const emit = (table: string, payload: { new?: Record<string, unknown>; old?: Record<string, unknown> }) => {
      const row = payload.new && Object.keys(payload.new).length ? payload.new : payload.old ?? {};
      window.dispatchEvent(new CustomEvent("assessment-realtime-change", { detail: { table, row } }));
    };
    const channel = client.channel(`assessment-version-${versionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "observations" }, (payload) => emit("observations", payload))
      .on("postgres_changes", { event: "*", schema: "public", table: "assessment_ratings", filter: `rubric_version_id=eq.${versionId}` }, (payload) => { emit("assessment_ratings", payload); router.refresh(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "assessment_submissions", filter: `rubric_version_id=eq.${versionId}` }, (payload) => { emit("assessment_submissions", payload); router.refresh(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "observer_notes", filter: `rubric_version_id=eq.${versionId}` }, (payload) => emit("observer_notes", payload))
      .subscribe((nextStatus) => {
        setStatus(nextStatus === "SUBSCRIBED" ? "Realtime tersambung" : nextStatus === "CHANNEL_ERROR" || nextStatus === "TIMED_OUT" ? "Realtime terputus · simpan otomatis tetap aktif" : "Menghubungkan Realtime…");
      });
    return () => { void client.removeChannel(channel); };
  }, [versionId, router]);
  return <span className="agenda-status live" aria-live="polite">{status}</span>;
}
