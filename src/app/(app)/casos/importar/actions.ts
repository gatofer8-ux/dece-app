"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { processCaseMatrixWorkbook, type CaseImportSummary } from "@/lib/caseImport";
import type { CaseStatus, CasePriority, ActionAxis } from "@/lib/types";

export type CaseImportActionState = {
  error: string | null;
  result: CaseImportSummary | null;
};

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

export async function importCaseMatrixAction(
  _prev: CaseImportActionState,
  formData: FormData
): Promise<CaseImportActionState> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Por favor selecciona un archivo Excel (.xlsx) con la matriz de casos.", result: null };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { error: "El archivo supera el tamaño máximo permitido de 15 MB.", result: null };
  }

  const rawStatus = (formData.get("default_status") as string) || "EN_SEGUIMIENTO";
  const defaultStatus: CaseStatus = rawStatus === "ABIERTO" ? "ABIERTO" : "EN_SEGUIMIENTO";

  const rawPriority = (formData.get("default_priority") as string) || "MEDIA";
  const defaultPriority: CasePriority =
    rawPriority === "ALTA" || rawPriority === "BAJA" ? (rawPriority as CasePriority) : "MEDIA";

  const rawAxis = (formData.get("default_axis") as string) || "SEGUIMIENTO";
  const defaultAxis: ActionAxis =
    rawAxis === "ATENCION" || rawAxis === "PREVENCION" ? (rawAxis as ActionAxis) : "SEGUIMIENTO";

  const sheetName = (formData.get("sheet_name") as string)?.trim() || undefined;

  let workbook: ExcelJS.Workbook;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
  } catch (e: any) {
    return {
      error: "No se pudo leer el archivo. Verifica que sea un libro Excel (.xlsx) válido.",
      result: null,
    };
  }

  try {
    const summary = await processCaseMatrixWorkbook(workbook, {
      institutionId,
      userId: session.user.id,
      sheetName,
      defaultStatus,
      defaultPriority,
      defaultAxis,
    });

    if (summary.createdCases > 0) {
      logAudit({
        userId: session.user.id,
        action: "IMPORTAR",
        entityType: "CaseFile",
        details: `Importación de matriz de casos (${summary.sheetName}): ${summary.createdCases} casos creados (${summary.createdStudents} estudiantes nuevos, ${summary.linkedStudents} existentes vinculados).`,
        institutionId,
      });
    }

    revalidatePath("/casos");
    revalidatePath("/estudiantes");
    revalidatePath("/dashboard");
    revalidatePath("/reportes/estadisticas");

    return { error: null, result: summary };
  } catch (err: any) {
    return {
      error: `Error durante el procesamiento de la matriz: ${err?.message || "Error desconocido"}. No se alteraron los registros.`,
      result: null,
    };
  }
}

/**
 * Revierte y elimina todos los casos y estudiantes creados por importación masiva.
 */
export async function deleteImportedCasesAction(): Promise<{ error: string | null; deletedCount: number }> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const cases = db
    .prepare(`
      SELECT id, student_id FROM case_files
      WHERE institution_id = ? 
        AND (
          detection_source LIKE '%Matriz%' 
          OR id IN (SELECT case_file_id FROM case_actions WHERE description LIKE '%importaci%')
        )
    `)
    .all(institutionId) as { id: string; student_id: string }[];

  if (cases.length === 0) {
    return { error: "No se encontraron casos creados por importación para eliminar en esta institución.", deletedCount: 0 };
  }

  const caseIds = cases.map((c) => c.id);
  const studentIds = [...new Set(cases.map((c) => c.student_id))];
  const placeholders = caseIds.map(() => "?").join(",");

  try {
    db.transaction(() => {
      // 1. Eliminar acciones asociadas
      db.prepare(`DELETE FROM case_actions WHERE case_file_id IN (${placeholders})`).run(...caseIds);

      // 2. Eliminar los expedientes
      db.prepare(`DELETE FROM case_files WHERE id IN (${placeholders})`).run(...caseIds);

      // 3. Eliminar estudiantes creados por importación que no tienen otros registros
      for (const sId of studentIds) {
        const otherCases =
          (db.prepare("SELECT COUNT(1) n FROM case_files WHERE student_id = ?").get(sId) as any)?.n || 0;
        const otherAlerts =
          (db.prepare("SELECT COUNT(1) n FROM teacher_alerts WHERE student_id = ?").get(sId) as any)?.n || 0;
        const otherAppts =
          (db.prepare("SELECT COUNT(1) n FROM appointments WHERE student_id = ?").get(sId) as any)?.n || 0;

        if (otherCases === 0 && otherAlerts === 0 && otherAppts === 0) {
          db.prepare("DELETE FROM students WHERE id = ?").run(sId);
        }
      }

      logAudit({
        userId: session.user.id,
        action: "ELIMINAR",
        entityType: "CaseFile",
        details: `Reversión y eliminación masiva de ${cases.length} casos importados de matriz.`,
        institutionId,
      });
    })();

    revalidatePath("/casos");
    revalidatePath("/estudiantes");
    revalidatePath("/dashboard");
    revalidatePath("/reportes/estadisticas");

    return { error: null, deletedCount: cases.length };
  } catch (err: any) {
    return { error: `Error al revertir los casos: ${err?.message || "Error desconocido"}`, deletedCount: 0 };
  }
}

/**
 * Consulta la cantidad de casos importados en la institución.
 */
export async function getImportedCasesCountAction(): Promise<number> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const row = db
    .prepare(`
      SELECT COUNT(1) as count FROM case_files
      WHERE institution_id = ? 
        AND (
          detection_source LIKE '%Matriz%' 
          OR id IN (SELECT case_file_id FROM case_actions WHERE description LIKE '%importaci%')
        )
    `)
    .get(institutionId) as { count: number };

  return row?.count || 0;
}
