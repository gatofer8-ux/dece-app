/**
 * Instrumentos oficiales de percepción sobre la implementación del ENEIS
 * (Estrategia Nacional de Educación Integral en Sexualidad): uno para
 * estudiantes y otro para docentes, 10 preguntas de opción múltiple (una
 * sola respuesta) cada uno. Son puros (sin acceso a base de datos) para
 * poder importarse también desde el formulario público.
 */

export type EneisSurveyInstrument = "ESTUDIANTES" | "DOCENTES";

export interface SurveyQuestion {
  text: string;
  options: string[];
}

export const ENEIS_SURVEY_INTRO =
  'La presente encuesta tiene como objetivo recopilar información sobre la implementación de la Estrategia Nacional de ' +
  'Educación Integral en Sexualidad (ENEIS) en la institución educativa. Sus respuestas son anónimas y confidenciales, y ' +
  'serán utilizadas únicamente con fines diagnósticos y de mejora institucional. No existen respuestas correctas o ' +
  'incorrectas; por ello, se solicita responder con sinceridad, marcando la opción que mejor refleje su experiencia y percepción.';

export const ENEIS_STUDENT_SURVEY: SurveyQuestion[] = [
  {
    text: "¿Con qué frecuencia sus docentes abordan temas de Educación Integral en Sexualidad (ENEIS) en clases?",
    options: ["Siempre", "Casi siempre", "A veces", "Rara vez", "Nunca"],
  },
  {
    text: "¿Cómo califica la claridad con la que los docentes explican los temas de ENEIS?",
    options: ["Muy clara", "Clara", "Medianamente clara", "Poco clara", "Nada clara"],
  },
  {
    text: "¿Los docentes fomentan un ambiente de respeto y confianza al tratar temas de sexualidad?",
    options: ["Siempre", "Casi siempre", "A veces", "Rara vez", "Nunca"],
  },
  {
    text: "¿Ha recibido información sobre derechos sexuales y reproductivos en la institución?",
    options: ["Sí, de manera suficiente", "Sí, de manera parcial", "Pocas veces", "Casi nunca", "Nunca"],
  },
  {
    text: "¿Los contenidos de ENEIS le ayudan a reconocer situaciones de riesgo o vulneración de derechos?",
    options: ["Mucho", "Bastante", "Poco", "Muy poco", "Nada"],
  },
  {
    text: "¿Considera que los docentes demuestran preparación al abordar temas de ENEIS?",
    options: ["Muy preparados", "Preparados", "Medianamente preparados", "Poco preparados", "Nada preparados"],
  },
  {
    text: "¿Los temas tratados en ENEIS se relacionan con situaciones reales de su vida cotidiana?",
    options: ["Siempre", "Casi siempre", "A veces", "Rara vez", "Nunca"],
  },
  {
    text: "¿Ha recibido orientación sobre prevención de violencia, acoso o abuso sexual?",
    options: ["Sí, frecuentemente", "Sí, algunas veces", "Pocas veces", "Casi nunca", "Nunca"],
  },
  {
    text: "¿Considera que el ENEIS contribuye a mejorar el respeto y la convivencia entre estudiantes?",
    options: ["Mucho", "Bastante", "Poco", "Muy poco", "Nada"],
  },
  {
    text: "En general, ¿cómo califica la implementación del ENEIS por parte de los docentes?",
    options: ["Muy buena", "Buena", "Regular", "Deficiente", "Muy deficiente"],
  },
];

export const ENEIS_TEACHER_SURVEY: SurveyQuestion[] = [
  {
    text: "¿Cuál es su nivel de conocimiento sobre los lineamientos del ENEIS?",
    options: ["Muy alto", "Alto", "Medio", "Bajo", "Nulo"],
  },
  {
    text: "¿Ha recibido capacitaciones institucionales sobre ENEIS?",
    options: ["Sí, suficientes", "Sí, algunas", "Pocas", "Muy pocas", "Ninguna"],
  },
  {
    text: "¿Con qué frecuencia integra contenidos del ENEIS en su planificación curricular?",
    options: ["Siempre", "Casi siempre", "A veces", "Rara vez", "Nunca"],
  },
  {
    text: "¿Dispone de recursos pedagógicos adecuados para trabajar el ENEIS?",
    options: ["Siempre", "Casi siempre", "A veces", "Rara vez", "Nunca"],
  },
  {
    text: "¿Los contenidos del ENEIS son pertinentes al contexto de sus estudiantes?",
    options: ["Muy pertinentes", "Pertinentes", "Medianamente pertinentes", "Poco pertinentes", "Nada pertinentes"],
  },
  {
    text: "¿Ha identificado resistencia al abordar temas de sexualidad en la comunidad educativa?",
    options: ["Siempre", "Frecuentemente", "Ocasionalmente", "Rara vez", "Nunca"],
  },
  {
    text: "¿Se siente respaldado institucionalmente para implementar el ENEIS?",
    options: ["Totalmente respaldado", "Respaldado", "Medianamente respaldado", "Poco respaldado", "Nada respaldado"],
  },
  {
    text: "¿Coordina acciones del ENEIS con el DECE u otras instancias institucionales?",
    options: ["Siempre", "Casi siempre", "A veces", "Rara vez", "Nunca"],
  },
  {
    text: "¿Considera que la implementación del ENEIS contribuye a la prevención de riesgos psicosociales?",
    options: ["Mucho", "Bastante", "Poco", "Muy poco", "Nada"],
  },
  {
    text: "En términos generales, ¿cómo evalúa el nivel de implementación del ENEIS en la institución?",
    options: ["Muy alto", "Alto", "Medio", "Bajo", "Nulo"],
  },
];

export function getSurveyQuestions(instrument: EneisSurveyInstrument): SurveyQuestion[] {
  return instrument === "DOCENTES" ? ENEIS_TEACHER_SURVEY : ENEIS_STUDENT_SURVEY;
}

export function instrumentLabel(instrument: EneisSurveyInstrument): string {
  return instrument === "DOCENTES" ? "Encuesta a Docentes" : "Encuesta a Estudiantes";
}

/** Valida que las respuestas cubran todas las preguntas con índices de opción válidos. */
export function validateSurveyAnswers(instrument: EneisSurveyInstrument, answers: unknown): number[] | null {
  const questions = getSurveyQuestions(instrument);
  if (!Array.isArray(answers) || answers.length !== questions.length) return null;
  const parsed: number[] = [];
  for (let i = 0; i < questions.length; i++) {
    const n = Number(answers[i]);
    if (!Number.isInteger(n) || n < 0 || n >= questions[i].options.length) return null;
    parsed.push(n);
  }
  return parsed;
}
