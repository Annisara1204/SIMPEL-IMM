"use server";
import { uuidPattern } from "@/lib/validation";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  calculateAspectAggregates,
  calculateOverallScore,
} from "@/lib/phase6-scoring";
import { buildEvaluationPlan } from "@/lib/evaluation-planning";
import { buildLowScoreRecommendations } from "@/lib/phase6-recommendations";
import { asRows, relatedRows } from "@/lib/relations";
import { requireModerator } from "@/lib/authorization";
import type {
  AssessmentSummaryRow,
  RubricVersionJoined,
} from "@/lib/supabase-rows";

type ActionResult<T> = { ok: true; value: T } | { ok: false; message: string };

function failed(message: string): { ok: false; message: string } {
  return { ok: false, message };
}

function actionError(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : "Operasi gagal. Muat ulang halaman dan coba lagi.";
}

function isNextControlError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_")
  );
}

function evaluationErrorUrl(message: string, formData: FormData): string {
  const params = new URLSearchParams();
  for (const key of ["eventId", "participantId", "versionId"] as const) {
    const value = String(formData.get(key) ?? "");
    if (value) params.set(key, value);
  }
  params.set("error", message.slice(0, 300));
  return `/dashboard/evaluasi?${params.toString()}`;
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
  const typedVersions = asRows<RubricVersionJoined>(
    versions,
    (row) => typeof row.id === "string" && "rubric_aspects" in row,
  );
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
  const decision = String(formData.get("decision") ?? "").trim();
  const rationale = String(formData.get("decisionRationale") ?? "").trim();
  if (decision) {
    if (!["pass", "not_pass", "further_discussion"].includes(decision))
      throw new Error("Keputusan kelulusan tidak dikenali.");
    if (rationale.length < 10)
      throw new Error("Alasan keputusan minimal 10 karakter.");
    Object.assign(fields, {
      graduation_decision: decision,
      decision_rationale: rationale,
    });
  }
  const { error } = await supabase
    .from("collective_evaluations")
    .upsert(fields, {
      onConflict: "event_id,participant_id,rubric_version_id",
    });
  if (error) throw new Error("Draf evaluasi kolektif gagal disimpan.");
  revalidatePath("/dashboard/evaluasi");
}

export async function updateDevelopmentRecommendation(formData: FormData) {
  const recommendationId = String(formData.get("recommendationId") ?? "");
  const recommendation = String(formData.get("recommendation") ?? "").trim();
  if (!uuidPattern.test(recommendationId))
    throw new Error("Rekomendasi tidak valid.");
  if (recommendation.length < 10)
    throw new Error("Teks rekomendasi terlalu singkat.");
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("development_recommendations")
    .select("id,evaluation_id,status")
    .eq("id", recommendationId)
    .eq("is_active", true)
    .maybeSingle();
  if (!row || row.status !== "draft")
    throw new Error("Hanya draf rekomendasi aktif yang dapat disunting.");
  const { data: evaluation } = await supabase
    .from("collective_evaluations")
    .select("event_id,status")
    .eq("id", row.evaluation_id)
    .maybeSingle();
  if (!evaluation || evaluation.status !== "draft")
    throw new Error("Evaluasi sudah difinalisasi.");
  await requireModerator(evaluation.event_id);
  const { error } = await supabase
    .from("development_recommendations")
    .update({ recommendation })
    .eq("id", recommendationId)
    .eq("status", "draft");
  if (error) throw new Error("Rekomendasi gagal diperbarui.");
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
    supabase.rpc("get_event_assessment_summary", {
      target_event_id: eventId,
      target_participant_id: participantId,
    }),
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
  const nameVersions = asRows<RubricVersionJoined>(
    versions,
    (row) => typeof row.id === "string" && typeof row.version === "number",
  );
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
  const draft = buildLowScoreRecommendations(lowIndicators, 3);
  const { data: existing, error: existingError } = await supabase
    .from("development_recommendations")
    .select("id")
    .eq("evaluation_id", evaluation.id)
    .eq("is_active", true);
  if (existingError) throw new Error("Rekomendasi terdahulu gagal dibaca.");
  const existingId = existing?.[0]?.id as string | undefined;

  if (!draft) {
    if (existingId) {
      const { error } = await supabase
        .from("development_recommendations")
        .update({ is_active: false })
        .eq("id", existingId);
      if (error) throw new Error("Rekomendasi lama gagal dinonaktifkan.");
    }
    revalidatePath("/dashboard/evaluasi");
    return;
  }

  if (existingId) {
    const { error } = await supabase
      .from("development_recommendations")
      .update({
        recommendation: draft.recommendation,
        evidence_references: draft.evidenceReferences,
        status: "draft",
        approved_by: null,
        approved_at: null,
      })
      .eq("id", existingId);
    if (error) throw new Error("Draf rekomendasi otomatis gagal diperbarui.");
  } else {
    const { error } = await supabase
      .from("development_recommendations")
      .insert({
        evaluation_id: evaluation.id,
        participant_id: participantId,
        recommendation: draft.recommendation,
        evidence_references: draft.evidenceReferences,
        created_by: userId,
        status: "draft",
      });
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
    .eq("is_active", true)
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

type FinalizeInput = {
  eventId: string;
  participantId: string;
  rubricVersionId: string;
  evidenceReferences: string[];
  strengths: string;
  developmentAreas: string;
  discussionNotes: string;
  collectiveSummary: string;
  recommendationSummary: string;
  decision: string;
  rationale: string;
};

function parseFinalizeFormData(
  formData: FormData,
): ActionResult<FinalizeInput> {
  const rubricVersionId = String(formData.get("rubricVersionId") ?? "");
  if (!uuidPattern.test(rubricVersionId))
    return failed("Jenis penilaian belum dipilih.");
  const eventId = String(formData.get("eventId") ?? "");
  const participantId = String(formData.get("participantId") ?? "");
  if (![eventId, participantId].every((id) => uuidPattern.test(id)))
    return failed("Peserta atau kegiatan tidak valid.");
  return {
    ok: true,
    value: {
      eventId,
      participantId,
      rubricVersionId,
      evidenceReferences: String(formData.get("evidenceReferencesText") ?? "")
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter(Boolean)
        .slice(0, 30),
      strengths: String(formData.get("strengths") ?? "")
        .trim()
        .slice(0, 5000),
      developmentAreas: String(formData.get("developmentAreas") ?? "")
        .trim()
        .slice(0, 5000),
      discussionNotes: String(formData.get("discussionNotes") ?? "")
        .trim()
        .slice(0, 10000),
      collectiveSummary: String(formData.get("collectiveSummary") ?? "")
        .trim()
        .slice(0, 10000),
      recommendationSummary: String(formData.get("recommendationSummary") ?? "")
        .trim()
        .slice(0, 5000),
      decision: String(formData.get("decision") ?? ""),
      rationale: String(formData.get("decisionRationale") ?? "").trim(),
    },
  };
}

async function runFinalize(
  input: FinalizeInput,
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<ActionResult<string>> {
  const { eventId, participantId, rubricVersionId } = input;
  const { data: participant } = await supabase
    .from("participants")
    .select("id,event_id")
    .eq("id", participantId)
    .maybeSingle();
  if (participant?.event_id !== eventId)
    return failed("Peserta tidak ditemukan pada kegiatan ini.");
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
    supabase.rpc("get_event_assessment_summary", {
      target_event_id: eventId,
      target_participant_id: participantId,
    }),
    supabase
      .from("assessment_scoring_policies")
      .select("minimum_coverage,review_score_delta")
      .eq("id", true)
      .maybeSingle(),
  ]);
  if (current?.status === "finalized")
    return failed("Evaluasi untuk jenis penilaian ini sudah difinalisasi.");
  if (summaryError || !policy)
    return failed(
      "Rekap skor belum tersedia. Jalankan seluruh migrasi basis data terlebih dahulu.",
    );
  const summaryRowsTyped = (summaryRows ?? []) as AssessmentSummaryRow[];
  const rows = scopedSummaryRows(
    summaryRowsTyped,
    rubricVersionId,
    participantId,
  );
  const { planned, aggregates } = buildEvaluationPlan(rows, {
    keyPrefix: "aggregate",
    participantId,
  });
  const aspects = calculateAspectAggregates(
    planned,
    aggregates,
    Number(policy.minimum_coverage),
  );
  const overall = calculateOverallScore(aspects);
  if (overall.status !== "ready_for_collective_evaluation")
    return failed(
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
    return failed(
      "Selesaikan moderasi untuk semua selisih skor sebelum finalisasi.",
    );
  const evidenceReferences = input.evidenceReferences;
  const fields = {
    event_id: eventId,
    participant_id: participantId,
    rubric_version_id: rubricVersionId,
    updated_by: userId,
    strengths: input.strengths,
    development_areas: input.developmentAreas,
    evidence_references: evidenceReferences,
    discussion_notes: input.discussionNotes,
    collective_summary: input.collectiveSummary,
    recommendation_summary: input.recommendationSummary,
  };
  const { data: evaluation, error: saveError } = await supabase
    .from("collective_evaluations")
    .upsert(fields, {
      onConflict: "event_id,participant_id,rubric_version_id",
    })
    .select("id,status")
    .single();
  if (saveError || !evaluation || evaluation.status !== "draft")
    return failed("Draf evaluasi kolektif gagal disimpan atau sudah terkunci.");
  const { decision, rationale } = input;
  if (
    !["pass", "not_pass", "further_discussion"].includes(decision) ||
    rationale.length < 10
  )
    return failed(
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
        .eq("status", "approved")
        .eq("is_active", true),
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
    return failed(
      finalizeError.message || "Snapshot hasil final gagal disimpan.",
    );
  const { data: savedSnapshot, error: snapshotError } = await supabase
    .from("assessment_snapshots")
    .select("id")
    .eq("collective_evaluation_id", evaluation.id)
    .order("revision", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (snapshotError || !savedSnapshot)
    return failed("Snapshot hasil tidak ditemukan setelah finalisasi.");
  return { ok: true, value: savedSnapshot.id as string };
}

async function finalizeFromForm(
  formData: FormData,
  publish: boolean,
): Promise<ActionResult<string>> {
  const parsed = parseFinalizeFormData(formData);
  if (!parsed.ok) return parsed;
  const input = parsed.value;
  let supabase: Awaited<ReturnType<typeof createClient>>;
  let userId: string;
  try {
    ({ supabase, userId } = await requireModerator(input.eventId));
  } catch (error) {
    if (isNextControlError(error)) throw error;
    return failed(actionError(error));
  }
  if (publish) {
    const { data: evaluation } = await supabase
      .from("collective_evaluations")
      .select("id,status")
      .eq("event_id", input.eventId)
      .eq("participant_id", input.participantId)
      .eq("rubric_version_id", input.rubricVersionId)
      .maybeSingle();
    if (evaluation?.status === "draft") {
      const { data: recommendation } = await supabase
        .from("development_recommendations")
        .select("id")
        .eq("evaluation_id", evaluation.id)
        .eq("is_active", true)
        .eq("status", "draft")
        .maybeSingle();
      if (recommendation) {
        const { error } = await supabase
          .from("development_recommendations")
          .update({
            status: "approved",
            approved_by: userId,
            approved_at: new Date().toISOString(),
          })
          .eq("id", recommendation.id)
          .eq("status", "draft");
        if (error) return failed("Rekomendasi gagal disetujui.");
      }
    }
  }
  const finalized = await runFinalize(input, supabase, userId);
  if (!finalized.ok) return finalized;
  if (!publish) return finalized;
  const { error: publishError } = await supabase.rpc(
    "publish_assessment_report",
    { target_snapshot_id: finalized.value },
  );
  if (publishError)
    return failed(publishError.message || "Rapor gagal diterbitkan.");
  return finalized;
}

export async function finalizeCollectiveEvaluation(formData: FormData) {
  const outcome = await finalizeFromForm(formData, false);
  if (!outcome.ok) redirect(evaluationErrorUrl(outcome.message, formData));
  revalidatePath("/dashboard/evaluasi");
}

export async function approveFinalizePublishReport(formData: FormData) {
  const outcome = await finalizeFromForm(formData, true);
  if (!outcome.ok) redirect(evaluationErrorUrl(outcome.message, formData));
  revalidatePath("/dashboard/evaluasi");
  revalidatePath("/dashboard/laporan");
  const eventId = String(formData.get("eventId") ?? "");
  redirect(
    `/dashboard/laporan?eventId=${eventId}&snapshotId=${outcome.value}&published=1`,
  );
}

export async function finalizeAllEvaluations(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  if (!uuidPattern.test(eventId)) throw new Error("Kegiatan tidak valid.");
  const { supabase, userId } = await requireModerator(eventId);
  const [{ data: evaluations }, { data: activeVersions }] = await Promise.all([
    supabase
      .from("collective_evaluations")
      .select(
        "id,participant_id,rubric_version_id,status,graduation_decision,decision_rationale,strengths,development_areas,evidence_references,discussion_notes,collective_summary,recommendation_summary",
      )
      .eq("event_id", eventId)
      .eq("status", "draft"),
    supabase
      .from("rubric_versions")
      .select("id")
      .eq("event_id", eventId)
      .eq("status", "active"),
  ]);
  const versionIds = (activeVersions ?? []).map(
    (version) => version.id as string,
  );
  const evaluatedVersionIds = new Set(
    (evaluations ?? []).map((item) => item.rubric_version_id as string),
  );
  const missingVersions = versionIds.filter(
    (id) => !evaluatedVersionIds.has(id),
  );

  let finalized = 0;
  let skipped = 0;
  let failed = 0;
  let firstFailure: string | null = null;
  for (const evaluation of evaluations ?? []) {
    const decision = String(evaluation.graduation_decision ?? "");
    const rationale = String(evaluation.decision_rationale ?? "").trim();
    if (
      !["pass", "not_pass", "further_discussion"].includes(decision) ||
      rationale.length < 10
    ) {
      skipped += 1;
      continue;
    }
    const input: FinalizeInput = {
      eventId,
      participantId: evaluation.participant_id as string,
      rubricVersionId: evaluation.rubric_version_id as string,
      evidenceReferences: Array.isArray(evaluation.evidence_references)
        ? (evaluation.evidence_references as unknown[]).map(String)
        : [],
      strengths: String(evaluation.strengths ?? ""),
      developmentAreas: String(evaluation.development_areas ?? ""),
      discussionNotes: String(evaluation.discussion_notes ?? ""),
      collectiveSummary: String(evaluation.collective_summary ?? ""),
      recommendationSummary: String(evaluation.recommendation_summary ?? ""),
      decision,
      rationale,
    };
    try {
      const outcome = await runFinalize(input, supabase, userId);
      if (!outcome.ok) {
        skipped += 1;
        continue;
      }
      finalized += 1;
    } catch (error) {
      failed += 1;
      if (!firstFailure) firstFailure = actionError(error);
    }
  }
  revalidatePath("/dashboard/evaluasi");
  revalidatePath("/dashboard/laporan");
  const failureQuery = failed
    ? `&batchFailed=${failed}&batchError=${encodeURIComponent((firstFailure ?? "").slice(0, 200))}`
    : "";
  redirect(
    `/dashboard/evaluasi?eventId=${eventId}&batchOk=${finalized}&batchSkipped=${skipped}&batchMissing=${missingVersions.length}${failureQuery}`,
  );
}
