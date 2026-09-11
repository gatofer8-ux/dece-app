import { requireRole } from "@/lib/session";
import { PageHeader, getTodayEcuador } from "@/components/ui";
import { createActivity } from "../actions";
import { ACTIVITY_AXIS_LABELS, PREVENTION_THEME_OPTIONS } from "@/lib/types";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import ActivityAiButton from "../ActivityAiButton";

export default async function NuevaActividadPage() {
  await requireRole(["ADMIN", "DECE"]);
  return (
    <div>
      <PageHeader title="Nueva actividad" description="Registra una actividad de promoción, prevención o convivencia." />
      <form action={createActivity} className="card p-6 space-y-4 max-w-2xl">
        <div>
          <label className="label">Título *</label>
          <input id="act-title" name="title" required className="input" placeholder="Ej. Taller de prevención del acoso escolar" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Eje *</label>
            <select id="act-axis" name="axis" required className="select">
              {Object.entries(ACTIVITY_AXIS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Fecha *</label>
            <input type="date" name="date" required defaultValue={getTodayEcuador()} className="input" />
          </div>
          <div>
            <label className="label">Temática de prevención (si el eje es Prevención)</label>
            <select id="act-theme" name="prevention_theme" defaultValue="" className="select">
              <option value="">— No aplica / no especificar —</option>
              {PREVENTION_THEME_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Dirigido a</label>
            <input id="act-target" name="target_audience" placeholder="Ej. Estudiantes de básica superior" className="input" />
          </div>
          <div>
            <label className="label">Cursos/paralelos</label>
            <input id="act-courses" name="courses" placeholder="Ej. 8vo A, 8vo B, 9no A" className="input" />
          </div>
          <div>
            <label className="label">Número de participantes</label>
            <input type="number" min={0} name="participants_count" className="input" placeholder="0" />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="activity-description" className="label mb-0">Descripción</label>
            <div className="flex items-center gap-1.5">
              <VoiceDictationButton targetId="activity-description" />
              <ActivityAiButton fieldKey="description" targetId="activity-description" />
            </div>
          </div>
          <textarea
            id="activity-description"
            name="description"
            rows={4}
            className="textarea"
            placeholder="Describe el objetivo pedagógico, dinámicas implementadas y desarrollo de la actividad..."
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="activity-evidence-notes" className="label mb-0">Evidencias / observaciones</label>
            <div className="flex items-center gap-1.5">
              <VoiceDictationButton targetId="activity-evidence-notes" />
              <ActivityAiButton fieldKey="evidence_notes" targetId="activity-evidence-notes" />
            </div>
          </div>
          <textarea
            id="activity-evidence-notes"
            name="evidence_notes"
            rows={3}
            className="textarea"
            placeholder="Registros de asistencia firmados, registro fotográfico, compromisos adquiridos y observaciones..."
          />
        </div>
        <div className="flex justify-end pt-2">
          <button type="submit" className="btn-primary">Registrar actividad</button>
        </div>
      </form>
    </div>
  );
}
