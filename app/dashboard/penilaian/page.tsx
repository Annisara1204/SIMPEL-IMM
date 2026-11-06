import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { activateRubric, addAspect, addIndicator, assignObserver, createAssessmentType, createRubricVersion, editAspect, editIndicator, removeObserverAssignment } from "./actions";

type AssessmentSettingsPageProps = { searchParams: Promise<{ eventId?: string | string[]; stage?: string | string[]; typeId?: string | string[]; assignment?: string | string[] }> };

export default async function AssessmentSettingsPage({ searchParams }: AssessmentSettingsPageProps) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return <main className="setup-message"><h1>Supabase belum dikonfigurasi</h1><p>Atur koneksi lokal dan jalankan migrasi Tahap 4 sesuai README.md.</p><a href="/login">Kembali ke login</a></main>;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (!profile || !["admin_system", "bidang_kader"].includes(profile.role ?? "")) redirect("/dashboard");
  const params = await searchParams;
  const requestedEventId = Array.isArray(params.eventId) ? params.eventId[0] : params.eventId;
  const assignmentStatus = Array.isArray(params.assignment) ? params.assignment[0] : params.assignment;
  const selectedStage = Array.isArray(params.stage) ? params.stage[0] : params.stage;
  const selectedTypeId = Array.isArray(params.typeId) ? params.typeId[0] : params.typeId;
  const [{ data: events, error: eventsError }, { data: versions, error: versionsError }, { data: assessmentTypes, error: typesError }, { data: observers }, { data: assignments }] = await Promise.all([
    supabase.from("events").select("id, name, starts_on, ends_on, status").order("starts_on", { ascending: false }),
    supabase.from("rubric_versions").select("id, event_id, stage, assessment_type_id, version, status, created_at, rubric_aspects(id, name, weight, position, rubric_indicators(id, name, weight, target, position))").order("version", { ascending: false }),
    supabase.from("rubric_assessment_types").select("id, event_id, stage, name, position").order("position"),
    supabase.from("profiles").select("id, display_name").eq("role", "observer").order("display_name"),
    supabase.from("observer_assignments").select("id, event_id, observer_id"),
  ]);
  const selectedEvent = events?.find((event) => event.id === requestedEventId) ?? null;
  const canManageRubric = profile.role === "admin_system";
  return <main className="users-page">
    <a className="users-back" href="/dashboard">← Kembali ke dashboard</a>
    <div className="users-heading"><div><p className="login-eyebrow">TAHAP 4 · KONFIGURASI</p><h1>Pengaturan Penilaian</h1><p>Susun aspek dan indikator sesuai kesepakatan instruktur. Versi aktif tidak dapat diedit.</p></div><span className="sample-tag">BELUM ADA RUBRIK SIMULASI</span></div>
    {!canManageRubric && <p className="users-notice"><strong>Pengelolaan rubrik oleh Super Admin.</strong> Anda dapat melihat rubrik dan mengatur penugasan Observer, tetapi pembuatan, perubahan, dan aktivasi rubrik hanya dapat dilakukan Admin Sistem.</p>}
    {(eventsError || versionsError || typesError) && <p className="users-error">Data belum dapat dibaca. Jalankan migrasi Tahap 4 di Supabase.</p>}
    {!requestedEventId && <section className="event-manage-card"><div className="event-manage-title"><div><h2>Pilih kegiatan DAD</h2><p>Pilih kegiatan untuk mengatur rubrik dan menentukan Observer yang boleh membuka penilaian.</p></div></div>
      {events?.length ? <div className="assessment-event-list">{events.map((event) => {
        const observerCount = (assignments ?? []).filter((assignment) => assignment.event_id === event.id).length;
        return <a className="assessment-event-option" href={`/dashboard/penilaian?eventId=${encodeURIComponent(event.id)}`} key={event.id}>
          <span className="assessment-event-main"><strong>{event.name}</strong><small>{new Date(`${event.starts_on}T00:00:00`).toLocaleDateString("id-ID", { dateStyle: "medium" })} – {new Date(`${event.ends_on}T00:00:00`).toLocaleDateString("id-ID", { dateStyle: "medium" })}</small></span>
          <span className="assessment-event-meta"><span className={`agenda-status ${event.status === "ongoing" ? "live" : event.status === "completed" ? "done" : "next"}`}>{event.status === "ongoing" ? "Berlangsung" : event.status === "completed" ? "Selesai" : "Terencana"}</span><small>{observerCount} Observer ditugaskan</small></span>
          <span className="assessment-event-arrow" aria-hidden="true">→</span>
        </a>;
      })}</div> : !eventsError && <p className="users-empty">Belum ada kegiatan DAD. Buat kegiatan dahulu melalui menu Kegiatan DAD.</p>}
    </section>}
    {requestedEventId && !selectedEvent && <div className="users-notice"><strong>Kegiatan tidak ditemukan</strong><p>Pilih kegiatan dari daftar agar pengaturan dan penugasan Observer terhubung ke kegiatan yang benar.</p><a className="text-button" href="/dashboard/penilaian">Kembali ke daftar kegiatan</a></div>}
    {selectedEvent && <><a className="users-back" href="/dashboard/penilaian">← Kembali ke daftar kegiatan DAD</a>{assignmentStatus === "success" && <p className="users-notice"><strong>Observer berhasil ditugaskan.</strong> Akun tersebut sekarang dapat membuka kegiatan ini dari menu Observasi.</p>}{assignmentStatus === "already" && <p className="users-notice"><strong>Observer sudah ditugaskan.</strong> Akun itu sudah memiliki akses untuk kegiatan ini.</p>}{assignmentStatus === "error" && <p className="users-error">Penugasan belum berhasil disimpan. Muat ulang halaman dan coba lagi.</p>}{[selectedEvent].map((event) => {
      const eventTypes = (assessmentTypes ?? []).filter((type) => type.event_id === event.id && type.stage === selectedStage);
      const eventVersions = (versions ?? []).filter((version) => version.event_id === event.id && version.stage === selectedStage && version.assessment_type_id === selectedTypeId);
      const eventAssignments = (assignments ?? []).filter((assignment) => assignment.event_id === event.id);
      const assignedObserverIds = new Set(eventAssignments.map((assignment) => assignment.observer_id));
      const availableObservers = (observers ?? []).filter((observer) => !assignedObserverIds.has(observer.id));
      return <section className="event-manage-card" key={event.id}>
        <div className="event-manage-title"><div><p className="login-eyebrow">KEGIATAN TERPILIH</p><h2>{event.name}</h2><p>Setiap versi menyimpan susunan rubrik dan bobotnya sendiri.</p></div><span className={`agenda-status ${event.status === "ongoing" ? "live" : event.status === "completed" ? "done" : "next"}`}>{event.status === "ongoing" ? "Berlangsung" : event.status === "completed" ? "Selesai" : "Terencana"}</span></div>
        <div className="assignment-box"><h3>Observer yang ditugaskan</h3>{eventAssignments.map((assignment) => <div className="assignment-row" key={assignment.id}><span>{observers?.find((observer) => observer.id === assignment.observer_id)?.display_name || "Akun Observer"}</span><form action={removeObserverAssignment}><input type="hidden" name="assignmentId" value={assignment.id}/><button type="submit" className="remove-button">Cabut akses</button></form></div>)}{!eventAssignments.length && <p className="assessment-assignment-empty">Belum ada Observer yang mendapat akses ke penilaian kegiatan ini.</p>}<form action={assignObserver} className="commission-add-form"><input type="hidden" name="eventId" value={event.id}/><label>Tugaskan Observer<select required name="observerId" defaultValue=""><option value="" disabled>{availableObservers.length ? "Pilih akun Observer" : "Semua Observer sudah ditugaskan"}</option>{availableObservers.map((observer) => <option key={observer.id} value={observer.id}>{observer.display_name || "Observer tanpa nama"}</option>)}</select></label><button type="submit" disabled={!availableObservers.length}>Tugaskan</button></form><p className="assessment-assignment-hint">Observer yang ditugaskan dapat membuka kegiatan ini melalui menu Observasi.</p></div>
        {!selectedStage && <div className="event-manage-card"><h3>Pilih tahapan penilaian</h3><p>Pengaturan tersedia untuk Screening dan Pelatihan. Rencana Tindak Lanjut belum dibuka.</p><div className="assessment-event-list">{[{id:"screening",label:"1. Screening"},{id:"training",label:"2. Pelatihan"}].map((stage) => <a className="assessment-event-option" key={stage.id} href={`/dashboard/penilaian?eventId=${event.id}&stage=${stage.id}`}><strong>{stage.label}</strong><span className="assessment-event-arrow">→</span></a>)}<div className="assessment-event-option" aria-disabled="true"><strong>3. Rencana Tindak Lanjut</strong><small>Belum tersedia</small></div></div></div>}
        {selectedStage && !["screening", "training"].includes(selectedStage) && <p className="users-error">Tahap tidak dikenali. Pilih Screening atau Pelatihan.</p>}
        {selectedStage && ["screening", "training"].includes(selectedStage) && <><a className="users-back" href={`/dashboard/penilaian?eventId=${event.id}`}>← Pilih tahapan lain</a><div className="assignment-box"><h3>{selectedStage === "screening" ? "Tahap 1 · Screening" : "Tahap 2 · Pelatihan"}</h3><p>Pilih jenis penilaian. Setiap jenis memiliki versi, aspek, indikator, dan bobot sendiri.</p>{eventTypes.map((type) => <a className="assessment-event-option" key={type.id} href={`/dashboard/penilaian?eventId=${event.id}&stage=${selectedStage}&typeId=${type.id}`}><strong>{type.name}</strong><span className="assessment-event-arrow">→</span></a>)}{canManageRubric && <form action={createAssessmentType} className="rubric-add-form"><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="stage" value={selectedStage}/><label>Tambah jenis penilaian<input required minLength={2} maxLength={80} name="name" placeholder="Contoh: Observasi"/></label><button type="submit">Tambah jenis</button></form>}</div></>}
        {selectedStage && selectedTypeId && !eventTypes.some((type) => type.id === selectedTypeId) && <p className="users-error">Jenis penilaian tidak ditemukan pada tahap ini.</p>}
        {selectedStage && selectedTypeId && eventTypes.some((type) => type.id === selectedTypeId) && <>
        <h3>Rubrik: {eventTypes.find((type) => type.id === selectedTypeId)?.name}</h3>
        {!eventVersions.length && canManageRubric && <form action={createRubricVersion} className="participant-add-form"><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="stage" value={selectedStage}/><input type="hidden" name="assessmentTypeId" value={selectedTypeId}/><button type="submit">Buat versi 1 (draf)</button></form>}
        {!eventVersions.length && !canManageRubric && <p className="assessment-assignment-empty">Rubrik belum dibuat. Minta Super Admin menyiapkan rubrik untuk jenis ini.</p>}
        {eventVersions.map((version) => {
          const aspects = [...(version.rubric_aspects ?? [])].sort((a, b) => a.position - b.position);
          const aspectTotal = aspects.reduce((sum, aspect) => sum + Number(aspect.weight), 0);
          const valid = aspects.length > 0 && Math.abs(aspectTotal - 100) < 0.001 && aspects.every((aspect) => aspect.rubric_indicators.length > 0 && Math.abs(aspect.rubric_indicators.reduce((sum, indicator) => sum + Number(indicator.weight), 0) - 100) < 0.001);
          return <div className="rubric-version" key={version.id}>
            <div className="event-manage-title"><div><h3>Versi {version.version}</h3><p>Bobot aspek: {aspectTotal.toFixed(2)}% · Aspek tanpa indikator diamati akan dikecualikan dan bobot aspek lain dinormalisasi ulang.</p></div><span className={`agenda-status ${version.status === "active" ? "done" : "next"}`}>{version.status === "active" ? "Aktif" : version.status === "archived" ? "Diarsipkan" : "Draf"}</span></div>
            {aspects.map((aspect) => <div className="rubric-aspect" key={aspect.id}><strong>{aspect.name} <span>{Number(aspect.weight).toFixed(2)}%</span></strong>{version.status === "draft" && canManageRubric && <form action={editAspect} className="rubric-add-form"><input type="hidden" name="aspectId" value={aspect.id}/><label>Ubah nama aspek<input required minLength={2} maxLength={120} name="name" defaultValue={aspect.name}/></label><label>Bobot (%)<input required type="number" min="0.01" max="100" step="0.01" name="weight" defaultValue={aspect.weight}/></label><button type="submit">Simpan aspek</button></form>}{aspect.rubric_indicators.sort((a, b) => a.position - b.position).map((indicator) => <div className="rubric-indicator" key={indicator.id}><div><b>{indicator.name}</b>{indicator.target && <small>Target: {indicator.target}</small>}</div><span>{Number(indicator.weight).toFixed(2)}%</span>{version.status === "draft" && canManageRubric && <details className="rubric-edit"><summary>Ubah</summary><form action={editIndicator} className="rubric-add-form"><input type="hidden" name="indicatorId" value={indicator.id}/><label>Nama indikator<input required minLength={2} maxLength={200} name="name" defaultValue={indicator.name}/></label><label>Target (opsional)<input maxLength={300} name="target" defaultValue={indicator.target ?? ""}/></label><label>Bobot (%)<input required type="number" min="0.01" max="100" step="0.01" name="weight" defaultValue={indicator.weight}/></label><button type="submit">Simpan</button></form></details>}</div>)}
              {version.status === "draft" && canManageRubric && <form action={addIndicator} className="rubric-add-form"><input type="hidden" name="aspectId" value={aspect.id}/><label>Indikator<input required minLength={2} maxLength={200} name="name" placeholder="Tulis perilaku yang dapat diamati"/></label><label>Target (opsional)<input maxLength={300} name="target"/></label><label>Bobot (%)<input required type="number" min="0.01" max="100" step="0.01" name="weight"/></label><button type="submit">Tambah indikator</button></form>}
            </div>)}
            {version.status === "draft" && canManageRubric && <><form action={addAspect} className="rubric-add-form"><input type="hidden" name="versionId" value={version.id}/><label>Nama aspek<input required minLength={2} maxLength={120} name="name" placeholder="Contoh: tentukan aspek bersama instruktur"/></label><label>Bobot (%)<input required type="number" min="0.01" max="100" step="0.01" name="weight"/></label><button type="submit">Tambah aspek</button></form><form action={activateRubric}><input type="hidden" name="versionId" value={version.id}/><button className="rubric-activate" type="submit" disabled={!valid}>{valid ? "Aktifkan versi" : "Lengkapi aspek dan bobot hingga masing-masing 100%"}</button></form></>}
          </div>;
        })}
        {canManageRubric && eventVersions.length > 0 && !eventVersions.some((version) => version.status === "draft") && <form action={createRubricVersion} className="participant-add-form"><input type="hidden" name="eventId" value={event.id}/><input type="hidden" name="stage" value={selectedStage}/><input type="hidden" name="assessmentTypeId" value={selectedTypeId}/><button type="submit">Buat versi draf berikutnya</button></form>}
        </>}
      </section>;
    })}
    </>}
    <div className="users-notice"><strong>Skala indikator</strong><p>1 = Belum terlihat · 2 = Mulai berkembang · 3 = Cukup · 4 = Baik · 5 = Sangat baik. Nilai harus bilangan bulat. Bobot indikator pada tiap aspek dan bobot antar-aspek harus masing-masing berjumlah 100%.</p></div>
  </main>;
}
