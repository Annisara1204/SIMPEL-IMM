/** Label status snapshot rapor. Terpisah dari status alur Pengajuan/Observasi. */
const reportLabels: Record<string, string> = {
  Provisional: "Sementara",
  Finalized: "Final",
  Published: "Diterbitkan",
};

export function reportStatusLabel(status: string | null | undefined): string {
  if (!status) return "Status belum tersedia";
  return reportLabels[status] ?? status;
}
