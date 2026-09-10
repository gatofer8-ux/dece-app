"use server";

import { requireRole, requireInstitutionId } from "@/lib/session";
import { draftText, isAiConfigured } from "@/lib/ai";
import { ACTIVITY_AXIS_LABELS, preventionThemeLabel, type ActivityAxis } from "@/lib/types";

export async function generateActivityAiDraft(opts: {
  fieldKey: "description" | "evidence_notes";
  title?: string;
  axis?: string;
  preventionTheme?: string;
  targetAudience?: string;
  courses?: string;
  currentText?: string;
}): Promise<{ text?: string; error?: string }> {
  requireInstitutionId(await requireRole(["ADMIN", "DECE"]));

  if (!isAiConfigured()) {
    return { error: "La ayuda de IA todavía no está configurada en este sistema o se agotó la cuota." };
  }

  const axisLabel = opts.axis ? ACTIVITY_AXIS_LABELS[opts.axis as ActivityAxis] || opts.axis : "Prevención integral";
  const themeLabel = opts.preventionTheme ? preventionThemeLabel(opts.preventionTheme) : "";

  const context = `Registro de actividad institucional DECE (Departamento de Consejería Estudiantil, Ecuador).
Eje de acción: ${axisLabel}.
${opts.title ? `Título / Tema de la actividad: "${opts.title}".` : ""}
${themeLabel ? `Temática preventiva específica: "${themeLabel}".` : ""}
${opts.targetAudience ? `Población dirigida: ${opts.targetAudience}.` : ""}
${opts.courses ? `Cursos o niveles participantes: ${opts.courses}.` : ""}`;

  let fieldLabel = "";
  if (opts.fieldKey === "description") {
    fieldLabel =
      "Descripción pedagógica y metodológica de la actividad (objetivo, dinámicas participativas, temas tratados y desarrollo formativo conforme al Modelo de Gestión DECE)";
  } else {
    fieldLabel =
      "Evidencias y observaciones técnicas (medios de verificación como registros de asistencia firmados o material fotográfico, nivel de participación, compromisos y recomendaciones pedagógicas)";
  }

  const result = await draftText({
    fieldLabel,
    context,
    currentText: opts.currentText || "",
  });

  if ("error" in result) return { error: result.error };
  return { text: result.text };
}
