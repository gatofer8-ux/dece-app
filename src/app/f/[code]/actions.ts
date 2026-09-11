"use server";

import { redirect } from "next/navigation";
import { str, int } from "@/lib/formData";
import { getEneisSessionByCode, isSessionOpen, createEneisFicha } from "@/lib/eneis/eneisSessions";
import { generateWithFallback } from "@/lib/ai";
import { ENEIS_MATERIALES } from "@/lib/eneis/eneisMaterialesCatalog";
import { findRelevantExcerpt } from "@/lib/eneis/eneisMaterialesContent";

export type FichaActionState = { error: string | null };

export async function submitEneisFichaAction(
  code: string,
  _prev: FichaActionState,
  formData: FormData
): Promise<FichaActionState> {
  const s = getEneisSessionByCode(code);
  if (!s || !isSessionOpen(s)) {
    return { error: "Esta convocatoria no está disponible en este momento. Consulta con el DECE de tu institución." };
  }

  const docenteNombre = str(formData, "docente_nombre");
  const asignatura = str(formData, "asignatura");
  if (!docenteNombre) return { error: "Escribe tu nombre completo." };
  if (!asignatura) return { error: "Indica la asignatura." };

  try {
    createEneisFicha({
      sessionId: s.id,
      institutionId: s.institution_id,
      docenteNombre,
      asignatura,
      subnivel: str(formData, "subnivel"),
      curso: str(formData, "curso"),
      paralelo: str(formData, "paralelo"),
      fechaDesde: str(formData, "fecha_desde"),
      fechaHasta: str(formData, "fecha_hasta"),
      nombreFicha: str(formData, "nombre_ficha"),
      objetivoCurricular: str(formData, "objetivo_curricular"),
      objetivoEis: str(formData, "objetivo_eis"),
      destrezas: str(formData, "destrezas"),
      orientacionConceptual: str(formData, "orientacion_conceptual"),
      recursos: str(formData, "recursos"),
      anticipacion: str(formData, "anticipacion"),
      conceptualizacion: str(formData, "conceptualizacion"),
      consolidacion: str(formData, "consolidacion"),
      indicadoresEvaluacion: str(formData, "indicadores_evaluacion"),
      numEstudiantesCapacitados: int(formData, "num_estudiantes_capacitados"),
      observaciones: str(formData, "observaciones"),
      materialId: str(formData, "material_id"),
    });
  } catch (err: any) {
    return { error: err?.message || "Ocurrió un error al guardar la ficha. Intenta de nuevo." };
  }

  redirect(`/f/${code}/gracias`);
}

export interface FichaAiDraft {
  objetivo_eis: string;
  orientacion_conceptual: string;
  recursos: string;
  anticipacion: string;
  conceptualizacion: string;
  consolidacion: string;
  indicadores_evaluacion: string;
  referencePages: number[];
}

/**
 * Redacta un borrador de la ficha con IA, basado ÚNICAMENTE en el fragmento
 * real (con número de página real) del libro/guía oficial que el docente
 * eligió — para evitar que la IA invente temas o citas que no están en el
 * material que en verdad se va a usar en esa planificación.
 */
export async function generateFichaAiDraftAction(params: {
  code: string;
  materialId: string;
  asignatura: string;
  curso: string;
  subnivel: string;
  nombreFicha: string;
}): Promise<{ data?: FichaAiDraft; error?: string }> {
  const s = getEneisSessionByCode(params.code);
  if (!s || !isSessionOpen(s)) {
    return { error: "Esta convocatoria no está disponible en este momento." };
  }
  if (!params.materialId) return { error: "Elige primero el libro o guía de referencia." };
  if (!params.asignatura?.trim()) return { error: "Escribe la asignatura antes de generar con IA." };

  const material = ENEIS_MATERIALES.find((m) => m.id === params.materialId);
  if (!material) return { error: "Material no reconocido." };

  const query = [params.asignatura, params.curso, params.subnivel, params.nombreFicha].filter(Boolean).join(" ");
  const { excerpt, pages } = findRelevantExcerpt(params.materialId, query, 9000);
  if (!excerpt) {
    return { error: "No se pudo cargar el contenido de ese material en este momento. Intenta con otro o llena la ficha manualmente." };
  }

  const prompt = `Eres un asesor pedagógico del DECE en Ecuador, ayudando a un/a docente a llenar la "Ficha de Actividades de Aplicación ENEIS" (Oportunidades Curriculares de Educación Integral en Sexualidad).

MATERIAL DE REFERENCIA OFICIAL ELEGIDO: "${material.label}".
Fragmento real de ese material (el número entre corchetes es la página REAL del libro):
"""
${excerpt}
"""

DATOS DE LA CLASE:
- Asignatura: ${params.asignatura}
- Curso/nivel: ${params.curso || "no especificado"} (${params.subnivel || "subnivel no especificado"})
- Nombre/tema de la ficha: ${params.nombreFicha || "no especificado"}

Con base ÚNICAMENTE en el fragmento anterior (no inventes contenido que no esté ahí), redacta en español ecuatoriano, en tono técnico-pedagógico y breve, un JSON con estos campos:
{
  "objetivo_eis": "objetivo de Educación Integral en Sexualidad para esta clase, en 1-2 frases",
  "orientacion_conceptual": "definiciones o conceptos clave a tratar, tomados del fragmento",
  "recursos": "recursos sugeridos, breve, separados por coma",
  "anticipacion": "1-2 preguntas o una actividad breve de anticipación/motivación",
  "conceptualizacion": "actividad breve de construcción de conocimiento, en viñetas separadas por salto de línea",
  "consolidacion": "actividad breve de cierre/consolidación",
  "indicadores_evaluacion": "1-2 indicadores de evaluación observables, en viñetas"
}

IMPORTANTE: si mencionas una página, debe ser exactamente una de las que aparecen entre corchetes arriba — nunca inventes un número de página que no esté en el fragmento. Si no hay una página clara para algo, simplemente no la menciones. Responde ÚNICAMENTE con el JSON, sin explicación adicional ni backticks.`;

  const res = await generateWithFallback({ prompt, temperature: 0.3, maxOutputTokens: 1400 });
  if ("error" in res) return { error: res.error };

  const match = res.text.match(/\{[\s\S]*\}/);
  if (!match) return { error: "La IA no devolvió una respuesta reconocible. Intenta de nuevo." };
  try {
    const parsed = JSON.parse(match[0]);
    return {
      data: {
        objetivo_eis: String(parsed.objetivo_eis || "").trim(),
        orientacion_conceptual: String(parsed.orientacion_conceptual || "").trim(),
        recursos: String(parsed.recursos || "").trim(),
        anticipacion: String(parsed.anticipacion || "").trim(),
        conceptualizacion: String(parsed.conceptualizacion || "").trim(),
        consolidacion: String(parsed.consolidacion || "").trim(),
        indicadores_evaluacion: String(parsed.indicadores_evaluacion || "").trim(),
        referencePages: pages,
      },
    };
  } catch {
    return { error: "No se pudo interpretar la respuesta de la IA. Intenta de nuevo." };
  }
}
