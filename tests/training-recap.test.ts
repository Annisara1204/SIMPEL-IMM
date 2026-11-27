import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTrainingMatrix,
  buildTrainingRecap,
} from "../lib/training-recap.ts";
import type { AssessmentSummaryRow } from "../lib/supabase-rows.ts";

const summaryRow = (
  participantId: string,
  indicatorId: string,
  score: number,
  scopeKey = "session:v1",
  scope: "session" | "cross_session" = "session",
  sourceRubricVersionIds: string[] = [],
): AssessmentSummaryRow => ({
  participant_id: participantId,
  indicator_id: indicatorId,
  assessment_scope: scope,
  assessment_scope_key: scopeKey,
  source_rubric_version_ids: sourceRubricVersionIds,
  average_score: score,
  valid_rating_count: 1,
  minimum_score: score,
  maximum_score: score,
  score_range: 0,
  not_observed_count: 0,
  pending_count: 0,
  review_status: "normal",
  aspect_id: "a1",
  aspect_name: "Disiplin",
  aspect_weight: 100,
  indicator_weight: 50,
});

const participants = [{ id: "p1", display_name: "Peserta 01" }];

test("hanya penilaian versi terpilih yang dihitung", () => {
  const result = buildTrainingRecap({
    participants,
    summaryRows: [
      summaryRow("p1", "i1", 4),
      summaryRow("p1", "i2", 4),
      summaryRow("p1", "i3", 1, "session:v2"),
    ],
    snapshots: [],
    rubricVersionId: "v1",
    minimumCoverage: 80,
  });
  assert.equal(result.rows[0].status, "provisional");
  assert.equal(result.rows[0].finalScore, 80);
  assert.equal(result.columns[0].name, "Disiplin");
});

test("snapshot final versi terpilih mengalahkan agregasi", () => {
  const result = buildTrainingRecap({
    participants,
    summaryRows: [summaryRow("p1", "i1", 4), summaryRow("p1", "i2", 4)],
    snapshots: [
      {
        id: "snap-1",
        participant_id: "p1",
        finalized_at: "2026-11-27T10:00:00Z",
        rubric_version_ids: ["v1"],
        snapshot_data: {
          overall: { score: 62 },
          collective: { decision: "pass" },
          aspects: [{ aspectName: "Disiplin", weight: 100, score: 3.1 }],
        },
      },
      {
        id: "snap-2",
        participant_id: "p1",
        finalized_at: "2026-11-27T11:00:00Z",
        rubric_version_ids: ["v2"],
        snapshot_data: {
          overall: { score: 10 },
          aspects: [{ aspectName: "Disiplin", weight: 100, score: 0.5 }],
        },
      },
    ],
    rubricVersionId: "v1",
    minimumCoverage: 80,
  });
  assert.equal(result.rows[0].status, "final");
  assert.equal(result.rows[0].finalScore, 62);
  assert.equal(result.rows[0].aspectScores.get("Disiplin"), 3.1);
});

test("baris lintas sesi yang memuat versi terpilih ikut dihitung", () => {
  const result = buildTrainingRecap({
    participants,
    summaryRows: [
      summaryRow("p1", "i1", 3, "cross_session", "cross_session", ["v2", "v1"]),
      summaryRow("p1", "i2", 5),
    ],
    snapshots: [],
    rubricVersionId: "v1",
    minimumCoverage: 80,
  });
  assert.equal(result.rows[0].finalScore, 80);
});

test("tabel rekap memakai nama materi sebagai kolom", () => {
  const result = buildTrainingMatrix({
    participants: [...participants, { id: "p2", display_name: "Peserta 02" }],
    versions: [
      { id: "v1", name: "AIIK", version: 1 },
      { id: "v2", name: "IMM", version: 1 },
    ],
    summaryRows: [
      summaryRow("p1", "i1", 4, "session:v1"),
      summaryRow("p1", "i2", 4, "session:v1"),
      summaryRow("p1", "i3", 2, "session:v2"),
      summaryRow("p1", "i4", 2, "session:v2"),
    ],
    snapshots: [],
    minimumCoverage: 80,
  });
  assert.deepEqual(
    result.columns.map((column) => column.name),
    ["AIIK", "IMM"],
  );
  assert.equal(result.rows[0].scores.get("AIIK"), 80);
  assert.equal(result.rows[0].scores.get("IMM"), 40);
  assert.equal(result.rows[1].scores.get("AIIK"), null);
});

test("materi dengan dua versi aktif memakai versi terbesar", () => {
  const result = buildTrainingMatrix({
    participants,
    versions: [
      { id: "v1", name: "AIIK", version: 1 },
      { id: "v2", name: "AIIK", version: 2 },
    ],
    summaryRows: [
      summaryRow("p1", "i1", 4, "session:v1"),
      summaryRow("p1", "i2", 4, "session:v1"),
      summaryRow("p1", "i3", 1, "session:v2"),
      summaryRow("p1", "i4", 1, "session:v2"),
    ],
    snapshots: [],
    minimumCoverage: 80,
  });
  assert.equal(result.columns.length, 1);
  assert.equal(result.columns[0].versionId, "v2");
  assert.equal(result.rows[0].scores.get("AIIK"), 20);
});
