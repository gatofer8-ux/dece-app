"use server";

import { requireRole, requireInstitutionId } from "@/lib/session";
import { draftText, isAiConfigured } from "@/lib/ai";

/**
 * Ayuda de IA para el Registro de Atención Diaria. A diferencia del resto de
 * documentos (que viven dentro de un caso y usan el contexto ya registrado
 * del caso, ver casos/[id]/ai-actions.ts), una atención diaria es un
 * registro suelto — no pertenece a ningún caso — así que aquí no hay
 * contexto adicional que aportar, solo el campo a redactar.
 */
export async function generateDailyAttentionAiDraft(
  fieldLabel: string,
  currentText: string
): Promise<{ text?: string; error?: string }> {
  requireInstitutionId(await requireRole(["ADMIN", "DECE"]));

  if (!isAiConfigured()) {
    return { error: "La ayuda de IA todavía no está configurada en este sistema." };
  }

  const result = await draftText({
    fieldLabel,
    context: "Registro de atención diaria del Departamento de Consejería Estudiantil (DECE).",
    currentText: currentText || "",
  });
  if ("error" in result) return { error: result.error };
  return { text: result.text };
}
