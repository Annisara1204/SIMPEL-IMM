/** Pemeriksa minimum untuk hasil RPC/relasi sebelum dipakai komponen. */
export function isAssessmentSummaryRow(
  value: Record<string, unknown>,
): boolean {
  return (
    typeof value.participant_id === "string" &&
    typeof value.indicator_id === "string" &&
    typeof value.assessment_scope_key === "string" &&
    typeof value.aspect_weight === "number" &&
    typeof value.indicator_weight === "number"
  );
}

export function isEventReportRow(value: Record<string, unknown>): boolean {
  return (
    typeof value.participant_id === "string" &&
    typeof value.display_name === "string" &&
    "snapshot_id" in value
  );
}

export function isNoteRecord(value: Record<string, unknown>): boolean {
  return (
    typeof value.id === "string" &&
    typeof value.content === "string" &&
    typeof value.revision === "number"
  );
}
