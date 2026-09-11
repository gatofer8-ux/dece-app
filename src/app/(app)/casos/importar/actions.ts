"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { processCaseMatrixWorkbook, type CaseImportSummary } from "@/lib/caseImport";
import type { CaseStatus, CasePriority, ActionAxis } from "@/lib/types";

export type CaseImportActionState = {
  error: string | null;
  result: CaseImportSummary | null;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

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
    return { error: "El archivo supera el tamaño máximo permitido de 10 MB.", result: null };
  }

  const rawStatus = (formData.get("default_status") as string) || "EN_SEGUIMIENTO";
  const defaultStatus: CaseStatus = rawStatus === "ABIERTO" ? "ABIERTO" : "EN_SEGUIMIENTO";

  const rawPriority = (formData.get("default_priority") as string) || "MEDIA";
  const defaultPriority: CasePriority =
    rawPriority === "ALTA" || rawPriority === "BAJA" ? (rawPriority as CasePriority) : "MEDIA";

  const rawAxis = (formData.get("default_axis") as string) || "SEGUIMIENTO";
  const defaultAxis: ActionAxis =
    rawAxis === "ATENCION" || rawAxis === "PREVENCION" ? (rawAxis as ActionAxis) : "SEGUIMIENTO";

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
      defaultStatus,
      defaultPriority,
      defaultAxis,
    });

    if (summary.createdCases > 0) {
      logAudit({
        userId: session.user.id,
        action: "IMPORTAR",
        entityType: "CaseFile",
        details: `Importación de matriz de casos: ${summary.createdCases} casos creados (${summary.createdStudents} estudiantes nuevos, ${summary.linkedStudents} existentes vinculados).`,
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
