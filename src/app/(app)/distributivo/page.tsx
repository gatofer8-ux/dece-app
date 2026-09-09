import Link from "next/link";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import { getActiveDistributivo, getUserCoverage, compareCoursesDescending } from "@/lib/distributivo";
import { getSelectedSchoolYear } from "@/lib/schoolYear";
import { PageHeader, EmptyState, StatCard, formatDate } from "@/components/ui";
import type { DeceDistributivoRow } from "@/lib/types";
import DeleteButton from "@/components/DeleteButton";
import { deleteDistributivo } from "./actions";

export default async function DistributivoPage() {
  const session = await requireRole(["ADMIN", "DECE", "AUTORIDAD"]);
  const institutionId = requireInstitutionId(session);
  const isCoordinator = session.user.role === "ADMIN";

  const selectedYear = await getSelectedSchoolYear(institutionId);
  const activeData = await getActiveDistributivo(institutionId, selectedYear?.id);
  const userCoverage = await getUserCoverage(session.user.id, institutionId, session.user.role);

  // List all distributivos for this institution (history)
  const allDistributivos = db
    .prepare(
      `SELECT * FROM dece_distributivos 
       WHERE institution_id = ? 
       ORDER BY is_active DESC, updated_at DESC`
    )
    .all(institutionId) as DeceDistributivoRow[];

  const distributivo = activeData?.distributivo;
  const assignments = activeData?.assignments || [];

  // Find user's own assignment if DECE analyst
  const myAssignment = assignments.find((a) => a.user_id === session.user.id);

  const totalAnalysts = assignments.length;
  const totalStudents = assignments.reduce(
    (sum, a) => sum + (a.estimated_students_count || 0),
    0
  );
  const averagePerAnalyst = totalAnalysts > 0 ? Math.round(totalStudents / totalAnalysts) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Distributivo DECE Institucional"
        description="Gestión oficial de cobertura de cursos, niveles y jornadas asignadas al equipo de profesionales DECE según el estándar ministerial (Acuerdo Nro. MINEDUC-2023-00008-A)."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {distributivo && (
              <Link
                href="/distributivo/imprimir"
                target="_blank"
                className="btn-secondary flex items-center gap-1.5"
              >
                <span>🖨️</span>
                <span>Imprimir Oficial A4</span>
              </Link>
            )}
            {isCoordinator && distributivo && (
              <Link
                href={`/distributivo/${distributivo.id}/editar`}
                className="btn-secondary flex items-center gap-1.5"
              >
                <span>✏️</span>
                <span>Editar Distributivo</span>
              </Link>
            )}
            {isCoordinator && distributivo && (
              <DeleteButton
                onDelete={async () => {
                  "use server";
                  return deleteDistributivo(distributivo.id);
                }}
                label="🗑️ Eliminar"
                confirmMessage="¿Estás seguro de que deseas eliminar este Distributivo DECE institucional? Se eliminarán todas las asignaciones de cursos a los analistas."
                className="btn-secondary text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 flex items-center gap-1.5 text-xs font-semibold py-2 px-3"
              />
            )}
            {isCoordinator && (
              <Link
                href="/distributivo/nuevo"
                className="btn-primary flex items-center gap-1.5"
              >
                <span>➕</span>
                <span>Nuevo Distributivo</span>
              </Link>
            )}
          </div>
        }
      />

      {/* Analyst personal coverage banner */}
      {!isCoordinator && (
        <div className="card p-5 border-l-4 border-indigo-500 bg-indigo-50/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                Tu Cobertura Asignada en Plataforma
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                {session.user.name} ({myAssignment?.user_role_label || "Analista DECE"})
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                La plataforma filtra automáticamente las listas de estudiantes y casos para mostrarte únicamente los cursos asignados a tu cargo.
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="text-center px-3 py-1.5 bg-white rounded-lg border border-indigo-100 shadow-sm">
                <span className="block text-xs text-slate-500">Jornada</span>
                <span className="font-semibold text-indigo-900">{myAssignment?.jornada || "Todas"}</span>
              </div>
              <div className="text-center px-3 py-1.5 bg-white rounded-lg border border-indigo-100 shadow-sm">
                <span className="block text-xs text-slate-500">Estudiantes a Cargo</span>
                <span className="font-bold text-indigo-600 text-base">
                  {myAssignment?.estimated_students_count || 0}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-indigo-100">
            <div className="text-xs font-medium text-slate-700 mb-1.5">Cursos y Paralelos asignados:</div>
            {userCoverage.courses.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {userCoverage.courses.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white text-indigo-800 border border-indigo-200"
                  >
                    {c}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs text-slate-500 italic">
                {userCoverage.isAllInstitutional
                  ? "Cobertura institucional completa activa."
                  : "Aún no tienes cursos específicos asignados en el distributivo actual."}
              </span>
            )}
          </div>
        </div>
      )}

      {!distributivo ? (
        <EmptyState
          title="No hay un Distributivo DECE registrado o vigente"
          description={
            isCoordinator
              ? "Como Coordinador(a) DECE, puedes elaborar el distributivo institucional asignando los cursos, niveles y jornadas a cada analista según el estándar ministerial."
              : "El Coordinador(a) DECE aún no ha registrado el distributivo vigente para este período lectivo."
          }
          action={
            isCoordinator ? (
              <Link href="/distributivo/nuevo" className="btn-primary">
                ➕ Elaborar Distributivo Institucional
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Institutional KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Año Lectivo"
              value={distributivo.school_year_text || "Vigente"}
              hint="Período Académico"
            />
            <StatCard
              label="Estudiantes Coberturados"
              value={totalStudents}
              hint="Total Asignado en Distributivo"
            />
            <StatCard
              label="Equipo DECE"
              value={totalAnalysts}
              hint="Profesionales Asignados"
            />
            <StatCard
              label="Promedio / Profesional"
              value={averagePerAnalyst}
              hint="Estándar MINEDUC: ~450"
            />
          </div>

          {/* Coordinador banner note */}
          {isCoordinator && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-900 flex items-start gap-2.5">
              <span className="text-base">ℹ️</span>
              <div>
                <strong className="font-semibold">Privilegio de Coordinación Institucional:</strong> Como Coordinador(a) DECE, mantienes acceso irrestricto y visualización de la totalidad de estudiantes y casos de toda la institución, independientemente de tu cobertura directa asignada.
              </div>
            </div>
          )}

          {/* Detailed Assignment Table / Cards */}
          <div className="card overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  Matriz de Distribución de Carga por Profesional
                </h2>
                <p className="text-xs text-slate-500">
                  {distributivo.title} • Estado: {distributivo.is_active ? "Vigente (Activo)" : "Histórico"}
                </p>
              </div>
              <div className="text-xs text-slate-500">
                Última actualización: {formatDate(distributivo.updated_at)}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-600 uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-4">Profesional</th>
                    <th className="py-3 px-3">Rol / Cargo</th>
                    <th className="py-3 px-3">Jornada</th>
                    <th className="py-3 px-3">Niveles Educativos</th>
                    <th className="py-3 px-4">Cursos y Paralelos Asignados</th>
                    <th className="py-3 px-3 text-center">Estudiantes</th>
                    <th className="py-3 px-3 text-center">Equilibrio Carga</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assignments.map((assignment, idx) => {
                    let parsedCourses: string[] = [];
                    let parsedSubniveles: string[] = [];
                    try {
                      parsedCourses = JSON.parse(assignment.courses || "[]");
                    } catch {
                      parsedCourses = [];
                    }
                    parsedCourses.sort((a, b) => compareCoursesDescending(a, b));
                    try {
                      parsedSubniveles = JSON.parse(assignment.subniveles || "[]");
                    } catch {
                      parsedSubniveles = [];
                    }

                    const isOverloaded = assignment.estimated_students_count > 500;
                    const isOptimal =
                      assignment.estimated_students_count >= 350 &&
                      assignment.estimated_students_count <= 500;

                    return (
                      <tr key={assignment.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="font-semibold text-slate-900">{assignment.user_name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                              assignment.user_role_label?.toLowerCase().includes("coord")
                                ? "bg-purple-100 text-purple-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {assignment.user_role_label || "Analista DECE"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-medium">
                          {assignment.jornada || "Todas"}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {parsedSubniveles.length > 0 ? parsedSubniveles.join(", ") : "Todos los niveles"}
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          {parsedCourses.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {parsedCourses.map((c) => (
                                <span
                                  key={c}
                                  className="inline-block px-1.5 py-0.5 text-[10px] bg-slate-100 text-slate-800 rounded border border-slate-200"
                                >
                                  {c}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Sin cursos asignados</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-bold text-sm text-slate-900">
                            {assignment.estimated_students_count}
                          </span>
                          <span className="block text-[10px] text-slate-500">
                            {totalStudents > 0
                              ? Math.round((assignment.estimated_students_count / totalStudents) * 100)
                              : 0}% institucional
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {isOverloaded ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800">
                              ⚠️ Sobrecarga ({assignment.estimated_students_count} &gt; 450)
                            </span>
                          ) : isOptimal ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                              ✓ Estándar Óptimo (~450)
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-100 text-sky-800">
                              Carga Moderada
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {distributivo.general_observations && (
              <div className="p-4 bg-slate-50/70 border-t border-slate-200 text-xs text-slate-600">
                <strong className="text-slate-800">Observaciones Técnicas / Criterios de Distribución:</strong>
                <p className="mt-1 whitespace-pre-wrap">{distributivo.general_observations}</p>
              </div>
            )}
          </div>

          {/* Historical versions */}
          {allDistributivos.length > 1 && (
            <div className="card p-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">
                Historial de Distributivos Registrados
              </h3>
              <div className="space-y-2">
                {allDistributivos.map((d) => (
                  <div
                    key={d.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-slate-200 bg-white text-xs hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 flex items-center gap-2">
                        <span>{d.title}</span>
                        {d.is_active === 1 ? (
                          <span className="badge bg-emerald-100 text-emerald-800 text-[10px]">Vigente</span>
                        ) : (
                          <span className="badge bg-slate-100 text-slate-600 text-[10px]">Inactivo</span>
                        )}
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        Año Lectivo: {d.school_year_text || "General"} • Registrado: {formatDate(d.created_at)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 sm:mt-0">
                      <Link
                        href={`/distributivo/imprimir?id=${d.id}`}
                        target="_blank"
                        className="text-xs text-slate-600 hover:text-slate-900 underline font-medium"
                      >
                        🖨️ Ver / Imprimir
                      </Link>
                      {isCoordinator && (
                        <Link
                          href={`/distributivo/${d.id}/editar`}
                          className="text-xs text-indigo-600 hover:text-indigo-800 underline font-medium ml-2"
                        >
                          ✏️ Editar
                        </Link>
                      )}
                      {isCoordinator && (
                        <DeleteButton
                          onDelete={async () => {
                            "use server";
                            return deleteDistributivo(d.id);
                          }}
                          label="🗑️ Eliminar"
                          confirmMessage={`¿Eliminar permanentemente el distributivo "${d.title}"?`}
                          className="text-xs text-rose-600 hover:text-rose-800 underline font-medium ml-2 cursor-pointer"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
