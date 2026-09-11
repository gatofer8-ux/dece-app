import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { generateWorkshopMaterialDocx } from "@/lib/talleres/workshopMaterialsDocx";
import { getWorkshopById } from "@/lib/talleres/talleresData";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; materialId: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { user } = session;

    const workshop = getWorkshopById(params.id);
    if (!workshop) {
      return NextResponse.json({ error: "Taller no encontrado" }, { status: 404 });
    }

    // Regla de seguridad esencial: Solo se pueden descargar materiales explícitamente registrados
    // Los guiones metodológicos bajo NINGÚN concepto se descargan
    const material = workshop.downloadableMaterials.find((m) => m.id === params.materialId);
    if (!material) {
      return NextResponse.json(
        { error: "Material no disponible para descarga o acceso no autorizado." },
        { status: 404 }
      );
    }

    let institutionName = "Institución Educativa";
    if (user.institution_id) {
      const instRow = db
        .prepare("SELECT name FROM institutions WHERE id = ?")
        .get(user.institution_id) as { name: string } | undefined;
      if (instRow?.name) institutionName = instRow.name;
    }

    const result = await generateWorkshopMaterialDocx(params.id, params.materialId, institutionName);
    if (!result) {
      return NextResponse.json({ error: "Error al generar el documento Word" }, { status: 500 });
    }

    return new NextResponse(result.buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Error al procesar la descarga" },
      { status: 500 }
    );
  }
}
