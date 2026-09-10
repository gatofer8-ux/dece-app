"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { saveAttachmentFile, deleteAttachmentFile, isAllowedAttachmentType, MAX_ATTACHMENT_SIZE } from "@/lib/uploads";
import { requireOwnedCase } from "@/lib/scopedDb";
import type { AttachmentRow } from "@/lib/types";
import type { ActionState } from "../actions";
export type { ActionState };

export async function uploadAttachment(caseId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  try {
    requireOwnedCase(caseId, institutionId);
  } catch (err: any) {
    return { error: err?.message || "Caso no encontrado." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona un archivo para subir." };
  }
  if (file.size > MAX_ATTACHMENT_SIZE) {
    return { error: `El archivo supera el tamaño máximo permitido (${Math.round(MAX_ATTACHMENT_SIZE / 1024 / 1024)} MB).` };
  }
  if (file.type && !isAllowedAttachmentType(file.type)) {
    return { error: "Tipo de archivo no permitido. Se aceptan PDF, imágenes (JPG/PNG/WEBP) y documentos de Word/Excel." };
  }

  const { relativePath, size } = await saveAttachmentFile(file, caseId);

  const id = randomUUID();
  db.prepare(
    `INSERT INTO attachments (id, institution_id, filename, path, mime_type, size, uploaded_by_id, case_file_id)
     VALUES (@id, @institution_id, @filename, @path, @mime_type, @size, @uploaded_by_id, @case_file_id)`
  ).run({
    id,
    institution_id: institutionId,
    filename: file.name || "archivo",
    path: relativePath,
    mime_type: file.type || null,
    size,
    uploaded_by_id: session.user.id,
    case_file_id: caseId,
  });

  logAudit({ userId: session.user.id, action: "SUBIR_ARCHIVO", entityType: "Attachment", entityId: id, institutionId });
  revalidatePath(`/casos/${caseId}`);
  return { error: null };
}

export async function deleteAttachment(attachmentId: string, caseId: string) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const attachment = db
    .prepare("SELECT * FROM attachments WHERE id = ? AND institution_id = ? AND case_file_id = ?")
    .get(attachmentId, institutionId, caseId) as AttachmentRow | undefined;
  if (!attachment) throw new Error("Archivo no encontrado.");

  db.prepare("DELETE FROM attachments WHERE id = ?").run(attachmentId);
  deleteAttachmentFile(attachment.path);

  // Si el archivo era el respaldo de un ítem del checklist, se desmarca el ítem.
  if (attachment.checklist_item_id) {
    db.prepare(
      "UPDATE case_checklist_items SET attachment_id = NULL, status = NULL, updated_at = datetime('now') WHERE id = ? AND case_file_id = ?"
    ).run(attachment.checklist_item_id, caseId);
  }

  logAudit({ userId: session.user.id, action: "BORRAR_ARCHIVO", entityType: "Attachment", entityId: attachmentId, institutionId });
  revalidatePath(`/casos/${caseId}`);
}
