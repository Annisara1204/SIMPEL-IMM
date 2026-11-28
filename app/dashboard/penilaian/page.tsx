import { sessionLoginUrl } from "@/lib/session-login";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  archiveMaterial,
  createAssessmentType,
  copyRubricToMaterials,
  createRubricVersion,
  createTrainingMaterial,
  restoreMaterial,
  setTrainingMaterialFramework,
} from "./rubric-actions";
import {
  assignInstructorEvent,
  assignObserver,
  removeInstructorEventAssignment,
  removeObserverAssignment,
} from "./assignment-actions";
import {
  instructorPositions,
  instructorPositionLabel,
} from "@/lib/instructor-roles";
import { DataUnavailable } from "@/components/data-unavailable";
import { RubricVersionCard } from "@/components/rubric-version-card";

type AssessmentSettingsPageProps = {
  searchParams: Promise<{
    eventId?: string | string[];
    stage?: string | string[];
    materialId?: string | string[];
    typeId?: string | string[];
    assignment?: string | string[];
    showArchived?: string | string[];
    error?: string | string[];
  }>;
};

export default async function AssessmentSettingsPage({
  searchParams,
}: AssessmentSettingsPageProps) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
    return (
      <div className="state-page">
        <h1>Supabase belum dikonfigurasi</h1>
        <p>Aplikasi belum siap digunakan. Hubungi Admin sistem.</p>
        <Link prefetch={false} href="/login">
          Kembali ke login
        </Link>
      </div>
    );
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect(await sessionLoginUrl());
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (
    !profile ||
    !["admin_system", "bidang_kader"].includes(profile.role ?? "")
  )
    redirect("/dashboard");
  const params = await searchParams;
  const requestedEventId = Array.isArray(params.eventId)
    ? params.eventId[0]
    : params.eventId;
  const assignmentStatus = Array.isArray(params.assignment)
    ? params.assignment[0]
    : params.assignment;
  const selectedStage = Array.isArray(params.stage)
    ? params.stage[0]
    : params.stage;
  const selectedMaterialId = Array.isArray(params.materialId)
    ? params.materialId[0]
    : params.materialId;
  const selectedTypeId = Array.isArray(params.typeId)
    ? params.typeId[0]
    : params.typeId;
  const showArchived = (
    Array.isArray(params.showArchived)
      ? params.showArchived[0]
      : params.showArchived
  )
    ? true
    : false;
  const [
    { data: events, error: eventsError },
    { data: versions, error: versionsError },
    { data: assessmentTypes, error: typesError },
    { data: materials, error: materialsError },
    { data: observers },
    { data: assignments },
    { data: instructors },
    { data: instructorAssignments, error: instructorAssignmentsError },
    { data: frameworkMaterials },
  ] = await Promise.all([
    supabase
      .from("events")
      .select("id, name, starts_on, ends_on, status")
      .is("archived_at", null)
      .order("starts_on", { ascending: false }),
    supabase
      .from("rubric_versions")
      .select(
        "id, event_id, stage, material_id, assessment_type_id, version, status, is_trial, created_at, competency_framework_version_id, rubric_aspects(id, competency_aspect_id, name, weight, position, rubric_indicator_aspects(id, weight, rubric_indicators(id, competency_indicator_id, competency_indicator_rubric_version_id, name, target, position, score_descriptors)))",
      )
      .order("version", { ascending: false }),
    supabase
      .from("rubric_assessment_types")
      .select("id, event_id, stage, name, position")
      .order("position"),
    supabase
      .from("rubric_materials")
      .select(
        "id, event_id, name, position, competency_material_id, archived_at",
      )
      .order("position"),
    supabase
      .from("profiles")
      .select("id, display_name")
      .eq("role", "observer")
      .order("display_name"),
    supabase.from("observer_assignments").select("id, event_id, observer_id"),
    profile.role === "admin_system"
      ? supabase
          .from("profiles")
          .select("id, display_name")
          .eq("role", "instruktur")
          .order("display_name")
      : Promise.resolve({ data: [] }),
    profile.role === "admin_system"
      ? supabase
          .from("instructor_event_assignments")
          .select("id, event_id, instructor_id, position")
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("competency_materials")
      .select("id, name, code, position, framework_version_id")
      .order("position"),
  ]);
  const dadFrameworkVersionId = frameworkMaterials?.[0]?.framework_version_id;
  const [
    { data: masterAspects },
    { data: masterIndicators },
    { data: masterIndicatorAspects },
    { data: masterRubricVersions },
    { data: masterMaterialIndicators },
  ] = dadFrameworkVersionId
    ? await Promise.all([
        supabase
          .from("competency_aspects")
          .select("id,code,name,weight,position,framework_version_id")
          .eq("framework_version_id", dadFrameworkVersionId)
          .order("position"),
        supabase
          .from("competency_indicators")
          .select(
            "id,code,name,description,observable_behaviors,position,framework_version_id",
          )
          .eq("framework_version_id", dadFrameworkVersionId)
          .order("position"),
        supabase
          .from("competency_indicator_aspects")
          .select("aspect_id,indicator_id")
          .eq("framework_version_id", dadFrameworkVersionId),
        supabase
          .from("competency_indicator_rubric_versions")
          .select(
            "id,indicator_id,status,rubric_behavioral_anchors(score,description)",
          )
          .eq("framework_version_id", dadFrameworkVersionId)
          .eq("status", "published"),
        supabase
          .from("competency_material_indicators")
          .select(
            "material_id,aspect_id,indicator_id,competency_indicator_rubric_version_id,assessment_method,observation_guidance,is_required",
          )
          .eq("framework_version_id", dadFrameworkVersionId)
          .eq("active", true),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }];
  const selectedEvent =
    events?.find((event) => event.id === requestedEventId) ?? null;
  const canManageRubric = profile.role === "admin_system";
  return (
    <div className="users-page">
      <div className="users-heading">
        <div>
          <p className="login-eyebrow">PENGATURAN RUBRIK DAD</p>
          <h1>Pengaturan Penilaian</h1>
          <p>
            Pilih aspek dan indikator Kerangka DAD untuk setiap materi. Versi
            aktif tetap utuh; buat versi draf baru untuk mengubah pilihan.
          </p>
        </div>
        <span className="tag">MASTER DAD · RUBRIK PER MATERI</span>
      </div>
      {!canManageRubric && (
        <p className="notice">
          <strong>Pengelolaan rubrik oleh Super Admin.</strong> Anda dapat
          melihat rubrik dan mengatur penugasan Observer, tetapi pembuatan,
          perubahan, dan aktivasi rubrik hanya dapat dilakukan Admin Sistem.
        </p>
      )}
      {(eventsError ||
        versionsError ||
        typesError ||
        materialsError ||
        instructorAssignmentsError) && <DataUnavailable />}
      {!requestedEventId && (
        <section className="event-manage-card">
          <div className="event-manage-title">
            <div>
              <h2>Pilih kegiatan DAD</h2>
              <p>
                Pilih kegiatan untuk mengatur rubrik dan menentukan Observer
                yang boleh membuka penilaian.
              </p>
            </div>
          </div>
          {events?.length ? (
            <div className="assessment-event-list">
              {events.map((event) => {
                const observerCount = (assignments ?? []).filter(
                  (assignment) => assignment.event_id === event.id,
                ).length;
                return (
                  <Link
                    prefetch={false}
                    className="assessment-event-option"
                    href={`/dashboard/penilaian?eventId=${encodeURIComponent(event.id)}`}
                    key={event.id}
                  >
                    <span className="assessment-event-main">
                      <strong>{event.name}</strong>
                      <small>
                        {new Date(
                          `${event.starts_on}T00:00:00`,
                        ).toLocaleDateString("id-ID", {
                          dateStyle: "medium",
                        })}{" "}
                        –{" "}
                        {new Date(
                          `${event.ends_on}T00:00:00`,
                        ).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                      </small>
                    </span>
                    <span className="assessment-event-meta">
                      <span
                        className={`badge ${event.status === "ongoing" ? "live" : event.status === "completed" ? "done" : "next"}`}
                      >
                        {event.status === "ongoing"
                          ? "Berlangsung"
                          : event.status === "completed"
                            ? "Selesai"
                            : "Terencana"}
                      </span>
                      <small>{observerCount} Observer ditugaskan</small>
                    </span>
                    <span className="assessment-event-arrow" aria-hidden="true">
                      →
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            !eventsError && (
              <p className="notice notice--empty">
                Belum ada kegiatan DAD. Buat kegiatan dahulu melalui menu
                Kegiatan DAD.
              </p>
            )
          )}
        </section>
      )}
      {requestedEventId && !selectedEvent && (
        <div className="notice">
          <strong>Kegiatan tidak ditemukan</strong>
          <p>
            Pilih kegiatan dari daftar agar pengaturan dan penugasan Observer
            terhubung ke kegiatan yang benar.
          </p>
          <Link
            prefetch={false}
            className="btn btn--quiet"
            href="/dashboard/penilaian"
          >
            Kembali ke daftar kegiatan
          </Link>
        </div>
      )}
      {selectedEvent && (
        <>
          <Link
            prefetch={false}
            className="users-back"
            href="/dashboard/penilaian"
          >
            ← Kembali ke daftar kegiatan DAD
          </Link>
          {assignmentStatus === "success" && (
            <p className="notice">
              <strong>Observer berhasil ditugaskan.</strong> Akun tersebut
              sekarang dapat membuka kegiatan ini dari menu Observasi.
            </p>
          )}
          {assignmentStatus === "already" && (
            <p className="notice">
              <strong>Observer sudah ditugaskan.</strong> Akun itu sudah
              memiliki akses untuk kegiatan ini.
            </p>
          )}
          {assignmentStatus === "error" && (
            <p className="notice notice--danger">
              Penugasan belum berhasil disimpan. Muat ulang halaman dan coba
              lagi.
            </p>
          )}
          {[selectedEvent].map((event) => {
            const eventTypes = (assessmentTypes ?? []).filter(
              (type) =>
                type.event_id === event.id && type.stage === selectedStage,
            );
            const eventMaterials = (materials ?? []).filter(
              (material) =>
                material.event_id === event.id &&
                (showArchived ||
                  material.archived_at === null ||
                  material.id === selectedMaterialId),
            );
            const selectedMaterial =
              eventMaterials.find(
                (material) => material.id === selectedMaterialId,
              ) ?? null;
            const eventVersions = (versions ?? []).filter(
              (version) =>
                version.event_id === event.id &&
                version.stage === selectedStage &&
                version.assessment_type_id === selectedTypeId &&
                (selectedStage === "training"
                  ? version.material_id === selectedMaterialId
                  : version.material_id === null),
            );
            const sourceMappings = selectedMaterial?.competency_material_id
              ? (masterMaterialIndicators ?? []).filter(
                  (mapping) =>
                    mapping.material_id ===
                    selectedMaterial.competency_material_id,
                )
              : (masterIndicatorAspects ?? []);
            const frameworkChoices = (masterAspects ?? [])
              .map((aspect) => ({
                id: aspect.id,
                code: aspect.code,
                name: aspect.name,
                weight: Number(aspect.weight),
                indicators: sourceMappings
                  .filter((mapping) => mapping.aspect_id === aspect.id)
                  .flatMap((mapping) => {
                    const indicator = (masterIndicators ?? []).find(
                      (item) => item.id === mapping.indicator_id,
                    );
                    const sourceVersionId =
                      "competency_indicator_rubric_version_id" in mapping
                        ? mapping.competency_indicator_rubric_version_id
                        : masterRubricVersions?.find(
                            (item) =>
                              item.indicator_id === mapping.indicator_id,
                          )?.id;
                    const sourceRubric = masterRubricVersions?.find(
                      (item) => item.id === sourceVersionId,
                    );
                    if (!indicator || !sourceRubric) return [];
                    const anchors = Array.isArray(
                      sourceRubric.rubric_behavioral_anchors,
                    )
                      ? sourceRubric.rubric_behavioral_anchors
                      : [];
                    return [
                      {
                        id: indicator.id,
                        code: indicator.code,
                        name: indicator.name,
                        guidance:
                          ("observation_guidance" in mapping
                            ? mapping.observation_guidance
                            : null) || indicator.observable_behaviors,
                        anchors: Object.fromEntries(
                          anchors.map((anchor) => [
                            String(anchor.score),
                            anchor.description,
                          ]),
                        ),
                        linkedAspectIds: (masterIndicatorAspects ?? [])
                          .filter((link) => link.indicator_id === indicator.id)
                          .map((link) => link.aspect_id),
                      },
                    ];
                  }),
              }))
              .filter((aspect) => aspect.indicators.length > 0);
            const eventAssignments = (assignments ?? []).filter(
              (assignment) => assignment.event_id === event.id,
            );
            const assignedObserverIds = new Set(
              eventAssignments.map((assignment) => assignment.observer_id),
            );
            const availableObservers = (observers ?? []).filter(
              (observer) => !assignedObserverIds.has(observer.id),
            );
            const eventInstructorAssignments = (
              instructorAssignments ?? []
            ).filter((assignment) => assignment.event_id === event.id);
            const availableInstructors = instructors ?? [];
            return (
              <section className="event-manage-card" key={event.id}>
                <div className="event-manage-title">
                  <div>
                    <p className="login-eyebrow">KEGIATAN TERPILIH</p>
                    <h2>{event.name}</h2>
                    <p>
                      Setiap versi menyimpan susunan rubrik dan bobotnya
                      sendiri.
                    </p>
                  </div>
                  <span
                    className={`badge ${event.status === "ongoing" ? "live" : event.status === "completed" ? "done" : "next"}`}
                  >
                    {event.status === "ongoing"
                      ? "Berlangsung"
                      : event.status === "completed"
                        ? "Selesai"
                        : "Terencana"}
                  </span>
                </div>
                {canManageRubric && (
                  <div className="assignment-box">
                    <h3>Observer yang ditugaskan</h3>
                    {eventAssignments.map((assignment) => (
                      <div className="assignment-row" key={assignment.id}>
                        <span>
                          {observers?.find(
                            (observer) =>
                              observer.id === assignment.observer_id,
                          )?.display_name || "Akun Observer"}
                        </span>
                        <form action={removeObserverAssignment}>
                          <input
                            type="hidden"
                            name="assignmentId"
                            value={assignment.id}
                          />
                          <button
                            type="submit"
                            className="remove-button"
                            aria-label={`Cabut akses ${
                              observers?.find(
                                (observer) =>
                                  observer.id === assignment.observer_id,
                              )?.display_name ?? "Observer"
                            }`}
                          >
                            Cabut akses
                          </button>
                        </form>
                      </div>
                    ))}
                    {!eventAssignments.length && (
                      <p className="assessment-assignment-empty">
                        Belum ada Observer yang mendapat akses ke penilaian
                        kegiatan ini.
                      </p>
                    )}
                    <form
                      action={assignObserver}
                      className="commission-add-form"
                    >
                      <input type="hidden" name="eventId" value={event.id} />
                      <label>
                        Tugaskan Observer
                        <select required name="observerId" defaultValue="">
                          <option value="" disabled>
                            {availableObservers.length
                              ? "Pilih akun Observer"
                              : "Semua Observer sudah ditugaskan"}
                          </option>
                          {availableObservers.map((observer) => (
                            <option key={observer.id} value={observer.id}>
                              {observer.display_name || "Observer tanpa nama"}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="submit"
                        disabled={!availableObservers.length}
                      >
                        Tugaskan
                      </button>
                    </form>
                    <p className="assessment-assignment-hint">
                      Observer yang ditugaskan dapat membuka kegiatan ini
                      melalui menu Observasi.
                    </p>
                  </div>
                )}
                {canManageRubric && (
                  <div className="assignment-box">
                    <h3>Penugasan Instruktur per kegiatan</h3>
                    {eventInstructorAssignments.map((assignment) => (
                      <div className="assignment-row" key={assignment.id}>
                        <span>
                          {instructors?.find(
                            (instructor) =>
                              instructor.id === assignment.instructor_id,
                          )?.display_name || "Akun Instruktur"}{" "}
                          · {instructorPositionLabel(assignment.position)}
                        </span>
                        <form action={removeInstructorEventAssignment}>
                          <input
                            type="hidden"
                            name="assignmentId"
                            value={assignment.id}
                          />
                          <button
                            type="submit"
                            className="remove-button"
                            aria-label={`Cabut tugas ${
                              instructors?.find(
                                (instructor) =>
                                  instructor.id === assignment.instructor_id,
                              )?.display_name ?? "Instruktur"
                            }`}
                          >
                            Cabut tugas
                          </button>
                        </form>
                      </div>
                    ))}
                    {!eventInstructorAssignments.length && (
                      <p className="assessment-assignment-empty">
                        Belum ada Instruktur yang ditugaskan pada kegiatan ini.
                      </p>
                    )}
                    <form
                      action={assignInstructorEvent}
                      className="commission-add-form"
                    >
                      <input type="hidden" name="eventId" value={event.id} />
                      <label>
                        Akun Instruktur
                        <select required name="instructorId" defaultValue="">
                          <option value="" disabled>
                            {availableInstructors.length
                              ? "Pilih akun Instruktur"
                              : "Belum ada akun Instruktur tersedia"}
                          </option>
                          {availableInstructors.map((instructor) => (
                            <option key={instructor.id} value={instructor.id}>
                              {instructor.display_name ||
                                "Instruktur tanpa nama"}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Subrole pada kegiatan ini
                        <select required name="position" defaultValue="mot">
                          {instructorPositions.map((position) => (
                            <option key={position.id} value={position.id}>
                              {position.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="submit"
                        disabled={!availableInstructors.length}
                      >
                        Tugaskan
                      </button>
                    </form>
                    <p className="assessment-assignment-hint">
                      Subrole dapat berbeda untuk setiap kegiatan. Semua
                      Instruktur hanya melihat data kegiatan tugasnya; tidak
                      dapat membuka catatan privat Observer.
                    </p>
                  </div>
                )}
                {!selectedStage && (
                  <div className="event-manage-card">
                    <h3>Pilih tahapan penilaian</h3>
                    <p>
                      Setiap tahap memiliki hasil rubrik dan kategori sendiri.
                    </p>
                    <div className="assessment-event-list">
                      {[
                        { id: "screening", label: "1. Screening" },
                        { id: "training", label: "2. Pelatihan" },
                        { id: "follow_up", label: "3. Rencana Tindak Lanjut" },
                      ].map((stage) => (
                        <Link
                          prefetch={false}
                          className="assessment-event-option"
                          key={stage.id}
                          href={`/dashboard/penilaian?eventId=${event.id}&stage=${stage.id}`}
                        >
                          <strong>{stage.label}</strong>
                          <span className="assessment-event-arrow">→</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {selectedStage &&
                  !["screening", "training", "follow_up"].includes(
                    selectedStage,
                  ) && (
                    <p className="notice notice--danger">
                      Tahap tidak dikenali. Pilih Screening, Pelatihan, atau
                      Rencana Tindak Lanjut.
                    </p>
                  )}
                {selectedStage &&
                  ["screening", "training", "follow_up"].includes(
                    selectedStage,
                  ) && (
                    <>
                      <Link
                        prefetch={false}
                        className="users-back"
                        href={`/dashboard/penilaian?eventId=${event.id}`}
                      >
                        ← Pilih tahapan lain
                      </Link>
                      <div className="assignment-box">
                        <h3>
                          {selectedStage === "screening"
                            ? "Tahap 1 · Screening"
                            : selectedStage === "training"
                              ? "Tahap 2 · Pelatihan"
                              : "Tahap 3 · Rencana Tindak Lanjut"}
                        </h3>
                        {selectedStage === "training" ? (
                          <>
                            <p>
                              Pilih materi yang akan dinilai. Hubungkan tiap
                              materi ke konteks kerangka DAD agar saran
                              indikator sesuai kerangka DAD untuk materi
                              tersebut.
                            </p>
                            {canManageRubric && (
                              <p className="notice">
                                <Link
                                  prefetch={false}
                                  href={`/dashboard/penilaian?eventId=${event.id}&stage=training${showArchived ? "" : "&showArchived=1"}`}
                                >
                                  {showArchived
                                    ? "Kembali ke materi aktif"
                                    : "Lihat materi yang diarsipkan"}
                                </Link>
                              </p>
                            )}
                            {!selectedMaterialId && (
                              <>
                                {eventMaterials.map((material) => {
                                  const hasLockedVersion = (
                                    versions ?? []
                                  ).some(
                                    (version) =>
                                      version.material_id === material.id &&
                                      version.status !== "draft",
                                  );
                                  return (
                                    <div
                                      className="assessment-material-row"
                                      key={material.id}
                                    >
                                      <Link
                                        prefetch={false}
                                        className="assessment-event-option"
                                        href={`/dashboard/penilaian?eventId=${event.id}&stage=training&materialId=${material.id}`}
                                      >
                                        <strong>{material.name}</strong>
                                        {material.archived_at && (
                                          <span className="badge">Arsip</span>
                                        )}
                                        <span>
                                          {frameworkMaterials?.find(
                                            (item) =>
                                              item.id ===
                                              material.competency_material_id,
                                          )?.name ??
                                            "Belum terhubung ke konteks DAD"}
                                        </span>
                                        <span className="assessment-event-arrow">
                                          →
                                        </span>
                                      </Link>
                                      {canManageRubric && !hasLockedVersion && (
                                        <form
                                          action={setTrainingMaterialFramework}
                                          className="assessment-material-link-form"
                                        >
                                          <input
                                            type="hidden"
                                            name="materialId"
                                            value={material.id}
                                          />
                                          <label>
                                            Konteks DAD
                                            <select
                                              name="competencyMaterialId"
                                              defaultValue={
                                                material.competency_material_id ??
                                                ""
                                              }
                                              required
                                            >
                                              <option value="" disabled>
                                                Pilih konteks
                                              </option>
                                              {frameworkMaterials?.map(
                                                (item) => (
                                                  <option
                                                    key={item.id}
                                                    value={item.id}
                                                  >
                                                    {item.code} · {item.name}
                                                  </option>
                                                ),
                                              )}
                                            </select>
                                          </label>
                                          <button type="submit">
                                            Simpan konteks
                                          </button>
                                        </form>
                                      )}
                                      {canManageRubric && (
                                        <form
                                          action={
                                            material.archived_at
                                              ? restoreMaterial
                                              : archiveMaterial
                                          }
                                          className="event-archive-form"
                                        >
                                          <input
                                            type="hidden"
                                            name="materialId"
                                            value={material.id}
                                          />
                                          <input
                                            type="hidden"
                                            name="eventId"
                                            value={event.id}
                                          />
                                          <input
                                            type="hidden"
                                            name="stage"
                                            value={selectedStage}
                                          />
                                          <button type="submit">
                                            {material.archived_at
                                              ? "Pulihkan materi"
                                              : "Arsipkan materi"}
                                          </button>
                                        </form>
                                      )}
                                    </div>
                                  );
                                })}
                                {canManageRubric && (
                                  <form
                                    action={createTrainingMaterial}
                                    className="rubric-add-form"
                                  >
                                    <input
                                      type="hidden"
                                      name="eventId"
                                      value={event.id}
                                    />
                                    <label>
                                      Nama materi
                                      <input
                                        required
                                        minLength={2}
                                        maxLength={120}
                                        name="name"
                                        placeholder="Contoh: Ideologi IMM"
                                      />
                                    </label>
                                    <label>
                                      Konteks master DAD
                                      <select
                                        name="competencyMaterialId"
                                        defaultValue=""
                                      >
                                        <option value="">
                                          Tidak dihubungkan
                                        </option>
                                        {frameworkMaterials?.map((item) => (
                                          <option key={item.id} value={item.id}>
                                            {item.code} · {item.name}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                    <button type="submit">Tambah materi</button>
                                  </form>
                                )}
                              </>
                            )}
                          </>
                        ) : (
                          <p>
                            Pilih jenis penilaian. Setiap jenis memiliki versi,
                            aspek, indikator, dan bobot sendiri.
                          </p>
                        )}
                        {selectedStage === "training" &&
                          selectedMaterialId &&
                          !selectedMaterial && (
                            <p className="notice notice--danger">
                              Materi tidak ditemukan pada kegiatan ini.
                            </p>
                          )}
                        {(selectedStage !== "training" || selectedMaterial) && (
                          <>
                            <div>
                              {selectedStage === "training" &&
                                selectedMaterial && (
                                  <>
                                    <Link
                                      prefetch={false}
                                      className="users-back"
                                      href={`/dashboard/penilaian?eventId=${event.id}&stage=training`}
                                    >
                                      ← Pilih materi lain
                                    </Link>
                                    <h4>Materi: {selectedMaterial.name}</h4>
                                    {selectedMaterial.archived_at && (
                                      <p className="notice">
                                        <strong>Materi ini diarsipkan.</strong>{" "}
                                        Data lama tetap tersimpan. Pulihkan
                                        materi untuk mengubahnya.
                                      </p>
                                    )}
                                  </>
                                )}
                              <p>
                                Pilih jenis penilaian atau tambahkan jenis baru.
                              </p>
                              {eventTypes.map((type) => (
                                <Link
                                  prefetch={false}
                                  className="assessment-event-option"
                                  key={type.id}
                                  href={`/dashboard/penilaian?eventId=${event.id}&stage=${selectedStage}${selectedStage === "training" ? `&materialId=${selectedMaterialId}` : ""}&typeId=${type.id}`}
                                >
                                  <strong>{type.name}</strong>
                                  <span className="assessment-event-arrow">
                                    →
                                  </span>
                                </Link>
                              ))}
                              {canManageRubric &&
                                !selectedMaterial?.archived_at && (
                                  <form
                                    action={createAssessmentType}
                                    className="rubric-add-form"
                                  >
                                    <input
                                      type="hidden"
                                      name="eventId"
                                      value={event.id}
                                    />
                                    <input
                                      type="hidden"
                                      name="stage"
                                      value={selectedStage}
                                    />
                                    <label>
                                      Tambah jenis penilaian
                                      <input
                                        required
                                        minLength={2}
                                        maxLength={80}
                                        name="name"
                                        placeholder="Contoh: Observasi"
                                      />
                                    </label>
                                    <button type="submit">Tambah jenis</button>
                                  </form>
                                )}
                            </div>
                          </>
                        )}
                      </div>
                    </>
                  )}
                {selectedStage &&
                  selectedTypeId &&
                  !eventTypes.some((type) => type.id === selectedTypeId) && (
                    <p className="notice notice--danger">
                      Jenis penilaian tidak ditemukan pada tahap ini.
                    </p>
                  )}
                {selectedStage &&
                  selectedTypeId &&
                  eventTypes.some((type) => type.id === selectedTypeId) &&
                  (selectedStage !== "training" || selectedMaterial) && (
                    <>
                      <h3>
                        Rubrik:{" "}
                        {
                          eventTypes.find((type) => type.id === selectedTypeId)
                            ?.name
                        }
                      </h3>
                      {!eventVersions.some(
                        (version) => version.status === "draft",
                      ) &&
                        canManageRubric &&
                        !selectedMaterial?.archived_at && (
                          <form
                            action={createRubricVersion}
                            className="participant-add-form"
                          >
                            <input
                              type="hidden"
                              name="eventId"
                              value={event.id}
                            />
                            <input
                              type="hidden"
                              name="stage"
                              value={selectedStage}
                            />
                            <input
                              type="hidden"
                              name="materialId"
                              value={
                                selectedStage === "training"
                                  ? selectedMaterialId
                                  : ""
                              }
                            />
                            <input
                              type="hidden"
                              name="assessmentTypeId"
                              value={selectedTypeId}
                            />
                            <button type="submit">
                              {eventVersions.length
                                ? `Buat versi ${Math.max(...eventVersions.map((version) => version.version)) + 1} (draf baru)`
                                : "Buat versi 1 (draf)"}
                            </button>
                            <small>
                              Versi aktif tetap tersimpan. Pada draf baru, pilih
                              aspek dan indikator sesuai materi sebelum
                              diaktifkan.
                            </small>
                          </form>
                        )}
                      {selectedStage === "training" &&
                        canManageRubric &&
                        eventVersions.some(
                          (version) => version.status !== "draft",
                        ) &&
                        eventMaterials.some(
                          (material) =>
                            material.id !== selectedMaterialId &&
                            !material.archived_at,
                        ) && (
                          <details className="framework-rubric-picker">
                            <summary>Salin rubrik ke materi lain</summary>
                            <p>
                              Pilih versi sumber, lalu centang materi tujuan.
                              Sistem membuat draf baru di tiap materi dengan
                              aspek, bobot, indikator, pemetaan, dan uraian skor
                              1–5 yang sama. Rubrik sumber tidak diubah; draf
                              hasil salinan tetap perlu diaktifkan satu per
                              satu.
                            </p>
                            <form
                              action={copyRubricToMaterials}
                              className="rubric-copy-form"
                            >
                              <input
                                type="hidden"
                                name="eventId"
                                value={event.id}
                              />
                              <input
                                type="hidden"
                                name="stage"
                                value={selectedStage}
                              />
                              <input
                                type="hidden"
                                name="assessmentTypeId"
                                value={selectedTypeId}
                              />
                              <input
                                type="hidden"
                                name="materialId"
                                value={selectedMaterialId ?? ""}
                              />
                              <input
                                type="hidden"
                                name="typeId"
                                value={selectedTypeId}
                              />
                              <div className="rubric-copy-controls">
                                <label>
                                  Versi sumber
                                  <select
                                    name="sourceVersionId"
                                    required
                                    defaultValue=""
                                  >
                                    <option value="" disabled>
                                      Pilih versi
                                    </option>
                                    {[...eventVersions]
                                      .filter(
                                        (version) => version.status !== "draft",
                                      )
                                      .sort((a, b) => b.version - a.version)
                                      .map((version) => (
                                        <option
                                          key={version.id}
                                          value={version.id}
                                        >
                                          Versi {version.version} ·{" "}
                                          {version.status === "active"
                                            ? "RESMI"
                                            : "Arsip"}
                                        </option>
                                      ))}
                                  </select>
                                </label>
                                <button type="submit">
                                  Salin ke materi terpilih
                                </button>
                              </div>
                              <fieldset className="rubric-copy-list">
                                <legend>Materi tujuan</legend>
                                {eventMaterials
                                  .filter(
                                    (material) =>
                                      material.id !== selectedMaterialId &&
                                      !material.archived_at,
                                  )
                                  .map((material) => (
                                    <label key={material.id}>
                                      <input
                                        type="checkbox"
                                        name="targetMaterialIds"
                                        value={material.id}
                                      />
                                      <span>{material.name}</span>
                                    </label>
                                  ))}
                              </fieldset>
                            </form>
                          </details>
                        )}
                      {!eventVersions.length && !canManageRubric && (
                        <p className="assessment-assignment-empty">
                          Rubrik belum dibuat. Minta Super Admin menyiapkan
                          rubrik untuk jenis ini.
                        </p>
                      )}
                      {eventVersions.map((version) => (
                        <RubricVersionCard
                          key={version.id}
                          version={version}
                          canManageRubric={canManageRubric}
                          eventId={event.id}
                          selectedStage={selectedStage}
                          selectedTypeId={selectedTypeId}
                          selectedMaterialId={selectedMaterialId}
                          selectedMaterial={selectedMaterial}
                          frameworkChoices={frameworkChoices}
                        />
                      ))}
                    </>
                  )}
              </section>
            );
          })}
        </>
      )}
      <div className="notice">
        <strong>Skala indikator</strong>
        <p>
          1 = Sangat Kurang · 2 = Kurang · 3 = Cukup · 4 = Baik · 5 = Sangat
          Baik. Nilai harus bilangan bulat. Bobot indikator pada tiap aspek dan
          bobot antar-aspek harus masing-masing berjumlah 100%.
        </p>
      </div>
    </div>
  );
}
