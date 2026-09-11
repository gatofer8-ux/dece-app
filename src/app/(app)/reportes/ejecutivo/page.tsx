import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader, formatDate } from "@/components/ui";
import { RISK_TYPE_LABELS, type InstitutionRow, type RiskType } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ReporteEjecutivoDistritoPage({
  searchParams,
}: {
  searchParams: { yearId?: string };
}) {
  const session = await requireRole(["ADMIN", "DECE", "AUTORIDAD", "DISTRITO", "SUPERADMIN"]);
  const institutionId = requireInstitutionId(session);

  const institution = db
    .prepare("SELECT * FROM institutions WHERE id = ?")
    .get(institutionId) as InstitutionRow | undefined;

  // Total estudiantes
  const totalStudents = (
    db.prepare("SELECT COUNT(*) as n FROM students WHERE institution_id = ? AND active = 1").get(institutionId) as any
  )?.n || 0;

  // Casos totales y cerrados
  const caseStats = db
    .prepare(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'CERRADO' THEN 1 ELSE 0 END) as cerrados,
        SUM(CASE WHEN status = 'EN_SEGUIMIENTO' THEN 1 ELSE 0 END) as seguimiento,
        SUM(CASE WHEN status = 'ABIERTO' THEN 1 ELSE 0 END) as abiertos,
        SUM(CASE WHEN priority = 'ALTA' THEN 1 ELSE 0 END) as altaPrioridad
       FROM case_files WHERE institution_id = ?`
    )
    .get(institutionId) as any;

  // Casos por factor de riesgo
  const casesByRisk = db
    .prepare(
      `SELECT risk_type, COUNT(*) as count 
       FROM case_files 
       WHERE institution_id = ? 
       GROUP BY risk_type 
       ORDER BY count DESC`
    )
    .all(institutionId) as { risk_type: RiskType; count: number }[];

  // Atenciones diarias
  const dailyAttentions = (
    db.prepare("SELECT COUNT(*) as n FROM daily_attentions WHERE institution_id = ?").get(institutionId) as any
  )?.n || 0;

  // Derivaciones externas
  const referralsCount = (
    db.prepare("SELECT COUNT(*) as n FROM referrals WHERE institution_id = ?").get(institutionId) as any
  )?.n || 0;

  // Alertas tempranas
  const alertsCount = (
    db.prepare("SELECT COUNT(*) as n FROM teacher_alerts WHERE institution_id = ?").get(institutionId) as any
  )?.n || 0;

  // Actividades de promoción y prevención
  const activities = db
    .prepare(
      `SELECT COUNT(*) as total, COALESCE(SUM(participants_count), 0) as participantes 
       FROM activities WHERE institution_id = ?`
    )
    .get(institutionId) as any;

  const resolutionRate = caseStats.total > 0 ? Math.round((caseStats.cerrados / caseStats.total) * 100) : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Botones de acción superiores (no-print) */}
      <div className="no-print flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <Link href="/reportes" className="btn-secondary text-xs flex items-center gap-1">
          ← Volver a Reportes
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {}}
            className="btn-primary text-xs flex items-center gap-1.5 shadow-sm bg-brand-700 hover:bg-brand-800"
            // @ts-ignore
            onclick="window.print()"
          >
            <span>🖨️</span> Imprimir / Exportar a PDF
          </button>
        </div>
      </div>

      {/* DOCUMENTO FORMAL EJECUTIVO PARA EL DISTRITO */}
      <div className="card p-6 md:p-8 bg-white border border-slate-200 print:border-none print:shadow-none print:p-0">
        {/* Encabezado Oficial Ministerio de Educación */}
        <div className="border-b-2 border-slate-900 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {institution?.seal_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={institution.seal_image}
                alt="Sello"
                className="h-14 w-14 rounded-lg object-contain p-1 border border-slate-200 shrink-0"
              />
            ) : (
              <div className="h-14 w-14 rounded-lg bg-slate-900 text-white flex items-center justify-center text-2xl shrink-0">
                🏛️
              </div>
            )}

            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Ministerio de Educación del Ecuador
              </div>
              <h1 className="text-lg md:text-xl font-extrabold uppercase tracking-tight text-slate-900">
                {institution?.name || "Institución Educativa"}
              </h1>
              <div className="text-xs font-semibold text-brand-700">
                DEPARTAMENTO DE CONSEJERÍA ESTUDIANTIL (DECE)
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right text-xs font-medium text-slate-600 space-y-0.5 font-mono">
            <div>AMIE: <strong>{institution?.amie_code || "N/A"}</strong></div>
            <div>Distrito: <strong>{institution?.district || "Distrito Educativo"}</strong></div>
            <div>Zona: <strong>{institution?.zona || "Coordinación Zonal"}</strong></div>
            <div>Fecha: <strong>{formatDate(new Date().toISOString().slice(0, 10))}</strong></div>
          </div>
        </div>

        {/* Título del Informe */}
        <div className="text-center my-6">
          <h2 className="text-base md:text-lg font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2 inline-block px-4">
            Informe Ejecutivo de Gestión y Rendición de Cuentas
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Consolidado Institucional de Acompañamiento Psicoemocional, Bienestar Integral y Casos DECE
          </p>
        </div>

        {/* Resumen Cuantitativo Clave (Métricas de Impacto) */}
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 border-l-4 border-brand-600 pl-2">
            1. Indicadores Generales de Cobertura e Impacto
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70">
              <div className="text-2xl font-bold text-slate-900">{totalStudents}</div>
              <div className="text-[11px] font-semibold text-slate-600 uppercase mt-0.5">Estudiantes Matriculados</div>
            </div>

            <div className="p-3.5 rounded-lg border border-brand-200 bg-brand-50/50">
              <div className="text-2xl font-bold text-brand-800">{dailyAttentions}</div>
              <div className="text-[11px] font-semibold text-brand-900 uppercase mt-0.5">Atenciones Brindadas</div>
            </div>

            <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/50">
              <div className="text-2xl font-bold text-amber-800">{caseStats.total}</div>
              <div className="text-[11px] font-semibold text-amber-900 uppercase mt-0.5">Casos Formales Abiertos</div>
            </div>

            <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/50">
              <div className="text-2xl font-bold text-emerald-700">{resolutionRate}%</div>
              <div className="text-[11px] font-semibold text-emerald-900 uppercase mt-0.5">Tasa de Resolución / Cierre</div>
            </div>
          </div>
        </div>

        {/* Estado de los Expedientes */}
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 border-l-4 border-brand-600 pl-2">
            2. Estado Procesal de Expedientes Estudiantiles
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg border border-slate-200 bg-white flex justify-between items-center">
              <span className="font-medium text-slate-700">En Seguimiento Activo:</span>
              <span className="font-bold text-base text-blue-700">{caseStats.seguimiento}</span>
            </div>
            <div className="p-3 rounded-lg border border-slate-200 bg-white flex justify-between items-center">
              <span className="font-medium text-slate-700">Casos Cerrados / Resueltos:</span>
              <span className="font-bold text-base text-emerald-700">{caseStats.cerrados}</span>
            </div>
            <div className="p-3 rounded-lg border border-slate-200 bg-white flex justify-between items-center">
              <span className="font-medium text-slate-700">Prioridad Alta / Emergente:</span>
              <span className="font-bold text-base text-rose-600">{caseStats.altaPrioridad}</span>
            </div>
          </div>
        </div>

        {/* Distribución por Factores de Riesgo */}
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 border-l-4 border-brand-600 pl-2">
            3. Distribución por Tipología de Riesgo y Vulneración
          </h3>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2.5 text-left">Factor de Riesgo Detectado</th>
                  <th className="p-2.5 text-center w-24">N° Casos</th>
                  <th className="p-2.5 text-left w-48">Proporción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {casesByRisk.map((r) => {
                  const pct = caseStats.total > 0 ? Math.round((r.count / caseStats.total) * 100) : 0;
                  return (
                    <tr key={r.risk_type} className="hover:bg-slate-50/50">
                      <td className="p-2.5 font-medium text-slate-800">
                        {RISK_TYPE_LABELS[r.risk_type] || r.risk_type}
                      </td>
                      <td className="p-2.5 text-center font-bold font-mono">{r.count}</td>
                      <td className="p-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div className="bg-brand-600 h-2 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="font-mono text-[10px] text-slate-500 w-8">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {casesByRisk.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-slate-400">
                      No se registran casos aperturados en el periodo actual.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Acciones Interinstitucionales y Prevención */}
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 border-l-4 border-brand-600 pl-2">
            4. Articulación Externa y Actividades Preventivas
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5">
              <div className="font-bold text-slate-900">Derivaciones Interinstitucionales Externas</div>
              <p className="text-slate-600">
                Se tramitaron <strong>{referralsCount}</strong> derivaciones a entidades del Sistema de Protección Integral
                (Ministerio de Salud Pública, Fiscalía General del Estado, Juntas Cantonales de Protección de Derechos).
              </p>
            </div>

            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5">
              <div className="font-bold text-slate-900">Talleres y Promoción de Convivencia Armónica</div>
              <p className="text-slate-600">
                Se ejecutaron <strong>{activities.total}</strong> actividades formativas y talleres de sensibilización con
                un alcance total de <strong>{activities.participantes}</strong> miembros de la comunidad educativa.
              </p>
            </div>
          </div>
        </div>

        {/* Firmas de Responsabilidad Oficial */}
        <div className="mt-14 pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs">
          <div className="space-y-1">
            <div className="border-b border-slate-400 w-48 mx-auto h-12" />
            <div className="font-bold text-slate-900 uppercase">Coordinador(a) / Analista DECE</div>
            <div className="text-slate-500">Departamento de Consejería Estudiantil</div>
          </div>

          <div className="space-y-1">
            <div className="border-b border-slate-400 w-48 mx-auto h-12" />
            <div className="font-bold text-slate-900 uppercase">Rector(a) / Director(a)</div>
            <div className="text-slate-500">Máxima Autoridad Institucional</div>
          </div>
        </div>
      </div>
    </div>
  );
}
