"use client";

import { useState } from "react";
import { DashboardAssessmentResults } from "./dashboard-assessment-results";
import type { DashboardAssessmentData } from "@/lib/dashboard-results";
import { InstructorDutyDashboard, type InstructorAssignment, type InstructorParticipantEvent } from "./instructor-duty-dashboard";
import { instructorPositionLabel } from "@/lib/instructor-roles";

export type AppRole = "admin_system" | "bidang_kader" | "observer" | "instruktur" | "komisariat" | "peserta" | "public";
type DashboardProps = { role: AppRole; displayName?: string; isPublic?: boolean; assessmentData?: DashboardAssessmentData | null; instructorAssignments?: InstructorAssignment[]; instructorParticipantEvents?: InstructorParticipantEvent[] };
type NavItem = { label: string; icon: string; group: string };

const labels: Record<AppRole, string> = {
  public: "Pengunjung Publik", admin_system: "Admin Sistem", bidang_kader: "Bidang Kader",
  observer: "Observer", instruktur: "Instruktur", komisariat: "Komisariat", peserta: "Peserta",
};
const menuByRole: Record<AppRole, NavItem[]> = {
  public: [
    { label: "Dashboard", icon: "▦", group: "INFORMASI" }, { label: "Jadwal DAD", icon: "◷", group: "INFORMASI" }, { label: "Profil Instruktur", icon: "♧", group: "INFORMASI" },
  ],
  admin_system: [
    { label: "Dashboard", icon: "▦", group: "MENU UTAMA" }, { label: "Pengguna", icon: "♧", group: "PENGELOLAAN" }, { label: "Komisariat", icon: "⌂", group: "PENGELOLAAN" }, { label: "Kegiatan DAD", icon: "▣", group: "PENGELOLAAN" }, { label: "Peserta", icon: "♙", group: "PENGELOLAAN" }, { label: "Pengaturan Penilaian", icon: "☷", group: "PENGELOLAAN" }, { label: "Kerangka DAD", icon: "▤", group: "PENGELOLAAN" }, { label: "Seleksi Komisariat", icon: "▤", group: "PENGELOLAAN" }, { label: "Pengaturan Sistem", icon: "⚙", group: "PENGELOLAAN" }, { label: "Impor Hasil Tes", icon: "⇧", group: "DATA & LAPORAN" },
  ],
  bidang_kader: [
    { label: "Dashboard", icon: "▦", group: "MENU UTAMA" }, { label: "Kegiatan DAD", icon: "▣", group: "MENU UTAMA" }, { label: "Peserta", icon: "♙", group: "MENU UTAMA" },
    { label: "Observasi", icon: "◉", group: "PEMANTAUAN" }, { label: "Pengaturan Penilaian", icon: "☷", group: "PEMANTAUAN" }, { label: "Kerangka DAD", icon: "▤", group: "PEMANTAUAN" }, { label: "Analitik & Rekap", icon: "▥", group: "DATA & LAPORAN" },
  ],
  observer: [
    { label: "Dashboard", icon: "▦", group: "MENU UTAMA" }, { label: "Kegiatan DAD", icon: "▣", group: "MENU UTAMA" }, { label: "Peserta", icon: "♙", group: "MENU UTAMA" }, { label: "Observasi", icon: "◉", group: "PEMANTAUAN" }, { label: "Kerangka DAD", icon: "▤", group: "PEMANTAUAN" }, { label: "Seleksi Komisariat", icon: "▤", group: "PEMANTAUAN" },
  ],
  instruktur: [
    { label: "Dashboard", icon: "▦", group: "MENU UTAMA" }, { label: "Profil Peserta", icon: "♙", group: "MENU UTAMA" }, { label: "Profil Instruktur", icon: "♧", group: "MENU UTAMA" }, { label: "Observasi", icon: "◉", group: "PENILAIAN" }, { label: "Kerangka DAD", icon: "▤", group: "PENILAIAN" },
  ],
  komisariat: [
    { label: "Dashboard", icon: "▦", group: "MENU UTAMA" }, { label: "Pengajuan Peserta", icon: "⇧", group: "MENU UTAMA" }, { label: "Analitik & Rekap", icon: "▥", group: "DATA & LAPORAN" },
  ],
  peserta: [
    { label: "Dashboard", icon: "▦", group: "MENU UTAMA" }, { label: "Analitik & Rekap", icon: "▥", group: "INFORMASI PRIBADI" },
  ],
};
const agenda = [
  { day: "HARI 01", title: "Ideologi IMM dan Keislaman", time: "08.00 – 10.00", status: "Selesai", color: "done" },
  { day: "HARI 01", title: "Kemuhammadiyahan", time: "10.30 – 12.00", status: "Berlangsung", color: "live" },
  { day: "HARI 01", title: "Ke-IMM-an", time: "13.00 – 15.00", status: "Berikutnya", color: "next" },
];

function SampleTag() { return <span className="sample-tag">CONTOH SIMULASI</span>; }

function DashboardContent({ role, onNavigate, instructorAssignments = [] }: { role: AppRole; onNavigate: (page: string) => void; instructorAssignments?: InstructorAssignment[] }) {
  if (role === "instruktur") return <div className="section-heading role-heading"><div><h2>Tugas Instruktur</h2><p>{instructorAssignments.length ? [...new Set(instructorAssignments.map((item) => instructorPositionLabel(item.position)))].join(" · ") : "Menunggu penugasan per kegiatan dari Superadmin"}</p></div><span className="sample-tag">SUBROLE PER KEGIATAN</span></div>;
  if (role === "observer") return <>
    <div className="section-heading role-heading"><div><h2>Kegiatan yang ditugaskan</h2><p>Daftar kegiatan dan materi untuk Anda</p></div><SampleTag/></div>
    <div className="role-grid"><section className="panel"><div className="assigned-card"><div className="assigned-icon">▣</div><div className="assigned-copy"><span className="agenda-status live">Sedang berlangsung</span><h3>DAD Simulasi 2026</h3><p>Komisariat FEB · 3 hari · 8 materi</p><small>Peran Anda: Observer · 12 peserta</small></div><button className="text-button" onClick={() => onNavigate("Observasi")}>Buka penilaian →</button></div><div className="assigned-foot">Progres tugas Anda <strong>8 dari 12 peserta</strong><div className="bar-track"><i style={{ width: "67%" }}/></div></div></section>
      <section className="panel"><div className="panel-heading"><div><h2>Jadwal hari ini</h2><p>Agenda kegiatan yang ditugaskan</p></div><span className="date-chip">HARI 1</span></div>{agenda.map((item) => <div className="schedule-row" key={item.title}><span className={`schedule-dot ${item.color}`}/><div><small>{item.time}</small><strong>{item.title}</strong></div><span className={`agenda-status ${item.color}`}>{item.status}</span></div>)}</section></div>
  </>;

  if (role === "bidang_kader") return <>
    <div className="section-heading role-heading"><div><h2>Daftar kegiatan DAD</h2><p>Pantau status kegiatan dan perkembangan kaderisasi</p></div><SampleTag/></div>
    <div className="role-grid"><section className="panel"><div className="activity-row"><div className="assigned-icon">▣</div><div className="activity-copy"><small>24–26 Oktober 2026 · Komisariat FEB</small><h3>Darul Arqam Dasar</h3><p>8 materi · 6 Observer</p></div><span className="agenda-status live">Berlangsung</span><button className="text-button" onClick={() => onNavigate("Kegiatan DAD")}>Detail →</button></div><div className="activity-foot"><span>Status penilaian Observer</span><div className="mini-bar"><i style={{ width: "68%" }}/></div><b>68%</b></div></section>
      <section className="panel"><div className="panel-heading"><div><h2>Ringkasan peserta</h2><p>DAD Simulasi 2026</p></div><button className="text-button" onClick={() => onNavigate("Peserta")}>Lihat peserta →</button></div><div className="metric-row"><div><strong>48</strong><span>Peserta terdaftar</span></div><div><strong>32</strong><span>Sudah dinilai</span></div><div><strong>16</strong><span>Belum dinilai</span></div></div><div className="data-caption">Angka hanya untuk simulasi antarmuka</div></section></div>
  </>;

  if (role === "komisariat") return <>
    <div className="section-heading role-heading"><div><h2>Kegiatan komisariat Anda</h2><p>Informasi dan laporan sesuai akses Komisariat FEB</p></div><SampleTag/></div>
    <div className="role-grid"><section className="panel"><div className="activity-row"><div className="assigned-icon">▣</div><div className="activity-copy"><small>24–26 Oktober 2026</small><h3>Darul Arqam Dasar</h3><p>Komisariat FEB · 8 materi</p></div><span className="agenda-status live">Berlangsung</span></div><div className="data-caption">Hanya kegiatan yang terhubung dengan komisariat Anda.</div></section>
      <section className="panel"><div className="panel-heading"><div><h2>Rekap dan laporan</h2><p>Dokumen yang boleh diakses komisariat</p></div></div><div className="report-row"><span className="report-icon">▤</span><div><strong>Rekap kegiatan DAD</strong><small>Ringkasan umum · belum diterbitkan</small></div><span className="agenda-status next">Belum tersedia</span></div><div className="privacy-note">Nilai individu dan catatan observasi pribadi tidak ditampilkan di sini.</div></section></div>
  </>;

  if (role === "peserta") return <>
    <div className="section-heading role-heading"><div><h2>Perkembangan Anda</h2><p>Ringkasan pribadi untuk DAD Simulasi 2026</p></div><span className="temporary-pill">NILAI SEMENTARA</span></div>
    <div className="role-grid"><section className="panel participant-score"><div><small>RINGKASAN NILAI SEMENTARA</small><strong>78<span>/100</span></strong><p>Nilai ini belum menjadi hasil resmi.</p></div><div className="score-watermark">◌</div><SampleTag/></section>
      <section className="panel"><div className="panel-heading"><div><h2>Catatan pengembangan</h2><p>Masukan untuk mendukung proses belajar Anda</p></div></div><div className="development-note"><span>✦</span><p>Terus berlatih menyampaikan pendapat dengan runtut dan ikut aktif dalam diskusi kelompok.</p></div><div className="privacy-note">Ringkasan ini bukan data mentah per indikator.</div></section></div>
  </>;

  if (role === "admin_system") return <>
    <div className="section-heading role-heading"><div><h2>Ikhtisar sistem</h2><p>Pengguna dan kesiapan konfigurasi</p></div><SampleTag/></div>
    <div className="role-grid"><section className="panel"><div className="panel-heading"><div><h2>Jumlah pengguna per role</h2><p>Data simulasi untuk rancangan</p></div><button className="text-button" onClick={() => onNavigate("Pengguna")}>Kelola pengguna →</button></div><div className="user-role-list"><div><span>Observer</span><b>6</b></div><div><span>Bidang Kader</span><b>3</b></div><div><span>Komisariat</span><b>4</b></div><div><span>Peserta</span><b>48</b></div></div></section>
      <section className="panel"><div className="panel-heading"><div><h2>Status konfigurasi</h2><p>Komponen dasar sistem</p></div><button className="text-button" onClick={() => onNavigate("Pengaturan Sistem")}>Pengaturan →</button></div><div className="config-row"><span>Konfigurasi penilaian</span><span className="agenda-status next">Belum terhubung</span></div><div className="config-row"><span>Penyimpanan data</span><span className="agenda-status next">Belum terhubung</span></div><div className="config-row"><span>Login dan role</span><span className="agenda-status next">Belum terhubung</span></div><div className="data-caption">Status akan terisi setelah fitur backend dibuat.</div></section></div>
  </>;

  return <>
    <div className="section-heading role-heading"><div><h2>Informasi kegiatan DAD</h2><p>Kabar dan jadwal kegiatan kaderisasi</p></div><SampleTag/></div>
    <div className="role-grid public-grid"><section className="panel"><div className="panel-heading"><div><h2>Telah, sedang, dan akan berlangsung</h2><p>Informasi kegiatan yang dibuka untuk publik</p></div><button className="text-button" onClick={() => onNavigate("Jadwal DAD")}>Semua jadwal →</button></div><div className="public-event"><span className="agenda-status done">Telah diselenggarakan</span><strong>DAD Simulasi 2026 · Komisariat FEB</strong><small>24–26 Oktober 2026 · 8 materi</small></div><div className="public-event"><span className="agenda-status live">Sedang berlangsung</span><strong>Informasi kegiatan berjalan</strong><small>Detail jadwal akan ditampilkan setelah diumumkan.</small></div><div className="public-event"><span className="agenda-status next">Akan diselenggarakan</span><strong>Jadwal mendatang</strong><small>Belum ada kegiatan yang diumumkan.</small></div></section>
      <section className="panel"><div className="panel-heading"><div><h2>Profil instruktur</h2><p>Kenali para pemateri DAD</p></div><button className="text-button" onClick={() => onNavigate("Profil Instruktur")}>Semua profil →</button></div><div className="instructor-row"><div className="instructor-photo">IF</div><div><strong>Instruktur Simulasi 01</strong><small>Materi ideologi dan keislaman</small><a href="#profil-instruktur">Media sosial: contoh profil</a></div></div><div className="instructor-row"><div className="instructor-photo alt">IN</div><div><strong>Instruktur Simulasi 02</strong><small>Materi kemuhammadiyahan</small><a href="#profil-instruktur">Media sosial: contoh profil</a></div></div><div className="data-caption">Foto/nama/akun nyata hanya ditampilkan setelah disetujui instruktur.</div></section></div>
  </>;
}

export function RoleDashboard({ role, displayName, isPublic = false, assessmentData = null, instructorAssignments = [], instructorParticipantEvents = [] }: DashboardProps) {
  const [active, setActive] = useState("Dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = role === "public" ? menuByRole[role] : [...menuByRole[role], ...(role === "instruktur" ? [] : [{ label: "Profil Instruktur", icon: "♧", group: "INFORMASI" }]), { label: "Profil saya", icon: "♙", group: "AKUN" }];
  const groups = [...new Set(items.map((item) => item.group))];
  const pageTitle: Record<AppRole, string> = { public: "Informasi DAD IMM Kota Bandung", admin_system: "Ringkasan sistem", bidang_kader: "Pantau proses kaderisasi.", observer: "Kegiatan dan jadwal observasi", instruktur: "Rekap hasil penilaian", komisariat: "Kegiatan komisariat Anda", peserta: "Perkembangan Anda" };
  return <main className="app-shell">
    <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
      <div className="brand"><div className="brand-mark">i<span>•</span></div><div><strong>IMM Observer</strong><small>KOTA BANDUNG</small></div><button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Tutup menu">×</button></div>
      <div className="event-switch"><span className="event-dot"/><div><small>{isPublic ? "PORTAL INFORMASI" : "KEGIATAN AKTIF"}</small><strong>{isPublic ? "Informasi DAD" : "DAD Simulasi 2026"}</strong></div><span className="chevron">⌄</span></div>
      <nav aria-label="Navigasi utama">{groups.map((group) => <div className="nav-group" key={group}><p>{group}</p>{items.filter((item) => item.group === group).map((item) => (item.label === "Pengguna" && role === "admin_system") || (item.label === "Komisariat" && role === "admin_system") || (item.label === "Pengaturan Penilaian" && ["admin_system", "bidang_kader"].includes(role)) || (item.label === "Kerangka DAD" && ["admin_system", "bidang_kader", "observer", "instruktur"].includes(role)) || (item.label === "Impor Hasil Tes" && role === "admin_system") || (item.label === "Pengajuan Peserta" && role === "komisariat") || (item.label === "Seleksi Komisariat" && ["admin_system", "observer"].includes(role)) || (["observer", "admin_system", "instruktur"].includes(role) && ["Kegiatan DAD", "Peserta", "Observasi"].includes(item.label)) || (item.label === "Profil Peserta" && role === "instruktur") || (item.label === "Profil Instruktur" && role !== "public") || (item.label === "Profil saya" && role !== "public") ? <a key={item.label} className="nav-link" href={item.label === "Pengguna" ? "/dashboard/pengguna" : item.label === "Komisariat" ? "/dashboard/komisariat" : item.label === "Pengaturan Penilaian" ? "/dashboard/penilaian" : item.label === "Kerangka DAD" ? "/dashboard/kerangka" : item.label === "Impor Hasil Tes" ? "/dashboard/impor-tes" : item.label === "Pengajuan Peserta" ? "/dashboard/pengajuan" : item.label === "Seleksi Komisariat" ? "/dashboard/seleksi-komisariat" : item.label === "Observasi" ? "/dashboard/observasi" : item.label === "Profil saya" ? "/dashboard/profil" : item.label === "Profil Peserta" ? "/dashboard/profil-peserta" : item.label === "Profil Instruktur" ? "/dashboard/profil-instruktur" : item.label === "Peserta" ? "/dashboard/peserta" : "/dashboard/kegiatan"}><span className="nav-icon">{item.icon}</span>{item.label}</a> : <button key={item.label} className={`nav-link ${active === item.label ? "active" : ""}`} onClick={() => { setActive(item.label); setMobileOpen(false); }}><span className="nav-icon">{item.icon}</span>{item.label}{item.label === "Observasi" && <span className="nav-count">3</span>}</button>)}</div>)}</nav>
      <div className="sidebar-bottom"><div className="help-icon">?</div><div><strong>Butuh bantuan?</strong><small>Panduan penggunaan</small></div><span className="arrow">↗</span></div>
    </aside>
    {mobileOpen && <button className="scrim" onClick={() => setMobileOpen(false)} aria-label="Tutup navigasi"/>}
    <section className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Buka menu">☰</button><div className="breadcrumb">Ruang kerja <span>/</span> <b>{active}</b></div></div><div className="topbar-right">{!isPublic && <span className="safe-pill"><i/> Sesi terverifikasi</span>}{!isPublic && <div className="profile"><div className="avatar">{displayName?.slice(0, 2).toUpperCase() ?? "AK"}</div><div className="profile-text"><strong>{displayName ?? "Akun pengguna"}</strong><small>{labels[role]}</small></div></div>}{!isPublic && <form action="/auth/signout" method="post"><button className="signout-button" type="submit">Keluar</button></form>}</div></header>
      <div className="content"><div className="welcome-row"><div><div className="eyebrow"><span/> {isPublic ? "PORTAL PUBLIK" : "DASHBOARD KEGIATAN"}</div><h1>{active === "Dashboard" ? pageTitle[role] : active}</h1><p className="intro">{isPublic ? "Informasi publik Pelatihan Kader DAD IMM Kota Bandung." : `Ruang kerja ${labels[role]}.`}</p></div>{isPublic && <a className="period-button login-link" href="/login">Login pengguna <span>→</span></a>}</div>
        {active !== "Dashboard" && <div className="preview-banner"><span>ⓘ</span><div><strong>Pratinjau navigasi</strong><p>Halaman <b>{active}</b> akan tersedia pada tahap pengembangan berikutnya.</p></div></div>}
        <DashboardContent role={role} onNavigate={setActive} instructorAssignments={instructorAssignments}/>
        {active === "Dashboard" && role === "instruktur" && <InstructorDutyDashboard assignments={instructorAssignments} participantEvents={instructorParticipantEvents}/>}
        {active === "Dashboard" && assessmentData && <DashboardAssessmentResults data={assessmentData}/>}
        <footer className="page-footer"><span>IMM Observer <b>·</b> Tahap uji coba</span><span>Data simulasi untuk keperluan pengembangan</span></footer>
      </div>
    </section>
  </main>;
}
