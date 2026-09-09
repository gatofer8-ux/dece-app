"use server";

import fs from "fs";
import path from "path";
import { parseTutorsExcelBuffer, ParsedCourseQuota } from "@/lib/tutorsParser";
import { requireRole } from "@/lib/session";

/**
 * Carga automáticamente el formato de tutores y numérico desde el escritorio local del usuario
 * (C:\Users\USER\Desktop\Numérico estudiantes).
 */
export async function loadDesktopTutorsAction(): Promise<{
  success: boolean;
  data?: ParsedCourseQuota[];
  message?: string;
  count?: number;
}> {
  try {
    await requireRole(["ADMIN", "DECE"]);

    const desktopDir = "C:\\Users\\USER\\Desktop\\Numérico estudiantes";
    if (!fs.existsSync(desktopDir)) {
      return {
        success: false,
        message: "No se encontró la carpeta: " + desktopDir,
      };
    }

    const files = fs.readdirSync(desktopDir);
    const excelFile = files.find((f) => f.endsWith(".xlsx") || f.endsWith(".xls"));

    if (!excelFile) {
      return {
        success: false,
        message: "No se encontró ningún archivo Excel (.xlsx / .xls) en " + desktopDir,
      };
    }

    const fullPath = path.join(desktopDir, excelFile);
    const fileBuffer = fs.readFileSync(fullPath);

    const parsed = await parseTutorsExcelBuffer(fileBuffer);
    if (!parsed.success) {
      return { success: false, message: parsed.message || "Error al procesar el archivo Excel." };
    }

    return {
      success: true,
      data: parsed.data,
      count: parsed.data.length,
      message: `✓ Se cargaron exitosamente ${parsed.data.length} cursos y tutores desde "${excelFile}".`,
    };
  } catch (err: any) {
    console.error("[loadDesktopTutorsAction error]", err);
    return { success: false, message: err?.message || "Error al leer archivo de escritorio." };
  }
}

/**
 * Procesa un archivo Excel o CSV subido por el usuario mediante arrastrar y soltar o selector de archivos.
 */
export async function uploadTutorsFileAction(
  formData: FormData
): Promise<{
  success: boolean;
  data?: ParsedCourseQuota[];
  message?: string;
  count?: number;
}> {
  try {
    await requireRole(["ADMIN", "DECE"]);

    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, message: "No se proporcionó ningún archivo." };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parsed = await parseTutorsExcelBuffer(buffer);
    if (!parsed.success) {
      return { success: false, message: parsed.message || "No se pudo interpretar el archivo." };
    }

    return {
      success: true,
      data: parsed.data,
      count: parsed.data.length,
      message: `✓ Se procesaron ${parsed.data.length} cursos y paralelos con sus tutores desde "${file.name}".`,
    };
  } catch (err: any) {
    console.error("[uploadTutorsFileAction error]", err);
    return { success: false, message: err?.message || "Error al procesar archivo subido." };
  }
}
