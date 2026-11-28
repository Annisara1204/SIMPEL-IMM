/** Pembantu murni untuk wizard impor nilai tes. */
export function textCell(value: string | number | undefined): string {
  return String(value ?? "").trim();
}

export function suggestedColumn(
  headers: string[],
  type: "name" | "commissariat" | "score",
): number {
  const key = (value: string) =>
    value.toLocaleLowerCase("id-ID").replace(/[^a-z0-9]/g, "");
  const patterns =
    type === "name"
      ? ["nama", "namalengkap", "name"]
      : type === "commissariat"
        ? ["komisariat", "asal", "commission"]
        : ["skor", "nilai", "score", "totalpoints", "points"];
  return headers.findIndex((header) =>
    patterns.some((pattern) => key(header).includes(pattern)),
  );
}
