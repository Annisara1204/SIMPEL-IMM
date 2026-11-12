import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardAssessmentResults } from "@/components/dashboard-assessment-results";
import { createClient } from "@/lib/supabase/server";
import { signMany } from "@/lib/signed-urls";
import { loadDashboardAssessmentData } from "@/lib/dashboard-results";
import { PrivateImg } from "@/components/private-img";

export default async function InstructorParticipantProfilesPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
    redirect("/login");
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.role !== "instruktur") redirect("/dashboard");

  const [{ data: assignments }, { eventId: requestedId }] = await Promise.all([
    supabase
      .from("instructor_event_assignments")
      .select("event_id")
      .eq("instructor_id", userId),
    searchParams,
  ]);
  const eventIds = [
    ...new Set((assignments ?? []).map((assignment) => assignment.event_id)),
  ];
  const { data: events, error } = eventIds.length
    ? await supabase
        .from("events")
        .select(
          "id, name, starts_on, participants(id, display_name, commissariat, commissariat_id, major, entry_year, position, photo_path, commissariat_record:commissariats(name))",
        )
        .in("id", eventIds)
        .order("starts_on", { ascending: false })
    : { data: [], error: null };
  const selected =
    events?.find((event) => event.id === requestedId) ?? events?.[0] ?? null;
  const results = await loadDashboardAssessmentData(supabase, "instruktur");
  const selectedResults = results
    ? {
        ...results,
        results: results.results.filter(
          (result) => result.eventId === selected?.id,
        ),
      }
    : null;
  const participantPhotoUrls = await signMany(
    supabase,
    "participant-photos",
    (selected?.participants ?? []).map((person) => person.photo_path),
    1800,
  );
  const people = (selected?.participants ?? []).map((person) => ({
    ...person,
    photoUrl: person.photo_path
      ? (participantPhotoUrls.get(person.photo_path) ?? null)
      : null,
  }));

  return (
    <main className="users-page">
      <Link className="users-back" href="/dashboard">
        ← Kembali ke dashboard
      </Link>
      <div className="users-heading">
        <div>
          <p className="login-eyebrow">PROFIL KEGIATAN</p>
          <h1>Profil Peserta</h1>
          <p>
            Pilih kegiatan DAD yang ditugaskan kepada akun Anda untuk melihat
            profil dan hasil penilaian peserta.
          </p>
        </div>
        <span className="sample-tag">AKSES SESUAI PENUGASAN</span>
      </div>
      {!events?.length ? (
        <p className="users-empty">
          Belum ada kegiatan yang ditugaskan kepada akun Anda.
        </p>
      ) : (
        <>
          <form
            method="get"
            className="event-manage-card"
            style={{
              display: "flex",
              gap: 12,
              alignItems: "end",
              flexWrap: "wrap",
            }}
          >
            <label style={{ display: "grid", gap: 6, minWidth: 280 }}>
              Kegiatan DAD
              <select
                name="eventId"
                defaultValue={selected?.id}
                style={{
                  height: 40,
                  border: "1px solid #ded7da",
                  borderRadius: 7,
                  padding: "0 10px",
                  background: "white",
                }}
              >
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="period-button" type="submit">
              Tampilkan
            </button>
          </form>
          {error ? (
            <p className="users-error">
              Data belum dapat dibaca. Hubungi Admin sistem bila masalah
              berulang.
            </p>
          ) : (
            <section className="event-manage-card">
              <div className="event-manage-title">
                <div>
                  <h2>{selected?.name}</h2>
                  <p>{people.length} peserta</p>
                </div>
              </div>
              {!people.length ? (
                <p className="users-empty">
                  Belum ada peserta di kegiatan ini.
                </p>
              ) : (
                <div className="instructor-duty-grid">
                  {people.map((person) => (
                    <article
                      className="panel instructor-duty-card"
                      key={person.id}
                    >
                      <div className="panel-heading">
                        {person.photoUrl ? (
                          <PrivateImg
                            className="participant-photo-thumb"
                            src={person.photoUrl}
                            alt={`Foto ${person.display_name}`}
                          />
                        ) : (
                          <span className="photo-missing">
                            Foto belum tersedia
                          </span>
                        )}
                        <div>
                          <h3>{person.display_name}</h3>
                          <p>
                            {person.commissariat_record?.[0]?.name ??
                              person.commissariat ??
                              "Komisariat belum diisi"}
                          </p>
                        </div>
                      </div>
                      <div className="instructor-duty-list">
                        <p>
                          <b>Jurusan:</b> {person.major || "Belum diisi"}
                        </p>
                        <p>
                          <b>Tahun angkatan:</b> {person.entry_year || "—"}
                        </p>
                        <p>
                          <b>Jabatan:</b> {person.position || "—"}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
          {selectedResults && (
            <DashboardAssessmentResults data={selectedResults} />
          )}
        </>
      )}
      <p className="privacy-note">
        Semua subrole Instruktur dapat melihat profil dan nilai individu pada
        kegiatan yang ditugaskan. Catatan observasi rinci tetap dibuka melalui
        menu Observasi. Foto memakai tautan sementara dan akses privat.
      </p>
    </main>
  );
}
