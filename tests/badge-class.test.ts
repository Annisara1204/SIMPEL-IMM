import assert from "node:assert/strict";
import test from "node:test";
import { statusBadgeClass } from "../lib/badge-class.ts";

test("status rappor dipetakan ke modifier baru", () => {
  assert.equal(statusBadgeClass("published"), "badge badge--published");
  assert.equal(statusBadgeClass("Final"), "badge badge--finalized");
  assert.equal(statusBadgeClass("provisional"), "badge badge--provisional");
});

test("status kegiatan dan jatuh-back memakai modifier tersedia", () => {
  assert.equal(statusBadgeClass("active"), "badge badge--success");
  assert.equal(statusBadgeClass("live"), "badge badge--warning");
  assert.equal(statusBadgeClass("unknown"), "badge badge--neutral");
});
