/**
 * Banner bersama saat kueri gagal. Pesan menekankan kemungkinan sesi /
 * layanan bermasalah dan menawarkan muat ulang, bukan sekadar "hubungi
 * Admin" — error yang sama sering pulih setelah login ulang.
 */
export function DataUnavailable() {
  return (
    <p className="users-error" role="alert">
      Data belum dapat dibaca. Sesi atau layanan mungkin bermasalah —{" "}
      <a href="">muat ulang halaman</a>; bila masih gagal, keluar lalu login
      ulang. Hubungi Admin sistem bila masalah berulang.
    </p>
  );
}
