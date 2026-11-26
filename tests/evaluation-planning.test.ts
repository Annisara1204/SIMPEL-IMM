import assert from "node:assert/strict";
import test from "node:test";
import { buildEvaluationPlan } from "../lib/evaluation-planning.ts";
import type { AssessmentSummaryRow } from "../lib/supabase-rows.ts";

const row = (
  overrides: Partial<AssessmentSummaryRow> = {},
): AssessmentSummaryRow => ({
  participant_id: "p1",
  indicator_id: "i1",
  assessment_scope: "session",
  assessment_scope_key: "session:v1",
  source_rubric_version_ids: ["v1"],
  average_score: 4,
  valid_rating_count: 2,
  minimum_score: 3,
  maximum_score: 5,
  score_range: 2,
  not_observed_count: 0,
  pending_count: 0,
  review_status: "normal",
  aspect_id: "a1",
  aspect_name: "Disiplin",
  aspect_weight: 50,
  indicator_weight: 100,
  ...overrides,
});

test("membuat planned indicators dengan awalan kunci yang diminta", () => {
  const { planned } = buildEvaluationPlan([row()], { keyPrefix: "summary" });
  assert.equal(planned.length, 1);
  assert.equal(planned[0]?.rubricVersionId, "summary:session:v1");
  assert.equal(planned[0]?.participantId, "p1");
  assert.equal(planned[0]?.aspectName, "Disiplin");
});

test("agregat dikelompokkan menurut indikator dan cakupan", () => {
  const rows = [
    row(),
    row({
      assessment_scope_key: "cross_session",
      assessment_scope: "cross_session",
    }),
    row(),
  ];
  const { planned, aggregates } = buildEvaluationPlan(rows, {
    keyPrefix: "aggregate",
    participantId: "override",
  });
  assert.equal(planned.length, 3);
  assert.equal(aggregates.length, 2);
  assert.equal(planned[0]?.participantId, "override");
  assert.equal(aggregates[0]?.participantId, "override");
  assert.equal(aggregates[0]?.average, 4);
  assert.deepEqual(aggregates[0]?.sourceRubricVersionIds, ["v1"]);
});

test("nilai null dan angka dari RPC tetap dikonversi", () => {
  const { aggregates } = buildEvaluationPlan(
    [
      row({
        average_score: null,
        minimum_score: null,
        maximum_score: null,
        score_range: null,
        valid_rating_count: 0,
      }),
    ],
    { keyPrefix: "summary" },
  );
  assert.equal(aggregates[0]?.average, null);
  assert.equal(aggregates[0]?.minimum, null);
  assert.equal(aggregates[0]?.maximum, null);
  assert.equal(aggregates[0]?.range, null);
  assert.equal(aggregates[0]?.validRatings, 0);
});
