# Revisi Akhir B Siklus 4 — Teknis dan Konsistensi Dokumen

Usulan teks siap disalin ke `docs/RENCANA-IMPLEMENTASI-KEPUTUSAN.md` (disingkat `RENCANA`). Dokumen ini tidak mengubah rencana utama secara fisik, tidak menyentuh kode, migrasi, data, atau produksi, dan tidak ada commit. Aturan `RENCANA:9` tetap berlaku: rencana utama menang atas berkas revisi. Semua `path:line` diverifikasi terhadap repo per 24 November 2026. Lingkup: guard aplikasi lunak; publish, RLS, grant, filter akses, audit, rotasi kunci, dan 14 butir produksi tetap keras (`RENCANA:7`); tidak ada snapshot provisional yang disimpan.

## 1. Filter agregat publik (`RENCANA:121`)

Ganti frasa `snapshot_data->overall->status = 'ready_for_collective_evaluation'` dengan:

> `snapshot_data->'overall'->>'status' = 'ready_for_collective_evaluation'`

Kunci JSONB wajib berkutip. Tanpa tanda kutip, `overall` dibaca sebagai nama kolom. Operator `->>` menghasilkan `text` yang bisa dibandingkan dengan literal. Teks ini sama dengan `revisi-siklus3-c.md:26`.

## 2. Predicate publish (`RENCANA:83-99`)

Ganti kalimat penutup `RENCANA:83` (`Predicate publish konkret:`) dengan:

> Timpa `publish_assessment_report` di migrasi baru > `20261123130000` dengan header `20261113130000:4-5`. Deklarasi di `:6` diperluas, nilainya diambil setelah `select ... into ev, person, evaluation` di `:8-9`, dan gate ditempatkan sebelum insert publikasi di `:25-28`. Bagian `:10-24`, audit `:29-30`, `published_by`/`actor_id` = `auth.uid()`, serta grant `20261112180000:103-104` tidak diubah.

Deklarasi pengganti `20261113130000:6`:

```sql
declare ev uuid; person uuid; evaluation uuid; revision_number integer; latest_snapshot uuid;
        policy_minimum numeric; snapshot_payload jsonb; snapshot_rubrics jsonb; rationale_text text;
```

Sisipan setelah `:9` dan setelah penjaga `ev is null` di `:10`:

```sql
  select pol.minimum_coverage, snap.snapshot_data, snap.rubric_version_ids, evl.decision_rationale
    into policy_minimum, snapshot_payload, snapshot_rubrics, rationale_text
  from public.assessment_snapshots snap
  join public.collective_evaluations evl on evl.id = snap.collective_evaluation_id
  join public.assessment_scoring_policies pol on pol.id = true
  where snap.id = target_snapshot_id;
  if policy_minimum is null then
    raise exception 'Konfigurasi minimum_coverage tidak ditemukan.';
  end if;
```

Sumber kolom: `minimum_coverage` `20261112170000:114`, `rubric_version_ids` `:297`, `snapshot_data` `:299`, `decision_rationale` `:212`. Join memakai FK `assessment_snapshots.collective_evaluation_id` (`20261112170000:294`) dan baris policy unik `id=true` (`:112,118`). Keempat variabel dideklarasikan sebelum `begin`, sehingga tidak ada `undeclared record or variable`.

Gate pengganti `RENCANA:85-99` (isi sama dengan `revisi-siklus3-b.md:37-51`, pesan kesalahan mengikuti `RENCANA:98`):

```sql
if coalesce(snapshot_payload->'overall'->>'status','') <> 'ready_for_collective_evaluation'
   or jsonb_typeof(snapshot_payload->'aspects') <> 'array'
   or exists (select 1 from jsonb_array_elements(snapshot_payload->'aspects') a
              where coalesce((a->>'valid')::boolean,false) is not true
                 or coalesce((a->>'coverage')::numeric,0) < policy_minimum
                 or (a->>'score') is null)
   or char_length(trim(coalesce(rationale_text,''))) < 10
   or exists (select 1 from public.assessment_moderations m
              where m.event_id=ev and m.participant_id=person
                and m.status not in ('reviewed','resolved')
                and m.rubric_version_id = any(array(select jsonb_array_elements_text(snapshot_rubrics))::uuid[]))
then raise exception 'Snapshot belum memenuhi syarat terbit.'; end if;
```

Lingkup perubahan ini hanya deklarasi dan pengambilan nilai. Isi predicate, grant, dan audit tidak diubah. Catatan minor lain di `REVIEW-SIKLUS-4.md:36` (`any('{}')` pada array kosong, helper tulis, uji `get_instructor_dashboard_results`, `has_active_participant_access`) tidak masuk revisi ini.

## 3. `[TERBUKA-12]` — satu status

Putusan: Opsi B aktif hanya setelah tanda tangan Pemilik Keamanan/Privasi. Gate Fase 2 tidak boleh mensyaratkan Opsi B aktif sebelum tanda tangan itu.

Pengganti `RENCANA:71`:

> Gate masuk: Fase 1 selesai; 7 penguji SQL hijau; hash PDF tersimpan sebelum `lib/scoring.ts:72` disunting. Gate keluar: `npm test` menjalankan tiga berkas `test:phase6` termasuk `tests/scoring.test.ts`; delapan penguji SQL hijau termasuk `rpc_contract_behavior.sql`; `npm run check`/`build` hijau; angka sama hanya pada cakupan lengkap; uji publish provisional ditolak bersifat defensif; klausul `security definer` utuh; hash baseline identik; RLS tidak berubah. Opsi B bukan syarat gate sebelum `[TERBUKA-12]` ditandatangani.

Pengganti dua kalimat terakhir `RENCANA:79` (mulai dari `[TERBUKA-12]`):

> Perubahan trigger `20261111160000:136-138` di atas adalah isi opsi (a) dan **aktif hanya setelah** `[TERBUKA-12]` ditandatangani Pemilik Keamanan/Privasi. Sebelum ditandatangani, jalankan opsi (b) dari `revisi-siklus3-b.md:18`: status `finalized` tetap ditulis Admin, koordinator hanya memfinalisasi evaluasi, penulis status server tidak dipakai koordinator, dan bukti gate tidak boleh mengklaim Opsi B aktif. Tombol Admin sudah dihapus di 2d butir 1 (`RENCANA:77`). Penulis server setelah `20261113120000:70`: `update assessment_submissions set status='finalized', finalized_at=now(), finalized_by=(select auth.uid()) where participant_id=target_participant and status='submitted' and rubric_version_id in (select jsonb_array_elements_text(target_rubric_versions)::uuid);`.

Pengganti `RENCANA:211`:

> 11. `[TERBUKA-12]` Kewenangan trigger penulis `finalized` untuk koordinator (2d opsi a). Menunggu tanda tangan Pemilik Keamanan/Privasi. Sebelum ditandatangani pakai opsi (b), Opsi B belum aktif, dan gate Fase 2 tidak mensyaratkan Opsi B aktif.

Hapus `RENCANA:212` dari daftar terbuka dan pindahkan ke catatan tertutup:

> ### Catatan tertutup
>
> - Opsi B untuk status `finalized` dipilih sebagai desain akhir di 2d (`RENCANA:77,79`), tetapi aktivasinya menunggu `[TERBUKA-12]`. Ini bukan entri terbuka dan bukan syarat gate Fase 2 sebelum tanda tangan.

Klaim "Opsi B aktif" di `revisi-siklus3-b.md:7,20` tetap terbaca sebagai usulan; karena `RENCANA:9`, teks di atas yang dipakai saat disalin ke rencana utama.

## 4. `revisi-siklus3-b.md:30-34` kedaluwarsa

Ganti bagian itu dengan catatan pengganti ini:

> ### Catatan pengganti — migrasi penandaan provisional
>
> `revisi-siklus3-b.md:30-34` dinyatakan **KEDALUWARSA**. Jangan membuat migrasi yang menimpa `finalize_collective_evaluation` untuk menulis status `provisional` ke `snapshot_data`. Yang berlaku: `RENCANA:7` (tidak ada snapshot provisional yang disimpan), `RENCANA:83` (`20261113120000:19-21,34-40,48-67` tetap menolak finalisasi yang belum memenuhi syarat), dan aturan prioritas `RENCANA:9`. Provisional hanya penandaan pada draf dan tampilan aplikasi (`evaluasi/actions.ts:652-666,692-698`). Uji publish provisional di gate Fase 2 (`RENCANA:71`) bersifat defensif: membuktikan RPC menolak snapshot yang tidak memenuhi syarat, bukan bahwa alur normal menghasilkan baris provisional.

## 5. Perapian minor

Teks siap disalin, satu per titik:

1. `RENCANA:36` → **Urutan tidak boleh dibalik:** tanda tangan matriks → Fase 0 baca → izin tertulis 0b → Fase 0b remediasi → gate keluar Fase 0. Tanda tangan matriks wajib terisi sebelum Fase 0 masuk (`RENCANA:206`, `[TERBUKA-6]`); izin 0b baru diberikan setelah bukti baca Fase 0 lengkap (`RENCANA:48`). `RENCANA:38` → Gate masuk Fase 0: tiga peran menandatangani matriks (format Bagian 3). Kalimat "Tanda tangan boleh diisi setelah 0b" dicabut; kolom kosong berarti gate belum lolos (`AGENTS.md:19-21`).
2. `RENCANA:145` → Format pengesahan matriks (pengganti blok lama): tiga blok Pemilik Produk, Pemilik Infrastruktur, Pemilik Keamanan/Privasi, masing-masing Nama, Tanggal, Tanda tangan; catatan opsional. Tanggal diisi saat penandatanganan dengan `Get-Date -Format yyyy-MM-dd` (`:151`). Angka 24/11/2026 hanya tanggal penyusunan dokumen (`:3`), bukan tanggal isian. Penandatanganan status akhir Fase 6 (`:139`) memakai tanggal penandatanganan masing-masing.
3. `RENCANA:203` → 3. `[TERBUKA-3]` Kewenangan ekspor Kader (sudah diarahkan ke "tidak boleh", perlu tanda tangan). Gate: ditandatangani Pemilik Keamanan/Privasi sebelum Fase 3 dinyatakan sesuai; sampai itu, ekspor Kader tetap ditolak.
4. `RENCANA:117` → "...identitas diarsipkan di `private_payload`, baris ditandai dengan **kolom baru `archived_at`** (`revisi-siklus3-c.md:22`) dan `account_user_id=null`." Kolom ini belum ada di migrasi mana pun, jadi penambahannya harus disebut.
5. `RENCANA:202` → 2. `[TERBUKA-2]` Definisi "kelompok" (ambang 10 dan aturan "Lainnya"). Sumber agregat publik sudah ditetapkan di `RENCANA:121`: hanya peserta dengan publikasi dan `snapshot_data->'overall'->>'status'='ready_for_collective_evaluation'` (`revisi-siklus3-c.md:26`), sehingga tidak lagi terbuka. Langkah eksplisit sebelum gate keluar Fase 0 tetap berlaku untuk definisi kelompok.
6. `RENCANA:145`, lingkup → Lingkup: Produk = keputusan 1-12 dan publish keras; Infrastruktur = butir 1-5, 9-14; Keamanan = butir 6-8. Nomor butir pada dua lingkup terakhir merujuk 14 butir `VERIFIKASI:24-37`, bukan 12 keputusan. Butir 11 monitoring (`VERIFIKASI:34`, `RENCANA:42`) hanya di Infrastruktur.
7. `RENCANA:71` → frasa "publish provisional ditolak" dibaca sebagai "uji publish provisional ditolak bersifat defensif". Tidak ada snapshot provisional yang dihasilkan alur normal (`RENCANA:7,83`); lihat bagian 4.
8. `RENCANA:101` → Dua pemanggil publish: `evaluasi/actions.ts:854` (nama `"publish_assessment_report"` pada baris itu; `supabase.rpc(` dimulai di `:853`, di dalam aksi `:821-864`) dan `laporan/actions.ts:28`. Teks lama `revisi-siklus3-b.md:53` memakai `:853` dan perlu disesuaikan.
9. `RENCANA:212` → pindah ke "Catatan tertutup" seperti bagian 3. Daftar terbuka `RENCANA:201-211` berisi 11 entri, bukan 12.
