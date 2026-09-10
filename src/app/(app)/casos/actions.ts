"use server";

import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { nextCaseCode } from "@/lib/codes";
import { CHECKLIST_CATALOGS, CHECKLIST_REVIEW_ROLES, checklistRoleKey } from "@/lib/checklists";
import { parseOfficialObservationData } from "@/lib/observationSheet";
import { CONFLICT_TYPES_CATALOG } from "@/lib/corresponsibilityCatalog";
import type { ChecklistCategory, ObservationContext, ObservationSubnivel, ObservationRiskLevel, CorresponsibilityConflictType } from "@/lib/types";
import { z } from "zod";
import { str, int, getAllStr } from "@/lib/formData";
import { requireOwnedCase, requireOwnedStudent } from "@/lib/scopedDb";

// Valores de catálogo aceptados. Un valor fuera de rango (formulario manipulado)
// se coacciona al valor por defecto en vez de propagarse a la base.
const prioritySchema = z.enum(["ALTA", "MEDIA", "BAJA"]).catch("MEDIA");
const actionAxisSchema = z
  .enum(["PROMOCION", "PREVENCION", "ATENCION", "SEGUIMIENTO"])
  .catch("ATENCION");
const riskTypeSchema = z
  .enum([
    "VIOLENCIA_INTRAFAMILIAR",
    "VIOLENCIA_ESCOLAR_BULLYING",
    "VIOLENCIA_SEXUAL",
    "CONSUMO_SUSTANCIAS",
    "SALUD_MENTAL",
    "EMBARAZO_ADOLESCENTE",
    "VULNERACION_DERECHOS",
    "DIFICULTAD_APRENDIZAJE",
    "CONFLICTO_FAMILIAR",
    "CONECTIVIDAD_ACCESO_EDUCATIVO",
    "OTRO",
  ])
  .catch("OTRO");

export async function createCase(formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const id = randomUUID();
  const studentId = str(formData, "student_id");
  if (!studentId) throw new Error("Estudiante requerido");
  requireOwnedStudent(studentId, institutionId);
  const code = nextCaseCode(institutionId, studentId);

  db.prepare(
    `INSERT INTO case_files
      (id, institution_id, code, student_id, opened_by_id, assigned_to_id, status, priority, action_axis, risk_type, risk_type_other,
       detection_date, detection_source, description, confidential)
     VALUES (@id, @institution_id, @code, @student_id, @opened_by_id, @assigned_to_id, 'ABIERTO', @priority, @action_axis, @risk_type, @risk_type_other,
       @detection_date, @detection_source, @description, @confidential)`
  ).run({
    id,
    institution_id: institutionId,
    code,
    student_id: studentId,
    opened_by_id: session.user.id,
    assigned_to_id: str(formData, "assigned_to_id") || session.user.id,
    priority: prioritySchema.parse(str(formData, "priority")),
    action_axis: actionAxisSchema.parse(str(formData, "action_axis")),
    risk_type: riskTypeSchema.parse(str(formData, "risk_type")),
    risk_type_other: str(formData, "risk_type_other"),
    detection_date: str(formData, "detection_date") || new Date().toISOString(),
    detection_source: str(formData, "detection_source"),
    description: str(formData, "description") || "",
    confidential: 1,
  });

  // Primera entrada automática en la bitácora del caso
  db.prepare(
    `INSERT INTO case_actions (id, case_file_id, author_id, type, description) VALUES (?, ?, ?, 'Apertura de caso', ?)`
  ).run(randomUUID(), id, session.user.id, "Caso registrado en el sistema.");

  // Si el caso proviene de una alerta docente, vincularla (solo si pertenece a la institución)
  const alertId = str(formData, "alert_id");
  if (alertId) {
    db.prepare(
      `UPDATE teacher_alerts SET status='CONVERTIDA_EN_CASO', case_file_id=?, updated_at=datetime('now') WHERE id=? AND institution_id=?`
    ).run(id, alertId, institutionId);
  }

  logAudit({ userId: session.user.id, action: "CREAR", entityType: "CaseFile", entityId: id, details: code, institutionId });
  revalidatePath("/casos");
  revalidatePath("/alertas");
  redirect(`/casos/${id}`);
}

export async function updateCaseStatus(caseId: string, formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  requireOwnedCase(caseId, institutionId);
  const status = z
    .enum(["ABIERTO", "EN_SEGUIMIENTO", "DERIVADO", "CERRADO"])
    .catch("ABIERTO")
    .parse(str(formData, "status"));
  const closureReason = str(formData, "closure_reason");

  db.prepare(
    `UPDATE case_files SET status=?, closed_at=CASE WHEN ?='CERRADO' THEN datetime('now') ELSE closed_at END,
     closure_reason=COALESCE(?, closure_reason), updated_at=datetime('now') WHERE id=? AND institution_id=?`
  ).run(status, status, closureReason, caseId, institutionId);

  db.prepare(
    `INSERT INTO case_actions (id, case_file_id, author_id, type, description) VALUES (?, ?, ?, 'Cambio de estado', ?)`
  ).run(randomUUID(), caseId, session.user.id, `Estado actualizado a: ${status}${closureReason ? ` — Motivo: ${closureReason}` : ""}`);

  logAudit({ userId: session.user.id, action: "EDITAR", entityType: "CaseFile", entityId: caseId, details: `status=${status}`, institutionId });
  revalidatePath(`/casos/${caseId}`);
  revalidatePath("/casos");
}

export async function updateCaseFields(caseId: string, formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  requireOwnedCase(caseId, institutionId);

  db.prepare(
    `UPDATE case_files SET priority=@priority, action_axis=@action_axis, risk_type=@risk_type, risk_type_other=@risk_type_other,
      assigned_to_id=@assigned_to_id, description=@description, updated_at=datetime('now') WHERE id=@id AND institution_id=@institution_id`
  ).run({
    id: caseId,
    institution_id: institutionId,
    priority: prioritySchema.parse(str(formData, "priority")),
    action_axis: actionAxisSchema.parse(str(formData, "action_axis")),
    risk_type: riskTypeSchema.parse(str(formData, "risk_type")),
    risk_type_other: str(formData, "risk_type_other"),
    assigned_to_id: str(formData, "assigned_to_id"),
    description: str(formData, "description") || "",
  });

  logAudit({ userId: session.user.id, action: "EDITAR", entityType: "CaseFile", entityId: caseId, institutionId });
  revalidatePath(`/casos/${caseId}`);
}

export async function addCaseAction(caseId: string, formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  requireOwnedCase(caseId, institutionId);
  const id = randomUUID();

  db.prepare(
    `INSERT INTO case_actions (id, case_file_id, author_id, date, type, description, intervention_type, observations)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    caseId,
    session.user.id,
    str(formData, "date") || new Date().toISOString(),
    str(formData, "type") || "Otro",
    str(formData, "description") || "",
    str(formData, "intervention_type"),
    str(formData, "observations")
  );

  // Si el caso estaba abierto, pasa a "en seguimiento" automáticamente
  db.prepare(`UPDATE case_files SET status = CASE WHEN status='ABIERTO' THEN 'EN_SEGUIMIENTO' ELSE status END, updated_at=datetime('now') WHERE id=? AND institution_id=?`).run(caseId, institutionId);

  logAudit({ userId: session.user.id, action: "CREAR", entityType: "CaseAction", entityId: id, details: caseId, institutionId });
  revalidatePath(`/casos/${caseId}`);
}

export async function createInterventionPlan(caseId: string, formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  requireOwnedCase(caseId, institutionId);
  const id = randomUUID();

  db.prepare(
    `INSERT INTO intervention_plans (id, case_file_id, responsible_id, objective, actions, start_date, end_date, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'EN_CURSO')`
  ).run(
    id,
    caseId,
    session.user.id,
    str(formData, "objective") || "",
    str(formData, "actions") || "",
    str(formData, "start_date") || new Date().toISOString(),
    str(formData, "end_date")
  );

  logAudit({ userId: session.user.id, action: "CREAR", entityType: "InterventionPlan", entityId: id, details: caseId, institutionId });
  revalidatePath(`/casos/${caseId}`);
}

export async function updatePlanStatus(planId: string, caseId: string, status: string) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  requireOwnedCase(caseId, institutionId);
  db.prepare(
    `UPDATE intervention_plans SET status=?, updated_at=datetime('now') WHERE id=? AND case_file_id=?`
  ).run(status, planId, caseId);
  logAudit({ userId: session.user.id, action: "EDITAR", entityType: "InterventionPlan", entityId: planId, details: status, institutionId });
  revalidatePath(`/casos/${caseId}`);
}

/**
 * Crea (si no existe todavía) el checklist de expediente de la categoría elegida
 * para el caso. Un mismo caso puede tener más de un checklist activo a la vez
 * (por ejemplo, violencia sexual Y atención psicosocial), por lo que la
 * comprobación de "ya existe" es por categoría, no por caso completo.
 */
export async function ensureChecklist(caseId: string, formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  requireOwnedCase(caseId, institutionId);
  const category = str(formData, "category") as ChecklistCategory | null;
  if (!category || !CHECKLIST_CATALOGS[category]) throw new Error("Categoría de checklist inválida.");

  const existing = db
    .prepare("SELECT COUNT(*) as n FROM case_checklist_items WHERE case_file_id = ? AND category = ?")
    .get(caseId, category) as { n: number };

  if (existing.n === 0) {
    const items = CHECKLIST_CATALOGS[category];
    const insertItem = db.prepare(
      `INSERT INTO case_checklist_items (id, case_file_id, category, item_order, item_text) VALUES (?, ?, ?, ?, ?)`
    );
    const insertReview = db.prepare(
      `INSERT OR IGNORE INTO case_checklist_reviews (id, case_file_id, role_label) VALUES (?, ?, ?)`
    );
    const tx = db.transaction(() => {
      items.forEach((text, idx) => insertItem.run(randomUUID(), caseId, category, idx + 1, text));
      CHECKLIST_REVIEW_ROLES.forEach((role) => insertReview.run(randomUUID(), caseId, role));
    });
    tx();
    logAudit({ userId: session.user.id, action: "CREAR", entityType: "CaseChecklist", entityId: caseId, details: category, institutionId });
  }
  revalidatePath(`/casos/${caseId}`);
}

/** Guarda de una sola vez todos los ítems del checklist y el bloque de revisión/firmas. */
export async function saveChecklist(caseId: string, formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  requireOwnedCase(caseId, institutionId);

  const itemIds = new Set<string>();
  for (const key of formData.keys()) {
    const m = key.match(/^(?:status|obs)_(.+)$/);
    if (m) itemIds.add(m[1]);
  }
  const updateItem = db.prepare(
    `UPDATE case_checklist_items SET status=?, observations=?, updated_at=datetime('now') WHERE id=? AND case_file_id=?`
  );
  for (const itemId of itemIds) {
    updateItem.run(str(formData, `status_${itemId}`), str(formData, `obs_${itemId}`), itemId, caseId);
  }

  const updateReview = db.prepare(
    `UPDATE case_checklist_reviews SET full_name=?, signed_date=? WHERE case_file_id=? AND role_label=?`
  );
  for (const role of CHECKLIST_REVIEW_ROLES) {
    const key = checklistRoleKey(role);
    updateReview.run(str(formData, `rev_name_${key}`), str(formData, `rev_date_${key}`), caseId, role);
  }

  logAudit({ userId: session.user.id, action: "EDITAR", entityType: "CaseChecklist", entityId: caseId, institutionId });
  revalidatePath(`/casos/${caseId}`);
  redirect(`/casos/${caseId}?checklist_guardado=1#checklist`);
}

/** Registra una entrevista semiestructurada a estudiante o representante, vinculada al caso. */
export async function createInterview(caseId: string, formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const id = randomUUID();
  let createdFullName = "";

  try {
    requireOwnedCase(caseId, institutionId);

    const emotionalState = formData.getAll("emotional_state").filter((v): v is string => typeof v === "string");
    const socialRelations = formData.getAll("social_relations").filter((v): v is string => typeof v === "string");
    const fullName = str(formData, "full_name");
    createdFullName = fullName || "s/n";

    db.prepare(
      `INSERT INTO case_interviews
        (id, case_file_id, institution_id, interviewee_full_name, interviewee_cedula, course, age, application_date,
         family_relation, emotional_state, social_relations, bullying_history, academic_history, summary,
         recommendations, commitment, representative_name, professional_id, updated_at)
       VALUES (@id, @case_file_id, @institution_id, @full_name, @cedula, @course, @age, @application_date,
         @family_relation, @emotional_state, @social_relations, @bullying_history, @academic_history, @summary,
         @recommendations, @commitment, @representative_name, @professional_id, datetime('now'))`
    ).run({
      id,
      case_file_id: caseId,
      institution_id: institutionId,
      full_name: fullName,
      cedula: str(formData, "cedula"),
      course: str(formData, "course"),
      age: str(formData, "age"),
      application_date: str(formData, "application_date") || new Date().toISOString().slice(0, 10),
      family_relation: str(formData, "family_relation"),
      emotional_state: emotionalState.length ? emotionalState.join(", ") : null,
      social_relations: socialRelations.length ? socialRelations.join(", ") : null,
      bullying_history: formData.get("bullying_history") ? 1 : 0,
      academic_history: str(formData, "academic_history"),
      summary: str(formData, "summary"),
      recommendations: str(formData, "recommendations"),
      commitment: str(formData, "commitment"),
      representative_name: str(formData, "representative_name"),
      professional_id: session.user.id,
    });

    db.prepare(
      `INSERT INTO case_actions (id, case_file_id, author_id, type, description) VALUES (?, ?, ?, 'Entrevista semiestructurada', ?)`
    ).run(randomUUID(), caseId, session.user.id, `Entrevista registrada a: ${createdFullName}`);

    logAudit({ userId: session.user.id, action: "CREAR", entityType: "CaseInterview", entityId: id, details: caseId, institutionId });
    revalidatePath(`/casos/${caseId}`);
  } catch (err) {
    console.error("[createInterview] Error saving interview:", err);
    throw err;
  }

  redirect(`/casos/${caseId}/entrevistas/${id}/imprimir`);
}

export type ActionState = { error: string | null };

const OBSERVATION_CONTEXTS: ObservationContext[] = ["AULA", "ENTREVISTA", "OTRO"];
const OBSERVATION_SUBNIVELES: ObservationSubnivel[] = ["ELEMENTAL", "BASICA_MEDIA", "SUPERIOR_BACHILLERATO"];
const OBSERVATION_RISK_LEVELS: ObservationRiskLevel[] = ["BAJO", "MEDIO", "ALTO", "CRITICO"];

/** Registra una Ficha de Observación Psicosocial (E.D3.C1.DE11.c.) vinculada al caso. */
export async function createObservationSheet(
  caseId: string,
  subnivel: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  try {
    requireOwnedCase(caseId, institutionId);

    const rawObsData = str(formData, "observation_data");
    const id = randomUUID();

    if (rawObsData) {
      // Formato Oficial Ministerial
      const parsed = parseOfficialObservationData(rawObsData, session.user.name || undefined);
      const obsDate = parsed.application_date || str(formData, "observation_date") || new Date().toISOString().slice(0, 10);
      const contextVal: ObservationContext = parsed.is_aulica ? "AULA" : (parsed.is_externa ? "OTRO" : "ENTREVISTA");
      const positiveQuestions = parsed.questions.filter((q) => q.answer === "SI");
      const summaryObservations = positiveQuestions.map((q) => `${q.question}: ${q.comment}`).filter(Boolean).join("\n") || "Sin observaciones específicas registradas.";
      const riskLevel: ObservationRiskLevel = positiveQuestions.length >= 8 ? "ALTO" : (positiveQuestions.length >= 4 ? "MEDIO" : "BAJO");

      db.prepare(
        `INSERT INTO case_observation_sheets
          (id, case_file_id, institution_id, professional_id, observation_date, jornada, context, context_other, subnivel,
           anxious_indicators, depressive_indicators, suicidal_indicators, risk_level, protective_factors, institutional_actions, observations, observation_data)
         VALUES (@id, @case_file_id, @institution_id, @professional_id, @observation_date, @jornada, @context, @context_other, @subnivel,
           @anxious_indicators, @depressive_indicators, @suicidal_indicators, @risk_level, @protective_factors, @institutional_actions, @observations, @observation_data)`
      ).run({
        id,
        case_file_id: caseId,
        institution_id: institutionId,
        professional_id: session.user.id,
        observation_date: obsDate,
        jornada: str(formData, "jornada") || "Matutina",
        context: contextVal,
        context_other: parsed.is_externa ? "Espacios externos al aula" : null,
        subnivel: "SUPERIOR_BACHILLERATO",
        anxious_indicators: JSON.stringify([]),
        depressive_indicators: JSON.stringify([]),
        suicidal_indicators: JSON.stringify([]),
        risk_level: riskLevel,
        protective_factors: JSON.stringify([]),
        institutional_actions: JSON.stringify([]),
        observations: summaryObservations,
        observation_data: JSON.stringify(parsed),
      });

      db.prepare(
        `INSERT INTO case_actions (id, case_file_id, author_id, type, description) VALUES (?, ?, ?, 'Ficha de observación psicosocial', ?)`
      ).run(randomUUID(), caseId, session.user.id, `Ficha Oficial de Observación registrada — Profesional: ${parsed.professional_name || session.user.name}.`);

      logAudit({ userId: session.user.id, action: "CREAR", entityType: "CaseObservationSheet", entityId: id, details: caseId, institutionId });
      revalidatePath(`/casos/${caseId}`);
    } else {
      // Formato legacy
      if (!OBSERVATION_SUBNIVELES.includes(subnivel as ObservationSubnivel)) {
        return { error: "Subnivel educativo inválido." };
      }
      const context = str(formData, "context");
      if (!context || !OBSERVATION_CONTEXTS.includes(context as ObservationContext)) {
        return { error: "Selecciona el contexto de observación." };
      }
      const riskLevel = str(formData, "risk_level");
      if (!riskLevel || !OBSERVATION_RISK_LEVELS.includes(riskLevel as ObservationRiskLevel)) {
        return { error: "Selecciona el nivel de riesgo." };
      }

      const anxious = JSON.stringify(formData.getAll("anxious_indicators").filter((v): v is string => typeof v === "string"));
      const depressive = JSON.stringify(formData.getAll("depressive_indicators").filter((v): v is string => typeof v === "string"));
      const suicidal = JSON.stringify(formData.getAll("suicidal_indicators").filter((v): v is string => typeof v === "string"));
      const protective = JSON.stringify(formData.getAll("protective_factors").filter((v): v is string => typeof v === "string"));
      const institutionalActions = JSON.stringify(formData.getAll("institutional_actions").filter((v): v is string => typeof v === "string"));

      db.prepare(
        `INSERT INTO case_observation_sheets
          (id, case_file_id, institution_id, professional_id, observation_date, jornada, context, context_other, subnivel,
           anxious_indicators, depressive_indicators, suicidal_indicators, risk_level, protective_factors, institutional_actions, observations)
         VALUES (@id, @case_file_id, @institution_id, @professional_id, @observation_date, @jornada, @context, @context_other, @subnivel,
           @anxious_indicators, @depressive_indicators, @suicidal_indicators, @risk_level, @protective_factors, @institutional_actions, @observations)`
      ).run({
        id,
        case_file_id: caseId,
        institution_id: institutionId,
        professional_id: session.user.id,
        observation_date: str(formData, "observation_date") || new Date().toISOString().slice(0, 10),
        jornada: str(formData, "jornada"),
        context,
        context_other: context === "OTRO" ? str(formData, "context_other") : null,
        subnivel,
        anxious_indicators: anxious,
        depressive_indicators: depressive,
        suicidal_indicators: suicidal,
        risk_level: riskLevel,
        protective_factors: protective,
        institutional_actions: institutionalActions,
        observations: str(formData, "observations"),
      });

      db.prepare(
        `INSERT INTO case_actions (id, case_file_id, author_id, type, description) VALUES (?, ?, ?, 'Ficha de observación psicosocial', ?)`
      ).run(randomUUID(), caseId, session.user.id, `Ficha registrada — nivel de riesgo: ${riskLevel}.`);

      logAudit({ userId: session.user.id, action: "CREAR", entityType: "CaseObservationSheet", entityId: id, details: caseId, institutionId });
      revalidatePath(`/casos/${caseId}`);
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Ocurrió un error inesperado al guardar la ficha." };
  }

  redirect(`/casos/${caseId}`);
}

/** Actualiza una Ficha de Observación existente. */
export async function updateObservationSheet(
  sheetId: string,
  caseId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  try {
    requireOwnedCase(caseId, institutionId);

    const existing = db
      .prepare("SELECT id FROM case_observation_sheets WHERE id = ? AND case_file_id = ? AND institution_id = ?")
      .get(sheetId, caseId, institutionId);
    if (!existing) return { error: "Ficha de observación no encontrada." };

    const rawObsData = str(formData, "observation_data");
    if (!rawObsData) return { error: "Faltan los datos de la ficha." };

    const parsed = parseOfficialObservationData(rawObsData, session.user.name || undefined);
    const obsDate = parsed.application_date || new Date().toISOString().slice(0, 10);
    const contextVal: ObservationContext = parsed.is_aulica ? "AULA" : (parsed.is_externa ? "OTRO" : "ENTREVISTA");
    const positiveQuestions = parsed.questions.filter((q) => q.answer === "SI");
    const summaryObservations = positiveQuestions.map((q) => `${q.question}: ${q.comment}`).filter(Boolean).join("\n") || "Sin observaciones específicas.";
    const riskLevel: ObservationRiskLevel = positiveQuestions.length >= 8 ? "ALTO" : (positiveQuestions.length >= 4 ? "MEDIO" : "BAJO");

    db.prepare(
      `UPDATE case_observation_sheets
       SET observation_date = @observation_date,
           jornada = @jornada,
           context = @context,
           context_other = @context_other,
           risk_level = @risk_level,
           observations = @observations,
           observation_data = @observation_data
       WHERE id = @id AND case_file_id = @case_file_id AND institution_id = @institution_id`
    ).run({
      id: sheetId,
      case_file_id: caseId,
      institution_id: institutionId,
      observation_date: obsDate,
      jornada: str(formData, "jornada") || "Matutina",
      context: contextVal,
      context_other: parsed.is_externa ? "Espacios externos al aula" : null,
      risk_level: riskLevel,
      observations: summaryObservations,
      observation_data: JSON.stringify(parsed),
    });

    logAudit({ userId: session.user.id, action: "ACTUALIZAR", entityType: "CaseObservationSheet", entityId: sheetId, details: caseId, institutionId });
    revalidatePath(`/casos/${caseId}`);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Ocurrió un error inesperado al actualizar la ficha." };
  }

  redirect(`/casos/${caseId}`);
}

/** Registra una llamada telefónica de seguimiento del caso (con representante, docente, entidad externa, etc.). */
export async function createCallLog(caseId: string, formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  requireOwnedCase(caseId, institutionId);

  const reason = str(formData, "reason");
  if (!reason) throw new Error("El motivo de la llamada es obligatorio.");

  const id = randomUUID();
  const followUpNeeded = formData.get("follow_up_needed") ? 1 : 0;

  db.prepare(
    `INSERT INTO case_call_logs
      (id, case_file_id, institution_id, caller_id, call_date, contact_name, contact_relation, phone_number, reason, result, follow_up_needed, follow_up_date, notes)
     VALUES (@id, @case_file_id, @institution_id, @caller_id, @call_date, @contact_name, @contact_relation, @phone_number, @reason, @result, @follow_up_needed, @follow_up_date, @notes)`
  ).run({
    id,
    case_file_id: caseId,
    institution_id: institutionId,
    caller_id: session.user.id,
    call_date: str(formData, "call_date") || new Date().toISOString(),
    contact_name: str(formData, "contact_name"),
    contact_relation: str(formData, "contact_relation"),
    phone_number: str(formData, "phone_number"),
    reason,
    result: str(formData, "result"),
    follow_up_needed: followUpNeeded,
    follow_up_date: str(formData, "follow_up_date"),
    notes: str(formData, "notes"),
  });

  db.prepare(
    `INSERT INTO case_actions (id, case_file_id, author_id, type, description) VALUES (?, ?, ?, 'Llamada telefónica', ?)`
  ).run(randomUUID(), caseId, session.user.id, `Llamada registrada — ${str(formData, "contact_name") || "contacto"}: ${reason}`);

  logAudit({ userId: session.user.id, action: "CREAR", entityType: "CaseCallLog", entityId: id, details: caseId, institutionId });
  revalidatePath(`/casos/${caseId}`);
}

/** Registra un Plan de Atención Psicosocial y Seguimiento vinculado al caso. */
export async function createCarePlan(
  caseId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  try {
    requireOwnedCase(caseId, institutionId);

    const diagnosisSummary = str(formData, "diagnosis_summary");
    if (!diagnosisSummary) return { error: "El resumen del diagnóstico situacional es obligatorio." };

    const id = randomUUID();
    const interventionTypes = JSON.stringify(formData.getAll("intervention_types").filter((v): v is string => typeof v === "string"));

    const accionesRaw = formData.getAll("accion").filter((v): v is string => typeof v === "string");
    const profesionalesRaw = formData.getAll("accion_profesional").filter((v): v is string => typeof v === "string");
    const tiemposRaw = formData.getAll("accion_tiempo").filter((v): v is string => typeof v === "string");
    const observacionesRaw = formData.getAll("accion_observaciones").filter((v): v is string => typeof v === "string");
    const actions = accionesRaw
      .map((accion, i) => ({
        accion: accion.trim(),
        profesional: (profesionalesRaw[i] || "").trim(),
        tiempo: (tiemposRaw[i] || "").trim(),
        observaciones: (observacionesRaw[i] || "").trim(),
      }))
      .filter((a) => a.accion.length > 0);

    db.prepare(
      `INSERT INTO case_care_plans
        (id, case_file_id, institution_id, professional_id, plan_date, jornada, tutor_name, diagnosis_summary, intervention_types, actions)
       VALUES (@id, @case_file_id, @institution_id, @professional_id, @plan_date, @jornada, @tutor_name, @diagnosis_summary, @intervention_types, @actions)`
    ).run({
      id,
      case_file_id: caseId,
      institution_id: institutionId,
      professional_id: session.user.id,
      plan_date: str(formData, "plan_date") || new Date().toISOString().slice(0, 10),
      jornada: str(formData, "jornada"),
      tutor_name: str(formData, "tutor_name"),
      diagnosis_summary: diagnosisSummary,
      intervention_types: interventionTypes,
      actions: JSON.stringify(actions),
    });

    db.prepare(
      `INSERT INTO case_actions (id, case_file_id, author_id, type, description) VALUES (?, ?, ?, 'Plan de atención', ?)`
    ).run(randomUUID(), caseId, session.user.id, `Plan de atención psicosocial y seguimiento registrado.`);

    logAudit({ userId: session.user.id, action: "CREAR", entityType: "CaseCarePlan", entityId: id, details: caseId, institutionId });
    revalidatePath(`/casos/${caseId}`);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Ocurrió un error inesperado al guardar el plan de atención." };
  }

  redirect(`/casos/${caseId}`);
}

/** Registra un Plan de Acompañamiento y Restitución de Derechos (casos de violencia). */
export async function createRestitutionPlan(
  caseId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  try {
    requireOwnedCase(caseId, institutionId);

    const id = randomUUID();
    const violenceTypes = JSON.stringify(formData.getAll("violence_types").filter((v): v is string => typeof v === "string"));
    const violenceModality = JSON.stringify(formData.getAll("violence_modality").filter((v): v is string => typeof v === "string"));

    const victIniciales = formData.getAll("victim_iniciales").filter((v): v is string => typeof v === "string");
    const victCedula = formData.getAll("victim_cedula").filter((v): v is string => typeof v === "string");
    const victEdad = formData.getAll("victim_edad").filter((v): v is string => typeof v === "string");
    const victGenero = formData.getAll("victim_genero").filter((v): v is string => typeof v === "string");
    const victNivel = formData.getAll("victim_nivel_instruccion").filter((v): v is string => typeof v === "string");
    const victims = victIniciales
      .map((iniciales, i) => ({
        iniciales: iniciales.trim(),
        cedula: (victCedula[i] || "").trim(),
        edad: (victEdad[i] || "").trim(),
        genero: (victGenero[i] || "").trim(),
        nivel_instruccion: (victNivel[i] || "").trim(),
      }))
      .filter((v) => v.iniciales.length > 0);

    const perpNombre = formData.getAll("perpetrator_nombre").filter((v): v is string => typeof v === "string");
    const perpEdad = formData.getAll("perpetrator_edad").filter((v): v is string => typeof v === "string");
    const perpSexo = formData.getAll("perpetrator_sexo").filter((v): v is string => typeof v === "string");
    const perpCargo = formData.getAll("perpetrator_cargo").filter((v): v is string => typeof v === "string");
    const perpetrators = perpNombre
      .map((nombre, i) => ({
        nombre: nombre.trim(),
        edad: (perpEdad[i] || "").trim(),
        sexo: (perpSexo[i] || "").trim(),
        cargo_funcion: (perpCargo[i] || "").trim(),
      }))
      .filter((p) => p.nombre.length > 0);

    const legalInstancia = formData.getAll("legal_instancia").filter((v): v is string => typeof v === "string");
    const legalFecha = formData.getAll("legal_fecha_denuncia").filter((v): v is string => typeof v === "string");
    const legalNumero = formData.getAll("legal_numero_denuncia").filter((v): v is string => typeof v === "string");
    const legalMedidas = formData.getAll("legal_medidas").filter((v): v is string => typeof v === "string");
    const legalEstado = formData.getAll("legal_estado").filter((v): v is string => typeof v === "string");
    const legalTotal = formData.getAll("legal_total").filter((v): v is string => typeof v === "string");
    const legalInstances = legalInstancia.map((instancia, i) => ({
      instancia,
      fecha_denuncia: (legalFecha[i] || "").trim(),
      numero_denuncia: (legalNumero[i] || "").trim(),
      medidas: (legalMedidas[i] || "").trim(),
      estado: (legalEstado[i] || "").trim(),
      total: (legalTotal[i] || "").trim() || (legalNumero[i]?.trim() || legalFecha[i]?.trim() ? "1" : "0"),
    }));

    const accCategoria = formData.getAll("accomp_categoria").filter((v): v is string => typeof v === "string");
    const accEjecutor = formData.getAll("accomp_ejecutor").filter((v): v is string => typeof v === "string");
    const accNumPersonas = formData.getAll("accomp_num_personas").filter((v): v is string => typeof v === "string");
    const accFechaInicio = formData.getAll("accomp_fecha_inicio").filter((v): v is string => typeof v === "string");
    const accFechaFin = formData.getAll("accomp_fecha_fin").filter((v): v is string => typeof v === "string");
    const accompanimentActions = accCategoria.map((categoria, i) => ({
      categoria,
      ejecutor: (accEjecutor[i] || "").trim(),
      num_personas: (accNumPersonas[i] || "").trim(),
      fecha_inicio: (accFechaInicio[i] || "").trim(),
      fecha_fin: (accFechaFin[i] || "").trim(),
    }));

    db.prepare(
      `INSERT INTO case_restitution_plans
        (id, case_file_id, institution_id, school_year, elaboration_date, risk_factors,
         violence_types, violence_modality, violence_modality_other, perpetrator_relation,
         victims, perpetrators, report_narrative, legal_instances, accompaniment_actions,
         prepared_by_name, prepared_by_email, prepared_by_role, prepared_date, reviewed_coordinator_name, reviewed_coordinator_date,
         reviewed_authority_name, reviewed_authority_date, approved_by_name, approved_date)
       VALUES (@id, @case_file_id, @institution_id, @school_year, @elaboration_date, @risk_factors,
         @violence_types, @violence_modality, @violence_modality_other, @perpetrator_relation,
         @victims, @perpetrators, @report_narrative, @legal_instances, @accompaniment_actions,
         @prepared_by_name, @prepared_by_email, @prepared_by_role, @prepared_date, @reviewed_coordinator_name, @reviewed_coordinator_date,
         @reviewed_authority_name, @reviewed_authority_date, @approved_by_name, @approved_date)`
    ).run({
      id,
      case_file_id: caseId,
      institution_id: institutionId,
      school_year: str(formData, "school_year"),
      elaboration_date: str(formData, "elaboration_date") || new Date().toISOString().slice(0, 10),
      risk_factors: str(formData, "risk_factors"),
      violence_types: violenceTypes,
      violence_modality: violenceModality,
      violence_modality_other: str(formData, "violence_modality_other"),
      perpetrator_relation: str(formData, "perpetrator_relation"),
      victims: JSON.stringify(victims),
      perpetrators: JSON.stringify(perpetrators),
      report_narrative: str(formData, "report_narrative"),
      legal_instances: JSON.stringify(legalInstances),
      accompaniment_actions: JSON.stringify(accompanimentActions),
      prepared_by_name: str(formData, "prepared_by_name") || session.user.name || null,
      prepared_by_email: str(formData, "prepared_by_email") || session.user.email || null,
      prepared_by_role: str(formData, "prepared_by_role") || "Analista DECE",
      prepared_date: str(formData, "prepared_date"),
      reviewed_coordinator_name: str(formData, "reviewed_coordinator_name"),
      reviewed_coordinator_date: str(formData, "reviewed_coordinator_date"),
      reviewed_authority_name: str(formData, "reviewed_authority_name"),
      reviewed_authority_date: str(formData, "reviewed_authority_date"),
      approved_by_name: str(formData, "approved_by_name"),
      approved_date: str(formData, "approved_date"),
    });

    db.prepare(
      `INSERT INTO case_actions (id, case_file_id, author_id, type, description) VALUES (?, ?, ?, 'Plan de acompañamiento', ?)`
    ).run(randomUUID(), caseId, session.user.id, `Plan de acompañamiento y restitución de derechos registrado.`);

    logAudit({ userId: session.user.id, action: "CREAR", entityType: "CaseRestitutionPlan", entityId: id, details: caseId, institutionId });
    revalidatePath(`/casos/${caseId}`);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Ocurrió un error inesperado al guardar el plan de acompañamiento." };
  }

  redirect(`/casos/${caseId}`);
}

/** Actualiza un Plan de Acompañamiento y Restitución de Derechos existente. */
export async function updateRestitutionPlan(
  planId: string,
  caseId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  try {
    requireOwnedCase(caseId, institutionId);

    const existing = db
      .prepare("SELECT id FROM case_restitution_plans WHERE id = ? AND case_file_id = ?")
      .get(planId, caseId);
    if (!existing) {
      return { error: "El plan de acompañamiento no fue encontrado." };
    }

    const violenceTypes = JSON.stringify(formData.getAll("violence_types").filter((v): v is string => typeof v === "string"));
    const violenceModality = JSON.stringify(formData.getAll("violence_modality").filter((v): v is string => typeof v === "string"));

    const victIniciales = formData.getAll("victim_iniciales").filter((v): v is string => typeof v === "string");
    const victCedula = formData.getAll("victim_cedula").filter((v): v is string => typeof v === "string");
    const victEdad = formData.getAll("victim_edad").filter((v): v is string => typeof v === "string");
    const victGenero = formData.getAll("victim_genero").filter((v): v is string => typeof v === "string");
    const victNivel = formData.getAll("victim_nivel_instruccion").filter((v): v is string => typeof v === "string");
    const victims = victIniciales
      .map((iniciales, i) => ({
        iniciales: iniciales.trim(),
        cedula: (victCedula[i] || "").trim(),
        edad: (victEdad[i] || "").trim(),
        genero: (victGenero[i] || "").trim(),
        nivel_instruccion: (victNivel[i] || "").trim(),
      }))
      .filter((v) => v.iniciales.length > 0);

    const perpNombre = formData.getAll("perpetrator_nombre").filter((v): v is string => typeof v === "string");
    const perpEdad = formData.getAll("perpetrator_edad").filter((v): v is string => typeof v === "string");
    const perpSexo = formData.getAll("perpetrator_sexo").filter((v): v is string => typeof v === "string");
    const perpCargo = formData.getAll("perpetrator_cargo").filter((v): v is string => typeof v === "string");
    const perpetrators = perpNombre
      .map((nombre, i) => ({
        nombre: nombre.trim(),
        edad: (perpEdad[i] || "").trim(),
        sexo: (perpSexo[i] || "").trim(),
        cargo_funcion: (perpCargo[i] || "").trim(),
      }))
      .filter((p) => p.nombre.length > 0);

    const legalInstancia = formData.getAll("legal_instancia").filter((v): v is string => typeof v === "string");
    const legalFecha = formData.getAll("legal_fecha_denuncia").filter((v): v is string => typeof v === "string");
    const legalNumero = formData.getAll("legal_numero_denuncia").filter((v): v is string => typeof v === "string");
    const legalMedidas = formData.getAll("legal_medidas").filter((v): v is string => typeof v === "string");
    const legalEstado = formData.getAll("legal_estado").filter((v): v is string => typeof v === "string");
    const legalTotal = formData.getAll("legal_total").filter((v): v is string => typeof v === "string");
    const legalInstances = legalInstancia.map((instancia, i) => ({
      instancia,
      fecha_denuncia: (legalFecha[i] || "").trim(),
      numero_denuncia: (legalNumero[i] || "").trim(),
      medidas: (legalMedidas[i] || "").trim(),
      estado: (legalEstado[i] || "").trim(),
      total: (legalTotal[i] || "").trim() || (legalNumero[i]?.trim() || legalFecha[i]?.trim() ? "1" : "0"),
    }));

    const accCategoria = formData.getAll("accomp_categoria").filter((v): v is string => typeof v === "string");
    const accEjecutor = formData.getAll("accomp_ejecutor").filter((v): v is string => typeof v === "string");
    const accNumPersonas = formData.getAll("accomp_num_personas").filter((v): v is string => typeof v === "string");
    const accFechaInicio = formData.getAll("accomp_fecha_inicio").filter((v): v is string => typeof v === "string");
    const accFechaFin = formData.getAll("accomp_fecha_fin").filter((v): v is string => typeof v === "string");
    const accompanimentActions = accCategoria.map((categoria, i) => ({
      categoria,
      ejecutor: (accEjecutor[i] || "").trim(),
      num_personas: (accNumPersonas[i] || "").trim(),
      fecha_inicio: (accFechaInicio[i] || "").trim(),
      fecha_fin: (accFechaFin[i] || "").trim(),
    }));

    db.prepare(
      `UPDATE case_restitution_plans
       SET school_year = @school_year,
           elaboration_date = @elaboration_date,
           risk_factors = @risk_factors,
           violence_types = @violence_types,
           violence_modality = @violence_modality,
           violence_modality_other = @violence_modality_other,
           perpetrator_relation = @perpetrator_relation,
           victims = @victims,
           perpetrators = @perpetrators,
           report_narrative = @report_narrative,
           legal_instances = @legal_instances,
           accompaniment_actions = @accompaniment_actions,
           prepared_by_name = @prepared_by_name,
           prepared_by_email = @prepared_by_email,
           prepared_by_role = @prepared_by_role,
           prepared_date = @prepared_date,
           reviewed_coordinator_name = @reviewed_coordinator_name,
           reviewed_coordinator_date = @reviewed_coordinator_date,
           reviewed_authority_name = @reviewed_authority_name,
           reviewed_authority_date = @reviewed_authority_date,
           approved_by_name = @approved_by_name,
           approved_date = @approved_date
       WHERE id = @id AND case_file_id = @case_file_id`
    ).run({
      id: planId,
      case_file_id: caseId,
      school_year: str(formData, "school_year"),
      elaboration_date: str(formData, "elaboration_date") || new Date().toISOString().slice(0, 10),
      risk_factors: str(formData, "risk_factors"),
      violence_types: violenceTypes,
      violence_modality: violenceModality,
      violence_modality_other: str(formData, "violence_modality_other"),
      perpetrator_relation: str(formData, "perpetrator_relation"),
      victims: JSON.stringify(victims),
      perpetrators: JSON.stringify(perpetrators),
      report_narrative: str(formData, "report_narrative"),
      legal_instances: JSON.stringify(legalInstances),
      accompaniment_actions: JSON.stringify(accompanimentActions),
      prepared_by_name: str(formData, "prepared_by_name") || session.user.name || null,
      prepared_by_email: str(formData, "prepared_by_email") || session.user.email || null,
      prepared_by_role: str(formData, "prepared_by_role") || "Analista DECE",
      prepared_date: str(formData, "prepared_date"),
      reviewed_coordinator_name: str(formData, "reviewed_coordinator_name"),
      reviewed_coordinator_date: str(formData, "reviewed_coordinator_date"),
      reviewed_authority_name: str(formData, "reviewed_authority_name"),
      reviewed_authority_date: str(formData, "reviewed_authority_date"),
      approved_by_name: str(formData, "approved_by_name"),
      approved_date: str(formData, "approved_date"),
    });

    db.prepare(
      `INSERT INTO case_actions (id, case_file_id, author_id, type, description) VALUES (?, ?, ?, 'Plan de acompañamiento', ?)`
    ).run(randomUUID(), caseId, session.user.id, `Plan de acompañamiento y restitución de derechos actualizado.`);

    logAudit({ userId: session.user.id, action: "ACTUALIZAR", entityType: "CaseRestitutionPlan", entityId: planId, details: caseId, institutionId });
    revalidatePath(`/casos/${caseId}`);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Ocurrió un error inesperado al actualizar el plan de acompañamiento." };
  }

  redirect(`/casos/${caseId}`);
}

/** Registra una sesión de la Ficha de Seguimiento de la Atención Psicosocial (qué se hizo, sesión por sesión). */
export async function createCareFollowup(caseId: string, formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  requireOwnedCase(caseId, institutionId);

  const description = str(formData, "description");
  if (!description) throw new Error("La descripción de la atención realizada es obligatoria.");
  const interventionType = str(formData, "intervention_type") || "INDIVIDUAL";

  const id = randomUUID();
  db.prepare(
    `INSERT INTO case_care_followups (id, case_file_id, institution_id, professional_id, intervention_type, description, session_date, observations)
     VALUES (@id, @case_file_id, @institution_id, @professional_id, @intervention_type, @description, @session_date, @observations)`
  ).run({
    id,
    case_file_id: caseId,
    institution_id: institutionId,
    professional_id: session.user.id,
    intervention_type: interventionType,
    description,
    session_date: str(formData, "session_date") || new Date().toISOString().slice(0, 10),
    observations: str(formData, "observations"),
  });

  db.prepare(
    `INSERT INTO case_actions (id, case_file_id, author_id, type, description) VALUES (?, ?, ?, 'Seguimiento atención psicosocial', ?)`
  ).run(randomUUID(), caseId, session.user.id, `Sesión registrada: ${description}`);

  logAudit({ userId: session.user.id, action: "CREAR", entityType: "CaseCareFollowup", entityId: id, details: caseId, institutionId });
  revalidatePath(`/casos/${caseId}`);
}

/** Registra una entrada del Registro de Asesoría a Docentes Tutores. */
export async function createAdvisoryLog(caseId: string, formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  requireOwnedCase(caseId, institutionId);

  const tutorName = str(formData, "tutor_name");
  const difficulty = str(formData, "difficulty_detected");
  const advice = str(formData, "advice_given");
  if (!tutorName || !difficulty || !advice) {
    throw new Error("Docente tutor, dificultad detectada y asesoría/recomendaciones son obligatorios.");
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO case_advisory_logs (id, case_file_id, institution_id, professional_id, log_date, tutor_name, jornada, difficulty_detected, advice_given)
     VALUES (@id, @case_file_id, @institution_id, @professional_id, @log_date, @tutor_name, @jornada, @difficulty_detected, @advice_given)`
  ).run({
    id,
    case_file_id: caseId,
    institution_id: institutionId,
    professional_id: session.user.id,
    log_date: str(formData, "log_date") || new Date().toISOString().slice(0, 10),
    tutor_name: tutorName,
    jornada: str(formData, "jornada"),
    difficulty_detected: difficulty,
    advice_given: advice,
  });

  db.prepare(
    `INSERT INTO case_actions (id, case_file_id, author_id, type, description) VALUES (?, ?, ?, 'Asesoría a docente tutor', ?)`
  ).run(randomUUID(), caseId, session.user.id, `Asesoría registrada a ${tutorName}.`);

  logAudit({ userId: session.user.id, action: "CREAR", entityType: "CaseAdvisoryLog", entityId: id, details: caseId, institutionId });
  revalidatePath(`/casos/${caseId}`);
}

/** Registra un Informe de Reporte del Hecho de Violencia (Anexo 1 MINEDUC). */
export async function createViolenceReport(
  caseId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  let id = "";
  try {
    requireOwnedCase(caseId, institutionId);
    id = randomUUID();
    const violenceTypes = JSON.stringify(getAllStr(formData, "violence_types"));
    const violenceModalities = JSON.stringify(getAllStr(formData, "violence_modalities"));

    db.prepare(
      `INSERT INTO violence_reports
        (id, case_file_id, institution_id, report_number, report_date, dece_professional_name,
         representative_relationship, perpetrator_name, perpetrator_birth_date, perpetrator_age,
         perpetrator_document_id, perpetrator_gender, perpetrator_relationship,
         informant_name, informant_id_number, informant_role, incident_date, incident_place,
         violence_types, violence_modalities, violence_modality_other, summary, observations,
         analyst_name, analyst_role, rectora_name, created_by)
       VALUES (@id, @case_file_id, @institution_id, @report_number, @report_date, @dece_professional_name,
         @representative_relationship, @perpetrator_name, @perpetrator_birth_date, @perpetrator_age,
         @perpetrator_document_id, @perpetrator_gender, @perpetrator_relationship,
         @informant_name, @informant_id_number, @informant_role, @incident_date, @incident_place,
         @violence_types, @violence_modalities, @violence_modality_other, @summary, @observations,
         @analyst_name, @analyst_role, @rectora_name, @created_by)`
    ).run({
      id,
      case_file_id: caseId,
      institution_id: institutionId,
      report_number: str(formData, "report_number"),
      report_date: str(formData, "report_date") || new Date().toISOString().slice(0, 10),
      dece_professional_name: str(formData, "dece_professional_name") || session.user.name || null,
      representative_relationship: str(formData, "representative_relationship"),
      perpetrator_name: str(formData, "perpetrator_name"),
      perpetrator_birth_date: str(formData, "perpetrator_birth_date"),
      perpetrator_age: str(formData, "perpetrator_age"),
      perpetrator_document_id: str(formData, "perpetrator_document_id"),
      perpetrator_gender: str(formData, "perpetrator_gender"),
      perpetrator_relationship: str(formData, "perpetrator_relationship"),
      informant_name: str(formData, "informant_name"),
      informant_id_number: str(formData, "informant_id_number"),
      informant_role: str(formData, "informant_role"),
      incident_date: str(formData, "incident_date"),
      incident_place: str(formData, "incident_place"),
      violence_types: violenceTypes,
      violence_modalities: violenceModalities,
      violence_modality_other: str(formData, "violence_modality_other"),
      summary: str(formData, "summary"),
      observations: str(formData, "observations"),
      analyst_name: str(formData, "analyst_name") || session.user.name || null,
      analyst_role: str(formData, "analyst_role") || (session.user.role === "ADMIN" ? "COORDINADOR/A DECE" : ((session.user as any).job_title || "ANALISTA DECE")),
      rectora_name: str(formData, "rectora_name"),
      created_by: session.user.id,
    });

    db.prepare(
      `INSERT INTO case_actions (id, case_file_id, author_id, type, description) VALUES (?, ?, ?, 'Reporte de hecho de violencia', ?)`
    ).run(randomUUID(), caseId, session.user.id, `Informe de reporte del hecho de violencia registrado.`);

    logAudit({ userId: session.user.id, action: "CREAR", entityType: "ViolenceReport", entityId: id, details: caseId, institutionId });
    revalidatePath(`/casos/${caseId}`);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Ocurrió un error inesperado al guardar el reporte." };
  }

  redirect(`/casos/${caseId}/hecho-violencia/${id}/imprimir`);
}

/** Registra un Acta de Socialización de Estudiantes en Situación de Vulnerabilidad. */
export async function createSocializationAct(
  caseId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  let id = "";
  try {
    requireOwnedCase(caseId, institutionId);
    const vulnerabilityType = str(formData, "vulnerability_type");
    if (!vulnerabilityType) return { error: "El tipo de vulnerabilidad es obligatorio." };
    id = randomUUID();

    const agreements = getAllStr(formData, "agreement").map((a) => a.trim()).filter(Boolean);

    const subjectNames = getAllStr(formData, "teacher_subject");
    const teacherNames = getAllStr(formData, "teacher_name");
    const maxTeacherRows = Math.max(subjectNames.length, teacherNames.length);
    const teacherSignatures = Array.from({ length: maxTeacherRows }).map((_, i) => ({
      asignatura: (subjectNames[i] || "").trim(),
      docente: (teacherNames[i] || "").trim(),
    }));

    db.prepare(
      `INSERT INTO socialization_acts
        (id, case_file_id, institution_id, act_date, act_place, vulnerability_type, curricular_adaptation_grade,
         agreements, normative_text, psychosocial_strategies, teacher_signatures, prepared_by_name, approved_by_name, received_by_name, received_by_role, created_by)
       VALUES (@id, @case_file_id, @institution_id, @act_date, @act_place, @vulnerability_type, @curricular_adaptation_grade,
         @agreements, @normative_text, @psychosocial_strategies, @teacher_signatures, @prepared_by_name, @approved_by_name, @received_by_name, @received_by_role, @created_by)`
    ).run({
      id,
      case_file_id: caseId,
      institution_id: institutionId,
      act_date: str(formData, "act_date") || new Date().toISOString().slice(0, 10),
      act_place: str(formData, "act_place"),
      vulnerability_type: vulnerabilityType,
      curricular_adaptation_grade: str(formData, "curricular_adaptation_grade"),
      agreements: JSON.stringify(agreements),
      normative_text: str(formData, "normative_text"),
      psychosocial_strategies: str(formData, "psychosocial_strategies"),
      teacher_signatures: JSON.stringify(teacherSignatures),
      prepared_by_name: str(formData, "prepared_by_name") || session.user.name || null,
      approved_by_name: str(formData, "approved_by_name"),
      received_by_name: str(formData, "received_by_name"),
      received_by_role: str(formData, "received_by_role") || "Tutor del curso",
      created_by: session.user.id,
    });

    db.prepare(
      `INSERT INTO case_actions (id, case_file_id, author_id, type, description) VALUES (?, ?, ?, 'Acta de socialización', ?)`
    ).run(randomUUID(), caseId, session.user.id, `Acta de socialización de vulnerabilidad registrada.`);

    logAudit({ userId: session.user.id, action: "CREAR", entityType: "SocializationAct", entityId: id, details: caseId, institutionId });
    revalidatePath(`/casos/${caseId}`);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Ocurrió un error inesperado al guardar el acta." };
  }

  redirect(`/casos/${caseId}/socializacion/${id}/imprimir`);
}

/** Registra un Acta de Asesoramiento a la Máxima Autoridad Institucional. */
export async function createAuthorityAdvisoryAct(
  caseId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  let id = "";
  try {
    requireOwnedCase(caseId, institutionId);
    id = randomUUID();

    const partNombre = getAllStr(formData, "participant_nombre");
    const partCargo = getAllStr(formData, "participant_cargo");
    const partFuncion = getAllStr(formData, "participant_funcion");
    const participants = partNombre
      .map((nombre, i) => ({ nombre: nombre.trim(), cargo: (partCargo[i] || "").trim(), funcion: (partFuncion[i] || "").trim() }))
      .filter((p) => p.nombre.length > 0);

    const background = getAllStr(formData, "background_item").map((b) => b.trim()).filter(Boolean);
    const measures = getAllStr(formData, "measure_item").map((m) => m.trim()).filter(Boolean);
    const advisoryScope = getAllStr(formData, "scope_item").map((s) => s.trim()).filter(Boolean);

    db.prepare(
      `INSERT INTO authority_advisory_acts
        (id, case_file_id, institution_id, act_date, act_time, act_place, issuing_entity, standard_code,
         participants, background, measures, advisory_scope, conclusion, dece_professional_name, authority_name, authority_role, created_by)
       VALUES (@id, @case_file_id, @institution_id, @act_date, @act_time, @act_place, @issuing_entity, @standard_code,
         @participants, @background, @measures, @advisory_scope, @conclusion, @dece_professional_name, @authority_name, @authority_role, @created_by)`
    ).run({
      id,
      case_file_id: caseId,
      institution_id: institutionId,
      act_date: str(formData, "act_date") || new Date().toISOString().slice(0, 10),
      act_time: str(formData, "act_time"),
      act_place: str(formData, "act_place"),
      issuing_entity: str(formData, "issuing_entity"),
      standard_code: str(formData, "standard_code"),
      participants: JSON.stringify(participants),
      background: JSON.stringify(background),
      measures: JSON.stringify(measures),
      advisory_scope: JSON.stringify(advisoryScope),
      conclusion: str(formData, "conclusion"),
      dece_professional_name: str(formData, "dece_professional_name") || session.user.name || null,
      authority_name: str(formData, "authority_name"),
      authority_role: str(formData, "authority_role") || "Rector/a",
      created_by: session.user.id,
    });

    db.prepare(
      `INSERT INTO case_actions (id, case_file_id, author_id, type, description) VALUES (?, ?, ?, 'Asesoramiento a máxima autoridad', ?)`
    ).run(randomUUID(), caseId, session.user.id, `Acta de asesoramiento a la máxima autoridad registrada.`);

    logAudit({ userId: session.user.id, action: "CREAR", entityType: "AuthorityAdvisoryAct", entityId: id, details: caseId, institutionId });
    revalidatePath(`/casos/${caseId}`);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Ocurrió un error inesperado al guardar el acta." };
  }

  redirect(`/casos/${caseId}/asesoramiento-autoridad/${id}/imprimir`);
}

/** Registra un Informe Técnico Situacional. */
export async function createSituationalReport(
  caseId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  let id = "";
  try {
    requireOwnedCase(caseId, institutionId);
    const situationType = str(formData, "situation_type");
    if (!situationType) return { error: "El tipo de situación es obligatorio." };
    id = randomUUID();

    const methodology = JSON.stringify(getAllStr(formData, "methodology"));

    db.prepare(
      `INSERT INTO situational_reports
        (id, case_file_id, institution_id, report_number, report_date,
         responsible_name, responsible_role, responsible_phone, responsible_email,
         addressed_to_name, addressed_to_role, addressed_to_phone, addressed_to_email,
         situation_type, tema, tutor_name, scope_text, objective_text,
         eje_deteccion, eje_diagnostico_individual, eje_diagnostico_familiar, eje_diagnostico_institucional,
         eje_atencion_psicosocial, eje_derivacion, eje_seguimiento, eje_reparacion,
         methodology, conclusions, legal_basis, recommendations,
         preparer_name, preparer_role, reviewer_name, reviewer_role, approver_name, approver_role, created_by)
       VALUES (@id, @case_file_id, @institution_id, @report_number, @report_date,
         @responsible_name, @responsible_role, @responsible_phone, @responsible_email,
         @addressed_to_name, @addressed_to_role, @addressed_to_phone, @addressed_to_email,
         @situation_type, @tema, @tutor_name, @scope_text, @objective_text,
         @eje_deteccion, @eje_diagnostico_individual, @eje_diagnostico_familiar, @eje_diagnostico_institucional,
         @eje_atencion_psicosocial, @eje_derivacion, @eje_seguimiento, @eje_reparacion,
         @methodology, @conclusions, @legal_basis, @recommendations,
         @preparer_name, @preparer_role, @reviewer_name, @reviewer_role, @approver_name, @approver_role, @created_by)`
    ).run({
      id,
      case_file_id: caseId,
      institution_id: institutionId,
      report_number: str(formData, "report_number"),
      report_date: str(formData, "report_date") || new Date().toISOString().slice(0, 10),
      responsible_name: str(formData, "responsible_name") || session.user.name || null,
      responsible_role: str(formData, "responsible_role"),
      responsible_phone: str(formData, "responsible_phone"),
      responsible_email: str(formData, "responsible_email"),
      addressed_to_name: str(formData, "addressed_to_name"),
      addressed_to_role: str(formData, "addressed_to_role"),
      addressed_to_phone: str(formData, "addressed_to_phone"),
      addressed_to_email: str(formData, "addressed_to_email"),
      situation_type: situationType,
      tema: str(formData, "tema"),
      tutor_name: str(formData, "tutor_name"),
      scope_text: str(formData, "scope_text"),
      objective_text: str(formData, "objective_text"),
      eje_deteccion: str(formData, "eje_deteccion"),
      eje_diagnostico_individual: str(formData, "eje_diagnostico_individual"),
      eje_diagnostico_familiar: str(formData, "eje_diagnostico_familiar"),
      eje_diagnostico_institucional: str(formData, "eje_diagnostico_institucional"),
      eje_atencion_psicosocial: str(formData, "eje_atencion_psicosocial"),
      eje_derivacion: str(formData, "eje_derivacion"),
      eje_seguimiento: str(formData, "eje_seguimiento"),
      eje_reparacion: str(formData, "eje_reparacion"),
      methodology,
      conclusions: str(formData, "conclusions"),
      legal_basis: str(formData, "legal_basis"),
      recommendations: str(formData, "recommendations"),
      preparer_name: str(formData, "preparer_name") || session.user.name || null,
      preparer_role: str(formData, "preparer_role"),
      reviewer_name: str(formData, "reviewer_name"),
      reviewer_role: str(formData, "reviewer_role"),
      approver_name: str(formData, "approver_name"),
      approver_role: str(formData, "approver_role") || "Rector/a",
      created_by: session.user.id,
    });

    db.prepare(
      `INSERT INTO case_actions (id, case_file_id, author_id, type, description) VALUES (?, ?, ?, 'Informe situacional', ?)`
    ).run(randomUUID(), caseId, session.user.id, `Informe técnico situacional registrado.`);

    logAudit({ userId: session.user.id, action: "CREAR", entityType: "SituationalReport", entityId: id, details: caseId, institutionId });
    revalidatePath(`/casos/${caseId}`);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Ocurrió un error inesperado al guardar el informe." };
  }

  redirect(`/casos/${caseId}/informe-situacional/${id}/imprimir`);
}

/**
 * Crea o actualiza (si se pasa entry_id) una entrada de la Matriz de Riesgos
 * Psicosociales para un caso, en un mes de reporte determinado. El resto de
 * columnas de la matriz (estudiante, representante, persona agresora,
 * acciones de acompañamiento) se toman de otras tablas al exportar — aquí
 * solo se guardan los campos que no viven en ningún otro lado.
 */
export async function upsertRiskMatrixEntry(caseId: string, formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  requireOwnedCase(caseId, institutionId);

  const caseType = str(formData, "case_type");
  const reportMonth = str(formData, "report_month");
  if (!caseType || !reportMonth) {
    throw new Error("El tipo de caso y el mes de reporte son obligatorios.");
  }

  const entryId = str(formData, "entry_id");
  const fields = {
    case_file_id: caseId,
    institution_id: institutionId,
    report_month: reportMonth,
    case_type: caseType,
    knowledge_date: str(formData, "knowledge_date"),
    registered_by_name: str(formData, "registered_by_name") || session.user.name,
    registered_by_role: str(formData, "registered_by_role") || "DECE Institucional",
    student_ethnicity: str(formData, "student_ethnicity"),
    student_nationality: str(formData, "student_nationality"),
    student_has_disability: str(formData, "student_has_disability"),
    student_disability_type: str(formData, "student_disability_type"),
    student_gender_diversity: str(formData, "student_gender_diversity"),
    student_other_conditions: str(formData, "student_other_conditions"),
    file_lift_date: str(formData, "file_lift_date"),
    district_case_number: str(formData, "district_case_number"),
    district_intake_date: str(formData, "district_intake_date"),
    protection_measures_institution: str(formData, "protection_measures_institution"),
    protection_measures_description: str(formData, "protection_measures_description"),
    has_accompaniment_plan: str(formData, "has_accompaniment_plan"),
    fiscalia_complaint: str(formData, "fiscalia_complaint"),
    fiscalia_date: str(formData, "fiscalia_date"),
    fiscalia_number: str(formData, "fiscalia_number"),
    jcpdna_complaint: str(formData, "jcpdna_complaint"),
    jcpdna_date: str(formData, "jcpdna_date"),
    case_current_status: str(formData, "case_current_status"),
    observations: str(formData, "observations"),
  };

  if (entryId) {
    const existing = db
      .prepare("SELECT id FROM case_risk_matrix_entries WHERE id = ? AND case_file_id = ?")
      .get(entryId, caseId);
    if (!existing) throw new Error("Entrada de matriz no encontrada en este caso.");
    db.prepare(
      `UPDATE case_risk_matrix_entries SET
        report_month=@report_month, case_type=@case_type, knowledge_date=@knowledge_date,
        registered_by_name=@registered_by_name, registered_by_role=@registered_by_role,
        student_ethnicity=@student_ethnicity, student_nationality=@student_nationality,
        student_has_disability=@student_has_disability, student_disability_type=@student_disability_type,
        student_gender_diversity=@student_gender_diversity, student_other_conditions=@student_other_conditions,
        file_lift_date=@file_lift_date, district_case_number=@district_case_number,
        district_intake_date=@district_intake_date, protection_measures_institution=@protection_measures_institution,
        protection_measures_description=@protection_measures_description, has_accompaniment_plan=@has_accompaniment_plan,
        fiscalia_complaint=@fiscalia_complaint, fiscalia_date=@fiscalia_date, fiscalia_number=@fiscalia_number,
        jcpdna_complaint=@jcpdna_complaint, jcpdna_date=@jcpdna_date, case_current_status=@case_current_status,
        observations=@observations, updated_at=datetime('now')
       WHERE id=@id AND case_file_id=@case_file_id`
    ).run({ ...fields, id: entryId });
  } else {
    const id = randomUUID();
    db.prepare(
      `INSERT INTO case_risk_matrix_entries (
        id, case_file_id, institution_id, report_month, case_type, knowledge_date,
        registered_by_name, registered_by_role, student_ethnicity, student_nationality,
        student_has_disability, student_disability_type, student_gender_diversity, student_other_conditions,
        file_lift_date, district_case_number, district_intake_date, protection_measures_institution,
        protection_measures_description, has_accompaniment_plan, fiscalia_complaint, fiscalia_date,
        fiscalia_number, jcpdna_complaint, jcpdna_date, case_current_status, observations
      ) VALUES (
        @id, @case_file_id, @institution_id, @report_month, @case_type, @knowledge_date,
        @registered_by_name, @registered_by_role, @student_ethnicity, @student_nationality,
        @student_has_disability, @student_disability_type, @student_gender_diversity, @student_other_conditions,
        @file_lift_date, @district_case_number, @district_intake_date, @protection_measures_institution,
        @protection_measures_description, @has_accompaniment_plan, @fiscalia_complaint, @fiscalia_date,
        @fiscalia_number, @jcpdna_complaint, @jcpdna_date, @case_current_status, @observations
      )`
    ).run({ ...fields, id });
    logAudit({ userId: session.user.id, action: "CREAR", entityType: "RiskMatrixEntry", entityId: id, details: caseId, institutionId });
  }

  revalidatePath(`/casos/${caseId}`);
}

/**
 * Borrado de registros del caso (ronda 19) — para corregir duplicados
 * creados por error (p. ej. "Guardar" presionado dos veces). Cada función
 * es un envoltorio delgado sobre este helper compartido; todas verifican
 * que el caso pertenezca a la institución de la sesión antes de borrar.
 */
async function deleteCaseRecord(table: string, entityType: string, id: string, caseId: string) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  requireOwnedCase(caseId, institutionId);
  db.prepare(`DELETE FROM ${table} WHERE id = ? AND case_file_id = ?`).run(id, caseId);
  logAudit({ userId: session.user.id, action: "BORRAR", entityType, entityId: id, institutionId });
  revalidatePath(`/casos/${caseId}`);
}

export async function deleteCaseAction(id: string, caseId: string) {
  return deleteCaseRecord("case_actions", "CaseAction", id, caseId);
}
export async function deleteInterventionPlan(id: string, caseId: string) {
  return deleteCaseRecord("intervention_plans", "InterventionPlan", id, caseId);
}
export async function deleteInterview(id: string, caseId: string) {
  return deleteCaseRecord("case_interviews", "CaseInterview", id, caseId);
}
export async function deleteObservationSheet(id: string, caseId: string) {
  return deleteCaseRecord("case_observation_sheets", "ObservationSheet", id, caseId);
}
export async function deleteCarePlan(id: string, caseId: string) {
  return deleteCaseRecord("case_care_plans", "CarePlan", id, caseId);
}
export async function deleteRestitutionPlan(id: string, caseId: string) {
  return deleteCaseRecord("case_restitution_plans", "RestitutionPlan", id, caseId);
}
export async function deleteCallLog(id: string, caseId: string) {
  return deleteCaseRecord("case_call_logs", "CallLog", id, caseId);
}
export async function deleteCareFollowup(id: string, caseId: string) {
  return deleteCaseRecord("case_care_followups", "CareFollowup", id, caseId);
}
export async function deleteAdvisoryLog(id: string, caseId: string) {
  return deleteCaseRecord("case_advisory_logs", "AdvisoryLog", id, caseId);
}
export async function deleteViolenceReport(id: string, caseId: string) {
  return deleteCaseRecord("violence_reports", "ViolenceReport", id, caseId);
}
export async function deleteSocializationAct(id: string, caseId: string) {
  return deleteCaseRecord("socialization_acts", "SocializationAct", id, caseId);
}
export async function deleteAuthorityAdvisoryAct(id: string, caseId: string) {
  return deleteCaseRecord("authority_advisory_acts", "AuthorityAdvisoryAct", id, caseId);
}
export async function deleteSituationalReport(id: string, caseId: string) {
  return deleteCaseRecord("situational_reports", "SituationalReport", id, caseId);
}
export async function deleteRiskMatrixEntry(id: string, caseId: string) {
  return deleteCaseRecord("case_risk_matrix_entries", "RiskMatrixEntry", id, caseId);
}
export async function deleteAlertNotification(id: string, caseId: string) {
  return deleteCaseRecord("case_alert_notifications", "AlertNotification", id, caseId);
}

export async function updateSituationalReport(
  reportId: string,
  caseId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  try {
    requireOwnedCase(caseId, institutionId);
    const situationType = str(formData, "situation_type");
    if (!situationType) return { error: "El tipo de situación es obligatorio." };

    const methodology = JSON.stringify(getAllStr(formData, "methodology"));

    db.prepare(
      `UPDATE situational_reports SET
         report_number = @report_number, report_date = @report_date,
         responsible_name = @responsible_name, responsible_role = @responsible_role, responsible_phone = @responsible_phone, responsible_email = @responsible_email,
         addressed_to_name = @addressed_to_name, addressed_to_role = @addressed_to_role, addressed_to_phone = @addressed_to_phone, addressed_to_email = @addressed_to_email,
         situation_type = @situation_type, tema = @tema, tutor_name = @tutor_name, scope_text = @scope_text, objective_text = @objective_text,
         eje_deteccion = @eje_deteccion, eje_diagnostico_individual = @eje_diagnostico_individual, eje_diagnostico_familiar = @eje_diagnostico_familiar, eje_diagnostico_institucional = @eje_diagnostico_institucional,
         eje_atencion_psicosocial = @eje_atencion_psicosocial, eje_derivacion = @eje_derivacion, eje_seguimiento = @eje_seguimiento, eje_reparacion = @eje_reparacion,
         methodology = @methodology, conclusions = @conclusions, legal_basis = @legal_basis, recommendations = @recommendations,
         preparer_name = @preparer_name, preparer_role = @preparer_role, reviewer_name = @reviewer_name, reviewer_role = @reviewer_role, approver_name = @approver_name, approver_role = @approver_role
       WHERE id = @id AND case_file_id = @case_file_id AND institution_id = @institution_id`
    ).run({
      id: reportId,
      case_file_id: caseId,
      institution_id: institutionId,
      report_number: str(formData, "report_number"),
      report_date: str(formData, "report_date") || new Date().toISOString().slice(0, 10),
      responsible_name: str(formData, "responsible_name") || session.user.name || null,
      responsible_role: str(formData, "responsible_role"),
      responsible_phone: str(formData, "responsible_phone"),
      responsible_email: str(formData, "responsible_email"),
      addressed_to_name: str(formData, "addressed_to_name"),
      addressed_to_role: str(formData, "addressed_to_role"),
      addressed_to_phone: str(formData, "addressed_to_phone"),
      addressed_to_email: str(formData, "addressed_to_email"),
      situation_type: situationType,
      tema: str(formData, "tema"),
      tutor_name: str(formData, "tutor_name"),
      scope_text: str(formData, "scope_text"),
      objective_text: str(formData, "objective_text"),
      eje_deteccion: str(formData, "eje_deteccion"),
      eje_diagnostico_individual: str(formData, "eje_diagnostico_individual"),
      eje_diagnostico_familiar: str(formData, "eje_diagnostico_familiar"),
      eje_diagnostico_institucional: str(formData, "eje_diagnostico_institucional"),
      eje_atencion_psicosocial: str(formData, "eje_atencion_psicosocial"),
      eje_derivacion: str(formData, "eje_derivacion"),
      eje_seguimiento: str(formData, "eje_seguimiento"),
      eje_reparacion: str(formData, "eje_reparacion"),
      methodology,
      conclusions: str(formData, "conclusions"),
      legal_basis: str(formData, "legal_basis") || null,
      recommendations: str(formData, "recommendations"),
      preparer_name: str(formData, "preparer_name"),
      preparer_role: str(formData, "preparer_role"),
      reviewer_name: str(formData, "reviewer_name"),
      reviewer_role: str(formData, "reviewer_role"),
      approver_name: str(formData, "approver_name"),
      approver_role: str(formData, "approver_role"),
    });
  } catch (err: unknown) {
    return { error: (err as Error).message };
  }
  revalidatePath(`/casos/${caseId}`);
  redirect(`/casos/${caseId}`);
}

/** Crea un nuevo Informe Bimensual de Seguimiento al Plan de Acompañamiento */
export async function createBimonthlyReport(
  caseId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  requireOwnedCase(caseId, institutionId);

  const id = randomUUID();
  const schoolYearText = str(formData, "school_year_text") || "2025-2026";
  const periodMonths = str(formData, "period_months") || "Mayo - Junio";
  const institutionName = str(formData, "institution_name") || "";
  const amieCode = str(formData, "amie_code") || "";
  const victimInitials = str(formData, "victim_initials") || "";
  const processesData = str(formData, "processes_data") || "[]";
  const elaboratedByName = str(formData, "elaborated_by_name") || session.user.name || null;
  const elaboratedByRole = str(formData, "elaborated_by_role") || "DECE institucional";
  const reviewedByName = str(formData, "reviewed_by_name") || null;
  const reviewedByRole = str(formData, "reviewed_by_role") || "Autoridad educativa";
  const approvedByName = str(formData, "approved_by_name") || null;
  const approvedByRole = str(formData, "approved_by_role") || "Profesional de apoyo DECE Distrital";

  try {
    db.prepare(
      `INSERT INTO bimonthly_reports (
        id, case_file_id, institution_id, school_year_text, period_months,
        institution_name, amie_code, victim_initials, processes_data,
        elaborated_by_name, elaborated_by_role, reviewed_by_name, reviewed_by_role,
        approved_by_name, approved_by_role, created_by
      ) VALUES (
        @id, @case_file_id, @institution_id, @school_year_text, @period_months,
        @institution_name, @amie_code, @victim_initials, @processes_data,
        @elaborated_by_name, @elaborated_by_role, @reviewed_by_name, @reviewed_by_role,
        @approved_by_name, @approved_by_role, @created_by
      )`
    ).run({
      id,
      case_file_id: caseId,
      institution_id: institutionId,
      school_year_text: schoolYearText,
      period_months: periodMonths,
      institution_name: institutionName,
      amie_code: amieCode,
      victim_initials: victimInitials,
      processes_data: processesData,
      elaborated_by_name: elaboratedByName,
      elaborated_by_role: elaboratedByRole,
      reviewed_by_name: reviewedByName,
      reviewed_by_role: reviewedByRole,
      approved_by_name: approvedByName,
      approved_by_role: approvedByRole,
      created_by: session.user.id,
    });

    db.prepare(
      `INSERT INTO case_actions (id, case_file_id, author_id, type, description) VALUES (?, ?, ?, 'Informe bimensual', ?)`
    ).run(
      randomUUID(),
      caseId,
      session.user.id,
      `Informe bimensual de acompañamiento registrado (Período: ${periodMonths} ${schoolYearText}).`
    );

    logAudit({
      userId: session.user.id,
      action: "CREAR",
      entityType: "BimonthlyReport",
      entityId: id,
      details: `Caso ${caseId} - ${periodMonths}`,
      institutionId,
    });
  } catch (err: unknown) {
    return { error: (err as Error).message };
  }

  revalidatePath(`/casos/${caseId}`);
  redirect(`/casos/${caseId}`);
}

/** Actualiza un Informe Bimensual existente */
export async function updateBimonthlyReport(
  reportId: string,
  caseId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  requireOwnedCase(caseId, institutionId);

  const schoolYearText = str(formData, "school_year_text") || "2025-2026";
  const periodMonths = str(formData, "period_months") || "Mayo - Junio";
  const institutionName = str(formData, "institution_name") || "";
  const amieCode = str(formData, "amie_code") || "";
  const victimInitials = str(formData, "victim_initials") || "";
  const processesData = str(formData, "processes_data") || "[]";
  const elaboratedByName = str(formData, "elaborated_by_name") || session.user.name || null;
  const elaboratedByRole = str(formData, "elaborated_by_role") || "DECE institucional";
  const reviewedByName = str(formData, "reviewed_by_name") || null;
  const reviewedByRole = str(formData, "reviewed_by_role") || "Autoridad educativa";
  const approvedByName = str(formData, "approved_by_name") || null;
  const approvedByRole = str(formData, "approved_by_role") || "Profesional de apoyo DECE Distrital";

  try {
    db.prepare(
      `UPDATE bimonthly_reports SET
        school_year_text = @school_year_text,
        period_months = @period_months,
        institution_name = @institution_name,
        amie_code = @amie_code,
        victim_initials = @victim_initials,
        processes_data = @processes_data,
        elaborated_by_name = @elaborated_by_name,
        elaborated_by_role = @elaborated_by_role,
        reviewed_by_name = @reviewed_by_name,
        reviewed_by_role = @reviewed_by_role,
        approved_by_name = @approved_by_name,
        approved_by_role = @approved_by_role,
        updated_at = datetime('now')
      WHERE id = @id AND institution_id = @institution_id AND case_file_id = @case_file_id`
    ).run({
      id: reportId,
      case_file_id: caseId,
      institution_id: institutionId,
      school_year_text: schoolYearText,
      period_months: periodMonths,
      institution_name: institutionName,
      amie_code: amieCode,
      victim_initials: victimInitials,
      processes_data: processesData,
      elaborated_by_name: elaboratedByName,
      elaborated_by_role: elaboratedByRole,
      reviewed_by_name: reviewedByName,
      reviewed_by_role: reviewedByRole,
      approved_by_name: approvedByName,
      approved_by_role: approvedByRole,
    });

    logAudit({
      userId: session.user.id,
      action: "EDITAR",
      entityType: "BimonthlyReport",
      entityId: reportId,
      details: `Caso ${caseId} - ${periodMonths}`,
      institutionId,
    });
  } catch (err: unknown) {
    return { error: (err as Error).message };
  }

  revalidatePath(`/casos/${caseId}`);
  redirect(`/casos/${caseId}`);
}

/** Elimina un Informe Bimensual */
export async function deleteBimonthlyReport(reportId: string, caseId: string) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  requireOwnedCase(caseId, institutionId);

  db.prepare(`DELETE FROM bimonthly_reports WHERE id = ? AND institution_id = ? AND case_file_id = ?`).run(
    reportId,
    institutionId,
    caseId
  );

  logAudit({
    userId: session.user.id,
    action: "ELIMINAR",
    entityType: "BimonthlyReport",
    entityId: reportId,
    details: `Caso ${caseId}`,
    institutionId,
  });

  revalidatePath(`/casos/${caseId}`);
}



// ============================================================================
// ACTAS DE COMPROMISO Y CORRESPONSABILIDAD CON REPRESENTANTES LEGALES
// ============================================================================

export async function createCorresponsibilityAct(
  caseId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  let createdActId = "";
  try {
    requireOwnedCase(caseId, institutionId);

    const city = str(formData, "city") || "Ambato";
    const actDate = str(formData, "act_date") || new Date().toISOString().slice(0, 10);
    const actTime = str(formData, "act_time") || "09:00";
    const representativeName = str(formData, "representative_name");
    const representativeIdNum = str(formData, "representative_id_num");
    const representativeRelationship = str(formData, "representative_relationship") || "Representante Legal";
    const representativePhone = str(formData, "representative_phone");
    const representativeAddress = str(formData, "representative_address");
    const studentName = str(formData, "student_name") || "Estudiante";
    const studentGrade = str(formData, "student_grade") || "No especificado";
    const studentParallel = str(formData, "student_parallel");
    const jornada = str(formData, "jornada") || "MATUTINA";
    const deceProfessionalName = str(formData, "dece_professional_name") || session.user.name || "Profesional DECE";
    const deceProfessionalIdNum = str(formData, "dece_professional_id_num");
    const tutorAuthorityName = str(formData, "tutor_authority_name");
    const tutorAuthorityRole = str(formData, "tutor_authority_role");
    const conflictType = (str(formData, "conflict_type") || "OTRO") as CorresponsibilityConflictType;
    const detectedDifficulty = str(formData, "detected_difficulty");
    const legalFramework = str(formData, "legal_framework") || "";
    const agreementsAndCommitments = str(formData, "agreements_and_commitments") || str(formData, "commitments_representative") || "";
    const commitmentsRepresentative = agreementsAndCommitments;
    const commitmentsDece = str(formData, "commitments_dece") || "";
    const commitmentsStudent = str(formData, "commitments_student");
    const observations = str(formData, "observations");

    if (!representativeName) return { error: "El nombre del representante legal es obligatorio." };
    if (!detectedDifficulty) return { error: "La dificultad detectada es obligatoria." };
    if (!agreementsAndCommitments) return { error: "Los acuerdos y compromisos son obligatorios." };

    const id = randomUUID();
    createdActId = id;
    db.prepare(
      `INSERT INTO case_corresponsibility_acts
        (id, case_file_id, institution_id, city, act_date, act_time,
         representative_name, representative_id_num, representative_relationship, representative_phone, representative_address,
         student_name, student_grade, student_parallel, jornada,
         dece_professional_name, dece_professional_id_num, tutor_authority_name, tutor_authority_role,
         conflict_type, detected_difficulty, legal_framework,
         commitments_representative, agreements_and_commitments, commitments_dece, commitments_student, observations, created_by)
       VALUES
        (@id, @case_file_id, @institution_id, @city, @act_date, @act_time,
         @representative_name, @representative_id_num, @representative_relationship, @representative_phone, @representative_address,
         @student_name, @student_grade, @student_parallel, @jornada,
         @dece_professional_name, @dece_professional_id_num, @tutor_authority_name, @tutor_authority_role,
         @conflict_type, @detected_difficulty, @legal_framework,
         @commitments_representative, @agreements_and_commitments, @commitments_dece, @commitments_student, @observations, @created_by)`
    ).run({
      id,
      case_file_id: caseId,
      institution_id: institutionId,
      city,
      act_date: actDate,
      act_time: actTime,
      representative_name: representativeName,
      representative_id_num: representativeIdNum,
      representative_relationship: representativeRelationship,
      representative_phone: representativePhone,
      representative_address: representativeAddress,
      student_name: studentName,
      student_grade: studentGrade,
      student_parallel: studentParallel,
      jornada,
      dece_professional_name: deceProfessionalName,
      dece_professional_id_num: deceProfessionalIdNum,
      tutor_authority_name: tutorAuthorityName,
      tutor_authority_role: tutorAuthorityRole,
      conflict_type: conflictType,
      detected_difficulty: detectedDifficulty,
      legal_framework: legalFramework,
      commitments_representative: commitmentsRepresentative,
      agreements_and_commitments: agreementsAndCommitments,
      commitments_dece: commitmentsDece,
      commitments_student: commitmentsStudent,
      observations,
      created_by: session.user.id,
    });

    // Registrar en la Bitácora de acciones del caso
    const catalogInfo = CONFLICT_TYPES_CATALOG[conflictType] || CONFLICT_TYPES_CATALOG.OTRO;
    const diffExcerpt = (detectedDifficulty || "").slice(0, 160).trim();
    db.prepare(
      `INSERT INTO case_actions (id, case_file_id, author_id, date, type, description, intervention_type, observations)
       VALUES (?, ?, ?, ?, 'Acta de compromiso y corresponsabilidad', ?, 'Acuerdo de corresponsabilidad', ?)`
    ).run(
      randomUUID(),
      caseId,
      session.user.id,
      actDate,
      `Acta de compromiso y corresponsabilidad suscrita con ${representativeName} (${representativeRelationship || "Representante legal"}). Motivo: ${catalogInfo?.label || conflictType}. Dificultad: ${diffExcerpt}${diffExcerpt.length >= 160 ? "..." : ""}`,
      observations || null
    );

    logAudit({
      userId: session.user.id,
      institutionId,
      action: "CREATE",
      entityType: "case_corresponsibility_acts",
      entityId: id,
      details: `Acta de corresponsabilidad creada para estudiante ${studentName} con representante ${representativeName}`,
    });

    revalidatePath(`/casos/${caseId}`);
    revalidatePath(`/casos/${caseId}/corresponsabilidad/${id}`);
  } catch (err: any) {
    return { error: err?.message || "Ocurrió un error al guardar el acta de corresponsabilidad." };
  }
  redirect(`/casos/${caseId}/corresponsabilidad/${createdActId}`);
}

export async function updateCorresponsibilityAct(
  actId: string,
  caseId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  try {
    requireOwnedCase(caseId, institutionId);

    const city = str(formData, "city") || "Ambato";
    const actDate = str(formData, "act_date") || new Date().toISOString().slice(0, 10);
    const actTime = str(formData, "act_time") || "09:00";
    const representativeName = str(formData, "representative_name");
    const representativeIdNum = str(formData, "representative_id_num");
    const representativeRelationship = str(formData, "representative_relationship") || "Representante Legal";
    const representativePhone = str(formData, "representative_phone");
    const representativeAddress = str(formData, "representative_address");
    const studentName = str(formData, "student_name") || "Estudiante";
    const studentGrade = str(formData, "student_grade") || "No especificado";
    const studentParallel = str(formData, "student_parallel");
    const jornada = str(formData, "jornada") || "MATUTINA";
    const deceProfessionalName = str(formData, "dece_professional_name") || session.user.name || "Profesional DECE";
    const deceProfessionalIdNum = str(formData, "dece_professional_id_num");
    const tutorAuthorityName = str(formData, "tutor_authority_name");
    const tutorAuthorityRole = str(formData, "tutor_authority_role");
    const conflictType = (str(formData, "conflict_type") || "OTRO") as CorresponsibilityConflictType;
    const detectedDifficulty = str(formData, "detected_difficulty");
    const legalFramework = str(formData, "legal_framework") || "";
    const agreementsAndCommitments = str(formData, "agreements_and_commitments") || str(formData, "commitments_representative") || "";
    const commitmentsRepresentative = agreementsAndCommitments;
    const commitmentsDece = str(formData, "commitments_dece") || "";
    const commitmentsStudent = str(formData, "commitments_student");
    const observations = str(formData, "observations");

    if (!representativeName) return { error: "El nombre del representante legal es obligatorio." };
    if (!detectedDifficulty) return { error: "La dificultad detectada es obligatoria." };
    if (!agreementsAndCommitments) return { error: "Los acuerdos y compromisos son obligatorios." };

    db.prepare(
      `UPDATE case_corresponsibility_acts
       SET city = @city,
           act_date = @act_date,
           act_time = @act_time,
           representative_name = @representative_name,
           representative_id_num = @representative_id_num,
           representative_relationship = @representative_relationship,
           representative_phone = @representative_phone,
           representative_address = @representative_address,
           student_name = @student_name,
           student_grade = @student_grade,
           student_parallel = @student_parallel,
           jornada = @jornada,
           dece_professional_name = @dece_professional_name,
           dece_professional_id_num = @dece_professional_id_num,
           tutor_authority_name = @tutor_authority_name,
           tutor_authority_role = @tutor_authority_role,
           conflict_type = @conflict_type,
           detected_difficulty = @detected_difficulty,
           legal_framework = @legal_framework,
           commitments_representative = @commitments_representative,
           agreements_and_commitments = @agreements_and_commitments,
           commitments_dece = @commitments_dece,
           commitments_student = @commitments_student,
           observations = @observations,
           updated_by = @updated_by,
           updated_at = datetime('now')
       WHERE id = @id AND case_file_id = @case_file_id AND institution_id = @institution_id`
    ).run({
      id: actId,
      case_file_id: caseId,
      institution_id: institutionId,
      city,
      act_date: actDate,
      act_time: actTime,
      representative_name: representativeName,
      representative_id_num: representativeIdNum,
      representative_relationship: representativeRelationship,
      representative_phone: representativePhone,
      representative_address: representativeAddress,
      student_name: studentName,
      student_grade: studentGrade,
      student_parallel: studentParallel,
      jornada,
      dece_professional_name: deceProfessionalName,
      dece_professional_id_num: deceProfessionalIdNum,
      tutor_authority_name: tutorAuthorityName,
      tutor_authority_role: tutorAuthorityRole,
      conflict_type: conflictType,
      detected_difficulty: detectedDifficulty,
      legal_framework: legalFramework,
      commitments_representative: commitmentsRepresentative,
      agreements_and_commitments: agreementsAndCommitments,
      commitments_dece: commitmentsDece,
      commitments_student: commitmentsStudent,
      observations,
      updated_by: session.user.id,
    });

    // Limpiar caché de imagen previa
    try {
      const cacheDir = path.join(process.cwd(), "public", "actas_cache");
      if (fs.existsSync(cacheDir)) {
        const files = fs.readdirSync(cacheDir);
        files.filter((f: string) => f.startsWith(`acta_${actId}_`)).forEach((f: string) => {
          try { fs.unlinkSync(path.join(cacheDir, f)); } catch {}
        });
      }
    } catch {}

    logAudit({
      userId: session.user.id,
      institutionId,
      action: "UPDATE",
      entityType: "case_corresponsibility_acts",
      entityId: actId,
      details: `Acta de corresponsabilidad actualizada para estudiante ${studentName}`,
    });

    revalidatePath(`/casos/${caseId}`);
    revalidatePath(`/casos/${caseId}/corresponsabilidad/${actId}`);
  } catch (err: any) {
    return { error: err?.message || "Ocurrió un error al actualizar el acta." };
  }
  redirect(`/casos/${caseId}/corresponsabilidad/${actId}`);
}

export async function deleteCorresponsibilityAct(actId: string, caseId: string) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  requireOwnedCase(caseId, institutionId);

  const act = db
    .prepare("SELECT representative_name FROM case_corresponsibility_acts WHERE id = ? AND case_file_id = ? AND institution_id = ?")
    .get(actId, caseId, institutionId) as { representative_name: string } | undefined;

  db.prepare(
    "DELETE FROM case_corresponsibility_acts WHERE id = ? AND case_file_id = ? AND institution_id = ?"
  ).run(actId, caseId, institutionId);

  if (act?.representative_name) {
    db.prepare(
      "DELETE FROM case_actions WHERE case_file_id = ? AND type = 'Acta de compromiso y corresponsabilidad' AND description LIKE ?"
    ).run(caseId, `%${act.representative_name}%`);
  }

  logAudit({
    userId: session.user.id,
    institutionId,
    action: "DELETE",
    entityType: "case_corresponsibility_acts",
    entityId: actId,
    details: `Acta de corresponsabilidad eliminada del caso ${caseId}`,
  });

  revalidatePath(`/casos/${caseId}`);
}

// ============================================================================
// FICHAS DE NOTIFICACIÓN DE ALERTA DECE (FORMATO CANÓNICO)
// ============================================================================

export async function createAlertNotification(
  caseId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  let createdAlertId = "";
  try {
    requireOwnedCase(caseId, institutionId);

    const studentName = str(formData, "student_name");
    const studentGrade = str(formData, "student_grade") || "No especificado";
    const notificadorNombre = str(formData, "notificador_nombre") || session.user.name || "Profesional DECE";
    const fechaEntregaDece = str(formData, "fecha_entrega_dece") || new Date().toISOString().slice(0, 10);

    if (!studentName) return { error: "El nombre del estudiante es obligatorio." };

    const id = randomUUID();
    createdAlertId = id;

    db.prepare(
      `INSERT INTO case_alert_notifications (
        id, case_file_id, institution_id,
        student_name, student_id_num, student_birth_date, student_age,
        representative_name, representative_address, representative_phone,
        student_grade, student_parallel, jornada, docente_tutor,
        alerta_inestabilidad_emocional, alerta_hijo_ppl, alerta_trabajo_infantil,
        alerta_riesgo_psicosocial, alerta_movilidad_humana, alerta_conflictos_intrafamiliares,
        alerta_autolesiones_ideacion, alerta_hostigamiento_academico, alerta_embarazo_maternidad_paternidad,
        alerta_posible_dependencia_sustancias, alerta_vulneracion_derechos, alerta_otros,
        especificar_alerta, lugar_fecha_hechos,
        intervencion_pregunta_1, intervencion_pregunta_2, intervencion_pregunta_3,
        intervencion_pregunta_4, intervencion_pregunta_5,
        notificador_nombre, notificador_cargo, notificador_contacto, fecha_entrega_dece,
        created_by
      ) VALUES (
        @id, @case_file_id, @institution_id,
        @student_name, @student_id_num, @student_birth_date, @student_age,
        @representative_name, @representative_address, @representative_phone,
        @student_grade, @student_parallel, @jornada, @docente_tutor,
        @alerta_inestabilidad_emocional, @alerta_hijo_ppl, @alerta_trabajo_infantil,
        @alerta_riesgo_psicosocial, @alerta_movilidad_humana, @alerta_conflictos_intrafamiliares,
        @alerta_autolesiones_ideacion, @alerta_hostigamiento_academico, @alerta_embarazo_maternidad_paternidad,
        @alerta_posible_dependencia_sustancias, @alerta_vulneracion_derechos, @alerta_otros,
        @especificar_alerta, @lugar_fecha_hechos,
        @intervencion_pregunta_1, @intervencion_pregunta_2, @intervencion_pregunta_3,
        @intervencion_pregunta_4, @intervencion_pregunta_5,
        @notificador_nombre, @notificador_cargo, @notificador_contacto, @fecha_entrega_dece,
        @created_by
      )`
    ).run({
      id,
      case_file_id: caseId,
      institution_id: institutionId,
      student_name: studentName,
      student_id_num: str(formData, "student_id_num"),
      student_birth_date: str(formData, "student_birth_date"),
      student_age: str(formData, "student_age"),
      representative_name: str(formData, "representative_name"),
      representative_address: str(formData, "representative_address"),
      representative_phone: str(formData, "representative_phone"),
      student_grade: studentGrade,
      student_parallel: str(formData, "student_parallel"),
      jornada: str(formData, "jornada") || "MATUTINA",
      docente_tutor: str(formData, "docente_tutor"),

      alerta_inestabilidad_emocional: formData.get("alerta_inestabilidad_emocional") ? 1 : 0,
      alerta_hijo_ppl: formData.get("alerta_hijo_ppl") ? 1 : 0,
      alerta_trabajo_infantil: formData.get("alerta_trabajo_infantil") ? 1 : 0,
      alerta_riesgo_psicosocial: formData.get("alerta_riesgo_psicosocial") ? 1 : 0,
      alerta_movilidad_humana: formData.get("alerta_movilidad_humana") ? 1 : 0,
      alerta_conflictos_intrafamiliares: formData.get("alerta_conflictos_intrafamiliares") ? 1 : 0,
      alerta_autolesiones_ideacion: formData.get("alerta_autolesiones_ideacion") ? 1 : 0,
      alerta_hostigamiento_academico: formData.get("alerta_hostigamiento_academico") ? 1 : 0,
      alerta_embarazo_maternidad_paternidad: formData.get("alerta_embarazo_maternidad_paternidad") ? 1 : 0,
      alerta_posible_dependencia_sustancias: formData.get("alerta_posible_dependencia_sustancias") ? 1 : 0,
      alerta_vulneracion_derechos: formData.get("alerta_vulneracion_derechos") ? 1 : 0,
      alerta_otros: formData.get("alerta_otros") ? 1 : 0,
      especificar_alerta: str(formData, "especificar_alerta"),

      lugar_fecha_hechos: str(formData, "lugar_fecha_hechos"),

      intervencion_pregunta_1: str(formData, "intervencion_pregunta_1"),
      intervencion_pregunta_2: str(formData, "intervencion_pregunta_2"),
      intervencion_pregunta_3: str(formData, "intervencion_pregunta_3"),
      intervencion_pregunta_4: str(formData, "intervencion_pregunta_4"),
      intervencion_pregunta_5: str(formData, "intervencion_pregunta_5"),

      notificador_nombre: notificadorNombre,
      notificador_cargo: str(formData, "notificador_cargo") || "Analista DECE",
      notificador_contacto: str(formData, "notificador_contacto"),
      fecha_entrega_dece: fechaEntregaDece,
      created_by: session.user.id,
    });

    // Registrar en la Bitácora de acciones del caso
    db.prepare(
      `INSERT INTO case_actions (id, case_file_id, author_id, date, type, description, intervention_type, observations)
       VALUES (?, ?, ?, ?, 'Ficha de Notificación de Alerta', ?, 'Detección y Notificación de Alerta', ?)`
    ).run(
      randomUUID(),
      caseId,
      session.user.id,
      fechaEntregaDece,
      `Ficha de Notificación de Alerta generada para estudiante ${studentName}. Notificada por: ${notificadorNombre}.`,
      str(formData, "especificar_alerta") || null
    );

    logAudit({
      userId: session.user.id,
      institutionId,
      action: "CREATE",
      entityType: "case_alert_notifications",
      entityId: id,
      details: `Ficha de notificación de alerta creada para estudiante ${studentName}`,
    });

    revalidatePath(`/casos/${caseId}`);
    revalidatePath(`/casos/${caseId}/alertas/${id}`);
  } catch (err: any) {
    return { error: err?.message || "Ocurrió un error al guardar la ficha de notificación de alerta." };
  }
  redirect(`/casos/${caseId}/alertas/${createdAlertId}`);
}

export async function updateAlertNotification(
  alertId: string,
  caseId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  try {
    requireOwnedCase(caseId, institutionId);

    const studentName = str(formData, "student_name");
    const studentGrade = str(formData, "student_grade") || "No especificado";
    const notificadorNombre = str(formData, "notificador_nombre") || session.user.name || "Profesional DECE";
    const fechaEntregaDece = str(formData, "fecha_entrega_dece") || new Date().toISOString().slice(0, 10);

    if (!studentName) return { error: "El nombre del estudiante es obligatorio." };

    db.prepare(
      `UPDATE case_alert_notifications SET
        student_name = @student_name,
        student_id_num = @student_id_num,
        student_birth_date = @student_birth_date,
        student_age = @student_age,
        representative_name = @representative_name,
        representative_address = @representative_address,
        representative_phone = @representative_phone,
        student_grade = @student_grade,
        student_parallel = @student_parallel,
        jornada = @jornada,
        docente_tutor = @docente_tutor,
        alerta_inestabilidad_emocional = @alerta_inestabilidad_emocional,
        alerta_hijo_ppl = @alerta_hijo_ppl,
        alerta_trabajo_infantil = @alerta_trabajo_infantil,
        alerta_riesgo_psicosocial = @alerta_riesgo_psicosocial,
        alerta_movilidad_humana = @alerta_movilidad_humana,
        alerta_conflictos_intrafamiliares = @alerta_conflictos_intrafamiliares,
        alerta_autolesiones_ideacion = @alerta_autolesiones_ideacion,
        alerta_hostigamiento_academico = @alerta_hostigamiento_academico,
        alerta_embarazo_maternidad_paternidad = @alerta_embarazo_maternidad_paternidad,
        alerta_posible_dependencia_sustancias = @alerta_posible_dependencia_sustancias,
        alerta_vulneracion_derechos = @alerta_vulneracion_derechos,
        alerta_otros = @alerta_otros,
        especificar_alerta = @especificar_alerta,
        lugar_fecha_hechos = @lugar_fecha_hechos,
        intervencion_pregunta_1 = @intervencion_pregunta_1,
        intervencion_pregunta_2 = @intervencion_pregunta_2,
        intervencion_pregunta_3 = @intervencion_pregunta_3,
        intervencion_pregunta_4 = @intervencion_pregunta_4,
        intervencion_pregunta_5 = @intervencion_pregunta_5,
        notificador_nombre = @notificador_nombre,
        notificador_cargo = @notificador_cargo,
        notificador_contacto = @notificador_contacto,
        fecha_entrega_dece = @fecha_entrega_dece,
        updated_at = datetime('now')
      WHERE id = @id AND case_file_id = @case_file_id AND institution_id = @institution_id`
    ).run({
      id: alertId,
      case_file_id: caseId,
      institution_id: institutionId,
      student_name: studentName,
      student_id_num: str(formData, "student_id_num"),
      student_birth_date: str(formData, "student_birth_date"),
      student_age: str(formData, "student_age"),
      representative_name: str(formData, "representative_name"),
      representative_address: str(formData, "representative_address"),
      representative_phone: str(formData, "representative_phone"),
      student_grade: studentGrade,
      student_parallel: str(formData, "student_parallel"),
      jornada: str(formData, "jornada") || "MATUTINA",
      docente_tutor: str(formData, "docente_tutor"),

      alerta_inestabilidad_emocional: formData.get("alerta_inestabilidad_emocional") ? 1 : 0,
      alerta_hijo_ppl: formData.get("alerta_hijo_ppl") ? 1 : 0,
      alerta_trabajo_infantil: formData.get("alerta_trabajo_infantil") ? 1 : 0,
      alerta_riesgo_psicosocial: formData.get("alerta_riesgo_psicosocial") ? 1 : 0,
      alerta_movilidad_humana: formData.get("alerta_movilidad_humana") ? 1 : 0,
      alerta_conflictos_intrafamiliares: formData.get("alerta_conflictos_intrafamiliares") ? 1 : 0,
      alerta_autolesiones_ideacion: formData.get("alerta_autolesiones_ideacion") ? 1 : 0,
      alerta_hostigamiento_academico: formData.get("alerta_hostigamiento_academico") ? 1 : 0,
      alerta_embarazo_maternidad_paternidad: formData.get("alerta_embarazo_maternidad_paternidad") ? 1 : 0,
      alerta_posible_dependencia_sustancias: formData.get("alerta_posible_dependencia_sustancias") ? 1 : 0,
      alerta_vulneracion_derechos: formData.get("alerta_vulneracion_derechos") ? 1 : 0,
      alerta_otros: formData.get("alerta_otros") ? 1 : 0,
      especificar_alerta: str(formData, "especificar_alerta"),

      lugar_fecha_hechos: str(formData, "lugar_fecha_hechos"),

      intervencion_pregunta_1: str(formData, "intervencion_pregunta_1"),
      intervencion_pregunta_2: str(formData, "intervencion_pregunta_2"),
      intervencion_pregunta_3: str(formData, "intervencion_pregunta_3"),
      intervencion_pregunta_4: str(formData, "intervencion_pregunta_4"),
      intervencion_pregunta_5: str(formData, "intervencion_pregunta_5"),

      notificador_nombre: notificadorNombre,
      notificador_cargo: str(formData, "notificador_cargo") || "Analista DECE",
      notificador_contacto: str(formData, "notificador_contacto"),
      fecha_entrega_dece: fechaEntregaDece,
    });

    // Limpiar caché de vista previa en disco para que se regenere al instante
    try {
      const cacheDir = path.join(process.cwd(), "public", "alertas_cache");
      if (fs.existsSync(cacheDir)) {
        const files = fs.readdirSync(cacheDir);
        files.filter((f: string) => f.startsWith(`alerta_${alertId}_`)).forEach((f: string) => {
          try { fs.unlinkSync(path.join(cacheDir, f)); } catch {}
        });
      }
    } catch {}

    logAudit({
      userId: session.user.id,
      institutionId,
      action: "UPDATE",
      entityType: "case_alert_notifications",
      entityId: alertId,
      details: `Ficha de notificación de alerta actualizada para estudiante ${studentName}`,
    });

    revalidatePath(`/casos/${caseId}`);
    revalidatePath(`/casos/${caseId}/alertas/${alertId}`);
  } catch (err: any) {
    return { error: err?.message || "Ocurrió un error al actualizar la ficha de alerta." };
  }
  redirect(`/casos/${caseId}/alertas/${alertId}`);
}

/**
 * ============================================================================
 * INFORMES TÉCNICOS DE CIERRE DE CASO (VIOLENCIA SEXUAL)
 * Finalización de año lectivo, Cierre por Graduación o Traslado
 * ============================================================================
 */

export async function createCaseClosureReport(caseId: string, _prev: ActionState, formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  requireOwnedCase(caseId, institutionId);

  const reportId = crypto.randomUUID();
  const activeYear = db
    .prepare("SELECT * FROM school_years WHERE institution_id = ? AND is_active = 1")
    .get(institutionId) as any;

  const schoolYearText = str(formData, "school_year_text") || activeYear?.name || "2024 - 2025";
  const reportDate = str(formData, "report_date") || new Date().toISOString().split("T")[0];
  const reportNumber = str(formData, "report_number") || `IT-DECE-${Date.now().toString().slice(-4)}`;
  const closureType = (str(formData, "closure_type") || "FINALIZACION_ANO_LECTIVO") as any;

  const deceName = str(formData, "dece_name") || session.user.name || "Profesional DECE";
  const deceRole = str(formData, "dece_role") || "PROFESIONAL DECE INSTITUCIONAL";
  const decePhoneExt = str(formData, "dece_phone_ext") || null;
  const deceEmail = str(formData, "dece_email") || session.user.email || null;

  const authorityName = str(formData, "authority_name") || "Autoridad Institucional";
  const authorityRole = str(formData, "authority_role") || "AUTORIDAD INSTITUCIONAL";
  const authorityPhoneExt = str(formData, "authority_phone_ext") || null;
  const authorityEmail = str(formData, "authority_email") || null;

  const topic = str(formData, "topic") || "INFORME TÉCNICO DE CIERRE DE CASO";
  const closureReasons = str(formData, "closure_reasons") || "";
  const legalFramework = str(formData, "legal_framework") || "";
  const scope = str(formData, "scope") || "De Analista DECE institucional a Rectorado de la UE";
  const objective = str(formData, "objective") || "";

  const studentName = str(formData, "student_name") || "";
  const studentIdNum = str(formData, "student_id_num") || null;
  const studentAge = int(formData, "student_age") || null;
  const studentBirthDate = str(formData, "student_birth_date") || null;
  const studentGrade = str(formData, "student_grade") || "";
  const studentParallel = str(formData, "student_parallel") || null;
  const studentSection = str(formData, "student_section") || "MATUTINA";
  const studentAddress = str(formData, "student_address") || null;
  const studentAddressRef = str(formData, "student_address_ref") || null;
  const repName = str(formData, "rep_name") || null;
  const repIdNum = str(formData, "rep_id_num") || null;
  const repPhone = str(formData, "rep_phone") || null;

  const activitiesCounseling = str(formData, "activities_counseling") || null;
  const activitiesPrevention = str(formData, "activities_prevention") || null;
  const activitiesPsychosocial = str(formData, "activities_psychosocial") || null;
  const activitiesInclusion = str(formData, "activities_inclusion") || null;
  const bimonthlySummaryJson = str(formData, "bimonthly_summary_json") || "[]";

  const methodology = str(formData, "methodology") || "";
  const conclusions = str(formData, "conclusions") || "";
  const recommendations = str(formData, "recommendations") || "";

  const elaboratedByName = str(formData, "elaborated_by_name") || deceName;
  const elaboratedByRole = str(formData, "elaborated_by_role") || "ANALISTA DECE";
  const elaboratedDate = str(formData, "elaborated_date") || reportDate;

  const reviewedByName = str(formData, "reviewed_by_name") || "Coordinadora DECE";
  const reviewedByRole = str(formData, "reviewed_by_role") || "COORDINADORA DECE INSTITUCIONAL";
  const reviewedDate = str(formData, "reviewed_date") || reportDate;

  const approvedByName = str(formData, "approved_by_name") || authorityName;
  const approvedByRole = str(formData, "approved_by_role") || "RECTOR (E) DE LA UNIDAD EDUCATIVA";
  const approvedDate = str(formData, "approved_date") || reportDate;

  const annexesNotes = str(formData, "annexes_notes") || null;

  try {
    db.prepare(
      `INSERT INTO case_closure_reports (
        id, case_file_id, institution_id, school_year_id, school_year_text,
        report_date, report_number, closure_type,
        dece_user_id, dece_name, dece_role, dece_phone_ext, dece_email,
        authority_name, authority_role, authority_phone_ext, authority_email,
        topic, closure_reasons, legal_framework, scope, objective,
        student_name, student_id_num, student_age, student_birth_date,
        student_grade, student_parallel, student_section, student_address, student_address_ref,
        rep_name, rep_id_num, rep_phone,
        activities_counseling, activities_prevention, activities_psychosocial, activities_inclusion,
        bimonthly_summary_json, methodology, conclusions, recommendations,
        elaborated_by_name, elaborated_by_role, elaborated_date,
        reviewed_by_name, reviewed_by_role, reviewed_date,
        approved_by_name, approved_by_role, approved_date,
        annexes_notes, created_by
      ) VALUES (
        @id, @case_file_id, @institution_id, @school_year_id, @school_year_text,
        @report_date, @report_number, @closure_type,
        @dece_user_id, @dece_name, @dece_role, @dece_phone_ext, @dece_email,
        @authority_name, @authority_role, @authority_phone_ext, @authority_email,
        @topic, @closure_reasons, @legal_framework, @scope, @objective,
        @student_name, @student_id_num, @student_age, @student_birth_date,
        @student_grade, @student_parallel, @student_section, @student_address, @student_address_ref,
        @rep_name, @rep_id_num, @rep_phone,
        @activities_counseling, @activities_prevention, @activities_psychosocial, @activities_inclusion,
        @bimonthly_summary_json, @methodology, @conclusions, @recommendations,
        @elaborated_by_name, @elaborated_by_role, @elaborated_date,
        @reviewed_by_name, @reviewed_by_role, @reviewed_date,
        @approved_by_name, @approved_by_role, @approved_date,
        @annexes_notes, @created_by
      )`
    ).run({
      id: reportId,
      case_file_id: caseId,
      institution_id: institutionId,
      school_year_id: activeYear?.id || null,
      school_year_text: schoolYearText,
      report_date: reportDate,
      report_number: reportNumber,
      closure_type: closureType,
      dece_user_id: session.user.id,
      dece_name: deceName,
      dece_role: deceRole,
      dece_phone_ext: decePhoneExt,
      dece_email: deceEmail,
      authority_name: authorityName,
      authority_role: authorityRole,
      authority_phone_ext: authorityPhoneExt,
      authority_email: authorityEmail,
      topic,
      closure_reasons: closureReasons,
      legal_framework: legalFramework,
      scope,
      objective,
      student_name: studentName,
      student_id_num: studentIdNum,
      student_age: studentAge,
      student_birth_date: studentBirthDate,
      student_grade: studentGrade,
      student_parallel: studentParallel,
      student_section: studentSection,
      student_address: studentAddress,
      student_address_ref: studentAddressRef,
      rep_name: repName,
      rep_id_num: repIdNum,
      rep_phone: repPhone,
      activities_counseling: activitiesCounseling,
      activities_prevention: activitiesPrevention,
      activities_psychosocial: activitiesPsychosocial,
      activities_inclusion: activitiesInclusion,
      bimonthly_summary_json: bimonthlySummaryJson,
      methodology,
      conclusions,
      recommendations,
      elaborated_by_name: elaboratedByName,
      elaborated_by_role: elaboratedByRole,
      elaborated_date: elaboratedDate,
      reviewed_by_name: reviewedByName,
      reviewed_by_role: reviewedByRole,
      reviewed_date: reviewedDate,
      approved_by_name: approvedByName,
      approved_by_role: approvedByRole,
      approved_date: approvedDate,
      annexes_notes: annexesNotes,
      created_by: session.user.id,
    });

    logAudit({
      userId: session.user.id,
      action: "CREAR",
      entityType: "CaseClosureReport",
      entityId: reportId,
      details: `Informe de Cierre ${reportNumber} - Caso ${caseId}`,
      institutionId,
    });
  } catch (err: unknown) {
    return { error: (err as Error).message };
  }

  revalidatePath(`/casos/${caseId}`);
  redirect(`/casos/${caseId}`);
}

export async function updateCaseClosureReport(reportId: string, caseId: string, _prev: ActionState, formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  requireOwnedCase(caseId, institutionId);

  const schoolYearText = str(formData, "school_year_text") || "2024 - 2025";
  const reportDate = str(formData, "report_date") || new Date().toISOString().split("T")[0];
  const reportNumber = str(formData, "report_number") || "";
  const closureType = (str(formData, "closure_type") || "FINALIZACION_ANO_LECTIVO") as any;

  const deceName = str(formData, "dece_name") || "Profesional DECE";
  const deceRole = str(formData, "dece_role") || "PROFESIONAL DECE INSTITUCIONAL";
  const decePhoneExt = str(formData, "dece_phone_ext") || null;
  const deceEmail = str(formData, "dece_email") || null;

  const authorityName = str(formData, "authority_name") || "Autoridad Institucional";
  const authorityRole = str(formData, "authority_role") || "AUTORIDAD INSTITUCIONAL";
  const authorityPhoneExt = str(formData, "authority_phone_ext") || null;
  const authorityEmail = str(formData, "authority_email") || null;

  const topic = str(formData, "topic") || "";
  const closureReasons = str(formData, "closure_reasons") || "";
  const legalFramework = str(formData, "legal_framework") || "";
  const scope = str(formData, "scope") || "";
  const objective = str(formData, "objective") || "";

  const studentName = str(formData, "student_name") || "";
  const studentIdNum = str(formData, "student_id_num") || null;
  const studentAge = int(formData, "student_age") || null;
  const studentBirthDate = str(formData, "student_birth_date") || null;
  const studentGrade = str(formData, "student_grade") || "";
  const studentParallel = str(formData, "student_parallel") || null;
  const studentSection = str(formData, "student_section") || "MATUTINA";
  const studentAddress = str(formData, "student_address") || null;
  const studentAddressRef = str(formData, "student_address_ref") || null;
  const repName = str(formData, "rep_name") || null;
  const repIdNum = str(formData, "rep_id_num") || null;
  const repPhone = str(formData, "rep_phone") || null;

  const activitiesCounseling = str(formData, "activities_counseling") || null;
  const activitiesPrevention = str(formData, "activities_prevention") || null;
  const activitiesPsychosocial = str(formData, "activities_psychosocial") || null;
  const activitiesInclusion = str(formData, "activities_inclusion") || null;
  const bimonthlySummaryJson = str(formData, "bimonthly_summary_json") || "[]";

  const methodology = str(formData, "methodology") || "";
  const conclusions = str(formData, "conclusions") || "";
  const recommendations = str(formData, "recommendations") || "";

  const elaboratedByName = str(formData, "elaborated_by_name") || deceName;
  const elaboratedByRole = str(formData, "elaborated_by_role") || "ANALISTA DECE";
  const elaboratedDate = str(formData, "elaborated_date") || reportDate;

  const reviewedByName = str(formData, "reviewed_by_name") || "Coordinadora DECE";
  const reviewedByRole = str(formData, "reviewed_by_role") || "COORDINADORA DECE INSTITUCIONAL";
  const reviewedDate = str(formData, "reviewed_date") || reportDate;

  const approvedByName = str(formData, "approved_by_name") || authorityName;
  const approvedByRole = str(formData, "approved_by_role") || "RECTOR (E) DE LA UNIDAD EDUCATIVA";
  const approvedDate = str(formData, "approved_date") || reportDate;

  const annexesNotes = str(formData, "annexes_notes") || null;

  try {
    db.prepare(
      `UPDATE case_closure_reports SET
        school_year_text = @school_year_text,
        report_date = @report_date,
        report_number = @report_number,
        closure_type = @closure_type,
        dece_name = @dece_name,
        dece_role = @dece_role,
        dece_phone_ext = @dece_phone_ext,
        dece_email = @dece_email,
        authority_name = @authority_name,
        authority_role = @authority_role,
        authority_phone_ext = @authority_phone_ext,
        authority_email = @authority_email,
        topic = @topic,
        closure_reasons = @closure_reasons,
        legal_framework = @legal_framework,
        scope = @scope,
        objective = @objective,
        student_name = @student_name,
        student_id_num = @student_id_num,
        student_age = @student_age,
        student_birth_date = @student_birth_date,
        student_grade = @student_grade,
        student_parallel = @student_parallel,
        student_section = @student_section,
        student_address = @student_address,
        student_address_ref = @student_address_ref,
        rep_name = @rep_name,
        rep_id_num = @rep_id_num,
        rep_phone = @rep_phone,
        activities_counseling = @activities_counseling,
        activities_prevention = @activities_prevention,
        activities_psychosocial = @activities_psychosocial,
        activities_inclusion = @activities_inclusion,
        bimonthly_summary_json = @bimonthly_summary_json,
        methodology = @methodology,
        conclusions = @conclusions,
        recommendations = @recommendations,
        elaborated_by_name = @elaborated_by_name,
        elaborated_by_role = @elaborated_by_role,
        elaborated_date = @elaborated_date,
        reviewed_by_name = @reviewed_by_name,
        reviewed_by_role = @reviewed_by_role,
        reviewed_date = @reviewed_date,
        approved_by_name = @approved_by_name,
        approved_by_role = @approved_by_role,
        approved_date = @approved_date,
        annexes_notes = @annexes_notes,
        updated_at = datetime('now')
      WHERE id = @id AND institution_id = @institution_id AND case_file_id = @case_file_id`
    ).run({
      id: reportId,
      case_file_id: caseId,
      institution_id: institutionId,
      school_year_text: schoolYearText,
      report_date: reportDate,
      report_number: reportNumber,
      closure_type: closureType,
      dece_name: deceName,
      dece_role: deceRole,
      dece_phone_ext: decePhoneExt,
      dece_email: deceEmail,
      authority_name: authorityName,
      authority_role: authorityRole,
      authority_phone_ext: authorityPhoneExt,
      authority_email: authorityEmail,
      topic,
      closure_reasons: closureReasons,
      legal_framework: legalFramework,
      scope,
      objective,
      student_name: studentName,
      student_id_num: studentIdNum,
      student_age: studentAge,
      student_birth_date: studentBirthDate,
      student_grade: studentGrade,
      student_parallel: studentParallel,
      student_section: studentSection,
      student_address: studentAddress,
      student_address_ref: studentAddressRef,
      rep_name: repName,
      rep_id_num: repIdNum,
      rep_phone: repPhone,
      activities_counseling: activitiesCounseling,
      activities_prevention: activitiesPrevention,
      activities_psychosocial: activitiesPsychosocial,
      activities_inclusion: activitiesInclusion,
      bimonthly_summary_json: bimonthlySummaryJson,
      methodology,
      conclusions,
      recommendations,
      elaborated_by_name: elaboratedByName,
      elaborated_by_role: elaboratedByRole,
      elaborated_date: elaboratedDate,
      reviewed_by_name: reviewedByName,
      reviewed_by_role: reviewedByRole,
      reviewed_date: reviewedDate,
      approved_by_name: approvedByName,
      approved_by_role: approvedByRole,
      approved_date: approvedDate,
      annexes_notes: annexesNotes,
    });

    logAudit({
      userId: session.user.id,
      action: "EDITAR",
      entityType: "CaseClosureReport",
      entityId: reportId,
      details: `Informe de Cierre ${reportNumber} - Caso ${caseId}`,
      institutionId,
    });
  } catch (err: unknown) {
    return { error: (err as Error).message };
  }

  revalidatePath(`/casos/${caseId}`);
  redirect(`/casos/${caseId}`);
}

export async function deleteCaseClosureReport(reportId: string, caseId: string) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  requireOwnedCase(caseId, institutionId);

  db.prepare(`DELETE FROM case_closure_reports WHERE id = ? AND institution_id = ? AND case_file_id = ?`).run(
    reportId,
    institutionId,
    caseId
  );

  logAudit({
    userId: session.user.id,
    action: "ELIMINAR",
    entityType: "CaseClosureReport",
    entityId: reportId,
    details: `Informe de Cierre eliminado - Caso ${caseId}`,
    institutionId,
  });

  revalidatePath(`/casos/${caseId}`);
}



/** Actualiza una entrevista semiestructurada. */
export async function updateInterview(caseId: string, interviewId: string, formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  requireOwnedCase(caseId, institutionId);

  const emotionalState = formData.getAll("emotional_state").filter((v): v is string => typeof v === "string");
  const socialRelations = formData.getAll("social_relations").filter((v): v is string => typeof v === "string");
  const fullName = str(formData, "full_name");

  db.prepare(
    `UPDATE case_interviews SET
      interviewee_full_name = @full_name,
      interviewee_cedula = @cedula,
      course = @course,
      age = @age,
      application_date = @application_date,
      family_relation = @family_relation,
      emotional_state = @emotional_state,
      social_relations = @social_relations,
      bullying_history = @bullying_history,
      academic_history = @academic_history,
      summary = @summary,
      recommendations = @recommendations,
      commitment = @commitment,
      representative_name = @representative_name,
      updated_at = datetime('now')
    WHERE id = @id AND case_file_id = @case_file_id AND institution_id = @institution_id`
  ).run({
    id: interviewId,
    case_file_id: caseId,
    institution_id: institutionId,
    full_name: fullName,
    cedula: str(formData, "cedula"),
    course: str(formData, "course"),
    age: str(formData, "age"),
    application_date: str(formData, "application_date") || new Date().toISOString().slice(0, 10),
    family_relation: str(formData, "family_relation"),
    emotional_state: emotionalState.length ? emotionalState.join(", ") : null,
    social_relations: socialRelations.length ? socialRelations.join(", ") : null,
    bullying_history: formData.get("bullying_history") ? 1 : 0,
    academic_history: str(formData, "academic_history"),
    summary: str(formData, "summary"),
    recommendations: str(formData, "recommendations"),
    commitment: str(formData, "commitment"),
    representative_name: str(formData, "representative_name"),
  });

  logAudit({ userId: session.user.id, action: "EDITAR", entityType: "CaseInterview", entityId: interviewId, details: caseId, institutionId });
  revalidatePath(`/casos/${caseId}`);
  redirect(`/casos/${caseId}/entrevistas/${interviewId}/imprimir`);
}

/** Actualiza un Plan de Atención Psicosocial. */
export async function updateCarePlan(
  caseId: string,
  planId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  try {
    requireOwnedCase(caseId, institutionId);

    const diagnosisSummary = str(formData, "diagnosis_summary");
    if (!diagnosisSummary) return { error: "El resumen del diagnóstico situacional es obligatorio." };

    const interventionTypes = JSON.stringify(formData.getAll("intervention_types").filter((v): v is string => typeof v === "string"));

    const accionesRaw = formData.getAll("accion").filter((v): v is string => typeof v === "string");
    const profesionalesRaw = formData.getAll("accion_profesional").filter((v): v is string => typeof v === "string");
    const tiemposRaw = formData.getAll("accion_tiempo").filter((v): v is string => typeof v === "string");
    const observacionesRaw = formData.getAll("accion_observaciones").filter((v): v is string => typeof v === "string");
    const actions = accionesRaw
      .map((accion, i) => ({
        accion: accion.trim(),
        profesional: (profesionalesRaw[i] || "").trim(),
        tiempo: (tiemposRaw[i] || "").trim(),
        observaciones: (observacionesRaw[i] || "").trim(),
      }))
      .filter((a) => a.accion.length > 0);

    db.prepare(
      `UPDATE case_care_plans SET
        plan_date = @plan_date,
        jornada = @jornada,
        tutor_name = @tutor_name,
        diagnosis_summary = @diagnosis_summary,
        intervention_types = @intervention_types,
        actions = @actions,
        updated_at = datetime('now')
      WHERE id = @id AND case_file_id = @case_file_id AND institution_id = @institution_id`
    ).run({
      id: planId,
      case_file_id: caseId,
      institution_id: institutionId,
      plan_date: str(formData, "plan_date") || new Date().toISOString().slice(0, 10),
      jornada: str(formData, "jornada"),
      tutor_name: str(formData, "tutor_name"),
      diagnosis_summary: diagnosisSummary,
      intervention_types: interventionTypes,
      actions: JSON.stringify(actions),
    });

    logAudit({ userId: session.user.id, action: "EDITAR", entityType: "CaseCarePlan", entityId: planId, details: caseId, institutionId });
    revalidatePath(`/casos/${caseId}`);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Ocurrió un error inesperado al actualizar el plan de atención." };
  }

  redirect(`/casos/${caseId}/atencion/${planId}/imprimir`);
}

/** Actualiza un Acta de Socialización de Vulnerabilidad. */
export async function updateSocializationAct(
  caseId: string,
  actId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  try {
    requireOwnedCase(caseId, institutionId);

    const vulnerabilityType = str(formData, "vulnerability_type");
    if (!vulnerabilityType) return { error: "El tipo de vulnerabilidad es obligatorio." };

    const agreements = getAllStr(formData, "agreement").map((a) => a.trim()).filter(Boolean);

    const subjectNames = getAllStr(formData, "teacher_subject");
    const teacherNames = getAllStr(formData, "teacher_name");
    const maxTeacherRows = Math.max(subjectNames.length, teacherNames.length);
    const teacherSignatures = Array.from({ length: maxTeacherRows }).map((_, i) => ({
      asignatura: (subjectNames[i] || "").trim(),
      docente: (teacherNames[i] || "").trim(),
    }));

    db.prepare(
      `UPDATE socialization_acts SET
        act_date = @act_date,
        act_place = @act_place,
        vulnerability_type = @vulnerability_type,
        curricular_adaptation_grade = @curricular_adaptation_grade,
        agreements = @agreements,
        normative_text = @normative_text,
        psychosocial_strategies = @psychosocial_strategies,
        teacher_signatures = @teacher_signatures,
        prepared_by_name = @prepared_by_name,
        approved_by_name = @approved_by_name,
        received_by_name = @received_by_name,
        received_by_role = @received_by_role,
        updated_at = datetime('now')
      WHERE id = @id AND case_file_id = @case_file_id AND institution_id = @institution_id`
    ).run({
      id: actId,
      case_file_id: caseId,
      institution_id: institutionId,
      act_date: str(formData, "act_date") || new Date().toISOString().slice(0, 10),
      act_place: str(formData, "act_place"),
      vulnerability_type: vulnerabilityType,
      curricular_adaptation_grade: str(formData, "curricular_adaptation_grade"),
      agreements: JSON.stringify(agreements),
      normative_text: str(formData, "normative_text"),
      psychosocial_strategies: str(formData, "psychosocial_strategies"),
      teacher_signatures: JSON.stringify(teacherSignatures),
      prepared_by_name: str(formData, "prepared_by_name"),
      approved_by_name: str(formData, "approved_by_name"),
      received_by_name: str(formData, "received_by_name"),
      received_by_role: str(formData, "received_by_role") || "Tutor del curso",
    });

    logAudit({ userId: session.user.id, action: "EDITAR", entityType: "SocializationAct", entityId: actId, details: caseId, institutionId });
    revalidatePath(`/casos/${caseId}`);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Ocurrió un error inesperado al actualizar el acta." };
  }

  redirect(`/casos/${caseId}/socializacion/${actId}/imprimir`);
}

/** Actualiza un Reporte del Hecho de Violencia. */
export async function updateViolenceReport(
  caseId: string,
  reportId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  try {
    requireOwnedCase(caseId, institutionId);

    const violenceTypes = JSON.stringify(getAllStr(formData, "violence_types"));
    const violenceModalities = JSON.stringify(getAllStr(formData, "violence_modalities"));

    db.prepare(
      `UPDATE violence_reports SET
        report_number = @report_number,
        report_date = @report_date,
        dece_professional_name = @dece_professional_name,
        representative_relationship = @representative_relationship,
        perpetrator_name = @perpetrator_name,
        perpetrator_birth_date = @perpetrator_birth_date,
        perpetrator_age = @perpetrator_age,
        perpetrator_document_id = @perpetrator_document_id,
        perpetrator_gender = @perpetrator_gender,
        perpetrator_relationship = @perpetrator_relationship,
        informant_name = @informant_name,
        informant_id_number = @informant_id_number,
        informant_role = @informant_role,
        incident_date = @incident_date,
        incident_place = @incident_place,
        violence_types = @violence_types,
        violence_modalities = @violence_modalities,
        violence_modality_other = @violence_modality_other,
        summary = @summary,
        observations = @observations,
        analyst_name = @analyst_name,
        analyst_role = @analyst_role,
        rectora_name = @rectora_name,
        updated_at = datetime('now')
      WHERE id = @id AND case_file_id = @case_file_id AND institution_id = @institution_id`
    ).run({
      id: reportId,
      case_file_id: caseId,
      institution_id: institutionId,
      report_number: str(formData, "report_number"),
      report_date: str(formData, "report_date") || new Date().toISOString().slice(0, 10),
      dece_professional_name: str(formData, "dece_professional_name"),
      representative_relationship: str(formData, "representative_relationship"),
      perpetrator_name: str(formData, "perpetrator_name"),
      perpetrator_birth_date: str(formData, "perpetrator_birth_date"),
      perpetrator_age: str(formData, "perpetrator_age"),
      perpetrator_document_id: str(formData, "perpetrator_document_id"),
      perpetrator_gender: str(formData, "perpetrator_gender"),
      perpetrator_relationship: str(formData, "perpetrator_relationship"),
      informant_name: str(formData, "informant_name"),
      informant_id_number: str(formData, "informant_id_number"),
      informant_role: str(formData, "informant_role"),
      incident_date: str(formData, "incident_date"),
      incident_place: str(formData, "incident_place"),
      violence_types: violenceTypes,
      violence_modalities: violenceModalities,
      violence_modality_other: str(formData, "violence_modality_other"),
      summary: str(formData, "summary"),
      observations: str(formData, "observations"),
      analyst_name: str(formData, "analyst_name"),
      analyst_role: str(formData, "analyst_role"),
      rectora_name: str(formData, "rectora_name"),
    });

    logAudit({ userId: session.user.id, action: "EDITAR", entityType: "ViolenceReport", entityId: reportId, details: caseId, institutionId });
    revalidatePath(`/casos/${caseId}`);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Ocurrió un error inesperado al actualizar el reporte." };
  }

  redirect(`/casos/${caseId}/hecho-violencia/${reportId}/imprimir`);
}

/** Actualiza un Acta de Asesoramiento a la Máxima Autoridad Institucional. */
export async function updateAuthorityAdvisoryAct(
  caseId: string,
  actId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  try {
    requireOwnedCase(caseId, institutionId);

    const partNombre = getAllStr(formData, "participant_nombre");
    const partCargo = getAllStr(formData, "participant_cargo");
    const partFuncion = getAllStr(formData, "participant_funcion");
    const participants = partNombre
      .map((nombre, i) => ({ nombre: nombre.trim(), cargo: (partCargo[i] || "").trim(), funcion: (partFuncion[i] || "").trim() }))
      .filter((p) => p.nombre.length > 0);

    const background = getAllStr(formData, "background_item").map((b) => b.trim()).filter(Boolean);
    const measures = getAllStr(formData, "measure_item").map((m) => m.trim()).filter(Boolean);
    const advisoryScope = getAllStr(formData, "scope_item").map((s) => s.trim()).filter(Boolean);

    db.prepare(
      `UPDATE authority_advisory_acts SET
        act_date = @act_date,
        act_time = @act_time,
        act_place = @act_place,
        issuing_entity = @issuing_entity,
        standard_code = @standard_code,
        participants = @participants,
        background = @background,
        measures = @measures,
        advisory_scope = @advisory_scope,
        conclusion = @conclusion,
        dece_professional_name = @dece_professional_name,
        authority_name = @authority_name,
        authority_role = @authority_role,
        updated_at = datetime('now')
      WHERE id = @id AND case_file_id = @case_file_id AND institution_id = @institution_id`
    ).run({
      id: actId,
      case_file_id: caseId,
      institution_id: institutionId,
      act_date: str(formData, "act_date") || new Date().toISOString().slice(0, 10),
      act_time: str(formData, "act_time"),
      act_place: str(formData, "act_place"),
      issuing_entity: str(formData, "issuing_entity"),
      standard_code: str(formData, "standard_code"),
      participants: JSON.stringify(participants),
      background: JSON.stringify(background),
      measures: JSON.stringify(measures),
      advisory_scope: JSON.stringify(advisoryScope),
      conclusion: str(formData, "conclusion"),
      dece_professional_name: str(formData, "dece_professional_name") || session.user.name || null,
      authority_name: str(formData, "authority_name"),
      authority_role: str(formData, "authority_role") || "Rector/a",
    });

    logAudit({ userId: session.user.id, action: "EDITAR", entityType: "AuthorityAdvisoryAct", entityId: actId, details: caseId, institutionId });
    revalidatePath(`/casos/${caseId}`);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Ocurrió un error al actualizar el acta de asesoramiento." };
  }

  redirect(`/casos/${caseId}/asesoramiento-autoridad/${actId}/imprimir`);
}
