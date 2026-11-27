/** URL halaman dengan pesan kegagalan dan konteks formulir yang masih relevan. */
export function actionErrorUrl(
  path: string,
  message: string,
  formData?: FormData,
  contextKeys: readonly string[] = [],
): string {
  const params = new URLSearchParams();
  if (formData)
    for (const key of contextKeys) {
      const value = String(formData.get(key) ?? "");
      if (value) params.set(key, value);
    }
  params.set("error", message.slice(0, 300));
  return `${path}?${params.toString()}`;
}
