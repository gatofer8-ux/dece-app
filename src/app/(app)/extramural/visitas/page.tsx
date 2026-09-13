import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader, Badge, EmptyState, formatDateTime } from "@/components/ui";

const STATUS_COLOR: Record<string, string> = {
  PROGRAMADA: "amber",
  REALIZADA: "green",
  SUSPENDIDA: "red",
};

export default async function HomeVisitsPage() {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const visits = db
    .prepare(
      `SELECT hv.*, s.full_name, s.course, s.parallel, u.name as professional_name
       FROM home_visits hv
       LEFT JOIN students s ON hv.student_id = s.id
       LEFT JOIN users u ON hv.professional_id = u.id
       WHERE hv.institution_id = ?
       ORDER BY hv.visit_date DESC LIMIT 200`
    )
    .all(institutionId) as any[];

  return (
    <div>
      <PageHeader
        title="Visitas Domiciliarias"
        description="Gestión de visitas a domicilio para evaluación de condiciones de vida y dinámica familiar."
        action={
          <Link href="/extramural/visitas/nueva" className="btn-primary">
            + Programar visita
          </Link>
        }
      />

      {visits.length === 0 ? (
        <EmptyState title="No hay visitas domiciliarias registradas" />
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Estudiante</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Dirección</th>
                  <th className="px-4 py-3">Profesional a cargo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {visits.map((visit) => (
                  <tr key={visit.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {visit.full_name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {visit.course} {visit.parallel}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {formatDateTime(visit.visit_date)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={visit.address}>
                      {visit.address}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {visit.professional_name}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={STATUS_COLOR[visit.status] || "slate"}>
                        {visit.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/extramural/visitas/${visit.id}`}
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
