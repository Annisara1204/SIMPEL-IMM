import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createEvent, updateEvent } from "./actions";

const statusNames = {
  planned: "Direncanakan",
  ongoing: "Berlangsung",
  completed: "Selesai",
} as const;

type ActivitiesPageProps = {
  searchParams: Promise<{ create?: string | string[] }>;
};

export default async function ActivitiesPage({
  searchParams,
}: ActivitiesPageProps) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
    return (
      <main className="setup-message">
        <h1>Supabase belum dikonfigurasi</h1>
        <p>Aplikasi belum siap digunakan. Hubungi Admin sistem.</p>
        <Link href="/login">Kembali ke login</Link>
      </main>
    );
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (!profile || !["admin_system", "observer"].includes(profile.role ?? ""))
    redirect("/dashboard");
  const params = await searchParams;
  const createStatus = Array.isArray(params.create)
    ? params.create[0]
    : params.create;
  const { data: assignments, error: assignmentError } =
    profile.role === "observer"
      ? await supabase
          .from("observer_assignments")
          .select("event_id")
          .eq("observer_id", userId)
      : { data: null, error: null };
  const assignedEventIds =
    assignments?.map((assignment) => assignment.event_id) ?? [];
  const eventQuery = supabase
    .from("events")
    .select(
      "id, name, theme, organizer, commissariat, location, starts_on, ends_on, status, participants(id)",
    )
    .order("starts_on", { ascending: false });
  const eventResult =
    profile.role === "observer"
      ? assignedEventIds.length
        ? await eventQuery.in("id", assignedEventIds)
        : { data: [], error: assignmentError }
      : await eventQuery;
  const events = eventResult.data;
  const error = eventResult.error ?? assignmentError;
  return (
    <main className="users-page">
      <Link className="users-back" href="/dashboard">
        ← Kembali ke dashboard
      </Link>
      <div className="users-heading">
        <div>
          <p className="login-eyebrow">KEGIATAN</p>
          <h1>Kegiatan DAD</h1>
          <p>
            {profile.role === "observer"
              ? "Hanya kegiatan yang ditugaskan kepada Anda ditampilkan."
              : "Kelola seluruh kegiatan dan peserta yang terhubung dengannya."}
          </p>
        </div>
        <span className="sample-tag">UJI COBA</span>
      </div>
      {createStatus === "success" && (
        <p className="users-notice">
          <strong>Kegiatan berhasil dibuat.</strong> Kegiatan itu sekarang
          tersedia di Pengaturan Penilaian dan Pengajuan Peserta.
        </p>
      )}
      {createStatus === "invalid" && (
        <p className="users-error">
          Periksa kembali nama, komisariat, lokasi, dan tanggal kegiatan.
        </p>
      )}
      {createStatus === "failed" && (
        <p className="users-error">
          Data belum dapat dibaca. Hubungi Admin sistem bila masalah berulang.
        </p>
      )}
      {profile.role === "admin_system" && (
        <section className="event-manage-card">
          <div className="event-manage-title">
            <div>
              <h2>Tambah kegiatan untuk trial</h2>
              <p>
                Isi informasi pelatihan yang akan datang. Kegiatan dibuat dengan
                status Direncanakan.
              </p>
            </div>
          </div>
          <form action={createEvent} className="event-edit-form">
            <label>
              Nama kegiatan
              <input
                required
                minLength={3}
                maxLength={120}
                name="name"
                defaultValue="PK IMM FEB UM Bandung"
              />
            </label>
            <label>
              Penyelenggara/Komisariat
              <input
                required
                minLength={2}
                maxLength={120}
                name="commissariat"
                defaultValue="PK IMM FEB UM Bandung"
              />
            </label>
            <label>
              Tema (opsional)
              <input
                maxLength={200}
                name="theme"
                placeholder="Tema pelatihan"
              />
            </label>
            <label>
              Nama penyelenggara (opsional)
              <input
                maxLength={160}
                name="organizer"
                placeholder="Nama organisasi penyelenggara"
              />
            </label>
            <label>
              Lokasi
              <input
                required
                minLength={2}
                maxLength={160}
                name="location"
                placeholder="Isi lokasi pelatihan"
              />
            </label>
            <label>
              Tanggal mulai
              <input required type="date" name="startsOn" />
            </label>
            <label>
              Tanggal selesai
              <input required type="date" name="endsOn" />
            </label>
            <button type="submit">Buat kegiatan</button>
          </form>
        </section>
      )}
      {error ? (
        <p className="users-error">
          Data belum dapat dibaca. Hubungi Admin sistem bila masalah berulang.
        </p>
      ) : !events?.length ? (
        <p className="users-empty">
          {profile.role === "observer"
            ? "Belum ada kegiatan yang ditugaskan kepada Anda. Minta Admin Sistem mengatur penugasan di Pengaturan Penilaian."
            : "Belum ada kegiatan."}
        </p>
      ) : (
        events.map((event) => (
          <section className="event-manage-card" key={event.id}>
            <div className="event-manage-title">
              <div>
                <h2>{event.name}</h2>
                <p>
                  {event.commissariat} · {event.location} ·{" "}
                  {new Date(`${event.starts_on}T00:00:00`).toLocaleDateString(
                    "id-ID",
                    { dateStyle: "medium" },
                  )}{" "}
                  –{" "}
                  {new Date(`${event.ends_on}T00:00:00`).toLocaleDateString(
                    "id-ID",
                    { dateStyle: "medium" },
                  )}
                </p>
              </div>
              <span className="agenda-status live">
                {statusNames[event.status as keyof typeof statusNames] ??
                  "Status tidak dikenal"}
              </span>
            </div>
            <p className="participant-total">
              <strong>{event.participants.length}</strong> peserta terdaftar
            </p>
            <details>
              <summary>Ubah informasi kegiatan</summary>
              <form action={updateEvent} className="event-edit-form">
                <input type="hidden" name="id" value={event.id} />
                {profile.role === "admin_system" && (
                  <label>
                    Nama kegiatan
                    <input
                      required
                      minLength={3}
                      maxLength={120}
                      name="name"
                      defaultValue={event.name}
                    />
                  </label>
                )}
                <label>
                  Komisariat
                  <input
                    required
                    maxLength={120}
                    name="commissariat"
                    defaultValue={event.commissariat}
                  />
                </label>
                <label>
                  Tema (opsional)
                  <input
                    maxLength={200}
                    name="theme"
                    defaultValue={event.theme ?? ""}
                  />
                </label>
                <label>
                  Nama penyelenggara (opsional)
                  <input
                    maxLength={160}
                    name="organizer"
                    defaultValue={event.organizer ?? ""}
                  />
                </label>
                <label>
                  Lokasi
                  <input
                    required
                    maxLength={160}
                    name="location"
                    defaultValue={event.location}
                  />
                </label>
                <label>
                  Tanggal mulai
                  <input
                    required
                    type="date"
                    name="startsOn"
                    defaultValue={event.starts_on}
                  />
                </label>
                <label>
                  Tanggal selesai
                  <input
                    required
                    type="date"
                    name="endsOn"
                    defaultValue={event.ends_on}
                  />
                </label>
                <label>
                  Status
                  <select name="status" defaultValue={event.status}>
                    <option value="planned">Direncanakan</option>
                    <option value="ongoing">Berlangsung</option>
                    <option value="completed">Selesai</option>
                  </select>
                </label>
                <button type="submit">Simpan kegiatan</button>
              </form>
            </details>
          </section>
        ))
      )}
      <p className="privacy-note">
        Observer hanya melihat kegiatan yang ditugaskan, dan tidak dapat
        mengubah nama kegiatan. Untuk trial ini, gunakan peserta, foto, dan
        hasil penilaian simulasi sampai akses, privasi, serta cadangan data
        diperiksa.
      </p>
    </main>
  );
}
