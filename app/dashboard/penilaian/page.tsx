import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { firstRelated } from "@/lib/relations";
import {
  activateRubric,
  addAspect,
  addIndicator,
  createAssessmentType,
  createRubricVersion,
  createTrainingMaterial,
  editAspect,
  editIndicator,
  linkIndicatorToAspect,
  removeDraftAspect,
  removeDraftIndicatorMapping,
  setTrainingMaterialFramework,
  unlinkIndicatorFromAspect,
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
import { FrameworkRubricPicker } from "./framework-rubric-picker";
import { SCORE_SCALE_LABELS } from "@/lib/scoring";

type AssessmentSettingsPageProps = {
  searchParams: Promise<{
    eventId?: string | string[];
    stage?: string | string[];
    materialId?: string | string[];
    typeId?: string | string[];
    assignment?: string | string[];
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
      .order("starts_on", { ascending: false }),
    supabase
      .from("rubric_versions")
      .select(
        "id, event_id, stage, material_id, assessment_type_id, version, status, created_at, competency_framework_version_id, rubric_aspects(id, competency_aspect_id, name, weight, position, rubric_indicator_aspects(id, weight, rubric_indicators(id, competency_indicator_id, competency_indicator_rubric_version_id, name, target, position, score_descriptors)))",
      )
      .order("version", { ascending: false }),
    supabase
      .from("rubric_assessment_types")
      .select("id, event_id, stage, name, position")
      .order("position"),
    supabase
      .from("rubric_materials")
      .select("id, event_id, name, position, competency_material_id")
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
    <main className="users-page">
      <div className="users-heading">
        <div>
          <p className="login-eyebrow">PENGATURAN RUBRIK DAD</p>
          <h1>Pengaturan Penilaian</h1>
          <p>
            Pilih aspek dan indikator Kerangka DAD untuk setiap materi. Versi
            aktif tetap utuh; buat versi draf baru untuk mengubah pilihan.
          </p>
        </div>
        <span className="sample-tag">MASTER DAD · RUBRIK PER MATERI</span>
      </div>
      {!canManageRubric && (
        <p className="users-notice">
          <strong>Pengelolaan rubrik oleh Super Admin.</strong> Anda dapat
          melihat rubrik dan mengatur penugasan Observer, tetapi pembuatan,
          perubahan, dan aktivasi rubrik hanya dapat dilakukan Admin Sistem.
        </p>
      )}
      {(eventsError ||
        versionsError ||
        typesError ||
        materialsError ||
        instructorAssignmentsError) && (
        <p className="users-error">
          Data belum dapat dibaca. Hubungi Admin sistem bila masalah berulang.
        </p>
      )}
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
                        className={`agenda-status ${event.status === "ongoing" ? "live" : event.status === "completed" ? "done" : "next"}`}
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
              <p className="users-empty">
                Belum ada kegiatan DAD. Buat kegiatan dahulu melalui menu
                Kegiatan DAD.
              </p>
            )
          )}
        </section>
      )}
      {requestedEventId && !selectedEvent && (
        <div className="users-notice">
          <strong>Kegiatan tidak ditemukan</strong>
          <p>
            Pilih kegiatan dari daftar agar pengaturan dan penugasan Observer
            terhubung ke kegiatan yang benar.
          </p>
          <Link className="text-button" href="/dashboard/penilaian">
            Kembali ke daftar kegiatan
          </Link>
        </div>
      )}
      {selectedEvent && (
        <>
          <Link className="users-back" href="/dashboard/penilaian">
            ← Kembali ke daftar kegiatan DAD
          </Link>
          {assignmentStatus === "success" && (
            <p className="users-notice">
              <strong>Observer berhasil ditugaskan.</strong> Akun tersebut
              sekarang dapat membuka kegiatan ini dari menu Observasi.
            </p>
          )}
          {assignmentStatus === "already" && (
            <p className="users-notice">
              <strong>Observer sudah ditugaskan.</strong> Akun itu sudah
              memiliki akses untuk kegiatan ini.
            </p>
          )}
          {assignmentStatus === "error" && (
            <p className="users-error">
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
              (material) => material.event_id === event.id,
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
                    className={`agenda-status ${event.status === "ongoing" ? "live" : event.status === "completed" ? "done" : "next"}`}
                  >
                    {event.status === "ongoing"
                      ? "Berlangsung"
                      : event.status === "completed"
                        ? "Selesai"
                        : "Terencana"}
                  </span>
                </div>
                <div className="assignment-box">
                  <h3>Observer yang ditugaskan</h3>
                  {eventAssignments.map((assignment) => (
                    <div className="assignment-row" key={assignment.id}>
                      <span>
                        {observers?.find(
                          (observer) => observer.id === assignment.observer_id,
                        )?.display_name || "Akun Observer"}
                      </span>
                      <form action={removeObserverAssignment}>
                        <input
                          type="hidden"
                          name="assignmentId"
                          value={assignment.id}
                        />
                        <button type="submit" className="remove-button">
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
                  <form action={assignObserver} className="commission-add-form">
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
                    <button type="submit" disabled={!availableObservers.length}>
                      Tugaskan
                    </button>
                  </form>
                  <p className="assessment-assignment-hint">
                    Observer yang ditugaskan dapat membuka kegiatan ini melalui
                    menu Observasi.
                  </p>
                </div>
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
                          <button type="submit" className="remove-button">
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
                    <p className="users-error">
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
                                        className="assessment-event-option"
                                        href={`/dashboard/penilaian?eventId=${event.id}&stage=training&materialId=${material.id}`}
                                      >
                                        <strong>{material.name}</strong>
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
                            <p className="users-error">
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
                                      className="users-back"
                                      href={`/dashboard/penilaian?eventId=${event.id}&stage=training`}
                                    >
                                      ← Pilih materi lain
                                    </Link>
                                    <h4>Materi: {selectedMaterial.name}</h4>
                                  </>
                                )}
                              <p>
                                Pilih jenis penilaian atau tambahkan jenis baru.
                              </p>
                              {eventTypes.map((type) => (
                                <Link
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
                              {canManageRubric && (
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
                    <p className="users-error">
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
                        canManageRubric && (
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
                      {!eventVersions.length && !canManageRubric && (
                        <p className="assessment-assignment-empty">
                          Rubrik belum dibuat. Minta Super Admin menyiapkan
                          rubrik untuk jenis ini.
                        </p>
                      )}
                      {eventVersions.map((version) => {
                        const aspects = [
                          ...(version.rubric_aspects ?? []),
                        ].sort((a, b) => a.position - b.position);
                        const aspectTotal = aspects.reduce(
                          (sum, aspect) => sum + Number(aspect.weight),
                          0,
                        );
                        const valid =
                          aspects.length > 0 &&
                          Math.abs(aspectTotal - 100) < 0.001 &&
                          aspects.every((aspect) => {
                            const mappings =
                              aspect.rubric_indicator_aspects ?? [];
                            return (
                              mappings.length > 0 &&
                              Math.abs(
                                mappings.reduce(
                                  (sum, mapping) =>
                                    sum + Number(mapping.weight),
                                  0,
                                ) - 100,
                              ) < 0.001 &&
                              mappings.every((mapping) =>
                                [1, 2, 3, 4, 5].every(
                                  (score) =>
                                    String(
                                      firstRelated(mapping.rubric_indicators)
                                        ?.score_descriptors?.[String(score)] ??
                                        "",
                                    ).trim().length >= 3,
                                ),
                              )
                            );
                          });
                        return (
                          <div className="rubric-version" key={version.id}>
                            <div className="event-manage-title">
                              <div>
                                <h3>Versi {version.version}</h3>
                                <p>
                                  Bobot aspek: {aspectTotal.toFixed(2)}% · Aspek
                                  tanpa indikator diamati akan dikecualikan dan
                                  bobot aspek lain dinormalisasi ulang.
                                </p>
                              </div>
                              <span
                                className={`agenda-status ${version.status === "active" ? "done" : "next"}`}
                              >
                                {version.status === "active"
                                  ? "Aktif"
                                  : version.status === "archived"
                                    ? "Diarsipkan"
                                    : "Draf"}
                              </span>
                            </div>
                            {version.status === "draft" &&
                              canManageRubric &&
                              selectedStage === "training" &&
                              selectedMaterial && (
                                <FrameworkRubricPicker
                                  key={`${version.id}:${aspects.flatMap((aspect) => (aspect.competency_aspect_id ? [aspect.competency_aspect_id] : [])).join(",")}:${aspects
                                    .flatMap((aspect) =>
                                      (
                                        aspect.rubric_indicator_aspects ?? []
                                      ).flatMap((mapping) => {
                                        const indicator = firstRelated(
                                          mapping.rubric_indicators,
                                        );
                                        return indicator?.competency_indicator_id
                                          ? [indicator.competency_indicator_id]
                                          : [];
                                      }),
                                    )
                                    .join(",")}`}
                                  versionId={version.id}
                                  aspects={frameworkChoices}
                                  materialName={selectedMaterial.name}
                                  selectedAspectIds={aspects.flatMap(
                                    (aspect) =>
                                      aspect.competency_aspect_id
                                        ? [aspect.competency_aspect_id]
                                        : [],
                                  )}
                                  selectedIndicatorIds={aspects.flatMap(
                                    (aspect) =>
                                      (
                                        aspect.rubric_indicator_aspects ?? []
                                      ).flatMap((mapping) => {
                                        const indicator = firstRelated(
                                          mapping.rubric_indicators,
                                        );
                                        return indicator?.competency_indicator_id
                                          ? [indicator.competency_indicator_id]
                                          : [];
                                      }),
                                  )}
                                />
                              )}
                            {aspects.map((aspect) => (
                              <div className="rubric-aspect" key={aspect.id}>
                                <strong>
                                  {aspect.name}{" "}
                                  <span>
                                    {Number(aspect.weight).toFixed(2)}%
                                  </span>
                                </strong>
                                {version.status === "draft" &&
                                  canManageRubric && (
                                    <>
                                      <form
                                        action={editAspect}
                                        className="rubric-add-form"
                                      >
                                        <input
                                          type="hidden"
                                          name="aspectId"
                                          value={aspect.id}
                                        />
                                        <label>
                                          Ubah nama aspek
                                          <input
                                            required
                                            minLength={2}
                                            maxLength={120}
                                            name="name"
                                            defaultValue={aspect.name}
                                          />
                                        </label>
                                        <label>
                                          Bobot (%)
                                          <input
                                            required
                                            type="number"
                                            min="0.01"
                                            max="100"
                                            step="0.01"
                                            name="weight"
                                            defaultValue={aspect.weight}
                                          />
                                        </label>
                                        <button type="submit">
                                          Simpan aspek
                                        </button>
                                      </form>
                                      <details className="rubric-edit">
                                        <summary>Hapus aspek dari draf</summary>
                                        <form
                                          action={removeDraftAspect}
                                          className="rubric-add-form"
                                        >
                                          <input
                                            type="hidden"
                                            name="aspectId"
                                            value={aspect.id}
                                          />
                                          <p>
                                            Indikator yang hanya terhubung ke
                                            aspek ini juga akan dihapus dari
                                            draf. Versi aktif/arsip tidak
                                            terpengaruh.
                                          </p>
                                          <button
                                            type="submit"
                                            className="remove-button"
                                          >
                                            Hapus aspek ini
                                          </button>
                                        </form>
                                      </details>
                                    </>
                                  )}
                                {[...(aspect.rubric_indicator_aspects ?? [])]
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
                                    const linkedAspectIds = new Set(
                                      aspects.flatMap((item) =>
                                        (item.rubric_indicator_aspects ?? [])
                                          .filter(
                                            (link) =>
                                              firstRelated(
                                                link.rubric_indicators,
                                              )?.id === indicator.id,
                                          )
                                          .map(() => item.id),
                                      ),
                                    );
                                    const linkableAspects = aspects.filter(
                                      (item) =>
                                        item.id !== aspect.id &&
                                        !linkedAspectIds.has(item.id),
                                    );
                                    return (
                                      <div
                                        className="rubric-indicator"
                                        key={mapping.id}
                                      >
                                        <div>
                                          <b>{indicator.name}</b>
                                          {indicator.target && (
                                            <small>
                                              Target: {indicator.target}
                                            </small>
                                          )}
                                          <small>
                                            Uraian skor:{" "}
                                            {
                                              [1, 2, 3, 4, 5].filter(
                                                (score) =>
                                                  String(
                                                    indicator
                                                      .score_descriptors?.[
                                                      String(score)
                                                    ] ?? "",
                                                  ).trim().length >= 3,
                                              ).length
                                            }
                                            /5 terisi
                                          </small>
                                        </div>
                                        <span>
                                          {Number(mapping.weight).toFixed(2)}%
                                          pada aspek ini
                                        </span>
                                        {version.status === "draft" &&
                                          canManageRubric && (
                                            <details className="rubric-edit">
                                              <summary>
                                                Ubah/petakan/hapus
                                              </summary>
                                              <form
                                                action={editIndicator}
                                                className="rubric-add-form"
                                              >
                                                <input
                                                  type="hidden"
                                                  name="indicatorId"
                                                  value={indicator.id}
                                                />
                                                <input
                                                  type="hidden"
                                                  name="mappingId"
                                                  value={mapping.id}
                                                />
                                                <label>
                                                  Nama indikator
                                                  <input
                                                    required
                                                    minLength={2}
                                                    maxLength={200}
                                                    name="name"
                                                    defaultValue={
                                                      indicator.name
                                                    }
                                                  />
                                                </label>
                                                <label>
                                                  Target (opsional)
                                                  <input
                                                    maxLength={300}
                                                    name="target"
                                                    defaultValue={
                                                      indicator.target ?? ""
                                                    }
                                                  />
                                                </label>
                                                <label>
                                                  Bobot dalam {aspect.name} (%)
                                                  <input
                                                    required
                                                    type="number"
                                                    min="0.01"
                                                    max="100"
                                                    step="0.01"
                                                    name="weight"
                                                    defaultValue={
                                                      mapping.weight
                                                    }
                                                  />
                                                </label>
                                                {[1, 2, 3, 4, 5].map(
                                                  (score) => (
                                                    <label key={score}>
                                                      Uraian skor {score} ·{" "}
                                                      {
                                                        SCORE_SCALE_LABELS[
                                                          score
                                                        ]
                                                      }
                                                      <textarea
                                                        required
                                                        minLength={3}
                                                        maxLength={500}
                                                        name={`descriptor${score}`}
                                                        defaultValue={
                                                          indicator
                                                            .score_descriptors?.[
                                                            String(score)
                                                          ] ?? ""
                                                        }
                                                        rows={2}
                                                      />
                                                    </label>
                                                  ),
                                                )}
                                                <button type="submit">
                                                  Simpan indikator
                                                </button>
                                              </form>
                                              {linkableAspects.length > 0 && (
                                                <form
                                                  action={linkIndicatorToAspect}
                                                  className="rubric-add-form"
                                                >
                                                  <input
                                                    type="hidden"
                                                    name="indicatorId"
                                                    value={indicator.id}
                                                  />
                                                  <label>
                                                    Tambahkan ke aspek lain
                                                    <select
                                                      name="aspectId"
                                                      required
                                                      defaultValue=""
                                                    >
                                                      <option value="" disabled>
                                                        Pilih aspek
                                                      </option>
                                                      {linkableAspects.map(
                                                        (item) => (
                                                          <option
                                                            key={item.id}
                                                            value={item.id}
                                                          >
                                                            {item.name}
                                                          </option>
                                                        ),
                                                      )}
                                                    </select>
                                                  </label>
                                                  <label>
                                                    Bobot indikator pada aspek
                                                    itu (%)
                                                    <input
                                                      required
                                                      type="number"
                                                      min="0.01"
                                                      max="100"
                                                      step="0.01"
                                                      name="weight"
                                                    />
                                                  </label>
                                                  <button type="submit">
                                                    Tambahkan pemetaan
                                                  </button>
                                                </form>
                                              )}
                                              {linkedAspectIds.size > 1 && (
                                                <form
                                                  action={
                                                    unlinkIndicatorFromAspect
                                                  }
                                                  className="rubric-add-form"
                                                >
                                                  <input
                                                    type="hidden"
                                                    name="mappingId"
                                                    value={mapping.id}
                                                  />
                                                  <input
                                                    type="hidden"
                                                    name="indicatorId"
                                                    value={indicator.id}
                                                  />
                                                  <button
                                                    type="submit"
                                                    className="remove-button"
                                                  >
                                                    Lepas dari aspek ini
                                                  </button>
                                                </form>
                                              )}
                                              <form
                                                action={
                                                  removeDraftIndicatorMapping
                                                }
                                                className="rubric-add-form"
                                              >
                                                <input
                                                  type="hidden"
                                                  name="mappingId"
                                                  value={mapping.id}
                                                />
                                                <input
                                                  type="hidden"
                                                  name="indicatorId"
                                                  value={indicator.id}
                                                />
                                                <button
                                                  type="submit"
                                                  className="remove-button"
                                                >
                                                  Hapus indikator dari aspek ini
                                                </button>
                                              </form>
                                            </details>
                                          )}
                                      </div>
                                    );
                                  })}
                                {version.status === "draft" &&
                                  canManageRubric && (
                                    <form
                                      action={addIndicator}
                                      className="rubric-add-form"
                                    >
                                      <input
                                        type="hidden"
                                        name="aspectId"
                                        value={aspect.id}
                                      />
                                      <label>
                                        Indikator
                                        <input
                                          required
                                          minLength={2}
                                          maxLength={200}
                                          name="name"
                                          placeholder="Tulis perilaku yang dapat diamati"
                                        />
                                      </label>
                                      <label>
                                        Target (opsional)
                                        <input maxLength={300} name="target" />
                                      </label>
                                      <label>
                                        Bobot pada aspek ini (%)
                                        <input
                                          required
                                          type="number"
                                          min="0.01"
                                          max="100"
                                          step="0.01"
                                          name="weight"
                                        />
                                      </label>
                                      {[1, 2, 3, 4, 5].map((score) => (
                                        <label key={score}>
                                          Uraian skor {score} ·{" "}
                                          {SCORE_SCALE_LABELS[score]}
                                          <textarea
                                            required
                                            minLength={3}
                                            maxLength={500}
                                            name={`descriptor${score}`}
                                            rows={2}
                                          />
                                        </label>
                                      ))}
                                      <button type="submit">
                                        Tambah indikator
                                      </button>
                                    </form>
                                  )}
                              </div>
                            ))}
                            {version.status === "draft" && canManageRubric && (
                              <>
                                <form
                                  action={addAspect}
                                  className="rubric-add-form"
                                >
                                  <input
                                    type="hidden"
                                    name="versionId"
                                    value={version.id}
                                  />
                                  <label>
                                    Nama aspek
                                    <input
                                      required
                                      minLength={2}
                                      maxLength={120}
                                      name="name"
                                      placeholder="Contoh: tentukan aspek bersama instruktur"
                                    />
                                  </label>
                                  <label>
                                    Bobot (%)
                                    <input
                                      required
                                      type="number"
                                      min="0.01"
                                      max="100"
                                      step="0.01"
                                      name="weight"
                                    />
                                  </label>
                                  <button type="submit">Tambah aspek</button>
                                </form>
                                <form action={activateRubric}>
                                  <input
                                    type="hidden"
                                    name="versionId"
                                    value={version.id}
                                  />
                                  <button
                                    className="rubric-activate"
                                    type="submit"
                                    disabled={!valid}
                                  >
                                    {valid
                                      ? "Aktifkan versi"
                                      : "Lengkapi aspek dan bobot hingga masing-masing 100%"}
                                  </button>
                                </form>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </>
                  )}
              </section>
            );
          })}
        </>
      )}
      <div className="users-notice">
        <strong>Skala indikator</strong>
        <p>
          1 = Sangat Kurang · 2 = Kurang · 3 = Cukup · 4 = Baik · 5 = Sangat
          Baik. Nilai harus bilangan bulat. Bobot indikator pada tiap aspek dan
          bobot antar-aspek harus masing-masing berjumlah 100%.
        </p>
      </div>
    </main>
  );
}
