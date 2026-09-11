import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader, getTodayEcuador } from "@/components/ui";
import { createAppointment } from "../actions";
import type { StudentRow, UserRow, CaseFileRow } from "@/lib/types";

export default async function NuevaCitaPage({
  searchParams,
}: {
  searchParams: { estudiante?: string; caso?: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const students = db
    .prepare("SELECT * FROM students WHERE active = 1 AND institution_id = ? ORDER BY full_name ASC")
    .all(institutionId) as StudentRow[];
  const professionals = db
    .prepare("SELECT * FROM users WHERE role IN ('DECE','ADMIN') AND active = 1 AND institution_id = ? ORDER BY name ASC")
    .all(institutionId) as UserRow[];

  let caseFile: CaseFileRow | undefined;
  if (searchParams.caso) {
    caseFile = db
      .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
      .get(searchParams.caso, institutionId) as CaseFileRow | undefined;
  }

  return (
    <div>
      <PageHeader title="Nueva cita" description="Agenda una cita del equipo DECE." />
      <form action={createAppointment} className="card p-6 space-y-4 max-w-2xl">
        {caseFile && <input type="hidden" name="case_file_id" value={caseFile.id} />}
        <div>
          <label className="label">Título *</label>
          <input name="title" required placeholder="Ej. Entrevista de seguimiento" className="input" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Estudiante</label>
            <select name="student_id" defaultValue={searchParams.estudiante || caseFile?.student_id || ""} className="select">
              <option value="">Sin estudiante asociado</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.full_name} — {s.course}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Profesional</label>
            <select name="professional_id" defaultValue={session.user.id} className="select">
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Fecha *</label>
            <input type="date" name="date" required defaultValue={getTodayEcuador()} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Hora inicio *</label>
              <input type="time" name="start_time" required defaultValue="08:00" className="input" />
            </div>
            <div>
              <label className="label">Hora fin</label>
              <input type="time" name="end_time" className="input" />
            </div>
          </div>
          <div>
            <label className="label">Con quién es la cita</label>
            <select name="attendee_type" className="select">
              <option value="ESTUDIANTE">Estudiante</option>
              <option value="REPRESENTANTE">Representante</option>
              <option value="DOCENTE">Docente</option>
              <option value="EXTERNO">Externo</option>
            </select>
          </div>
          <div>
            <label className="label">Lugar</label>
            <input name="location" placeholder="Ej. Oficina DECE" className="input" />
          </div>
        </div>
        <div>
          <label className="label">Notas</label>
          <textarea name="notes" rows={3} className="textarea" />
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary">Agendar cita</button>
        </div>
      </form>
    </div>
  );
}
