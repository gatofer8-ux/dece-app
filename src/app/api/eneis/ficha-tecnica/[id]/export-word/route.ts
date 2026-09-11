import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { generateEneisFichaTecnicaDocx } from "@/lib/eneis/eneisFichaTecnicaDocx";
import {
  parseFuncionarios,
  parseTemasSeleccionados,
  parseRecursosSeleccionados,
  parseCronograma,
  parseAvances,
  buildFirmas,
  ENEIS_FIRMAS_ESCOLARES_ROLES,
  ENEIS_FIRMAS_DISTRITALES_ROLES,
} from "@/lib/eneis/eneisFichaTecnica";
import type { EneisFichaTecnicaRow, InstitutionRow } from "@/lib/types";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const institutionId = session.user.institution_id;

  const f = db
    .prepare("SELECT * FROM eneis_fichas_tecnicas WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as EneisFichaTecnicaRow | undefined;
  if (!f) return NextResponse.json({ error: "Ficha técnica no encontrada" }, { status: 404 });
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;

  const buffer = await generateEneisFichaTecnicaDocx(
    f,
    parseFuncionarios(f.funcionarios_json),
    f.nivel_preparacion_index,
    parseTemasSeleccionados(f.temas_seleccionados_json),
    parseRecursosSeleccionados(f.recursos_seleccionados_json),
    parseCronograma(f.cronograma_json),
    parseAvances(f.avances_json),
    buildFirmas(f.firmas_escolares_json, ENEIS_FIRMAS_ESCOLARES_ROLES),
    buildFirmas(f.firmas_distritales_json, ENEIS_FIRMAS_DISTRITALES_ROLES),
    institution.name
  );
  const safe = `Ficha_Tecnica_Equipo_Escolar_${f.fecha_elaboracion || ""}`.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 90);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${safe}.docx"`,
    },
  });
}
