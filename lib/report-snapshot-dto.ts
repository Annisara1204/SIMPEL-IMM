import type { ReportSnapshotData } from "./supabase-rows";

/**
 * Versi ringkas snapshot_data yang dikirim ke komponen Laporan.
 * Berisi hanya field yang dipakai untuk tampilan, filter, dan Excel.
 * Detail penuh (observerScores, rentang, pending, dan lain-lain) sengaja
 * tidak dikirim; PDF dan ZIP mengambil snapshot penuh lewat Server Action
 * saat tombol ekspor ditekan.
 */
export function compactReportSnapshot(
  data: ReportSnapshotData | null,
): ReportSnapshotData | null {
  if (!data) return null;
  return {
    schemaVersion: data.schemaVersion,
    createdAt: data.createdAt,
    participantId: data.participantId,
    eventId: data.eventId,
    aspects: Array.isArray(data.aspects)
      ? data.aspects.map((aspect) => ({
          aspectId: aspect.aspectId ?? aspect.aspect_id ?? undefined,
          aspectName: aspect.aspectName ?? aspect.aspect_name ?? undefined,
          weight: aspect.weight,
          score: aspect.score,
          scoreOutOf100:
            aspect.scoreOutOf100 ?? aspect.score_out_of_100 ?? undefined,
          coverage: aspect.coverage,
        }))
      : undefined,
    indicators: Array.isArray(data.indicators)
      ? data.indicators.map((indicator) => ({
          indicatorId: indicator.indicatorId,
          scope: indicator.scope,
          scopeKey: indicator.scopeKey ?? indicator.scope_key ?? undefined,
          average: indicator.average,
          validRatings: indicator.validRatings,
          notObserved: indicator.notObserved,
          reviewStatus: indicator.reviewStatus,
        }))
      : undefined,
    overall: data.overall
      ? { score: data.overall.score, status: data.overall.status }
      : undefined,
    collective: data.collective
      ? {
          summary: data.collective.summary,
          strengths: data.collective.strengths,
          developmentAreas: data.collective.developmentAreas,
          recommendationSummary: data.collective.recommendationSummary,
          decision: data.collective.decision,
          decisionRationale: data.collective.decisionRationale,
        }
      : undefined,
    approvedRecommendations: Array.isArray(data.approvedRecommendations)
      ? data.approvedRecommendations.map((item) => ({
          id: item.id,
          recommendation: item.recommendation,
        }))
      : undefined,
  };
}
