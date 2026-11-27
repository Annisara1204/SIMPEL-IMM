export type RubricVersionSeed = {
  material_id: string | null;
  version: number;
};

/** Nomor versi berikutnya untuk tiap materi tujuan, mulai dari 1 bila belum ada versi. */
export function nextVersionsByMaterial(
  existing: readonly RubricVersionSeed[],
  materialIds: readonly string[],
): Record<string, number> {
  const byMaterial: Record<string, number> = {};
  for (const id of materialIds) byMaterial[id] = 1;
  for (const row of existing) {
    if (!row.material_id || !(row.material_id in byMaterial)) continue;
    byMaterial[row.material_id] = Math.max(
      byMaterial[row.material_id],
      Number(row.version) + 1,
    );
  }
  return byMaterial;
}
