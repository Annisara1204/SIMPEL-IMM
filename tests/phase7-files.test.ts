import assert from "node:assert/strict";
import test from "node:test";
import { createReportPdf, createReportZip } from "../lib/phase7-files.ts";

const sample = {
  participant: { display_name: "Peserta Simulasi" },
  event: {
    name: "DAD Simulasi",
    theme: "Kaderisasi",
    organizer: "IMM",
    location: "Bandung",
    starts_on: "2026-10-24",
    ends_on: "2026-10-26",
  },
  snapshotData: {
    schemaVersion: 1,
    aspects: [
      {
        aspectName: "Intelektualitas",
        weight: 25,
        score: 4,
        scoreOutOf100: 80,
      },
    ],
    indicators: [],
    overall: { score: 80 },
    collective: {
      decision: "pass",
      decisionRationale: "Telah memenuhi pertimbangan kolektif.",
      strengths: "Aktif berdiskusi.",
      developmentAreas: "Perlu latihan lanjutan.",
    },
    approvedRecommendations: [],
  },
};

test("PDF rapor menghasilkan struktur PDF dan menampilkan isi utama", async () => {
  const bytes = new Uint8Array(await createReportPdf(sample).arrayBuffer());
  const content = new TextDecoder().decode(bytes);
  assert.ok(content.startsWith("%PDF-1.4"));
  assert.ok(content.includes("DAD Simulasi"));
  assert.ok(content.includes("Intelektualitas"));
  assert.ok(content.endsWith("%%EOF"));
});

test("ZIP bulk memakai signature ZIP dan berisi nama PDF", async () => {
  const pdf = new Uint8Array(await createReportPdf(sample).arrayBuffer());
  const zip = new Uint8Array(
    await createReportZip([
      { name: "Rapor_DAD_Peserta_2026.pdf", bytes: pdf },
    ]).arrayBuffer(),
  );
  assert.equal(zip[0], 0x50);
  assert.equal(zip[1], 0x4b);
  assert.equal(zip[2], 0x03);
  assert.equal(zip[3], 0x04);
  assert.ok(
    new TextDecoder().decode(zip).includes("Rapor_DAD_Peserta_2026.pdf"),
  );
});
