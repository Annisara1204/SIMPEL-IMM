import { AppShell } from "@/components/app-shell";
import { HomeHero } from "@/components/home-hero";
import { createClient } from "@/lib/supabase/server";

type AggregateGroup = {
  key: string;
  count: number;
  average_score: number;
};

type PublicAggregate = {
  event_id: string;
  total_participants: number;
  groups: AggregateGroup[] | null;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Kegiatan yang agregatnya boleh ditampilkan publik. Bukan rahasia; diisi
// lewat env server. Tanpa nilai yang valid, halaman menampilkan "data belum
// tersedia" dan tidak memanggil RPC. Nilai ini juga harus tercantum di tabel
// public.public_aggregate_settings, tempat RPC memeriksa daftar putihnya.
const publicEventId = process.env.NEXT_PUBLIC_PUBLIC_AGGREGATE_EVENT_ID;

async function loadPublicAggregate(): Promise<PublicAggregate | null> {
  if (!publicEventId || !UUID_PATTERN.test(publicEventId)) return null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_public_event_aggregate", {
      target_event_id: publicEventId,
    });
    if (error || !Array.isArray(data) || data.length === 0) return null;

    const row = data[0] as PublicAggregate | null;
    // groups=null berarti ambang 10 tidak tercapai. Jangan tampilkan angka apa pun.
    if (!row || !Array.isArray(row.groups)) return null;

    return {
      event_id: String(row.event_id ?? publicEventId),
      total_participants: Number(row.total_participants ?? 0),
      groups: row.groups
        .filter(
          (group) =>
            typeof group?.key === "string" &&
            Number.isFinite(Number(group?.count)) &&
            Number.isFinite(Number(group?.average_score)),
        )
        .map((group) => ({
          key: group.key,
          count: Number(group.count),
          average_score: Number(group.average_score),
        })),
    };
  } catch {
    return null;
  }
}

export default async function Home() {
  const aggregate = await loadPublicAggregate();

  return (
    <AppShell role="public" isPublic>
      <HomeHero role="public" isPublic />
      <div className="section-heading role-heading">
        <div>
          <h2>Rekap penilaian publik</h2>
          <p>Agregat kegiatan tanpa identitas atau nilai individu</p>
        </div>
      </div>
      <div className="role-grid public-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Ringkasan peserta</h2>
              <p>Hanya hasil yang sudah diterbitkan dan memenuhi ambang</p>
            </div>
          </div>
          {aggregate ? (
            <>
              <div className="metric-row">
                <div>
                  <strong>{aggregate.total_participants}</strong>
                  <span>Peserta terhitung</span>
                </div>
              </div>
              <div className="user-role-list">
                {aggregate.groups?.map((group) => (
                  <div key={group.key}>
                    <span>{group.key}</span>
                    <b>
                      {group.count} peserta · rata-rata{" "}
                      {group.average_score.toFixed(1)}
                    </b>
                  </div>
                ))}
              </div>
              <div className="data-caption">
                Rata-rata dihitung dari kelompok, bukan dari individu.
              </div>
            </>
          ) : (
            <p className="data-caption">data belum tersedia</p>
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Batasan tampilan publik</h2>
              <p>Data yang tidak pernah dikirim ke browser publik</p>
            </div>
          </div>
          <div className="privacy-note">
            Identitas peserta, bukti, catatan observasi, dan nilai individu
            tidak ditampilkan di halaman ini.
          </div>
        </section>
      </div>
      <footer className="page-footer">
        <span>
          IMM Observer <b>·</b> Tahap uji coba
        </span>
        <span>Seluruh data pada fase ini bersifat simulasi</span>
      </footer>
    </AppShell>
  );
}
