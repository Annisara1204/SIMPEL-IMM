"use client";

import { useRouter } from "next/navigation";

import { useMemo, useState } from "react";
import { auditReportExport } from "@/app/dashboard/laporan/actions";
import {
  downloadBulkReports,
  downloadIndividualReport,
  type ReportFileData,
} from "@/lib/phase7-files";
import type {
  EventRow,
  ParticipantReport,
  PrivateSourcePayload,
  ReportSnapshotData,
} from "@/lib/supabase-rows";

type ReportRow = {
  participant_id: string;
  display_name: string;
  student_number: string | null;
  group_name: string | null;
  commissariat: string;
  snapshot_id: string | null;
  snapshot_data: ReportSnapshotData | null;
  rubric_version_ids?: string[] | null;
  finalized_at: string | null;
  published_at: string | null;
  publication_revision: number | null;
  account_linked?: boolean;
};
type ProgressRow = {
  observer_id: string;
  observer_name: string;
  expected_submissions: number;
  draft_count: number;
  submitted_count: number;
  finalized_count: number;
  incomplete_count: number;
};
type Action = (formData: FormData) => void | Promise<void>;
type Props = {
  role: string;
  event?: EventRow | null;
  events?: EventRow[];
  rows?: ReportRow[];
  participantId?: string | null;
  indicatorNames?: Record<string, string>;
  versionInfoBySnapshot?: Record<string, string[]>;
  canManage?: boolean;
  canViewPrivate?: boolean;
  canAssignAccounts?: boolean;
  candidateAccounts?: { id: string; display_name: string | null }[];
  privateSources?: {
    snapshot_id: string;
    private_payload: PrivateSourcePayload | null;
  }[];
  observerProgress?: ProgressRow[];
  participantReport?: ParticipantReport | null;
  reportError?: string | null;
  publishAction?: Action;
  assignAction?: Action;
};

const decisions: Record<string, string> = {
  pass: "Lulus",
  not_pass: "Tidak Lulus",
  further_discussion: "Perlu pembahasan lanjutan",
};
const aspects = (data?: ReportSnapshotData | null) =>
  Array.isArray(data?.aspects) ? data.aspects : [];
const indicators = (data?: ReportSnapshotData | null) =>
  Array.isArray(data?.indicators) ? data.indicators : [];
const decisionOf = (row: ReportRow) =>
  row.snapshot_data?.collective?.decision ?? "";
const category = (score: number | null) =>
  score === null
    ? "—"
    : score < 60
      ? "Perlu pengembangan"
      : score < 75
        ? "Cukup"
        : score < 90
          ? "Baik"
          : "Sangat baik";
const scoreOf = (row: ReportRow) =>
  typeof row.snapshot_data?.overall?.score === "number"
    ? Number(row.snapshot_data.overall.score)
    : null;
const coverageOf = (row: ReportRow) => {
  const values = aspects(row.snapshot_data).filter(
    (item) => typeof item.coverage === "number",
  );
  const weight = values.reduce(
    (sum: number, item) => sum + Number(item.weight ?? 0),
    0,
  );
  return weight
    ? values.reduce(
        (sum: number, item) =>
          sum + Number(item.coverage) * Number(item.weight ?? 0),
        0,
      ) / weight
    : null;
};
export function Phase7ReportWorkspace(props: Props) {
  const router = useRouter();
  const {
    role,
    event,
    events = [],
    rows = [],
    participantId,
    indicatorNames = {},
    versionInfoBySnapshot = {},
    canManage = false,
    canViewPrivate = false,
    canAssignAccounts = false,
    candidateAccounts = [],
    privateSources = [],
    observerProgress = [],
    participantReport,
    reportError,
    publishAction,
    assignAction,
  } = props;
  const [groupFilter, setGroupFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [observerFilter, setObserverFilter] = useState("all");
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const allGroups = [
    ...new Set(
      rows
        .map((row) => row.group_name)
        .filter((value): value is string => !!value),
    ),
  ].sort();
  const allScopes = [
    ...new Set(
      rows
        .flatMap((row) =>
          indicators(row.snapshot_data).map(
            (item) => item.scopeKey ?? item.scope ?? "",
          ),
        )
        .filter(Boolean),
    ),
  ].sort();
  const observerNames = [
    ...new Set(
      privateSources.flatMap((source) =>
        Array.isArray(source.private_payload?.ratings)
          ? source.private_payload.ratings
              .map((rating) => rating.observer_name)
              .filter((name): name is string => !!name)
          : [],
      ),
    ),
  ].sort();
  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const status = row.published_at
          ? "published"
          : row.snapshot_id
            ? "finalized"
            : "provisional";
        return (
          (groupFilter === "all" || row.group_name === groupFilter) &&
          (statusFilter === "all" || status === statusFilter)
        );
      }),
    [rows, groupFilter, statusFilter],
  );
  const publishedRows = filteredRows.filter(
    (row) => !!row.published_at && !!row.snapshot_data,
  );
  const selectedPublishedRows = publishedRows.filter(
    (row) =>
      row.snapshot_id !== null && selectedBulkIds.includes(row.snapshot_id),
  );
  const bulkRows = selectedPublishedRows.length
    ? selectedPublishedRows
    : publishedRows;
  const selectedRow = participantId
    ? rows.find((row) => row.participant_id === participantId)
    : null;
  const currentPreview = selectedRow?.snapshot_id
    ? toReport(
        selectedRow,
        event,
        indicatorNames,
        versionInfoBySnapshot[selectedRow.snapshot_id] ?? [],
      )
    : null;
  const finalized = filteredRows.filter((row) => row.snapshot_id);
  const provisionalCount = filteredRows.length - finalized.length;
  const decisionsCount = {
    pass: finalized.filter((row) => decisionOf(row) === "pass").length,
    not_pass: finalized.filter((row) => decisionOf(row) === "not_pass").length,
    further: finalized.filter((row) => decisionOf(row) === "further_discussion")
      .length,
  };
  const avgScore = finalized
    .map(scoreOf)
    .filter((score): score is number => score !== null);
  const averageOverall = avgScore.length
    ? avgScore.reduce((sum, score) => sum + score, 0) / avgScore.length
    : null;
  const aspectStats = new Map<
    string,
    { name: string; weight: number; sum: number; count: number }
  >();
  for (const row of finalized)
    for (const aspect of aspects(row.snapshot_data)) {
      if (typeof aspect.score !== "number") continue;
      const key = String(
        aspect.aspectId ?? aspect.aspect_id ?? aspect.aspectName,
      );
      const entry = aspectStats.get(key) ?? {
        name: String(aspect.aspectName ?? aspect.aspect_name ?? "Aspek"),
        weight: Number(aspect.weight ?? 0),
        sum: 0,
        count: 0,
      };
      entry.sum += Number(aspect.score);
      entry.count++;
      aspectStats.set(key, entry);
    }
  const aspectSummary = [...aspectStats.values()].map((item) => ({
    ...item,
    average: item.sum / item.count,
  }));
  const aspectColumns: { id: string; name: string }[] = aspects(
    finalized[0]?.snapshot_data,
  ).map((aspect) => ({
    id: String(aspect.aspectId ?? aspect.aspect_id ?? aspect.aspectName),
    name: String(aspect.aspectName ?? aspect.aspect_name ?? "Aspek"),
  }));
  const attentionRows = filteredRows
    .flatMap((row) =>
      indicators(row.snapshot_data)
        .filter((item) => item.reviewStatus === "needs_review")
        .map((item) => ({
          participant: row.display_name,
          indicator:
            indicatorNames[item.indicatorId ?? ""] ?? item.indicatorId ?? "",
          average: item.average,
          range: item.range,
          status: row.snapshot_id ? "Snapshot final" : "Provisional",
        })),
    )
    .slice(0, 30);

  const eventHref = (eventId: string) =>
    `/dashboard/laporan?eventId=${encodeURIComponent(eventId)}`;
  const doAudit = async (
    exportType:
      | "individual_pdf"
      | "bulk_pdf"
      | "assessment_excel"
      | "observer_excel"
      | "event_report_pdf",
    filters: Record<string, string> = {},
  ) => {
    if (!event) throw new Error("Pilih kegiatan terlebih dahulu.");
    await auditReportExport({ eventId: event.id, exportType, filters });
  };
  const reportFiles = bulkRows
    .map((row) =>
      toReport(
        row,
        event,
        indicatorNames,
        versionInfoBySnapshot[row.snapshot_id ?? ""] ?? [],
      ),
    )
    .filter((item): item is ReportFileData => !!item);

  async function exportIndividual(report: ReportFileData) {
    setBusy(true);
    setMessage("");
    try {
      const reportEventId =
        event?.id ?? String(participantReport?.event?.id ?? "");
      await auditReportExport({
        eventId: reportEventId,
        exportType: "individual_pdf",
      });
      downloadIndividualReport(report);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "PDF gagal dibuat.");
    } finally {
      setBusy(false);
    }
  }
  async function exportBulk() {
    setBusy(true);
    setProgress({ done: 0, total: reportFiles.length });
    setMessage("");
    try {
      await doAudit("bulk_pdf", {
        group: groupFilter,
        status: statusFilter,
        participantIds: selectedPublishedRows.length
          ? [
              ...new Set(
                selectedPublishedRows.map((row) => row.participant_id),
              ),
            ].join(",")
          : "all_published",
      });
      const skipped = filteredRows.filter((row) => !row.published_at);
      const unselected = selectedPublishedRows.length
        ? publishedRows.filter(
            (row) =>
              row.snapshot_id === null ||
              !selectedBulkIds.includes(row.snapshot_id),
          )
        : [];
      const notices = [
        skipped.length
          ? `Tidak disertakan (${skipped.length} belum Published): ${skipped.map((row) => row.display_name).join(", ")}`
          : "",
        unselected.length
          ? `${unselected.length} rapor Published tidak dipilih.`
          : "",
      ].filter(Boolean);
      if (notices.length) setMessage(notices.join(" "));
      if (reportFiles.length)
        await downloadBulkReports(reportFiles, (done, total) =>
          setProgress({ done, total }),
        );
      else setMessage("Tidak ada rapor Published pada filter ini.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Ekspor PDF massal gagal.",
      );
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }
  async function exportExcel(
    kind: "summary" | "material" | "evaluation" | "observer",
  ) {
    setBusy(true);
    setMessage("");
    try {
      await doAudit(
        kind === "observer" ? "observer_excel" : "assessment_excel",
        {
          kind,
          group: groupFilter,
          status: statusFilter,
          scope: scopeFilter,
          observer: observerFilter,
        },
      );
      const XLSX = await import("xlsx");
      let records: Record<string, unknown>[] = [];
      let sheet = "Rekap Peserta";
      if (kind === "summary") {
        records = filteredRows.map((row, index) => ({
          Nomor: index + 1,
          Nama: row.display_name,
          NIM: row.student_number ?? "",
          Kelompok: row.group_name ?? "",
          Komisariat: row.commissariat,
          ...Object.fromEntries(
            aspects(row.snapshot_data).map((aspect) => [
              String(aspect.aspectName ?? aspect.aspect_name ?? "Aspek"),
              aspect.score ?? "",
            ]),
          ),
          "Skor Akhir": scoreOf(row) ?? "",
          "Coverage (%)": coverageOf(row) ?? "",
          "Status Keputusan": decisions[decisionOf(row)] ?? "Belum finalized",
          "Status Rapor": row.published_at
            ? "Published"
            : row.snapshot_id
              ? "Finalized"
              : "Provisional",
        }));
      } else if (kind === "material") {
        sheet = "Rekap Materi";
        records = filteredRows.flatMap((row) =>
          indicators(row.snapshot_data)
            .filter(
              (item) =>
                scopeFilter === "all" ||
                item.scopeKey === scopeFilter ||
                item.scope === scopeFilter,
            )
            .map((item) => ({
              Nama: row.display_name,
              Kelompok: row.group_name ?? "",
              Materi: item.scopeKey ?? item.scope ?? "",
              Indikator:
                indicatorNames[item.indicatorId ?? ""] ??
                item.indicatorId ??
                "",
              Rata_rata: item.average ?? "",
              Jumlah_penilai: item.validRatings ?? 0,
              Jumlah_N_O: item.notObserved ?? 0,
              Status_review: item.reviewStatus ?? "normal",
            })),
        );
      } else if (kind === "evaluation") {
        sheet = "Evaluasi Akhir";
        records = filteredRows
          .filter((row) => row.snapshot_id)
          .map((row) => ({
            Nama: row.display_name,
            Kelompok: row.group_name ?? "",
            Skor_Akhir: scoreOf(row) ?? "",
            Keputusan: decisions[decisionOf(row)] ?? "",
            Kekuatan: row.snapshot_data?.collective?.strengths ?? "",
            Area_pengembangan:
              row.snapshot_data?.collective?.developmentAreas ?? "",
            Rekomendasi: (row.snapshot_data?.approvedRecommendations ?? [])
              .map((item) => item.recommendation)
              .join(" | "),
            Alasan_keputusan:
              row.snapshot_data?.collective?.decisionRationale ?? "",
          }));
      } else {
        if (!canViewPrivate)
          throw new Error(
            "Rekap penilaian Observer hanya tersedia untuk Admin Sistem dan koordinator.",
          );
        sheet = "Internal Observer";
        records = filteredRows.flatMap((row) => {
          const source = privateSources.find(
            (item) => item.snapshot_id === row.snapshot_id,
          );
          return (
            Array.isArray(source?.private_payload?.ratings)
              ? source.private_payload.ratings
              : []
          )
            .filter(
              (rating) =>
                observerFilter === "all" ||
                rating.observer_name === observerFilter,
            )
            .map((rating) => ({
              Observer: rating.observer_name,
              Peserta: row.display_name,
              Kelompok: row.group_name ?? "",
              Materi: rating.rubric_version_id,
              Indikator:
                indicatorNames[rating.indicator_id ?? ""] ??
                rating.indicator_id ??
                "",
              Skor: rating.response_status === "scored" ? rating.score : "",
              Status: rating.response_status,
              Evidence: rating.evidence ?? "",
              Waktu: rating.updated_at ?? "",
            }));
        });
      }
      const worksheet = XLSX.utils.json_to_sheet(records);
      const columns = Object.keys(records[0] ?? {});
      worksheet["!cols"] = columns.map((key) => ({
        wch: Math.min(
          42,
          Math.max(
            12,
            key.length,
            ...records
              .slice(0, 100)
              .map((row) => String(row[key] ?? "").length),
          ),
        ),
      }));
      if (records.length && columns.length) {
        const ref =
          worksheet["!ref"] ??
          `A1:${XLSX.utils.encode_col(columns.length - 1)}1`;
        worksheet["!autofilter"] = { ref };
      }
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet);
      XLSX.writeFile(
        workbook,
        `DAD_${sheet.replaceAll(" ", "_")}_${new Date().getFullYear()}.xlsx`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Excel gagal dibuat.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function exportEventPdf() {
    if (!event) return;
    setBusy(true);
    setMessage("");
    try {
      await doAudit("event_report_pdf", { group: groupFilter });
      const aspectsAgg = aspectSummary.map((aspect) => ({
        aspectName: aspect.name,
        weight: aspect.weight,
        score: aspect.average,
        scoreOutOf100: (aspect.average / 5) * 100,
      }));
      const publishedRecommended = new Map<string, number>();
      for (const row of publishedRows)
        for (const rec of row.snapshot_data?.approvedRecommendations ?? []) {
          const text = String(rec.recommendation ?? "").trim();
          if (text)
            publishedRecommended.set(
              text,
              (publishedRecommended.get(text) ?? 0) + 1,
            );
        }
      const recurringRecommendations = [...publishedRecommended]
        .filter(([, count]) => count >= 2)
        .map(([recommendation]) => ({ recommendation }));
      const reportSummary = `Total peserta ${filteredRows.length}; snapshot final ${finalized.length}; rapor Published ${publishedRows.length}; provisional ${provisionalCount}; keputusan Lulus ${decisionsCount.pass}, Tidak Lulus ${decisionsCount.not_pass}, Perlu Pembahasan ${decisionsCount.further}. Analisis skor dan keputusan mencakup peserta dengan snapshot final saja.`;
      const eventReport: ReportFileData = {
        participant: { display_name: "Ringkasan keseluruhan kegiatan" },
        event,
        publishedAt: new Date().toISOString(),
        eventSummary: true,
        summaryText: reportSummary,
        snapshotData: {
          schemaVersion: 1,
          aspects: aspectsAgg,
          indicators: [],
          overall: {
            score: averageOverall,
            status: "ready_for_collective_evaluation",
          },
          collective: {
            summary: reportSummary,
            strengths: `Snapshot final tersedia untuk ${finalized.length} dari ${filteredRows.length} peserta.`,
            developmentAreas: provisionalCount
              ? `${provisionalCount} peserta masih provisional dan tidak dimasukkan ke rata-rata resmi.`
              : "Seluruh peserta dalam filter memiliki snapshot final.",
          },
          approvedRecommendations: recurringRecommendations,
        },
      };
      downloadIndividualReport(eventReport);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Laporan kegiatan gagal dibuat.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (role === "peserta") {
    if (!participantReport)
      return (
        <main className="users-page">
          <a className="users-back" href="/dashboard">
            ← Dashboard
          </a>
          <h1>Rapor Saya</h1>
          <p className="users-notice">
            {reportError ??
              "Rapor belum diterbitkan. Setelah diterbitkan, rapor akan tampil di sini."}
          </p>
        </main>
      );
    const report: ReportFileData = {
      participant: participantReport.participant,
      event: participantReport.event,
      publishedAt: participantReport.published_at,
      snapshotData: participantReport.snapshot_data,
      indicatorNames: participantReport.indicator_names ?? {},
      versionInfo: participantReport.version_info ?? [],
    };
    return (
      <main className="users-page">
        <a className="users-back" href="/dashboard">
          ← Dashboard
        </a>
        <div className="users-heading">
          <div>
            <p className="login-eyebrow">RAPOR PESERTA · PUBLISHED</p>
            <h1>{report.participant.display_name}</h1>
            <p>
              {report.event.name} · {report.event.starts_on} —{" "}
              {report.event.ends_on}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void exportIndividual(report)}
          >
            Unduh PDF
          </button>
        </div>
        <ReportPreview report={report} />
        {message && <p className="users-error">{message}</p>}
      </main>
    );
  }

  return (
    <main className="users-page">
      <a className="users-back" href="/dashboard">
        ← Kembali ke dashboard
      </a>
      <div className="users-heading">
        <div>
          <p className="login-eyebrow">LAPORAN, RAPOR & EKSPOR</p>
          <h1>Laporan dan Rapor DAD</h1>
          <p>
            Hasil resmi hanya diambil dari snapshot final Fase 6. Catatan privat
            Observer tidak ditampilkan di rapor.
          </p>
        </div>
      </div>
      {events.length > 0 && (
        <section className="event-manage-card">
          <label>
            Pilih kegiatan
            <select
              value={event?.id ?? ""}
              onChange={(change) =>
                router.push(`/dashboard/laporan?eventId=${change.target.value}`)
              }
            >
              {events.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.starts_on}
                </option>
              ))}
            </select>
          </label>
        </section>
      )}
      {reportError && (
        <p className="users-error">Laporan belum dapat dibaca: {reportError}</p>
      )}
      {event && (
        <>
          <section className="event-manage-card">
            <h2>{event.name}</h2>
            <p>
              {event.theme || "Tema belum diisi"} ·{" "}
              {event.organizer || "Penyelenggara belum diisi"} ·{" "}
              {event.location} · {event.starts_on} — {event.ends_on}
            </p>
            <div className="rubric-editor-grid">
              <label>
                Filter kelompok
                <select
                  value={groupFilter}
                  onChange={(change) => setGroupFilter(change.target.value)}
                >
                  <option value="all">Semua kelompok</option>
                  {allGroups.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Filter status
                <select
                  value={statusFilter}
                  onChange={(change) => setStatusFilter(change.target.value)}
                >
                  <option value="all">Semua status</option>
                  <option value="provisional">Provisional</option>
                  <option value="finalized">Finalized</option>
                  <option value="published">Published</option>
                </select>
              </label>
            </div>
            <div className="users-metrics-grid">
              <article>
                <small>Peserta terfilter</small>
                <strong>{filteredRows.length}</strong>
              </article>
              <article>
                <small>Asesmen final</small>
                <strong>{finalized.length}</strong>
              </article>
              <article>
                <small>Masih provisional</small>
                <strong>{provisionalCount}</strong>
              </article>
              <article>
                <small>Rata-rata final</small>
                <strong>
                  {averageOverall === null ? "—" : averageOverall.toFixed(1)}
                </strong>
              </article>
              <article>
                <small>Lulus</small>
                <strong>{decisionsCount.pass}</strong>
              </article>
              <article>
                <small>Tidak lulus</small>
                <strong>{decisionsCount.not_pass}</strong>
              </article>
              <article>
                <small>Perlu pembahasan</small>
                <strong>{decisionsCount.further}</strong>
              </article>
            </div>
          </section>
          <section className="event-manage-card">
            <h2>Rata-rata aspek</h2>
            {aspectSummary.length ? (
              aspectSummary.map((aspect) => (
                <div className="report-aspect-row" key={aspect.name}>
                  <span>
                    {aspect.name} · {aspect.weight}%
                  </span>
                  <b>{aspect.average.toFixed(2)}/5</b>
                  <div className="bar-track">
                    <i
                      style={{
                        width: `${Math.max(0, Math.min(100, aspect.average * 20))}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p>
                Belum cukup data snapshot final untuk menampilkan grafik aspek.
              </p>
            )}
          </section>
          {aspectColumns.length > 0 && (
            <section className="event-manage-card">
              <h2>Peta kompetensi peserta</h2>
              <div className="competency-matrix-scroll">
                <table className="competency-matrix">
                  <thead>
                    <tr>
                      <th scope="col">Peserta</th>
                      {aspectColumns.map((aspect) => {
                        const item = aspects(finalized[0].snapshot_data).find(
                          (value) =>
                            String(
                              value.aspectId ??
                                value.aspect_id ??
                                value.aspectName,
                            ) === aspect.id,
                        );
                        return (
                          <th key={aspect.id} scope="col">
                            {aspect.name}
                            <small>Bobot {item?.weight ?? "—"}%</small>
                          </th>
                        );
                      })}
                      <th scope="col">Nilai akhir</th>
                      <th scope="col">Keputusan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finalized.map((row) => (
                      <tr key={row.snapshot_id ?? row.participant_id}>
                        <th scope="row">{row.display_name}</th>
                        {aspectColumns.map((column) => {
                          const aspect = aspects(row.snapshot_data).find(
                            (value) =>
                              String(
                                value.aspectId ??
                                  value.aspect_id ??
                                  value.aspectName,
                              ) === column.id,
                          );
                          const score =
                            typeof aspect?.score === "number"
                              ? Number(aspect.score)
                              : null;
                          return (
                            <td
                              key={column.id}
                              style={{
                                background:
                                  score === null
                                    ? "#f5f3f4"
                                    : score < 2
                                      ? "#fce7e7"
                                      : score < 3
                                        ? "#fff3d8"
                                        : "#e7f4ec",
                              }}
                            >
                              {score === null ? "—" : score.toFixed(2)}
                            </td>
                          );
                        })}
                        <td>{scoreOf(row)?.toFixed(1) ?? "—"}</td>
                        <td>{decisions[decisionOf(row)] ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          <section className="event-manage-card">
            <h2>Indikator yang perlu perhatian</h2>
            {attentionRows.length ? (
              <div className="competency-matrix-scroll">
                <table className="competency-matrix">
                  <thead>
                    <tr>
                      <th scope="col">Peserta</th>
                      <th scope="col">Indikator</th>
                      <th scope="col">Rata-rata</th>
                      <th scope="col">Rentang</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attentionRows.map((item, index) => (
                      <tr
                        key={`${item.participant}:${item.indicator}:${index}`}
                      >
                        <th scope="row">{item.participant}</th>
                        <td>{item.indicator}</td>
                        <td>
                          {item.average == null
                            ? "—"
                            : Number(item.average).toFixed(2)}
                        </td>
                        <td>{item.range ?? "—"}</td>
                        <td>{item.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>
                Tidak ada indikator yang ditandai perlu review pada snapshot
                final.
              </p>
            )}
          </section>
          {canManage && (
            <section className="event-manage-card">
              <h2>Progres Observer dan Instruktur penilai</h2>
              {observerProgress.length ? (
                <div className="competency-matrix-scroll">
                  <table className="competency-matrix">
                    <thead>
                      <tr>
                        <th scope="col">Penilai</th>
                        <th scope="col">Target</th>
                        <th scope="col">Draft</th>
                        <th scope="col">Submitted</th>
                        <th scope="col">Finalized</th>
                        <th scope="col">Belum mulai</th>
                        <th scope="col">Progres kiriman</th>
                      </tr>
                    </thead>
                    <tbody>
                      {observerProgress.map((item) => (
                        <tr key={item.observer_id}>
                          <th scope="row">{item.observer_name}</th>
                          <td>{item.expected_submissions}</td>
                          <td>{item.draft_count}</td>
                          <td>{item.submitted_count}</td>
                          <td>{item.finalized_count}</td>
                          <td>{item.incomplete_count}</td>
                          <td>
                            {item.expected_submissions
                              ? `${Math.round(((item.draft_count + item.submitted_count + item.finalized_count) / item.expected_submissions) * 100)}%`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>
                  Belum ada penugasan penilai, atau basis data belum dimigrasi.
                </p>
              )}
            </section>
          )}
          <section className="event-manage-card">
            <div className="panel-heading">
              <div>
                <h2>Peserta dan status rapor</h2>
                <p>
                  {filteredRows.length} baris sesuai filter. Draft/Submitted
                  tidak dihitung sebagai hasil resmi.
                </p>
              </div>
              <button
                type="button"
                disabled={busy || !publishedRows.length}
                onClick={() => void exportBulk()}
              >
                Unduh{" "}
                {selectedPublishedRows.length
                  ? `${selectedPublishedRows.length} rapor terpilih`
                  : `semua ${publishedRows.length} rapor Published`}{" "}
                (ZIP)
              </button>
            </div>
            {progress && (
              <p className="users-notice">
                Membuat PDF {progress.done} dari {progress.total}…{" "}
                <progress value={progress.done} max={progress.total} />
              </p>
            )}
            <div className="competency-matrix-scroll">
              <table className="competency-matrix">
                <thead>
                  <tr>
                    <th scope="col">
                      <input
                        type="checkbox"
                        aria-label="Pilih semua rapor Published"
                        checked={
                          publishedRows.length > 0 &&
                          publishedRows.every(
                            (row) =>
                              row.snapshot_id !== null &&
                              selectedBulkIds.includes(row.snapshot_id),
                          )
                        }
                        onChange={(change) =>
                          setSelectedBulkIds(
                            change.target.checked
                              ? publishedRows
                                  .map((row) => row.snapshot_id)
                                  .filter((id): id is string => !!id)
                              : [],
                          )
                        }
                      />
                    </th>
                    <th scope="col">Peserta</th>
                    <th scope="col">Kelompok / Komisariat</th>
                    <th scope="col">Skor / Coverage</th>
                    <th scope="col">Keputusan</th>
                    <th scope="col">Status</th>
                    <th scope="col">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const status = row.published_at
                      ? "Published"
                      : row.snapshot_id
                        ? "Finalized"
                        : "Provisional";
                    const rowVersion = row.snapshot_id
                      ? versionInfoBySnapshot[row.snapshot_id]?.[0]
                      : undefined;
                    return (
                      <tr key={row.snapshot_id ?? row.participant_id}>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`Pilih rapor ${row.display_name}${
                              rowVersion ? ` · ${rowVersion}` : ""
                            }`}
                            disabled={!row.published_at}
                            checked={
                              !!row.published_at &&
                              row.snapshot_id !== null &&
                              selectedBulkIds.includes(row.snapshot_id)
                            }
                            onChange={(change) =>
                              setSelectedBulkIds((current) =>
                                change.target.checked
                                  ? [
                                      ...new Set([
                                        ...current,
                                        row.snapshot_id ?? row.participant_id,
                                      ]),
                                    ]
                                  : current.filter(
                                      (id) => id !== row.snapshot_id,
                                    ),
                              )
                            }
                          />
                        </td>
                        <th scope="row">
                          <a
                            href={`${eventHref(event.id)}&participantId=${row.participant_id}`}
                          >
                            {row.display_name}
                          </a>
                          <small>
                            {row.student_number ?? "NIM tidak tersedia"}
                          </small>
                        </th>
                        <td>
                          {row.group_name ?? "—"}
                          <small>{row.commissariat}</small>
                        </td>
                        <td>
                          {row.snapshot_id
                            ? `${scoreOf(row)?.toFixed(2) ?? "—"}/100`
                            : "Belum final"}
                          <small>
                            {coverageOf(row) === null
                              ? "Coverage belum tersedia"
                              : `Coverage ${coverageOf(row)!.toFixed(1)}%`}
                          </small>
                        </td>
                        <td>{decisions[decisionOf(row)] ?? "—"}</td>
                        <td>
                          <span
                            className={`agenda-status ${status.toLowerCase()}`}
                          >
                            {status}
                          </span>
                        </td>
                        <td>
                          {row.snapshot_id && row.published_at && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                selectedRow?.participant_id ===
                                  row.participant_id && currentPreview
                                  ? void exportIndividual(currentPreview)
                                  : void exportIndividual(
                                      toReport(
                                        row,
                                        event,
                                        indicatorNames,
                                        versionInfoBySnapshot[
                                          row.snapshot_id ?? ""
                                        ] ?? [],
                                      )!,
                                    )
                              }
                            >
                              PDF
                            </button>
                          )}
                          {row.snapshot_id &&
                            !row.published_at &&
                            canManage &&
                            publishAction && (
                              <form action={publishAction}>
                                <input
                                  type="hidden"
                                  name="snapshotId"
                                  value={row.snapshot_id}
                                />
                                <button type="submit">Terbitkan rapor</button>
                              </form>
                            )}
                          {canAssignAccounts && assignAction && (
                            <details>
                              <summary>
                                {row.account_linked
                                  ? "Akun terhubung"
                                  : "Tautkan akun"}
                              </summary>
                              <form
                                action={assignAction}
                                className="rubric-add-form"
                              >
                                <input
                                  type="hidden"
                                  name="participantId"
                                  value={row.participant_id}
                                />
                                <label>
                                  Akun Peserta
                                  <select
                                    name="userId"
                                    defaultValue=""
                                    required
                                  >
                                    <option value="" disabled>
                                      Pilih akun
                                    </option>
                                    {candidateAccounts.map((account) => (
                                      <option
                                        key={account.id}
                                        value={account.id}
                                      >
                                        {account.display_name ||
                                          "Akun tanpa nama"}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <button type="submit">Hubungkan akun</button>
                              </form>
                            </details>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          <section className="event-manage-card">
            <h2>Ekspor dan laporan</h2>
            <div className="rubric-editor-grid">
              <button
                type="button"
                disabled={busy}
                onClick={() => void exportExcel("summary")}
              >
                Excel rekap peserta
              </button>
              <label>
                Filter materi/sesi untuk ekspor
                <select
                  value={scopeFilter}
                  onChange={(change) => setScopeFilter(change.target.value)}
                >
                  <option value="all">Semua sesi</option>
                  {allScopes.map((scope) => (
                    <option key={scope} value={scope}>
                      {scope}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={() => void exportExcel("material")}
              >
                Excel rekap per materi
              </button>
              {canViewPrivate && (
                <>
                  <label>
                    Filter Observer internal
                    <select
                      value={observerFilter}
                      onChange={(change) =>
                        setObserverFilter(change.target.value)
                      }
                    >
                      <option value="all">Semua Observer</option>
                      {observerNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void exportExcel("observer")}
                  >
                    Excel internal Observer
                  </button>
                </>
              )}
              <button
                type="button"
                disabled={busy || !finalized.length}
                onClick={() => void exportExcel("evaluation")}
              >
                Excel evaluasi akhir
              </button>
              <button
                type="button"
                disabled={busy || !finalized.length}
                onClick={() => void exportEventPdf()}
              >
                PDF laporan kegiatan
              </button>
            </div>
            <p className="privacy-note">
              Excel internal hanya mencakup sumber penilaian pada snapshot
              final, dan hanya tersedia bagi Admin Sistem/koordinator. PDF
              massal hanya berisi rapor Published.
            </p>
          </section>
          {participantId && selectedRow && (
            <section className="event-manage-card">
              <h2>Preview rapor · {selectedRow.display_name}</h2>
              {currentPreview ? (
                <>
                  <p>
                    {selectedRow.published_at
                      ? "Rapor Published"
                      : "Preview staf — belum dapat diunduh sebagai rapor resmi"}
                  </p>
                  <ReportPreview report={currentPreview} />
                  {!selectedRow.published_at && canManage && publishAction && (
                    <form action={publishAction}>
                      <input
                        type="hidden"
                        name="snapshotId"
                        value={selectedRow.snapshot_id!}
                      />
                      <button type="submit">Terbitkan rapor ini</button>
                    </form>
                  )}
                </>
              ) : (
                <p className="users-notice">
                  PROVISIONAL — asesmen belum memiliki snapshot final. Preview
                  dan ekspor resmi dinonaktifkan.
                </p>
              )}
            </section>
          )}
          {message && (
            <p className="users-notice" role="status">
              {message}
            </p>
          )}
        </>
      )}
    </main>
  );
}

function toReport(
  row: ReportRow,
  event?: EventRow | null,
  indicatorNames: Record<string, string> = {},
  versionInfo: string[] = [],
): ReportFileData | null {
  if (!row.snapshot_data) return null;
  return {
    participant: {
      display_name: row.display_name,
      student_number: row.student_number,
      group_name: row.group_name,
      commissariat: row.commissariat,
    },
    event: {
      name: event?.name ?? "Kegiatan DAD",
      theme: event?.theme,
      organizer: event?.organizer,
      commissariat: event?.commissariat,
      location: event?.location,
      starts_on: event?.starts_on,
      ends_on: event?.ends_on,
    },
    publishedAt: row.published_at,
    snapshotData: row.snapshot_data,
    indicatorNames,
    versionInfo,
  };
}

function ReportPreview({ report }: { report: ReportFileData }) {
  const data = report.snapshotData;
  const final =
    typeof data?.overall?.score === "number"
      ? Number(data.overall.score)
      : null;
  return (
    <article className="event-manage-card report-preview">
      <h2>Rapor Kompetensi DAD</h2>
      <p>
        <strong>{report.event.name}</strong> · {report.event.starts_on}—
        {report.event.ends_on}
      </p>
      <p>
        {report.participant.display_name} ·{" "}
        {report.participant.group_name ?? "Kelompok tidak tersedia"} ·{" "}
        {report.participant.commissariat ?? "Komisariat tidak tersedia"}
      </p>
      <h3>
        Nilai akhir:{" "}
        {final === null ? "Belum tersedia" : `${final.toFixed(2)}/100`} ·{" "}
        {category(final)}
      </h3>
      <div className="report-aspect-grid">
        {aspects(data).map((aspect) => (
          <div key={aspect.aspectId ?? aspect.aspectName}>
            <span>
              {aspect.aspectName ?? aspect.aspect_name} · {aspect.weight}%
            </span>
            <strong>
              {aspect.score == null
                ? "—"
                : `${Number(aspect.score).toFixed(2)}/5`}
            </strong>
            <div className="bar-track">
              <i
                style={{
                  width: `${Math.max(0, Math.min(100, Number(aspect.score ?? 0) * 20))}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <h3>Kekuatan</h3>
      <p>{data.collective?.strengths || "Belum ada catatan."}</p>
      <h3>Area pengembangan</h3>
      <p>{data.collective?.developmentAreas || "Belum ada catatan."}</p>
      <h3>Rekomendasi yang disetujui</h3>
      {(data.approvedRecommendations ?? []).length ? (
        <ul>
          {(data.approvedRecommendations ?? []).map((item, index: number) => (
            <li key={item.id ?? index}>{item.recommendation}</li>
          ))}
        </ul>
      ) : (
        <p>Belum ada rekomendasi yang disetujui.</p>
      )}
      <h3>Keputusan</h3>
      <p>
        {decisions[data.collective?.decision ?? ""] ?? "Belum ditetapkan"} ·{" "}
        {data.collective?.decisionRationale ?? ""}
      </p>
      <p className="privacy-note">
        Preview ini bersumber dari snapshot final dan tidak memuat skor
        individual Observer, bukti, atau catatan deliberasi.
      </p>
    </article>
  );
}
