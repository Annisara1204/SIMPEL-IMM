import { redirect } from "next/navigation";
import Link from "next/link";
import { RoleDashboard, type AppRole } from "@/components/role-dashboard";
import { createClient } from "@/lib/supabase/server";
import { loadDashboardAssessmentData } from "@/lib/dashboard-results";
import {
  isModeratorPosition,
  loadParticipantReportPhase7Home,
  loadPersonalProgressPhase7Home,
  loadStaffPhase7Home,
  type Phase7Home,
} from "@/lib/phase7-home";
import type {
  InstructorAssignment,
  InstructorDuty,
  InstructorParticipantEvent,
} from "@/components/instructor-duty-dashboard";

const allowedRoles: AppRole[] = [
  "admin_system",
  "bidang_kader",
  "observer",
  "instruktur",
  "komisariat",
  "peserta",
];

export default async function DashboardPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key)
    return (
      <main className="setup-message">
        <h1>Login belum dikonfigurasi</h1>
        <p>Aplikasi belum siap digunakan. Hubungi Admin sistem.</p>
        <Link href="/login">Kembali ke login</Link>
      </main>
    );
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name, role, account_type")
    .eq("id", userId)
    .maybeSingle();
  if (error)
    return (
      <main className="setup-message">
        <h1>Profil belum tersedia</h1>
        <p>
          Data belum dapat dibaca. Hubungi Admin sistem bila masalah berulang.
        </p>
        <form action="/auth/signout" method="post">
          <button>Keluar</button>
        </form>
      </main>
    );
  if (!profile?.role || !allowedRoles.includes(profile.role as AppRole))
    return (
      <main className="setup-message">
        <h1>Akun sedang menunggu penetapan akses</h1>
        <p>
          Dashboard belum menampilkan fitur. Superadmin akan menetapkan role
          dan, untuk Instruktur, subrole serta penugasan kegiatan.
        </p>
        <Link href="/dashboard/profil">Lengkapi profil saya</Link>
        <form action="/auth/signout" method="post">
          <button>Keluar</button>
        </form>
      </main>
    );
  type InstructorAssignmentRow = {
    id: string;
    event_id: string;
    position: string;
    created_at: string | null;
    events: { name: string } | { name: string }[] | null;
  };
  let instructorAssignmentRows: InstructorAssignmentRow[] = [];
  if (profile.role === "instruktur") {
    const { data: allAssignments } = await supabase
      .from("instructor_event_assignments")
      .select("id, event_id, position, created_at, events(name)")
      .eq("instructor_id", userId)
      .order("created_at");
    instructorAssignmentRows =
      (allAssignments as unknown as InstructorAssignmentRow[] | null) ?? [];
    if (!instructorAssignmentRows.length)
      return (
        <main className="setup-message">
          <h1>Akun menunggu penugasan Superadmin</h1>
          <p>
            Role Instruktur sudah ditetapkan, tetapi dashboard baru terbuka
            setelah Superadmin menetapkan subrole dan kegiatan.
          </p>
          <Link href="/dashboard/profil">Buka Profil saya</Link>
          <form action="/auth/signout" method="post">
            <button>Keluar</button>
          </form>
        </main>
      );
  }
  let phase7Home: Phase7Home | null = null;
  if (["admin_system", "bidang_kader"].includes(profile.role)) {
    phase7Home = await loadStaffPhase7Home(supabase);
  } else if (profile.role === "instruktur") {
    const moderator = instructorAssignmentRows.some((item) =>
      isModeratorPosition(item.position),
    );
    phase7Home = moderator
      ? await loadStaffPhase7Home(supabase)
      : await loadPersonalProgressPhase7Home(supabase, userId);
  } else if (profile.role === "observer") {
    phase7Home = await loadPersonalProgressPhase7Home(supabase, userId);
  } else if (profile.role === "peserta") {
    phase7Home = await loadParticipantReportPhase7Home(supabase);
  }
  const assessmentData = phase7Home
    ? null
    : await loadDashboardAssessmentData(supabase, profile.role);
  let instructorAssignments: InstructorAssignment[] = [];
  let instructorParticipantEvents: InstructorParticipantEvent[] = [];
  if (profile.role === "instruktur") {
    const assignmentRows = instructorAssignmentRows;
    const ids = assignmentRows.map((assignment) => assignment.id);
    const { data: dutyRows } = ids.length
      ? await supabase
          .from("instructor_duty_items")
          .select("id, title, is_done, instructor_assignment_id")
          .in("instructor_assignment_id", ids)
          .order("created_at")
      : { data: [] };
    instructorAssignments = (assignmentRows ?? []).map((assignment) => {
      const eventRelation = assignment.events;
      const event = Array.isArray(eventRelation)
        ? eventRelation[0]
        : eventRelation;
      return {
        id: assignment.id,
        event_id: assignment.event_id,
        position: assignment.position,
        event_name: event?.name ?? "Kegiatan DAD",
        duties: ((dutyRows ?? []) as InstructorDuty[]).filter(
          (duty) => duty.instructor_assignment_id === assignment.id,
        ),
      };
    });
    const eventIds = [
      ...new Set(
        (assignmentRows ?? []).map((assignment) => assignment.event_id),
      ),
    ];
    if (eventIds.length) {
      const { data: events } = await supabase
        .from("events")
        .select(
          "id, name, participants(id, display_name, commissariat, major, entry_year, position)",
        )
        .in("id", eventIds)
        .order("starts_on", { ascending: false });
      instructorParticipantEvents = (events ?? []).map((event) => ({
        ...event,
        participants: event.participants ?? [],
      }));
    }
  }
  return (
    <RoleDashboard
      role={profile.role as AppRole}
      displayName={profile.display_name ?? undefined}
      assessmentData={assessmentData}
      instructorAssignments={instructorAssignments}
      instructorParticipantEvents={instructorParticipantEvents}
      phase7Home={phase7Home}
    />
  );
}
