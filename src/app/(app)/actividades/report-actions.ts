"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { str, int } from "@/lib/formData";
import { assignNextReportNumber } from "@/lib/reportNumbering";
import {
  saveAttachmentFile,
  deleteAttachmentFile,
  isAllowedAttachmentType,
  MAX_ATTACHMENT_SIZE,
} from "@/lib/uploads";
import { ACTIVITY_REPORT_FIELD_LABELS } from "@/lib/activityReport";
import { draftText, isAiConfigured } from "@/lib/ai";
import type { ActivityRow, ActivityReportRow } from "@/lib/types";

const REPORT_COLUMNS = [
  "report_date", "school_year_text",
  "responsible_name", "responsible_role", "responsible_phone_ext", "responsible_email",
  "directed_to_name", "directed_to_role", "directed_to_phone_ext", "directed_to_email",
  "tema", "legal_basis", "scope_text", "objective_general", "objectives_specific", "development_analysis",
  "activity_name", "activity_axis", "activity_date", "activity_responsible", "activity_beneficiaries",
  "advances", "critical_nodes", "conclusions", "recommendations",
  "elaborated_by_name", "elaborated_by_role", "elaborated_date",
  "approved_by_name", "approved_by_role", "approved_date",
] as const;

function readReportFields(formData: FormData): Record<string, string | number | null> {
  const out: Record<string, string | number | null> = {};
  for (const c of REPORT_COLUMNS) out[c] = str(formData, c);
  out.participants_count = int(formData, "participants_count");
  return out;
}


function insertReport(
  institutionId: string,
  userId: string,
  activityId: string | null,
  values: Record<string, string | number | null>,
  reportNumber: string
): string {
  const id = randomUUID();
  const cols = [...REPORT_COLUMNS, "participants_count"];
  const placeholders = cols.map((c) => `@${c}`).join(", ");
  const payload: Record<string, unknown> = { id, institution_id: institutionId, created_by_id: userId, activity_id: activityId, report_number: reportNumber };
  for (const c of cols) payload[c] = values[c] ?? null;
  db.prepare(
    `INSERT INTO activity_reports (id, institution_id, created_by_id, activity_id, report_number, ${cols.join(", ")})
     VALUES (@id, @institution_id, @created_by_id, @activity_id, @report_number, ${placeholders})`
  ).run(payload);
  return id;
}

export async function createActivityReport(activityId: string, formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const activity = db
    .prepare("SELECT * FROM activities WHERE id = ? AND institution_id = ?")
    .get(activityId, institutionId) as ActivityRow | undefined;
  if (!activity) throw new Error("Actividad no encontrada.");

  const values = readReportFields(formData);
  const { reportNumber } = assignNextReportNumber({
    institutionId,
    userId: session.user.id,
    userName: session.user.name,
    schoolYearText: (values.school_year_text as string) || null,
    reportType: "INFORME_TALLER",
  });
  const id = insertReport(institutionId, session.user.id, activityId, values, reportNumber);

  logAudit({ userId: session.user.id, action: "CREAR", entityType: "ActivityReport", entityId: id, institutionId });
  revalidatePath("/actividades");
  redirect(`/actividades/${activityId}/informe/${id}/imprimir`);
}

/** Crea la actividad y su informe en un solo paso (informe "suelto"). */
export async function createStandaloneActivityReport(formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const values = readReportFields(formData);

  const activityId = randomUUID();
  const axisRaw = (str(formData, "activity_axis") || "").toUpperCase();
  const internalAxis = axisRaw.includes("CONVIVENCIA") ? "CONVIVENCIA" : "PREVENCION";
  db.prepare(
    `INSERT INTO activities (id, institution_id, title, axis, prevention_theme, description, target_audience, courses, date, responsible_id, participants_count, evidence_notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    activityId,
    institutionId,
    str(formData, "activity_name") || str(formData, "tema") || "Taller",
    internalAxis,
    str(formData, "prevention_theme"),
    str(formData, "development_analysis"),
    str(formData, "activity_beneficiaries"),
    str(formData, "activity_beneficiaries"),
    str(formData, "activity_date") || new Date().toISOString().slice(0, 10),
    session.user.id,
    values.participants_count as number | null,
    null
  );

  const { reportNumber } = assignNextReportNumber({
    institutionId,
    userId: session.user.id,
    userName: session.user.name,
    schoolYearText: (values.school_year_text as string) || null,
    reportType: "INFORME_TALLER",
  });
  const id = insertReport(institutionId, session.user.id, activityId, values, reportNumber);

  logAudit({ userId: session.user.id, action: "CREAR", entityType: "ActivityReport", entityId: id, institutionId });
  revalidatePath("/actividades");
  redirect(`/actividades/${activityId}/informe/${id}/imprimir`);
}

export async function updateActivityReport(reportId: string, formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const existing = db
    .prepare("SELECT id, activity_id FROM activity_reports WHERE id = ? AND institution_id = ?")
    .get(reportId, institutionId) as { id: string; activity_id: string | null } | undefined;
  if (!existing) throw new Error("Informe no encontrado.");

  const values = readReportFields(formData);
  const cols = [...REPORT_COLUMNS, "participants_count"];
  const setSql = cols.map((c) => `${c} = @${c}`).join(", ");
  const payload: Record<string, unknown> = { id: reportId, institution_id: institutionId };
  for (const c of cols) payload[c] = values[c] ?? null;
  db.prepare(
    `UPDATE activity_reports SET ${setSql}, updated_at = datetime('now') WHERE id = @id AND institution_id = @institution_id`
  ).run(payload);

  logAudit({ userId: session.user.id, action: "EDITAR", entityType: "ActivityReport", entityId: reportId, institutionId });
  revalidatePath("/actividades");
  redirect(`/actividades/${existing.activity_id ?? "sueltos"}/informe/${reportId}/imprimir`);
}

export async function deleteActivityReport(reportId: string) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const rep = db
    .prepare("SELECT activity_id FROM activity_reports WHERE id = ? AND institution_id = ?")
    .get(reportId, institutionId) as { activity_id: string | null } | undefined;
  if (!rep) return;
  const photos = db
    .prepare("SELECT path FROM attachments WHERE activity_report_id = ?")
    .all(reportId) as { path: string }[];
  db.prepare("DELETE FROM attachments WHERE activity_report_id = ?").run(reportId);
  for (const p of photos) deleteAttachmentFile(p.path);
  db.prepare("DELETE FROM activity_reports WHERE id = ?").run(reportId);
  logAudit({ userId: session.user.id, action: "BORRAR", entityType: "ActivityReport", entityId: reportId, institutionId });
  revalidatePath("/actividades");
  redirect(`/actividades/${rep.activity_id ?? ""}`);
}

export async function uploadActivityReportPhoto(reportId: string, activityId: string, formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const rep = db
    .prepare("SELECT id FROM activity_reports WHERE id = ? AND institution_id = ?")
    .get(reportId, institutionId) as { id: string } | undefined;
  const failUrl = (m: string) =>
    `/actividades/${activityId}/informe/${reportId}/editar?foto_error=${encodeURIComponent(m)}`;
  if (!rep) redirect(failUrl("Informe no encontrado."));

  const file = formData.get("foto");
  if (!(file instanceof File) || file.size === 0) redirect(failUrl("Selecciona una imagen."));
  const f = file as File;
  if (f.size > MAX_ATTACHMENT_SIZE) redirect(failUrl("La imagen supera el máximo permitido (15 MB)."));
  if (!(f.type || "").startsWith("image/") || (f.type && !isAllowedAttachmentType(f.type))) {
    redirect(failUrl("Solo se aceptan imágenes JPG, PNG o WEBP."));
  }

  const { relativePath, size } = await saveAttachmentFile(f, `taller-${reportId}`);
  db.prepare(
    `INSERT INTO attachments (id, institution_id, filename, path, mime_type, size, uploaded_by_id, activity_report_id, caption, document_type)
     VALUES (@id, @institution_id, @filename, @path, @mime_type, @size, @uploaded_by_id, @activity_report_id, @caption, 'REGISTRO_FOTOGRAFICO')`
  ).run({
    id: randomUUID(),
    institution_id: institutionId,
    filename: f.name || "foto",
    path: relativePath,
    mime_type: f.type || "image/jpeg",
    size,
    uploaded_by_id: session.user.id,
    activity_report_id: reportId,
    caption: str(formData, "caption"),
  });

  revalidatePath(`/actividades/${activityId}/informe/${reportId}/editar`);
  redirect(`/actividades/${activityId}/informe/${reportId}/editar#fotos`);
}

export async function deleteActivityReportPhoto(attachmentId: string, reportId: string, activityId: string) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const att = db
    .prepare("SELECT path FROM attachments WHERE id = ? AND institution_id = ? AND activity_report_id = ?")
    .get(attachmentId, institutionId, reportId) as { path: string } | undefined;
  if (att) {
    db.prepare("DELETE FROM attachments WHERE id = ?").run(attachmentId);
    deleteAttachmentFile(att.path);
  }
  revalidatePath(`/actividades/${activityId}/informe/${reportId}/editar`);
  redirect(`/actividades/${activityId}/informe/${reportId}/editar#fotos`);
}

/** Ayuda de IA para un campo del informe de taller (sin datos de estudiantes). */
export async function draftActivityReportField(
  fieldKey: keyof typeof ACTIVITY_REPORT_FIELD_LABELS,
  currentText: string,
  ctx: { tema?: string; theme?: string; beneficiaries?: string; participants?: string }
): Promise<{ text?: string; error?: string }> {
  await requireRole(["ADMIN", "DECE"]);
  if (!isAiConfigured()) return { error: "La ayuda de IA todavía no está configurada." };
  const label = ACTIVITY_REPORT_FIELD_LABELS[fieldKey];
  if (!label) return { error: "Campo no válido." };

  const context = [
    ctx.tema ? `Tema/título del taller: ${ctx.tema}` : "",
    ctx.beneficiaries ? `Dirigido a: ${ctx.beneficiaries}` : "",
    ctx.participants ? `Número de participantes: ${ctx.participants}` : "",
    "Es un informe institucional de un taller de promoción/prevención del DECE. Redacción formal, en tercera persona, sin nombres de estudiantes ni datos personales. Estilo del Ministerio de Educación del Ecuador.",
  ]
    .filter(Boolean)
    .join("\n");

  const result = await draftText({ fieldLabel: label, context, currentText: currentText || "" });
  if ("error" in result) return { error: result.error };
  return { text: result.text };
}

export type { ActivityReportRow };
