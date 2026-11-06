"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveObservation } from "../penilaian/actions";

type Props = { participantId: string; indicatorId: string; score: number | null; note: string; revision: number; updatedAt: string | null; updatedByName: string | null; history: { score: number | null; note: string | null; revision: number; changed_at: string; actor_name: string | null; score_after: number | null; note_after: string | null }[] };

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
    <label>Catatan observasi terbatas<textarea value={note} maxLength={2000} rows={2} onChange={(event) => setNote(event.target.value)} disabled={isPending} placeholder="Terlihat oleh Observer yang ditugaskan, Instruktur yang ditugaskan, dan Superadmin"/></label>
    <small aria-live="polite">{message}{props.updatedAt && ` · Terakhir diubah oleh ${props.updatedByName ?? "Akun pengguna"} · ${new Date(props.updatedAt).toLocaleString("id-ID")}`}</small>
    {message.includes("perubahan dari") || message.includes("baru saja mengisi") ? <button type="button" className="text-button" onClick={() => router.refresh()}>Muat ulang</button> : null}
    {!!props.history.length && <details className="observation-history"><summary>Riwayat perubahan ({props.history.length})</summary>{[...props.history].sort((a, b) => b.revision - a.revision).slice(0, 10).map((item) => <p key={item.revision}>{item.actor_name ? <><strong>{item.actor_name}</strong> · {item.score === null ? "Belum diamati" : `skor ${item.score}`} → {item.score_after === null ? "Belum diamati" : `skor ${item.score_after}`} · catatan “{item.note || "kosong"}” → “{item.note_after || "kosong"}”</> : <>Riwayat lama: {item.score === null ? "Belum diamati" : `skor ${item.score}`} · catatan “{item.note || "kosong"}” · pelaku perubahan belum tercatat</>} · {new Date(item.changed_at).toLocaleString("id-ID")}</p>)}</details>}
  </div>;
}
