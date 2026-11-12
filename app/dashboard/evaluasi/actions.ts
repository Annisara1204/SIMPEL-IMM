"use server";
import { uuidPattern } from "@/lib/validation";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  calculateAspectAggregates,
  calculateOverallScore,
  type IndicatorAggregate,
  type PlannedIndicator,
} from "@/lib/phase6-scoring";
import { buildLowScoreRecommendations } from "@/lib/phase6-recommendations";
import { relatedRows } from "@/lib/relations";
import type {
  AssessmentSummaryRow,
  RubricVersionJoined,
} from "@/lib/supabase-rows";

async function requireModerator(eventId: string) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");
  const { data: allowed, error } = await supabase.rpc(
    "is_assessment_moderator",
    { target_event_id: eventId },
  );
  if (error || allowed !== true)
    throw new Error(
      "Hanya Admin Sistem atau koordinator instruktur kegiatan yang dapat memoderasi hasil.",
    );
  return { supabase, userId };
}

/**
 * Filter rekap indikator ke satu jenis penilaian (satu rubrik versi aktif
 * per kegiatan). Baris `cross_session` masuk hanya bila versi ini memuat
 * indikator tersebut; seluruh baris `session:<id>` cocok persis.
 */
function scopedSummaryRows(
  rows: AssessmentSummaryRow[],
  rubricVersionId: string,
  participantId: string,
): AssessmentSummaryRow[] {
  return rows.filter((row) => {
    if (row.participant_id !== participantId) return false;
    if (row.assessment_scope_key === `session:${rubricVersionId}`) return true;
    return (
      row.assessment_scope_key === "cross_session" &&
      Array.isArray(row.source_rubric_version_ids) &&
      row.source_rubric_version_ids.includes(rubricVersionId)
    );
  });
}

/** Baca & validasi rubricVersionId dari formData; wajib untuk aksi per jenis. */
function requireRubricVersionId(formData: FormData): string {
  const rubricVersionId = String(formData.get("rubricVersionId") ?? "");
  if (!uuidPattern.test(rubricVersionId))
    throw new Error("Jenis penilaian belum dipilih.");
  return rubricVersionId;
}

export async function saveAssessmentModeration(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const participantId = String(formData.get("participantId") ?? "");
  const rubricVersionId = String(formData.get("rubricVersionId") ?? "");
  const indicatorId = String(formData.get("indicatorId") ?? "");
  if (
    [eventId, participantId, rubricVersionId, indicatorId].some(
      (id) => !uuidPattern.test(id),
    )
  )
    throw new Error("Referensi moderasi tidak valid.");
  const { supabase, userId } = await requireModerator(eventId);
  const sourceVersionsRaw = String(
    formData.get("sourceRubricVersionIds") ?? "",
  );
  let sourceVersionIds: string[] = [rubricVersionId];
  if (sourceVersionsRaw) {
    try {
      const parsed = JSON.parse(sourceVersionsRaw);
      if (
        !Array.isArray(parsed) ||
        parsed.some((id) => typeof id !== "string" || !uuidPattern.test(id))
      )
        throw new Error();
      sourceVersionIds = [...new Set(parsed)];
    } catch {
      throw new Error("Referensi cakupan moderasi tidak valid.");
    }
  }
  if (!sourceVersionIds.includes(rubricVersionId))
    throw new Error(
      "Versi rubrik yang dimoderasi tidak termasuk dalam cakupan ini.",
    );
  const competencyIndicatorId = String(
    formData.get("competencyIndicatorId") ?? indicatorId,
  );
  if (!uuidPattern.test(competencyIndicatorId))
    throw new Error("Referensi indikator master tidak valid.");
  const [{ data: participant }, { data: versions }] = await Promise.all([
    supabase
      .from("participants")
      .select("id,event_id")
      .eq("id", participantId)
      .maybeSingle(),
    supabase
      .from("rubric_versions")
      .select(
        "id,event_id,status,rubric_aspects(rubric_indicator_aspects(rubric_indicators(id,competency_indicator_id)))",
      )
      .eq("event_id", eventId)
      .eq("status", "active")
      .in("id", sourceVersionIds),
  ]);
  if (
    participant?.event_id !== eventId ||
    versions?.length !== sourceVersionIds.length
  )
    throw new Error("Peserta atau versi rubrik tidak sesuai kegiatan.");
  const typedVersions = (versions ?? []) as unknown as RubricVersionJoined[];
  const localIndicators = typedVersions.flatMap((version) =>
    relatedRows(version.rubric_aspects).flatMap((aspect) =>
      relatedRows(aspect.rubric_indicator_aspects).flatMap((mapping) =>
        relatedRows(mapping.rubric_indicators)
          .filter(
            (indicator) =>
              (indicator.competency_indicator_id ?? indicator.id) ===
              competencyIndicatorId,
          )
          .map((indicator) => ({
            versionId: version.id,
            id: indicator.id,
          })),
      ),
    ),
  );
  if (
    !localIndicators.some(
      (indicator) =>
        indicator.versionId === rubricVersionId && indicator.id === indicatorId,
    )
  )
    throw new Error("Indikator tidak cocok dengan versi rubrik sumber.");
  const localIndicatorIds = [
    ...new Set(localIndicators.map((item) => item.id)),
  ];
  const { data: submissions } = await supabase
    .from("assessment_submissions")
    .select("id,status")
    .eq("participant_id", participantId)
    .in("rubric_version_id", sourceVersionIds)
    .in("status", ["submitted", "finalized"]);
  const submissionIds = (submissions ?? []).map((item) => item.id);
  const { data: ratingRows } = submissionIds.length
    ? await supabase
        .from("assessment_ratings")
        .select("score,response_status")
        .eq("participant_id", participantId)
        .in("submission_id", submissionIds)
        .in("indicator_id", localIndicatorIds)
    : { data: [] };
  const scores = (ratingRows ?? [])
    .filter(
      (rating) =>
        rating.response_status === "scored" && typeof rating.score === "number",
    )
    .map((rating) => rating.score!);
  const range = scores.length ? Math.max(...scores) - Math.min(...scores) : 0;
  if (range < 2)
    throw new Error(
      "Moderasi hanya dibuat untuk indikator dengan selisih skor minimal 2.",
    );
  const status = String(formData.get("status") ?? "needs_review");
  if (
    ![
      "needs_review",
      "clarification_requested",
      "discussion_scheduled",
      "reviewed",
      "resolved",
    ].includes(status)
  )
    throw new Error("Status moderasi tidak valid.");
  const discussionValue = String(formData.get("discussionScheduledFor") ?? "");
  const parsedDiscussionDate = discussionValue
    ? new Date(discussionValue)
    : null;
  if (parsedDiscussionDate && !Number.isFinite(parsedDiscussionDate.getTime()))
    throw new Error("Jadwal pembahasan tidak valid.");
  const discussionScheduledFor = parsedDiscussionDate
    ? parsedDiscussionDate.toISOString()
    : null;
  if (status === "discussion_scheduled" && !discussionScheduledFor)
    throw new Error("Tanggal dan waktu pembahasan wajib diisi.");
  const payload = {
    event_id: eventId,
    participant_id: participantId,
    rubric_version_id: rubricVersionId,
    indicator_id: indicatorId,
    status,
    score_range: range,
    moderator_id: userId,
    reason: String(formData.get("reason") ?? "")
      .trim()
      .slice(0, 3000),
    outcome: String(formData.get("outcome") ?? "")
      .trim()
      .slice(0, 5000),
    discussion_scheduled_for: discussionScheduledFor,
    decision: formData.get("decision")
      ? String(formData.get("decision"))
      : null,
    consensus_score: formData.get("consensusScore")
      ? Number(formData.get("consensusScore"))
      : null,
    additional_notes: String(formData.get("additionalNotes") ?? "")
      .trim()
      .slice(0, 5000),
  };
  if (
    payload.decision &&
    !["retain_average", "consensus"].includes(payload.decision)
  )
    throw new Error("Pilihan keputusan moderasi tidak valid.");
  if (
    payload.decision === "consensus" &&
    !(
      payload.consensus_score &&
      payload.consensus_score >= 1 &&
      payload.consensus_score <= 5
    )
  )
    throw new Error("Nilai konsensus 1–5 wajib diisi.");
  const { data: existing } = await supabase
    .from("assessment_moderations")
    .select("id")
    .eq("participant_id", participantId)
    .eq("rubric_version_id", rubricVersionId)
    .eq("indicator_id", indicatorId)
    .maybeSingle();
  const result = existing
    ? await supabase
        .from("assessment_moderations")
        .update(payload)
        .eq("id", existing.id)
    : await supabase.from("assessment_moderations").insert(payload);
  if (result.error)
    throw new Error(
      "Catatan moderasi gagal disimpan. Pastikan seluruh migrasi basis data sudah diterapkan.",
    );
  revalidatePath("/dashboard/evaluasi");
}

export async function saveCollectiveEvaluation(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const participantId = String(formData.get("participantId") ?? "");
  if (![eventId, participantId].every((id) => uuidPattern.test(id)))
    throw new Error("Peserta atau kegiatan tidak valid.");
  const rubricVersionId = requireRubricVersionId(formData);
  const { supabase, userId } = await requireModerator(eventId);
  const [{ data: participant }, { data: current }] = await Promise.all([
    supabase
      .from("participants")
      .select("id,event_id")
      .eq("id", participantId)
      .maybeSingle(),
    supabase
      .from("collective_evaluations")
      .select("id,status")
      .eq("event_id", eventId)
      .eq("participant_id", participantId)
      .eq("rubric_version_id", rubricVersionId)
      .maybeSingle(),
  ]);
  if (participant?.event_id !== eventId)
    throw new Error("Peserta tidak ditemukan pada kegiatan ini.");
  if (current?.status === "finalized")
    throw new Error("Evaluasi telah difinalisasi dan dikunci.");
  const evidenceReferences = String(
    formData.get("evidenceReferencesText") ?? "",
  )
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 30);
  const fields = {
    event_id: eventId,
    participant_id: participantId,
    rubric_version_id: rubricVersionId,
    updated_by: userId,
    strengths: String(formData.get("strengths") ?? "")
      .trim()
      .slice(0, 5000),
    development_areas: String(formData.get("developmentAreas") ?? "")
      .trim()
      .slice(0, 5000),
    discussion_notes: String(formData.get("discussionNotes") ?? "")
      .trim()
      .slice(0, 10000),
    collective_summary: String(formData.get("collectiveSummary") ?? "")
      .trim()
      .slice(0, 10000),
    recommendation_summary: String(formData.get("recommendationSummary") ?? "")
      .trim()
      .slice(0, 5000),
    evidence_references: evidenceReferences,
  };
  const { error } = await supabase
    .from("collective_evaluations")
    .upsert(fields, {
      onConflict: "event_id,participant_id,rubric_version_id",
    });
  if (error) throw new Error("Draf evaluasi kolektif gagal disimpan.");
  revalidatePath("/dashboard/evaluasi");
}

export async function addDevelopmentRecommendation(formData: FormData) {
  const evaluationId = String(formData.get("evaluationId") ?? "");
  if (!uuidPattern.test(evaluationId)) throw new Error("Evaluasi tidak valid.");
  const supabase = await createClient();
  const { data: evaluation } = await supabase
    .from("collective_evaluations")
    .select("id,event_id,participant_id,status")
    .eq("id", evaluationId)
    .maybeSingle();
  if (!evaluation || evaluation.status !== "draft")
    throw new Error("Evaluasi draf tidak ditemukan.");
  const { userId } = await requireModerator(evaluation.event_id);
  const { error } = await supabase.from("development_recommendations").insert({
    evaluation_id: evaluation.id,
    participant_id: evaluation.participant_id,
    recommendation: String(formData.get("recommendation") ?? "").trim(),
    created_by: userId,
  });
  if (error) throw new Error("Rekomendasi gagal disimpan.");
  revalidatePath("/dashboard/evaluasi");
}

export async function generateAutomaticRecommendations(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const participantId = String(formData.get("participantId") ?? "");
  if (!uuidPattern.test(eventId) || !uuidPattern.test(participantId))
    throw new Error("Kegiatan atau peserta tidak valid.");
  const rubricVersionId = requireRubricVersionId(formData);
  const { supabase, userId } = await requireModerator(eventId);
  const [
    { data: participant },
    { data: summaryRows, error: summaryError },
    { data: versions },
  ] = await Promise.all([
    supabase
      .from("participants")
      .select("id,event_id")
      .eq("id", participantId)
      .maybeSingle(),
    supabase.rpc("get_event_assessment_summary", { target_event_id: eventId }),
    supabase
      .from("rubric_versions")
      .select(
        "rubric_aspects(rubric_indicator_aspects(rubric_indicators(id,name,competency_indicator_id)))",
      )
      .eq("event_id", eventId)
      .eq("id", rubricVersionId)
      .eq("status", "active"),
  ]);
  if (participant?.event_id !== eventId)
    throw new Error("Peserta tidak ditemukan pada kegiatan ini.");
  if (summaryError)
    throw new Error(
      "Rekap skor belum tersedia. Jalankan seluruh migrasi basis data terlebih dahulu.",
    );
  const { data: evaluation, error: evaluationError } = await supabase
    .from("collective_evaluations")
    .upsert(
      {
        event_id: eventId,
        participant_id: participantId,
        rubric_version_id: rubricVersionId,
        updated_by: userId,
      },
      { onConflict: "event_id,participant_id,rubric_version_id" },
    )
    .select("id,status")
    .single();
  if (evaluationError || !evaluation || evaluation.status !== "draft")
    throw new Error("Draf evaluasi belum tersedia atau sudah difinalisasi.");

  const nameById = new Map<string, string>();
  const nameVersions = (versions ?? []) as unknown as RubricVersionJoined[];
  for (const version of nameVersions)
    for (const aspect of relatedRows(version.rubric_aspects))
      for (const mapping of relatedRows(aspect.rubric_indicator_aspects))
        for (const indicator of relatedRows(mapping.rubric_indicators))
          nameById.set(
            indicator.competency_indicator_id ?? indicator.id,
            indicator.name,
          );
  const summary = (summaryRows ?? []) as AssessmentSummaryRow[];
  const lowIndicators = scopedSummaryRows(
    summary,
    rubricVersionId,
    participantId,
  )
    .filter((row) => Number(row.valid_rating_count) > 0)
    .map((row) => ({
      indicatorId: row.indicator_id,
      indicatorName: nameById.get(row.indicator_id) ?? "indikator kompetensi",
      aspectName: row.aspect_name,
      scopeKey: row.assessment_scope_key,
      score: row.average_score === null ? null : Number(row.average_score),
    }));
  const drafts = buildLowScoreRecommendations(lowIndicators, 3);
  const { data: existing, error: existingError } = await supabase
    .from("development_recommendations")
    .select("evidence_references")
    .eq("evaluation_id", evaluation.id);
  if (existingError) throw new Error("Rekomendasi terdahulu gagal dibaca.");
  const existingKeys = new Set(
    (existing ?? []).flatMap((item) =>
      Array.isArray(item.evidence_references)
        ? item.evidence_references.flatMap(
            (ref: {
              kind?: unknown;
              indicatorId?: unknown;
              scopeKey?: unknown;
            }) =>
              ref?.kind === "auto_low_indicator" &&
              typeof ref.indicatorId === "string" &&
              typeof ref.scopeKey === "string"
                ? [`${ref.indicatorId}:${ref.scopeKey}`]
                : [],
          )
        : [],
    ),
  );
  const newDrafts = drafts.filter((item) => !existingKeys.has(item.key));
  if (newDrafts.length) {
    const { error } = await supabase.from("development_recommendations").insert(
      newDrafts.map((item) => ({
        evaluation_id: evaluation.id,
        participant_id: participantId,
        recommendation: item.recommendation,
        evidence_references: [item.evidenceReference],
        created_by: userId,
        status: "draft",
      })),
    );
    if (error) throw new Error("Draf rekomendasi otomatis gagal disimpan.");
  }
  revalidatePath("/dashboard/evaluasi");
}

export async function approveDevelopmentRecommendation(formData: FormData) {
  const recommendationId = String(formData.get("recommendationId") ?? "");
  if (!uuidPattern.test(recommendationId))
    throw new Error("Rekomendasi tidak valid.");
  const supabase = await createClient();
  const { data: recommendation } = await supabase
    .from("development_recommendations")
    .select("id,evaluation_id")
    .eq("id", recommendationId)
    .maybeSingle();
  if (!recommendation) throw new Error("Rekomendasi tidak ditemukan.");
  const { data: evaluation } = await supabase
    .from("collective_evaluations")
    .select("event_id,status")
    .eq("id", recommendation.evaluation_id)
    .maybeSingle();
  if (!evaluation || evaluation.status !== "draft")
    throw new Error("Evaluasi telah dikunci.");
  const { userId } = await requireModerator(evaluation.event_id);
  const { error } = await supabase
    .from("development_recommendations")
    .update({
      status: "approved",
      approved_by: userId,
      approved_at: new Date().toISOString(),
    })
    .eq("id", recommendationId);
  if (error) throw new Error("Persetujuan rekomendasi gagal disimpan.");
  revalidatePath("/dashboard/evaluasi");
}

export async function finalizeCollectiveEvaluation(formData: FormData) {
  const rubricVersionId = requireRubricVersionId(formData);
  const eventId = String(formData.get("eventId") ?? "");
  const participantId = String(formData.get("participantId") ?? "");
  if (![eventId, participantId].every((id) => uuidPattern.test(id)))
    throw new Error("Peserta atau kegiatan tidak valid.");
  const { supabase, userId } = await requireModerator(eventId);
  const { data: participant } = await supabase
    .from("participants")
    .select("id,event_id")
    .eq("id", participantId)
    .maybeSingle();
  if (participant?.event_id !== eventId)
    throw new Error("Peserta tidak ditemukan pada kegiatan ini.");
  const [
    { data: current },
    { data: summaryRows, error: summaryError },
    { data: policy },
  ] = await Promise.all([
    supabase
      .from("collective_evaluations")
      .select("id,status")
      .eq("event_id", eventId)
      .eq("participant_id", participantId)
      .eq("rubric_version_id", rubricVersionId)
      .maybeSingle(),
    supabase.rpc("get_event_assessment_summary", { target_event_id: eventId }),
    supabase
      .from("assessment_scoring_policies")
      .select("minimum_coverage,review_score_delta")
      .eq("id", true)
      .maybeSingle(),
  ]);
  if (current?.status === "finalized")
    throw new Error("Evaluasi untuk jenis penilaian ini sudah difinalisasi.");
  if (summaryError || !policy)
    throw new Error(
      "Rekap skor belum tersedia. Jalankan seluruh migrasi basis data terlebih dahulu.",
    );
  const summaryRowsTyped = (summaryRows ?? []) as AssessmentSummaryRow[];
  const rows = scopedSummaryRows(
    summaryRowsTyped,
    rubricVersionId,
    participantId,
  );
  const aggregates = new Map<string, IndicatorAggregate>();
  const planned: PlannedIndicator[] = rows.map((row) => {
    const key = `${row.indicator_id}:${row.assessment_scope_key}`;
    if (!aggregates.has(key))
      aggregates.set(key, {
        participantId,
        indicatorId: row.indicator_id,
        scope: row.assessment_scope,
        scopeKey: row.assessment_scope_key,
        sourceRubricVersionIds: row.source_rubric_version_ids ?? [],
        average: row.average_score === null ? null : Number(row.average_score),
        validRatings: Number(row.valid_rating_count),
        minimum: row.minimum_score === null ? null : Number(row.minimum_score),
        maximum: row.maximum_score === null ? null : Number(row.maximum_score),
        range: row.score_range === null ? null : Number(row.score_range),
        notObserved: Number(row.not_observed_count),
        pending: Number(row.pending_count),
        reviewStatus: row.review_status,
        observerScores: [],
      });
    return {
      participantId,
      rubricVersionId: `aggregate:${row.assessment_scope_key}`,
      localIndicatorId: row.indicator_id,
      competencyIndicatorId: row.indicator_id,
      assessmentScope: row.assessment_scope,
      assessmentScopeKey: row.assessment_scope_key,
      aspectId: row.aspect_id,
      aspectName: row.aspect_name,
      aspectWeight: Number(row.aspect_weight),
      indicatorWeight: Number(row.indicator_weight),
      expectedObserverIds: [],
    };
  });
  const aspects = calculateAspectAggregates(
    planned,
    [...aggregates.values()],
    Number(policy.minimum_coverage),
  );
  const overall = calculateOverallScore(aspects);
  if (overall.status !== "ready_for_collective_evaluation")
    throw new Error(
      `Coverage belum memadai. Hasil tetap provisional. ${overall.reasons.join("; ") || "Periksa aspek dan indikator yang direncanakan."}`,
    );
  const { data: openModerations } = await supabase
    .from("assessment_moderations")
    .select("id,status")
    .eq("event_id", eventId)
    .eq("participant_id", participantId)
    .eq("rubric_version_id", rubricVersionId)
    .not("status", "in", "(reviewed,resolved)");
  if (openModerations?.length)
    throw new Error(
      "Selesaikan moderasi untuk semua selisih skor sebelum finalisasi.",
    );
  const evidenceReferences = String(
    formData.get("evidenceReferencesText") ?? "",
  )
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 30);
  const fields = {
    event_id: eventId,
    participant_id: participantId,
    rubric_version_id: rubricVersionId,
    updated_by: userId,
    strengths: String(formData.get("strengths") ?? "")
      .trim()
      .slice(0, 5000),
    development_areas: String(formData.get("developmentAreas") ?? "")
      .trim()
      .slice(0, 5000),
    evidence_references: evidenceReferences,
    discussion_notes: String(formData.get("discussionNotes") ?? "")
      .trim()
      .slice(0, 10000),
    collective_summary: String(formData.get("collectiveSummary") ?? "")
      .trim()
      .slice(0, 10000),
    recommendation_summary: String(formData.get("recommendationSummary") ?? "")
      .trim()
      .slice(0, 5000),
  };
  const { data: evaluation, error: saveError } = await supabase
    .from("collective_evaluations")
    .upsert(fields, {
      onConflict: "event_id,participant_id,rubric_version_id",
    })
    .select("id,status")
    .single();
  if (saveError || !evaluation || evaluation.status !== "draft")
    throw new Error(
      "Draf evaluasi kolektif gagal disimpan atau sudah terkunci.",
    );
  const decision = String(formData.get("decision") ?? "");
  const rationale = String(formData.get("decisionRationale") ?? "").trim();
  if (
    !["pass", "not_pass", "further_discussion"].includes(decision) ||
    rationale.length < 10
  )
    throw new Error(
      "Pilih keputusan kelulusan dan isi alasan minimal 10 karakter.",
    );
  const versionIds = [rubricVersionId];
  const { data: versions } = await supabase
    .from("rubric_versions")
    .select("id,competency_framework_version_id")
    .eq("id", rubricVersionId);
  const [{ data: submissions }, { data: ratings }, { data: recommendations }] =
    await Promise.all([
      versionIds.length
        ? supabase
            .from("assessment_submissions")
            .select("id,status")
            .eq("participant_id", participantId)
            .in("rubric_version_id", versionIds)
            .in("status", ["submitted", "finalized"])
        : Promise.resolve({ data: [] }),
      versionIds.length
        ? supabase
            .from("assessment_ratings")
            .select(
              "id,submission_id,indicator_id,score,response_status,evidence,observer_name,observer_id,rubric_version_id,updated_at",
            )
            .eq("participant_id", participantId)
            .in("rubric_version_id", versionIds)
        : Promise.resolve({ data: [] }),
      supabase
        .from("development_recommendations")
        .select("id,recommendation,evidence_references,approved_by,approved_at")
        .eq("evaluation_id", evaluation.id)
        .eq("status", "approved"),
    ]);
  const submittedIds = new Set((submissions ?? []).map((item) => item.id));
  const sourceRatings = (ratings ?? []).filter((item) =>
    submittedIds.has(item.submission_id),
  );
  const moderationRows =
    (
      await supabase
        .from("assessment_moderations")
        .select(
          "indicator_id,status,score_range,reason,outcome,decision,consensus_score,additional_notes,revision,reviewed_at",
        )
        .eq("event_id", eventId)
        .eq("participant_id", participantId)
        .eq("rubric_version_id", rubricVersionId)
    ).data ?? [];
  const snapshot = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    participantId,
    eventId,
    aspects,
    indicators: [...aggregates.values()],
    overall: {
      ...overall,
      score: overall.score === null ? null : Number(overall.score.toFixed(2)),
      status: overall.status,
    },
    collective: {
      summary: fields.collective_summary,
      strengths: fields.strengths,
      developmentAreas: fields.development_areas,
      recommendationSummary: fields.recommendation_summary,
      decision,
      decisionRationale: rationale,
    },
    approvedRecommendations: recommendations ?? [],
  };
  const privateSources = {
    ratings: sourceRatings,
    moderations: moderationRows,
    collective: {
      strengths: fields.strengths,
      developmentAreas: fields.development_areas,
      evidenceReferences,
      discussionNotes: fields.discussion_notes,
    },
  };
  const { error: finalizeError } = await supabase.rpc(
    "finalize_collective_evaluation",
    {
      target_evaluation_id: evaluation.id,
      target_decision: decision,
      target_rationale: rationale,
      target_framework_versions: [
        ...new Set(
          (versions ?? []).flatMap((version) =>
            version.competency_framework_version_id
              ? [version.competency_framework_version_id]
              : [],
          ),
        ),
      ],
      target_rubric_versions: versionIds,
      target_rating_ids: sourceRatings.map((item) => item.id),
      target_snapshot: snapshot,
      target_private_sources: privateSources,
    },
  );
  if (finalizeError)
    throw new Error(
      finalizeError.message || "Snapshot hasil final gagal disimpan.",
    );
  revalidatePath("/dashboard/evaluasi");
}
