import { db } from "@/lib/db";
import { GoogleGenAI } from "@google/genai";
import { formatStudentCourseFull } from "@/lib/studentCourse";
import {
  TemplateFilterOptions,
  DeceFieldDefinition,
} from "./types";
import { DECE_FIELDS_CATALOG } from "./deceFieldsCatalog";

function computeAge(birthDate?: string | null): string {
  if (!birthDate) return "";
  const d = new Date(birthDate);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 ? String(age) : "";
}

const RISK_TYPE_LABELS: Record<string, string> = {
  VIOLENCIA_INTRAFAMILIAR: "Violencia intrafamiliar",
  VIOLENCIA_ESCOLAR_BULLYING: "Violencia escolar / bullying",
  VIOLENCIA_SEXUAL: "Violencia sexual",
  CONSUMO_SUSTANCIAS: "Consumo de sustancias",
  SALUD_MENTAL: "Salud mental",
  EMBARAZO_ADOLESCENTE: "Embarazo adolescente",
  VULNERACION_DERECHOS: "Vulneración de derechos",
  DIFICULTAD_APRENDIZAJE: "Dificultad de aprendizaje",
  CONFLICTO_FAMILIAR: "Conflicto familiar",
  CONECTIVIDAD_ACCESO_EDUCATIVO: "Conectividad / acceso educativo",
  OTRO: "Otro",
};

/**
 * Consulta la base de datos aplicando los filtros de búsqueda y construye
 * un diccionario plano de campos homologados para cada caso.
 */
export function queryCasesForReport(
  institutionId: string,
  filters: TemplateFilterOptions = {}
): Record<string, any>[] {
  const conditions: string[] = ["cf.institution_id = ?"];
  const params: any[] = [institutionId];

  if (filters.statuses && filters.statuses.length > 0) {
    conditions.push(`cf.status IN (${filters.statuses.map(() => "?").join(",")})`);
    params.push(...filters.statuses);
  }

  if (filters.riskTypes && filters.riskTypes.length > 0) {
    conditions.push(`cf.risk_type IN (${filters.riskTypes.map(() => "?").join(",")})`);
    params.push(...filters.riskTypes);
  }

  if (filters.priorities && filters.priorities.length > 0) {
    conditions.push(`cf.priority IN (${filters.priorities.map(() => "?").join(",")})`);
    params.push(...filters.priorities);
  }

  if (filters.dateFrom) {
    conditions.push("date(cf.detection_date) >= date(?)");
    params.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    conditions.push("date(cf.detection_date) <= date(?)");
    params.push(filters.dateTo);
  }

  if (filters.courses && filters.courses.length > 0) {
    conditions.push(`s.course IN (${filters.courses.map(() => "?").join(",")})`);
    params.push(...filters.courses);
  }

  if (filters.parallels && filters.parallels.length > 0) {
    conditions.push(`s.parallel IN (${filters.parallels.map(() => "?").join(",")})`);
    params.push(...filters.parallels);
  }

  if (filters.shifts && filters.shifts.length > 0) {
    conditions.push(`s.jornada IN (${filters.shifts.map(() => "?").join(",")})`);
    params.push(...filters.shifts);
  }

  if (filters.assignedUserId) {
    conditions.push("cf.assigned_to_id = ?");
    params.push(filters.assignedUserId);
  }

  if (filters.searchQuery && filters.searchQuery.trim()) {
    const q = `%${filters.searchQuery.trim()}%`;
    conditions.push("(s.full_name LIKE ? OR s.document_id LIKE ? OR cf.code LIKE ?)");
    params.push(q, q, q);
  }

  const sql = `
    SELECT 
      cf.*,
      s.full_name as student_name,
      s.document_id as student_document_id,
      s.birth_date as student_birth_date,
      s.gender as student_gender,
      s.course as student_course,
      s.parallel as student_parallel,
      s.specialty as student_specialty,
      s.education_level as student_education_level,
      s.jornada as student_jornada,
      s.address as student_address,
      s.representative as student_representative,
      s.rep_phone as student_rep_phone,
      s.rep_email as student_rep_email,
      u.name as professional_name,
      inst.name as institution_name,
      inst.code as institution_amie
    FROM case_files cf
    JOIN students s ON s.id = cf.student_id
    LEFT JOIN users u ON u.id = cf.assigned_to_id
    LEFT JOIN institutions inst ON inst.id = cf.institution_id
    WHERE ${conditions.join(" AND ")}
    ORDER BY cf.detection_date DESC, cf.created_at DESC
  `;

  const rows = db.prepare(sql).all(...params) as any[];

  // Formatear cada caso a un diccionario unificado
  const currentDate = new Date().toISOString().slice(0, 10);

  return rows.map((r, index) => {
    // Buscar reportes complementarios asociados al caso
    const violenceReport = db
      .prepare("SELECT * FROM violence_reports WHERE case_file_id = ? ORDER BY report_date DESC LIMIT 1")
      .get(r.id) as any;

    const obsSheet = db
      .prepare("SELECT * FROM case_observation_sheets WHERE case_file_id = ? ORDER BY observation_date DESC LIMIT 1")
      .get(r.id) as any;

    const carePlan = db
      .prepare("SELECT * FROM case_care_plans WHERE case_file_id = ? ORDER BY plan_date DESC LIMIT 1")
      .get(r.id) as any;

    const socAct = db
      .prepare("SELECT * FROM socialization_acts WHERE case_file_id = ? ORDER BY act_date DESC LIMIT 1")
      .get(r.id) as any;

    const referral = db
      .prepare("SELECT * FROM referrals WHERE case_file_id = ? ORDER BY referral_date DESC LIMIT 1")
      .get(r.id) as any;

    const studentMock = {
      course: r.student_course,
      parallel: r.student_parallel,
      specialty: r.student_specialty,
      education_level: r.student_education_level,
    };
    const courseFull = formatStudentCourseFull(studentMock) || `${r.student_course || ""} ${r.student_parallel || ""}`.trim();
    const age = r.student_birth_date ? computeAge(r.student_birth_date) : "";

    return {
      // Estudiante
      "student.full_name": r.student_name || "",
      "student.document_id": r.student_document_id || "",
      "student.course_full": courseFull,
      "student.course": r.student_course || "",
      "student.parallel": r.student_parallel || "",
      "student.specialty": r.student_specialty || "",
      "student.education_level": r.student_education_level || "",
      "student.jornada": r.student_jornada || "",
      "student.birth_date": r.student_birth_date || "",
      "student.age": age,
      "student.gender": r.student_gender || "",
      "student.address": r.student_address || "",
      "student.representative": r.student_representative || "",
      "student.rep_phone": r.student_rep_phone || "",
      "student.rep_email": r.student_rep_email || "",
      "student.rep_relationship": "Representante Legal",

      // Caso
      "case_file.code": r.code || "",
      "case_file.status": r.status || "",
      "case_file.priority": r.priority || "",
      "case_file.risk_type": RISK_TYPE_LABELS[r.risk_type] || r.risk_type || "",
      "case_file.action_axis": r.action_axis || "",
      "case_file.detection_date": r.detection_date || "",
      "case_file.detection_source": r.detection_source || "",
      "case_file.description": r.description || "",
      "case_file.professional_name": r.professional_name || "",

      // Violencia
      "violence.violence_type": violenceReport?.violence_type || "",
      "violence.space_type": violenceReport?.space_type || "",
      "violence.aggressor_relationship": violenceReport?.aggressor_relationship || "",
      "violence.aggressor_name": violenceReport?.aggressor_name || "",
      "violence.summary": violenceReport?.summary || "",
      "violence.immediate_actions": violenceReport?.immediate_actions || "",
      "violence.district_notified": violenceReport?.is_district_notified ? "SÍ" : "NO",

      // Observación y Atención
      "observation.risk_level": obsSheet?.risk_level || "",
      "care_plan.diagnosis": carePlan?.diagnosis || carePlan?.diagnosis_summary || "",
      "socialization.strategies": socAct?.psychosocial_strategies || "",

      // Derivación
      "referral.destination": referral?.institution_dest || "",
      "referral.status": referral?.status || "",

      // Institucional y Fechas
      "institution.name": r.institution_name || "",
      "institution.amie": r.institution_amie || "",
      "system.current_date": currentDate,
      "system.row_number": String(index + 1),
    };
  });
}

/**
 * Traduce una indicación en lenguaje natural escrita por el usuario
 * a un objeto estructurado de filtros TemplateFilterOptions usando Gemini.
 */
export async function parseNaturalLanguageFilter(
  prompt: string
): Promise<TemplateFilterOptions> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { searchQuery: prompt };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const currentYear = new Date().getFullYear();

    const systemPrompt = `Eres un asistente experto para el sistema DECE de gestión de casos escolares en Ecuador.
Tu tarea es convertir una petición en lenguaje natural escrita por un profesional en un conjunto de filtros estructurados JSON.

Año actual: ${currentYear}.
Campos y valores válidos:
- riskTypes: ["VIOLENCIA_INTRAFAMILIAR", "VIOLENCIA_ESCOLAR_BULLYING", "VIOLENCIA_SEXUAL", "CONSUMO_SUSTANCIAS", "SALUD_MENTAL", "EMBARAZO_ADOLESCENTE", "VULNERACION_DERECHOS", "DIFICULTAD_APRENDIZAJE", "CONFLICTO_FAMILIAR", "CONECTIVIDAD_ACCESO_EDUCATIVO", "OTRO"]
- statuses: ["ABIERTO", "EN_SEGUIMIENTO", "DERIVADO", "CERRADO"]
- priorities: ["URGENTE", "ALTA", "MEDIA", "BAJA"]
- educationLevels: ["INICIAL", "BASICA_ELEMENTAL", "BASICA_MEDIA", "BASICA_SUPERIOR", "BACHILLERATO"]
- shifts: ["MATUTINA", "VESPERTINA", "NOCTURNA"]
- dateFrom: formato YYYY-MM-DD
- dateTo: formato YYYY-MM-DD

Responde ÚNICAMENTE con un objeto JSON válido, sin explicaciones ni bloques markdown adicionales.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${systemPrompt}\n\nUsuario: "${prompt}"\nJSON:`,
    });

    const text = (response.text || "").trim().replace(/^```json/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(text);
    return parsed as TemplateFilterOptions;
  } catch (err) {
    console.warn("[parseNaturalLanguageFilter] Fallback a búsqueda simple por texto:", err);
    return { searchQuery: prompt };
  }
}
