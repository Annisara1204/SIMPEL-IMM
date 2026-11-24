# Hasil Fase 4 di DEV

Tanggal: 24 November 2026. Branch: `research/peta-alur-penilaian`. Data simulasi di Supabase lokal dan Next.js `localhost:3100`. Tidak ada deploy atau penulisan ke produksi.

## Yang diubah

- `saveObservation` dihapus dari `app/dashboard/penilaian/assessment-actions.ts`. Tidak ada pemanggil di kode; enam kecocokan lain hanya di dokumen.
- `completeObserverAssignment` dan `reopenObserverAssignment` dihapus dari `assignment-actions.ts`. Tidak ada pemanggil di kode.
- Migrasi `20261124131000` menghapus `observer_assignment_completions` dan `observer_rubric_completions` beserta policy-nya. Tiga fungsi trigger ditulis ulang supaya hanya menghapus dari `observer_rubric_version_completions`, yang masih dibaca dashboard lama. Trigger tidak dihapus.
- Migrasi `20261124140000` mengganti `get_event_assessment_summary(uuid)` dengan `get_event_assessment_summary(target_event_id uuid, target_participant_id uuid default null)`. Filter peserta ditambahkan di CTE `planned`. Revoke dan grant diulang untuk signature baru.
- Definisi `finalize_collective_evaluation` 8 argumen ditimpa agar memanggil rekap dengan dua argumen, memakai participant evaluasi. Nomor revisi `max+1` tetap.
- `app/dashboard/evaluasi/page.tsx` dan `actions.ts` mengirim argumen kedua. `page.tsx` mengirim `null` bila belum ada peserta terpilih, sehingga perilaku halaman sama seperti sebelumnya.

## Catatan angka

Dokumen menyebut 16 kolom keluaran rekap. Sumber `20261112190000:6-11` ternyata memuat 17 kolom. Migrasi baru memakai daftar persis dari sumber agar tipe `AssessmentSummaryRow` dan gate finalisasi tidak putus.

## Verifikasi

- `npm run check`: 0 error, 5 peringatan lama, 22 tes lolos.
- `npm run build`: berhasil.
- Dua migrasi dipasang di DEV tanpa error.
- 8 dari 8 penguji SQL lolos.
- `pg_proc` hanya menampilkan `get_event_assessment_summary(uuid,uuid)`; signature lama `(uuid)` tidak ada.
- Browser: halaman Evaluasi Kolektif merender tanpa banner dan menampilkan skor agregat.
- Browser: menyimpan bukti observasi dan catatan privat pada Peserta Simulasi 04 berhasil, status "Tersimpan", dan baris catatan terbukti masuk tabel `observer_notes`. Ini membuktikan trigger yang ditulis ulang tidak merusak jalur simpan.

## Yang sengaja tidak dihapus

- `lib/dashboard-results.ts`, tabel `observations`, dan tiga tabel status masih dipertahankan karena entri 2, 3, 6, 7, 8, dan 9 pada inventaris masih berstatus "tahan dulu" atau perlu migrasi data.
- Tiga jalur finalisasi dan fallback nama pelaku lama tidak diubah.
- Definisi lama `get_event_report_rows` tetap ada sebagai teks migrasi historis.

## Yang belum diverifikasi

- Klik finalize/publish/ekspor di browser setelah perubahan signature dan trigger.
- RLS lintas peran penuh dan uji dua akun untuk konflik serta Realtime belum diulang setelah Fase 4.
- Data historis pada tabel yang dihapus tidak diverifikasi jumlahnya sebelum penghapusan di DEV; migrasi hanya dijalankan di lingkungan simulasi.
