import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  publishAdministrativeResults,
  saveAdministrativeDecision,
  startReview,
} from "./actions";

const labels: Record<string, string> = {
  submitted: "Menunggu tinjauan",
  under_review: "Sedang ditinjau",
  administrative_published: "Hasil administrasi diterbitkan",
  screening: "Tahap screening",
  screening_published: "Hasil screening diterbitkan",
};

export default async function CommissariatReviewPage() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
    return (
      <main className="setup-message">
        <h1>Supabase belum dikonfigurasi</h1>
        <p>Atur koneksi lokal dan jalankan migrasi pengajuan Komisariat.</p>
        <a href="/login">Kembali ke login</a>
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
  if (!profile || !["observer", "admin_system"].includes(profile.role))
    redirect("/dashboard");

  const [{ data: submissions, error }, { data: events }] = await Promise.all([
    supabase
      .from("commissariat_submissions")
      .select(
        "id, event_id, commissariat_id, status, mandate_path, submitted_at, review_started_at, commissariat:commissariats(name), participants:commissariat_submission_participants(id, display_name, major, entry_year, position, photo_path, decisions:commissariat_submission_decisions(id, stage, status, public_reason, internal_note:commissariat_submission_internal_notes(note)) )",
      )
      .in("status", [
        "submitted",
        "under_review",
        "administrative_published",
        "screening",
        "screening_published",
      ])
      .order("submitted_at", { ascending: true }),
    supabase.from("events").select("id, name"),
  ]);

  const rows = await Promise.all(
    (submissions ?? []).map(async (submission) => {
      const mandateUrl = submission.mandate_path
        ? ((
            await supabase.storage
              .from("commissariat-mandates")
              .createSignedUrl(submission.mandate_path, 1800)
          ).data?.signedUrl ?? null)
        : null;
      const participants = await Promise.all(
        submission.participants.map(async (person) => ({
          ...person,
          photoUrl: person.photo_path
            ? ((
                await supabase.storage
                  .from("submission-photos")
                  .createSignedUrl(person.photo_path, 1800)
              ).data?.signedUrl ?? null)
            : null,
        })),
      );
      return { ...submission, mandateUrl, participants };
    }),
  );

  return (
    <main className="users-page">
      <a className="users-back" href="/dashboard">
        ← Kembali ke dashboard
      </a>
      <div className="users-heading">
        <div>
          <p className="login-eyebrow">TINJAUAN OBSERVER</p>
          <h1>Seleksi Komisariat</h1>
          <p>
            Periksa berkas dan tetapkan hasil administrasi. Catatan internal
            hanya terlihat oleh peninjau.
          </p>
        </div>
      </div>
      {error && (
        <p className="users-error">
          Daftar pengajuan gagal dimuat. Pastikan migrasi pengajuan Komisariat
          sudah dijalankan.
        </p>
      )}
      {!rows.length && !error && (
        <p className="users-empty">
          Belum ada pengajuan yang menunggu atau memiliki hasil.
        </p>
      )}
      {rows.map((submission) => {
        const eventName =
          events?.find((item) => item.id === submission.event_id)?.name ??
          "Kegiatan";
        const commissariatName = submission.commissariat?.[0]?.name;
        const decisions = submission.participants
          .flatMap((person) => person.decisions ?? [])
          .filter((decision) => decision.stage === "administrative");
        const complete =
          submission.participants.length > 0 &&
          decisions.length === submission.participants.length;
        const editable = submission.status === "under_review";
        return (
          <section className="event-manage-card" key={submission.id}>
            <div className="event-manage-title">
              <div>
                <h2>{eventName}</h2>
                <p>
                  {commissariatName ?? "Komisariat"} ·{" "}
                  {submission.participants.length} peserta
                  {submission.submitted_at
                    ? ` · Dikirim ${new Date(submission.submitted_at).toLocaleDateString("id-ID", { dateStyle: "medium" })}`
                    : ""}
                </p>
              </div>
              <span className={`agenda-status ${editable ? "live" : "next"}`}>
                {labels[submission.status] ?? submission.status}
              </span>
            </div>
            {submission.mandateUrl && (
              <p>
                <a
                  className="text-button"
                  href={submission.mandateUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Buka Surat Mandat PDF ↗
                </a>
              </p>
            )}
            {submission.status === "submitted" && (
              <form action={startReview} className="application-actions">
                <input
                  type="hidden"
                  name="submissionId"
                  value={submission.id}
                />
                <button className="rubric-activate" type="submit">
                  Mulai tinjauan dan kunci pengajuan
                </button>
                <span>
                  Setelah dimulai, Komisariat tidak dapat mengubah daftar
                  peserta atau berkas.
                </span>
              </form>
            )}
            {submission.participants.map((person) => {
              const decision = person.decisions?.find(
                (item) => item.stage === "administrative",
              );
              const note = decision?.internal_note?.[0]?.note ?? "";
              return (
                <article
                  className="observer-application-person"
                  key={person.id}
                >
                  {person.photoUrl && (
                    <a href={person.photoUrl} target="_blank" rel="noreferrer">
                      <img
                        className="participant-photo-thumb"
                        src={person.photoUrl}
                        alt={`Foto ${person.display_name}`}
                      />
                    </a>
                  )}
                  <div className="observer-application-details">
                    <h3>{person.display_name}</h3>
                    <p>
                      {person.major} · Angkatan {person.entry_year}
                      {person.position ? ` · ${person.position}` : ""}
                    </p>
                    {editable ? (
                      <form
                        action={saveAdministrativeDecision}
                        className="observer-decision-form"
                      >
                        <input
                          type="hidden"
                          name="participantId"
                          value={person.id}
                        />
                        <label>
                          Keputusan administrasi *
                          <select
                            name="status"
                            defaultValue={decision?.status ?? "pass"}
                          >
                            <option value="pass">Lolos administrasi</option>
                            <option value="fail">
                              Tidak lolos administrasi
                            </option>
                          </select>
                        </label>
                        <label>
                          Alasan singkat untuk Komisariat (wajib jika tidak
                          lolos)
                          <textarea
                            name="publicReason"
                            maxLength={500}
                            defaultValue={decision?.public_reason ?? ""}
                            placeholder="Alasan yang dapat dibagikan kepada Komisariat"
                          />
                        </label>
                        <label>
                          Catatan internal Observer (opsional)
                          <textarea
                            name="internalNote"
                            maxLength={2000}
                            defaultValue={note}
                            placeholder="Hanya dapat dilihat Observer yang ditugaskan dan Admin Sistem"
                          />
                        </label>
                        <button type="submit">Simpan keputusan</button>
                      </form>
                    ) : decision ? (
                      <div className="observer-decision-summary">
                        <strong>
                          {decision.status === "pass"
                            ? "Lolos administrasi"
                            : "Tidak lolos administrasi"}
                        </strong>
                        {decision.public_reason && (
                          <p>Alasan: {decision.public_reason}</p>
                        )}
                      </div>
                    ) : (
                      <p className="users-empty">Belum ada keputusan.</p>
                    )}
                  </div>
                </article>
              );
            })}
            {editable && (
              <form
                action={publishAdministrativeResults}
                className="application-actions"
              >
                <input
                  type="hidden"
                  name="submissionId"
                  value={submission.id}
                />
                <button
                  className="rubric-activate"
                  type="submit"
                  disabled={!complete}
                >
                  Terbitkan hasil administrasi
                </button>
                <span>
                  {complete
                    ? "Komisariat akan dapat melihat hasil setelah diterbitkan."
                    : `Simpan keputusan untuk semua peserta dahulu (${decisions.length}/${submission.participants.length}).`}
                </span>
              </form>
            )}
            {submission.status === "administrative_published" && (
              <p className="privacy-note">
                Hasil administrasi sudah diterbitkan kepada Komisariat.
              </p>
            )}
          </section>
        );
      })}
    </main>
  );
}
