export type LowScoreIndicator = {
  indicatorId: string;
  indicatorName: string;
  aspectName: string;
  scopeKey: string;
  score: number | null;
};

export type DraftRecommendation = {
  key: string;
  recommendation: string;
  evidenceReferences: {
    kind: "auto_low_indicator";
    indicatorId: string;
    scopeKey: string;
  }[];
};

const adviceByAspect: Record<string, string> = {
  intelektualitas:
    "Berikan bahan bacaan atau kasus singkat, lalu ajak peserta menyampaikan alasan dan bukti yang mendukung pendapatnya.",
  religiusitas:
    "Ajak peserta melakukan refleksi terarah tentang nilai yang dipelajari dan contoh penerapannya dalam keseharian, tanpa menilai keyakinan pribadinya.",
  humanitas:
    "Latih melalui simulasi kasus dan diskusi perspektif: peserta mendengarkan pengalaman pihak lain, merangkum kebutuhannya, lalu memilih respons yang menghargai.",
  "partisipasi dan kolaborasi":
    "Berikan tugas kelompok dengan peran yang bergilir dan kesempatan kontribusi yang jelas; tutup dengan umpan balik antaranggota.",
  "kedisiplinan dan tanggung jawab":
    "Sepakati satu komitmen atau tenggat yang terukur, gunakan pengingat sederhana, lalu tinjau pelaksanaannya pada pertemuan berikutnya.",
  "komitmen dan tindak lanjut":
    "Susun satu langkah tindak lanjut yang spesifik beserta penanggung jawab dan waktunya, kemudian cek kemajuannya pada sesi berikutnya.",
};

const fallbackAdvice =
  "Diskusikan latihan sederhana yang relevan, sepakati target yang dapat diamati, lalu tinjau kembali dengan bukti pada sesi berikutnya.";

/**
 * Satu draf rekomendasi untuk satu evaluasi. Semua indikator dengan rata-rata
 * di bawah ambang disebut, tanpa menuliskan angka skor. Saran tetap umum per
 * aspek dan deterministik, sesuai batasan produk.
 */
export function buildLowScoreRecommendations(
  indicators: LowScoreIndicator[],
  threshold = 3,
): DraftRecommendation | null {
  const lowById = new Map<string, LowScoreIndicator>();
  for (const item of indicators) {
    if (
      item.score === null ||
      !Number.isFinite(item.score) ||
      item.score >= threshold
    )
      continue;
    const current = lowById.get(item.indicatorId);
    if (!current || item.score < current.score!)
      lowById.set(item.indicatorId, item);
  }
  if (lowById.size === 0) return null;

  const items = [...lowById.values()];
  const describe = (item: LowScoreIndicator) =>
    `“${item.indicatorName}” (aspek ${item.aspectName})`;
  let nameList = items.map(describe).join(", ");
  if (nameList.length > 900) {
    nameList =
      items.slice(0, 8).map(describe).join(", ") + ", dan indikator lainnya";
  }
  const advice = [
    ...new Set(
      items.map((item) => {
        const key = item.aspectName.trim().toLocaleLowerCase("id-ID");
        return adviceByAspect[key] ?? fallbackAdvice;
      }),
    ),
  ].join(" ");

  return {
    key: "auto",
    recommendation: `Draf otomatis untuk indikator dengan rata-rata di bawah 3/5: ${nameList}. ${advice}`,
    evidenceReferences: items.map((item) => ({
      kind: "auto_low_indicator",
      indicatorId: item.indicatorId,
      scopeKey: item.scopeKey,
    })),
  };
}
