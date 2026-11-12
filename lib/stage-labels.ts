/** Label tahap penilaian yang dipakai lintas halaman. */
export const stageLabels: Record<string, string> = {
  screening: "Screening",
  training: "Pelatihan",
  follow_up: "Tindak lanjut",
};

export function stageLabel(stage: string): string {
  return stageLabels[stage] ?? stage;
}
