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
