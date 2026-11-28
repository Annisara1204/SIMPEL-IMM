import type { ComponentProps } from "react";
import { FrameworkRubricPicker } from "@/app/dashboard/penilaian/framework-rubric-picker";
import {
  activateRubric,
  addAspect,
  addIndicator,
  archiveRubricVersion,
  editAspect,
  editIndicator,
  linkIndicatorToAspect,
  removeDraftAspect,
  removeDraftIndicatorMapping,
  unlinkIndicatorFromAspect,
} from "@/app/dashboard/penilaian/rubric-actions";
import { asRows, firstRelated } from "@/lib/relations";
import { validateRubricForActivation } from "@/lib/rubric-weights";
import { SCORE_SCALE_LABELS } from "@/lib/scoring";

type FrameworkChoices = ComponentProps<typeof FrameworkRubricPicker>["aspects"];
type Indicator = {
  id: string;
  name?: string;
  position?: number;
  target?: string | null;
  score_descriptors?: Record<string, unknown> | null;
  competency_indicator_id?: string | null;
};
type Mapping = {
  id?: string;
  weight?: number | string | null;
  rubric_indicators?: Indicator | Indicator[] | null;
};
type Aspect = {
  id: string;
  name?: string;
  weight?: number | string | null;
  position?: number;
  competency_aspect_id?: string | null;
  rubric_indicator_aspects?: Mapping[] | null;
};
type Version = {
  id: string;
  version: number;
  is_trial?: boolean | null;
  status: string;
  rubric_aspects?: unknown;
};

const isMapping = (value: Record<string, unknown>) =>
  "weight" in value && "rubric_indicators" in value;
const isAspect = (value: Record<string, unknown>) =>
  typeof value.id === "string" && "weight" in value;

type Props = {
  version: Version;
  canManageRubric: boolean;
  eventId: string;
  selectedStage?: string;
  selectedTypeId?: string;
  selectedMaterialId?: string;
  selectedMaterial: { name: string } | null;
  frameworkChoices: FrameworkChoices;
};

export function RubricVersionCard({
  version,
  canManageRubric,
  eventId,
  selectedStage,
  selectedTypeId,
  selectedMaterialId,
  selectedMaterial,
  frameworkChoices,
}: Props) {
  const aspects = asRows<Aspect>(version.rubric_aspects, isAspect)
    .map((aspect) => ({
      ...aspect,
      rubric_indicator_aspects: asRows<Mapping>(
        aspect.rubric_indicator_aspects,
        isMapping,
      ),
    }))
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const aspectTotal = aspects.reduce(
    (sum, aspect) => sum + Number(aspect.weight),
    0,
  );
  const valid = validateRubricForActivation(aspects) === null;
  const statusLabel =
    version.status === "active"
      ? "Aktif"
      : version.status === "archived"
        ? "Diarsipkan"
        : "Draf";
  return (
    <div className="rubric-version" key={version.id}>
      <div className="event-manage-title">
        <div>
          <h3>
            Versi {version.version} · {statusLabel}
          </h3>
          <p>
            Bobot aspek: {aspectTotal.toFixed(2)}% · Aspek tanpa indikator
            diamati akan dikecualikan dan bobot aspek lain dinormalisasi ulang.
          </p>
        </div>
        <span className={`badge ${version.is_trial ? "tag" : "done"}`}>
          {version.is_trial ? "Percobaan" : "Resmi"}
        </span>
      </div>
      {version.status === "active" && canManageRubric && (
        <form action={archiveRubricVersion} className="event-archive-form">
          <input type="hidden" name="versionId" value={version.id} />
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="stage" value={selectedStage} />
          {selectedStage === "training" && (
            <input
              type="hidden"
              name="materialId"
              value={selectedMaterialId ?? ""}
            />
          )}
          <button type="submit">Arsipkan versi</button>
          <small>
            Versi aktif ditutup tanpa menggantinya. Nilai dan riwayat tetap
            tersimpan.
          </small>
        </form>
      )}
      {version.status === "draft" &&
        canManageRubric &&
        selectedStage === "training" &&
        selectedMaterial && (
          <FrameworkRubricPicker
            key={`${version.id}:${aspects.flatMap((aspect) => (aspect.competency_aspect_id ? [aspect.competency_aspect_id] : [])).join(",")}:${aspects
              .flatMap((aspect) =>
                (aspect.rubric_indicator_aspects ?? []).flatMap((mapping) => {
                  const indicator = firstRelated(mapping.rubric_indicators);
                  return indicator?.competency_indicator_id
                    ? [indicator.competency_indicator_id]
                    : [];
                }),
              )
              .join(",")}`}
            versionId={version.id}
            eventId={eventId}
            stage={selectedStage}
            materialId={selectedMaterialId}
            typeId={selectedTypeId}
            aspects={frameworkChoices}
            materialName={selectedMaterial.name}
            selectedAspectIds={aspects.flatMap((aspect) =>
              aspect.competency_aspect_id ? [aspect.competency_aspect_id] : [],
            )}
            selectedIndicatorIds={aspects.flatMap((aspect) =>
              (aspect.rubric_indicator_aspects ?? []).flatMap((mapping) => {
                const indicator = firstRelated(mapping.rubric_indicators);
                return indicator?.competency_indicator_id
                  ? [indicator.competency_indicator_id]
                  : [];
              }),
            )}
          />
        )}
      {aspects.map((aspect) => (
        <div className="rubric-aspect" key={aspect.id}>
          <strong>
            {aspect.name} <span>{Number(aspect.weight).toFixed(2)}%</span>
          </strong>
          {version.status === "draft" && canManageRubric && (
            <>
              <form action={editAspect} className="rubric-add-form">
                <input type="hidden" name="aspectId" value={aspect.id} />
                <label>
                  Ubah nama aspek
                  <input
                    required
                    minLength={2}
                    maxLength={120}
                    name="name"
                    defaultValue={aspect.name}
                  />
                </label>
                <label>
                  Bobot (%)
                  <input
                    required
                    type="number"
                    min="0.01"
                    max="100"
                    step="0.01"
                    name="weight"
                    defaultValue={aspect.weight ?? undefined}
                  />
                </label>
                <button type="submit">Simpan aspek</button>
              </form>
              <details className="rubric-edit">
                <summary>Hapus aspek dari draf</summary>
                <form action={removeDraftAspect} className="rubric-add-form">
                  <input type="hidden" name="aspectId" value={aspect.id} />
                  <p>
                    Indikator yang hanya terhubung ke aspek ini juga akan
                    dihapus dari draf. Versi aktif/arsip tidak terpengaruh.
                  </p>
                  <button type="submit" className="remove-button">
                    Hapus aspek ini
                  </button>
                </form>
              </details>
            </>
          )}
          {[...(aspect.rubric_indicator_aspects ?? [])]
            .sort(
              (a, b) =>
                (firstRelated(a.rubric_indicators)?.position ?? 0) -
                (firstRelated(b.rubric_indicators)?.position ?? 0),
            )
            .map((mapping) => {
              const indicator = firstRelated(mapping.rubric_indicators);
              if (!indicator) return null;
              const linkedAspectIds = new Set(
                aspects.flatMap((item) =>
                  (item.rubric_indicator_aspects ?? [])
                    .filter(
                      (link) =>
                        firstRelated(link.rubric_indicators)?.id ===
                        indicator.id,
                    )
                    .map(() => item.id),
                ),
              );
              const linkableAspects = aspects.filter(
                (item) =>
                  item.id !== aspect.id && !linkedAspectIds.has(item.id),
              );
              return (
                <div className="rubric-indicator" key={mapping.id}>
                  <div>
                    <b>{indicator.name}</b>
                    {indicator.target && (
                      <small>Target: {indicator.target}</small>
                    )}
                    <small>
                      Uraian skor:{" "}
                      {
                        [1, 2, 3, 4, 5].filter(
                          (score) =>
                            String(
                              indicator.score_descriptors?.[String(score)] ??
                                "",
                            ).trim().length >= 3,
                        ).length
                      }
                      /5 terisi
                    </small>
                  </div>
                  <span>
                    {Number(mapping.weight).toFixed(2)}% pada aspek ini
                  </span>
                  {version.status === "draft" && canManageRubric && (
                    <details className="rubric-edit">
                      <summary>Ubah/petakan/hapus</summary>
                      <form action={editIndicator} className="rubric-add-form">
                        <input
                          type="hidden"
                          name="indicatorId"
                          value={indicator.id}
                        />
                        <input
                          type="hidden"
                          name="mappingId"
                          value={mapping.id}
                        />
                        <label>
                          Nama indikator
                          <input
                            required
                            minLength={2}
                            maxLength={200}
                            name="name"
                            defaultValue={indicator.name}
                          />
                        </label>
                        <label>
                          Target (opsional)
                          <input
                            maxLength={300}
                            name="target"
                            defaultValue={indicator.target ?? ""}
                          />
                        </label>
                        <label>
                          Bobot dalam {aspect.name} (%)
                          <input
                            required
                            type="number"
                            min="0.01"
                            max="100"
                            step="0.01"
                            name="weight"
                            defaultValue={mapping.weight ?? undefined}
                          />
                        </label>
                        {[1, 2, 3, 4, 5].map((score) => (
                          <label key={score}>
                            Uraian skor {score} · {SCORE_SCALE_LABELS[score]}
                            <textarea
                              required
                              minLength={3}
                              maxLength={500}
                              name={`descriptor${score}`}
                              defaultValue={String(
                                indicator.score_descriptors?.[String(score)] ??
                                  "",
                              )}
                              rows={2}
                            />
                          </label>
                        ))}
                        <button type="submit">Simpan indikator</button>
                      </form>
                      {linkableAspects.length > 0 && (
                        <form
                          action={linkIndicatorToAspect}
                          className="rubric-add-form"
                        >
                          <input
                            type="hidden"
                            name="indicatorId"
                            value={indicator.id}
                          />
                          <label>
                            Tambahkan ke aspek lain
                            <select name="aspectId" required defaultValue="">
                              <option value="" disabled>
                                Pilih aspek
                              </option>
                              {linkableAspects.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Bobot indikator pada aspek itu (%)
                            <input
                              required
                              type="number"
                              min="0.01"
                              max="100"
                              step="0.01"
                              name="weight"
                            />
                          </label>
                          <button type="submit">Tambahkan pemetaan</button>
                        </form>
                      )}
                      {linkedAspectIds.size > 1 && (
                        <form
                          action={unlinkIndicatorFromAspect}
                          className="rubric-add-form"
                        >
                          <input
                            type="hidden"
                            name="mappingId"
                            value={mapping.id}
                          />
                          <input
                            type="hidden"
                            name="indicatorId"
                            value={indicator.id}
                          />
                          <button type="submit" className="remove-button">
                            Lepas dari aspek ini
                          </button>
                        </form>
                      )}
                      <form
                        action={removeDraftIndicatorMapping}
                        className="rubric-add-form"
                      >
                        <input
                          type="hidden"
                          name="mappingId"
                          value={mapping.id}
                        />
                        <input
                          type="hidden"
                          name="indicatorId"
                          value={indicator.id}
                        />
                        <button type="submit" className="remove-button">
                          Hapus indikator dari aspek ini
                        </button>
                      </form>
                    </details>
                  )}
                </div>
              );
            })}
          {version.status === "draft" && canManageRubric && (
            <form action={addIndicator} className="rubric-add-form">
              <input type="hidden" name="aspectId" value={aspect.id} />
              <label>
                Indikator
                <input
                  required
                  minLength={2}
                  maxLength={200}
                  name="name"
                  placeholder="Tulis perilaku yang dapat diamati"
                />
              </label>
              <label>
                Target (opsional)
                <input maxLength={300} name="target" />
              </label>
              <label>
                Bobot pada aspek ini (%)
                <input
                  required
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  name="weight"
                />
              </label>
              {[1, 2, 3, 4, 5].map((score) => (
                <label key={score}>
                  Uraian skor {score} · {SCORE_SCALE_LABELS[score]}
                  <textarea
                    required
                    minLength={3}
                    maxLength={500}
                    name={`descriptor${score}`}
                    rows={2}
                  />
                </label>
              ))}
              <button type="submit">Tambah indikator</button>
            </form>
          )}
        </div>
      ))}
      {version.status === "draft" && canManageRubric && (
        <>
          <form action={addAspect} className="rubric-add-form">
            <input type="hidden" name="versionId" value={version.id} />
            <label>
              Nama aspek
              <input
                required
                minLength={2}
                maxLength={120}
                name="name"
                placeholder="Contoh: tentukan aspek bersama instruktur"
              />
            </label>
            <label>
              Bobot (%)
              <input
                required
                type="number"
                min="0.01"
                max="100"
                step="0.01"
                name="weight"
              />
            </label>
            <button type="submit">Tambah aspek</button>
          </form>
          <form action={activateRubric}>
            <input type="hidden" name="versionId" value={version.id} />
            <button
              className="btn btn--primary btn--lg"
              type="submit"
              disabled={!valid}
            >
              {valid
                ? "Aktifkan versi"
                : "Lengkapi aspek dan bobot hingga masing-masing 100%"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
