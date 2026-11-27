import assert from "node:assert/strict";
import test from "node:test";
import { compactReportSnapshot } from "../lib/report-snapshot-dto.ts";

test("DTO ringkas mempertahankan rentang dan jumlah pending", () => {
  const compact = compactReportSnapshot({
    schemaVersion: 1,
    createdAt: "2026-11-28T00:00:00.000Z",
    participantId: "p",
    eventId: "e",
    aspects: [],
    indicators: [
      {
        indicatorId: "i",
        scope: "session:v1",
        average: 3.5,
        validRatings: 2,
        minimum: 3,
        maximum: 4,
        range: 1,
        pending: 1,
      },
    ],
  } as never);
  const indicator = compact?.indicators?.[0];
  assert.equal(indicator?.range, 1);
  assert.equal(indicator?.minimum, 3);
  assert.equal(indicator?.maximum, 4);
  assert.equal(indicator?.pending, 1);
});

test("DTO mengembalikan null untuk snapshot kosong", () => {
  assert.equal(compactReportSnapshot(null), null);
});
