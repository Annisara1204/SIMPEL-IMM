import assert from "node:assert/strict";
import test from "node:test";
import { validateDecisionRationale } from "../lib/finalize-validation.ts";

test("keputusan dan alasan valid diterima", () => {
  assert.equal(
    validateDecisionRationale("pass", "Alasan yang cukup panjang."),
    null,
  );
});

test("keputusan kosong atau tidak dikenal ditolak", () => {
  assert.equal(
    validateDecisionRationale("", "Alasan yang cukup panjang."),
    "Pilih keputusan kelulusan.",
  );
  assert.equal(
    validateDecisionRationale("lulus", "Alasan yang cukup panjang."),
    "Pilih keputusan kelulusan.",
  );
});

test("alasan kurang dari sepuluh karakter ditolak", () => {
  assert.equal(
    validateDecisionRationale("pass", "pendek"),
    "Isi alasan keputusan minimal 10 karakter.",
  );
});
