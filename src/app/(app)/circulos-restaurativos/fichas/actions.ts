"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { str } from "@/lib/formData";
import { AI_FIELD_LABELS } from "@/lib/restorativeCircleFicha";
import { draftText, isAiConfigured, generateRestorativeCircleQuestions } from "@/lib/ai";
import { getSelectedSchoolYear } from "@/lib/schoolYear";
import type { RestorativeCircleFichaRow } from "@/lib/types";

const TEXT_COLS = [
  "ficha_code",
  "center_name",
  "district_name",
  "facilitator_name",
  "circle_type",
  "circle_modality",
  "participants_count",
  "participant_type",
  "problematica",
  "circle_date",
  "circle_time",
  "diagnostico",
  "objetivos",
  "declaracion_inicial",
  "q_icebreaker",
  "q_intro",
  "q_develop",
  "q_actions",
  "declaracion_cierre",
  "informe_circulo",
  "conclusion",
  "case_file_id",
  "student_id",
] as const;

function payload(fd: FormData): Record<string, string | null> {
  const o: Record<string, string | null> = {};
  for (const c of TEXT_COLS) o[c] = str(fd, c);
  return o;
}

export async function createCircleFicha(formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const year = await getSelectedSchoolYear(institutionId);
  const id = randomUUID();
  const v = payload(formData);
  const cols = Object.keys(v);
  db.prepare(
    `INSERT INTO restorative_circle_fichas (id, institution_id, created_by_id, school_year_id, ${cols.join(", ")})
     VALUES (@id, @institution_id, @created_by_id, @school_year_id, ${cols.map((c) => `@${c}`).join(", ")})`
  ).run({
    id,
    institution_id: institutionId,
    created_by_id: session.user.id,
    school_year_id: year?.id ?? null,
    ...v,
  });
  logAudit({
    userId: session.user.id,
    action: "CREAR",
    entityType: "RestorativeCircleFicha",
    entityId: id,
    institutionId,
  });
  if (v.case_file_id) revalidatePath(`/casos/${v.case_file_id}`);
  revalidatePath("/circulos-restaurativos/fichas");
  redirect(`/circulos-restaurativos/fichas/${id}/imprimir`);
}

export async function updateCircleFicha(id: string, formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const exists = db
    .prepare("SELECT id FROM restorative_circle_fichas WHERE id = ? AND institution_id = ?")
    .get(id, institutionId);
  if (!exists) throw new Error("Ficha no encontrada.");
  const v = payload(formData);
  const cols = Object.keys(v);
  db.prepare(
    `UPDATE restorative_circle_fichas SET ${cols
      .map((c) => `${c} = @${c}`)
      .join(", ")}, updated_at = datetime('now') WHERE id = @id AND institution_id = @institution_id`
  ).run({ id, institution_id: institutionId, ...v });
  logAudit({
    userId: session.user.id,
    action: "EDITAR",
    entityType: "RestorativeCircleFicha",
    entityId: id,
    institutionId,
  });
  if (v.case_file_id) revalidatePath(`/casos/${v.case_file_id}`);
  revalidatePath("/circulos-restaurativos/fichas");
  redirect(`/circulos-restaurativos/fichas/${id}/imprimir`);
}

export async function deleteCircleFicha(id: string) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const row = db
    .prepare("SELECT case_file_id FROM restorative_circle_fichas WHERE id = ? AND institution_id = ?")
    .get(id, institutionId) as { case_file_id: string | null } | undefined;
  db.prepare("DELETE FROM restorative_circle_fichas WHERE id = ? AND institution_id = ?").run(
    id,
    institutionId
  );
  logAudit({
    userId: session.user.id,
    action: "BORRAR",
    entityType: "RestorativeCircleFicha",
    entityId: id,
    institutionId,
  });
  if (row?.case_file_id) revalidatePath(`/casos/${row.case_file_id}`);
  revalidatePath("/circulos-restaurativos/fichas");
  redirect("/circulos-restaurativos/fichas");
}

export async function draftFichaField(
  fieldKey: keyof typeof AI_FIELD_LABELS,
  currentText: string,
  ctx: {
    problematica?: string;
    participantType?: string;
    circleType?: string;
    circleModality?: string;
    circleDate?: string;
    circleTime?: string;
  }
): Promise<{ text?: string; error?: string }> {
  await requireRole(["ADMIN", "DECE"]);
  if (!isAiConfigured()) return { error: "La ayuda de IA todavía no está configurada." };
  const label = AI_FIELD_LABELS[fieldKey];
  if (!label) return { error: "Campo no válido." };

  const modalityText =
    ctx.circleModality === "individual"
      ? "Modalidad: Individual / entre partes (enfocar en preguntas dirigidas por rol: 'Para quien causó el daño:', 'Para quien fue afectado/a:')."
      : ctx.circleModality === "mixto"
      ? "Modalidad: Mixta (combinar preguntas dirigidas por rol y preguntas colectivas de grupo)."
      : "Modalidad: Grupal / de aula (preguntas colectivas para el grupo o curso completo, sin señalar culpables individuales).";

  const context = [
    ctx.problematica ? `Problemática del círculo restaurativo: ${ctx.problematica}` : "",
    ctx.circleType ? `Tipo de círculo: ${ctx.circleType}` : "",
    ctx.participantType ? `Participantes: ${ctx.participantType}` : "",
    modalityText,
    ctx.circleDate ? `Fecha del círculo: ${ctx.circleDate}` : "",
    ctx.circleTime ? `Horario del círculo: ${ctx.circleTime}` : "",
    "Es una Ficha de Círculo Restaurativo del DECE. Redacción formal institucional, enfoque de justicia restaurativa (LOEI, Código de la Niñez y Adolescencia, prácticas restaurativas MinEduc: reparación del daño, no revictimización, responsabilidad activa), sin nombres de estudiantes ni datos personales.",
    fieldKey.startsWith("q_") ? "Responde ÚNICAMENTE con la lista de preguntas, una pregunta por línea, comenzando cada pregunta con signo ¿ y terminando con ?." : "",
  ]
    .filter(Boolean)
    .join("\n");
  const result = await draftText({ fieldLabel: label, context, currentText: currentText || "" });
  if ("error" in result) return { error: result.error };
  return { text: result.text };
}

export async function suggestCircleQuestions(
  problematica: string,
  ctx: {
    circleType?: string;
    participantType?: string;
    modality?: string;
    participantsCount?: string;
    caseFileId?: string;
  }
): Promise<
  | { questions: { q_icebreaker: string[]; q_intro: string[]; q_develop: string[]; q_actions: string[] } }
  | { error: string }
> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  if (!isAiConfigured()) return { error: "La ayuda de IA todavía no está configurada." };
  if (!problematica.trim()) return { error: "Escribe primero la problemática para generar preguntas." };

  let caseContext = "";
  if (ctx.caseFileId) {
    const cf = db
      .prepare("SELECT risk_type, risk_type_other FROM case_files WHERE id = ? AND institution_id = ?")
      .get(ctx.caseFileId, institutionId) as
      | { risk_type: string; risk_type_other: string | null }
      | undefined;
    if (cf) {
      // Solo el tipo de riesgo (categoría), sin narrativa del caso, para no exponer datos personales.
      caseContext = `Tipo de riesgo del caso vinculado: ${cf.risk_type}${
        cf.risk_type_other ? ` (${cf.risk_type_other})` : ""
      }`;
    }
  }

  return generateRestorativeCircleQuestions({
    problematica,
    circleType: ctx.circleType,
    participantType: ctx.participantType,
    modality: ctx.modality,
    participantsCount: ctx.participantsCount,
    caseContext: caseContext || undefined,
  });
}

export type { RestorativeCircleFichaRow };
