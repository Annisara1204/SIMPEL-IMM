import { redirect } from "next/navigation";
import {
  RubricPreview,
  type RubricPreviewItem,
} from "@/components/rubric-preview";
import {
  CompetencyMaterialMapping,
  type CompetencyMappingContext,
} from "@/components/competency-material-mapping";
import { createClient } from "@/lib/supabase/server";

const allowedRoles = ["admin_system", "bidang_kader", "observer", "instruktur"];

export default async function CompetencyFrameworkPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.role || !allowedRoles.includes(profile.role))
    redirect("/dashboard");

  const { data: framework } = await supabase
    .from("competency_frameworks")
    .select("id, name, description")
    .eq("code", "DAD_IMM")
    .maybeSingle();
  if (!framework)
    return (
      <main className="users-page">
        <section className="event-manage-card">
          <h1>Kerangka Kompetensi DAD</h1>
          <p>
            Master framework belum tersedia. Pastikan migration framework,
            pemetaan materi, dan rubrik trial sudah dijalankan berurutan.
          </p>
        </section>
      </main>
    );
  const { data: frameworkVersion } = await supabase
    .from("competency_framework_versions")
    .select("id, version, status, is_official, source_note")
    .eq("framework_id", framework.id)
    .eq("version", 1)
    .maybeSingle();
  if (!frameworkVersion)
    return (
      <main className="users-page">
        <section className="event-manage-card">
          <h1>Kerangka Kompetensi DAD</h1>
          <p>Versi trial belum tersedia.</p>
        </section>
      </main>
    );

  const [
    { data: aspects },
    { data: indicators },
    { data: indicatorAspectLinks },
    { data: rubrics },
    { data: rubricVersions },
    { data: materials, error: materialsError },
    { data: materialIndicatorLinks, error: materialMappingsError },
  ] = await Promise.all([
    supabase
      .from("competency_aspects")
      .select("id, code, name, weight, position")
      .eq("framework_version_id", frameworkVersion.id)
      .order("position"),
    supabase
      .from("competency_indicators")
      .select(
        "id, code, name, description, measurement_objective, evidence_guidance, position",
      )
      .eq("framework_version_id", frameworkVersion.id)
      .order("position"),
    supabase
      .from("competency_indicator_aspects")
      .select("indicator_id, aspect_id")
      .eq("framework_version_id", frameworkVersion.id),
    supabase
      .from("competency_indicator_rubrics")
      .select("id, indicator_id, code, title")
      .eq("framework_version_id", frameworkVersion.id),
    supabase
      .from("competency_indicator_rubric_versions")
      .select("id, rubric_id, version, status")
      .eq("framework_version_id", frameworkVersion.id)
      .eq("status", "published"),
    supabase
      .from("competency_materials")
      .select("id, code, name, description, context_type, position")
      .eq("framework_version_id", frameworkVersion.id)
      .order("position"),
    supabase
      .from("competency_material_indicators")
      .select(
        "material_id, aspect_id, indicator_id, assessment_method, observation_guidance, is_required, assessment_scope, active, competency_indicator_rubric_version_id",
      )
      .eq("framework_version_id", frameworkVersion.id)
      .eq("active", true),
  ]);
  const rubricVersionIds = (rubricVersions ?? []).map((item) => item.id);
  const { data: anchors } = rubricVersionIds.length
    ? await supabase
        .from("rubric_behavioral_anchors")
        .select("rubric_version_id, score, label, description")
        .in("rubric_version_id", rubricVersionIds)
        .order("score")
    : { data: [] };
  const aspectById = new Map(
    (aspects ?? []).map((aspect) => [aspect.id, aspect]),
  );
  const rubricByIndicator = new Map(
    (rubrics ?? []).map((rubric) => [rubric.indicator_id, rubric]),
  );
  const publishedVersionByRubric = new Map(
    (rubricVersions ?? []).map((version) => [version.rubric_id, version]),
  );
  const linksByIndicator = new Map<string, string[]>();
  for (const link of indicatorAspectLinks ?? [])
    linksByIndicator.set(link.indicator_id, [
      ...(linksByIndicator.get(link.indicator_id) ?? []),
      link.aspect_id,
    ]);
  const items: RubricPreviewItem[] = (indicators ?? []).map((indicator) => {
    const rubric = rubricByIndicator.get(indicator.id);
    const published = rubric ? publishedVersionByRubric.get(rubric.id) : null;
    return {
      code: indicator.code,
      name: indicator.name,
      description: indicator.description,
      measurement_objective: indicator.measurement_objective,
      evidence_guidance: indicator.evidence_guidance,
      aspectNames: (linksByIndicator.get(indicator.id) ?? [])
        .map((id) => aspectById.get(id)?.name)
        .filter((name): name is string => !!name),
      rubricCode: rubric?.code ?? null,
      rubricStatus: published?.status ?? null,
      anchors: (anchors ?? [])
        .filter((anchor) => anchor.rubric_version_id === published?.id)
        .map((anchor) => ({
          score: anchor.score,
          label: anchor.label,
          description: anchor.description,
        })),
    };
  });
  const totalWeight = (aspects ?? []).reduce(
    (total, aspect) => total + Number(aspect.weight),
    0,
  );
  const indicatorsById = new Map(
    (indicators ?? []).map((indicator) => [indicator.id, indicator]),
  );
  const publishedRubricVersionIdSet = new Set(
    (rubricVersions ?? []).map((version) => version.id),
  );
  const mappingsByMaterial = new Map<
    string,
    CompetencyMappingContext["mappings"]
  >();
  for (const mapping of materialIndicatorLinks ?? []) {
    const indicator = indicatorsById.get(mapping.indicator_id);
    if (!indicator) continue;
    const aspectNames = (linksByIndicator.get(indicator.id) ?? [])
      .map((id) => aspectById.get(id)?.name)
      .filter((name): name is string => !!name);
    const mapped = mappingsByMaterial.get(mapping.material_id) ?? [];
    mapped.push({
      code: indicator.code,
      name: indicator.name,
      aspectNames,
      assessmentMethod: mapping.assessment_method,
      guidance: mapping.observation_guidance,
      required: mapping.is_required,
      scope: mapping.assessment_scope,
      rubricAvailable: publishedRubricVersionIdSet.has(
        mapping.competency_indicator_rubric_version_id,
      ),
    });
    mappingsByMaterial.set(mapping.material_id, mapped);
  }
  const mappingContexts: CompetencyMappingContext[] = (materials ?? []).map(
    (material) => ({
      id: material.id,
      code: material.code,
      name: material.name,
      description: material.description,
      kind: material.context_type,
      mappings: (mappingsByMaterial.get(material.id) ?? []).sort((a, b) =>
        a.code.localeCompare(b.code, "en"),
      ),
    }),
  );

  return (
    <main className="users-page competency-framework-page">
      <header className="users-heading">
        <div>
          <p className="login-eyebrow">KERANGKA DAD</p>
          <h1>{framework.name}</h1>
          <p>{framework.description}</p>
        </div>
        <span className="agenda-status next">
          v{frameworkVersion.version} · {frameworkVersion.status} ·{" "}
          {frameworkVersion.is_official ? "Resmi" : "Bukan standar resmi"}
        </span>
      </header>
      <div className="users-notice">
        <strong>Kerangka uji, bukan standar resmi</strong>
        <p>
          Skala 1–5 menggunakan anchor perilaku dan N/O untuk kondisi belum
          teramati. Tidak ada alur persetujuan/finalisasi di aplikasi pada tahap
          ini. Aspek berbobot total {totalWeight.toFixed(2)}%.
        </p>
      </div>
      {(materialsError || materialMappingsError) && (
        <p className="users-error">
          Data belum dapat dibaca. Hubungi Admin sistem bila masalah berulang.
        </p>
      )}
      <section className="event-manage-card">
        <h2>Aspek kompetensi</h2>
        <div className="competency-aspect-grid">
          {(aspects ?? []).map((aspect) => (
            <article className="competency-aspect-card" key={aspect.id}>
              <span>
                {aspect.code} · {Number(aspect.weight).toFixed(0)}%
              </span>
              <h3>{aspect.name}</h3>
              <p>
                {
                  items.filter((item) => item.aspectNames.includes(aspect.name))
                    .length
                }{" "}
                indikator terhubung
              </p>
            </article>
          ))}
        </div>
      </section>
      <CompetencyMaterialMapping
        contexts={mappingContexts}
        indicatorCodes={(indicators ?? []).map((indicator) => indicator.code)}
      />
      <section className="event-manage-card">
        <div className="event-manage-title">
          <div>
            <h2>Bank rubrik indikator</h2>
            <p>
              {items.length} indikator ·{" "}
              {items.reduce((count, item) => count + item.anchors.length, 0)}{" "}
              anchor skor tersimpan.
            </p>
          </div>
        </div>
        <RubricPreview items={items} />
      </section>
    </main>
  );
}
