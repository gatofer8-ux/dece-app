"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { str } from "@/lib/formData";

export type ProfileState = { error: string | null; ok?: boolean };

/**
 * El propio profesional edita sus datos de firma: nombre, título académico,
 * cargo, cédula, teléfono y extensión. Se precargan en todos los documentos.
 */
export async function updateOwnProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const session = await requireSession();

  const name = str(formData, "name");
  if (!name || name.length < 3) return { error: "El nombre es obligatorio." };

  db.prepare(
    `UPDATE users SET
       name = @name,
       title_prefix = @title_prefix,
       job_title = @job_title,
       document_id = @document_id,
       professional_code = @professional_code,
       phone = @phone,
       phone_ext = @phone_ext,
       updated_at = datetime('now')
     WHERE id = @id`
  ).run({
    id: session.user.id,
    name,
    title_prefix: str(formData, "title_prefix"),
    job_title: str(formData, "job_title"),
    document_id: str(formData, "document_id"),
    professional_code: str(formData, "professional_code"),
    phone: str(formData, "phone"),
    phone_ext: str(formData, "phone_ext"),
  });

  logAudit({
    userId: session.user.id,
    action: "EDITAR",
    entityType: "User",
    entityId: session.user.id,
    details: "Actualizó su propio perfil profesional",
    institutionId: session.user.institution_id ?? undefined,
  });

  revalidatePath("/perfil");
  return { error: null, ok: true };
}
