"use client";

import { useMemo, useState, useTransition } from "react";
import { commitImport, matchImportedRows, parseWorkbook } from "./actions";

type Sheet = { name: string; rows: (string | number)[][] };
type Candidate = { id: string; name: string; commissariat: string };
type ReviewedRow = {
  rowNumber: number;
  name: string;
  commissariat: string;
  score: number;
  candidates: Candidate[];
  participantId: string;
  include: boolean;
};
type ExistingResult = {
  participantId: string;
  score: number;
  importedAt: string;
  filename: string;
};

function textCell(value: string | number | undefined) {
  return String(value ?? "").trim();
}
function suggestedColumn(
  headers: string[],
  type: "name" | "commissariat" | "score",
) {
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

export function ImportWizard({
  events,
}: {
  events: { id: string; name: string }[];
}) {
  const [eventId, setEventId] = useState("");
  const [testType, setTestType] = useState<"pretest" | "posttest">("pretest");
  const [filename, setFilename] = useState("");
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [sheetName, setSheetName] = useState("");
  const [columns, setColumns] = useState({
    name: -1,
    commissariat: -1,
    score: -1,
  });
  const [rows, setRows] = useState<ReviewedRow[]>([]);
  const [participants, setParticipants] = useState<Candidate[]>([]);
  const [existing, setExisting] = useState<ExistingResult[]>([]);
  const [currentChoice, setCurrentChoice] = useState<Record<string, string>>(
    {},
  );
  const [message, setMessage] = useState("");
  const [savedImport, setSavedImport] = useState("");
  const [isPending, startTransition] = useTransition();
  const sheet = sheets.find((item) => item.name === sheetName);
  const headers = (sheet?.rows[0] ?? []).map((value) => textCell(value));
  const includedRows = rows.filter((row) => row.include);
  const selectedGroups = useMemo(() => {
    const groups = new Map<string, ReviewedRow[]>();
    for (const row of includedRows)
      if (row.participantId)
        groups.set(row.participantId, [
          ...(groups.get(row.participantId) ?? []),
          row,
        ]);
    return groups;
  }, [includedRows]);
  const choicesReady = [...selectedGroups].every(([participantId, group]) => {
    const choice = currentChoice[participantId];
    const prior = existing.some(
      (result) => result.participantId === participantId,
    );
    if (!choice) return false;
    return choice === `existing:${participantId}`
      ? prior
      : group.some((row) => String(row.rowNumber) === choice);
  });
  const canSave =
    !savedImport &&
    rows.some((row) => row.include) &&
    includedRows.every(
      (row) =>
        row.participantId &&
        row.candidates.some((candidate) => candidate.id === row.participantId),
    ) &&
    choicesReady;

  function reset() {
    setSheets([]);
    setSheetName("");
    setRows([]);
    setParticipants([]);
    setExisting([]);
    setCurrentChoice({});
    setFilename("");
    setMessage("");
    setSavedImport("");
  }

  function handleFile(formData: FormData) {
    setMessage("");
    startTransition(async () => {
      const result = await parseWorkbook(formData);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setFilename(result.filename);
      setSheets(result.sheets);
      setSheetName(result.sheets[0]?.name ?? "");
      const firstHeaders = (result.sheets[0]?.rows[0] ?? []).map((value) =>
        textCell(value),
      );
      setColumns({
        name: suggestedColumn(firstHeaders, "name"),
        commissariat: suggestedColumn(firstHeaders, "commissariat"),
        score: suggestedColumn(firstHeaders, "score"),
      });
    });
  }

  function checkMatches() {
    if (!sheet || !eventId) {
      setMessage("Pilih kegiatan dan lembar kerja terlebih dahulu.");
      return;
    }
    if (
      Object.values(columns).some((column) => column < 0) ||
      new Set(Object.values(columns)).size !== 3
    ) {
      setMessage("Pilih kolom yang berbeda untuk nama, Komisariat, dan nilai.");
      return;
    }
    const prepared: {
      rowNumber: number;
      name: string;
      commissariat: string;
      score: number;
    }[] = [];
    for (const [index, values] of sheet.rows.slice(1).entries()) {
      if (values.every((value) => textCell(value) === "")) continue;
      const name = textCell(values[columns.name]);
      const commissariat = textCell(values[columns.commissariat]);
      const rawScore = values[columns.score];
      const score =
        typeof rawScore === "number" ? rawScore : Number(textCell(rawScore));
      if (!name || !commissariat || !Number.isFinite(score)) {
        setMessage(
          `Baris ${index + 2} belum valid. Pastikan nama, Komisariat, dan nilai terisi serta nilai berbentuk angka.`,
        );
        return;
      }
      prepared.push({ rowNumber: index + 2, name, commissariat, score });
    }
    if (!prepared.length || prepared.length > 500) {
      setMessage("Lembar harus berisi 1–500 baris data.");
      return;
    }
    setMessage("");
    startTransition(async () => {
      try {
        const result = await matchImportedRows({
          eventId,
          testType,
          rows: prepared,
        });
        setParticipants(result.participants);
        setExisting(result.currentResults);
        const reviewed = result.matches.map((row) => ({
          ...row,
          participantId:
            row.candidates.length === 1 ? row.candidates[0].id : "",
          include: true,
        }));
        setRows(reviewed);
        const initial: Record<string, string> = {};
        const groups = new Map<string, ReviewedRow[]>();
        for (const row of reviewed)
          if (row.participantId)
            groups.set(row.participantId, [
              ...(groups.get(row.participantId) ?? []),
              row,
            ]);
        for (const [participantId, group] of groups)
          if (
            group.length === 1 &&
            !result.currentResults.some(
              (item) => item.participantId === participantId,
            )
          )
            initial[participantId] = String(group[0].rowNumber);
        setCurrentChoice(initial);
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Pencocokan gagal.",
        );
      }
    });
  }

  function chooseParticipant(rowNumber: number, participantId: string) {
    setRows((current) =>
      current.map((row) =>
        row.rowNumber === rowNumber ? { ...row, participantId } : row,
      ),
    );
    setCurrentChoice((current) => {
      const next = { ...current };
      for (const row of rows)
        if (row.rowNumber === rowNumber && row.participantId)
          delete next[row.participantId];
      if (participantId) {
        const group = rows.filter(
          (row) =>
            row.include &&
            (row.participantId === participantId ||
              row.rowNumber === rowNumber),
        );
        if (
          group.length === 1 &&
          !existing.some((item) => item.participantId === participantId)
        )
          next[participantId] = String(rowNumber);
      }
      return next;
    });
  }

  function toggleInclude(rowNumber: number, include: boolean) {
    const target = rows.find((row) => row.rowNumber === rowNumber);
    if (!target) return;
    setRows((current) =>
      current.map((row) =>
        row.rowNumber === rowNumber ? { ...row, include } : row,
      ),
    );
    if (!include)
      setCurrentChoice((current) => {
        const next = { ...current };
        if (
          target.participantId &&
          next[target.participantId] === String(rowNumber)
        )
          delete next[target.participantId];
        return next;
      });
  }

  function saveReviewedImport() {
    const payload = includedRows.map((row) => ({
      participantId: row.participantId,
      rowNumber: row.rowNumber,
      name: row.name,
      commissariat: row.commissariat,
      score: row.score,
      isCurrent: currentChoice[row.participantId] === String(row.rowNumber),
    }));
    startTransition(async () => {
      try {
        const result = await commitImport({
          eventId,
          testType,
          filename,
          rows: payload,
        });
        setSavedImport(result.importId);
        setMessage(
          `${payload.length} baris tersimpan. Riwayat impor dipertahankan.`,
        );
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Impor gagal disimpan.",
        );
      }
    });
  }

  return (
    <section className="event-manage-card import-card">
      {savedImport ? (
        <>
          <div className="users-notice">
            <strong>Impor selesai</strong>
            <p>
              {message} ID impor: <code>{savedImport}</code>
            </p>
          </div>
          <button type="button" className="rubric-activate" onClick={reset}>
            Mulai impor lain
          </button>
        </>
      ) : (
        <>
          <form action={handleFile} className="import-setup-form">
            <label>
              Kegiatan
              <select
                required
                value={eventId}
                onChange={(event) => {
                  setEventId(event.target.value);
                  setRows([]);
                }}
              >
                <option value="">Pilih kegiatan</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Jenis nilai
              <select
                value={testType}
                onChange={(event) => {
                  setTestType(event.target.value as "pretest" | "posttest");
                  setRows([]);
                }}
              >
                <option value="pretest">Pretest</option>
                <option value="posttest">Posttest</option>
              </select>
            </label>
            <label>
              Berkas Excel (.xlsx)
              <input
                name="file"
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                required
              />
            </label>
            <button type="submit" disabled={isPending}>
              {isPending ? "Membaca…" : "Baca berkas"}
            </button>
          </form>
          {!!sheets.length && !rows.length && (
            <div className="import-columns">
              <p>
                Berkas <strong>{filename}</strong> dibaca di server. Pilih
                lembar kerja dan kolom sumber.
              </p>
              {sheets.length > 1 && (
                <label>
                  Lembar kerja
                  <select
                    value={sheetName}
                    onChange={(event) => {
                      setSheetName(event.target.value);
                      const selected = sheets.find(
                        (item) => item.name === event.target.value,
                      );
                      const head = (selected?.rows[0] ?? []).map(textCell);
                      setColumns({
                        name: suggestedColumn(head, "name"),
                        commissariat: suggestedColumn(head, "commissariat"),
                        score: suggestedColumn(head, "score"),
                      });
                    }}
                  >
                    {sheets.map((item) => (
                      <option key={item.name} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="import-columns-grid">
                {(["name", "commissariat", "score"] as const).map((column) => (
                  <label key={column}>
                    {column === "name"
                      ? "Kolom nama"
                      : column === "commissariat"
                        ? "Kolom Komisariat"
                        : "Kolom nilai"}
                    <select
                      value={columns[column]}
                      onChange={(event) =>
                        setColumns((current) => ({
                          ...current,
                          [column]: Number(event.target.value),
                        }))
                      }
                    >
                      <option value={-1}>Pilih kolom</option>
                      {headers.map((header, index) => (
                        <option value={index} key={`${index}-${header}`}>
                          {header || `Kolom ${index + 1}`}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <p className="data-caption">
                Baris pertama dianggap judul kolom. Nilai harus berupa angka.
                Maksimal 5 MB, 500 baris data, dan 50 kolom.
              </p>
              <button
                type="button"
                className="rubric-activate"
                onClick={checkMatches}
                disabled={isPending || !eventId}
              >
                Cek peserta
              </button>
            </div>
          )}
          {!!rows.length && (
            <div className="import-review">
              <h2>Periksa kecocokan sebelum menyimpan</h2>
              <p>
                Pastikan setiap baris cocok dengan peserta yang benar. Baris
                yang tidak disertakan tidak akan diimpor.
              </p>
              <div className="users-table-wrap">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th scope="col">Baris</th>
                      <th scope="col">Nama dari berkas</th>
                      <th scope="col">Komisariat</th>
                      <th scope="col">Nilai</th>
                      <th scope="col">Peserta yang cocok</th>
                      <th scope="col">Sertakan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.rowNumber}>
                        <td>{row.rowNumber}</td>
                        <td>{row.name}</td>
                        <td>{row.commissariat}</td>
                        <td>{row.score}</td>
                        <td>
                          <select
                            value={row.participantId}
                            disabled={!row.include}
                            onChange={(event) =>
                              chooseParticipant(
                                row.rowNumber,
                                event.target.value,
                              )
                            }
                          >
                            <option value="">
                              {row.candidates.length
                                ? "Pilih peserta"
                                : "Tidak cocok otomatis — pilih manual"}
                            </option>
                            {row.candidates.map((candidate) => (
                              <option key={candidate.id} value={candidate.id}>
                                {candidate.name} · {candidate.commissariat}
                              </option>
                            ))}
                            {!row.candidates.length &&
                              participants.map((candidate) => (
                                <option key={candidate.id} value={candidate.id}>
                                  {candidate.name} · {candidate.commissariat}
                                </option>
                              ))}
                          </select>
                          {row.candidates.length > 1 && (
                            <small className="match-warning">
                              Nama dan Komisariat sama ditemukan pada beberapa
                              peserta. Pastikan pilihan benar.
                            </small>
                          )}
                        </td>
                        <td>
                          <input
                            type="checkbox"
                            checked={row.include}
                            onChange={(event) =>
                              toggleInclude(row.rowNumber, event.target.checked)
                            }
                            aria-label={`Sertakan baris ${row.rowNumber}`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {[...selectedGroups].map(([participantId, group]) => {
                const prior = existing.find(
                  (item) => item.participantId === participantId,
                );
                if (group.length < 2 && !prior) return null;
                const person = participants.find(
                  (item) => item.id === participantId,
                );
                return (
                  <div className="duplicate-choice" key={participantId}>
                    <strong>
                      {person?.name} · {person?.commissariat}
                    </strong>
                    <p>
                      Peserta ini memiliki beberapa nilai sumber. Pilih hasil
                      yang akan dipakai; semua baris impor tetap disimpan
                      sebagai riwayat.
                    </p>
                    <div className="duplicate-options">
                      {prior && (
                        <label>
                          <input
                            type="radio"
                            name={`current-${participantId}`}
                            checked={
                              currentChoice[participantId] ===
                              `existing:${participantId}`
                            }
                            onChange={() =>
                              setCurrentChoice((current) => ({
                                ...current,
                                [participantId]: `existing:${participantId}`,
                              }))
                            }
                          />
                          <span>
                            Pertahankan nilai saat ini {prior.score} dari{" "}
                            {prior.filename}
                          </span>
                        </label>
                      )}
                      {group.map((row) => (
                        <label key={row.rowNumber}>
                          <input
                            type="radio"
                            name={`current-${participantId}`}
                            checked={
                              currentChoice[participantId] ===
                              String(row.rowNumber)
                            }
                            onChange={() =>
                              setCurrentChoice((current) => ({
                                ...current,
                                [participantId]: String(row.rowNumber),
                              }))
                            }
                          />
                          <span>
                            Gunakan nilai {row.score} dari baris {row.rowNumber}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                className="rubric-activate"
                onClick={saveReviewedImport}
                disabled={isPending || !canSave}
              >
                {isPending ? "Menyimpan…" : "Simpan hasil yang sudah ditinjau"}
              </button>
              {!canSave && (
                <p className="data-caption">
                  Pilih peserta untuk setiap baris yang disertakan, lalu
                  tentukan nilai yang dipakai jika ada nilai lama atau baris
                  ganda.
                </p>
              )}
            </div>
          )}
          {message && <p className="users-error">{message}</p>}
        </>
      )}
    </section>
  );
}
