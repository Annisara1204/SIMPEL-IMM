import { actionErrorUrl, runAction } from "@/lib/action-error";

const contextKeys = [
  "eventId",
  "stage",
  "materialId",
  "typeId",
  "versionId",
  "assignment",
  "showArchived",
] as const;

export function penilaianErrorUrl(
  message: string,
  formData?: FormData,
): string {
  return actionErrorUrl("/dashboard/penilaian", message, formData, contextKeys);
}

/** Jalankan aksi formulir dan tampilkan kegagalan yang diharapkan sebagai pesan inline. */
export async function runPenilaianAction(
  formData: FormData,
  action: (formData: FormData) => Promise<void>,
): Promise<void> {
  return runAction("/dashboard/penilaian", formData, action, contextKeys);
}
