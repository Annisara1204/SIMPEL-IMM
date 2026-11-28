# Bukti Review UI/UX — 28 November 2026

Ringkasan bukti untuk 36 ID di `RENCANA-UI-UX.md`. Empat review dilakukan read-only: tiga memakai agent-browser dan satu bersifat statis. Tidak ada berkas aplikasi, data, atau commit yang diubah saat review. Screenshot ada di `/home/ibaysander/.agent-browser/tmp/screenshots/`. Tiga ID di bawah hanya punya bukti dari kode dan ditandai `[C]`.

## Keterbatasan bersama

Kredensial di `.env.qa-test` dan akun DEV lama di `HANDOVER.md:482` tidak cocok dengan hash Supabase lokal. Reviewer yang perlu membuka halaman internal memakai state/auth vault lokal atau cookie sesi bertanda tangan dengan kunci Supabase lokal. Itu hanya mengubah state browser, bukan data aplikasi. Tidak ada state IoT/Vice IoT, jadi temuan subrole tetap `[C]`.

## Review 1 — Navigasi per peran

- Terverifikasi di browser: halaman publik, `/login`, `/daftar`, halaman 404, dan redirect `/dashboard` → `/login` untuk pengunjung tanpa sesi.
- Sidebar tertutup di 390 px masih masuk pohon aksesibilitas; Tab kedua menyentuh tombol "Tutup menu" yang tidak terlihat (UX-06). Screenshot: `review-public-mobile.png`, `review-public-mobile-closed.png`.
- Menu "Dashboard" berdampingan dengan breadcrumb "Publik / Beranda" (UX-28). Screenshot: `review-public-home.png`.
- Catatan kaki `/login` mengarah ke `/daftar`, yang ternyata permintaan akun (UX-29). Screenshot: `review-login-session.png`, `review-daftar.png`.
- Dari kode: UX-08, UX-09, UX-10, UX-11, UX-12, UX-27, dan pill status statis UX-30.

## Review 2 — Layout responsif

- Tidak ada overflow horizontal di level halaman pada 1280, 768, dan 390 px; `scrollWidth == clientWidth`.
- Matriks kompetensi 1525 px di wadah 332 px @390 px, sisa geser 1193 px; kolom pertama sticky 170–200 px (UX-07). Screenshot: `390-evaluasi-matrix-viewport.png`, `1280-kerangka.png`.
- Tabel peserta 1115/1230 px dan laporan 916 px perlu digeser jauh @390 px (UX-07). Screenshot: `390-peserta-table-viewport.png`, `390-laporan.png`.
- Form Kegiatan 3 kolom × 133 px @768 px, label dan input terpotong (UX-15). Screenshot: `768-kegiatan.png`.
- Tombol aksi Evaluasi tidak sejajar @768 px (UX-16). Screenshot: `768-evaluasi-form.png`, `390-evaluasi-form.png`.
- Target sentuh dan teks pendukung kecil (UX-17, UX-18). Screenshot: `390-dashboard.png`, `390-laporan.png`.
- Tombol ZIP nonaktif kontras ≈2,3:1 (UX-32) dan pemisah breadcrumb 1,66:1 (UX-31).

## Review 3 — Formulir dan umpan balik

- `/login` polos setelah logout tanpa notice, berbanding `/login?reason=session` yang menampilkan notice (UX-01). Screenshot: `login-no-notice.png`, `login-session-01.png`.
- Detail evaluasi menampilkan "Keputusan final: pass" (UX-03). Screenshot: `evaluasi-detail.png`.
- Tidak ada `confirm(` di `app/` atau `components/`; tombol arsip/cabut/batalkan/hapus langsung submit (UX-04). Screenshot: `penilaian-error.png`.
- Status campur `Draft`, `draft`, `Submitted`, `Finalized`, `pass`, "Sementara/Final" (UX-13). Screenshot: `dashboard-observer-status.png`, `observasi-02.png`, `evaluasi-detail.png`.
- Banner `?error=` di y≈102 px sementara formulir di y≈1609 px (UX-14). Screenshot: `evaluasi-draft.png`.
- Dari kode: UX-23, UX-24, UX-25, UX-26, UX-34. UX-25 masih dugaan karena `commitImport` sudah memanggil `revalidatePath`.

## Review 4 — Aksesibilitas dan bahasa

- Nama textbox kata sandi berubah mengikuti teks tombol toggle (UX-02), terverifikasi di snapshot.
- 15 label "Penilaian Anda" identik di Observasi (UX-05); 666 elemen `aria-live` pada satu halaman (UX-20).
- 27 `<h2>` pada kartu indikator Kerangka (UX-19).
- Istilah `Provisional`, `Submitted/Finalized`, `coverage 80%`, `Draft`, dan `RLS` tidak dijelaskan (UX-21).
- Empat tombol hanya bernama "PDF" dan tombol ZIP terbaca menyatu (UX-22).
- Pemisah breadcrumb kontras 1,66:1 (UX-31).
- Yang sudah baik: link "Lewati ke konten" berfungsi, fokus terlihat dengan outline maroon, `role="alert"/"status"` tepat, dan `PrivateImg` mewajibkan `alt`. Teks penting umumnya ≥4,5:1; pengecualian yang tercatat adalah pemisah breadcrumb UX-31 (1,66:1) dan teks tombol ZIP nonaktif UX-32 (≈2,3:1).
- Screenshot: `01-public-home.png` sampai `08-laporan.png`.

## Temuan dari kode saja

- UX-33: tiga kemunculan `aria-current="true"` pada navigasi Evaluasi; nilainya valid, `"page"` lebih spesifik. Sumber: `evaluasi/page.tsx`, tidak ada screenshot khusus.
- UX-35: teks kosong Kerangka masih menyebut migration. Sumber: `app/dashboard/kerangka/page.tsx`, tidak ada screenshot khusus karena data lokal tersedia.
- UX-36: `min-width` pada empat form/select berisiko di panel 320 px. Sumber: `app/styles/views.css` dan `responsive.css`, belum diuji di viewport 320 px.
