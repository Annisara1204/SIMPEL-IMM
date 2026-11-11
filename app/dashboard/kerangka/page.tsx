import { redirect } from "next/navigation";
import { RubricPreview, type RubricPreviewItem } from "@/components/rubric-preview";
import { createClient } from "@/lib/supabase/server";

const allowedRoles = ["admin_system", "bidang_kader", "observer", "instruktur"];

function relationRows(value: unknown): Record<string, unknown>[] {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  return values.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null && !Array.isArray(item));
}

export default async function CompetencyFrameworkPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (!profile?.role || !allowedRoles.includes(profile.role)) redirect("/dashboard");

  const { data: framework } = await supabase.from("competency_frameworks").select("id, name, description").eq("code", "DAD_IMM").maybeSingle();
  if (!framework) return <main className="dashboard-main"><section className="event-manage-card"><h1>Kerangka Kompetensi DAD</h1><p>Master framework belum tersedia. Pastikan migration framework, pemetaan materi, dan rubrik trial sudah dijalankan berurutan.</p></section></main>;
  const { data: frameworkVersion } = await supabase.from("competency_framework_versions").select("id, version, status, is_official, source_note").eq("framework_id", framework.id).eq("version", 1).maybeSingle();
  if (!frameworkVersion) return <main className="dashboard-main"><section className="event-manage-card"><h1>Kerangka Kompetensi DAD</h1><p>Versi trial belum tersedia.</p></section></main>;

  const [{ data: aspects }, { data: indicators }, { data: indicatorAspectLinks }, { data: rubrics }, { data: rubricVersions }] = await Promise.all([
    supabase.from("competency_aspects").select("id, code, name, weight, position").eq("framework_version_id", frameworkVersion.id).order("position"),
    supabase.from("competency_indicators").select("id, code, name, description, measurement_objective, evidence_guidance, position").eq("framework_version_id", frameworkVersion.id).order("position"),
    supabase.from("competency_indicator_aspects").select("indicator_id, aspect_id").eq("framework_version_id", frameworkVersion.id),
    supabase.from("competency_indicator_rubrics").select("id, indicator_id, code, title").eq("framework_version_id", frameworkVersion.id),
    supabase.from("competency_indicator_rubric_versions").select("id, rubric_id, version, status").eq("framework_version_id", frameworkVersion.id).eq("status", "published"),
  ]);
  const rubricVersionIds = (rubricVersions ?? []).map((item) => item.id);
  const { data: anchors } = rubricVersionIds.length
    ? await supabase.from("rubric_behavioral_anchors").select("rubric_version_id, score, label, description").in("rubric_version_id", rubricVersionIds).order("score")
    : { data: [] };
  const aspectById = new Map((aspects ?? []).map((aspect) => [aspect.id, aspect]));
  const rubricByIndicator = new Map((rubrics ?? []).map((rubric) => [rubric.indicator_id, rubric]));
  const publishedVersionByRubric = new Map((rubricVersions ?? []).map((version) => [version.rubric_id, version]));
  const linksByIndicator = new Map<string, string[]>();
  for (const link of indicatorAspectLinks ?? []) linksByIndicator.set(link.indicator_id, [...(linksByIndicator.get(link.indicator_id) ?? []), link.aspect_id]);
  const items: RubricPreviewItem[] = (indicators ?? []).map((indicator) => {
    const rubric = rubricByIndicator.get(indicator.id);
    const published = rubric ? publishedVersionByRubric.get(rubric.id) : null;
    return {
      code: indicator.code,
      name: indicator.name,
      description: indicator.description,
      measurement_objective: indicator.measurement_objective,
      evidence_guidance: indicator.evidence_guidance,
      aspectNames: (linksByIndicator.get(indicator.id) ?? []).map((id) => aspectById.get(id)?.name).filter((name): name is string => !!name),
      rubricCode: rubric?.code ?? null,
      rubricStatus: published?.status ?? null,
      anchors: (anchors ?? []).filter((anchor) => anchor.rubric_version_id === published?.id).map((anchor) => ({ score: anchor.score, label: anchor.label, description: anchor.description })),
    };
  });
  const totalWeight = (aspects ?? []).reduce((total, aspect) => total + Number(aspect.weight), 0);
  const { data: materials } = await supabase.from("competency_materials").select("id, code, name, position, competency_material_aspects(aspect_id, competency_aspects(code, name))").eq("framework_version_id", frameworkVersion.id).order("position");

  return <main className="dashboard-main competency-framework-page">
    <header className="users-heading"><div><p className="login-eyebrow">PHASE 3 · RUBRIK TRIAL</p><h1>{framework.name}</h1><p>{framework.description}</p></div><span className="agenda-status next">v{frameworkVersion.version} · {frameworkVersion.status} · {frameworkVersion.is_official ? "Resmi" : "Bukan standar resmi"}</span></header>
    <div className="users-notice"><strong>Kerangka uji, bukan standar resmi</strong><p>Skala 1–5 menggunakan anchor perilaku dan N/O untuk kondisi belum teramati. Tidak ada alur persetujuan/finalisasi di aplikasi pada tahap ini. Aspek berbobot total {totalWeight.toFixed(2)}%.</p></div>
    <section className="event-manage-card"><h2>Aspek kompetensi</h2><div className="competency-aspect-grid">{(aspects ?? []).map((aspect) => <article className="competency-aspect-card" key={aspect.id}><span>{aspect.code} · {Number(aspect.weight).toFixed(0)}%</span><h3>{aspect.name}</h3><p>{items.filter((item) => item.aspectNames.includes(aspect.name)).length} indikator terhubung</p></article>)}</div></section>
    <section className="event-manage-card"><h2>Pemetaan materi Pelatihan</h2><div className="competency-material-grid">{(materials ?? []).map((material) => {
      const aspectNames = relationRows(material.competency_material_aspects)
        .flatMap((link) => relationRows(link.competency_aspects))
        .map((aspect) => aspect.name)
        .filter((name): name is string => typeof name === "string");
      return <article className="competency-aspect-card" key={material.id}><span>{material.code}</span><h3>{material.name}</h3><p>{aspectNames.join(", ")}</p></article>;
    })}</div></section>
    <section className="event-manage-card"><div className="event-manage-title"><div><h2>Bank rubrik indikator</h2><p>{items.length} indikator · {items.reduce((count, item) => count + item.anchors.length, 0)} anchor skor tersimpan.</p></div></div><RubricPreview items={items}/></section>
  </main>;
}
