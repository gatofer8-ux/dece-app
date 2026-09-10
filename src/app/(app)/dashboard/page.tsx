import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { CASE_STATUS_LABELS, CASE_PRIORITY_LABELS, RISK_TYPE_LABELS, type CaseFileRow, type RiskType } from "@/lib/types";
import { caseStatusStyle, priorityStyle, riskTypeStyle } from "@/lib/statusColors";
import { getSelectedSchoolYear } from "@/lib/schoolYear";
import { getInactiveCases } from "@/lib/caseAlerts";
import DashboardCharts from "@/components/DashboardCharts";
import KpiCard from "@/components/KpiCard";

export default async function DashboardPage() {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const selectedYear = await getSelectedSchoolYear(institutionId);
  const yearCondition = selectedYear
    ? `AND (cf.school_year_id = '${selectedYear.id}' OR (cf.school_year_id IS NULL AND cf.detection_date >= '${selectedYear.start_date}' AND cf.detection_date <= '${selectedYear.end_date}'))`
    : "";

  // 1. Total Estudiantes
  const totalStudents = (
    db
      .prepare("SELECT COUNT(*) n FROM students WHERE active=1 AND institution_id=?")
      .get(institutionId) as { n: number }
  ).n;

  // 2. Casos Activos
  const openCases = (
    db
      .prepare(
        `SELECT COUNT(*) n FROM case_files cf 
         WHERE cf.status != 'CERRADO' AND cf.institution_id=? ${yearCondition}`
      )
      .get(institutionId) as { n: number }
  ).n;

  // 3. Casos de Prioridad Alta
  const highPriority = (
    db
      .prepare(
        `SELECT COUNT(*) n FROM case_files cf 
         WHERE cf.status != 'CERRADO' AND cf.priority='ALTA' AND cf.institution_id=? ${yearCondition}`
      )
      .get(institutionId) as { n: number }
  ).n;

  // 4. Alertas Pendientes
  const pendingAlerts = (
    db
      .prepare("SELECT COUNT(*) n FROM teacher_alerts WHERE status='PENDIENTE' AND institution_id=?")
      .get(institutionId) as { n: number }
  ).n;

  // 5. Derivaciones Pendientes
  const pendingReferrals = (
    db
      .prepare(
        `SELECT COUNT(*) as count 
         FROM referrals r
         INNER JOIN case_files cf ON r.case_file_id = cf.id
         WHERE cf.institution_id = ? AND r.status = 'EN_PROCESO' ${yearCondition}`
      )
      .get(institutionId) as { count: number }
  ).count;

  // 5.b Checklists Incompletos
  const incompleteChecklists = (
    db
      .prepare(
        `SELECT COUNT(DISTINCT cci.case_file_id) as count 
         FROM case_checklist_items cci
         INNER JOIN case_files cf ON cci.case_file_id = cf.id
         WHERE cf.institution_id = ? AND (cci.status IS NULL OR cci.status != 'SI') AND cf.status != 'CERRADO' ${yearCondition}`
      )
      .get(institutionId) as { count: number }
  ).count;

  // 6. Citas Hoy
  const todayStr = new Date().toISOString().split("T")[0];
  const todayAppointments = (
    db
      .prepare(
        "SELECT COUNT(*) n FROM appointments WHERE date = ? AND status='PROGRAMADA' AND institution_id=?"
      )
      .get(todayStr, institutionId) as { n: number }
  ).n;

  // 6.b Casos sin contacto con estudiante o representante (>30 días)
  let inactivitySummary = {
    totalOpenCases: 0,
    alertCasesCount: 0,
    urgentAlertCasesCount: 0,
    cases: [] as import("@/lib/caseAlerts").InactiveCaseItem[],
  };
  try {
    inactivitySummary = getInactiveCases(institutionId, 30);
  } catch (err) {
    console.error("[dashboard] Error consultando casos inactivos:", err);
  }

  // 7. Estadísticas por Tipo de Riesgo
  const riskStats = db
    .prepare(
      `SELECT cf.risk_type, COUNT(*) as count 
       FROM case_files cf 
       WHERE cf.institution_id = ? ${yearCondition}
       GROUP BY cf.risk_type 
       ORDER BY count DESC`
    )
    .all(institutionId) as { risk_type: RiskType; count: number }[];

  // 8. Estadísticas por Curso
  const courseStats = db
    .prepare(
      `SELECT s.course, COUNT(cf.id) as count
       FROM case_files cf
       INNER JOIN students s ON s.id = cf.student_id
       WHERE cf.institution_id = ? ${yearCondition}
       GROUP BY s.course
       ORDER BY count DESC
       LIMIT 8`
    )
    .all(institutionId) as { course: string; count: number }[];

  // 9. Estadísticas por Estado
  const statusStats = db
    .prepare(
      `SELECT cf.status, COUNT(*) as count
       FROM case_files cf
       WHERE cf.institution_id = ? ${yearCondition}
       GROUP BY cf.status`
    )
    .all(institutionId) as { status: string; count: number }[];

  // 10. Evolución Mensual de Casos y Atenciones
  const monthlyCases = db
    .prepare(
      `SELECT strftime('%Y-%m', detection_date) as month, COUNT(*) as cases
       FROM case_files cf
       WHERE cf.institution_id = ? ${yearCondition}
       GROUP BY month
       ORDER BY month DESC
       LIMIT 6`
    )
    .all(institutionId) as { month: string; cases: number }[];

  const monthlyAttentions = db
    .prepare(
      `SELECT strftime('%Y-%m', attention_date) as month, COUNT(*) as attentions
       FROM daily_attentions
       WHERE institution_id = ?
       GROUP BY month
       ORDER BY month DESC
       LIMIT 6`
    )
    .all(institutionId) as { month: string; attentions: number }[];

  const allMonths = Array.from(
    new Set([...monthlyCases.map((m) => m.month), ...monthlyAttentions.map((m) => m.month)])
  ).sort();

  const monthlyStats = allMonths.map((month) => {
    const c = monthlyCases.find((x) => x.month === month)?.cases || 0;
    const a = monthlyAttentions.find((x) => x.month === month)?.attentions || 0;
    return { month, cases: c, attentions: a };
  });

  const casesTrend = monthlyStats.map((m) => m.cases);

  // 11. Casos Recientes
  const recentCases = db
    .prepare(
      `SELECT cf.*, s.full_name as student_name, s.course as student_course
       FROM case_files cf 
       JOIN students s ON s.id = cf.student_id
       WHERE cf.institution_id = ?
       ORDER BY cf.created_at DESC LIMIT 5`
    )
    .all(institutionId) as (CaseFileRow & { student_name: string; student_course: string })[];

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        title="Panel General DECE"
        description={
          selectedYear
            ? `Mostrando indicadores del período activo: ${selectedYear.name}`
            : "Mostrando indicadores consolidados de todos los años lectivos (Histórico general)"
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/casos/nuevo" className="btn-primary text-xs flex items-center gap-1">
              <span>➕</span> Nuevo Caso
            </Link>
            <Link href="/estudiantes/nuevo" className="btn-secondary text-xs flex items-center gap-1">
              <span>🎓</span> Estudiante
            </Link>
            <Link href="/citas/nueva" className="btn-secondary text-xs flex items-center gap-1">
              <span>📅</span> Agendar Cita
            </Link>
            <Link href="/atencion-diaria" className="btn-secondary text-xs flex items-center gap-1">
              <span>📋</span> Atención Diaria
            </Link>
          </div>
        }
      />

      {/* Banner Preventivo de Casos en Riesgo de Abandono (>30 días sin conversación) */}
      {inactivitySummary.alertCasesCount > 0 && (
        <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-xl text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">⚠️</span>
            <div>
              <div className="font-bold text-sm text-amber-950">
                Alerta de Prevención: {inactivitySummary.alertCasesCount} caso(s) sin seguimiento ni contacto en más de 30 días
              </div>
              <p className="text-amber-800 mt-0.5">
                Para evitar que los casos queden en el olvido, revise los expedientes pendientes de diálogo y emita esquelas de citación.
              </p>
            </div>
          </div>
          <Link
            href="/casos?alerta=sin_contacto"
            className="btn-primary text-xs font-bold px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white shrink-0 flex items-center gap-1.5 shadow-sm"
          >
            <span>📨</span> Atender casos rezagados ({inactivitySummary.alertCasesCount}) →
          </Link>
        </div>
      )}

      {/* Tarjetas KPI — clicables, con tendencia de 6 meses donde aplica */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3.5">
        <KpiCard label="Estudiantes" value={totalStudents} hint="Matrícula activa" tone="brand" href="/estudiantes" />
        <KpiCard label="Casos activos" value={openCases} hint="En acompañamiento" tone="amber" href="/casos" trend={casesTrend} />
        <KpiCard label="Prioridad alta" value={highPriority} hint="Riesgo urgente" tone="rose" href="/casos?priority=ALTA" />
        <KpiCard
          label="Sin contacto (+30d)"
          value={inactivitySummary.alertCasesCount}
          hint={inactivitySummary.alertCasesCount > 0 ? "Riesgo de olvido" : "Al día"}
          tone={inactivitySummary.alertCasesCount > 0 ? "rose" : "slate"}
          href="/casos?alerta=sin_contacto"
        />
        <KpiCard label="Alertas pendientes" value={pendingAlerts} hint="Por docentes" tone="purple" href="/alertas" />
        <KpiCard label="Derivaciones" value={pendingReferrals} hint="En proceso externo" tone="indigo" href="/derivaciones" />
        <KpiCard label="Checklists incompletos" value={incompleteChecklists} hint="Docs. faltantes" tone="red" href="/casos" />
        <KpiCard label="Citas hoy" value={todayAppointments} hint={todayStr} tone="emerald" href="/citas" />
      </div>

      {/* Gráficos Visuales y Casos Recientes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Componente Gráfico Interactivo */}
        <div className="lg:col-span-2">
          <DashboardCharts
            riskStats={riskStats}
            courseStats={courseStats}
            monthlyStats={monthlyStats}
            statusStats={statusStats}
          />
        </div>

        {/* Lista de Casos Recientes con Enlace Directo */}
        <div className="card p-5 space-y-4 lg:col-span-1">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <span>📁</span> Casos Recientes
            </h2>
            <Link href="/casos" className="text-xs text-brand-600 font-semibold hover:underline">
              Ver todos →
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recentCases.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">Aún no hay casos registrados.</p>
            ) : (
              recentCases.map((c) => (
                <Link
                  key={c.id}
                  href={`/casos/${c.id}`}
                  className="py-2.5 flex justify-between items-center gap-2 hover:bg-brand-50/50 -mx-2 px-2 rounded-lg transition-colors group"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-800 group-hover:text-brand-900 truncate">
                      {c.student_name}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${riskTypeStyle(c.risk_type).dot}`} />
                      {c.code} · {RISK_TYPE_LABELS[c.risk_type] || c.risk_type}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1">
                    {c.priority === "ALTA" && (
                      <span className={`badge ${priorityStyle("ALTA").badge}`}>{CASE_PRIORITY_LABELS.ALTA}</span>
                    )}
                    <span className={`badge ${caseStatusStyle(c.status).badge}`}>
                      {CASE_STATUS_LABELS[c.status] || c.status}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
