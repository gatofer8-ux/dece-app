"use server";

import { revalidatePath } from "next/cache";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import {
  DEFAULT_STRUCTURE,
  MAX_TEMPLATE_BYTES,
  defaultLetterhead,
  parseLetterhead,
  parseStructure,
} from "@/lib/entrevistaPreguntas";
import { validateTemplate } from "@/lib/entrevistaPreguntasDocx";
import {
  removeInterviewTemplate,
  saveInterviewFormat,
  saveInterviewTemplate,
} from "@/lib/entrevistaPreguntasFormat";
import { db } from "@/lib/db";

export interface FormatState {
  error: string | null;
  ok?: string | null;
}

const PATH = "/institucion/formatos";

export async function saveInterviewFormatAction(_prev: FormatState, formData: FormData): Promise<FormatState> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const inst = db.prepare("SELECT name FROM institutions WHERE id = ?").get(institutionId) as { name: string } | undefined;
  const structureRaw = formData.get("structure_json");
  const letterheadRaw = formData.get("letterhead_json");
  if (typeof structureRaw !== "string" || typeof letterheadRaw !== "string") {
    return { error: "No se recibieron los datos del formato." };
  }

  const structure = parseStructure(structureRaw);
  const letterhead = parseLetterhead(letterheadRaw, inst?.name || "");
  if (!structure.sections.some((s) => s.visible && s.questions.some((q) => q.visible))) {
    return { error: "Debe quedar al menos una pregunta visible en la entrevista." };
  }

  saveInterviewFormat(institutionId, session.user.id, letterhead, structure);
  logAudit({ userId: session.user.id, action: "EDITAR", entityType: "InstitutionDocumentFormat", entityId: institutionId, details: "ENTREVISTA_PREGUNTAS formato", institutionId });
  revalidatePath(PATH);
  return { error: null, ok: "Formato guardado. Se aplicará a los documentos que se exporten desde ahora." };
}

export async function resetInterviewFormatAction(): Promise<FormatState> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const inst = db.prepare("SELECT name FROM institutions WHERE id = ?").get(institutionId) as { name: string } | undefined;
  saveInterviewFormat(institutionId, session.user.id, defaultLetterhead(inst?.name || ""), structuredClone(DEFAULT_STRUCTURE));
  logAudit({ userId: session.user.id, action: "EDITAR", entityType: "InstitutionDocumentFormat", entityId: institutionId, details: "ENTREVISTA_PREGUNTAS restablecido", institutionId });
  revalidatePath(PATH);
  return { error: null, ok: "Se restableció el formato estándar." };
}

export async function uploadInterviewTemplateAction(_prev: FormatState, formData: FormData): Promise<FormatState> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const file = formData.get("template");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecciona un archivo .docx." };
  if (!file.name.toLowerCase().endsWith(".docx")) return { error: "La plantilla debe ser un archivo Word (.docx)." };
  if (file.size > MAX_TEMPLATE_BYTES) return { error: "La plantilla pesa más de 2 MB. Reduce el tamaño de las imágenes." };

  const buffer = Buffer.from(await file.arrayBuffer());
  const problem = validateTemplate(buffer);
  if (problem) return { error: problem };

  const safeName = file.name.replace(/[^\w.\- ()áéíóúÁÉÍÓÚñÑ]/g, "_").slice(0, 120);
  saveInterviewTemplate(institutionId, session.user.id, safeName, buffer);
  logAudit({ userId: session.user.id, action: "EDITAR", entityType: "InstitutionDocumentFormat", entityId: institutionId, details: `Plantilla propia: ${safeName}`, institutionId });
  revalidatePath(PATH);
  return { error: null, ok: "Plantilla subida. Las entrevistas se exportarán con tu formato." };
}

export async function removeInterviewTemplateAction(): Promise<FormatState> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  removeInterviewTemplate(institutionId, session.user.id);
  logAudit({ userId: session.user.id, action: "EDITAR", entityType: "InstitutionDocumentFormat", entityId: institutionId, details: "Plantilla propia eliminada", institutionId });
  revalidatePath(PATH);
  return { error: null, ok: "Plantilla eliminada. Se usará el formato del sistema." };
}
