"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAssessmentSubmissionStatus } from "../penilaian/assessment-actions";

export function SubmissionControls({
  participantId,
  rubricVersionId,
  status,
  role,
  submittedCount,
  assignedCount,
}: {
  participantId: string;
  rubricVersionId: string;
  status: string;
  role: string;
  submittedCount: number;
  assignedCount: number;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const run = (next: "submitted" | "draft") =>
    startTransition(async () => {
      const result = await setAssessmentSubmissionStatus({
        participantId,
        rubricVersionId,
        status: next,
      });
      setMessage(
        result.ok
          ? next === "submitted"
            ? "Penilaian peserta ini telah dikirim."
            : "Penilaian dibuka kembali untuk revisi."
          : result.message,
      );
      if (result.ok) router.refresh();
    });
  return (
    <div className="observer-completion">
      <p>
        Status Anda untuk peserta ini:{" "}
        <strong>
          {status === "submitted"
            ? "Submitted"
            : status === "finalized"
              ? "Finalized"
              : "Draft"}
        </strong>
        . {submittedCount} dari {assignedCount} observer mengirim penilaian
        (informasi; tidak menghalangi finalisasi).
      </p>
      {status === "draft" && (
        <button
          className="btn btn--primary btn--lg"
          type="button"
          disabled={pending}
          onClick={() => run("submitted")}
        >
          Kirim penilaian peserta ini
        </button>
      )}
      {status === "submitted" && role !== "admin_system" && (
        <button
          className="remove-button"
          type="button"
          disabled={pending}
          onClick={() => run("draft")}
        >
          Buka kembali untuk revisi
        </button>
      )}
      {message && <small role="status">{message}</small>}
    </div>
  );
}
