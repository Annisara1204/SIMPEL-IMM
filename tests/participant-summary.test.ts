import assert from "node:assert/strict";
import test from "node:test";
import { summarizeParticipants } from "../lib/participant-summary.ts";

const row = (
  participantId: string,
  displayName: string,
  score: number | null,
  decision: string,
  finalizedAt: string,
  aspectId: string,
  aspectScore: number,
) => ({
  participant_id: participantId,
  display_name: displayName,
  snapshot_id: `snapshot-${participantId}-${finalizedAt}`,
  finalized_at: finalizedAt,
  publication_revision: 1,
  snapshot_data: {
    overall: { score },
    collective: { decision },
    aspects: [
      {
        aspectId,
        aspectName: "Disiplin & tanggung jawab",
        weight: 20,
        score: aspectScore,
      },
    ],
  },
});

test("satu peserta dengan dua snapshot menghasilkan satu nilai rata-rata", () => {
  const summaries = summarizeParticipants([
    row("p1", "Angga", 64, "pass", "2026-11-20T10:00:00Z", "versi-a", 4),
    row("p1", "Angga", 62, "not_pass", "2026-11-26T10:00:00Z", "versi-b", 3),
  ]);
  assert.equal(summaries.length, 1);
  assert.equal(summaries[0].finalScore, 63);
  assert.equal(summaries[0].displayName, "Angga");
  assert.equal(summaries[0].decision, "not_pass");
  assert.equal(summaries[0].aspectScores.get("Disiplin & tanggung jawab"), 3.5);
});

test("aspek disatukan berdasarkan nama walau ID versi berbeda", () => {
  const summaries = summarizeParticipants([
    row("p1", "Fadilla", 62, "pass", "2026-11-26T10:00:00Z", "abc", 4),
    row("p1", "Fadilla", 57, "not_pass", "2026-11-26T11:00:00Z", "xyz", 3),
  ]);
  assert.equal(summaries[0].aspectScores.size, 1);
  assert.equal(summaries[0].aspectScores.get("Disiplin & tanggung jawab"), 3.5);
});

test("peserta berbeda tidak digabung", () => {
  const summaries = summarizeParticipants([
    row("p1", "Angga", 64, "pass", "2026-11-20T10:00:00Z", "a", 4),
    row("p2", "Fadilla", 57, "not_pass", "2026-11-20T11:00:00Z", "b", 3),
  ]);
  assert.equal(summaries.length, 2);
  assert.deepEqual(summaries.map((item) => item.finalScore).sort(), [57, 64]);
});
