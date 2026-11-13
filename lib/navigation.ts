/** Navigasi bersama: peta label menu → tujuan, tanpa dependensi UI. */
import type { AppRole } from "./roles";

export const roleLabels: Record<AppRole, string> = {
  public: "Pengunjung Publik",
  admin_system: "Admin Sistem",
  bidang_kader: "Bidang Kader",
  observer: "Observer",
  instruktur: "Instruktur",
  komisariat: "Komisariat",
  peserta: "Peserta",
};

export const NON_PUBLIC_ROLES: AppRole[] = [
  "admin_system",
  "bidang_kader",
  "observer",
  "instruktur",
  "komisariat",
  "peserta",
];

/** Satu-satunya sumber pemetaan label menu → href. Item tanpa tujuan tidak
 * dirender sebagai menu (jangan tampilkan tombol mati). */
export const navDestinations: {
  label: string;
  href: string;
  roles: AppRole[];
}[] = [
  { label: "Dashboard", href: "/", roles: ["public"] },
  {
    label: "Dashboard",
    href: "/dashboard",
    roles: NON_PUBLIC_ROLES,
  },
  { label: "Pengguna", href: "/dashboard/pengguna", roles: ["admin_system"] },
  {
    label: "Komisariat",
    href: "/dashboard/komisariat",
    roles: ["admin_system"],
  },
  {
    label: "Kegiatan DAD",
    href: "/dashboard/kegiatan",
    roles: ["observer", "admin_system"],
  },
  {
    label: "Peserta",
    href: "/dashboard/peserta",
    roles: ["observer", "admin_system"],
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

export function navHref(label: string, role: AppRole): string | null {
  const destination = navDestinations.find(
    (item) => item.label === label && item.roles.includes(role),
  );
  return destination?.href ?? null;
}

/** Segmen path → label menu, untuk breadcrumb topbar. */
export function breadcrumbLabel(pathname: string): string {
  if (pathname === "/") return "Beranda";
  if (pathname === "/dashboard") return "Ringkasan";
  const destination = navDestinations.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}?`),
  );
  if (destination) return destination.label;
  const segment = pathname.split("/").filter(Boolean).at(-1) ?? "";
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}
