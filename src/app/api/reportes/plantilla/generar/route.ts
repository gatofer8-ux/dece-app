import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { queryCasesForReport } from "@/lib/templateReports/caseReportQuery";
import { fillExcelTemplate } from "@/lib/templateReports/excelTemplateFiller";
import { fillDocxTemplate } from "@/lib/templateReports/docxTemplateFiller";
import { saveTemplateMapping } from "@/lib/templateReports/templateMapper";
import { computeBufferHash } from "@/lib/templateReports/templateInspector";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const institutionId = session.user.institution_id;
  if (!institutionId) {
    return NextResponse.json({ error: "Institución requerida" }, { status: 400 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const mappingJson = formData.get("mapping") as string | null;
    const filtersJson = formData.get("filters") as string | null;
    const sheetName = (formData.get("sheetName") as string) || "";
    const headerRowIndex = parseInt((formData.get("headerRowIndex") as string) || "1", 10);
    const dataStartRow = parseInt((formData.get("dataStartRow") as string) || "2", 10);

    if (!file) {
      return NextResponse.json({ error: "Archivo de plantilla requerido." }, { status: 400 });
    }

    const mapping = mappingJson ? JSON.parse(mappingJson) : {};
    const filters = filtersJson ? JSON.parse(filtersJson) : {};

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileHash = computeBufferHash(buffer);
    const ext = file.name.toLowerCase().split(".").pop() || "xlsx";
    const fileType = ext === "docx" ? "DOCX" : "XLSX";

    // 1. Guardar el mapeo para reutilizaciones futuras
    saveTemplateMapping({
      templateHash: fileHash,
      templateName: file.name,
      fileType,
      mapping,
      headerRowIndex,
      dataStartRow,
      sheetName,
      userId: session.user.id,
    });

    // 2. Consultar casos filtrados
    const cases = queryCasesForReport(institutionId, filters);

    // 3. Rellenar plantilla in-situ
    let outBuffer: Buffer;
    let warningsCount = 0;

    if (fileType === "DOCX") {
      const res = await fillDocxTemplate({
        templateBuffer: buffer,
        mapping,
        data: cases,
      });
      outBuffer = res.buffer;
    } else {
      const res = await fillExcelTemplate({
        templateBuffer: buffer,
        sheetIndexOrName: sheetName || 0,
        mapping,
        data: cases,
        headerRowIndex,
        dataStartRow,
      });
      outBuffer = res.buffer;
      warningsCount = res.warnings.length;
    }

    // 4. Registrar en historial
    try {
      db.prepare(`
        INSERT INTO report_generation_history
          (id, institution_id, template_name, file_type, filters_json, records_count, generated_by)
        VALUES
          (@id, @institution_id, @template_name, @file_type, @filters_json, @records_count, @generated_by)
      `).run({
        id: randomUUID(),
        institution_id: institutionId,
        template_name: file.name,
        file_type: fileType,
        filters_json: JSON.stringify(filters),
        records_count: cases.length,
        generated_by: session.user.id,
      });
    } catch (e) {
      console.warn("[api/reportes/plantilla/generar] Error guardando historial:", e);
    }

    // 5. Retornar archivo para descarga
    const outName = `Reporte_${file.name.replace(/\.[^/.]+$/, "")}_${new Date().toISOString().slice(0, 10)}.${ext}`;
    const mimeType =
      fileType === "DOCX"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    return new NextResponse(outBuffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(outName)}"`,
        "X-Report-Records": String(cases.length),
        "X-Report-Warnings": String(warningsCount),
      },
    });
  } catch (err: any) {
    console.error("[api/reportes/plantilla/generar] Error:", err);
    return NextResponse.json({ error: err?.message || "Error al generar el reporte." }, { status: 500 });
  }
}
