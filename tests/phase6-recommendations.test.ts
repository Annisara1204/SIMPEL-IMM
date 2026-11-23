import assert from "node:assert/strict";
import test from "node:test";
import { buildLowScoreRecommendations } from "../lib/phase6-recommendations.ts";

test("membuat satu draf untuk indikator valid di bawah 3 tanpa angka skor", () => {
  const draft = buildLowScoreRecommendations([
    {
      indicatorId: "i1",
      indicatorName: "Analisis",
      aspectName: "Intelektualitas",
      scopeKey: "session:v1",
      score: 2.5,
    },
    {
      indicatorId: "i2",
      indicatorName: "Kolaborasi",
      aspectName: "Humanitas",
      scopeKey: "session:v1",
      score: 3,
    },
    {
      indicatorId: "i3",
      indicatorName: "Refleksi",
      aspectName: "Religiusitas",
      scopeKey: "session:v1",
      score: null,
    },
  ]);
  assert.ok(draft);
  assert.match(draft.recommendation, /Draf otomatis/);
  assert.match(draft.recommendation, /Analisis/);
  assert.doesNotMatch(draft.recommendation, /2\.5/);
  assert.equal(draft.evidenceReferences.length, 1);
});

test("indikator sama di beberapa cakupan hanya masuk sekali", () => {
  const draft = buildLowScoreRecommendations([
    {
      indicatorId: "i1",
      indicatorName: "Analisis",
      aspectName: "Intelektualitas",
      scopeKey: "session:v1",
      score: 2.7,
    },
    {
      indicatorId: "i1",
      indicatorName: "Analisis",
      aspectName: "Intelektualitas",
      scopeKey: "session:v2",
      score: 1.8,
    },
    {
      indicatorId: "i2",
      indicatorName: "Kolaborasi",
      aspectName: "Humanitas",
      scopeKey: "session:v1",
      score: 2.2,
    },
  ]);
  assert.ok(draft);
  assert.equal(draft.evidenceReferences.length, 2);
  assert.equal(
    draft.recommendation.match(/Analisis/g)?.length,
    1,
    "nama indikator tetap disebut sekali",
  );
});

test("mengembalikan null bila tidak ada indikator di bawah ambang", () => {
  const draft = buildLowScoreRecommendations([
    {
      indicatorId: "i1",
      indicatorName: "Analisis",
      aspectName: "Intelektualitas",
      scopeKey: "session:v1",
      score: 4,
    },
  ]);
  assert.equal(draft, null);
});
