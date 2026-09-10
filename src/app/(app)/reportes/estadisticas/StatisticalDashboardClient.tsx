"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StatisticalReportData, StatPeriodMode, StatUniverse, StatisticalTable } from "@/lib/statistics";

export default function StatisticalDashboardClient({
  data,
  currentUserName,
}: {
  data: StatisticalReportData;
  currentUserName: string;
}) {
  const router = useRouter();

  // Estados locales para los filtros
  const [periodMode, setPeriodMode] = useState<StatPeriodMode>(data.periodMode);
  const [universe, setUniverse] = useState<StatUniverse>(data.universe);
  const [month, setMonth] = useState<string>(data.selectedMonth);
  const [trimester, setTrimester] = useState<"1T" | "2T" | "3T">(data.selectedTrimester);
  const [schoolYearId, setSchoolYearId] = useState<string>(data.selectedSchoolYearId);
  const [startDate, setStartDate] = useState<string>(data.startDate);
  const [endDate, setEndDate] = useState<string>(data.endDate);

  // Tab activo para ver cuadros ("todos" o el id del cuadro)
  const [activeTab, setActiveTab] = useState<string>("todos");

  // Aplicar filtros navegando con URL query params
  function applyFilters(override?: {
    newMode?: StatPeriodMode;
    newUniverse?: StatUniverse;
    newMonth?: string;
    newTrimester?: "1T" | "2T" | "3T";
    newYearId?: string;
  }) {
    const targetMode = override?.newMode || periodMode;
    const targetUniverse = override?.newUniverse || universe;
    const targetMonth = override?.newMonth || month;
    const targetTrimester = override?.newTrimester || trimester;
    const targetYearId = override?.newYearId || schoolYearId;

    const params = new URLSearchParams();
    params.set("periodMode", targetMode);
    params.set("universe", targetUniverse);

    if (targetMode === "MES") {
      params.set("month", targetMonth);
    } else if (targetMode === "TRIMESTRE") {
      params.set("trimester", targetTrimester);
      params.set("schoolYearId", targetYearId);
    } else if (targetMode === "ANIO_LECTIVO") {
      params.set("schoolYearId", targetYearId);
    } else {
      params.set("startDate", startDate);
      params.set("endDate", endDate);
    }

    router.push(`/reportes/estadisticas?${params.toString()}`);
  }

  // Generar URL para exportar a Excel
  const excelExportUrl = `/api/reportes/estadisticas/export-excel?periodMode=${periodMode}&universe=${universe}&month=${encodeURIComponent(
    month
  )}&trimester=${trimester}&schoolYearId=${encodeURIComponent(schoolYearId)}&startDate=${startDate}&endDate=${endDate}`;

  const tablesList: Array<{ id: string; label: string; num: string; table: StatisticalTable }> = [
    { id: "byCourse", label: "Cursos", num: "1", table: data.tables.byCourse },
    { id: "byTypology", label: "Tipologías", num: "2", table: data.tables.byTypology },
    { id: "byJornada", label: "Jornadas", num: "3", table: data.tables.byJornada },
    { id: "byAge", label: "Edades", num: "4", table: data.tables.byAge },
    { id: "byGender", label: "Sexo", num: "5", table: data.tables.byGender },
    { id: "byEthnicity", label: "Etnia", num: "6", table: data.tables.byEthnicity },
    { id: "byNationality", label: "Nacionalidad", num: "7", table: data.tables.byNationality },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Panel de Filtros Interactivos (Oculto en Impresión) */}
      <div className="no-print card p-5 space-y-4 bg-white border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <span>⚙️</span> Filtros de Período y Universo de Análisis
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Genera los cuadros por Mes, Trimestre o Año Lectivo cruzando datos en tiempo real.
            </p>
          </div>

          {/* Selector de Universo: Casos DECE vs Población Estudiantil */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start md:self-auto text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setUniverse("CASOS");
                applyFilters({ newUniverse: "CASOS" });
              }}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                universe === "CASOS"
                  ? "bg-brand-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>📁</span> Casos DECE
            </button>
            <button
              type="button"
              onClick={() => {
                setUniverse("ESTUDIANTES");
                applyFilters({ newUniverse: "ESTUDIANTES" });
              }}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                universe === "ESTUDIANTES"
                  ? "bg-brand-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>🎓</span> Población Estudiantil
            </button>
          </div>
        </div>

        {/* Selector de Modo de Período: MES, TRIMESTRE, AÑO LECTIVO, PERSONALIZADO */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-700 mr-1">Periodo:</span>
          <button
            type="button"
            onClick={() => {
              setPeriodMode("MES");
              applyFilters({ newMode: "MES" });
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
              periodMode === "MES"
                ? "bg-blue-50 border-blue-400 text-blue-800"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
          >
            📅 Por Mes
          </button>
          <button
            type="button"
            onClick={() => {
              setPeriodMode("TRIMESTRE");
              applyFilters({ newMode: "TRIMESTRE" });
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
              periodMode === "TRIMESTRE"
                ? "bg-blue-50 border-blue-400 text-blue-800"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
          >
            📊 Por Trimestre
          </button>
          <button
            type="button"
            onClick={() => {
              setPeriodMode("ANIO_LECTIVO");
              applyFilters({ newMode: "ANIO_LECTIVO" });
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
              periodMode === "ANIO_LECTIVO"
                ? "bg-blue-50 border-blue-400 text-blue-800"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
          >
            🗓️ Por Año Lectivo
          </button>
          <button
            type="button"
            onClick={() => {
              setPeriodMode("PERSONALIZADO");
              applyFilters({ newMode: "PERSONALIZADO" });
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
              periodMode === "PERSONALIZADO"
                ? "bg-blue-50 border-blue-400 text-blue-800"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
          >
            ⚙️ Personalizado
          </button>
        </div>

        {/* Controles dinámicos según el modo seleccionado */}
        <div className="pt-2 flex flex-wrap items-end gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
          {periodMode === "MES" && (
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Seleccionar Mes
                </label>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => {
                    setMonth(e.target.value);
                    applyFilters({ newMonth: e.target.value });
                  }}
                  className="input text-xs py-1.5"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
                  setMonth(cur);
                  applyFilters({ newMonth: cur });
                }}
                className="btn-secondary text-xs py-1.5"
              >
                Mes Actual
              </button>
            </div>
          )}

          {periodMode === "TRIMESTRE" && (
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Año Lectivo
                </label>
                <select
                  value={schoolYearId}
                  onChange={(e) => {
                    setSchoolYearId(e.target.value);
                    applyFilters({ newYearId: e.target.value });
                  }}
                  className="input text-xs py-1.5 min-w-[200px]"
                >
                  {data.availableSchoolYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name} {y.is_active ? "(Activo)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                {(["1T", "2T", "3T"] as const).map((t, idx) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTrimester(t);
                      applyFilters({ newTrimester: t });
                    }}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                      trimester === t
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {idx + 1}.º Trimestre ({t})
                  </button>
                ))}
              </div>
            </div>
          )}

          {periodMode === "ANIO_LECTIVO" && (
            <div className="flex items-end gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Seleccionar Año Lectivo
                </label>
                <select
                  value={schoolYearId}
                  onChange={(e) => {
                    setSchoolYearId(e.target.value);
                    applyFilters({ newYearId: e.target.value });
                  }}
                  className="input text-xs py-1.5 min-w-[240px]"
                >
                  {data.availableSchoolYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name} {y.is_active ? "(Activo)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-xs text-slate-500 pb-2">
                Abarca desde {data.startDate} hasta {data.endDate}
              </span>
            </div>
          )}

          {periodMode === "PERSONALIZADO" && (
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Desde</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input text-xs py-1.5"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Hasta</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input text-xs py-1.5"
                />
              </div>
              <button
                type="button"
                onClick={() => applyFilters()}
                className="btn-primary text-xs py-1.5"
              >
                Aplicar fechas
              </button>
            </div>
          )}

          {/* Botones de Acción: Excel e Imprimir */}
          <div className="ml-auto flex items-center gap-2">
            <a
              href={excelExportUrl}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <span>📥</span> Descargar Excel
            </a>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <span>🖨️</span> Imprimir / PDF
            </button>
          </div>
        </div>
      </div>

      {/* 2. Banner de Información del Reporte */}
      <div className="bg-brand-900 text-white p-5 rounded-xl shadow-xs print:bg-white print:text-black print:p-0 print:border-b-2 print:border-black print:mb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-brand-300 print:text-slate-600">
              {data.institutionName} · Departamento de Consejería Estudiantil (DECE)
            </span>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight mt-0.5">
              Cuadros Estadísticos Institucionales
            </h1>
            <p className="text-xs text-brand-200 print:text-slate-700 mt-1">
              <strong>Período:</strong> {data.periodLabel} &nbsp;|&nbsp; <strong>Universo:</strong>{" "}
              {data.universe === "CASOS" ? "Casos y Expedientes DECE" : "Población Estudiantil Registrada"}
            </p>
          </div>
          <div className="text-left md:text-right text-xs text-brand-200 print:text-slate-600">
            <div>Generado por: <span className="font-semibold text-white print:text-black">{currentUserName}</span></div>
            <div>Fecha de corte: <span className="font-semibold text-white print:text-black">{new Date().toLocaleDateString("es-EC")}</span></div>
          </div>
        </div>

        {/* Resumen de KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/15 print:border-slate-300">
          <div className="bg-white/10 print:bg-slate-50 p-2.5 rounded-lg">
            <div className="text-[10px] text-brand-200 print:text-slate-500 uppercase font-bold">Total Registros</div>
            <div className="text-xl font-bold text-white print:text-black">{data.totalRecords}</div>
          </div>
          <div className="bg-white/10 print:bg-slate-50 p-2.5 rounded-lg">
            <div className="text-[10px] text-brand-200 print:text-slate-500 uppercase font-bold">Distribución Sexo</div>
            <div className="text-sm font-semibold text-white print:text-black">
              ♀ {data.femalePct}% &nbsp;|&nbsp; ♂ {data.malePct}%
            </div>
          </div>
          <div className="bg-white/10 print:bg-slate-50 p-2.5 rounded-lg">
            <div className="text-[10px] text-brand-200 print:text-slate-500 uppercase font-bold">Curso de Mayor Incidencia</div>
            <div className="text-sm font-semibold text-white print:text-black truncate" title={data.predominantCourse}>
              {data.predominantCourse}
            </div>
          </div>
          <div className="bg-white/10 print:bg-slate-50 p-2.5 rounded-lg">
            <div className="text-[10px] text-brand-200 print:text-slate-500 uppercase font-bold">Tipología Prevalente</div>
            <div className="text-sm font-semibold text-white print:text-black truncate" title={data.predominantTypology}>
              {data.predominantTypology}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Selector de Pestañas de Cuadros (Oculto en Impresión) */}
      <div className="no-print flex items-center gap-1.5 overflow-x-auto pb-1 bg-slate-100 p-1.5 rounded-lg border border-slate-200 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab("todos")}
          className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
            activeTab === "todos"
              ? "bg-white text-brand-900 shadow-xs font-bold"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          📑 Ver Todos los Cuadros (7)
        </button>
        {tablesList.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveTab(item.id)}
            className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
              activeTab === item.id
                ? "bg-white text-brand-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {item.num}. {item.label} ({item.table.grandTotal})
          </button>
        ))}
      </div>

      {/* 4. Renderizado de las Tablas Estadísticas */}
      <div className="space-y-8">
        {tablesList.map((item) => {
          const isVisible = activeTab === "todos" || activeTab === item.id;
          if (!isVisible) return null;

          return (
            <section
              key={item.id}
              className="card overflow-hidden border border-slate-200 shadow-xs break-inside-avoid print:shadow-none print:border-black"
            >
              {/* Cabecera del Cuadro */}
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 print:bg-white print:border-black">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm md:text-base flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-brand-900 text-white text-[11px] flex items-center justify-center font-bold print:border print:border-black print:text-black print:bg-transparent">
                      {item.num}
                    </span>
                    {item.table.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 print:text-slate-700">
                    {item.table.description}
                  </p>
                </div>
                <div className="text-xs font-semibold text-slate-700 bg-white px-2.5 py-1 rounded border border-slate-200 self-start sm:self-auto print:border-black">
                  Total: <span className="font-bold text-brand-900 print:text-black">{item.table.grandTotal}</span>
                </div>
              </div>

              {/* Tabla de Doble Entrada (Cruce por Sexo) */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 uppercase tracking-wider text-[11px] print:bg-[#E5E7EB] print:text-black print:border-black">
                      <th className="py-2.5 px-4">{item.table.dimension}</th>
                      <th className="py-2.5 px-3 text-center w-24">Mujeres (F)</th>
                      <th className="py-2.5 px-3 text-center w-24">Hombres (M)</th>
                      <th className="py-2.5 px-3 text-center w-24">Otro / No esp.</th>
                      <th className="py-2.5 px-3 text-center w-24 bg-slate-200/60 print:bg-slate-300">Total</th>
                      <th className="py-2.5 px-3 text-center w-24">% Incidencia</th>
                      <th className="py-2.5 px-4 w-44 no-print">Distribución</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                    {item.table.rows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-400">
                          Sin registros para este período.
                        </td>
                      </tr>
                    ) : (
                      item.table.rows.map((row, idx) => (
                        <tr
                          key={row.key || idx}
                          className="hover:bg-slate-50/80 transition-colors print:hover:bg-transparent"
                        >
                          <td className="py-2 px-4 font-medium text-slate-800 print:text-black">
                            {row.label}
                          </td>
                          <td className="py-2 px-3 text-center font-semibold text-pink-700 print:text-black">
                            {row.female > 0 ? row.female : "—"}
                          </td>
                          <td className="py-2 px-3 text-center font-semibold text-blue-700 print:text-black">
                            {row.male > 0 ? row.male : "—"}
                          </td>
                          <td className="py-2 px-3 text-center text-slate-500 print:text-black">
                            {row.other > 0 ? row.other : "—"}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-slate-900 bg-slate-50/70 print:bg-transparent print:text-black">
                            {row.total}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-slate-700 print:text-black">
                            {row.percentage}%
                          </td>
                          <td className="py-2 px-4 no-print">
                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex">
                              <div
                                className="bg-brand-600 h-full rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(row.percentage, 100)}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {/* Fila de Totales */}
                  <tfoot>
                    <tr className="bg-slate-100/80 font-bold text-slate-900 border-t-2 border-slate-300 print:bg-[#D9D9D9] print:text-black print:border-black">
                      <td className="py-2.5 px-4 uppercase">TOTAL GENERAL</td>
                      <td className="py-2.5 px-3 text-center text-pink-800 print:text-black">
                        {item.table.totalFemale}
                      </td>
                      <td className="py-2.5 px-3 text-center text-blue-800 print:text-black">
                        {item.table.totalMale}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600 print:text-black">
                        {item.table.totalOther}
                      </td>
                      <td className="py-2.5 px-3 text-center bg-slate-200 print:bg-slate-300 text-brand-900 print:text-black text-sm">
                        {item.table.grandTotal}
                      </td>
                      <td className="py-2.5 px-3 text-center text-sm">
                        {item.table.grandTotal > 0 ? "100.0%" : "0.0%"}
                      </td>
                      <td className="py-2.5 px-4 no-print"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          );
        })}
      </div>

      {/* 5. Bloque Oficial de Firma de Responsabilidad al Final (Visible en Impresión) */}
      <section className="mt-12 break-inside-avoid print:block">
        <table className="w-full border-collapse border border-black text-xs">
          <tbody>
            <tr>
              <td colSpan={2} className="border border-black bg-[#D9D9D9] font-bold px-3 py-1.5 text-center uppercase tracking-wide">
                FIRMA DE RESPONSABILIDAD
              </td>
            </tr>
            <tr>
              <td className="border border-black p-4 w-1/2 align-top">
                <p className="font-bold text-slate-900 mb-2 uppercase">ELABORADO POR:</p>
                <p className="mb-1">
                  <span className="font-bold">Nombre: </span>
                  <span>{currentUserName}</span>
                </p>
                <p className="mb-1">
                  <span className="font-bold">Cargo: </span>
                  <span>Profesional DECE / Consejería Estudiantil</span>
                </p>
                <p className="mb-1">
                  <span className="font-bold">Institución: </span>
                  <span>{data.institutionName}</span>
                </p>
                <p>
                  <span className="font-bold">Fecha de emisión: </span>
                  <span>{new Date().toLocaleDateString("es-EC")}</span>
                </p>
              </td>
              <td className="border border-black p-4 w-1/2 align-bottom text-center" style={{ height: "130px" }}>
                <div className="w-64 mx-auto border-t border-black pt-1.5 font-bold text-[11px]">
                  Firma y Sello del/la Profesional DECE
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
