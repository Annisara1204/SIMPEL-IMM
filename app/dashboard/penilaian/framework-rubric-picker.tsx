"use client";

import { useState } from "react";
import { applyFrameworkRubricSelection } from "./rubric-actions";

export type FrameworkAspectChoice = {
  id: string;
  code: string;
  name: string;
  weight: number;
  indicators: {
    id: string;
    code: string;
    name: string;
    guidance: string;
    anchors: Record<string, string>;
    linkedAspectIds: string[];
  }[];
};

export function FrameworkRubricPicker({
  versionId,
  aspects,
  selectedAspectIds,
  selectedIndicatorIds,
  materialName,
}: {
  versionId: string;
  aspects: FrameworkAspectChoice[];
  selectedAspectIds: string[];
  selectedIndicatorIds: string[];
  materialName: string;
}) {
  const initialPairs = aspects.flatMap((aspect) =>
    aspect.indicators
      .filter(
        (indicator) =>
          selectedIndicatorIds.includes(indicator.id) &&
          selectedAspectIds.includes(aspect.id),
      )
      .map((indicator) => `${aspect.id}:${indicator.id}`),
  );
  const [selectedAspects, setSelectedAspects] =
    useState<string[]>(selectedAspectIds);
  const [selectedPairs, setSelectedPairs] = useState<string[]>(initialPairs);
  const toggleAspect = (aspectId: string, checked: boolean) => {
    setSelectedAspects((current) =>
      checked
        ? [...new Set([...current, aspectId])]
        : current.filter((id) => id !== aspectId),
    );
    if (!checked)
      setSelectedPairs((current) =>
        current.filter((pair) => !pair.startsWith(`${aspectId}:`)),
      );
  };
  const togglePair = (pair: string, aspectId: string, checked: boolean) => {
    setSelectedPairs((current) =>
      checked
        ? [...new Set([...current, pair])]
        : current.filter((item) => item !== pair),
    );
    if (checked)
      setSelectedAspects((current) => [...new Set([...current, aspectId])]);
  };
  if (!aspects.length)
    return (
      <p className="assessment-assignment-empty">
        Master kerangka DAD tidak dapat dimuat. Jalankan seluruh migrasi
        kerangka DAD terlebih dahulu.
      </p>
    );
  return (
    <details className="framework-rubric-picker" open>
      <summary>Pilih aspek dan indikator dari Kerangka DAD</summary>
      <p>
        Pilihan ini berlaku untuk draf rubrik <strong>{materialName}</strong>{" "}
        saja. Pilih aspek dan indikator yang ingin dipakai. Menekan Terapkan
        akan mengganti pilihan Kerangka DAD pada draf ini; indikator manual
        tetap dipertahankan.
      </p>
      <form action={applyFrameworkRubricSelection}>
        <input type="hidden" name="versionId" value={versionId} />
        {selectedAspects.map((id) => (
          <input
            key={`aspect:${id}`}
            type="hidden"
            name="aspectIds"
            value={id}
          />
        ))}
        {selectedPairs.map((pair) => (
          <input
            key={`pair:${pair}`}
            type="hidden"
            name="indicatorPairs"
            value={pair}
          />
        ))}
        <button
          className="rubric-activate framework-rubric-apply"
          type="submit"
        >
          Terapkan pilihan Kerangka DAD
        </button>
        <div className="framework-rubric-choice-list">
          {aspects.map((aspect) => (
            <fieldset className="framework-rubric-choice" key={aspect.id}>
              <legend>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedAspects.includes(aspect.id)}
                    onChange={(event) =>
                      toggleAspect(aspect.id, event.target.checked)
                    }
                  />{" "}
                  {aspect.code} · {aspect.name}{" "}
                  <small>Bobot master {aspect.weight}%</small>
                </label>
              </legend>
              {aspect.indicators.map((indicator) => {
                const pair = `${aspect.id}:${indicator.id}`;
                return (
                  <label
                    className="framework-rubric-indicator-choice"
                    key={pair}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPairs.includes(pair)}
                      onChange={(event) =>
                        togglePair(pair, aspect.id, event.target.checked)
                      }
                    />
                    <span>
                      <strong>
                        {indicator.code} · {indicator.name}
                      </strong>
                      <small>{indicator.guidance}</small>
                    </span>
                  </label>
                );
              })}
            </fieldset>
          ))}
        </div>
      </form>
    </details>
  );
}
