import type { ReportSnapshotData } from "./supabase-rows";
import { categorizeScore } from "./scoring.ts";
import { decisionLabel } from "./decision-labels.ts";

export type ReportFileData = {
  participant: {
    display_name: string;
    student_number?: string | null;
    group_name?: string | null;
    major?: string | null;
    commissariat?: string | null;
  };
  event: {
    name: string;
    theme?: string | null;
    organizer?: string | null;
    commissariat?: string | null;
    location?: string | null;
    starts_on?: string | null;
    ends_on?: string | null;
  };
  publishedAt?: string | null;
  evaluatorNames?: string | null;
  approverName?: string | null;
  approvedAt?: string | null;
  /** Dipakai hanya untuk mengambil snapshot penuh saat ekspor. */
  snapshotId?: string | null;
  snapshotData: ReportSnapshotData;
  indicatorNames?: Record<string, string>;
  /** Snapshot Published lain untuk peserta yang sama, dipakai grafik perkembangan. */
  materialHistory?: {
    label: string;
    score: number | null;
    aspects: { name: string; score: number | null }[];
  }[];
  eventSummary?: boolean;
  summaryText?: string;
  versionInfo?: string[];
};

const MAROON = "0.545 0.118 0.247";
const INK = "0.12 0.16 0.2";
const MUTED = "0.45 0.48 0.51";
const WHITE = "1 1 1";
const LIGHT = "0.97 0.96 0.97";
const TRACK = "0.88 0.91 0.94";

const ascii = (value: unknown) =>
  String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7E\n]/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
const pdfEscape = (value: string) =>
  ascii(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\n/g, " ");

function wrapWords(text: string, limit: number): string[] {
  const lines: string[] = [];
  for (const word of ascii(text).split(" ").filter(Boolean)) {
    if (word.length > limit) {
      for (let start = 0; start < word.length; start += limit)
        lines.push(word.slice(start, start + limit));
      continue;
    }
    const last = lines[lines.length - 1];
    if (!last) lines.push(word);
    else if (`${last} ${word}`.length <= limit)
      lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}

const wrap = (text: string, limit = 88) =>
  ascii(text)
    .split(/\n+/)
    .filter(Boolean)
    .flatMap((paragraph) => wrapWords(paragraph, limit));

/** Buang pembukaan draf otomatis agar PDF hanya memuat tindak lanjutnya. */
function shortenRecommendation(value: string): string {
  const text = ascii(value).trim();
  if (!/^Draf otomatis untuk indikator/i.test(text)) return text;
  return text
    .replace(/^Draf otomatis untuk indikator[^:]*:\s*/i, "")
    .replace(/^[“"][^”"]*[”"]\s*\(aspek\s+[^)]*\)\s*[.:]?\s*/i, "")
    .trim();
}

const moneyDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("id-ID") : "Belum diisi";

const fullDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const dateRange = (start?: string | null, end?: string | null) => {
  if (!start && !end) return "Tanggal belum diisi";
  if (!start || !end) return fullDate(start ?? end!);
  const first = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  if (
    first.getFullYear() === last.getFullYear() &&
    first.getMonth() === last.getMonth()
  )
    return `${first.getDate()} - ${fullDate(end)}`;
  return `${fullDate(start)} - ${fullDate(end)}`;
};
const category = (value: number | null) =>
  value === null
    ? "Belum tersedia"
    : (categorizeScore(value)?.label ?? "Belum tersedia");

type Cell = { x: number; lines: string[] };
type Bar = { x: number; width: number; value: number | null };
type DrawRow =
  | { kind: "title"; text: string; keepWithNext?: boolean }
  | { kind: "subtitle"; text: string; keepWithNext?: boolean }
  | { kind: "heading"; text: string; keepWithNext?: boolean }
  | { kind: "text"; text: string; size?: number; color?: string }
  | { kind: "kv"; label: string; value: string }
  | { kind: "tableHead"; cols: Cell[]; keepWithNext?: boolean }
  | { kind: "tableRow"; cols: Cell[]; bar?: Bar }
  | {
      kind: "aspectChart";
      items: { label: string; value: number | null }[];
      keepWithNext?: boolean;
    }
  | { kind: "stats"; cells: { label: string; value: string }[] }
  | { kind: "space"; height: number };

const cell = (text: string, limit: number, x = 40): Cell => ({
  x,
  lines: wrap(text, limit).slice(0, 2),
});

function rowHeight(row: DrawRow): number {
  switch (row.kind) {
    case "title":
      return 30;
    case "subtitle":
      return 22;
    case "heading":
      return 24;
    case "tableHead":
      return 20;
    case "tableRow":
      return Math.max(...row.cols.map((col) => col.lines.length)) * 12 + 10;
    case "aspectChart":
      return 40 + row.items.length * 18;
    case "stats":
      return 38;
    case "space":
      return row.height;
    case "text":
      return row.size && row.size > 9 ? 20 : 17;
    case "kv":
      return 17;
  }
}

function reportRows(report: ReportFileData): DrawRow[] {
  const data = report.snapshotData ?? {};
  const aspects = Array.isArray(data.aspects) ? data.aspects : [];
  const indicators = Array.isArray(data.indicators) ? data.indicators : [];
  const collective = data.collective ?? {};
  const overallScore =
    typeof data.overall?.score === "number" ? data.overall.score : null;
  const rows: DrawRow[] = [];
  const heading = (text: string) =>
    rows.push({ kind: "heading", text, keepWithNext: true });
  const text = (value: string, size?: number) =>
    rows.push({ kind: "text", text: value, size });
  const kv = (label: string, value: string) =>
    rows.push({ kind: "kv", label, value });

  rows.push({
    kind: "title",
    text: report.eventSummary
      ? "LAPORAN KESELURUHAN KEGIATAN DAD"
      : "RAPOT DAD KADER",
    keepWithNext: true,
  });
  text("Pimpinan Cabang Ikatan Mahasiswa Muhammadiyah Kota Bandung", 10);
  rows.push({ kind: "subtitle", text: report.event.name, keepWithNext: true });
  text(
    `Tanggal kegiatan: ${dateRange(report.event.starts_on, report.event.ends_on)}`,
  );
  rows.push({ kind: "space", height: 6 });

  if (report.eventSummary) {
    heading("RINGKASAN EKSEKUTIF");
    wrap(
      report.summaryText ||
        "Laporan menggunakan data snapshot final yang tersedia.",
    ).forEach((line) => text(line));
  } else {
    heading("PROFIL PESERTA");
    kv("Nama Lengkap", report.participant.display_name || "Belum diisi");
    kv("Asal Jurusan", report.participant.major || "Belum diisi");
    kv(
      "Asal Komisariat",
      report.participant.commissariat ||
        report.event.commissariat ||
        "Belum diisi",
    );
    kv("NIM", report.participant.student_number || "Belum diisi");
  }
  kv(
    "Framework / rubrik",
    report.versionInfo?.length
      ? report.versionInfo.join("; ")
      : "Versi snapshot: tidak tercatat",
  );
  rows.push({ kind: "space", height: 6 });

  heading(report.eventSummary ? "RATA-RATA KESELURUHAN" : "RINGKASAN NILAI");
  kv(
    report.eventSummary ? "Rata-rata peserta final" : "Nilai akhir",
    overallScore === null
      ? "Belum tersedia"
      : `${overallScore.toFixed(1)} / 100`,
  );
  kv("Kategori", category(overallScore));
  kv("Status", report.publishedAt ? "Diterbitkan" : "Belum diterbitkan");
  if (!report.eventSummary) kv("Keputusan", decisionLabel(collective.decision));
  kv("Diterbitkan", moneyDate(report.publishedAt));
  rows.push({ kind: "space", height: 6 });

  heading("CAKUPAN PENILAIAN");
  const total = (
    key:
      | "plannedIndicators"
      | "assessedIndicators"
      | "notObservedIndicators"
      | "pendingIndicators",
  ) => aspects.reduce((sum, aspect) => sum + Number(aspect[key] ?? 0), 0);
  rows.push({
    kind: "stats",
    cells: [
      {
        label: "Indikator direncanakan",
        value: String(total("plannedIndicators")),
      },
      {
        label: "Indikator dinilai",
        value: String(total("assessedIndicators")),
      },
      {
        label: "Tidak teramati",
        value: String(total("notObservedIndicators")),
      },
      { label: "Menunggu penilai", value: String(total("pendingIndicators")) },
    ],
  });
  rows.push({ kind: "space", height: 6 });

  heading("ASPEK PENILAIAN");
  rows.push({
    kind: "tableHead",
    cols: [
      { x: 40, lines: ["ASPEK"] },
      { x: 260, lines: ["BOBOT"] },
      { x: 310, lines: ["HASIL SKOR (0-100)"] },
      { x: 470, lines: ["GAMBAR"] },
    ],
    keepWithNext: true,
  });
  for (const aspect of aspects) {
    const score = aspect.score == null ? null : Number(aspect.score);
    const score100 =
      aspect.scoreOutOf100 == null &&
      aspect.score_out_of_100 == null &&
      score === null
        ? null
        : Number(
            aspect.scoreOutOf100 ??
              aspect.score_out_of_100 ??
              (score === null ? 0 : score * 20),
          );
    rows.push({
      kind: "tableRow",
      cols: [
        cell(aspect.aspectName ?? aspect.aspect_name ?? "Aspek", 30),
        {
          x: 260,
          lines: [
            aspect.weight == null
              ? "Belum tercatat"
              : `${Number(aspect.weight)}%`,
          ],
        },
        {
          x: 310,
          lines: [
            score100 === null ? "Belum tersedia" : `${score100.toFixed(1)}/100`,
          ],
        },
      ],
      bar:
        score === null
          ? undefined
          : { x: 470, width: 80, value: Math.max(0, Math.min(5, score)) },
    });
  }
  rows.push({ kind: "space", height: 6 });

  const materialChart = (report.materialHistory ?? []).filter(
    (item) => item.score !== null,
  );
  if (materialChart.length >= 2) {
    heading("GRAFIK RATA-RATA NILAI PER MATERI");
    rows.push({
      kind: "aspectChart",
      items: materialChart.map((item) => ({
        label: item.label,
        value: item.score,
      })),
      keepWithNext: true,
    });
    rows.push({ kind: "space", height: 6 });
  } else if ((report.materialHistory ?? []).length === 1) {
    text(
      "Grafik rata-rata per materi belum tersedia karena hanya satu materi yang diterbitkan.",
    );
  }

  if (report.eventSummary) {
    heading("RINGKASAN ASPEK");
    for (const aspect of aspects)
      text(
        `${aspect.aspectName ?? aspect.aspect_name ?? "Aspek"} - bobot ${aspect.weight == null ? "Belum tercatat" : `${Number(aspect.weight)}%`}`,
      );
  } else {
    heading("NILAI PER INDIKATOR");
    rows.push({
      kind: "tableHead",
      cols: [
        { x: 40, lines: ["INDIKATOR"] },
        { x: 430, lines: ["SKOR"] },
      ],
      keepWithNext: true,
    });
    for (const item of indicators) {
      rows.push({
        kind: "tableRow",
        cols: [
          cell(
            report.indicatorNames?.[item.indicatorId ?? ""] ??
              item.indicatorId ??
              "Indikator",
            62,
          ),
          {
            x: 430,
            lines: [
              item.average == null
                ? "Belum tersedia"
                : `${Number(item.average).toFixed(1)}/5`,
            ],
          },
        ],
      });
    }
  }
  rows.push({ kind: "space", height: 6 });

  heading(report.eventSummary ? "STATUS CAKUPAN DATA" : "KEKUATAN");
  wrap(
    collective.strengths || "Belum ada catatan kekuatan yang disahkan.",
  ).forEach((line) => text(line));
  heading(report.eventSummary ? "KETERBATASAN DATA" : "AREA PENGEMBANGAN");
  wrap(
    collective.developmentAreas || "Belum ada area pengembangan yang disahkan.",
  ).forEach((line) => text(line));
  heading("REKOMENDASI TINGKAT LANJUT");
  const recommendations = Array.isArray(data.approvedRecommendations)
    ? [
        ...new Set(
          data.approvedRecommendations
            .map((item) => shortenRecommendation(item.recommendation))
            .filter(Boolean),
        ),
      ]
    : [];
  if (recommendations.length)
    recommendations.forEach((item, index) =>
      wrap(`${index + 1}. ${item}`).forEach((line) => text(line)),
    );
  else
    text(
      report.eventSummary
        ? "Belum cukup pola rekomendasi yang berulang untuk dirangkum."
        : "Belum ada rekomendasi yang disahkan.",
    );
  wrap(collective.recommendationSummary || "").forEach((line) => text(line));

  if (report.eventSummary) {
    heading("CATATAN METODOLOGI");
    wrap(
      "Skor dan distribusi dihitung dari snapshot final. Data Draft/Submitted dan catatan internal penilai tidak digunakan.",
    ).forEach((line) => text(line));
  }
  heading("ALASAN KEPUTUSAN");
  wrap(
    collective.decisionRationale ||
      "Belum ada alasan yang tercatat di snapshot.",
  ).forEach((line) => text(line));
  rows.push({ kind: "space", height: 10 });
  heading("PENGESAHAN");
  kv("Dinilai oleh", report.evaluatorNames || "Belum tercatat");
  kv("Disahkan oleh", report.approverName || "Belum tercatat");
  kv("Tanggal disahkan", moneyDate(report.approvedAt ?? report.publishedAt));
  return rows;
}

function paginate(rows: DrawRow[]): DrawRow[][] {
  const pages: DrawRow[][] = [];
  let page: DrawRow[] = [];
  let used = 0;
  const limit = 700;
  rows.forEach((row, index) => {
    const keep = "keepWithNext" in row && row.keepWithNext === true;
    const needed =
      rowHeight(row) +
      (keep && rows[index + 1] ? rowHeight(rows[index + 1]) : 0);
    if (used + needed > limit && page.length) {
      pages.push(page);
      page = [];
      used = 0;
    }
    page.push(row);
    used += rowHeight(row);
  });
  if (page.length) pages.push(page);
  return pages;
}

function drawText(
  stream: string[],
  value: string,
  x: number,
  y: number,
  size: number,
  color: string,
  bold: boolean,
) {
  stream.push(
    `${color} rg BT /${bold ? "F2" : "F1"} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${pdfEscape(value)}) Tj ET`,
  );
}

function drawRow(stream: string[], row: DrawRow, y: number) {
  if (row.kind === "title") {
    drawText(stream, row.text, 40, y, 18, MAROON, true);
    return;
  }
  if (row.kind === "subtitle") {
    drawText(stream, row.text, 40, y, 12, INK, true);
    return;
  }
  if (row.kind === "heading") {
    drawText(stream, row.text, 40, y, 12, MAROON, true);
    stream.push(`${MAROON} RG 0.6 w 40 ${y - 6} m 555 ${y - 6} l S`);
    return;
  }
  if (row.kind === "text") {
    drawText(stream, row.text, 40, y, row.size ?? 9, row.color ?? INK, false);
    return;
  }
  if (row.kind === "kv") {
    drawText(stream, row.label, 40, y, 9, MUTED, false);
    drawText(stream, row.value, 190, y, 9, INK, false);
    return;
  }
  if (row.kind === "tableHead") {
    row.cols.forEach((col) =>
      drawText(stream, col.lines[0] ?? "", col.x, y, 8, MAROON, true),
    );
    stream.push(`${MAROON} RG 0.6 w 40 ${y - 5} m 555 ${y - 5} l S`);
    return;
  }
  if (row.kind === "tableRow") {
    row.cols.forEach((col) =>
      col.lines.forEach((line, index) =>
        drawText(stream, line, col.x, y - index * 12, 8.5, INK, false),
      ),
    );
    if (row.bar && row.bar.value !== null) {
      const width = Math.max(
        0,
        Math.min(row.bar.width, (row.bar.value / 5) * row.bar.width),
      );
      stream.push(`${TRACK} rg ${row.bar.x} ${y - 8} ${row.bar.width} 7 re f`);
      stream.push(`${MAROON} rg ${row.bar.x} ${y - 8} ${width} 7 re f`);
    }
    return;
  }
  if (row.kind === "stats") {
    const step = 515 / row.cells.length;
    row.cells.forEach((item, index) => {
      const x = 40 + index * step;
      drawText(stream, item.label, x, y, 8, MUTED, false);
      drawText(stream, item.value, x, y - 15, 14, MAROON, true);
    });
    return;
  }
  if (row.kind === "aspectChart") {
    const barX = 170;
    const barW = 260;
    const bottom = y - 14 - row.items.length * 18;
    for (const value of [0, 50, 100]) {
      const x = barX + (value / 100) * barW;
      stream.push(
        `${TRACK} RG 0.4 w ${x.toFixed(1)} ${y - 14} m ${x.toFixed(1)} ${bottom} l S`,
      );
      drawText(stream, String(value), x - 5, bottom - 12, 7, MUTED, false);
    }
    row.items.forEach((item, index) => {
      const yy = y - 14 - index * 18;
      drawText(stream, ascii(item.label).slice(0, 24), 40, yy, 8, INK, false);
      stream.push(`${TRACK} rg ${barX} ${yy - 6} ${barW} 7 re f`);
      const value =
        item.value === null ? 0 : Math.max(0, Math.min(100, item.value));
      stream.push(
        `${MAROON} rg ${barX} ${yy - 6} ${(value / 100) * barW} 7 re f`,
      );
      drawText(
        stream,
        item.value === null ? "Belum tersedia" : `${value.toFixed(0)}/100`,
        440,
        yy,
        8,
        INK,
        false,
      );
    });
    return;
  }
  if (row.kind === "space") return;
}

function buildPdf(report: ReportFileData) {
  const pages = paginate(reportRows(report));
  const objects: string[] = [];
  const pageIds = pages.map((_, index) => 5 + index * 2);
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objects[3] =
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[4] =
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  pages.forEach((rows, index) => {
    const pageId = 5 + index * 2;
    const contentId = pageId + 1;
    const stream: string[] = [
      `${MAROON} rg 0 805 595 37 re f`,
      `BT /F2 10 Tf 1 1 1 rg 1 0 0 1 40 818 Tm (IMM OBSERVER  |  DAD IMM KOTA BANDUNG) Tj ET`,
      `BT /F1 9 Tf 1 1 1 rg 1 0 0 1 430 818 Tm (IMM) Tj ET`,
    ];
    let y = 780;
    rows.forEach((row) => {
      drawRow(stream, row, y);
      y -= rowHeight(row);
    });
    stream.push(`${MUTED} RG 0.4 w 40 38 m 555 38 l S`);
    stream.push(
      `BT /F1 8 Tf ${MUTED} rg 1 0 0 1 40 25 Tm (Rapor resmi IMM Observer | halaman ${index + 1} dari ${pages.length}) Tj ET`,
    );
    const content = `${stream.join("\n")}\n`;
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] =
      `<< /Length ${new TextEncoder().encode(content).length} >>\nstream\n${content}endstream`;
  });
  const maxId = objects.length - 1;
  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (let id = 1; id <= maxId; id++) {
    offsets[id] = new TextEncoder().encode(body).length;
    body += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefOffset = new TextEncoder().encode(body).length;
  body += `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= maxId; id++)
    body += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  body += `trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([new TextEncoder().encode(body).buffer as ArrayBuffer], {
    type: "application/pdf",
  });
}

export const createReportPdf = buildPdf;

function crc32(bytes: Uint8Array) {
  let crc = -1;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ -1) >>> 0;
}
function zipStored(files: { name: string; bytes: Uint8Array }[]) {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const crc = crc32(file.bytes);
    const local = new Uint8Array(30 + name.length + file.bytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 33, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, file.bytes.length, true);
    lv.setUint32(22, file.bytes.length, true);
    lv.setUint16(26, name.length, true);
    local.set(name, 30);
    local.set(file.bytes, 30 + name.length);
    localParts.push(local);
    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 33, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, file.bytes.length, true);
    cv.setUint32(24, file.bytes.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, localOffset, true);
    central.set(name, 46);
    centralParts.push(central);
    localOffset += local.length;
  }
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, localOffset, true);
  return new Blob(
    [...localParts, ...centralParts, end].map(
      (part) => new Uint8Array(part).buffer as ArrayBuffer,
    ),
    { type: "application/zip" },
  );
}

export const createReportZip = zipStored;

export function downloadIndividualReport(report: ReportFileData) {
  const blob = buildPdf(report);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Rapor_DAD_${ascii(report.participant.display_name).replace(/[^a-zA-Z0-9]+/g, "_")}_${new Date().getFullYear()}.pdf`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function downloadBulkReports(
  reports: ReportFileData[],
  onProgress: (done: number, total: number) => void,
) {
  const files: { name: string; bytes: Uint8Array }[] = [];
  for (let index = 0; index < reports.length; index++) {
    const report = reports[index];
    const blob = buildPdf(report);
    files.push({
      name: `Rapor_DAD_${ascii(report.participant.display_name).replace(/[^a-zA-Z0-9]+/g, "_")}_${new Date().getFullYear()}.pdf`,
      bytes: new Uint8Array(await blob.arrayBuffer()),
    });
    onProgress(index + 1, reports.length);
  }
  const zip = zipStored(files);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(zip);
  link.download = `Rapor_DAD_Bulk_${new Date().getFullYear()}.zip`;
  link.click();
  URL.revokeObjectURL(link.href);
}
