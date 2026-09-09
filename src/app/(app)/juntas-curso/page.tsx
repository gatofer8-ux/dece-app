import Link from "next/link";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { getCourseBoardReports } from "@/lib/juntasCurso";
import { listSchoolYears, getSelectedSchoolYear } from "@/lib/schoolYear";
import { formatDate } from "@/components/ui";
import type { Trimester } from "@/lib/types";
import { TRIMESTER_LABELS } from "@/lib/types";
import DeleteReportButton from "./DeleteReportButton";
import CourseFilterSelect from "./CourseFilterSelect";

export default async function JuntasCursoPage({
  searchParams,
}: {
  searchParams: { trimester?: string; course?: string };
}) {
  const session = await requireRole(["ADMIN", "DECE", "AUTORIDAD"]);
  const institutionId = requireInstitutionId(session);

  const schoolYears = await listSchoolYears(institutionId);
  const selectedYear = await getSelectedSchoolYear(institutionId);
  const isCoordinatorOrAdmin = session.user.role === "ADMIN" || session.user.role === "AUTORIDAD";

  const targetTrimester = searchParams.trimester as Trimester | undefined;

  const reports = getCourseBoardReports({
    institutionId,
    userId: session.user.id,
    isCoordinatorOrAdmin,
    schoolYearId: selectedYear?.id,
    trimester: targetTrimester,
  });

  // Cursos únicos presentes en los informes para filtro
  const uniqueCourses = Array.from(new Set(reports.map((r) => r.course))).filter(Boolean);
  const filteredReports = searchParams.course
    ? reports.filter((r) => r.course.toLowerCase() === searchParams.course?.toLowerCase())
    : reports;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📋</span>
            <h1 className="text-2xl font-bold text-slate-900">
              Informe técnico juntas de curso
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Gestión y emisión de informes trimestrales por curso y paralelo según cobertura del distributivo DECE (Acuerdo Ministerial MINEDUC-2024-00066-A).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/distributivo"
            className="px-3.5 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors"
          >
            👥 Ver Distributivo
          </Link>
          <Link
            href="/juntas-curso/nuevo"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm transition-all inline-flex items-center gap-2"
          >
            <span>+</span> Nuevo Informe
          </Link>
        </div>
      </div>

      {/* Pestañas de Filtro por Trimestre */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <Link
            href="/juntas-curso"
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              !targetTrimester
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Todos los Trimestres ({reports.length})
          </Link>
          {(["1T", "2T", "3T"] as Trimester[]).map((t) => {
            const count = reports.filter((r) => r.trimester === t).length;
            const active = targetTrimester === t;
            return (
              <Link
                key={t}
                href={`/juntas-curso?trimester=${t}`}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  active
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {TRIMESTER_LABELS[t]} ({count})
              </Link>
            );
          })}
        </div>

        {/* Filtro por Curso si hay variedad */}
        {uniqueCourses.length > 1 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Filtrar por curso:</span>
            <CourseFilterSelect courses={uniqueCourses} selectedCourse={searchParams.course} />
          </div>
        )}
      </div>

      {/* Lista de Informes */}
      {filteredReports.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
          <span className="text-4xl block mb-3">📄</span>
          <h3 className="text-base font-bold text-slate-800">
            No se han generado informes técnicos de juntas de curso
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {isCoordinatorOrAdmin
              ? "Los profesionales del equipo DECE elaborarán sus informes trimestrales por cada curso y paralelo de su cobertura asignada en el distributivo."
              : "Crea tu primer informe seleccionando uno de tus cursos asignados en el distributivo institucional."}
          </p>
          <div className="mt-5">
            <Link
              href="/juntas-curso/nuevo"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow transition-all"
            >
              <span>+</span> Elaborar Informe Técnico
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">No. Informe / Código</th>
                  <th className="py-3 px-4">Trimestre</th>
                  <th className="py-3 px-4">Curso / Paralelo</th>
                  <th className="py-3 px-4">Docente Tutor</th>
                  <th className="py-3 px-4">Profesional DECE</th>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4 text-center">Casos</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReports.map((r) => {
                  let casesCount = 0;
                  try {
                    casesCount = JSON.parse(r.cases_json || "[]").length;
                  } catch {}

                  const canEditOrDelete =
                    isCoordinatorOrAdmin || r.user_id === session.user.id;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/juntas-curso/${r.id}`}
                          className="font-mono font-bold text-indigo-600 hover:underline block"
                        >
                          {r.report_code}
                        </Link>
                        <span className="text-[11px] text-slate-400 font-sans">
                          {r.school_year_text}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {TRIMESTER_LABELS[r.trimester]}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">
                          {r.course} "{r.parallel}"
                        </div>
                        <div className="text-[11px] text-slate-500">{r.jornada}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{r.tutor_name}</div>
                        <div className="text-[11px] text-slate-400">Docente Tutor</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{r.user_name}</div>
                        <div className="text-[11px] text-slate-400">{r.user_role_label}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {formatDate(r.report_date)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {casesCount > 0 ? (
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs">
                            {casesCount} {casesCount === 1 ? "caso" : "casos"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-[11px]">
                            ✓ Sin casos
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <Link
                            href={`/juntas-curso/${r.id}`}
                            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors"
                            title="Ver e Imprimir Informe Oficial"
                          >
                            👁️ Ver
                          </Link>
                          <a
                            href={`/api/juntas-curso/${r.id}/export-word`}
                            className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-xs transition-colors"
                            title="Descargar Word (.docx)"
                          >
                            📥 Word
                          </a>
                          <a
                            href={`/api/juntas-curso/${r.id}/export-pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium text-xs transition-colors"
                            title="Descargar PDF Oficial"
                          >
                            📄 PDF
                          </a>
                          {canEditOrDelete && (
                            <>
                              <Link
                                href={`/juntas-curso/${r.id}/editar`}
                                className="px-2.5 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-medium text-xs transition-colors inline-flex items-center gap-1"
                                title="Editar informe técnico"
                              >
                                <span>✏️</span>
                                <span>Editar</span>
                              </Link>
                              <DeleteReportButton id={r.id} reportCode={r.report_code} />
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
