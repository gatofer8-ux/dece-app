import Link from "next/link";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { DB_PATH, db } from "@/lib/db";
import { getInstitutionCustodyAudit } from "@/lib/physicalCustodyAudit";
import fs from "fs";

export default async function RespaldosPage() {
  const session = await requireRole(["SUPERADMIN", "ADMIN", "DECE"]);
  const isSuperadmin = session.user.role === "SUPERADMIN";

  // --- Datos para SUPERADMIN: archivo .db completo ---
  let fileSizeStr = "0 KB";
  let lastModifiedStr = "—";
  if (isSuperadmin && fs.existsSync(DB_PATH)) {
    const stats = fs.statSync(DB_PATH);
    fileSizeStr = `${(stats.size / 1024).toFixed(1)} KB`;
    lastModifiedStr = new Date(stats.mtime).toLocaleString("es-EC");
  }

  // --- Datos para ADMIN/DECE: conteo de su institución y auditoría de custodia ---
  let instStudentCount = 0;
  let instCaseCount = 0;
  let custodyAudit: ReturnType<typeof getInstitutionCustodyAudit> | null = null;
  if (!isSuperadmin) {
    const institutionId = requireInstitutionId(session);
    instStudentCount = (db.prepare("SELECT COUNT(*) c FROM students WHERE institution_id = ?").get(institutionId) as { c: number }).c;
    instCaseCount = (db.prepare("SELECT COUNT(*) c FROM case_files WHERE institution_id = ?").get(institutionId) as { c: number }).c;
    custodyAudit = getInstitutionCustodyAudit(institutionId);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Copias de Seguridad, Respaldo y Custodia Documental"
        description="Descarga copias de la información institucional, respaldo de expedientes y fiscalización de custodia física."
      />

      {isSuperadmin ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card p-4">
              <div className="text-xs text-slate-500 uppercase font-semibold">Tamaño de la base de datos</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{fileSizeStr}</div>
              <div className="text-xs text-slate-400 mt-0.5">Archivo SQLite persistente (todas las instituciones)</div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-slate-500 uppercase font-semibold">Última modificación</div>
              <div className="text-sm font-bold text-slate-800 mt-2">{lastModifiedStr}</div>
            </div>
          </div>

          <div className="card p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900">Copia completa de la base de datos (.db)</h3>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
              <p className="font-semibold">🔒 Contiene datos de TODAS las instituciones</p>
              <p>Incluye relatos confidenciales de menores y hashes de contraseñas. Guárdalo solo en dispositivos institucionales cifrados.</p>
            </div>
            <a href="/api/backup/download" className="btn-primary inline-flex items-center gap-2 text-sm px-4 py-2.5">
              <span>⬇️</span> Descargar respaldo completo (.db)
            </a>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card p-4">
              <div className="text-xs text-slate-500 uppercase font-semibold">Expedientes de tu institución</div>
              <div className="text-2xl font-bold text-brand-900 mt-1">
                {instStudentCount} <span className="text-sm font-normal text-slate-500">estudiantes</span> · {instCaseCount} <span className="text-sm font-normal text-slate-500">casos</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Registros activos asignados a tu institución educativa.</p>
            </div>

            {custodyAudit && (
              <div className="card p-4 bg-gradient-to-br from-slate-50 to-amber-50/30 dark:from-slate-900 dark:to-amber-950/20">
                <div className="text-xs text-amber-800 dark:text-amber-300 uppercase font-semibold flex items-center justify-between">
                  <span>Custodia y Archivo Físico</span>
                  <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400">
                    🟢 {custodyAudit.globalComplianceRate}% Conforme
                  </span>
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {custodyAudit.archivedDocs} <span className="text-sm font-normal text-slate-500">/ {custodyAudit.totalDocs} docs</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 mt-1">
                  <span>📁 {custodyAudit.digitalDocs} digitalizados ({custodyAudit.globalDigitalRate}%)</span>
                  {custodyAudit.pendingDocs > 0 ? (
                    <span className="text-rose-600 font-medium">🔴 {custodyAudit.pendingDocs} pendientes</span>
                  ) : (
                    <span className="text-emerald-700 font-medium">✓ 100% archivados</span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Opción 1: Respaldo oficial Excel con custodia */}
            <div className="card p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>📊</span> Matriz de Auditoría y Casos (Excel)
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Genera la matriz de consolidación con desglose de casos, ubicaciones de carpetas físicas,
                  actividades, citas, derivaciones y la hoja de auditoría de custodia distrital.
                </p>
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-lg p-3 text-xs text-emerald-900 dark:text-emerald-200">
                  <p className="font-medium">✓ Formato oficial listo para inspección y auditoría Distrital.</p>
                </div>
              </div>
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                <a
                  href="/api/reportes/export"
                  className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs px-3.5 py-2"
                >
                  <span>⬇️</span> Descargar Excel (.xlsx)
                </a>
                <Link
                  href="/reportes/ejecutivo#auditoria-custodia"
                  className="btn-secondary w-full sm:w-auto text-xs text-center px-3 py-2"
                >
                  Ver Semáforo Distrital →
                </Link>
              </div>
            </div>

            {/* Opción 2: Respaldo JSON completo de datos */}
            <div className="card p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>🔒</span> Copia de Datos de la Institución (JSON)
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Descarga un archivo JSON con todos los estudiantes, casos, bitácoras, actas, fichas, citas, alertas
                  y planes bianuales de tu institución únicamente.
                </p>
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-lg p-3 text-xs text-amber-900 dark:text-amber-200">
                  <p className="font-semibold">🔒 Información confidencial de menores</p>
                  <p>Guarda el archivo únicamente en medios institucionales seguros o cifrados.</p>
                </div>
              </div>
              <div className="pt-2">
                <a
                  href="/api/backup/institution"
                  className="btn-secondary w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs px-3.5 py-2"
                >
                  <span>⬇️</span> Descargar copia JSON (.json)
                </a>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
