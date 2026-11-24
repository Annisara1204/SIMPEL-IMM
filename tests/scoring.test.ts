import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateWeightedScore,
  categorizeScore,
  type ScoringAspect,
  type ScoringObservation,
} from "../lib/scoring.ts";

const aspects: ScoringAspect[] = [
  {
    id: "a1",
    weight: 100,
    rubric_indicators: [{ id: "i1", weight: 100 }],
  },
];

const observations = (score: number): Map<string, ScoringObservation> =>
  new Map([["i1", { score }]]);

test("skor 4 menjadi 80 dan masuk kategori Baik", () => {
  const result = calculateWeightedScore(aspects, observations(4));
  assert.equal(result.value, 80);
  assert.equal(categorizeScore(result.value)?.label, "Baik");
});

test("skor 3 menjadi 60 dan masuk kategori Cukup", () => {
  const result = calculateWeightedScore(aspects, observations(3));
  assert.equal(result.value, 60);
  assert.equal(categorizeScore(result.value)?.label, "Cukup");
});

test("skor 3.5 menjadi 70 dan tetap masuk kategori Cukup", () => {
  const result = calculateWeightedScore(aspects, observations(3.5));
  assert.equal(result.value, 70);
  assert.equal(categorizeScore(result.value)?.label, "Cukup");
});
