import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addParticipant, editParticipant, removeParticipant } from "../kegiatan/actions";

function CommissariatOptions({ commissariats, selectedId }: { commissariats: { id: string; name: string }[]; selectedId?: string | null }) {
  return <select name="commissariatId" required defaultValue={selectedId ?? ""}><option value="" disabled>Pilih Komisariat</option>{commissariats.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>;
}

export default async function ParticipantsPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return <main className="setup-message"><h1>Supabase belum dikonfigurasi</h1><p>Atur koneksi lokal dan jalankan migrasi profil peserta sesuai README.md.</p><a href="/login">Kembali ke login</a></main>;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (!profile || !["admin_system", "observer"].includes(profile.role ?? "")) redirect("/dashboard");
  const [{ data: events, error }, { data: commissariats }] = await Promise.all([
    supabase.from("events").select("id, name, participants(id, display_name, commissariat, commissariat_id, major, entry_year, position, photo_path, created_at, commissariat_record:commissariats(name))").order("starts_on", { ascending: false }),
    supabase.from("commissariats").select("id, name").eq("is_active", true).order("name"),
  ]);
  const eventsWithPhotos = await Promise.all((events ?? []).map(async (event) => ({
    ...event,
    participants: await Promise.all(event.participants.map(async (person) => {
      if (!person.photo_path) return { ...person, photoUrl: null };
      const { data } = await supabase.storage.from("participant-photos").createSignedUrl(person.photo_path, 3600);
      return { ...person, photoUrl: data?.signedUrl ?? null };
    })),
  })));
  return <main className="users-page"><a className="users-back" href="/dashboard">← Kembali ke dashboard</a><div className="users-heading"><div><p className="login-eyebrow">TAHAP 3 · DATA SIMULASI</p><h1>Peserta</h1><p>Profil peserta untuk tiap kegiatan. Kolom bertanda wajib harus dilengkapi.</p></div><span className="sample-tag">SIMULASI</span></div>
    {error ? <p className="users-error">Data peserta belum dapat dibaca. Pastikan migrasi profil dan foto peserta sudah dijalankan.</p> : !eventsWithPhotos.length ? <p className="users-empty">Belum ada kegiatan. Jalankan migrasi Tahap 3 di Supabase.</p> : eventsWithPhotos.map((event) => <section className="event-manage-card" key={event.id}><div className="event-manage-title"><div><h2>{event.name}</h2><p>{event.participants.length} peserta</p></div></div>
      {!commissariats?.length && <p className="users-error">Belum ada Komisariat aktif. Minta Admin Sistem menambahkan atau mengaktifkan Komisariat melalui menu Komisariat.</p>}
      {!!commissariats?.length && <form action={addParticipant} className="participant-add-form participant-profile-form"><input type="hidden" name="eventId" value={event.id}/><label>Nama lengkap *<input required minLength={2} maxLength={120} name="displayName" placeholder="Contoh: Peserta Simulasi 06"/></label><label>Asal Komisariat *<CommissariatOptions commissariats={commissariats}/></label><label>Jurusan/program studi *<input required minLength={2} maxLength={120} name="major" placeholder="Contoh: Program Studi Simulasi"/></label><label>Tahun angkatan *<input required type="number" min={1900} max={2100} step={1} name="entryYear" placeholder="Contoh: 2024"/></label><label>Jabatan (opsional)<input maxLength={120} name="position" placeholder="Contoh: Ketua Bidang"/></label><label>Foto formal (opsional)<input type="file" name="photo" accept="image/jpeg,image/png"/><small>Jika tersedia: jas IMM, latar putih. JPG/PNG, maks. 5 MB.</small></label><button type="submit">Tambah peserta</button></form>}
      {event.participants.length ? <div className="users-table-wrap"><table className="users-table participant-table"><thead><tr><th>Foto</th><th>Nama lengkap</th><th>Komisariat</th><th>Jurusan/program studi</th><th>Tahun</th><th>Jabatan</th><th>Aksi</th></tr></thead><tbody>{event.participants.map((person) => <tr key={person.id}><td>{person.photoUrl ? <img className="participant-photo-thumb" src={person.photoUrl} alt={`Foto ${person.display_name}`}/> : <span className="photo-missing">Belum ada</span>}</td><td>{person.display_name}</td><td>{person.commissariat_record?.[0]?.name ?? person.commissariat}</td><td>{person.major || "Belum diisi"}</td><td>{person.entry_year || "—"}</td><td>{person.position || "—"}</td><td><details className="participant-edit-details"><summary>Edit</summary><form action={editParticipant} className="participant-edit-form"><input type="hidden" name="participantId" value={person.id}/><label>Nama lengkap *<input required minLength={2} maxLength={120} name="displayName" defaultValue={person.display_name}/></label><label>Asal Komisariat *<CommissariatOptions commissariats={commissariats ?? []} selectedId={person.commissariat_id}/></label><label>Jurusan/program studi *<input required minLength={2} maxLength={120} name="major" defaultValue={person.major ?? ""}/></label><label>Tahun angkatan *<input required type="number" min={1900} max={2100} step={1} name="entryYear" defaultValue={person.entry_year ?? ""}/></label><label>Jabatan (opsional)<input maxLength={120} name="position" defaultValue={person.position ?? ""}/></label><label>{person.photo_path ? "Ganti foto (opsional)" : "Foto formal (opsional)"}<input type="file" name="photo" accept="image/jpeg,image/png"/><small>Jika tersedia: jas IMM, latar putih. JPG/PNG, maks. 5 MB.</small></label><button type="submit">Simpan perubahan</button></form><form action={removeParticipant} className="participant-delete-form"><input type="hidden" name="participantId" value={person.id}/><button className="remove-button" type="submit">Hapus peserta</button></form></details></td></tr>)}</tbody></table></div> : <p className="users-empty">Belum ada peserta pada kegiatan ini.</p>}
    </section>)}<p className="privacy-note">Nama, Komisariat, jurusan, dan tahun angkatan wajib; jabatan opsional. Nama yang sama tidak otomatis ditolak. Halaman hanya tersedia bagi Observer dan Admin Sistem (Super Admin).</p>
  </main>;
}
