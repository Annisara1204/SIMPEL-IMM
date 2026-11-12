import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  addParticipant,
  editParticipant,
  removeParticipant,
} from "../kegiatan/actions";
import { PrivateImg } from "@/components/private-img";

function CommissariatOptions({
  commissariats,
  selectedId,
}: {
  commissariats: { id: string; name: string }[];
  selectedId?: string | null;
}) {
  return (
    <select name="commissariatId" required defaultValue={selectedId ?? ""}>
      <option value="" disabled>
        Pilih Komisariat
      </option>
      {commissariats.map((item) => (
        <option key={item.id} value={item.id}>
          {item.name}
        </option>
      ))}
    </select>
  );
}

export default async function ParticipantsPage() {
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
  const [{ data: events, error }, { data: commissariats }] = await Promise.all([
    supabase
      .from("events")
      .select(
        "id, name, participants(id, display_name, commissariat, commissariat_id, student_number, group_name, major, entry_year, position, photo_path, created_at, commissariat_record:commissariats(name))",
      )
      .order("starts_on", { ascending: false }),
    supabase
      .from("commissariats")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
  ]);
  const eventsWithPhotos = await Promise.all(
    (events ?? []).map(async (event) => ({
      ...event,
      participants: await Promise.all(
        event.participants.map(async (person) => {
          if (!person.photo_path) return { ...person, photoUrl: null };
          const { data } = await supabase.storage
            .from("participant-photos")
            .createSignedUrl(person.photo_path, 3600);
          return { ...person, photoUrl: data?.signedUrl ?? null };
        }),
      ),
    })),
  );
  return (
    <main className="users-page">
      <Link className="users-back" href="/dashboard">
        ← Kembali ke dashboard
      </Link>
      <div className="users-heading">
        <div>
          <p className="login-eyebrow">PROFIL PESERTA</p>
          <h1>Peserta</h1>
          <p>
            Profil peserta untuk tiap kegiatan. Kolom bertanda wajib harus
            dilengkapi.
          </p>
        </div>
      </div>
      {error ? (
        <p className="users-error">
          Data belum dapat dibaca. Hubungi Admin sistem bila masalah berulang.
        </p>
      ) : !eventsWithPhotos.length ? (
        <p className="users-empty">Belum ada kegiatan untuk ditampilkan.</p>
      ) : (
        eventsWithPhotos.map((event) => (
          <section className="event-manage-card" key={event.id}>
            <div className="event-manage-title">
              <div>
                <h2>{event.name}</h2>
                <p>{event.participants.length} peserta</p>
              </div>
            </div>
            {!commissariats?.length && (
              <p className="users-error">
                Belum ada Komisariat aktif. Minta Admin Sistem menambahkan atau
                mengaktifkan Komisariat melalui menu Komisariat.
              </p>
            )}
            {!!commissariats?.length && (
              <form
                action={addParticipant}
                className="participant-add-form participant-profile-form"
              >
                <input type="hidden" name="eventId" value={event.id} />
                <label>
                  Nama lengkap *
                  <input
                    required
                    minLength={2}
                    maxLength={120}
                    name="displayName"
                    placeholder="Contoh: Peserta Simulasi 06"
                  />
                </label>
                <label>
                  NIM (opsional)
                  <input
                    maxLength={40}
                    name="studentNumber"
                    placeholder="Nomor induk mahasiswa"
                  />
                </label>
                <label>
                  Kelompok (opsional)
                  <input
                    maxLength={100}
                    name="groupName"
                    placeholder="Contoh: Kelompok 1"
                  />
                </label>
                <label>
                  Asal Komisariat *
                  <CommissariatOptions commissariats={commissariats} />
                </label>
                <label>
                  Jurusan/program studi *
                  <input
                    required
                    minLength={2}
                    maxLength={120}
                    name="major"
                    placeholder="Contoh: Program Studi Simulasi"
                  />
                </label>
                <label>
                  Tahun angkatan *
                  <input
                    required
                    type="number"
                    min={1900}
                    max={2100}
                    step={1}
                    name="entryYear"
                    placeholder="Contoh: 2024"
                  />
                </label>
                <label>
                  Jabatan (opsional)
                  <input
                    maxLength={120}
                    name="position"
                    placeholder="Contoh: Ketua Bidang"
                  />
                </label>
                <label>
                  Foto formal (opsional)
                  <input
                    type="file"
                    name="photo"
                    accept="image/jpeg,image/png"
                  />
                  <small>
                    Jika tersedia: jas IMM, latar putih. JPG/PNG, maks. 5 MB.
                  </small>
                </label>
                <button type="submit">Tambah peserta</button>
              </form>
            )}
            {event.participants.length ? (
              <div className="users-table-wrap">
                <table className="users-table participant-table">
                  <thead>
                    <tr>
                      <th scope="col">Foto</th>
                      <th scope="col">Nama lengkap</th>
                      <th scope="col">NIM</th>
                      <th scope="col">Kelompok</th>
                      <th scope="col">Komisariat</th>
                      <th scope="col">Jurusan/program studi</th>
                      <th scope="col">Tahun</th>
                      <th scope="col">Jabatan</th>
                      <th scope="col">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {event.participants.map((person) => (
                      <tr key={person.id}>
                        <td>
                          {person.photoUrl ? (
                            <PrivateImg
                              className="participant-photo-thumb"
                              src={person.photoUrl}
                              alt={`Foto ${person.display_name}`}
                            />
                          ) : (
                            <span className="photo-missing">Belum ada</span>
                          )}
                        </td>
                        <td>{person.display_name}</td>
                        <td>{person.student_number || "—"}</td>
                        <td>{person.group_name || "—"}</td>
                        <td>
                          {person.commissariat_record?.[0]?.name ??
                            person.commissariat}
                        </td>
                        <td>{person.major || "Belum diisi"}</td>
                        <td>{person.entry_year || "—"}</td>
                        <td>{person.position || "—"}</td>
                        <td>
                          <details className="participant-edit-details">
                            <summary>Edit</summary>
                            <form
                              action={editParticipant}
                              className="participant-edit-form"
                            >
                              <input
                                type="hidden"
                                name="participantId"
                                value={person.id}
                              />
                              <label>
                                Nama lengkap *
                                <input
                                  required
                                  minLength={2}
                                  maxLength={120}
                                  name="displayName"
                                  defaultValue={person.display_name}
                                />
                              </label>
                              <label>
                                NIM (opsional)
                                <input
                                  maxLength={40}
                                  name="studentNumber"
                                  defaultValue={person.student_number ?? ""}
                                />
                              </label>
                              <label>
                                Kelompok (opsional)
                                <input
                                  maxLength={100}
                                  name="groupName"
                                  defaultValue={person.group_name ?? ""}
                                />
                              </label>
                              <label>
                                Asal Komisariat *
                                <CommissariatOptions
                                  commissariats={commissariats ?? []}
                                  selectedId={person.commissariat_id}
                                />
                              </label>
                              <label>
                                Jurusan/program studi *
                                <input
                                  required
                                  minLength={2}
                                  maxLength={120}
                                  name="major"
                                  defaultValue={person.major ?? ""}
                                />
                              </label>
                              <label>
                                Tahun angkatan *
                                <input
                                  required
                                  type="number"
                                  min={1900}
                                  max={2100}
                                  step={1}
                                  name="entryYear"
                                  defaultValue={person.entry_year ?? ""}
                                />
                              </label>
                              <label>
                                Jabatan (opsional)
                                <input
                                  maxLength={120}
                                  name="position"
                                  defaultValue={person.position ?? ""}
                                />
                              </label>
                              <label>
                                {person.photo_path
                                  ? "Ganti foto (opsional)"
                                  : "Foto formal (opsional)"}
                                <input
                                  type="file"
                                  name="photo"
                                  accept="image/jpeg,image/png"
                                />
                                <small>
                                  Jika tersedia: jas IMM, latar putih. JPG/PNG,
                                  maks. 5 MB.
                                </small>
                              </label>
                              <button type="submit">Simpan perubahan</button>
                            </form>
                            <form
                              action={removeParticipant}
                              className="participant-delete-form"
                            >
                              <input
                                type="hidden"
                                name="participantId"
                                value={person.id}
                              />
                              <button className="remove-button" type="submit">
                                Hapus peserta
                              </button>
                            </form>
                          </details>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="users-empty">
                Belum ada peserta pada kegiatan ini.
              </p>
            )}
          </section>
        ))
      )}
      <p className="privacy-note">
        Nama, Komisariat, jurusan, dan tahun angkatan wajib; jabatan opsional.
        Nama yang sama tidak otomatis ditolak. Halaman hanya tersedia bagi
        Observer dan Admin Sistem (Super Admin).
      </p>
    </main>
  );
}
