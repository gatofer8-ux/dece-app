"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { str, getAllStr } from "@/lib/formData";
import { ENEIS_INFORME_DECE_ACTIVIDADES_REQUERIDAS } from "@/lib/eneis/eneisInformeDece";

const MAX_PHOTO_BYTES = 800 * 1024; // 800 KB por foto, igual límite que el sello institucional

async function readPhoto(formData: FormData, key: string): Promise<{ dataUri: string | null; error: string | null }> {
  const file = formData.get(key);
  if (!(file instanceof File) || file.size === 0) return { dataUri: null, error: null };
  if (!file.type.startsWith("image/")) return { dataUri: null, error: `El registro fotográfico "${key}" debe ser una imagen.` };
  if (file.size > MAX_PHOTO_BYTES) return { dataUri: null, error: `La foto "${key}" es muy pesada (máximo 800 KB).` };
  const buffer = Buffer.from(await file.arrayBuffer());
  return { dataUri: `data:${file.type};base64,${buffer.toString("base64")}`, error: null };
}

async function collectActividades(formData: FormData, existing: { foto: string | null }[] | null) {
  const ejecutadas = getAllStr(formData, "a_ejecutada");
  const fechas = getAllStr(formData, "a_fecha");
  const beneficiarios = getAllStr(formData, "a_beneficiarios");
  const out: { ejecutada: string; fecha: string; beneficiarios: string; foto: string | null }[] = [];
  for (let i = 0; i < ENEIS_INFORME_DECE_ACTIVIDADES_REQUERIDAS.length; i++) {
    const { dataUri, error } = await readPhoto(formData, `a_foto_${i}`);
    if (error) throw new Error(error);
    const removeFoto = str(formData, `a_foto_${i}_remove`) === "1";
    out.push({
      ejecutada: ejecutadas[i] || "",
      fecha: fechas[i] || "",
      beneficiarios: beneficiarios[i] || "",
      foto: dataUri || (removeFoto ? null : existing?.[i]?.foto ?? null),
    });
  }
  return JSON.stringify(out);
}

export async function createEneisInformeDeceAction(formData: FormData): Promise<{ error: string } | void> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const periodo = str(formData, "periodo");
  if (!periodo || !/^\d{4}-\d{2}$/.test(periodo)) return { error: "Selecciona el mes y año del informe." };

  const dup = db.prepare("SELECT id FROM eneis_informes_dece WHERE institution_id = ? AND periodo = ?").get(institutionId, periodo);
  if (dup) return { error: "Ya existe un informe DECE registrado para ese mes." };

  let actividadesJson: string;
  try {
    actividadesJson = await collectActividades(formData, null);
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Error al procesar las fotos." };
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO eneis_informes_dece (id, institution_id, created_by_id, periodo, actividades_json)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, institutionId, session.user.id, periodo, actividadesJson);
  logAudit({ userId: session.user.id, action: "CREAR", entityType: "EneisInformeDece", entityId: id, institutionId });
  revalidatePath("/eneis/informe-dece");
  redirect(`/eneis/informe-dece/${id}/imprimir`);
}

export async function updateEneisInformeDeceAction(id: string, formData: FormData): Promise<{ error: string } | void> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const existing = db.prepare("SELECT * FROM eneis_informes_dece WHERE id = ? AND institution_id = ?").get(id, institutionId) as
    | { actividades_json: string }
    | undefined;
  if (!existing) throw new Error("Informe no encontrado.");

  const periodo = str(formData, "periodo");
  if (!periodo || !/^\d{4}-\d{2}$/.test(periodo)) return { error: "Selecciona el mes y año del informe." };

  let existingActividades: { foto: string | null }[] = [];
  try {
    existingActividades = JSON.parse(existing.actividades_json);
  } catch {
    /* noop */
  }

  let actividadesJson: string;
  try {
    actividadesJson = await collectActividades(formData, existingActividades);
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Error al procesar las fotos." };
  }

  db.prepare(
    "UPDATE eneis_informes_dece SET periodo = ?, actividades_json = ?, updated_at = datetime('now') WHERE id = ? AND institution_id = ?"
  ).run(periodo, actividadesJson, id, institutionId);
  logAudit({ userId: session.user.id, action: "EDITAR", entityType: "EneisInformeDece", entityId: id, institutionId });
  revalidatePath("/eneis/informe-dece");
  redirect(`/eneis/informe-dece/${id}/imprimir`);
}

export async function deleteEneisInformeDeceAction(id: string): Promise<void | { error: string }> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  db.prepare("DELETE FROM eneis_informes_dece WHERE id = ? AND institution_id = ?").run(id, institutionId);
  logAudit({ userId: session.user.id, action: "BORRAR", entityType: "EneisInformeDece", entityId: id, institutionId });
  revalidatePath("/eneis/informe-dece");
}
