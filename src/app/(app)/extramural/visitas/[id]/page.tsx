import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { saveHomeVisit } from "../actions";
import Link from "next/link";
import SearchableStudentSelect from "@/components/SearchableStudentSelect";

export default async function HomeVisitFormPage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const isNew = params.id === "nueva";

  let visit: any = null;
  if (!isNew) {
    visit = db.prepare("SELECT * FROM home_visits WHERE id = ? AND institution_id = ?").get(params.id, institutionId);
    if (!visit) {
      return <div>Visita no encontrada.</div>;
    }
  }

  // Fetch students for the dropdown
  const students = db.prepare(
    "SELECT id, full_name, course, parallel FROM students WHERE institution_id = ?"
  ).all(institutionId) as any[];

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title={isNew ? "Programar Visita Domiciliaria" : "Detalles de Visita"}
        description="Completa los datos para registrar la visita al domicilio del estudiante."
      />

      <form action={saveHomeVisit} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs p-6 space-y-6">
        <input type="hidden" name="id" value={params.id} />

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Estudiante
            </label>
            {isNew ? (
              <SearchableStudentSelect students={students} defaultValue={visit?.student_id} />
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-sm font-medium">
                {students.find(s => s.id === visit.student_id)?.full_name || visit.student_id}
              </div>
            )}
            {!isNew && <input type="hidden" name="student_id" value={visit.student_id} />}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Fecha de Visita
              </label>
              <input
                type="datetime-local"
                name="visit_date"
                defaultValue={visit ? visit.visit_date.slice(0, 16) : ""}
                required
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Estado
              </label>
              <select
                name="status"
                defaultValue={visit?.status || "PROGRAMADA"}
                required
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="PROGRAMADA">Programada</option>
                <option value="REALIZADA">Realizada</option>
                <option value="SUSPENDIDA">Suspendida</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Dirección
            </label>
            <textarea
              name="address"
              defaultValue={visit?.address || ""}
              required
              rows={2}
              className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
              placeholder="Dirección exacta del domicilio..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Latitud (opcional)
              </label>
              <input
                type="number"
                step="any"
                name="latitude"
                defaultValue={visit?.latitude || ""}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Longitud (opcional)
              </label>
              <input
                type="number"
                step="any"
                name="longitude"
                defaultValue={visit?.longitude || ""}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Condiciones de Vivienda (opcional)
            </label>
            <textarea
              name="housing_conditions"
              defaultValue={visit?.housing_conditions || ""}
              rows={3}
              className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
              placeholder="Descripción de la infraestructura, servicios básicos, hacinamiento..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Dinámica Familiar (opcional)
            </label>
            <textarea
              name="family_dynamics"
              defaultValue={visit?.family_dynamics || ""}
              rows={3}
              className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
              placeholder="Observaciones sobre la interacción, rutinas, clima familiar..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Link href="/extramural/visitas" className="btn-secondary">
            Cancelar
          </Link>
          <button type="submit" className="btn-primary">
            {isNew ? "Programar" : "Guardar Cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
