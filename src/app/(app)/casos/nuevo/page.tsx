import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import SearchableStudentSelect from "@/components/SearchableStudentSelect";
import { createCase } from "../actions";
import { RISK_TYPE_LABELS, ACTION_AXIS_LABELS, CASE_PRIORITY_LABELS } from "@/lib/types";
import type { StudentRow, UserRow, TeacherAlertRow } from "@/lib/types";
import VoiceDictationButton from "@/components/VoiceDictationButton";

export default async function NuevoCasoPage({
  searchParams,
}: {
  searchParams?: { estudiante?: string; alerta?: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const students = db
    .prepare("SELECT * FROM students WHERE active = 1 AND institution_id = ? ORDER BY full_name ASC")
    .all(institutionId) as StudentRow[];
  const professionals = db
    .prepare("SELECT * FROM users WHERE role IN ('DECE','ADMIN') AND active = 1 AND institution_id = ? ORDER BY name ASC")
    .all(institutionId) as UserRow[];

  let alert: TeacherAlertRow | undefined;
  if (searchParams?.alerta) {
    alert = db
      .prepare("SELECT * FROM teacher_alerts WHERE id = ? AND institution_id = ?")
      .get(searchParams.alerta, institutionId) as TeacherAlertRow | undefined;
  }

  const preselectedStudent = alert?.student_id || searchParams?.estudiante || "";

  return (
    <div>
      <PageHeader title="Nuevo caso" description="Registra un nuevo caso de riesgo psicosocial o ficha de atención." />
      <form action={createCase} className="card p-6 space-y-5 max-w-3xl">
        {alert && <input type="hidden" name="alert_id" value={alert.id} />}
        <div>
          <label className="label">Estudiante *</label>
          <SearchableStudentSelect 
            students={students} 
            defaultValue={preselectedStudent} 
          />
        </div>

        {alert && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm px-3 py-2">
            Este caso se creará a partir de la alerta reportada: <strong>{alert.description}</strong>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Tipo de riesgo *</label>
            <select name="risk_type" required className="select">
              {Object.entries(RISK_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Especificar (si es "Otro")</label>
            <input name="risk_type_other" className="input" />
          </div>
          <div>
            <label className="label">Prioridad *</label>
            <select name="priority" required defaultValue="MEDIA" className="select">
              {Object.entries(CASE_PRIORITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Eje de acción *</label>
            <select name="action_axis" required defaultValue="ATENCION" className="select">
              {Object.entries(ACTION_AXIS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Fecha de detección *</label>
            <input type="date" name="detection_date" required defaultValue={new Date().toISOString().slice(0, 10)} className="input" />
          </div>
          <div>
            <label className="label">Fuente de detección</label>
            <input name="detection_source" placeholder="Ej. Docente tutor, autorreporte, representante..." className="input" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Profesional responsable</label>
            <select name="assigned_to_id" className="select">
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="label">Descripción / motivo de atención *</label>
            <VoiceDictationButton targetId="case-description" />
          </div>
          <textarea
            id="case-description"
            name="description"
            required
            rows={5}
            defaultValue={alert?.description || ""}
            placeholder="Relato de la situación detectada. Esta información es confidencial."
            className="textarea"
          />
          <p className="text-xs text-slate-400 mt-1">
            Este contenido es confidencial: solo el equipo DECE y la administración pueden verlo.
          </p>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary">Registrar caso</button>
        </div>
      </form>
    </div>
  );
}
