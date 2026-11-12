import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  addApplicant,
  cancelSubmission,
  createSubmission,
  editApplicant,
  removeApplicant,
  submitSubmission,
  uploadMandate,
} from "./actions";

const statusLabels: Record<string, string> = {
  draft: "Draf · dapat diedit",
  submitted: "Dikirim · menunggu Observer",
  under_review: "Sedang ditinjau · terkunci",
  administrative_published: "Hasil administrasi diterbitkan",
  screening: "Tahap screening",
  screening_published: "Hasil screening diterbitkan",
  cancelled: "Dibatalkan",
};

export default async function CommissariatApplicationsPage() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
    return (
      <main className="setup-message">
        <h1>Supabase belum dikonfigurasi</h1>
        <p>
          Atur koneksi lokal dan jalankan migrasi pengajuan Komisariat sesuai
          README.md.
        </p>
        <a href="/login">Kembali ke login</a>
      </main>
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
      <main className="users-page">
        <a className="users-back" href="/dashboard">
          ← Kembali ke dashboard
        </a>
        <div className="users-notice">
          <strong>Akun Komisariat belum ditautkan</strong>
          <p>
            Minta Admin Sistem mengaitkan akun Anda ke Komisariat yang benar
            melalui menu Pengguna.
          </p>
        </div>
      </main>
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
      .order("starts_on", { ascending: true }),
    supabase
      .from("commissariat_submissions")
      .select(
        "id, event_id, commissariat_id, status, mandate_path, created_at, submitted_at, review_started_at, participants:commissariat_submission_participants(id, display_name, major, entry_year, position, photo_path, created_at, decisions:commissariat_submission_decisions(stage, status, public_reason))",
      )
      .eq("commissariat_id", profile.commissariat_id)
      .order("created_at", { ascending: false }),
  ]);
  const submissionsWithFiles = await Promise.all(
    (submissions ?? []).map(async (submission) => {
      const mandate = submission.mandate_path
        ? ((
            await supabase.storage
              .from("commissariat-mandates")
              .createSignedUrl(submission.mandate_path, 3600)
          ).data?.signedUrl ?? null)
        : null;
      const participants = await Promise.all(
        submission.participants.map(async (person) => ({
          ...person,
          photoUrl: person.photo_path
            ? ((
                await supabase.storage
                  .from("submission-photos")
                  .createSignedUrl(person.photo_path, 3600)
              ).data?.signedUrl ?? null)
            : null,
        })),
      );
      return { ...submission, mandateUrl: mandate, participants };
    }),
  );
  const activeSubmissions = submissionsWithFiles.filter(
    (submission) => submission.status !== "cancelled",
  );
  const availableEvents = (events ?? []).filter(
    (event) =>
      ["planned", "ongoing"].includes(event.status) &&
      !activeSubmissions.some((submission) => submission.event_id === event.id),
  );

  return (
    <main className="users-page">
      <a className="users-back" href="/dashboard">
        ← Kembali ke dashboard
      </a>
      <div className="users-heading">
        <div>
          <p className="login-eyebrow">RUANG KERJA KOMISARIAT</p>
          <h1>Pengajuan peserta</h1>
          <p>Kirim profil peserta dan berkas untuk seleksi kegiatan.</p>
        </div>
        <span className="sample-tag">{commissariat?.name ?? "Komisariat"}</span>
      </div>
      <div className="users-notice">
        <strong>Sebelum mengajukan</strong>
        <p>
          Siapkan satu Surat Mandat PDF untuk seluruh pengajuan. Foto peserta
          bersifat opsional. Setelah Observer mulai meninjau, pengajuan
          terkunci. Sebelum ditinjau, Anda dapat membatalkan lalu mengajukan
          ulang.
        </p>
      </div>
      {(eventError || submissionError) && (
        <p className="users-error">
          Data kegiatan atau pengajuan belum dapat dibaca. Pastikan migrasi 1000
          sudah dijalankan.
        </p>
      )}
      {!commissariat?.is_active && (
        <p className="users-error">
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
          <section className="event-manage-card" key={submission.id}>
            <div className="event-manage-title">
              <div>
                <h2>{event?.name ?? "Kegiatan"}</h2>
                <p>
                  {submission.participants.length} peserta · Dibuat{" "}
                  {new Date(submission.created_at).toLocaleDateString("id-ID", {
                    dateStyle: "medium",
                  })}
                </p>
              </div>
              <span
                className={`agenda-status ${submission.status === "under_review" ? "live" : "next"}`}
              >
                {statusLabels[submission.status] ?? submission.status}
              </span>
            </div>
            {editable && (
              <>
                <div className="application-upload-row">
                  <form
                    action={uploadMandate}
                    className="application-file-form"
                  >
                    <input
                      type="hidden"
                      name="submissionId"
                      value={submission.id}
                    />
                    <label>
                      Surat Mandat Komisariat{" "}
                      {submission.mandate_path
                        ? "(sudah ada — pilih untuk mengganti)"
                        : "*"}
                      <input
                        type="file"
                        name="mandate"
                        accept="application/pdf,.pdf"
                        required
                      />
                      <small>
                        PDF, maksimal 10 MB. Satu berkas untuk seluruh
                        pengajuan.
                      </small>
                    </label>
                    <button type="submit">
                      {submission.mandate_path
                        ? "Ganti Surat Mandat"
                        : "Unggah Surat Mandat"}
                    </button>
                  </form>
                  {submission.mandateUrl && (
                    <a
                      className="text-button"
                      href={submission.mandateUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Lihat Surat Mandat ↗
                    </a>
                  )}
                </div>
                <form
                  action={addApplicant}
                  className="participant-add-form participant-profile-form"
                >
                  <input
                    type="hidden"
                    name="submissionId"
                    value={submission.id}
                  />
                  <label>
                    Nama lengkap *
                    <input
                      required
                      minLength={2}
                      maxLength={120}
                      name="displayName"
                    />
                  </label>
                  <label>
                    Jurusan/program studi *
                    <input
                      required
                      minLength={2}
                      maxLength={120}
                      name="major"
                    />
                  </label>
                  <label>
                    Tahun angkatan *
                    <input
                      required
                      type="number"
                      min={1900}
                      max={2100}
                      step={1}
                      name="entryYear"
                      placeholder="Contoh: 2024"
                    />
                  </label>
                  <label>
                    Jabatan (opsional)
                    <input maxLength={120} name="position" />
                  </label>
                  <label>
                    Foto formal (opsional)
                    <input
                      type="file"
                      name="photo"
                      accept="image/jpeg,image/png"
                    />
                    <small>
                      Jika tersedia: jas IMM, latar putih. JPG/PNG, maksimal 5
                      MB.
                    </small>
                  </label>
                  <button type="submit">Tambah peserta</button>
                </form>
              </>
            )}
            {submission.participants.length > 0 ? (
              <div className="users-table-wrap">
                <table className="users-table participant-table">
                  <thead>
                    <tr>
                      <th>Foto</th>
                      <th>Nama</th>
                      <th>Jurusan/program studi</th>
                      <th>Tahun</th>
                      <th>Jabatan</th>
                      {editable && <th>Aksi</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {submission.participants.map((person) => (
                      <tr key={person.id}>
                        <td>
                          {person.photoUrl ? (
                            <img
                              className="participant-photo-thumb"
                              src={person.photoUrl}
                              alt={`Foto ${person.display_name}`}
                            />
                          ) : (
                            <span className="photo-missing">
                              Tidak tersedia
                            </span>
                          )}
                        </td>
                        <td>{person.display_name}</td>
                        <td>{person.major}</td>
                        <td>{person.entry_year}</td>
                        <td>{person.position || "—"}</td>
                        {editable && (
                          <td>
                            <details className="participant-edit-details">
                              <summary>Edit</summary>
                              <form
                                action={editApplicant}
                                className="participant-edit-form"
                              >
                                <input
                                  type="hidden"
                                  name="participantId"
                                  value={person.id}
                                />
                                <label>
                                  Nama lengkap *
                                  <input
                                    required
                                    minLength={2}
                                    maxLength={120}
                                    name="displayName"
                                    defaultValue={person.display_name}
                                  />
                                </label>
                                <label>
                                  Jurusan/program studi *
                                  <input
                                    required
                                    minLength={2}
                                    maxLength={120}
                                    name="major"
                                    defaultValue={person.major}
                                  />
                                </label>
                                <label>
                                  Tahun angkatan *
                                  <input
                                    required
                                    type="number"
                                    min={1900}
                                    max={2100}
                                    step={1}
                                    name="entryYear"
                                    defaultValue={person.entry_year}
                                  />
                                </label>
                                <label>
                                  Jabatan
                                  <input
                                    maxLength={120}
                                    name="position"
                                    defaultValue={person.position ?? ""}
                                  />
                                </label>
                                <label>
                                  Ganti foto (opsional)
                                  <input
                                    type="file"
                                    name="photo"
                                    accept="image/jpeg,image/png"
                                  />
                                </label>
                                <button type="submit">Simpan perubahan</button>
                              </form>
                              <form
                                action={removeApplicant}
                                className="participant-delete-form"
                              >
                                <input
                                  type="hidden"
                                  name="participantId"
                                  value={person.id}
                                />
                                <button className="remove-button" type="submit">
                                  Hapus dari draf
                                </button>
                              </form>
                            </details>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="users-empty">
                Tambahkan satu atau beberapa peserta ke pengajuan ini.
              </p>
            )}
            {editable && (
              <div className="application-actions">
                <form action={submitSubmission}>
                  <input
                    type="hidden"
                    name="submissionId"
                    value={submission.id}
                  />
                  <button
                    className="rubric-activate"
                    type="submit"
                    disabled={
                      !submission.mandate_path ||
                      submission.participants.length === 0
                    }
                  >
                    Kirim pengajuan
                  </button>
                </form>
                <span>
                  {!submission.mandate_path
                    ? "Unggah Surat Mandat dan tambahkan peserta sebelum mengirim."
                    : !submission.participants.length
                      ? "Tambahkan setidaknya satu peserta."
                      : "Periksa kembali profil sebelum dikirim."}
                </span>
              </div>
            )}
            {canCancel && (
              <form
                action={cancelSubmission}
                className="application-cancel-form"
              >
                <input
                  type="hidden"
                  name="submissionId"
                  value={submission.id}
                />
                <button className="remove-button" type="submit">
                  Batalkan pengajuan
                </button>
                {!editable && (
                  <small>
                    Pengajuan dapat dibatalkan sampai Observer mulai meninjau.
                  </small>
                )}
              </form>
            )}
            {submission.status === "under_review" && (
              <p className="privacy-note">
                Observer sudah mulai meninjau. Daftar peserta dan berkas
                terkunci; tunggu pengumuman hasil.
              </p>
            )}
            {submission.status === "administrative_published" && (
              <div className="published-results">
                <h3>Hasil seleksi administrasi</h3>
                {submission.participants.map((person) => {
                  const result = person.decisions?.find(
                    (item) => item.stage === "administrative",
                  );
                  return (
                    <div className="published-result-row" key={person.id}>
                      <strong>{person.display_name}</strong>
                      <span
                        className={
                          result?.status === "pass"
                            ? "result-pass"
                            : "result-fail"
                        }
                      >
                        {result?.status === "pass"
                          ? "Lolos"
                          : result?.status === "fail"
                            ? "Tidak lolos"
                            : "Menunggu hasil"}
                      </span>
                      {result?.public_reason && (
                        <p>Alasan: {result.public_reason}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
      {!activeSubmissions.length &&
        !availableEvents.length &&
        !eventError &&
        !submissionError && (
          <p className="users-empty">Belum ada kegiatan yang dapat diajukan.</p>
        )}
      <p className="privacy-note">
        Akun lain yang ditautkan ke Komisariat yang sama dapat melihat dan
        mengelola draf/pengajuan ini. Komisariat lain tidak dapat membukanya.
      </p>
    </main>
  );
}
