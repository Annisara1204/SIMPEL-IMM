"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { instructorDuties, instructorPositions, type InstructorPosition } from "@/lib/instructor-roles";

async function staffClient(roles: string[]) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (!profile || !roles.includes(profile.role ?? "")) throw new Error("Akses ditolak.");
  return { supabase, userId, role: profile.role };
}

function readScoreDescriptors(formData: FormData) {
  const entries = [1, 2, 3, 4, 5].map((score) => [String(score), String(formData.get(`descriptor${score}`) ?? "").trim()] as const);
  if (entries.some(([, description]) => description.length < 3 || description.length > 500)) return null;
  return Object.fromEntries(entries);
}

function evenWeight(total: number, count: number, index: number) {
  const regular = Math.round((total / count) * 100) / 100;
  return index === count - 1 ? Math.round((total - regular * (count - 1)) * 100) / 100 : regular;
}

function roundWeight(value: number) { return Math.round(value * 100) / 100; }

export async function createRubricVersion(formData: FormData) {
  const { supabase, userId } = await staffClient(["admin_system"]);
  const eventId = String(formData.get("eventId") ?? "");
  const stage = String(formData.get("stage") ?? "");
  const assessmentTypeId = String(formData.get("assessmentTypeId") ?? "");
  const materialId = String(formData.get("materialId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(eventId) || !["screening", "training", "follow_up"].includes(stage) || !/^[0-9a-f-]{36}$/i.test(assessmentTypeId) || (stage === "training" && !/^[0-9a-f-]{36}$/i.test(materialId)) || (stage !== "training" && materialId)) throw new Error("Kegiatan, tahap, materi, atau jenis penilaian tidak valid.");
  const { data: type } = await supabase.from("rubric_assessment_types").select("id").eq("id", assessmentTypeId).eq("event_id", eventId).eq("stage", stage).maybeSingle();
  if (!type) throw new Error("Jenis penilaian tidak ditemukan pada tahap ini.");
  if (stage === "training") {
    const { data: material } = await supabase.from("rubric_materials").select("id").eq("id", materialId).eq("event_id", eventId).maybeSingle();
    if (!material) throw new Error("Materi tidak ditemukan pada kegiatan ini.");
  }
  let versionQuery = supabase.from("rubric_versions").select("id, version, status, competency_framework_version_id, rubric_aspects(id, competency_aspect_id, name, weight, position, rubric_indicator_aspects(weight, rubric_indicators(id, competency_indicator_id, competency_indicator_rubric_version_id, name, target, position, score_descriptors)))").eq("event_id", eventId).eq("stage", stage).eq("assessment_type_id", assessmentTypeId);
  versionQuery = stage === "training" ? versionQuery.eq("material_id", materialId) : versionQuery.is("material_id", null);
  const { data: versions, error: readError } = await versionQuery.order("version", { ascending: false }).limit(1);
  if (readError) throw new Error("Versi rubrik belum dapat dibaca. Jalankan migrasi Tahap 4.");
  if (versions?.[0]?.status === "draft") throw new Error("Selesaikan atau hapus draf yang sedang berjalan terlebih dahulu.");
  let sourceAspects: any[] = versions?.[0]?.rubric_aspects ?? [];
  let frameworkVersionId: string | null = versions?.[0]?.competency_framework_version_id ?? null;
  if (!versions?.[0] && stage === "training") {
    const { data: material } = await supabase.from("rubric_materials").select("competency_material_id").eq("id", materialId).maybeSingle();
    if (material?.competency_material_id) {
      const [{ data: aspectLinks, error: aspectLinkError }, { data: indicatorLinks, error: indicatorLinkError }] = await Promise.all([
        supabase.from("competency_material_aspects").select("aspect_id,position,competency_aspects(id,framework_version_id,code,name,weight,position)").eq("material_id", material.competency_material_id).order("position"),
        supabase.from("competency_material_indicators").select("indicator_id,aspect_id,position,competency_indicator_rubric_version_id,competency_indicators(id,code,name,position,description,observable_behaviors)").eq("material_id", material.competency_material_id).order("position"),
      ]);
      if (aspectLinkError || indicatorLinkError || !aspectLinks?.length || !indicatorLinks?.length) throw new Error("Mapping materi belum lengkap sehingga rubrik draf tidak dapat dibuat.");
      const firstMasterAspect = Array.isArray(aspectLinks[0].competency_aspects) ? aspectLinks[0].competency_aspects[0] : aspectLinks[0].competency_aspects;
      frameworkVersionId = firstMasterAspect.framework_version_id;
      const rubricVersionIds = [...new Set(indicatorLinks.map((link) => link.competency_indicator_rubric_version_id).filter(Boolean))];
      const { data: anchorVersions, error: anchorError } = await supabase.from("competency_indicator_rubric_versions").select("id,indicator_id,rubric_behavioral_anchors(score,description)").in("id", rubricVersionIds).eq("status", "published");
      if (anchorError || !anchorVersions?.length) throw new Error("Rubrik master published untuk materi ini tidak ditemukan.");
      const anchors = new Map(anchorVersions.map((item) => [item.id, Object.fromEntries(((item.rubric_behavioral_anchors ?? []) as unknown as { score: number; description: string }[]).map((anchor) => [String(anchor.score), anchor.description]))]));
      const aspectWeightTotal = aspectLinks.reduce((sum, link) => { const aspect = Array.isArray(link.competency_aspects) ? link.competency_aspects[0] : link.competency_aspects; return sum + Number(aspect.weight); }, 0);
      let assignedAspectWeight=0;
      sourceAspects = aspectLinks.map((link,aspectIndex) => {
        const aspect = (Array.isArray(link.competency_aspects) ? link.competency_aspects[0] : link.competency_aspects) as any;
        const mapped = indicatorLinks.filter((item) => item.aspect_id === link.aspect_id);
        const weight=aspectIndex===aspectLinks.length-1?roundWeight(100-assignedAspectWeight):roundWeight(Number(aspect.weight)*100/aspectWeightTotal);
        assignedAspectWeight+=weight;
        return { id: aspect.id, competency_aspect_id: aspect.id, name: aspect.name, weight, position: link.position,
          rubric_indicator_aspects: mapped.map((item, index) => {
            const indicator = (Array.isArray(item.competency_indicators) ? item.competency_indicators[0] : item.competency_indicators) as any;
            return { weight: evenWeight(100,mapped.length,index), rubric_indicators: { id: indicator.id, competency_indicator_id: indicator.id,
              competency_indicator_rubric_version_id: item.competency_indicator_rubric_version_id, name: `${indicator.code} · ${indicator.name}`,
              target: indicator.observable_behaviors || indicator.description, position: index + 1,
              score_descriptors: anchors.get(item.competency_indicator_rubric_version_id) ?? {} } };
          }) };
      });
    }
  }
  const { data: created, error } = await supabase.from("rubric_versions").insert({ event_id: eventId, stage, material_id: stage === "training" ? materialId : null, assessment_type_id: assessmentTypeId, version: (versions?.[0]?.version ?? 0) + 1, status: "draft", created_by: userId, competency_framework_version_id: frameworkVersionId }).select("id").single();
  if (error) throw new Error("Versi baru gagal dibuat.");
  const aspectIds = new Map<string, string>();
  for (const aspect of sourceAspects) {
    const { data: copiedAspect, error: aspectError } = await supabase.from("rubric_aspects").insert({ rubric_version_id: created.id, competency_aspect_id: aspect.competency_aspect_id, name: aspect.name, weight: aspect.weight, position: aspect.position }).select("id").single();
    if (aspectError) { await supabase.from("rubric_versions").delete().eq("id", created.id); throw new Error("Aspek versi sebelumnya gagal disalin ke draf baru."); }
    aspectIds.set(aspect.id, copiedAspect.id);
  }
  const copiedIndicators = new Map<string, string>();
  for (const aspect of sourceAspects) {
    for (const mapping of aspect.rubric_indicator_aspects ?? []) {
      const original = Array.isArray(mapping.rubric_indicators) ? mapping.rubric_indicators[0] : mapping.rubric_indicators;
      if (!original || copiedIndicators.has(original.id)) continue;
      const { data: copied, error: indicatorError } = await supabase.from("rubric_indicators").insert({ aspect_id: aspectIds.get(aspect.id)!, competency_indicator_id: original.competency_indicator_id, competency_indicator_rubric_version_id: original.competency_indicator_rubric_version_id, name: original.name, weight: mapping.weight, target: original.target, position: original.position, score_descriptors: original.score_descriptors }).select("id").single();
      if (indicatorError || !copied) { await supabase.from("rubric_versions").delete().eq("id", created.id); throw new Error("Indikator versi sebelumnya gagal disalin ke draf baru."); }
      copiedIndicators.set(original.id, copied.id);
    }
  }
  for (const aspect of sourceAspects) {
    const rows = (aspect.rubric_indicator_aspects ?? []).flatMap((mapping: any) => {
      const originalId = (Array.isArray(mapping.rubric_indicators) ? mapping.rubric_indicators[0] : mapping.rubric_indicators)?.id;
      const indicatorId = originalId ? copiedIndicators.get(originalId) : null;
      const targetAspectId = aspectIds.get(aspect.id);
      return indicatorId && targetAspectId ? [{ indicator_id: indicatorId, aspect_id: targetAspectId, weight: mapping.weight }] : [];
    });
    if (rows.length) {
      const { error: mappingsError } = await supabase.from("rubric_indicator_aspects").insert(rows);
      if (mappingsError) { await supabase.from("rubric_versions").delete().eq("id", created.id); throw new Error("Pemetaan indikator-aspek gagal disalin ke draf baru."); }
    }
  }
  revalidatePath("/dashboard/penilaian");
}

export async function createTrainingMaterial(formData: FormData) {
  const { supabase } = await staffClient(["admin_system"]);
  const eventId = String(formData.get("eventId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const competencyMaterialId = String(formData.get("competencyMaterialId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(eventId) || name.length < 2 || name.length > 120) throw new Error("Nama materi tidak valid.");
  if (competencyMaterialId && !/^[0-9a-f-]{36}$/i.test(competencyMaterialId)) throw new Error("Konteks kerangka tidak valid.");
  if (competencyMaterialId) {
    const { data: frameworkMaterial } = await supabase.from("competency_materials").select("id").eq("id", competencyMaterialId).maybeSingle();
    if (!frameworkMaterial) throw new Error("Konteks materi DAD tidak ditemukan.");
  }
  const { data: previous } = await supabase.from("rubric_materials").select("position").eq("event_id", eventId).order("position", { ascending: false }).limit(1);
  const { error } = await supabase.from("rubric_materials").insert({ event_id: eventId, name, competency_material_id: competencyMaterialId || null, position: (previous?.[0]?.position ?? -1) + 1 });
  if (error) throw new Error("Materi gagal ditambahkan. Pastikan namanya belum digunakan pada kegiatan ini.");
  revalidatePath("/dashboard/penilaian");
  revalidatePath("/dashboard/observasi");
}

export async function setTrainingMaterialFramework(formData: FormData) {
  const { supabase } = await staffClient(["admin_system"]);
  const materialId = String(formData.get("materialId") ?? "");
  const competencyMaterialId = String(formData.get("competencyMaterialId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(materialId) || !/^[0-9a-f-]{36}$/i.test(competencyMaterialId)) throw new Error("Materi atau konteks kerangka tidak valid.");
  const { data: source } = await supabase.from("competency_materials").select("id").eq("id", competencyMaterialId).maybeSingle();
  const { data: material } = await supabase.from("rubric_materials").select("id,event_id").eq("id", materialId).maybeSingle();
  if (!source || !material) throw new Error("Materi kegiatan atau konteks DAD tidak ditemukan.");
  const { data: usedVersions, error: usedError } = await supabase.from("rubric_versions").select("id").eq("material_id", materialId).neq("status", "draft").limit(1);
  if (usedError) throw new Error("Status rubrik materi belum dapat diperiksa.");
  if (usedVersions?.length) throw new Error("Materi ini sudah memiliki rubrik aktif/arsip. Buat materi baru agar riwayat mapping tidak berubah.");
  const { error } = await supabase.from("rubric_materials").update({ competency_material_id: competencyMaterialId }).eq("id", materialId);
  if (error) throw new Error("Konteks framework gagal dihubungkan. Pastikan migration Phase 4/5 tersedia.");
  revalidatePath("/dashboard/penilaian"); revalidatePath("/dashboard/observasi");
}

export async function applyFrameworkRubricSelection(formData: FormData) {
  const { supabase } = await staffClient(["admin_system"]);
  const versionId = String(formData.get("versionId") ?? "");
  const selectedAspectIds = [...new Set(formData.getAll("aspectIds").map(String))];
  const selectedPairs = [...new Set(formData.getAll("indicatorPairs").map(String))].map((pair)=>{
    const [aspectId,indicatorId]=pair.split(":");
    return {aspectId,indicatorId};
  });
  const selectedIndicatorIds = [...new Set(selectedPairs.map((pair)=>pair.indicatorId))];
  if (!/^[0-9a-f-]{36}$/i.test(versionId) || [...selectedAspectIds, ...selectedIndicatorIds, ...selectedPairs.map((pair)=>pair.aspectId)].some((id) => !/^[0-9a-f-]{36}$/i.test(id))) throw new Error("Pilihan aspek atau indikator tidak valid.");
  if (!selectedAspectIds.length || !selectedPairs.length) throw new Error("Pilih sedikitnya satu aspek dan indikator di dalam aspek tersebut.");
  const { data: version } = await supabase.from("rubric_versions").select("id,event_id,stage,material_id,status,competency_framework_version_id").eq("id", versionId).eq("status", "draft").maybeSingle();
  if (!version) throw new Error("Pilihan hanya dapat diterapkan pada draf rubrik.");
  if (version.stage !== "training" || !version.material_id) throw new Error("Pemilihan master DAD ini hanya tersedia untuk rubrik materi pelatihan.");
  const { data: sourceMaterial } = await supabase.from("rubric_materials").select("competency_material_id").eq("id", version.material_id).maybeSingle();
  const { data: aspects, error: aspectError } = selectedAspectIds.length
    ? await supabase.from("competency_aspects").select("id,framework_version_id,code,name,weight,position").in("id", selectedAspectIds)
    : { data: [], error: null };
  const { data: indicators, error: indicatorError } = selectedIndicatorIds.length
    ? await supabase.from("competency_indicators").select("id,framework_version_id,code,name,description,observable_behaviors,position").in("id", selectedIndicatorIds)
    : { data: [], error: null };
  if (aspectError || indicatorError || aspects?.length !== selectedAspectIds.length || indicators?.length !== selectedIndicatorIds.length) throw new Error("Data master aspek/indikator belum dapat dibaca.");
  const frameworkVersionId = aspects?.[0]?.framework_version_id ?? indicators?.[0]?.framework_version_id;
  if (!frameworkVersionId || aspects?.some((item) => item.framework_version_id !== frameworkVersionId) || indicators?.some((item) => item.framework_version_id !== frameworkVersionId)) throw new Error("Aspek dan indikator harus berasal dari versi framework yang sama.");
  if (version.competency_framework_version_id && version.competency_framework_version_id !== frameworkVersionId) throw new Error("Draf ini sudah terikat ke versi framework lain.");
  const [{ data: aspectLinks, error: relationError }, { data: currentAspects, error: currentAspectError }] = await Promise.all([
    selectedAspectIds.length && selectedIndicatorIds.length
      ? supabase.from("competency_indicator_aspects").select("aspect_id,indicator_id").eq("framework_version_id", frameworkVersionId).in("aspect_id", selectedAspectIds).in("indicator_id", selectedIndicatorIds)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("rubric_aspects").select("id,competency_aspect_id,name,weight,position").eq("rubric_version_id", versionId),
  ]);
  if (relationError || currentAspectError) throw new Error("Relasi master atau aspek draf gagal diperiksa.");
  const validPairs = new Set((aspectLinks ?? []).map((link) => `${link.aspect_id}:${link.indicator_id}`));
  if (selectedAspectIds.some((aspectId) => !selectedPairs.some((pair) => pair.aspectId===aspectId))) throw new Error("Setiap aspek yang dicentang perlu memiliki sedikitnya satu indikator terpilih. Pilih indikatornya atau kosongkan aspek tersebut.");
  if (selectedPairs.some((pair) => !selectedAspectIds.includes(pair.aspectId) || !validPairs.has(`${pair.aspectId}:${pair.indicatorId}`))) throw new Error("Indikator yang dipilih tidak terhubung dengan aspek tersebut di master Kerangka DAD.");

  let contextMappings: { aspect_id:string; indicator_id:string; competency_indicator_rubric_version_id:string }[] = [];
  if (sourceMaterial?.competency_material_id) {
    const { data, error } = await supabase.from("competency_material_indicators").select("aspect_id,indicator_id,competency_indicator_rubric_version_id").eq("material_id", sourceMaterial.competency_material_id).eq("active", true).in("aspect_id", selectedAspectIds).in("indicator_id", selectedIndicatorIds);
    if (error) throw new Error("Mapping Phase 4 materi ini belum dapat dibaca.");
    contextMappings = data ?? [];
    const contextPairs = new Set(contextMappings.map((item)=>`${item.aspect_id}:${item.indicator_id}`));
    if (selectedPairs.some((pair)=>!contextPairs.has(`${pair.aspectId}:${pair.indicatorId}`))) throw new Error("Pilihan harus mengikuti indikator yang dipetakan untuk konteks materi ini. Periksa pilihan/aspek yang tersedia.");
  } else {
    const { data: published, error } = await supabase.from("competency_indicator_rubric_versions").select("id,indicator_id").eq("framework_version_id", frameworkVersionId).eq("status", "published").in("indicator_id", selectedIndicatorIds);
    if (error) throw new Error("Versi rubrik master belum dapat dibaca.");
    contextMappings = (aspectLinks ?? []).flatMap((link)=>{
      const rubric = published?.find((item)=>item.indicator_id===link.indicator_id);
      return rubric ? [{aspect_id:link.aspect_id,indicator_id:link.indicator_id,competency_indicator_rubric_version_id:rubric.id}] : [];
    });
  }
  const chosenPairs = selectedPairs.map(({aspectId,indicatorId})=>({aspectId,indicatorId,sourceVersionId:contextMappings.find((item)=>item.aspect_id===aspectId && item.indicator_id===indicatorId)?.competency_indicator_rubric_version_id}));
  if (chosenPairs.some((pair)=>!pair.sourceVersionId)) throw new Error("Satu atau lebih indikator belum memiliki rubrik master published pada konteks ini.");
  const sourceVersionIds = [...new Set(chosenPairs.map((item)=>item.sourceVersionId!))];
  const { data: anchorVersions, error: anchorsError } = await supabase.from("competency_indicator_rubric_versions").select("id,indicator_id,rubric_behavioral_anchors(score,description)").eq("status", "published").in("id", sourceVersionIds);
  if (anchorsError || !anchorVersions?.length) throw new Error("Anchor rubrik master tidak dapat dibaca.");
  const descriptorByVersion = new Map(anchorVersions.map((item)=>[item.id,Object.fromEntries(((item.rubric_behavioral_anchors ?? []) as unknown as {score:number;description:string}[]).map((anchor)=>[String(anchor.score),anchor.description]))]));
  if (sourceVersionIds.some((id)=>[1,2,3,4,5].some((score)=>String(descriptorByVersion.get(id)?.[String(score)] ?? "").trim().length<3))) throw new Error("Semua indikator harus memiliki lima anchor perilaku.");

  const existingIndicatorRows = await supabase.from("rubric_aspects").select("id").eq("rubric_version_id",versionId);
  const aspectRowIds = (existingIndicatorRows.data ?? []).map((item)=>item.id);
  const { data: existingIndicators, error: existingIndicatorError } = aspectRowIds.length
    ? await supabase.from("rubric_indicators").select("id,competency_indicator_id").in("aspect_id",aspectRowIds)
    : { data: [], error: null };
  if (existingIndicatorError) throw new Error("Indikator draf gagal diperiksa.");
  const manualAspectsBefore=(currentAspects ?? []).filter((item)=>!item.competency_aspect_id);
  const manualWeightTotal=manualAspectsBefore.reduce((sum,item)=>sum+Number(item.weight),0);
  if (manualWeightTotal >= 100 && selectedAspectIds.length) throw new Error("Bobot aspek manual sudah mencapai 100%. Kurangi bobot aspek manual sebelum menambahkan aspek framework.");
  const oldMasterIds=(existingIndicators ?? []).filter((item)=>item.competency_indicator_id).map((item)=>item.id);
  if (oldMasterIds.length) {
    const { error } = await supabase.from("rubric_indicators").delete().in("id",oldMasterIds);
    if (error) throw new Error("Pilihan master lama gagal diganti. Pastikan draf ini belum pernah dipakai penilaian.");
  }
  for (const current of currentAspects ?? []) {
    if (!current.competency_aspect_id) continue;
    const { data: remaining } = await supabase.from("rubric_indicators").select("id").eq("aspect_id",current.id).limit(1);
    if (remaining?.length) await supabase.from("rubric_aspects").update({competency_aspect_id:null}).eq("id",current.id);
    else await supabase.from("rubric_aspects").delete().eq("id",current.id);
  }

  const {data: refreshedAspects,error: refreshedAspectError}=await supabase.from("rubric_aspects").select("id,competency_aspect_id,name,weight,position").eq("rubric_version_id",versionId);
  if(refreshedAspectError) throw new Error("Aspek draf gagal dibaca ulang.");
  const manualAspects=(refreshedAspects ?? []).filter((item)=>!item.competency_aspect_id);
  const orderedSelectedAspects=[...(aspects ?? [])].sort((a,b)=>a.position-b.position);
  const masterWeightTotal=orderedSelectedAspects.reduce((sum,item)=>sum+Number(item.weight),0);
  const masterAvailableWeight=100-manualWeightTotal;
  let assignedMasterWeight=0;
  const aspectRows=new Map<string,string>();
  for (const [aspectIndex,aspect] of orderedSelectedAspects.entries()) {
    const existing=(refreshedAspects ?? []).find((item)=>item.competency_aspect_id===aspect.id);
    let rowId=existing?.id;
    const weight=aspectIndex===orderedSelectedAspects.length-1?roundWeight(masterAvailableWeight-assignedMasterWeight):roundWeight(masterAvailableWeight*Number(aspect.weight)/masterWeightTotal);
    assignedMasterWeight+=weight;
    if (!rowId) {
      const named=(manualAspects).find((item)=>item.name===aspect.name);
      if (named) {
        rowId=named.id;
        const {error}=await supabase.from("rubric_aspects").update({competency_aspect_id:aspect.id,weight}).eq("id",rowId);
        if(error) throw new Error("Aspek draf gagal ditautkan ke framework.");
      } else {
        const {data,error}=await supabase.from("rubric_aspects").insert({rubric_version_id:versionId,competency_aspect_id:aspect.id,name:aspect.name,weight,position:aspect.position}).select("id").single();
        if(error||!data) throw new Error("Aspek terpilih gagal ditambahkan ke draf.");
        rowId=data.id;
      }
    } else {
      const {error}=await supabase.from("rubric_aspects").update({weight}).eq("id",rowId);
      if(error) throw new Error("Bobot aspek framework gagal diperbarui.");
    }
    aspectRows.set(aspect.id,rowId!);
  }
  const allMasterIndicatorIds=[...new Set(chosenPairs.map((item)=>item.indicatorId))];
  const {data:masterIndicators,error:masterIndicatorError}=allMasterIndicatorIds.length
    ? await supabase.from("competency_indicators").select("id,code,name,description,observable_behaviors,position").in("id",allMasterIndicatorIds)
    : {data:[],error:null};
  if(masterIndicatorError||masterIndicators?.length!==allMasterIndicatorIds.length) throw new Error("Detail indikator master gagal dibaca.");
  const createdIndicators=new Map<string,string>();
  for(const indicator of masterIndicators ?? []) {
    const memberships=chosenPairs.filter((pair)=>pair.indicatorId===indicator.id);
    const primaryAspect=aspectRows.get(memberships[0].aspectId);
    const primaryCount=memberships.filter((pair)=>pair.aspectId===memberships[0].aspectId).length;
    const descriptors=descriptorByVersion.get(memberships[0].sourceVersionId!)!;
    const {data,error}=await supabase.from("rubric_indicators").insert({aspect_id:primaryAspect,competency_indicator_id:indicator.id,competency_indicator_rubric_version_id:memberships[0].sourceVersionId,name:`${indicator.code} · ${indicator.name}`,weight:100/primaryCount,target:indicator.observable_behaviors || indicator.description,position:indicator.position,score_descriptors:descriptors}).select("id").single();
    if(error||!data) throw new Error(`Indikator ${indicator.code} gagal disalin ke draf.`);
    createdIndicators.set(indicator.id,data.id);
  }
  for(const aspectId of selectedAspectIds) {
    const inAspect=chosenPairs.filter((pair)=>pair.aspectId===aspectId);
    const rows=inAspect.map((pair,index)=>({indicator_id:createdIndicators.get(pair.indicatorId)!,aspect_id:aspectRows.get(aspectId)!,weight:evenWeight(100,inAspect.length,index)}));
    const {error}=await supabase.from("rubric_indicator_aspects").insert(rows);
    if(error) throw new Error("Pemetaan indikator ke aspek draf gagal disimpan.");
  }
  if(!version.competency_framework_version_id) {
    const {error}=await supabase.from("rubric_versions").update({competency_framework_version_id:frameworkVersionId}).eq("id",versionId);
    if(error) throw new Error("Referensi versi framework pada draf gagal disimpan.");
  }
  for(const aspectId of selectedAspectIds) {
    const localAspectId=aspectRows.get(aspectId)!;
    const {data:links}=await supabase.from("rubric_indicator_aspects").select("id").eq("aspect_id",localAspectId).order("id");
    if(links?.length) for(const [index,link] of links.entries()) await supabase.from("rubric_indicator_aspects").update({weight:evenWeight(100,links.length,index)}).eq("id",link.id);
  }
  revalidatePath("/dashboard/penilaian");
}

export async function createAssessmentType(formData: FormData) {
  const { supabase } = await staffClient(["admin_system"]);
  const eventId = String(formData.get("eventId") ?? "");
  const stage = String(formData.get("stage") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(eventId) || !["screening", "training", "follow_up"].includes(stage) || name.length < 2 || name.length > 80) throw new Error("Nama jenis penilaian atau tahap tidak valid.");
  const { data: previous } = await supabase.from("rubric_assessment_types").select("position").eq("event_id", eventId).eq("stage", stage).order("position", { ascending: false }).limit(1);
  const { error } = await supabase.from("rubric_assessment_types").insert({ event_id: eventId, stage, name, position: (previous?.[0]?.position ?? -1) + 1 });
  if (error) throw new Error("Jenis penilaian gagal ditambahkan. Periksa apakah nama sudah ada.");
  revalidatePath("/dashboard/penilaian");
}

export async function addAspect(formData: FormData) {
  const { supabase } = await staffClient(["admin_system"]);
  const versionId = String(formData.get("versionId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const weight = Number(formData.get("weight"));
  if (!/^[0-9a-f-]{36}$/i.test(versionId) || name.length < 2 || name.length > 120 || !Number.isFinite(weight) || weight <= 0 || weight > 100) throw new Error("Nama atau bobot aspek tidak valid.");
  const { data: aspects } = await supabase.from("rubric_aspects").select("position").eq("rubric_version_id", versionId).order("position", { ascending: false }).limit(1);
  const { error } = await supabase.from("rubric_aspects").insert({ rubric_version_id: versionId, name, weight, position: (aspects?.[0]?.position ?? -1) + 1 });
  if (error) throw new Error("Aspek gagal ditambahkan. Pastikan versi masih berupa draf dan nama tidak duplikat.");
  revalidatePath("/dashboard/penilaian");
}

export async function editAspect(formData: FormData) {
  const { supabase } = await staffClient(["admin_system"]);
  const id = String(formData.get("aspectId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const weight = Number(formData.get("weight"));
  if (!/^[0-9a-f-]{36}$/i.test(id) || name.length < 2 || name.length > 120 || !Number.isFinite(weight) || weight <= 0 || weight > 100) throw new Error("Nama atau bobot aspek tidak valid.");
  const { error } = await supabase.from("rubric_aspects").update({ name, weight }).eq("id", id);
  if (error) throw new Error("Perubahan aspek gagal disimpan. Versi harus masih berupa draf.");
  revalidatePath("/dashboard/penilaian");
}

export async function addIndicator(formData: FormData) {
  const { supabase } = await staffClient(["admin_system"]);
  const aspectId = String(formData.get("aspectId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const target = String(formData.get("target") ?? "").trim();
  const weight = Number(formData.get("weight"));
  const scoreDescriptors = readScoreDescriptors(formData);
  if (!/^[0-9a-f-]{36}$/i.test(aspectId) || name.length < 2 || name.length > 200 || target.length > 300 || !Number.isFinite(weight) || weight <= 0 || weight > 100 || !scoreDescriptors) throw new Error("Isi nama, bobot, target, dan uraian perilaku skor 1–5 dengan benar.");
  const { data: indicators } = await supabase.from("rubric_indicators").select("position").eq("aspect_id", aspectId).order("position", { ascending: false }).limit(1);
  const { data: indicator, error } = await supabase.from("rubric_indicators").insert({ aspect_id: aspectId, name, target: target || null, weight, position: (indicators?.[0]?.position ?? -1) + 1, score_descriptors: scoreDescriptors }).select("id").single();
  if (error || !indicator) throw new Error("Indikator gagal ditambahkan. Pastikan versinya masih draf dan nama tidak duplikat.");
  const { error: mappingError } = await supabase.from("rubric_indicator_aspects").insert({ indicator_id: indicator.id, aspect_id: aspectId, weight });
  if (mappingError) { await supabase.from("rubric_indicators").delete().eq("id", indicator.id); throw new Error("Pemetaan indikator ke aspek gagal disimpan."); }
  revalidatePath("/dashboard/penilaian");
}

export async function editIndicator(formData: FormData) {
  const { supabase } = await staffClient(["admin_system"]);
  const id = String(formData.get("indicatorId") ?? "");
  const mappingId = String(formData.get("mappingId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const target = String(formData.get("target") ?? "").trim();
  const weight = Number(formData.get("weight"));
  const scoreDescriptors = readScoreDescriptors(formData);
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f-]{36}$/i.test(mappingId) || name.length < 2 || name.length > 200 || target.length > 300 || !Number.isFinite(weight) || weight <= 0 || weight > 100 || !scoreDescriptors) throw new Error("Periksa nama, target, bobot pemetaan, dan uraian skor 1–5.");
  const { error } = await supabase.from("rubric_indicators").update({ name, target: target || null, score_descriptors: scoreDescriptors }).eq("id", id);
  const { error: mappingError } = await supabase.from("rubric_indicator_aspects").update({ weight }).eq("id", mappingId).eq("indicator_id", id);
  if (error || mappingError) throw new Error("Perubahan indikator gagal disimpan. Versi harus masih berupa draf.");
  revalidatePath("/dashboard/penilaian");
}

export async function linkIndicatorToAspect(formData: FormData) {
  const { supabase } = await staffClient(["admin_system"]);
  const indicatorId = String(formData.get("indicatorId") ?? "");
  const aspectId = String(formData.get("aspectId") ?? "");
  const weight = Number(formData.get("weight"));
  if (!/^[0-9a-f-]{36}$/i.test(indicatorId) || !/^[0-9a-f-]{36}$/i.test(aspectId) || !Number.isFinite(weight) || weight <= 0 || weight > 100) throw new Error("Aspek atau bobot pemetaan tidak valid.");
  const { error } = await supabase.from("rubric_indicator_aspects").insert({ indicator_id: indicatorId, aspect_id: aspectId, weight });
  if (error) throw new Error("Pemetaan gagal. Pastikan indikator dan aspek berada pada versi draf yang sama dan belum dipetakan.");
  revalidatePath("/dashboard/penilaian");
}

export async function unlinkIndicatorFromAspect(formData: FormData) {
  const { supabase } = await staffClient(["admin_system"]);
  const mappingId = String(formData.get("mappingId") ?? "");
  const indicatorId = String(formData.get("indicatorId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(mappingId) || !/^[0-9a-f-]{36}$/i.test(indicatorId)) throw new Error("Pemetaan indikator tidak valid.");
  const { data: mappings, error: readError } = await supabase.from("rubric_indicator_aspects").select("id").eq("indicator_id", indicatorId);
  if (readError || !mappings || mappings.length <= 1 || !mappings.some((mapping) => mapping.id === mappingId)) throw new Error("Setiap indikator harus tetap terhubung ke sedikitnya satu aspek.");
  const { error } = await supabase.from("rubric_indicator_aspects").delete().eq("id", mappingId).eq("indicator_id", indicatorId);
  if (error) throw new Error("Pemetaan indikator gagal dilepas. Pastikan rubrik masih berupa draf.");
  revalidatePath("/dashboard/penilaian");
}

export async function removeDraftIndicatorMapping(formData: FormData) {
  const { supabase } = await staffClient(["admin_system"]);
  const mappingId=String(formData.get("mappingId") ?? "");
  const indicatorId=String(formData.get("indicatorId") ?? "");
  if(!/^[0-9a-f-]{36}$/i.test(mappingId)||!/^[0-9a-f-]{36}$/i.test(indicatorId)) throw new Error("Pemetaan indikator tidak valid.");
  const {data:mapping}=await supabase.from("rubric_indicator_aspects").select("id,aspect_id").eq("id",mappingId).eq("indicator_id",indicatorId).maybeSingle();
  const {data:indicator}=await supabase.from("rubric_indicators").select("id,aspect_id").eq("id",indicatorId).maybeSingle();
  const {data:aspect}=mapping?await supabase.from("rubric_aspects").select("id,rubric_version_id").eq("id",mapping.aspect_id).maybeSingle():{data:null};
  if(!mapping||!indicator||!aspect||aspect.rubric_version_id===null) throw new Error("Indikator tidak ditemukan pada rubrik.");
  const {data:version}=await supabase.from("rubric_versions").select("id,status").eq("id",aspect.rubric_version_id).eq("status","draft").maybeSingle();
  if(!version) throw new Error("Indikator hanya dapat dihapus dari versi draf.");
  const {error}=await supabase.from("rubric_indicator_aspects").delete().eq("id",mappingId);
  if(error) throw new Error("Indikator gagal dilepas dari aspek.");
  const {data:remaining}=await supabase.from("rubric_indicator_aspects").select("id").eq("indicator_id",indicatorId).limit(1);
  if(!remaining?.length) {
    const {error:deleteError}=await supabase.from("rubric_indicators").delete().eq("id",indicatorId);
    if(deleteError) throw new Error("Indikator tidak dapat dihapus karena masih dipakai data lain.");
  }
  revalidatePath("/dashboard/penilaian");
}

export async function removeDraftAspect(formData: FormData) {
  const { supabase } = await staffClient(["admin_system"]);
  const aspectId=String(formData.get("aspectId") ?? "");
  if(!/^[0-9a-f-]{36}$/i.test(aspectId)) throw new Error("Aspek tidak valid.");
  const {data:aspect}=await supabase.from("rubric_aspects").select("id,rubric_version_id").eq("id",aspectId).maybeSingle();
  const {data:version}=aspect?await supabase.from("rubric_versions").select("id,status").eq("id",aspect.rubric_version_id).eq("status","draft").maybeSingle():{data:null};
  if(!aspect||!version) throw new Error("Aspek hanya dapat dihapus dari versi draf.");
  const {data:indicators,error:readError}=await supabase.from("rubric_indicators").select("id").eq("aspect_id",aspectId);
  if(readError) throw new Error("Indikator pada aspek gagal diperiksa.");
  for(const indicator of indicators ?? []) {
    const {data:otherLinks}=await supabase.from("rubric_indicator_aspects").select("aspect_id,weight").eq("indicator_id",indicator.id).neq("aspect_id",aspectId).limit(1);
    if(otherLinks?.length) {
      const {error}=await supabase.from("rubric_indicators").update({aspect_id:otherLinks[0].aspect_id,weight:otherLinks[0].weight}).eq("id",indicator.id);
      if(error) throw new Error("Indikator multi-aspek gagal dipindahkan sebelum aspek dihapus.");
    } else {
      const {error}=await supabase.from("rubric_indicators").delete().eq("id",indicator.id);
      if(error) throw new Error("Indikator masih digunakan dan tidak dapat dihapus.");
    }
  }
  const {error}=await supabase.from("rubric_aspects").delete().eq("id",aspectId);
  if(error) throw new Error("Aspek gagal dihapus dari draf.");
  revalidatePath("/dashboard/penilaian");
}

export async function assignObserver(formData: FormData) {
  const { supabase, userId } = await staffClient(["admin_system", "bidang_kader"]);
  const eventId = String(formData.get("eventId") ?? "");
  const observerId = String(formData.get("observerId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(eventId) || !/^[0-9a-f-]{36}$/i.test(observerId)) throw new Error("Kegiatan atau akun Observer tidak valid.");
  const { data: observer } = await supabase.from("profiles").select("id").eq("id", observerId).eq("role", "observer").maybeSingle();
  if (!observer) throw new Error("Pilih akun yang memiliki role Observer.");
  const { data: existingAssignment, error: existingError } = await supabase.from("observer_assignments").select("id").eq("event_id", eventId).eq("observer_id", observerId).maybeSingle();
  if (existingError) redirect(`/dashboard/penilaian?eventId=${encodeURIComponent(eventId)}&assignment=error`);
  if (existingAssignment) redirect(`/dashboard/penilaian?eventId=${encodeURIComponent(eventId)}&assignment=already`);
  const { error } = await supabase.from("observer_assignments").insert({ event_id: eventId, observer_id: observerId, assigned_by: userId });
  if (error?.code === "23505") redirect(`/dashboard/penilaian?eventId=${encodeURIComponent(eventId)}&assignment=already`);
  if (error) redirect(`/dashboard/penilaian?eventId=${encodeURIComponent(eventId)}&assignment=error`);
  revalidatePath("/dashboard/penilaian");
  revalidatePath("/dashboard/observasi");
  redirect(`/dashboard/penilaian?eventId=${encodeURIComponent(eventId)}&assignment=success`);
}

export async function removeObserverAssignment(formData: FormData) {
  const { supabase } = await staffClient(["admin_system", "bidang_kader"]);
  const assignmentId = String(formData.get("assignmentId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(assignmentId)) throw new Error("Penugasan tidak valid.");
  const { error } = await supabase.from("observer_assignments").delete().eq("id", assignmentId);
  if (error) throw new Error("Penugasan gagal dihapus.");
  revalidatePath("/dashboard/penilaian");
  revalidatePath("/dashboard/observasi");
}

export async function assignInstructorEvent(formData: FormData) {
  const { supabase, userId } = await staffClient(["admin_system"]);
  const eventId = String(formData.get("eventId") ?? "");
  const instructorId = String(formData.get("instructorId") ?? "");
  const position = String(formData.get("position") ?? "") as InstructorPosition;
  if (!/^[0-9a-f-]{36}$/i.test(eventId) || !/^[0-9a-f-]{36}$/i.test(instructorId) || !instructorPositions.some((item) => item.id === position)) throw new Error("Kegiatan, akun, atau subrole Instruktur tidak valid.");
  const { data: instructor } = await supabase.from("profiles").select("id").eq("id", instructorId).eq("role", "instruktur").maybeSingle();
  if (!instructor) throw new Error("Pilih akun dengan role Instruktur.");
  const { data: assignment, error } = await supabase.from("instructor_event_assignments").insert({ event_id: eventId, instructor_id: instructorId, assigned_by: userId, position }).select("id").single();
  if (error?.code === "23505") throw new Error("Akun tersebut sudah mendapat subrole itu pada kegiatan ini.");
  if (error || !assignment) throw new Error("Penugasan Instruktur gagal disimpan.");
  const { error: dutyError } = await supabase.from("instructor_duty_items").insert(instructorDuties[position].map((title) => ({ instructor_assignment_id: assignment.id, title })));
  if (dutyError) {
    await supabase.from("instructor_event_assignments").delete().eq("id", assignment.id);
    throw new Error("Daftar tugas subrole gagal dibuat. Pastikan migrasi Instruktur terbaru sudah dijalankan.");
  }
  revalidatePath("/dashboard/penilaian");
  revalidatePath("/dashboard");
}

export async function removeInstructorEventAssignment(formData: FormData) {
  const { supabase } = await staffClient(["admin_system"]);
  const assignmentId = String(formData.get("assignmentId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(assignmentId)) throw new Error("Penugasan tidak valid.");
  const { error } = await supabase.from("instructor_event_assignments").delete().eq("id", assignmentId);
  if (error) throw new Error("Penugasan Instruktur gagal dihapus.");
  revalidatePath("/dashboard/penilaian");
  revalidatePath("/dashboard");
}

export async function updateInstructorDutyItem(formData: FormData) {
  const { supabase, userId } = await staffClient(["instruktur"]);
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const dutyItemId = String(formData.get("dutyItemId") ?? "");
  const isDone = formData.get("isDone") === "on";
  if (!/^[0-9a-f-]{36}$/i.test(assignmentId) || !/^[0-9a-f-]{36}$/i.test(dutyItemId)) throw new Error("Tugas tidak valid.");
  const { data: assignment } = await supabase.from("instructor_event_assignments").select("id").eq("id", assignmentId).eq("instructor_id", userId).maybeSingle();
  if (!assignment) throw new Error("Tugas ini tidak diberikan kepada akun Anda.");
  const { error } = await supabase.from("instructor_duty_items").update({ is_done: isDone, updated_at: new Date().toISOString() }).eq("id", dutyItemId).eq("instructor_assignment_id", assignmentId);
  if (error) throw new Error("Status tugas gagal diperbarui. Pastikan migrasi subrole Instruktur sudah dijalankan.");
  revalidatePath("/dashboard");
}

export async function completeObserverAssignment(formData: FormData) {
  const { supabase, userId } = await staffClient(["observer"]);
  const eventId = String(formData.get("eventId") ?? "");
  const versionId = String(formData.get("versionId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(eventId) || !/^[0-9a-f-]{36}$/i.test(versionId)) throw new Error("Kegiatan atau rubrik tidak valid.");
  const { data: assignment, error: assignmentError } = await supabase.from("observer_assignments").select("id").eq("event_id", eventId).eq("observer_id", userId).maybeSingle();
  if (assignmentError || !assignment) throw new Error("Anda tidak ditugaskan pada kegiatan ini.");
  const { data: activeVersion } = await supabase.from("rubric_versions").select("id").eq("id", versionId).eq("event_id", eventId).eq("status", "active").maybeSingle();
  if (!activeVersion) throw new Error("Rubrik ini tidak aktif untuk kegiatan tersebut.");
  const { error } = await supabase.from("observer_rubric_version_completions").upsert({ assignment_id: assignment.id, rubric_version_id: versionId, completed_by: userId, completed_at: new Date().toISOString() }, { onConflict: "assignment_id,rubric_version_id" });
  if (error) throw new Error("Status selesai gagal disimpan. Pastikan migrasi Tahap 4 terbaru sudah dijalankan.");
  revalidatePath("/dashboard/observasi");
}

export async function reopenObserverAssignment(formData: FormData) {
  const { supabase, userId } = await staffClient(["observer"]);
  const eventId = String(formData.get("eventId") ?? "");
  const versionId = String(formData.get("versionId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(eventId) || !/^[0-9a-f-]{36}$/i.test(versionId)) throw new Error("Kegiatan atau rubrik tidak valid.");
  const { data: assignment } = await supabase.from("observer_assignments").select("id").eq("event_id", eventId).eq("observer_id", userId).maybeSingle();
  if (!assignment) throw new Error("Anda tidak ditugaskan pada kegiatan ini.");
  const { error } = await supabase.from("observer_rubric_version_completions").delete().eq("assignment_id", assignment.id).eq("rubric_version_id", versionId);
  if (error) throw new Error("Status selesai gagal dibuka kembali.");
  revalidatePath("/dashboard/observasi");
}

export async function activateRubric(formData: FormData) {
  const { supabase } = await staffClient(["admin_system"]);
  const versionId = String(formData.get("versionId") ?? "");
  const { data: aspects, error } = await supabase.from("rubric_aspects").select("id, weight, rubric_indicator_aspects(id, weight, rubric_indicators(id, score_descriptors))").eq("rubric_version_id", versionId);
  if (error || !aspects?.length) throw new Error("Tambahkan aspek dan indikator sebelum mengaktifkan rubrik.");
  const close = (n: number) => Math.abs(n - 100) < 0.001;
  if (!close(aspects.reduce((sum, aspect) => sum + Number(aspect.weight), 0)) || aspects.some((aspect) => !aspect.rubric_indicator_aspects.length || !close(aspect.rubric_indicator_aspects.reduce((sum, mapping) => sum + Number(mapping.weight), 0)))) throw new Error("Bobot antar-aspek dan bobot pemetaan indikator pada setiap aspek masing-masing harus berjumlah 100%.");
  if (aspects.some((aspect) => aspect.rubric_indicator_aspects.some((mapping) => {
    const indicator = Array.isArray(mapping.rubric_indicators) ? mapping.rubric_indicators[0] : mapping.rubric_indicators;
    return [1, 2, 3, 4, 5].some((score) => String(indicator?.score_descriptors?.[String(score)] ?? "").trim().length < 3);
  }))) throw new Error("Lengkapi uraian perilaku untuk skor 1 sampai 5 pada setiap indikator.");
  const { data: version } = await supabase.from("rubric_versions").select("event_id, stage, material_id, assessment_type_id").eq("id", versionId).eq("status", "draft").maybeSingle();
  if (!version) throw new Error("Versi draf tidak ditemukan.");
  let activeQuery = supabase.from("rubric_versions").update({ status: "archived" }).eq("event_id", version.event_id).eq("stage", version.stage).eq("assessment_type_id", version.assessment_type_id).eq("status", "active");
  activeQuery = version.stage === "training" ? activeQuery.eq("material_id", version.material_id) : activeQuery.is("material_id", null);
  const { error: archiveError } = await activeQuery;
  if (archiveError) throw new Error("Versi aktif sebelumnya gagal diarsipkan.");
  const { error: activateError } = await supabase.from("rubric_versions").update({ status: "active" }).eq("id", versionId);
  if (activateError) throw new Error("Rubrik gagal diaktifkan.");
  revalidatePath("/dashboard/penilaian");
}

export async function saveObservation(input: { participantId: string; indicatorId: string; score: number | null; expectedRevision: number }) {
  const { supabase, userId, role } = await staffClient(["admin_system", "observer", "instruktur"]);
  if (!/^[0-9a-f-]{36}$/i.test(input.participantId) || !/^[0-9a-f-]{36}$/i.test(input.indicatorId) || (input.score !== null && (!Number.isInteger(input.score) || input.score < 1 || input.score > 5)) || !Number.isInteger(input.expectedRevision) || input.expectedRevision < 0) return { ok: false as const, message: "Isian tidak valid." };
  const { data: participant } = await supabase.from("participants").select("event_id").eq("id", input.participantId).maybeSingle();
  const { data: indicator } = await supabase.from("rubric_indicators").select("aspect_id").eq("id", input.indicatorId).maybeSingle();
  const { data: aspect } = indicator ? await supabase.from("rubric_aspects").select("rubric_version_id").eq("id", indicator.aspect_id).maybeSingle() : { data: null };
  const { data: version } = aspect ? await supabase.from("rubric_versions").select("id, event_id, status").eq("id", aspect.rubric_version_id).maybeSingle() : { data: null };
  if (!participant || !version || version.event_id !== participant.event_id || version.status !== "active") return { ok: false as const, message: "Peserta dan indikator tidak berada pada rubrik aktif yang sama." };
  if (role === "observer") {
    const { data: assignment } = await supabase.from("observer_assignments").select("id").eq("event_id", participant.event_id).eq("observer_id", userId).maybeSingle();
    if (!assignment) return { ok: false as const, message: "Anda tidak ditugaskan pada kegiatan ini." };
  }
  if (role === "instruktur") {
    const { data: assignment } = await supabase.from("instructor_event_assignments").select("id").eq("event_id", participant.event_id).eq("instructor_id", userId).limit(1).maybeSingle();
    if (!assignment) return { ok: false as const, message: "Anda tidak ditugaskan pada kegiatan ini." };
  }
  const readLatest = async () => {
    const { data } = await supabase.from("observations").select("id, score, revision, updated_at, updated_by_name, updated_by").eq("participant_id", input.participantId).eq("indicator_id", input.indicatorId).maybeSingle();
    return data ?? { id: null, score: null, revision: 0, updated_at: null, updated_by_name: null, updated_by: null };
  };
  const { data: current, error: readError } = await supabase.from("observations").select("id, score, revision, updated_at, updated_by_name, updated_by").eq("participant_id", input.participantId).eq("indicator_id", input.indicatorId).maybeSingle();
  if (readError) return { ok: false as const, message: "Data belum dapat disimpan." };
  const latest = current ?? { id: null, score: null, revision: 0, updated_at: null, updated_by_name: null, updated_by: null };
  if (latest.revision !== input.expectedRevision) return { ok: false as const, conflict: true as const, latest, message: "Nilai berubah di perangkat lain. Pilih nilai terbaru atau terapkan ulang pilihan Anda." };
  const values = { score: input.score, updated_by: userId };
  if (!current) {
    const { error } = await supabase.from("observations").insert({ ...values, participant_id: input.participantId, indicator_id: input.indicatorId });
    if (error) return error.code === "23505" ? { ok: false as const, conflict: true as const, latest: await readLatest(), message: "Nilai berubah di perangkat lain. Pilih nilai terbaru atau terapkan ulang pilihan Anda." } : { ok: false as const, message: "Data belum dapat disimpan." };
    return { ok: true as const, revision: 1 };
  }
  const { data: updated, error } = await supabase.from("observations").update(values).eq("id", current.id).eq("revision", input.expectedRevision).select("revision").maybeSingle();
  if (error || !updated) return { ok: false as const, conflict: true as const, latest: await readLatest(), message: "Nilai berubah di perangkat lain. Pilih nilai terbaru atau terapkan ulang pilihan Anda." };
  return { ok: true as const, revision: updated.revision as number };
}

export async function saveAssessmentRating(input: { participantId: string; rubricVersionId: string; indicatorId: string; score: number | null; responseStatus: "scored" | "not_observed" | "unrated"; evidence: string; expectedRevision: number }) {
  const { supabase, userId, role } = await staffClient(["admin_system", "observer", "instruktur"]);
  if (!/^[0-9a-f-]{36}$/i.test(input.participantId) || !/^[0-9a-f-]{36}$/i.test(input.rubricVersionId) || !/^[0-9a-f-]{36}$/i.test(input.indicatorId) || input.evidence.length > 3000 || !Number.isInteger(input.expectedRevision) || input.expectedRevision < 0 || !["scored", "not_observed", "unrated"].includes(input.responseStatus) || (input.responseStatus === "scored" ? !Number.isInteger(input.score) || (input.score ?? 0) < 1 || (input.score ?? 0) > 5 : input.score !== null)) return { ok: false as const, message: "Isian penilaian tidak valid." };
  if (role === "admin_system") return { ok: false as const, message: "Admin Sistem hanya memfinalisasi, bukan mengisi penilaian observer." };
  const { data: participant } = await supabase.from("participants").select("event_id").eq("id", input.participantId).maybeSingle();
  const { data: version } = await supabase.from("rubric_versions").select("id,event_id,status").eq("id", input.rubricVersionId).maybeSingle();
  if (!participant || !version || participant.event_id !== version.event_id || version.status !== "active") return { ok: false as const, message: "Sesi atau rubrik aktif tidak cocok." };
  const assignment = role === "observer"
    ? await supabase.from("observer_assignments").select("id").eq("event_id", participant.event_id).eq("observer_id", userId).maybeSingle()
    : await supabase.from("instructor_event_assignments").select("id").eq("event_id", participant.event_id).eq("instructor_id", userId).limit(1).maybeSingle();
  if (!assignment.data) return { ok: false as const, message: "Anda tidak ditugaskan pada kegiatan ini." };
  let { data: submission, error: submissionError } = await supabase.from("assessment_submissions").select("id,status").eq("rubric_version_id", version.id).eq("participant_id", input.participantId).eq("observer_id", userId).maybeSingle();
  if (!submission && !submissionError) {
    const created = await supabase.from("assessment_submissions").insert({ rubric_version_id: version.id, participant_id: input.participantId, observer_id: userId }).select("id,status").single();
    submission = created.data;
    submissionError = created.error;
  }
  if (submissionError || !submission || submission.status !== "draft") return { ok: false as const, message: "Asesmen sudah dikirim atau tidak dapat diedit. Buka kembali untuk revisi." };
  const query = () => supabase.from("assessment_ratings").select("id,score,response_status,evidence,revision,updated_at").eq("rubric_version_id", version.id).eq("participant_id", input.participantId).eq("indicator_id", input.indicatorId).eq("observer_id", userId).maybeSingle();
  const { data: current, error } = await query();
  if (error) return { ok: false as const, message: "Nilai belum dapat dibaca." };
  const latest = current ?? { id: null, score: null, response_status: "unrated", evidence: "", revision: 0, updated_at: null };
  if (latest.revision !== input.expectedRevision) return { ok: false as const, conflict: true as const, latest, message: "Data berubah di perangkat lain. Pilih data terbaru atau terapkan ulang setelah memeriksanya." };
  const fields = { score: input.score, response_status: input.responseStatus, evidence: input.evidence.trim() };
  if (!current) {
    if (input.expectedRevision !== 0) return { ok: false as const, conflict: true as const, latest, message: "Versi penilaian tidak cocok." };
    const { data: inserted, error: insertError } = await supabase.from("assessment_ratings").insert({ ...fields, submission_id: submission.id, rubric_version_id: version.id, participant_id: input.participantId, observer_id: userId, indicator_id: input.indicatorId }).select("id,score,response_status,evidence,revision,updated_at").single();
    if (insertError || !inserted) { const { data: raced } = await query(); return raced ? { ok: false as const, conflict: true as const, latest: raced, message: "Isian baru saja berubah. Periksa versi terbaru." } : { ok: false as const, message: "Nilai gagal disimpan." }; }
    return { ok: true as const, record: inserted };
  }
  const { data: updated, error: updateError } = await supabase.from("assessment_ratings").update(fields).eq("id", current.id).eq("revision", input.expectedRevision).select("id,score,response_status,evidence,revision,updated_at").maybeSingle();
  if (updateError || !updated) { const { data: raced } = await query(); return { ok: false as const, conflict: true as const, latest: raced ?? latest, message: "Isian berubah saat disimpan. Periksa versi terbaru." }; }
  return { ok: true as const, record: updated };
}

export async function setAssessmentSubmissionStatus(input: { participantId: string; rubricVersionId: string; status: "submitted" | "draft" | "finalized" }) {
  const { supabase, userId, role } = await staffClient(["admin_system", "observer", "instruktur"]);
  if (!/^[0-9a-f-]{36}$/i.test(input.participantId) || !/^[0-9a-f-]{36}$/i.test(input.rubricVersionId)) return { ok: false as const, message: "Sesi tidak valid." };
  const { data: participant } = await supabase.from("participants").select("event_id").eq("id", input.participantId).maybeSingle();
  const { data: version } = await supabase.from("rubric_versions").select("id,event_id,status").eq("id", input.rubricVersionId).maybeSingle();
  if (!participant || !version || participant.event_id !== version.event_id) return { ok: false as const, message: "Peserta tidak cocok dengan versi rubrik." };
  if (input.status === "finalized") {
    if (role !== "admin_system") return { ok: false as const, message: "Hanya Admin Sistem yang dapat memfinalisasi." };
    const { data: submissions } = await supabase.from("assessment_submissions").select("id,status,observer_id").eq("participant_id", input.participantId).eq("rubric_version_id", input.rubricVersionId);
    const { data: assigned } = await supabase.from("observer_assignments").select("observer_id").eq("event_id", participant.event_id);
    if (!assigned?.length || assigned.some((item) => !submissions?.some((entry) => entry.observer_id === item.observer_id && entry.status === "submitted"))) return { ok: false as const, message: "Semua Observer yang ditugaskan harus mengirim penilaian peserta ini sebelum finalisasi." };
    const { error } = await supabase.from("assessment_submissions").update({ status: "finalized", finalized_by: userId }).eq("participant_id", input.participantId).eq("rubric_version_id", input.rubricVersionId).eq("status", "submitted");
    return error ? { ok: false as const, message: "Finalisasi gagal." } : { ok: true as const };
  }
  if (role === "admin_system") return { ok: false as const, message: "Admin Sistem tidak mengubah status pengiriman observer." };
  const assignment = role === "observer"
    ? await supabase.from("observer_assignments").select("id").eq("event_id", participant.event_id).eq("observer_id", userId).maybeSingle()
    : await supabase.from("instructor_event_assignments").select("id").eq("event_id", participant.event_id).eq("instructor_id", userId).limit(1).maybeSingle();
  if (!assignment.data) return { ok: false as const, message: "Anda tidak ditugaskan pada kegiatan ini." };
  let { data: submission } = await supabase.from("assessment_submissions").select("id,status").eq("rubric_version_id", version.id).eq("participant_id", input.participantId).eq("observer_id", userId).maybeSingle();
  if (!submission) {
    if (input.status !== "submitted") return { ok: false as const, message: "Asesmen belum dimulai." };
    const created = await supabase.from("assessment_submissions").insert({ rubric_version_id: version.id, participant_id: input.participantId, observer_id: userId }).select("id,status").single();
    if (created.error || !created.data) return { ok: false as const, message: "Pengiriman gagal." };
    const { error: submitError } = await supabase.from("assessment_submissions").update({ status: "submitted" }).eq("id", created.data.id).eq("status", "draft");
    return submitError ? { ok: false as const, message: "Pengiriman gagal." } : { ok: true as const };
  }
  if (submission.status === "finalized") return { ok: false as const, message: "Asesmen sudah difinalisasi." };
  const { error } = await supabase.from("assessment_submissions").update({ status: input.status }).eq("id", submission.id).eq("status", input.status === "draft" ? "submitted" : "draft");
  return error ? { ok: false as const, message: "Status asesmen gagal diperbarui." } : { ok: true as const };
}

export async function saveObserverNote(input: { participantId: string; rubricVersionId: string; noteType: "observation" | "strength" | "development" | "special"; content: string; expectedRevision: number }) {
  const { supabase, userId, role } = await staffClient(["admin_system", "observer", "instruktur"]);
  if (!/^[0-9a-f-]{36}$/i.test(input.participantId) || !/^[0-9a-f-]{36}$/i.test(input.rubricVersionId) || !["observation", "strength", "development", "special"].includes(input.noteType) || input.content.length > 3000 || !Number.isInteger(input.expectedRevision) || input.expectedRevision < 0) return { ok: false as const, message: "Isian catatan tidak valid." };
  const { data: participant } = await supabase.from("participants").select("event_id").eq("id", input.participantId).maybeSingle();
  const { data: version } = await supabase.from("rubric_versions").select("id, event_id, status").eq("id", input.rubricVersionId).maybeSingle();
  if (!participant || !version || version.event_id !== participant.event_id || version.status !== "active") return { ok: false as const, message: "Catatan hanya dapat ditulis pada rubrik aktif untuk kegiatan peserta ini." };
  if (role === "observer") {
    const { data: assignment } = await supabase.from("observer_assignments").select("id").eq("event_id", participant.event_id).eq("observer_id", userId).maybeSingle();
    if (!assignment) return { ok: false as const, message: "Anda tidak ditugaskan pada kegiatan ini." };
  }
  if (role === "instruktur") {
    const { data: assignment } = await supabase.from("instructor_event_assignments").select("id").eq("event_id", participant.event_id).eq("instructor_id", userId).limit(1).maybeSingle();
    if (!assignment) return { ok: false as const, message: "Anda tidak ditugaskan pada kegiatan ini." };
  }
  const { data: submission } = await supabase.from("assessment_submissions").select("id,status").eq("participant_id", input.participantId).eq("rubric_version_id", input.rubricVersionId).eq("observer_id", userId).maybeSingle();
  if (!submission) {
    const { error: submissionError } = await supabase.from("assessment_submissions").insert({ participant_id: input.participantId, rubric_version_id: input.rubricVersionId, observer_id: userId });
    if (submissionError) return { ok: false as const, message: "Ruang penilaian belum dapat dibuka. Pastikan migrasi Fase 5 sudah dijalankan." };
  } else if (submission.status !== "draft") return { ok: false as const, message: "Asesmen sudah dikirim. Buka kembali sebelum mengedit catatan." };
  const queryLatest = () => supabase.from("observer_notes").select("id, participant_id, rubric_version_id, author_id, author_name, note_type, content, revision, updated_at").eq("participant_id", input.participantId).eq("rubric_version_id", input.rubricVersionId).eq("author_id", userId).eq("note_type", input.noteType).is("indicator_id", null).maybeSingle();
  const { data: current, error: readError } = await queryLatest();
  if (readError) return { ok: false as const, message: "Catatan belum dapat dibaca." };
  const latest = current ?? { id: null, participant_id: input.participantId, rubric_version_id: input.rubricVersionId, author_id: userId, author_name: "Anda", note_type: input.noteType, content: "", revision: 0, updated_at: null };
  if (latest.revision !== input.expectedRevision) return { ok: false as const, conflict: true as const, latest, message: "Catatan Anda berubah di perangkat lain. Pilih versi terbaru atau terapkan ulang tulisan Anda." };
  const content = input.content.trim();
  if (!current && !content) return { ok: true as const, record: latest };
  if (!current) {
    const { data: inserted, error } = await supabase.from("observer_notes").insert({ participant_id: input.participantId, rubric_version_id: input.rubricVersionId, author_id: userId, note_type: input.noteType, content }).select("id, participant_id, rubric_version_id, author_id, author_name, note_type, content, revision, updated_at").single();
    if (error || !inserted) {
      const { data: raced } = await queryLatest();
      return raced ? { ok: false as const, conflict: true as const, latest: raced, message: "Catatan Anda baru saja berubah. Pilih versi terbaru atau terapkan ulang tulisan Anda." } : { ok: false as const, message: "Catatan gagal disimpan." };
    }
    return { ok: true as const, record: inserted };
  }
  const { data: updated, error } = await supabase.from("observer_notes").update({ content }).eq("id", current.id).eq("revision", input.expectedRevision).select("id, participant_id, rubric_version_id, author_id, author_name, note_type, content, revision, updated_at").maybeSingle();
  if (error || !updated) {
    const { data: raced } = await queryLatest();
    return { ok: false as const, conflict: true as const, latest: raced ?? latest, message: "Catatan Anda berubah di perangkat lain. Pilih versi terbaru atau terapkan ulang tulisan Anda." };
  }
  return { ok: true as const, record: updated };
}
