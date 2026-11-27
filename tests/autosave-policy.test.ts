import assert from "node:assert/strict";
import test from "node:test";
import { canScheduleAutosave } from "../lib/autosave-policy.ts";

const base = {
  dirty: true,
  conflict: false,
  pending: false,
  failed: false,
  online: true,
};

test("autosave dijadwalkan saat draf berubah dan tidak ada hambatan", () => {
  assert.equal(canScheduleAutosave(base), true);
});

test("autosave berhenti setelah gagal sampai pengguna mencoba lagi", () => {
  assert.equal(canScheduleAutosave({ ...base, failed: true }), false);
});

test("autosave berhenti saat konflik, pending, offline, atau tidak ada perubahan", () => {
  assert.equal(canScheduleAutosave({ ...base, conflict: true }), false);
  assert.equal(canScheduleAutosave({ ...base, pending: true }), false);
  assert.equal(canScheduleAutosave({ ...base, online: false }), false);
  assert.equal(canScheduleAutosave({ ...base, dirty: false }), false);
});
