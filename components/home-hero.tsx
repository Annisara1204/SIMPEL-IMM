import Link from "next/link";
import { roleLabels } from "@/lib/navigation";
import type { AppRole } from "@/lib/roles";

const pageTitle: Record<AppRole, string> = {
  public: "Informasi DAD IMM Kota Bandung",
  admin_system: "Ringkasan sistem",
  bidang_kader: "Pantau proses kaderisasi",
  observer: "Kegiatan dan jadwal observasi",
  instruktur: "Rekap hasil penilaian",
  komisariat: "Kegiatan komisariat Anda",
  peserta: "Perkembangan Anda",
};

/** Hero halaman beranda — dipakai di / (publik) dan /dashboard (internal). */
export function HomeHero({
  role,
  isPublic = false,
}: {
  role: AppRole;
  isPublic?: boolean;
}) {
  return (
    <div className="welcome-row">
      <div>
        <div className="eyebrow">
          <span /> {isPublic ? "PORTAL PUBLIK" : "DASHBOARD KEGIATAN"}
        </div>
        <h1>{pageTitle[role]}</h1>
        <p className="intro">
          {isPublic
            ? "Informasi publik Pelatihan Kader DAD IMM Kota Bandung."
            : `Ruang kerja ${roleLabels[role]}.`}
        </p>
      </div>
      {isPublic && (
        <Link prefetch={false} className="period-button" href="/login">
          Login pengguna <span>→</span>
        </Link>
      )}
    </div>
  );
}
