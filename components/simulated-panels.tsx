"use client";

/**
 * KONTEN SIMULASI / PLACEHOLDER PROTOTIPE.
 * Panel di berkas ini menampilkan contoh statis (agenda, kartu kegiatan,
 * profil instruktur simulasi) yang diberi tag "CONTOH SIMULASI" di UI.
 * Panel ini bukan data nyata; ganti dengan konten berbasis database
 * sesuai BLUEPRINT.md sebelum pemakaian resmi.
 */
import Link from "next/link";
import { CalendarDays, ClipboardList, FileText, Sparkles } from "lucide-react";
import { instructorPositionLabel } from "@/lib/instructor-roles";
import type { AppRole } from "@/lib/roles";
import type { InstructorAssignment } from "./instructor-duty-dashboard";

const agenda = [
  {
    day: "HARI 01",
    title: "Ideologi IMM dan Keislaman",
    time: "08.00 – 10.00",
    status: "Selesai",
    color: "done",
  },
  {
    day: "HARI 01",
    title: "Kemuhammadiyahan",
    time: "10.30 – 12.00",
    status: "Berlangsung",
    color: "live",
  },
  {
    day: "HARI 01",
    title: "Ke-IMM-an",
    time: "13.00 – 15.00",
    status: "Berikutnya",
    color: "next",
  },
];

function SampleTag() {
  return <span className="sample-tag">CONTOH SIMULASI</span>;
}

export function DashboardContent({
  role,
  instructorAssignments = [],
}: {
  role: AppRole;
  instructorAssignments?: InstructorAssignment[];
}) {
  if (role === "instruktur")
    return (
      <div className="section-heading role-heading">
        <div>
          <h2>Tugas Instruktur</h2>
          <p>
            {instructorAssignments.length
              ? [
                  ...new Set(
                    instructorAssignments.map((item) =>
                      instructorPositionLabel(item.position),
                    ),
                  ),
                ].join(" · ")
              : "Menunggu penugasan per kegiatan dari Superadmin"}
          </p>
        </div>
        <span className="sample-tag">SUBROLE PER KEGIATAN</span>
      </div>
    );
  if (role === "observer")
    return (
      <>
        <div className="section-heading role-heading">
          <div>
            <h2>Kegiatan yang ditugaskan</h2>
            <p>Daftar kegiatan dan materi untuk Anda</p>
          </div>
          <SampleTag />
        </div>
        <div className="role-grid">
          <section className="panel">
            <div className="assigned-card">
              <div className="assigned-icon">
                <ClipboardList size={20} aria-hidden="true" />
              </div>
              <div className="assigned-copy">
                <span className="agenda-status live">Sedang berlangsung</span>
                <h3>DAD Simulasi 2026</h3>
                <p>Komisariat FEB · 3 hari · 8 materi</p>
                <small>Peran Anda: Observer · 12 peserta</small>
              </div>
              <Link
                prefetch={false}
                className="text-button"
                href="/dashboard/observasi"
              >
                Buka penilaian →
              </Link>
            </div>
            <div className="assigned-foot">
              Progres tugas Anda <strong>8 dari 12 peserta</strong>
              <div className="bar-track">
                <i style={{ width: "67%" }} />
              </div>
            </div>
          </section>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Jadwal hari ini</h2>
                <p>Agenda kegiatan yang ditugaskan</p>
              </div>
              <span className="date-chip">HARI 1</span>
            </div>
            {agenda.map((item) => (
              <div className="schedule-row" key={item.title}>
                <span className={`schedule-dot ${item.color}`} />
                <div>
                  <small>{item.time}</small>
                  <strong>{item.title}</strong>
                </div>
                <span className={`agenda-status ${item.color}`}>
                  {item.status}
                </span>
              </div>
            ))}
          </section>
        </div>
      </>
    );

  if (role === "bidang_kader")
    return (
      <>
        <div className="section-heading role-heading">
          <div>
            <h2>Daftar kegiatan DAD</h2>
            <p>Pantau status kegiatan dan perkembangan kaderisasi</p>
          </div>
          <SampleTag />
        </div>
        <div className="role-grid">
          <section className="panel">
            <div className="activity-row">
              <div className="assigned-icon">
                <CalendarDays size={20} aria-hidden="true" />
              </div>
              <div className="activity-copy">
                <small>24–26 Oktober 2026 · Komisariat FEB</small>
                <h3>Darul Arqam Dasar</h3>
                <p>8 materi · 6 Observer</p>
              </div>
              <span className="agenda-status live">Berlangsung</span>
              <Link
                prefetch={false}
                className="text-button"
                href="/dashboard/kegiatan"
              >
                Detail →
              </Link>
            </div>
            <div className="activity-foot">
              <span>Status penilaian Observer</span>
              <div className="mini-bar">
                <i style={{ width: "68%" }} />
              </div>
              <b>68%</b>
            </div>
          </section>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Ringkasan peserta</h2>
                <p>DAD Simulasi 2026</p>
              </div>
              <Link
                prefetch={false}
                className="text-button"
                href="/dashboard/peserta"
              >
                Lihat peserta →
              </Link>
            </div>
            <div className="metric-row">
              <div>
                <strong>48</strong>
                <span>Peserta terdaftar</span>
              </div>
              <div>
                <strong>32</strong>
                <span>Sudah dinilai</span>
              </div>
              <div>
                <strong>16</strong>
                <span>Belum dinilai</span>
              </div>
            </div>
            <div className="data-caption">
              Angka hanya untuk simulasi antarmuka
            </div>
          </section>
        </div>
      </>
    );

  if (role === "komisariat")
    return (
      <>
        <div className="section-heading role-heading">
          <div>
            <h2>Kegiatan komisariat Anda</h2>
            <p>Informasi dan laporan sesuai akses Komisariat FEB</p>
          </div>
          <SampleTag />
        </div>
        <div className="role-grid">
          <section className="panel">
            <div className="activity-row">
              <div className="assigned-icon">
                <CalendarDays size={20} aria-hidden="true" />
              </div>
              <div className="activity-copy">
                <small>24–26 Oktober 2026</small>
                <h3>Darul Arqam Dasar</h3>
                <p>Komisariat FEB · 8 materi</p>
              </div>
              <span className="agenda-status live">Berlangsung</span>
            </div>
            <div className="data-caption">
              Hanya kegiatan yang terhubung dengan komisariat Anda.
            </div>
          </section>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Rekap dan laporan</h2>
                <p>Dokumen yang boleh diakses komisariat</p>
              </div>
            </div>
            <div className="report-row">
              <span className="report-icon">
                <FileText size={20} aria-hidden="true" />
              </span>
              <div>
                <strong>Rekap kegiatan DAD</strong>
                <small>Ringkasan umum · belum diterbitkan</small>
              </div>
              <span className="agenda-status next">Belum tersedia</span>
            </div>
            <div className="privacy-note">
              Nilai individu dan catatan observasi pribadi tidak ditampilkan di
              sini.
            </div>
          </section>
        </div>
      </>
    );

  if (role === "peserta")
    return (
      <>
        <div className="section-heading role-heading">
          <div>
            <h2>Perkembangan Anda</h2>
            <p>Ringkasan pribadi untuk DAD Simulasi 2026</p>
          </div>
          <span className="temporary-pill">NILAI SEMENTARA</span>
        </div>
        <div className="role-grid">
          <section className="panel participant-score">
            <div>
              <small>RINGKASAN NILAI SEMENTARA</small>
              <strong>
                78<span>/100</span>
              </strong>
              <p>Nilai ini belum menjadi hasil resmi.</p>
            </div>
            <SampleTag />
          </section>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Catatan pengembangan</h2>
                <p>Masukan untuk mendukung proses belajar Anda</p>
              </div>
            </div>
            <div className="development-note">
              <span>
                <Sparkles size={18} aria-hidden="true" />
              </span>
              <p>
                Terus berlatih menyampaikan pendapat dengan runtut dan ikut
                aktif dalam diskusi kelompok.
              </p>
            </div>
            <div className="privacy-note">
              Ringkasan ini bukan data mentah per indikator.
            </div>
          </section>
        </div>
      </>
    );

  if (role === "admin_system")
    return (
      <>
        <div className="section-heading role-heading">
          <div>
            <h2>Ikhtisar sistem</h2>
            <p>Pengguna dan kesiapan konfigurasi</p>
          </div>
          <SampleTag />
        </div>
        <div className="role-grid">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Jumlah pengguna per role</h2>
                <p>Data simulasi untuk rancangan</p>
              </div>
              <Link
                prefetch={false}
                className="text-button"
                href="/dashboard/pengguna"
              >
                Kelola pengguna →
              </Link>
            </div>
            <div className="user-role-list">
              <div>
                <span>Observer</span>
                <b>6</b>
              </div>
              <div>
                <span>Bidang Kader</span>
                <b>3</b>
              </div>
              <div>
                <span>Komisariat</span>
                <b>4</b>
              </div>
              <div>
                <span>Peserta</span>
                <b>48</b>
              </div>
            </div>
          </section>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Status konfigurasi</h2>
                <p>Komponen dasar sistem</p>
              </div>
            </div>
            <div className="config-row">
              <span>Konfigurasi penilaian</span>
              <span className="agenda-status next">Belum terhubung</span>
            </div>
            <div className="config-row">
              <span>Penyimpanan data</span>
              <span className="agenda-status next">Belum terhubung</span>
            </div>
            <div className="config-row">
              <span>Login dan role</span>
              <span className="agenda-status next">Belum terhubung</span>
            </div>
            <div className="data-caption">
              Status akan terisi setelah fitur backend dibuat.
            </div>
          </section>
        </div>
      </>
    );

  return (
    <>
      <div className="section-heading role-heading">
        <div>
          <h2>Informasi kegiatan DAD</h2>
          <p>Kabar dan jadwal kegiatan kaderisasi</p>
        </div>
        <SampleTag />
      </div>
      <div className="role-grid public-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Telah, sedang, dan akan berlangsung</h2>
              <p>Informasi kegiatan yang dibuka untuk publik</p>
            </div>
          </div>
          <div className="public-event">
            <span className="agenda-status done">Telah diselenggarakan</span>
            <strong>DAD Simulasi 2026 · Komisariat FEB</strong>
            <small>24–26 Oktober 2026 · 8 materi</small>
          </div>
          <div className="public-event">
            <span className="agenda-status live">Sedang berlangsung</span>
            <strong>Informasi kegiatan berjalan</strong>
            <small>Detail jadwal akan ditampilkan setelah diumumkan.</small>
          </div>
          <div className="public-event">
            <span className="agenda-status next">Akan diselenggarakan</span>
            <strong>Jadwal mendatang</strong>
            <small>Belum ada kegiatan yang diumumkan.</small>
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Profil instruktur</h2>
              <p>Kenali para pemateri DAD</p>
            </div>
          </div>
          <div className="instructor-row">
            <div className="instructor-photo">IF</div>
            <div>
              <strong>Instruktur Simulasi 01</strong>
              <small>Materi ideologi dan keislaman</small>
              <a href="#profil-instruktur">Media sosial: contoh profil</a>
            </div>
          </div>
          <div className="instructor-row">
            <div className="instructor-photo alt">IN</div>
            <div>
              <strong>Instruktur Simulasi 02</strong>
              <small>Materi kemuhammadiyahan</small>
              <a href="#profil-instruktur">Media sosial: contoh profil</a>
            </div>
          </div>
          <div className="data-caption">
            Foto/nama/akun nyata hanya ditampilkan setelah disetujui instruktur.
          </div>
        </section>
      </div>
    </>
  );
}
