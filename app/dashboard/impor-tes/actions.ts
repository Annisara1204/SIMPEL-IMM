"use server";

import * as XLSX from "xlsx";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const maxWorkbookBytes = 5 * 1024 * 1024;
const maxRows = 500;
const maxColumns = 50;
type RawImportRow = {
  rowNumber: number;
  name: string;
  commissariat: string;
  score: number;
};

async function authorizedClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (!profile || profile.role !== "admin_system")
    throw new Error(
      "Akses impor hasil tes hanya untuk Admin Sistem (Super Admin).",
    );
  return { supabase, userId };
}

export async function parseWorkbook(formData: FormData) {
  await authorizedClient();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size < 1)
    return {
      ok: false as const,
      message: "Pilih berkas Excel .xlsx terlebih dahulu.",
    };
  if (file.size > maxWorkbookBytes)
    return { ok: false as const, message: "Ukuran berkas maksimal 5 MB." };
  if (!file.name.toLowerCase().endsWith(".xlsx"))
    return { ok: false as const, message: "Format berkas harus Excel .xlsx." };
  try {
    const workbook = XLSX.read(new Uint8Array(await file.arrayBuffer()), {
      type: "array",
      cellDates: false,
      bookSheets: false,
      sheetRows: maxRows + 1,
    });
    if (!workbook.SheetNames.length)
      return {
        ok: false as const,
        message: "Berkas tidak berisi lembar kerja.",
      };
    if (workbook.SheetNames.length > 10)
      return {
        ok: false as const,
        message: "Batas berkas adalah 10 lembar kerja.",
      };
    const sheets = workbook.SheetNames.map((name) => {
      const sheet = workbook.Sheets[name];
      if (sheet["!ref"]) {
        const range = XLSX.utils.decode_range(sheet["!ref"]);
        if (range.e.r + 1 > maxRows + 1 || range.e.c + 1 > maxColumns)
          throw new Error(
            "Batas berkas adalah 500 baris data dan 50 kolom per lembar.",
          );
      }
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        raw: true,
        defval: "",
        blankrows: true,
      });
      if (
        matrix.length > maxRows + 1 ||
        matrix.some((row) => row.length > maxColumns)
      )
        throw new Error(
          "Batas berkas adalah 500 baris data dan 50 kolom per lembar.",
        );
      const rows = matrix.map((row) =>
        row.map((cell) =>
          typeof cell === "string" || typeof cell === "number"
            ? cell
            : String(cell ?? ""),
        ),
      );
      return { name, rows };
    });
    return { ok: true as const, filename: file.name, sheets };
  } catch (error) {
    return {
      ok: false as const,
      message:
        error instanceof Error
          ? error.message
          : "Berkas Excel tidak dapat dibaca.",
    };
  }
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("id-ID");
}

export async function matchImportedRows(input: {
  eventId: string;
  testType: string;
  rows: RawImportRow[];
}) {
  const { supabase } = await authorizedClient();
  if (
    !input ||
    typeof input !== "object" ||
    !/^[0-9a-f-]{36}$/i.test(input.eventId) ||
    !["pretest", "posttest"].includes(input.testType) ||
    !Array.isArray(input.rows) ||
    input.rows.length < 1 ||
    input.rows.length > maxRows
  )
    throw new Error(
      "Pilihan kegiatan, jenis tes, atau jumlah baris tidak valid.",
    );
  if (
    input.rows.some(
      (row) =>
        !row ||
        !Number.isInteger(row.rowNumber) ||
        row.rowNumber < 2 ||
        typeof row.name !== "string" ||
        row.name.trim().length < 1 ||
        row.name.length > 300 ||
        typeof row.commissariat !== "string" ||
        row.commissariat.trim().length < 1 ||
        row.commissariat.length > 300 ||
        !Number.isFinite(row.score),
    )
  )
    throw new Error(
      "Ada baris tanpa nama, Komisariat, atau nilai numerik yang valid.",
    );
  const [
    { data: participants, error: participantError },
    { data: current, error: currentError },
  ] = await Promise.all([
    supabase
      .from("participants")
      .select("id, display_name, commissariat")
      .eq("event_id", input.eventId)
      .order("display_name"),
    supabase
      .from("test_results")
      .select("id, participant_id, score, created_at, import_id")
      .eq("event_id", input.eventId)
      .eq("test_type", input.testType)
      .eq("is_current", true),
  ]);
  if (participantError || currentError)
    throw new Error(
      "Data peserta atau nilai sebelumnya belum dapat dibaca. Jalankan migrasi Tahap 5 di Supabase.",
    );
  const importIds = [
    ...new Set((current ?? []).map((result) => result.import_id)),
  ];
  const { data: imports } = importIds.length
    ? await supabase
        .from("test_imports")
        .select("id, source_filename, imported_at")
        .in("id", importIds)
    : { data: [] };
  const importMap = new Map((imports ?? []).map((item) => [item.id, item]));
  const participantOptions = (participants ?? []).map((person) => ({
    id: person.id,
    name: person.display_name,
    commissariat: person.commissariat,
  }));
  return {
    participants: participantOptions,
    matches: input.rows.map((row) => ({
      rowNumber: row.rowNumber,
      name: row.name,
      commissariat: row.commissariat,
      score: row.score,
      candidates: participantOptions.filter(
        (person) =>
          normalize(person.name) === normalize(row.name) &&
          normalize(person.commissariat) === normalize(row.commissariat),
      ),
    })),
    currentResults: (current ?? []).map((result) => ({
      participantId: result.participant_id,
      score: Number(result.score),
      importedAt: result.created_at,
      filename:
        importMap.get(result.import_id)?.source_filename ?? "Berkas sebelumnya",
    })),
  };
}

export async function commitImport(input: {
  eventId: string;
  testType: string;
  filename: string;
  rows: {
    participantId: string;
    rowNumber: number;
    name: string;
    commissariat: string;
    score: number;
    isCurrent: boolean;
  }[];
}) {
  const { supabase } = await authorizedClient();
  if (
    !input ||
    typeof input !== "object" ||
    !/^[0-9a-f-]{36}$/i.test(input.eventId) ||
    !["pretest", "posttest"].includes(input.testType) ||
    typeof input.filename !== "string" ||
    !input.filename.toLowerCase().endsWith(".xlsx") ||
    input.filename.trim().length < 1 ||
    input.filename.length > 255 ||
    !Array.isArray(input.rows) ||
    input.rows.length < 1 ||
    input.rows.length > maxRows
  )
    throw new Error("Data impor tidak valid.");
  if (
    input.rows.some(
      (row) =>
        !row ||
        typeof row.participantId !== "string" ||
        !/^[0-9a-f-]{36}$/i.test(row.participantId) ||
        !Number.isInteger(row.rowNumber) ||
        row.rowNumber < 2 ||
        typeof row.name !== "string" ||
        row.name.trim().length < 1 ||
        row.name.length > 300 ||
        typeof row.commissariat !== "string" ||
        row.commissariat.trim().length < 1 ||
        row.commissariat.length > 300 ||
        !Number.isFinite(row.score) ||
        typeof row.isCurrent !== "boolean",
    ) ||
    new Set(input.rows.map((row) => row.rowNumber)).size !== input.rows.length
  )
    throw new Error("Ada baris yang tidak lengkap atau tidak valid.");
  const { data, error } = await supabase.rpc("commit_test_import_admin", {
    p_event_id: input.eventId,
    p_test_type: input.testType,
    p_source_filename: input.filename,
    p_rows: input.rows.map((row) => ({
      participant_id: row.participantId,
      source_row_number: row.rowNumber,
      source_name: row.name.trim(),
      source_commissariat: row.commissariat.trim(),
      score: row.score,
      is_current: row.isCurrent,
    })),
  });
  if (error || !data)
    throw new Error(
      error?.message ||
        "Impor gagal disimpan. Pastikan migrasi Tahap 5 sudah dijalankan.",
    );
  revalidatePath("/dashboard/impor-tes");
  return { importId: data as string };
}
