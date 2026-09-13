import { db } from "@/lib/db";
import { TAPAS_FAMILIES, ARCHETYPE_MAP, type TapasFamily } from "@/lib/tapas/archetypes";
import type { TapasResult } from "@/lib/tapas/tapasScoring";
import { IPPJ_SCALE_META, type IppjScale } from "./ippjInstrument";
import type { IppjScoreResult } from "./ippjScoring";
import { suggestedAreasFor, type CareerArea } from "./ippjCareers";
import type {
  StudentRow,
  InstitutionRow,
  TapasApplicationRow,
  OvpApplicationRow,
  UserRow,
} from "@/lib/types";

export interface ConsolidatedVocationalData {
  student: StudentRow;
  institution: InstitutionRow;
  professional: UserRow | null;
  tapasApp: TapasApplicationRow | null;
  tapasResult: TapasResult | null;
  ippjApp: OvpApplicationRow | null;
  ippjResult: IppjScoreResult | null;
  ippjSurvey: Record<string, unknown> | null;
  suggestedAreas: { fromType: IppjScale; area: CareerArea }[];
  coherenceLevel: "ALTA_COHERENCIA" | "COMPLEMENTARIO" | "EN_EXPLORACION";
  coherenceTitle: string;
  coherenceAnalysis: string;
  recommendedCareers: string[];
  evaluationDate: string;
}

// Mapa de correspondencia entre familias TaPas y escalas Holland RIASEC
const TAPAS_TO_HOLLAND_MAP: Record<TapasFamily, IppjScale[]> = {
  CREAR: ["ARTISTICA"],
  INDAGAR: ["INVESTIGADORA"],
  CONSTRUIR: ["REALISTA", "CONVENCIONAL"],
  CUIDAR: ["SOCIAL"],
  LIDERAR: ["EMPRENDEDORA"],
  EXPLORAR: ["REALISTA", "INVESTIGADORA"],
};

export function computeVocationalCoherence(
  dominantFamilias: string[],
  topHollandTypes: IppjScale[]
): {
  level: "ALTA_COHERENCIA" | "COMPLEMENTARIO" | "EN_EXPLORACION";
  title: string;
  analysis: string;
} {
  if (!dominantFamilias.length || !topHollandTypes.length) {
    return {
      level: "EN_EXPLORACION",
      title: "Perfil en Fase de Exploración Inicial",
      analysis:
        "El estudiante se encuentra en proceso de definición vocacional. Se recomienda continuar con las actividades de autoconocimiento y contraste de intereses formativos.",
    };
  }

  // Contar coincidencias directas entre familias dominantes de TaPas y tipos dominantes de Holland
  let directMatches = 0;
  for (const f of dominantFamilias) {
    const related = TAPAS_TO_HOLLAND_MAP[f as TapasFamily] || [];
    if (related.some((scale) => topHollandTypes.includes(scale))) {
      directMatches++;
    }
  }

  if (directMatches >= 2) {
    return {
      level: "ALTA_COHERENCIA",
      title: "Alta Coherencia y Madurez Vocacional",
      analysis:
        "Existe una correspondencia directa y sólida entre los talentos y arquetipos intrínsecos del estudiante (TaPas) y sus intereses profesionales manifiestos (IPPJ). El estudiante demuestra claridad y autoeficacia vocacional, lo que favorece una transición exitosa a la educación superior.",
    };
  }

  if (directMatches === 1) {
    return {
      level: "COMPLEMENTARIO",
      title: "Perfil Interdisciplinario y Complementario",
      analysis:
        "El perfil combina talentos personales con áreas de interés que se enriquecen mutuamente de forma interdisciplinaria (por ejemplo, creatividad unida a liderazgo o indagación científica aplicada a la gestión). Se sugieren campos profesionales amplios o de doble titulación.",
    };
  }

  return {
    level: "EN_EXPLORACION",
    title: "Perfil Multipotencial y de Amplia Exploración",
    analysis:
      "El estudiante manifiesta intereses diversos y variados que aún no se concentran en una sola área ocupacional. Se recomienda priorizar la entrevista vocacional individual para contrastar asignaturas preferidas, habilidades prácticas y expectativas familiares antes de la postulación universitaria definitiva.",
  };
}

export function getStudentVocationalSynthesis(
  studentId: string,
  institutionId: string
): ConsolidatedVocationalData | null {
  const student = db
    .prepare("SELECT * FROM students WHERE id = ? AND institution_id = ?")
    .get(studentId, institutionId) as StudentRow | undefined;
  if (!student) return null;

  const institution = db
    .prepare("SELECT * FROM institutions WHERE id = ?")
    .get(institutionId) as InstitutionRow;

  // Buscar última aplicación TaPas finalizada (por student_id o coincidencia exacta de nombre)
  let tapasApp = db
    .prepare(
      `SELECT * FROM tapas_applications 
       WHERE institution_id = ? AND student_id = ? AND status = 'FINALIZADA'
       ORDER BY finished_at DESC LIMIT 1`
    )
    .get(institutionId, studentId) as TapasApplicationRow | undefined;

  if (!tapasApp) {
    tapasApp = db
      .prepare(
        `SELECT * FROM tapas_applications 
         WHERE institution_id = ? AND LOWER(TRIM(student_name)) = LOWER(TRIM(?)) AND status = 'FINALIZADA'
         ORDER BY finished_at DESC LIMIT 1`
      )
      .get(institutionId, student.full_name) as TapasApplicationRow | undefined;
  }

  // Buscar última aplicación IPPJ finalizada (por student_id o coincidencia exacta de nombre)
  let ippjApp = db
    .prepare(
      `SELECT * FROM ovp_applications 
       WHERE institution_id = ? AND student_id = ? AND status = 'FINALIZADA'
       ORDER BY finished_at DESC LIMIT 1`
    )
    .get(institutionId, studentId) as OvpApplicationRow | undefined;

  if (!ippjApp) {
    ippjApp = db
      .prepare(
        `SELECT * FROM ovp_applications 
         WHERE institution_id = ? AND LOWER(TRIM(student_name)) = LOWER(TRIM(?)) AND status = 'FINALIZADA'
         ORDER BY finished_at DESC LIMIT 1`
      )
      .get(institutionId, student.full_name) as OvpApplicationRow | undefined;
  }

  let tapasResult: TapasResult | null = null;
  if (tapasApp?.result_json) {
    try {
      tapasResult = JSON.parse(tapasApp.result_json) as TapasResult;
    } catch {
      tapasResult = null;
    }
  }

  let ippjResult: IppjScoreResult | null = null;
  let ippjSurvey: Record<string, unknown> | null = null;
  if (ippjApp?.result_json) {
    try {
      ippjResult = JSON.parse(ippjApp.result_json) as IppjScoreResult;
    } catch {
      ippjResult = null;
    }
  }
  if (ippjApp?.survey_json) {
    try {
      ippjSurvey = JSON.parse(ippjApp.survey_json) as Record<string, unknown>;
    } catch {
      ippjSurvey = null;
    }
  }

  const dominantFamilias = tapasResult?.dominantFamilias || [];
  const topHollandTypes = ippjResult?.topTypes || [];

  const coherence = computeVocationalCoherence(dominantFamilias, topHollandTypes);
  const suggestedAreas = topHollandTypes.length > 0 ? suggestedAreasFor(topHollandTypes) : [];

  // Consolidar carreras recomendadas
  const careerSet = new Set<string>();

  // 1. Carreras de las áreas sugeridas IPPJ
  for (const { area } of suggestedAreas) {
    for (const ej of area.ejemplos) {
      careerSet.add(ej);
    }
  }

  // 2. Carreras declaradas por el estudiante en su encuesta previa
  if (ippjSurvey && Array.isArray(ippjSurvey.carreras_pref)) {
    for (const c of ippjSurvey.carreras_pref) {
      if (typeof c === "string" && c.trim()) {
        careerSet.add(c.trim());
      }
    }
  }

  // Profesional DECE institucional
  const professional = db
    .prepare(
      "SELECT * FROM users WHERE institution_id = ? AND role IN ('DECE', 'ADMIN') AND active = 1 ORDER BY name ASC LIMIT 1"
    )
    .get(institutionId) as UserRow | null;

  const evalDate =
    (ippjApp?.finished_at || tapasApp?.finished_at || "").slice(0, 10) ||
    new Date().toISOString().slice(0, 10);

  return {
    student,
    institution,
    professional,
    tapasApp: tapasApp || null,
    tapasResult,
    ippjApp: ippjApp || null,
    ippjResult,
    ippjSurvey,
    suggestedAreas,
    coherenceLevel: coherence.level,
    coherenceTitle: coherence.title,
    coherenceAnalysis: coherence.analysis,
    recommendedCareers: Array.from(careerSet).slice(0, 12),
    evaluationDate: evalDate,
  };
}
