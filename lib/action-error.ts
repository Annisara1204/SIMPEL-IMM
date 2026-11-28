import { redirect } from "next/navigation";
import { actionErrorUrl } from "@/lib/action-error-url";

export { actionErrorUrl };

/** Kesalahan validasi yang tahu kolom mana yang perlu diperbaiki. */
export class FormFieldError extends Error {
  readonly field: string;
  constructor(field: string, message: string) {
    super(message);
    this.name = "FormFieldError";
    this.field = field;
  }
}

function isNextControlError(error: unknown): boolean {
  const digest = (error as (Error & { digest?: unknown }) | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_");
}

/** Jalankan aksi formulir; validasi yang diharapkan menjadi pesan inline. */
export async function runAction<T>(
  path: string,
  formData: FormData,
  action: (formData: FormData) => Promise<T>,
  contextKeys: readonly string[] = [],
): Promise<T> {
  try {
    return await action(formData);
  } catch (error) {
    if (isNextControlError(error)) throw error;
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Operasi gagal. Muat ulang halaman dan coba lagi.";
    redirect(
      actionErrorUrl(
        path,
        message,
        formData,
        contextKeys,
        error instanceof FormFieldError ? error.field : undefined,
      ),
    );
  }
}
