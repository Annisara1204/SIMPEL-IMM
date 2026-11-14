"use client";
import Link from "next/link";

import { updateInstructorDutyItem } from "@/app/dashboard/penilaian/assignment-actions";
import { instructorPositionLabel } from "@/lib/instructor-roles";

export type InstructorDuty = {
  id: string;
  title: string;
  is_done: boolean;
  instructor_assignment_id: string;
};
export type InstructorAssignment = {
  id: string;
  event_id: string;
  position: string;
  event_name: string;
  duties: InstructorDuty[];
};
export type InstructorParticipantEvent = {
  id: string;
  name: string;
  participants: {
    id: string;
    display_name: string;
    commissariat: string | null;
    major: string | null;
    entry_year: number | null;
    position: string | null;
  }[];
};

const descriptions: Record<string, string> = {
  mot: "Pimpin koordinasi instruktur dan pantau kesiapan kegiatan.",
  vice_mot:
    "Bantu MoT menjalankan koordinasi dan siap mengambil alih bila diperlukan.",
  iot: "Siapkan dan pantau agenda ibadah serta pembinaan ruhiyah kegiatan.",
  vice_iot: "Bantu IoT menjaga kesiapan petugas dan kelancaran agenda ibadah.",
  master_observer: "Koordinasikan Observer dan pantau penyelesaian evaluasi.",
  vice_observer:
    "Bantu koordinator Observer memantau progres dan konsolidasi hasil.",
};

export function InstructorDutyDashboard({
  assignments,
  participantEvents = [],
}: {
  assignments: InstructorAssignment[];
  participantEvents?: InstructorParticipantEvent[];
}) {
  return (
    <section className="instructor-duty-section">
      <div className="section-heading role-heading">
        <div>
          <h2>Tugas sesuai subrole</h2>
          <p>
            Tandai tugas sebagai selesai setelah dikerjakan. Tugas hanya
            terlihat pada akun dan kegiatan yang ditugaskan.
          </p>
        </div>
        <span className="sample-tag">TUGAS KEGIATAN</span>
      </div>
      {!assignments.length ? (
        <div className="panel">
          <p className="users-empty">
            Belum ada penugasan subrole. Minta Super Admin menugaskan Anda
            melalui Pengaturan Penilaian.
          </p>
        </div>
      ) : (
        <div className="instructor-duty-grid">
          {assignments.map((assignment) => (
            <section className="panel instructor-duty-card" key={assignment.id}>
              <div className="panel-heading">
                <div>
                  <h3>{assignment.event_name}</h3>
                  <p>{instructorPositionLabel(assignment.position)}</p>
                </div>
              </div>
              <p className="instructor-duty-description">
                {descriptions[assignment.position] ??
                  "Selesaikan tugas yang diberikan pada kegiatan ini."}
              </p>
              <div className="instructor-duty-list">
                {assignment.duties.map((duty) => (
                  <form
                    action={updateInstructorDutyItem}
                    className="instructor-duty-row"
                    key={duty.id}
                  >
                    <input
                      type="hidden"
                      name="assignmentId"
                      value={assignment.id}
                    />
                    <input type="hidden" name="dutyItemId" value={duty.id} />
                    <label>
                      <input
                        type="checkbox"
                        name="isDone"
                        defaultChecked={duty.is_done}
                        onChange={(event) =>
                          event.currentTarget.form?.requestSubmit()
                        }
                      />
                      <span className={duty.is_done ? "is-done" : ""}>
                        {duty.title}
                      </span>
                    </label>
                  </form>
                ))}
              </div>
              {!assignment.duties.length && (
                <p className="users-empty">
                  Belum ada tugas untuk subrole ini.
                </p>
              )}
            </section>
          ))}
        </div>
      )}
      <section className="instructor-duty-section">
        <div className="section-heading role-heading">
          <div>
            <h2>Peserta kegiatan</h2>
            <p>
              Profil dan hasil hanya berasal dari kegiatan yang ditugaskan
              kepada akun ini.
            </p>
          </div>
        </div>
        {!participantEvents.length ? (
          <div className="panel">
            <p className="users-empty">
              Belum ada peserta pada kegiatan yang ditugaskan.
            </p>
          </div>
        ) : (
          <div className="instructor-duty-grid">
            {participantEvents.map((event) => (
              <section className="panel instructor-duty-card" key={event.id}>
                <div className="panel-heading">
                  <div>
                    <h3>{event.name}</h3>
                    <p>{event.participants.length} peserta</p>
                  </div>
                  <Link
                    prefetch={false}
                    className="text-button"
                    href={`/dashboard/profil-peserta?eventId=${event.id}`}
                  >
                    Buka profil →
                  </Link>
                </div>
                {event.participants.slice(0, 4).map((person) => (
                  <div className="dashboard-participant-row" key={person.id}>
                    <strong>{person.display_name}</strong>
                    <span>
                      {person.commissariat ?? "Komisariat belum diisi"}
                    </span>
                  </div>
                ))}
                {event.participants.length > 4 && (
                  <p className="data-caption">
                    dan {event.participants.length - 4} peserta lainnya
                  </p>
                )}
                {!event.participants.length && (
                  <p className="users-empty">Belum ada peserta.</p>
                )}
              </section>
            ))}
          </div>
        )}
      </section>
      <p className="privacy-note">
        Tugas checklist disediakan sebagai panduan operasional. Penugasan
        Instruktur juga memberi akses input penilaian hanya pada kegiatan
        tersebut; setiap perubahan skor/catatan mencatat nama akun dan waktunya.
      </p>
    </section>
  );
}
