import { createWorker } from "tesseract.js";
import { convertPdfBufferToPngPages } from "@/lib/docxToPdf";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export interface OcrLineInfo {
  text: string;
  confidence: number;
}

export interface OcrPageResult {
  pageNumber: number;
  imagePreviewDataUrl: string;
  fullText: string;
  confidence: number;
  lines: OcrLineInfo[];
}

export interface DocumentOcrResult {
  pages: OcrPageResult[];
  fullText: string;
  averageConfidence: number;
  detectedType: "ACTA_CORRESPONSABILIDAD" | "FICHA_ALERTA" | "OTRO";
  detectedTypeLabel: string;
  detectionConfidence: number;
  trocrAvailable: boolean;
}

/**
 * Clasifica rápidamente el tipo de documento basándose en los encabezados y palabras clave oficiales.
 */
export function classifyDocumentType(fullText: string): {
  detectedType: "ACTA_CORRESPONSABILIDAD" | "FICHA_ALERTA" | "OTRO";
  confidence: number;
  label: string;
} {
  const normalized = fullText.toUpperCase();

  // 1. Acta de Corresponsabilidad
  if (
    normalized.includes("CORRESPONSABILIDAD") ||
    normalized.includes("COMPROMISO Y CORRESPONSABILIDAD") ||
    (normalized.includes("ACUERDOS Y COMPROMISOS") && normalized.includes("REPRESENTANTE")) ||
    normalized.includes("ACTA DE COMPROMISO")
  ) {
    return {
      detectedType: "ACTA_CORRESPONSABILIDAD",
      confidence: 95,
      label: "Acta de Compromiso y Corresponsabilidad",
    };
  }

  // 2. Ficha de Notificación de Alerta
  if (
    normalized.includes("NOTIFICACIÓN DE ALERTA") ||
    normalized.includes("NOTIFICACION DE ALERTA") ||
    normalized.includes("FICHA DE NOTIFICACIÓN") ||
    normalized.includes("FICHA DE NOTIFICACION") ||
    normalized.includes("DETECCIÓN DE SITUACIÓN DE VULNERABILIDAD") ||
    normalized.includes("INTERVENCIÓN DEL DOCENTE QUE DETECTA") ||
    normalized.includes("INTERVENCION DEL DOCENTE QUE DETECTA")
  ) {
    return {
      detectedType: "FICHA_ALERTA",
      confidence: 95,
      label: "Ficha de Notificación de Alerta (Detección)",
    };
  }

  // 3. Otros documentos DECE conocidos
  if (normalized.includes("INFORME DE CIERRE") || normalized.includes("INFORME TÉCNICO DE CIERRE")) {
    return {
      detectedType: "OTRO",
      confidence: 90,
      label: "Informe de Cierre de Caso",
    };
  }

  if (normalized.includes("INFORME SITUACIONAL") || normalized.includes("INFORME PSICOPEDAGÓGICO")) {
    return {
      detectedType: "OTRO",
      confidence: 85,
      label: "Informe Situacional / Psicopedagógico",
    };
  }

  if (normalized.includes("FICHA DE ENTREVISTA") || normalized.includes("REGISTRO DE ENTREVISTA")) {
    return {
      detectedType: "OTRO",
      confidence: 85,
      label: "Ficha de Entrevista DECE",
    };
  }

  return {
    detectedType: "OTRO",
    confidence: 30,
    label: "Documento Institucional General",
  };
}

/**
 * Consulta la disponibilidad del microservicio local de TrOCR (Python).
 */
export async function checkTrOCRAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const scriptPath = path.join(process.cwd(), "scripts", "trocr_service.py");
      if (!fs.existsSync(scriptPath)) {
        return resolve(false);
      }

      const proc = spawn("python3", [scriptPath, "--check"]);
      let out = "";

      proc.stdout.on("data", (chunk) => {
        out += chunk.toString();
      });

      proc.on("error", () => {
        // Intento con "python" en Windows
        const procWin = spawn("python", [scriptPath, "--check"]);
        let outWin = "";
        procWin.stdout.on("data", (c) => (outWin += c.toString()));
        procWin.on("error", () => resolve(false));
        procWin.on("close", () => {
          try {
            const parsed = JSON.parse(outWin);
            resolve(Boolean(parsed.available));
          } catch {
            resolve(false);
          }
        });
      });

      proc.on("close", () => {
        try {
          const parsed = JSON.parse(out);
          resolve(Boolean(parsed.available));
        } catch {
          resolve(false);
        }
      });
    } catch {
      resolve(false);
    }
  });
}

/**
 * Procesa una imagen Buffer con Tesseract OCR local en español.
 */
async function ocrImageBuffer(buffer: Buffer): Promise<{
  text: string;
  confidence: number;
  lines: OcrLineInfo[];
}> {
  const worker = await createWorker("spa");
  try {
    const result = await worker.recognize(buffer);
    const text = result.data.text || "";
    const confidence = result.data.confidence || 0;

    const rawLines = (result.data as any).lines;
    let lines: OcrLineInfo[] = [];
    if (Array.isArray(rawLines)) {
      lines = rawLines
        .map((l: any) => ({
          text: String(l.text || "").trim(),
          confidence: Number(l.confidence || 0),
        }))
        .filter((l) => l.text.length > 0);
    } else {
      lines = text
        .split("\n")
        .map((line) => ({ text: line.trim(), confidence }))
        .filter((l) => l.text.length > 0);
    }

    return { text, confidence, lines };
  } finally {
    await worker.terminate();
  }
}

/**
 * Procesa un archivo digitalizado (foto o PDF escaneado) de forma 100% local.
 */
export async function processDocumentOcr(
  fileBuffer: Buffer,
  mimeType: string,
  filename: string
): Promise<DocumentOcrResult> {
  const isPdf = mimeType === "application/pdf" || filename.toLowerCase().endsWith(".pdf");
  let pngPages: Buffer[] = [];

  if (isPdf) {
    try {
      pngPages = await convertPdfBufferToPngPages(fileBuffer);
    } catch (err: any) {
      console.error("[processDocumentOcr] Error convirtiendo PDF a PNG:", err?.message);
      throw new Error("No se pudo procesar el archivo PDF. Asegúrate de que no esté dañado.");
    }
  } else {
    pngPages = [fileBuffer];
  }

  const pages: OcrPageResult[] = [];
  let combinedText = "";
  let totalConfidence = 0;

  for (let i = 0; i < pngPages.length; i++) {
    const pageBuf = pngPages[i];
    const { text, confidence, lines } = await ocrImageBuffer(pageBuf);

    const base64Img = pageBuf.toString("base64");
    const mimePrefix = isPdf ? "image/png" : (mimeType.startsWith("image/") ? mimeType : "image/png");
    const previewUrl = `data:${mimePrefix};base64,${base64Img}`;

    pages.push({
      pageNumber: i + 1,
      imagePreviewDataUrl: previewUrl,
      fullText: text,
      confidence,
      lines,
    });

    combinedText += (combinedText ? "\n\n" : "") + text;
    totalConfidence += confidence;
  }

  const averageConfidence = pages.length > 0 ? Math.round(totalConfidence / pages.length) : 0;
  const classification = classifyDocumentType(combinedText);
  const trocrAvailable = await checkTrOCRAvailable();

  return {
    pages,
    fullText: combinedText,
    averageConfidence,
    detectedType: classification.detectedType,
    detectedTypeLabel: classification.label,
    detectionConfidence: classification.confidence,
    trocrAvailable,
  };
}
