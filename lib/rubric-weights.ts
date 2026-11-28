/** Bagi bobot secara merata; sisa pembulatan ditanggung entri terakhir. */
export function evenWeight(total: number, count: number, index: number) {
  const regular = Math.round((total / count) * 100) / 100;
  return index === count - 1
    ? Math.round((total - regular * (count - 1)) * 100) / 100
    : regular;
}

export function roundWeight(value: number) {
  return Math.round(value * 100) / 100;
}

type ActivationMapping = {
  weight?: number | string | null;
  rubric_indicators?:
    | { score_descriptors?: Record<string, unknown> | null }
    | Array<{ score_descriptors?: Record<string, unknown> | null }>
    | null;
};

type ActivationAspect = {
  weight?: number | string | null;
  rubric_indicator_aspects?: ActivationMapping[] | null;
};

/**
 * Satu gate untuk aturan bobot dan uraian skor sebelum mengaktifkan rubrik.
 * Status draf dan konflik versi aktif tetap diperiksa pemanggil.
 */
export function validateRubricForActivation(
  aspects: ActivationAspect[],
): string | null {
  if (!aspects.length)
    return "Tambahkan aspek dan indikator sebelum mengaktifkan rubrik.";
  const close = (value: number) => Math.abs(value - 100) < 0.001;
  if (!close(aspects.reduce((sum, aspect) => sum + Number(aspect.weight), 0)))
    return "Bobot antar-aspek dan bobot pemetaan indikator pada setiap aspek masing-masing harus berjumlah 100%.";
  for (const aspect of aspects) {
    const mappings = aspect.rubric_indicator_aspects ?? [];
    if (
      !mappings.length ||
      !close(mappings.reduce((sum, item) => sum + Number(item.weight), 0))
    )
      return "Bobot antar-aspek dan bobot pemetaan indikator pada setiap aspek masing-masing harus berjumlah 100%.";
    for (const mapping of mappings) {
      const indicator = Array.isArray(mapping.rubric_indicators)
        ? mapping.rubric_indicators[0]
        : mapping.rubric_indicators;
      const descriptors = indicator?.score_descriptors ?? {};
      for (const score of [1, 2, 3, 4, 5]) {
        if (String(descriptors[String(score)] ?? "").trim().length < 3)
          return "Lengkapi uraian perilaku untuk skor 1 sampai 5 pada setiap indikator.";
      }
    }
  }
  return null;
}
