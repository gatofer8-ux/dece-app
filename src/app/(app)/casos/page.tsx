import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader, Badge, EmptyState, formatDate } from "@/components/ui";
import {
  CASE_STATUS_LABELS,
  CASE_PRIORITY_LABELS,
  RISK_TYPE_LABELS,
  type CaseFileRow,
} from "@/lib/types";
import { getUserCoverage } from "@/lib/distributivo";

const STATUS_COLOR: Record<string, string> = {
  ABIERTO: "amber",
  EN_SEGUIMIENTO: "blue",
  DERIVADO: "purple",
  CERRADO: "green",
};
const PRIORITY_COLOR: Record<string, string> = { ALTA: "red", MEDIA: "amber", BAJA: "slate" };

export default async function CasosPage({
  searchParams,
}: {
  searchParams: { estado?: string; prioridad?: string; riesgo?: string; q?: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const coverage = await getUserCoverage(session.user.id, institutionId, session.user.role);

  const { estado, prioridad, riesgo, q } = searchParams;
  let where = "WHERE cf.institution_id = ?";
  const params: any[] = [institutionId];

  if (!coverage.isAllInstitutional) {
    if (coverage.courses.length > 0) {
      const courseClauses: string[] = [];
      const courseParams: any[] = [];
      for (const c of coverage.courses) {
        const match = c.match(/^(.*?)\s*\((Matutina|Vespertina|Nocturna)\)$/i);
        if (match) {
          const rawCourse = match[1].trim();
          const jVal = match[2].toUpperCase();
          courseClauses.push("(s.course = ? AND (s.jornada = ? OR s.jornada IS NULL))");
          courseParams.push(rawCourse, jVal);
        } else {
          courseClauses.push("s.course = ?");
          courseParams.push(c);
        }
      }
      where += ` AND (cf.opened_by_id = ? OR cf.assigned_to_id = ? OR (${courseClauses.join(" OR ")}))`;
      params.push(session.user.id, session.user.id, ...courseParams);
    } else {
      where += " AND (cf.opened_by_id = ? OR cf.assigned_to_id = ?)";
      params.push(session.user.id, session.user.id);
    }
  }
  if (estado) {
    where += " AND cf.status = ?";
    params.push(estado);
  } else {
    where += " AND cf.status != 'CERRADO'";
  }
  if (prioridad) {
    where += " AND cf.priority = ?";
    params.push(prioridad);
  }
  if (riesgo) {
    where += " AND cf.risk_type = ?";
    params.push(riesgo);
  }
  if (q) {
    where += " AND (s.full_name LIKE ? OR cf.code LIKE ?)";
    params.push(`%${q}%`, `%${q}%`);
  }

  const cases = db
    .prepare(
      `SELECT cf.*, s.full_name as student_name, s.course as student_course
       FROM case_files cf JOIN students s ON s.id = cf.student_id
       ${where}
       ORDER BY cf.priority = 'ALTA' DESC, cf.created_at DESC
       LIMIT 300`
    )
    .all(...params) as (CaseFileRow & { student_name: string; student_course: string })[];

  return (
    <div>
      <PageHeader
        title="Casos y fichas de atención"
        description="Registro de casos de riesgo psicosocial y su seguimiento."
        action={
          <Link href="/casos/nuevo" className="btn-primary">
            + Nuevo caso
          </Link>
        }
      />

      {!coverage.isAllInstitutional && (
        <div className="mb-4 p-3 bg-indigo-50/80 border border-indigo-200 rounded-lg text-xs text-indigo-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-indigo-700">📌 Casos en tu cobertura DECE:</span>
            <span>
              {coverage.courses.length > 0
                ? `Mostrando casos de tus cursos asignados (${coverage.courses.join(", ")}) y asignados directamente a ti.`
                : "Mostrando casos asignados directamente a ti."}
            </span>
          </div>
          <Link href="/distributivo" className="text-indigo-700 hover:underline font-semibold shrink-0">
            Ver Distributivo →
          </Link>
        </div>
      )}

      <form className="card p-4 mb-4 flex flex-wrap gap-3" method="get">
        <input type="text" name="q" defaultValue={q} placeholder="Buscar por estudiante o código..." className="input max-w-xs" />
        <select name="estado" defaultValue={estado || ""} className="select max-w-[180px]">
          <option value="">Todos los estados (excepto cerrados)</option>
          {Object.entries(CASE_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select name="prioridad" defaultValue={prioridad || ""} className="select max-w-[160px]">
          <option value="">Toda prioridad</option>
          {Object.entries(CASE_PRIORITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select name="riesgo" defaultValue={riesgo || ""} className="select max-w-[220px]">
          <option value="">Todo tipo de riesgo</option>
          {Object.entries(RISK_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button type="submit" className="btn-secondary">Filtrar</button>
        <Link href="/casos" className="btn-secondary">Limpiar</Link>
      </form>

      {cases.length === 0 ? (
        <EmptyState title="No hay casos con estos filtros" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Código</th>
                <th className="text-left px-4 py-3">Estudiante</th>
                <th className="text-left px-4 py-3">Tipo de riesgo</th>
                <th className="text-left px-4 py-3">Prioridad</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-left px-4 py-3">Detección</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cases.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/casos/${c.id}`} className="font-medium text-brand-700 hover:underline">
                      {c.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {c.student_name}
                    <div className="text-xs text-slate-400">{c.student_course}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{RISK_TYPE_LABELS[c.risk_type]}</td>
                  <td className="px-4 py-3">
                    <Badge color={PRIORITY_COLOR[c.priority]}>{CASE_PRIORITY_LABELS[c.priority]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={STATUS_COLOR[c.status]}>{CASE_STATUS_LABELS[c.status]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(c.detection_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
