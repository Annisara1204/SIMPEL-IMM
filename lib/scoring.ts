export type ScoringIndicator = { id: string; weight: number };
export type ScoringAspect = { id: string; weight: number; rubric_indicators: ScoringIndicator[] };
export type ScoringObservation = { score: number | null };

export function calculateWeightedScore(aspects: ScoringAspect[], observations: Map<string, ScoringObservation>) {
  let weightedAspects = 0;
  let observedAspectWeight = 0;
  let observedIndicators = 0;
  const includedAspects: string[] = [];

  for (const aspect of aspects) {
    let weightedIndicators = 0;
    let observedIndicatorWeight = 0;
    for (const indicator of aspect.rubric_indicators) {
      const score = observations.get(indicator.id)?.score;
      if (score === null || score === undefined) continue;
      weightedIndicators += score * Number(indicator.weight);
      observedIndicatorWeight += Number(indicator.weight);
      observedIndicators += 1;
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
  return { value, observedIndicators, includedAspects };
}
