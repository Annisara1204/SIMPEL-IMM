# Revisi B Siklus 3 — Pengganti Fase 2 dan Strategi Pengujian

Teks ini menggantikan `docs/RENCANA-IMPLEMENTASI-KEPUTUSAN.md:74-88` (Fase 2) dan `:143-148` (Bagian 4). Gate masuk Fase 1, Fase 3-6, dan 12 keputusan produk tidak berubah. Semua `path:line` di bawah merujuk repo ini per 24 November 2026. Tidak ada kode, migrasi, atau data yang diubah oleh dokumen ini.

## Pengganti Fase 2 — Skor dan alur penilaian, DEV

Gate masuk: Fase 1 selesai; tujuh berkas penguji SQL yang sudah ada hijau; hash PDF tersimpan sebelum `lib/scoring.ts:72` disunting. Gate keluar: uji `scoring` dan `phase6-scoring` hijau lewat `npm test` (termasuk enam kasus N/O), delapan berkas penguji SQL hijau termasuk `rpc_contract_behavior.sql`, `npm run check`/`npm run build` hijau, angka sama hanya pada cakupan lengkap, Opsi B aktif dengan penulis status server **dan** trigger yang menerima koordinator, klausul `security definer` utuh, hash baseline identik, RLS tidak berubah, publish provisional ditolak.

**2a/2b.** `lib/scoring.ts:72` → `(averageOnFivePointScale / 5) * 100`; `:69-77`, `:52-66`, batas `:19-29` tetap. Buat `tests/scoring.test.ts` (belum ada di repo): 4→80 "Baik", 3→60 "Cukup", 3.5→70 "Cukup". Uji nilai mentah dulu; `[TERBUKA-1]` hanya untuk format tampilan. Frasa "selisih 2 poin jadi peringatan" dicabut; `20261113120000:26-33` keras. **Script:** `package.json:18` `test:phase6` diubah menjadi `node --experimental-strip-types --test tests/scoring.test.ts tests/phase6-scoring.test.ts tests/phase6-recommendations.test.ts`. Tanpa ini gate "uji scoring hijau" tidak bisa diverifikasi. `npm test` (`:17`) dan `npm run check` (`:20`) otomatis mengikutinya.

**2c.** Di `lib/phase6-scoring.ts:168-267`, `notObservedIndicators` (`:226-234`) bukan penyebut. `coverageDenominator = max(0, plannedCount - jumlah baris average===null && notObserved>0)`; `coverage = coverageDenominator>0 ? valid.length/coverageDenominator*100 : 0`; `valid = valid.length>=1 && coverage>=coverageThreshold`. Tambah `coverageDenominator` ke `AspectAggregate` (`:46-58`) dan teks alasan `:290-295`. Enam kasus uji `tests/phase6-scoring.test.ts:92-112`: (1) 1 skor + 1 N/O + 1 pending → penyebut 2, coverage 50, invalid pada 80; (2) 1 skor + 2 N/O → 100 valid; (3) semua N/O → 0 invalid; (4) dua indikator berskor plus satu N/O pada indikator sama → penyebut 2, coverage 100; (5) N/O tidak mengurangi penyebut skor; (6) tepat 50 pada ambang 50 valid. Fixture `:143-155` diperbarui. **Sumber ambang:** dalam produksi ambang berasal dari `assessment_scoring_policies.minimum_coverage` (`20261112170000:114`, default 80), dibaca di `evaluasi/actions.ts:649` dan di SQL `20261113120000:25`. Nilai 80 di `lib/phase6-scoring.ts:171` hanya default argumen untuk uji unit, bukan sumber konfigurasi. Teks rencana tidak menyebut "konstanta JS 80" sebagai sumber.

**2d — Putusan Opsi B, dua perbaikan.**
1. **Rentang hapus yang benar** di `app/dashboard/penilaian/assessment-actions.ts` adalah `:383-423`, yaitu seluruh blok `if (input.status === "finalized") { ... }`. Pertahankan `:353-382`, termasuk cek kecocokan participant/rubric `:378-382`. Rencana lama yang menghapus `:383`, `:389-419`, dan `:416` menyisakan `:384-388` (cek Admin) dan `:420-423` (`return error` dengan variabel `error` tak terdefinisi) sehingga file tidak lagi compile. Tipe `:356` menjadi `"submitted" | "draft"`; hapus tombol `:76-88` dan teks `:38` di `submission-controls.tsx`, `:25` menjadi `"submitted"|"draft"`, `:17` tetap tiga nilai, teks `:54` jadi "X dari Y observer mengirim penilaian (informasi; tidak menghalangi finalisasi)". `observasi/page.tsx:567-575` tetap memakai `finalizedCount` dari baris server.
2. **Trigger penulis `finalized`.** `20261111160000:136-138` hanya mengizinkan `admin_system`, padahal pemanggil `finalize_collective_evaluation` adalah `requireModerator` (`evaluasi/actions.ts:20-33`) yang menerima MoT/Vice MoT/Master/Vice Observer lewat `is_assessment_moderator` (`20261112170000:13-25`). Dua opsi:

   - **(a) Disarankan.** Migrasi baru > `20261123130000` memodifikasi `public.track_assessment_submission()` (`20261111160000:128-129`): baris `:136-138` diganti dengan `if new.status='finalized' and not public.is_assessment_moderator((select p.event_id from public.participants p where p.id=new.participant_id)) then raise exception ... using errcode='42501'; end if;`. Helper sudah mencakup `admin_system` (`20261112170000:16`), sehingga perilaku Admin tidak berubah dan koordinator bisa menulis `finalized`. Header `security definer set search_path = ''` (`:129`) tetap.
   - **(b)** Status `finalized` tetap ditulis Admin; koordinator hanya memfinalisasi evaluasi. Ini membuat penulis server di bawah tidak pernah terpakai untuk koordinator dan tombol Admin sudah dihapus di poin 1, jadi `finalized` tidak lagi ditulis siapa pun.

   Rekomendasi: **(a)**, karena Opsi B mensyaratkan penulis status server di dalam `finalize_collective_evaluation`. `[TERBUKA-12]` memerlukan tanda tangan tertulis Pemilik Keamanan/Privasi karena ini melebarkan siapa yang boleh menulis `finalized`; sebelum ditandatangani, jalankan Fase 2d dengan opsi (b) dan jangan klaim Opsi B aktif.

   Penulis server setelah `20261113120000:70`: `update public.assessment_submissions set status='finalized', finalized_at=now(), finalized_by=(select auth.uid()) where participant_id=target_participant and status='submitted' and rubric_version_id in (select jsonb_array_elements_text(target_rubric_versions)::uuid);` kolom sesuai `20261111160000:5-8,13-14`. Gate rating `:41-47` menerima `submitted` maupun `finalized`, jadi urutan ini aman.

**2e.** Migrasi baru > `20261123130000` dengan delapan argumen persis `20261113120000:4-7`. Salin utuh klausul `returns uuid language plpgsql security definer set search_path = '' as $$` dari `:8` (jangan dipecah atau diubah urutannya). Tambah deklarasi `next_revision integer;` di `declare` `:9`; isi dengan `select coalesce(max(s.revision),0)+1 into next_revision from public.assessment_snapshots s where s.collective_evaluation_id=target_evaluation_id;`; ganti literal `1` pada `:72` dengan `next_revision`. Pertahankan RLS `20261112170000:228`, trigger `:253`, index unik `20261113000000:29-31`, dan immutable `20261112170000:330-331`. Jalur revisi tetap `[TERBUKA-5]`.

**2f — Gate Evaluasi, provisional, dan publish keras.** Kriteria "verifikasi gate lama tidak ada" tetap. Gate keras yang **tidak diubah**: struktur `20261113120000:22-24`, bobot dan computed overall `:26-33`, referensi rating `:41-47`. Gate moderasi `:48-51` dan `:52-67` juga tetap keras di finalisasi.

Gate aplikasi lunak: `evaluasi/actions.ts:652-666` (coverage dan moderasi) dan `:692-698` (keputusan/alasan) menjadi penandaan `provisional` plus peringatan; draf evaluasi tetap tersimpan. `assessment-actions.ts:398-413` ikut terhapus bersama blok `:383-423` di 2d, sehingga tidak lagi disebut sebagai gate lunak. Tombol `submission-controls.tsx:76-88` dihapus. Teks UI menampilkan status sementara, bukan penolakan.

**Migrasi penandaan provisional (menggantikan perilaku lama).** Migrasi baru > `20261123130000` menimpa `finalize_collective_evaluation` dengan header 2e. Di `declare`, tambah `snapshot_provisional boolean := false; provisional_reasons text[] := '{}';`.
- Gate `:19-21`: jangan `raise`. Ganti menjadi `if target_snapshot->'overall'->>'status' <> 'ready_for_collective_evaluation' then snapshot_provisional := true; provisional_reasons := provisional_reasons || 'Coverage belum memadai.'; end if;`.
- Loop `:34-40`: jangan `raise`. Bila `coalesce((aspect->>'valid')::boolean,false) is not true` atau `coalesce((aspect->>'coverage')::numeric,0) < policy_minimum` atau `(aspect->>'score') is null`, set `snapshot_provisional := true` dan tambahkan alasan aspek. `policy_minimum` tetap dari `:25`.
- Sebelum insert `:71-74`, bila `snapshot_provisional`, lakukan `target_snapshot := jsonb_set(target_snapshot,'{overall,status}','"provisional"',true) || jsonb_build_object('provisional_reasons',to_jsonb(provisional_reasons));` lalu gunakan `next_revision`. Snapshot tetap tersimpan dan immutable; status `provisional` menjadi penanda, bukan exception.

**Publish keras di migrasi baru yang sama atau migrasi lain > `20261123130000`.** Timpa `publish_assessment_report` dengan header `20261113130000:4-5` (`security definer`, `set search_path=''`). Pertahankan `:15-18` (evaluasi non-final ditolak), `:19-24` (hanya snapshot revisi terbaru), audit `:29-30`, `published_by` (`20261112180000:14`) dan `actor_id` (`:37`) = `auth.uid()`, serta grant/revoke `20261112180000:103-104`. Tambahkan deklarasi `policy_minimum numeric; snapshot_payload jsonb; snapshot_rubrics jsonb; rationale_text text;` dan ambil nilai itu bersama `:8-9`. Gate baru:

```
select minimum_coverage into policy_minimum from public.assessment_scoring_policies where id=true;
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
then raise exception 'Snapshot provisional, coverage/moderation belum memenuhi; publish ditolak.'; end if;
```

Jadi keputusan publish tidak hanya membaca `overall.status`, tetapi `assessment_scoring_policies.minimum_coverage`, `snapshot_data->aspects`, alasan evaluasi, dan status `assessment_moderations`. Dua pemanggil RPC publish saja: `evaluasi/actions.ts:853` (di dalam aksi `:821-864`) dan `laporan/actions.ts:28`. Rencana lama menghitung `:853` dan `:821-864` sebagai dua pemanggil tambahan; itu satu aksi yang sama. `[TERBUKA-9]` hanya rincian tombol Finalisasi aplikasi; publish sudah diputus.

**2g.** Sebelum `lib/scoring.ts:72` disunting, rekam `sha256sum` PDF baseline, `snapshot_id`, `revision`, baris audit, hash `snapshot_data`. Gate keluar: hash identik. `lib/dashboard-results.ts:137` dan `components/phase7-report-workspace.tsx:77` memakai modul sama; build hijau bukan bukti.

## Pengganti Bagian 4 — Strategi pengujian

- **Otomatis:** `tests/scoring.test.ts` baru dan `package.json:18` (`test:phase6` memuatnya); enam kasus N/O di `tests/phase6-scoring.test.ts`; `tests/phase6-recommendations.test.ts` dan `tests/phase7-files.test.ts` tetap; `npm run check` dan `npm run build`. Gate Fase 2: `npm test` harus menjalankan tiga berkas `test:phase6`, bukan dua.
- **SQL:** delapan berkas di `supabase/tests/` (tujuh yang ada + `rpc_contract_behavior.sql` baru), menjalankan struktur/nama dan uji perilaku. `rpc_contract_behavior.sql` berjalan di `begin; ... rollback;` **di DEV saja, jangan di PROD**. Fixture snapshot provisional tidak bisa dibuat dengan `set local role authenticated` karena INSERT snapshot dicabut (`20261112170000:309`; demikian juga `:324` untuk sumber privat). Buat fixture dengan `set local role service_role;` atau lewat seed migrasi yang berjalan sebagai pemilik migrasi, lalu `set local role authenticated; set local request.jwt.claim.sub='<qa-id>'` untuk assertion. Periksa: signature delapan argumen, `P0002`, `P0003`, status akses sebelum/sesudah `updateUser`, snapshot provisional tersimpan dengan penanda, publish provisional ditolak, dan trigger `finalized` menerima moderator yang ditugaskan.
- **Browser dan peran:** konflik dua penilai, N/O sampai Evaluasi, finalize/publish/ekspor, RLS lintas peran, sesi kedaluwarsa; verifikasi tombol finalisasi Observer tidak ada, status Admin sesuai 2d, peringatan coverage/moderasi tidak menghentikan simpan draf, publish provisional ditolak. Uji IoT (instruktur tanpa penugasan) juga memanggil `get_event_assessment_summary` (`20261112190000:15-21`): peran selain `admin_system`/`bidang_kader`/`instruktur` ditolak `42501`, dan `instruktur` tanpa assignment di event itu ditolak `42501` (`:19-21`). Jangan hanya menguji menu yang disembunyikan.
- **Regresi PDF:** bandingkan `sha256sum` terhadap baseline sebelum `lib/scoring.ts:72` diubah; jangan hitung ulang `snapshot_data`.

## Sinkronisasi daftar terbuka

Tambah `[TERBUKA-12]` ke `RENCANA:173-185`: "Kewenangan trigger penulis `finalized` untuk koordinator (2d opsi a). Menandatangani Pemilik Keamanan/Privasi; sebelum ditandatangani pakai opsi (b) dan jangan klaim Opsi B aktif." Koreksi Minor `REVIEW-SIKLUS-3.md:38` menjadi "penguji SQL delapan, bukan tujuh" dan "pemanggil publish dua, bukan tiga". `TERBUKA-9` tetap terbuka untuk rincian tombol, bukan untuk publish.
