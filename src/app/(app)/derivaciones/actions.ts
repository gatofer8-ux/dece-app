"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { requireOwnedCase } from "@/lib/scopedDb";
import { logAudit } from "@/lib/audit";
import { autoMarkChecklistItems } from "@/lib/checklistAutoMark";

export type ActionState = { error: string | null };

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

function insertReferral(
  caseId: string,
  institutionId: string,
  userId: string,
  userName: string,
  formData: FormData
): string {
  requireOwnedCase(caseId, institutionId);
  const id = randomUUID();

  const currentSituation = str(formData, "current_situation_history") || str(formData, "background_summary");
  const signaturesJson = str(formData, "signatures_json") || "[]";
  const signatureType = str(formData, "signature_type") || "PENDIENTE";
  const physicalFileRef = str(formData, "physical_file_ref");
  const physicalEvidenceUrl = str(formData, "physical_evidence_url");

  db.prepare(
    `INSERT INTO referrals
      (id, case_file_id, created_by_id, scope, institution, reason, informed_consent, consent_signed_by, referral_date, status,
       destination_detail, background_summary, current_situation_history, actions_taken, care_type_required, observations,
       elaborated_by_name, received_by, authority_name,
       student_age, student_disability, student_nationality, representative_document_id, district_office_label,
       signatures_json, signature_type, physical_file_ref, physical_evidence_url)
     VALUES (?, ?, ?, ?, ?, ?, 0, NULL, ?, 'PENDIENTE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    caseId,
    userId,
    str(formData, "scope") || "EXTERNA",
    str(formData, "institution") || "",
    // "reason" (NOT NULL, legado) ya no tiene campo propio en el formulario:
    // "Motivo de referencia" es solo un encabezado. Se respalda con la historia.
    str(formData, "reason") || currentSituation || "",
    str(formData, "referral_date") || new Date().toISOString(),
    str(formData, "destination_detail"),
    currentSituation,
    currentSituation,
    str(formData, "actions_taken"),
    str(formData, "care_type_required"),
    str(formData, "observations"),
    str(formData, "elaborated_by_name") || userName,
    str(formData, "received_by"),
    str(formData, "authority_name"),
    str(formData, "student_age"),
    str(formData, "student_disability"),
    str(formData, "student_nationality"),
    str(formData, "representative_document_id"),
    str(formData, "district_office_label"),
    signaturesJson,
    signatureType,
    physicalFileRef,
    physicalEvidenceUrl
  );

  db.prepare(
    `INSERT INTO case_actions (id, case_file_id, author_id, type, description) VALUES (?, ?, ?, 'Derivación', ?)`
  ).run(randomUUID(), caseId, userId, `Derivación registrada hacia: ${str(formData, "institution")}`);

  autoMarkChecklistItems(caseId, ["ficha de derivacion"], "Ficha de derivación");

  db.prepare(`UPDATE case_files SET status='DERIVADO', updated_at=datetime('now') WHERE id=? AND status != 'CERRADO'`).run(caseId);

  logAudit({ userId, action: "CREAR", entityType: "Referral", entityId: id, details: caseId, institutionId });
  return id;
}

export async function createReferral(caseId: string, formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  insertReferral(caseId, institutionId, session.user.id, session.user.name || "", formData);
  revalidatePath(`/casos/${caseId}`);
  revalidatePath("/derivaciones");
}

// Variante para el formulario completo de la Ficha de Derivación oficial
// (usa el patrón ActionState/useFormState para mostrar errores sin crashear).
export async function createOfficialReferral(
  caseId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  let referralId: string;
  try {
    referralId = insertReferral(caseId, institutionId, session.user.id, session.user.name || "", formData);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Ocurrió un error inesperado al registrar la derivación." };
  }
  revalidatePath(`/casos/${caseId}`);
  revalidatePath("/derivaciones");
  redirect(`/casos/${caseId}/derivaciones/${referralId}/imprimir`);
}

export async function updateOfficialReferral(
  referralId: string,
  caseId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  requireOwnedCase(caseId, institutionId);

  const currentSituation = str(formData, "current_situation_history") || str(formData, "background_summary");
  const signaturesJson = str(formData, "signatures_json");
  const signatureType = str(formData, "signature_type");
  const physicalFileRef = str(formData, "physical_file_ref");
  const physicalEvidenceUrl = str(formData, "physical_evidence_url");

  try {
    db.prepare(
      `UPDATE referrals SET
        scope = ?,
        institution = ?,
        reason = ?,
        referral_date = ?,
        destination_detail = ?,
        background_summary = ?,
        current_situation_history = ?,
        actions_taken = ?,
        care_type_required = ?,
        observations = ?,
        elaborated_by_name = ?,
        received_by = ?,
        authority_name = ?,
        student_age = ?,
        student_disability = ?,
        student_nationality = ?,
        representative_document_id = ?,
        district_office_label = ?,
        signatures_json = COALESCE(?, signatures_json),
        signature_type = COALESCE(?, signature_type),
        physical_file_ref = COALESCE(?, physical_file_ref),
        physical_evidence_url = COALESCE(?, physical_evidence_url),
        updated_at = datetime('now')
      WHERE id = ? AND case_file_id = ?`
    ).run(
      str(formData, "scope") || "EXTERNA",
      str(formData, "institution") || "",
      str(formData, "reason") || currentSituation || "",
      str(formData, "referral_date") || new Date().toISOString(),
      str(formData, "destination_detail"),
      currentSituation,
      currentSituation,
      str(formData, "actions_taken"),
      str(formData, "care_type_required"),
      str(formData, "observations"),
      str(formData, "elaborated_by_name") || session.user.name,
      str(formData, "received_by"),
      str(formData, "authority_name"),
      str(formData, "student_age"),
      str(formData, "student_disability"),
      str(formData, "student_nationality"),
      str(formData, "representative_document_id"),
      str(formData, "district_office_label"),
      signaturesJson,
      signatureType,
      physicalFileRef,
      physicalEvidenceUrl,
      referralId,
      caseId
    );
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error al actualizar la ficha de derivación." };
  }

  logAudit({ userId: session.user.id, action: "EDITAR", entityType: "Referral", entityId: referralId, details: caseId, institutionId });
  revalidatePath(`/casos/${caseId}`);
  revalidatePath(`/casos/${caseId}/derivaciones/${referralId}/imprimir`);
  revalidatePath("/derivaciones");
  redirect(`/casos/${caseId}/derivaciones/${referralId}/imprimir`);
}

export async function updateReferralStatus(referralId: string, caseId: string, formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  requireOwnedCase(caseId, institutionId);

  db.prepare(
    `UPDATE referrals SET status=@status, response_notes=@response_notes, follow_up_date=@follow_up_date, updated_at=datetime('now') WHERE id=@id AND case_file_id=@case_file_id`
  ).run({
    id: referralId,
    case_file_id: caseId,
    status: str(formData, "status") || "PENDIENTE",
    response_notes: str(formData, "response_notes"),
    follow_up_date: str(formData, "follow_up_date"),
  });

  logAudit({ userId: session.user.id, action: "EDITAR", entityType: "Referral", entityId: referralId, institutionId });
  revalidatePath(`/casos/${caseId}`);
  revalidatePath("/derivaciones");
}

/** Borra una derivación duplicada o registrada por error (ronda 19). */
export async function deleteReferral(referralId: string, caseId: string) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  requireOwnedCase(caseId, institutionId);

  db.prepare("DELETE FROM referrals WHERE id = ? AND case_file_id = ?").run(referralId, caseId);
  logAudit({ userId: session.user.id, action: "BORRAR", entityType: "Referral", entityId: referralId, institutionId });
  revalidatePath(`/casos/${caseId}`);
  revalidatePath("/derivaciones");
}
