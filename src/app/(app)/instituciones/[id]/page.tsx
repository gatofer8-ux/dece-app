import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { PageHeader, Badge, StatCard, formatDate } from "@/components/ui";
import { ROLE_LABELS, type InstitutionRow, type UserRow } from "@/lib/types";
import {
  toggleInstitutionActive,
  toggleInstitutionUserActive,
  updateInstitution,
  deleteInstitutionUser,
  deleteInstitution,
} from "../actions";
import CreateInstitutionUserForm from "../CreateInstitutionUserForm";
import ResetInstitutionUserPasswordForm from "../ResetInstitutionUserPasswordForm";
import ConfirmDeleteForm from "@/components/ConfirmDeleteForm";

export default async function InstitucionDetallePage({ params }: { params: { id: string } }) {
  const session = await requireRole(["DISTRITO"]);
  const isSuperadmin = session.user.role === "SUPERADMIN";

  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(params.id) as InstitutionRow | undefined;
  if (!institution) notFound();

  const users = db
    .prepare("SELECT * FROM users WHERE institution_id = ? ORDER BY name ASC")
    .all(institution.id) as UserRow[];

  const totalStudents = (db.prepare("SELECT COUNT(*) n FROM students WHERE institution_id=? AND active=1").get(institution.id) as any).n;
  const openCases = (db.prepare("SELECT COUNT(*) n FROM case_files WHERE institution_id=? AND status != 'CERRADO'").get(institution.id) as any).n;
  const highPriority = (db.prepare("SELECT COUNT(*) n FROM case_files WHERE institution_id=? AND status != 'CERRADO' AND priority='ALTA'").get(institution.id) as any).n;
  const pendingAlerts = (db.prepare("SELECT COUNT(*) n FROM teacher_alerts WHERE institution_id=? AND status='PENDIENTE'").get(institution.id) as any).n;

  return (
    <div>
      <PageHeader
        title={institution.name}
        description={`AMIE: ${institution.amie_code || "—"} · Circuito: ${institution.circuit || "—"}`}
        action={
          <div className="flex items-center gap-3">
            <form
              action={async () => {
                "use server";
                await toggleInstitutionActive(institution.id, !institution.active);
              }}
            >
              <button className="btn-secondary text-xs">{institution.active ? "Desactivar" : "Reactivar"}</button>
            </form>
            {isSuperadmin && (
              <ConfirmDeleteForm
                action={deleteInstitution.bind(null, institution.id)}
                label="Eliminar institución"
                confirmMessage={`¿Eliminar definitivamente "${institution.name}"? Esta acción no se puede deshacer. Si la institución todavía tiene usuarios, estudiantes o casos registrados, el sistema rechazará el borrado y te sugerirá desactivarla en su lugar.`}
              />
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Estudiantes" value={totalStudents} />
        <StatCard label="Casos activos" value={openCases} />
        <StatCard label="Prioridad alta" value={highPriority} />
        <StatCard label="Alertas pendientes" value={pendingAlerts} />
      </div>
      <p className="text-xs text-slate-400 mb-6">
        Estos indicadores son agregados: el distrito no accede al relato/descripción confidencial de los casos individuales.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Datos de la institución</h2>
          <form action={updateInstitution.bind(null, institution.id)} className="space-y-3">
            <div>
              <label className="label text-xs">Nombre</label>
              <input name="name" required defaultValue={institution.name} className="input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">AMIE</label>
                <input name="amie_code" defaultValue={institution.amie_code || ""} className="input" />
              </div>
              <div>
                <label className="label text-xs">Circuito</label>
                <input name="circuit" defaultValue={institution.circuit || ""} className="input" />
              </div>
              <div>
                <label className="label text-xs">Distrito</label>
                <input name="district" defaultValue={institution.district || ""} className="input" />
              </div>
              <div>
                <label className="label text-xs">Coordinación Zonal</label>
                <input name="zona" placeholder="Ej. ZONA 3" defaultValue={institution.zona || ""} className="input" />
              </div>
              <div>
                <label className="label text-xs">Dirección</label>
                <input name="address" defaultValue={institution.address || ""} className="input" />
              </div>
            </div>
            <div>
              <label className="label text-xs">Logo / sello institucional (aparece en el menú lateral del sistema y al imprimir documentos oficiales)</label>
              <div className="flex items-center gap-3">
                {institution.seal_image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={institution.seal_image} alt="Sello actual" className="h-14 w-14 object-contain border border-slate-200 rounded" />
                )}
                <input type="file" name="seal_image" accept="image/*" className="input text-xs" />
              </div>
            </div>
            <button className="btn-secondary text-xs">Guardar cambios</button>
          </form>
        </section>

        {isSuperadmin && (
          <section className="card p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Crear usuario para esta institución</h2>
            <CreateInstitutionUserForm institutionId={institution.id} />
          </section>
        )}
      </div>

      <h2 className="text-sm font-semibold text-slate-700 mt-8 mb-3">Usuarios de la institución</h2>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Nombre</th>
              <th className="text-left px-4 py-3">Correo</th>
              <th className="text-left px-4 py-3">Rol</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-left px-4 py-3">Creado</th>
              <th className="text-left px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3 text-slate-600">{ROLE_LABELS[u.role]}</td>
                <td className="px-4 py-3">
                  {u.active ? <Badge color="green">Activo</Badge> : <Badge color="slate">Inactivo</Badge>}
                </td>
                <td className="px-4 py-3 text-slate-600">{formatDate(u.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <form
                      action={async () => {
                        "use server";
                        await toggleInstitutionUserActive(u.id, institution.id, !u.active);
                      }}
                    >
                      <button className="text-xs text-brand-700 hover:underline">
                        {u.active ? "Desactivar" : "Reactivar"}
                      </button>
                    </form>
                    <ResetInstitutionUserPasswordForm userId={u.id} institutionId={institution.id} />
                    {isSuperadmin && (
                      <ConfirmDeleteForm
                        action={deleteInstitutionUser.bind(null, u.id, institution.id)}
                        confirmMessage={`¿Eliminar definitivamente a ${u.name}? Esta acción no se puede deshacer. Si el usuario ya tiene actividad registrada, el sistema rechazará el borrado y te sugerirá desactivarlo en su lugar.`}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Sin usuarios registrados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
