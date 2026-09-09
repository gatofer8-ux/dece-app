import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { generateAlertDocxBuffer } from "@/lib/alertDocx";
import { convertDocxBufferToPdf, convertPdfBufferToPngPages } from "@/lib/docxToPdf";
import type { CaseAlertNotificationRow } from "@/lib/types";
import fs from "fs";
import path from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; alertId: string } }
) {
  const session = await getSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const institutionId = session.user.institution_id;
  const alert = db
    .prepare("SELECT * FROM case_alert_notifications WHERE id = ? AND institution_id = ?")
    .get(params.alertId, institutionId) as CaseAlertNotificationRow | undefined;

  if (!alert) {
    return NextResponse.json({ error: "Ficha de alerta no encontrada" }, { status: 404 });
  }

  const searchParams = req.nextUrl.searchParams;
  const pageParam = searchParams.get("page") || "1";
  const pageNum = Math.max(1, parseInt(pageParam, 10) || 1);

  // Comprobar directorio de caché en disco
  const cacheDir = path.join(process.cwd(), "public", "alertas_cache");
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  const safeTimestamp = (alert.updated_at || alert.created_at || "init").replace(/[^a-zA-Z0-9]/g, "_");
  const cacheFilePath = path.join(cacheDir, `alerta_${alert.id}_p${pageNum}_${safeTimestamp}.png`);

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
    const docBuffer = await generateAlertDocxBuffer(alert);
    const pdfBuffer = await convertDocxBufferToPdf(docBuffer);
    const pngPages = await convertPdfBufferToPngPages(pdfBuffer);

    if (pngPages.length === 0) {
      return NextResponse.json({ error: "No se pudieron renderizar páginas de imagen" }, { status: 500 });
    }

    // Guardar en caché todas las páginas generadas
    pngPages.forEach((pageBuf, idx) => {
      try {
        const pageCachePath = path.join(cacheDir, `alerta_${alert.id}_p${idx + 1}_${safeTimestamp}.png`);
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
    console.error("[preview alerta route]", err);
    return NextResponse.json({ error: "Error al generar vista previa: " + err?.message }, { status: 500 });
  }
}
