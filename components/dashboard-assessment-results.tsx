import { scoreCategories } from "@/lib/scoring";
import type {
  DashboardAssessmentData,
  DashboardAssessmentResult,
} from "@/lib/dashboard-results";

const stages = [
  { id: "screening", label: "Screening" },
  { id: "training", label: "Pelatihan" },
  { id: "follow_up", label: "Rencana Tindak Lanjut" },
];

function CategoryCounts({ result }: { result: DashboardAssessmentResult }) {
  return (
    <div className="dashboard-category-counts">
      {scoreCategories.map((category) => (
        <span key={category.id}>
          {category.label}:{" "}
          <b>
            {
              result.categoryCounts[
                category.id as keyof DashboardAssessmentResult["categoryCounts"]
              ]
            }
          </b>
        </span>
      ))}
    </div>
  );
}

export function DashboardAssessmentResults({
  data,
}: {
  data: DashboardAssessmentData;
}) {
  return (
    <section className="dashboard-assessment-results">
      <div className="section-heading role-heading">
        <div>
          <h2>Hasil penilaian</h2>
          <p>Ringkasan nilai per tahap, jenis penilaian, dan materi.</p>
        </div>
        <span className="sample-tag">DATA KEGIATAN</span>
      </div>
      {data.error && (
        <p className="users-error">
          Sebagian hasil belum dapat dibaca. Periksa migrasi dashboard dan izin
          akses di Supabase.
        </p>
      )}
      <div className="dashboard-stage-grid">
        {stages.map((stage) => {
          const groups = data.results.filter(
            (result) => result.stage === stage.id,
          );
          return (
            <section className="panel dashboard-stage-panel" key={stage.id}>
              <div className="panel-heading">
                <div>
                  <h3>{stage.label}</h3>
                  <p>
                    {groups.length
                      ? `${groups.length} jenis penilaian`
                      : "Belum ada hasil"}
                  </p>
                </div>
              </div>
              {!groups.length ? (
                <p className="users-empty">
                  {data.mode === "summary"
                    ? "Belum ada rekap. Minta Super Admin menugaskan akun Instruktur ke kegiatan yang sudah memiliki hasil."
                    : "Belum ada rubrik aktif atau nilai untuk tahap ini."}
                </p>
              ) : (
                groups.map((result) => (
                  <article
                    className="dashboard-result-card"
                    key={`${result.eventId}:${result.stage}:${result.materialName ?? "no-material"}:${result.typeName}`}
                  >
                    <div className="dashboard-result-heading">
                      <div>
                        <strong>{result.eventName}</strong>
                        <small>
                          {result.materialName
                            ? `${result.materialName} · `
                            : ""}
                          {result.typeName} · Versi {result.version}
                        </small>
                      </div>
                      <span
                        className={`agenda-status ${result.isOfficial ? "done" : "next"}`}
                      >
                        {result.isOfficial ? "Nilai resmi" : "Nilai sementara"}
                      </span>
                    </div>
                    <div className="dashboard-result-metrics">
                      <span>
                        {result.scoredCount} dari {result.participantCount}{" "}
                        peserta dinilai
                      </span>
                      <strong>
                        {result.averageScore === null
                          ? "Belum ada skor"
                          : `${result.averageScore.toFixed(2)} / 100`}
                      </strong>
                    </div>
                    {data.mode === "summary" ? (
                      <CategoryCounts result={result} />
                    ) : (
                      <div className="dashboard-participant-results">
                        {result.participantScores?.map((participant) => (
                          <div
                            className="dashboard-participant-row"
                            key={participant.participantId}
                          >
                            <strong>{participant.participantName}</strong>
                            {participant.score === null ? (
                              <span>Belum dinilai</span>
                            ) : (
                              <span>
                                {participant.score.toFixed(2)} ·{" "}
                                <b
                                  className={`score-category ${participant.categoryId ?? ""}`}
                                >
                                  {participant.categoryLabel}
                                </b>
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                ))
              )}
            </section>
          );
        })}
      </div>
      {data.mode === "summary" && (
        <p className="privacy-note">
          Dashboard menampilkan rekap kegiatan yang ditugaskan.
        </p>
      )}
      {data.mode === "participant" && (
        <p className="privacy-note">
          Nama dan nilai individu hanya ditampilkan kepada Admin Sistem,
          Observer yang ditugaskan, serta Instruktur yang ditugaskan pada
          kegiatan tersebut. Catatan observasi privat tidak ditampilkan pada
          dashboard.
        </p>
      )}
    </section>
  );
}
