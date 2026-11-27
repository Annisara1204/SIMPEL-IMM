import assert from "node:assert/strict";
import test from "node:test";
import { requestBaseUrl, safeNextPath } from "../lib/request-base-url.ts";

function headers(host: string, proto?: string) {
  const result = new Headers();
  result.set("host", host);
  if (proto) result.set("x-forwarded-proto", proto);
  return { headers: result };
}

test("requestBaseUrl memakai host lokal yang dikenal", () => {
  assert.equal(
    requestBaseUrl(headers("localhost:3100")),
    "http://localhost:3100",
  );
});

test("requestBaseUrl menolak host asing", () => {
  assert.equal(
    requestBaseUrl(headers("evil.example")),
    "http://43.173.33.195:8080",
  );
});

test("requestBaseUrl memakai daftar putih dari konfigurasi", () => {
  const previous = process.env.IMM_ALLOWED_HOSTS;
  process.env.IMM_ALLOWED_HOSTS = "imm.example.org,43.173.33.195:8080";
  try {
    assert.equal(
      requestBaseUrl(headers("imm.example.org", "https")),
      "https://imm.example.org",
    );
  } finally {
    if (previous === undefined) delete process.env.IMM_ALLOWED_HOSTS;
    else process.env.IMM_ALLOWED_HOSTS = previous;
  }
});

test("safeNextPath hanya menerima path relatif pada origin sama", () => {
  const base = "http://localhost:3000";
  assert.equal(safeNextPath(null, base), "/dashboard");
  assert.equal(
    safeNextPath("/dashboard?eventId=1", base),
    "/dashboard?eventId=1",
  );
  assert.equal(safeNextPath("//evil.com", base), "/dashboard");
  assert.equal(safeNextPath("/\\evil.com", base), "/dashboard");
  assert.equal(safeNextPath("https://evil.com", base), "/dashboard");
});
