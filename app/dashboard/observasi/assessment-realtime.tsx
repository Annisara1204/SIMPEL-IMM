"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AssessmentRealtime({ versionId }: { versionId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState("Menghubungkan Realtime…");
  useEffect(() => {
    const client = createClient();
    let channel: ReturnType<typeof client.channel> | null = null;
    let cancelled = false;
    const emit = (
      table: string,
      payload: { new?: Record<string, unknown>; old?: Record<string, unknown> },
    ) => {
      const row =
        payload.new && Object.keys(payload.new).length
          ? payload.new
          : (payload.old ?? {});
      window.dispatchEvent(
        new CustomEvent("assessment-realtime-change", {
          detail: { table, row },
        }),
      );
    };
    const subscribe = (accessToken: string | null) => {
      if (cancelled) return;
      if (accessToken) client.realtime.setAuth(accessToken);
      channel = client
        .channel(`assessment-version-${versionId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "observations" },
          (payload) => emit("observations", payload),
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "assessment_ratings",
            filter: `rubric_version_id=eq.${versionId}`,
          },
          (payload) => {
            emit("assessment_ratings", payload);
            router.refresh();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "assessment_submissions",
            filter: `rubric_version_id=eq.${versionId}`,
          },
          (payload) => {
            emit("assessment_submissions", payload);
            router.refresh();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "observer_notes",
            filter: `rubric_version_id=eq.${versionId}`,
          },
          (payload) => emit("observer_notes", payload),
        )
        .subscribe((nextStatus) => {
          setStatus(
            nextStatus === "SUBSCRIBED"
              ? "Realtime tersambung"
              : nextStatus === "CHANNEL_ERROR" || nextStatus === "TIMED_OUT"
                ? "Realtime terputus · simpan otomatis tetap aktif"
                : "Menghubungkan Realtime…",
          );
        });
    };
    // Attach the user's session token to the realtime client BEFORE joining the
    // channel; joining anonymously receives nothing on projects with Realtime
    // Authorization enabled.
    client.auth
      .getSession()
      .then(({ data: { session } }) => {
        subscribe(session?.access_token ?? null);
      })
      .catch(() => {
        subscribe(null);
      });
    return () => {
      cancelled = true;
      if (channel) void client.removeChannel(channel);
    };
  }, [versionId, router]);
  return (
    <span className="agenda-status live" aria-live="polite">
      {status}
    </span>
  );
}
