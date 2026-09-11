"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { str, int, dateStr } from "@/lib/formData";
import { createInforme, deleteInforme, refreshInformeTablas, type EneisInformeTipo } from "@/lib/eneis/eneisInformes";

export type EneisInformeActionState = { error: string | null };

export async function createEneisInformeAction(
  _prev: EneisInformeActionState,
  formData: FormData
): Promise<EneisInformeActionState> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const periodoDesde = dateStr(formData, "periodo_desde");
  const periodoHasta = dateStr(formData, "periodo_hasta");
  if (!periodoDesde || !periodoHasta) {
    return { error: "Indica el período (desde / hasta) que va a cubrir el informe." };
  }
  if (periodoDesde > periodoHasta) {
    return { error: 'La fecha "desde" no puede ser posterior a la fecha "hasta".' };
  }

  const tipoRaw = str(formData, "tipo");
  const tipo: EneisInformeTipo = tipoRaw === "TRIMESTRAL" ? "TRIMESTRAL" : "SEMESTRAL";
  const titulo =
    str(formData, "titulo") ||
    `INFORME ${tipo} DE IMPLEMENTACIÓN DE LA ESTRATEGIA NACIONAL DE EDUCACIÓN INTEGRAL EN SEXUALIDAD`;

  let id = "";
  try {
    id = createInforme({
      institutionId,
      tipo,
      titulo,
      numeroInforme: str(formData, "numero_informe"),
      fechaInforme: dateStr(formData, "fecha_informe"),
      responsableNombre: str(formData, "responsable_nombre"),
      responsableContacto: str(formData, "responsable_contacto"),
      responsableCargo: str(formData, "responsable_cargo"),
      dirigidoNombre: str(formData, "dirigido_nombre"),
      dirigidoContacto: str(formData, "dirigido_contacto"),
      dirigidoCargo: str(formData, "dirigido_cargo"),
      periodoDesde,
      periodoHasta,
      padresAlcanzados: int(formData, "padres_alcanzados"),
      desarrolloResumen: str(formData, "desarrollo_resumen"),
      actividadesDece: str(formData, "actividades_dece"),
      buenasPracticas: str(formData, "buenas_practicas"),
      nudosCriticos: str(formData, "nudos_criticos"),
      conclusiones: str(formData, "conclusiones"),
      recomendaciones: str(formData, "recomendaciones"),
      createdBy: session.user.id,
    });
  } catch (err: any) {
    return { error: err?.message || "Ocurrió un error al generar el informe." };
  }

  logAudit({ userId: session.user.id, action: "CREAR", entityType: "EneisInforme", entityId: id, institutionId });
  revalidatePath("/eneis/informe");
  redirect(`/eneis/informe/${id}`);
}

export async function deleteEneisInformeAction(id: string): Promise<void | { error: string }> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  deleteInforme(id, institutionId);
  logAudit({ userId: session.user.id, action: "BORRAR", entityType: "EneisInforme", entityId: id, institutionId });
  revalidatePath("/eneis/informe");
}

export async function refreshEneisInformeTablasAction(id: string): Promise<void> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  refreshInformeTablas(id, institutionId);
  revalidatePath(`/eneis/informe/${id}`);
}
