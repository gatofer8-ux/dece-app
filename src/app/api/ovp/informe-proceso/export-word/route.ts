import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getOvpProcessReportData } from "@/lib/ovp/ovpProcessReportData";
import { generateOvpProcessReportDocx } from "@/lib/ovp/ovpProcessReportDocx";

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const institutionId = session.user.institution_id;
  if (!institutionId) {
    return NextResponse.json({ error: "Institución requerida" }, { status: 400 });
  }
  const data = getOvpProcessReportData(institutionId);
  if (!data || !data.institution) {
    return NextResponse.json({ error: "Institución no encontrada" }, { status: 404 });
  }

  const buffer = await generateOvpProcessReportDocx(data);
  const cleanName = (data.institution.name || "Institucion")
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .slice(0, 50);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="Informe_Tecnico_Proceso_OVP_${cleanName}.docx"`,
    },
  });
}
