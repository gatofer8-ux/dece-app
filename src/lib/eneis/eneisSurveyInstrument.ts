/**
 * Instrumentos oficiales de percepción sobre la implementación del ENEIS
 * (Estrategia Nacional de Educación Integral en Sexualidad): estudiantes y
 * docentes (10 preguntas de opción múltiple, una sola respuesta), y padres
 * de familia/representantes (banco oficial de preguntas Sí/No). Son puros
 * (sin acceso a base de datos) para poder importarse también desde el
 * formulario público.
 */

export type EneisSurveyInstrument = "ESTUDIANTES" | "DOCENTES" | "REPRESENTANTES";

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

export const ENEIS_PARENT_SURVEY: SurveyQuestion[] = [
  { text: "¿Su hijo(a) consume diariamente frutas y verduras en su alimentación?", options: ["Sí", "No"] },
  { text: "¿Se asegura de que su hijo(a) duerma al menos 8 horas cada noche?", options: ["Sí", "No"] },
  { text: "¿Limita el tiempo que su hijo(a) pasa frente a pantallas (TV, celular, videojuegos)?", options: ["Sí", "No"] },
  { text: "¿Su hijo(a) realiza actividad física o algún tipo de ejercicio al menos 30 minutos al día?", options: ["Sí", "No"] },
  { text: "¿Fomenta en casa el consumo de agua en lugar de bebidas azucaradas?", options: ["Sí", "No"] },
  { text: "¿Tiene establecida una rutina diaria para las comidas y el descanso de su hijo(a)?", options: ["Sí", "No"] },
  { text: "¿Habla abiertamente con su hijo/a sobre sobre la importancia del buen manejo de sus emociones?", options: ["Sí", "No"] },
  { text: "¿Cree que hablar sobre salud mental en las instituciones es importante para el bienestar emocional de sus hijos?", options: ["Sí", "No"] },
  { text: "¿Considera que su hijo puede hablar con usted sin miedo sobre dudas relacionadas con su desarrollo integral (bienestar físico, psicológico, emocional)?", options: ["Sí", "No"] },
  { text: "¿Ha notado cambios en el estado de ánimo de su hijo que podrían estar relacionados con su desarrollo afectivo?", options: ["Sí", "No"] },
  { text: "¿Considera necesario buscar apoyo con profesionales en caso de identificar cambios emocionales o de comportamiento en sus hijos?", options: ["Sí", "No"] },
  { text: "¿Se ofrece información en la Institución Educativa sobre igualdad de género y prevención de la violencia en educación en sexualidad?", options: ["Sí", "No"] },
  { text: "¿Ha recibido formación o capacitación sobre Educación Integral Sexual?", options: ["Sí", "No"] },
  { text: "¿Considera usted que debe ser parte del proceso de educación sexual en sus representados?", options: ["Sí", "No"] },
  { text: "¿Se ha realizado campañas de sensibilización para informar a la comunidad sobre la importancia de la Educación Integral Sexual?", options: ["Sí", "No"] },
  { text: "¿Considera usted que el desayuno saludable es primordial para su hijo?", options: ["Sí", "No"] },
  { text: "¿En su almuerzo consume la porción adecuada de proteínas (carne pollo pescado) verduras (lechuga tomate cebolla) y carbohidratos (papas arroz yuca)?", options: ["Sí", "No"] },
  { text: "¿En su familia se realizan controles nutricionales preventivos?", options: ["Sí", "No"] },
  { text: "¿Usted cómo representante es corresponsable del consumo de alimentos de su hijo/a en la institución educativa?", options: ["Sí", "No"] },
  { text: "¿Cuáles son sus principales dudas o preocupaciones y las de sus hijos en temas de sexualidad?", options: ["Sí", "No"] },
  { text: "¿Que nivel de conocimiento y actitud tiene usted como padre sobre EIS?", options: ["Sí", "No"] },
  { text: "¿La institución ha brindado capacitaciones en prevención de Enfermedades de Transmisión Sexual?", options: ["Sí", "No"] },
  { text: "¿Ha hablado con sus hijos sobre las ETS y sus consecuencias?", options: ["Sí", "No"] },
  { text: "¿Ha recibido información sobre las ETS por parte de otras instancias (p.e., MSP, Junta Cantonal, etc.)? ¿Cuáles?", options: ["Sí", "No"] },
  { text: "¿Existe la confianza y el conocimiento necesario para abordar estos temas en su núcleo familiar?", options: ["Sí", "No"] },
  { text: "¿Cuenta con servicios básicos en su hogar?", options: ["Sí", "No"] },
  { text: "¿Cuenta con un espacio privado (baño, letrina, otros) para su aseo personal y el de su familia?", options: ["Sí", "No"] },
  { text: "¿Provee a sus familiares con los implementos necesarios para su higiene diaria?", options: ["Sí", "No"] },
  { text: "¿Enseña a su hijo/a rutinas de aseo íntimo, de manos, bucal, etc?", options: ["Sí", "No"] },
];

export function getSurveyQuestions(instrument: EneisSurveyInstrument): SurveyQuestion[] {
  if (instrument === "DOCENTES") return ENEIS_TEACHER_SURVEY;
  if (instrument === "REPRESENTANTES") return ENEIS_PARENT_SURVEY;
  return ENEIS_STUDENT_SURVEY;
}

export function instrumentLabel(instrument: EneisSurveyInstrument): string {
  if (instrument === "DOCENTES") return "Encuesta a Docentes";
  if (instrument === "REPRESENTANTES") return "Encuesta a Padres de Familia";
  return "Encuesta a Estudiantes";
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
