"use client";
import { asRows, firstRelated } from "@/lib/relations";
import { categorizeScore } from "@/lib/scoring";
import { submissionStatusLabel } from "@/lib/submission-status";
import { AssessmentRatingCell } from "@/app/dashboard/observasi/assessment-rating-cell";
import { SubmissionControls } from "@/app/dashboard/observasi/submission-controls";
import {
  ObserverNotes,
  type NoteRecord,
} from "@/app/dashboard/observasi/observer-notes";
import { isNoteRecord } from "@/lib/supabase-rows";
import type { SnapshotIndicator } from "@/lib/supabase-rows";

type Rating = SnapshotIndicator & {
  id: string;
  participant_id: string;
  indicator_id: string;
  observer_id: string;
  observer_name: string;
  score: number | null;
  response_status: "unrated" | "scored" | "not_observed";
  evidence: string;
  revision: number;
  updated_at: string | null;
};
type Indicator = {
  id: string;
  position?: number;
  competency_indicator_id?: string | null;
  competency_indicator_rubric_version_id?: string | null;
  name?: string;
  score_descriptors?: Record<string, string> | null;
  target?: string | null;
};
type Mapping = {
  id?: string;
  rubric_indicators?: Indicator | Indicator[] | null;
  weight?: number | string | null;
};
type Aspect = {
  id: string;
  name?: string;
  weight?: number | string | null;
  position?: number;
  rubric_indicator_aspects?: Mapping[] | null;
};
type Props = {
  participant: { id: string; display_name: string };
  status: string;
  calculated: { value: number | null };
  participantObservations: Rating[];
  allIndicatorIds: Set<string>;
  activeVersion: { id: string; rubric_aspects?: Aspect[] | null };
  hasMaterialMapping: boolean;
  mappedIndicators: Map<
    string,
    {
      competency_indicator_id?: string | null;
      competency_indicator_rubric_version_id?: string | null;
      is_required?: boolean | null;
      observation_guidance?: string | null;
      assessment_method?: string | null;
    }
  >;
  observationMap: Map<string, Rating>;
  ratings: Rating[];
  eventAssignments: { observer_id: string }[];
  observerNotes: NoteRecord[];
  profile: { role: string };
  submissionStatusByObserver: Map<string, Record<string, string>>;
  submittedCount: number;
  userId: string;
};

export function ObservationParticipantCard({
  participant,
  status,
  calculated,
  participantObservations,
  allIndicatorIds,
  activeVersion,
  hasMaterialMapping,
  mappedIndicators,
  observationMap,
  ratings,
  eventAssignments,
  observerNotes,
  profile,
  submissionStatusByObserver,
  submittedCount,
  userId,
}: Props) {
  const category = categorizeScore(calculated.value);
  return (
    <details className="observation-participant" key={participant.id}>
      <summary>
        {participant.display_name} · {submissionStatusLabel(status)}
      </summary>
      <div className="score-summary">
        <strong>
          {calculated.value === null
            ? "Belum ada penilaian Anda"
            : `Pratinjau penilaian Anda: ${calculated.value.toFixed(1)} / 100`}
        </strong>
        {category && (
          <span className={`score-category ${category.id}`}>
            {category.label}
          </span>
        )}
        <small>
          {
            participantObservations.filter(
              (item) => item.response_status === "scored",
            ).length
          }{" "}
          dinilai ·{" "}
          {
            participantObservations.filter(
              (item) => item.response_status === "not_observed",
            ).length
          }{" "}
          N/O ·{" "}
          {Math.max(
            0,
            allIndicatorIds.size -
              participantObservations.filter(
                (item) => item.response_status !== "unrated",
              ).length,
          )}{" "}
          belum dinilai
        </small>
      </div>
      {[...(activeVersion.rubric_aspects ?? [])]
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((aspect) => (
          <div className="observation-aspect" key={aspect.id}>
            <h3>
              {aspect.name} <small>{Number(aspect.weight).toFixed(1)}%</small>
            </h3>
            {[...(aspect.rubric_indicator_aspects ?? [])]
              .filter((mapping) => {
                const indicator = firstRelated(mapping.rubric_indicators);
                return (
                  indicator &&
                  (!hasMaterialMapping ||
                    mappedIndicators.has(
                      indicator.competency_indicator_id ?? "",
                    ))
                );
              })
              .sort(
                (a, b) =>
                  (firstRelated(a.rubric_indicators)?.position ?? 0) -
                  (firstRelated(b.rubric_indicators)?.position ?? 0),
              )
              .map((mapping) => {
                const indicator = firstRelated(mapping.rubric_indicators);
                if (!indicator) return null;
                const saved = observationMap.get(
                  `${participant.id}:${indicator.id}`,
                );
                const masterMapping = mappedIndicators.get(
                  indicator.competency_indicator_id ?? "",
                );
                if (
                  hasMaterialMapping &&
                  (!masterMapping ||
                    masterMapping.competency_indicator_rubric_version_id !==
                      indicator.competency_indicator_rubric_version_id)
                )
                  return null;
                return (
                  <div className="observation-indicator" key={mapping.id}>
                    <div>
                      <strong>{indicator.name}</strong>
                      {indicator.target && (
                        <small>Target: {indicator.target}</small>
                      )}
                      <small>
                        Bobot {Number(mapping.weight).toFixed(1)}% dalam aspek ·{" "}
                        {masterMapping?.is_required ? "Wajib" : "Opsional"}
                      </small>
                    </div>
                    <AssessmentRatingCell
                      participantId={participant.id}
                      rubricVersionId={activeVersion.id}
                      indicatorId={indicator.id}
                      indicatorName={indicator.name ?? "Indikator"}
                      rating={saved ?? null}
                      peerRatings={(ratings ?? []).filter(
                        (item) =>
                          item.participant_id === participant.id &&
                          item.indicator_id === indicator.id,
                      )}
                      observerId={userId}
                      peerStatuses={
                        submissionStatusByObserver.get(participant.id) ?? {}
                      }
                      readOnly={profile.role === "admin_system"}
                      locked={
                        status !== "draft" && profile.role !== "admin_system"
                      }
                      descriptors={indicator.score_descriptors ?? {}}
                      guidance={masterMapping?.observation_guidance}
                    />
                  </div>
                );
              })}
          </div>
        ))}
      <ObserverNotes
        participantId={participant.id}
        rubricVersionId={activeVersion.id}
        currentUserId={userId}
        notes={asRows<NoteRecord>(
          (observerNotes ?? [])
            .filter((note) => note.participant_id === participant.id)
            .map((note) => ({
              ...note,
              observer_note_revisions: (note.observer_note_revisions ?? [])
                .slice()
                .sort((a, b) => b.revision - a.revision)
                .slice(0, 8),
            })),
          isNoteRecord,
        )}
        locked={profile.role === "admin_system" || status !== "draft"}
      />
      <SubmissionControls
        participantId={participant.id}
        rubricVersionId={activeVersion.id}
        status={status}
        role={profile.role}
        submittedCount={submittedCount}
        assignedCount={eventAssignments.length}
      />
    </details>
  );
}
