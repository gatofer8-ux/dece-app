import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { getSignatureDefaults } from "@/lib/caseDocumentDefaults";
import { parseEneisInformeDeceActividades } from "@/lib/eneis/eneisInformeDece";
import { getEneisInformeDeceNumero } from "@/lib/eneis/eneisInformeDeceNumero";
import { generateEneisInformeDeceDocx } from "@/lib/eneis/eneisInformeDeceDocx";
import type { EneisInformeDeceRow, InstitutionRow } from "@/lib/types";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const institutionId = session.user.institution_id;

  const informe = db
    .prepare("SELECT * FROM eneis_informes_dece WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as EneisInformeDeceRow | undefined;
  if (!informe) return NextResponse.json({ error: "Informe no encontrado" }, { status: 404 });

  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;
  const sig = getSignatureDefaults(session as never, institutionId as string);
  const numero = getEneisInformeDeceNumero(institutionId as string, informe.id);
  const actividades = parseEneisInformeDeceActividades(informe.actividades_json);

  const buffer = await generateEneisInformeDeceDocx(informe, actividades, {
    numero: String(numero),
    institutionName: institution.name,
    amieCode: institution.amie_code || "",
    firmaNombre: sig.deceProfessional.fullName,
    firmaRol: sig.deceProfessional.role,
  });
  const safe = `Informe_Actividades_DECE_N${numero}_${informe.periodo}`.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 90);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${safe}.docx"`,
    },
  });
}
