"use server";

import { requireRole, requireInstitutionId } from "@/lib/session";
import { generateWithFallback, isAiConfigured } from "@/lib/ai";
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
    return { error: "La ayuda de IA no está disponible en este momento. Verifica la clave o intenta más tarde." };
  }

  const axisLabel = opts.axis ? ACTIVITY_AXIS_LABELS[opts.axis as ActivityAxis] || opts.axis : "Prevención integral";
  const themeLabel = opts.preventionTheme ? preventionThemeLabel(opts.preventionTheme) : "";
  const existingText = opts.currentText?.trim() || "";
  const hasText = existingText.length > 0;

  let prompt = "";
  const systemInstruction =
    "Eres un profesional especialista del Departamento de Consejería Estudiantil (DECE) del Ministerio de Educación de Ecuador. Tu función es redactar y pulir registros de actividades de promoción, prevención y convivencia de manera concisa, técnica, formal y directa, sin rodeos, sin introducciones ni textos superfluos.";

  if (opts.fieldKey === "description") {
    if (hasText) {
      // Caso 1.A: Ya hay texto facilitado (tipeado o dictado por voz) -> Mejorarlo en un solo párrafo
      prompt = `El profesional DECE ha redactado o dictado el siguiente borrador para la descripción de la actividad:
"""
${existingText}
"""

Contexto de la actividad:
- Eje: ${axisLabel}
${opts.title ? `- Título: "${opts.title}"` : ""}
${themeLabel ? `- Temática: "${themeLabel}"` : ""}
${opts.targetAudience ? `- Dirigido a: "${opts.targetAudience}"` : ""}
${opts.courses ? `- Cursos/paralelos: "${opts.courses}"` : ""}

INSTRUCCIONES ESTRICTAS:
1. Mejora, corrige y pule la redacción facilitada por el profesional.
2. Corrige ortografía, puntuación y dale un tono técnico, formal y fluido conforme al Modelo de Gestión DECE de Ecuador.
3. Preserva fielmente la idea y el sentido original del texto facilitado.
4. Devuelve el resultado en UN SOLO PÁRRAFO unificado, claro y profesional.
5. NO agregues introducciones (ej. "Aquí tienes la mejora"), títulos, viñetas ni comillas. Devuelve ÚNICAMENTE el párrafo mejorado.`;
    } else {
      // Caso 1.B: Está vacío -> Generar un párrafo describiendo o resumiendo lo principal de la actividad
      prompt = `Genera un párrafo descriptivo para una actividad del Departamento de Consejería Estudiantil (DECE) con los siguientes datos:
- Eje de acción: ${axisLabel}
- Título de la actividad: ${opts.title || "Actividad formativa de acompañamiento socioemocional"}
${themeLabel ? `- Temática preventiva: "${themeLabel}"` : ""}
${opts.targetAudience ? `- Población dirigida: "${opts.targetAudience}"` : ""}
${opts.courses ? `- Cursos participantes: "${opts.courses}"` : ""}

INSTRUCCIONES ESTRICTAS:
1. Redacta UN SOLO PÁRRAFO conciso y profesional donde se describa y resuma lo principal de la actividad (su objetivo pedagógico central, la metodología participativa y las dinámicas formativas implementadas).
2. Debe tener una extensión moderada (3 a 5 oraciones), con lenguaje técnico formal del DECE (Ecuador).
3. NO uses viñetas, subtítulos ni frases de cortesía. Devuelve ÚNICAMENTE el párrafo descriptivo.`;
    }
  } else {
    // Evidencias u observaciones
    if (hasText) {
      // Caso 2.A: Ya hay texto facilitado -> Mejorar el párrafo facilitado
      prompt = `El profesional DECE ha redactado o dictado las siguientes evidencias u observaciones para la actividad:
"""
${existingText}
"""

Contexto de la actividad:
- Eje: ${axisLabel}
${opts.title ? `- Título: "${opts.title}"` : ""}

INSTRUCCIONES ESTRICTAS:
1. Mejora y pule la redacción del texto facilitado, haciéndolo formal, claro y técnicamente adecuado para el registro institucional del DECE.
2. Mantén todas las evidencias y observaciones que el profesional mencionó.
3. Devuelve una redacción concisa y profesional.
4. NO agregues introducciones, saludos ni comillas. Devuelve ÚNICAMENTE el texto mejorado.`;
    } else {
      // Caso 2.B: Está vacío -> Poner un esquema pequeñísimo de qué podría ir ahí
      prompt = `Para una actividad DECE titulada "${opts.title || "Actividad preventiva"}" (Eje: ${axisLabel}${
        themeLabel ? `, Temática: ${themeLabel}` : ""
      }):

INSTRUCCIONES ESTRICTAS:
1. Propón un esquema PEQUEÑÍSIMO (máximo 3 o 4 líneas breves y directas) con los respaldos y observaciones esenciales que podrían registrarse en este apartado.
2. Debe seguir un formato breve como:
- Registro de asistencia firmado y registro fotográfico de la sesión.
- Nivel de participación activo y acogida favorable durante las dinámicas.
- Compromisos asumidos y observaciones técnicas para el seguimiento DECE.
3. Sé sumamente breve y directo, sin introducciones ni despedidas. Devuelve ÚNICAMENTE las 3 o 4 líneas del esquema en texto plano.`;
    }
  }

  const result = await generateWithFallback({
    prompt,
    systemInstruction,
    temperature: 0.3,
    maxOutputTokens: 500,
  });

  if ("error" in result) {
    return { error: result.error };
  }

  return { text: result.text.trim() };
}
