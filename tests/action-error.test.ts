import assert from "node:assert/strict";
import test from "node:test";
import { actionErrorUrl } from "../lib/action-error-url.ts";

test("actionErrorUrl menyimpan pesan dan konteks formulir", () => {
  const form = new FormData();
  form.set("eventId", "event-1");
  form.set("participantId", "participant-1");
  form.set("rahasia", "tidak dikirim");
  const url = new URL(
    actionErrorUrl("/dashboard/evaluasi", "Keputusan belum diisi.", form, [
      "eventId",
      "participantId",
    ]),
    "http://localhost",
  );
  assert.equal(url.pathname, "/dashboard/evaluasi");
  assert.equal(url.searchParams.get("error"), "Keputusan belum diisi.");
  assert.equal(url.searchParams.get("eventId"), "event-1");
  assert.equal(url.searchParams.get("participantId"), "participant-1");
  assert.equal(url.searchParams.has("rahasia"), false);
});

test("actionErrorUrl mengganti pesan teknis dengan kalimat umum", () => {
  const url = new URL(
    actionErrorUrl(
      "/dashboard/kegiatan",
      "insert into public.events violates unique constraint events_pkey",
    ),
    "http://localhost",
  );
  assert.equal(
    url.searchParams.get("error"),
    "Operasi gagal. Periksa kembali data dan coba lagi atau hubungi Admin sistem.",
  );
  assert.equal(url.searchParams.has("field"), false);
});

test("actionErrorUrl menyimpan penanda kolom bila diberikan", () => {
  const url = new URL(
    actionErrorUrl(
      "/dashboard/pengajuan",
      "Nama tidak valid.",
      undefined,
      [],
      "nama",
    ),
    "http://localhost",
  );
  assert.equal(url.searchParams.get("field"), "nama");
});
