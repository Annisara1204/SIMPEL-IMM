/** Label keputusan final evaluasi kolektif — sumber tunggal lintas modul. */
export const decisionLabels: Record<string, string> = {
  pass: "Lulus",
  not_pass: "Tidak Lulus",
  further_discussion: "Perlu Pembahasan Lanjutan",
};

export function decisionLabel(decision: string | null | undefined): string {
  if (!decision) return "Belum ditetapkan";
  return decisionLabels[decision] ?? decision;
}
