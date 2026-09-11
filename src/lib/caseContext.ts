import { db } from "./db";
import { logger } from "./logger";
import { pseudonymize, isHeightenedConfidentiality, minimalCaseContext, type CaseEntities } from "./aiPrivacy";
import type { CaseFileRow, StudentRow } from "./types";
import { studentGradeLabel } from "./studentCourse";

export const RISK_TYPE_LABELS: Record<string, string> = {
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

/** Reúne los datos identificativos del caso para poder seudonimizarlos antes de enviar a la IA. */
export function caseEntities(caseFile: CaseFileRow, student: StudentRow | undefined): CaseEntities {
  const s = student as any;
  return {
    studentName: student?.full_name,
    studentDocument: student?.document_id,
    representativeName: (student as any)?.representative,
    fatherName: s?.father_name,
    motherName: s?.mother_name,
    phones: [s?.rep_phone, s?.father_phone, s?.mother_phone],
    addresses: [s?.address, s?.father_address, s?.mother_address, s?.representative_address],
    emails: [s?.rep_email],
  };
}

/**
 * Arma el contexto del caso para la IA de manera estructurada y segura.
 *
 * - Casos de confidencialidad reforzada (violencia sexual, salud mental,
 *   consumo): devuelve solo un contexto mínimo NO identificativo.
 * - Resto de casos: contexto completo, pero seudonimizado (nombres, cédula,
 *   teléfonos y direcciones reemplazados por su rol).
 */
export function buildCaseContext(caseId: string, institutionId: string): string {
  const caseFile = db.prepare("SELECT * FROM case_files WHERE id = ?").get(caseId) as CaseFileRow | undefined;
  if (!caseFile) return "";
  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow | undefined;

  const riskLabel = RISK_TYPE_LABELS[caseFile.risk_type] || caseFile.risk_type;

  if (isHeightenedConfidentiality(caseFile.risk_type)) {
    return minimalCaseContext({
      code: caseFile.code,
      riskLabel,
      status: caseFile.status,
      priority: caseFile.priority,
    });
  }

  const entities = caseEntities(caseFile, student);
  const lines: string[] = [];

  // 1. Datos del Estudiante y Expediente
  if (student) {
    const courseFull = studentGradeLabel(student) || [student.course, student.parallel].filter(Boolean).join(" ");
    lines.push(`ESTUDIANTE: ${student.full_name} | Documento: ${student.document_id || "s/n"} | Curso: ${courseFull} | Representante: ${student.representative || "s/n"} (Tel: ${student.rep_phone || "s/n"})`);
  }
  lines.push(`EXPEDIENTE: Código ${caseFile.code} | Estado: ${caseFile.status} | Prioridad: ${caseFile.priority} | Eje de acción: ${caseFile.action_axis || "s/n"}`);
  lines.push(`TIPO DE RIESGO / PROBLEMÁTICA: ${RISK_TYPE_LABELS[caseFile.risk_type] || caseFile.risk_type}${caseFile.risk_type_other ? ` (${caseFile.risk_type_other})` : ""}`);
  if (caseFile.detection_source) lines.push(`Fuente de detección: ${caseFile.detection_source} | Fecha de detección: ${caseFile.detection_date || "s/n"}`);
  if (caseFile.description) lines.push(`MOTIVO Y DESCRIPCIÓN DEL CASO: ${caseFile.description}`);

  // 2. Reporte del Hecho de Violencia (si existe)
  try {
    const violenceReport = db.prepare("SELECT * FROM violence_reports WHERE case_file_id = ? ORDER BY created_at DESC LIMIT 1").get(caseId) as any;
    if (violenceReport) {
      lines.push(`\n--- REPORTE DE HECHO DE VIOLENCIA REGISTRADO ---`);
      if (violenceReport.violence_type) lines.push(`Tipo de violencia: ${violenceReport.violence_type}`);
      if (violenceReport.aggressor_relationship) lines.push(`Relación con presunto agresor: ${violenceReport.aggressor_relationship}`);
      if (violenceReport.summary) lines.push(`Hechos reportados: ${violenceReport.summary}`);
      if (violenceReport.immediate_actions) lines.push(`Acciones inmediatas adoptadas: ${violenceReport.immediate_actions}`);
      if (violenceReport.observations) lines.push(`Observaciones: ${violenceReport.observations}`);
    }
  } catch (e) {
    logger.warn("ai-context", "sección de contexto del caso omitida por error", e);
  }

  // 3. Entrevistas Semiestructuradas (si existen)
  try {
    const interviews = db.prepare("SELECT * FROM case_interviews WHERE case_file_id = ? ORDER BY created_at DESC LIMIT 2").all(caseId) as any[];
    if (interviews.length > 0) {
      lines.push(`\n--- INFORMACIÓN DE ENTREVISTAS PSICOSOCIALES REALIZADAS ---`);
      interviews.forEach((iv, idx) => {
        lines.push(`Entrevista ${idx + 1} (a ${iv.interviewee_full_name || "Estudiante"} - Fecha: ${iv.application_date || "s/n"}):`);
        if (iv.family_relation) lines.push(`  - Dinámica familiar: ${iv.family_relation}`);
        if (iv.emotional_state) lines.push(`  - Estado emocional observado: ${iv.emotional_state}`);
        if (iv.social_relations) lines.push(`  - Relaciones sociales con pares: ${iv.social_relations}`);
        if (iv.academic_history) lines.push(`  - Desempeño académico: ${iv.academic_history}`);
        if (iv.bullying_history) lines.push(`  - Antecedentes de acoso escolar: Sí identificado`);
        if (iv.summary) lines.push(`  - Resumen tratado: ${iv.summary}`);
        if (iv.recommendations) lines.push(`  - Recomendaciones: ${iv.recommendations}`);
        if (iv.commitment) lines.push(`  - Compromisos asumidos: ${iv.commitment}`);
      });
    }
  } catch (e) {
    logger.warn("ai-context", "sección de contexto del caso omitida por error", e);
  }

  // 4. Fichas de Observación Áulica (si existen)
  try {
    const obs = db.prepare("SELECT * FROM case_observation_sheets WHERE case_file_id = ? ORDER BY observation_date DESC LIMIT 1").get(caseId) as any;
    if (obs) {
      lines.push(`\n--- FICHA DE OBSERVACIÓN ÁULICA / CONDUCTUAL ---`);
      lines.push(`Nivel de riesgo detectado en aula: ${obs.risk_level || "s/n"} | Contexto: ${obs.context || "AULA"}`);
      if (obs.observations) lines.push(`Observaciones en clase: ${obs.observations}`);
      if (obs.protective_factors) lines.push(`Factores protectores: ${obs.protective_factors}`);
    }
  } catch (e) {
    logger.warn("ai-context", "sección de observación áulica omitida por error", e);
  }

  // 5. Historial de Acciones y Bitácora
  try {
    const actions = db.prepare("SELECT date, type, description, agreements FROM case_actions WHERE case_file_id = ? ORDER BY date DESC, created_at DESC LIMIT 3").all(caseId) as any[];
    if (actions.length > 0) {
      lines.push(`\n--- HISTORIAL DE INTERVENCIONES PREVIAS (BITÁCORA) ---`);
      actions.forEach((act, idx) => {
        lines.push(`Acción ${idx + 1} (${act.type} - Fecha: ${act.date || "s/n"}):`);
        if (act.description) lines.push(`  - Descripción: ${act.description}`);
        if (act.agreements) lines.push(`  - Acuerdos: ${act.agreements}`);
      });
    }
  } catch (e) {
    logger.warn("ai-context", "sección de historial de acciones omitida por error", e);
  }

  // 6. Citas / Agendamientos recientes
  try {
    const appt = db
      .prepare("SELECT id, date, start_time, location FROM appointments WHERE case_file_id = ? ORDER BY date DESC, start_time DESC LIMIT 1")
      .get(caseId) as { id: string; date: string; start_time: string; location?: string } | undefined;
    if (appt) {
      lines.push(`\n--- CITA REGISTRADA DEL CASO ---`);
      lines.push(`CITA_DETALLE: N° cita: ${appt.id.replace(/-/g, "").slice(0, 8)}; Fecha: ${appt.date}; Hora: ${appt.start_time}${appt.location ? `; Lugar: ${appt.location}` : ""}`);
    }
  } catch (e) {
    logger.warn("ai-context", "sección de citas del caso omitida por error", e);
  }

  return pseudonymize(lines.join("\n"), entities);
}
