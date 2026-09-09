import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { inspectTemplate } from "@/lib/templateReports/templateInspector";
import { getSavedMappingByHash, generateAutoMapping } from "@/lib/templateReports/templateMapper";
import { DECE_FIELDS_CATALOG } from "@/lib/templateReports/deceFieldsCatalog";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const inspection = await inspectTemplate(buffer, file.name);

    const saved = getSavedMappingByHash(inspection.fileHash);
    let savedMapping = undefined;
    if (saved) {
      try {
        savedMapping = JSON.parse(saved.mapping_json);
      } catch {}
    }

    const currentSheet = inspection.sheets[inspection.suggestedSheetIndex] || inspection.sheets[0];
    const autoMapping = currentSheet ? generateAutoMapping(currentSheet.columns) : {};

    return NextResponse.json({
      success: true,
      inspection,
      savedMapping,
      autoMapping,
      catalog: DECE_FIELDS_CATALOG,
    });
  } catch (err: any) {
    console.error("[api/reportes/plantilla/analizar] Error:", err);
    return NextResponse.json({ error: err?.message || "Error al analizar la plantilla." }, { status: 500 });
  }
}
