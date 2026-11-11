export type ScoringIndicator = { id: string; weight: number };
export type ScoringAspect = { id: string; weight: number; rubric_indicators: ScoringIndicator[] };
export type ScoringObservation = { score: number | null };

export const scoreCategories = [
  { id: "development", label: "Perlu pengembangan", minimum: 0, exclusiveMaximum: 60 },
  { id: "adequate", label: "Cukup", minimum: 60, exclusiveMaximum: 75 },
  { id: "good", label: "Baik", minimum: 75, exclusiveMaximum: 90 },
  { id: "excellent", label: "Sangat baik", minimum: 90, exclusiveMaximum: 101 },
] as const;

export function categorizeScore(score: number | null) {
  if (score === null || !Number.isFinite(score)) return null;
  return scoreCategories.find((category) => score >= category.minimum && score < category.exclusiveMaximum) ?? scoreCategories.at(-1) ?? null;
}

export function calculateWeightedScore(aspects: ScoringAspect[], observations: Map<string, ScoringObservation>) {
  let weightedAspects = 0;
  let observedAspectWeight = 0;
  const observedIndicatorIds = new Set<string>();
  const includedAspects: string[] = [];

  for (const aspect of aspects) {
    let weightedIndicators = 0;
    let observedIndicatorWeight = 0;
    for (const indicator of aspect.rubric_indicators) {
      const score = observations.get(indicator.id)?.score;
      if (score === null || score === undefined) continue;
      weightedIndicators += score * Number(indicator.weight);
      observedIndicatorWeight += Number(indicator.weight);
      observedIndicatorIds.add(indicator.id);
    }
    if (!observedIndicatorWeight) continue;
    const aspectAverage = weightedIndicators / observedIndicatorWeight;
    weightedAspects += aspectAverage * Number(aspect.weight);
    observedAspectWeight += Number(aspect.weight);
    includedAspects.push(aspect.id);
  }

  if (!observedAspectWeight) return { value: null, observedIndicators: 0, includedAspects };
  const averageOnFivePointScale = weightedAspects / observedAspectWeight;
  const value = ((averageOnFivePointScale - 1) / 4) * 100;
  return { value, observedIndicators: observedIndicatorIds.size, includedAspects };
}
