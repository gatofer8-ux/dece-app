import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { DB_PATH, db } from "@/lib/db";
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

  // --- Datos para ADMIN/DECE: conteo de su institución ---
  let instStudentCount = 0;
  let instCaseCount = 0;
  if (!isSuperadmin) {
    const institutionId = requireInstitutionId(session);
    instStudentCount = (db.prepare("SELECT COUNT(*) c FROM students WHERE institution_id = ?").get(institutionId) as { c: number }).c;
    instCaseCount = (db.prepare("SELECT COUNT(*) c FROM case_files WHERE institution_id = ?").get(institutionId) as { c: number }).c;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Copias de Seguridad y Respaldo de Datos"
        description="Descarga copias de la información para custodia y seguridad."
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
          <div className="card p-4">
            <div className="text-xs text-slate-500 uppercase font-semibold">Datos de tu institución</div>
            <div className="text-2xl font-bold text-brand-900 mt-1">
              {instStudentCount} <span className="text-sm font-normal text-slate-500">estudiantes</span> · {instCaseCount} <span className="text-sm font-normal text-slate-500">casos</span>
            </div>
          </div>

          <div className="card p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900">Copia de los datos de tu institución (JSON)</h3>
            <p className="text-xs text-slate-600">
              Descarga un archivo JSON con estudiantes, casos, bitácoras, actas, fichas, citas y alertas
              <strong> de tu institución únicamente</strong>. No incluye usuarios ni la bitácora de auditoría.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
              <p className="font-semibold">🔒 Información sensible de menores</p>
              <p>Guarda el archivo solo en dispositivos institucionales cifrados o bóvedas autorizadas.</p>
            </div>
            <a href="/api/backup/institution" className="btn-primary inline-flex items-center gap-2 text-sm px-4 py-2.5">
              <span>⬇️</span> Descargar copia de mi institución (.json)
            </a>
          </div>
        </>
      )}
    </div>
  );
}
