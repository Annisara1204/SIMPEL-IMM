import assert from "node:assert/strict";
import test from "node:test";
import { canManageEvent } from "../lib/authorization-policy.ts";

test("Admin Sistem boleh mengelola kegiatan apa pun", () => {
  assert.equal(canManageEvent("admin_system", false), true);
});

test("Observer hanya boleh mengelola kegiatan yang ditugaskan", () => {
  assert.equal(canManageEvent("observer", true), true);
  assert.equal(canManageEvent("observer", false), false);
});

test("Bidang Kader dan tanpa peran tidak dapat mengelola", () => {
  assert.equal(canManageEvent("bidang_kader", true), false);
  assert.equal(canManageEvent(null, true), false);
});
