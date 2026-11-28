import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signMany } from "@/lib/signed-urls";
import { createSubmission } from "./actions";
import { DataUnavailable } from "@/components/data-unavailable";
import { SubmissionCard } from "@/components/submission-card";

export default async function CommissariatApplicationsPage() {
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
  if (!userId) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, commissariat_id")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.role !== "komisariat") redirect("/dashboard");
  if (!profile.commissariat_id)
    return (
      <div className="users-page">
        <div className="notice">
          <strong>Akun Komisariat belum ditautkan</strong>
          <p>
            Minta Admin Sistem mengaitkan akun Anda ke Komisariat yang benar
            melalui menu Pengguna.
          </p>
        </div>
      </div>
    );

  const [
    { data: commissariat },
    { data: events, error: eventError },
    { data: submissions, error: submissionError },
  ] = await Promise.all([
    supabase
      .from("commissariats")
      .select("id, name, is_active")
      .eq("id", profile.commissariat_id)
      .maybeSingle(),
    supabase
      .from("events")
      .select("id, name, starts_on, ends_on, status")
      .is("archived_at", null)
      .order("starts_on", { ascending: true }),
    supabase
      .from("commissariat_submissions")
      .select(
        "id, event_id, commissariat_id, status, mandate_path, created_at, submitted_at, review_started_at, participants:commissariat_submission_participants(id, display_name, major, entry_year, position, photo_path, created_at, decisions:commissariat_submission_decisions(stage, status, public_reason))",
      )
      .eq("commissariat_id", profile.commissariat_id)
      .order("created_at", { ascending: false }),
  ]);
  const [mandateUrls, submissionPhotoUrls] = await Promise.all([
    signMany(
      supabase,
      "commissariat-mandates",
      (submissions ?? []).map((submission) => submission.mandate_path),
      3600,
    ),
    signMany(
      supabase,
      "submission-photos",
      (submissions ?? []).flatMap((submission) =>
        submission.participants.map((person) => person.photo_path),
      ),
      3600,
    ),
  ]);
  const submissionsWithFiles = (submissions ?? []).map((submission) => ({
    ...submission,
    mandateUrl: submission.mandate_path
      ? (mandateUrls.get(submission.mandate_path) ?? null)
      : null,
    participants: submission.participants.map((person) => ({
      ...person,
      photoUrl: person.photo_path
        ? (submissionPhotoUrls.get(person.photo_path) ?? null)
        : null,
    })),
  }));
  const activeSubmissions = submissionsWithFiles.filter(
    (submission) => submission.status !== "cancelled",
  );
  const availableEvents = (events ?? []).filter(
    (event) =>
      ["planned", "ongoing"].includes(event.status) &&
      !activeSubmissions.some((submission) => submission.event_id === event.id),
  );

  return (
    <div className="users-page">
      <div className="users-heading">
        <div>
          <p className="login-eyebrow">RUANG KERJA KOMISARIAT</p>
          <h1>Pengajuan peserta</h1>
          <p>Kirim profil peserta dan berkas untuk seleksi kegiatan.</p>
        </div>
        <span className="tag">{commissariat?.name ?? "Komisariat"}</span>
      </div>
      <div className="notice">
        <strong>Sebelum mengajukan</strong>
        <p>
          Siapkan satu Surat Mandat PDF untuk seluruh pengajuan. Foto peserta
          bersifat opsional. Setelah Observer mulai meninjau, pengajuan
          terkunci. Sebelum ditinjau, Anda dapat membatalkan lalu mengajukan
          ulang.
        </p>
      </div>
      {(eventError || submissionError) && <DataUnavailable />}
      {!commissariat?.is_active && (
        <p className="notice notice--danger">
          Komisariat Anda sedang nonaktif. Hubungi Admin Sistem.
        </p>
      )}
      {availableEvents.length > 0 && commissariat?.is_active && (
        <section className="event-manage-card">
          <div className="event-manage-title">
            <div>
              <h2>Ajukan untuk kegiatan</h2>
              <p>
                Satu pengajuan aktif untuk Komisariat ini pada setiap kegiatan.
              </p>
            </div>
          </div>
          <div className="application-event-list">
            {availableEvents.map((event) => (
              <form
                action={createSubmission}
                className="application-event-row"
                key={event.id}
              >
                <div>
                  <strong>{event.name}</strong>
                  <small>
                    {new Date(`${event.starts_on}T00:00:00`).toLocaleDateString(
                      "id-ID",
                      { dateStyle: "medium" },
                    )}{" "}
                    –{" "}
                    {new Date(`${event.ends_on}T00:00:00`).toLocaleDateString(
                      "id-ID",
                      { dateStyle: "medium" },
                    )}
                  </small>
                </div>
                <input type="hidden" name="eventId" value={event.id} />
                <button type="submit">Buat draf pengajuan</button>
              </form>
            ))}
          </div>
        </section>
      )}
      {activeSubmissions.map((submission) => {
        const event = events?.find((item) => item.id === submission.event_id);
        const editable = submission.status === "draft";
        const canCancel = ["draft", "submitted"].includes(submission.status);
        return (
          <SubmissionCard
            key={submission.id}
            submission={submission}
            event={event}
            editable={editable}
            canCancel={canCancel}
          />
        );
      })}
      {!activeSubmissions.length &&
        !availableEvents.length &&
        !eventError &&
        !submissionError && (
          <p className="notice notice--empty">
            Belum ada kegiatan yang dapat diajukan.
          </p>
        )}
      <p className="privacy-note">
        Akun lain yang ditautkan ke Komisariat yang sama dapat melihat dan
        mengelola draf/pengajuan ini. Komisariat lain tidak dapat membukanya.
      </p>
    </div>
  );
}
