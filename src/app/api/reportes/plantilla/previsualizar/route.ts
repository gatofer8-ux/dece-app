import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { queryCasesForReport } from "@/lib/templateReports/caseReportQuery";
import { inspectTemplate } from "@/lib/templateReports/templateInspector";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const institutionId = session.user.institution_id;
  if (!institutionId) {
    return NextResponse.json({ error: "Institución no especificada" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { mapping, filters, columns } = body;

    const cases = queryCasesForReport(institutionId, filters || {});

    // Preparar preview de filas
    const previewRows = cases.slice(0, 15).map((caseRec, rowIdx) => {
      const rowObj: Record<string, any> = { _rowNumber: rowIdx + 1 };
      for (const [colKey, fieldKey] of Object.entries(mapping || {})) {
        if (fieldKey) {
          rowObj[colKey] = caseRec[fieldKey as string] ?? "";
        }
      }
      return rowObj;
    });

    return NextResponse.json({
      success: true,
      totalCases: cases.length,
      previewRows,
    });
  } catch (err: any) {
    console.error("[api/reportes/plantilla/previsualizar] Error:", err);
    return NextResponse.json({ error: err?.message || "Error al generar la previsualización." }, { status: 500 });
  }
}
