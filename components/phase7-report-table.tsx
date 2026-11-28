"use client";
import Link from "next/link";
import { statusBadgeClass } from "@/lib/badge-class";
import { reportStatusLabel } from "@/lib/report-status";
import { decisionLabel } from "@/lib/decision-labels";
import type { Dispatch, SetStateAction } from "react";
import type { ReportFileData } from "@/lib/phase7-files";
import type { EventRow } from "@/lib/supabase-rows";
import type { ReportRow } from "@/components/phase7-report-workspace";

type Action = (formData: FormData) => void | Promise<void>;
type Props = {
  event?: EventRow | null;
  rows: ReportRow[];
  publishedRows: ReportRow[];
  selectedPublishedRows: ReportRow[];
  selectedRow: ReportRow | null | undefined;
  indicatorNames: Record<string, string>;
  versionInfoBySnapshot: Record<string, string[]>;
  canManage: boolean;
  canAssignAccounts: boolean;
  candidateAccounts: { id: string; display_name: string | null }[];
  assignAction?: Action;
  publishAction?: Action;
  busy: boolean;
  progress: { done: number; total: number } | null;
  eventHref: (eventId: string) => string;
  exportBulk: () => void | Promise<void>;
  exportIndividual: (data: ReportFileData) => void | Promise<void>;
  currentPreview: ReportFileData | null;
  selectedBulkIds: string[];
  setSelectedBulkIds: Dispatch<SetStateAction<string[]>>;
  coverageOf: (row: ReportRow) => number | null;
  scoreOf: (row: ReportRow) => number | null;
  decisionOf: (row: ReportRow) => string;
  toReport: (
    row: ReportRow,
    event: EventRow | null | undefined,
    indicatorNames: Record<string, string>,
    versionInfo: string[],
  ) => ReportFileData | null;
};

export function Phase7ReportTable({
  event,
  rows,
  publishedRows,
  selectedPublishedRows,
  selectedRow,
  indicatorNames,
  versionInfoBySnapshot,
  canManage,
  canAssignAccounts,
  candidateAccounts,
  assignAction,
  publishAction,
  busy,
  progress,
  eventHref,
  exportBulk,
  exportIndividual,
  currentPreview,
  selectedBulkIds,
  setSelectedBulkIds,
  coverageOf,
  scoreOf,
  decisionOf,
  toReport,
}: Props) {
  const filteredRows = rows;
  return (
    <section className="event-manage-card">
      <div className="panel-heading">
        <div>
          <h2>Peserta dan status rapor</h2>
          <p>
            {filteredRows.length} baris sesuai filter. Draft/Submitted tidak
            dihitung sebagai hasil resmi.
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
            : `semua ${publishedRows.length} rapor diterbitkan`}{" "}
          (ZIP)
        </button>
      </div>
      {progress && (
        <p className="notice">
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
                            : current.filter((id) => id !== row.snapshot_id),
                        )
                      }
                    />
                  </td>
                  <th scope="row">
                    <Link
                      prefetch={false}
                      href={`${eventHref(event?.id ?? "")}&participantId=${row.participant_id}`}
                    >
                      {row.display_name}
                    </Link>
                    <small>{row.student_number ?? "NIM tidak tersedia"}</small>
                  </th>
                  <td>
                    {row.group_name ?? "—"}
                    <small>{row.commissariat}</small>
                  </td>
                  <td>
                    {row.snapshot_id
                      ? `${scoreOf(row)?.toFixed(1) ?? "—"}/100`
                      : "Belum final"}
                    <small>
                      {coverageOf(row) === null
                        ? "Coverage belum tersedia"
                        : `Coverage ${coverageOf(row)!.toFixed(1)}%`}
                    </small>
                  </td>
                  <td>{decisionLabel(decisionOf(row))}</td>
                  <td>
                    <span className={statusBadgeClass(status)}>
                      {reportStatusLabel(status)}
                    </span>
                  </td>
                  <td>
                    {row.snapshot_id && row.published_at && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          selectedRow?.participant_id === row.participant_id &&
                          currentPreview
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
                        aria-label={`Unduh PDF rapor ${row.display_name}${
                          rowVersion ? ` · ${rowVersion}` : ""
                        }`}
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
                        <form action={assignAction} className="rubric-add-form">
                          <input
                            type="hidden"
                            name="participantId"
                            value={row.participant_id}
                          />
                          <label>
                            Akun Peserta
                            <select name="userId" defaultValue="" required>
                              <option value="" disabled>
                                Pilih akun
                              </option>
                              {candidateAccounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                  {account.display_name || "Akun tanpa nama"}
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
  );
}
