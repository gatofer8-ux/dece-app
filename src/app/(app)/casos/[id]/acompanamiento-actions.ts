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
import {
  studentGradeLabel,
  isBachilleratoStudent,
  getBachilleratoSpecialty,
} from "@/lib/studentCourse";
import type { CaseAccompanimentReportRow } from "@/lib/types";

const TEXT_COLUMNS = [
  "report_date", "professional_managing", "professional_signing", "signing_date",
  "student_full_name", "student_birth_day", "student_birth_month", "student_birth_year",
  "student_age", "student_nationality", "student_document_id", "student_grade", "student_jornada",
  "rep_full_name", "rep_document_id", "rep_relationship", "rep_address", "rep_phone_cell", "rep_phone_landline",
  "family_situation", "academic_performance", "accompaniment_actions",
  "signatures_json", "signature_type", "physical_file_ref", "physical_evidence_url",
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

  let context = "";
  try {
    const cf = db
      .prepare("SELECT risk_type, description, detection_date, detection_source, code FROM case_files WHERE id = ? AND institution_id = ?")
      .get(caseId, institutionId) as { risk_type: string; description: string; detection_date?: string; detection_source?: string; code?: string } | undefined;

    const st = db
      .prepare(`
        SELECT s.full_name, s.course, s.parallel, s.education_level, s.bachillerato_specialty,
               s.document_id, s.birth_date, s.gender, s.jornada, s.nationality,
               s.representative, s.rep_phone, s.representative_document_id, s.lives_with, s.address
        FROM case_files cf
        JOIN students s ON s.id = cf.student_id
        WHERE cf.id = ?
      `)
      .get(caseId) as any | undefined;

    let studentDetails = "";
    if (st) {
      const fullGrade = studentGradeLabel(st) || [st.course, st.parallel].filter(Boolean).join(" ");
      const isBach = isBachilleratoStudent(st);
      const specialty = isBach ? getBachilleratoSpecialty(st) : "";

      let ageStr = "";
      if (st.birth_date) {
        const t = new Date(st.birth_date).getTime();
        if (!Number.isNaN(t)) {
          const age = Math.floor((Date.now() - t) / (365.25 * 24 * 3600 * 1000));
          if (age >= 0 && age < 100) ageStr = `${age} años`;
        }
      }

      studentDetails = [
        `DATOS DE IDENTIFICACIÓN DEL ESTUDIANTE (Deben constar con rigor en la redacción):`,
        `- Nombres y apellidos completos: ${st.full_name}`,
        `- Documento de identidad (C.I.): ${st.document_id || "s/n"}`,
        `- Edad: ${ageStr || "s/n"}${st.birth_date ? ` (Fecha de nacimiento: ${st.birth_date})` : ""}`,
        `- Nivel Educativo: ${isBach ? "BACHILLERATO" : (st.education_level || "Educación General Básica (EGB)")}`,
        `- Pertenece a Bachillerato: ${isBach ? "SÍ (Estudiante de nivel Bachillerato)" : "NO (Educación General Básica - EGB)"}`,
        isBach ? `- Especialidad / Figura Profesional de Bachillerato: ${specialty}` : "",
        `- Grado / Curso oficial: ${fullGrade}`,
        `- Jornada: ${st.jornada || "Matutina"}`,
        `- Representante legal: ${st.representative || "s/n"}${st.rep_phone ? ` (Teléfono: ${st.rep_phone})` : ""}`,
        st.lives_with ? `- Convivencia familiar: vive con ${st.lives_with}` : "",
        st.address ? `- Domicilio: ${st.address}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    }

    const caseActions = db
      .prepare(`
        SELECT date, type, description, created_at
        FROM case_actions
        WHERE case_file_id = ?
        ORDER BY date ASC, created_at ASC
      `)
      .all(caseId) as { date: string | null; type: string; description: string; created_at?: string }[];

    const esquelas = db
      .prepare(`
        SELECT citation_number, citation_date, citation_time, citation_reason, citation_place
        FROM dece_esquelas
        WHERE case_file_id = ?
        ORDER BY citation_date ASC
      `)
      .all(caseId) as any[];

    const plan = db
      .prepare("SELECT * FROM case_restitution_plans WHERE case_file_id = ? ORDER BY created_at DESC LIMIT 1")
      .get(caseId) as any;

    const actionItems: string[] = [];
    for (const act of caseActions) {
      const d = act.date ? act.date.slice(0, 10) : "";
      actionItems.push(`• ${d ? `[Fecha: ${d}] ` : ""}${act.type}: ${act.description}`);
    }
    for (const esq of esquelas) {
      const d = esq.citation_date ? esq.citation_date.slice(0, 10) : "";
      actionItems.push(
        `• ${d ? `[Fecha: ${d}] ` : ""}Convocatoria DECE N° ${esq.citation_number} (Hora: ${esq.citation_time || "08:30"} en ${esq.citation_place || "DECE"}): ${esq.citation_reason}`
      );
    }
    if (plan?.accompaniment_actions) {
      try {
        const planActs = JSON.parse(plan.accompaniment_actions) as any[];
        for (const pa of planActs) {
          const fIni = pa.fecha_inicio || "";
          const fFin = pa.fecha_fin ? ` hasta ${pa.fecha_fin}` : "";
          actionItems.push(
            `• ${fIni ? `[Fecha: desde ${fIni}${fFin}] ` : ""}${pa.categoria || "Acción planificada"}: a cargo de ${pa.ejecutor || "DECE"}. ${pa.descripcion || pa.accion || ""}`
          );
        }
      } catch {
        /* noop */
      }
    }

    const actionsText = actionItems.length
      ? `HISTORIAL DE ACCIONES DE ACOMPAÑAMIENTO REALIZADAS (CON FECHAS OBLIGATORIAS):\n${actionItems.join("\n")}`
      : `HISTORIAL DE ACCIONES: Caso detectado el ${cf?.detection_date || new Date().toISOString().slice(0, 10)}.`;

    context = [
      `EXPEDIENTE DEL CASO: Código ${cf?.code || "s/n"} | Tipo de riesgo: ${cf?.risk_type || ""}`,
      cf?.description ? `Descripción / motivo del caso: ${cf.description}` : "",
      cf?.detection_date ? `Fecha de detección: ${cf.detection_date}` : "",
      studentDetails,
      actionsText,
    ]
      .filter(Boolean)
      .join("\n\n");
  } catch {
    context = "";
  }

  const result = await draftText({ fieldLabel: label, context, currentText: currentText || "" });
  if ("error" in result) return { error: result.error };
  return { text: result.text };
}
