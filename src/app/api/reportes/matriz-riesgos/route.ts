import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { CASE_STATUS_LABELS } from "@/lib/types";
import type { InstitutionRow, StudentRow, CaseFileRow, ViolenceReportRow, CaseRestitutionPlanRow, CaseCarePlanRow, RiskMatrixEntryRow } from "@/lib/types";
import {
  RISK_MATRIX_COLUMN_GROUPS,
  RISK_MATRIX_COLUMNS,
  computeAge,
  currentReportMonth,
  ACCOMPANIMENT_CATEGORY_TO_MATRIX_COLUMN,
} from "@/lib/riskMatrix";
import { parseJsonArray, legalInstanceLabel, type AccompanimentActionEntry, type LegalInstanceEntry } from "@/lib/restitutionPlan";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user || !["ADMIN", "DECE", "AUTORIDAD"].includes(session.user.role) || !session.user.institution_id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const institutionId = session.user.institution_id;

  const { searchParams } = new URL(req.url);
  const mes = searchParams.get("mes") || currentReportMonth();

  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;

  const entries = db
    .prepare(
      `SELECT * FROM case_risk_matrix_entries WHERE institution_id = ? AND report_month = ? ORDER BY created_at ASC`
    )
    .all(institutionId, mes) as RiskMatrixEntryRow[];

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistema de Gestión DECE";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Hoja1");

  // Fila 1 vacía (igual que la plantilla oficial), fila 2 = encabezados de
  // grupo (celdas combinadas), fila 3 = encabezado de cada columna.
  let colCursor = 1;
  for (const group of RISK_MATRIX_COLUMN_GROUPS) {
    const startCol = colCursor;
    const endCol = colCursor + group.span - 1;
    sheet.mergeCells(2, startCol, 2, endCol);
    const cell = sheet.getCell(2, startCol);
    cell.value = group.title;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    colCursor = endCol + 1;
  }
  RISK_MATRIX_COLUMNS.forEach((header, i) => {
    const cell = sheet.getCell(3, i + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
    sheet.getColumn(i + 1).width = 20;
  });
  sheet.getRow(2).height = 24;
  sheet.getRow(3).height = 42;

  let rowIndex = 4;
  for (const entry of entries) {
    const caseFile = db.prepare("SELECT * FROM case_files WHERE id = ?").get(entry.case_file_id) as CaseFileRow | undefined;
    if (!caseFile) continue;
    const student = db.prepare("SELECT * FROM students WHERE id = ?").get(caseFile.student_id) as StudentRow;
    const violenceReport = db
      .prepare("SELECT * FROM violence_reports WHERE case_file_id = ? ORDER BY report_date DESC, created_at DESC LIMIT 1")
      .get(caseFile.id) as ViolenceReportRow | undefined;
    const restitutionPlan = db
      .prepare("SELECT * FROM case_restitution_plans WHERE case_file_id = ? ORDER BY elaboration_date DESC, created_at DESC LIMIT 1")
      .get(caseFile.id) as CaseRestitutionPlanRow | undefined;
    const carePlan = db
      .prepare("SELECT * FROM case_care_plans WHERE case_file_id = ? ORDER BY plan_date DESC, created_at DESC LIMIT 1")
      .get(caseFile.id) as CaseCarePlanRow | undefined;

    const legalInstances = restitutionPlan ? parseJsonArray<LegalInstanceEntry>(restitutionPlan.legal_instances) : [];
    const fiscalia = legalInstances.find((i) => i.instancia === "FISCALIA");
    const jcpdna = legalInstances.find((i) => i.instancia === "JUNTA_CANTONAL");
    const protectionInstance = legalInstances[0];

    const accompanimentActions = restitutionPlan ? parseJsonArray<AccompanimentActionEntry>(restitutionPlan.accompaniment_actions) : [];
    const matrixColumnsMarked = new Set(
      accompanimentActions.map((a) => ACCOMPANIMENT_CATEGORY_TO_MATRIX_COLUMN[a.categoria]).filter(Boolean)
    );

    const hasAccompanimentPlan =
      entry.has_accompaniment_plan ||
      (restitutionPlan ? "Plan de Acompañamiento y Restitución de Derechos" : carePlan ? "Plan de Atención y Seguimiento Psicosocial" : "No");

    const row = [
      institution.zona || "",
      institution.district || "",
      institution.amie_code || "",
      institution.name,
      entry.case_type,
      entry.knowledge_date || "",
      entry.registered_by_name || "",
      entry.registered_by_role || "",
      student.document_id || "",
      student.full_name,
      `${student.course} ${student.parallel || ""}`.trim(),
      computeAge(student.birth_date) ?? "",
      student.gender || "",
      entry.student_ethnicity || student.ethnicity || "",
      entry.student_nationality || student.nationality || "",
      entry.student_has_disability || "",
      entry.student_disability_type || "",
      entry.student_gender_diversity || "",
      entry.student_other_conditions || "",
      student.representative || "",
      student.rep_phone || "",
      violenceReport?.perpetrator_document_id || "",
      violenceReport?.perpetrator_name || "",
      violenceReport?.perpetrator_age || "",
      violenceReport?.perpetrator_gender || "",
      violenceReport?.perpetrator_relationship || "",
      entry.file_lift_date || violenceReport?.report_date?.slice(0, 10) || "",
      entry.district_case_number || "",
      entry.district_intake_date || "",
      entry.protection_measures_institution || (protectionInstance ? legalInstanceLabel(protectionInstance.instancia) : ""),
      entry.protection_measures_description || legalInstances.map((i) => i.medidas).filter(Boolean).join("; ") || "",
      hasAccompanimentPlan,
      matrixColumnsMarked.has("PEDAGOGICO") ? "X" : "",
      matrixColumnsMarked.has("LEGAL") ? "X" : "",
      matrixColumnsMarked.has("SALUD") ? "X" : "",
      matrixColumnsMarked.has("COMUNITARIO") ? "X" : "",
      entry.fiscalia_complaint || (fiscalia ? "SI" : legalInstances.length ? "NO" : ""),
      entry.fiscalia_date || fiscalia?.fecha_denuncia || "",
      entry.fiscalia_number || fiscalia?.numero_denuncia || "",
      entry.jcpdna_complaint || (jcpdna ? "SI" : legalInstances.length ? "NO" : ""),
      entry.jcpdna_date || jcpdna?.fecha_denuncia || "",
      entry.case_current_status || CASE_STATUS_LABELS[caseFile.status],
      entry.observations || "",
    ];
    row.forEach((value, i) => {
      const cell = sheet.getCell(rowIndex, i + 1);
      cell.value = value as string | number;
      cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
      cell.alignment = { vertical: "top", wrapText: true };
    });
    rowIndex++;
  }

  const buffer = await workbook.xlsx.writeBuffer();

  logAudit({
    userId: session.user.id,
    action: "EXPORTAR",
    entityType: "MatrizRiesgosPsicosociales",
    details: mes,
    institutionId,
  });

  return new NextResponse(buffer as Buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="matriz_riesgos_psicosociales_${mes}.xlsx"`,
    },
  });
}
