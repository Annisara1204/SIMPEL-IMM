import assert from "node:assert/strict";
import test from "node:test";
import { suggestedColumn, textCell } from "../lib/import-columns.ts";
import { submissionStatusLabel } from "../lib/submission-status.ts";
import { reportStatusLabel } from "../lib/report-status.ts";
import { isActiveNav } from "../lib/navigation.ts";

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
  assert.equal(submissionStatusLabel("finalized"), "Selesai");
});

test("menu aktif memakai segmen penuh", () => {
  assert.equal(isActiveNav("/dashboard/observasi", "/dashboard"), false);
  assert.equal(isActiveNav("/dashboard", "/dashboard"), true);
  assert.equal(
    isActiveNav("/dashboard/observasi", "/dashboard/observasi"),
    true,
  );
  assert.equal(
    isActiveNav("/dashboard/profil-instruktur", "/dashboard/profil"),
    false,
  );
});

test("status rapor memakai kamus terpisah", () => {
  assert.equal(reportStatusLabel("Provisional"), "Sementara");
  assert.equal(reportStatusLabel("Finalized"), "Final");
  assert.equal(reportStatusLabel("Published"), "Diterbitkan");
  assert.equal(reportStatusLabel(null), "Status belum tersedia");
});
