"use server";

import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { requireOwnedCase } from "@/lib/scopedDb";
import { logger } from "@/lib/logger";
import { draftText, draftBimonthlyMatrixDraft, draftObservationComment, draftObservationGlobalAnalysis, draftCorresponsibilityDifficulty, draftCorresponsibilityLegalFramework, draftCorresponsibilityCommitments, isAiConfigured } from "@/lib/ai";
import { pseudonymize, isHeightenedConfidentiality, minimalCaseContext, type CaseEntities } from "@/lib/aiPrivacy";
import type { CorresponsibilityConflictType } from "@/lib/types";
import type { CaseFileRow, StudentRow, ViolenceReportRow, CaseActionRow } from "@/lib/types";

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

/** Referencia neutra al estudiante para las llamadas a la IA (nunca el nombre real). */
const STUDENT_REF = "el/la estudiante";

/**
 * Texto de un caso listo para enviar a la IA: vacío si el caso es de
 * confidencialidad reforzada; seudonimizado en el resto.
 */
function caseTextForAi(
  text: string | null | undefined,
  caseFile: CaseFileRow,
  student: StudentRow | undefined
): string {
  if (isHeightenedConfidentiality(caseFile.risk_type)) return "";
  return pseudonymize(text ?? "", caseEntities(caseFile, student));
}

/** Reúne los datos identificativos del caso para poder seudonimizarlos antes de enviar a la IA. */
function caseEntities(caseFile: CaseFileRow, student: StudentRow | undefined): CaseEntities {
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
 * Arma el contexto del caso para la IA.
 *
 * - Casos de confidencialidad reforzada (violencia sexual, salud mental,
 *   consumo): devuelve solo un contexto mínimo NO identificativo.
 * - Resto de casos: contexto completo, pero seudonimizado (nombres, cédula,
 *   teléfonos y direcciones reemplazados por su rol).
 */
function buildCaseContext(caseId: string, institutionId: string): string {
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
    const courseFull = [student.course, student.parallel ? `"${student.parallel}"` : "", (student as any).specialty || ""].filter(Boolean).join(" ");
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
    logger.warn("ai-context", "sección de contexto del caso omitida por error", e);
  }

  // 5. Informe Técnico Situacional (si existe)
  try {
    const sitReport = db.prepare("SELECT * FROM situational_reports WHERE case_file_id = ? ORDER BY created_at DESC LIMIT 1").get(caseId) as any;
    if (sitReport) {
      lines.push(`\n--- INFORME TÉCNICO SITUACIONAL ---`);
      if (sitReport.technical_criterion) lines.push(`Criterio técnico: ${sitReport.technical_criterion}`);
      if (sitReport.conclusions) lines.push(`Conclusiones: ${sitReport.conclusions}`);
      if (sitReport.recommendations) lines.push(`Recomendaciones institucionales: ${sitReport.recommendations}`);
    }
  } catch (e) {
    logger.warn("ai-context", "sección de contexto del caso omitida por error", e);
  }

  // 6. Actas de Corresponsabilidad Familiar (si existen)
  try {
    const corrAct = db.prepare("SELECT * FROM case_corresponsibility_acts WHERE case_file_id = ? ORDER BY created_at DESC LIMIT 1").get(caseId) as any;
    if (corrAct) {
      lines.push(`\n--- ACTA DE CORRESPONSABILIDAD FAMILIAR ---`);
      if (corrAct.detected_difficulty) lines.push(`Dificultad detectada: ${corrAct.detected_difficulty}`);
      if (corrAct.commitments_representative) lines.push(`Compromisos del representante: ${corrAct.commitments_representative}`);
      if (corrAct.commitments_dece) lines.push(`Compromisos DECE: ${corrAct.commitments_dece}`);
    }
  } catch (e) {
    logger.warn("ai-context", "sección de contexto del caso omitida por error", e);
  }

  // 7. Plan de Atención Psicosocial y Seguimiento (si existe)
  try {
    const carePlan = db.prepare("SELECT * FROM case_care_plans WHERE case_file_id = ? ORDER BY created_at DESC LIMIT 1").get(caseId) as any;
    if (carePlan) {
      lines.push(`\n--- PLAN DE ATENCIÓN PSICOSOCIAL ---`);
      if (carePlan.diagnosis_summary || carePlan.diagnosis) lines.push(`Diagnóstico del plan: ${carePlan.diagnosis_summary || carePlan.diagnosis}`);
    }
  } catch (e) {
    logger.warn("ai-context", "sección de contexto del caso omitida por error", e);
  }

  // 8. Actas de Socialización Previas (si existen)
  try {
    const socAct = db.prepare("SELECT * FROM socialization_acts WHERE case_file_id = ? ORDER BY created_at DESC LIMIT 1").get(caseId) as any;
    if (socAct) {
      lines.push(`\n--- ACTA DE SOCIALIZACIÓN PREVIA ---`);
      if (socAct.vulnerability_type || socAct.vulnerability_situation) lines.push(`Situación de vulnerabilidad: ${socAct.vulnerability_type || socAct.vulnerability_situation}`);
      if (socAct.psychosocial_strategies) lines.push(`Estrategias previas: ${socAct.psychosocial_strategies}`);
    }
  } catch (e) {
    logger.warn("ai-context", "sección de contexto del caso omitida por error", e);
  }

  // 9. Bitácora de Acciones Recientes
  try {
    const actions = db.prepare("SELECT type, description, date FROM case_actions WHERE case_file_id = ? ORDER BY date DESC, created_at DESC LIMIT 4").all(caseId) as any[];
    if (actions.length > 0) {
      lines.push(`\n--- ACCIONES RECIENTES EN BITÁCORA ---`);
      actions.forEach(a => lines.push(`- [${a.type}] ${a.description}`));
    }
  } catch (e) {
    logger.warn("ai-context", "sección de contexto del caso omitida por error", e);
  }

  return pseudonymize(lines.join("\n"), entities);
}

export async function generateAiDraft(
  caseId: string,
  fieldLabel: string,
  currentText: string
): Promise<{ text?: string; error?: string; heightenedConfidentiality?: boolean }> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  if (!isAiConfigured()) {
    return { error: "La ayuda de IA todavía no está configurada en este sistema." };
  }

  try {
    requireOwnedCase(caseId, institutionId);
  } catch (err: any) {
    return { error: err?.message || "Caso no encontrado." };
  }

  const caseFile = db.prepare("SELECT risk_type FROM case_files WHERE id = ?").get(caseId) as
    | { risk_type: string }
    | undefined;
  const heightened = isHeightenedConfidentiality(caseFile?.risk_type);

  const context = buildCaseContext(caseId, institutionId);
  const result = await draftText({ fieldLabel, context, currentText: currentText || "" });
  if ("error" in result) return { error: result.error };
  return { text: result.text, heightenedConfidentiality: heightened };
}

export async function generateBimonthlyMatrixSuggestions(
  caseId: string
): Promise<{ suggestions?: Record<string, string>; error?: string }> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  if (!isAiConfigured()) {
    return { error: "La ayuda de IA todavía no está configurada en este sistema." };
  }

  try {
    requireOwnedCase(caseId, institutionId);
  } catch (err: any) {
    return { error: err?.message || "Caso no encontrado." };
  }

  const context = buildCaseContext(caseId, institutionId);
  const result = await draftBimonthlyMatrixDraft({ context });
  if ("error" in result) return { error: result.error };
  return { suggestions: result.suggestions };
}

/**
 * IA Contextual para un campo/pregunta de la Ficha de Observación Oficial.
 */
export async function generateObservationCommentAi(params: {
  caseId: string;
  targetQuestion: string;
  targetQuestionGuidance?: string;
  userDraft?: string;
  currentObservationContext?: string;
  answeredQuestionsSummary?: string;
}): Promise<{ text?: string; error?: string }> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  if (!isAiConfigured()) {
    return { error: "La ayuda de IA todavía no está configurada en este sistema." };
  }

  try {
    requireOwnedCase(params.caseId, institutionId);
  } catch (err: any) {
    return { error: err?.message || "Caso no encontrado." };
  }

  const caseFile = db.prepare("SELECT * FROM case_files WHERE id = ?").get(params.caseId) as CaseFileRow;
  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;
  const actions = db
    .prepare("SELECT type, description FROM case_actions WHERE case_file_id = ? ORDER BY date DESC LIMIT 3")
    .all(params.caseId) as CaseActionRow[];

  const previousActionsSummary = caseTextForAi(
    actions.map((a) => `${a.type}: ${a.description.slice(0, 100)}`).join("; "),
    caseFile,
    student
  );

  const res = await draftObservationComment({
    studentName: STUDENT_REF,
    course: `${student.course || ""} ${student.parallel || ""}`.trim(),
    riskType: RISK_TYPE_LABELS[caseFile.risk_type] || caseFile.risk_type,
    caseDescription: caseTextForAi(caseFile.description, caseFile, student),
    previousActionsSummary,
    currentObservationContext: params.currentObservationContext,
    answeredQuestionsSummary: params.answeredQuestionsSummary,
    targetQuestion: params.targetQuestion,
    targetQuestionGuidance: params.targetQuestionGuidance,
    userDraft: params.userDraft,
  });

  if ("error" in res) return { error: res.error };
  return { text: res.text };
}

/**
 * IA para el Análisis Global de Atención Requerida y Derivaciones.
 */
export async function generateObservationGlobalAnalysisAi(params: {
  caseId: string;
  observationSummary: string;
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  if (!isAiConfigured()) {
    return { error: "La ayuda de IA todavía no está configurada en este sistema." };
  }

  try {
    requireOwnedCase(params.caseId, institutionId);
  } catch (err: any) {
    return { error: err?.message || "Caso no encontrado." };
  }

  const caseFile = db.prepare("SELECT * FROM case_files WHERE id = ?").get(params.caseId) as CaseFileRow;
  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;

  return await draftObservationGlobalAnalysis({
    studentName: STUDENT_REF,
    course: `${student.course || ""} ${student.parallel || ""}`.trim(),
    riskType: RISK_TYPE_LABELS[caseFile.risk_type] || caseFile.risk_type,
    caseDescription: caseTextForAi(caseFile.description, caseFile, student),
    observationSummary: params.observationSummary,
  });
}



/**
 * IA para redactar la Dificultad Detectada del Acta de Corresponsabilidad
 */
export async function generateCorresponsibilityDifficultyAi(params: {
  caseId: string;
  conflictType: CorresponsibilityConflictType;
  detectedNotes?: string;
}) {
  try {
    const session = await requireRole(["ADMIN", "DECE"]);
    const institutionId = requireInstitutionId(session);

    if (!isAiConfigured()) {
      return { error: "La ayuda de IA todavía no está configurada en este sistema." };
    }

    requireOwnedCase(params.caseId, institutionId);

    const caseFile = db.prepare("SELECT * FROM case_files WHERE id = ?").get(params.caseId) as CaseFileRow | undefined;
    if (!caseFile) return { error: "Caso no encontrado." };

    const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow | undefined;
    if (!student) return { error: "Estudiante no encontrado." };

    let actionsSummary = "";
    try {
      const actions = db
        .prepare("SELECT type, description FROM case_actions WHERE case_file_id = ? ORDER BY date DESC, created_at DESC LIMIT 5")
        .all(params.caseId) as { type: string; description: string }[];
      actionsSummary = caseTextForAi(
        actions.map((a) => `${a.type}: ${(a.description || "").slice(0, 100)}`).join("; "),
        caseFile,
        student
      );
    } catch {
      actionsSummary = "";
    }

    return await draftCorresponsibilityDifficulty({
      studentName: STUDENT_REF,
      studentGrade: `${student.course || ""} ${student.parallel || ""}`.trim(),
      conflictType: params.conflictType,
      detectedNotes: params.detectedNotes,
      caseContext: {
        code: caseFile.code,
        situationType: RISK_TYPE_LABELS[caseFile.risk_type] || caseFile.risk_type,
        background: caseTextForAi(caseFile.description, caseFile, student),
        actionsSummary,
      },
    });
  } catch (err: any) {
    console.error("[generateCorresponsibilityDifficultyAi]", err);
    return { error: err?.message || "Ocurrió un error al consultar la IA." };
  }
}

/**
 * IA para redactar la Fundamentación Legal Estricta por Conflicto
 */
export async function generateCorresponsibilityLegalFrameworkAi(params: {
  caseId: string;
  conflictType: CorresponsibilityConflictType;
  difficultySummary: string;
}) {
  try {
    const session = await requireRole(["ADMIN", "DECE"]);
    const institutionId = requireInstitutionId(session);

    if (!isAiConfigured()) {
      return { error: "La ayuda de IA todavía no está configurada en este sistema." };
    }

    requireOwnedCase(params.caseId, institutionId);

    const caseFile = db.prepare("SELECT * FROM case_files WHERE id = ?").get(params.caseId) as CaseFileRow | undefined;
    if (!caseFile) return { error: "Caso no encontrado." };

    const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow | undefined;
    if (!student) return { error: "Estudiante no encontrado." };

    return await draftCorresponsibilityLegalFramework({
      conflictType: params.conflictType,
      difficultySummary: params.difficultySummary,
      studentName: STUDENT_REF,
    });
  } catch (err: any) {
    console.error("[generateCorresponsibilityLegalFrameworkAi]", err);
    return { error: err?.message || "Ocurrió un error al consultar la IA." };
  }
}

/**
 * IA para redactar los Acuerdos y Compromisos del Representante y DECE
 */
export async function generateCorresponsibilityCommitmentsAi(params: {
  caseId: string;
  conflictType: CorresponsibilityConflictType;
  detectedDifficulty: string;
}) {
  try {
    const session = await requireRole(["ADMIN", "DECE"]);
    const institutionId = requireInstitutionId(session);

    if (!isAiConfigured()) {
      return { error: "La ayuda de IA todavía no está configurada en este sistema." };
    }

    requireOwnedCase(params.caseId, institutionId);

    const caseFile = db.prepare("SELECT * FROM case_files WHERE id = ?").get(params.caseId) as CaseFileRow | undefined;
    if (!caseFile) return { error: "Caso no encontrado." };

    const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow | undefined;
    if (!student) return { error: "Estudiante no encontrado." };

    return await draftCorresponsibilityCommitments({
      studentName: STUDENT_REF,
      conflictType: params.conflictType,
      detectedDifficulty: params.detectedDifficulty,
    });
  } catch (err: any) {
    console.error("[generateCorresponsibilityCommitmentsAi]", err);
    return { error: err?.message || "Ocurrió un error al consultar la IA." };
  }
}

/**
 * Asistente de IA para la redacción de secciones del Informe Técnico de Cierre de Caso
 */
export async function generateClosureReportAiDraft(params: {
  caseId: string;
  field: "closure_reasons" | "conclusions" | "recommendations" | "psychosocial_summary";
  closureType: string;
  currentText: string;
}): Promise<{ text?: string; error?: string }> {
  try {
    const session = await requireRole(["ADMIN", "DECE"]);
    const institutionId = requireInstitutionId(session);

    if (!isAiConfigured()) {
      return { error: "La ayuda de IA todavía no está configurada en este sistema." };
    }

    requireOwnedCase(params.caseId, institutionId);

    const fieldLabels: Record<string, string> = {
      closure_reasons: "Razones del Cierre o Traslado de Caso (Informe Técnico de Cierre DECE)",
      conclusions: "Conclusiones del Informe Técnico de Cierre de Caso DECE",
      recommendations: "Recomendaciones Institucionales y Familiares de Cierre DECE",
      psychosocial_summary: "Resumen de Acciones Psicosociales Realizadas por el DECE",
    };

    const caseContext =
      buildCaseContext(params.caseId, institutionId) +
      `\nTipo de informe: ${params.closureType}. Asegurar enfoque de derechos, interés superior del niño, protección integral, restitución de derechos y no revictimización. No uses palabras resaltadas ni formato informal.`;

    const result = await draftText({
      fieldLabel: fieldLabels[params.field] || params.field,
      context: caseContext,
      currentText: params.currentText || "",
    });

    if ("error" in result) return { error: result.error };
    return { text: result.text };
  } catch (err: any) {
    console.error("[generateClosureReportAiDraft]", err);
    return { error: err?.message || "Ocurrió un error al consultar el asistente de IA." };
  }
}

/**
 * Asistente de IA para redacción técnica de Ficha de Notificación de Alerta
 */
export async function generateAlertInterventionAi(params: {
  caseId: string;
  questionKey: "pregunta_1" | "pregunta_2" | "pregunta_3" | "pregunta_4" | "pregunta_5" | "hechos" | "especificar";
  selectedAlerts?: string[];
  currentText: string;
}): Promise<{ text?: string; error?: string }> {
  try {
    const session = await requireRole(["ADMIN", "DECE"]);
    const institutionId = requireInstitutionId(session);

    if (!isAiConfigured()) {
      return { error: "La ayuda de IA todavía no está configurada en este sistema." };
    }

    requireOwnedCase(params.caseId, institutionId);

    const questionLabels: Record<string, string> = {
      pregunta_1: "Pregunta 1: ¿Por qué considera que el caso amerita la intervención del DECE?",
      pregunta_2: "Pregunta 2: ¿Cuáles son las dificultades o problemas en el ámbito psicosocial, pedagógico y/o familiar que se presentan en el o la estudiante?",
      pregunta_3: "Pregunta 3: ¿Cuáles cree que son las causas para que se estén presentando las dificultades antes señaladas?",
      pregunta_4: "Pregunta 4: ¿Qué se ha venido haciendo para superar la situación de dificultad detectada en el o la estudiante?",
      pregunta_5: "Pregunta 5: Otras acciones emprendidas o datos relevantes adicionales",
      hechos: "Lugar y fecha / Hechos y antecedentes detectados en el estudiante",
      especificar: "Especificación técnica de la alerta detectada",
    };

    const alertsInfo = params.selectedAlerts && params.selectedAlerts.length > 0
      ? `\nAlertas marcadas: ${params.selectedAlerts.join(", ")}`
      : "";

    const caseContext =
      buildCaseContext(params.caseId, institutionId) +
      alertsInfo +
      `\nRedacta una respuesta concisa, formal, técnica y objetiva para la Ficha de Notificación de Alerta DECE. Cumple estrictamente con el enfoque de derechos y la normativa del Ministerio de Educación de Ecuador. Redacta en 1 o 2 párrafos sin viñetas informales ni asteriscos.`;

    const result = await draftText({
      fieldLabel: questionLabels[params.questionKey] || params.questionKey,
      context: caseContext,
      currentText: params.currentText || "",
    });

    if ("error" in result) return { error: result.error };
    return { text: result.text };
  } catch (err: any) {
    console.error("[generateAlertInterventionAi]", err);
    return { error: err?.message || "Ocurrió un error al consultar el asistente de IA." };
  }
}


