/** Pemetaan status ke kelas badge, dipakai nilai status dinamis. */
export function statusBadgeClass(status: string): string {
  const value = status.toLowerCase();
  if (value === "published" || value === "diterbitkan")
    return "badge badge--published";
  if (value === "finalized" || value === "final")
    return "badge badge--finalized";
  if (value === "provisional" || value === "sementara")
    return "badge badge--provisional";
  if (value === "active" || value === "done" || value === "selesai")
    return "badge badge--success";
  if (value === "live" || value === "ongoing" || value === "berlangsung")
    return "badge badge--warning";
  return "badge badge--neutral";
}
