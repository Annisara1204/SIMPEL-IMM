export type RubricPreviewItem = {
  code: string;
  name: string;
  description: string;
  measurement_objective: string;
  evidence_guidance: string;
  aspectNames: string[];
  rubricCode: string | null;
  rubricStatus: string | null;
  anchors: { score: number; label: string; description: string }[];
};

export function RubricPreview({ items }: { items: RubricPreviewItem[] }) {
  return (
    <div className="competency-rubric-list">
      {items.map((item) => (
        <article className="competency-rubric-card" key={item.code}>
          <header>
            <div>
              <span className="competency-code">{item.code}</span>
              <h2>{item.name}</h2>
            </div>
            <span className="agenda-status done">
              {item.rubricStatus === "published"
                ? "Rubrik trial v1"
                : "Rubrik belum tersedia"}
            </span>
          </header>
          <p>{item.description}</p>
          <dl>
            <div>
              <dt>Aspek</dt>
              <dd>
                {item.aspectNames.length
                  ? item.aspectNames.join(", ")
                  : "Belum dipetakan"}
              </dd>
            </div>
            <div>
              <dt>Tujuan pengukuran</dt>
              <dd>{item.measurement_objective}</dd>
            </div>
          </dl>
          <details className="competency-rubric-details">
            <summary>Lihat anchor skor dan panduan bukti</summary>
            <div className="competency-anchor-list">
              {item.anchors.map((anchor) => (
                <div className="competency-anchor" key={anchor.score}>
                  <strong>
                    {anchor.score} · {anchor.label}
                  </strong>
                  <p>{anchor.description}</p>
                </div>
              ))}
            </div>
            <div className="competency-evidence">
              <strong>Panduan bukti</strong>
              <p>{item.evidence_guidance}</p>
            </div>
            <p className="competency-no-observation">
              <strong>N/O · Belum diamati:</strong> pilih jika kesempatan atau
              bukti belum tersedia. N/O bukan skor 0 dan tidak ikut perhitungan.
            </p>
            {item.code === "REL-02" && (
              <p className="competency-no-observation">
                Refleksi bersifat sukarela. Jangan menyimpulkan kadar iman atau
                menurunkan nilai karena peserta memilih menjaga privasi.
              </p>
            )}
          </details>
        </article>
      ))}
    </div>
  );
}
