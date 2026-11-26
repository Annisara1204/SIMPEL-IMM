import assert from "node:assert/strict";
import test from "node:test";
import { asRow, asRows } from "../lib/relations.ts";

type Row = { id: string; score: number };
const isValid = (row: Record<string, unknown>) =>
  typeof row.id === "string" && typeof row.score === "number";

test("asRows mengembalikan array kosong untuk nilai bukan array", () => {
  assert.deepEqual(asRows<Row>(null, isValid), []);
  assert.deepEqual(asRows<Row>({ id: "a", score: 4 }, isValid), []);
  assert.deepEqual(asRows<Row>(undefined, isValid), []);
});

test("asRows membuang baris yang tidak memenuhi pemeriksaan", () => {
  const rows = asRows<Row>(
    [
      { id: "a", score: 4 },
      { id: "b", score: "empat" },
      null,
      [{ id: "c", score: 3 }],
      { id: "d", score: 3 },
    ],
    isValid,
  );
  assert.deepEqual(rows, [
    { id: "a", score: 4 },
    { id: "d", score: 3 },
  ]);
});

test("asRow menolak array, primitif, dan objek tanpa field wajib", () => {
  assert.equal(asRow<Row>([], isValid), null);
  assert.equal(asRow<Row>("x", isValid), null);
  assert.equal(asRow<Row>({ id: "a" }, isValid), null);
  assert.deepEqual(asRow<Row>({ id: "a", score: 4 }, isValid), {
    id: "a",
    score: 4,
  });
});
