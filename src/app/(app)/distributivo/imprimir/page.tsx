import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import {
  getActiveDistributivo,
  getDistributivoById,
  getInstitutionCoursesWithCounts,
} from "@/lib/distributivo";
import { compareCoursesDescending, compareCoursesAscending } from "@/lib/courseOrder";
import { getSelectedSchoolYear } from "@/lib/schoolYear";
import type { InstitutionRow, DeceDistributivoRow, DeceDistributivoAssignmentRow } from "@/lib/types";
import PrintButton from "@/components/PrintButton";
import DocumentHeader from "@/components/DocumentHeader";
import DocumentFooter from "@/components/DocumentFooter";

export default async function ImprimirDistributivoPage({
  searchParams,
}: {
  searchParams: { id?: string; order?: "ASC" | "DESC" };
}) {
  const session = await requireRole(["ADMIN", "DECE", "AUTORIDAD"]);
  const institutionId = requireInstitutionId(session);

  const institution = db
    .prepare("SELECT * FROM institutions WHERE id = ?")
    .get(institutionId) as InstitutionRow | undefined;

  if (!institution) notFound();

  let distributivoData: { distributivo: DeceDistributivoRow; assignments: DeceDistributivoAssignmentRow[] } | null = null;

  if (searchParams.id) {
    distributivoData = getDistributivoById(searchParams.id, institutionId);
  } else {
    const selectedYear = await getSelectedSchoolYear(institutionId);
    distributivoData = await getActiveDistributivo(institutionId, selectedYear?.id);
  }

  if (!distributivoData) {
    notFound();
  }

  const { distributivo, assignments } = distributivoData;

  // Obtener conteos detallados por curso para mostrar paralelos y alumnos reales por curso
  const coursesInfo = getInstitutionCoursesWithCounts(institutionId, distributivo.school_year_id);
  const courseMap = new Map(coursesInfo.courseSummaries.map((c) => [c.course, c]));

  // Paleta oficial por defecto si no tienen asignado color
  const defaultPalette = ["#FEF08A", "#BAE6FD", "#BBF7D0", "#FED7AA", "#E9D5FF"];

  // Iniciales y metadatos de los profesionales
  const analystMeta = assignments.map((a, idx) => {
    const parts = a.user_name.trim().split(/\s+/);
    let initials = "P" + (idx + 1);
    if (parts.length >= 2) {
      initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    } else if (parts.length === 1 && parts[0].length >= 2) {
      initials = parts[0].substring(0, 2).toUpperCase();
    }

    let parsedCourses: string[] = [];
    try {
      parsedCourses = JSON.parse(a.courses || "[]");
    } catch {
      parsedCourses = [];
    }

    const assignedColor = a.color || defaultPalette[idx % defaultPalette.length];

    // Si viene con 0 de la base de datos, recalcular dinámicamente con los cursos reales
    let studentCount = Number(a.estimated_students_count) || 0;
    if (studentCount === 0 && parsedCourses.length > 0) {
      for (const cName of parsedCourses) {
        const shiftMatch = cName.match(/\((Matutina|Vespertina|Nocturna)\)$/i);
        const cleanName = cName.replace(/\s*\((Matutina|Vespertina|Nocturna)\)$/i, "").trim().toLowerCase();
        const targetShift = (shiftMatch ? shiftMatch[1] : (a.jornada && a.jornada !== "TODAS" && a.jornada !== "COMPLETA" ? a.jornada : "")).toUpperCase().trim();

        if (targetShift) {
          const matchingRows = coursesInfo.detailedRows.filter(
            (r) => r.course.trim().toLowerCase() === cleanName && (r.jornada || "").toUpperCase().trim() === targetShift
          );
          if (matchingRows.length > 0) {
            studentCount += matchingRows.reduce((sum, r) => sum + (r.student_count || 0), 0);
            continue;
          }
        }

        const summary = courseMap.get(cName);
        if (summary) {
          studentCount += summary.totalStudents;
        } else {
          const matched = coursesInfo.courseSummaries.find(
            (s) => s.course.trim().toLowerCase() === cleanName
          );
          if (matched) {
            studentCount += matched.totalStudents;
          }
        }
      }
    }

    return {
      ...a,
      index: idx + 1,
      initials,
      parsedCourses,
      color: assignedColor,
      estimated_students_count: studentCount,
      lunchSchedule: a.lunch_schedule || (idx === 2 ? "12H00 A 13H00" : "13H00 A 14H00"),
    };
  });

  const totalStudents = analystMeta.reduce(
    (sum, a) => sum + (a.estimated_students_count || 0),
    0
  );
  const totalAnalysts = analystMeta.length;
  const averageStudents = totalAnalysts > 0 ? Math.round(totalStudents / totalAnalysts) : 0;

  // Orden visual solicitado (default DESC, o ASC)
  const visualOrder = searchParams.order === "ASC" ? "ASC" : "DESC";

  const sortedDetailedRows = [...coursesInfo.detailedRows].sort((a, b) => {
    const cmp = visualOrder === "DESC"
      ? compareCoursesDescending(a.course, b.course)
      : compareCoursesAscending(a.course, b.course);
    if (cmp !== 0) return cmp;
    return (a.parallel || "").localeCompare(b.parallel || "");
  });

  // Función para determinar el profesional asignado a cada fila con precisión por curso y jornada
  const getAssignedAnalyst = (courseName: string, jornada: string) => {
    const cleanCourse = courseName.replace(/\s*\((Matutina|Vespertina|Nocturna)\)$/i, "").trim().toLowerCase();
    const jNorm = (jornada || "").toUpperCase().trim();

    // 1. Prioridad: Coincidencia exacta de curso Y turno asignado
    for (const a of analystMeta) {
      for (const pc of a.parsedCourses) {
        const pcLower = pc.toLowerCase();
        const pcClean = pc.replace(/\s*\((Matutina|Vespertina|Nocturna)\)$/i, "").trim().toLowerCase();

        // Si el curso asignado al analista especifica turno entre paréntesis:
        if (pcLower.includes("(matutina)") && jNorm === "MATUTINA" && pcClean === cleanCourse) return a;
        if (pcLower.includes("(vespertina)") && jNorm === "VESPERTINA" && pcClean === cleanCourse) return a;
        if (pcLower.includes("(nocturna)") && jNorm === "NOCTURNA" && pcClean === cleanCourse) return a;

        // Si el curso asignado no tiene turno entre paréntesis pero coincide el nombre limpio:
        if (!pcLower.includes("(matutina)") && !pcLower.includes("(vespertina)") && !pcLower.includes("(nocturna)")) {
          if (pcClean === cleanCourse) {
            const aJornada = (a.jornada || "").toUpperCase();
            if (aJornada === jNorm || aJornada === "TODAS" || aJornada === "COMPLETA") {
              return a;
            }
          }
        }
      }
    }

    // 2. Si no hubo coincidencia por turno exacto, buscar si algún analista lo tiene asignado directamente
    for (const a of analystMeta) {
      for (const pc of a.parsedCourses) {
        const pcClean = pc.replace(/\s*\((Matutina|Vespertina|Nocturna)\)$/i, "").trim().toLowerCase();
        if (pcClean === cleanCourse) {
          return a;
        }
      }
    }

    // 3. Fallback: Profesional asignado a esa jornada
    return analystMeta.find((a) => (a.jornada || "").toUpperCase() === jNorm) || null;
  };

  const coordinatorName =
    distributivo.elaborated_by_name ||
    distributivo.coordinator_name ||
    session.user.name ||
    "Coordinador(a) DECE";

  const approvedByName =
    distributivo.approved_by_name || "MÁXIMA AUTORIDAD INSTITUCIONAL";

  return (
    <div className="max-w-5xl mx-auto bg-white my-4 print:my-0 p-4 sm:p-8 text-slate-800 text-xs">
      {/* Action bar on screen (hidden on print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 mb-6 bg-slate-100 rounded-lg border border-slate-200 print:hidden">
        <div className="flex items-center gap-2 text-xs">
          <Link
            href="/distributivo"
            className="font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1"
          >
            ← Volver al Distributivo
          </Link>
          <span className="text-slate-300">|</span>
          <span className="text-slate-600 font-medium">Formato Oficial A4 (Calca Fiel Cuarto Distributivo)</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Selector de orden visual */}
          <div className="inline-flex rounded-md bg-white p-0.5 border border-slate-300 text-xs font-semibold">
            <Link
              href={`/distributivo/imprimir?${distributivo.id ? `id=${distributivo.id}&` : ""}order=DESC`}
              className={`px-2.5 py-1 rounded transition ${
                visualOrder === "DESC"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🔽 Descendente
            </Link>
            <Link
              href={`/distributivo/imprimir?${distributivo.id ? `id=${distributivo.id}&` : ""}order=ASC`}
              className={`px-2.5 py-1 rounded transition ${
                visualOrder === "ASC"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🔼 Ascendente
            </Link>
          </div>

          <PrintButton />
        </div>
      </div>

      {/* Official Header */}
      <DocumentHeader
        title="MATRIZ OFICIAL DE DISTRIBUTIVO DE COBERTURA DE ATENCIÓN PSICOSOCIAL"
        subtitle="DEPARTAMENTO DE CONSEJERÍA ESTUDIANTIL (DECE)"
        institutionName={institution.name}
        sealImage={institution.seal_image}
        schoolYear={distributivo.school_year_text || "2025 - 2026"}
      />

      {/* Institutional Metadata Grid */}
      <div className="border border-slate-300 rounded p-3 mb-4 bg-slate-50/50 text-[11px] leading-tight">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <span className="text-slate-500 font-medium block">Institución Educativa:</span>
            <span className="font-bold text-slate-800">{institution.name}</span>
          </div>
          <div>
            <span className="text-slate-500 font-medium block">Código AMIE:</span>
            <span className="font-bold text-slate-800">{institution.amie_code || "18H00313"}</span>
          </div>
          <div>
            <span className="text-slate-500 font-medium block">Zona / Distrito:</span>
            <span className="font-bold text-slate-800">{institution.zona || "ZONA 3"} / {institution.district || "DISTRITO"}</span>
          </div>
          <div>
            <span className="text-slate-500 font-medium block">Período Lectivo:</span>
            <span className="font-bold text-slate-800">{distributivo.school_year_text || "Vigente"}</span>
          </div>
        </div>
      </div>

      {/* Base Legal */}
      <div className="mb-4 text-[10.5px] text-justify leading-relaxed text-slate-600 border-l-2 border-slate-400 pl-3">
        <strong>Base Normativa y Técnica:</strong> Conforme al Artículo 58 de la Ley Orgánica de Educación Intercultural (LOEI), su Reglamento General de Aplicación, el Modelo de Funcionamiento de los Departamentos de Consejería Estudiantil y el Acuerdo Ministerial Nro. <strong>MINEDUC-MINEDUC-2023-00008-A</strong>, la presente matriz define la asignación equitativa de cobertura de atención psicosocial institucional. El estándar técnico ministerial establece como parámetro referencial una cobertura de <strong>~450 estudiantes por profesional DECE</strong>, asegurando el principio de interés superior de niñas, niños y adolescentes y el seguimiento continuo de casos de vulneración de derechos y riesgo psicosocial.
      </div>

      {/* ======================================================================= */}
      {/* 1. MATRIZ RESUMEN CONSOLIDADA INSTITUCIONAL (LIMPIA, SIN AMONTONAR)     */}
      {/* ======================================================================= */}
      <div className="mb-6">
        <div className="font-bold uppercase text-[11px] text-slate-800 mb-1.5 flex items-center justify-between border-b border-slate-300 pb-1">
          <span>1. Resumen Ejecutivo de Carga y Cumplimiento Normativo</span>
          <span className="text-[9.5px] text-slate-500 font-normal">Estándar MINEDUC: ~450 estudiantes / profesional</span>
        </div>

        <table className="w-full border-collapse border border-slate-400 text-[10px]">
          <thead>
            <tr className="bg-slate-200 text-slate-800 font-bold uppercase text-[9.5px]">
              <th className="border border-slate-400 p-1.5 text-center w-7">N°</th>
              <th className="border border-slate-400 p-1.5 text-center w-9">Cod.</th>
              <th className="border border-slate-400 p-1.5 text-left">Profesional DECE</th>
              <th className="border border-slate-400 p-1.5 text-left">Rol / Función</th>
              <th className="border border-slate-400 p-1.5 text-center w-24">Jornada</th>
              <th className="border border-slate-400 p-1.5 text-center w-20">N.° Cursos</th>
              <th className="border border-slate-400 p-1.5 text-center w-20">Estudiantes</th>
              <th className="border border-slate-400 p-1.5 text-center w-16">% Cobertura</th>
              <th className="border border-slate-400 p-1.5 text-center w-28">Cumplimiento Ratio (~450)</th>
            </tr>
          </thead>
          <tbody>
            {analystMeta.map((a) => {
              const isOverloaded = a.estimated_students_count > 500;
              const isOptimal =
                a.estimated_students_count >= 350 &&
                a.estimated_students_count <= 500;
              const percentage =
                totalStudents > 0
                  ? Math.round((a.estimated_students_count / totalStudents) * 100)
                  : 0;

              return (
                <tr key={a.id || a.index} className="hover:bg-slate-50">
                  <td className="border border-slate-300 p-1.5 text-center font-bold text-slate-700">{a.index}</td>
                  <td
                    className="border border-slate-300 p-1.5 text-center font-black text-slate-900"
                    style={{ backgroundColor: a.color }}
                  >
                    {a.initials}
                  </td>
                  <td className="border border-slate-300 p-1.5 font-bold text-slate-900">
                    {a.user_name}
                  </td>
                  <td className="border border-slate-300 p-1.5 text-slate-700">
                    {a.user_role_label || "Analista DECE"}
                  </td>
                  <td className="border border-slate-300 p-1.5 text-center font-medium text-slate-800">
                    {a.jornada || "Todas"}
                  </td>
                  <td className="border border-slate-300 p-1.5 text-center font-bold text-slate-800">
                    {a.parsedCourses.length} cursos
                  </td>
                  <td className="border border-slate-300 p-1.5 text-center font-black text-slate-900 text-[11px]">
                    {a.estimated_students_count}
                  </td>
                  <td className="border border-slate-300 p-1.5 text-center font-semibold text-slate-700">
                    {percentage}%
                  </td>
                  <td className="border border-slate-300 p-1.5 text-center text-[9px] font-semibold">
                    {isOverloaded ? (
                      <span className="text-red-700 font-bold">⚠️ Sobrecarga (&gt;450)</span>
                    ) : isOptimal ? (
                      <span className="text-emerald-700 font-bold">✓ Conforme a norma</span>
                    ) : (
                      <span className="text-sky-700 font-medium">Carga moderada</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-bold text-[10.5px]">
              <td colSpan={5} className="border border-slate-400 p-2 text-right uppercase">
                Totales Consolidados Institucionales:
              </td>
              <td className="border border-slate-400 p-2 text-center text-slate-900">
                {analystMeta.reduce((sum, a) => sum + a.parsedCourses.length, 0)} cursos
              </td>
              <td className="border border-slate-400 p-2 text-center text-[12px] font-black text-slate-900">
                {totalStudents}
              </td>
              <td className="border border-slate-400 p-2 text-center">100%</td>
              <td className="border border-slate-400 p-2 text-center text-[9.5px] font-bold text-slate-700">
                Promedio: {averageStudents} est/prof
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ======================================================================= */}
      {/* 2. MATRIZ INSTITUCIONAL DE DISTRIBUTIVO (CALCA FIEL PDF PÁGINAS 2 Y 3)   */}
      {/* ======================================================================= */}
      <div className="mb-6 break-inside-avoid page-break-inside-avoid">
        <div className="font-bold uppercase text-[11px] text-slate-800 mb-1.5 flex items-center justify-between border-b border-slate-300 pb-1">
          <span>
            2. Matriz General de Cursos, Paralelos y Tutores por Profesional (Coloreada)
          </span>
          <span className="text-[9.5px] text-slate-500 font-normal">
            Orden {visualOrder === "DESC" ? "Descendente (3.° Bach ➔ Inicial)" : "Ascendente (Inicial ➔ 3.° Bach)"}
          </span>
        </div>

        <table className="w-full border-collapse border border-slate-400 text-[10px]">
          <thead>
            <tr className="bg-slate-200 text-slate-800 font-bold uppercase text-[9px]">
              <th className="border border-slate-400 p-1 text-center w-7">#</th>
              <th className="border border-slate-400 p-1 text-left">Curso / Grado / Especialidad</th>
              <th className="border border-slate-400 p-1 text-center w-8">Par.</th>
              <th className="border border-slate-400 p-1 text-center w-16">Jornada</th>
              <th className="border border-slate-400 p-1 text-left">Docente Tutor / Tutora</th>
              <th className="border border-slate-400 p-1 text-center w-12">N.° Est.</th>
              {/* Columnas específicas por profesional con sus iniciales */}
              {analystMeta.map((a) => (
                <th
                  key={a.id || a.initials}
                  className="border border-slate-400 p-1 text-center w-12 font-black text-slate-900"
                  style={{ backgroundColor: a.color }}
                  title={`${a.user_name} (${a.user_role_label})`}
                >
                  {a.initials}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedDetailedRows.map((r, idx) => {
              const assigned = getAssignedAnalyst(r.course, r.jornada);
              const rowBg = assigned ? `${assigned.color}40` : "transparent";

              return (
                <tr
                  key={`${r.course}_${r.parallel}_${r.jornada}_${idx}`}
                  style={{ backgroundColor: rowBg }}
                  className="hover:bg-slate-100/60"
                >
                  <td className="border border-slate-300 p-1 text-center text-slate-600 font-mono text-[9px]">
                    {idx + 1}
                  </td>
                  <td className="border border-slate-300 p-1 font-semibold text-slate-900">
                    {r.course}
                  </td>
                  <td className="border border-slate-300 p-1 text-center font-bold text-slate-800">
                    {r.parallel || "A"}
                  </td>
                  <td className="border border-slate-300 p-1 text-center text-slate-700 text-[9px]">
                    {r.jornada}
                  </td>
                  <td className="border border-slate-300 p-1 text-slate-800">
                    {r.tutor_name ? (
                      <span className="font-medium">{r.tutor_name}</span>
                    ) : (
                      <span className="text-slate-400 italic text-[9px]">Sin asignar</span>
                    )}
                  </td>
                  <td className="border border-slate-300 p-1 text-center font-black text-slate-900">
                    {r.student_count}
                  </td>
                  {/* Celdas individuales por profesional */}
                  {analystMeta.map((a) => {
                    const isForThisAnalyst = assigned?.user_id === a.user_id || assigned?.id === a.id;
                    return (
                      <td
                        key={a.id || a.initials}
                        className="border border-slate-300 p-1 text-center font-bold text-slate-900"
                        style={{
                          backgroundColor: isForThisAnalyst ? a.color : undefined,
                        }}
                      >
                        {isForThisAnalyst ? r.student_count : ""}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-200 border-t-2 border-slate-400 font-bold text-[10px]">
              <td colSpan={5} className="border border-slate-400 p-1.5 text-right uppercase">
                Totales de Estudiantes por Profesional:
              </td>
              <td className="border border-slate-400 p-1.5 text-center font-black text-[11px] text-slate-900">
                {totalStudents}
              </td>
              {analystMeta.map((a) => (
                <td
                  key={a.id || a.initials}
                  className="border border-slate-400 p-1.5 text-center font-black text-[11px] text-slate-900"
                  style={{ backgroundColor: a.color }}
                >
                  {a.estimated_students_count}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ======================================================================= */}
      {/* 3. HORARIO DE ALMUERZO INSTITUCIONAL (CALCA FIEL PDF PÁGINA 4)           */}
      {/* ======================================================================= */}
      <div className="mb-6 break-inside-avoid page-break-inside-avoid">
        <div className="font-bold uppercase text-[11px] text-slate-800 mb-1.5 flex items-center justify-between border-b border-slate-300 pb-1">
          <span>3. Horario de Almuerzo de los Profesionales DECE</span>
          <span className="text-[9.5px] text-slate-500 font-normal">Jornada Laboral Oficial (Lunes a Viernes)</span>
        </div>

        <table className="w-full border-collapse border border-slate-400 text-[10px]">
          <thead>
            <tr className="bg-slate-200 text-slate-800 font-bold uppercase text-[9.5px]">
              <th className="border border-slate-400 p-1.5 text-center w-7">N°</th>
              <th className="border border-slate-400 p-1.5 text-center w-10">Cod.</th>
              <th className="border border-slate-400 p-1.5 text-left">Profesional DECE</th>
              <th className="border border-slate-400 p-1.5 text-left">Cargo / Función Institucional</th>
              <th className="border border-slate-400 p-1.5 text-center w-48 font-black">
                Horario de Almuerzo (Lunes a Viernes)
              </th>
            </tr>
          </thead>
          <tbody>
            {analystMeta.map((a) => (
              <tr key={a.id || a.index} className="hover:bg-slate-50">
                <td className="border border-slate-300 p-2 text-center font-bold text-slate-700">{a.index}</td>
                <td
                  className="border border-slate-300 p-2 text-center font-black text-slate-900"
                  style={{ backgroundColor: a.color }}
                >
                  {a.initials}
                </td>
                <td className="border border-slate-300 p-2 font-bold text-slate-900 text-[10.5px]">
                  {a.user_name}
                </td>
                <td className="border border-slate-300 p-2 text-slate-700">
                  {a.user_role_label || "Analista DECE"}
                </td>
                <td className="border border-slate-300 p-2 text-center font-black text-slate-900 bg-slate-50 text-[11px]">
                  {a.lunchSchedule}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ======================================================================= */}
      {/* 4. DÍAS DE ASISTENCIA A INSTITUCIONES ENLAZADAS (CALCA FIEL PDF PÁG. 5)  */}
      {/* ======================================================================= */}
      <div className="mb-6 break-inside-avoid page-break-inside-avoid">
        <div className="font-bold uppercase text-[11px] text-slate-800 mb-1.5 flex items-center justify-between border-b border-slate-300 pb-1">
          <span>4. Días de Asistencia y Cobertura a Instituciones Educativas Enlazadas</span>
          <span className="text-[9.5px] text-slate-500 font-normal">Planificación y Cobertura Territorial</span>
        </div>

        <table className="w-full border-collapse border border-slate-400 text-[10px]">
          <thead>
            <tr className="bg-slate-200 text-slate-800 font-bold uppercase text-[9.5px]">
              <th className="border border-slate-400 p-1.5 text-center w-7">N°</th>
              <th className="border border-slate-400 p-1.5 text-left">Profesional DECE</th>
              <th className="border border-slate-400 p-1.5 text-left">Sede / Institución de Cobertura</th>
              <th className="border border-slate-400 p-1.5 text-center w-56 font-black">
                Días y Frecuencia de Asistencia
              </th>
            </tr>
          </thead>
          <tbody>
            {analystMeta.map((a) => {
              const hasEnlazada = a.has_enlazada === 1 || Boolean(a.enlazada_name);

              return (
                <tr key={a.id || a.index} className="hover:bg-slate-50">
                  <td className="border border-slate-300 p-2 text-center font-bold text-slate-700">{a.index}</td>
                  <td className="border border-slate-300 p-2 font-bold text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-3.5 h-3.5 rounded-full inline-block border border-slate-400"
                        style={{ backgroundColor: a.color }}
                      />
                      <span>{a.user_name}</span>
                    </div>
                  </td>
                  <td className="border border-slate-300 p-2">
                    {hasEnlazada ? (
                      <span className="font-bold text-indigo-950">
                        {a.enlazada_name || "Institución Educativa Enlazada"}
                      </span>
                    ) : (
                      <span className="font-semibold text-emerald-800">
                        Sede Matriz (100% Cobertura Continua)
                      </span>
                    )}
                  </td>
                  <td className="border border-slate-300 p-2 text-center">
                    {hasEnlazada ? (
                      <span className="font-black text-slate-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {a.enlazada_dias || "Martes 1 vez a la semana"}
                      </span>
                    ) : (
                      <span className="font-medium text-slate-600">
                        Lunes a Viernes en Sede Matriz
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ======================================================================= */}
      {/* 5. ORGANIZACIÓN DE HORARIOS DE ATENCIÓN POR BLOQUES (LUNES A VIERNES)    */}
      {/* ======================================================================= */}
      <div className="mb-6 break-inside-avoid page-break-inside-avoid">
        <div className="font-bold uppercase text-[11px] text-slate-800 mb-1.5 flex items-center justify-between border-b border-slate-300 pb-1">
          <span>5. Estructura de Horarios de Atención por Bloques (Lunes a Viernes)</span>
          <span className="text-[9.5px] text-slate-500 font-normal">Gestión Operativa Institucional DECE</span>
        </div>

        <table className="w-full border-collapse border border-slate-400 text-[10px]">
          <thead>
            <tr className="bg-slate-200 text-slate-800 font-bold uppercase text-[9.5px]">
              <th className="border border-slate-400 p-1.5 text-center w-28">Bloque / Franja</th>
              <th className="border border-slate-400 p-1.5 text-center w-36">Horario</th>
              <th className="border border-slate-400 p-1.5 text-left">Actividades y Cobertura Operativa</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-300 p-2 text-center font-bold text-slate-800 bg-amber-50/50">
                Bloque 1
              </td>
              <td className="border border-slate-300 p-2 text-center font-black text-slate-900">
                07H00 A 13H00
              </td>
              <td className="border border-slate-300 p-2 text-slate-700">
                Atención presencial a estudiantes, docentes, directivos y padres de familia; abordaje inicial de casos, detección, intervención y activación de rutas de protección.
              </td>
            </tr>
            <tr className="bg-slate-100/60 font-semibold">
              <td className="border border-slate-300 p-2 text-center font-bold text-slate-800">
                Almuerzo Rotativo
              </td>
              <td className="border border-slate-300 p-2 text-center font-black text-indigo-900">
                12H00 - 13H00 / 13H00 - 14H00
              </td>
              <td className="border border-slate-300 p-2 text-slate-700">
                Horario escalonado de almuerzo por profesional conforme a la tabla del numeral 3, garantizando la permanencia continua de atención en el departamento.
              </td>
            </tr>
            <tr>
              <td className="border border-slate-300 p-2 text-center font-bold text-slate-800 bg-sky-50/50">
                Bloque 2
              </td>
              <td className="border border-slate-300 p-2 text-center font-black text-slate-900">
                13H00 A 15H30
              </td>
              <td className="border border-slate-300 p-2 text-slate-700">
                Elaboración de planes de acompañamiento, informes de restitución de derechos, seguimiento de medidas de protección, coordinación UDAFE / Distrito y articulación interinstitucional.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ======================================================================= */}
      {/* 6. DESGLOSE INDIVIDUAL DE CURSOS Y PARALELOS POR PROFESIONAL            */}
      {/* ======================================================================= */}
      <div className="mb-6 space-y-4">
        <div className="font-bold uppercase text-[11px] text-slate-800 border-b border-slate-300 pb-1 flex items-center justify-between">
          <span>6. Desglose Detallado de Cursos y Paralelos Asignados por Profesional</span>
          <span className="text-[9.5px] text-slate-500 font-normal">Distribución clara y específica por analista</span>
        </div>

        {analystMeta.map((assignment, index) => {
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

          // Enriquecer cada curso con su numérico y paralelos
          const richCourses = parsedCourses.map((cName) => {
            const shiftMatch = cName.match(/\((Matutina|Vespertina|Nocturna)\)$/i);
            const cleanName = cName.replace(/\s*\((Matutina|Vespertina|Nocturna)\)$/i, "").trim();
            const cleanLower = cleanName.toLowerCase();
            const targetShift = (shiftMatch ? shiftMatch[1] : (assignment.jornada && assignment.jornada !== "TODAS" && assignment.jornada !== "COMPLETA" ? assignment.jornada : "")).toUpperCase().trim();

            let matchedStudents = 0;
            let matchedParallels = "";
            let matchedShift = shiftMatch ? shiftMatch[1] : (assignment.jornada || "Matutina");

            if (targetShift) {
              const matchingRows = coursesInfo.detailedRows.filter(
                (r) => r.course.trim().toLowerCase() === cleanLower && (r.jornada || "").toUpperCase().trim() === targetShift
              );
              if (matchingRows.length > 0) {
                matchedStudents = matchingRows.reduce((sum, r) => sum + (r.student_count || 0), 0);
                matchedParallels = Array.from(new Set(matchingRows.map((r) => r.parallel))).join(", ");
                matchedShift = targetShift;
              }
            }

            if (matchedStudents === 0) {
              const summary = courseMap.get(cName) || coursesInfo.courseSummaries.find((s) => s.course.trim().toLowerCase() === cleanLower);
              if (summary) {
                matchedStudents = summary.totalStudents;
                if (!matchedParallels && summary.parallels?.length) {
                  matchedParallels = summary.parallels.join(", ");
                }
                if (summary.jornadas?.length) {
                  matchedShift = summary.jornadas.join(", ");
                }
              }
            }

            const studentCount = matchedStudents > 0
              ? matchedStudents
              : (parsedCourses.length > 0 ? Math.round(assignment.estimated_students_count / parsedCourses.length) : 0);

            return {
              fullName: cName,
              cleanName,
              shift: matchedShift,
              parallels: matchedParallels || "A",
              studentCount,
            };
          });

          const totalCoursesStudents = richCourses.reduce((sum, c) => sum + c.studentCount, 0);
          const displayStudentCount = assignment.estimated_students_count > 0 ? assignment.estimated_students_count : totalCoursesStudents;

          return (
            <div
              key={assignment.id || index}
              className="border border-slate-300 rounded overflow-hidden break-inside-avoid page-break-inside-avoid shadow-sm"
              style={{ borderLeftWidth: "5px", borderLeftColor: assignment.color || "#3b82f6" }}
            >
              {/* Tarjeta cabecera del profesional con su distintivo de color */}
              <div
                className="p-2.5 border-b border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                style={{ backgroundColor: assignment.color ? `${assignment.color}35` : "#f1f5f9" }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-6 h-6 rounded flex items-center justify-center font-black text-slate-900 text-[10px] border border-slate-400 shrink-0 shadow-xs"
                    style={{ backgroundColor: assignment.color }}
                  >
                    {assignment.initials}
                  </span>
                  <div>
                    <span className="font-black text-slate-900 text-[11px] uppercase">
                      Profesional {assignment.index}: {assignment.user_name}
                    </span>
                    <span className="text-slate-600 font-medium text-[10px] ml-2">
                      ({assignment.user_role_label || "Analista DECE"})
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 text-[10px]">
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-semibold text-slate-700">
                    Jornada: <strong>{assignment.jornada || "Todas"}</strong>
                  </span>
                  <span
                    className="px-2.5 py-0.5 rounded border font-bold text-slate-900 shadow-xs"
                    style={{
                      backgroundColor: assignment.color || "#e0e7ff",
                      borderColor: "#94a3b8",
                    }}
                  >
                    Cobertura: <strong>{displayStudentCount}</strong> estudiantes ({richCourses.length} cursos)
                  </span>
                </div>
              </div>

              {/* Tabla de cursos del profesional */}
              {richCourses.length === 0 ? (
                <div className="p-3 text-center text-slate-400 italic text-[10px]">
                  Sin cursos específicos asignados.
                </div>
              ) : (
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-[9px] uppercase">
                      <th className="py-1 px-2.5 text-center w-6 border-r border-slate-200">#</th>
                      <th className="py-1 px-3 text-left border-r border-slate-200">Curso / Grado / Especialidad</th>
                      <th className="py-1 px-2.5 text-center w-24 border-r border-slate-200">Jornada</th>
                      <th className="py-1 px-3 text-center w-24 border-r border-slate-200">Paralelo(s)</th>
                      <th className="py-1 px-3 text-center w-20">N.° Alumnos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {richCourses.map((c, cIdx) => (
                      <tr key={c.fullName} className={cIdx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}>
                        <td className="py-1 px-2.5 text-center font-mono text-slate-400 border-r border-slate-200">
                          {cIdx + 1}
                        </td>
                        <td className="py-1 px-3 font-semibold text-slate-900 border-r border-slate-200">
                          {c.cleanName}
                        </td>
                        <td className="py-1 px-2.5 text-center text-slate-700 border-r border-slate-200 font-medium">
                          {c.shift}
                        </td>
                        <td className="py-1 px-3 text-center text-slate-800 font-bold border-r border-slate-200">
                          Paralelo {c.parallels}
                        </td>
                        <td className="py-1 px-3 text-center font-black text-slate-900">
                          {c.studentCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr
                      className="border-t border-slate-300 font-bold text-[9.5px]"
                      style={{ backgroundColor: assignment.color ? `${assignment.color}25` : "#f8fafc" }}
                    >
                      <td colSpan={4} className="py-1 px-3 text-right uppercase text-slate-700">
                        Subtotal a cargo de {assignment.user_name.split(" ")[0]}:
                      </td>
                      <td className="py-1 px-3 text-center font-black text-slate-900">
                        {displayStudentCount} est.
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}

              {/* Subniveles y responsabilidades si existen */}
              {(parsedSubniveles.length > 0 || assignment.specific_responsibilities) && (
                <div className="p-2 bg-slate-50 border-t border-slate-200 text-[9.5px] text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  {parsedSubniveles.length > 0 && (
                    <div>
                      <strong className="text-slate-700">Subniveles atendidos:</strong> {parsedSubniveles.join(", ")}
                    </div>
                  )}
                  {assignment.specific_responsibilities && (
                    <div>
                      <strong className="text-slate-700">Responsabilidades especiales:</strong> {assignment.specific_responsibilities}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ======================================================================= */}
      {/* 7. INDICADORES TÉCNICOS Y OBSERVACIONES                                 */}
      {/* ======================================================================= */}
      <div className={`grid ${distributivo.general_observations && !distributivo.general_observations.toLowerCase().includes("pedagóg") && !distributivo.general_observations.includes("continuidad") ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"} gap-3 mb-6 break-inside-avoid page-break-inside-avoid`}>
        <div className="border border-slate-300 p-2.5 rounded bg-slate-50/50">
          <div className="font-bold uppercase text-[10px] text-slate-700 mb-1 border-b border-slate-200 pb-1">
            Indicadores Técnicos de Cumplimiento DECE
          </div>
          <ul className="space-y-1 text-[10px] text-slate-600">
            <li className="flex justify-between">
              <span>Población Estudiantil Total Coberturada:</span>
              <strong className="text-slate-800">{totalStudents} estudiantes</strong>
            </li>
            <li className="flex justify-between">
              <span>Talento Humano DECE disponible:</span>
              <strong className="text-slate-800">{totalAnalysts} profesionales</strong>
            </li>
            <li className="flex justify-between">
              <span>Ratio Promedio Institucional:</span>
              <strong className="text-slate-800">{averageStudents} estudiantes / profesional</strong>
            </li>
            <li className="flex justify-between">
              <span>Parámetro de Referencia MINEDUC:</span>
              <strong className="text-slate-800">450 estudiantes / profesional</strong>
            </li>
            {totalAnalysts === 1 && totalStudents > 450 && (
              <li className="p-1.5 bg-amber-50 text-amber-900 border border-amber-200 rounded font-medium text-[9.5px] mt-1 leading-tight">
                <strong>Nota Técnica para el Distrito:</strong> Cobertura unipersonal integral. El profesional asume el 100% de la matrícula ({totalStudents} alumnos), superando el ratio estándar de 450 debido al contingente de talento humano disponible en el plantel. Se remite para fines de legalización y solicitud de personal de apoyo ante el Distrito Educativo.
              </li>
            )}
          </ul>
        </div>

        {distributivo.general_observations && !distributivo.general_observations.toLowerCase().includes("pedagóg") && !distributivo.general_observations.includes("continuidad") && (
          <div className="border border-slate-300 p-2.5 rounded bg-slate-50/50">
            <div className="font-bold uppercase text-[10px] text-slate-700 mb-1 border-b border-slate-200 pb-1">
              Observaciones Técnicas Institucionales
            </div>
            <p className="text-[10px] text-slate-600 leading-relaxed">
              {distributivo.general_observations}
            </p>
          </div>
        )}
      </div>

      {/* ======================================================================= */}
      {/* 8. FIRMAS DE LEGALIZACIÓN INSTITUCIONAL                                 */}
      {/* ======================================================================= */}
      <div className="mt-10 pt-4 border-t border-slate-300 break-inside-avoid page-break-inside-avoid">
        <div className="grid grid-cols-2 gap-12 text-center">
          <div>
            <div className="h-16 flex items-end justify-center">
              <div className="border-b border-slate-500 w-60"></div>
            </div>
            <div className="font-bold text-[11px] text-slate-900 uppercase mt-1">
              {coordinatorName}
            </div>
            <div className="text-[10px] text-slate-600 font-semibold uppercase">
              {distributivo.elaborated_by_role || "Coordinador(a) DECE Institucional"}
            </div>
            <div className="text-[9px] text-slate-500">
              Departamento de Consejería Estudiantil
            </div>
          </div>

          <div>
            <div className="h-16 flex items-end justify-center">
              <div className="border-b border-slate-500 w-60"></div>
            </div>
            <div className="font-bold text-[11px] text-slate-900 uppercase mt-1">
              {approvedByName}
            </div>
            <div className="text-[10px] text-slate-600 font-semibold uppercase">
              {distributivo.approved_by_role || "Rector(a) / Máxima Autoridad"}
            </div>
            <div className="text-[9px] text-slate-500">
              {institution.name}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
