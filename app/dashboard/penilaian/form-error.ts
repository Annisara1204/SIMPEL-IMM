import { redirect } from "next/navigation";

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
  const params = new URLSearchParams();
  if (formData)
    for (const key of contextKeys) {
      const value = String(formData.get(key) ?? "");
      if (value) params.set(key, value);
    }
  params.set("error", message.slice(0, 300));
  return `/dashboard/penilaian?${params.toString()}`;
}

/** Jalankan aksi formulir dan tampilkan kegagalan yang diharapkan sebagai pesan inline. */
export async function runPenilaianAction(
  formData: FormData,
  action: (formData: FormData) => Promise<void>,
): Promise<void> {
  try {
    await action(formData);
  } catch (error) {
    const digest = (error as (Error & { digest?: unknown }) | null)?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT"))
      throw error;
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Operasi gagal. Muat ulang halaman dan coba lagi.";
    redirect(penilaianErrorUrl(message, formData));
  }
}
