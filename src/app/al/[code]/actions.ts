"use server";

import { redirect } from "next/navigation";
import { getSessionByCode, createEntry } from "@/lib/alertIdentificationSessions";
import { RISK_TYPE_LABELS, type RiskType } from "@/lib/types";

export type AlertEntryActionState = { error: string | null };

export async function submitAlertEntryAction(
  code: string,
  _prev: AlertEntryActionState,
  formData: FormData
): Promise<AlertEntryActionState> {
  const s = getSessionByCode(code);
  if (!s || s.status !== "ABIERTA") {
    return { error: "Esta acta no está disponible en este momento. Consulta con el DECE de tu institución." };
  }

  const studentName = String(formData.get("student_name") || "").trim();
  const riskType = String(formData.get("risk_type") || "").trim();
  const teacherName = String(formData.get("teacher_name") || "").trim();

  if (!studentName) return { error: "Escribe el nombre del estudiante." };
  if (!riskType || !(riskType in RISK_TYPE_LABELS)) return { error: "Selecciona el tipo de riesgo psicosocial." };
  if (!teacherName) return { error: "Escribe tu nombre (docente que alerta)." };

  try {
    createEntry({
      sessionId: s.id,
      institutionId: s.institution_id,
      studentName,
      riskType: riskType as RiskType,
      teacherName,
    });
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Ocurrió un error al guardar el registro. Intenta de nuevo." };
  }

  redirect(`/al/${code}/gracias`);
}
