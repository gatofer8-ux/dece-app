import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { formatDate } from "@/components/ui";
import { RISK_TYPE_LABELS, type InstitutionRow, type RiskType } from "@/lib/types";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function ReporteEjecutivoDistritoPage({
  searchParams,
}: {
  searchParams: { yearId?: string };
}) {
  const session = await requireRole(["ADMIN", "DECE", "AUTORIDAD", "DISTRITO", "SUPERADMIN"]);
  const institutionId = requireInstitutionId(session);

  let institution: InstitutionRow | undefined;
  try {
    institution = db
      .prepare("SELECT * FROM institutions WHERE id = ?")
      .get(institutionId) as InstitutionRow | undefined;
  } catch (err) {
    console.error("[ReporteEjecutivo] Error consultando institución:", err);
  }

  // Total estudiantes
  let totalStudents = 0;
  try {
    const res = db
      .prepare("SELECT COUNT(*) as n FROM students WHERE institution_id = ? AND active = 1")
      .get(institutionId) as any;
    totalStudents = res?.n || 0;
  } catch (err) {
    console.error("[ReporteEjecutivo] Error consultando estudiantes:", err);
  }

  // Casos totales y cerrados
  let caseStats = { total: 0, cerrados: 0, seguimiento: 0, abiertos: 0, altaPrioridad: 0 };
  try {
    const res = db
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
    if (res) {
      caseStats = {
        total: res.total || 0,
        cerrados: res.cerrados || 0,
        seguimiento: res.seguimiento || 0,
        abiertos: res.abiertos || 0,
        altaPrioridad: res.altaPrioridad || 0,
      };
    }
  } catch (err) {
    console.error("[ReporteEjecutivo] Error consultando casos:", err);
  }

  // Casos por factor de riesgo
  let casesByRisk: { risk_type: RiskType; count: number }[] = [];
  try {
    casesByRisk = db
      .prepare(
        `SELECT risk_type, COUNT(*) as count 
         FROM case_files 
         WHERE institution_id = ? 
         GROUP BY risk_type 
         ORDER BY count DESC`
      )
      .all(institutionId) as { risk_type: RiskType; count: number }[];
  } catch (err) {
    console.error("[ReporteEjecutivo] Error consultando riesgos:", err);
  }

  // Atenciones diarias
  let dailyAttentions = 0;
  try {
    const res = db
      .prepare("SELECT COUNT(*) as n FROM daily_attentions WHERE institution_id = ?")
      .get(institutionId) as any;
    dailyAttentions = res?.n || 0;
  } catch (err) {
    console.error("[ReporteEjecutivo] Error consultando atenciones diarias:", err);
  }

  // Derivaciones externas (vinculadas a través de case_files)
  let referralsCount = 0;
  try {
    const res = db
      .prepare(
        `SELECT COUNT(*) as n 
         FROM referrals r 
         INNER JOIN case_files cf ON r.case_file_id = cf.id 
         WHERE cf.institution_id = ?`
      )
      .get(institutionId) as any;
    referralsCount = res?.n || 0;
  } catch (err) {
    console.error("[ReporteEjecutivo] Error consultando derivaciones:", err);
  }

  // Alertas tempranas
  let alertsCount = 0;
  try {
    const res = db
      .prepare("SELECT COUNT(*) as n FROM teacher_alerts WHERE institution_id = ?")
      .get(institutionId) as any;
    alertsCount = res?.n || 0;
  } catch (err) {
    console.error("[ReporteEjecutivo] Error consultando alertas:", err);
  }

  // Actividades de promoción y prevención
  let activities = { total: 0, participantes: 0 };
  try {
    const res = db
      .prepare(
        `SELECT COUNT(*) as total, COALESCE(SUM(participants_count), 0) as participantes 
         FROM activities WHERE institution_id = ?`
      )
      .get(institutionId) as any;
    if (res) {
      activities = { total: res.total || 0, participantes: res.participantes || 0 };
    }
  } catch (err) {
    console.error("[ReporteEjecutivo] Error consultando actividades:", err);
  }

  const resolutionRate = caseStats.total > 0 ? Math.round((caseStats.cerrados / caseStats.total) * 100) : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Botones de acción superiores (no-print) */}
      <div className="no-print flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <Link href="/reportes" className="btn-secondary text-xs flex items-center gap-1">
          ← Volver a Reportes
        </Link>

        <PrintButton fileNamePrefix="Informe_Ejecutivo_Distrital_DECE" className="flex items-center gap-2" />
      </div>

      {/* DOCUMENTO FORMAL EJECUTIVO PARA EL DISTRITO */}
      <div
        id="printable-content"
        className="card p-6 md:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 print:border-none print:shadow-none print:p-0"
      >
        {/* Encabezado Oficial Ministerio de Educación */}
        <div className="border-b-2 border-slate-900 dark:border-slate-600 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {institution?.seal_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={institution.seal_image}
                alt="Sello"
                className="h-14 w-14 rounded-lg object-contain p-1 border border-slate-200 dark:border-slate-700 shrink-0"
              />
            ) : (
              <div className="h-14 w-14 rounded-lg bg-slate-900 text-white flex items-center justify-center text-2xl shrink-0">
                🏛️
              </div>
            )}

            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Ministerio de Educación del Ecuador
              </div>
              <h1 className="text-lg md:text-xl font-extrabold uppercase tracking-tight text-slate-900 dark:text-slate-100">
                {institution?.name || "Institución Educativa"}
              </h1>
              <div className="text-xs font-semibold text-brand-700 dark:text-brand-400">
                DEPARTAMENTO DE CONSEJERÍA ESTUDIANTIL (DECE)
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right text-xs font-medium text-slate-600 dark:text-slate-400 space-y-0.5 font-mono">
            <div>AMIE: <strong className="text-slate-900 dark:text-slate-200">{institution?.amie_code || "N/A"}</strong></div>
            <div>Distrito: <strong className="text-slate-900 dark:text-slate-200">{institution?.district || "Distrito Educativo"}</strong></div>
            <div>Zona: <strong className="text-slate-900 dark:text-slate-200">{institution?.zona || "Coordinación Zonal"}</strong></div>
            <div>Fecha: <strong className="text-slate-900 dark:text-slate-200">{formatDate(new Date().toISOString().slice(0, 10))}</strong></div>
          </div>
        </div>

        {/* Título del Informe */}
        <div className="text-center my-6">
          <h2 className="text-base md:text-lg font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2 inline-block px-4">
            Informe Ejecutivo de Gestión y Rendición de Cuentas
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Consolidado Institucional de Acompañamiento Psicoemocional, Bienestar Integral y Casos DECE
          </p>
        </div>

        {/* Resumen Cuantitativo Clave (Métricas de Impacto) */}
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-3 border-l-4 border-brand-600 pl-2">
            1. Indicadores Generales de Cobertura e Impacto
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60">
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalStudents}</div>
              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase mt-0.5">Estudiantes Matriculados</div>
            </div>

            <div className="p-3.5 rounded-lg border border-brand-200 dark:border-brand-900/60 bg-brand-50/50 dark:bg-brand-950/40">
              <div className="text-2xl font-bold text-brand-800 dark:text-brand-300">{dailyAttentions}</div>
              <div className="text-[11px] font-semibold text-brand-900 dark:text-brand-200 uppercase mt-0.5">Atenciones Brindadas</div>
            </div>

            <div className="p-3.5 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/40">
              <div className="text-2xl font-bold text-amber-800 dark:text-amber-300">{caseStats.total}</div>
              <div className="text-[11px] font-semibold text-amber-900 dark:text-amber-200 uppercase mt-0.5">Casos Formales Abiertos</div>
            </div>

            <div className="p-3.5 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/40">
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{resolutionRate}%</div>
              <div className="text-[11px] font-semibold text-emerald-900 dark:text-emerald-200 uppercase mt-0.5">Tasa de Resolución / Cierre</div>
            </div>
          </div>
        </div>

        {/* Estado de los Expedientes */}
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-3 border-l-4 border-brand-600 pl-2">
            2. Estado Procesal de Expedientes Estudiantiles
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 flex justify-between items-center">
              <span className="font-medium text-slate-700 dark:text-slate-300">En Seguimiento Activo:</span>
              <span className="font-bold text-base text-blue-700 dark:text-blue-400">{caseStats.seguimiento}</span>
            </div>
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 flex justify-between items-center">
              <span className="font-medium text-slate-700 dark:text-slate-300">Casos Cerrados / Resueltos:</span>
              <span className="font-bold text-base text-emerald-700 dark:text-emerald-400">{caseStats.cerrados}</span>
            </div>
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 flex justify-between items-center">
              <span className="font-medium text-slate-700 dark:text-slate-300">Prioridad Alta / Emergente:</span>
              <span className="font-bold text-base text-rose-600 dark:text-rose-400">{caseStats.altaPrioridad}</span>
            </div>
          </div>
        </div>

        {/* Distribución por Factores de Riesgo */}
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-3 border-l-4 border-brand-600 pl-2">
            3. Distribución por Tipología de Riesgo y Vulneración
          </h3>

          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-2.5 text-left">Factor de Riesgo Detectado</th>
                  <th className="p-2.5 text-center w-24">N° Casos</th>
                  <th className="p-2.5 text-left w-48">Proporción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {casesByRisk.map((r) => {
                  const pct = caseStats.total > 0 ? Math.round((r.count / caseStats.total) * 100) : 0;
                  return (
                    <tr key={r.risk_type} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="p-2.5 font-medium text-slate-800 dark:text-slate-200">
                        {RISK_TYPE_LABELS[r.risk_type] || r.risk_type}
                      </td>
                      <td className="p-2.5 text-center font-bold font-mono text-slate-900 dark:text-slate-100">{r.count}</td>
                      <td className="p-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div className="bg-brand-600 h-2 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 w-8">{pct}%</span>
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
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-3 border-l-4 border-brand-600 pl-2">
            4. Articulación Externa y Actividades Preventivas
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 space-y-1.5">
              <div className="font-bold text-slate-900 dark:text-slate-100">Derivaciones Interinstitucionales Externas</div>
              <p className="text-slate-600 dark:text-slate-300">
                Se tramitaron <strong className="text-slate-900 dark:text-slate-100">{referralsCount}</strong> derivaciones a entidades del Sistema de Protección Integral
                (Ministerio de Salud Pública, Fiscalía General del Estado, Juntas Cantonales de Protección de Derechos).
              </p>
            </div>

            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 space-y-1.5">
              <div className="font-bold text-slate-900 dark:text-slate-100">Talleres y Promoción de Convivencia Armónica</div>
              <p className="text-slate-600 dark:text-slate-300">
                Se ejecutaron <strong className="text-slate-900 dark:text-slate-100">{activities.total}</strong> actividades formativas y talleres de sensibilización con
                un alcance total de <strong className="text-slate-900 dark:text-slate-100">{activities.participantes}</strong> miembros de la comunidad educativa.
              </p>
            </div>
          </div>
        </div>

        {/* Firmas de Responsabilidad Oficial */}
        <div className="mt-14 pt-8 border-t border-slate-300 dark:border-slate-700 grid grid-cols-2 gap-8 text-center text-xs">
          <div className="space-y-1">
            <div className="border-b border-slate-400 dark:border-slate-600 w-48 mx-auto h-12" />
            <div className="font-bold text-slate-900 dark:text-slate-100 uppercase">Coordinador(a) / Analista DECE</div>
            <div className="text-slate-500 dark:text-slate-400">Departamento de Consejería Estudiantil</div>
          </div>

          <div className="space-y-1">
            <div className="border-b border-slate-400 dark:border-slate-600 w-48 mx-auto h-12" />
            <div className="font-bold text-slate-900 dark:text-slate-100 uppercase">Rector(a) / Director(a)</div>
            <div className="text-slate-500 dark:text-slate-400">Máxima Autoridad Institucional</div>
          </div>
        </div>
      </div>
    </div>
  );
}
