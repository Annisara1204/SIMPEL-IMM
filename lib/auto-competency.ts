import {
  calculateAspectAggregates,
  calculateOverallScore,
  type IndicatorAggregate,
  type PlannedIndicator,
} from "./phase6-scoring.ts";
import { summarizeParticipants } from "./participant-summary.ts";
import type { AssessmentSummaryRow, ReportSnapshotData } from "./supabase-rows";

export type CompetencyParticipant = { id: string; display_name: string };

export type CompetencySnapshotRow = {
  participant_id: string;
  display_name: string;
  snapshot_id: string | null;
  snapshot_data: ReportSnapshotData | null;
  finalized_at: string | null;
  publication_revision: number | null;
};

export type CompetencyRow = {
  participantId: string;
  displayName: string;
  aspectScores: Map<string, number>;
  finalScore: number | null;
  status: "final" | "provisional";
};

/**
 * Peta kompetensi otomatis untuk semua peserta.
 *
 * Peserta yang sudah memiliki snapshot final memakai nilai dan aspek dari
 * snapshot tersebut (gabungan seluruh snapshotnya). Peserta lain memakai
 * agregasi penilaian terkini dan ditandai provisional. Materi yang diarsipkan
 * tidak ikut dalam agregasi sementara karena RPC hanya membaca rubrik aktif.
 */
export function buildAutoCompetencyMap({
  participants,
  summaryRows,
  snapshotRows,
  minimumCoverage,
}: {
  participants: CompetencyParticipant[];
  summaryRows: AssessmentSummaryRow[];
  snapshotRows: CompetencySnapshotRow[];
  minimumCoverage: number;
}): { columns: { name: string; weight: number }[]; rows: CompetencyRow[] } {
  const summaryByParticipant = new Map<string, AssessmentSummaryRow[]>();
  for (const row of summaryRows) {
    const group = summaryByParticipant.get(row.participant_id) ?? [];
    group.push(row);
    summaryByParticipant.set(row.participant_id, group);
  }
  const finalByParticipant = new Map(
    summarizeParticipants(snapshotRows).map((item) => [item.key, item]),
  );

  const columns = new Map<string, number>();
  const addAspectName = (name: string, weight: number) => {
    const trimmed = name.trim() || "Aspek";
    if (!columns.has(trimmed)) columns.set(trimmed, Number(weight) || 0);
  };
  for (const row of summaryRows)
    addAspectName(row.aspect_name, row.aspect_weight);
  for (const row of snapshotRows)
    for (const aspect of row.snapshot_data?.aspects ?? [])
      addAspectName(
        String(aspect.aspectName ?? aspect.aspect_name ?? "Aspek"),
        Number(aspect.weight ?? 0),
      );

  const rows = participants.map((participant): CompetencyRow => {
    const final = finalByParticipant.get(participant.id);
    if (final) {
      return {
        participantId: participant.id,
        displayName: participant.display_name,
        aspectScores: final.aspectScores,
        finalScore: final.finalScore,
        status: "final",
      };
    }
    const rowsFor = summaryByParticipant.get(participant.id) ?? [];
    const planned: PlannedIndicator[] = rowsFor.map((row) => ({
      participantId: participant.id,
      rubricVersionId: `summary:${row.assessment_scope_key}`,
      localIndicatorId: row.indicator_id,
      competencyIndicatorId: row.indicator_id,
      assessmentScope: row.assessment_scope,
      assessmentScopeKey: row.assessment_scope_key,
      aspectId: row.aspect_id,
      aspectName: row.aspect_name.trim() || "Aspek",
      aspectWeight: Number(row.aspect_weight),
      indicatorWeight: Number(row.indicator_weight),
      expectedObserverIds: [],
    }));
    const indicators: IndicatorAggregate[] = rowsFor.map((row) => ({
      participantId: participant.id,
      indicatorId: row.indicator_id,
      scope: row.assessment_scope,
      scopeKey: row.assessment_scope_key,
      sourceRubricVersionIds: row.source_rubric_version_ids ?? [],
      average: row.average_score === null ? null : Number(row.average_score),
      validRatings: Number(row.valid_rating_count),
      minimum: row.minimum_score === null ? null : Number(row.minimum_score),
      maximum: row.maximum_score === null ? null : Number(row.maximum_score),
      range: row.score_range === null ? null : Number(row.score_range),
      notObserved: Number(row.not_observed_count),
      pending: Number(row.pending_count),
      reviewStatus: row.review_status,
      observerScores: [],
    }));
    const aspects = calculateAspectAggregates(
      planned,
      indicators,
      minimumCoverage,
    );
    const aspectScores = new Map<string, number>();
    for (const aspect of aspects) {
      const name = aspect.aspectName.trim() || "Aspek";
      if (aspect.score !== null && !aspectScores.has(name))
        aspectScores.set(name, aspect.score);
    }
    const overall = calculateOverallScore(aspects);
    let finalScore = overall.score;
    if (finalScore === null) {
      const valid = aspects.filter(
        (aspect) => aspect.score !== null && Number(aspect.weight) > 0,
      );
      const weight = valid.reduce(
        (sum, aspect) => sum + Number(aspect.weight),
        0,
      );
      finalScore = weight
        ? (valid.reduce(
            (sum, aspect) => sum + (aspect.score! / 5) * Number(aspect.weight),
            0,
          ) /
            weight) *
          100
        : null;
    }
    return {
      participantId: participant.id,
      displayName: participant.display_name,
      aspectScores,
      finalScore,
      status: "provisional",
    };
  });

  return {
    columns: [...columns.entries()].map(([name, weight]) => ({ name, weight })),
    rows,
  };
}
