import assert from "node:assert/strict";
import test from "node:test";
import { evenWeight, roundWeight } from "../lib/rubric-weights.ts";

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
