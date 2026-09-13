import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { saveSupportNetwork } from "../actions";
import Link from "next/link";
import dynamic from "next/dynamic";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), { ssr: false });

export default async function SupportNetworkFormPage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const isNew = params.id === "nueva";

  let network: any = null;
  if (!isNew) {
    network = db.prepare("SELECT * FROM support_networks WHERE id = ? AND institution_id = ?").get(params.id, institutionId);
    if (!network) {
      return <div>Red de apoyo no encontrada.</div>;
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title={isNew ? "Añadir Red de Apoyo" : "Editar Red de Apoyo"}
        description="Información sobre la entidad u organización aliada."
      />

      <form action={saveSupportNetwork} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs p-6 space-y-6">
        <input type="hidden" name="id" value={params.id} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nombre de la Organización
            </label>
            <input
              type="text"
              name="name"
              defaultValue={network?.name || ""}
              required
              className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Tipo
            </label>
            <select
              name="type"
              defaultValue={network?.type || "SALUD"}
              required
              className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="SALUD">Salud (Subcentro, Hospital)</option>
              <option value="JUSTICIA">Justicia (Fiscalía, Defensoría)</option>
              <option value="POLICIA">Policía (DINAPEN, UPC)</option>
              <option value="ONG">ONG / Fundación</option>
              <option value="COMUNITARIA">Comunitaria (Barrio, Líderes)</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Persona de Contacto (opcional)
            </label>
            <input
              type="text"
              name="contact_name"
              defaultValue={network?.contact_name || ""}
              className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Teléfono (opcional)
            </label>
            <input
              type="text"
              name="phone"
              defaultValue={network?.phone || ""}
              className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Email (opcional)
            </label>
            <input
              type="email"
              name="email"
              defaultValue={network?.email || ""}
              className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Dirección (opcional)
          </label>
          <input
            type="text"
            name="address"
            defaultValue={network?.address || ""}
            className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <LocationPicker defaultLat={network?.latitude} defaultLng={network?.longitude} />

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Acuerdos o Convenios (opcional)
          </label>
          <textarea
            name="agreements"
            defaultValue={network?.agreements || ""}
            rows={3}
            className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
            placeholder="Detalles sobre convenios de colaboración, rutas de derivación, etc."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Link href="/extramural/redes" className="btn-secondary">
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
