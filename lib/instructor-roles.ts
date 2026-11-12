export const instructorPositions = [
  {
    id: "mot",
    label: "Master of Training (MoT)",
    dashboardTitle: "Koordinasi pelatihan",
    access: "assessment",
  },
  {
    id: "vice_mot",
    label: "Vice MoT",
    dashboardTitle: "Dukungan koordinasi MoT",
    access: "assessment",
  },
  {
    id: "iot",
    label: "Imam of Training (IoT)",
    dashboardTitle: "Agenda pembinaan ruhiyah",
    access: "duties",
  },
  {
    id: "vice_iot",
    label: "Vice IoT",
    dashboardTitle: "Dukungan agenda IoT",
    access: "duties",
  },
  {
    id: "master_observer",
    label: "Master of Observer",
    dashboardTitle: "Koordinasi Observer",
    access: "assessment",
  },
  {
    id: "vice_observer",
    label: "Vice Observer",
    dashboardTitle: "Dukungan koordinator Observer",
    access: "assessment",
  },
] as const;

export type InstructorPosition = (typeof instructorPositions)[number]["id"];

export const instructorDuties: Record<InstructorPosition, string[]> = {
  mot: [
    "Fasilitasi koordinasi awal dengan panitia dan instruktur",
    "Pastikan rencana program, materi, jadwal, dan target siap",
    "Koordinasikan pembagian tugas instruktur dan kebutuhan kegiatan",
    "Catat kendala penting dan hasil keputusan koordinasi",
    "Koordinasikan evaluasi akhir dan laporan pasca pelatihan",
  ],
  vice_mot: [
    "Tinjau kesiapan teknis dan jadwal kegiatan",
    "Catat tindak lanjut koordinasi yang didelegasikan MoT",
    "Bantu koordinasi panitia, instruktur, dan peserta",
    "Catat kendala lapangan untuk disampaikan kepada MoT",
    "Siap mengambil alih koordinasi bila MoT berhalangan",
  ],
  iot: [
    "Susun agenda ibadah dan pembinaan ruhiyah kegiatan",
    "Koordinasikan petugas salat, kultum, tadarus, dan kegiatan terkait",
    "Pastikan agenda ibadah tercantum pada jadwal kegiatan",
    "Pantau pelaksanaan agenda dan catat kebutuhan tindak lanjut",
    "Evaluasi pelaksanaan agenda ruhiyah setelah kegiatan",
  ],
  vice_iot: [
    "Bantu menyiapkan petugas dan kebutuhan agenda ibadah",
    "Periksa kesiapan tempat dan perlengkapan kegiatan ibadah",
    "Bantu mengingatkan jadwal kepada petugas terkait",
    "Catat perubahan jadwal untuk dikomunikasikan kepada IoT",
    "Bantu rekap evaluasi agenda ruhiyah",
  ],
  master_observer: [
    "Koordinasikan pembagian tugas Observer untuk kegiatan",
    "Pastikan Observer memahami rubrik dan alur pengisian",
    "Pantau progres penyelesaian penilaian setiap tahap",
    "Koordinasikan pembahasan hasil agregat dengan tim Observer",
    "Sampaikan ringkasan dan kebutuhan tindak lanjut kepada MoT",
  ],
  vice_observer: [
    "Bantu koordinasikan jadwal dan pembagian tugas Observer",
    "Pantau penilaian yang belum selesai dan sampaikan pengingat",
    "Bantu Observer memahami alur dan rubrik penilaian",
    "Siapkan ringkasan progres untuk Master of Observer",
    "Bantu konsolidasi hasil tanpa membagikan catatan privat",
  ],
};

export function instructorPositionLabel(position: string) {
  return (
    instructorPositions.find((item) => item.id === position)?.label ??
    "Instruktur"
  );
}
