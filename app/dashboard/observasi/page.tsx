import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { firstRelated } from "@/lib/relations";
import { AssessmentRatingCell } from "./assessment-rating-cell";
import { ObserverNotes, type NoteRecord } from "./observer-notes";
import { AssessmentRealtime } from "./assessment-realtime";
import { SubmissionControls } from "./submission-controls";
import { stageOrder } from "@/lib/stage-labels";
import {
  calculateWeightedScore,
  categorizeScore,
  type ScoringAspect,
} from "@/lib/scoring";

type ObservationsPageProps = {
  searchParams: Promise<{
    eventId?: string | string[];
    stage?: string | string[];
    materialId?: string | string[];
    typeId?: string | string[];
  }>;
};

export default async function ObservationsPage({
  searchParams,
}: ObservationsPageProps) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
    return (
      <main className="setup-message">
        <h1>Supabase belum dikonfigurasi</h1>
        <p>Aplikasi belum siap digunakan. Hubungi Admin sistem.</p>
        <Link href="/login">Kembali ke login</Link>
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
    !["admin_system", "observer", "instruktur"].includes(profile.role ?? "")
  )
    redirect("/dashboard");

  const params = await searchParams;
  const requestedEventId = Array.isArray(params.eventId)
    ? params.eventId[0]
    : params.eventId;
  const selectedStage = Array.isArray(params.stage)
    ? params.stage[0]
    : params.stage;
  const selectedMaterialId = Array.isArray(params.materialId)
    ? params.materialId[0]
    : params.materialId;
  const selectedTypeId = Array.isArray(params.typeId)
    ? params.typeId[0]
    : params.typeId;
  const { data: myAssignments } =
    profile.role === "observer"
      ? await supabase
          .from("observer_assignments")
          .select("event_id")
          .eq("observer_id", userId)
      : profile.role === "instruktur"
        ? await supabase
            .from("instructor_event_assignments")
            .select("event_id")
            .eq("instructor_id", userId)
        : { data: null };
  const assignedEventIds =
    myAssignments?.map((assignment) => assignment.event_id) ?? [];
  const eventQuery = supabase
    .from("events")
    .select("id, name, starts_on, participants(id, display_name)")
    .order("starts_on", { ascending: false });
  const [
    { data: events, error: eventsError },
    { data: versions, error: versionsError },
    { data: assignments },
    { data: types, error: typesError },
    { data: materials, error: materialsError },
  ] = await Promise.all([
    profile.role === "observer"
      ? assignedEventIds.length
        ? eventQuery.in("id", assignedEventIds)
        : Promise.resolve({ data: [], error: null })
      : eventQuery,
    profile.role === "admin_system"
      ? supabase
          .from("rubric_versions")
          .select(
            "id, event_id, stage, material_id, assessment_type_id, version, rubric_aspects(id, name, weight, position, rubric_indicator_aspects(id, weight, rubric_indicators(id, name, target, position, score_descriptors, competency_indicator_id, competency_indicator_rubric_version_id)))",
          )
          .eq("status", "active")
          .order("version", { ascending: false })
      : assignedEventIds.length
        ? supabase
            .from("rubric_versions")
            .select(
              "id, event_id, stage, material_id, assessment_type_id, version, rubric_aspects(id, name, weight, position, rubric_indicator_aspects(id, weight, rubric_indicators(id, name, target, position, score_descriptors, competency_indicator_id, competency_indicator_rubric_version_id)))",
            )
            .eq("status", "active")
            .in("event_id", assignedEventIds)
            .order("version", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    supabase.from("observer_assignments").select("id, event_id, observer_id"),
    supabase
      .from("rubric_assessment_types")
      .select("id, event_id, stage, name, position")
      .order("position"),
    supabase
      .from("rubric_materials")
      .select("id, event_id, name, position, competency_material_id")
      .order("position"),
  ]);
  const selectedEvent =
    events?.find((event) => event.id === requestedEventId) ?? null;
  const selectedPhaseIsValid = stageOrder.some(
    (stage) => stage.id === selectedStage,
  );
  const eventMaterials = (materials ?? []).filter(
    (material) => material.event_id === selectedEvent?.id,
  );
  const selectedMaterial =
    eventMaterials.find((material) => material.id === selectedMaterialId) ??
    null;
  const eventTypes = (types ?? []).filter(
    (type) =>
      type.event_id === selectedEvent?.id && type.stage === selectedStage,
  );
  const selectedType =
    eventTypes.find((type) => type.id === selectedTypeId) ?? null;
  const activeVersion =
    selectedEvent &&
    selectedPhaseIsValid &&
    selectedType &&
    (selectedStage !== "training" || selectedMaterial)
      ? (versions?.find(
          (version) =>
            version.event_id === selectedEvent.id &&
            version.stage === selectedStage &&
            version.assessment_type_id === selectedType.id &&
            (selectedStage === "training"
              ? version.material_id === selectedMaterial?.id
              : version.material_id === null),
        ) ?? null)
      : null;
  const { data: materialMappings, error: mappingError } =
    selectedMaterial?.competency_material_id
      ? await supabase
          .from("competency_material_indicators")
          .select(
            "indicator_id,assessment_method,observation_guidance,is_required,active,competency_indicator_rubric_version_id",
          )
          .eq("material_id", selectedMaterial.competency_material_id)
          .eq("active", true)
      : { data: null, error: null };
  const mappedIndicators = new Map(
    (materialMappings ?? []).map((mapping) => [mapping.indicator_id, mapping]),
  );

  const eventAssignments = (assignments ?? []).filter(
    (assignment) => assignment.event_id === selectedEvent?.id,
  );
  const [
    { data: ratings, error: ratingError },
    { data: submissions, error: submissionError },
    { data: observerNotes, error: notesError },
  ] = activeVersion
    ? await Promise.all([
        supabase
          .from("assessment_ratings")
          .select(
            "id, participant_id, indicator_id, observer_id, observer_name, score, response_status, evidence, revision, updated_at, assessment_rating_revisions(id,revision,score_before,status_before,evidence_before,score_after,status_after,evidence_after,changed_by,changed_at)",
          )
          .eq("rubric_version_id", activeVersion.id),
        supabase
          .from("assessment_submissions")
          .select(
            "id,participant_id,observer_id,status,updated_at,submitted_at",
          )
          .eq("rubric_version_id", activeVersion.id),
        supabase
          .from("observer_notes")
          .select(
            "id, participant_id, rubric_version_id, indicator_id, author_id, author_name, note_type, content, revision, updated_at, observer_note_revisions(id, content_before, content_after, revision, actor_name, changed_at)",
          )
          .eq("rubric_version_id", activeVersion.id),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ];
  const observationMap = new Map(
    (ratings ?? [])
      .filter((item) => item.observer_id === userId)
      .map((item) => [`${item.participant_id}:${item.indicator_id}`, item]),
  );
  const mySubmissions = new Map(
    (submissions ?? [])
      .filter((item) => item.observer_id === userId)
      .map((item) => [item.participant_id, item]),
  );
  const stageLabel = stageOrder.find(
    (stage) => stage.id === selectedStage,
  )?.label;

  return (
    <main className="users-page">
      <div className="users-heading">
        <div>
          <p className="login-eyebrow">PENILAIAN OBSERVER</p>
          <h1>Observasi</h1>
          <p>
            {profile.role === "instruktur"
              ? "Subrole Instruktur yang ditugaskan dapat mengisi penilaian dan catatan pribadi pada kegiatan ini."
              : "Pilih kegiatan, tahap, dan jenis penilaian. Setiap observer memiliki skor dan bukti sendiri; perubahan tersimpan otomatis."}{" "}
            Riwayat perubahan tersimpan pada basis data.
          </p>
        </div>
        <span className="temporary-pill">AKSES BERDASARKAN PENUGASAN</span>
      </div>
      {(eventsError ||
        versionsError ||
        typesError ||
        materialsError ||
        ratingError ||
        submissionError ||
        notesError ||
        mappingError) && (
        <p className="users-error">
          Data belum dapat dibaca. Hubungi Admin sistem bila masalah berulang.
        </p>
      )}

      {!requestedEventId && (
        <section className="event-manage-card">
          <h2>Pilih kegiatan DAD</h2>
          <p>
            {profile.role === "observer"
              ? "Daftar hanya menampilkan kegiatan yang ditugaskan kepada Observer."
              : profile.role === "instruktur"
                ? "Daftar hanya menampilkan kegiatan dengan penugasan subrole Instruktur kepada Anda."
                : "Pilih kegiatan yang ingin ditinjau."}
          </p>
          {events?.length ? (
            <div className="assessment-event-list">
              {events.map((event) => (
                <Link
                  className="assessment-event-option"
                  href={`/dashboard/observasi?eventId=${event.id}`}
                  key={event.id}
                >
                  <span className="assessment-event-main">
                    <strong>{event.name}</strong>
                    <small>{event.participants.length} peserta</small>
                  </span>
                  <span className="assessment-event-arrow">→</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="users-empty">
              {profile.role === "observer" || profile.role === "instruktur"
                ? "Belum ada kegiatan yang ditugaskan kepada Anda."
                : "Belum ada kegiatan."}
            </p>
          )}
        </section>
      )}

      {requestedEventId && !selectedEvent && (
        <p className="users-error">
          Kegiatan tidak ditemukan atau Anda tidak ditugaskan padanya.
        </p>
      )}

      {selectedEvent && (
        <>
          <Link className="users-back" href="/dashboard/observasi">
            ← Pilih kegiatan lain
          </Link>
          {!selectedStage && (
            <section className="event-manage-card">
              <div className="event-manage-title">
                <div>
                  <h2>{selectedEvent.name}</h2>
                  <p>Pilih tahap yang akan dinilai.</p>
                </div>
              </div>
              <div className="assessment-event-list">
                {stageOrder.map((stage) => (
                  <Link
                    className="assessment-event-option"
                    key={stage.id}
                    href={`/dashboard/observasi?eventId=${selectedEvent.id}&stage=${stage.id}`}
                  >
                    <strong>{stage.label}</strong>
                    <span className="assessment-event-arrow">→</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
          {selectedStage && !selectedPhaseIsValid && (
            <p className="users-error">
              Tahap tidak dikenali. Kembali dan pilih Screening, Pelatihan, atau
              Rencana Tindak Lanjut.
            </p>
          )}

          {selectedEvent &&
            selectedStage === "training" &&
            !selectedMaterialId && (
              <section className="event-manage-card">
                <Link
                  className="users-back"
                  href={`/dashboard/observasi?eventId=${selectedEvent.id}`}
                >
                  ← Pilih tahap lain
                </Link>
                <h2>{selectedEvent.name} · Pelatihan</h2>
                <p>Pilih materi yang akan dinilai.</p>
                {eventMaterials.length ? (
                  <div className="assessment-event-list">
                    {eventMaterials.map((material) => (
                      <Link
                        className="assessment-event-option"
                        href={`/dashboard/observasi?eventId=${selectedEvent.id}&stage=training&materialId=${material.id}`}
                        key={material.id}
                      >
                        <strong>{material.name}</strong>
                        <span className="assessment-event-arrow">→</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="users-empty">
                    Belum ada materi. Minta Super Admin menambah materi dan
                    mengaktifkan rubriknya.
                  </p>
                )}
              </section>
            )}
          {selectedEvent &&
            selectedStage === "training" &&
            selectedMaterialId &&
            !selectedMaterial && (
              <p className="users-error">
                Materi tidak ditemukan pada kegiatan ini.
              </p>
            )}
          {selectedEvent &&
            selectedPhaseIsValid &&
            (selectedStage !== "training" || selectedMaterial) &&
            !selectedTypeId && (
              <section className="event-manage-card">
                <Link
                  className="users-back"
                  href={
                    selectedStage === "training"
                      ? `/dashboard/observasi?eventId=${selectedEvent.id}&stage=training`
                      : `/dashboard/observasi?eventId=${selectedEvent.id}`
                  }
                >
                  ←{" "}
                  {selectedStage === "training"
                    ? "Pilih materi lain"
                    : "Pilih tahap lain"}
                </Link>
                <h2>
                  {selectedEvent.name} · {stageLabel}
                  {selectedMaterial ? ` · ${selectedMaterial.name}` : ""}
                </h2>
                <p>Pilih jenis penilaian yang ingin diisi.</p>
                {eventTypes.length ? (
                  <div className="assessment-event-list">
                    {eventTypes.map((type) => (
                      <Link
                        className="assessment-event-option"
                        href={`/dashboard/observasi?eventId=${selectedEvent.id}&stage=${selectedStage}${selectedMaterial ? `&materialId=${selectedMaterial.id}` : ""}&typeId=${type.id}`}
                        key={type.id}
                      >
                        <strong>{type.name}</strong>
                        <span>
                          {(versions ?? []).some(
                            (version) =>
                              version.event_id === selectedEvent.id &&
                              version.stage === selectedStage &&
                              version.assessment_type_id === type.id &&
                              (selectedStage === "training"
                                ? version.material_id === selectedMaterial?.id
                                : version.material_id === null),
                          )
                            ? "Rubrik aktif"
                            : "Rubrik belum aktif"}
                        </span>
                        <span className="assessment-event-arrow">→</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="users-empty">
                    Belum ada jenis penilaian untuk pilihan ini. Minta Super
                    Admin menambah jenis dan mengaktifkan rubriknya.
                  </p>
                )}
              </section>
            )}

          {selectedEvent &&
            selectedPhaseIsValid &&
            selectedTypeId &&
            !selectedType && (
              <p className="users-error">
                Jenis penilaian tidak ditemukan untuk tahap ini.
              </p>
            )}

          {selectedEvent &&
            selectedPhaseIsValid &&
            selectedType &&
            (selectedStage !== "training" || selectedMaterial) && (
              <>
                <Link
                  className="users-back"
                  href={`/dashboard/observasi?eventId=${selectedEvent.id}&stage=${selectedStage}${selectedMaterial ? `&materialId=${selectedMaterial.id}` : ""}`}
                >
                  ← Pilih jenis penilaian lain
                </Link>
                <section className="event-manage-card">
                  <div className="event-manage-title">
                    <div>
                      <p className="login-eyebrow">
                        {stageLabel}
                        {selectedMaterial
                          ? ` · ${selectedMaterial.name}`
                          : ""}{" "}
                        · {selectedType.name}
                      </p>
                      <h2>{selectedEvent.name}</h2>
                      <p>
                        {selectedEvent.starts_on
                          ? new Date(
                              `${selectedEvent.starts_on}T00:00:00`,
                            ).toLocaleDateString("id-ID", { dateStyle: "long" })
                          : "Tanggal belum diatur"}{" "}
                        · {selectedEvent.participants.length} peserta ·
                        kelompok: Semua peserta · {eventAssignments.length}{" "}
                        Observer ditugaskan
                      </p>
                      <p>
                        Observer yang sudah mengisi:{" "}
                        {[
                          ...new Set(
                            (ratings ?? []).map(
                              (rating) => rating.observer_name,
                            ),
                          ),
                        ]
                          .filter(Boolean)
                          .join(", ") || "belum ada"}
                      </p>
                    </div>
                    <span className="agenda-status next">
                      Penilaian individu · belum difinalisasi
                    </span>
                    {activeVersion && (
                      <AssessmentRealtime versionId={activeVersion.id} />
                    )}
                  </div>
                  {!activeVersion ? (
                    <p className="users-empty">
                      Belum ada rubrik aktif untuk jenis penilaian ini. Hubungi
                      Super Admin.
                    </p>
                  ) : (
                    selectedEvent.participants.map((participant) => {
                      const scoringAspects = activeVersion.rubric_aspects
                        .map((aspect) => ({
                          id: aspect.id,
                          weight: aspect.weight,
                          rubric_indicators: (
                            aspect.rubric_indicator_aspects ?? []
                          ).flatMap((mapping) => {
                            const indicator = firstRelated(
                              mapping.rubric_indicators,
                            );
                            return indicator &&
                              (!selectedMaterial?.competency_material_id ||
                                mappedIndicators.has(
                                  indicator.competency_indicator_id,
                                ))
                              ? [{ id: indicator.id, weight: mapping.weight }]
                              : [];
                          }),
                        }))
                        .filter(
                          (aspect) => aspect.rubric_indicators.length,
                        ) as ScoringAspect[];
                      const allIndicatorIds = new Set(
                        scoringAspects.flatMap((aspect) =>
                          aspect.rubric_indicators.map(
                            (indicator) => indicator.id,
                          ),
                        ),
                      );
                      const participantObservations = (ratings ?? []).filter(
                        (item) =>
                          item.participant_id === participant.id &&
                          item.observer_id === userId &&
                          allIndicatorIds.has(item.indicator_id),
                      );
                      const participantScores = new Map(
                        participantObservations
                          .filter((item) => item.response_status === "scored")
                          .map((item) => [
                            item.indicator_id,
                            { score: item.score },
                          ]),
                      );
                      const calculated = calculateWeightedScore(
                        scoringAspects,
                        participantScores,
                      );
                      const category = categorizeScore(calculated.value);
                      const mySubmission = mySubmissions.get(participant.id);
                      const participantSubmissions = (submissions ?? []).filter(
                        (item) => item.participant_id === participant.id,
                      );
                      const submittedCount = participantSubmissions.filter(
                        (item) =>
                          item.status === "submitted" ||
                          item.status === "finalized",
                      ).length;
                      const finalizedCount = participantSubmissions.filter(
                        (item) => item.status === "finalized",
                      ).length;
                      const status =
                        profile.role === "admin_system"
                          ? finalizedCount === eventAssignments.length &&
                            eventAssignments.length > 0
                            ? "finalized"
                            : submittedCount > 0
                              ? "submitted"
                              : "draft"
                          : (mySubmission?.status ?? "draft");
                      return (
                        <details
                          className="observation-participant"
                          key={participant.id}
                        >
                          <summary>
                            {participant.display_name} ·{" "}
                            {status === "submitted"
                              ? "Submitted"
                              : status === "finalized"
                                ? "Finalized"
                                : "Draft"}
                          </summary>
                          <div className="score-summary">
                            <strong>
                              {calculated.value === null
                                ? "Belum ada penilaian Anda"
                                : `Pratinjau penilaian Anda: ${calculated.value.toFixed(2)} / 100`}
                            </strong>
                            {category && (
                              <span className={`score-category ${category.id}`}>
                                {category.label}
                              </span>
                            )}
                            <small>
                              {
                                participantObservations.filter(
                                  (item) => item.response_status === "scored",
                                ).length
                              }{" "}
                              dinilai ·{" "}
                              {
                                participantObservations.filter(
                                  (item) =>
                                    item.response_status === "not_observed",
                                ).length
                              }{" "}
                              N/O ·{" "}
                              {Math.max(
                                0,
                                allIndicatorIds.size -
                                  participantObservations.filter(
                                    (item) =>
                                      item.response_status !== "unrated",
                                  ).length,
                              )}{" "}
                              belum dinilai
                            </small>
                          </div>
                          {[...activeVersion.rubric_aspects]
                            .sort((a, b) => a.position - b.position)
                            .map((aspect) => (
                              <div
                                className="observation-aspect"
                                key={aspect.id}
                              >
                                <h3>
                                  {aspect.name}{" "}
                                  <small>
                                    {Number(aspect.weight).toFixed(2)}%
                                  </small>
                                </h3>
                                {[...(aspect.rubric_indicator_aspects ?? [])]
                                  .filter((mapping) => {
                                    const indicator = firstRelated(
                                      mapping.rubric_indicators,
                                    );
                                    return (
                                      indicator &&
                                      (!selectedMaterial?.competency_material_id ||
                                        mappedIndicators.has(
                                          indicator.competency_indicator_id,
                                        ))
                                    );
                                  })
                                  .sort(
                                    (a, b) =>
                                      (firstRelated(a.rubric_indicators)
                                        ?.position ?? 0) -
                                      (firstRelated(b.rubric_indicators)
                                        ?.position ?? 0),
                                  )
                                  .map((mapping) => {
                                    const indicator = firstRelated(
                                      mapping.rubric_indicators,
                                    );
                                    if (!indicator) return null;
                                    const saved = observationMap.get(
                                      `${participant.id}:${indicator.id}`,
                                    );
                                    const masterMapping = mappedIndicators.get(
                                      indicator.competency_indicator_id,
                                    );
                                    if (
                                      selectedMaterial?.competency_material_id &&
                                      (!masterMapping ||
                                        masterMapping.competency_indicator_rubric_version_id !==
                                          indicator.competency_indicator_rubric_version_id)
                                    )
                                      return null;
                                    return (
                                      <div
                                        className="observation-indicator"
                                        key={mapping.id}
                                      >
                                        <div>
                                          <strong>{indicator.name}</strong>
                                          {indicator.target && (
                                            <small>
                                              Target: {indicator.target}
                                            </small>
                                          )}
                                          <small>
                                            Bobot{" "}
                                            {Number(mapping.weight).toFixed(2)}%
                                            dalam aspek ·{" "}
                                            {masterMapping?.is_required
                                              ? "Wajib"
                                              : "Opsional"}
                                          </small>
                                        </div>
                                        <AssessmentRatingCell
                                          participantId={participant.id}
                                          rubricVersionId={activeVersion.id}
                                          indicatorId={indicator.id}
                                          rating={saved ?? null}
                                          peerRatings={(ratings ?? []).filter(
                                            (item) =>
                                              item.participant_id ===
                                                participant.id &&
                                              item.indicator_id ===
                                                indicator.id,
                                          )}
                                          observerId={userId}
                                          readOnly={
                                            profile.role === "admin_system"
                                          }
                                          locked={
                                            status !== "draft" &&
                                            profile.role !== "admin_system"
                                          }
                                          descriptors={
                                            indicator.score_descriptors
                                          }
                                          guidance={
                                            masterMapping?.observation_guidance
                                          }
                                        />
                                      </div>
                                    );
                                  })}
                              </div>
                            ))}
                          <ObserverNotes
                            participantId={participant.id}
                            rubricVersionId={activeVersion.id}
                            currentUserId={userId}
                            notes={
                              (observerNotes ?? []).filter(
                                (note) =>
                                  note.participant_id === participant.id,
                              ) as NoteRecord[]
                            }
                            locked={
                              profile.role === "admin_system" ||
                              status !== "draft"
                            }
                          />
                          <SubmissionControls
                            participantId={participant.id}
                            rubricVersionId={activeVersion.id}
                            status={status}
                            role={profile.role}
                            submittedCount={submittedCount}
                            assignedCount={eventAssignments.length}
                          />
                        </details>
                      );
                    })
                  )}
                </section>
              </>
            )}
        </>
      )}

      <div className="users-notice">
        <strong>Skala penilaian observer</strong>
        <p>
          1 = Sangat Kurang · 2 = Kurang · 3 = Cukup · 4 = Baik · 5 = Sangat
          Baik · N/O = Tidak teramati dan bukan skor 0. Ringkasan skor pada
          workspace ini hanya pratinjau penilaian Anda. Nilai kolektif dan hasil
          resmi dihitung di halaman Evaluasi Kolektif.
        </p>
      </div>
      <p className="privacy-note">
        Skor, bukti, riwayat perubahan, dan catatan hanya dapat dibaca oleh
        Admin Sistem serta Observer dan Instruktur yang ditugaskan pada
        kegiatan. RLS basis data memisahkan kepemilikan penilaian setiap
        observer.
      </p>
    </main>
  );
}
