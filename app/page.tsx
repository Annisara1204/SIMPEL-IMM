import { AppShell } from "@/components/app-shell";
import { HomeHero } from "@/components/home-hero";
import { DashboardContent } from "@/components/simulated-panels";

export default function Home() {
  return (
    <AppShell role="public" isPublic>
      <HomeHero role="public" isPublic />
      <DashboardContent role="public" />
      <footer className="page-footer">
        <span>
          IMM Observer <b>·</b> Tahap uji coba
        </span>
        <span>Seluruh data pada fase ini bersifat simulasi</span>
      </footer>
    </AppShell>
  );
}
