import { safeActionMessage } from "./action-error-messages.ts";

/** URL halaman dengan pesan kegagalan dan konteks formulir yang masih relevan. */
export function actionErrorUrl(
  path: string,
  message: string,
  formData?: FormData,
  contextKeys: readonly string[] = [],
  field?: string,
): string {
  const params = new URLSearchParams();
  if (formData)
    for (const key of contextKeys) {
      const value = String(formData.get(key) ?? "");
      if (value) params.set(key, value);
    }
  params.set("error", safeActionMessage(message).slice(0, 300));
  if (field && /^[a-zA-Z0-9_-]+$/.test(field)) params.set("field", field);
  return `${path}?${params.toString()}`;
}
