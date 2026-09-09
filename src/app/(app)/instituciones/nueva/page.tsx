import { requireRole } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { createInstitution } from "../actions";

export default async function NuevaInstitucionPage() {
  await requireRole(["SUPERADMIN"]);
  return (
    <div>
      <PageHeader title="Nueva institución" description="Registra una institución educativa del distrito." />
      <form action={createInstitution} className="card p-6 space-y-4 max-w-xl">
        <div>
          <label className="label">Nombre de la institución *</label>
          <input name="name" required placeholder="Ej. UE Santa Rosa" className="input" />
        </div>
        <div>
          <label className="label">Código AMIE</label>
          <input name="amie_code" className="input" />
        </div>
        <div>
          <label className="label">Distrito</label>
          <input name="district" className="input" />
        </div>
        <div>
          <label className="label">Circuito</label>
          <input name="circuit" className="input" />
        </div>
        <div>
          <label className="label">Coordinación Zonal</label>
          <input name="zona" placeholder="Ej. ZONA 3" className="input" />
        </div>
        <div>
          <label className="label">Dirección</label>
          <input name="address" className="input" />
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary">Registrar institución</button>
        </div>
      </form>
    </div>
  );
}
