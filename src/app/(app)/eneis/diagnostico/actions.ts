"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { str, dateStr, getAllStr, getAllRawStr } from "@/lib/formData";

const TEXT_COLS = ["zona", "distrito", "fecha", "antecedentes", "objetivo_general", "conclusiones", "recomendaciones"] as const;

function collectListField(fd: FormData, key: string) {
  return JSON.stringify(getAllStr(fd, key));
}
function collectResultados(fd: FormData) {
  const ejes = getAllRawStr(fd, "r_eje");
  const componentes = getAllRawStr(fd, "r_componentes");
  const fuentes = getAllRawStr(fd, "r_fuente");
  const dificultades = getAllRawStr(fd, "r_dificultades");
  const positivos = getAllRawStr(fd, "r_positivos");
  const negativos = getAllRawStr(fd, "r_negativos");
  const sesgados = getAllRawStr(fd, "r_sesgados");
  const out = ejes
    .map((eje, i) => ({
      eje,
      componentes: componentes[i] || "",
      fuente: fuentes[i] || "",
      dificultades: dificultades[i] || "",
      positivos: positivos[i] || "",
      negativos: negativos[i] || "",
      sesgados: sesgados[i] || "",
    }))
    .filter((x) => Object.values(x).some(Boolean));
  return JSON.stringify(out);
}
function collectResponsables(fd: FormData) {
  const nombres = getAllStr(fd, "resp_nombre");
  const cargos = getAllStr(fd, "resp_cargo");
  const out = nombres.map((n, i) => ({ nombre: n, cargo: cargos[i] || "" })).filter((p) => p.nombre || p.cargo);
  return JSON.stringify(out);
}

function payload(fd: FormData) {
  const o: Record<string, string | null> = {};
  for (const c of TEXT_COLS) o[c] = c === "fecha" ? dateStr(fd, c) : str(fd, c);
  o.objetivos_especificos_json = collectListField(fd, "objetivo_especifico");
  o.actividades_json = collectListField(fd, "actividad");
  o.resultados_json = collectResultados(fd);
  o.responsables_json = collectResponsables(fd);
  return o;
}

export async function createEneisDiagnosticoAction(formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const id = randomUUID();
  const v = payload(formData);
  const cols = Object.keys(v);
  db.prepare(
    `INSERT INTO eneis_diagnosticos (id, institution_id, created_by_id, ${cols.join(", ")})
     VALUES (@id, @institution_id, @created_by_id, ${cols.map((c) => `@${c}`).join(", ")})`
  ).run({ id, institution_id: institutionId, created_by_id: session.user.id, ...v });
  logAudit({ userId: session.user.id, action: "CREAR", entityType: "EneisDiagnostico", entityId: id, institutionId });
  revalidatePath("/eneis/diagnostico");
  redirect(`/eneis/diagnostico/${id}/imprimir`);
}

export async function updateEneisDiagnosticoAction(id: string, formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const exists = db.prepare("SELECT id FROM eneis_diagnosticos WHERE id = ? AND institution_id = ?").get(id, institutionId);
  if (!exists) throw new Error("Diagnóstico no encontrado.");
  const v = payload(formData);
  const cols = Object.keys(v);
  db.prepare(
    `UPDATE eneis_diagnosticos SET ${cols.map((c) => `${c} = @${c}`).join(", ")}, updated_at = datetime('now') WHERE id = @id AND institution_id = @institution_id`
  ).run({ id, institution_id: institutionId, ...v });
  logAudit({ userId: session.user.id, action: "EDITAR", entityType: "EneisDiagnostico", entityId: id, institutionId });
  revalidatePath("/eneis/diagnostico");
  redirect(`/eneis/diagnostico/${id}/imprimir`);
}

export async function deleteEneisDiagnosticoAction(id: string): Promise<void | { error: string }> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  db.prepare("DELETE FROM eneis_diagnosticos WHERE id = ? AND institution_id = ?").run(id, institutionId);
  logAudit({ userId: session.user.id, action: "BORRAR", entityType: "EneisDiagnostico", entityId: id, institutionId });
  revalidatePath("/eneis/diagnostico");
}
