export type CompetencyMappingCell = {
  code: string;
  name: string;
  aspectNames: string[];
  assessmentMethod: string;
  guidance: string;
  required: boolean;
  scope: "session" | "cross_session";
  rubricAvailable: boolean;
};

export type CompetencyMappingContext = {
  id: string;
  code: string;
  name: string;
  description: string;
  kind: "material" | "activity" | "cross_session";
  mappings: CompetencyMappingCell[];
};

const methodLabels: Record<string, string> = {
  direct_observation: "Observasi langsung",
  group_discussion: "Diskusi kelompok",
  individual_assignment: "Penugasan individu",
  group_assignment: "Penugasan kelompok",
  simulation: "Simulasi",
  reflection: "Refleksi",
  pre_post_test: "Pre-test/Post-test",
  attendance_activity_record: "Catatan kehadiran/aktivitas",
  follow_up_assessment: "Penilaian tindak lanjut",
};

export function CompetencyMaterialMapping({
  contexts,
  indicatorCodes,
}: {
  contexts: CompetencyMappingContext[];
  indicatorCodes: string[];
}) {
  const contextKindLabel = (kind: CompetencyMappingContext["kind"]) =>
    kind === "material"
      ? "Materi"
      : kind === "cross_session"
        ? "Lintas sesi"
        : "Aktivitas";

  return (
    <>
      <section className="event-manage-card">
        <div className="event-manage-title">
          <div>
            <h2>Materi dan aktivitas penilaian</h2>
            <p>
              {contexts.length} konteks · panduan ini membantu Observer memilih
              bukti relevan dan N/O bila kesempatan observasi belum tersedia.
            </p>
          </div>
        </div>
        <div className="competency-context-list">
          {contexts.map((context) => (
            <details className="competency-context-card" key={context.id}>
              <summary>
                <span>
                  <small>
                    {contextKindLabel(context.kind)} · {context.code}
                  </small>
                  <strong>{context.name}</strong>
                </span>
                <span className="competency-context-count">
                  {context.mappings.length} indikator →
                </span>
              </summary>
              <p>{context.description}</p>
              {context.mappings.length ? (
                <div className="competency-context-mappings">
                  {context.mappings.map((mapping) => (
                    <article
                      className="competency-context-mapping"
                      key={`${context.id}-${mapping.code}`}
                    >
                      <header>
                        <div>
                          <span className="competency-code">
                            {mapping.code}
                          </span>
                          <strong>{mapping.name}</strong>
                        </div>
                        <span
                          className={`agenda-status ${mapping.rubricAvailable ? "done" : "next"}`}
                        >
                          {mapping.rubricAvailable
                            ? "Rubrik tersedia"
                            : "Rubrik belum tersedia"}
                        </span>
                      </header>
                      <dl>
                        <div>
                          <dt>Aspek</dt>
                          <dd>
                            {mapping.aspectNames.length
                              ? mapping.aspectNames.join(", ")
                              : "Belum dipetakan"}
                          </dd>
                        </div>
                        <div>
                          <dt>Metode</dt>
                          <dd>
                            {methodLabels[mapping.assessmentMethod] ??
                              mapping.assessmentMethod}
                          </dd>
                        </div>
                        <div>
                          <dt>Cakupan</dt>
                          <dd>
                            {mapping.scope === "cross_session"
                              ? "Lintas sesi kegiatan DAD"
                              : "Sesi ini"}
                          </dd>
                        </div>
                        <div>
                          <dt>Status</dt>
                          <dd>
                            {mapping.required
                              ? "Indikator inti pada konteks ini"
                              : "Opsional / gunakan jika ada bukti"}
                          </dd>
                        </div>
                      </dl>
                      <p className="competency-context-guidance">
                        <strong>Panduan observasi:</strong> {mapping.guidance}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="users-empty">Belum ada indikator terpetakan.</p>
              )}
            </details>
          ))}
        </div>
      </section>

      <section className="event-manage-card">
        <div className="event-manage-title">
          <div>
            <h2>Matriks materi/aktivitas × indikator</h2>
            <p>
              ✓ berarti indikator direncanakan untuk konteks tersebut. Tabel
              dapat digulir mendatar di layar kecil.
            </p>
          </div>
        </div>
        <div
          className="competency-matrix-scroll"
          role="region"
          aria-label="Matriks pemetaan indikator"
          tabIndex={0}
        >
          <table className="competency-matrix">
            <thead>
              <tr>
                <th scope="col">Konteks</th>
                {indicatorCodes.map((code) => (
                  <th scope="col" key={code}>
                    {code}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contexts.map((context) => {
                const mappedCodes = new Set(
                  context.mappings.map((mapping) => mapping.code),
                );
                return (
                  <tr key={context.id}>
                    <th scope="row">
                      <span>{context.name}</span>
                      <small>{contextKindLabel(context.kind)}</small>
                    </th>
                    {indicatorCodes.map((code) => (
                      <td
                        key={`${context.id}-${code}`}
                        className={mappedCodes.has(code) ? "is-mapped" : ""}
                        aria-label={`${context.name}, ${code}: ${mappedCodes.has(code) ? "digunakan" : "tidak digunakan"}`}
                      >
                        {mappedCodes.has(code) ? (
                          <span
                            title={`${code} digunakan pada ${context.name}`}
                            aria-hidden="true"
                          >
                            ✓
                          </span>
                        ) : (
                          <span
                            className="competency-matrix-empty"
                            aria-hidden="true"
                          >
                            ·
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="competency-context-footnote">
          Belum ada konteks terencana untuk indikator: HUM-01 (Empati) dan
          HUM-02 (Solidaritas). Keduanya tidak dipetakan secara asal dan perlu
          ditinjau ketika rancangan aktivitas DAD tersedia.
        </p>
      </section>
    </>
  );
}
