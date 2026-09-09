import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { parseNaturalLanguageFilter } from "@/lib/templateReports/caseReportQuery";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { prompt } = body;
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Prompt no proporcionado" }, { status: 400 });
    }

    const filters = await parseNaturalLanguageFilter(prompt);
    return NextResponse.json({ success: true, filters });
  } catch (err: any) {
    console.error("[api/reportes/plantilla/traducir-filtro] Error:", err);
    return NextResponse.json({ error: err?.message || "Error al traducir filtros con IA." }, { status: 500 });
  }
}
