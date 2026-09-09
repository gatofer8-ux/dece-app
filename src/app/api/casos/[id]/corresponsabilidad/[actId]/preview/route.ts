import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { generateCorresponsibilityDocxBuffer } from "@/lib/corresponsibilityDocx";
import { convertDocxBufferToPdf, convertPdfBufferToPngPages } from "@/lib/docxToPdf";
import type { CaseCorresponsibilityActRow, StudentRow, CaseFileRow } from "@/lib/types";
import fs from "fs";
import path from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; actId: string } }
) {
  const session = await getSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const institutionId = session.user.institution_id;
  const act = db
    .prepare("SELECT * FROM case_corresponsibility_acts WHERE id = ? AND institution_id = ?")
    .get(params.actId, institutionId) as CaseCorresponsibilityActRow | undefined;

  if (!act) {
    return NextResponse.json({ error: "Acta no encontrada" }, { status: 404 });
  }

  const caseFile = db
    .prepare("SELECT student_id FROM case_files WHERE id = ?")
    .get(act.case_file_id) as Pick<CaseFileRow, "student_id"> | undefined;

  if (!caseFile) {
    return NextResponse.json({ error: "Caso no encontrado" }, { status: 404 });
  }

  const student = db
    .prepare("SELECT * FROM students WHERE id = ?")
    .get(caseFile.student_id) as StudentRow | undefined;

  if (!student) {
    return NextResponse.json({ error: "Estudiante no encontrado" }, { status: 404 });
  }

  // Comprobar caché en disco
  const cacheDir = path.join(process.cwd(), "public", "actas_cache");
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  const safeTimestamp = (act.updated_at || act.created_at || "init").replace(/[^a-zA-Z0-9]/g, "_");
  const cacheFilePath = path.join(cacheDir, `acta_${act.id}_${safeTimestamp}.png`);

  if (fs.existsSync(cacheFilePath)) {
    try {
      const stat = fs.statSync(cacheFilePath);
      if (stat.size > 1000) {
        const cachedBuffer = fs.readFileSync(cacheFilePath);
        return new NextResponse(cachedBuffer, {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=3600, must-revalidate",
          },
        });
      }
    } catch {}
  }

  try {
    const docBuffer = await generateCorresponsibilityDocxBuffer(act, student);
    const pdfBuffer = await convertDocxBufferToPdf(docBuffer);
    const pngPages = await convertPdfBufferToPngPages(pdfBuffer);

    if (pngPages.length === 0) {
      return NextResponse.json({ error: "No se pudieron renderizar páginas de imagen" }, { status: 500 });
    }

    const firstPage = pngPages[0];
    try {
      fs.writeFileSync(cacheFilePath, firstPage);
    } catch {}

    return new NextResponse(firstPage, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, must-revalidate",
      },
    });
  } catch (err: any) {
    console.error("[preview route]", err);
    return NextResponse.json({ error: "Error al generar vista previa: " + err?.message }, { status: 500 });
  }
}
