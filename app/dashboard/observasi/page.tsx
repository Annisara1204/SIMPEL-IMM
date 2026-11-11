import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ObservationCell, type ScoreRevision } from "./observation-cell";
import { ObserverNotes, type NoteRecord } from "./observer-notes";
import { AssessmentRealtime } from "./assessment-realtime";
import { completeObserverAssignment, reopenObserverAssignment } from "../penilaian/actions";
import { calculateWeightedScore, categorizeScore, type ScoringAspect } from "@/lib/scoring";

type ObservationsPageProps = {
  searchParams: Promise<{ eventId?: string | string[]; stage?: string | string[]; materialId?: string | string[]; typeId?: string | string[] }>;
};

const stages = [
  { id: "screening", label: "1. Screening" },
  { id: "training", label: "2. Pelatihan" },
  { id: "follow_up", label: "3. Rencana Tindak Lanjut" },
] as const;

export default async function ObservationsPage({ searchParams }: ObservationsPageProps) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return <main className="setup-message"><h1>Supabase belum dikonfigurasi</h1><p>Atur koneksi lokal dan jalankan migrasi Tahap 4 sesuai README.md.</p><a href="/login">Kembali ke login</a></main>;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (!profile || !["admin_system", "observer", "instruktur"].includes(profile.role ?? "")) redirect("/dashboard");

  const params = await searchParams;
  const requestedEventId = Array.isArray(params.eventId) ? params.eventId[0] : params.eventId;
  const selectedStage = Array.isArray(params.stage) ? params.stage[0] : params.stage;
  const selectedMaterialId = Array.isArray(params.materialId) ? params.materialId[0] : params.materialId;
  const selectedTypeId = Array.isArray(params.typeId) ? params.typeId[0] : params.typeId;
  const { data: myAssignments } = profile.role === "observer"
    ? await supabase.from("observer_assignments").select("event_id").eq("observer_id", userId)
    : profile.role === "instruktur"
      ? await supabase.from("instructor_event_assignments").select("event_id").eq("instructor_id", userId)
    : { data: null };
  const assignedEventIds = myAssignments?.map((assignment) => assignment.event_id) ?? [];
  const eventQuery = supabase.from("events").select("id, name, starts_on, participants(id, display_name)").order("starts_on", { ascending: false });
  const [{ data: events, error: eventsError }, { data: versions, error: versionsError }, { data: assignments }, { data: types, error: typesError }, { data: materials, error: materialsError }] = await Promise.all([
    profile.role === "observer" ? (assignedEventIds.length ? eventQuery.in("id", assignedEventIds) : Promise.resolve({ data: [], error: null })) : eventQuery,
    supabase.from("rubric_versions").select("id, event_id, stage, material_id, assessment_type_id, version, rubric_aspects(id, name, weight, position, rubric_indicator_aspects(id, weight, rubric_indicators(id, name, target, position, score_descriptors)))").eq("status", "active").order("version", { ascending: false }),
    supabase.from("observer_assignments").select("id, event_id, observer_id"),
    supabase.from("rubric_assessment_types").select("id, event_id, stage, name, position").order("position"),
    supabase.from("rubric_materials").select("id, event_id, name, position").order("position"),
  ]);
  const selectedEvent = events?.find((event) => event.id === requestedEventId) ?? null;
  const selectedPhaseIsValid = stages.some((stage) => stage.id === selectedStage);
  const eventMaterials = (materials ?? []).filter((material) => material.event_id === selectedEvent?.id);
  const selectedMaterial = eventMaterials.find((material) => material.id === selectedMaterialId) ?? null;
  const eventTypes = (types ?? []).filter((type) => type.event_id === selectedEvent?.id && type.stage === selectedStage);
  const selectedType = eventTypes.find((type) => type.id === selectedTypeId) ?? null;
  const activeVersion = selectedEvent && selectedPhaseIsValid && selectedType && (selectedStage !== "training" || selectedMaterial)
    ? versions?.find((version) => version.event_id === selectedEvent.id && version.stage === selectedStage && version.assessment_type_id === selectedType.id && (selectedStage === "training" ? version.material_id === selectedMaterial?.id : version.material_id === null)) ?? null
    : null;

  const eventAssignments = (assignments ?? []).filter((assignment) => assignment.event_id === selectedEvent?.id);
  const { data: completions, error: completionsError } = activeVersion
    ? await supabase.from("observer_rubric_version_completions").select("assignment_id, completed_at").eq("rubric_version_id", activeVersion.id)
    : { data: [], error: null };
  const completedAssignments = eventAssignments.filter((assignment) => (completions ?? []).some((completion) => completion.assignment_id === assignment.id));
  const isOfficial = eventAssignments.length > 0 && completedAssignments.length === eventAssignments.length;
  const myAssignment = eventAssignments.find((assignment) => assignment.observer_id === userId);
  const myCompletion = myAssignment && (completions ?? []).some((completion) => completion.assignment_id === myAssignment.id);

  const [{ data: observations, error: observationError }, { data: observerNotes, error: notesError }] = activeVersion
    ? await Promise.all([
      supabase.from("observations").select("participant_id, indicator_id, score, note, revision, updated_at, updated_by_name, updated_by, observation_revisions(score, note, revision, changed_at, actor_name, score_after, note_after)"),
      supabase.from("observer_notes").select("id, participant_id, rubric_version_id, indicator_id, author_id, author_name, note_type, content, revision, updated_at, observer_note_revisions(id, content_before, content_after, revision, actor_name, changed_at)").eq("rubric_version_id", activeVersion.id),
    ])
    : [{ data: [], error: null }, { data: [], error: null }];
  const observationMap = new Map((observations ?? []).map((item) => [`${item.participant_id}:${item.indicator_id}`, item]));
  const stageLabel = stages.find((stage) => stage.id === selectedStage)?.label;

  return <main className="users-page">
    <a className="users-back" href="/dashboard">← Kembali ke dashboard</a>
    <div className="users-heading"><div><p className="login-eyebrow">TAHAP 4 · LEMBAR BERSAMA</p><h1>Observasi</h1><p>{profile.role === "instruktur" ? "Subrole Instruktur yang ditugaskan dapat menginput nilai dan catatan pada kegiatan ini." : "Pilih kegiatan, tahap, dan jenis penilaian. Perubahan nilai disimpan otomatis."} Setiap perubahan nilai dan catatan masuk ke riwayat.</p></div><span className="temporary-pill">AKSES BERDASARKAN PENUGASAN</span></div>
    {(eventsError || versionsError || typesError || materialsError || completionsError || observationError || notesError) && <p className="users-error">Sebagian data belum dapat dibaca. Pastikan migrasi engine rubrik terbaru sudah dijalankan.</p>}

    {!requestedEventId && <section className="event-manage-card"><h2>Pilih kegiatan DAD</h2><p>{profile.role === "observer" ? "Daftar hanya menampilkan kegiatan yang ditugaskan kepada Observer." : profile.role === "instruktur" ? "Daftar hanya menampilkan kegiatan dengan penugasan subrole Instruktur kepada Anda." : "Pilih kegiatan yang ingin ditinjau."}</p>{events?.length ? <div className="assessment-event-list">{events.map((event) => <a className="assessment-event-option" href={`/dashboard/observasi?eventId=${event.id}`} key={event.id}><span className="assessment-event-main"><strong>{event.name}</strong><small>{event.participants.length} peserta</small></span><span className="assessment-event-arrow">→</span></a>)}</div> : <p className="users-empty">{profile.role === "observer" || profile.role === "instruktur" ? "Belum ada kegiatan yang ditugaskan kepada Anda." : "Belum ada kegiatan."}</p>}</section>}

    {requestedEventId && !selectedEvent && <p className="users-error">Kegiatan tidak ditemukan atau Anda tidak ditugaskan padanya.</p>}

    {selectedEvent && <>
      <a className="users-back" href="/dashboard/observasi">← Pilih kegiatan lain</a>
      {!selectedStage && <section className="event-manage-card"><div className="event-manage-title"><div><h2>{selectedEvent.name}</h2><p>Pilih tahap yang akan dinilai.</p></div></div><div className="assessment-event-list">{stages.map((stage) => <a className="assessment-event-option" key={stage.id} href={`/dashboard/observasi?eventId=${selectedEvent.id}&stage=${stage.id}`}><strong>{stage.label}</strong><span className="assessment-event-arrow">→</span></a>)}</div></section>}
      {selectedStage && !selectedPhaseIsValid && <p className="users-error">Tahap tidak dikenali. Kembali dan pilih Screening, Pelatihan, atau Rencana Tindak Lanjut.</p>}

      {selectedEvent && selectedStage === "training" && !selectedMaterialId && <section className="event-manage-card"><a className="users-back" href={`/dashboard/observasi?eventId=${selectedEvent.id}`}>← Pilih tahap lain</a><h2>{selectedEvent.name} · Pelatihan</h2><p>Pilih materi yang akan dinilai.</p>{eventMaterials.length ? <div className="assessment-event-list">{eventMaterials.map((material) => <a className="assessment-event-option" href={`/dashboard/observasi?eventId=${selectedEvent.id}&stage=training&materialId=${material.id}`} key={material.id}><strong>{material.name}</strong><span className="assessment-event-arrow">→</span></a>)}</div> : <p className="users-empty">Belum ada materi. Minta Super Admin menambah materi dan mengaktifkan rubriknya.</p>}</section>}
      {selectedEvent && selectedStage === "training" && selectedMaterialId && !selectedMaterial && <p className="users-error">Materi tidak ditemukan pada kegiatan ini.</p>}
      {selectedEvent && selectedPhaseIsValid && (selectedStage !== "training" || selectedMaterial) && !selectedTypeId && <section className="event-manage-card"><a className="users-back" href={selectedStage === "training" ? `/dashboard/observasi?eventId=${selectedEvent.id}&stage=training` : `/dashboard/observasi?eventId=${selectedEvent.id}`}>← {selectedStage === "training" ? "Pilih materi lain" : "Pilih tahap lain"}</a><h2>{selectedEvent.name} · {stageLabel}{selectedMaterial ? ` · ${selectedMaterial.name}` : ""}</h2><p>Pilih jenis penilaian yang ingin diisi.</p>{eventTypes.length ? <div className="assessment-event-list">{eventTypes.map((type) => <a className="assessment-event-option" href={`/dashboard/observasi?eventId=${selectedEvent.id}&stage=${selectedStage}${selectedMaterial ? `&materialId=${selectedMaterial.id}` : ""}&typeId=${type.id}`} key={type.id}><strong>{type.name}</strong><span>{(versions ?? []).some((version) => version.event_id === selectedEvent.id && version.stage === selectedStage && version.assessment_type_id === type.id && (selectedStage === "training" ? version.material_id === selectedMaterial?.id : version.material_id === null)) ? "Rubrik aktif" : "Rubrik belum aktif"}</span><span className="assessment-event-arrow">→</span></a>)}</div> : <p className="users-empty">Belum ada jenis penilaian untuk pilihan ini. Minta Super Admin menambah jenis dan mengaktifkan rubriknya.</p>}</section>}

      {selectedEvent && selectedPhaseIsValid && selectedTypeId && !selectedType && <p className="users-error">Jenis penilaian tidak ditemukan untuk tahap ini.</p>}

      {selectedEvent && selectedPhaseIsValid && selectedType && (selectedStage !== "training" || selectedMaterial) && <>
        <a className="users-back" href={`/dashboard/observasi?eventId=${selectedEvent.id}&stage=${selectedStage}${selectedMaterial ? `&materialId=${selectedMaterial.id}` : ""}`}>← Pilih jenis penilaian lain</a>
        <section className="event-manage-card">
          <div className="event-manage-title"><div><p className="login-eyebrow">{stageLabel}{selectedMaterial ? ` · ${selectedMaterial.name}` : ""} · {selectedType.name}</p><h2>{selectedEvent.name}</h2><p>{selectedEvent.participants.length} peserta{profile.role === "instruktur" ? " · akses dari penugasan subrole Instruktur" : ` · ${completedAssignments.length} dari ${eventAssignments.length} Observer selesai untuk rubrik ini`}</p></div><span className={`agenda-status ${isOfficial ? "done" : "next"}`}>{isOfficial ? "Nilai resmi" : "Nilai sementara"}</span>{activeVersion && <AssessmentRealtime versionId={activeVersion.id}/>}</div>
          {activeVersion && myAssignment && <div className="observer-completion">{myCompletion ? <><span>Penilaian ini sudah Anda tandai selesai.</span><form action={reopenObserverAssignment}><input type="hidden" name="eventId" value={selectedEvent.id}/><input type="hidden" name="versionId" value={activeVersion.id}/><button className="remove-button" type="submit">Buka kembali penilaian</button></form></> : <><span>Setelah seluruh peserta dan indikator ditinjau, tandai rubrik ini selesai.</span><form action={completeObserverAssignment}><input type="hidden" name="eventId" value={selectedEvent.id}/><input type="hidden" name="versionId" value={activeVersion.id}/><button className="rubric-activate" type="submit">Tandai penilaian ini selesai</button></form></>}</div>}
          {!activeVersion ? <p className="users-empty">Belum ada rubrik aktif untuk jenis penilaian ini. Hubungi Super Admin.</p> : selectedEvent.participants.map((participant) => {
            const scoringAspects = activeVersion.rubric_aspects.map((aspect) => ({ id: aspect.id, weight: aspect.weight, rubric_indicators: (aspect.rubric_indicator_aspects ?? []).flatMap((mapping) => { const indicator = mapping.rubric_indicators?.[0]; return indicator ? [{ id: indicator.id, weight: mapping.weight }] : []; }) })) as ScoringAspect[];
            const allIndicatorIds = new Set(scoringAspects.flatMap((aspect) => aspect.rubric_indicators.map((indicator) => indicator.id)));
            const participantObservations = (observations ?? []).filter((item) => item.participant_id === participant.id && allIndicatorIds.has(item.indicator_id));
            const participantScores = new Map(participantObservations.map((item) => [item.indicator_id, { score: item.score }]));
            const calculated = calculateWeightedScore(scoringAspects, participantScores);
            const category = categorizeScore(calculated.value);
            return <details className="observation-participant" key={participant.id}><summary>{participant.display_name}</summary>
              <div className="score-summary"><strong>{calculated.value === null ? "Belum ada nilai teramati" : `${isOfficial ? "Nilai resmi" : "Nilai sementara"}: ${calculated.value.toFixed(2)} / 100`}</strong>{category && <span className={`score-category ${category.id}`}>{category.label}</span>}<small>{calculated.observedIndicators} indikator teramati · {calculated.includedAspects.length} aspek masuk perhitungan</small></div>
              {[...activeVersion.rubric_aspects].sort((a, b) => a.position - b.position).map((aspect) => <div className="observation-aspect" key={aspect.id}><h3>{aspect.name} <small>{Number(aspect.weight).toFixed(2)}%</small></h3>{[...(aspect.rubric_indicator_aspects ?? [])].sort((a, b) => (a.rubric_indicators?.[0]?.position ?? 0) - (b.rubric_indicators?.[0]?.position ?? 0)).map((mapping) => {
                const indicator = mapping.rubric_indicators?.[0];
                if (!indicator) return null;
                const saved = observationMap.get(`${participant.id}:${indicator.id}`);
                return <div className="observation-indicator" key={mapping.id}><div><strong>{indicator.name}</strong>{indicator.target && <small>Target: {indicator.target}</small>}<small>Bobot {Number(mapping.weight).toFixed(2)}% dalam aspek</small></div><ObservationCell participantId={participant.id} indicatorId={indicator.id} currentUserId={userId} score={saved?.score ?? null} revision={saved?.revision ?? 0} updatedAt={saved?.updated_at ?? null} updatedByName={saved?.updated_by_name ?? null} updatedById={saved?.updated_by ?? null} descriptors={indicator.score_descriptors} history={(saved?.observation_revisions ?? []) as ScoreRevision[]}/></div>;
              })}</div>)}
              <ObserverNotes participantId={participant.id} rubricVersionId={activeVersion.id} currentUserId={userId} notes={(observerNotes ?? []).filter((note) => note.participant_id === participant.id) as NoteRecord[]}/>
            </details>;
          })}
        </section>
      </>}
    </>}

    <div className="users-notice"><strong>Skala dan rumus nilai</strong><p>1 = Sangat Kurang · 2 = Kurang · 3 = Cukup · 4 = Baik · 5 = Sangat Baik. Indikator yang belum diamati diabaikan; bobot indikator teramati dinormalisasi dalam aspeknya. Aspek tanpa indikator teramati dikeluarkan dan bobot aspek lain dinormalisasi. Rata-rata berbobot skala 1–5 diubah ke 0–100 dengan rumus (rata-rata − 1) ÷ 4 × 100. Angka ditampilkan dua desimal.</p></div>
    <p className="privacy-note">Skor bersama, riwayat perubahan, dan catatan per penulis hanya dapat dibaca Admin Sistem serta Observer dan Instruktur yang ditugaskan pada kegiatan. Keamanan penugasan juga diperiksa oleh kebijakan baris basis data.</p>
  </main>;
}
