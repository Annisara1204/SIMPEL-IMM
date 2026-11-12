import type { ReportSnapshotData } from "./supabase-rows";
import { categorizeScore } from "./scoring.ts";
import { decisionLabel } from "./decision-labels.ts";

export type ReportFileData = {
  participant: {
    display_name: string;
    student_number?: string | null;
    group_name?: string | null;
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
  snapshotData: ReportSnapshotData;
  indicatorNames?: Record<string, string>;
  eventSummary?: boolean;
  summaryText?: string;
  versionInfo?: string[];
};

const ascii = (value: unknown) =>
  String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const pdfEscape = (value: string) =>
  ascii(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
const wrap = (text: string, limit = 88) => {
  const words = ascii(text).split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > limit && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
};
const moneyDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("id-ID") : "Belum diisi";
const category = (value: number | null) =>
  value === null
    ? "Belum tersedia"
    : (categorizeScore(value)?.label ?? "Belum tersedia");

function reportPages(report: ReportFileData) {
  const data = report.snapshotData ?? {};
  const aspects = Array.isArray(data.aspects) ? data.aspects : [];
  const indicators = Array.isArray(data.indicators) ? data.indicators : [];
  const collective = data.collective ?? {};
  const overallScore =
    typeof data.overall?.score === "number" ? data.overall.score : null;
  const rows: {
    text: string;
    size?: number;
    bold?: boolean;
    color?: string;
    bar?: number;
  }[] = [
    {
      text: report.eventSummary
        ? "LAPORAN KESELURUHAN KEGIATAN DAD"
        : "RAPOR HASIL KOMPETENSI DAD",
      size: 18,
      bold: true,
      color: "#173b63",
    },
    { text: report.event.name, size: 12, bold: true },
    {
      text: `Tema: ${report.event.theme || "Belum diisi"} | Penyelenggara: ${report.event.organizer || "Belum diisi"}`,
    },
    {
      text: `Lokasi: ${report.event.location || "Belum diisi"} | Periode: ${moneyDate(report.event.starts_on)} - ${moneyDate(report.event.ends_on)}`,
    },
    ...(report.eventSummary
      ? [
          {
            text: "RINGKASAN EKSEKUTIF",
            size: 12,
            bold: true,
            color: "#173b63",
          },
          ...wrap(
            report.summaryText ||
              "Laporan menggunakan data snapshot final yang tersedia.",
          ).map((text) => ({ text })),
        ]
      : [
          { text: "IDENTITAS PESERTA", size: 12, bold: true, color: "#173b63" },
          { text: `Nama: ${report.participant.display_name}` },
          {
            text: `Nomor: ${report.participant.student_number || "Belum diisi"} | Kelompok: ${report.participant.group_name || "Belum diisi"}`,
          },
          {
            text: `Komisariat: ${report.participant.commissariat || report.event.commissariat || "Belum diisi"}`,
          },
        ]),
    ...(report.versionInfo?.length
      ? [{ text: `Framework/rubrik: ${report.versionInfo.join("; ")}` }]
      : []),
    { text: "HASIL KOMPETENSI", size: 12, bold: true, color: "#173b63" },
    ...aspects.map((aspect) => ({
      text: `${aspect.aspectName ?? aspect.aspect_name ?? "Aspek"} (${Number(aspect.weight ?? 0)}%)  ${aspect.score == null ? "Belum tersedia" : `${Number(aspect.score).toFixed(2)}/5  |  ${Number(aspect.scoreOutOf100 ?? aspect.score_out_of_100 ?? 0).toFixed(1)}/100`}`,
      bar:
        aspect.score == null
          ? 0
          : Math.max(0, Math.min(100, Number(aspect.score) * 20)),
    })),
    {
      text: report.eventSummary ? "RATA-RATA KESELURUHAN" : "NILAI AKHIR",
      size: 12,
      bold: true,
      color: "#173b63",
    },
    {
      text: `${report.eventSummary ? "Rata-rata peserta finalized" : "Skor"}: ${overallScore == null ? "Belum tersedia" : `${overallScore.toFixed(2)}/100`} | Kategori: ${category(overallScore)} | Status: FINALIZED`,
      bold: true,
    },
    ...(report.eventSummary
      ? []
      : [
          {
            text: `Keputusan: ${decisionLabel(collective.decision)}`,
            bold: true,
          },
        ]),
    ...(report.eventSummary
      ? [{ text: "RINGKASAN ASPEK", size: 12, bold: true, color: "#173b63" }]
      : [
          {
            text: "INDIKATOR YANG DINILAI",
            size: 12,
            bold: true,
            color: "#173b63",
          },
          ...indicators.map((item) => ({
            text: `${report.indicatorNames?.[item.indicatorId ?? ""] ?? item.indicatorId} | ${item.scope === "cross_session" ? "Lintas sesi" : "Sesi"} | Rata-rata ${item.average == null ? "-" : Number(item.average).toFixed(2)}/5 | jumlah penilai ${item.validRatings ?? 0}`,
          })),
        ]),
    {
      text: report.eventSummary ? "STATUS CAKUPAN DATA" : "KEKUATAN",
      size: 12,
      bold: true,
      color: "#173b63",
    },
    ...wrap(
      collective.strengths || "Belum ada catatan kekuatan yang disahkan.",
    ).map((text) => ({ text })),
    {
      text: report.eventSummary ? "KETERBATASAN DATA" : "AREA PENGEMBANGAN",
      size: 12,
      bold: true,
      color: "#173b63",
    },
    ...wrap(
      collective.developmentAreas ||
        "Belum ada area pengembangan yang disahkan.",
    ).map((text) => ({ text })),
    {
      text: "REKOMENDASI DAN TINDAK LANJUT",
      size: 12,
      bold: true,
      color: "#173b63",
    },
    ...(Array.isArray(data.approvedRecommendations)
      ? data.approvedRecommendations
      : []
    ).flatMap((item, index: number) =>
      wrap(`${index + 1}. ${item.recommendation}`).map((text) => ({ text })),
    ),
    ...(report.eventSummary
      ? [
          {
            text: "Metode: skor dan distribusi dihitung dari snapshot final; data Draft/Submitted dan catatan internal Observer tidak digunakan.",
          },
        ]
      : []),
    ...(report.eventSummary && !data.approvedRecommendations?.length
      ? [
          {
            text: "Belum cukup pola rekomendasi yang berulang untuk dirangkum.",
          },
        ]
      : []),
    ...wrap(collective.recommendationSummary || "").map((text) => ({ text })),
    { text: "ALASAN KEPUTUSAN", size: 12, bold: true, color: "#173b63" },
    ...wrap(
      collective.decisionRationale || "Tidak ada alasan yang tercatat.",
    ).map((text) => ({ text })),
    {
      text: `Diterbitkan: ${moneyDate(report.publishedAt)} | Snapshot final ${data.schemaVersion ?? "v1"}`,
    },
    {
      text: "Pengesahan Koordinator Instruktur: ____________________    Penanggung Jawab Kegiatan: ____________________",
    },
  ];

  const formattedRows = rows.flatMap((row) =>
    row.text.length > 88
      ? wrap(row.text).map((text, index) => ({
          ...row,
          text,
          bar: index === 0 ? row.bar : undefined,
        }))
      : [row],
  );
  const pages: (typeof rows)[] = [];
  let page: typeof rows = [];
  let used = 0;
  for (const row of formattedRows) {
    const height = row.size ? row.size + 8 : 17;
    if (used + height > 730 && page.length) {
      pages.push(page);
      page = [];
      used = 0;
    }
    page.push(row);
    used += height;
  }
  if (page.length) pages.push(page);
  return pages;
}

function buildPdf(report: ReportFileData) {
  const pages = reportPages(report);
  const objects: string[] = [];
  const pageIds = pages.map((_, index) => 4 + index * 2);
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objects[3] =
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  pages.forEach((rows, index) => {
    const pageId = 4 + index * 2;
    const contentId = pageId + 1;
    let y = 790;
    let stream = "0.09 0.23 0.39 rg 0 805 595 37 re f\n";
    stream += `BT /F1 10 Tf 1 1 1 rg 1 0 0 1 40 818 Tm (IMM OBSERVER  |  DAD IMM KOTA BANDUNG) Tj ET\n`;
    y = 786;
    for (const row of rows) {
      const fontSize = row.size ?? 9;
      const color =
        row.color === "#173b63" ? "0.09 0.23 0.39" : "0.12 0.16 0.2";
      stream += `${color} rg\nBT /F1 ${fontSize} Tf 1 0 0 1 40 ${y} Tm (${pdfEscape(row.text)}) Tj ET\n`;
      if (row.bar !== undefined) {
        stream += `0.88 0.91 0.94 rg 360 ${y - 2} 170 7 re f\n0.13 0.48 0.72 rg 360 ${y - 2} ${Math.max(0, Math.min(170, row.bar * 1.7))} 7 re f\n`;
      }
      y -= fontSize ? fontSize + 8 : 17;
    }
    stream += `0.45 0.48 0.51 rg\nBT /F1 8 Tf 1 0 0 1 40 25 Tm (Rapor resmi | halaman ${index + 1} dari ${pages.length}) Tj ET\n`;
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] =
      `<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}endstream`;
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
