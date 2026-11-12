import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateWeightedScore,
  categorizeScore,
  type ScoringAspect,
} from "./scoring";

export type DashboardScoreRow = {
  participantId: string;
  participantName: string;
  score: number | null;
  categoryLabel: string | null;
  categoryId: string | null;
};

export type DashboardAssessmentResult = {
  eventId: string;
  eventName: string;
  stage: string;
  stageLabel: string;
  materialName: string | null;
  typeName: string;
  version: number;
  participantCount: number;
  scoredCount: number;
  averageScore: number | null;
  isOfficial: boolean;
  categoryCounts: {
    development: number;
    adequate: number;
    good: number;
    excellent: number;
  };
  participantScores?: DashboardScoreRow[];
};

export type DashboardAssessmentData = {
  mode: "participant" | "summary";
  error: boolean;
  results: DashboardAssessmentResult[];
};

const stageLabels: Record<string, string> = {
  screening: "Screening",
  training: "Pelatihan",
  follow_up: "Rencana Tindak Lanjut",
};

const emptyCounts = () => ({
  development: 0,
  adequate: 0,
  good: 0,
  excellent: 0,
});

export async function loadDashboardAssessmentData(
  supabase: SupabaseClient,
  role: string,
): Promise<DashboardAssessmentData | null> {
  if (role !== "admin_system" && role !== "observer" && role !== "instruktur")
    return null;

  const [
    eventsResponse,
    versionsResponse,
    typesResponse,
    materialsResponse,
    observationsResponse,
    assignmentsResponse,
    completionsResponse,
  ] = await Promise.all([
    supabase
      .from("events")
      .select("id, name, participants(id, display_name)")
      .order("starts_on", { ascending: false }),
    supabase
      .from("rubric_versions")
      .select(
        "id, event_id, stage, material_id, assessment_type_id, version, rubric_aspects(id, name, weight, position, rubric_indicator_aspects(weight, rubric_indicators(id, name, target, position, score_descriptors)))",
      )
      .eq("status", "active"),
    supabase.from("rubric_assessment_types").select("id, name"),
    supabase.from("rubric_materials").select("id, name"),
    supabase.from("observations").select("participant_id, indicator_id, score"),
    supabase.from("observer_assignments").select("id, event_id"),
    supabase
      .from("observer_rubric_version_completions")
      .select("assignment_id, rubric_version_id"),
  ]);
  const hasError = [
    eventsResponse,
    versionsResponse,
    typesResponse,
    materialsResponse,
    observationsResponse,
    assignmentsResponse,
    completionsResponse,
  ].some((response) => response.error);
  const events = eventsResponse.data ?? [];
  const types = typesResponse.data ?? [];
  const materials = materialsResponse.data ?? [];
  const observations = observationsResponse.data ?? [];
  const assignments = assignmentsResponse.data ?? [];
  const completions = completionsResponse.data ?? [];
  const results: DashboardAssessmentResult[] = [];

  for (const version of versionsResponse.data ?? []) {
    const event = events.find((item) => item.id === version.event_id);
    if (!event) continue;
    const versionAspects = [...(version.rubric_aspects ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((aspect) => ({
        id: aspect.id,
        weight: aspect.weight,
        rubric_indicators: (aspect.rubric_indicator_aspects ?? []).flatMap(
          (mapping) => {
            const indicator = mapping.rubric_indicators?.[0];
            return indicator
              ? [{ id: indicator.id, weight: mapping.weight }]
              : [];
          },
        ),
      })) as ScoringAspect[];
    const participantScores = event.participants.map((participant) => {
      const saved = observations.filter(
        (item) =>
          item.participant_id === participant.id &&
          versionAspects.some((aspect) =>
            aspect.rubric_indicators.some(
              (indicator) => indicator.id === item.indicator_id,
            ),
          ),
      );
      const scoreMap = new Map(
        saved.map((item) => [item.indicator_id, { score: item.score }]),
      );
      const calculated = calculateWeightedScore(versionAspects, scoreMap);
      const category = categorizeScore(calculated.value);
      return {
        participantId: participant.id,
        participantName: participant.display_name,
        score: calculated.value,
        categoryLabel: category?.label ?? null,
        categoryId: category?.id ?? null,
      };
    });
    const scored = participantScores.filter((item) => item.score !== null);
    const eventAssignments = assignments.filter(
      (assignment) => assignment.event_id === event.id,
    );
    const completed = eventAssignments.filter((assignment) =>
      completions.some(
        (completion) =>
          completion.rubric_version_id === version.id &&
          completion.assignment_id === assignment.id,
      ),
    );
    const categoryCounts = emptyCounts();
    for (const item of scored)
      if (item.categoryId && item.categoryId in categoryCounts)
        categoryCounts[item.categoryId as keyof typeof categoryCounts] += 1;
    results.push({
      eventId: event.id,
      eventName: event.name,
      stage: version.stage,
      stageLabel: stageLabels[version.stage] ?? version.stage,
      materialName:
        materials.find((material) => material.id === version.material_id)
          ?.name ?? null,
      typeName:
        types.find((type) => type.id === version.assessment_type_id)?.name ??
        "Penilaian",
      version: version.version,
      participantCount: event.participants.length,
      scoredCount: scored.length,
      averageScore: scored.length
        ? scored.reduce((sum, item) => sum + (item.score ?? 0), 0) /
          scored.length
        : null,
      isOfficial:
        eventAssignments.length > 0 &&
        completed.length === eventAssignments.length,
      categoryCounts,
      participantScores,
    });
  }
  results.sort(
    (a, b) =>
      a.eventName.localeCompare(b.eventName) ||
      a.stage.localeCompare(b.stage) ||
      (a.materialName ?? "").localeCompare(b.materialName ?? "") ||
      a.typeName.localeCompare(b.typeName),
  );
  return { mode: "participant", error: hasError, results };
}
