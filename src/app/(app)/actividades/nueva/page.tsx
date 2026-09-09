import { requireRole } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { createActivity } from "../actions";
import { ACTIVITY_AXIS_LABELS, PREVENTION_THEME_OPTIONS } from "@/lib/types";

export default async function NuevaActividadPage() {
  await requireRole(["ADMIN", "DECE"]);
  return (
    <div>
      <PageHeader title="Nueva actividad" description="Registra una actividad de promoción, prevención o convivencia." />
      <form action={createActivity} className="card p-6 space-y-4 max-w-2xl">
        <div>
          <label className="label">Título *</label>
          <input name="title" required className="input" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Eje *</label>
            <select name="axis" required className="select">
              {Object.entries(ACTIVITY_AXIS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Fecha *</label>
            <input type="date" name="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="input" />
          </div>
          <div>
            <label className="label">Temática de prevención (si el eje es Prevención)</label>
            <select name="prevention_theme" defaultValue="" className="select">
              <option value="">— No aplica / no especificar —</option>
              {PREVENTION_THEME_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Dirigido a</label>
            <input name="target_audience" placeholder="Ej. Estudiantes de bachillerato" className="input" />
          </div>
          <div>
            <label className="label">Cursos/paralelos</label>
            <input name="courses" placeholder="Ej. 1BGU A, 1BGU B" className="input" />
          </div>
          <div>
            <label className="label">Número de participantes</label>
            <input type="number" min={0} name="participants_count" className="input" />
          </div>
        </div>
        <div>
          <label className="label">Descripción</label>
          <textarea name="description" rows={3} className="textarea" />
        </div>
        <div>
          <label className="label">Evidencias / observaciones</label>
          <textarea name="evidence_notes" rows={2} className="textarea" />
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary">Registrar actividad</button>
        </div>
      </form>
    </div>
  );
}
