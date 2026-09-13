"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { requireOwnedCase } from "@/lib/scopedDb";
import { logAudit } from "@/lib/audit";
import { assignNextOficioNumber } from "@/lib/oficioNumbering";
import {
  buildOficioBitacoraDescription,
  buildOficioBitacoraObservations,
  getDefaultBodyIntro,
  normalizeOficioType,
  OFICIO_DEFAULT_CLOSING_NOTE,
} from "@/lib/oficios";
import type { CaseFileRow, OficioRow } from "@/lib/types";

export interface ActionState {
  error: string | null;
}

const OFICIO_ROLES = ["ADMIN", "DECE", "SUPERADMIN"] as const;

function s(formData: FormData, key: string): string {
  const val = formData.get(key);
  return typeof val === "string" ? val.trim() : "";
}

/** Campos comunes de creación y edición del oficio. */
function readFields(formData: FormData) {
  const oficioType = normalizeOficioType(s(formData, "oficio_type"));
  const bodyIntro = s(formData, "body_intro") || getDefaultBodyIntro(oficioType);

  return {
    oficio_type: oficioType,
    oficio_date: s(formData, "oficio_date") || new Date().toISOString().slice(0, 10),
    city: s(formData, "city") || "Ambato",
    asunto: s(formData, "asunto"),
    addressee_name: s(formData, "addressee_name"),
    addressee_role: s(formData, "addressee_role").toUpperCase() || "RECTORA",
    addressee_institution: s(formData, "addressee_institution") || null,
    body_intro: bodyIntro || null,
    body_content: s(formData, "body_content"),
    closing_note: s(formData, "closing_note") || OFICIO_DEFAULT_CLOSING_NOTE,
    signer_name: s(formData, "signer_name"),
    signer_role: s(formData, "signer_role") || "ANALISTA DECE",
    signatures_json: s(formData, "signatures_json") || "[]",
    signature_type: s(formData, "signature_type") || "PENDIENTE",
    physical_file_ref: s(formData, "physical_file_ref") || null,
    physical_evidence_url: s(formData, "physical_evidence_url") || null,
    case_file_id: s(formData, "case_file_id") || null,
    student_id: s(formData, "student_id") || null,
  };
}

function validate(fields: ReturnType<typeof readFields>): string | null {
  if (!fields.asunto) return "El asunto del oficio es obligatorio.";
  if (!fields.addressee_name) return "El nombre de la persona destinataria es obligatorio.";
  if (!fields.body_content)
    return "El cuerpo del oficio (solicitud o notificación) es obligatorio.";
  if (!fields.signer_name) return "El nombre de quien suscribe el oficio es obligatorio.";
  return null;
}

/**
 * Registra el oficio en la bitácora del caso vinculado, cuando hay uno.
 * Se hace de forma defensiva: un fallo aquí NUNCA debe impedir que el oficio
 * quede guardado (mismo criterio que restorativeCircleConsent.ts).
 */
function logCaseAction(params: {
  caseFileId: string;
  authorId: string;
  oficioDate: string;
  oficioNumber: string;
  asunto: string;
  bodyContent: string;
}): void {
  try {
    db.prepare(
      `INSERT INTO case_actions (id, case_file_id, author_id, date, type, description, observations)
       VALUES (?, ?, ?, ?, 'Oficio institucional', ?, ?)`
    ).run(
      randomUUID(),
      params.caseFileId,
      params.authorId,
      params.oficioDate,
      buildOficioBitacoraDescription(params.oficioNumber, params.asunto),
      buildOficioBitacoraObservations(params.bodyContent) || null
    );
    revalidatePath(`/casos/${params.caseFileId}`);
  } catch {
    // ignore
  }
}

/**
 * Valida que el caso indicado pertenezca a la institución y devuelve el
 * `student_id` del expediente para dejarlo asociado al oficio.
 */
function resolveCaseLink(
  caseFileId: string | null,
  institutionId: string
): { caseFileId: string | null; studentId: string | null } {
  if (!caseFileId) return { caseFileId: null, studentId: null };
  const caseFile = requireOwnedCase(caseFileId, institutionId) as unknown as CaseFileRow;
  return { caseFileId: caseFile.id, studentId: caseFile.student_id || null };
}

export async function createOficio(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole([...OFICIO_ROLES]);
  const institutionId = requireInstitutionId(session);

  const fields = readFields(formData);
  const validationError = validate(fields);
  if (validationError) return { error: validationError };

  let id = "";

  try {
    const link = resolveCaseLink(fields.case_file_id, institutionId);
    id = randomUUID();

    // Consecutivo propio de correspondencia saliente (independiente de los informes).
    const { oficioNumber } = assignNextOficioNumber({
      institutionId,
      userId: session.user.id,
      userName: session.user.name,
      schoolYearText: s(formData, "school_year_text") || null,
      oficioType: fields.oficio_type,
      recordId: id,
      caseFileId: link.caseFileId,
    });

    db.prepare(
      `INSERT INTO oficios (
         id, institution_id, case_file_id, student_id,
         oficio_number, oficio_type, oficio_date, city, asunto,
         addressee_name, addressee_role, addressee_institution,
         body_intro, body_content, closing_note,
         signer_name, signer_role,
         signatures_json, signature_type, physical_file_ref, physical_evidence_url,
         created_by, created_at, updated_at
       ) VALUES (
         @id, @institution_id, @case_file_id, @student_id,
         @oficio_number, @oficio_type, @oficio_date, @city, @asunto,
         @addressee_name, @addressee_role, @addressee_institution,
         @body_intro, @body_content, @closing_note,
         @signer_name, @signer_role,
         @signatures_json, @signature_type, @physical_file_ref, @physical_evidence_url,
         @created_by, datetime('now'), datetime('now')
       )`
    ).run({
      ...fields,
      id,
      institution_id: institutionId,
      case_file_id: link.caseFileId,
      student_id: fields.student_id || link.studentId,
      oficio_number: oficioNumber,
      created_by: session.user.id,
    });

    if (link.caseFileId) {
      logCaseAction({
        caseFileId: link.caseFileId,
        authorId: session.user.id,
        oficioDate: fields.oficio_date,
        oficioNumber,
        asunto: fields.asunto,
        bodyContent: fields.body_content,
      });
    }

    logAudit({
      userId: session.user.id,
      action: "CREAR",
      entityType: "Oficio",
      entityId: id,
      details: `Oficio N° ${oficioNumber} — ${fields.asunto.slice(0, 120)}`,
      institutionId,
    });
  } catch (err) {
    console.error("[createOficio error]", err);
    return {
      error: err instanceof Error ? err.message : "Ocurrió un error al guardar el oficio.",
    };
  }

  revalidatePath("/oficios");
  redirect(`/oficios/${id}/imprimir`);
}

export async function updateOficio(
  oficioId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole([...OFICIO_ROLES]);
  const institutionId = requireInstitutionId(session);

  const fields = readFields(formData);
  const validationError = validate(fields);
  if (validationError) return { error: validationError };

  try {
    const isSuperAdmin = session.user.role === "SUPERADMIN";
    const existing = db
      .prepare(
        isSuperAdmin
          ? "SELECT * FROM oficios WHERE id = ?"
          : "SELECT * FROM oficios WHERE id = ? AND institution_id = ?"
      )
      .get(...(isSuperAdmin ? [oficioId] : [oficioId, institutionId])) as
      | OficioRow
      | undefined;

    if (!existing) return { error: "Oficio no encontrado en tu institución." };

    const link = resolveCaseLink(fields.case_file_id, existing.institution_id);

    db.prepare(
      `UPDATE oficios SET
         case_file_id = @case_file_id,
         student_id = @student_id,
         oficio_type = @oficio_type,
         oficio_date = @oficio_date,
         city = @city,
         asunto = @asunto,
         addressee_name = @addressee_name,
         addressee_role = @addressee_role,
         addressee_institution = @addressee_institution,
         body_intro = @body_intro,
         body_content = @body_content,
         closing_note = @closing_note,
         signer_name = @signer_name,
         signer_role = @signer_role,
         signatures_json = @signatures_json,
         signature_type = @signature_type,
         physical_file_ref = @physical_file_ref,
         physical_evidence_url = @physical_evidence_url,
         updated_at = datetime('now')
       WHERE id = @id`
    ).run({
      ...fields,
      id: oficioId,
      case_file_id: link.caseFileId,
      student_id: fields.student_id || link.studentId,
    });

    if (link.caseFileId) {
      logCaseAction({
        caseFileId: link.caseFileId,
        authorId: session.user.id,
        oficioDate: fields.oficio_date,
        oficioNumber: existing.oficio_number,
        asunto: fields.asunto,
        bodyContent: fields.body_content,
      });
    }

    logAudit({
      userId: session.user.id,
      action: "EDITAR",
      entityType: "Oficio",
      entityId: oficioId,
      details: `Oficio N° ${existing.oficio_number} — ${fields.asunto.slice(0, 120)}`,
      institutionId,
    });
  } catch (err) {
    console.error("[updateOficio error]", err);
    return {
      error: err instanceof Error ? err.message : "Ocurrió un error al actualizar el oficio.",
    };
  }

  revalidatePath("/oficios");
  redirect(`/oficios/${oficioId}/imprimir`);
}

export async function deleteOficio(oficioId: string) {
  const session = await requireRole([...OFICIO_ROLES]);
  const institutionId = requireInstitutionId(session);

  // El número emitido queda en oficios_issued: eliminar el oficio jamás libera
  // ni reutiliza su consecutivo.
  if (session.user.role === "SUPERADMIN") {
    db.prepare("DELETE FROM oficios WHERE id = ?").run(oficioId);
  } else {
    db.prepare("DELETE FROM oficios WHERE id = ? AND institution_id = ?").run(
      oficioId,
      institutionId
    );
  }

  logAudit({
    userId: session.user.id,
    action: "ELIMINAR",
    entityType: "Oficio",
    entityId: oficioId,
    details: "Oficio institucional eliminado",
    institutionId,
  });

  revalidatePath("/oficios");
}
