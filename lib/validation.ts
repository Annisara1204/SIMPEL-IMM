/** Pola & helper validasi bersama. Sumber tunggal untuk regex UUID. */
export const uuidPattern = /^[0-9a-f-]{36}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}
