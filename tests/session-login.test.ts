import test from "node:test";
import assert from "node:assert/strict";
import { sessionLoginPath } from "../lib/session-login-path.ts";

test("pengunjung baru diarahkan ke login tanpa pesan sesi habis", () => {
  assert.equal(sessionLoginPath(false), "/login");
});

test("sesi yang habis diarahkan ke login dengan pesan", () => {
  assert.equal(sessionLoginPath(true), "/login?reason=session");
});
