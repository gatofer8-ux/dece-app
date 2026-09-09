import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { PageHeader, Badge, EmptyState, StatCard } from "@/components/ui";
import type { InstitutionRow } from "@/lib/types";
import CreateDistrictUserForm from "./CreateDistrictUserForm";

export default async function InstitucionesPage() {
  const session = await requireRole(["DISTRITO"]);
  const isSuperadmin = session.user.role === "SUPERADMIN";

  const institutions = db
    .prepare("SELECT * FROM institutions ORDER BY name ASC")
    .all() as InstitutionRow[];

  const studentCounts = db
    .prepare("SELECT institution_id, COUNT(*) n FROM students WHERE active = 1 GROUP BY institution_id")
    .all() as { institution_id: string; n: number }[];
  const openCaseCounts = db
    .prepare("SELECT institution_id, COUNT(*) n FROM case_files WHERE status != 'CERRADO' GROUP BY institution_id")
    .all() as { institution_id: string; n: number }[];
  const highPriorityCounts = db
    .prepare("SELECT institution_id, COUNT(*) n FROM case_files WHERE status != 'CERRADO' AND priority='ALTA' GROUP BY institution_id")
    .all() as { institution_id: string; n: number }[];
  const pendingAlertCounts = db
    .prepare("SELECT institution_id, COUNT(*) n FROM teacher_alerts WHERE status='PENDIENTE' GROUP BY institution_id")
    .all() as { institution_id: string; n: number }[];
  const userCounts = db
    .prepare("SELECT institution_id, COUNT(*) n FROM users WHERE active = 1 AND institution_id IS NOT NULL GROUP BY institution_id")
    .all() as { institution_id: string; n: number }[];

  const toMap = (rows: { institution_id: string; n: number }[]) => new Map(rows.map((r) => [r.institution_id, r.n]));
  const studentMap = toMap(studentCounts);
  const openCaseMap = toMap(openCaseCounts);
  const highPriorityMap = toMap(highPriorityCounts);
  const pendingAlertMap = toMap(pendingAlertCounts);
  const userMap = toMap(userCounts);

  const totals = {
    institutions: institutions.filter((i) => i.active).length,
    students: institutions.reduce((a, i) => a + (studentMap.get(i.id) || 0), 0),
    openCases: institutions.reduce((a, i) => a + (openCaseMap.get(i.id) || 0), 0),
    highPriority: institutions.reduce((a, i) => a + (highPriorityMap.get(i.id) || 0), 0),
  };

  return (
    <div>
      <PageHeader
        title="Instituciones del distrito"
        description="Vista agregada por institución educativa. El relato confidencial de cada caso no es visible a nivel de distrito."
        action={
          isSuperadmin ? (
            <Link href="/instituciones/nueva" className="btn-primary">
              + Nueva institución
            </Link>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Instituciones activas" value={totals.institutions} />
        <StatCard label="Estudiantes (total)" value={totals.students} />
        <StatCard label="Casos activos (total)" value={totals.openCases} />
        <StatCard label="Prioridad alta (total)" value={totals.highPriority} />
      </div>

      {institutions.length === 0 ? (
        <EmptyState
          title="Aún no hay instituciones registradas"
          description={isSuperadmin ? "Crea la primera institución educativa del distrito para empezar." : "No hay instituciones registradas en este distrito."}
          action={
            isSuperadmin ? (
              <Link href="/instituciones/nueva" className="btn-primary">
                + Nueva institución
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="card overflow-x-auto mb-8">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Institución</th>
                <th className="text-left px-4 py-3">AMIE</th>
                <th className="text-left px-4 py-3">Circuito</th>
                <th className="text-left px-4 py-3">Estudiantes</th>
                <th className="text-left px-4 py-3">Casos activos</th>
                <th className="text-left px-4 py-3">Prioridad alta</th>
                <th className="text-left px-4 py-3">Alertas pendientes</th>
                <th className="text-left px-4 py-3">Usuarios</th>
                <th className="text-left px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {institutions.map((i) => (
                <tr key={i.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/instituciones/${i.id}`} className="font-medium text-brand-700 hover:underline">
                      {i.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{i.amie_code || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{i.circuit || "—"}</td>
                  <td className="px-4 py-3">{studentMap.get(i.id) || 0}</td>
                  <td className="px-4 py-3">{openCaseMap.get(i.id) || 0}</td>
                  <td className="px-4 py-3">
                    {highPriorityMap.get(i.id) ? <Badge color="red">{highPriorityMap.get(i.id)}</Badge> : 0}
                  </td>
                  <td className="px-4 py-3">
                    {pendingAlertMap.get(i.id) ? <Badge color="amber">{pendingAlertMap.get(i.id)}</Badge> : 0}
                  </td>
                  <td className="px-4 py-3">{userMap.get(i.id) || 0}</td>
                  <td className="px-4 py-3">
                    {i.active ? <Badge color="green">Activa</Badge> : <Badge color="slate">Inactiva</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isSuperadmin && (
        <>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Crear cuenta de distrito</h2>
          <CreateDistrictUserForm />
        </>
      )}
    </div>
  );
}
