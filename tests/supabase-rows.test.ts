import assert from "node:assert/strict";
import test from "node:test";
import {
  isAssessmentSummaryRow,
  isEventReportRow,
  isNoteRecord,
} from "../lib/row-guards.ts";

test("pemeriksa baris rekap menolak baris tanpa field wajib", () => {
  assert.equal(
    isAssessmentSummaryRow({
      participant_id: "p",
      indicator_id: "i",
      assessment_scope_key: "session:v1",
      aspect_weight: 50,
      indicator_weight: 20,
    }),
    true,
  );
  assert.equal(
    isAssessmentSummaryRow({ participant_id: "p", indicator_id: "i" }),
    false,
  );
});

test("pemeriksa baris laporan menerima snapshot null", () => {
  assert.equal(
    isEventReportRow({
      participant_id: "p",
      display_name: "Nama",
      snapshot_id: null,
    }),
    true,
  );
  assert.equal(isEventReportRow({ participant_id: "p" }), false);
});

test("pemeriksa catatan menolak revisi bukan angka", () => {
  assert.equal(isNoteRecord({ id: "n", content: "isi", revision: 2 }), true);
  assert.equal(isNoteRecord({ id: "n", content: "isi", revision: "2" }), false);
});
