/** Konversi satu rumus skor 1–5 ke skala 0–100. */
export function scoreOutOf100(score: number | null | undefined): number | null {
  return score === null || score === undefined ? null : (score / 5) * 100;
}

export function scoreToPercent(score: number | null | undefined): number {
  return scoreOutOf100(score) ?? 0;
}
