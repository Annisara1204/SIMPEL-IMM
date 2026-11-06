"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveObservation } from "../penilaian/actions";

type Props = { participantId: string; indicatorId: string; score: number | null; note: string; revision: number; updatedAt: string | null; history: { score: number | null; note: string | null; revision: number; changed_at: string }[] };

export function ObservationCell(props: Props) {
  const router = useRouter();
  const [score, setScore] = useState(props.score?.toString() ?? "");
  const [note, setNote] = useState(props.note);
  const [synced, setSynced] = useState({ score: props.score?.toString() ?? "", note: props.note });
  const [revision, setRevision] = useState(props.revision);
  const [message, setMessage] = useState("Belum disimpan");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (score === synced.score && note === synced.note) return;
      setMessage("Menyimpan…");
      startTransition(async () => {
        const result = await saveObservation({ participantId: props.participantId, indicatorId: props.indicatorId, score: score ? Number(score) : null, note, expectedRevision: revision });
        if (!result.ok) { setMessage(result.message); return; }
        setRevision(result.revision);
        setSynced({ score, note });
        setMessage("Tersimpan");
        router.refresh();
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [score, note, revision, props.participantId, props.indicatorId, props.score, props.note, synced, router]);

  return <div className="observation-cell">
    <label>Nilai<select value={score} onChange={(event) => setScore(event.target.value)} disabled={isPending}><option value="">Belum diamati</option>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} · {(["", "Belum terlihat", "Mulai berkembang", "Cukup", "Baik", "Sangat baik"] as string[])[value]}</option>)}</select></label>
    <label>Catatan observasi privat<textarea value={note} maxLength={2000} rows={2} onChange={(event) => setNote(event.target.value)} disabled={isPending} placeholder="Catatan hanya dapat dilihat Observer dan Admin Sistem"/></label>
    <small aria-live="polite">{message}{props.updatedAt && ` · Terakhir disimpan ${new Date(props.updatedAt).toLocaleString("id-ID")}`}</small>
    {message.includes("perubahan dari") || message.includes("baru saja mengisi") ? <button type="button" className="text-button" onClick={() => router.refresh()}>Muat ulang</button> : null}
    {!!props.history.length && <details className="observation-history"><summary>Riwayat perubahan ({props.history.length})</summary>{[...props.history].sort((a, b) => b.revision - a.revision).slice(0, 5).map((item) => <p key={item.revision}>Versi {item.revision}: {item.score === null ? "Belum diamati" : `skor ${item.score}`} · {item.note || "tanpa catatan"} · {new Date(item.changed_at).toLocaleString("id-ID")}</p>)}</details>}
  </div>;
}
