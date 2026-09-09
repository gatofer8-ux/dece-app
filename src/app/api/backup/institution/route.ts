import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, requireInstitutionId } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { INSTITUTION_SCOPED_TABLES } from "@/lib/scopedDb";

export const dynamic = "force-dynamic";

/**
 * Exporta en JSON TODOS los registros de la institución de la sesión.
 *
 * A diferencia de `/api/backup/download` (archivo .db completo con datos de
 * todas las instituciones, solo SUPERADMIN), esta ruta está limitada a los
 * datos de UNA institución y sirve para que un ADMIN / DECE guarde su propia
 * copia. No incluye `users` (hashes de contraseña) ni `audit_logs`.
 */
const EXPORT_TABLES = [...INSTITUTION_SCOPED_TABLES].filter(
  (t) => t !== "users" && t !== "audit_logs"
);

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session?.user || !["ADMIN", "DECE"].includes(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let institutionId: string;
  try {
    institutionId = requireInstitutionId(session);
  } catch {
    return NextResponse.json({ error: "Sesión sin institución" }, { status: 400 });
  }

  const data: Record<string, unknown[]> = {};
  for (const table of EXPORT_TABLES) {
    try {
      data[table] = db
        .prepare(`SELECT * FROM ${table} WHERE institution_id = ?`)
        .all(institutionId);
    } catch {
      // La tabla puede no existir todavía en instalaciones antiguas.
      data[table] = [];
    }
  }

  const institution = db
    .prepare("SELECT id, name, amie_code FROM institutions WHERE id = ?")
    .get(institutionId);

  const payload = {
    meta: {
      exported_at: new Date().toISOString(),
      exported_by: { id: session.user.id, name: session.user.name, role: session.user.role },
      institution,
      schema_note: "Export por institución. No incluye usuarios ni bitácora de auditoría.",
    },
    data,
  };

  logAudit({
    userId: session.user.id,
    action: "EXPORTAR",
    entityType: "InstitutionBackup",
    details: `Export JSON de la institución (${EXPORT_TABLES.length} tablas)`,
    institutionId,
  });

  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="respaldo_institucion_${timestamp}.json"`,
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
