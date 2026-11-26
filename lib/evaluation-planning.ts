import type { IndicatorAggregate, PlannedIndicator } from "./phase6-scoring";
import type { AssessmentSummaryRow } from "./supabase-rows";

type PlanOptions = {
  /** Awalan untuk rubricVersionId buatan, misalnya "aggregate" atau "summary". */
  keyPrefix: string;
  /** Untuk agregasi Server Action, participantId diambil dari argumen. */
  participantId?: string;
};

/**
 * Satu jalur pembuatan planned indicators dan agregatnya.
 * Dipakai Server Action finalisasi dan halaman Evaluasi Kolektif agar
 * aturan keduanya tidak bisa menyimpang.
 */
export function buildEvaluationPlan(
  rows: AssessmentSummaryRow[],
  options: PlanOptions,
): { planned: PlannedIndicator[]; aggregates: IndicatorAggregate[] } {
  const aggregates = new Map<string, IndicatorAggregate>();
  const planned = rows.map((row) => {
    const participantId = options.participantId ?? row.participant_id;
    const key = `${row.indicator_id}:${row.assessment_scope_key}`;
    if (!aggregates.has(key))
      aggregates.set(key, {
        participantId,
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
      });
    return {
      participantId,
      rubricVersionId: `${options.keyPrefix}:${row.assessment_scope_key}`,
      localIndicatorId: row.indicator_id,
      competencyIndicatorId: row.indicator_id,
      assessmentScope: row.assessment_scope,
      assessmentScopeKey: row.assessment_scope_key,
      aspectId: row.aspect_id,
      aspectName: row.aspect_name,
      aspectWeight: Number(row.aspect_weight),
      indicatorWeight: Number(row.indicator_weight),
      expectedObserverIds: [],
    };
  });
  return { planned, aggregates: [...aggregates.values()] };
}
