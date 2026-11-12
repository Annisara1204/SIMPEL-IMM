# Handover — IMM Observer

**Terakhir diperbarui:** 12 November 2026
**Lokasi proyek:** `C:\Users\Lenovo\Documents\project`

## Verifikasi Supabase — 12 November 2026 (pengguna menjalankan di SQL Editor)

- Tes struktural `supabase/tests/dad_assessment_phase5.sql` dijalankan pengguna dan **lulus**. Phase 5 lengkap di sisi basis data.
- Tes `supabase/tests/dad_scoring_phase6.sql` awalnya gagal dengan `42601: too few parameters specified for RAISE` karena tanda `%` tunggal di pesan error (`coverage 80%`). File diperbaiki menjadi `80%%` (commit `8067cc5`); setelah diperbaiki, tes **lulus** di Supabase pengguna.
- Migration Phase 7 `20261112180000_dad_reporting_publication_v1.sql` **terpasang** di Supabase pengguna (dijalankan dalam tiga bagian karena tempel ke SQL Editor terpotong dua kali: terpotong tepat setelah `insert into assessment_report_publication_audit`, dan potongan kedua berjalan mulai dari `return target_snapshot_id;`). Semua bagian bersifat idempotent (`create or replace` / `if not exists` / `drop ... if exists`) sehingga aman diulang.
- Tombol Supabase "Run and enable RLS" terbukti menyisipkan `ALTER TABLE` keliru di tengah fungsi plpgsql dan selalu menyebabkan `42601`. Untuk migration yang sudah memuat `enable row level security` (seperti Phase 7), pilih **"Run without RLS"**. Migration Phase 7 memang mengaktifkan RLS sendiri untuk ketiga tabel barunya.
- Setelah ketiga bagian terpasang, `supabase/tests/dad_reporting_phase7.sql` dijalankan pengguna dan **berhasil** (pesan persis tidak dikutip, tetapi sebelumnya tes ini konsisten menampilkan error saat migration belum terpasang, jadi keberhasilan kali ini menandakan pemeriksaan struktur lulus).
- Masih **belum** diuji: browser/dua akun, RLS lintas role, Realtime, submission/finalisasi nyata, publikasi rapor, ekspor PDF/ZIP/Excel. Build produksi masih `EPERM` di prerender Windows. Data tetap simulasi.

## Phase 5 — Assessment Form & Observer Collaboration (implementasi lokal, 11 November 2026)

- Prompt Phase 5 terbaru mengubah keputusan sebelumnya: setiap Observer/Instruktur yang ditugaskan memiliki rating independen per peserta, indikator, dan versi rubrik. Data legacy pada `observations` tidak dihapus atau dipindah karena satu skor bersama lama tidak dapat dipisah menjadi skor penulis terdahulu dengan aman.
- Migration baru `20261111160000_dad_assessment_workspace_v1.sql` menambah `assessment_submissions`, `assessment_ratings`, `assessment_submission_revisions`, dan `assessment_rating_revisions`; rating menyimpan skor 1–5 atau `not_observed` (N/O) atau `unrated`, bukti, owner, versi rubrik, revisi, dan waktu. Constraint unik memungkinkan beberapa observer menilai peserta/indikator sama, tetapi mencegah duplikasi dalam akun observer sendiri.
- RLS membatasi baca ke staf bertugas/Admin Sistem, penulisan rating hanya oleh pemilik record saat draft, pengiriman hanya oleh pemilik, dan finalisasi hanya Admin Sistem. Trigger mencegah perubahan owner/scope, mencatat riwayat rating/status, serta mengunci rating setelah dikirim.
- `/dashboard/observasi` memakai rubric aktif, aspek, indikator, anchor, master mapping Phase 4 dan guidance jika materi kegiatan dihubungkan ke konteks framework. Workspace menampilkan pratinjau skor personal, progress, N/O, penulis rating lain secara baca-saja, dan status per peserta. Belum tersedia model kelompok; UI memakai “Semua peserta”.
- Rating dan catatan menggunakan debounce 700 ms, revision check, konflik dengan pilihan eksplisit, draf lokal `localStorage` ketika offline, Realtime Supabase dan status koneksi. Realtime meminta ulang ringkasan sesi saat rating/submission berubah.
- Materi kegiatan kini dapat dihubungkan ke konteks master DAD saat dibuat. Membuat versi rubrik pertama untuk konteks yang terhubung akan menyalin aspek/indikator/anchor master sebagai snapshot draf dengan bobot ternormalisasi.
- Regression SQL baru: `supabase/tests/dad_assessment_phase5.sql`. Pemeriksaan SQL ini bersifat struktural; belum dijalankan terhadap Supabase pengguna. Migrasi Phase 5 belum diterapkan menurut percakapan ini.
- `npx.cmd tsc --noEmit` dan `git diff --check` lulus setelah perubahan terakhir. `npm.cmd run build` berhasil compile dan TypeScript, tetapi gagal pada prerender `/login` dengan Windows `EPERM: operation not permitted, mkdir ... .next/server/app/login.segments/login`; rute produksi tidak terverifikasi penuh.
- Browser, Supabase Realtime, RLS lintas akun, skenario dua observer, offline/reconnect, submission/finalisasi, dan SQL test Phase 5 belum diuji dalam sesi ini. Regression Phase 2–4 sebelumnya dilaporkan lulus oleh pengguna, tetapi belum diulang pada perubahan Phase 5.
- Belum ada screenshot yang diambil. Status implementasi Phase 6 dan langkah verifikasi dicatat pada bagian Phase 6 di bawah.
- Setelah mencoba Phase 5, pengguna melaporkan `/dashboard/penilaian` masih terasa seperti tampilan lama dan belum ada pilihan aspek/indikator per materi. Perbaikan lokal sekarang menambahkan tombol versi draf berikutnya, pemilih checkbox Kerangka DAD pada setiap draf rubrik Pelatihan, salin anchor master dan relasi aspek-indikator dengan bobot awal tervalidasi, serta aksi hapus aspek/indikator khusus draf. Versi aktif/arsip tetap baca-saja. TSC dan `git diff --check` lulus setelah perubahan ini; browser/Supabase belum dicoba ulang.
- Uji pengguna menemukan submit pemilih ditolak karena checkbox indikator dapat dipilih tanpa checkbox aspek induknya. Pemilih kini otomatis memilih aspek saat indikator dicentang, melepas indikator di aspek terkait saat aspek dimatikan, dan server memvalidasi pasangan aspek-indikator yang spesifik. `npx.cmd tsc --noEmit` dan `git diff --check` lulus. Submit ulang di browser masih perlu dikonfirmasi.

## Audit dan rencana implementasi (11 November 2026)

- Repository memakai Next.js 16.4.3, React 19.2, TypeScript, npm, dan Supabase. Fitur dasar Auth/RLS, kegiatan/peserta, rubrik/observasi, pengajuan Komisariat, dan profil Instruktur telah tersedia dalam berbagai tingkat penyelesaian.
- Rencana tahapan dan dependensi kini dirangkum di `IMPLEMENTATION_PLAN.md`; `BLUEPRINT.md` tetap menjadi acuan keputusan produk.
- Perubahan foto peserta opsional lolos `npx.cmd tsc --noEmit` dan pengguna mengonfirmasi migrasi `20261111090000_optional_participant_photos.sql` berhasil di Supabase. Uji alur di browser masih menunggu.

## Perbaikan form unggah Server Action (11 November 2026)

- Menghapus atribut `encType="multipart/form-data"` dari form berbasis Server Action di halaman Profil, Peserta, dan Pengajuan. React mengatur encoding form tersebut sendiri; atribut manual memicu peringatan console.
- Kolom file tetap dikirim lewat `FormData` ke Server Action. `npx.cmd tsc --noEmit` lulus dan tidak ada lagi `encType` di direktori `app/`.
- Pengguna mengonfirmasi profil berhasil disimpan dan peserta dapat ditambahkan tanpa mengunggah foto setelah perbaikan. Unggah foto, edit peserta, serta form Pengajuan Komisariat belum dikonfirmasi ulang di browser.

## Penyempurnaan Form Penilaian dan Rubrik (11 November 2026)

- Pengguna mengonfirmasi pola: satu skor bersama per peserta/indikator; catatan dipisah per penulis dan kategori; label skor mengikuti blueprint; indikator dapat dipetakan ke beberapa aspek dengan bobot per pemetaan; tidak ada tahap review/approval aplikasi; AI ditunda.
- Konflik skor/catatan menggunakan versi optimistis: simpanan yang versinya usang ditolak; UI menampilkan nilai terbaru dan pilihan eksplisit untuk memakai nilai terbaru atau menerapkan ulang isian setelah konflik terlihat.
- `app/dashboard/penilaian` kini mengatur bobot per pemetaan indikator-aspek dan uraian perilaku untuk skor 1–5; aktivasi versi memerlukan bobot aspek/pemetaan 100% serta lima uraian skor.
- `app/dashboard/observasi` menampilkan satu kontrol skor per indikator, catatan privat per penulis (observasi/bukti, kekuatan, pengembangan, khusus), uraian skor, riwayat dan status koneksi Realtime. `lib/scoring.ts` dan `lib/dashboard-results.ts` menghitung indikator multi-aspek dari satu nilai bersama.
- Migrasi `20261111100000_dynamic_rubric_mappings_and_observer_notes.sql` menambah relasi many-to-many berbobot, uraian skor, tabel catatan dan riwayat per penulis, validasi RLS/aktivasi, pemindahan catatan lama, dan publikasi Realtime. Jalankan setelah `20261111090000_optional_participant_photos.sql`.
- `npx.cmd tsc --noEmit` dan `git diff --check` lulus setelah perubahan kode. Pengguna mengonfirmasi migrasi `20261111100000_dynamic_rubric_mappings_and_observer_notes.sql` berhasil dijalankan di Supabase. Alur UI masih perlu uji manual: aktivasi rubrik, indikator multi-aspek, konflik skor dua akun, catatan dari dua penulis, dan pembaruan Realtime. Starter library indikator dan bantuan AI belum dibuat.

## Kerangka Kompetensi Trial DAD (11 November 2026)

- Keputusan pengguna: satu skor bersama per indikator; label skala baru 1 Sangat Kurang, 2 Kurang, 3 Cukup, 4 Baik, 5 Sangat Baik; belum ada review/finalisasi aplikasi; catatan ditulis masing-masing Observer. Ringkasan gabungan dengan atribusi nama penulis dapat dipertimbangkan setelah pola submit disepakati.
- Pengguna meminta aspek, 27 indikator, rubrik perilaku, dan pemetaan materi disiapkan untuk trial. Bobot aspek mengikuti prompt dan ditandai sebagai usulan, bukan standar resmi; bobot indikator untuk uji dibagi rata pada indikator terpilih di suatu aspek.
- Spesifikasi awal dan 135 behavioral anchors ditulis di `TRIAL_DAD_COMPETENCY_FRAMEWORK.md`. Pemetaan indikator per materi di dokumen adalah usulan yang menghindari pemaksaan seluruh indikator pada semua materi.
- Migration Phase 2 `20261111110000_dad_competency_framework_v1.sql` membuat framework dan versi, aspek, bank indikator, relasi indikator-aspek, serta FK opsional dari snapshot rubrik ke master. Seed DAD v1 berstatus `trial`, nonresmi, read-only untuk pengguna aplikasi, dan idempotent dengan `ON CONFLICT DO NOTHING`. Pengguna mengonfirmasi Phase 2 berhasil di Supabase setelah migration diterapkan.
- Seed memuat 6 aspek berbobot total 100 dan 27 indikator dengan deskripsi, tujuan pengukuran, perilaku teramati, metode ukur, panduan bukti, dan relasi aspek. Migration memiliki pemeriksaan SQL untuk jumlah, bobot, dan relasi. File pemeriksaan database yang dapat dijalankan setelah migration: `supabase/tests/competency_framework_phase2.sql`.
- Label pada form dan panduan skor lokal sudah disesuaikan dengan skala baru. TypeScript dan `git diff --check` berhasil; pemeriksaan statis menemukan 6 baris seed aspek dan 27 baris seed indikator. Migration berhasil menurut pengguna. File `supabase/tests/competency_framework_phase2.sql` tersedia untuk pemeriksaan regression database; hasil spesifik file itu belum dikonfirmasi terpisah. Tidak ada UI kustomisasi atau Phase 3 dalam lingkup ini.

## Phase 3 — Pemetaan Materi dan Rubric Engine (11 November 2026)

- Prompt Phase 3 meminta 27 rubrik indikator, masing-masing lima anchor perilaku, pilihan N/O nonnumerik, validasi, dan preview. Permintaan approval workflow pada prompt bertentangan dengan keputusan sebelumnya; status review/approval tidak ditambahkan. Framework tetap berstatus trial/nonresmi; versi rubrik master published hanya berarti dapat dipakai sebagai sumber template.
- Migration `20261111120000_dad_training_material_mapping_v1.sql` membuat master 7 materi Pelatihan, 14 pemetaan aspek, dan 36 pemetaan indikator relevan. FK komposit memastikan materi, aspek, dan indikator berada dalam framework version yang sama. Tabel materi master berbeda dari materi aktual per kegiatan.
- Migration `20261111130000_dad_indicator_rubric_engine_v1.sql` membuat rubrik master per indikator, versi rubrik, serta 135 anchor (5 untuk setiap 27 indikator) dengan label Sangat Kurang, Kurang, Cukup, Baik, Sangat Baik. Constraint mencegah skor 0; N/O tidak menjadi anchor. FK pada `rubric_indicators` dapat menyimpan pasangan indikator dan versi rubrik master yang digunakan.
- Preview baca-saja tersedia di `/dashboard/kerangka` untuk Admin Sistem, Bidang Kader, Observer, dan Instruktur; menu **Kerangka DAD** ditambahkan. Halaman menampilkan bobot aspek, pemetaan materi, tujuan indikator, anchor, panduan bukti, dan N/O. Tidak ada UI edit master atau form asesmen baru.
- Regression SQL tersedia di `supabase/tests/competency_framework_phase3.sql`. TypeScript dan `git diff --check` lulus; pemeriksaan statis menghitung 135 anchor, 135 deskripsi berbeda, dan tepat 5 anchor per indikator. Review isi dilakukan terhadap progression dan fairness pada dokumen trial.
- Percobaan awal migration pemetaan materi gagal pada target `ON CONFLICT` yang tidak sesuai constraint unik tiga kolom. File `20261111120000_dad_training_material_mapping_v1.sql` diperbaiki memakai target `(material_id, indicator_id, aspect_id)`. Pengguna mengonfirmasi migration pemetaan materi berhasil.
- Percobaan migration rubric engine menemukan alias SQL pada query seed anchor bertabrakan (`indicator` dan `rubric`). Query diperbaiki dan constraint/policy dibuat aman diulang. Pengguna mengonfirmasi `20261111130000_dad_indicator_rubric_engine_v1.sql` berhasil dijalankan.
- Pengguna mengonfirmasi `supabase/tests/competency_framework_phase3.sql` berhasil dijalankan dan kemudian melaporkan halaman `/dashboard/kerangka` sudah muncul. Pengguna meminta melanjutkan ke Phase 4.
- Error preview `link.competency_aspects.map is not a function` berasal dari asumsi relasi Supabase selalu berbentuk array. Halaman `/dashboard/kerangka` kini menormalisasi relasi objek maupun array sebelum menampilkan aspek. `npx.cmd tsc --noEmit` dan `git diff --check` lulus setelah perbaikan; server lokal tidak sedang berjalan, jadi tampilan belum diuji ulang di browser.

## Phase 4 — Material Mapping DAD (11 November 2026)

- Prompt Phase 4 menetapkan pemetaan master read-only; UI salin-template ke rubrik kegiatan dan form penilaian penuh tidak termasuk fase ini. Code salin-template yang sempat dibuat berdasarkan interpretasi awal telah dilepas.
- Migration `20261111140000_dad_framework_assessment_snapshots.sql` berhasil dijalankan pengguna. Migration itu menambah referensi sumber opsional untuk snapshot framework/materi dan tidak mengubah hasil lama.
- Mapping final di migration `20261111150000_dad_material_activity_mapping_v1.sql` mencakup 13 materi/aktivitas dari prompt, ditambah konteks “Observasi Lintas Sesi DAD”; setiap mapping memiliki relasi aspek/indikator, metode, panduan, status wajib/opsional, cakupan session/cross_session, status aktif, dan FK ke versi rubrik master published.
- Ada 56 relasi indikator-konteks. HUM-01 (Empati) dan HUM-02 (Solidaritas) sengaja tidak diberi konteks tanpa dasar; empat indikator lintas sesi ialah REL-03, DIS-01, DIS-03, dan DIS-04.
- `/dashboard/kerangka` menampilkan detail konteks, metode, panduan, ketersediaan rubrik, serta matriks read-only materi/aktivitas × 27 indikator. Tidak ada UI edit mapping. Penyimpanan observasi per sesi dan agregasi lintas sesi masih menjadi pekerjaan Phase 5.
- `npx.cmd tsc --noEmit` dan `git diff --check` lulus. Pengguna mengonfirmasi migration `20261111150000_dad_material_activity_mapping_v1.sql` berhasil, tampilan `/dashboard/kerangka` sesuai, dan regression SQL Phase 2–4 berhasil dijalankan.
- Pemeriksaan database yang dikonfirmasi pengguna memakai `supabase/tests/competency_framework_phase2.sql`, `supabase/tests/competency_framework_phase3.sql` (diperbarui untuk 14 konteks/56 mapping), serta `supabase/tests/competency_material_mapping_phase4.sql`. Seluruh pemeriksaan Phase 2–4 lulus menurut pengguna.
- Phase 4 diterima pengguna: materi/aktivitas dan matriks sudah dilihat di halaman kerangka. Deliverable screenshot terpisah belum disimpan; uji lintas role dan proses capture untuk lampiran tidak dilakukan.
- Migration 1500 menjaga snapshot lama dan berhenti jika framework v1 sudah dirujuk rubrik kegiatan. Jalankan setelah migration 1400; jangan rerun bila mapping sudah dipakai hasil asesmen.

## Keputusan terbaru — pendaftaran akun Instruktur

## Perubahan terbaru — foto peserta dan instruktur opsional (11 November 2026)

- Pengguna meminta unggah foto peserta dan instruktur menjadi opsional. Foto Profil saya Instruktur sebelumnya sudah opsional; form peserta Observer/Admin Sistem dan form pengajuan Komisariat kini juga menerima profil tanpa foto.
- Foto tetap dapat diunggah, diganti, ditampilkan privat, dan dibatasi JPG/PNG maksimal 5 MB. Foto yang tidak tersedia menampilkan placeholder.
- Action server untuk tambah/edit peserta tidak lagi menuntut foto. Data peserta pengajuan memakai `photo_path` nullable; migrasi `20261111090000_optional_participant_photos.sql` berhasil dijalankan di Supabase menurut konfirmasi pengguna.
- Surat Mandat tetap wajib untuk mengirim pengajuan. Satu atau lebih profil peserta tetap wajib; foto bukan syarat.
- `npx.cmd tsc --noEmit` lulus pada 11 November 2026 setelah perubahan ini.
- Tampilan dan alur tambah/edit peserta tanpa foto masih perlu diuji manual di browser menggunakan data simulasi.

- Akun permanen untuk instruktur tetap: pendaftaran mandiri dengan email dan kata sandi.
- Akun sementara untuk instruktur perbantuan: dibuat manual oleh Superadmin dengan username dan kata sandi.
- Pemilik kedua jenis akun dapat mengedit profil sendiri.
- Akun belum memiliki akses dashboard sampai Superadmin menetapkan role dan subrole.
- Rancangan dan implementasi dicatat di `BLUEPRINT.md`; pembuatan akun sementara pada halaman Pengguna sudah dikonfirmasi berhasil oleh pengguna.

## Implementasi pendaftaran akun

- Halaman `/daftar` mendaftarkan instruktur tetap dengan email dan kata sandi. Akun tanpa role tertahan pada dashboard tanpa fitur sampai Admin Sistem menetapkan role; penugasan subrole/kegiatan tetap melalui Pengaturan Penilaian.
- Halaman **Pengguna** membuat akun sementara instruktur perbantuan dengan username dan kata sandi; login memetakan username ke alamat internal Supabase di server. Pengguna sudah menyiapkan `SUPABASE_SERVICE_ROLE_KEY` dan melaporkan pembuatan akun berhasil.
- `/dashboard/profil` mengizinkan pemilik mengubah nama tampilan. Kebijakan basis data menjaga role, tipe akun, username, dan tautan Komisariat tidak dapat diubah sendiri.
- Migrasi baru: `20261106220000_instructor_registration_and_self_profile.sql` (jalankan setelah 2100). README, `.env.example`, login, dan dokumen rancangan telah diperbarui.
- Pengguna melaporkan akun sementara bisa masuk ke dashboard tanpa pesan menunggu, dan menu Profil saya tidak terlihat. Perbaikan lokal: Dashboard Instruktur sekarang menahan akses sampai ada penugasan kegiatan/subrole; semua dashboard ber-role menampilkan tautan **Profil saya**. `npx.cmd tsc --noEmit` lulus. Perubahan ini belum dicoba pada browser/Supabase pengguna.
- `npm.cmd run build` berhasil mengompilasi aplikasi dan TypeScript, tetapi prerender beberapa kali terhenti dengan `EPERM` saat worker Windows Next.js membuat subfolder `.next/server/app/_not-found.segments/_not-found`. Ini belum menunjukkan kesalahan kode, tetapi build lengkap belum terkonfirmasi pada percobaan akhir. Pembuatan akun sementara sudah diuji pengguna; login username, edit profil, pendaftaran mandiri email, dan otorisasi role masih perlu diperiksa manual.

## Perluasan Profil saya

- Pengguna menetapkan enam kolom wajib: nama lengkap, tempat lahir, tanggal lahir, jenis kelamin, nomor handphone, dan alamat domisili; foto terbaru opsional.
- Formulir dan validasi server dibuat pada `/dashboard/profil`. Foto memakai JPG/PNG maksimal 5 MB dan bucket privat.
- Data sensitif dipisahkan dalam tabel `account_personal_profiles` agar RLS baca profil rekan Instruktur tidak ikut membuka tanggal lahir, nomor telepon, atau alamat. Detail pribadi hanya dapat dibaca pemilik; nama lengkap/foto dibagikan melalui RPC terbatas kepada akun ber-role.
- Migrasi `20261106230000_account_personal_profile_fields.sql` harus dijalankan setelah migrasi 2200. Migrasi, foto, dan penyimpanan profil belum diuji di Supabase pengguna.
- Pengguna menetapkan jenis kelamin sebagai pilihan Laki-laki/Perempuan dan memutuskan nama lengkap/foto boleh dilihat semua role. Formulir kini memakai pilihan tetap; daftar `/dashboard/profil-instruktur` dibuka untuk semua akun ber-role dan menampilkan hanya nama lengkap/foto. Pengunjung publik tetap tertahan sampai ada keputusan/persetujuan khusus.
- Migrasi `20261106240000_shared_instructor_name_photo.sql` menambahkan batas pilihan jenis kelamin, RPC terbatas yang hanya mengembalikan nama/foto Instruktur, dan izin baca foto untuk seluruh akun terautentikasi. Jalankan setelah migrasi 2300.
- Migrasi `20261106250000_private_profile_owner_only.sql` memastikan detail pribadi tidak dapat dibaca Admin Sistem; nama/foto tetap dibagikan sesuai keputusan. Jalankan setelah 2400.
- `npx.cmd tsc --noEmit` lulus setelah perubahan pilihan gender dan direktori nama/foto. Migrasi dan tampilan browser belum diuji pada Supabase pengguna.
- Pengguna mengonfirmasi pilihan jenis kelamin dan tampilan nama/foto untuk akun ber-role sudah berfungsi setelah migrasi. Akses pengunjung publik tetap belum dibuka; persetujuan pemilik masih perlu ditentukan jika profil akan dipublikasikan.

## Baca sebelum melanjutkan

- `AGENTS.md` — aturan kerja dan komunikasi.
- `BLUEPRINT.md` — sumber keputusan dan rancangan.
- `README.md` — petunjuk menjalankan dan pengaturan Supabase lokal.

## Ringkasan proyek

Website pemantauan dan evaluasi Pelatihan Kader IMM Kota Bandung, fokus awal DAD. Uji awal ditargetkan tanpa biaya awal dan memakai data simulasi. Teknologi saat ini Next.js 16.4.3, React 19.2.0, dan Supabase untuk login serta basis data.

Keputusan pengguna: scoring dapat berubah sesuai kesepakatan instruktur dan perlu halaman konfigurasi khusus; Google Forms dipakai untuk tes awal, kemudian hasil ekspor Sheets diimpor; hanya Observer mengisi penilaian; peserta kelak hanya melihat nilai ringkas sementara miliknya dan catatan pengembangan/perhatian. Baca `BLUEPRINT.md` untuk keseluruhan hak akses, rubrik, dan keputusan terbuka.

## Status tahap

- **Tahap 1 — tampilan dasar dan navigasi:** diterima pengguna.
- **Tahap 2 — login, role, pembatasan akses:** diterima pengguna setelah pemeriksaan manual dasar pada Supabase. Pemeriksaan Server Action langsung sebagai non-Admin belum dilakukan; implementasi action memeriksa role Admin di server dan mutasi tunduk pada RLS.
- **Tahap 3 — kegiatan dan peserta simulasi:** diterima pengguna saat meminta melanjutkan ke tahap berikutnya (29 Oktober 2026). Manual Supabase yang dilaporkan: kegiatan dapat diedit; Observer/Admin Sistem dapat menambah, mengedit, dan menghapus peserta; Bidang Kader/Komisariat/Peserta tidak dapat menambah peserta; daftar Komisariat dapat diedit/dinonaktifkan; foto peserta berhasil diunggah dan tersimpan. Tampilan foto belum dikonfirmasi terpisah.
- Persiapan Tahap 4: pengguna memilih skala indikator 1–5 dengan label 1 Belum terlihat, 2 Mulai berkembang, 3 Cukup, 4 Baik, 5 Sangat baik.
- Skor indikator harus berupa bilangan bulat tanpa nilai pecahan.
- Total bobot indikator pada setiap aspek adalah 100%.
- Total bobot antar-aspek adalah 100%.
- Observer dapat memilih Belum diamati untuk indikator tanpa skor.
- Jika sebagian indikator tidak diamati, bobot sisa di aspek disesuaikan kembali menjadi 100% pada perhitungan peserta tersebut.
- Aturan aspek kosong yang sebelumnya terbuka sudah dijawab pengguna: aspek dikeluarkan dan bobot aspek lain dinormalisasi ulang.
- Pengguna melanjutkan Tahap 4 pada 29 Oktober 2026 dan memilih: aspek tanpa satu pun indikator yang diamati dikeluarkan, lalu bobot aspek lain dinormalisasi ulang.
- Aturan nilai resmi: resmi setelah semua Observer yang ditugaskan menyelesaikan penilaian; skor/catatan yang berubah menghapus status selesai semua Observer kegiatan. Nilai belum lengkap tetap sementara.
- Format nilai: rata-rata berbobot skala 1–5 dikonversi ke 0–100 memakai `(rata-rata − 1) ÷ 4 × 100`. Pengguna menyetujui perhitungan tanpa pembulatan dan tampilan dua desimal.
- Implementasi lokal Tahap 4: migrasi `20261029070000_rubrics_observations.sql`; halaman `/dashboard/penilaian` untuk membuat/mengaktifkan versi rubrik, aspek, indikator dan penugasan Observer per kegiatan; halaman `/dashboard/observasi` untuk skor 1–5, “Belum diamati”, catatan privat, simpan otomatis, deteksi konflik dan riwayat revisi.
- RLS membatasi detail peserta/observasi kepada Admin Sistem atau Observer yang ditugaskan ke kegiatan. Versi aktif/arsip dilindungi dari perubahan; draf hanya aktif bila total bobot aspek dan total indikator dalam setiap aspek masing-masing 100%. Versi draf berikutnya menyalin konfigurasi sebelumnya.
- Pemeriksaan `npx tsc --noEmit` lulus. Pengguna menyatakan Tahap 4 sesuai dan meminta lanjut; migrasi belum dijalankan di Supabase pengguna dan alur browser belum diperiksa manual. Indikator final perlu diisi sesuai kesepakatan instruktur; penugasan saat ini per kegiatan. UI menampilkan agregat Observer dan status resmi/sementara.
- Tahap 5 (impor hasil tes) ditunda atas arahan pengguna agar pekerjaan fokus pada Observer dan Komisariat. Keputusan impor tetap `.xlsx`, riwayat disimpan dan versi aktif dikonfirmasi; akses hanya Admin Sistem. Migrasi dan UI impor lokal sudah ada, tetapi belum diperiksa.
- Pemeriksaan manual yang dilaporkan pengguna: edit kegiatan berhasil; Observer dan Admin Sistem (Super Admin) berhasil menambah serta menghapus peserta; Bidang Kader, Komisariat, dan Peserta tidak dapat menambah peserta. Pengguna sudah menjalankan migrasi terkait di Supabase.
- Halaman Admin Sistem `/dashboard/komisariat` menambah/mengedit nama Komisariat serta menonaktifkan/mengaktifkan entri. Migrasi `20261029030000_commissariats.sql` membuat tiga nama contoh (Komisariat Simulasi 01–03); tidak menghapus baris agar relasi historis tetap aman. `npm run build` berhasil dan rute terdeteksi; pengguna melaporkan migrasi 0300 dan 0400 berhasil dijalankan di Supabase. Halaman belum dikonfirmasi tampil/berfungsi secara manual.
- Pengguna mengonfirmasi edit nama dan menonaktifkan Komisariat berhasil di web.
- Migrasi `20261029040000_allow_same_name_participants.sql` mengizinkan nama peserta yang sama dalam satu Komisariat. Pengguna melaporkan migrasi 0300 dan 0400 berhasil dijalankan.
- Migrasi `20261029050000_participant_profiles.sql` menambah jurusan, tahun angkatan, jabatan opsional, dan referensi Komisariat ke tabel peserta; memberi nilai contoh pada data simulasi lama.
- Form peserta di `/dashboard/peserta` sekarang menyediakan tambah dan edit profil lengkap, dengan pilihan Komisariat aktif. Pengguna melaporkan migrasi 0500 berhasil dijalankan; halaman form terbaru masih perlu dicoba manual.
- Foto peserta kini dapat diunggah/diganti JPG/PNG maksimal 5 MB melalui bucket Storage privat. Migrasi `20261029060000_private_participant_photos.sql` menambah kolom path, bucket, dan RLS; pengguna melaporkan migrasi berhasil. `next.config.ts` menaikkan batas Server Action ke 6 MB untuk multipart request.
- Pengguna melaporkan tambah, edit, dan hapus peserta berhasil pada form terbaru. Edit dan nonaktifkan Komisariat juga berhasil; migrasi 0500 sudah dijalankan.
- `npx tsc --noEmit` setelah perubahan unggah foto berhasil tanpa error. Build produksi sebelumnya berhasil mengompilasi bundle dan tipe, tetapi gagal saat prerender `/_not-found` karena Windows mengembalikan `EPERM` saat Next membuat folder `.next/server/app/_not-found.segments/_not-found`; terjadi pada Turbopack dan Webpack. Pengguna mengonfirmasi foto berhasil diunggah dan tersimpan; tampilan thumbnail belum dikonfirmasi secara terpisah.
- Pengguna memilih membangun pengajuan Komisariat terlebih dahulu. Implementasi lokal sekarang mencakup tautan akun Komisariat di halaman Pengguna, pengajuan peserta dengan berkas privat, tinjauan administrasi Observer, catatan privat, dan publikasi hasil.
- Migrasi `20261029100000_commissariat_submission_drafts.sql` menyiapkan skema, RLS, bucket privat, dan RPC alur draf/kirim/batal/mulai tinjauan/terbitkan hasil. Jalankan sesudah migrasi 0900. Jika migrasi 1000 sudah dijalankan, jangan jalankan ulang sebagai SQL baru.
- `/dashboard/pengajuan` adalah halaman akun Komisariat. `/dashboard/seleksi-komisariat` adalah halaman Observer yang ditugaskan dan Admin Sistem. Hasil administrasi ditampilkan Komisariat hanya setelah diterbitkan.
- Implementasi belum mencakup unduhan Excel/PDF, screening, peserta tambahan saat screening, atau mandat tambahan. Retensi/penghapusan terjadwal belum dibuat.
- `npx tsc --noEmit` berhasil setelah penambahan halaman/action Observer dan tampilan hasil. Migrasi belum dijalankan/diperiksa pada Supabase pengguna; alur browser dan akses lintas role belum diuji.
- Kriteria pemeriksaan manual berikutnya: akun Komisariat hanya melihat pengajuannya sendiri; draf wajib memiliki mandat dan setidaknya satu peserta; Observer tanpa penugasan tidak bisa membuka/mengubah pengajuan; hasil dan alasan baru tampak bagi Komisariat setelah publikasi; catatan internal tidak pernah tampak pada akun Komisariat.
- 6 November 2026: atas masukan pengguna, halaman Pengaturan Penilaian diubah menjadi daftar kegiatan DAD terlebih dahulu. Setelah memilih kegiatan, admin melihat/mengelola rubrik dan menugaskan Observer untuk kegiatan itu. Observer yang sudah ditugaskan akan melihat kegiatan di menu Observasi. `npx tsc --noEmit` lulus setelah perubahan; pemeriksaan manual browser belum dilakukan.
- Pengguna melaporkan aksi Tugaskan menampilkan error. Pemeriksaan screenshot menunjukkan aksi insert penugasan gagal; daftar sudah memiliki satu assignment. Perubahan sekarang memakai `observer_id` langsung untuk mencegah Observer yang sudah ditugaskan muncul kembali, mengecek duplikasi sebelum simpan, dan mengembalikan pesan yang ramah pengguna. `npx tsc --noEmit` lulus; perlu muat ulang halaman dan mencoba kembali.
- 6 November 2026: pengguna ingin mencoba trial untuk pelatihan mendatang dari PK IMM FEB UM Bandung. Halaman Kegiatan DAD menyediakan form membuat kegiatan berstatus Direncanakan dengan nama/penyelenggara default PK IMM FEB UM Bandung; pengguna mengisi lokasi serta tanggal. Ini hanya metadata kegiatan. Data peserta/foto/nilai nyata tetap tidak digunakan sebelum pemeriksaan akses, privasi, dan backup selesai.
- Atas permintaan pengguna, Observer kini hanya melihat kegiatan yang ditugaskan pada halaman Kegiatan DAD, tidak dapat mengganti nama kegiatan, dan form tambah kegiatan hanya untuk Admin Sistem. Migrasi baru `20261106120000_observer_event_scope_and_rename_guard.sql` mengatur RLS dan trigger supaya aturan yang sama berlaku di basis data. Jalankan migrasi ini di Supabase sebelum memakai perubahan. `npx tsc --noEmit` lulus; verifikasi browser/Supabase belum dilakukan.
- Pengguna menetapkan pengelolaan rubrik aktif sementara hanya dipegang Super Admin/Admin Sistem. UI dan Server Action pembuatan, perubahan, versi baru, serta aktivasi rubrik dibatasi ke `admin_system`; Bidang Kader masih dapat membaca rubrik dan mengelola penugasan Observer. Migrasi `20261106130000_superadmin_rubric_management.sql` mengubah RLS terkait. Jalankan setelah migrasi 1200; `npx tsc --noEmit` lulus, basis data/browser belum diuji.
- 6 November 2026: Pengaturan Penilaian menuntun pemilihan kegiatan → tahap → jenis penilaian → versi rubrik. Tahap Screening dan Pelatihan disediakan; Rencana Tindak Lanjut ditambahkan pada perubahan terbaru dengan rubrik 1–5 tanpa materi. Super Admin dapat menambah jenis penilaian per tahap; setiap jenis menyimpan rubrik berversi dengan aspek, indikator, target, dan bobot sendiri. Migrasi `20261106140000_stage_and_assessment_type_rubrics.sql` menambah cakupan tahap/jenis dan mempertahankan rubrik lama di Pelatihan dengan jenis “Penilaian umum”. Migrasi `20261106150000_allow_rubric_activation.sql` memperbaiki kebijakan aktivasi rubrik.
- 6 November 2026: Pengguna melaporkan aktivasi rubrik menampilkan “Rubrik gagal diaktifkan.” Penyebab pada kebijakan RLS migrasi 0700: UPDATE draf mengizinkan status hasil `draft` atau `archived`, tetapi tidak `active`, sehingga database menolak aktivasi. Migrasi `20261106150000_allow_rubric_activation.sql` mengganti kebijakan agar Admin Sistem boleh mengaktifkan draf. Pengguna perlu menjalankan migrasi 1500 sesudah 1400 di Supabase SQL Editor, lalu coba lagi. Jangan buat draf baru; draf yang gagal diaktifkan tetap ada.
- Pengguna melanjutkan implementasi ke halaman Observasi: pilih kegiatan → tahap → jenis penilaian sebelum mengisi skor. Setelah materi Pelatihan diminta, langkah materi juga ditambahkan. Penyelesaian Observer dicatat terpisah per versi rubrik.
- Hasil uji manual pengguna setelah migrasi 1600: Observer berhasil menginput nilai pada Screening, menandai jenis penilaian selesai hingga status menjadi **Nilai resmi**, mengubah nilai, melihat status kembali menjadi **Nilai sementara**, lalu menyelesaikan lagi hingga resmi. Alur input, status resmi, dan pembukaan ulang untuk Screening terkonfirmasi di proyek Supabase pengguna. Jenis/tahap Pelatihan belum diuji.
- Pengguna meminta Pelatihan menampilkan langkah penambahan **Nama Materi** sebelum jenis penilaian/rubrik. Implementasi memisahkan rubrik per materi pada tahap Pelatihan; Screening tetap tanpa materi. Menu Pengaturan Penilaian dan Observasi mengikuti alur kegiatan → tahap → materi (Pelatihan) → jenis penilaian → rubrik. Rubrik Pelatihan lama dipindahkan ke materi “Materi umum”. Status selesai ditautkan ke versi rubrik spesifik agar nilai antar-materi tidak bercampur. Migrasi `20261106170000_training_material_rubrics.sql` dijalankan pengguna. `npx tsc --noEmit` lulus. Pengguna mengonfirmasi Observer berhasil menginput nilai Pelatihan dan menyelesaikan uji: status bisa menjadi resmi, kembali sementara setelah nilai diubah, lalu terpisah dari status Screening. Alur konfigurasi dan observasi Screening/Pelatihan telah diuji manual pengguna.
- Pengguna meminta dashboard hasil untuk Observer, Super Admin, dan Instruktur, serta kategori nilai. Keputusan pengguna: Instruktur adalah role baru, hanya menerima rekap untuk kegiatan yang ditugaskan tanpa nama peserta/catatan privat. Kategori disetujui: 0–<60 Perlu pengembangan; 60–<75 Cukup; 75–<90 Baik; 90–100 Sangat baik. Rencana Tindak Lanjut memakai rubrik/skor 1–5 seperti tahap lain. Implementasi lokal menambah ringkasan dashboard, assignment Instruktur oleh Super Admin di Pengaturan Penilaian, fungsi RPC Supabase yang hanya mengirim agregat ke Instruktur, dan konfigurasi/observasi untuk tahap Rencana Tindak Lanjut. Migrasi `20261106180000_dashboard_results_categories_instructor_role.sql` perlu dijalankan setelah 1700. `npx tsc --noEmit` lulus; Supabase/browser belum diperiksa. Uji manual berikutnya: jalankan migrasi, buat akun Instruktur dan tetapkan role, tugaskan ke kegiatan, pastikan dashboardnya hanya berisi rekap/kategori, lalu periksa dashboard Observer/Admin menampilkan hasil individu dan kategori di ketiga tahap.
- Pengguna meminta subrole Instruktur MoT, Vice MoT, IoT, Vice IoT, Master of Observer, dan Vice Observer. Subrole dipilih **per kegiatan**, dan pengguna menegaskan role Observer yang sudah berjalan harus dipertahankan. Rujukan SPI IMM 2011 menjelaskan tugas MoT/Vice MoT/IoT/Observer/Koordinator Observer; uraian detail Vice IoT dan Master/Vice Observer diimplementasikan sebagai checklist operasional rancangan lokal. Perubahan menambah pilihan subrole saat penugasan, checklist tugas tersimpan per kegiatan, dan tampilan dashboard berdasarkan tugas; IoT/Vice IoT tidak melihat hasil penilaian, sementara MoT dan koordinator Observer melihat agregat yang relevan tanpa catatan privat. Migrasi baru `20261106190000_instructor_positions_and_duties.sql` harus dijalankan setelah 1800. `npx tsc --noEmit` lulus; migrasi dan tampilan browser belum diuji pada Supabase pengguna.
- Perubahan terbaru pengguna: semua subrole Instruktur yang ditugaskan pada kegiatan boleh membuka Observasi dan menginput skor/catatan seperti Observer. Akses hanya dibuka pada kegiatan yang terkait assignment; perubahan rubrik, peserta, atau assignment tidak ikut diberikan. Riwayat baru mencatat nilai/catatan sebelum-sesudah, nama akun pelaku, serta waktu. Catatan lama sebelum migrasi tidak memiliki identitas pelaku yang dapat dipastikan dan diberi label riwayat lama. Migrasi `20261106200000_instructor_assessment_and_change_history.sql` dijalankan setelah 1900. Role Observer dan alur penyelesaiannya tetap ada. `npx tsc --noEmit` lulus; SQL dan browser belum diuji.
- Pengguna meminta dashboard peserta, profil peserta, dan hasil penilaian pada setiap subrole Instruktur; menu utama juga memuat Profil Peserta dan Profil Instruktur. Daftar kegiatan di kedua halaman profil berasal hanya dari assignment akun itu. Implementasi lokal mengganti dashboard Instruktur dari ringkasan tanpa identitas menjadi daftar peserta dan skor/kategori individual, menyediakan halaman baca-saja Profil Peserta dan Profil Instruktur, serta mempertahankan tugas checklist setiap subrole. Migrasi `20261106210000_instructor_assigned_profiles.sql` menambah akses baca anggota tim dan foto privat yang tetap dibatasi per kegiatan. Semua subrole Instruktur sekarang melihat hasil di dashboard dan dapat memilih kegiatan pada halaman profil. `npx tsc --noEmit` lulus; migrasi, login, gambar privat, dan browser belum diuji pada Supabase pengguna.
- Berkas wajib yang disebut pengguna: satu Surat Mandat Komisariat per pengajuan dan satu foto formal tiap peserta (jas IMM, latar putih).
- Rancangan batas unggahan disetujui: Surat Mandat PDF maks. 10 MB; foto JPG/PNG maks. 5 MB per peserta. Foto akan tampil di halaman penilaian peserta dan rapor dengan akses sesuai role yang sudah disepakati.
- Surat Mandat disimpan sampai hasil seleksi administrasi diterbitkan. Foto disimpan selama rapor peserta tersedia.
- Cakupan akses foto yang disetujui: peserta terkait pada rapornya, Observer yang ditugaskan, Admin Sistem, dan Bidang Kader berwenang; bukan Komisariat lain atau publik.
- Satu pengajuan Komisariat memuat beberapa peserta: satu Surat Mandat per pengajuan dan satu foto per peserta.
- Tidak ada batas jumlah peserta tetap per pengajuan untuk satu kegiatan.
- Pengguna menyetujui lima kolom profil peserta: nama lengkap, asal komisariat, jurusan/program studi, tahun angkatan, dan jabatan. Empat kolom pertama wajib; jabatan opsional.
- Tahun angkatan ditulis sebagai tahun kalender empat angka (contoh `2024`).
- Jabatan berupa teks bebas dan opsional.
- Asal komisariat akan dipilih dari daftar terkelola. Perlu halaman Admin Sistem/Super Admin untuk menambah/mengedit daftar komisariat; daftar nama nyata belum diberikan. Gunakan ID tetap untuk menjaga relasi data saat nama diedit.
- Komisariat lama dinonaktifkan, bukan dihapus, agar riwayatnya tetap dapat ditampilkan.
- Beberapa akun dapat berbagi satu Komisariat; Super Admin mengatur tautan akun dengan Komisariat.
- Semua akun dalam Komisariat boleh mengajukan/membatalkan sebelum tinjauan dimulai; sesudahnya hanya dapat melihat status dan unduhan.
- Satu akun Komisariat tertaut ke satu Komisariat saja.
- Satu pengajuan aktif per Komisariat per kegiatan; dapat dibatalkan dan diajukan ulang sebelum ditinjau.
- Kolom wajib yang kosong/salah format memblokir pengiriman; preview menunjukkan masalah yang harus diperbaiki Komisariat.
- Hasil seleksi administrasi maupun screening hanya `Lolos` atau `Tidak Lolos`; tanpa status cadangan.
- Observer boleh memberi alasan singkat pada status Tidak Lolos; alasan opsional dapat dilihat Komisariat di web dan unduhan. Catatan internal Observer tidak dibagikan.
- Hasil tahap baru ditampilkan setelah Observer meninjau seluruh peserta dan menekan tombol `Terbitkan hasil`.
- Hasil seleksi yang diterbitkan diunduh dalam format Excel dan PDF.
- Hanya peserta Lolos administrasi diteruskan ke screening.
- Berkas hasil mencakup lima kolom profil peserta, status seleksi, dan alasan bila tersedia; tidak menyertakan foto atau Surat Mandat.
- Saat screening Observer dapat menambahkan peserta dan langsung menetapkan hasil Lolos/Tidak Lolos.
- Asal Komisariat peserta baru saat screening dipilih dari master data Komisariat.
- Peserta yang ditambahkan Observer pada screening tetap harus memiliki profil lengkap; foto opsional.
- Peserta tambahan yang belum tercantum pada Surat Mandat awal memerlukan Surat Mandat tambahan.
- Komisariat dapat mengirim Surat Mandat tambahan lewat halaman status tanpa mengedit/membuka kembali daftar peserta yang terkunci.
- Preview unggahan Komisariat harus memperingatkan nama lengkap dan komisariat yang sama dalam satu kegiatan. Jika memang orang berbeda, Komisariat boleh mengunggah kedua baris tanpa menghapus salah satunya.
- Admin Sistem, Bidang Kader, Observer, dan Komisariat memakai login email + kata sandi. Tidak ada pilihan role simulasi lagi di dashboard. Role dibaca dari `profiles` di server. Metode akses sementara Peserta belum ditentukan.
- SQL migrasi menyiapkan profil, role, trigger pembuatan profil tanpa role, dan kebijakan RLS dasar.
- Halaman admin `/dashboard/pengguna` dapat membaca profil dan menetapkan/mengubah role akun yang sudah dibuat. Pembuatan akun masih melalui Supabase Authentication → Users; Admin pertama disiapkan lewat SQL Editor. Perubahan role akun aktif sengaja tidak diizinkan dari halaman tersebut.
- Migrasi dan kontrol akses untuk kegiatan, peserta, observasi, impor tes, serta pengajuan Komisariat tersedia. Dashboard beberapa role masih berisi placeholder; analitik/rapor dan pemeriksaan keamanan lintas role belum selesai.

## Pemeriksaan terakhir

`npm run build` berhasil setelah halaman pengelolaan pengguna ditambahkan dengan Next.js 16.4.3. Rute terdeteksi: `/`, `/login`, `/dashboard`, `/dashboard/pengguna`, `/auth/signout`. Build hanya membuktikan kompilasi dan rendering; belum membuktikan login Supabase, SQL pada proyek nyata, atau keamanan seluruh data bisnis.

Pengguna melaporkan pemeriksaan manual terhadap proyek Supabase: Admin Uji berhasil login dan melihat satu akun pada halaman Pengguna; role Observer berhasil diberikan; akun Observer berhasil login serta membuka dashboard; saat mengakses `/dashboard/pengguna` sebagai Observer, aplikasi kembali ke login dan daftar pengguna tidak terlihat. Sesudah role akun uji diubah menjadi tanpa akses, dashboard menampilkan peringatan “Akses belum diberikan”. Pemeriksaan dilakukan pada 29 Oktober 2026.

`npm run build` setelah perubahan Tahap 3 berhasil; rute `/dashboard/kegiatan` dan `/dashboard/peserta` terdeteksi. Build hanya memeriksa kompilasi dan tipe. SQL, halaman terhubung, serta penolakan akses Observer/Komisariat perlu diperiksa setelah migrasi diterapkan di Supabase.

## Langkah berikutnya

1. Untuk penilaian, masuk dengan dua akun yang ditugaskan pada kegiatan simulasi. Aktifkan rubrik dengan satu indikator pada dua aspek, bobot aspek berjumlah 100%, total bobot pemetaan tiap aspek 100%, dan uraian skor 1–5.
2. Buka peserta/indikator yang sama dari kedua akun. Ubah skor hampir bersamaan, pastikan muncul peringatan konflik dan pilihan penyelesaian.
3. Isi catatan kategori yang sama dari kedua akun; pastikan catatan masing-masing penulis tetap tersimpan dan perubahan tersinkron.
4. Periksa ringkasan/dashboard dan pastikan indikator multi-aspek memakai satu skor bersama.
5. Langkah profil lama yang masih menunggu: jalankan `20261106230000_account_personal_profile_fields.sql`, lalu `20261106240000_shared_instructor_name_photo.sql` di Supabase SQL Editor.
2. Masuk ke **Profil saya**, isi semua kolom wajib dan simpan. Ulangi dengan foto JPG/PNG di bawah 5 MB, lalu pastikan foto tampil.
3. Pastikan data pribadi hanya dapat dibaca pemilik dan Admin Sistem, sementara nama/foto Instruktur terlihat di daftar **Profil Instruktur** pada semua akun ber-role.
4. Uji dashboard akun tanpa penugasan, lalu tetapkan role/subrole/kegiatan dan pastikan dashboard terbuka setelah ditugaskan.
5. Akses pengunjung publik ke foto/nama masih menunggu keputusan privasi; aturan blueprint mensyaratkan persetujuan pemilik sebelum data profil nyata tampil publik.

## Menjalankan lokal (PowerShell)

```powershell
cd "C:\Users\Lenovo\Documents\project"
npm.cmd run dev
```

Buka `http://localhost:3000`. Hentikan server dengan `Ctrl+C`.


## Perbaikan tombol Terapkan Kerangka DAD (12 November 2026)

- Panel pilihan aspek/indikator sebelumnya tertutup saat halaman dibuka, dan tombol Terapkan berada setelah daftar indikator yang panjang. Tombol tidak tampak pada halaman awal sehingga terlihat seolah tidak dapat diklik.
- `app/dashboard/penilaian/framework-rubric-picker.tsx`: panel dibuka secara default dan tombol Terapkan dipindah ke atas daftar.
- `app/globals.css`: tombol dibuat sticky agar tetap mudah dijangkau saat menggulir pilihan.
- Pemeriksaan browser lokal menunjukkan halaman rubrik draf Versi 1 untuk materi AIK; panel memang tertutup dan tombol Terapkan tidak tampil. Belum dilakukan klik submit agar data rubrik pengguna tidak berubah tanpa instruksi.

## Perbaikan indikator Kerangka DAD tidak tampil di rubrik (12 November 2026)

- Akar masalah pada halaman Pengaturan Penilaian: relasi Supabase `rubric_indicators` di dalam `rubric_indicator_aspects` dibaca seolah selalu berupa array (`[0]`). Relasi many-to-one dapat dikembalikan sebagai objek, sehingga indikator hasil pilihan bisa tersimpan tetapi tidak ditampilkan dan versi tetap dianggap belum lengkap.
- `app/dashboard/penilaian/page.tsx` kini menormalkan relasi objek atau array sebelum menampilkan indikator, memuat pilihan tersimpan, menghitung kelengkapan rubrik, dan menentukan aspek lain yang sudah terhubung.
- `npx.cmd tsc --noEmit` dan `git diff --check` lulus. Silakan muat ulang Pengaturan Penilaian untuk memastikan indikator DAD yang dipilih terlihat di draf.

## Phase 6 — Scoring Engine & Collective Evaluation (implementasi lokal, 12 November 2026)

- Menambahkan migration `supabase/migrations/20261112170000_dad_scoring_collective_evaluation_v1.sql`. Terapkan setelah migration Phase 5 `20261111160000_dad_assessment_workspace_v1.sql`.
- Migration menambah NIM/kelompok opsional pada peserta; kebijakan coverage 80% dan rentang review 2; RPC agregasi berdasarkan peserta/indikator/cakupan; tabel moderasi dan riwayatnya; evaluasi kolektif dan riwayat; rekomendasi; snapshot final immutable; serta payload privat sumber nilai/bukti yang tidak bisa dibaca Bidang Kader.
- Halaman baru `/dashboard/evaluasi` (menu **Evaluasi Kolektif**) menampilkan agregat/aspek/coverage, skor minimum–maksimum, N/O, pending, moderasi, diskusi kolektif, rekomendasi, keputusan manual, dan riwayat snapshot. Server action dan RLS membatasi tulis/finalisasi kepada Admin Sistem dan koordinator Instruktur kegiatan. Keputusan kelulusan tidak diotomatisasi.
- Rumus keseluruhan tidak menormalisasi ulang bobot aspek. Finalisasi memerlukan coverage minimal tiap aspek, total bobot 100%, dan tidak ada moderasi terbuka. RPC finalisasi memeriksa ulang snapshot, formula nilai, coverage, dan referensi rating Submitted/Finalized.
- Pemeriksaan lokal: `npm.cmd run test:phase6` lulus 8/8; `npx.cmd tsc --noEmit` dan `git diff --check` lulus. Node memberi peringatan tipe modul pada test runner, tetapi tes tidak gagal.
- Belum diterapkan atau diuji di Supabase. Belum ada verifikasi browser, dua akun, RLS lintas role, SQL RPC, Realtime, dan snapshot pada database. Terapkan migration Phase 5 dahulu jika belum, lalu migration Phase 6; jalankan `supabase/tests/dad_assessment_phase5.sql` dan `supabase/tests/dad_scoring_phase6.sql` setelah keduanya. Perubahan database tidak dilakukan oleh Codex.
- Migration mengandalkan struktur Phase 5 dan Phase 2–4 yang sudah tersedia. Jika Supabase melaporkan error, simpan pesan lengkap sebelum mengubah atau mencoba ulang migration yang sudah berjalan.
- Pembaruan setelah persetujuan pengguna: tombol **Buat draf rekomendasi otomatis** membuat saran deterministik untuk indikator dengan rata-rata Submitted/Finalized di bawah 3/5. Saran berisi latihan umum per aspek, menyimpan referensi indikator/cakupan, dan tidak menggandakan draf yang sama saat ditekan ulang. Semua saran baru berstatus `draft` dan membutuhkan persetujuan instruktur; bukan fitur AI dan tidak menentukan kelulusan.
- Tes pure-logic rekomendasi ditambahkan ke `tests/phase6-recommendations.test.ts`; jalankan bersama tes skor melalui `npm.cmd run test:phase6`.

## Phase 7 — Dashboard, Rapor, Reporting & Export (implementasi lokal, 12 November 2026)

- Audit menemukan dashboard role sebelumnya memakai data simulasi statis; schema `events` belum punya tema/penyelenggara; role Peserta belum ditautkan ke record `participants`; belum ada library PDF/ZIP. Fase 7 mengganti dashboard root untuk Admin/Bidang Kader/Instruktur/Observer/Peserta dengan metrik database, menambah halaman `/dashboard/laporan`, dan tidak mengubah framework/rubrik/mapping/rumus skor.
- Migration baru `20261112180000_dad_reporting_publication_v1.sql` menambah tema/penyelenggara, tautan akun peserta, RLS/RPC untuk publikasi snapshot final, baca rapor Published oleh peserta sendiri, daftar report staff, progres Observer, dan audit ekspor/publikasi. Jalankan setelah Phase 5 dan Phase 6 lengkap.
- Admin Sistem menautkan akun role Peserta dari halaman Laporan & Rapor. Rapor peserta hanya dapat dibaca melalui RPC miliknya jika sudah Published. Admin/Bidang Kader/koordinator dapat melihat snapshot final; preview final yang belum Published tidak diekspor sebagai rapor resmi.
- Dashboard laporan menampilkan status/ringkasan final, rata-rata aspek, heatmap peserta, indikator review, progres penilai, filter kegiatan/kelompok/status, publikasi rapor, preview, dan ekspor. PDF individual dibuat oleh generator PDF internal tanpa dependency tambahan. ZIP massal mendukung pilih satu/beberapa atau semua rapor Published di filter, serta melaporkan peserta yang dilewati. Excel memakai dependency `xlsx` yang sudah ada; tersedia rekap peserta, per materi, evaluasi akhir, dan internal Observer untuk Admin/koordinator. PDF event report merangkum snapshot final dan rekomendasi yang berulang.
- Tautan akun Peserta unik per kegiatan (akun yang sama bisa terkait dengan rekam peserta di kegiatan berbeda). Peserta dapat mengunduh PDF rapor Published miliknya; pencatatan ekspor membatasi akses berdasarkan tautan tersebut.
- Data snapshot Phase 6 baru kini menyimpan kekuatan dan area pengembangan dalam bagian collective yang aman untuk hasil final; sumber rating/evidence/catatan deliberasi tetap di tabel privat. Snapshot lama yang tidak punya kolom itu tidak diisi dengan tebakan.
- Tes lokal: `npm.cmd run test:phase6` lulus 10/10; `npm.cmd run test:phase7` lulus 2/2 (struktur PDF dan ZIP); `npx.cmd tsc --noEmit` serta `git diff --check` lulus. Node menampilkan peringatan `MODULE_TYPELESS_PACKAGE_JSON`; tes tetap lulus.
- `npm.cmd run build` berhasil kompilasi dan TypeScript, tetapi gagal pada prerender `/login` dengan Windows `EPERM` saat Next.js membuat `.next/server/app/login.segments/login`. Karena itu build produksi belum dinyatakan lulus.
- SQL Regression `supabase/tests/dad_reporting_phase7.sql` tersedia. Belum ada migration Phase 7 yang diterapkan atau uji database/browser/RLS lintas akun. Sebelumnya pengguna mendapat `42P07 relation assessment_submissions already exists` ketika menjalankan skrip terkait Phase 5; ini menunjukkan tabel sudah ada tetapi belum membuktikan migration Phase 5 selesai. Jangan drop tabel atau mengulang Phase 5; jalankan tes Phase 5 dan Phase 6 untuk memastikan kelengkapan sebelum migration 1800.
- Batasan yang belum diverifikasi: tampilan PDF pada browser/PDF reader dan ZIP/Excel di desktop belum dicoba; export Excel community `xlsx` belum menyediakan pembekuan baris header melalui API yang digunakan. Filter materi dan Observer berlaku khusus sheet ekspor, sedangkan filter dashboard umum adalah kegiatan, kelompok, dan status. Migration Phase 7 dan SQL regression belum diterapkan/dijalankan di Supabase; uji browser serta RLS lintas akun belum tersedia.
