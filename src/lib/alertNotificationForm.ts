/**
 * Ficha de Notificación de Alerta — documento formal que el docente entrega
 * al DECE dentro de las 48 horas laborables siguientes a identificar un
 * riesgo psicosocial en la junta de curso (mencionado en el Acta de
 * Identificación de Alertas). Puro, sin base de datos.
 */

/** Categorías fijas del formato original, en el mismo orden. */
export const ALERT_NOTIFICATION_CHECKLIST = [
  "Inestabilidad Emocional",
  "Movilidad Humana",
  "Conflictos intrafamiliares",
  "Posible dependencia a sustancias",
  "Vulneración de Derechos",
  "Riesgo Psicosocial",
  "Autolesiones / Ideación autolítica",
  "Hostigamiento Académico",
  "Embarazo, maternidad, paternidad",
  "Hijo/a de PPL",
  "Trabajo infantil",
  "Otros",
] as const;

export const ALERT_NOTIFICATION_VIOLENCE_NOTE =
  "* En caso de existir una situación de violencia, el funcionario que detecta el caso deberá levantar el informe de hecho de violencia según detallan las rutas y protocolos vigentes.";

export const ALERT_NOTIFICATION_DESCRIPTION_HINT =
  "Escribir de forma concreta la alerta identificada, ubicar actores, fecha, lugar, contexto.";

/** Preguntas fijas de la sección "Intervención del funcionario que detecta el caso". */
export const ALERT_NOTIFICATION_INTERVENTION_QUESTIONS = [
  "¿Por qué considera que su estudiante requiere la atención psicosocial del Departamento de Consejería Estudiantil?",
  "¿Cuáles son las dificultades o problemas en el ámbito psicosocial que está presentando él o la estudiante?",
  "¿Cuáles cree que son las causas para que se estén presentando las dificultades?",
  "¿Qué se ha venido haciendo para intentar solucionar el problema al interior de la institución educativa y quienes se han involucrado? (medidas adoptadas por el docente, resuma el procedimiento que se realizó antes de derivar al DECE)",
  "¿Cómo es la relación del estudiante con sus pares dentro del aula?",
] as const;
