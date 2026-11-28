import assert from "node:assert/strict";
import test from "node:test";
import {
  evenWeight,
  roundWeight,
  validateRubricForActivation,
} from "../lib/rubric-weights.ts";

test("evenWeight membagi rata dan menutup sisa pada entri terakhir", () => {
  const weights = [0, 1, 2].map((index) => evenWeight(100, 3, index));
  assert.deepEqual(weights, [33.33, 33.33, 33.34]);
  assert.equal(
    weights.reduce((sum, weight) => sum + weight, 0),
    100,
  );
});

test("evenWeight memakai seluruh bobot yang tersedia", () => {
  for (const [total, count] of [
    [100, 3],
    [70, 4],
    [25.5, 2],
  ]) {
    const sum = Array.from({ length: count }, (_, index) =>
      evenWeight(total, count, index),
    ).reduce((partial, weight) => partial + weight, 0);
    assert.equal(Math.round(sum * 100) / 100, total);
  }
});

test("roundWeight membulatkan dua angka desimal", () => {
  assert.equal(roundWeight(12.345), 12.35);
  assert.equal(roundWeight(33.333), 33.33);
});

const descriptors = {
  "1": "Sangat kurang",
  "2": "Kurang",
  "3": "Cukup",
  "4": "Baik",
  "5": "Sangat baik",
};

const validAspect = () => ({
  weight: 100,
  rubric_indicator_aspects: [
    {
      weight: 100,
      rubric_indicators: [{ score_descriptors: descriptors }],
    },
  ],
});

test("validateRubricForActivation menerima bobot dan uraian lengkap", () => {
  assert.equal(validateRubricForActivation([validAspect()]), null);
});

test("validateRubricForActivation menolak bobot 99,999 dan 100,001", () => {
  assert.notEqual(
    validateRubricForActivation([{ ...validAspect(), weight: 99.999 }]),
    null,
  );
  assert.notEqual(
    validateRubricForActivation([{ ...validAspect(), weight: 100.001 }]),
    null,
  );
});

test("validateRubricForActivation menolak uraian skor kosong", () => {
  const aspect = validAspect();
  aspect.rubric_indicator_aspects[0].rubric_indicators = [
    { score_descriptors: { ...descriptors, "3": "" } },
  ];
  assert.match(validateRubricForActivation([aspect]) ?? "", /Lengkapi uraian/);
});
