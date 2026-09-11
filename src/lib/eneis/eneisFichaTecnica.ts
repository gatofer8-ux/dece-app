/**
 * Ficha Técnica del Equipo Escolar — Implementación de Educación Integral en
 * Sexualidad en Instituciones Educativas: documento de planificación
 * estratégica institucional (una vez por año/ciclo), distinto de las fichas
 * de aplicación de clase (Fase 1). Puro, sin base de datos.
 */

export interface NivelPreparacionOpcion {
  etapa: string;
  objetivo: string | null;
}

/** Modelo fijo de niveles de preparación de la comunidad educativa (selección única). */
export const ENEIS_NIVELES_PREPARACION: NivelPreparacionOpcion[] = [
  { etapa: "Falta de conciencia", objetivo: "Sensibilizar a la comunidad educativa sobre la importancia de la educación integral en Sexualidad." },
  { etapa: "Negación / Resistencia", objetivo: "Sensibilizar a la comunidad educativa sobre la importancia de la educación integral en Sexualidad." },
  { etapa: "Poca conciencia", objetivo: "Formar y fortalecer las capacidades del personal educativo para la implementación de Educación Integral en Sexualidad." },
  { etapa: "Preplanificación", objetivo: "Formar y fortalecer las capacidades del personal educativo para la implementación de Educación Integral en Sexualidad." },
  { etapa: "Preparación", objetivo: "Implementar programas de Educación Integral en Sexualidad con estudiantes y familias." },
  { etapa: "Inicio", objetivo: "Implementar programas de Educación Integral en Sexualidad con estudiantes y familias." },
  { etapa: "Estabilización", objetivo: "Sostener o ampliar la implementación de Estrategias de Educación Integral en Sexualidad." },
  { etapa: "Confirmación / expansión", objetivo: "Sostener o ampliar la implementación de Estrategias de Educación Integral en Sexualidad." },
  { etapa: "Alto nivel de responsabilidad comunitaria", objetivo: null },
];

export interface TemaEis {
  id: string;
  concepto: string;
  tema: string;
}

/** Modelo fijo de conceptos clave y temas de la EIS (selección múltiple, al menos uno por concepto). */
export const ENEIS_TEMAS_EIS: TemaEis[] = [
  { id: "1.1", concepto: "1. Relaciones", tema: "Familias" },
  { id: "1.2", concepto: "1. Relaciones", tema: "Amistad, amor y relaciones románticas" },
  { id: "1.3", concepto: "1. Relaciones", tema: "Tolerancia, inclusión y respeto" },
  { id: "1.4", concepto: "1. Relaciones", tema: "Compromisos a largo plazo y crianza" },
  { id: "2.1", concepto: "2. Valores, derecho, Cultura y sexualidad", tema: "Valores y sexualidad" },
  { id: "2.2", concepto: "2. Valores, derecho, Cultura y sexualidad", tema: "Derechos humanos y sexualidad" },
  { id: "2.3", concepto: "2. Valores, derecho, Cultura y sexualidad", tema: "Cultura, sociedad y sexualidad" },
  { id: "3.1", concepto: "3. Cómo entender el género", tema: "Construcción social del género y de las normas de género" },
  { id: "3.2", concepto: "3. Cómo entender el género", tema: "Igualdad, estereotipos y prejuicios de género" },
  { id: "3.3", concepto: "3. Cómo entender el género", tema: "Violencia de género" },
  { id: "4.1", concepto: "4. La violencia y cómo mantenerse seguros", tema: "Violencia" },
  { id: "4.2", concepto: "4. La violencia y cómo mantenerse seguros", tema: "Consentimiento, privacidad e integridad física" },
  { id: "4.3", concepto: "4. La violencia y cómo mantenerse seguros", tema: "Uso seguro de tecnologías de información y comunicación (TIC)" },
  { id: "5.1", concepto: "5. Habilidades para la salud y bienestar", tema: "Influencia de normas y grupos de pares en la conducta sexual" },
  { id: "5.2", concepto: "5. Habilidades para la salud y bienestar", tema: "Toma de decisiones" },
  { id: "5.3", concepto: "5. Habilidades para la salud y bienestar", tema: "Habilidades de comunicación, rechazo y negociación" },
  { id: "5.4", concepto: "5. Habilidades para la salud y bienestar", tema: "Alfabetización mediática y sexualidad" },
  { id: "5.5", concepto: "5. Habilidades para la salud y bienestar", tema: "Cómo encontrar ayuda y apoyo" },
  { id: "6.1", concepto: "6. El cuerpo humano y el desarrollo", tema: "Anatomía y fisiología sexual y reproductiva" },
  { id: "6.2", concepto: "6. El cuerpo humano y el desarrollo", tema: "Reproducción" },
  { id: "6.3", concepto: "6. El cuerpo humano y el desarrollo", tema: "Pubertad" },
  { id: "6.4", concepto: "6. El cuerpo humano y el desarrollo", tema: "Imagen corporal" },
  { id: "7.1", concepto: "7. Sexualidad y conducta sexual", tema: "Relaciones sexuales, sexualidad y ciclo de vida sexual" },
  { id: "7.2", concepto: "7. Sexualidad y conducta sexual", tema: "Conducta sexual y respuesta sexual" },
  { id: "8.1", concepto: "8. Salud sexual y reproductiva", tema: "Embarazo y prevención del embarazo" },
  { id: "8.2", concepto: "8. Salud sexual y reproductiva", tema: "Estigma del VIH y del sida, atención médica, tratamiento y apoyo" },
  { id: "8.3", concepto: "8. Salud sexual y reproductiva", tema: "Cómo entender, reconocer y reducir el riesgo de ITS, incluido el VIH" },
];

export interface RecursoInstitucional {
  nombre: string;
  poblacion: string;
}

/** Modelo fijo de recursos/herramientas institucionales disponibles (selección múltiple). */
export const ENEIS_RECURSOS_INSTITUCIONALES: RecursoInstitucional[] = [
  { nombre: "Oportunidades Curriculares de Educación Integral en Sexualidad", poblacion: "Estudiantes / Aula" },
  { nombre: "Guía metodológica de Prevención del Embarazo Adolescente", poblacion: "Estudiantes y familias / Aula, taller, espacio informal" },
  { nombre: "Guía de Orientaciones Técnicas para Prevenir y Combatir la Discriminación por Diversidad Sexual e Identidad de Género", poblacion: "Estudiantes, docentes, familias / Aula, taller, espacio informal" },
  { nombre: "Recorrido de la Prevención de la Violencia Sexual y Violencia Basada en Género", poblacion: "Estudiantes a partir de los 12 años / Taller, espacio informal" },
  { nombre: "Metodología \"Para Hacerlo – Rurankapak\"", poblacion: "Estudiantes / Taller, espacio informal" },
];

/** Roles fijos de firmas del Equipo Escolar. */
export const ENEIS_FIRMAS_ESCOLARES_ROLES = ["Equipo Escolar de Educación Integral en Sexualidad", "Autoridad Institucional", "Coordinador ENEIS", "Funcionaria DECE"];
/** Roles fijos de firmas del Equipo Distrital. */
export const ENEIS_FIRMAS_DISTRITALES_ROLES = ["Coordinador DECE Distrital", "Coordinador Distrital ENEIS", "Delegada de las Autoridades Institucionales", "Secretario"];

export interface EneisFichaTecnicaFuncionario {
  nombre: string;
  cargo: string;
}
export interface EneisFichaTecnicaCronogramaItem {
  actividad: string;
  poblacion: string;
  fecha: string;
  responsable: string;
}
export interface EneisFichaTecnicaAvanceItem {
  actividad: string;
  estado: string;
  poblacion: string;
}
export interface EneisFichaTecnicaFirma {
  role: string;
  nombre: string;
}

function safeArray<T>(raw: string | null | undefined): T[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

export const parseFuncionarios = (raw: string | null | undefined) => safeArray<EneisFichaTecnicaFuncionario>(raw);
export const parseTemasSeleccionados = (raw: string | null | undefined) =>
  safeArray<string>(raw).filter((s): s is string => typeof s === "string");
export const parseRecursosSeleccionados = (raw: string | null | undefined) =>
  safeArray<number>(raw).filter((n): n is number => typeof n === "number");
export const parseCronograma = (raw: string | null | undefined) => safeArray<EneisFichaTecnicaCronogramaItem>(raw);
export const parseAvances = (raw: string | null | undefined) => safeArray<EneisFichaTecnicaAvanceItem>(raw);

export function buildFirmas(raw: string | null | undefined, roles: string[]): EneisFichaTecnicaFirma[] {
  const saved = safeArray<EneisFichaTecnicaFirma>(raw);
  return roles.map((role) => ({ role, nombre: saved.find((f) => f.role === role)?.nombre || "" }));
}
