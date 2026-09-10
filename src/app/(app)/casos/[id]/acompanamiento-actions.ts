"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { requireOwnedCase } from "@/lib/scopedDb";
import { logAudit } from "@/lib/audit";
import { str, getAllStr } from "@/lib/formData";
import { assignNextReportNumber } from "@/lib/reportNumbering";
import { autoMarkChecklistItems } from "@/lib/checklistAutoMark";
import { draftText, isAiConfigured } from "@/lib/ai";
import {
  ACCOMPANIMENT_AI_LABELS,
  PSYCHOSOCIAL_REFERRAL_OPTIONS,
  EXT_REFERRAL_INSTANCES,
  type IndicatorsData,
  type RiskProtectionData,
} from "@/lib/accompanimentReport";
import type { CaseAccompanimentReportRow } from "@/lib/types";

const TEXT_COLUMNS = [
  "report_date", "professional_managing", "professional_signing", "signing_date",
  "student_full_name", "student_birth_day", "student_birth_month", "student_birth_year",
  "student_age", "student_nationality", "student_document_id", "student_grade", "student_jornada",
  "rep_full_name", "rep_document_id", "rep_relationship", "rep_address", "rep_phone_cell", "rep_phone_landline",
  "family_situation", "academic_performance", "accompaniment_actions",
] as const;

function collectIndicators(fd: FormData): IndicatorsData {
  return {
    signos_fisicos: getAllStr(fd, "signos_fisicos"),
    signos_fisicos_otros: str(fd, "signos_fisicos_otros") || "",
    signos_comportamiento: getAllStr(fd, "signos_comportamiento"),
    signos_comportamiento_otros: str(fd, "signos_comportamiento_otros") || "",
    conductas_ie: getAllStr(fd, "conductas_ie"),
    conductas_ie_otros: str(fd, "conductas_ie_otros") || "",
  };
}
function collectRisk(fd: FormData): RiskProtectionData {
  const g = (k: string) => getAllStr(fd, k);
  const s = (k: string) => str(fd, k) || "";
  return {
    personales_riesgo: g("personales_riesgo"), personales_riesgo_otros: s("personales_riesgo_otros"),
    personales_proteccion: g("personales_proteccion"), personales_proteccion_otros: s("personales_proteccion_otros"),
    familiares_riesgo: g("familiares_riesgo"), familiares_riesgo_otros: s("familiares_riesgo_otros"),
    familiares_proteccion: g("familiares_proteccion"), familiares_proteccion_otros: s("familiares_proteccion_otros"),
    situacionales_riesgo: g("situacionales_riesgo"), situacionales_riesgo_otros: s("situacionales_riesgo_otros"),
    situacionales_proteccion: g("situacionales_proteccion"), situacionales_proteccion_otros: s("situacionales_proteccion_otros"),
  };
}
function collectReferrals(fd: FormData) {
  const ext = getAllStr(fd, "ext_referral").filter((x) => EXT_REFERRAL_INSTANCES.includes(x));
  const psySelected = getAllStr(fd, "psy_referral");
  const entries = PSYCHOSOCIAL_REFERRAL_OPTIONS.filter((o) => psySelected.includes(o)).map((o) => ({
    option: o,
    name: str(fd, `psy_name_${PSYCHOSOCIAL_REFERRAL_OPTIONS.indexOf(o)}`) || "",
  }));
  return {
    ext_referral_json: JSON.stringify({ selected: ext }),
    psychosocial_referral_json: JSON.stringify({ entries }),
  };
}

function payloadFrom(fd: FormData): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const c of TEXT_COLUMNS) out[c] = str(fd, c);
  out.indicators_json = JSON.stringify(collectIndicators(fd));
  out.risk_protection_json = JSON.stringify(collectRisk(fd));
  const refs = collectReferrals(fd);
  out.ext_referral_json = refs.ext_referral_json;
  out.psychosocial_referral_json = refs.psychosocial_referral_json;
  out.restitution_plan_id = str(fd, "restitution_plan_id");
  return out;
}

export async function createAccompanimentReport(caseId: string, formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  requireOwnedCase(caseId, institutionId);

  const values = payloadFrom(formData);
  const { reportNumber } = assignNextReportNumber({
    institutionId,
    userId: session.user.id,
    userName: session.user.name,
    schoolYearText: null,
    reportType: "INFORME_TECNICO_ACOMPANAMIENTO",
    caseFileId: caseId,
  });

  const id = randomUUID();
  const cols = Object.keys(values);
  db.prepare(
    `INSERT INTO case_accompaniment_reports (id, case_file_id, institution_id, created_by_id, report_number, ${cols.join(", ")})
     VALUES (@id, @case_file_id, @institution_id, @created_by_id, @report_number, ${cols.map((c) => `@${c}`).join(", ")})`
  ).run({ id, case_file_id: caseId, institution_id: institutionId, created_by_id: session.user.id, report_number: reportNumber, ...values });

  db.prepare(
    "INSERT INTO case_actions (id, case_file_id, author_id, type, description) VALUES (?, ?, ?, 'Informe técnico de acompañamiento', ?)"
  ).run(randomUUID(), caseId, session.user.id, `Informe técnico de acompañamiento a víctimas de violencia emitido (N° ${reportNumber}).`);
  db.prepare("UPDATE case_files SET updated_at = datetime('now') WHERE id = ?").run(caseId);
  autoMarkChecklistItems(caseId, ["acompañamiento a"], "Informe técnico de acompañamiento");
  autoMarkChecklistItems(caseId, ["informe tecnico de acompanamiento"], "Informe técnico de acompañamiento");

  logAudit({ userId: session.user.id, action: "CREAR", entityType: "AccompanimentReport", entityId: id, details: caseId, institutionId });
  revalidatePath(`/casos/${caseId}`);
  redirect(`/casos/${caseId}/acompanamiento-tecnico/${id}/imprimir`);
}

export async function updateAccompanimentReport(reportId: string, caseId: string, formData: FormData) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  requireOwnedCase(caseId, institutionId);
  const existing = db
    .prepare("SELECT id FROM case_accompaniment_reports WHERE id = ? AND case_file_id = ? AND institution_id = ?")
    .get(reportId, caseId, institutionId) as { id: string } | undefined;
  if (!existing) throw new Error("Informe no encontrado.");

  const values = payloadFrom(formData);
  const cols = Object.keys(values);
  db.prepare(
    `UPDATE case_accompaniment_reports SET ${cols.map((c) => `${c} = @${c}`).join(", ")}, updated_at = datetime('now')
     WHERE id = @id AND case_file_id = @case_file_id`
  ).run({ id: reportId, case_file_id: caseId, ...values });

  logAudit({ userId: session.user.id, action: "EDITAR", entityType: "AccompanimentReport", entityId: reportId, details: caseId, institutionId });
  revalidatePath(`/casos/${caseId}`);
  redirect(`/casos/${caseId}/acompanamiento-tecnico/${reportId}/imprimir`);
}

export async function deleteAccompanimentReport(reportId: string, caseId: string) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  requireOwnedCase(caseId, institutionId);
  db.prepare("DELETE FROM case_accompaniment_reports WHERE id = ? AND case_file_id = ? AND institution_id = ?").run(reportId, caseId, institutionId);
  logAudit({ userId: session.user.id, action: "BORRAR", entityType: "AccompanimentReport", entityId: reportId, institutionId });
  revalidatePath(`/casos/${caseId}`);
  redirect(`/casos/${caseId}`);
}

export async function draftAccompanimentField(
  caseId: string,
  fieldKey: keyof typeof ACCOMPANIMENT_AI_LABELS,
  currentText: string
): Promise<{ text?: string; error?: string }> {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  if (!isAiConfigured()) return { error: "La ayuda de IA todavía no está configurada." };
  try {
    requireOwnedCase(caseId, institutionId);
  } catch {
    return { error: "Caso no encontrado." };
  }
  const label = ACCOMPANIMENT_AI_LABELS[fieldKey];
  if (!label) return { error: "Campo no válido." };

  // Contexto breve del caso (la seudonimización del choke-point de ai.ts se
  // encarga de los nombres/cédulas antes de enviar a la IA).
  let context = "";
  try {
    const cf = db
      .prepare("SELECT risk_type, description FROM case_files WHERE id = ? AND institution_id = ?")
      .get(caseId, institutionId) as { risk_type: string; description: string } | undefined;
    const st = db
      .prepare("SELECT s.full_name, s.course, s.parallel, s.birth_date FROM case_files cf JOIN students s ON s.id = cf.student_id WHERE cf.id = ?")
      .get(caseId) as { full_name: string; course: string; parallel: string | null; birth_date: string | null } | undefined;
    const acts = db
      .prepare("SELECT type, description FROM case_actions WHERE case_file_id = ? ORDER BY date DESC LIMIT 8")
      .all(caseId) as { type: string; description: string }[];
    context = [
      cf ? `Tipo de riesgo del caso: ${cf.risk_type}` : "",
      cf?.description ? `Descripción del caso: ${cf.description}` : "",
      st ? `Estudiante: ${st.full_name}, ${st.course} ${st.parallel || ""}` : "",
      acts.length ? "Acciones registradas en el caso: " + acts.map((a) => `${a.type} — ${a.description}`).join("; ") : "",
    ]
      .filter(Boolean)
      .join("\n");
  } catch {
    context = "";
  }

  // Si vincula un plan de acompañamiento y restitución, se añade su resumen.
  const plan = db
    .prepare(
      "SELECT risk_factors, accompaniment_actions, legal_instances FROM case_restitution_plans WHERE case_file_id = ? ORDER BY created_at DESC LIMIT 1"
    )
    .get(caseId) as { risk_factors: string | null; accompaniment_actions: string | null; legal_instances: string | null } | undefined;
  if (plan && fieldKey === "accompaniment_actions") {
    try {
      const acts = JSON.parse(plan.accompaniment_actions || "[]") as Array<Record<string, string>>;
      if (acts.length) {
        context +=
          "\nAcciones registradas en el plan de acompañamiento y restitución: " +
          acts
            .map((a) => `${a.categoria || ""} (ejecuta ${a.ejecutor || "?"}, desde ${a.fecha_inicio || "?"}${a.fecha_fin ? " hasta " + a.fecha_fin : ""})`)
            .join("; ");
      }
    } catch {
      /* noop */
    }
  }

  const result = await draftText({ fieldLabel: label, context, currentText: currentText || "" });
  if ("error" in result) return { error: result.error };
  return { text: result.text };
}
