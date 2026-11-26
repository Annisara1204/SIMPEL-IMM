import type { ReportSnapshotData, SnapshotAspect } from "./supabase-rows";

export type ReportSummaryRow = {
  participant_id: string;
  display_name: string;
  snapshot_id: string | null;
  snapshot_data: ReportSnapshotData | null;
  finalized_at: string | null;
  publication_revision: number | null;
};

export type ParticipantSummary = {
  key: string;
  displayName: string;
  finalScore: number | null;
  decision: string;
  aspectScores: Map<string, number>;
};

const aspectNameOf = (aspect: SnapshotAspect) =>
  String(aspect.aspectName ?? aspect.aspect_name ?? "Aspek").trim() || "Aspek";

const scoreOf = (row: ReportSummaryRow) =>
  typeof row.snapshot_data?.overall?.score === "number"
    ? Number(row.snapshot_data.overall.score)
    : null;

const decisionOf = (row: ReportSummaryRow) =>
  row.snapshot_data?.collective?.decision ?? "";

/**
 * Satu peserta = satu baris ringkas. Nilai akhir adalah rata-rata sederhana
 * dari semua snapshot final peserta. Aspek disatukan berdasarkan nama, bukan
 * ID unik versi rubrik, karena tiap materi memakai UUID aspek berbeda.
 * Keputusan diambil dari snapshot dengan finalized_at terbaru.
 */
export function summarizeParticipants(
  rows: ReportSummaryRow[],
): ParticipantSummary[] {
  const groups = new Map<string, ReportSummaryRow[]>();
  for (const row of rows) {
    const key = row.participant_id || row.display_name;
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => {
    const ordered = [...group].sort(
      (a, b) =>
        String(b.finalized_at ?? "").localeCompare(
          String(a.finalized_at ?? ""),
        ) || (b.publication_revision ?? 0) - (a.publication_revision ?? 0),
    );
    const scores = group
      .map(scoreOf)
      .filter((score): score is number => score !== null);
    const counters = new Map<string, { sum: number; count: number }>();
    for (const row of group) {
      for (const aspect of row.snapshot_data?.aspects ?? []) {
        if (typeof aspect.score !== "number") continue;
        const name = aspectNameOf(aspect);
        const entry = counters.get(name) ?? { sum: 0, count: 0 };
        entry.sum += Number(aspect.score);
        entry.count++;
        counters.set(name, entry);
      }
    }
    const aspectScores = new Map<string, number>();
    for (const [name, entry] of counters)
      aspectScores.set(name, entry.sum / entry.count);
    return {
      key: ordered[0]?.participant_id ?? ordered[0]?.display_name ?? "",
      displayName: ordered[0]?.display_name ?? group[0].display_name,
      finalScore: scores.length
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length
        : null,
      decision: decisionOf(ordered[0]),
      aspectScores,
    };
  });
}
