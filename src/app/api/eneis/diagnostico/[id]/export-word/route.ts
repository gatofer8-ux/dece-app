import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { generateEneisDiagnosticoDocx } from "@/lib/eneis/eneisDiagnosticoDocx";
import {
  parseEneisDiagnosticoObjetivos,
  parseEneisDiagnosticoActividades,
  parseEneisDiagnosticoResultados,
  parseEneisDiagnosticoResponsables,
} from "@/lib/eneis/eneisDiagnostico";
import type { EneisDiagnosticoRow, InstitutionRow } from "@/lib/types";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const institutionId = session.user.institution_id;

  const d = db
    .prepare("SELECT * FROM eneis_diagnosticos WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as EneisDiagnosticoRow | undefined;
  if (!d) return NextResponse.json({ error: "Diagnóstico no encontrado" }, { status: 404 });
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;

  const buffer = await generateEneisDiagnosticoDocx(
    d,
    parseEneisDiagnosticoObjetivos(d.objetivos_especificos_json),
    parseEneisDiagnosticoActividades(d.actividades_json),
    parseEneisDiagnosticoResultados(d.resultados_json),
    parseEneisDiagnosticoResponsables(d.responsables_json),
    institution.name
  );
  const safe = `Diagnostico_Institucional_ENEIS_${d.fecha || ""}`.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 90);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${safe}.docx"`,
    },
  });
}
