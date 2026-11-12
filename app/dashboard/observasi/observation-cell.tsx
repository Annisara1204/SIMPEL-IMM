"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveObservation } from "../penilaian/assessment-actions";

type LatestValue = {
  score: number | null;
  revision: number;
  updated_at: string | null;
  updated_by_name: string | null;
  updated_by: string | null;
};
type DescriptorMap = Record<string, string>;
export type ScoreRevision = {
  id: number;
  score: number | null;
  note: string | null;
  revision: number;
  changed_at: string;
  actor_name: string | null;
  score_after: number | null;
  note_after: string | null;
};
type Props = {
  participantId: string;
  indicatorId: string;
  currentUserId: string;
  score: number | null;
  revision: number;
  updatedAt: string | null;
  updatedByName: string | null;
  updatedById: string | null;
  descriptors: DescriptorMap;
  history: ScoreRevision[];
};

export function ObservationCell(props: Props) {
  const router = useRouter();
  const initial = {
    score: props.score,
    revision: props.revision,
    updated_at: props.updatedAt,
    updated_by_name: props.updatedByName,
    updated_by: props.updatedById,
  };
  const [score, setScore] = useState(props.score?.toString() ?? "");
  const [syncedScore, setSyncedScore] = useState(props.score?.toString() ?? "");
  const [latest, setLatest] = useState<LatestValue>(initial);
  const [conflict, setConflict] = useState<LatestValue | null>(null);
  const [message, setMessage] = useState("Belum ada perubahan");
  const [isPending, startTransition] = useTransition();

  function receiveLatest(value: LatestValue) {
    if (value.revision <= latest.revision) return;
    setLatest(value);
    const incomingScore = value.score?.toString() ?? "";
    if (incomingScore === score) {
      setScore(incomingScore);
      setSyncedScore(incomingScore);
      setMessage("Tersimpan dan tersinkron ke perangkat lain");
      setConflict(null);
    } else if (score !== syncedScore || isPending) {
      setConflict(value);
      setMessage(
        "Skor berubah di perangkat lain. Pilih nilai yang akan dipakai.",
      );
    } else {
      setScore(value.score?.toString() ?? "");
      setSyncedScore(value.score?.toString() ?? "");
      setMessage(
        `Diperbarui oleh ${value.updated_by_name ?? "akun lain"} di perangkat lain`,
      );
      setConflict(null);
    }
  }

  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (
        event as CustomEvent<{ table: string; row: Record<string, unknown> }>
      ).detail;
      if (
        detail?.table !== "observations" ||
        detail.row.participant_id !== props.participantId ||
        detail.row.indicator_id !== props.indicatorId
      )
        return;
      receiveLatest({
        score: typeof detail.row.score === "number" ? detail.row.score : null,
        revision: Number(detail.row.revision ?? 0),
        updated_at:
          typeof detail.row.updated_at === "string"
            ? detail.row.updated_at
            : null,
        updated_by_name:
          typeof detail.row.updated_by_name === "string"
            ? detail.row.updated_by_name
            : null,
        updated_by:
          typeof detail.row.updated_by === "string"
            ? detail.row.updated_by
            : null,
      });
    };
    window.addEventListener("assessment-realtime-change", listener);
    return () =>
      window.removeEventListener("assessment-realtime-change", listener);
  });

  useEffect(() => {
    const currentDirty = score !== syncedScore;
    if (!currentDirty || conflict || isPending) return;
    const timer = window.setTimeout(() => {
      setMessage("Menyimpan…");
      startTransition(async () => {
        const result = await saveObservation({
          participantId: props.participantId,
          indicatorId: props.indicatorId,
          score: score === "" ? null : Number(score),
          expectedRevision: latest.revision,
        });
        if (!result.ok) {
          if ("conflict" in result && result.conflict && "latest" in result) {
            const server = result.latest as LatestValue;
            setLatest(server);
            setConflict(server);
            setMessage(result.message);
          } else setMessage(result.message);
          return;
        }
        setLatest((current) => ({
          ...current,
          score: score === "" ? null : Number(score),
          revision: result.revision,
          updated_at: new Date().toISOString(),
          updated_by: props.currentUserId,
        }));
        setSyncedScore(score);
        setMessage("Tersimpan");
        router.refresh();
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [
    score,
    syncedScore,
    latest.revision,
    conflict,
    isPending,
    props.participantId,
    props.indicatorId,
    router,
  ]);

  // Adjust derived state during render when the server revision advances;
  // this replaces an effect that only synced props into state.
  const [prevRevision, setPrevRevision] = useState(props.revision);
  if (props.revision !== prevRevision) {
    setPrevRevision(props.revision);
    if (props.revision > latest.revision) {
      receiveLatest({
        score: props.score,
        revision: props.revision,
        updated_at: props.updatedAt,
        updated_by_name: props.updatedByName,
        updated_by: props.updatedById,
      });
    }
  }

  const selectedDescription = score ? props.descriptors[score] : null;
  const useLatest = () => {
    const value = conflict;
    if (!value) return;
    setScore(value.score?.toString() ?? "");
    setSyncedScore(value.score?.toString() ?? "");
    setLatest(value);
    setConflict(null);
    setMessage("Menggunakan skor terbaru");
  };
  const reapplyMine = () => {
    if (!conflict) return;
    setLatest(conflict);
    setConflict(null);
    setMessage("Menerapkan pilihan Anda setelah konflik dikonfirmasi…");
  };

  return (
    <div className="observation-cell">
      <label>
        Nilai bersama
        <select
          value={score}
          onChange={(event) => setScore(event.target.value)}
          disabled={isPending || !!conflict}
        >
          <option value="">Belum diamati</option>
          {[1, 2, 3, 4, 5].map((value) => (
            <option key={value} value={value}>
              {value} ·{" "}
              {
                (
                  [
                    "",
                    "Sangat Kurang",
                    "Kurang",
                    "Cukup",
                    "Baik",
                    "Sangat Baik",
                  ] as string[]
                )[value]
              }
            </option>
          ))}
        </select>
      </label>
      {selectedDescription && (
        <p className="rubric-selected-description">
          <strong>Uraian skor {score}:</strong> {selectedDescription}
        </p>
      )}
      <details className="rubric-score-guide">
        <summary>Lihat uraian skor 1–5</summary>
        {[1, 2, 3, 4, 5].map((value) => (
          <p key={value}>
            <strong>
              {value} ·{" "}
              {
                (
                  [
                    "",
                    "Sangat Kurang",
                    "Kurang",
                    "Cukup",
                    "Baik",
                    "Sangat Baik",
                  ] as string[]
                )[value]
              }
              :
            </strong>{" "}
            {props.descriptors[String(value)]}
          </p>
        ))}
      </details>
      <small aria-live="polite">
        {message}
        {latest.updated_at &&
          ` · Terakhir diubah ${latest.updated_by_name ? `oleh ${latest.updated_by_name} · ` : ""}${new Date(latest.updated_at).toLocaleString("id-ID")}`}
      </small>
      {conflict && (
        <div className="observation-conflict" role="alert">
          <strong>Konflik perubahan</strong>
          <p>
            Nilai di server sekarang{" "}
            {conflict.score === null ? "Belum diamati" : conflict.score} · versi{" "}
            {conflict.revision}. Nilai yang Anda pilih{" "}
            {score === "" ? "Belum diamati" : score}.
          </p>
          <button type="button" onClick={useLatest} disabled={isPending}>
            Gunakan nilai terbaru
          </button>
          <button type="button" onClick={reapplyMine} disabled={isPending}>
            Terapkan ulang pilihan saya
          </button>
        </div>
      )}
      {!!props.history.length && (
        <details className="observation-history">
          <summary>Riwayat skor ({props.history.length})</summary>
          {[...props.history]
            .sort((a, b) => b.revision - a.revision)
            .slice(0, 10)
            .map((item) => (
              <p key={item.id}>
                {item.actor_name ? (
                  <>
                    <strong>{item.actor_name}</strong> ·{" "}
                    {item.score === null
                      ? "Belum diamati"
                      : `skor ${item.score}`}{" "}
                    →{" "}
                    {item.score_after === null
                      ? "Belum diamati"
                      : `skor ${item.score_after}`}
                  </>
                ) : (
                  <>
                    Riwayat lama:{" "}
                    {item.score === null
                      ? "Belum diamati"
                      : `skor ${item.score}`}{" "}
                    · pelaku perubahan belum tercatat
                  </>
                )}{" "}
                · {new Date(item.changed_at).toLocaleString("id-ID")}
              </p>
            ))}
        </details>
      )}
    </div>
  );
}
