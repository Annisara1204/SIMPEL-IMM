/** Label tahap penilaian yang dipakai lintas halaman. */
export const stageLabels: Record<string, string> = {
  screening: "Screening",
  training: "Pelatihan",
  follow_up: "Tindak lanjut",
};

/** Urutan tahap dengan label bernomor untuk alur pilih kegiatan. */
export const stageOrder = [
  { id: "screening", label: "1. Screening" },
  { id: "training", label: "2. Pelatihan" },
  { id: "follow_up", label: "3. Rencana Tindak Lanjut" },
] as const;

/** Tahap untuk kartu rekap dashboard (label tanpa nomor). */
export const stageCards = stageOrder.map(({ id, label }) => ({
  id,
  label: label.replace(/^\d+\.\s*/, ""),
}));

export function stageLabel(stage: string): string {
  return stageLabels[stage] ?? stage;
}
