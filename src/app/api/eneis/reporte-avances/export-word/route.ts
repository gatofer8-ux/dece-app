import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { computeReporteAvances } from "@/lib/eneis/eneisReporteAvances";
import { generateEneisReporteAvancesDocx } from "@/lib/eneis/eneisReporteAvancesDocx";
import type { InstitutionRow } from "@/lib/types";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const institutionId = session.user.institution_id;
  if (!institutionId) return NextResponse.json({ error: "Sin institución" }, { status: 400 });

  const periodo = req.nextUrl.searchParams.get("mes") || "";
  if (!/^\d{4}-\d{2}$/.test(periodo)) return NextResponse.json({ error: "Mes inválido" }, { status: 400 });

  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;
  const { rows, numero } = computeReporteAvances(institutionId, periodo);

  const firmaNombre = [institution.rector_title, institution.rector_name].filter(Boolean).join(" ") || institution.rector_name || "";
  const buffer = await generateEneisReporteAvancesDocx(rows, {
    periodo,
    numero,
    institutionName: institution.name,
    amieCode: institution.amie_code || "",
    firmaNombre,
    firmaRol: institution.rector_role || "RECTOR/A",
  });
  const safe = `Reporte_Avances_N${numero}_${periodo}`.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 90);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${safe}.docx"`,
    },
  });
}
