"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { str, dateStr, int, getAllStr, getAllRawStr } from "@/lib/formData";
import { ENEIS_FIRMAS_ESCOLARES_ROLES, ENEIS_FIRMAS_DISTRITALES_ROLES } from "@/lib/eneis/eneisFichaTecnica";

function collectFuncionarios(fd: FormData) {
  const nombres = getAllStr(fd, "func_nombre");
  const cargos = getAllStr(fd, "func_cargo");
  const out = nombres.map((n, i) => ({ nombre: n, cargo: cargos[i] || "" })).filter((p) => p.nombre || p.cargo);
  return JSON.stringify(out);
}
function collectCronograma(fd: FormData) {
  const actividades = getAllRawStr(fd, "cr_actividad");
  const poblaciones = getAllRawStr(fd, "cr_poblacion");
  const fechas = getAllRawStr(fd, "cr_fecha");
  const responsables = getAllRawStr(fd, "cr_responsable");
  const out = actividades
    .map((actividad, i) => ({ actividad, poblacion: poblaciones[i] || "", fecha: fechas[i] || "", responsable: responsables[i] || "" }))
    .filter((x) => x.actividad || x.poblacion || x.fecha || x.responsable);
  return JSON.stringify(out);
}
function collectAvances(fd: FormData) {
  const actividades = getAllRawStr(fd, "av_actividad");
  const estados = getAllRawStr(fd, "av_estado");
  const poblaciones = getAllRawStr(fd, "av_poblacion");
  const out = actividades
    .map((actividad, i) => ({ actividad, estado: estados[i] || "", poblacion: poblaciones[i] || "" }))
    .filter((x) => x.actividad || x.estado || x.poblacion);
  return JSON.stringify(out);
}
function collectFirmas(fd: FormData, prefix: string, roles: string[]) {
  const nombres = getAllRawStr(fd, `${prefix}_nombre`);
  const out = roles.map((role, i) => ({ role, nombre: nombres[i] || "" }));
  return JSON.stringify(out);
}

function payload(fd: FormData) {
  return {
    coordinacion_zonal_distrito: str(fd, "coordinacion_zonal_distrito"),
    fecha_elaboracion: dateStr(fd, "fecha_elaboracion"),
    funcionarios_json: collectFuncionarios(fd),
    nivel_preparacion_index: int(fd, "nivel_preparacion_index"),
    temas_seleccionados_json: JSON.stringify(getAllStr(fd, "tema_id")),
    recursos_seleccionados_json: JSON.stringify(getAllStr(fd, "recurso_index").map(Number)),
    cronograma_json: collectCronograma(fd),
    avances_json: collectAvances(fd),
    nudos_criticos: str(fd, "nudos_criticos"),
    firmas_escolares_json: collectFirmas(fd, "fe", ENEIS_FIRMAS_ESCOLARES_ROLES),
    firmas_distritales_json: collectFirmas(fd, "fd", ENEIS_FIRMAS_DISTRITALES_ROLES),
  };
}

export async function createEneisFichaTecnicaAction(formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const id = randomUUID();
  const v = payload(formData);
  const cols = Object.keys(v);
  db.prepare(
    `INSERT INTO eneis_fichas_tecnicas (id, institution_id, created_by_id, ${cols.join(", ")})
     VALUES (@id, @institution_id, @created_by_id, ${cols.map((c) => `@${c}`).join(", ")})`
  ).run({ id, institution_id: institutionId, created_by_id: session.user.id, ...v });
  logAudit({ userId: session.user.id, action: "CREAR", entityType: "EneisFichaTecnica", entityId: id, institutionId });
  revalidatePath("/eneis/ficha-tecnica");
  redirect(`/eneis/ficha-tecnica/${id}/imprimir`);
}

export async function updateEneisFichaTecnicaAction(id: string, formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const exists = db.prepare("SELECT id FROM eneis_fichas_tecnicas WHERE id = ? AND institution_id = ?").get(id, institutionId);
  if (!exists) throw new Error("Ficha técnica no encontrada.");
  const v = payload(formData);
  const cols = Object.keys(v);
  db.prepare(
    `UPDATE eneis_fichas_tecnicas SET ${cols.map((c) => `${c} = @${c}`).join(", ")}, updated_at = datetime('now') WHERE id = @id AND institution_id = @institution_id`
  ).run({ id, institution_id: institutionId, ...v });
  logAudit({ userId: session.user.id, action: "EDITAR", entityType: "EneisFichaTecnica", entityId: id, institutionId });
  revalidatePath("/eneis/ficha-tecnica");
  redirect(`/eneis/ficha-tecnica/${id}/imprimir`);
}

export async function deleteEneisFichaTecnicaAction(id: string): Promise<void | { error: string }> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  db.prepare("DELETE FROM eneis_fichas_tecnicas WHERE id = ? AND institution_id = ?").run(id, institutionId);
  logAudit({ userId: session.user.id, action: "BORRAR", entityType: "EneisFichaTecnica", entityId: id, institutionId });
  revalidatePath("/eneis/ficha-tecnica");
}
