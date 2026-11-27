import {
  buildAutoCompetencyMap,
  type CompetencySnapshotRow,
} from "./auto-competency.ts";
import type {
  AssessmentSummaryRow,
  ReportSnapshotData,
} from "./supabase-rows.ts";

export type TrainingRecapSnapshot = {
  id: string;
  participant_id: string;
  snapshot_data: ReportSnapshotData | null;
  rubric_version_ids: string[] | null;
  finalized_at: string | null;
};

/**
 * Menyaring data rekap untuk satu versi rubrik Pelatihan.
 * Aturan nilai (snapshot final menang, sisanya agregasi sementara) memakai
 * jalur yang sama dengan peta kompetensi otomatis agar angkanya konsisten.
 */
export function buildTrainingRecap({
  participants,
  summaryRows,
  snapshots,
  rubricVersionId,
  minimumCoverage,
}: {
  participants: { id: string; display_name: string }[];
  summaryRows: AssessmentSummaryRow[];
  snapshots: TrainingRecapSnapshot[];
  rubricVersionId: string;
  minimumCoverage: number;
}) {
  const scopedSummary = summaryRows.filter(
    (row) =>
      row.assessment_scope_key === `session:${rubricVersionId}` ||
      (row.assessment_scope === "cross_session" &&
        Array.isArray(row.source_rubric_version_ids) &&
        row.source_rubric_version_ids.includes(rubricVersionId)),
  );
  const snapshotRows: CompetencySnapshotRow[] = snapshots
    .filter(
      (snapshot) =>
        snapshot.finalized_at &&
        Array.isArray(snapshot.rubric_version_ids) &&
        snapshot.rubric_version_ids.includes(rubricVersionId),
    )
    .map((snapshot) => ({
      participant_id: snapshot.participant_id,
      display_name:
        participants.find((person) => person.id === snapshot.participant_id)
          ?.display_name ?? "Peserta",
      snapshot_id: snapshot.id,
      snapshot_data: snapshot.snapshot_data,
      finalized_at: snapshot.finalized_at,
      publication_revision: null,
    }));
  return buildAutoCompetencyMap({
    participants,
    summaryRows: scopedSummary,
    snapshotRows,
    minimumCoverage,
  });
}

export type TrainingMaterialColumn = { name: string; versionId: string };

export type TrainingRecapMatrixRow = {
  participantId: string;
  displayName: string;
  scores: Map<string, number | null>;
};

/**
 * Tabel rekap: satu kolom per materi Pelatihan, satu baris per peserta.
 * Bila satu materi punya beberapa versi aktif, versi terbesar yang dipakai.
 */
export function buildTrainingMatrix({
  participants,
  versions,
  summaryRows,
  snapshots,
  minimumCoverage,
}: {
  participants: { id: string; display_name: string }[];
  versions: { id: string; name: string; version: number }[];
  summaryRows: AssessmentSummaryRow[];
  snapshots: TrainingRecapSnapshot[];
  minimumCoverage: number;
}): { columns: TrainingMaterialColumn[]; rows: TrainingRecapMatrixRow[] } {
  const byName = new Map<string, { versionId: string; version: number }>();
  for (const version of versions) {
    const name = version.name.trim() || "Materi";
    const current = byName.get(name);
    if (!current || version.version > current.version)
      byName.set(name, { versionId: version.id, version: version.version });
  }
  const columns: TrainingMaterialColumn[] = [...byName.entries()].map(
    ([name, item]) => ({ name, versionId: item.versionId }),
  );
  const scores = new Map<string, Map<string, number | null>>();
  for (const column of columns) {
    const recap = buildTrainingRecap({
      participants,
      summaryRows,
      snapshots,
      rubricVersionId: column.versionId,
      minimumCoverage,
    });
    for (const row of recap.rows) {
      const participantScores = scores.get(row.participantId) ?? new Map();
      participantScores.set(column.name, row.finalScore);
      scores.set(row.participantId, participantScores);
    }
  }
  return {
    columns,
    rows: participants.map((person) => ({
      participantId: person.id,
      displayName: person.display_name,
      scores: scores.get(person.id) ?? new Map(),
    })),
  };
}
