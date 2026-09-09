import { requireRole } from "@/lib/session";
import { PageHeader, Badge } from "@/components/ui";
import { DB_PATH, db } from "@/lib/db";
import fs from "fs";

export default async function RespaldosPage() {
  await requireRole(["ADMIN", "DECE"]);

  let fileSizeStr = "0 KB";
  let lastModifiedStr = "—";

  if (fs.existsSync(DB_PATH)) {
    const stats = fs.statSync(DB_PATH);
    fileSizeStr = `${(stats.size / 1024).toFixed(1)} KB`;
    lastModifiedStr = new Date(stats.mtime).toLocaleString("es-EC");
  }

  // Contar registros para mostrar estado
  const studentCount = (db.prepare("SELECT COUNT(*) as c FROM students").get() as { c: number }).c;
  const caseCount = (db.prepare("SELECT COUNT(*) as c FROM case_files").get() as { c: number }).c;
  const auditCount = (db.prepare("SELECT COUNT(*) as c FROM audit_logs").get() as { c: number }).c;

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Copias de Seguridad y Respaldo de Datos"
        description="Descarga copias íntegras de la base de datos para custodia y seguridad de la información institucional."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-xs text-slate-500 uppercase font-semibold">Tamaño de la Base de Datos</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{fileSizeStr}</div>
          <div className="text-xs text-slate-400 mt-0.5">Archivo SQLite persistente</div>
        </div>

        <div className="card p-4">
          <div className="text-xs text-slate-500 uppercase font-semibold">Estudiantes & Casos</div>
          <div className="text-2xl font-bold text-brand-900 mt-1">
            {studentCount} <span className="text-sm font-normal text-slate-500">est.</span> · {caseCount} <span className="text-sm font-normal text-slate-500">casos</span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Total registros activos</div>
        </div>

        <div className="card p-4">
          <div className="text-xs text-slate-500 uppercase font-semibold">Última Modificación</div>
          <div className="text-sm font-bold text-slate-800 mt-2">{lastModifiedStr}</div>
          <div className="text-xs text-emerald-600 mt-0.5 font-medium">✓ Base de datos operativa</div>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-brand-100 text-brand-800 flex items-center justify-center text-2xl shrink-0">
            💾
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-900">
              Descargar Copia de Seguridad Completa (.db)
            </h3>
            <p className="text-xs text-slate-600">
              Genera una instantánea completa de la base de datos SQLite con todos los estudiantes, expedientes de casos, bitácoras, actas, fichas del Ministerio, citas, alertas y registros de auditoría.
            </p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 space-y-1">
          <p className="font-semibold">🔒 Protección de datos sensibles:</p>
          <p>
            El archivo descargado contiene información confidencial de estudiantes menores de edad. Guárdalo únicamente en dispositivos institucionales cifrados o en bóvedas de seguridad autorizadas.
          </p>
        </div>

        <div className="pt-2">
          <a
            href="/api/backup/download"
            className="btn-primary inline-flex items-center gap-2 text-sm px-4 py-2.5 shadow-sm"
          >
            <span>⬇️</span> Descargar Respaldo Ahora (.db)
          </a>
        </div>
      </div>
    </div>
  );
}
