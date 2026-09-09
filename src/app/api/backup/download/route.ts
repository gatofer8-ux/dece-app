import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { DB_PATH } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import fs from "fs";

export const dynamic = "force-dynamic";

/**
 * Descarga del archivo COMPLETO de base de datos.
 *
 * El archivo SQLite contiene los datos de TODAS las instituciones (estudiantes,
 * relatos confidenciales de casos de menores, hashes de contraseñas). Por eso
 * solo el rol SUPERADMIN — que ya tiene alcance global — puede descargarlo, y
 * nunca en modo demostración. Un ADMIN de institución que necesite un respaldo
 * de SUS datos debe usar la exportación filtrada por institución.
 */
export async function GET(_req: NextRequest) {
  const session = await getSession();

  if (!session?.user || session.user.role !== "SUPERADMIN" || session.user.is_demo_mode) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (!fs.existsSync(DB_PATH)) {
    return NextResponse.json({ error: "Archivo de base de datos no encontrado" }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(DB_PATH);
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const fileName = `respaldo_dece_db_${timestamp}.db`;

  logAudit({
    userId: session.user.id,
    action: "EXPORTAR",
    entityType: "DatabaseBackup",
    details: `Descarga del archivo completo de base de datos (${fileBuffer.length} bytes)`,
    institutionId: session.user.institution_id ?? undefined,
  });

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": "application/x-sqlite3",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": String(fileBuffer.length),
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
