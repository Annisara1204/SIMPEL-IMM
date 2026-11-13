import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

type AnalitikEvent = {
  id: string;
  name: string | null;
  starts_on: string | null;
  ends_on: string | null;
};

type EventRecap = {
  id: string;
  name: string;
  startsOn: string | null;
  participants: number | null;
  finalized: number;
  published: number;
  decisions: Record<
    "pass" | "not_pass" | "further_discussion" | "undecided",
    number
  >;
};

const NON_SCORE_ROLES = ["admin_system", "bidang_kader"];

function emptyDecisions() {
  return { pass: 0, not_pass: 0, further_discussion: 0, undecided: 0 };
}

export default async function AnalitikPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", userId)
    .maybeSingle();
  const role = profile?.role ?? null;
  if (!role || !NON_SCORE_ROLES.includes(role)) redirect("/dashboard");

  const { data: eventsData } = await supabase
    .from("events")
    .select("id,name,starts_on,ends_on")
    .order("starts_on", { ascending: false });
  const events = (eventsData ?? []) as AnalitikEvent[];

  const recaps: EventRecap[] = await Promise.all(
    events.map(async (event) => {
      const [participantsResult, snapshotsResult, publicationsResult] =
        await Promise.all([
          supabase.rpc("get_event_assessment_participants", {
            target_event_id: event.id,
          }),
          supabase
            .from("assessment_snapshots")
            .select("id,participant_id,snapshot_data")
            .eq("event_id", event.id),
          supabase
            .from("assessment_report_publications")
            .select("participant_id,published_at")
            .eq("event_id", event.id),
        ]);

      const decisions = emptyDecisions();
      const finalizedParticipants = new Set<string>();
      for (const snapshot of snapshotsResult.data ?? []) {
        if (snapshot.participant_id)
          finalizedParticipants.add(snapshot.participant_id);
        const decision = (
          snapshot.snapshot_data as {
            collective?: { decision?: string };
          } | null
        )?.collective?.decision;
        if (
          decision === "pass" ||
          decision === "not_pass" ||
          decision === "further_discussion"
        )
          decisions[decision] += 1;
        else decisions.undecided += 1;
      }

      const publishedParticipants = new Set<string>();
      for (const publication of publicationsResult.data ?? []) {
        if (publication.participant_id)
          publishedParticipants.add(publication.participant_id);
      }

      return {
        id: event.id,
        name: event.name ?? "Kegiatan tanpa nama",
        startsOn: event.starts_on,
        participants: participantsResult.error
          ? null
          : (participantsResult.data ?? []).length,
        finalized: finalizedParticipants.size,
        published: publishedParticipants.size,
        decisions,
      };
    }),
  );

  const totals = recaps.reduce(
    (acc, recap) => {
      acc.events += 1;
      acc.participants += recap.participants ?? 0;
      acc.finalized += recap.finalized;
      acc.published += recap.published;
      acc.pass += recap.decisions.pass;
      acc.notPass += recap.decisions.not_pass;
      acc.furtherDiscussion += recap.decisions.further_discussion;
      return acc;
    },
    {
      events: 0,
      participants: 0,
      finalized: 0,
      published: 0,
      pass: 0,
      notPass: 0,
      furtherDiscussion: 0,
    },
  );

  return (
    <main className="users-page">
      <div className="users-heading">
        <div>
          <p className="login-eyebrow">DATA &amp; LAPORAN</p>
          <h1>Analitik &amp; Rekap</h1>
          <p>
            Rekap lintas kegiatan untuk pemantauan Bidang Kader dan Admin
            Sistem. Hanya menampilkan agregat: tidak memuat skor individu,
            catatan pribadi, atau bukti observasi.
          </p>
        </div>
        <span className="temporary-pill">AGREGAT · BUKAN DATA PRIBADI</span>
      </div>

      <section className="panel" aria-label="Total lintas kegiatan">
        <h2>Total lintas kegiatan</h2>
        <div className="metric-row">
          <div>
            <strong>{totals.events}</strong>
            <span>Kegiatan</span>
          </div>
          <div>
            <strong>{totals.participants}</strong>
            <span>Peserta</span>
          </div>
          <div>
            <strong>{totals.finalized}</strong>
            <span>Peserta final</span>
          </div>
          <div>
            <strong>{totals.published}</strong>
            <span>Rapor diterbitkan</span>
          </div>
          <div>
            <strong>{totals.pass}</strong>
            <span>Keputusan Lulus</span>
          </div>
          <div>
            <strong>{totals.notPass}</strong>
            <span>Tidak Lulus</span>
          </div>
          <div>
            <strong>{totals.furtherDiscussion}</strong>
            <span>Perlu Pembahasan</span>
          </div>
        </div>
      </section>

      <section className="panel" aria-label="Rekap per kegiatan">
        <h2>Rekap per kegiatan</h2>
        {recaps.length === 0 ? (
          <p className="empty-state">Belum ada kegiatan.</p>
        ) : (
          <div className="users-table-wrap">
            <table className="users-table">
              <caption className="data-caption">
                Rekap jumlah peserta, peserta final, rapor diterbitkan, dan
                distribusi keputusan per kegiatan
              </caption>
              <thead>
                <tr>
                  <th scope="col">Kegiatan</th>
                  <th scope="col">Peserta</th>
                  <th scope="col">Final</th>
                  <th scope="col">Rapor terbit</th>
                  <th scope="col">Lulus</th>
                  <th scope="col">Tidak Lulus</th>
                  <th scope="col">Perlu Pembahasan</th>
                </tr>
              </thead>
              <tbody>
                {recaps.map((recap) => (
                  <tr key={recap.id}>
                    <th scope="row">{recap.name}</th>
                    <td>{recap.participants ?? "—"}</td>
                    <td>{recap.finalized}</td>
                    <td>{recap.published}</td>
                    <td>{recap.decisions.pass}</td>
                    <td>{recap.decisions.not_pass}</td>
                    <td>
                      {recap.decisions.further_discussion +
                        recap.decisions.undecided}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="privacy-note">
          Rapor hanya dihitung dari publikasi eksplisit. Draft dan Submitted
          tidak menjadi hasil final.
        </p>
      </section>
    </main>
  );
}
