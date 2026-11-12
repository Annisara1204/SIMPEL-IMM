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
  evidenceReference: {
    kind: "auto_low_indicator";
    indicatorId: string;
    scopeKey: string;
    score: number;
  };
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

export function buildLowScoreRecommendations(
  indicators: LowScoreIndicator[],
  threshold = 3,
): DraftRecommendation[] {
  const lowestByIndicator = new Map<string, LowScoreIndicator>();
  for (const item of indicators) {
    if (
      item.score === null ||
      !Number.isFinite(item.score) ||
      item.score >= threshold
    )
      continue;
    const current = lowestByIndicator.get(item.indicatorId);
    if (!current || item.score < current.score!)
      lowestByIndicator.set(item.indicatorId, item);
  }

  return [...lowestByIndicator.values()].map((item) => {
    const aspectKey = item.aspectName.trim().toLocaleLowerCase("id-ID");
    const advice =
      adviceByAspect[aspectKey] ??
      "Diskusikan latihan sederhana yang relevan dengan indikator ini, sepakati target yang dapat diamati, lalu tinjau kembali dengan bukti pada sesi berikutnya.";
    const score = Number(item.score!.toFixed(2));
    return {
      key: `${item.indicatorId}:${item.scopeKey}`,
      recommendation: `Draf otomatis untuk indikator “${item.indicatorName}” (rata-rata ${score}/5, aspek ${item.aspectName}): ${advice}`,
      evidenceReference: {
        kind: "auto_low_indicator",
        indicatorId: item.indicatorId,
        scopeKey: item.scopeKey,
        score,
      },
    };
  });
}
