import type { TapasInstrument, TapasNivel } from "./niveles";

/**
 * Recomendaciones del informe colectivo, según la herramienta y el nivel. Salen de las
 * orientaciones del Manual TaPas (pp. 23, 27 y 47) y del enfoque de promoción y prevención del DECE.
 */
export function recomendacionesGrupales(
  instrument: TapasInstrument,
  nivel: TapasNivel,
  ctx: { participation: number | null }
): string[] {
  const out: string[] = [];

  if (ctx.participation !== null && ctx.participation < 80) {
    out.push(
      `La participación fue del ${ctx.participation}%: reabrir la aplicación o convocar de nuevo al curso para completar el proceso antes de sacar conclusiones del grupo.`
    );
  }

  if (nivel === "INICIAL") {
    out.push("Compartir los resultados con las familias como una mirada de talentos y pasiones, sin comparar entre niñas y niños.");
    out.push("Planificar con la docente o el docente actividades de juego, arte, movimiento y cuidado que den oportunidad de practicar lo que más disfruta cada niña y niño.");
    return out;
  }

  if (instrument === "ARQUETIPOS") {
    out.push("Usar las familias de talento dominantes del grupo para planificar talleres y espacios de orientación vocacional del eje de promoción y prevención.");
    out.push("Devolver al grupo los verbos con los que nombraron sus talentos y conversar cuáles se parecen entre compañeros.");
  } else if (instrument === "PERFIL_V1" || instrument === "PERFIL_V2") {
    out.push("Analizar con el grupo los cuatro cuadrantes: lo que se hace bien y gusta (potenciar), lo que gusta pero cuesta (practicar), lo que se hace bien pero no gusta (revisar) y lo que no es prioridad.");
    out.push("Aplicar el Experimento de talento a quienes identificaron un talento con pasión, para confirmarlo y ampliarlo.");
    if (instrument === "PERFIL_V2") out.push("Usar el vínculo entre asignaturas y tiempo libre para orientar proyectos de aula y actividades extracurriculares.");
  } else {
    out.push("Hacer una plenaria breve en la que cada estudiante comparta cómo resumiría su experiencia y qué descubrió; recordar que no hay resultados correctos o incorrectos, sino honestidad.");
    out.push("Con los desafíos más frecuentes, organizar apoyos de práctica en el aula y pedir a los docentes tutores que reconozcan los talentos descubiertos.");
    out.push("Tomar el nuevo perfil de talentos como base para nuevos experimentos: todas las personas pueden seguir descubriendo y desarrollando sus talentos.");
  }

  if (nivel === "BACHILLERATO") {
    out.push("Con cada estudiante, identificar entre 5 y 10 áreas de estudio o campos profesionales relacionados con sus talentos y elegir los 3 más atractivos; considerar la oferta educativa cercana, los costos y las becas disponibles.");
    out.push("Integrar el resultado con los demás instrumentos de OVP (intereses profesionales, matriz de toma de decisiones) en el informe consolidado, como aporte a la dimensión de autoconocimiento del Proyecto de Vida.");
  } else {
    out.push("Informar al docente tutor y a las familias de los talentos del grupo, y acordar cómo reconocerlos y desarrollarlos en el aula.");
  }
  return out;
}
