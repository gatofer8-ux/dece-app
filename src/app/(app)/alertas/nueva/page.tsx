import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { createAlert } from "../actions";
import type { StudentRow } from "@/lib/types";
import VoiceDictationButton from "@/components/VoiceDictationButton";

export default async function NuevaAlertaPage() {
  const session = await requireRole(["ADMIN", "DECE", "DOCENTE"]);
  const institutionId = requireInstitutionId(session);
  const students = db
    .prepare("SELECT * FROM students WHERE active = 1 AND institution_id = ? ORDER BY full_name ASC")
    .all(institutionId) as StudentRow[];

  return (
    <div>
      <PageHeader title="Reportar alerta" description="Describe la situación observada. El equipo DECE la revisará." />
      <form action={createAlert} className="card p-6 space-y-4 max-w-xl">
        <div>
          <label className="label">Estudiante *</label>
          <select name="student_id" required className="select">
            <option value="">Seleccionar estudiante...</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.full_name} — {s.course} {s.parallel || ""}</option>
            ))}
          </select>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="label">Descripción de la situación *</label>
            <VoiceDictationButton targetId="alert-description" />
          </div>
          <textarea id="alert-description" name="description" required rows={5} placeholder="¿Qué observaste? ¿Cuándo? ¿Contexto relevante?" className="textarea" />
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary">Enviar alerta</button>
        </div>
      </form>
    </div>
  );
}
