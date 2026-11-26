import assert from "node:assert/strict";
import test from "node:test";
import { buildAutoCompetencyMap } from "../lib/auto-competency.ts";
import type { AssessmentSummaryRow } from "../lib/supabase-rows.ts";

const summaryRow = (
  participantId: string,
  indicatorId: string,
  aspectId: string,
  score: number,
): AssessmentSummaryRow => ({
  participant_id: participantId,
  indicator_id: indicatorId,
  assessment_scope: "session",
  assessment_scope_key: `session:${indicatorId}`,
  source_rubric_version_ids: [],
  average_score: score,
  valid_rating_count: 1,
  minimum_score: score,
  maximum_score: score,
  score_range: 0,
  not_observed_count: 0,
  pending_count: 0,
  review_status: "normal",
  aspect_id: aspectId,
  aspect_name: "Disiplin & tanggung jawab",
  aspect_weight: 100,
  indicator_weight: 50,
});

const snapshotRow = (
  participantId: string,
  displayName: string,
  score: number,
) => ({
  participant_id: participantId,
  display_name: displayName,
  snapshot_id: `snap-${participantId}`,
  finalized_at: "2026-11-26T10:00:00Z",
  publication_revision: 1,
  snapshot_data: {
    overall: { score },
    collective: { decision: "pass" },
    aspects: [
      {
        aspectName: "Disiplin & tanggung jawab",
        weight: 100,
        score: score / 20,
      },
    ],
  },
});

test("peserta dengan snapshot memakai nilai gabungan final", () => {
  const result = buildAutoCompetencyMap({
    participants: [{ id: "p1", display_name: "Final" }],
    summaryRows: [],
    snapshotRows: [
      snapshotRow("p1", "Final", 62),
      { ...snapshotRow("p1", "Final", 57), snapshot_id: "snap-2" },
    ],
    minimumCoverage: 80,
  });
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].status, "final");
  assert.equal(result.rows[0].finalScore, 59.5);
  assert.equal(
    result.rows[0].aspectScores.get("Disiplin & tanggung jawab"),
    2.975,
  );
});

test("peserta tanpa snapshot mendapat nilai sementara dari agregasi", () => {
  const result = buildAutoCompetencyMap({
    participants: [{ id: "p2", display_name: "Sementara" }],
    summaryRows: [
      summaryRow("p2", "i1", "a1", 4),
      summaryRow("p2", "i2", "a1", 3),
    ],
    snapshotRows: [],
    minimumCoverage: 80,
  });
  assert.equal(result.rows[0].status, "provisional");
  assert.equal(result.rows[0].finalScore, 70);
  assert.equal(
    result.rows[0].aspectScores.get("Disiplin & tanggung jawab"),
    3.5,
  );
  assert.equal(result.columns[0].name, "Disiplin & tanggung jawab");
});
