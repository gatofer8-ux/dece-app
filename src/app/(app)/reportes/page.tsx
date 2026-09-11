import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { canViewCaseDetail } from "@/lib/permissions";
import { PageHeader, StatCard, Badge, formatDate } from "@/components/ui";
import { RISK_TYPE_LABELS, CASE_STATUS_LABELS, CASE_PRIORITY_LABELS, ACTIVITY_AXIS_LABELS, type CaseFileRow } from "@/lib/types";

function monthRange(offset = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

function quarterRange() {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3);
  const start = new Date(now.getFullYear(), q * 3, 1);
  const end = new Date(now.getFullYear(), q * 3 + 3, 0);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: { start?: string; end?: string };
}) {
  const session = await requireRole(["ADMIN", "DECE", "AUTORIDAD"]);
  const institutionId = requireInstitutionId(session);
  const canSeeNarrative = canViewCaseDetail(session.user.role);

  const defaultRange = monthRange();
  const start = searchParams.start || defaultRange.start;
  const end = searchParams.end || defaultRange.end;

  const cases = db
    .prepare(
      `SELECT cf.*, s.full_name as student_name, s.course as student_course FROM case_files cf
       JOIN students s ON s.id = cf.student_id
       WHERE cf.institution_id = ? AND date(cf.detection_date) BETWEEN date(?) AND date(?)
       ORDER BY cf.detection_date DESC`
    )
    .all(institutionId, start, end) as (CaseFileRow & { student_name: string; student_course: string })[];

  const byRisk = new Map<string, number>();
  const byStatus = new Map<string, number>();
  const byPriority = new Map<string, number>();
  for (const c of cases) {
    byRisk.set(c.risk_type, (byRisk.get(c.risk_type) || 0) + 1);
    byStatus.set(c.status, (byStatus.get(c.status) || 0) + 1);
    byPriority.set(c.priority, (byPriority.get(c.priority) || 0) + 1);
  }

  const referralStats = db
    .prepare(
      `SELECT r.status, COUNT(*) n FROM referrals r JOIN case_files cf ON cf.id = r.case_file_id
       WHERE cf.institution_id = ? AND date(r.referral_date) BETWEEN date(?) AND date(?) GROUP BY r.status`
    )
    .all(institutionId, start, end) as { status: string; n: number }[];

  const activityStats = db
    .prepare(
      `SELECT axis, COUNT(*) n, COALESCE(SUM(participants_count),0) participantes FROM activities
       WHERE institution_id = ? AND date(date) BETWEEN date(?) AND date(?) GROUP BY axis`
    )
    .all(institutionId, start, end) as { axis: string; n: number; participantes: number }[];

  const appointmentStats = db
    .prepare(
      `SELECT status, COUNT(*) n FROM appointments WHERE institution_id = ? AND date(date) BETWEEN date(?) AND date(?) GROUP BY status`
    )
    .all(institutionId, start, end) as { status: string; n: number }[];

  const q = quarterRange();

  return (
    <div>
      <PageHeader
        title="Reportes"
        description="Indicadores de gestión del DECE para el período seleccionado. Listo para exportar en tus informes mensuales/trimestrales."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/reportes/ejecutivo" className="btn-secondary flex items-center gap-1.5 font-semibold text-slate-800">
              <span>🏛️</span> Rendición al Distrito
            </Link>
            <Link href="/reportes/estadisticas" className="btn-primary bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-sm">
              <span>📊</span> Cuadros Estadísticos
            </Link>
            <Link href="/reportes/desde-plantilla" className="btn-secondary flex items-center gap-1.5">
              <span>📄</span> Plantillas Distritales
            </Link>
            <Link href="/reportes/matriz-riesgos" className="btn-secondary">
              📋 Matriz de Riesgos
            </Link>
            <a href={`/api/reportes/export?start=${start}&end=${end}`} className="btn-secondary">
              ⬇ Exportar Excel
            </a>
          </div>
        }
      />

      <form className="card p-4 mb-6 flex flex-wrap items-end gap-3" method="get">
        <div>
          <label className="label text-xs">Desde</label>
          <input type="date" name="start" defaultValue={start} className="input" />
        </div>
        <div>
          <label className="label text-xs">Hasta</label>
          <input type="date" name="end" defaultValue={end} className="input" />
        </div>
        <button type="submit" className="btn-secondary">Aplicar</button>
        <Link href={`/reportes?start=${monthRange().start}&end=${monthRange().end}`} className="text-xs text-brand-600 hover:underline ml-2">
          Este mes
        </Link>
        <Link href={`/reportes?start=${q.start}&end=${q.end}`} className="text-xs text-brand-600 hover:underline">
          Trimestre actual
        </Link>
        <Link href={`/reportes?start=${new Date().getFullYear()}-01-01&end=${new Date().getFullYear()}-12-31`} className="text-xs text-brand-600 hover:underline">
          Año actual
        </Link>
      </form>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Casos en el período" value={cases.length} />
        <StatCard label="Derivaciones" value={referralStats.reduce((a, b) => a + b.n, 0)} />
        <StatCard label="Actividades" value={activityStats.reduce((a, b) => a + b.n, 0)} />
        <StatCard label="Citas" value={appointmentStats.reduce((a, b) => a + b.n, 0)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Por tipo de riesgo</h2>
          <ul className="text-sm space-y-1">
            {[...byRisk.entries()].map(([k, n]) => (
              <li key={k} className="flex justify-between">
                <span className="text-slate-600">{RISK_TYPE_LABELS[k as keyof typeof RISK_TYPE_LABELS]}</span>
                <span className="font-medium">{n}</span>
              </li>
            ))}
            {byRisk.size === 0 && <li className="text-slate-400">Sin registros.</li>}
          </ul>
        </div>
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Por estado</h2>
          <ul className="text-sm space-y-1">
            {[...byStatus.entries()].map(([k, n]) => (
              <li key={k} className="flex justify-between">
                <span className="text-slate-600">{CASE_STATUS_LABELS[k as keyof typeof CASE_STATUS_LABELS]}</span>
                <span className="font-medium">{n}</span>
              </li>
            ))}
            {byStatus.size === 0 && <li className="text-slate-400">Sin registros.</li>}
          </ul>
        </div>
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Por prioridad</h2>
          <ul className="text-sm space-y-1">
            {[...byPriority.entries()].map(([k, n]) => (
              <li key={k} className="flex justify-between">
                <span className="text-slate-600">{CASE_PRIORITY_LABELS[k as keyof typeof CASE_PRIORITY_LABELS]}</span>
                <span className="font-medium">{n}</span>
              </li>
            ))}
            {byPriority.size === 0 && <li className="text-slate-400">Sin registros.</li>}
          </ul>
        </div>
      </div>

      <div className="card p-5 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Actividades de promoción, prevención y convivencia</h2>
        <ul className="text-sm grid grid-cols-1 sm:grid-cols-3 gap-2">
          {Object.entries(ACTIVITY_AXIS_LABELS).map(([k, label]) => {
            const stat = activityStats.find((a) => a.axis === k);
            return (
              <li key={k} className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-600">{label}</span>
                <span className="font-medium">{stat?.n || 0} act. · {stat?.participantes || 0} particip.</span>
              </li>
            );
          })}
        </ul>
      </div>

      <h2 className="text-sm font-semibold text-slate-700 mb-3">Detalle de casos del período</h2>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Código</th>
              <th className="text-left px-4 py-3">Estudiante</th>
              <th className="text-left px-4 py-3">Curso</th>
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
                  {canSeeNarrative ? (
                    <Link href={`/casos/${c.id}`} className="font-medium text-brand-700 hover:underline">{c.code}</Link>
                  ) : (
                    c.code
                  )}
                </td>
                <td className="px-4 py-3">{c.student_name}</td>
                <td className="px-4 py-3 text-slate-600">{c.student_course}</td>
                <td className="px-4 py-3 text-slate-600">{RISK_TYPE_LABELS[c.risk_type]}</td>
                <td className="px-4 py-3"><Badge>{CASE_PRIORITY_LABELS[c.priority]}</Badge></td>
                <td className="px-4 py-3"><Badge>{CASE_STATUS_LABELS[c.status]}</Badge></td>
                <td className="px-4 py-3 text-slate-600">{formatDate(c.detection_date)}</td>
              </tr>
            ))}
            {cases.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">Sin casos en este período.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {!canSeeNarrative && (
        <p className="text-xs text-slate-400 mt-3">
          Por confidencialidad, el relato detallado de cada caso solo es visible para el equipo DECE.
        </p>
      )}
    </div>
  );
}
