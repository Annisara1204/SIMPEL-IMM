import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { StaffEventSummaryRow } from "@/lib/supabase-rows";

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
    .is("archived_at", null)
    .order("starts_on", { ascending: false });
  const events = (eventsData ?? []) as AnalitikEvent[];

  const recaps: EventRecap[] = await Promise.all(
    events.map(async (event) => {
      const { data, error } = await supabase.rpc("get_staff_event_summary", {
        target_event_id: event.id,
      });
      const summary = (data?.[0] ?? null) as StaffEventSummaryRow | null;
      const finalized = summary?.finalized ?? 0;
      const passed = summary?.passed ?? 0;
      const notPassed = summary?.not_passed ?? 0;
      const furtherDiscussion = summary?.further_discussion ?? 0;
      return {
        id: event.id,
        name: event.name ?? "Kegiatan tanpa nama",
        startsOn: event.starts_on,
        participants: error ? null : (summary?.participants ?? 0),
        finalized,
        published: summary?.published ?? 0,
        decisions: {
          pass: passed,
          not_pass: notPassed,
          further_discussion: furtherDiscussion,
          undecided: Math.max(
            0,
            finalized - passed - notPassed - furtherDiscussion,
          ),
        },
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
    <div className="users-page">
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
          <div className="table-wrap">
            <table className="table">
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
    </div>
  );
}
