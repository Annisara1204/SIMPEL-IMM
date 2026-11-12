/**
 * Pemuatan ringkasan awal untuk dashboard berbasis data (Phase 6/7).
 * Dipakai oleh `app/dashboard/page.tsx` dan dibagikan sebagai tipe dengan
 * `components/role-dashboard.tsx`.
 */

import type { createClient } from "./supabase/server";
import { firstRelated, type Relation } from "./relations";
import { stageLabel } from "./stage-labels";
import type { EventReportRow, ParticipantReport } from "./supabase-rows";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type StaffEventSummary = {
  id: string;
  name: string;
  participants: number;
  finalized: number;
  published: number;
  provisional: number;
  passed: number;
  notPassed: number;
  furtherDiscussion: number;
  averageScore: number | null;
  reviewers: number;
  sessions: number;
  assessmentSubmissions: number;
  latestActivity: string | null;
  unavailable: boolean;
};

export type Phase7Home =
  | { kind: "staff"; events: StaffEventSummary[] }
  | {
      kind: "personal";
      total: number;
      draft: number;
      submitted: number;
      finalized: number;
      assessedParticipants: number;
      sessions: {
        eventName: string;
        sessionName: string;
        status: string;
        updatedAt: string | null;
      }[];
      unavailable: boolean;
    }
  | { kind: "participant"; report: ParticipantReport | null };

/** Subrole Instruktur yang berhak melihat ringkasan seluruh kegiatan. */
export const MODERATOR_POSITIONS = [
  "mot",
  "vice_mot",
  "master_observer",
  "vice_observer",
] as const;

export function isModeratorPosition(position: string): boolean {
  return (MODERATOR_POSITIONS as readonly string[]).includes(position);
}

type SubmissionJoinRow = {
  id: string;
  status: string;
  participant_id: string;
  updated_at: string | null;
  rubric_versions: Relation<{
    stage: string;
    material_id: string | null;
    events: Relation<{ name: string }>;
    rubric_materials: Relation<{ name: string }>;
  }>;
};

async function summarizeEvent(
  supabase: Supabase,
  event: { id: string; name: string },
): Promise<StaffEventSummary> {
  const [{ data: rows, error }, { data: progress }, { data: versions }] =
    await Promise.all([
      supabase.rpc("get_event_report_rows", { target_event_id: event.id }),
      supabase.rpc("get_event_assessment_progress", {
        target_event_id: event.id,
      }),
      supabase
        .from("rubric_versions")
        .select("id")
        .eq("event_id", event.id)
        .eq("status", "active"),
    ]);
  const reports = (rows ?? []) as EventReportRow[];
  const final = reports.filter((row) => row.snapshot_id);
  const scores = final
    .map((row) => Number(row.snapshot_data?.overall?.score))
    .filter(Number.isFinite);
  const versionIds = (versions ?? []).map((item: { id: string }) => item.id);
  const { data: submissions } = versionIds.length
    ? await supabase
        .from("assessment_submissions")
        .select("id,status,updated_at")
        .in("rubric_version_id", versionIds)
        .order("updated_at", { ascending: false })
    : { data: [] };
  return {
    id: event.id,
    name: event.name,
    participants: reports.length,
    finalized: final.length,
    published: reports.filter((row) => row.published_at).length,
    provisional: reports.length - final.length,
    passed: final.filter(
      (row) => row.snapshot_data?.collective?.decision === "pass",
    ).length,
    notPassed: final.filter(
      (row) => row.snapshot_data?.collective?.decision === "not_pass",
    ).length,
    furtherDiscussion: final.filter(
      (row) => row.snapshot_data?.collective?.decision === "further_discussion",
    ).length,
    averageScore: scores.length
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length
      : null,
    reviewers: progress?.length ?? 0,
    sessions: versions?.length ?? 0,
    assessmentSubmissions: submissions?.length ?? 0,
    latestActivity: submissions?.[0]?.updated_at ?? null,
    unavailable: !!error,
  };
}

/** Ringkasan seluruh kegiatan yang dapat diakses akun ini (staf/koordinator). */
export async function loadStaffPhase7Home(
  supabase: Supabase,
): Promise<Phase7Home> {
  const { data: events } = await supabase
    .from("events")
    .select("id,name")
    .order("starts_on", { ascending: false });
  const summaries = await Promise.all(
    (events ?? []).map((event: { id: string; name: string }) =>
      summarizeEvent(supabase, event),
    ),
  );
  return { kind: "staff", events: summaries };
}

/** Progres kiriman asesmen milik akun sendiri (Observer/Instruktur non-koordinator). */
export async function loadPersonalProgressPhase7Home(
  supabase: Supabase,
  userId: string,
): Promise<Phase7Home> {
  const { data: submissions, error: submissionError } = await supabase
    .from("assessment_submissions")
    .select(
      "id,status,participant_id,updated_at,rubric_versions(stage,material_id,events(name),rubric_materials(name))",
    )
    .eq("observer_id", userId)
    .order("updated_at", { ascending: false });
  const items = (submissions ?? []) as unknown as SubmissionJoinRow[];
  const sessions = items.map((item) => {
    const version = firstRelated(item.rubric_versions);
    const event = firstRelated(version?.events);
    const material = firstRelated(version?.rubric_materials);
    const stage = stageLabel(version?.stage ?? "") || "Sesi asesmen";
    return {
      eventName: event?.name ?? "Kegiatan DAD",
      sessionName: material?.name ? `${stage} · ${material.name}` : stage,
      status: item.status,
      updatedAt: item.updated_at,
    };
  });
  return {
    kind: "personal",
    total: items.length,
    draft: items.filter((item) => item.status === "draft").length,
    submitted: items.filter((item) => item.status === "submitted").length,
    finalized: items.filter((item) => item.status === "finalized").length,
    assessedParticipants: new Set(items.map((item) => item.participant_id))
      .size,
    sessions,
    unavailable: !!submissionError,
  };
}

/** Rapor Published milik akun Peserta yang sedang masuk. */
export async function loadParticipantReportPhase7Home(
  supabase: Supabase,
): Promise<Phase7Home> {
  const { data: report } = await supabase.rpc(
    "get_my_published_assessment_report",
  );
  return {
    kind: "participant",
    report:
      report && typeof report === "object"
        ? (report as ParticipantReport)
        : null,
  };
}
