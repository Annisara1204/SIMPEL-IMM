import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Phase7ReportWorkspace } from "@/components/phase7-report-workspace";
import { assignParticipantAccount, publishReport } from "./actions";

type Props={searchParams:Promise<{eventId?:string|string[];participantId?:string|string[]}>};
const relatedRows=<T,>(value:T|T[]|null|undefined):T[]=>Array.isArray(value)?value:value?[value]:[];
const one=(value:string|string[]|undefined)=>Array.isArray(value)?value[0]:value;

export default async function ReportingPage({searchParams}:Props){
  if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return <main className="setup-message"><h1>Laporan belum dikonfigurasi</h1><p>Konfigurasikan Supabase dan jalankan migration Phase 6 lalu Phase 7.</p></main>;
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  const userId=claims?.claims?.sub;
  if(!userId) redirect("/login");
  const {data:profile}=await supabase.from("profiles").select("role").eq("id",userId).maybeSingle();
  const role=profile?.role??"";
  const params=await searchParams;
  const requestedEventId=one(params.eventId);
  const participantId=one(params.participantId);

  if(role==="peserta"){
    const {data,error}=await supabase.rpc("get_my_published_assessment_report");
    const report=data&&typeof data==="object"?data as any:null;
    return <Phase7ReportWorkspace role={role} participantReport={report} reportError={error?.code==="P0002"?"Rapor belum diterbitkan untuk akun Anda.":error?"Rapor belum dapat dimuat. Periksa migration Fase 7.":null}/>;
  }
  if(!["admin_system","bidang_kader","instruktur"].includes(role)) redirect("/dashboard");
  const {data:events,error:eventError}=await supabase.from("events").select("id,name,theme,organizer,commissariat,location,starts_on,ends_on").order("starts_on",{ascending:false});
  const selectedEvent=(events??[]).find((item)=>item.id===requestedEventId)??(events?.[0]??null);
  if(!selectedEvent) return <main className="users-page"><a className="users-back" href="/dashboard">← Dashboard</a><h1>Laporan dan Rapor</h1><p className="users-error">Tidak ada kegiatan yang dapat diakses atau migration Phase 7 belum dijalankan. {eventError?.message}</p></main>;
  const {data:moderator}=await supabase.rpc("is_assessment_moderator",{target_event_id:selectedEvent.id});
  const canManage=role==="admin_system"||role==="bidang_kader"||moderator===true;
  if(role==="instruktur"&&!canManage) redirect("/dashboard");
  const {data:rows,error:reportError}=await supabase.rpc("get_event_report_rows",{target_event_id:selectedEvent.id});
  const reportRows=(rows??[]) as any[];
  const snapshotIds=reportRows.flatMap((row)=>row.rubric_version_ids??[]).filter((id:string)=>typeof id==="string");
  const {data:versions}=snapshotIds.length?await supabase.from("rubric_versions").select("id,version,stage,material_id,competency_framework_version_id,rubric_materials(name),rubric_aspects(rubric_indicator_aspects(rubric_indicators(id,name,competency_indicator_id)))").in("id",[...new Set(snapshotIds)]):{data:[]};
  const indicatorNames:Record<string,string>={};
  for(const version of versions??[]) for(const aspect of relatedRows((version as any).rubric_aspects)) for(const mapping of relatedRows(aspect.rubric_indicator_aspects)) for(const indicator of relatedRows(mapping.rubric_indicators)) indicatorNames[indicator.competency_indicator_id??indicator.id]=indicator.name;
  const frameworkIds=[...new Set(reportRows.flatMap((row)=>row.framework_version_ids??[]).filter((id:string)=>typeof id==="string"))];
  const {data:frameworkVersions}=frameworkIds.length?await supabase.from("competency_framework_versions").select("id,version,competency_frameworks(name)").in("id",frameworkIds):{data:[]};
  const versionInfoBySnapshot=new Map<string,string[]>();
  for(const row of reportRows){if(!row.snapshot_id)continue;const labels:string[]=[];for(const framework of frameworkVersions??[])if((row.framework_version_ids??[]).includes(framework.id)){const relation=(framework as any).competency_frameworks;const item=Array.isArray(relation)?relation[0]:relation;labels.push(`${item?.name??"Framework"} v${framework.version}`);}for(const rubricId of row.rubric_version_ids??[]){const version=(versions??[]).find((item)=>item.id===rubricId);if(version){const material=(version as any).rubric_materials;const item=Array.isArray(material)?material[0]:material;const stage=version.stage==="training"?"Pelatihan":version.stage==="screening"?"Screening":"Tindak lanjut";labels.push(`${stage} v${version.version}${item?.name?` · ${item.name}`:""}`);}}versionInfoBySnapshot.set(row.snapshot_id,labels);}
  const {data:candidateAccounts}=role==="admin_system"?await supabase.from("profiles").select("id,display_name").eq("role","peserta").order("display_name"): {data:[]};
  const canViewPrivate=role==="admin_system"||moderator===true;
  const {data:privateSources}=canViewPrivate&&reportRows.some((row)=>row.snapshot_id)?await supabase.from("assessment_snapshot_private_sources").select("snapshot_id,private_payload").in("snapshot_id",reportRows.flatMap((row)=>row.snapshot_id?[row.snapshot_id]:[])):{data:[]};
  const {data:observerProgress}=canManage?await supabase.rpc("get_event_assessment_progress",{target_event_id:selectedEvent.id}):{data:[]};
  return <Phase7ReportWorkspace role={role} event={selectedEvent} events={(events??[]) as any[]} rows={reportRows} participantId={participantId??null} indicatorNames={indicatorNames} versionInfoBySnapshot={Object.fromEntries(versionInfoBySnapshot)} canManage={canManage} canViewPrivate={canViewPrivate} canAssignAccounts={role==="admin_system"} candidateAccounts={(candidateAccounts??[]) as any[]} privateSources={(privateSources??[]) as any[]} observerProgress={(observerProgress??[]) as any[]} reportError={reportError?.message??null} publishAction={publishReport} assignAction={assignParticipantAccount}/>;
}
