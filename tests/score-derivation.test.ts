import assert from "node:assert/strict";
import test from "node:test";
import { scoreOutOf100, scoreToPercent } from "../lib/score-derivation.ts";

test("skor 1–5 dipetakan linier ke 0–100", () => {
  assert.equal(scoreOutOf100(1), 20);
  assert.equal(scoreOutOf100(3), 60);
  assert.equal(scoreOutOf100(5), 100);
});

test("skor kosong tidak dianggap nol", () => {
  assert.equal(scoreOutOf100(null), null);
  assert.equal(scoreOutOf100(undefined), null);
  assert.equal(scoreToPercent(null), 0);
});
