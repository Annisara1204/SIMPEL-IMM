"use client";

import { updateInstructorDutyItem } from "@/app/dashboard/penilaian/actions";
import { instructorPositionLabel } from "@/lib/instructor-roles";

export type InstructorDuty = { id: string; title: string; is_done: boolean; instructor_assignment_id: string };
export type InstructorAssignment = { id: string; event_id: string; position: string; event_name: string; duties: InstructorDuty[] };

const descriptions: Record<string, string> = {
  mot: "Pimpin koordinasi instruktur dan pantau kesiapan kegiatan.",
  vice_mot: "Bantu MoT menjalankan koordinasi dan siap mengambil alih bila diperlukan.",
  iot: "Siapkan dan pantau agenda ibadah serta pembinaan ruhiyah kegiatan.",
  vice_iot: "Bantu IoT menjaga kesiapan petugas dan kelancaran agenda ibadah.",
  master_observer: "Koordinasikan Observer dan pantau penyelesaian evaluasi.",
  vice_observer: "Bantu koordinator Observer memantau progres dan konsolidasi hasil.",
};

export function InstructorDutyDashboard({ assignments }: { assignments: InstructorAssignment[] }) {
  return <section className="instructor-duty-section">
    <div className="section-heading role-heading"><div><h2>Tugas sesuai subrole</h2><p>Tandai tugas sebagai selesai setelah dikerjakan. Tugas hanya terlihat pada akun dan kegiatan yang ditugaskan.</p></div><span className="sample-tag">TUGAS KEGIATAN</span></div>
    {!assignments.length ? <div className="panel"><p className="users-empty">Belum ada penugasan subrole. Minta Super Admin menugaskan Anda melalui Pengaturan Penilaian.</p></div> : <div className="instructor-duty-grid">{assignments.map((assignment) => <section className="panel instructor-duty-card" key={assignment.id}>
      <div className="panel-heading"><div><h3>{assignment.event_name}</h3><p>{instructorPositionLabel(assignment.position)}</p></div></div>
      <p className="instructor-duty-description">{descriptions[assignment.position] ?? "Selesaikan tugas yang diberikan pada kegiatan ini."}</p>
      <div className="instructor-duty-list">{assignment.duties.map((duty) => <form action={updateInstructorDutyItem} className="instructor-duty-row" key={duty.id}>
        <input type="hidden" name="assignmentId" value={assignment.id}/><input type="hidden" name="dutyItemId" value={duty.id}/>
        <label><input type="checkbox" name="isDone" defaultChecked={duty.is_done} onChange={(event) => event.currentTarget.form?.requestSubmit()}/><span className={duty.is_done ? "is-done" : ""}>{duty.title}</span></label>
      </form>)}</div>
      {!assignment.duties.length && <p className="users-empty">Belum ada tugas untuk subrole ini.</p>}
    </section>)}</div>}
    <p className="privacy-note">Tugas checklist disediakan sebagai panduan operasional. Penugasan Instruktur juga memberi akses input penilaian hanya pada kegiatan tersebut; setiap perubahan skor/catatan mencatat nama akun dan waktunya.</p>
  </section>;
}
