import Link from "next/link";
import { requireSession, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import { PageHeader, EmptyState } from "@/components/ui";
import type { StudentRow } from "@/lib/types";

export default async function OvpConsolidadoDashboardPage({
  searchParams,
}: {
  searchParams?: { q?: string; curso?: string };
}) {
  const session = await requireSession();
  const institutionId = requireInstitutionId(session);

  const q = searchParams?.q ? searchParams.q.trim().toLowerCase() : "";
  const cursoFilter = searchParams?.curso || "";

  // Obtener estudiantes activos
  let studentQuery = "SELECT * FROM students WHERE institution_id = ? AND active = 1";
  const params: any[] = [institutionId];

  if (cursoFilter) {
    studentQuery += " AND course LIKE ?";
    params.push(`%${cursoFilter}%`);
  }
  if (q) {
    studentQuery += " AND (LOWER(full_name) LIKE ? OR document_id LIKE ?)";
    params.push(`%${q}%`, `%${q}%`);
  }

  studentQuery += " ORDER BY course DESC, parallel ASC, full_name ASC LIMIT 300";
  const students = db.prepare(studentQuery).all(...params) as StudentRow[];

  // Obtener aplicaciones TaPas finalizadas
  const tapasApps = db
    .prepare(
      `SELECT id, session_id, student_id, LOWER(TRIM(student_name)) as s_name, status, finished_at 
       FROM tapas_applications WHERE institution_id = ?`
    )
    .all(institutionId) as { id: string; session_id: string; student_id: string | null; s_name: string; status: string; finished_at: string | null }[];

  const tapasByStudent = new Map<string, { id: string; session_id: string; status: string }>();
  for (const t of tapasApps) {
    if (t.student_id) {
      tapasByStudent.set(t.student_id, t);
    }
    if (t.s_name) {
      tapasByStudent.set(t.s_name, t);
    }
  }

  // Obtener aplicaciones IPPJ finalizadas
  const ippjApps = db
    .prepare(
      `SELECT id, session_id, student_id, LOWER(TRIM(student_name)) as s_name, status, finished_at 
       FROM ovp_applications WHERE institution_id = ?`
    )
    .all(institutionId) as { id: string; session_id: string; student_id: string | null; s_name: string; status: string; finished_at: string | null }[];

  const ippjByStudent = new Map<string, { id: string; session_id: string; status: string }>();
  for (const o of ippjApps) {
    if (o.student_id) {
      ippjByStudent.set(o.student_id, o);
    }
    if (o.s_name) {
      ippjByStudent.set(o.s_name, o);
    }
  }

  // Estadísticas rápidas
  let countBoth = 0;
  let countTapas = 0;
  let countIppj = 0;

  for (const s of students) {
    const hasTapas = tapasByStudent.has(s.id) || tapasByStudent.has(s.full_name.toLowerCase().trim());
    const hasIppj = ippjByStudent.has(s.id) || ippjByStudent.has(s.full_name.toLowerCase().trim());
    if (hasTapas) countTapas++;
    if (hasIppj) countIppj++;
    if (hasTapas && hasIppj) countBoth++;
  }

  // Obtener cursos únicos para el filtro
  const courses = (
    db.prepare("SELECT DISTINCT course FROM students WHERE institution_id = ? AND active = 1 AND course IS NOT NULL ORDER BY course ASC").all(institutionId) as { course: string }[]
  ).map((c) => c.course);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Informes Vocacionales Consolidados e Individuales"
        description="Seguimiento psicopedagógico integrado de Orientación Vocacional y Profesional (OVP). Consulta los informes individuales de TaPas e IPPJ, o descarga el Informe Vocacional Consolidado para entrega a estudiantes y familias en 3ro de Bachillerato."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/ovp/informe-proceso"
              className="btn-secondary text-xs flex items-center gap-1.5 font-semibold text-[#17365D]"
            >
              <span>📑</span> Informe Global del Proceso (3 Ejes)
            </Link>
            <Link
              href="/ovp/cronograma"
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <span>🗓️</span> Cronograma de Citas
            </Link>
            <Link
              href="/ovp"
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <span>🧭</span> Módulo IPPJ
            </Link>
            <Link
              href="/tapas"
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <span>🃏</span> Módulo TaPas
            </Link>
          </div>
        }
      />

      {/* Tarjetas de Métricas de Cobertura */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-3 bg-slate-50 border-slate-200">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Estudiantes</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{students.length}</div>
        </div>
        <div className="card p-3 bg-purple-50/70 border-purple-200">
          <div className="text-[11px] font-bold uppercase tracking-wider text-purple-800">Con TaPas Finalizado</div>
          <div className="text-2xl font-extrabold text-purple-950 mt-1">{countTapas}</div>
        </div>
        <div className="card p-3 bg-blue-50/70 border-blue-200">
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-800">Con IPPJ Finalizado</div>
          <div className="text-2xl font-extrabold text-blue-950 mt-1">{countIppj}</div>
        </div>
        <div className="card p-3 bg-emerald-50/70 border-emerald-200">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Listos para Consolidado</div>
          <div className="text-2xl font-extrabold text-emerald-950 mt-1">{countBoth}</div>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <form method="get" className="card p-3 flex flex-wrap items-center gap-2 text-xs">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            name="q"
            defaultValue={searchParams?.q || ""}
            placeholder="Buscar por nombre o cédula..."
            className="input text-xs w-full"
          />
        </div>
        <div className="w-48">
          <select name="curso" defaultValue={cursoFilter} className="select text-xs w-full">
            <option value="">Todos los cursos</option>
            {courses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-secondary text-xs">
          Filtrar
        </button>
        {(searchParams?.q || searchParams?.curso) && (
          <Link href="/ovp/consolidado" className="text-slate-500 hover:text-slate-700 text-xs underline px-2">
            Limpiar filtros
          </Link>
        )}
      </form>

      {/* Tabla de Estudiantes */}
      {students.length === 0 ? (
        <EmptyState title="No se encontraron estudiantes con los filtros indicados" />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Estudiante</th>
                <th className="text-left px-4 py-3">Curso / Nivel</th>
                <th className="text-center px-4 py-3">TaPas (Talentos)</th>
                <th className="text-center px-4 py-3">IPPJ (Intereses)</th>
                <th className="text-center px-4 py-3">Informe Consolidado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((s) => {
                const tapas = tapasByStudent.get(s.id) || tapasByStudent.get(s.full_name.toLowerCase().trim());
                const ippj = ippjByStudent.get(s.id) || ippjByStudent.get(s.full_name.toLowerCase().trim());

                return (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{s.full_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{s.document_id || "Sin cédula"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-700">
                        {s.course} {s.parallel ? `"${s.parallel}"` : ""}
                      </span>
                      {s.bachillerato_specialty && (
                        <span className="block text-[10px] text-brand-700">{s.bachillerato_specialty}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {tapas ? (
                        <div className="inline-flex flex-col items-center gap-1">
                          <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            ✓ {tapas.status}
                          </span>
                          <Link
                            href={`/tapas/${tapas.session_id}/informe/${tapas.id}`}
                            className="text-[11px] text-purple-700 hover:underline font-semibold"
                          >
                            Ver TaPas →
                          </Link>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">No registra</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {ippj ? (
                        <div className="inline-flex flex-col items-center gap-1">
                          <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            ✓ {ippj.status}
                          </span>
                          <Link
                            href={`/ovp/${ippj.session_id}/informe/${ippj.id}`}
                            className="text-[11px] text-blue-700 hover:underline font-semibold"
                          >
                            Ver IPPJ →
                          </Link>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">No registra</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <Link
                          href={`/ovp/consolidado/${s.id}`}
                          className="px-2.5 py-1 text-xs font-bold bg-[#17365D] text-white rounded-lg hover:bg-[#10243e] transition shadow-xs flex items-center gap-1"
                          title="Ver Informe Vocacional Consolidado e Imprimir en A4 / PDF"
                        >
                          <span>🧠</span> Ver Consolidado
                        </Link>
                        <a
                          href={`/api/ovp/export-consolidado-word?studentId=${s.id}`}
                          className="p-1 text-blue-800 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition text-xs font-semibold"
                          title="Descargar Informe Vocacional Consolidado en Word (.docx)"
                        >
                          📥 Word
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
