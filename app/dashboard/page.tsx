import { redirect } from "next/navigation";
import { RoleDashboard, type AppRole } from "@/components/role-dashboard";
import { createClient } from "@/lib/supabase/server";
import { loadDashboardAssessmentData } from "@/lib/dashboard-results";
import type { InstructorAssignment, InstructorDuty, InstructorParticipantEvent } from "@/components/instructor-duty-dashboard";

const allowedRoles: AppRole[] = ["admin_system", "bidang_kader", "observer", "instruktur", "komisariat", "peserta"];

export default async function DashboardPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return <main className="setup-message"><h1>Login belum dikonfigurasi</h1><p>Siapkan proyek Supabase dan ikuti panduan lokal di README.md. Dashboard internal belum dapat dibuka.</p><a href="/login">Kembali ke login</a></main>;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");
  const { data: profile, error } = await supabase.from("profiles").select("display_name, role, account_type").eq("id", userId).maybeSingle();
  if (error) return <main className="setup-message"><h1>Profil belum tersedia</h1><p>Periksa apakah migrasi basis data telah dijalankan. Hubungi Admin sistem bila masalah berlanjut.</p><form action="/auth/signout" method="post"><button>Keluar</button></form></main>;
  if (!profile?.role || !allowedRoles.includes(profile.role as AppRole)) return <main className="setup-message"><h1>Akun sedang menunggu penetapan akses</h1><p>Dashboard belum menampilkan fitur. Superadmin akan menetapkan role dan, untuk Instruktur, subrole serta penugasan kegiatan.</p><a href="/dashboard/profil">Lengkapi profil saya</a><form action="/auth/signout" method="post"><button>Keluar</button></form></main>;
  if (profile.role === "instruktur") {
    const { data: assignments } = await supabase.from("instructor_event_assignments").select("id").eq("instructor_id", userId).limit(1);
    if (!assignments?.length) return <main className="setup-message"><h1>Akun menunggu penugasan Superadmin</h1><p>Role Instruktur sudah ditetapkan, tetapi dashboard baru terbuka setelah Superadmin menetapkan subrole dan kegiatan.</p><a href="/dashboard/profil">Buka Profil saya</a><form action="/auth/signout" method="post"><button>Keluar</button></form></main>;
  }
  let phase7Home:any=null;
  const summarizeEvent=async(event:{id:string;name:string})=>{
    const [{data:rows,error},{data:progress},{data:versions}]=await Promise.all([
      supabase.rpc("get_event_report_rows",{target_event_id:event.id}),
      supabase.rpc("get_event_assessment_progress",{target_event_id:event.id}),
      supabase.from("rubric_versions").select("id").eq("event_id",event.id).eq("status","active"),
    ]);
    const reports=(rows??[]) as any[];const final=reports.filter((row)=>row.snapshot_id);const scores=final.map((row)=>Number(row.snapshot_data?.overall?.score)).filter(Number.isFinite);const versionIds=(versions??[]).map((item)=>item.id);
    const {data:submissions}=versionIds.length?await supabase.from("assessment_submissions").select("id,status,updated_at").in("rubric_version_id",versionIds).order("updated_at",{ascending:false}):{data:[]};
    return {id:event.id,name:event.name,participants:reports.length,finalized:final.length,published:reports.filter((row)=>row.published_at).length,provisional:reports.length-final.length,passed:final.filter((row)=>row.snapshot_data?.collective?.decision==="pass").length,notPassed:final.filter((row)=>row.snapshot_data?.collective?.decision==="not_pass").length,furtherDiscussion:final.filter((row)=>row.snapshot_data?.collective?.decision==="further_discussion").length,averageScore:scores.length?scores.reduce((sum,score)=>sum+score,0)/scores.length:null,reviewers:progress?.length??0,sessions:versions?.length??0,assessmentSubmissions:submissions?.length??0,latestActivity:submissions?.[0]?.updated_at??null,unavailable:!!error};
  };
  const loadPersonalProgress=async()=>{
    const {data:submissions,error:submissionError}=await supabase.from("assessment_submissions").select("id,status,participant_id,updated_at,rubric_versions(stage,material_id,events(name),rubric_materials(name))").eq("observer_id",userId).order("updated_at",{ascending:false});
    const sessions=(submissions??[]).map((item:any)=>{const version=Array.isArray(item.rubric_versions)?item.rubric_versions[0]:item.rubric_versions;const event=Array.isArray(version?.events)?version.events[0]:version?.events;const material=Array.isArray(version?.rubric_materials)?version.rubric_materials[0]:version?.rubric_materials;const stage=version?.stage==="training"?"Pelatihan":version?.stage==="screening"?"Screening":version?.stage==="follow_up"?"Tindak lanjut":"Sesi asesmen";return {eventName:event?.name??"Kegiatan DAD",sessionName:material?.name?`${stage} · ${material.name}`:stage,status:item.status,updatedAt:item.updated_at};});
    const items=submissions??[];return {kind:"personal",total:items.length,draft:items.filter((item:any)=>item.status==="draft").length,submitted:items.filter((item:any)=>item.status==="submitted").length,finalized:items.filter((item:any)=>item.status==="finalized").length,assessedParticipants:new Set(items.map((item:any)=>item.participant_id)).size,sessions,unavailable:!!submissionError};
  };
  if(["admin_system","bidang_kader"].includes(profile.role)){
    const {data:events}=await supabase.from("events").select("id,name").order("starts_on",{ascending:false});
    const summaries=await Promise.all((events??[]).map(summarizeEvent));
    phase7Home={kind:"staff",events:summaries};
  }else if(profile.role==="instruktur"){
    const {data:assignments}=await supabase.from("instructor_event_assignments").select("position").eq("instructor_id",userId);
    const moderator=!!assignments?.some((item)=>["mot","vice_mot","master_observer","vice_observer"].includes(item.position));
    if(moderator){const {data:events}=await supabase.from("events").select("id,name").order("starts_on",{ascending:false});const summaries=await Promise.all((events??[]).map(summarizeEvent));phase7Home={kind:"staff",events:summaries};}
    else {phase7Home=await loadPersonalProgress();}
  }else if(profile.role==="observer"){
    phase7Home=await loadPersonalProgress();
  }else if(profile.role==="peserta"){
    const {data:report}=await supabase.rpc("get_my_published_assessment_report");phase7Home={kind:"participant",report:report??null};
  }
  const assessmentData = phase7Home?null:await loadDashboardAssessmentData(supabase, profile.role);
  let instructorAssignments: InstructorAssignment[] = [];
  let instructorParticipantEvents: InstructorParticipantEvent[] = [];
  if (profile.role === "instruktur") {
    const { data: assignmentRows } = await supabase.from("instructor_event_assignments").select("id, event_id, position, events(name)").eq("instructor_id", userId).order("created_at");
    const ids = (assignmentRows ?? []).map((assignment) => assignment.id);
    const { data: dutyRows } = ids.length ? await supabase.from("instructor_duty_items").select("id, title, is_done, instructor_assignment_id").in("instructor_assignment_id", ids).order("created_at") : { data: [] };
    instructorAssignments = (assignmentRows ?? []).map((assignment) => {
      const eventRelation = assignment.events;
      const event = Array.isArray(eventRelation) ? eventRelation[0] : eventRelation;
      return {
        id: assignment.id,
        event_id: assignment.event_id,
        position: assignment.position,
        event_name: event?.name ?? "Kegiatan DAD",
        duties: ((dutyRows ?? []) as InstructorDuty[]).filter((duty) => duty.instructor_assignment_id === assignment.id),
      };
    });
    const eventIds = [...new Set((assignmentRows ?? []).map((assignment) => assignment.event_id))];
    if (eventIds.length) {
      const { data: events } = await supabase.from("events").select("id, name, participants(id, display_name, commissariat, major, entry_year, position)").in("id", eventIds).order("starts_on", { ascending: false });
      instructorParticipantEvents = (events ?? []).map((event) => ({ ...event, participants: event.participants ?? [] }));
    }
  }
  return <RoleDashboard role={profile.role as AppRole} displayName={profile.display_name ?? undefined} assessmentData={assessmentData} instructorAssignments={instructorAssignments} instructorParticipantEvents={instructorParticipantEvents} phase7Home={phase7Home} />;
}

