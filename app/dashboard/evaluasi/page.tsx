import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  calculateAspectAggregates,
  calculateOverallScore,
  type IndicatorAggregate,
  type PlannedIndicator,
} from "@/lib/phase6-scoring";
import { firstRelated, relatedRows } from "@/lib/relations";
import { stageLabel } from "@/lib/stage-labels";
import { isModeratorPosition } from "@/lib/phase7-home";
import type {
  AssessmentSummaryRow,
  RubricVersionJoined,
} from "@/lib/supabase-rows";
import {
  addDevelopmentRecommendation,
  approveDevelopmentRecommendation,
  finalizeCollectiveEvaluation,
  generateAutomaticRecommendations,
  saveAssessmentModeration,
  saveCollectiveEvaluation,
} from "./actions";

type Props = {
  searchParams: Promise<{
    eventId?: string | string[];
    participantId?: string | string[];
    versionId?: string | string[];
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
      <main className="setup-message">
        <h1>Evaluasi belum dikonfigurasi</h1>
        <p>
          Data belum dapat dibaca. Hubungi Admin sistem bila masalah berulang.
        </p>
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
  const { data: events } = await supabase
    .from("events")
    .select("id,name,starts_on,ends_on")
    .order("starts_on", { ascending: false });
  const selectedEvent =
    (events ?? []).find((item) => item.id === eventId) ?? null;
  const { data: assignments } =
    profile.role === "instruktur" && eventId
      ? await supabase
          .from("instructor_event_assignments")
          .select("position")
          .eq("event_id", eventId)
          .eq("instructor_id", userId)
      : { data: [] };
  const isModerator =
    profile.role === "admin_system" ||
    !!assignments?.some((assignment) =>
      isModeratorPosition(assignment.position),
    );
  if (
    profile.role === "instruktur" &&
    eventId &&
    !assignments?.some((assignment) => isModeratorPosition(assignment.position))
  )
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
      })
    : { data: [], error: null };
  const { data: policy } = await supabase
    .from("assessment_scoring_policies")
    .select("minimum_coverage,review_score_delta")
    .eq("id", true)
    .maybeSingle();
  const versionListAll = (versions ?? []) as unknown as (RubricVersionJoined & {
    assessment_type_id?: string | null;
    rubric_assessment_types?: { name: string } | { name: string }[] | null;
  })[];
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

  const rowsForParticipant = (
    (summaryRows ?? []) as AssessmentSummaryRow[]
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
  const indicatorMap = new Map<string, IndicatorAggregate>();
  const planned: PlannedIndicator[] = scopedRows.map((row) => {
    const key = `${row.indicator_id}:${row.assessment_scope_key}`;
    if (!indicatorMap.has(key))
      indicatorMap.set(key, {
        participantId: row.participant_id,
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
      participantId: row.participant_id,
      rubricVersionId: `summary:${row.assessment_scope_key}`,
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
  const indicatorAggregates = [...indicatorMap.values()];
  const aspectAggregates = calculateAspectAggregates(
    planned,
    indicatorAggregates,
    Number(policy?.minimum_coverage ?? 80),
  );
  const overall = calculateOverallScore(aspectAggregates);
  const versionList = (versions ?? []) as unknown as RubricVersionJoined[];
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
    <main className="users-page">
      <Link className="users-back" href="/dashboard">
        ← Kembali ke dashboard
      </Link>
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
        <p className="users-error">
          Kegiatan tidak ditemukan atau akun Anda tidak memiliki akses.
        </p>
      )}
      {selectedEvent && !selectedParticipant && (
        <section className="event-manage-card">
          <Link className="users-back" href="/dashboard/evaluasi">
            ← Pilih kegiatan lain
          </Link>
          <h2>{selectedEvent.name}</h2>
          <h3>Pilih peserta</h3>
          {participantRows.map((person) => (
            <Link
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
            {summaryError && (
              <p className="users-error">
                Data belum dapat dibaca. Hubungi Admin sistem bila masalah
                berulang.
              </p>
            )}
            <div className="users-notice">
              <strong>
                {overall.status === "provisional"
                  ? "Hasil sementara (Provisional)"
                  : `Skor agregat ${overall.score?.toFixed(2)} / 100`}
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
            <div className="assessment-event-list">
              {aspectAggregates.map((aspect) => (
                <article className="assignment-box" key={aspect.aspectId}>
                  <h3>
                    {aspect.aspectName} · bobot {aspect.weight}%
                  </h3>
                  <p>
                    {aspect.score === null
                      ? "Belum ada skor"
                      : `${aspect.score.toFixed(2)} / 5 · ${aspect.scoreOutOf100?.toFixed(1)} / 100`}
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
            <h3>Rekap indikator per cakupan</h3>
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
                        <small>{item.indicatorId}</small>
                      </th>
                      <td>
                        {item.scope === "cross_session"
                          ? "Lintas sesi"
                          : (scopeNames.get(item.scopeKey) ?? "Sesi")}
                      </td>
                      <td>{item.average?.toFixed(2) ?? "—"}</td>
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
            {isModerator && (
              <>
                <h3>Moderasi</h3>
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
                <h3>Evaluasi kolektif dan keputusan</h3>
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
                  <p className="users-notice">
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
                    value={selectedVersionId ?? ""}
                  />
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
                  {evaluation?.status !== "finalized" && (
                    <button type="submit">Simpan draf evaluasi</button>
                  )}
                </form>
                {evaluation?.status !== "finalized" && (
                  <>
                    <form
                      action={generateAutomaticRecommendations}
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
                        value={selectedVersionId ?? ""}
                      />
                      <p>
                        Sistem membuat draf saran dari indikator dengan
                        rata-rata skor di bawah 3/5. Draf tidak otomatis
                        disetujui dan perlu ditinjau instruktur.
                      </p>
                      <button type="submit">
                        Buat draf rekomendasi otomatis
                      </button>
                    </form>
                    <form
                      action={addDevelopmentRecommendation}
                      className="rubric-add-form"
                    >
                      <input
                        type="hidden"
                        name="evaluationId"
                        value={evaluation?.id ?? ""}
                      />
                      <label>
                        Rekomendasi pengembangan baru
                        <textarea
                          name="recommendation"
                          required
                          minLength={10}
                        />
                      </label>
                      <button type="submit" disabled={!evaluation?.id}>
                        Tambahkan rekomendasi manual
                      </button>
                    </form>
                  </>
                )}
                {(recommendations ?? []).map((recommendation) => (
                  <div className="assignment-row" key={recommendation.id}>
                    <span>
                      {recommendation.recommendation} ·{" "}
                      {recommendation.status === "approved"
                        ? "Disetujui"
                        : "Draf"}
                    </span>
                    {recommendation.status === "draft" && (
                      <form action={approveDevelopmentRecommendation}>
                        <input
                          type="hidden"
                          name="recommendationId"
                          value={recommendation.id}
                        />
                        <button type="submit">Setujui</button>
                      </form>
                    )}
                  </div>
                ))}
                {evaluation?.status !== "finalized" && (
                  <form
                    action={finalizeCollectiveEvaluation}
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
                      value={selectedVersionId ?? ""}
                    />
                    <input
                      type="hidden"
                      name="strengths"
                      value={evaluation?.strengths ?? ""}
                    />
                    <input
                      type="hidden"
                      name="developmentAreas"
                      value={evaluation?.development_areas ?? ""}
                    />
                    <input
                      type="hidden"
                      name="evidenceReferencesText"
                      value={evidenceText}
                    />
                    <input
                      type="hidden"
                      name="discussionNotes"
                      value={evaluation?.discussion_notes ?? ""}
                    />
                    <input
                      type="hidden"
                      name="collectiveSummary"
                      value={evaluation?.collective_summary ?? ""}
                    />
                    <input
                      type="hidden"
                      name="recommendationSummary"
                      value={evaluation?.recommendation_summary ?? ""}
                    />
                    <label>
                      Keputusan kelulusan
                      <select required name="decision" defaultValue="">
                        <option value="" disabled>
                          Pilih keputusan
                        </option>
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
                        required
                        minLength={10}
                        name="decisionRationale"
                      />
                    </label>
                    <button
                      className="rubric-activate"
                      type="submit"
                      disabled={
                        overall.status !== "ready_for_collective_evaluation"
                      }
                    >
                      Finalisasi dan simpan snapshot
                    </button>
                    {overall.status !== "ready_for_collective_evaluation" && (
                      <small>
                        Belum dapat difinalisasi: penuhi coverage setiap aspek
                        minimal {policy?.minimum_coverage ?? 80}%.
                      </small>
                    )}
                  </form>
                )}
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
                        ).toFixed(2)}{" "}
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
    </main>
  );
}
