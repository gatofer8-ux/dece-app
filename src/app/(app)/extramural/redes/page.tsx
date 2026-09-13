import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader, Badge, EmptyState, formatDateTime } from "@/components/ui";

const TYPE_COLOR: Record<string, string> = {
  SALUD: "blue",
  JUSTICIA: "slate",
  POLICIA: "amber",
  ONG: "green",
  COMUNITARIA: "emerald",
  OTRO: "slate",
};

export default async function SupportNetworksPage() {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const networks = db
    .prepare(
      `SELECT * FROM support_networks 
       WHERE institution_id = ? 
       ORDER BY name ASC`
    )
    .all(institutionId) as any[];

  return (
    <div>
      <PageHeader
        title="Redes de Apoyo Interinstitucional"
        description="Directorio de organizaciones y entidades que colaboran con la institución."
        action={
          <Link href="/extramural/redes/nueva" className="btn-primary">
            + Añadir red de apoyo
          </Link>
        }
      />

      {networks.length === 0 ? (
        <EmptyState title="No hay redes de apoyo registradas" />
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Contacto</th>
                  <th className="px-4 py-3">Teléfono / Email</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {networks.map((network) => (
                  <tr key={network.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{network.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={TYPE_COLOR[network.type] || "slate"}>{network.type}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {network.contact_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      <div>{network.phone || "-"}</div>
                      <div className="text-xs">{network.email || ""}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/extramural/redes/${network.id}`}
                        className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
                      >
                        Ver detalles
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
