import Link from "next/link";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getAnnualManagementReports } from "@/lib/informeGestion";
import DeleteReportButton from "./DeleteReportButton";
import type { SchoolYearRow } from "@/lib/types";

export default async function AnnualManagementReportsPage({
  searchParams,
}: {
  searchParams?: { year?: string; type?: string };
}) {
  const session = await getSession();
  if (!session || !session.user) {
    redirect("/login");
  }

  const institutionId = session.user.institution_id;
  if (!institutionId) {
    return (
      <div className="p-8 text-center text-slate-600">
        No tienes una institución asignada en tu cuenta.
      </div>
    );
  }

  const schoolYears = db
    .prepare("SELECT * FROM school_years WHERE institution_id = ? ORDER BY is_active DESC, created_at DESC")
    .all(institutionId) as SchoolYearRow[];

  const selectedYearId = searchParams?.year || schoolYears.find((y) => y.is_active)?.id || schoolYears[0]?.id;
  const selectedType = searchParams?.type as any;

  const reports = getAnnualManagementReports(institutionId, {
    schoolYearId: selectedYearId,
    reportType: selectedType,
    userId: session.user.role !== "ADMIN" && session.user.role !== "DISTRITO" ? session.user.id : undefined,
  });

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <h1 className="text-xl font-bold text-slate-900">
              Informes de Fin de Gestión DECE
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Informes técnicos anuales de culminación de año lectivo conforme al Modelo de Gestión DECE (Acuerdo Nro. MINEDUC-MINEDUC-2023-00010-A).
          </p>
        </div>

        <Link
          href="/informe-gestion/nuevo"
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 self-start sm:self-auto"
        >
          <span>+</span> Nuevo Informe de Fin de Gestión
        </Link>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
        {/* Selector de Año Lectivo */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-600">Año Lectivo:</label>
          <div className="flex flex-wrap gap-1">
            {schoolYears.map((year) => {
              const isActive = (selectedYearId || "") === year.id;
              return (
                <Link
                  key={year.id}
                  href={`/informe-gestion?year=${year.id}${selectedType ? `&type=${selectedType}` : ""}`}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {year.name} {year.is_active ? "★" : ""}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Selector de Modalidad */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <Link
            href={`/informe-gestion?${selectedYearId ? `year=${selectedYearId}` : ""}`}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
              !selectedType ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Todos
          </Link>
          <Link
            href={`/informe-gestion?type=DEPARTAMENTAL${selectedYearId ? `&year=${selectedYearId}` : ""}`}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
              selectedType === "DEPARTAMENTAL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🏢 Departamentales
          </Link>
          <Link
            href={`/informe-gestion?type=INDIVIDUAL${selectedYearId ? `&year=${selectedYearId}` : ""}`}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
              selectedType === "INDIVIDUAL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            👤 Individuales
          </Link>
        </div>
      </div>

      {/* Lista de Informes */}
      {reports.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <span className="text-4xl mb-3 block">📄</span>
          <h3 className="text-base font-bold text-slate-800">
            No se han generado informes para este período
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
            Al culminar el año lectivo, cada DECE o profesional individual elabora este informe técnico integrando todas las atenciones, tipologías y proyectos ejecutados.
          </p>
          <Link
            href="/informe-gestion/nuevo"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm"
          >
            <span>+</span> Crear Primer Informe de Fin de Gestión
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((rep) => {
            let profsCount = 1;
            try {
              const p = JSON.parse(rep.professionals_json || "[]");
              profsCount = p.length || 1;
            } catch {}

            let totalCases = 0;
            try {
              const cases = JSON.parse(rep.case_typologies_json || "[]");
              totalCases = cases.reduce((acc: number, c: any) => acc + (Number(c.total) || 0), 0);
            } catch {}

            return (
              <div
                key={rep.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        rep.report_type === "DEPARTAMENTAL"
                          ? "bg-blue-100 text-blue-800 border border-blue-200"
                          : "bg-purple-100 text-purple-800 border border-purple-200"
                      }`}
                    >
                      {rep.report_type === "DEPARTAMENTAL" ? "🏢 Departamental" : "👤 Individual"}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 font-semibold">
                      {rep.school_year_text}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 leading-snug line-clamp-2" title={rep.title_topic}>
                    {rep.title_topic}
                  </h3>

                  <div className="mt-2 text-xs text-slate-600 space-y-1">
                    <p className="font-mono text-[11px] text-slate-500 font-bold">
                      {rep.report_code}
                    </p>
                    <p>
                      <span className="text-slate-400">Responsable:</span>{" "}
                      <span className="font-semibold text-slate-700">{rep.user_name}</span>
                    </p>
                    <p>
                      <span className="text-slate-400">Fecha:</span> {rep.report_date}
                    </p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-3 text-xs">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">
                      👥 {profsCount} {profsCount === 1 ? "profesional" : "profesionales"}
                    </span>
                    <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-semibold">
                      📁 {totalCases} casos
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/informe-gestion/${rep.id}/imprimir`}
                      className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-xs font-bold transition-colors"
                    >
                      🖨️ Ver / Imprimir
                    </Link>
                    <a
                      href={`/api/informe-gestion/${rep.id}/export-word`}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold transition-colors"
                      title="Descargar documento oficial Word (.docx)"
                    >
                      📥 Word
                    </a>
                    <Link
                      href={`/informe-gestion/${rep.id}/editar`}
                      className="px-2 py-1.5 text-slate-600 hover:text-slate-900 rounded text-xs font-semibold"
                    >
                      ✏️
                    </Link>
                  </div>

                  <DeleteReportButton id={rep.id} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
