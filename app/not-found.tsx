import Link from "next/link";

export default function NotFound() {
  return (
    <main className="setup-message">
      <h1>Halaman tidak ditemukan</h1>
      <p>Alamat yang Anda buka tidak tersedia atau sudah dipindahkan.</p>
      <Link prefetch={false} className="users-back" href="/">
        Kembali ke beranda
      </Link>
    </main>
  );
}
