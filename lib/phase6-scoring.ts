export type SubmittedRating = {
  participantId: string;
  rubricVersionId: string;
  localIndicatorId: string;
  observerId: string;
  submissionStatus: "draft" | "submitted" | "finalized";
  responseStatus: "unrated" | "scored" | "not_observed";
  score: number | null;
};

export type PlannedIndicator = {
  participantId: string;
  rubricVersionId: string;
  localIndicatorId: string;
  competencyIndicatorId: string;
  assessmentScope: "session" | "cross_session";
  assessmentScopeKey: string;
  aspectId: string;
  aspectName: string;
  aspectWeight: number;
  indicatorWeight: number;
  expectedObserverIds: string[];
};

export type IndicatorAggregate = {
  participantId: string;
  indicatorId: string;
  scope: "session" | "cross_session";
  scopeKey: string;
  sourceRubricVersionIds?: string[];
  average: number | null;
  validRatings: number;
  minimum: number | null;
  maximum: number | null;
  range: number | null;
  notObserved: number;
  pending: number;
  reviewStatus: "normal" | "needs_review";
  observerScores: { observerId: string; score: number | null; status: string }[];
};

export type AspectAggregate = {
  aspectId: string;
  aspectName: string;
  weight: number;
  score: number | null;
  scoreOutOf100: number | null;
  plannedIndicators: number;
  assessedIndicators: number;
  notObservedIndicators: number;
  pendingIndicators: number;
  coverage: number;
  valid: boolean;
};

type AggregationGroup = { participantId: string; indicatorId: string; scope: "session" | "cross_session"; scopeKey: string; scores: number[]; notObserved: number; pending: number; slots: Map<string, { observerId: string; score: number | null; status: string }> };

export function aggregateIndicators(planned: PlannedIndicator[], ratings: SubmittedRating[], reviewThreshold = 2): IndicatorAggregate[] {
  const ratingBySlot = new Map<string, SubmittedRating>();
  for (const rating of ratings) {
    const key = `${rating.participantId}:${rating.rubricVersionId}:${rating.localIndicatorId}:${rating.observerId}`;
    const current = ratingBySlot.get(key);
    if (!current || (rating.submissionStatus === "finalized" && current.submissionStatus !== "finalized")) ratingBySlot.set(key, rating);
  }

  const groups = new Map<string, AggregationGroup>();
  for (const item of planned) {
    const key = `${item.participantId}:${item.competencyIndicatorId}:${item.assessmentScopeKey}`;
    const group: AggregationGroup = groups.get(key) ?? { participantId: item.participantId, indicatorId: item.competencyIndicatorId, scope: item.assessmentScope, scopeKey:item.assessmentScopeKey, scores: [], notObserved: 0, pending: 0, slots: new Map() };
    for (const observerId of new Set(item.expectedObserverIds)) {
      const slotKey = `${item.rubricVersionId}:${item.localIndicatorId}:${observerId}`;
      if (group.slots.has(slotKey)) continue;
      const rating = ratingBySlot.get(`${item.participantId}:${item.rubricVersionId}:${item.localIndicatorId}:${observerId}`);
      const submitted = rating && (rating.submissionStatus === "submitted" || rating.submissionStatus === "finalized");
      const isValidScore = submitted && rating.responseStatus === "scored" && typeof rating.score === "number" && Number.isInteger(rating.score) && rating.score >= 1 && rating.score <= 5;
      const isNotObserved = submitted && rating.responseStatus === "not_observed";
      if (isValidScore && rating?.score !== null && rating?.score !== undefined) group.scores.push(rating.score);
      else if (isNotObserved) group.notObserved++;
      else group.pending++;
      group.slots.set(slotKey, { observerId, score: isValidScore ? rating.score : null, status: isValidScore ? "scored" : isNotObserved ? "not_observed" : "pending" });
    }
    groups.set(key, group);
  }

  return [...groups.values()].map((group) => {
    const average = group.scores.length ? group.scores.reduce((sum, score) => sum + score, 0) / group.scores.length : null;
    const minimum = group.scores.length ? Math.min(...group.scores) : null;
    const maximum = group.scores.length ? Math.max(...group.scores) : null;
    const range = minimum === null || maximum === null ? null : maximum - minimum;
    return { participantId: group.participantId, indicatorId: group.indicatorId, scope: group.scope, scopeKey:group.scopeKey, average, validRatings: group.scores.length, minimum, maximum, range, notObserved: group.notObserved, pending: group.pending, reviewStatus: range !== null && range >= reviewThreshold ? "needs_review" : "normal", observerScores: [...group.slots.values()] };
  });
}

export function calculateAspectAggregates(planned: PlannedIndicator[], indicators: IndicatorAggregate[], coverageThreshold = 80): AspectAggregate[] {
  const result: AspectAggregate[] = [];
  const participantIds = new Set(planned.map((item) => item.participantId));
  for (const participantId of participantIds) {
    const participantPlan = planned.filter((item) => item.participantId === participantId);
    const keys = new Map<string, PlannedIndicator[]>();
    for (const item of participantPlan) {
      const key = `${item.aspectId}:${item.competencyIndicatorId}:${item.assessmentScopeKey}`;
      const values = keys.get(key) ?? [];
      values.push(item);
      keys.set(key, values);
    }
    const aspectPlans = new Map<string, PlannedIndicator[]>();
    for (const rows of keys.values()) {
      const first = rows[0];
      const values = aspectPlans.get(first.aspectId) ?? [];
      values.push(first);
      aspectPlans.set(first.aspectId, values);
    }
    for (const [aspectId, rows] of aspectPlans) {
      const plannedCount = rows.length;
      const valid = rows.flatMap((row) => indicators.find((item) => item.participantId === participantId && item.indicatorId === row.competencyIndicatorId && item.scopeKey === row.assessmentScopeKey)?.average !== null ? [{ row, aggregate: indicators.find((item) => item.participantId === participantId && item.indicatorId === row.competencyIndicatorId && item.scopeKey === row.assessmentScopeKey)! }] : []);
      const validWeight = valid.reduce((sum, item) => sum + Number(item.row.indicatorWeight), 0);
      const score = validWeight ? valid.reduce((sum, item) => sum + item.aggregate.average! * Number(item.row.indicatorWeight), 0) / validWeight : null;
      const notObservedIndicators = rows.filter((row) => indicators.find((item) => item.participantId === participantId && item.indicatorId === row.competencyIndicatorId && item.scopeKey === row.assessmentScopeKey)?.notObserved).length;
      const pendingIndicators = rows.filter((row) => !indicators.find((item) => item.participantId === participantId && item.indicatorId === row.competencyIndicatorId && item.scopeKey === row.assessmentScopeKey) || (indicators.find((item) => item.participantId === participantId && item.indicatorId === row.competencyIndicatorId && item.scopeKey === row.assessmentScopeKey)?.pending ?? 0) > 0).length;
      const coverage = plannedCount ? valid.length / plannedCount * 100 : 0;
      result.push({ aspectId, aspectName: rows[0].aspectName, weight: Number(rows[0].aspectWeight), score, scoreOutOf100: score === null ? null : score / 5 * 100, plannedIndicators: plannedCount, assessedIndicators: valid.length, notObservedIndicators, pendingIndicators, coverage, valid: plannedCount > 0 && coverage >= coverageThreshold });
    }
  }
  return result;
}

export function calculateOverallScore(aspects: AspectAggregate[]) {
  const expectedWeight = aspects.reduce((sum, aspect) => sum + Number(aspect.weight), 0);
  const score = aspects.length && expectedWeight >= 99.999 && expectedWeight <= 100.001 && aspects.every((aspect) => aspect.valid && aspect.score !== null)
    ? aspects.reduce((sum, aspect) => sum + aspect.score! / 5 * Number(aspect.weight), 0)
    : null;
  return { score, status: score === null ? "provisional" as const : "ready_for_collective_evaluation" as const, reasons: aspects.filter((aspect) => !aspect.valid || aspect.score === null).map((aspect) => `${aspect.aspectName}: coverage ${aspect.coverage.toFixed(1)}% (${aspect.assessedIndicators}/${aspect.plannedIndicators} indikator valid)`) };
}
