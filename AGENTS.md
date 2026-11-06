# Petunjuk Agen — IMM Observer

## Sebelum bekerja

1. Baca `BLUEPRINT.md` sebagai sumber utama keputusan dan kebutuhan.
2. Baca `HANDOVER.md` untuk status terakhir dan langkah berikutnya.
3. Periksa berkas serta dependensi aktual sebelum mengedit; catatan handover bisa kedaluwarsa.
4. Jika instruksi terbaru pengguna berbeda dari dokumen, ikuti instruksi terbaru dan perbarui dokumen terkait.

## Cara berkomunikasi

- Gunakan bahasa Indonesia sederhana untuk pengguna pemula; terangkan istilah teknis sebelum memakainya.
- Saat memulai tahap, jelaskan singkat apa yang akan dikerjakan.
- Saat menyerahkan tahap, sebutkan berkas berubah, cara menjalankan/memeriksa, hasil pemeriksaan, dan hal yang belum selesai.
- Jangan menganggap pengguna memahami terminal, Git, basis data, API, autentikasi, atau deployment.

## Batas kerja

- Ikuti urutan dan keputusan dalam `BLUEPRINT.md`.
- Jangan mulai tahap berikutnya sebelum pengguna menyatakan tahap saat ini sesuai atau meminta lanjut.
- Jangan menganggap keputusan yang masih terbuka sebagai keputusan final. Jika perlu, tanyakan satu per satu dengan rekomendasi dan alasannya.
- Gunakan data simulasi saja selama pengembangan awal; jangan memasukkan data pribadi peserta nyata.
- Dashboard publik tidak boleh menampilkan identitas, skor individu, atau catatan observasi privat.
- Hak akses harus diperiksa server/basis data; menyembunyikan menu saja bukan pengamanan.
- Nilai mentah/catatan rinci hanya bagi Observer yang ditugaskan. Bidang Kader berwenang dapat melihat rekap/nilai. Peserta hanya melihat ringkasan sementara miliknya dan catatan pengembangan/perhatian.
- Konfigurasi penilaian harus berversi; jangan mengubah hasil lama secara diam-diam.
- Jangan menaruh API key/kredensial pada frontend atau mengirim data pribadi ke AI.

## Implementasi dan pemeriksaan

- Target pengembangan lokal adalah Windows. Berikan perintah PowerShell yang mudah diikuti.
- Hindari perubahan besar di luar lingkup tahap.
- Verifikasi sesuai kebutuhan tahap dan laporkan hasilnya dengan jujur. Jangan mengklaim UI, keamanan, atau deployment teruji jika yang dilakukan hanya build.
- Jangan publikasikan aplikasi atau memakai data nyata sebelum temuan keamanan, privasi, biaya, dan backup ditinjau.
- Perbarui `HANDOVER.md` setelah perubahan penting dan `BLUEPRINT.md` jika keputusan atau rancangan berubah.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
