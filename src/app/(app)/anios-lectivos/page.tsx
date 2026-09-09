import { requireRole } from "@/lib/session";
import { PageHeader, Badge } from "@/components/ui";
import { listSchoolYears } from "@/lib/schoolYear";
import { SCHOOL_YEAR_REGIME_LABELS } from "@/lib/types";
import { createSchoolYearAction, setActiveSchoolYearAction } from "./actions";

export default async function AniosLectivosPage() {
  const session = await requireRole(["ADMIN"]);
  const institutionId = session.user.institution_id;
  if (!institutionId) return <div>No tienes acceso a esta sección.</div>;

  const schoolYears = listSchoolYears(institutionId);

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="Años Lectivos y Períodos Escolares"
        description="Organiza y divide los casos, citas, alertas y registros del DECE por ciclo académico institucional."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario para agregar año lectivo */}
        <div className="card p-5 lg:col-span-1 space-y-4">
          <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
            <span>➕</span> Registrar Nuevo Año Lectivo
          </h3>

          <form action={createSchoolYearAction} className="space-y-3">
            <div>
              <label className="label">Nombre del Año Lectivo *</label>
              <input
                type="text"
                name="name"
                required
                placeholder="Ej. 2025-2026 Sierra"
                className="input text-xs"
              />
            </div>

            <div>
              <label className="label">Régimen Escolar *</label>
              <select name="regime" required className="input text-xs">
                <option value="SIERRA_AMAZONIA">Sierra - Amazonía</option>
                <option value="COSTA_GALAPAGOS">Costa - Galápagos</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Inicio *</label>
                <input type="date" name="start_date" required className="input text-xs" />
              </div>
              <div>
                <label className="label">Fin *</label>
                <input type="date" name="end_date" required className="input text-xs" />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <label htmlFor="is_active" className="text-xs text-slate-700 font-medium">
                Establecer como año lectivo activo
              </label>
            </div>

            <button type="submit" className="btn-primary w-full text-xs justify-center py-2">
              Guardar Año Lectivo
            </button>
          </form>
        </div>

        {/* Lista de Años Lectivos */}
        <div className="card lg:col-span-2 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 text-sm">
              Períodos Registrados ({schoolYears.length})
            </h3>
            <span className="text-xs text-slate-500">Trazabilidad inter-anual</span>
          </div>

          <div className="divide-y divide-slate-100">
            {schoolYears.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No hay años lectivos configurados. El sistema creará el primero automáticamente.
              </div>
            ) : (
              schoolYears.map((year) => (
                <div
                  key={year.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 text-sm">{year.name}</span>
                      {year.is_active === 1 ? (
                        <Badge color="green">★ Activo por defecto</Badge>
                      ) : (
                        <Badge color="slate">Histórico</Badge>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-3">
                      <span>🏛️ {SCHOOL_YEAR_REGIME_LABELS[year.regime] || year.regime}</span>
                      <span>📅 {year.start_date} al {year.end_date}</span>
                    </div>
                  </div>

                  {year.is_active === 0 && (
                    <form
                      action={async () => {
                        "use server";
                        await setActiveSchoolYearAction(year.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="btn-secondary text-xs py-1 px-2.5 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                      >
                        Activar como vigente
                      </button>
                    </form>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
