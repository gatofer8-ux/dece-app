import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader, Badge, EmptyState } from "@/components/ui";
import type { StudentRow } from "@/lib/types";
import { getUserCoverage, buildCoverageSqlFilter } from "@/lib/distributivo";
import { formatDocumentId } from "@/lib/documentId";
import { JORNADA_OPTIONS } from "@/lib/student";

export default async function EstudiantesPage({
  searchParams,
}: {
  searchParams: { estado?: string; q?: string; course?: string; parallel?: string; specialty?: string; jornada?: string };
}) {
  const session = await requireRole(["ADMIN", "DECE", "AUTORIDAD", "DOCENTE"]);
  const institutionId = requireInstitutionId(session);
  const coverage = await getUserCoverage(session.user.id, institutionId, session.user.role);

  let coursesRaw = db.prepare("SELECT DISTINCT course FROM students WHERE institution_id = ? AND course IS NOT NULL ORDER BY course ASC").all(institutionId) as { course: string }[];
  let parallelsRaw = db.prepare("SELECT DISTINCT parallel FROM students WHERE institution_id = ? AND parallel IS NOT NULL ORDER BY parallel ASC").all(institutionId) as { parallel: string }[];
  const specialtiesRaw = db.prepare("SELECT DISTINCT bachillerato_specialty FROM students WHERE institution_id = ? AND bachillerato_specialty IS NOT NULL ORDER BY bachillerato_specialty ASC").all(institutionId) as { bachillerato_specialty: string }[];
  const jornadasRaw = db.prepare("SELECT DISTINCT UPPER(TRIM(jornada)) as jornada FROM students WHERE institution_id = ? AND jornada IS NOT NULL AND TRIM(jornada) != '' ORDER BY jornada ASC").all(institutionId) as { jornada: string }[];

  if (!coverage.isAllInstitutional) {
    if (coverage.courses.length > 0) {
      const cleanCoverageCourses = coverage.courses.map((c) =>
        c.replace(/\s*\((Matutina|Vespertina|Nocturna)\)$/i, "").trim()
      );
      coursesRaw = coursesRaw.filter(
        (r) => cleanCoverageCourses.includes(r.course) || coverage.courses.includes(r.course)
      );
    }
    if (coverage.parallels.length > 0) {
      const allowedParallels = new Set<string>();
      for (const p of coverage.parallels) {
        if (p.includes("::")) {
          const parts = p.split("::");
          if (parts[1]) allowedParallels.add(parts[1].toUpperCase());
        } else {
          allowedParallels.add(p.toUpperCase());
        }
      }
      if (allowedParallels.size > 0) {
        parallelsRaw = parallelsRaw.filter((r) => allowedParallels.has((r.parallel || "").toUpperCase()));
      }
    }
  }

  const courses = coursesRaw.map(r => r.course);
  const parallels = parallelsRaw.map(r => r.parallel);
  const specialties = specialtiesRaw.map(r => r.bachillerato_specialty);
  const dbJornadas = jornadasRaw.map(r => r.jornada).filter(Boolean);
  const jornadas = Array.from(new Set([...JORNADA_OPTIONS, ...dbJornadas]));

  const { estado = "activos", q, course, parallel, specialty, jornada } = searchParams;

  let where = "WHERE institution_id = ?";
  const params: any[] = [institutionId];

  if (!coverage.isAllInstitutional) {
    const coverageFilter = buildCoverageSqlFilter(coverage);
    if (coverageFilter.sql !== "1=1" && coverageFilter.sql !== "1=0") {
      where += ` AND ${coverageFilter.sql}`;
      params.push(...coverageFilter.params);
    } else if (coverageFilter.sql === "1=0") {
      // El analista no tiene cursos ni paralelos asignados en el distributivo.
      // En vez de dejar la lista vacía sin explicación, se muestran los
      // estudiantes que él mismo registró (mismo criterio que en /casos).
      where += " AND (created_by_id = ? OR created_by_id IS NULL)";
      params.push(session.user.id);
    }
  }
  if (estado === "activos") where += " AND active = 1";
  if (estado === "inactivos") where += " AND active = 0";
  if (course) {
    where += " AND course = ?";
    params.push(course);
  }
  if (parallel) {
    where += " AND parallel = ?";
    params.push(parallel);
  }
  if (jornada) {
    if (jornada === "SIN_JORNADA") {
      where += " AND (jornada IS NULL OR TRIM(jornada) = '')";
    } else {
      where += " AND UPPER(TRIM(jornada)) = UPPER(TRIM(?))";
      params.push(jornada);
    }
  }
  if (specialty) {
    where += " AND bachillerato_specialty = ?";
    params.push(specialty);
  }
  if (q) {
    where += " AND (full_name LIKE ? OR document_id LIKE ? OR course LIKE ?)";
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  const students = db
    .prepare(`SELECT * FROM students ${where} ORDER BY full_name ASC LIMIT 300`)
    .all(...params) as StudentRow[];

  const caseCounts = db
    .prepare(
      `SELECT student_id, COUNT(*) as n FROM case_files WHERE status != 'CERRADO' AND institution_id = ? GROUP BY student_id`
    )
    .all(institutionId) as { student_id: string; n: number }[];
  const caseCountMap = new Map(caseCounts.map((c) => [c.student_id, c.n]));

  return (
    <div>
      <PageHeader
        title="Estudiantes"
        description="Registro base de estudiantes de la institución."
        action={
          <>
            <Link href="/estudiantes/importar" className="btn-secondary">
              📥 Importar estudiantes
            </Link>
            <Link href="/estudiantes/nuevo" className="btn-primary">
              + Nuevo estudiante
            </Link>
          </>
        }
      />

      {!coverage.isAllInstitutional && (
        <div className="mb-4 p-3 bg-indigo-50/80 border border-indigo-200 rounded-lg text-xs text-indigo-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-indigo-700">📌 Cobertura Asignada DECE:</span>
            <span>
              {coverage.courses.length > 0
                ? `Mostrando cursos a tu cargo: ${coverage.courses.join(", ")}`
                : "Sin cursos asignados en el distributivo actual."}
            </span>
          </div>
          <Link href="/distributivo" className="text-indigo-700 hover:underline font-semibold shrink-0">
            Ver Distributivo →
          </Link>
        </div>
      )}

      <form className="card p-4 mb-4 flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center" method="get">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre, documento o curso..."
          className="input sm:max-w-xs flex-1"
        />
        <select name="estado" defaultValue={estado} className="select sm:max-w-[120px]">
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
          <option value="todos">Todos</option>
        </select>
        <select name="course" defaultValue={course} className="select sm:max-w-[160px]">
          <option value="">Años / Cursos</option>
          {courses.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select name="parallel" defaultValue={parallel} className="select sm:max-w-[100px]">
          <option value="">Paralelo</option>
          {parallels.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select name="jornada" defaultValue={jornada} className="select sm:max-w-[150px]">
          <option value="">Jornadas</option>
          {jornadas.map(j => (
            <option key={j} value={j}>
              {j.charAt(0).toUpperCase() + j.slice(1).toLowerCase()}
            </option>
          ))}
          <option value="SIN_JORNADA">Sin jornada</option>
        </select>
        <select name="specialty" defaultValue={specialty} className="select sm:max-w-[160px]">
          <option value="">Especialidad</option>
          {specialties.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button type="submit" className="btn-secondary">
          Filtrar
        </button>
        {(q || course || parallel || jornada || specialty || (estado && estado !== "activos")) && (
          <Link href="/estudiantes" className="btn-ghost text-xs self-center text-slate-500 hover:text-slate-700">
            Limpiar filtros
          </Link>
        )}
      </form>

      {students.length === 0 ? (
        <EmptyState
          title="No se encontraron estudiantes"
          description="Registra el primer estudiante para comenzar a usar el sistema."
          action={
            <Link href="/estudiantes/nuevo" className="btn-primary">
              + Nuevo estudiante
            </Link>
          }
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Nombre</th>
                <th className="text-left px-4 py-3">Curso</th>
                <th className="text-left px-4 py-3">Jornada</th>
                <th className="text-left px-4 py-3">Documento</th>
                <th className="text-left px-4 py-3">Representante</th>
                <th className="text-left px-4 py-3">Casos activos</th>
                <th className="text-left px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/estudiantes/${s.id}`} className="font-medium text-brand-700 hover:underline">
                      {s.full_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-medium whitespace-nowrap">
                    {s.course} {s.parallel || ""}
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {s.jornada ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        s.jornada.toUpperCase() === "MATUTINA"
                          ? "bg-amber-50 text-amber-800 border border-amber-200/60"
                          : s.jornada.toUpperCase() === "VESPERTINA"
                          ? "bg-sky-50 text-sky-800 border border-sky-200/60"
                          : s.jornada.toUpperCase() === "NOCTURNA"
                          ? "bg-indigo-50 text-indigo-800 border border-indigo-200/60"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}>
                        {s.jornada.toUpperCase() === "MATUTINA" && "☀️ "}
                        {s.jornada.toUpperCase() === "VESPERTINA" && "🌅 "}
                        {s.jornada.toUpperCase() === "NOCTURNA" && "🌙 "}
                        {s.jornada.charAt(0).toUpperCase() + s.jornada.slice(1).toLowerCase()}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-mono text-xs whitespace-nowrap">
                    {formatDocumentId(s.document_type, s.document_id)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.representative || "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {caseCountMap.get(s.id) ? (
                      <Badge color="amber">{caseCountMap.get(s.id)} activo(s)</Badge>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {s.active ? <Badge color="green">Activo</Badge> : <Badge color="slate">Inactivo</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
