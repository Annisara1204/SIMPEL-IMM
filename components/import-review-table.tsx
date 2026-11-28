"use client";
import type { Dispatch, SetStateAction } from "react";
import type {
  Candidate,
  ExistingResult,
  ReviewedRow,
} from "@/app/dashboard/impor-tes/import-wizard";

type Props = {
  rows: ReviewedRow[];
  participants: Candidate[];
  existing: ExistingResult[];
  selectedGroups: Map<string, ReviewedRow[]>;
  currentChoice: Record<string, string>;
  setCurrentChoice: Dispatch<SetStateAction<Record<string, string>>>;
  chooseParticipant: (rowNumber: number, value: string) => void;
  toggleInclude: (rowNumber: number, include: boolean) => void;
  canSave: boolean;
  isPending: boolean;
  saveReviewedImport: () => void;
};

export function ImportReviewTable({
  rows,
  participants,
  existing,
  selectedGroups,
  currentChoice,
  setCurrentChoice,
  chooseParticipant,
  toggleInclude,
  canSave,
  isPending,
  saveReviewedImport,
}: Props) {
  return (
    <div className="import-review">
      <h2>Periksa kecocokan sebelum menyimpan</h2>
      <p>
        Pastikan setiap baris cocok dengan peserta yang benar. Baris yang tidak
        disertakan tidak akan diimpor.
      </p>
      <div className="table-wrap">
        <table className="table">
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
                    aria-label={`Peserta baris ${row.rowNumber}`}
                    value={row.participantId}
                    disabled={!row.include}
                    onChange={(event) =>
                      chooseParticipant(row.rowNumber, event.target.value)
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
                      Nama dan Komisariat sama ditemukan pada beberapa peserta.
                      Pastikan pilihan benar.
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
        const person = participants.find((item) => item.id === participantId);
        return (
          <div className="duplicate-choice" key={participantId}>
            <strong>
              {person?.name} · {person?.commissariat}
            </strong>
            <p>
              Peserta ini memiliki beberapa nilai sumber. Pilih hasil yang akan
              dipakai; semua baris impor tetap disimpan sebagai riwayat.
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
                      currentChoice[participantId] === String(row.rowNumber)
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
        className="btn btn--primary btn--lg"
        onClick={saveReviewedImport}
        disabled={isPending || !canSave}
      >
        {isPending ? "Menyimpan…" : "Simpan hasil yang sudah ditinjau"}
      </button>
      {!canSave && (
        <p className="data-caption">
          Pilih peserta untuk setiap baris yang disertakan, lalu tentukan nilai
          yang dipakai jika ada nilai lama atau baris ganda.
        </p>
      )}
    </div>
  );
}
