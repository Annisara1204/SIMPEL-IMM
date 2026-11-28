/** Aturan murni penugasan kegiatan, dipakai helper otorisasi dan diuji unit. */
export function canManageEvent(
  role: string | null,
  hasAssignment: boolean,
): boolean {
  return role === "admin_system" || (role === "observer" && hasAssignment);
}
