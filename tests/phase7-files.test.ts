import assert from "node:assert/strict";
import test from "node:test";
import { createReportPdf, createReportZip } from "../lib/phase7-files.ts";

const sample = {
  participant: {
    display_name: "Peserta Simulasi",
    student_number: "2024001",
    major: "Keperawatan",
    commissariat: "PK IMM Unisa Bandung",
  },
  evaluatorNames: "Observer A, Observer B",
  approverName: "Instruktur MoT",
  approvedAt: "2026-11-27T00:00:00Z",
  event: {
    name: "DAD Simulasi",
    theme: "Kaderisasi",
    organizer: "IMM",
    location: "Bandung",
    starts_on: "2026-10-24",
    ends_on: "2026-10-26",
  },
  snapshotData: {
    schemaVersion: 1,
    aspects: [
      {
        aspectName: "Intelektualitas",
        weight: 25,
        score: 4,
        scoreOutOf100: 80,
      },
    ],
    indicators: [],
    overall: { score: 80 },
    collective: {
      decision: "pass",
      decisionRationale: "Telah memenuhi pertimbangan kolektif.",
      strengths: "Aktif berdiskusi.",
      developmentAreas: "Perlu latihan lanjutan.",
    },
    approvedRecommendations: [],
  },
};

test("PDF rapor menghasilkan struktur PDF dan menampilkan isi utama", async () => {
  const bytes = new Uint8Array(await createReportPdf(sample).arrayBuffer());
  const content = new TextDecoder().decode(bytes);
  assert.ok(content.startsWith("%PDF-1.4"));
  assert.ok(content.includes("DAD Simulasi"));
  assert.ok(content.includes("Intelektualitas"));
  assert.ok(content.endsWith("%%EOF"));
});

test("PDF memakai urutan bagian layout baru dan tidak mengarang status", async () => {
  const content = new TextDecoder().decode(
    new Uint8Array(await createReportPdf(sample).arrayBuffer()),
  );
  const sections = [
    "RAPOT DAD KADER",
    "Pimpinan Cabang Ikatan Mahasiswa Muhammadiyah Kota Bandung",
    "PROFIL PESERTA",
    "Asal Jurusan",
    "Asal Komisariat",
    "RINGKASAN NILAI",
    "ASPEK PENILAIAN",
    "HASIL SKOR",
    "NILAI PER INDIKATOR",
    "KEKUATAN",
    "AREA PENGEMBANGAN",
    "REKOMENDASI TINGKAT LANJUT",
    "ALASAN KEPUTUSAN",
    "PENGESAHAN",
    "Dinilai oleh",
    "Disahkan oleh",
    "Tanggal disahkan",
    "Rapor resmi IMM Observer | halaman",
  ];
  for (const section of sections)
    assert.ok(content.includes(section), `Bagian tidak ditemukan: ${section}`);
  assert.ok(content.includes("Belum ada rekomendasi yang disahkan."));
  assert.ok(!content.includes("FINALIZED"));
  assert.ok(!content.includes("v1"));
  assert.ok(
    content.indexOf("PROFIL PESERTA") < content.indexOf("RINGKASAN NILAI"),
  );
  assert.ok(content.indexOf("ASPEK PENILAIAN") < content.indexOf("KEKUATAN"));
});

test("PDF menampilkan placeholder yang jelas untuk data kosong", async () => {
  const empty = {
    ...sample,
    publishedAt: null,
    snapshotData: {
      schemaVersion: 1,
      aspects: [{ aspectName: "Aspek Kosong" }],
      indicators: [],
      overall: { score: null },
      collective: {},
      approvedRecommendations: [],
    },
  };
  const content = new TextDecoder().decode(
    new Uint8Array(await createReportPdf(empty).arrayBuffer()),
  );
  assert.ok(content.includes("Belum tersedia"));
  assert.ok(content.includes("Belum diterbitkan"));
  assert.ok(content.includes("Versi snapshot: tidak tercatat"));
  assert.ok(content.includes("Belum ada alasan yang tercatat di snapshot."));
  assert.ok(!content.includes("0.0/100"));
});

test("PDF menampilkan grafik rata-rata nilai per materi", async () => {
  const withCharts = {
    ...sample,
    snapshotData: {
      ...sample.snapshotData,
      indicators: [
        { indicatorId: "i1", average: 4, validRatings: 2, scope: "session" },
        { indicatorId: "i2", average: 3, validRatings: 2, scope: "session" },
      ],
    },
    indicatorNames: { i1: "Pemahaman materi", i2: "Refleksi" },
    materialHistory: [
      {
        label: "AIK",
        score: 70,
        aspects: [
          { name: "Intelektualitas", score: 40 },
          { name: "Religiusitas", score: 60 },
        ],
      },
      {
        label: "Character Building",
        score: 82,
        aspects: [
          { name: "Intelektualitas", score: 55 },
          { name: "Religiusitas", score: 70 },
        ],
      },
    ],
  };
  const content = new TextDecoder().decode(
    new Uint8Array(await createReportPdf(withCharts).arrayBuffer()),
  );
  for (const section of [
    "CAKUPAN PENILAIAN",
    "GRAFIK RATA-RATA NILAI PER MATERI",
    "AIK",
    "Character Building",
  ])
    assert.ok(content.includes(section), `Bagian tidak ditemukan: ${section}`);
});

test("PDF meringkas rekomendasi otomatis dan menghapus duplikatnya", async () => {
  const verbose = {
    ...sample,
    snapshotData: {
      ...sample.snapshotData,
      approvedRecommendations: [
        {
          recommendation:
            'Draf otomatis untuk indikator "Menjaga etika" (rata-rata 2/5, aspek Sikap & etika): Latihan refleksi bersama.',
        },
        {
          recommendation:
            'Draf otomatis untuk indikator "Menghargai perbedaan" (rata-rata 1/5, aspek Sikap & etika): Latihan refleksi bersama.',
        },
      ],
    },
  };
  const content = new TextDecoder().decode(
    new Uint8Array(await createReportPdf(verbose).arrayBuffer()),
  );
  assert.ok(content.includes("1. Latihan refleksi bersama."));
  assert.ok(!content.includes("Draf otomatis"));
  assert.ok(!content.includes("rata-rata 2/5"));
  assert.ok(!content.includes("aspek Sikap"));
  assert.equal(content.split("Latihan refleksi bersama.").length - 1, 1);
});

test("ZIP bulk memakai signature ZIP dan berisi nama PDF", async () => {
  const pdf = new Uint8Array(await createReportPdf(sample).arrayBuffer());
  const zip = new Uint8Array(
    await createReportZip([
      { name: "Rapor_DAD_Peserta_2026.pdf", bytes: pdf },
    ]).arrayBuffer(),
  );
  assert.equal(zip[0], 0x50);
  assert.equal(zip[1], 0x4b);
  assert.equal(zip[2], 0x03);
  assert.equal(zip[3], 0x04);
  assert.ok(
    new TextDecoder().decode(zip).includes("Rapor_DAD_Peserta_2026.pdf"),
  );
});
