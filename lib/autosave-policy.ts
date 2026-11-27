/** Aturan murni untuk menjadwalkan autosave. Dipakai sel skor dan catatan. */
export function canScheduleAutosave(state: {
  dirty: boolean;
  conflict: boolean;
  pending: boolean;
  failed: boolean;
  online: boolean;
}): boolean {
  return (
    state.dirty &&
    !state.conflict &&
    !state.pending &&
    !state.failed &&
    state.online
  );
}
