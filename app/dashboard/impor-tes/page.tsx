import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ImportWizard } from "./import-wizard";

export default async function TestImportPage() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
    return (
      <main className="setup-message">
        <h1>Supabase belum dikonfigurasi</h1>
        <p>Atur koneksi lokal dan jalankan migrasi Tahap 5 sesuai README.md.</p>
        <a href="/login">Kembali ke login</a>
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
  if (!profile || profile.role !== "admin_system") redirect("/dashboard");
  const [
    { data: events, error: eventError },
    { data: imports, error: importError },
  ] = await Promise.all([
    supabase
      .from("events")
      .select("id, name")
      .order("starts_on", { ascending: false }),
    supabase
      .from("test_imports")
      .select(
        "id, event_id, test_type, source_filename, imported_at, row_count, results:test_results(id, is_current)",
      )
      .order("imported_at", { ascending: false })
      .limit(50),
  ]);
  return (
    <main className="users-page">
      <a className="users-back" href="/dashboard">
        ← Kembali ke dashboard
      </a>
      <div className="users-heading">
        <div>
          <p className="login-eyebrow">TAHAP 5 · DATA TES</p>
          <h1>Impor Hasil Tes</h1>
          <p>
            Unggah ekspor Google Sheets, tinjau kecocokan peserta, lalu simpan.
          </p>
        </div>
        <span className="sample-tag">PRETEST · POSTTEST</span>
      </div>
      {(eventError || importError) && (
        <p className="users-error">
          Data impor belum dapat dibaca. Jalankan migrasi Tahap 5 di Supabase.
        </p>
      )}
      {events?.length ? (
        <ImportWizard events={events} />
      ) : (
        <p className="users-empty">Belum ada kegiatan.</p>
      )}
      <section className="event-manage-card">
        <div className="event-manage-title">
          <div>
            <h2>Riwayat impor</h2>
            <p>
              Nilai sebelumnya tetap tersimpan. Kolom “Dipakai” menunjukkan
              nilai yang digunakan saat ini.
            </p>
          </div>
        </div>
        {imports?.length ? (
          <div className="users-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Kegiatan</th>
                  <th>Jenis</th>
                  <th>Berkas</th>
                  <th>Baris</th>
                  <th>Dipakai</th>
                </tr>
              </thead>
              <tbody>
                {imports.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {new Date(item.imported_at).toLocaleString("id-ID")}
                    </td>
                    <td>
                      {events?.find((event) => event.id === item.event_id)
                        ?.name ?? "Kegiatan"}
                    </td>
                    <td>
                      {item.test_type === "pretest" ? "Pretest" : "Posttest"}
                    </td>
                    <td>{item.source_filename}</td>
                    <td>{item.row_count}</td>
                    <td>
                      {
                        item.results.filter((result) => result.is_current)
                          .length
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="users-empty">Belum ada riwayat impor.</p>
        )}
      </section>
      <div className="users-notice">
        <strong>Privasi dan pemeriksaan</strong>
        <p>
          Berkas dibaca oleh aplikasi lalu tidak disimpan sebagai salinan. Hanya
          nilai yang telah dicocokkan atau dikonfirmasi dan disimpan yang masuk
          basis data. Nama/Komisariat harus cocok atau dipilih manual; nilai
          lama tidak diganti tanpa konfirmasi.
        </p>
      </div>
    </main>
  );
}
