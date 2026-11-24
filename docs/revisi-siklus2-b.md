# Revisi Siklus 2 B — Pengganti Fase 2, 3, 4 dan Bagian 5

Usulan revisi teknis. Tidak mengubah `docs/RENCANA-IMPLEMENTASI-KEPUTUSAN.md`; tidak ada kode, migrasi, atau data diubah. Semua `path:line` diverifikasi. Gate aplikasi lunak; **publish rapor tetap keras**, begitu juga RLS, grant/revoke, filter akses, audit, dan verifikasi produksi.

## Fase 2 — Skor dan alur penilaian, DEV (pengganti)

Gate masuk: Fase 1 selesai; tujuh penguji SQL hijau; hash PDF dan `snapshot_data` tersimpan sebelum `lib/scoring.ts:72` disunting.

Gate keluar: uji `scoring`/`phase6-scoring` hijau termasuk enam kasus N/O; `npm run check`/`build` hijau; angka sama hanya pada cakupan lengkap; coverage/moderasi kurang → `provisional` plus peringatan; Opsi B dan server penulis status aktif; klausul `security definer` 2e terbawa; hash baseline identik; RLS tidak berubah.

**2a/2b.** `lib/scoring.ts:72` → `(averageOnFivePointScale / 5) * 100`; `:69-77`, `:52-66`, batas `:19-29` tetap. Uji 4→80, 3→60, 3.5→70. Hapus frasa "selisih 2 poin jadi peringatan" (`REVIEW-SIKLUS-2.md:17`): itu gate integritas keras (`20261113120000:26-33`).

**2c.** Di `lib/phase6-scoring.ts:168-267`, `notObservedIndicators` (`:226-234`) bukan penyebut. `coverageDenominator = max(0, plannedCount - jumlah baris average===null && notObserved>0)`; `coverage = coverageDenominator>0 ? valid.length/coverageDenominator*100 : 0`; `valid: valid.length>=1 && coverage>=coverageThreshold`. Tambah `coverageDenominator` ke `AspectAggregate` (`:46-58`) dan teks alasan `:290-295` sebagai `(${assessedIndicators}/${coverageDenominator} indikator dalam penyebut)`. `valid:false` = provisional, bukan gagal simpan. Tulis ulang `tests/phase6-scoring.test.ts:92-112`, ambang eksplisit: (1) 1 skor + 1 N/O + 1 pending → penyebut 2, coverage 50, invalid pada 80; (2) 1 skor + 2 N/O → penyebut 1, coverage 100, valid; (3) semua N/O → penyebut 0, coverage 0, invalid; (4) **dua indikator berskor plus satu N/O pada indikator sama**: baris `aspek:I1` skor 4, `aspek:I2` skor 3, `aspek:I2` N/O → penyebut `3-1=2`, `assessed=2`, coverage `100`, valid, bobot 4 dan 3 ternormalisasi; (5) N/O tidak mengurangi penyebut skor; (6) tepat 50 pada ambang 50 → valid. Fixture `:143-155` diperbarui.

**2d — Putusan: Opsi B.** `finalized` dipertahankan, ditulis server.
- `app/dashboard/observasi/submission-controls.tsx:17`: `status` tetap `"submitted"|"draft"|"finalized"` (dipakai teks `:48-52`). `:25`: `run` → `"submitted"|"draft"`. Hapus `:38` dan tombol `:76-88`; teks `:54` → "X dari Y observer mengirim penilaian (informasi; tidak menghalangi finalisasi)".
- `app/dashboard/penilaian/assessment-actions.ts:356` → `"submitted"|"draft"`; hapus cabang `:383` beserta `:389-419` dan penulisan `:416`. Cek Admin `:383-388` ikut hilang; pertahankan `:378-382`.
- `app/dashboard/observasi/page.tsx:567-575`: derivasi Admin tetap memakai `finalizedCount`, kini dari baris server. `finalized_count` (`20261112180000:159,175,180`) tidak lagi selalu 0.
- Penulis server, tambahkan setelah `20261113120000:70`: `update public.assessment_submissions set status='finalized', finalized_at=now(), finalized_by=(select auth.uid()) where participant_id=target_participant and status='submitted' and rubric_version_id in (select jsonb_array_elements_text(target_rubric_versions)::uuid);` Kolom sesuai `20261111160000:5-8,13-14`; `finalized_by` memenuhi `with check` `:85`.

**2e.** Migrasi baru > `20261123130000`, delapan argumen persis `20261113120000:4-7`, header `returns uuid language plpgsql security definer set search_path = '' as $$` disalin utuh dari `:8`. Tambah `next_revision integer;` di `declare`, `select coalesce(max(s.revision),0)+1 into next_revision ... where s.collective_evaluation_id = target_evaluation_id;`, ganti literal `1` di `:72`. Pertahankan RLS `:228`, trigger `:253`, index unik `20261113000000:29-31`. Jalur revisi tetap `[TERBUKA]`.

**2f/2g.** Gate keras: struktur, bobot, referensi rating, alasan ≥10 (`20261113120000:16-33,41-47`); coverage `:34-40` dan moderasi `:48-67` jadi peringatan; error `app/dashboard/evaluasi/actions.ts:652-666` jadi penandaan. Rekam hash sebelum `:72` disunting; `lib/dashboard-results.ts:137` dan `components/phase7-report-workspace.tsx:77` memakai modul sama.

## Fase 3 — Akses dan data, DEV (pengganti)

Gate masuk: Fase 2 disetujui; A1/A5/A7/A8, TLS, dan definisi "kelompok" terbukti. Gate keluar: bukti HTTP/SQL per peran (Bagian 5).

**3a — Penerbit/ekspor keras.** Migrasi baru > `20261123130000`:
- `create or replace public.publish_assessment_report(uuid)` dengan header `20261113130000:4-5`. Role `:11-13` jadi `admin_system or is_assessment_moderator(ev)`; hapus `bidang_kader`. Pertahankan `:15-30`. Tambah cek keras `s.snapshot_data->'overall'->>'status'='ready_for_collective_evaluation'` (field `20261113120000:19-21`); provisional ditolak. `published_by`/`actor_id` (`20261112180000:14,37`) wajib `auth.uid()`. Ulangi revoke/grant `:103-104`.
- `create or replace public.record_assessment_export(uuid,text,jsonb)` dengan header `20261112180000:187-188`. Di `:192` hapus cabang `p.role='bidang_kader'`; pertahankan admin, moderator, pengecualian `peserta`/`individual_pdf` `:193-195`. `export_type` tetap `:54,:191`, `app/dashboard/laporan/actions.ts:67-73`. Ulangi `:201-202`. Hapus daftar statis `app/dashboard/laporan/actions.ts:26`. Jangan sentuh `is_assessment_moderator` (`20261112170000:13-25`).

**3b — IoT.** Dua perubahan, helper umum tidak disentuh:
- `create or replace public.can_access_observation(uuid)`, header `20261106200000:2-3`; cabang Instruktur `:13-16` → `(select public.is_assessment_moderator(participant.event_id))`. Revoke/grant `:20-21` tetap.
- Policy `participants_read_assigned_instructor` `:23-25` → `using ((select public.is_assessment_moderator(event_id)))`. `is_assigned_instructor_for_event` (`20261106180000:31-40`) tetap karena dipakai rubrik/events (`20261106200000:30,37`; `20261106180000:47`).
- Ekstrak helper moderator dari `app/dashboard/evaluasi/page.tsx:110-120` dan `app/dashboard/laporan/page.tsx:96-107` untuk `app/dashboard/layout.tsx:18-33`. Menu `lib/navigation.ts:67-81`, `components/app-shell.tsx:84-92,107-136` hanya UX; redirect `evaluasi/page.tsx:115-120`, `laporan/page.tsx:107` tetap. Gate: REST langsung ke `/rest/v1/participants`, `/rest/v1/assessment_ratings`, snapshot.

**3c — Rekap Komisariat.** `participants.commissariat` text (`20261029010000_events_participants.sql:19`) dan `events.commissariat` text (`:5`), helper uuid (`20261029100000:59-67`); cast nama ke uuid invalid. Migrasi: `alter table public.participants add column if not exists commissariat_id uuid references public.commissariats(id) on delete set null;` (tabel `20261029030000:2-7`), backfill `update ... set commissariat_id=c.id from public.commissariats c where lower(trim(c.name))=lower(trim(p.commissariat))`. Filter yang compile: `where p.event_id=target_event_id and (target_commissariat_id is null or p.commissariat_id=target_commissariat_id) and (public.is_admin_system() or public.is_assessment_moderator(target_event_id) or public.is_commissariat_member(p.commissariat_id))`. `get_commissariat_event_summary(uuid)`, `security definer`, `set search_path=''`; hanya jumlah/rata-rata/distribusi, `having count(*)>=10`; dilarang `participant_id`, `display_name`, `student_number`, `group_name`, `snapshot_data`. Revoke public, grant `authenticated`.
Aturan "Lainnya" deterministik, **berlaku juga untuk moderator tanpa filter**: total <10 → `distribution=null`; kategori `count>=10` dikeluarkan; sisanya dijumlah, dikeluarkan sebagai `"Lainnya"` hanya bila `>=10`. Uji 9:1 → null; 18:2 → hanya 18.
`get_public_event_aggregate(uuid)` tidak ada di repo; `app/page.tsx:9` hanya merender `DashboardContent`. **Putusan: tidak dibuat**; hapus baris gate-nya. Tidak ada grant `anon`; pencabutan tetap (`20261112180000:29,49,65`; `20261112170000:310,325`).

**3d — Akun Peserta keras.** `public.participant_access` (`participant_id` PK+FK, `account_user_id`, `expires_at timestamptz not null`, `revoked_at`, `must_change_password boolean not null default true`), RLS aktif, revoke `authenticated,anon`, tanpa policy; akses hanya RPC. Helper `public.has_active_participant_access(uuid)` security definer: `pa.participant_id=target and pa.account_user_id=(select auth.uid()) and pa.revoked_at is null and pa.expires_at>now()`; grant `authenticated`.
- `assign_participant_account(uuid,uuid)` (`20261112180000:67-78`) ditimpa: cek `:70`, `:71-73`, update `:74`, plus upsert `participant_access ... on conflict (participant_id) do update set account_user_id=excluded.account_user_id, expires_at=excluded.expires_at, revoked_at=null, must_change_password=true` dalam satu transaksi. `target_user_id null` → `revoked_at=now()` **dan** `account_user_id=null`. Ulangi `:77-78`.
- Expired: `public.revoke_expired_participant_access()` cron harian null-kan `account_user_id`; helper/RPC tetap cek `expires_at>now()` agar langsung ditolak.
- `get_my_published_assessment_report()` (`20261112180000:106-140`) ditimpa: tambah `join public.participant_access pa on pa.participant_id=p.id` **(yang hilang)** di `:114` dan syarat `pa.account_user_id=(select auth.uid()) and pa.revoked_at is null and pa.expires_at>now() and pa.must_change_password=false` di `:133`; pertahankan `:134-136`, `P0002`, `:139-140`. Flag true → `P0003`.
- Policy lama: `participants_read_own_published_report` `:7-8` tambah `(select public.has_active_participant_access(id))`; cabang Peserta `assessment_report_publications_read` `:25` tambah `(select public.has_active_participant_access(participant_id))`. REST tidak bisa membaca walau RPC gagal.
- `must_change_password`: `public.get_my_access_status()` returns jsonb (`must_change_password`, `expires_at`, `revoked_at`), security definer, `set search_path=''`, baca baris milik `auth.uid()`, grant `authenticated`. `public.clear_my_must_change_password()` security definer set flag false hanya untuk baris aktif milik `auth.uid()`. Alur: login → cek status; true → halaman ganti sandi, rapor `P0003`; selesai setelah `supabase.auth.updateUser({password})` berhasil lalu clear. Uji di `supabase/tests/rpc_contract_behavior.sql` (baru): `set local role authenticated; set local request.jwt.claim.sub='<qa-id>'` → status true + `P0003`; setelah clear → rapor terbaca. `[TERBUKA]` `expires_at`: `coalesce(e.ends_on, now())+interval '30 days'` (`20261029010000:7-8`).

**3e/3f/3g.** Tetap: retensi (`docs/PROSEDUR-RETENSI-DATA-V1.md`, `scripts/retention-*.sql`; dikecualikan `20261112170000:294-325`, `20261112180000:10-65`, `20261106200000:65-99`); impor 5 MB/500/50 (`app/dashboard/impor-tes/actions.ts:9-11,190-204`), Admin `:29-32`, riwayat `:153-181`; rubrik trial (`BLUEPRINT.md:28,40,58`).

## Fase 4 — Jalur lama dan kontrak RPC, DEV (pengganti)

Tutup 14 entri `INVENTARIS-JALUR-LAMA.md:14-24`. Hanya `get_event_assessment_summary(uuid)` berubah signature. Migrasi baru > `20261123130000`: `drop function if exists ...(uuid);` (`20261112190000:5-12`); `create or replace ...(target_event_id uuid, target_participant_id uuid default null)` dengan 16 kolom `:6-10`, `#variable_conflict use_column` `:12`, peran `:15-21`, filter `and (target_participant_id is null or p.id=target_participant_id)` di `planned` `:31-39`, `order by :69`, gate `:52-67`. Revoke/grant signature `(uuid,uuid)` `:71-72`. `PGRST_DB_MAX_ROWS=100000` tetap.
Gate keluar: tujuh penguji SQL lolos; signature dua argumen dan `P0002` terverifikasi; uji perilaku/RLS bukan `pg_proc`; **keempat pemanggil masih berjalan**: `app/dashboard/evaluasi/page.tsx:147-151`, `app/dashboard/evaluasi/actions.ts:382`, `:593`, internal `20261113120000:52-67` (`MATRIKS-RPC-AKSES.md:36`). Bukti empat respons/query berisi jumlah baris.

## Bagian 5 — Gate Fase 3 dan 4 per peran (pengganti)

Bukti `curl -i`/SQL dengan JWT `@invalid`; simpan di `docs/bukti-gate-siklus2/`.

| Peran | Target | Expected | Gagal bila |
|---|---|---|---|
| IoT | REST `/rest/v1/participants`, `assessment_ratings`, snapshot; `rpc/can_access_observation`; `/dashboard/evaluasi`, `/laporan` | `false`; 0 baris/42501; 307 | baris/`true`/200 walau menu disembunyikan |
| Koordinator | `rpc/is_assessment_moderator`, `get_event_assessment_summary`, publish | `true`; rekap sesuai penugasan; publish 200 hanya snapshot final | publish ditolak atau provisional terbit |
| Kader | `get_event_report_rows`, publish, `record_assessment_export`, audit | rekap 200; publish/ekspor 42501 | ekspor/publish berhasil; `snapshot_data` terbaca |
| Admin | `assign_participant_account`, publish | 200; baris `participant_access` satu transaksi | baris tidak ada/`expires_at` null |
| Moderator lintas komisariat | `get_commissariat_event_summary` tanpa filter | hanya agregat; ambang 10 + Lainnya berlaku | identitas terbaca; 9:1/18:2 terpapar |
| Komisariat A/B | RPC rekap | A hanya A; 9:1 → null; 18:2 → 18 | A melihat B atau bucket <10 keluar |
| Profil privat | REST `account_personal_profiles` (`20261106250000:4-5`) | pemilik 200; lain 0 baris | rekan/admin melihat baris orang lain |
| Bucket foto | `account-profile-photos` (`20261106240000:26-31`) | authenticated 200; anon 401/403 | anon atau lintas akun terbaca |
| Audit publish | `assessment_report_publications`/audit (`20261112180000:14,37`) | `published_by`,`actor_id` = `auth.uid()` | null, atau publish tanpa audit |
| anon | tabel alur | 401/403; tanpa grant baru | grant anon/identitas/baris terbaca |
| Peserta normal | `get_my_access_status`, RPC rapor | flag true → `P0003`; setelah `updateUser`+clear → rapor | rapor lain terbaca |
| Peserta dicabut/expired | RPC dan REST rapor | `P0002`/42501; `account_user_id` null | masih bisa mengambil rapor |
