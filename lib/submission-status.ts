const labels: Record<string, string> = {
  draft: "Draf · dapat diedit",
  submitted: "Dikirim · menunggu Observer",
  finalized: "Selesai",
  under_review: "Sedang ditinjau · terkunci",
  administrative_published: "Hasil administrasi diterbitkan",
  screening: "Tahap screening",
  screening_published: "Hasil screening diterbitkan",
  cancelled: "Dibatalkan",
};

/** Label status pengajuan Komisariat untuk tampilan. */
export function submissionStatusLabel(status: string | null): string {
  return status ? (labels[status] ?? status) : "Status belum diketahui";
}
