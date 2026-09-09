import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { DB_PATH } from "@/lib/db";
import fs from "fs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (!fs.existsSync(DB_PATH)) {
    return NextResponse.json({ error: "Archivo de base de datos no encontrado" }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(DB_PATH);
  const timestamp = new Date().toISOString().slice(0, 10);
  const fileName = `respaldo_dece_db_${timestamp}.db`;

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": "application/x-sqlite3",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
