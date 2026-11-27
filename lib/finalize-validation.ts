const decisions = ["pass", "not_pass", "further_discussion"] as const;

/** Validasi keputusan dan alasan sebelum evaluasi disimpan atau disetujui. */
export function validateDecisionRationale(
  decision: string,
  rationale: string,
): string | null {
  if (!decisions.some((item) => item === decision))
    return "Pilih keputusan kelulusan.";
  if (rationale.trim().length < 10)
    return "Isi alasan keputusan minimal 10 karakter.";
  return null;
}
