import {
  approveFinalizePublishReport,
  finalizeCollectiveEvaluation,
  saveCollectiveEvaluation,
} from "@/app/dashboard/evaluasi/actions";

type Evaluation = {
  status?: string | null;
  strengths?: string | null;
  development_areas?: string | null;
  discussion_notes?: string | null;
  collective_summary?: string | null;
  recommendation_summary?: string | null;
  graduation_decision?: string | null;
  decision_rationale?: string | null;
} | null;
type Props = {
  eventId?: string;
  participantId?: string;
  selectedVersionId?: string | null;
  evaluation: Evaluation;
  evidenceText: string;
  overall: { status: string };
  policy: { minimum_coverage?: number | string | null } | null;
};

export function EvaluationDecisionForm({
  eventId,
  participantId,
  selectedVersionId,
  evaluation,
  evidenceText,
  overall,
  policy,
}: Props) {
  return (
    <form
      action={
        evaluation?.status === "finalized"
          ? undefined
          : saveCollectiveEvaluation
      }
      className="evaluation-notes-form"
    >
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="participantId" value={participantId} />
      <input
        type="hidden"
        name="rubricVersionId"
        value={selectedVersionId ?? ""}
      />
      <div className="evaluation-notes-grid">
        <label>
          Kekuatan
          <textarea
            name="strengths"
            defaultValue={evaluation?.strengths ?? ""}
            readOnly={evaluation?.status === "finalized"}
          />
        </label>
        <label>
          Area pengembangan
          <textarea
            name="developmentAreas"
            defaultValue={evaluation?.development_areas ?? ""}
            readOnly={evaluation?.status === "finalized"}
          />
        </label>
        <label>
          Bukti pendukung (satu referensi per baris)
          <textarea
            name="evidenceReferencesText"
            defaultValue={evidenceText}
            readOnly={evaluation?.status === "finalized"}
          />
        </label>
        <label>
          Catatan pembahasan instruktur
          <textarea
            name="discussionNotes"
            defaultValue={evaluation?.discussion_notes ?? ""}
            readOnly={evaluation?.status === "finalized"}
          />
        </label>
        <label>
          Kesimpulan kolektif
          <textarea
            name="collectiveSummary"
            defaultValue={evaluation?.collective_summary ?? ""}
            readOnly={evaluation?.status === "finalized"}
          />
        </label>
        <label>
          Rekomendasi ringkas
          <textarea
            name="recommendationSummary"
            defaultValue={evaluation?.recommendation_summary ?? ""}
            readOnly={evaluation?.status === "finalized"}
          />
        </label>
      </div>
      <div className="evaluation-decision-grid">
        <label>
          Keputusan kelulusan
          <select
            key={evaluation?.graduation_decision ?? "kosong"}
            name="decision"
            defaultValue={evaluation?.graduation_decision ?? ""}
            disabled={evaluation?.status === "finalized"}
            required
          >
            <option value="">Belum diputuskan</option>
            <option value="pass">Lulus</option>
            <option value="not_pass">Tidak Lulus</option>
            <option value="further_discussion">
              Perlu Pembahasan Lanjutan
            </option>
          </select>
        </label>
        <label>
          Alasan keputusan
          <textarea
            name="decisionRationale"
            minLength={10}
            required
            defaultValue={evaluation?.decision_rationale ?? ""}
            readOnly={evaluation?.status === "finalized"}
          />
        </label>
      </div>
      {evaluation?.status !== "finalized" && (
        <div className="evaluation-actions">
          <div className="evaluation-actions-row">
            <button type="submit" formNoValidate className="btn btn--primary">
              Simpan draf evaluasi
            </button>
            <button
              className="btn btn--primary"
              type="submit"
              formAction={finalizeCollectiveEvaluation}
              disabled={overall.status !== "ready_for_collective_evaluation"}
            >
              Finalisasi dan simpan snapshot
            </button>
            <button
              className="btn btn--primary"
              type="submit"
              formAction={approveFinalizePublishReport}
              disabled={overall.status !== "ready_for_collective_evaluation"}
            >
              Setujui, finalisasi, terbitkan, dan unduh rapor
            </button>
          </div>
          <p className="evaluation-hint">
            Pilih keputusan kelulusan dan isi alasan minimal 10 karakter sebelum
            finalisasi. Simpan draf tetap bisa dilakukan tanpa keduanya. Tombol
            finalisasi juga dinonaktifkan bila coverage belum memenuhi minimal{" "}
            {policy?.minimum_coverage ?? 80}% pada setiap aspek.
          </p>
          {overall.status !== "ready_for_collective_evaluation" && (
            <small className="evaluation-hint">
              Belum dapat difinalisasi: penuhi coverage setiap aspek minimal{" "}
              {policy?.minimum_coverage ?? 80}%.
            </small>
          )}
        </div>
      )}
    </form>
  );
}
