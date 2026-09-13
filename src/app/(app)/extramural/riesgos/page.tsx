import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader, Badge, EmptyState, formatDateTime } from "@/components/ui";

const SEVERITY_COLOR: Record<string, string> = {
  ALTA: "red",
  MEDIA: "amber",
  BAJA: "blue",
};

export default async function CommunityRisksPage() {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const risks = db
    .prepare(
      `SELECT cr.*, u.name as reporter_name 
       FROM community_risks cr
       LEFT JOIN users u ON cr.created_by = u.id
       WHERE cr.institution_id = ? 
       ORDER BY cr.created_at DESC`
    )
    .all(institutionId) as any[];

  return (
    <div>
      <PageHeader
        title="Mapeo de Riesgos Comunitarios"
        description="Identificación de zonas de riesgo en el entorno de la institución educativa."
        action={
          <Link href="/extramural/riesgos/nueva" className="btn-primary">
            + Reportar riesgo
          </Link>
        }
      />

      {risks.length === 0 ? (
        <EmptyState title="No hay riesgos comunitarios registrados" />
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Riesgo</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Severidad</th>
                  <th className="px-4 py-3">Reportado por</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {risks.map((risk) => (
                  <tr key={risk.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{risk.title}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {risk.risk_type}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={SEVERITY_COLOR[risk.severity] || "slate"}>{risk.severity}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {risk.reporter_name}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {formatDateTime(risk.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/extramural/riesgos/${risk.id}`}
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
