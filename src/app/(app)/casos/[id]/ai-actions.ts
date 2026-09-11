"use server";

import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { requireOwnedCase } from "@/lib/scopedDb";
import { logger } from "@/lib/logger";
import { draftText, draftBimonthlyMatrixDraft, draftObservationComment, draftObservationGlobalAnalysis, draftCorresponsibilityDifficulty, draftCorresponsibilityLegalFramework, draftCorresponsibilityCommitments, isAiConfigured } from "@/lib/ai";
import { pseudonymize, isHeightenedConfidentiality, isHeightenedRiskType, minimalCaseContext, type CaseEntities } from "@/lib/aiPrivacy";
import type { CorresponsibilityConflictType } from "@/lib/types";
import type { CaseFileRow, StudentRow, ViolenceReportRow, CaseActionRow } from "@/lib/types";
import { studentGradeLabel } from "@/lib/studentCourse";

import { buildCaseContext, RISK_TYPE_LABELS, caseEntities } from "@/lib/caseContext";

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

  const context = buildCaseContext(caseId, institutionId);
  const result = await draftText({ fieldLabel, context, currentText: currentText || "" });
  if ("error" in result) return { error: result.error };

  let text = result.text;
  const isReferralObservations =
    fieldLabel.toLowerCase().includes("observaciones") &&
    (fieldLabel.toLowerCase().includes("derivaci") || fieldLabel.toLowerCase().includes("ficha"));

  if (isReferralObservations && text) {
    try {
      const appt = db
        .prepare("SELECT id, date, start_time FROM appointments WHERE case_file_id = ? ORDER BY date DESC, start_time DESC LIMIT 1")
        .get(caseId) as { id: string; date: string; start_time: string } | undefined;
      if (appt) {
        const apptLine = `• N° cita: ${appt.id.replace(/-/g, "").slice(0, 8)}; Fecha: ${appt.date}; Hora: ${appt.start_time}`;
        if (!text.includes("N° cita") && !text.includes("cita:")) {
          text = `${text.trim()}\n${apptLine}`;
        }
      }
    } catch (e) {
      logger.warn("ai-draft", "error al consultar cita para observaciones", e);
    }
  }

  return { text, heightenedConfidentiality: isHeightenedRiskType(caseFile?.risk_type) };
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


