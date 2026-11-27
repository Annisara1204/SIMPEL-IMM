import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  calculateAspectAggregates,
  calculateOverallScore,
} from "@/lib/phase6-scoring";
import { buildEvaluationPlan } from "@/lib/evaluation-planning";
import { asRows, firstRelated, relatedRows } from "@/lib/relations";
import { stageLabel } from "@/lib/stage-labels";
import { isEventModerator } from "@/lib/moderation-access";
import { isAssessmentSummaryRow } from "@/lib/supabase-rows";
import type {
  AssessmentSummaryRow,
  ReportSnapshotData,
  RubricVersionJoined,
} from "@/lib/supabase-rows";
import { buildAutoCompetencyMap } from "@/lib/auto-competency";
import {
  buildTrainingMatrix,
  type TrainingRecapSnapshot,
} from "@/lib/training-recap";
import {
  approveDevelopmentRecommendation,
  approveFinalizePublishReport,
  finalizeAllEvaluations,
  finalizeCollectiveEvaluation,
  generateAutomaticRecommendations,
  saveAssessmentModeration,
  saveCollectiveEvaluation,
  updateDevelopmentRecommendation,
} from "./actions";
import { DataUnavailable } from "@/components/data-unavailable";

type Props = {
  searchParams: Promise<{
    eventId?: string | string[];
    participantId?: string | string[];
    versionId?: string | string[];
    batchOk?: string | string[];
    batchSkipped?: string | string[];
    batchMissing?: string | string[];
    batchFailed?: string | string[];
    batchError?: string | string[];
    error?: string | string[];
    view?: string | string[];
  }>;
};
export default async function CollectiveEvaluationPage({
  searchParams,
}: Props) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
    return (
      <div className="state-page">
        <h1>Evaluasi belum dikonfigurasi</h1>
        <DataUnavailable />
      </div>
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
  if (
    !profile ||
    !["admin_system", "bidang_kader", "instruktur"].includes(profile.role ?? "")
  )
    redirect("/dashboard");
  const params = await searchParams;
  const eventId = Array.isArray(params.eventId)
    ? params.eventId[0]
    : params.eventId;
  const participantId = Array.isArray(params.participantId)
    ? params.participantId[0]
    : params.participantId;
  const recapView = Array.isArray(params.view) ? params.view[0] : params.view;
  const paramValue = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const batchFailure = paramValue(params.batchError) ?? null;
  const batchResult =
    params.batchOk ||
    params.batchSkipped ||
    params.batchMissing ||
    params.batchFailed
      ? {
          ok: Number(paramValue(params.batchOk)) || 0,
          skipped: Number(paramValue(params.batchSkipped)) || 0,
          missing: Number(paramValue(params.batchMissing)) || 0,
          failed: Number(paramValue(params.batchFailed)) || 0,
          error: batchFailure,
        }
      : null;
  const { data: events } = await supabase
    .from("events")
    .select("id,name,starts_on,ends_on")
    .is("archived_at", null)
    .order("starts_on", { ascending: false });
  const selectedEvent =
    (events ?? []).find((item) => item.id === eventId) ?? null;
  const isModerator =
    profile.role === "admin_system" ||
    (await isEventModerator(supabase, eventId));
  if (profile.role === "instruktur" && eventId && !isModerator)
    redirect("/dashboard");
  const { data: participants } = eventId
    ? await supabase.rpc("get_event_assessment_participants", {
        target_event_id: eventId,
      })
    : { data: [] };
  const participantRows = (participants ?? []) as {
    id: string;
    display_name: string;
    student_number: string | null;
    group_name: string | null;
    commissariat: string;
  }[];
  const selectedParticipant =
    participantRows.find((item) => item.id === participantId) ?? null;
  const versionIdParam = Array.isArray(params.versionId)
    ? params.versionId[0]
    : params.versionId;
  const { data: versions } = eventId
    ? await supabase
        .from("rubric_versions")
        .select(
          "id,version,stage,material_id,assessment_type_id,rubric_assessment_types(name),competency_framework_version_id,rubric_materials(name),rubric_aspects(id,name,weight,competency_aspect_id,rubric_indicator_aspects(weight,rubric_indicators(id,name,competency_indicator_id,competency_indicator_rubric_version_id)))",
        )
        .eq("event_id", eventId)
        .eq("status", "active")
    : { data: [] };
  const { data: summaryRows, error: summaryError } = eventId
    ? await supabase.rpc("get_event_assessment_summary", {
        target_event_id: eventId,
        target_participant_id: participantId ?? null,
      })
    : { data: [], error: null };
  const { data: policy } = await supabase
    .from("assessment_scoring_policies")
    .select("minimum_coverage,review_score_delta")
    .eq("id", true)
    .maybeSingle();
  const { data: eventSnapshots } = eventId
    ? await supabase
        .from("assessment_snapshots")
        .select(
          "id,participant_id,snapshot_data,finalized_at,revision,rubric_version_ids",
        )
        .eq("event_id", eventId)
    : { data: [] };
  const snapshotRows = (eventSnapshots ?? []).map((snapshot) => ({
    participant_id: snapshot.participant_id as string,
    display_name:
      participantRows.find((person) => person.id === snapshot.participant_id)
        ?.display_name ?? "Peserta",
    snapshot_id: snapshot.id as string,
    snapshot_data: snapshot.snapshot_data as ReportSnapshotData | null,
    finalized_at: snapshot.finalized_at as string | null,
    publication_revision: (snapshot.revision as number | null) ?? null,
  }));
  const autoCompetency = eventId
    ? buildAutoCompetencyMap({
        participants: participantRows.map((person) => ({
          id: person.id,
          display_name: person.display_name,
        })),
        summaryRows: asRows<AssessmentSummaryRow>(
          summaryRows,
          isAssessmentSummaryRow,
        ),
        snapshotRows,
        minimumCoverage: Number(policy?.minimum_coverage ?? 80),
      })
    : null;
  const versionListAll = asRows<
    RubricVersionJoined & {
      assessment_type_id?: string | null;
      rubric_assessment_types?: { name: string } | { name: string }[] | null;
    }
  >(
    versions,
    (row) =>
      typeof row.id === "string" &&
      typeof row.stage === "string" &&
      typeof row.version === "number",
  );
  const stageOrder: Record<string, number> = {
    screening: 0,
    training: 1,
    follow_up: 2,
  };
  const activeVersions = [...versionListAll].sort(
    (a, b) =>
      (stageOrder[a.stage] ?? 9) - (stageOrder[b.stage] ?? 9) ||
      a.version - b.version,
  );
  const selectedVersionId =
    activeVersions.find((item) => item.id === versionIdParam)?.id ??
    activeVersions[0]?.id ??
    null;
  const trainingVersions = activeVersions.filter(
    (version) => version.stage === "training",
  );
  const trainingMatrix =
    recapView === "training" &&
    selectedEvent &&
    !selectedParticipant &&
    trainingVersions.length
      ? buildTrainingMatrix({
          participants: participantRows.map((person) => ({
            id: person.id,
            display_name: person.display_name,
          })),
          versions: trainingVersions.map((version) => ({
            id: version.id,
            name: firstRelated(version.rubric_materials)?.name ?? "Materi",
            version: Number(version.version) || 0,
          })),
          summaryRows: asRows<AssessmentSummaryRow>(
            summaryRows,
            isAssessmentSummaryRow,
          ),
          snapshots: (eventSnapshots ?? []) as TrainingRecapSnapshot[],
          minimumCoverage: Number(policy?.minimum_coverage ?? 80),
        })
      : null;
  const [{ data: evaluation }, { data: moderations }, { data: snapshots }] =
    selectedParticipant && eventId && selectedVersionId
      ? await Promise.all([
          supabase
            .from("collective_evaluations")
            .select(
              "id,status,strengths,development_areas,evidence_references,discussion_notes,collective_summary,recommendation_summary,graduation_decision,decision_rationale,approved_at,rubric_version_id",
            )
            .eq("event_id", eventId)
            .eq("participant_id", participantId)
            .eq("rubric_version_id", selectedVersionId)
            .maybeSingle(),
          supabase
            .from("assessment_moderations")
            .select(
              "id,rubric_version_id,indicator_id,status,score_range,reason,outcome,discussion_scheduled_for,decision,consensus_score,additional_notes,revision",
            )
            .eq("event_id", eventId)
            .eq("participant_id", participantId),
          supabase
            .from("assessment_snapshots")
            .select("id,revision,finalized_at,snapshot_data,rubric_version_ids")
            .eq("event_id", eventId)
            .eq("participant_id", participantId)
            .order("finalized_at", { ascending: false }),
        ])
      : [{ data: null }, { data: [] }, { data: [] }];
  const { data: recommendations } = evaluation
    ? await supabase
        .from("development_recommendations")
        .select("id,recommendation,status,approved_at")
        .eq("evaluation_id", evaluation.id)
        .eq("is_active", true)
    : { data: [] };
  let sourceRatings: {
    rubric_version_id: string;
    participant_id: string;
    indicator_id: string;
    observer_id: string;
    observer_name: string;
    score: number | null;
    response_status: string;
    evidence: string;
    submission_id: string;
  }[] = [];
  if (selectedParticipant && isModerator) {
    const versionIds = (versions ?? []).map((item) => item.id);
    const { data: submissions } = versionIds.length
      ? await supabase
          .from("assessment_submissions")
          .select("id,status")
          .eq("participant_id", participantId)
          .in("rubric_version_id", versionIds)
      : { data: [] };
    const submitted = new Set(
      (submissions ?? [])
        .filter(
          (item) => item.status === "submitted" || item.status === "finalized",
        )
        .map((item) => item.id),
    );
    const { data: ratings } = versionIds.length
      ? await supabase
          .from("assessment_ratings")
          .select(
            "rubric_version_id,participant_id,indicator_id,observer_id,observer_name,score,response_status,evidence,submission_id",
          )
          .eq("participant_id", participantId)
          .in("rubric_version_id", versionIds)
      : { data: [] };
    sourceRatings = ((ratings ?? []) as typeof sourceRatings).filter((item) =>
      submitted.has(item.submission_id),
    );
  }

  const rowsForParticipant = asRows<AssessmentSummaryRow>(
    summaryRows,
    isAssessmentSummaryRow,
  ).filter((row) => row.participant_id === participantId);
  const scopedRows = selectedVersionId
    ? rowsForParticipant.filter(
        (row) =>
          row.assessment_scope_key === `session:${selectedVersionId}` ||
          (row.assessment_scope_key === "cross_session" &&
            Array.isArray(row.source_rubric_version_ids) &&
            row.source_rubric_version_ids.includes(selectedVersionId)),
      )
    : [];
  const { planned, aggregates: indicatorAggregates } = buildEvaluationPlan(
    scopedRows,
    { keyPrefix: "summary" },
  );
  const aspectAggregates = calculateAspectAggregates(
    planned,
    indicatorAggregates,
    Number(policy?.minimum_coverage ?? 80),
  );
  const overall = calculateOverallScore(aspectAggregates);
  const versionList = asRows<RubricVersionJoined>(
    versions,
    (row) => typeof row.id === "string" && "stage" in row,
  );
  const indicatorNames = new Map<string, string>();
  for (const version of versionList)
    for (const aspect of relatedRows(version.rubric_aspects))
      for (const mapping of relatedRows(aspect.rubric_indicator_aspects)) {
        const indicator = firstRelated(mapping.rubric_indicators);
        if (indicator)
          indicatorNames.set(
            indicator.competency_indicator_id ?? indicator.id,
            indicator.name,
          );
      }
  const scopeNames = new Map(
    versionList.map((version) => [
      `session:${version.id}`,
      `${stageLabel(version.stage)} · ${firstRelated(version.rubric_materials)?.name ?? "Sesi"}`,
    ]),
  );
  const evidenceText = Array.isArray(evaluation?.evidence_references)
    ? evaluation.evidence_references.map(String).join("\n")
    : "";
  const displayParticipant = selectedParticipant;

  return (
    <div className="users-page">
      {batchResult && (
        <div className="notice" role={batchResult.failed ? "alert" : "status"}>
          Finalisasi semua: {batchResult.ok} berhasil, {batchResult.skipped}{" "}
          dilewati, {batchResult.failed} gagal, {batchResult.missing} versi
          rubrik belum punya evaluasi.
          {batchResult.error && (
            <span className="notice notice--danger">
              {" "}
              Kesalahan: {batchResult.error}.
            </span>
          )}
        </div>
      )}
      <div className="users-heading">
        <div>
          <p className="login-eyebrow">EVALUASI KOLEKTIF</p>
          <h1>Rekap dan Evaluasi DAD</h1>
          <p>
            Agregasi skor Observer terpisah dari nilai sumber; keputusan
            kelulusan tetap ditetapkan melalui pembahasan kolektif.
          </p>
        </div>
      </div>
      {!eventId && (
        <section className="event-manage-card">
          <h2>Pilih kegiatan</h2>
          {(events ?? []).map((event) => (
            <Link
              prefetch={false}
              className="assessment-event-option"
              key={event.id}
              href={`/dashboard/evaluasi?eventId=${event.id}`}
            >
              <strong>{event.name}</strong>
              <span>{event.starts_on}</span>
              <span className="assessment-event-arrow">→</span>
            </Link>
          ))}
        </section>
      )}
      {eventId && !selectedEvent && (
        <p className="notice notice--danger">
          Kegiatan tidak ditemukan atau akun Anda tidak memiliki akses.
        </p>
      )}
      {selectedEvent && !selectedParticipant && (
        <section className="event-manage-card">
          <Link
            prefetch={false}
            className="users-back"
            href="/dashboard/evaluasi"
          >
            ← Pilih kegiatan lain
          </Link>
          <h2>{selectedEvent.name}</h2>
          <nav
            className="assessment-penilaian-tabs"
            aria-label="Tampilan rekap"
          >
            <Link
              prefetch={false}
              className={
                recapView === "training"
                  ? "assessment-penilaian-tab"
                  : "assessment-penilaian-tab active"
              }
              aria-current={recapView === "training" ? undefined : "true"}
              href={`/dashboard/evaluasi?eventId=${eventId}`}
            >
              Peta kompetensi
            </Link>
            <Link
              prefetch={false}
              className={
                recapView === "training"
                  ? "assessment-penilaian-tab active"
                  : "assessment-penilaian-tab"
              }
              aria-current={recapView === "training" ? "true" : undefined}
              href={`/dashboard/evaluasi?eventId=${eventId}&view=training`}
            >
              Rekap penilaian pelatihan
            </Link>
          </nav>
          {recapView === "training" ? (
            <section className="rubric-edit">
              <h3>Rekap penilaian pelatihan</h3>
              <p className="data-caption">
                Satu baris per peserta, satu kolom per materi Pelatihan. Angka
                0–100 memakai nilai rapor Final bila tersedia; selebihnya
                penilaian sementara, bukan hasil resmi. Tanda &quot;—&quot;
                berarti belum ada nilai.
              </p>
              {trainingMatrix && trainingMatrix.columns.length ? (
                <div className="competency-matrix-scroll">
                  <table className="competency-matrix">
                    <thead>
                      <tr>
                        <th scope="col">Peserta</th>
                        {trainingMatrix.columns.map((column) => (
                          <th key={column.name} scope="col">
                            {column.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {trainingMatrix.rows.map((row) => (
                        <tr key={row.participantId}>
                          <th scope="row">{row.displayName}</th>
                          {trainingMatrix.columns.map((column) => {
                            const score = row.scores.get(column.name);
                            return (
                              <td key={column.name}>
                                {score === undefined || score === null
                                  ? "—"
                                  : score.toFixed(1)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="notice notice--empty">
                  Belum ada rubrik Pelatihan aktif pada kegiatan ini. Minta
                  Super Admin menambah materi dan mengaktifkan rubriknya.
                </p>
              )}
            </section>
          ) : (
            autoCompetency &&
            autoCompetency.columns.length > 0 && (
              <section className="rubric-edit">
                <h3>Peta kompetensi otomatis</h3>
                <p className="data-caption">
                  Semua peserta tampil. Status Final memakai nilai dari rapor;
                  status Sementara memakai penilaian terkini. Bobot aspek dapat
                  berasal dari rubrik berbeda sehingga totalnya bisa lebih dari
                  100%; nilai sementara dinormalisasi dari aspek yang tersedia.
                  Materi terarsipkan tidak ikut dalam nilai sementara.
                </p>
                <div className="competency-matrix-scroll">
                  <table className="competency-matrix">
                    <thead>
                      <tr>
                        <th scope="col">Peserta</th>
                        {autoCompetency.columns.map((column) => (
                          <th key={column.name} scope="col">
                            {column.name}
                            <small>Bobot {column.weight}%</small>
                          </th>
                        ))}
                        <th scope="col">Nilai akhir</th>
                        <th scope="col">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {autoCompetency.rows.map((row) => (
                        <tr key={row.participantId}>
                          <th scope="row">{row.displayName}</th>
                          {autoCompetency.columns.map((column) => {
                            const score = row.aspectScores.get(column.name);
                            return (
                              <td key={column.name}>
                                {score === undefined ? "—" : score.toFixed(1)}
                              </td>
                            );
                          })}
                          <td>
                            {row.finalScore === null
                              ? "—"
                              : row.finalScore.toFixed(1)}
                          </td>
                          <td>
                            {row.status === "final" ? "Final" : "Sementara"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )
          )}
          <h3>Pilih peserta</h3>
          {participantRows.map((person) => (
            <Link
              prefetch={false}
              className="assessment-event-option"
              key={person.id}
              href={`/dashboard/evaluasi?eventId=${eventId}&participantId=${person.id}`}
            >
              <strong>{person.display_name}</strong>
              <span>
                {person.student_number ?? "NIM belum diisi"} ·{" "}
                {person.group_name ?? "Kelompok belum diisi"} ·{" "}
                {person.commissariat}
              </span>
              <span className="assessment-event-arrow">→</span>
            </Link>
          ))}
        </section>
      )}
      {displayParticipant && selectedEvent && (
        <>
          <section className="event-manage-card">
            <Link
              prefetch={false}
              className="users-back"
              href={`/dashboard/evaluasi?eventId=${eventId}`}
            >
              ← Daftar peserta
            </Link>
            <h2>{displayParticipant.display_name}</h2>
            <p>
              {displayParticipant.student_number ?? "NIM belum diisi"} ·{" "}
              {displayParticipant.group_name ?? "Kelompok belum diisi"} ·{" "}
              {displayParticipant.commissariat} · {selectedEvent.name}
            </p>
            <nav
              className="assessment-penilaian-tabs"
              aria-label="Jenis penilaian"
            >
              {activeVersions.map((version) => {
                const typeName = firstRelated(
                  version.rubric_assessment_types,
                )?.name;
                const materialName = firstRelated(
                  version.rubric_materials,
                )?.name;
                const label = `${stageLabel(version.stage)}${
                  typeName ? ` · ${typeName}` : ""
                }${materialName ? ` · ${materialName}` : ""}`;
                const active = version.id === selectedVersionId;
                return (
                  <Link
                    prefetch={false}
                    key={version.id}
                    className={
                      active
                        ? "assessment-penilaian-tab active"
                        : "assessment-penilaian-tab"
                    }
                    aria-current={active ? "true" : undefined}
                    href={`/dashboard/evaluasi?eventId=${eventId}&participantId=${participantId}&versionId=${version.id}`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
            {summaryError && <DataUnavailable />}
            <div className="notice">
              <strong>
                {overall.status === "provisional"
                  ? "Hasil sementara (Provisional)"
                  : `Skor agregat ${overall.score?.toFixed(1)} / 100`}
              </strong>
              <p>
                Rata-rata berasal dari kiriman Submitted/Finalized. N/O bukan
                nol. Selisih review mulai {policy?.review_score_delta ?? 2}{" "}
                poin; coverage minimum {policy?.minimum_coverage ?? 80}%.
              </p>
              {overall.reasons.map((reason) => (
                <small key={reason}>
                  {reason}
                  <br />
                </small>
              ))}
            </div>
            <h3>1 · Rekap penilaian</h3>
            <div className="assessment-event-list">
              {aspectAggregates.map((aspect) => (
                <article className="assignment-box" key={aspect.aspectId}>
                  <h3>
                    {aspect.aspectName} · bobot {aspect.weight}%
                  </h3>
                  <p>
                    {aspect.score === null
                      ? "Belum ada skor"
                      : `${aspect.score.toFixed(1)} / 5 · ${aspect.scoreOutOf100?.toFixed(1)} / 100`}
                  </p>
                  <p>
                    Coverage {aspect.coverage.toFixed(1)}% · indikator dinilai{" "}
                    {aspect.assessedIndicators}/{aspect.plannedIndicators} · N/O{" "}
                    {aspect.notObservedIndicators} · pending{" "}
                    {aspect.pendingIndicators} ·{" "}
                    {aspect.valid ? "Valid" : "Provisional"}
                  </p>
                </article>
              ))}
            </div>
            <details className="rubric-edit">
              <summary>
                Rincian indikator per cakupan ({indicatorAggregates.length}{" "}
                baris): rata-rata, rentang, N/O, dan status moderasi
              </summary>
              <div className="competency-matrix-scroll">
                <table className="competency-matrix">
                  <thead>
                    <tr>
                      <th scope="col">Indikator</th>
                      <th scope="col">Cakupan</th>
                      <th scope="col">Rata-rata</th>
                      <th scope="col">Penilai valid</th>
                      <th scope="col">Min–Maks</th>
                      <th scope="col">Rentang</th>
                      <th scope="col">N/O</th>
                      <th scope="col">Pending</th>
                      <th scope="col">Moderasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {indicatorAggregates.map((item) => (
                      <tr key={`${item.indicatorId}:${item.scopeKey}`}>
                        <th scope="row">
                          {indicatorNames.get(item.indicatorId) ??
                            item.indicatorId}
                          {indicatorNames.has(item.indicatorId) && (
                            <small title={item.indicatorId}>
                              ID: {item.indicatorId.slice(0, 8)}…
                            </small>
                          )}
                        </th>
                        <td>
                          {item.scope === "cross_session"
                            ? "Lintas sesi"
                            : (scopeNames.get(item.scopeKey) ?? "Sesi")}
                        </td>
                        <td>{item.average?.toFixed(1) ?? "—"}</td>
                        <td>{item.validRatings}</td>
                        <td>
                          {item.minimum ?? "—"}–{item.maximum ?? "—"}
                        </td>
                        <td>{item.range ?? "—"}</td>
                        <td>{item.notObserved}</td>
                        <td>{item.pending}</td>
                        <td>
                          {item.reviewStatus === "needs_review"
                            ? "Perlu ditinjau"
                            : "Normal"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
            {isModerator && (
              <>
                <h4>Moderasi</h4>
                {indicatorAggregates
                  .filter((item) => item.reviewStatus === "needs_review")
                  .map((item) => {
                    const matchingRows = versionList.flatMap((version) =>
                      relatedRows(version.rubric_aspects).flatMap((aspect) =>
                        relatedRows(aspect.rubric_indicator_aspects).flatMap(
                          (mapping) => {
                            const indicator = firstRelated(
                              mapping.rubric_indicators,
                            );
                            return indicator &&
                              (indicator.competency_indicator_id ??
                                indicator.id) === item.indicatorId
                              ? [{ version, indicator, aspect }]
                              : [];
                          },
                        ),
                      ),
                    );
                    const selectedVersionId = item.scopeKey.startsWith(
                      "session:",
                    )
                      ? item.scopeKey.slice("session:".length)
                      : null;
                    const chosen =
                      matchingRows.find(
                        (row) => row.version.id === selectedVersionId,
                      ) ?? matchingRows[0];
                    if (!chosen)
                      return (
                        <p
                          className="assessment-assignment-empty"
                          key={`${item.indicatorId}:${item.scope}`}
                        >
                          Perlu ditinjau: {item.indicatorId}, rentang{" "}
                          {item.range}. Referensi rubrik tidak ditemukan.
                        </p>
                      );
                    const existing = moderations?.find(
                      (moderation) =>
                        moderation.rubric_version_id === chosen.version.id &&
                        moderation.indicator_id === chosen.indicator.id,
                    );
                    const relevantVersions = item.sourceRubricVersionIds ?? [
                      chosen.version.id,
                    ];
                    const localRows = matchingRows.filter((row) =>
                      relevantVersions.includes(row.version.id),
                    );
                    const scores = sourceRatings.filter((rating) =>
                      localRows.some(
                        (row) =>
                          row.version.id === rating.rubric_version_id &&
                          row.indicator.id === rating.indicator_id,
                      ),
                    );
                    return (
                      <article
                        className="assignment-box"
                        key={`${item.indicatorId}:${item.scopeKey}`}
                      >
                        <h4>
                          {chosen.indicator.name} · rentang {item.range} ·{" "}
                          {item.scope === "cross_session"
                            ? "Lintas sesi"
                            : (scopeNames.get(item.scopeKey) ?? "Sesi")}
                        </h4>
                        {scores.map((rating) => (
                          <p
                            key={`${rating.rubric_version_id}:${rating.observer_id}`}
                          >
                            <strong>{rating.observer_name}</strong>:{" "}
                            {rating.response_status === "not_observed"
                              ? "N/O"
                              : rating.score}{" "}
                            · bukti: {rating.evidence || "(belum ada)"}
                          </p>
                        ))}
                        <form
                          action={saveAssessmentModeration}
                          className="rubric-add-form"
                        >
                          <input type="hidden" name="eventId" value={eventId} />
                          <input
                            type="hidden"
                            name="participantId"
                            value={participantId}
                          />
                          <input
                            type="hidden"
                            name="rubricVersionId"
                            value={chosen.version.id}
                          />
                          <input
                            type="hidden"
                            name="indicatorId"
                            value={chosen.indicator.id}
                          />
                          <input
                            type="hidden"
                            name="competencyIndicatorId"
                            value={item.indicatorId}
                          />
                          <input
                            type="hidden"
                            name="sourceRubricVersionIds"
                            value={JSON.stringify(relevantVersions)}
                          />
                          <label>
                            Status moderasi
                            <select
                              name="status"
                              defaultValue={existing?.status ?? "needs_review"}
                            >
                              <option value="needs_review">
                                Perlu ditinjau
                              </option>
                              <option value="clarification_requested">
                                Minta klarifikasi
                              </option>
                              <option value="discussion_scheduled">
                                Jadwalkan pembahasan
                              </option>
                              <option value="reviewed">Sudah ditinjau</option>
                              <option value="resolved">Selesai</option>
                            </select>
                          </label>
                          <label>
                            Jadwal pembahasan (jika dijadwalkan)
                            <input
                              type="datetime-local"
                              name="discussionScheduledFor"
                              defaultValue={
                                existing?.discussion_scheduled_for
                                  ? new Date(existing.discussion_scheduled_for)
                                      .toISOString()
                                      .slice(0, 16)
                                  : ""
                              }
                            />
                          </label>
                          <label>
                            Alasan
                            <textarea
                              name="reason"
                              defaultValue={existing?.reason ?? ""}
                              required
                              minLength={5}
                            />
                          </label>
                          <label>
                            Hasil pembahasan
                            <textarea
                              name="outcome"
                              defaultValue={existing?.outcome ?? ""}
                            />
                          </label>
                          <label>
                            Keputusan
                            <select
                              name="decision"
                              defaultValue={existing?.decision ?? ""}
                            >
                              <option value="">Belum ditetapkan</option>
                              <option value="retain_average">
                                Pertahankan rata-rata
                              </option>
                              <option value="consensus">
                                Gunakan nilai konsensus
                              </option>
                            </select>
                          </label>
                          <label>
                            Nilai konsensus (jika dipilih)
                            <input
                              name="consensusScore"
                              type="number"
                              min="1"
                              max="5"
                              step="0.01"
                              defaultValue={existing?.consensus_score ?? ""}
                            />
                          </label>
                          <label>
                            Catatan tambahan
                            <textarea
                              name="additionalNotes"
                              defaultValue={existing?.additional_notes ?? ""}
                            />
                          </label>
                          <button type="submit">Simpan catatan moderasi</button>
                        </form>
                      </article>
                    );
                  })}
                {!indicatorAggregates.some(
                  (item) => item.reviewStatus === "needs_review",
                ) && (
                  <p className="assessment-assignment-empty">
                    Tidak ada indikator dengan selisih skor yang melewati ambang
                    moderasi.
                  </p>
                )}
              </>
            )}
            {isModerator && (
              <>
                <h3>2 · Catatan, rekomendasi, dan keputusan</h3>
                <p className="data-caption">
                  Jenis penilaian yang difinalisasi pada bagian ini:{" "}
                  {(() => {
                    const selected = activeVersions.find(
                      (item) => item.id === selectedVersionId,
                    );
                    const typeName = firstRelated(
                      selected?.rubric_assessment_types,
                    )?.name;
                    const material = firstRelated(
                      selected?.rubric_materials,
                    )?.name;
                    return selected
                      ? `${stageLabel(selected.stage)}${
                          typeName ? ` · ${typeName}` : ""
                        }${material ? ` · ${material}` : ""}`
                      : "—";
                  })()}
                  . Penilaian lain difinalisasi terpisah.
                </p>
                {evaluation?.status === "finalized" && (
                  <p className="notice">
                    <strong>
                      Keputusan final: {evaluation.graduation_decision}
                    </strong>{" "}
                    ·{" "}
                    {evaluation.approved_at
                      ? new Date(evaluation.approved_at).toLocaleString("id-ID")
                      : ""}
                    <br />
                    {evaluation.decision_rationale}
                  </p>
                )}
                <form
                  action={
                    evaluation?.status === "finalized"
                      ? undefined
                      : saveCollectiveEvaluation
                  }
                  className="evaluation-notes-form"
                >
                  <input type="hidden" name="eventId" value={eventId} />
                  <input
                    type="hidden"
                    name="participantId"
                    value={participantId}
                  />
                  <input
                    type="hidden"
                    name="rubricVersionId"
                    value={selectedVersionId ?? ""}
                  />
                  <div className="evaluation-notes-grid">
                    <label>
                      Kekuatan
                      <textarea
                        name="strengths"
                        defaultValue={evaluation?.strengths ?? ""}
                        readOnly={evaluation?.status === "finalized"}
                      />
                    </label>
                    <label>
                      Area pengembangan
                      <textarea
                        name="developmentAreas"
                        defaultValue={evaluation?.development_areas ?? ""}
                        readOnly={evaluation?.status === "finalized"}
                      />
                    </label>
                    <label>
                      Bukti pendukung (satu referensi per baris)
                      <textarea
                        name="evidenceReferencesText"
                        defaultValue={evidenceText}
                        readOnly={evaluation?.status === "finalized"}
                      />
                    </label>
                    <label>
                      Catatan pembahasan instruktur
                      <textarea
                        name="discussionNotes"
                        defaultValue={evaluation?.discussion_notes ?? ""}
                        readOnly={evaluation?.status === "finalized"}
                      />
                    </label>
                    <label>
                      Kesimpulan kolektif
                      <textarea
                        name="collectiveSummary"
                        defaultValue={evaluation?.collective_summary ?? ""}
                        readOnly={evaluation?.status === "finalized"}
                      />
                    </label>
                    <label>
                      Rekomendasi ringkas
                      <textarea
                        name="recommendationSummary"
                        defaultValue={evaluation?.recommendation_summary ?? ""}
                        readOnly={evaluation?.status === "finalized"}
                      />
                    </label>
                  </div>
                  <div className="evaluation-decision-grid">
                    <label>
                      Keputusan kelulusan
                      <select
                        key={evaluation?.graduation_decision ?? "kosong"}
                        name="decision"
                        defaultValue={evaluation?.graduation_decision ?? ""}
                        disabled={evaluation?.status === "finalized"}
                        required
                      >
                        <option value="">Belum diputuskan</option>
                        <option value="pass">Lulus</option>
                        <option value="not_pass">Tidak Lulus</option>
                        <option value="further_discussion">
                          Perlu Pembahasan Lanjutan
                        </option>
                      </select>
                    </label>
                    <label>
                      Alasan keputusan
                      <textarea
                        name="decisionRationale"
                        minLength={10}
                        required
                        defaultValue={evaluation?.decision_rationale ?? ""}
                        readOnly={evaluation?.status === "finalized"}
                      />
                    </label>
                  </div>
                  {evaluation?.status !== "finalized" && (
                    <div className="evaluation-actions">
                      <div className="evaluation-actions-row">
                        <button
                          type="submit"
                          formNoValidate
                          className="btn btn--primary"
                        >
                          Simpan draf evaluasi
                        </button>
                        <button
                          className="btn btn--primary"
                          type="submit"
                          formAction={finalizeCollectiveEvaluation}
                          disabled={
                            overall.status !== "ready_for_collective_evaluation"
                          }
                        >
                          Finalisasi dan simpan snapshot
                        </button>
                        <button
                          className="btn btn--primary"
                          type="submit"
                          formAction={approveFinalizePublishReport}
                          disabled={
                            overall.status !== "ready_for_collective_evaluation"
                          }
                        >
                          Setujui, finalisasi, terbitkan, dan unduh rapor
                        </button>
                      </div>
                      <p className="evaluation-hint">
                        Pilih keputusan kelulusan dan isi alasan minimal 10
                        karakter sebelum finalisasi. Simpan draf tetap bisa
                        dilakukan tanpa keduanya. Tombol finalisasi juga
                        dinonaktifkan bila coverage belum memenuhi minimal{" "}
                        {policy?.minimum_coverage ?? 80}% pada setiap aspek.
                      </p>
                      {overall.status !== "ready_for_collective_evaluation" && (
                        <small className="evaluation-hint">
                          Belum dapat difinalisasi: penuhi coverage setiap aspek
                          minimal {policy?.minimum_coverage ?? 80}%.
                        </small>
                      )}
                    </div>
                  )}
                </form>
                {evaluation?.status !== "finalized" && (
                  <>
                    <form
                      action={generateAutomaticRecommendations}
                      className="evaluation-action-form"
                    >
                      <input type="hidden" name="eventId" value={eventId} />
                      <input
                        type="hidden"
                        name="participantId"
                        value={participantId}
                      />
                      <input
                        type="hidden"
                        name="rubricVersionId"
                        value={selectedVersionId ?? ""}
                      />
                      <p className="data-caption">
                        Sistem membuat satu draf rekomendasi dari indikator
                        dengan rata-rata di bawah 3/5. Angka skor tidak ditulis.
                        Koordinator dapat menyunting draf sebelum menyetujuinya.
                      </p>
                      <button type="submit" className="btn btn--outline">
                        Buat atau perbarui draf rekomendasi
                      </button>
                    </form>
                  </>
                )}
                {(recommendations ?? []).map((recommendation) => (
                  <div
                    className="evaluation-recommendation"
                    key={recommendation.id}
                  >
                    {recommendation.status === "draft" &&
                    evaluation?.status !== "finalized" ? (
                      <form
                        action={updateDevelopmentRecommendation}
                        className="evaluation-recommendation-form"
                      >
                        <input
                          type="hidden"
                          name="recommendationId"
                          value={recommendation.id}
                        />
                        <label>
                          Sunting draf rekomendasi
                          <textarea
                            name="recommendation"
                            required
                            minLength={10}
                            maxLength={2000}
                            rows={6}
                            defaultValue={recommendation.recommendation}
                          />
                        </label>
                        <button type="submit" className="btn btn--outline">
                          Simpan suntingan
                        </button>
                      </form>
                    ) : (
                      <p className="data-caption">
                        {recommendation.recommendation} · Disetujui
                      </p>
                    )}
                    {recommendation.status === "draft" && (
                      <form
                        action={approveDevelopmentRecommendation}
                        className="evaluation-recommendation-form"
                      >
                        <input
                          type="hidden"
                          name="recommendationId"
                          value={recommendation.id}
                        />
                        <button type="submit" className="btn btn--primary">
                          Setujui rekomendasi
                        </button>
                      </form>
                    )}
                  </div>
                ))}
                <h3>3 · Tindak lanjut</h3>
                <form
                  action={finalizeAllEvaluations}
                  className="evaluation-action-form"
                >
                  <input type="hidden" name="eventId" value={eventId} />
                  <p className="data-caption">
                    Finalisasi semua evaluasi draf pada kegiatan ini yang sudah
                    memiliki keputusan dan alasan. Setiap jenis tetap
                    menghasilkan snapshot tersendiri; evaluasi yang belum siap
                    dilewati.
                  </p>
                  <button type="submit" className="btn btn--outline">
                    Finalisasi semua materi yang siap
                  </button>
                </form>
              </>
            )}
            {!isModerator && (
              <p className="privacy-note">
                Anda dapat melihat ringkasan agregat. Bukti pribadi, moderasi,
                dan catatan pembahasan hanya tersedia bagi Admin Sistem dan
                koordinator instruktur yang ditugaskan.
              </p>
            )}
            {(snapshots ?? []).length > 0 && (
              <details className="rubric-edit">
                <summary>Riwayat snapshot final</summary>
                {snapshots?.map((snapshot) => {
                  const collective = snapshot.snapshot_data?.collective;
                  const snapshotVersionIds = (snapshot.rubric_version_ids ??
                    []) as string[];
                  const snapshotVersion = activeVersions.find((item) =>
                    snapshotVersionIds.includes(item.id),
                  );
                  const snapshotTypeName = firstRelated(
                    snapshotVersion?.rubric_assessment_types,
                  )?.name;
                  const snapshotLabel = snapshotVersion
                    ? `${stageLabel(snapshotVersion.stage)}${
                        snapshotTypeName ? ` · ${snapshotTypeName}` : ""
                      }`
                    : "Penilaian";
                  return (
                    <article className="assignment-box" key={snapshot.id}>
                      <strong>{snapshotLabel}</strong>
                      <p>
                        {new Date(snapshot.finalized_at).toLocaleString(
                          "id-ID",
                        )}{" "}
                        · Skor{" "}
                        {Number(
                          snapshot.snapshot_data?.overall?.score ?? 0,
                        ).toFixed(1)}{" "}
                        / 100 · Keputusan: {collective?.decision ?? "—"}
                      </p>
                      <p>{collective?.summary ?? ""}</p>
                      <p>Alasan: {collective?.decisionRationale ?? "—"}</p>
                    </article>
                  );
                })}
              </details>
            )}
          </section>
        </>
      )}
    </div>
  );
}
