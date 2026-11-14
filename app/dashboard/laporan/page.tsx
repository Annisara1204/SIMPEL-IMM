import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Phase7ReportWorkspace } from "@/components/phase7-report-workspace";
import { assignParticipantAccount, publishReport } from "./actions";
import { firstRelated, relatedRows } from "@/lib/relations";
import { stageLabel } from "@/lib/stage-labels";
import type {
  AssessmentProgressRow,
  CompetencyFrameworkVersionJoined,
  EventReportRow,
  EventRow,
  ParticipantReport,
  PrivateSourceRow,
  RubricVersionJoined,
} from "@/lib/supabase-rows";
import { DataUnavailable } from "@/components/data-unavailable";

type Props = {
  searchParams: Promise<{
    eventId?: string | string[];
    participantId?: string | string[];
  }>;
};
const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default async function ReportingPage({ searchParams }: Props) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
    return (
      <main className="setup-message">
        <h1>Laporan belum dikonfigurasi</h1>
        <DataUnavailable />
      </main>
    );
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  const role = profile?.role ?? "";
  const params = await searchParams;
  const requestedEventId = one(params.eventId);
  const participantId = one(params.participantId);

  if (role === "peserta") {
    const { data, error } = await supabase.rpc(
      "get_my_published_assessment_report",
    );
    const report =
      data && typeof data === "object"
        ? (data as unknown as ParticipantReport)
        : null;
    return (
      <Phase7ReportWorkspace
        role={role}
        participantReport={report}
        reportError={
          error?.code === "P0002"
            ? "Rapor belum diterbitkan untuk akun Anda."
            : error
              ? "Rapor belum dapat dimuat. Periksa migration Fase 7."
              : null
        }
      />
    );
  }
  if (!["admin_system", "bidang_kader", "instruktur"].includes(role))
    redirect("/dashboard");
  const { data: events, error: eventError } = await supabase
    .from("events")
    .select("id,name,theme,organizer,commissariat,location,starts_on,ends_on")
    .order("starts_on", { ascending: false });
  const selectedEvent =
    (events ?? []).find((item) => item.id === requestedEventId) ??
    events?.[0] ??
    null;
  if (!selectedEvent)
    return (
      <main className="users-page">
        <h1>Laporan dan Rapor</h1>
        <DataUnavailable />
      </main>
    );
  const [{ data: moderator }, { data: rows, error: reportError }] =
    await Promise.all([
      supabase.rpc("is_assessment_moderator", {
        target_event_id: selectedEvent.id,
      }),
      supabase.rpc("get_event_report_rows", {
        target_event_id: selectedEvent.id,
      }),
    ]);
  const canManage =
    role === "admin_system" || role === "bidang_kader" || moderator === true;
  if (role === "instruktur" && !canManage) redirect("/dashboard");
  const reportRows = (rows ?? []) as EventReportRow[];
  const rubricVersionIds = reportRows
    .flatMap((row) => row.rubric_version_ids ?? [])
    .filter((id) => typeof id === "string");
  const frameworkIds = [
    ...new Set(
      reportRows
        .flatMap((row) => row.framework_version_ids ?? [])
        .filter((id: string) => typeof id === "string"),
    ),
  ];
  const canViewPrivate = role === "admin_system" || moderator === true;
  const [
    versionsRes,
    frameworkVersionsRawRes,
    candidateAccountsRes,
    privateSourcesRes,
    observerProgressRes,
  ] = await Promise.all([
    rubricVersionIds.length
      ? supabase
          .from("rubric_versions")
          .select(
            "id,version,stage,material_id,competency_framework_version_id,rubric_materials(name),rubric_aspects(rubric_indicator_aspects(rubric_indicators(id,name,competency_indicator_id)))",
          )
          .in("id", [...new Set(rubricVersionIds)])
      : { data: [] },
    frameworkIds.length
      ? supabase
          .from("competency_framework_versions")
          .select("id,version,competency_frameworks(name)")
          .in("id", frameworkIds)
      : { data: [] },
    role === "admin_system"
      ? supabase
          .from("profiles")
          .select("id,display_name")
          .eq("role", "peserta")
          .order("display_name")
      : { data: [] },
    canViewPrivate && reportRows.some((row) => row.snapshot_id)
      ? supabase
          .from("assessment_snapshot_private_sources")
          .select("snapshot_id,private_payload")
          .in(
            "snapshot_id",
            reportRows.flatMap((row) =>
              row.snapshot_id ? [row.snapshot_id] : [],
            ),
          )
      : { data: [] },
    canManage
      ? supabase.rpc("get_event_assessment_progress", {
          target_event_id: selectedEvent.id,
        })
      : { data: [] },
  ]);
  const { data: versions } = versionsRes as { data: unknown };
  const versionList = (versions ?? []) as unknown as RubricVersionJoined[];
  const indicatorNames: Record<string, string> = {};
  for (const version of versionList)
    for (const aspect of relatedRows(version.rubric_aspects))
      for (const mapping of relatedRows(aspect.rubric_indicator_aspects))
        for (const indicator of relatedRows(mapping.rubric_indicators))
          indicatorNames[indicator.competency_indicator_id ?? indicator.id] =
            indicator.name;
  const frameworkVersionsRaw = (frameworkVersionsRawRes as { data: unknown })
    .data;
  const frameworkVersions = (frameworkVersionsRaw ??
    []) as unknown as CompetencyFrameworkVersionJoined[];
  const versionInfoBySnapshot = new Map<string, string[]>();
  for (const row of reportRows) {
    if (!row.snapshot_id) continue;
    const labels: string[] = [];
    for (const framework of frameworkVersions)
      if ((row.framework_version_ids ?? []).includes(framework.id)) {
        const item = firstRelated(framework.competency_frameworks);
        labels.push(`${item?.name ?? "Framework"} v${framework.version}`);
      }
    for (const rubricId of row.rubric_version_ids ?? []) {
      const version = versionList.find((item) => item.id === rubricId);
      if (version) {
        const item = firstRelated(version.rubric_materials);
        const stage = stageLabel(version.stage);
        labels.push(
          `${stage} v${version.version}${item?.name ? ` · ${item.name}` : ""}`,
        );
      }
    }
    versionInfoBySnapshot.set(row.snapshot_id, labels);
  }
  const candidateAccounts = (candidateAccountsRes as { data: unknown }).data;
  const privateSources = (privateSourcesRes as { data: unknown }).data;
  const observerProgress = (observerProgressRes as { data: unknown }).data;
  return (
    <Phase7ReportWorkspace
      role={role}
      event={selectedEvent}
      events={(events ?? []) as EventRow[]}
      rows={reportRows}
      participantId={participantId ?? null}
      indicatorNames={indicatorNames}
      versionInfoBySnapshot={Object.fromEntries(versionInfoBySnapshot)}
      canManage={canManage}
      canViewPrivate={canViewPrivate}
      canAssignAccounts={role === "admin_system"}
      candidateAccounts={
        (candidateAccounts ?? []) as {
          id: string;
          display_name: string | null;
        }[]
      }
      privateSources={(privateSources ?? []) as PrivateSourceRow[]}
      observerProgress={(observerProgress ?? []) as AssessmentProgressRow[]}
      reportError={reportError?.message ?? null}
      publishAction={publishReport}
      assignAction={assignParticipantAccount}
    />
  );
}
