# Matriks Keputusan Produk (IMM Observer)

Dokumen ini bersifat **mengikat setelah diisi dan ditandatangani pemilik**. Untuk item yang sama, dokumen ini mengalahkan `BLUEPRINT.md`, `docs/KEPUTUSAN-KOREKSI-ALUR.md`, dan `HANDOVER.md` yang lebih lama. Sebelum diisi, semua item masih terbuka dan belum boleh dianggap final (`AGENTS.md:21`).

Status 25 November 2026: ke-12 item sudah berisi keputusan. Item 2 sampai 6 dijawab pemilik satu per satu. Tujuh sisanya mengikuti rekomendasi yang tertulis di dokumen ini, sesuai arahan pemilik pada sesi yang sama. Tanda tangan tidak diperlukan; persetujuan pemilik tercatat di `docs/PERSETUJUAN-OWNER-16-PERTANYAAN.md` butir 1.

Cara pakai: baca Pertanyaan, Konteks, dan Bukti. Pilih salah satu opsi atau tuliskan sendiri pada baris `Keputusan pemilik`, lalu isi tanggal. Menulis "Sepakat dengan rekomendasi" juga sah. Kolom `Dampak kalau diputus berbeda` dipakai pengeksekusi untuk mengetahui bagian mana yang perlu diubah.

Istilah singkat: **snapshot** adalah salinan beku hasil penilaian final yang tidak boleh diedit atau dihapus (`BLUEPRINT.md:58`); **gate** ialah syarat yang harus terpenuhi sebelum sebuah tombol boleh dipakai; **coverage** ialah persentase indikator yang benar-benar dinilai dalam satu aspek; **N/O** ialah `not_observed` atau `Belum diamati`, indikator tanpa skor; **RPC** ialah fungsi di basis data yang dipanggil aplikasi; **RLS** ialah aturan basisdata yang membatasi baris yang boleh dibaca tiap akun.

---

### 1. Metode akses Peserta: username/kata sandi atau token

- **Pertanyaan:** Peserta masuk memakai username + kata sandi sementara, token berkedaluwarsa, atau keduanya?
- **Konteks:** Akun dan token peserta belum dibuat. Uji rapor peserta RPT-001 sampai RPT-005 masih diblokir. Rapor baru bisa dibuka setelah Admin Sistem menautkan akun ke satu data peserta dan RPC hanya mengembalikan rapor Published miliknya.
- **Bukti (path:line):** `BLUEPRINT.md:141` (kata sandi sementara **atau** token), `BLUEPRINT.md:143` (belum dibuat), `BLUEPRINT.md:67` (penautan akun + RPC), `BLUEPRINT.md:221` (rancangan `participant_access`: token/akun, kedaluwarsa, pencabutan), `BLUEPRINT.md:234` (token sukar ditebak), `BLUEPRINT.md:277` (terbuka), `HANDOVER.md:125`, `IMPLEMENTATION_PLAN.md:46`, `docs/QA_PHASE8_TEST_PLAN.md:183-187,279,289`.
- **Pilihan yang masuk akal:**
  - A. Username + kata sandi sementara, masa berlaku diatur, wajib diganti saat masuk pertama.
  - B. Token sekali pakai lewat tautan, tanpa kata sandi.
  - C. Token untuk undangan awal, lalu aktivasi username + kata sandi.
- **Rekomendasi saya (bukan keputusan):** A bila peserta perlu membuka rapor berulang kali; B bila cukup sekali baca. Dua-duanya tetap memerlukan kolom kedaluwarsa dan pencabutan.
- **Keputusan pemilik:** A. Username + kata sandi sementara, masa berlaku diatur, wajib diganti saat masuk pertama. Dipilih karena peserta dapat membuka rapor lebih dari satu kali. **Tanggal:** 24 November 2026. **Usang (24 Nov 2026):** keputusan akhir memakai username dan kata sandi biasa tanpa masa berlaku, dan akun/rapor Peserta tidak dibagikan sampai ada domain/TLS. Lihat `docs/STATUS-PRODUKSI-SATU-VERSI.md` §3.
- **Catatan pelaksanaan:** Token tidak dipakai pada versi ini. Kolom kedaluwarsa dan pencabutan tetap disiapkan bila metode diubah kemudian. Rapor yang sudah terbit tidak ditulis ulang.
- **Dampak kalau diputus berbeda:**
  - Kode yang berubah: `app/dashboard/laporan/actions.ts:35-51` (penautan akun hanya oleh Admin Sistem), RPC `get_my_published_assessment_report` di `supabase/migrations/20261112180000_dad_reporting_publication_v1.sql:106`, tabel `participant_access` (`BLUEPRINT.md:221`), daftar uji `docs/QA_PHASE8_TEST_PLAN.md:183-187`.
  - Snapshot/PDF immutable: tidak langsung. Cara masuk mengubah siapa yang bisa membuka PDF, bukan isinya. Rapor yang sudah diterbitkan tidak boleh ditulis ulang.

### 2. Rumus tampilan agregat dan dua mesin skor

- **Pertanyaan:** Rumus mana yang dipakai untuk angka 0–100 yang tampil, dan apakah dua mesin skor disatukan? Berapa pembulatan tampilannya?
- **Konteks:** `lib/scoring.ts:72` memetakan skala 1–5 dengan `((rata-rata - 1) / 4) × 100`, jadi 1 menjadi 0 dan 3 menjadi 50. `lib/phase6-scoring.ts:280` memakai `(nilai aspek / 5) × bobot aspek` dengan total bobot 100 (`BLUEPRINT.md:57`), jadi 1 menjadi 20 dan 3 menjadi 60. Bila semua skor 3, angka tampil bisa 50 atau 60, dan kategorinya berubah dari "Perlu pengembangan" menjadi "Cukup" (`BLUEPRINT.md:49`).
- **Bukti (path:line):** `BLUEPRINT.md:272` (terbuka), `BLUEPRINT.md:36,37,49,57` (rata-rata berbobot, batas kategori), `BLUEPRINT.md:236` (aturan pembulatan eksplisit), `lib/scoring.ts:69-77`, `lib/phase6-scoring.ts:255-263,269-296`, `tests/phase6-scoring.test.ts`.
- **Pilihan yang masuk akal:**
  - A. Pakai rumus Phase 6 (`nilai aspek / 5 × bobot`), `lib/scoring.ts` diselaraskan atau ditandai sebagai lawas.
  - B. Pakai rumus `lib/scoring.ts`, Phase 6 yang diselaraskan.
  - C. Keduanya dipertahankan untuk keperluan berbeda, dengan label yang jelas di layar.
  - Pembulatan: A. satu angka desimal; B. bilangan bulat; C. dua angka desimal.
- **Rekomendasi saya (bukan keputusan):** A untuk rumus, karena `BLUEPRINT.md:57` sudah menulis rumus itu. Untuk pembulatan, pilih bilangan bulat agar konsisten dengan skor Observer bulat (`BLUEPRINT.md:42`), lalu tulis angkanya di sini.
- **Keputusan pemilik:** Rumus Phase 6. Angka 0–100 memakai `(skor aspek / 5) × bobot aspek`. Pratinjau Observasi diselaraskan dengan angka rapor. **Tanggal:** 24 November 2026.
- **Catatan pelaksanaan:** `lib/scoring.ts` perlu diselaraskan atau ditandai lawas. Snapshot dan PDF yang sudah ada tidak dihitung ulang. Pembulatan belum diputus pada jawaban ini.
- **Dampak kalau diputus berbeda:**
  - Kode yang berubah: `lib/scoring.ts:69-77`, `lib/phase6-scoring.ts:255-263,269-296`, pernyataan uji di `tests/phase6-scoring.test.ts`, dan komponen yang menampilkan angka agregat.
  - Snapshot/PDF immutable: **ya**. `snapshot_data` menyimpan angka hasil rumus. Snapshot lama dan PDF lama tidak boleh dihitung ulang; rumus baru hanya berlaku untuk snapshot yang dibuat setelah keputusan ini. Perlu dicantumkan versi rumus bila angka lama dan baru harus dibedakan.

### 3. Aturan "nilai resmi": semua Observer selesai atau coverage 80 persen

- **Pertanyaan:** Kapan suatu jenis penilaian berubah dari sementara menjadi resmi/final, dan apakah gate "semua Observer mengirim" tetap berlaku?
- **Konteks:** `BLUEPRINT.md:48` menyatakan nilai resmi setelah seluruh Observer yang ditugaskan selesai. Keputusan 23 November menyatakan gate submit bukan syarat keras karena 21 draf sejak 14 November akan memblokir finalisasi. Kode finalisasi lama di halaman Penilaian masih menolak finalisasi bila ada Observer yang belum mengirim. Kedua aturan ini bercampur di banyak tempat.
- **Bukti (path:line):** `BLUEPRINT.md:48,273,58`, `docs/KEPUTUSAN-KOREKSI-ALUR.md:35,63,71`, `app/dashboard/penilaian/assessment-actions.ts:383-413` (khususnya `:398-413`), `lib/phase6-scoring.ts:262,278,286-289`, `HANDOVER.md:462` (gate di halaman Evaluasi dan Laporan).
- **Pilihan yang masuk akal:**
  - A. Pertahankan gate "semua Observer mengirim" untuk finalisasi status penilaian; coverage 80 persen hanya untuk evaluasi kolektif.
  - B. Ikuti keputusan 23 November: daftar yang belum mengirim hanya peringatan; finalisasi cukup coverage 80 persen, moderasi selesai, dan alasan keputusan terisi.
  - C. Dua level: "resmi" untuk penilaian individu memerlukan semua Observer mengirim; "final/terbit" untuk rapor cukup gate evaluasi kolektif.
- **Rekomendasi saya (bukan keputusan):** C. Ini merangkum dua dokumen tanpa mengubah arti kata "selesai" di halaman Penilaian.
- **Keputusan pemilik:** B. Gate "semua Observer mengirim" dihapus. Nilai resmi cukup memakai coverage 80 persen, moderasi selesai, dan alasan keputusan terisi. Daftar Observer yang belum mengirim tetap tampil sebagai peringatan, bukan syarat. **Tanggal:** 24 November 2026.
- **Catatan pelaksanaan:** `assessment-actions.ts:398-413` dan tombol Finalisasi di `submission-controls.tsx:76-88` perlu diselaraskan. `BLUEPRINT.md:48` menjadi usang untuk item ini.
- **Tambahan 24 November 2026:** gate di aplikasi boleh lunak, tetapi **publish rapor tetap keras**. Snapshot berstatus `provisional` tidak boleh diterbitkan sampai coverage dan moderasi terpenuhi. Ini diputus pemilik setelah reviewer siklus 2 menemukan risiko angka resmi yang belum disetujui masuk rapor.
- **Dampak kalau diputus berbeda:**
  - Kode yang berubah: `app/dashboard/penilaian/assessment-actions.ts:398-413`, gate `runFinalize` di `app/dashboard/evaluasi/actions.ts` (Tahap 4 dan 5), status `valid`/`ready_for_collective_evaluation` di `lib/phase6-scoring.ts:262,278,286-289`.
  - Snapshot/PDF immutable: tidak mengubah isi snapshot lama. Yang berubah ialah kapan snapshot baru boleh dibuat dan status yang tampil. PDF yang sudah terbit tetap berlaku.

### 4. Perlakuan N/O terhadap coverage

- **Pertanyaan:** Apakah indikator `Belum diamati` (N/O) mengurangi coverage dan bisa memblokir finalisasi, atau dibuang dari perhitungan sehingga bobot dinormalisasi ulang?
- **Konteks:** `BLUEPRINT.md:45-47` mengatakan bobot indikator yang tidak diamati tidak ikut dihitung dan bobot yang diamati dinormalisasi ulang. Di sisi lain, uji Phase 6 menegaskan N/O dan indikator belum dinilai tetap masuk denominator coverage: dari 3 indikator dengan 1 penilaian, coverage 33,3 persen dan hasil dinyatakan tidak valid. Dua perlakuan ini perlu dipisah atau disatukan secara tertulis.
- **Bukti (path:line):** `BLUEPRINT.md:45,46,47,54,55,57`, `tests/phase6-scoring.test.ts:92-111`, `lib/scoring.ts:55-66`, `lib/phase6-scoring.ts:255-263`, `docs/KEPUTUSAN-KOREKSI-ALUR.md:35` (gate coverage 80 persen).
- **Pilihan yang masuk akal:**
  - A. N/O mengurangi coverage, bobot indikator yang dinilai tetap dinormalisasi (perilaku kode sekarang).
  - B. N/O dibuang dari denominator coverage, mengikuti normalisasi di `BLUEPRINT.md:46-47`.
  - C. N/O tidak mengurangi coverage hanya bila alasan `Belum diamati` disetujui koordinator.
- **Rekomendasi saya (bukan keputusan):** A. `BLUEPRINT.md:57` menetapkan coverage 80 persen per aspek dan uji sudah mengunci perilaku itu. Cukup perjelas di blueprint bahwa normalisasi bobot tidak berarti N/O dibebaskan dari coverage.
- **Keputusan pemilik:** B. N/O dibuang dari denominator coverage dan bobot indikator tersisa dinormalisasi ulang. Tetap diperlukan minimal satu indikator berskor per aspek agar aspek tidak dianggap valid tanpa data. **Tanggal:** 24 November 2026.
- **Catatan pelaksanaan:** `tests/phase6-scoring.test.ts:92-111` harus ditulis ulang. Gate 80 persen kini dihitung dari indikator yang benar-benar diamati. Snapshot lama tidak dihitung ulang.
- **Dampak kalau diputus berbeda:**
  - Kode yang berubah: `lib/phase6-scoring.ts:255-263` serta uji `tests/phase6-scoring.test.ts:92-111`, dan `lib/scoring.ts:55-66` untuk normalisasi bobot.
  - Snapshot/PDF immutable: **ya**, untuk snapshot baru. Nilai status `valid` berubah, sehingga isi `snapshot_data` dan angka di PDF baru berbeda. Snapshot lama tidak dihitung ulang.

### 5. Rapor revisi dan nomor snapshot

- **Pertanyaan:** Bila rapor direvisi, apakah dibuat snapshot baru dengan nomor revisi naik, atau revisi hanya terjadi di tabel publikasi pada snapshot yang sama?
- **Konteks:** `BLUEPRINT.md:70` menyatakan rapor revisi memakai snapshot baru. Prosedur finalisasi yang terpasang justru selalu menulis `revision = 1`. Aturan publikasi hanya membolehkan snapshot terbaru, diurutkan dari nomor revisi terbesar. Bila semua snapshot bernomor 1, aturan "terbaru" kehilangan urutan yang jelas.
- **Bukti (path:line):** `BLUEPRINT.md:58,70`, `docs/KEPUTUSAN-KOREKSI-ALUR.md:41` (snapshot tetap per jenis), `supabase/migrations/20261113120000_scope_finalize_moderation_to_penilaian_v1.sql:71-74` (`revision = 1` ditulis tetap), `supabase/migrations/20261113130000_publish_latest_per_evaluation_v1.sql:19-30` (pilih revisi terbesar, nomor publikasi `max + 1`).
- **Pilihan yang masuk akal:**
  - A. Nomor snapshot naik menjadi `maksimum + 1` per evaluasi setiap finalisasi ulang; publikasi merujuk snapshot terbaru.
  - B. Snapshot selalu bernomor 1 per evaluasi; revisi rapor berupa baris publikasi baru pada snapshot yang sama.
  - C. Snapshot baru dibuat tanpa penomoran, dibedakan hanya oleh waktu pembuatan.
- **Rekomendasi saya (bukan keputusan):** A, karena paling dekat dengan `BLUEPRINT.md:58,70`. Perlu dicek dulu apakah ada constraint unik pada pasangan evaluasi dan nomor revisi sebelum migrasi diubah.
- **Keputusan pemilik:** A. Nomor snapshot naik menjadi maksimum + 1 per evaluasi. Publikasi merujuk snapshot terbaru. **Tanggal:** 24 November 2026.
- **Catatan pelaksanaan:** Perlu migrasi baru untuk mengganti `revision = 1` di `20261113120000:71-74`. Constraint unik `(collective_evaluation_id, revision)` sudah ada sejak `20261113000000:25-31`, jadi harus dicek sebelum menulis nomor baru. Snapshot dan PDF lama tidak diedit.
- **Dampak kalau diputus berbeda:**
  - Kode yang berubah: `supabase/migrations/20261113120000_scope_finalize_moderation_to_penilaian_v1.sql:71-74`, `supabase/migrations/20261113130000_publish_latest_per_evaluation_v1.sql:19-30`, dan generator PDF yang membaca snapshot terpilih.
  - Snapshot/PDF immutable: **ya**. Opsi A membuat snapshot dan PDF baru; opsi B hanya menambah baris publikasi. Snapshot dan PDF lama tidak boleh diedit atau dihapus dalam opsi mana pun.

### 6. Cakupan akses Komisariat dan ambang agregat publik

- **Pertanyaan:** Komisariat boleh melihat rekap apa saja, dan berapa jumlah peserta minimum agar agregat publik tidak membuat seseorang bisa dikenali?
- **Konteks:** Cakupan Komisariat dan ambang agregat publik masih terbuka. Halaman publik sekarang memakai panel simulasi, belum agregat nyata. Aturan yang sudah ada: publik tanpa nama, skor individu, dan catatan privat; hak akses harus dicek di server dan basis data, bukan hanya dengan menyembunyikan menu.
- **Bukti (path:line):** `BLUEPRINT.md:79,274` (terbuka), `BLUEPRINT.md:78,80,135,140,202`, `BLUEPRINT.md:114-116,129` (hasil seleksi milik Komisariat), `AGENTS.md:23,24`, `app/page.tsx:5-10` (panel publik simulasi).
- **Pilihan yang masuk akal:**
  - Komisariat: A. hanya pengajuan dan hasil seleksi miliknya; B. ditambah rekap agregat kegiatannya tanpa nama dan skor individu; C. ditambah nilai per peserta komisariatnya.
  - Ambang publik: A. minimal 5 peserta per kelompok; B. minimal 10; C. agregat disembunyikan bila di bawah ambang dan hanya jadwal yang tampil.
- **Rekomendasi saya (bukan keputusan):** Komisariat memilih B. Ambang publik memilih 10 dengan opsi C bila jumlah di bawah ambang, lalu uji dengan data simulasi (`AGENTS.md:22`).
- **Keputusan pemilik:** Komisariat: B, ditambah rekap agregat kegiatannya tanpa nama dan skor individu. Ambang: minimal 10 peserta per kelompok; di bawah itu agregat disembunyikan dan hanya jadwal yang tampil. **Tanggal:** 24 November 2026.
- **Catatan pelaksanaan:** Ambang diterapkan di query atau RPC sebelum data sampai ke halaman publik. Jangan mengubah `snapshot_data` atau PDF yang sudah terbit.
- **Dampak kalau diputus berbeda:**
  - Kode yang berubah: `app/page.tsx:5-10` dan komponen panel publik terkait, halaman serta kebijakan RLS Komisariat di `supabase/migrations/`, dan RPC agregat yang dipakai halaman publik.
  - Snapshot/PDF immutable: tidak langsung. Ambang harus diterapkan di query atau RPC sebelum data tampil, bukan dengan mengubah `snapshot_data`. PDF lama tidak berubah.

### 7. Format impor Google Sheets, impor ulang, dan format rapor

- **Pertanyaan:** Format berkas impor yang final apa, bagaimana penanganan impor ulang atau duplikat, dan format rapor apa yang disepakati?
- **Konteks:** Rencana awal memakai ekspor Google Sheets, lalu pilihan pengguna bergeser ke berkas Excel `.xlsx`. Aturan yang tercatat: impor hanya untuk Admin Sistem/Super Admin, dan nilai lama disimpan sebagai riwayat dengan pilihan eksplisit Admin. Format rapor lengkap ditunda sampai disepakati. Kode impor yang ada menerima hanya `.xlsx`, membatasi 5 MB, 500 baris, 50 kolom, dan mencocokkan nama + komisariat.
- **Bukti (path:line):** `BLUEPRINT.md:84-89,275`, `app/dashboard/impor-tes/actions.ts:9-11` (batas berkas), `:29-32` (khusus Admin Sistem), `:36-47` (hanya `.xlsx`), `:153-181` (`test_results` `is_current` dan `test_imports`), `:190-204` (pencocokan nama + komisariat), `app/dashboard/impor-tes/page.tsx`, `app/dashboard/impor-tes/import-wizard.tsx`.
- **Pilihan yang masuk akal:**
  - Format impor: A. `.xlsx` seperti sekarang; B. CSV dari Google Sheets; C. keduanya.
  - Impor ulang: A. simpan riwayat, Admin memilih nilai mana yang dipakai; B. timpa otomatis; C. tolak baris duplikat.
  - Format rapor: A. PDF browser + tampilan web seperti sekarang; B. tambah berkas rapor lain yang ditentukan pemilik.
- **Rekomendasi saya (bukan keputusan):** `.xlsx` (A) dan riwayat + pilihan eksplisit (A) sudah sesuai kode dan blueprint. Untuk rapor, tetapkan PDF resmi sebagai final dengan ruang pengesahan kosong, sesuai `BLUEPRINT.md:68` dan `docs/KEPUTUSAN-KOREKSI-ALUR.md:47,74`.
- **Keputusan pemilik:** Sesuai rekomendasi. Impor: A, `.xlsx` seperti sekarang. Duplikat: A, simpan riwayat dan Admin memilih nilai yang dipakai. Rapor: A, PDF browser dan tampilan web seperti sekarang dengan ruang pengesahan kosong; tidak menambah format baru. **Tanggal:** 24 November 2026.
- **Dampak kalau diputus berbeda:**
  - Kode yang berubah: `app/dashboard/impor-tes/actions.ts:9-11,29-32,36-47,153-204` dan wizard `app/dashboard/impor-tes/import-wizard.tsx`; bila format rapor berubah, `components/phase7-report-workspace.tsx` dan generator PDF internal (`BLUEPRINT.md:71`).
  - Snapshot/PDF immutable: format rapor **ya**, mengubah isi PDF baru dan perlu aturan versi PDF. Format impor tidak menyentuh snapshot.

### 8. Retensi data, penghapusan, dan backup

- **Pertanyaan:** Berapa lama berkas dan data disimpan, kapan dihapus, dan bagaimana backup untuk pemakaian resmi?
- **Konteks:** Surat Mandat direncanakan disimpan sampai hasil seleksi administrasi diterbitkan; foto sampai rapor masih tersedia. Masa penyimpanan berkas lain belum diputuskan. Backup harian 03.15 dengan retensi 14 hari sudah berjalan, tetapi tidak memasukkan skema `auth`. Salinan lengkap ada di luar repo. Beberapa temuan keamanan dan kriteria publikasi juga masih menunggu pemilik.
- **Bukti (path:line):** `BLUEPRINT.md:98,131,276`, `HANDOVER.md:334-337` (cron, retensi 14 hari, salinan workstation, A1/A5/A7/A8 dan backup `auth`), `HANDOVER.md:337` (domain+TLS, monitoring), `AGENTS.md:34`.
- **Pilihan yang masuk akal:**
  - Retensi: A. ikuti `BLUEPRINT.md:98` lalu hapus setelah masa itu; B. simpan seluruh data kegiatan selama satu tahun setelah kegiatan; C. ikuti kebijakan resmi IMM yang akan diberikan pemilik.
  - Backup: A. lanjutkan harian 03.15 dan tambah salinan `auth` periodik ke lokasi di luar server; B. jadikan backup `auth` harian; C. tambah salinan di lokasi terpisah.
- **Rekomendasi saya (bukan keputusan):** Tulis angka retensi untuk tiga kelompok: berkas seleksi, nilai dan riwayatnya, serta log audit. Untuk backup, pilih A, mengingat akun saat ini bisa dibuat ulang tetapi tetap perlu salinan rahasia di luar server.
- **Keputusan pemilik:** Sesuai rekomendasi. Retensi: Surat Mandat sampai hasil seleksi administrasi diterbitkan dan foto sampai rapor tidak tersedia, sesuai `BLUEPRINT.md:98`; nilai beserta riwayatnya 2 tahun setelah kegiatan; log audit 5 tahun. Angka ini berlaku sampai ada kebijakan resmi IMM yang berbeda. Backup: A, lanjutkan harian 03.15 dan tambah salinan rahasia skema `auth` periodik ke lokasi di luar server. **Tanggal:** 24 November 2026.
- **Catatan pelaksanaan:** Penghapusan data tidak boleh menyentuh snapshot dan PDF yang sudah terbit. Ini masih perlu diwujudkan di migrasi atau prosedur, bukan sekadar tertulis di sini.
- **Dampak kalau diputus berbeda:**
  - Kode yang berubah: prosedur dan cron backup (`/etc/cron.d/imm-db-backup`, `HANDOVER.md:334`), mungkin kolom kedaluwarsa atau penghapusan di `supabase/migrations/`, dan dokumentasi prosedur restore.
  - Snapshot/PDF immutable: **ya**, penghapusan data tidak boleh menghapus snapshot dan PDF yang sudah terbit. Perlu diputus apakah data peserta yang dihapus tetap diarsipkan di snapshot.

### 9. Siapa yang boleh menyetujui, memfinalisasi, dan menerbitkan

- **Pertanyaan:** Daftar role mana yang boleh menyetujui rekomendasi, memfinalisasi, dan menerbitkan rapor? Apakah Bidang Kader termasuk penerbit?
- **Konteks:** Keputusan 23 November membatasi pelaku persetujuan dan finalisasi pada Admin Sistem plus empat subrole koordinator, dengan IoT dan Vice IoT dikecualikan. Tombol terbit di halaman Laporan memperbolehkan Admin Sistem, Bidang Kader, dan semua Instruktur. RPC penerbitan memperbolehkan Admin Sistem, koordinator yang ditugaskan, atau Bidang Kader. Tiga daftar ini belum sama.
- **Bukti (path:line):** `docs/KEPUTUSAN-KOREKSI-ALUR.md:19-23,31-35`, `app/dashboard/laporan/actions.ts:21-32` (khusus `:26`), `supabase/migrations/20261113130000_publish_latest_per_evaluation_v1.sql:11-14`, `BLUEPRINT.md:50,59,60,76,137`, `HANDOVER.md:462` (empat subrole sudah konsisten di `lib/phase7-home.ts`, `lib/instructor-roles.ts`, dan fungsi `is_assessment_moderator`).
- **Pilihan yang masuk akal:**
  - A. Samakan semuanya dengan Admin Sistem + MoT + Vice MoT + Master Observer + Vice Observer; Bidang Kader dan Instruktur non-koordinator tidak bisa menerbitkan.
  - B. Pertahankan Bidang Kader sebagai penerbit; keputusan 23 November dibaca hanya untuk setuju dan finalisasi.
  - C. Tiga level: setuju dan finalisasi oleh Admin + empat subrole; terbit oleh Admin + Bidang Kader; unduh PDF oleh penerbit dan koordinator.
- **Rekomendasi saya (bukan keputusan):** A, karena keputusan 23 November menggabungkan setuju, finalisasi, dan terbit dalam satu klik dengan pelaku yang sama. Bila pemilik ingin Bidang Kader tetap bisa terbit, pilih C dan tulis di sini agar mengalahkan dokumen lama.
- **Keputusan pemilik:** A. Samakan semua menjadi Admin Sistem + MoT + Vice MoT + Master Observer + Vice Observer. Bidang Kader dan Instruktur non-koordinator tidak menerbitkan rapor. **Tanggal:** 24 November 2026.
- **Catatan pelaksanaan:** Ini mencabut kewenangan Bidang Kader yang sekarang ada di `app/dashboard/laporan/actions.ts:26` dan di RPC penerbitan. Bidang Kader tetap membaca rekap sesuai item 6.
- **Dampak kalau diputus berbeda:**
  - Kode yang berubah: `app/dashboard/laporan/actions.ts:26`, syarat di `supabase/migrations/20261113130000_publish_latest_per_evaluation_v1.sql:11-14`, `lib/phase7-home.ts`, `lib/instructor-roles.ts`, dan fungsi `is_assessment_moderator` di migrasi `20261112170000`.
  - Snapshot/PDF immutable: tidak mengubah isi PDF lama. Yang berubah ialah siapa yang boleh menerbitkan dan baris audit `assessment_report_publication_audit` (`20261113130000:29-30`).

### 10. Status akhir proyek: koreksi alur final atau masih terbuka

- **Pertanyaan:** Apakah koreksi alur 23 November sudah final dan boleh dilanjut ke item terbuka di atas, atau masih harus diverifikasi dan ditinjau dulu?
- **Konteks (riwayat):** Dokumen keputusan dulu menyatakan belum ada kode yang diubah, sementara handover mencatat Tahap 1 sampai 8 selesai dan deploy PROD 24 November untuk kode lama `0448100`. Pertentangan itu sudah diselesaikan pada Fase 6: `docs/STATUS-PRODUKSI-SATU-VERSI.md` menjadi otoritas tunggal. Pekerjaan branch `research/peta-alur-penilaian` sudah diuji di DEV dan di-deploy ke produksi 24–25 November 2026. Aturan proyek tetap melarang pemakaian data nyata sebelum keamanan, privasi, biaya, dan backup ditinjau.
- **Bukti (path:line):** `docs/STATUS-PRODUKSI-SATU-VERSI.md` (status otoritas), `HANDOVER.md` bagian "Status produksi — satu versi", `docs/HASIL-FASE2-DEV.md` sampai `docs/HASIL-UJI-FINALIZE-EKSPOR-DEV.md` (bukti DEV), `AGENTS.md:19-21,33-34`.
- **Pilihan yang masuk akal:**
  - A. Nyatakan koreksi alur final dan tutup; lanjut ke keputusan terbuka 1 sampai 9.
  - B. Nyatakan final, tetapi ulangi uji alur penuh di PROD lebih dulu karena yang baru diuji ialah DEV dan smoke test.
  - C. Tunda pelanjutan sampai temuan A1, A5, A7, A8, domain+TLS, dan backup ditinjau (`HANDOVER.md:337`).
- **Rekomendasi saya (bukan keputusan):** C, lalu B. Data peserta nyata sudah dipakai di PROD, dan aturan `AGENTS.md:34` meminta peninjauan keamanan dan privasi sebelum langkah berikutnya.
- **Keputusan pemilik:** C, lalu B. Tidak ada fitur baru sebelum tinjauan keamanan, privasi, biaya, dan backup selesai. Setelah itu ulangi uji alur penuh di PROD. **Tanggal:** 24 November 2026.
- **Catatan pelaksanaan:** Ini membuka jalan bagi item 1 sampai 9 untuk dikerjakan setelah prasyarat terpenuhi. Daftar periksa ada di `docs/VERIFIKASI-PRODUKSI-YANG-BELUM-DILAKUKAN.md`.
- **Dampak kalau diputus berbeda:**
  - Kode yang berubah: tidak langsung. Keputusan ini menentukan apakah item 1 sampai 9 boleh dikerjakan. Bila ada yang ditunda, `HANDOVER.md` dan `BLUEPRINT.md` perlu diperbarui (`AGENTS.md:35`), termasuk mencoret catatan lama yang sudah kedaluwarsa.
  - Snapshot/PDF immutable: tidak langsung. Dua snapshot hasil uji DEV dan PROD tidak boleh dihapus saat status proyek diperbarui.

### 11. (Tambahan dari `BLUEPRINT.md:271`) Rubrik dan indikator final serta data simulasi

- **Pertanyaan:** Apakah kerangka DAD enam aspek dan 27 indikator sudah final, dan data simulasi mana yang dipakai untuk uji berikutnya?
- **Konteks:** Blueprit menyebut kerangka itu sebagai rancangan trial, bukan standar resmi IMM, dan menunggu validasi Koordinator Instruktur terhadap silabus. Bobot contoh juga bukan ketentuan final. Keputusan ini masuk daftar terbuka yang belum dijawab.
- **Bukti (path:line):** `BLUEPRINT.md:271,35,38,39,40,247`.
- **Pilihan yang masuk akal:** A. tetap trial dengan data simulasi; B. sahkan sebagai standar setelah validasi silabus; C. bedakan template trial untuk uji dari rubrik resmi per kegiatan yang disetujui Koordinator Instruktur.
- **Rekomendasi saya (bukan keputusan):** C, agar hasil uji tidak berubah bila standar resmi belum keluar.
- **Keputusan pemilik:** C. Bedakan template trial untuk uji dari rubrik resmi per kegiatan yang disetujui Koordinator Instruktur. **Tanggal:** 24 November 2026.
- **Dampak kalau diputus berbeda:**
  - Kode yang berubah: tabel master `competency_frameworks` dan turunannya serta `rubric_versions` (`BLUEPRINT.md:40`) dan halaman Pengaturan Penilaian.
  - Snapshot/PDF immutable: **ya**, untuk snapshot baru. Perubahan rubrik wajib memakai versi baru; snapshot lama yang menyimpan `framework_version_ids` dan `rubric_version_ids` tidak diubah (`BLUEPRINT.md:28,58`).

### 12. (Tambahan dari `BLUEPRINT.md:273`) Kapan Observer dianggap selesai

- **Pertanyaan:** Apa kriteria "selesai" untuk satu Observer pada satu jenis penilaian, dan bagaimana penilaian yang belum lengkap ditampilkan?
- **Konteks:** Aturan lama mengaitkan "selesai" dengan nilai resmi. Keputusan 23 November mengubah gate submit menjadi peringatan, tetapi tombol Kirim/Buka kembali dan daftar penilai belum mengirim tetap dipakai. Kriteria "selesai" perlu dipisah dari kriteria "final" di item 3.
- **Bukti (path:line):** `BLUEPRINT.md:273,48,191`, `docs/KEPUTUSAN-KOREKSI-ALUR.md:52,71`, `app/dashboard/penilaian/assessment-actions.ts:398-413`, `HANDOVER.md:474` (uji tombol Kirim dan penghitung "1 dari 2 observer mengirim").
- **Pilihan yang masuk akal:** A. selesai berarti status Submitted; daftar yang belum muncul sebagai peringatan; B. selesai berarti Submitted dan coverage 80 persen terpenuhi; C. selesai berarti semua indikator terisi tanpa N/O.
- **Rekomendasi saya (bukan keputusan):** A, dengan catatan bahwa status final dan terbit diatur di item 3, bukan di sini.
- **Keputusan pemilik:** A. Selesai berarti status Submitted. Daftar penilai yang belum mengirim tetap tampil sebagai peringatan. Status final dan terbit mengikuti item 3. **Tanggal:** 24 November 2026.
- **Dampak kalau diputus berbeda:**
  - Kode yang berubah: `app/dashboard/penilaian/assessment-actions.ts:398-413`, komponen tombol Kirim/Buka kembali, dan tampilan daftar penilai pada halaman Observasi dan Evaluasi.
  - Snapshot/PDF immutable: tidak mengubah isi snapshot lama. Hanya status yang tampil dan waktu pembuatan snapshot baru yang terpengaruh.

---

## Pengesahan dokumen

Dengan menandatangani, pemilik menetapkan semua kolom `Keputusan pemilik` di atas sebagai keputusan resmi. Dokumen ini mengalahkan dokumen lama untuk item yang sama.

- Tanggal pengisian: 24 / 11 / 2026
- Persetujuan pemilik tidak memerlukan tanda tangan nama; tercatat di `docs/PERSETUJUAN-OWNER-16-PERTANYAAN.md` butir 1. Lihat juga `docs/STATUS-PRODUKSI-SATU-VERSI.md` §3.

Catatan pemilik (opsional):

______________________________________________________________________

______________________________________________________________________
