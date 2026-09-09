import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { generateRestorativeCircleDocx } from "@/lib/restorativeCircleDocxExport";
import type { RestorativeCircleConsentRow } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const institutionId = session.user.institution_id;
  const consent = db
    .prepare("SELECT * FROM restorative_circle_consents WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as RestorativeCircleConsentRow | undefined;

  if (!consent) {
    return NextResponse.json(
      { error: "Consentimiento no encontrado" },
      { status: 404 }
    );
  }

  try {
    const docxBuffer = await generateRestorativeCircleDocx(consent);

    const safeStudent = (consent.student_name || "Estudiante")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_\-]/g, "_")
      .substring(0, 30);
    const filename = `Consentimiento_Circulo_Restaurativo_${safeStudent}.docx`;

    return new NextResponse(docxBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": docxBuffer.length.toString(),
      },
    });
  } catch (err: any) {
    console.error("Error al generar docx de circulo restaurativo:", err);
    return NextResponse.json(
      { error: "Error al generar archivo Word: " + (err?.message || "Desconocido") },
      { status: 500 }
    );
  }
}
