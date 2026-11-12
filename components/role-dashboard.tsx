"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Eye,
  FileText,
  LayoutDashboard,
  Menu,
  MessagesSquare,
  SlidersHorizontal,
  Upload,
  UserRound,
  X,
  GraduationCap,
  ClipboardCheck,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { DashboardAssessmentResults } from "./dashboard-assessment-results";
import type { DashboardAssessmentData } from "@/lib/dashboard-results";
import {
  InstructorDutyDashboard,
  type InstructorAssignment,
  type InstructorParticipantEvent,
} from "./instructor-duty-dashboard";
import type { Phase7Home } from "@/lib/phase7-home";
import { DashboardContent } from "./simulated-panels";

import type { AppRole } from "@/lib/roles";
import { decisionLabel } from "@/lib/decision-labels";
export type { AppRole };
type DashboardProps = {
  role: AppRole;
  displayName?: string;
  isPublic?: boolean;
  assessmentData?: DashboardAssessmentData | null;
  instructorAssignments?: InstructorAssignment[];
  instructorParticipantEvents?: InstructorParticipantEvent[];
  phase7Home?: Phase7Home | null;
};
type NavItem = { label: string; icon: LucideIcon; group: string };
const labels: Record<AppRole, string> = {
  public: "Pengunjung Publik",
  admin_system: "Admin Sistem",
  bidang_kader: "Bidang Kader",
  observer: "Observer",
  instruktur: "Instruktur",
  komisariat: "Komisariat",
  peserta: "Peserta",
};
const menuByRole: Record<AppRole, NavItem[]> = {
  public: [
    { label: "Dashboard", icon: LayoutDashboard, group: "INFORMASI" },
    { label: "Jadwal DAD", icon: CalendarClock, group: "INFORMASI" },
    { label: "Profil Instruktur", icon: GraduationCap, group: "INFORMASI" },
  ],
  admin_system: [
    { label: "Dashboard", icon: LayoutDashboard, group: "MENU UTAMA" },
    { label: "Pengguna", icon: GraduationCap, group: "PENGELOLAAN" },
    { label: "Komisariat", icon: Building2, group: "PENGELOLAAN" },
    { label: "Kegiatan DAD", icon: CalendarDays, group: "PENGELOLAAN" },
    { label: "Peserta", icon: UserRound, group: "PENGELOLAAN" },
    {
      label: "Pengaturan Penilaian",
      icon: SlidersHorizontal,
      group: "PENGELOLAAN",
    },
    { label: "Kerangka DAD", icon: FileText, group: "PENGELOLAAN" },
    { label: "Seleksi Komisariat", icon: ClipboardCheck, group: "PENGELOLAAN" },
    { label: "Pengaturan Sistem", icon: Settings, group: "PENGELOLAAN" },
    {
      label: "Evaluasi Kolektif",
      icon: MessagesSquare,
      group: "DATA & LAPORAN",
    },
    { label: "Analitik & Rekap", icon: BarChart3, group: "DATA & LAPORAN" },
    { label: "Laporan & Rapor", icon: ClipboardList, group: "DATA & LAPORAN" },
    { label: "Impor Hasil Tes", icon: Upload, group: "DATA & LAPORAN" },
  ],
  bidang_kader: [
    { label: "Dashboard", icon: LayoutDashboard, group: "MENU UTAMA" },
    { label: "Kegiatan DAD", icon: CalendarDays, group: "MENU UTAMA" },
    { label: "Peserta", icon: UserRound, group: "MENU UTAMA" },
    { label: "Observasi", icon: Eye, group: "PEMANTAUAN" },
    {
      label: "Pengaturan Penilaian",
      icon: SlidersHorizontal,
      group: "PEMANTAUAN",
    },
    { label: "Kerangka DAD", icon: FileText, group: "PEMANTAUAN" },
    {
      label: "Evaluasi Kolektif",
      icon: MessagesSquare,
      group: "DATA & LAPORAN",
    },
    { label: "Laporan & Rapor", icon: ClipboardList, group: "DATA & LAPORAN" },
    { label: "Analitik & Rekap", icon: BarChart3, group: "DATA & LAPORAN" },
  ],
  observer: [
    { label: "Dashboard", icon: LayoutDashboard, group: "MENU UTAMA" },
    { label: "Kegiatan DAD", icon: CalendarDays, group: "MENU UTAMA" },
    { label: "Peserta", icon: UserRound, group: "MENU UTAMA" },
    { label: "Observasi", icon: Eye, group: "PEMANTAUAN" },
    { label: "Kerangka DAD", icon: FileText, group: "PEMANTAUAN" },
    { label: "Seleksi Komisariat", icon: ClipboardCheck, group: "PEMANTAUAN" },
  ],
  instruktur: [
    { label: "Dashboard", icon: LayoutDashboard, group: "MENU UTAMA" },
    { label: "Profil Peserta", icon: UserRound, group: "MENU UTAMA" },
    { label: "Profil Instruktur", icon: GraduationCap, group: "MENU UTAMA" },
    { label: "Observasi", icon: Eye, group: "PENILAIAN" },
    { label: "Evaluasi Kolektif", icon: MessagesSquare, group: "PENILAIAN" },
    { label: "Laporan & Rapor", icon: ClipboardList, group: "PENILAIAN" },
    { label: "Kerangka DAD", icon: FileText, group: "PENILAIAN" },
  ],
  komisariat: [
    { label: "Dashboard", icon: LayoutDashboard, group: "MENU UTAMA" },
    { label: "Pengajuan Peserta", icon: Upload, group: "MENU UTAMA" },
    { label: "Analitik & Rekap", icon: BarChart3, group: "DATA & LAPORAN" },
  ],
  peserta: [
    { label: "Dashboard", icon: LayoutDashboard, group: "MENU UTAMA" },
    {
      label: "Laporan & Rapor",
      icon: ClipboardList,
      group: "INFORMASI PRIBADI",
    },
  ],
};

const NON_PUBLIC_ROLES: AppRole[] = [
  "admin_system",
  "bidang_kader",
  "observer",
  "instruktur",
  "komisariat",
  "peserta",
];

/**
 * Tujuan navigasi per label menu. Item tanpa tujuan untuk role tersebut
 * ditampilkan sebagai tombol "Pratinjau navigasi". Satu-satunya sumber
 * kebenaran untuk pemetaan label → href (sebelumnya kondisi berantai).
 */
const navDestinations: { label: string; href: string; roles: AppRole[] }[] = [
  { label: "Pengguna", href: "/dashboard/pengguna", roles: ["admin_system"] },
  {
    label: "Komisariat",
    href: "/dashboard/komisariat",
    roles: ["admin_system"],
  },
  {
    label: "Kegiatan DAD",
    href: "/dashboard/kegiatan",
    roles: ["observer", "admin_system", "instruktur"],
  },
  {
    label: "Peserta",
    href: "/dashboard/peserta",
    roles: ["observer", "admin_system", "instruktur"],
  },
  {
    label: "Pengaturan Penilaian",
    href: "/dashboard/penilaian",
    roles: ["admin_system", "bidang_kader"],
  },
  {
    label: "Kerangka DAD",
    href: "/dashboard/kerangka",
    roles: ["admin_system", "bidang_kader", "observer", "instruktur"],
  },
  {
    label: "Seleksi Komisariat",
    href: "/dashboard/seleksi-komisariat",
    roles: ["admin_system", "observer"],
  },
  {
    label: "Evaluasi Kolektif",
    href: "/dashboard/evaluasi",
    roles: ["admin_system", "bidang_kader", "instruktur"],
  },
  {
    label: "Analitik & Rekap",
    href: "/dashboard/analitik",
    roles: ["admin_system", "bidang_kader"],
  },
  {
    label: "Laporan & Rapor",
    href: "/dashboard/laporan",
    roles: ["admin_system", "bidang_kader", "instruktur", "peserta"],
  },
  {
    label: "Impor Hasil Tes",
    href: "/dashboard/impor-tes",
    roles: ["admin_system"],
  },
  {
    label: "Pengajuan Peserta",
    href: "/dashboard/pengajuan",
    roles: ["komisariat"],
  },
  {
    label: "Observasi",
    href: "/dashboard/observasi",
    roles: ["observer", "admin_system", "instruktur"],
  },
  {
    label: "Profil Peserta",
    href: "/dashboard/profil-peserta",
    roles: ["instruktur"],
  },
  {
    label: "Profil Instruktur",
    href: "/dashboard/profil-instruktur",
    roles: NON_PUBLIC_ROLES,
  },
  {
    label: "Profil saya",
    href: "/dashboard/profil",
    roles: NON_PUBLIC_ROLES,
  },
];

function navHref(label: string, role: AppRole): string | null {
  const destination = navDestinations.find(
    (item) => item.label === label && item.roles.includes(role),
  );
  return destination?.href ?? null;
}
export function RoleDashboard({
  role,
  displayName,
  isPublic = false,
  assessmentData = null,
  instructorAssignments = [],
  instructorParticipantEvents = [],
  phase7Home = null,
}: DashboardProps) {
  const [active, setActive] = useState("Dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const items =
    role === "public"
      ? menuByRole[role]
      : [
          ...menuByRole[role],
          ...(role === "instruktur"
            ? []
            : [
                {
                  label: "Profil Instruktur",
                  icon: GraduationCap,
                  group: "INFORMASI",
                },
              ]),
          { label: "Profil saya", icon: UserRound, group: "AKUN" },
        ];
  const groups = [...new Set(items.map((item) => item.group))];
  const pageTitle: Record<AppRole, string> = {
    public: "Informasi DAD IMM Kota Bandung",
    admin_system: "Ringkasan sistem",
    bidang_kader: "Pantau proses kaderisasi.",
    observer: "Kegiatan dan jadwal observasi",
    instruktur: "Rekap hasil penilaian",
    komisariat: "Kegiatan komisariat Anda",
    peserta: "Perkembangan Anda",
  };
  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            i<span>•</span>
          </div>
          <div>
            <strong>IMM Observer</strong>
            <small>KOTA BANDUNG</small>
          </div>
          <button
            className="mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Tutup menu"
          >
            <X size={23} aria-hidden="true" />
          </button>
        </div>
        <div className="event-switch">
          <span className="event-dot" />
          <div>
            <small>{isPublic ? "PORTAL INFORMASI" : "KEGIATAN AKTIF"}</small>
            <strong>{isPublic ? "Informasi DAD" : "Kegiatan DAD"}</strong>
          </div>
        </div>
        <nav aria-label="Navigasi utama">
          {groups.map((group) => (
            <div className="nav-group" key={group}>
              <p>{group}</p>
              {items
                .filter((item) => item.group === group)
                .map((item) => {
                  const href = navHref(item.label, role);
                  if (href) {
                    const isCurrent = pathname === href;
                    return (
                      <Link
                        key={item.label}
                        className={`nav-link ${isCurrent ? "active" : ""}`}
                        href={href}
                        aria-current={isCurrent ? "page" : undefined}
                      >
                        <item.icon
                          className="nav-icon"
                          aria-hidden="true"
                          size={17}
                          strokeWidth={1.8}
                        />
                        {item.label}
                      </Link>
                    );
                  }
                  return (
                    <button
                      key={item.label}
                      className={`nav-link ${active === item.label ? "active" : ""}`}
                      aria-current={active === item.label ? "page" : undefined}
                      onClick={() => {
                        setActive(item.label);
                        setMobileOpen(false);
                      }}
                    >
                      <item.icon
                        className="nav-icon"
                        aria-hidden="true"
                        size={17}
                        strokeWidth={1.8}
                      />
                      {item.label}
                    </button>
                  );
                })}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div>
            <strong>Butuh bantuan?</strong>
            <small>Hubungi Admin atau panitia kegiatan</small>
          </div>
        </div>
      </aside>
      {mobileOpen && (
        <button
          className="scrim"
          onClick={() => setMobileOpen(false)}
          aria-label="Tutup navigasi"
        />
      )}
      <section className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu"
              onClick={() => setMobileOpen(true)}
              aria-label="Buka menu"
            >
              <Menu size={19} aria-hidden="true" />
            </button>
            <div className="breadcrumb">
              Ruang kerja <span>/</span> <b>{active}</b>
            </div>
          </div>
          <div className="topbar-right">
            {!isPublic && (
              <span className="safe-pill">
                <i /> Sesi terverifikasi
              </span>
            )}
            {!isPublic && (
              <div className="profile">
                <div className="avatar">
                  {displayName?.slice(0, 2).toUpperCase() ?? "AK"}
                </div>
                <div className="profile-text">
                  <strong>{displayName ?? "Akun pengguna"}</strong>
                  <small>{labels[role]}</small>
                </div>
              </div>
            )}
            {!isPublic && (
              <form action="/auth/signout" method="post">
                <button className="signout-button" type="submit">
                  Keluar
                </button>
              </form>
            )}
          </div>
        </header>
        <div className="content">
          <div className="welcome-row">
            <div>
              <div className="eyebrow">
                <span /> {isPublic ? "PORTAL PUBLIK" : "DASHBOARD KEGIATAN"}
              </div>
              <h1>{active === "Dashboard" ? pageTitle[role] : active}</h1>
              <p className="intro">
                {isPublic
                  ? "Informasi publik Pelatihan Kader DAD IMM Kota Bandung."
                  : `Ruang kerja ${labels[role]}.`}
              </p>
            </div>
            {isPublic && (
              <Link className="period-button" href="/login">
                Login pengguna <span>→</span>
              </Link>
            )}
          </div>
          {active !== "Dashboard" ? (
            <section className="event-manage-card empty-state">
              <span className="sample-tag">MENU DALAM PENGEMBANGAN</span>
              <h2>{active}</h2>
              <p>
                Halaman <b>{active}</b> belum tersedia pada tahap ini. Menu ini
                hanya pratinjau dan tidak menampilkan data apa pun.
              </p>
              <button
                type="button"
                className="text-button"
                onClick={() => setActive("Dashboard")}
              >
                ← Kembali ke Ringkasan
              </button>
            </section>
          ) : (
            <>
              {phase7Home ? (
                <Phase7DashboardHome data={phase7Home} />
              ) : (
                <>
                  <DashboardContent
                    role={role}
                    onNavigate={setActive}
                    instructorAssignments={instructorAssignments}
                  />
                  {assessmentData && (
                    <DashboardAssessmentResults data={assessmentData} />
                  )}
                </>
              )}
              {role === "instruktur" && (
                <InstructorDutyDashboard
                  assignments={instructorAssignments}
                  participantEvents={instructorParticipantEvents}
                />
              )}
            </>
          )}
          <footer className="page-footer">
            <span>
              IMM Observer <b>·</b> Tahap uji coba
            </span>
            <span>Seluruh data pada fase ini bersifat simulasi</span>
          </footer>
        </div>
      </section>
    </main>
  );
}

function Phase7DashboardHome({ data }: { data: Phase7Home }) {
  if (data.kind === "staff")
    return (
      <>
        <div className="section-heading role-heading">
          <div>
            <h2>Ringkasan kegiatan dan hasil final</h2>
            <p>
              Data berasal dari peserta dan snapshot evaluasi di basis data.
            </p>
          </div>
        </div>
        <div className="users-metrics-grid">
          <article>
            <small>Kegiatan dapat diakses</small>
            <strong>{data.events.length}</strong>
          </article>
          <article>
            <small>Peserta</small>
            <strong>
              {data.events.reduce((sum, item) => sum + item.participants, 0)}
            </strong>
          </article>
          <article>
            <small>Sesi/rubrik aktif</small>
            <strong>
              {data.events.reduce((sum, item) => sum + item.sessions, 0)}
            </strong>
          </article>
          <article>
            <small>Penilai ditugaskan</small>
            <strong>
              {data.events.reduce((sum, item) => sum + item.reviewers, 0)}
            </strong>
          </article>
          <article>
            <small>Kiriman asesmen</small>
            <strong>
              {data.events.reduce(
                (sum, item) => sum + item.assessmentSubmissions,
                0,
              )}
            </strong>
          </article>
          <article>
            <small>Rapor finalized</small>
            <strong>
              {data.events.reduce((sum, item) => sum + item.finalized, 0)}
            </strong>
          </article>
          <article>
            <small>Rapor published</small>
            <strong>
              {data.events.reduce((sum, item) => sum + item.published, 0)}
            </strong>
          </article>
          <article>
            <small>Provisional</small>
            <strong>
              {data.events.reduce((sum, item) => sum + item.provisional, 0)}
            </strong>
          </article>
          <article>
            <small>Lulus</small>
            <strong>
              {data.events.reduce((sum, item) => sum + item.passed, 0)}
            </strong>
          </article>
          <article>
            <small>Tidak lulus</small>
            <strong>
              {data.events.reduce((sum, item) => sum + item.notPassed, 0)}
            </strong>
          </article>
          <article>
            <small>Perlu pembahasan</small>
            <strong>
              {data.events.reduce(
                (sum, item) => sum + item.furtherDiscussion,
                0,
              )}
            </strong>
          </article>
        </div>
        <section className="event-manage-card">
          <h2>Monitoring per kegiatan</h2>
          {data.events.length ? (
            data.events.map((item) => (
              <article className="assignment-row" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <small>
                    {item.unavailable
                      ? "Data snapshot Fase 6 belum tersedia"
                      : `${item.participants} peserta · ${item.sessions} sesi · ${item.reviewers} penilai · ${item.assessmentSubmissions} kiriman · ${item.finalized} final · ${item.published} published · ${item.provisional} provisional · rata-rata ${item.averageScore === null ? "—" : item.averageScore.toFixed(1)}`}
                    <br />
                    Aktivitas asesmen terakhir:{" "}
                    {item.latestActivity
                      ? new Date(item.latestActivity).toLocaleString("id-ID")
                      : "belum ada"}
                  </small>
                </div>
                <Link
                  className="text-button"
                  href={`/dashboard/laporan?eventId=${item.id}`}
                >
                  Buka dashboard laporan →
                </Link>
              </article>
            ))
          ) : (
            <p>Belum ada kegiatan dengan akses untuk akun ini.</p>
          )}
        </section>
      </>
    );
  if (data.kind === "personal")
    return (
      <>
        <div className="section-heading role-heading">
          <div>
            <h2>Progres penilaian saya</h2>
            <p>Hanya status kiriman milik akun Anda yang ditampilkan.</p>
          </div>
        </div>
        <div className="users-metrics-grid">
          <article>
            <small>Total form</small>
            <strong>{data.unavailable ? "—" : data.total}</strong>
          </article>
          <article>
            <small>Peserta yang dinilai</small>
            <strong>
              {data.unavailable ? "—" : data.assessedParticipants}
            </strong>
          </article>
          <article>
            <small>Draft</small>
            <strong>{data.unavailable ? "—" : data.draft}</strong>
          </article>
          <article>
            <small>Submitted</small>
            <strong>{data.unavailable ? "—" : data.submitted}</strong>
          </article>
          <article>
            <small>Finalized</small>
            <strong>{data.unavailable ? "—" : data.finalized}</strong>
          </article>
        </div>
        <section className="event-manage-card">
          <h2>Form yang pernah Anda buka</h2>
          {data.sessions.length ? (
            <div className="competency-matrix-scroll">
              <table className="competency-matrix">
                <thead>
                  <tr>
                    <th scope="col">Kegiatan</th>
                    <th scope="col">Sesi/materi</th>
                    <th scope="col">Status</th>
                    <th scope="col">Perubahan terakhir</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sessions.map((item, index) => (
                    <tr key={`${item.eventName}:${item.sessionName}:${index}`}>
                      <th scope="row">{item.eventName}</th>
                      <td>{item.sessionName}</td>
                      <td>{item.status}</td>
                      <td>
                        {item.updatedAt
                          ? new Date(item.updatedAt).toLocaleString("id-ID")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>Belum ada form penilaian yang disimpan.</p>
          )}
          <p>
            Untuk melanjutkan atau melengkapi penilaian, buka menu Observasi.
            Dashboard ini tidak menampilkan catatan atau nilai Observer lain.
          </p>
          <Link className="text-button" href="/dashboard/observasi">
            Buka penilaian →
          </Link>
        </section>
      </>
    );
  const report = data.report;
  return (
    <>
      <div className="section-heading role-heading">
        <div>
          <h2>Rapor pribadi</h2>
          <p>
            {report
              ? report.event?.name
              : "Belum ada rapor yang diterbitkan untuk akun ini."}
          </p>
        </div>
        <span className={report ? "agenda-status done" : "temporary-pill"}>
          {report ? "PUBLISHED" : "MENUNGGU HASIL"}
        </span>
      </div>
      {report ? (
        <div className="users-metrics-grid">
          <article>
            <small>Skor akhir</small>
            <strong>
              {Number(report.snapshot_data?.overall?.score ?? 0).toFixed(1)}/100
            </strong>
          </article>
          <article>
            <small>Keputusan</small>
            <strong>
              {decisionLabel(report.snapshot_data?.collective?.decision)}
            </strong>
          </article>
          <article>
            <small>Diterbitkan</small>
            <strong>
              {new Date(report.published_at).toLocaleDateString("id-ID")}
            </strong>
          </article>
          <article>
            <Link href="/dashboard/laporan">Buka rapor dan unduh PDF →</Link>
          </article>
        </div>
      ) : (
        <section className="event-manage-card">
          <p>
            Rapor akan muncul setelah akun Anda ditautkan ke data peserta dan
            hasil kegiatan diterbitkan. Hubungi Admin Sistem jika akun atau
            identitas kegiatan belum sesuai.
          </p>
        </section>
      )}
    </>
  );
}
