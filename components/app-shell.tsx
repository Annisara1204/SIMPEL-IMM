"use client";

/**
 * App shell bersama: sidebar navigasi + topbar (breadcrumb dari URL, sesi,
 * Keluar). Dipakai oleh seluruh halaman /dashboard/* (via layout) dan portal
 * publik (/). Semua item menu adalah tautan nyata — tidak ada tombol mati.
 */
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
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
  type LucideIcon,
} from "lucide-react";
import {
  navHref,
  breadcrumbLabel,
  roleLabels,
  isActiveNav,
} from "@/lib/navigation";
import type { AppRole } from "@/lib/roles";

type NavItem = { label: string; icon: LucideIcon; group: string };
const PROFESSIONAL_MENU: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, group: "MENU UTAMA" },
];
const menuByRole: Record<AppRole, NavItem[]> = {
  public: [{ label: "Dashboard", icon: LayoutDashboard, group: "INFORMASI" }],
  admin_system: [
    ...PROFESSIONAL_MENU,
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
    { label: "Observasi", icon: Eye, group: "DATA & LAPORAN" },
    { label: "Seleksi Komisariat", icon: ClipboardCheck, group: "PENGELOLAAN" },
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
    ...PROFESSIONAL_MENU,
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
    { label: "Analitik & Rekap", icon: BarChart3, group: "DATA & LAPORAN" },
    { label: "Laporan & Rapor", icon: ClipboardList, group: "DATA & LAPORAN" },
  ],
  observer: [
    ...PROFESSIONAL_MENU,
    { label: "Kegiatan DAD", icon: CalendarDays, group: "MENU UTAMA" },
    { label: "Peserta", icon: UserRound, group: "MENU UTAMA" },
    { label: "Observasi", icon: Eye, group: "PEMANTAUAN" },
    { label: "Kerangka DAD", icon: FileText, group: "PEMANTAUAN" },
    { label: "Seleksi Komisariat", icon: ClipboardCheck, group: "PEMANTAUAN" },
  ],
  instruktur: [
    ...PROFESSIONAL_MENU,
    { label: "Profil Peserta", icon: UserRound, group: "MENU UTAMA" },
    { label: "Profil Instruktur", icon: GraduationCap, group: "MENU UTAMA" },
    { label: "Observasi", icon: Eye, group: "PENILAIAN" },
    { label: "Evaluasi Kolektif", icon: MessagesSquare, group: "PENILAIAN" },
    { label: "Laporan & Rapor", icon: ClipboardList, group: "PENILAIAN" },
    { label: "Kerangka DAD", icon: FileText, group: "PENILAIAN" },
  ],
  komisariat: [
    ...PROFESSIONAL_MENU,
    { label: "Pengajuan Peserta", icon: Upload, group: "MENU UTAMA" },
  ],
  peserta: [
    ...PROFESSIONAL_MENU,
    {
      label: "Laporan & Rapor",
      icon: ClipboardList,
      group: "INFORMASI PRIBADI",
    },
  ],
};

export function AppShell({
  role,
  displayName,
  isPublic = false,
  children,
}: {
  role: AppRole | null;
  displayName?: string;
  isPublic?: boolean;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const items =
    role === null
      ? []
      : role === "public"
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

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Lewati ke konten
      </a>
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
                  const href = navHref(item.label, role ?? "public");
                  if (!href) return null;
                  const isCurrent = isActiveNav(pathname, href);
                  return (
                    <Link
                      prefetch={false}
                      key={item.label}
                      className={`nav-link ${isCurrent ? "active" : ""}`}
                      href={href}
                      aria-current={isCurrent ? "page" : undefined}
                      onClick={() => setMobileOpen(false)}
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
              {isPublic ? "Publik" : "Dashboard"}{" "}
              <span aria-hidden="true">/</span>{" "}
              <b>{breadcrumbLabel(pathname)}</b>
            </div>
          </div>
          <div className="topbar-right">
            {!isPublic && role !== null && (
              <div className="profile">
                <div className="avatar">
                  {displayName?.slice(0, 2).toUpperCase() ?? "AK"}
                </div>
                <div className="profile-text">
                  <strong>{displayName ?? "Akun pengguna"}</strong>
                  <small>{role ? roleLabels[role] : "Akun pengguna"}</small>
                </div>
              </div>
            )}
            {!isPublic && role !== null && (
              <form action="/auth/signout" method="post">
                <button className="signout-button" type="submit">
                  Keluar
                </button>
              </form>
            )}
          </div>
        </header>
        <main id="main-content" className="content">
          {children}
        </main>
      </section>
    </div>
  );
}
