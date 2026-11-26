# Rancangan — Arsip Materi Pelatihan

**Status:** disetujui pemilik, diimplementasikan, dan di-deploy ke produksi 26 November 2026. Rancangan ditulis 26 November 2026.
**Latar:** materi di `/dashboard/penilaian` tidak punya tombol hapus. Penghapusan lewat database berisiko merusak riwayat karena versi rubrik, submission, evaluasi, dan snapshot saling terhubung. Rancangan ini menyembunyikan materi tanpa menghapus data, mengikuti pola arsip kegiatan di `BLUEPRINT.md:23` dan `app/dashboard/kegiatan/`.

## Tujuan

- Admin Sistem dapat menyembunyikan materi yang sudah tidak dipakai dari pemilih sehari-hari.
- Semua nilai, catatan, evaluasi, snapshot, dan rapor tetap utuh.
- Materi dapat dipulihkan kapan saja.
- Observer, Instruktur, dan Bidang Kader tidak dapat mengarsipkan atau memulihkan.

## Yang tidak diubah

- Master materi di Kerangka DAD (`competency_materials`) tetap baca-saja. Tidak ada arsip untuk master pada rancangan ini.
- Tidak ada penghapusan baris, tidak ada perubahan struktur snapshot, tidak ada perubahan rubrik berversi.
- Kunci unik `(event_id, name)` tetap berlaku untuk materi terarsipkan. Nama materi lama tidak bisa dipakai ulang oleh materi baru tanpa memulihkan yang lama.

## Data

Tambah satu kolom pada tabel kegiatan-spesifik `rubric_materials`:

```sql
alter table public.rubric_materials
  add column if not exists archived_at timestamptz;
create index if not exists rubric_materials_active_idx
  on public.rubric_materials(event_id, position) where archived_at is null;
```

RLS yang sudah ada cukup untuk membatasi perubahan hanya ke Admin Sistem: kebijakan `rubric_materials_manage_admin` memakai `can_manage_rubrics()`, yang hanya bernilai benar untuk `role = 'admin_system'`.

Saat materi diarsipkan, semua versi rubrik berstatus `draf` untuk materi itu otomatis menjadi `arsip`. Kebijakan RLS yang sudah ada hanya mengizinkan sunting aspek/indikator pada versi draf, sehingga tidak ada jalur tulis ke rubrik materi tersembunyi.

Tambah trigger pengaman di database agar aturan tetap berlaku walau ada akses SQL langsung:

```sql
create or replace function public.prevent_material_archive_with_active_rubric()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.archived_at is not null and old.archived_at is null
     and exists (
       select 1 from public.rubric_versions v
       where v.material_id = new.id and v.status = 'active'
     ) then
    raise exception 'Materi masih memiliki rubrik aktif. Arsipkan rubrik terlebih dahulu.';
  end if;
  return new;
end;
$$;

create trigger prevent_material_archive_with_active_rubric
before update of archived_at on public.rubric_materials
for each row execute function public.prevent_material_archive_with_active_rubric();
```

Migrasi baru: `supabase/migrations/20261126HHMMSS_material_archive_v1.sql`. Penguji: `supabase/tests/material_archive.sql`.

## Aturan utama (disetujui pemilik 26 November 2026)

Materi hanya boleh diarsipkan bila tidak ada rubrik versi `active` untuk materi itu. Admin mengarsipkan versi rubrik lebih dulu lewat tombol yang sudah ada, lalu mengarsipkan materinya. Ini mencegah Observer kehilangan akses saat masih mengisi penilaian. Konsekuensinya, tab jenis penilaian materi itu ikut hilang dari Evaluasi Kolektif sampai materi dipulihkan. Riwayat final tetap bisa dibaca lewat Laporan & Rapor karena snapshot tidak ikut disaring.

Alternatif mengarsipkan materi kapan saja tanpa menyentuh status rubrik tidak dipilih.

## Server Action

Di `app/dashboard/penilaian/rubric-actions.ts`:

- `archiveMaterial(formData)` dan `restoreMaterial(formData)`, keduanya memanggil `setMaterialArchived(formData, archived)`.
- `archiveRubricVersion(formData)` menutup versi aktif menjadi `archived` tanpa menggantinya. Tombolnya muncul pada versi aktif di halaman Penilaian. Ini diperlukan karena tombol "Aktifkan versi" lama selalu mengaktifkan versi baru, sehingga materi tetap memiliki versi aktif dan tidak bisa diarsipkan.
- Memakai `staffClient(["admin_system"])`, memvalidasi UUID, lalu:
  - arsip: `update({ archived_at: new Date().toISOString() }).eq("id", id).is("archived_at", null)`;
  - pulihkan: `update({ archived_at: null }).eq("id", id).not("archived_at", "is", null)`.
- Pemeriksaan awal di aplikasi memberi pesan ramah bila masih ada versi aktif. Trigger database tetap menjadi pengaman terakhir.
- Kegagalan yang diharapkan dikembalikan lewat `redirect("/dashboard/penilaian?...&error=...")`, mengikuti perbaikan Evaluasi 26 November, agar tidak memicu "Halaman gagal dimuat".
- `revalidatePath` untuk `/dashboard/penilaian`, `/dashboard/observasi`, `/dashboard/evaluasi`, dan `/dashboard/laporan`.

Guard aplikasi dipasang pada `createRubricVersion` dan `setTrainingMaterialFramework`: bila materi terarsipkan, aksi ditolak dengan pesan "Materi sudah diarsipkan. Pulihkan terlebih dahulu." Aksi aspek/indikator tidak perlu guard terpisah karena versi draf materi otomatis berubah menjadi arsip dan RLS yang ada hanya membuka penulisan pada versi draf.

## Tampilan

### `/dashboard/penilaian` (Tahap 2 Pelatihan)

- Query materi di `app/dashboard/penilaian/page.tsx:117` mengikutsertakan `archived_at`.
- Daftar utama memakai `.is("archived_at", null)`.
- Tautan "Lihat materi yang diarsipkan" memakai query `?showArchived=1`, mengikuti pola halaman Kegiatan.
- Baris materi terarsipkan diberi badge "Arsip", tidak bisa dipilih, dan tombolnya berubah menjadi "Pulihkan materi" untuk Admin Sistem.
- Baris aktif mendapat tombol "Arsipkan materi" untuk Admin Sistem, dengan teks singkat: materi hilang dari pemilih, nilai lama tetap tersimpan, dan perlu memulihkan untuk memakainya lagi.
- Pada halaman detail rubrik, versi aktif mendapat tombol "Arsipkan versi". Tombol ini menutup versi aktif tanpa mengaktifkan versi baru, sehingga materi bisa masuk ke daftar arsip. Tombol "Aktifkan versi" lama tetap dipakai untuk pergantian rubrik normal.

### `/dashboard/observasi`

- Query di `app/dashboard/observasi/page.tsx:125` memakai `.is("archived_at", null)` untuk pemilih materi.
- Bila ada URL langsung dengan `materialId` terarsipkan, halaman tetap merender data lama berserta penanda "Materi ini diarsipkan" dan tanpa kontrol pengisian.

### `/dashboard/evaluasi` dan `/dashboard/laporan`

- Tidak menambah filter `archived_at`. Snapshot, evaluasi, dan ekspor tetap membaca data lama.
- Daftar tab Evaluasi tetap berisi versi rubrik berstatus `active` saja, jadi materi yang rubriknya sudah diarsipkan tidak muncul di daftar itu. Ini konsekuensi dari aturan utama di atas.

## Pengujian

1. SQL regression di DEV:
   - Admin Sistem bisa mengarsipkan dan memulihkan materi tanpa versi aktif.
   - Observer ditolak saat mencoba mengarsipkan.
   - Materi dengan versi aktif ditolak oleh trigger.
   - Jumlah `assessment_ratings`, `assessment_submissions`, `collective_evaluations`, dan `assessment_snapshots` tidak berubah sebelum/sesudah arsip dan pulihkan.
2. Browser DEV:
   - Arsipkan materi uji "test" yang berisi 1 versi draf dan 0 submission.
   - Materi hilang dari Penilaian dan Observasi, muncul di daftar arsip dengan badge, lalu muncul lagi setelah dipulihkan.
   - Tombol arsip hanya tampil untuk Admin Sistem.
   - Data materi lain tidak berubah.
3. `npm run check` dan `npm run build` lolos sebelum deploy.
4. Deploy PROD: backup aplikasi dan env, pasang migrasi, rsync tanpa `--delete`, build, `pm2 restart imm --update-env`, smoke delapan halaman, cek log. Tidak ada penghapusan data.

## Rollback

- Menonaktifkan fitur: kembalikan kode ke commit sebelum fitur dan restart aplikasi. Kolom `archived_at` boleh dibiarkan kosong.
- Membatalkan arsip pada satu materi: tombol "Pulihkan materi" atau `update ... set archived_at = null`. Tidak ada data yang perlu dikembalikan dari backup.

## Keputusan yang dicatat

1. Arsip hanya bila tidak ada rubrik aktif. **Disetujui.**
2. Materi terarsipkan tetap bisa dibuka lewat URL langsung sebagai tampilan baca-saja. **Disetujui.**
3. Master Kerangka DAD tidak ikut diberi status arsip; cukup materi per kegiatan. **Disetujui.**
4. Nama materi terarsipkan tidak boleh dipakai materi baru; kunci unik tetap berlaku. **Disetujui.**
