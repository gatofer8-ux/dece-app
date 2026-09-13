import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { saveCommunityRisk } from "../actions";
import Link from "next/link";
import dynamic from "next/dynamic";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), { ssr: false });

export default async function CommunityRiskFormPage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const isNew = params.id === "nueva";

  let risk: any = null;
  if (!isNew) {
    risk = db.prepare("SELECT * FROM community_risks WHERE id = ? AND institution_id = ?").get(params.id, institutionId);
    if (!risk) {
      return <div>Riesgo no encontrado.</div>;
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title={isNew ? "Reportar Riesgo Comunitario" : "Editar Riesgo Comunitario"}
        description="Registra situaciones o zonas de riesgo en los alrededores de la institución."
      />

      <form action={saveCommunityRisk} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs p-6 space-y-6">
        <input type="hidden" name="id" value={params.id} />

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Título / Descripción Corta
          </label>
          <input
            type="text"
            name="title"
            defaultValue={risk?.title || ""}
            required
            className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
            placeholder="Ej. Zona de expendio, Cruce peligroso sin semáforo..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Tipo de Riesgo
            </label>
            <select
              name="risk_type"
              defaultValue={risk?.risk_type || "OTRO"}
              required
              className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="DROGAS">Drogas / Expendio</option>
              <option value="DELINCUENCIA">Delincuencia / Robos</option>
              <option value="VIALIDAD">Vialidad / Tráfico peligroso</option>
              <option value="PANDILLAS">Pandillas / Grupos violentos</option>
              <option value="VIOLENCIA">Violencia intrafamiliar / comunitaria</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Severidad
            </label>
            <select
              name="severity"
              defaultValue={risk?.severity || "MEDIA"}
              required
              className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALTA">Alta (Peligro inminente)</option>
              <option value="MEDIA">Media</option>
              <option value="BAJA">Baja</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Descripción Detallada (opcional)
          </label>
          <textarea
            name="description"
            defaultValue={risk?.description || ""}
            rows={4}
            className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
            placeholder="Proporciona más detalles sobre el riesgo y cómo afecta a los estudiantes..."
          />
        </div>

        <LocationPicker defaultLat={risk?.latitude} defaultLng={risk?.longitude} required />

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Link href="/extramural/riesgos" className="btn-secondary">
            Cancelar
          </Link>
          <button type="submit" className="btn-primary">
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}
