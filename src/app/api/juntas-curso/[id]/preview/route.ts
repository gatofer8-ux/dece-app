import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { getCourseBoardReportById } from "@/lib/juntasCurso";
import { generateCourseBoardReportDocx } from "@/lib/docxJuntasCurso";
import { convertDocxBufferToPdf, convertPdfBufferToPngPages } from "@/lib/docxToPdf";
import type { InstitutionRow } from "@/lib/types";
import fs from "fs";
import path from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const institutionId = session.user.institution_id;
  if (!institutionId) {
    return NextResponse.json({ error: "No tiene institución asignada" }, { status: 400 });
  }

  const report = getCourseBoardReportById(params.id, institutionId);
  if (!report) {
    return NextResponse.json({ error: "Informe no encontrado" }, { status: 404 });
  }

  const institution = db
    .prepare("SELECT * FROM institutions WHERE id = ?")
    .get(institutionId) as InstitutionRow | undefined;

  const searchParams = req.nextUrl.searchParams;
  const pageParam = searchParams.get("page") || "1";
  const pageNum = Math.max(1, parseInt(pageParam, 10) || 1);

  // Directorio de caché en disco
  const cacheDir = path.join(process.cwd(), "public", "juntas_cache");
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  const safeTimestamp = (report.updated_at || report.created_at || "init").replace(/[^a-zA-Z0-9]/g, "_");
  const cacheFilePath = path.join(cacheDir, `junta_${report.id}_p${pageNum}_${safeTimestamp}.png`);

  if (fs.existsSync(cacheFilePath)) {
    try {
      const stat = fs.statSync(cacheFilePath);
      if (stat.size > 1000) {
        const cachedBuffer = fs.readFileSync(cacheFilePath);
        return new NextResponse(cachedBuffer, {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=3600, must-revalidate",
            "X-Page-Number": String(pageNum),
          },
        });
      }
    } catch {}
  }

  try {
    const docBuffer = await generateCourseBoardReportDocx({
      report,
      institution,
    });
    const pdfBuffer = await convertDocxBufferToPdf(docBuffer);
    const pngPages = await convertPdfBufferToPngPages(pdfBuffer);

    if (pngPages.length === 0) {
      return NextResponse.json(
        { error: "No se pudieron renderizar páginas de imagen" },
        { status: 500 }
      );
    }

    // Guardar en caché todas las páginas renderizadas
    pngPages.forEach((pageBuf, idx) => {
      try {
        const pageCachePath = path.join(
          cacheDir,
          `junta_${report.id}_p${idx + 1}_${safeTimestamp}.png`
        );
        fs.writeFileSync(pageCachePath, pageBuf);
      } catch {}
    });

    const targetIndex = Math.min(pageNum - 1, pngPages.length - 1);
    const selectedPage = pngPages[targetIndex] || pngPages[0];

    return new NextResponse(selectedPage, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, must-revalidate",
        "X-Total-Pages": String(pngPages.length),
        "X-Page-Number": String(targetIndex + 1),
      },
    });
  } catch (err: any) {
    console.error("[preview junta route]", err);
    return NextResponse.json(
      { error: "Error al generar vista previa: " + err?.message },
      { status: 500 }
    );
  }
}
