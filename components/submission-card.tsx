import { PrivateImg } from "@/components/private-img";
import { submissionStatusLabel } from "@/lib/submission-status";
import {
  addApplicant,
  cancelSubmission,
  editApplicant,
  removeApplicant,
  submitSubmission,
  uploadMandate,
} from "@/app/dashboard/pengajuan/actions";

type Decision = {
  stage: string;
  status: string;
  public_reason?: string | null;
};
type Person = {
  id: string;
  display_name: string;
  photoUrl?: string | null;
  major?: string | null;
  jurusan?: string | null;
  entry_year?: number | null;
  position?: string | null;
  decisions?: Decision[];
};
type Submission = {
  id: string;
  created_at: string;
  status: string;
  mandate_path?: string | null;
  mandateUrl?: string | null;
  participants: Person[];
};
type Props = {
  submission: Submission;
  event: { name?: string | null } | null | undefined;
  editable: boolean;
  canCancel: boolean;
};

export function SubmissionCard({
  submission,
  event,
  editable,
  canCancel,
}: Props) {
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
          className={`badge ${submission.status === "under_review" ? "live" : "next"}`}
        >
          {submissionStatusLabel(submission.status)}
        </span>
      </div>
      {editable && (
        <>
          <div className="application-upload-row">
            <form action={uploadMandate} className="application-file-form">
              <input type="hidden" name="submissionId" value={submission.id} />
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
                  PDF, maksimal 10 MB. Satu berkas untuk seluruh pengajuan.
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
                className="btn btn--quiet"
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
            <input type="hidden" name="submissionId" value={submission.id} />
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
              <input required minLength={2} maxLength={120} name="major" />
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
              <input type="file" name="photo" accept="image/jpeg,image/png" />
              <small>
                Jika tersedia: jas IMM, latar putih. JPG/PNG, maksimal 5 MB.
              </small>
            </label>
            <button type="submit">Tambah peserta</button>
          </form>
        </>
      )}
      {submission.participants.length > 0 ? (
        <div className="table-wrap">
          <table className="table participant-table">
            <thead>
              <tr>
                <th scope="col">Foto</th>
                <th scope="col">Nama</th>
                <th scope="col">Jurusan/program studi</th>
                <th scope="col">Tahun</th>
                <th scope="col">Jabatan</th>
                {editable && <th scope="col">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {submission.participants.map((person) => (
                <tr key={person.id}>
                  <td>
                    {person.photoUrl ? (
                      <PrivateImg
                        className="participant-photo-thumb"
                        src={person.photoUrl}
                        alt={`Foto ${person.display_name}`}
                      />
                    ) : (
                      <span className="photo-missing">Tidak tersedia</span>
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
                              defaultValue={person.major ?? undefined}
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
                              defaultValue={person.entry_year ?? undefined}
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
        <p className="notice notice--empty">
          Tambahkan satu atau beberapa peserta ke pengajuan ini.
        </p>
      )}
      {editable && (
        <div className="application-actions">
          <form action={submitSubmission}>
            <input type="hidden" name="submissionId" value={submission.id} />
            <button
              className="btn btn--primary btn--lg"
              type="submit"
              disabled={
                !submission.mandate_path || submission.participants.length === 0
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
        <form action={cancelSubmission} className="application-cancel-form">
          <input type="hidden" name="submissionId" value={submission.id} />
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
          Observer sudah mulai meninjau. Daftar peserta dan berkas terkunci;
          tunggu pengumuman hasil.
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
                    result?.status === "pass" ? "result-pass" : "result-fail"
                  }
                >
                  {result?.status === "pass"
                    ? "Lolos"
                    : result?.status === "fail"
                      ? "Tidak lolos"
                      : "Menunggu hasil"}
                </span>
                {result?.public_reason && <p>Alasan: {result.public_reason}</p>}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
