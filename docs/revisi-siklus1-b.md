# Revisi B Siklus 1 — Fase 2 dan Strategi Pengujian

Teks di bawah mengganti bagian **Fase 2** dan **Bagian 3 Strategi pengujian** di `docs/RENCANA-IMPLEMENTASI-KEPUTUSAN.md`. Tidak ada kode, migrasi, atau data yang diubah.

Catatan: instruksi pelonggaran guard aplikasi (coverage, moderasi, publish, finalisasi) diterima pada 24 November 2026; RLS, privasi, dan proses verifikasi produksi tetap keras.

---

## Fase 2 — Skor dan alur penilaian, DEV

Gate masuk: Fase 1 selesai; 7 penguji SQL hijau; baseline `sha256sum` PDF dan `snapshot_data` sudah tersimpan di artifact Fase 1 **sebelum** `lib/scoring.ts:72` disunting.

Gate keluar: uji `scoring` dan `phase6-scoring` hijau; `npm run check` dan `npm run build` hijau; angka **dan kategori** Observasi sama dengan Evaluasi hanya pada uji cakupan lengkap; coverage atau moderasi yang kurang menghasilkan `provisional` plus peringatan, bukan penolakan simpan; hash PDF baseline identik dan `snapshot_data` lama tidak dihitung ulang; gate lama tidak ada; nasib status `finalized` sudah diputus; penguji RPC read-only baru hijau; RLS dan verifikasi produksi tidak berubah.

**2a. Rumus dan uji skor.** Ubah `lib/scoring.ts:72` menjadi `(averageOnFivePointScale / 5) * 100`. Pertahankan bentuk kembalian `:69-77` dan normalisasi bobot `:52-66`. Jangan ubah batas kategori `:19-29` dan jangan hitung ulang `snapshot_data`.

Buat berkas baru `tests/scoring.test.ts` (belum ada). Uji nilai mentah dulu, bukan format tampil: `calculateWeightedScore` untuk skor 4 → `value === 80`, skor 3 → `60`, skor 3.5 → `70`; `categorizeScore` untuk masing-masing → label "Baik", "Cukup", "Cukup" (70 masih di bawah batas 75 di `:26-27`). Sertakan uji kategori ini di kriteria keluar; jangan hanya membandingkan angka Observasi-Evaluasi. `[TERBUKA]` Format pembulatan angka tampil (`toFixed`) belum diputus, jadi jangan menguji string hasil pembulatan.

**2b. Gate "angka sama" dibatasi.** `calculateWeightedScore` (`lib/scoring.ts:43-77`) menormalkan bobot hanya pada indikator dan aspek yang teramati (`:52-66`, `:64-65`). `calculateOverallScore` (`lib/phase6-scoring.ts:269-296`) mengharuskan total bobot ≈100 dan `aspects.every(a => a.valid && a.score !== null)` (`:276-278`), lalu mengembalikan `null`/`provisional` bila ada yang kurang. Maka kesamaan angka bukan gate umum. Jadikan uji regresi positif satu skenario cakupan lengkap: semua aspek valid, semua indikator berskor, bobot 100, tanpa N/O maupun pending; di situ kedua jalur harus sama. Skenario dengan N/O atau pending boleh berbeda dan tidak boleh menggagalkan build: selisih itu muncul sebagai `provisional` dan peringatan, bukan kegagalan penyimpanan.

**2c. N/O keluar dari coverage.** Di `calculateAspectAggregates` (`lib/phase6-scoring.ts:168-267`) jangan memakai `notObservedIndicators` (`:226-234`) sebagai penyebut: ia menghitung indikator yang juga memiliki skor. Hitung terpisah `coverageDenominator = max(0, plannedCount - jumlah indikator dengan average === null && notObserved > 0)`; `coverage = coverageDenominator > 0 ? valid.length / coverageDenominator * 100 : 0`; `valid = valid.length >= 1 && coverage >= coverageThreshold`.

Tambahkan `coverageDenominator: number` ke `AspectAggregate` (`:46-58`) dan pakai di teks alasan `calculateOverallScore` (`:290-295`) menjadi `(${aspect.assessedIndicators}/${aspect.coverageDenominator} indikator dalam penyebut)`. Tanpa ini teks tetap "1/3 indikator valid" walau coverage 100%. `valid: false` dipakai untuk menandai `provisional` dan peringatan, bukan untuk menolak simpan nilai atau menghentikan alur Observer. Perbarui fixture uji di `tests/phase6-scoring.test.ts:143-155` untuk field wajib baru.

Tulis ulang `tests/phase6-scoring.test.ts:92-112` dengan ambang eksplisit pada lima kasus:

1. 1 skor + 1 N/O + 1 pending → penyebut 2, coverage 50, ambang 80 → invalid.
2. 1 skor + 2 N/O → penyebut 1, coverage 100, ambang 80 → valid.
3. Semua N/O → penyebut 0, coverage 0, ambang 80 → invalid dan `valid.length === 0`.
4. N/O bersama skor pada indikator yang sama → indikator itu tetap masuk penyebut, coverage tidak turun.
5. Tepat 50 dengan ambang 50 → valid (`>=`).

**2d. Hapus gate lama; putuskan status `finalized`.** Hapus blok `app/dashboard/penilaian/assessment-actions.ts:389-413` (query submission, query assignment, penolakan "Semua Observer..."). Pertahankan pengecekan Admin di `:383-388` dan pemeriksaan cocok peserta-rubrik di `:378-382`.

Di `app/dashboard/observasi/submission-controls.tsx`: tipe prop `status` di `:17` → `"submitted" | "draft"`; tipe argumen `run` di `:25` → `"submitted" | "draft"`; hapus cabang pesan mati di `:38` dan ratakan ternary `:32-40`; hapus blok tombol finalisasi `:76-88`; ubah teks `:54` menjadi "X dari Y observer mengirim penilaian (informasi; tidak menghalangi finalisasi)". Cabang label `finalized` di `:48-53` ikut hilang. Perbaiki penunjuk lama yang meleset: tipe `run` ada di `:25`, tipe prop `status` di `:17`, bukan sebaliknya.

Dua opsi nasib status `finalized`, jangan dibuang diam-diam:

- **Opsi A — hapus dari alur submission.** Konsekuensi: `finalized_count` di `get_event_assessment_progress` (`supabase/migrations/20261112180000_dad_reporting_publication_v1.sql:159,175,180`) selalu 0, dan status Admin di `app/dashboard/observasi/page.tsx:567-575` tidak pernah "Finalized" karena syarat `finalizedCount === eventAssignments.length` gagal. Kolom RPC jadi mati dan perlu penyesuaian kontrak di Fase 4.
- **Opsi B — status ditulis server saat finalisasi evaluasi kolektif**, bukan lewat tombol Observer. `finalized_count` dan status Admin tetap bermakna; butuh migrasi baru serta keputusan siapa penulis dan kapan, tanpa mengubah signature 8 argumen.

Rekomendasi: Opsi B, karena menjaga kontrak RPC dan tampilan Admin. `[TERBUKA]` Pilih A atau B sebelum penghapusan tombol dinyatakan selesai. Fase 2d hanya menghapus gate.

**2e. Penomoran revisi adalah kode mati.** `finalize_collective_evaluation` hanya menerima evaluasi `draft` (`20261113120000:11-15`), lalu menulis `finalized` di `:68-70`. RLS update mengharuskan draft (`20261112170000:228`) dan trigger `track_collective_evaluation` menolak update evaluasi final (`:253`). Index unik `(collective_evaluation_id, revision)` (`20261113000000:29-31`) melarang baris kedua. Jadi `max+1` belum terpakai; **jangan klaim keputusan 5 selesai**.

Fase 2e hanya menyiapkan mekanisme penomoran: migrasi baru ber-timestamp **> `20261123130000`** (bukan > `20261113000000`), `create or replace public.finalize_collective_evaluation` dengan signature 8 argumen persis sama (`20261113120000:4-7`). Di `declare`, tambahkan `next_revision integer;` sebelum `select coalesce(max(s.revision),0)+1 into next_revision from public.assessment_snapshots s where s.collective_evaluation_id = target_evaluation_id;`. Ganti literal `1` di `:72` dengan `next_revision`. Pertahankan index unik dan publikasi revisi terbesar (`20261113130000:19-24`).

`[TERBUKA]` Jalur revisi harus diputus: (i) buka kembali evaluasi final menjadi draft (menyangkut trigger `20261112170000:253` dan RLS `:228`), atau (ii) baris evaluasi/revisi baru dengan `collective_evaluation_revisions` (`20261112170000:232-240,256-257`) sebagai jejak. Perubahan RLS tetap butuh keputusan tertulis terpisah; tidak termasuk pelonggaran 24 November 2026. Tidak ada perubahan status final tanpa keputusan ini.

**2f. Verifikasi gate Evaluasi.** Kriterialnya tetap **"verifikasi gate lama tidak ada"**, bukan "hanya memakai coverage, moderasi, alasan". Daftar gate di RPC `20261113120000:19-51`: status overall (`:19-21`), struktur snapshot dan sumber privat (`:22-24`), enum keputusan serta alasan ≥10 karakter (`:16-18`), total bobot 99.999–100.001 dan cocoknya computed overall (`:26-33`), coverage tiap aspek (`:34-40`), referensi rating (`:41-47`), moderasi (`:48-51`, `:52-67`). Di sisi app: `evaluasi/actions.ts:652-655` (overall), `:656-666` (moderasi), `:692-698` (keputusan/alasan).

Terjemahan 24 November 2026: coverage di bawah 80% menghasilkan `provisional` plus peringatan. Error di app `:652-655` dan `raise exception` di RPC `:19-21,34-40` diubah menjadi penandaan itu, bukan kegagalan simpan. Selisih 2 poin/`needs_review` dan moderasi terbuka menjadi peringatan wajib ditinjau, bukan pengunci absolut (`:656-666`, RPC `:48-51,52-67`). `[TERBUKA]` Apakah keputusan tertulis mewajibkan penguncian moderasi; sampai ada, pakai peringatan. Gate integritas data (struktur `:22-24`, bobot/computed overall `:26-33`, referensi rating `:41-47`) tetap keras. Publish/finalisasi dilonggarkan hanya bila aman dan tidak membocorkan data privat; tinjau `20261113130000:15-18,19-24` bersama 2d. RLS, trigger immutable `20261112170000:330-331`, dan verifikasi produksi tidak diubah.

Uji: finalize dengan snapshot `provisional` dan hanya sebagian Observer submit harus tetap tersimpan sebagai provisional disertai peringatan. Bila masih ada penolakan karena "semua Observer submit", laporkan gate lama; jangan langsung menghapusnya.

**2g. Baseline hash sebelum perubahan rumus.** Sebelum menyunting `lib/scoring.ts:72`, rekam `sha256sum` setiap PDF baseline beserta `snapshot_id`, `revision`, baris audit, dan hash `snapshot_data`. Gate keluar: hash PDF yang diunduh ulang identik dan `snapshot_data` lama tidak berubah. `lib/dashboard-results.ts:137` menghitung skor langsung untuk pratinjau Observasi, sedangkan `components/phase7-report-workspace.tsx:77` memberi label kategori dari snapshot tersimpan; keduanya memakai modul yang sama, sehingga perubahan rumus mengubah label di dua tempat. Build hijau bukan bukti.

---

## 3. Strategi pengujian

- **Otomatis:** `tests/scoring.test.ts` baru untuk `calculateWeightedScore` dan `categorizeScore` (4→80 "Baik", 3→60 "Cukup", 3.5→70 "Cukup"), nilai mentah dulu, format pembulatan `[TERBUKA]`; `tests/phase6-scoring.test.ts` ditulis ulang untuk lima kasus N/O dengan ambang eksplisit dan `coverageDenominator`; `tests/phase6-recommendations.test.ts` dan `tests/phase7-files.test.ts` tetap; `npm run check`, `npm run build`.
- **SQL:** tujuh berkas di `supabase/tests/` hanya memeriksa struktur atau nama (`dad_scoring_phase6.sql:41`, `dad_reporting_phase7.sql:7`). Tambah berkas read-only ke-8, `supabase/tests/rpc_contract_behavior.sql`, dalam `begin; ... rollback;` dengan `set local role` simulasi (Admin, moderator, Observer, Peserta) dan `request.jwt.claim.sub`. Periksa (1) signature 8 argumen lewat `pg_get_function_identity_arguments('public.finalize_collective_evaluation(uuid,text,text,jsonb,jsonb,jsonb,jsonb,jsonb)'::regprocedure)`, (2) kode `P0002` pada RPC rapor tanpa akses aktif, (3) perilaku: snapshot provisional tetap tersimpan, sebagian Observer submit tidak memblokir, akses privat tidak berubah. Kriteria keluar: signature, kode error, dan perilaku sesuai, bukan nama di `pg_proc`.
- **Browser dan peran:** konflik "Muat data terbaru"/"Pertahankan draf saya", N/O sampai Evaluasi, finalize/publish/ekspor, RLS lintas peran, sesi kedaluwarsa; verifikasi tombol finalisasi Observer tidak ada, status Admin sesuai 2d, dan peringatan coverage/moderasi tidak menghentikan alur Observer.
- **Regresi PDF:** bandingkan `sha256sum` terhadap baseline yang diambil sebelum `lib/scoring.ts:72` diubah; jangan hitung ulang `snapshot_data`.
