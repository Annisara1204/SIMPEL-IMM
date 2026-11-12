/**
 * Tipe baris mentah dari RPC Supabase / PostgREST.
 * Klien Supabase tanpa tipe hasil (belum ada generated types) mengembalikan
 * `any`; berkas ini menjadi batas konversi: di bawah sini semuanya bertipe.
 * Nama kolom mengikuti definisi fungsi SQL / select() apa adanya (snake_case).
 */

import { type Relation } from "./relations";

// ---------- Phase 6: RPC get_event_assessment_summary ----------
export type AssessmentSummaryRow = {
  participant_id: string;
  indicator_id: string;
  assessment_scope: "session" | "cross_session";
  assessment_scope_key: string;
  source_rubric_version_ids: string[] | null;
  average_score: number | null;
  valid_rating_count: number;
  minimum_score: number | null;
  maximum_score: number | null;
  score_range: number | null;
  not_observed_count: number;
  pending_count: number;
  review_status: "normal" | "needs_review";
  aspect_id: string;
  aspect_name: string;
  aspect_weight: number;
  indicator_weight: number;
};

// ---------- Phase 7: snapshot final Fase 6 (snapshot_data) ----------
export type SnapshotAspect = {
  aspectId?: string;
  aspectName?: string;
  aspect_id?: string | null;
  aspect_name?: string | null;
  weight?: number;
  score?: number | null;
  scoreOutOf100?: number | null;
  score_out_of_100?: number | null;
  plannedIndicators?: number;
  assessedIndicators?: number;
  notObservedIndicators?: number;
  pendingIndicators?: number;
  coverage?: number;
  valid?: boolean;
};

export type SnapshotIndicator = {
  participantId?: string;
  indicatorId?: string;
  scope?: string;
  scopeKey?: string;
  scope_key?: string | null;
  sourceRubricVersionIds?: string[];
  average?: number | null;
  validRatings?: number;
  minimum?: number | null;
  maximum?: number | null;
  range?: number | null;
  notObserved?: number;
  pending?: number;
  reviewStatus?: string;
  observerScores?: {
    observerId: string;
    score: number | null;
    status: string;
  }[];
};

export type ApprovedRecommendation = {
  id?: string;
  recommendation: string;
  evidence_references?: unknown;
  approved_by?: string | null;
  approved_at?: string | null;
};

export type CollectiveBlock = {
  summary?: string;
  strengths?: string;
  developmentAreas?: string;
  recommendationSummary?: string;
  decision?: string;
  decisionRationale?: string;
};

export type ReportSnapshotData = {
  schemaVersion?: number;
  createdAt?: string;
  participantId?: string;
  eventId?: string;
  aspects?: SnapshotAspect[];
  indicators?: SnapshotIndicator[];
  overall?: { score?: number | null; status?: string; reasons?: string[] };
  collective?: CollectiveBlock;
  approvedRecommendations?: ApprovedRecommendation[];
};

// ---------- Phase 7: RPC get_event_report_rows ----------
export type EventReportRow = {
  participant_id: string;
  display_name: string;
  student_number: string | null;
  group_name: string | null;
  commissariat: string;
  account_linked: boolean;
  snapshot_id: string | null;
  snapshot_data: ReportSnapshotData | null;
  /** jsonb di basis data — runtime array of uuid (string). */
  rubric_version_ids: string[] | null;
  framework_version_ids: string[] | null;
  finalized_at: string | null;
  published_at: string | null;
  publication_revision: number | null;
};

// ---------- Phase 7: RPC get_event_assessment_progress ----------
export type AssessmentProgressRow = {
  observer_id: string;
  observer_name: string;
  expected_submissions: number;
  draft_count: number;
  submitted_count: number;
  finalized_count: number;
  incomplete_count: number;
};

// ---------- Phase 7: RPC get_my_published_assessment_report ----------
export type ParticipantReport = {
  snapshot_id: string;
  snapshot_data: ReportSnapshotData;
  finalized_at: string | null;
  published_at: string;
  event: {
    id: string;
    name: string;
    theme: string | null;
    organizer: string | null;
    commissariat: string | null;
    location: string | null;
    starts_on: string | null;
    ends_on: string | null;
  };
  participant: {
    display_name: string;
    student_number: string | null;
    group_name: string | null;
    commissariat: string | null;
  };
  indicator_names?: Record<string, string>;
  version_info?: string[];
};

// ---------- Phase 7: assessment_snapshot_private_sources ----------
export type PrivateRating = {
  id?: string;
  submission_id?: string;
  indicator_id?: string;
  score?: number | null;
  response_status?: string;
  evidence?: string | null;
  observer_name?: string | null;
  observer_id?: string | null;
  rubric_version_id?: string;
  updated_at?: string | null;
};

export type PrivateSourcePayload = {
  ratings?: PrivateRating[];
  moderations?: Record<string, unknown>[];
  collective?: Record<string, unknown>;
};

export type PrivateSourceRow = {
  snapshot_id: string;
  private_payload: PrivateSourcePayload | null;
};

// ---------- Phase 7: events (bentuk untuk Props komponen) ----------
export type EventRow = {
  id: string;
  name: string;
  theme?: string | null;
  organizer?: string | null;
  commissariat?: string | null;
  location?: string | null;
  starts_on?: string | null;
  ends_on?: string | null;
};

// ---------- Relasi join yang dipakai di beberapa halaman ----------
export type RubricMaterialRef = { name: string } | null;
export type CompetencyFrameworkRef = { name: string } | null;

export type RubricIndicatorJoined = {
  id: string;
  name: string;
  competency_indicator_id: string | null;
};
export type RubricIndicatorAspectJoined = {
  weight?: number;
  rubric_indicators: Relation<RubricIndicatorJoined>;
};
export type RubricAspectJoined = {
  id?: string;
  competency_aspect_id?: string | null;
  name?: string;
  weight?: number;
  position?: number;
  rubric_indicator_aspects: RubricIndicatorAspectJoined[] | null;
};
export type RubricVersionJoined = {
  id: string;
  version: number;
  stage: string;
  material_id: string | null;
  competency_framework_version_id?: string | null;
  rubric_materials?: Relation<RubricMaterialRef>;
  rubric_aspects?: RubricAspectJoined[] | null;
};

export type CompetencyFrameworkVersionJoined = {
  id: string;
  version: number;
  competency_frameworks?: Relation<CompetencyFrameworkRef>;
};

// ---------- Master kerangka kompetensi (Phase 2/4) ----------
export type CompetencyAspectMaster = {
  id: string;
  framework_version_id: string;
  code: string;
  name: string;
  weight: number;
  position: number;
};

export type CompetencyIndicatorMaster = {
  id: string;
  code: string;
  name: string;
  position: number;
  description: string;
  observable_behaviors: string | null;
};

export type CompetencyMaterialAspectLink = {
  aspect_id: string;
  position: number;
  competency_aspects?: Relation<CompetencyAspectMaster>;
};

export type CompetencyMaterialIndicatorLink = {
  indicator_id: string;
  aspect_id: string;
  position: number;
  competency_indicator_rubric_version_id: string | null;
  competency_indicators?: Relation<CompetencyIndicatorMaster>;
};
