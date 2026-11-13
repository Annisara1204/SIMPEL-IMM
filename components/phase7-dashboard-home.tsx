import Link from "next/link";
import { decisionLabel } from "@/lib/decision-labels";
import type { Phase7Home } from "@/lib/phase7-home";

export function Phase7DashboardHome({ data }: { data: Phase7Home }) {
  if (data.kind === "staff")
    return (
      <>
        <div className="section-heading role-heading">
          <div>
            <h2>Ringkasan kegiatan dan hasil final</h2>
            <p>
              Data berasal dari peserta dan snapshot evaluasi di basis data.
            </p>
          </div>
        </div>
        <div className="users-metrics-grid">
          <article>
            <small>Kegiatan dapat diakses</small>
            <strong>{data.events.length}</strong>
          </article>
          <article>
            <small>Peserta</small>
            <strong>
              {data.events.reduce((sum, item) => sum + item.participants, 0)}
            </strong>
          </article>
          <article>
            <small>Sesi/rubrik aktif</small>
            <strong>
              {data.events.reduce((sum, item) => sum + item.sessions, 0)}
            </strong>
          </article>
          <article>
            <small>Penilai ditugaskan</small>
            <strong>
              {data.events.reduce((sum, item) => sum + item.reviewers, 0)}
            </strong>
          </article>
          <article>
            <small>Kiriman asesmen</small>
            <strong>
              {data.events.reduce(
                (sum, item) => sum + item.assessmentSubmissions,
                0,
              )}
            </strong>
          </article>
          <article>
            <small>Rapor finalized</small>
            <strong>
              {data.events.reduce((sum, item) => sum + item.finalized, 0)}
            </strong>
          </article>
          <article>
            <small>Rapor published</small>
            <strong>
              {data.events.reduce((sum, item) => sum + item.published, 0)}
            </strong>
          </article>
          <article>
            <small>Provisional</small>
            <strong>
              {data.events.reduce((sum, item) => sum + item.provisional, 0)}
            </strong>
          </article>
          <article>
            <small>Lulus</small>
            <strong>
              {data.events.reduce((sum, item) => sum + item.passed, 0)}
            </strong>
          </article>
          <article>
            <small>Tidak lulus</small>
            <strong>
              {data.events.reduce((sum, item) => sum + item.notPassed, 0)}
            </strong>
          </article>
          <article>
            <small>Perlu pembahasan</small>
            <strong>
              {data.events.reduce(
                (sum, item) => sum + item.furtherDiscussion,
                0,
              )}
            </strong>
          </article>
        </div>
        <section className="event-manage-card">
          <h2>Monitoring per kegiatan</h2>
          {data.events.length ? (
            data.events.map((item) => (
              <article className="assignment-row" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <small>
                    {item.unavailable
                      ? "Data snapshot Fase 6 belum tersedia"
                      : `${item.participants} peserta · ${item.sessions} sesi · ${item.reviewers} penilai · ${item.assessmentSubmissions} kiriman · ${item.finalized} final · ${item.published} published · ${item.provisional} provisional · rata-rata ${item.averageScore === null ? "—" : item.averageScore.toFixed(1)}`}
                    <br />
                    Aktivitas asesmen terakhir:{" "}
                    {item.latestActivity
                      ? new Date(item.latestActivity).toLocaleString("id-ID")
                      : "belum ada"}
                  </small>
                </div>
                <Link
                  className="text-button"
                  href={`/dashboard/laporan?eventId=${item.id}`}
                >
                  Buka dashboard laporan →
                </Link>
              </article>
            ))
          ) : (
            <p>Belum ada kegiatan dengan akses untuk akun ini.</p>
          )}
        </section>
      </>
    );
  if (data.kind === "personal")
    return (
      <>
        <div className="section-heading role-heading">
          <div>
            <h2>Progres penilaian saya</h2>
            <p>Hanya status kiriman milik akun Anda yang ditampilkan.</p>
          </div>
        </div>
        <div className="users-metrics-grid">
          <article>
            <small>Total form</small>
            <strong>{data.unavailable ? "—" : data.total}</strong>
          </article>
          <article>
            <small>Peserta yang dinilai</small>
            <strong>
              {data.unavailable ? "—" : data.assessedParticipants}
            </strong>
          </article>
          <article>
            <small>Draft</small>
            <strong>{data.unavailable ? "—" : data.draft}</strong>
          </article>
          <article>
            <small>Submitted</small>
            <strong>{data.unavailable ? "—" : data.submitted}</strong>
          </article>
          <article>
            <small>Finalized</small>
            <strong>{data.unavailable ? "—" : data.finalized}</strong>
          </article>
        </div>
        <section className="event-manage-card">
          <h2>Form yang pernah Anda buka</h2>
          {data.sessions.length ? (
            <div className="competency-matrix-scroll">
              <table className="competency-matrix">
                <thead>
                  <tr>
                    <th scope="col">Kegiatan</th>
                    <th scope="col">Sesi/materi</th>
                    <th scope="col">Status</th>
                    <th scope="col">Perubahan terakhir</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sessions.map((item, index) => (
                    <tr key={`${item.eventName}:${item.sessionName}:${index}`}>
                      <th scope="row">{item.eventName}</th>
                      <td>{item.sessionName}</td>
                      <td>{item.status}</td>
                      <td>
                        {item.updatedAt
                          ? new Date(item.updatedAt).toLocaleString("id-ID")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>Belum ada form penilaian yang disimpan.</p>
          )}
          <p>
            Untuk melanjutkan atau melengkapi penilaian, buka menu Observasi.
            Dashboard ini tidak menampilkan catatan atau nilai Observer lain.
          </p>
          <Link className="text-button" href="/dashboard/observasi">
            Buka penilaian →
          </Link>
        </section>
      </>
    );
  const report = data.report;
  return (
    <>
      <div className="section-heading role-heading">
        <div>
          <h2>Rapor pribadi</h2>
          <p>
            {report
              ? report.event?.name
              : "Belum ada rapor yang diterbitkan untuk akun ini."}
          </p>
        </div>
        <span className={report ? "agenda-status done" : "temporary-pill"}>
          {report ? "PUBLISHED" : "MENUNGGU HASIL"}
        </span>
      </div>
      {report ? (
        <div className="users-metrics-grid">
          <article>
            <small>Skor akhir</small>
            <strong>
              {Number(report.snapshot_data?.overall?.score ?? 0).toFixed(1)}/100
            </strong>
          </article>
          <article>
            <small>Keputusan</small>
            <strong>
              {decisionLabel(report.snapshot_data?.collective?.decision)}
            </strong>
          </article>
          <article>
            <small>Diterbitkan</small>
            <strong>
              {new Date(report.published_at).toLocaleDateString("id-ID")}
            </strong>
          </article>
          <article>
            <Link href="/dashboard/laporan">Buka rapor dan unduh PDF →</Link>
          </article>
        </div>
      ) : (
        <section className="event-manage-card">
          <p>
            Rapor akan muncul setelah akun Anda ditautkan ke data peserta dan
            hasil kegiatan diterbitkan. Hubungi Admin Sistem jika akun atau
            identitas kegiatan belum sesuai.
          </p>
        </section>
      )}
    </>
  );
}
