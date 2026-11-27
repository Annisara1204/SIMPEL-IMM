import assert from "node:assert/strict";
import test from "node:test";
import { nextVersionsByMaterial } from "../lib/rubric-copy.ts";

test("versi berikutnya mulai dari satu bila materi belum punya rubrik", () => {
  assert.deepEqual(nextVersionsByMaterial([], ["materi-a", "materi-b"]), {
    "materi-a": 1,
    "materi-b": 1,
  });
});

test("versi berikutnya mengikuti nomor tertinggi walau baris tidak urut", () => {
  const result = nextVersionsByMaterial(
    [
      { material_id: "materi-a", version: 1 },
      { material_id: "materi-a", version: 3 },
      { material_id: "materi-b", version: 2 },
    ],
    ["materi-a", "materi-b"],
  );
  assert.equal(result["materi-a"], 4);
  assert.equal(result["materi-b"], 3);
});

test("baris tanpa materi dan materi di luar tujuan diabaikan", () => {
  const result = nextVersionsByMaterial(
    [
      { material_id: null, version: 9 },
      { material_id: "materi-lain", version: 7 },
      { material_id: "materi-a", version: 2 },
    ],
    ["materi-a"],
  );
  assert.deepEqual(result, { "materi-a": 3 });
});
