"use server";

import { redirect } from "next/navigation";
import { getSurveySessionByCode, isSurveySessionOpen, createSurveyResponse } from "@/lib/eneis/eneisSurveySessions";
import { validateSurveyAnswers } from "@/lib/eneis/eneisSurveyInstrument";

export type SurveyActionState = { error: string | null };

export async function submitEneisSurveyAction(
  code: string,
  _prev: SurveyActionState,
  formData: FormData
): Promise<SurveyActionState> {
  const s = getSurveySessionByCode(code);
  if (!s || !isSurveySessionOpen(s)) {
    return { error: "Esta encuesta no está disponible en este momento. Consulta con el DECE de tu institución." };
  }

  let rawAnswers: unknown;
  try {
    rawAnswers = JSON.parse(String(formData.get("answers") || "[]"));
  } catch {
    return { error: "No se pudieron leer tus respuestas. Vuelve a intentar." };
  }

  const answers = validateSurveyAnswers(s.instrument, rawAnswers);
  if (!answers) {
    return { error: "Responde todas las preguntas antes de enviar." };
  }

  try {
    createSurveyResponse({ sessionId: s.id, institutionId: s.institution_id, answers });
  } catch (err: any) {
    return { error: err?.message || "Ocurrió un error al guardar tu respuesta. Intenta de nuevo." };
  }

  redirect(`/e/${code}/gracias`);
}
