import assert from "node:assert/strict";
import test from "node:test";
import { suggestedColumn, textCell } from "../lib/import-columns.ts";
import { submissionStatusLabel } from "../lib/submission-status.ts";

test("textCell mengubah nilai kosong menjadi string kosong", () => {
  assert.equal(textCell(undefined), "");
  assert.equal(textCell("  Nama  "), "Nama");
  assert.equal(textCell(12), "12");
});

test("suggestedColumn mencocokkan nama kolom yang umum", () => {
  assert.equal(suggestedColumn(["No", "Nama Lengkap", "Skor"], "name"), 1);
  assert.equal(suggestedColumn(["Asal Komisariat", "Nilai"], "score"), 1);
  assert.equal(suggestedColumn(["No", "Keterangan"], "name"), -1);
});

test("status pengajuan memiliki label Indonesia", () => {
  assert.equal(
    submissionStatusLabel("under_review"),
    "Sedang ditinjau · terkunci",
  );
  assert.equal(submissionStatusLabel("status_baru"), "status_baru");
  assert.equal(submissionStatusLabel(null), "Status belum diketahui");
});
