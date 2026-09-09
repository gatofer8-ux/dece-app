import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { parseActionPlanItems, parseActionPlanAnalysts, parseActionPlanSignatories } from "@/lib/actionPlan";
import type { ActionPlanRow, ActionPlanSignatory } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireRole(["ADMIN", "DECE", "AUTORIDAD", "DISTRITO"]);
  const institutionId = session.user.role === "DISTRITO" ? null : requireInstitutionId(session);

  let query = "SELECT ap.*, i.name as inst_name FROM action_plans ap JOIN institutions i ON i.id = ap.institution_id WHERE ap.id = ?";
  const queryParams: any[] = [params.id];

  if (institutionId) {
    query += " AND ap.institution_id = ?";
    queryParams.push(institutionId);
  }

  const plan = db.prepare(query).get(...queryParams) as (ActionPlanRow & { inst_name: string }) | undefined;
  if (!plan) {
    return new NextResponse("Plan de Acción no encontrado", { status: 404 });
  }

  const items = parseActionPlanItems(plan.items_data);
  const analysts = parseActionPlanAnalysts(plan.analysts_data);
  const elaboratedList = parseActionPlanSignatories(plan.elaborated_by);
  const reviewed = plan.reviewed_by ? (JSON.parse(plan.reviewed_by) as ActionPlanSignatory) : null;
  const approved = plan.approved_by ? (JSON.parse(plan.approved_by) as ActionPlanSignatory) : null;

  const wb = new ExcelJS.Workbook();
  wb.creator = "DECE - Sistema de Gestión";
  wb.created = new Date();

  const ws = wb.addWorksheet("PLAN DE ACCION", {
    pageSetup: {
      orientation: "landscape",
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 }
    }
  });

  // Anchos de columnas
  ws.columns = [
    { width: 32 }, // A: Acción
    { width: 45 }, // B: Actividades
    { width: 26 }, // C: Población Objetivo
    { width: 38 }, // D: Logro esperado
    { width: 18 }, // E: Plazo de ejecución
    { width: 30 }, // F: Insumos
    { width: 22 }, // G: Responsable
    { width: 24 }, // H: Observación
  ];

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "000000" } },
    left: { style: "thin", color: { argb: "000000" } },
    bottom: { style: "thin", color: { argb: "000000" } },
    right: { style: "thin", color: { argb: "000000" } },
  };

  // Fila 1: Título Ministerio
  ws.mergeCells("A1:H1");
  const r1 = ws.getCell("A1");
  r1.value = "MINISTERIO DE EDUCACIÓN DEL ECUADOR";
  r1.font = { name: "Calibri", size: 11, bold: true, color: { argb: "1B365D" } };
  r1.alignment = { horizontal: "center", vertical: "middle" };

  // Fila 2: Título Plan de Acción
  ws.mergeCells("A2:H2");
  const r2 = ws.getCell("A2");
  r2.value = "PLAN DE ACCIÓN DEL DEPARTAMENTO DE CONSEJERÍA ESTUDIANTIL (DECE)";
  r2.font = { name: "Calibri", size: 14, bold: true, color: { argb: "000000" } };
  r2.alignment = { horizontal: "center", vertical: "middle" };

  // Fila 3: Institución
  ws.mergeCells("A4:B4");
  ws.getCell("A4").value = "Nombre de la Institución Educativa:";
  ws.getCell("A4").font = { bold: true };
  ws.getCell("A4").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F2F2F2" } };
  ws.getCell("A4").border = borderAll;

  ws.mergeCells("C4:H4");
  ws.getCell("C4").value = plan.inst_name.toUpperCase();
  ws.getCell("C4").font = { bold: true };
  ws.getCell("C4").border = borderAll;

  // Fila 4 y 5: Personal Responsable
  ws.mergeCells("A5:A6");
  ws.getCell("A5").value = "Personal responsable de la planificación";
  ws.getCell("A5").font = { bold: true };
  ws.getCell("A5").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F2F2F2" } };
  ws.getCell("A5").alignment = { vertical: "middle" };
  ws.getCell("A5").border = borderAll;

  ws.mergeCells("B5:C5");
  ws.getCell("B5").value = "Coordinador";
  ws.getCell("B5").font = { bold: true };
  ws.getCell("B5").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F2F2F2" } };
  ws.getCell("B5").border = borderAll;

  ws.mergeCells("D5:H5");
  ws.getCell("D5").value = "Analistas";
  ws.getCell("D5").font = { bold: true };
  ws.getCell("D5").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F2F2F2" } };
  ws.getCell("D5").border = borderAll;

  ws.mergeCells("B6:C6");
  ws.getCell("B6").value = plan.coordinator_name;
  ws.getCell("B6").border = borderAll;

  ws.mergeCells("D6:H6");
  ws.getCell("D6").value = analysts.map((a, i) => `${i + 1}. ${a.name}`).join("\n");
  ws.getCell("D6").alignment = { wrapText: true };
  ws.getCell("D6").border = borderAll;

  // Fila 6: Período y Estudiantes
  ws.getCell("A7").value = "Período lectivo:";
  ws.getCell("A7").font = { bold: true };
  ws.getCell("A7").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F2F2F2" } };
  ws.getCell("A7").border = borderAll;

  ws.mergeCells("B7:C7");
  ws.getCell("B7").value = plan.school_year_text;
  ws.getCell("B7").border = borderAll;

  ws.getCell("D7").value = "Número de estudiantes a atender:";
  ws.getCell("D7").font = { bold: true };
  ws.getCell("D7").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F2F2F2" } };
  ws.getCell("D7").border = borderAll;

  ws.mergeCells("E7:H7");
  ws.getCell("E7").value = plan.students_count;
  ws.getCell("E7").font = { bold: true };
  ws.getCell("E7").border = borderAll;

  // Fila Encabezados de Tabla
  const headerRowIdx = 9;
  const headers = [
    "Acción",
    "Actividades",
    "Población Objetivo",
    "Logro esperado (Estándar de Calidad)",
    "Plazo de ejecución",
    "Insumos",
    "Responsable",
    "Observación",
  ];
  const hr = ws.getRow(headerRowIdx);
  headers.forEach((h, i) => {
    const cell = hr.getCell(i + 1);
    cell.value = h;
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "1B365D" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = borderAll;
  });
  hr.height = 28;

  let currentIdx = headerRowIdx + 1;

  // Renderizado de las filas
  items.forEach((item, idx) => {
    const isFirstOfDimension = idx === 0 || items[idx - 1].dimension !== item.dimension;
    const isFirstOfComponent = idx === 0 || items[idx - 1].component !== item.component;

    if (isFirstOfDimension) {
      ws.mergeCells(`A${currentIdx}:H${currentIdx}`);
      const dimCell = ws.getCell(`A${currentIdx}`);
      dimCell.value = item.dimension;
      dimCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFF" } };
      dimCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "1B365D" } };
      dimCell.alignment = { vertical: "middle", indent: 1 };
      dimCell.border = borderAll;
      ws.getRow(currentIdx).height = 24;
      currentIdx++;
    }

    if (isFirstOfComponent) {
      ws.mergeCells(`A${currentIdx}:H${currentIdx}`);
      const compCell = ws.getCell(`A${currentIdx}`);
      compCell.value = item.component;
      compCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "000000" } };
      compCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "D9E1F2" } };
      compCell.alignment = { vertical: "middle", indent: 1 };
      compCell.border = borderAll;
      ws.getRow(currentIdx).height = 20;
      currentIdx++;
    }

    const row = ws.getRow(currentIdx);
    row.getCell(1).value = item.action;
    row.getCell(2).value = item.activities;
    row.getCell(3).value = item.target_population;
    row.getCell(4).value = item.expected_goal_standard;
    row.getCell(5).value = item.execution_term;
    row.getCell(6).value = item.supplies_inputs;
    row.getCell(7).value = item.responsible;
    row.getCell(8).value = item.observations;

    for (let c = 1; c <= 8; c++) {
      const cell = row.getCell(c);
      cell.font = { name: "Calibri", size: 10 };
      cell.alignment = {
        vertical: "top",
        wrapText: true,
        horizontal: c === 5 || c === 7 ? "center" : "left",
      };
      cell.border = borderAll;
    }

    currentIdx++;
  });

  // Fila Evaluación y Ajustes
  currentIdx++;
  ws.mergeCells(`A${currentIdx}:H${currentIdx}`);
  const evalHead = ws.getCell(`A${currentIdx}`);
  evalHead.value = "Evaluación y ajustes:";
  evalHead.font = { bold: true };
  evalHead.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F2F2F2" } };
  evalHead.border = borderAll;
  currentIdx++;

  ws.mergeCells(`A${currentIdx}:H${currentIdx + 2}`);
  const evalBody = ws.getCell(`A${currentIdx}`);
  evalBody.value = plan.evaluation_notes || "Planificación ejecutada en función de los lineamientos vigentes del Ministerio de Educación.";
  evalBody.alignment = { vertical: "top", wrapText: true };
  evalBody.border = borderAll;
  currentIdx += 4;

  // Firmas de Responsabilidad
  ws.mergeCells(`A${currentIdx}:B${currentIdx}`);
  ws.getCell(`A${currentIdx}`).value = "ELABORACIÓN";
  ws.getCell(`A${currentIdx}`).font = { bold: true };
  ws.getCell(`A${currentIdx}`).alignment = { horizontal: "center" };
  ws.getCell(`A${currentIdx}`).border = borderAll;

  ws.mergeCells(`C${currentIdx}:E${currentIdx}`);
  ws.getCell(`C${currentIdx}`).value = "REVISIÓN";
  ws.getCell(`C${currentIdx}`).font = { bold: true };
  ws.getCell(`C${currentIdx}`).alignment = { horizontal: "center" };
  ws.getCell(`C${currentIdx}`).border = borderAll;

  ws.mergeCells(`F${currentIdx}:H${currentIdx}`);
  ws.getCell(`F${currentIdx}`).value = "APROBACIÓN";
  ws.getCell(`F${currentIdx}`).font = { bold: true };
  ws.getCell(`F${currentIdx}`).alignment = { horizontal: "center" };
  ws.getCell(`F${currentIdx}`).border = borderAll;

  currentIdx++;

  ws.mergeCells(`A${currentIdx}:B${currentIdx + 3}`);
  const elCell = ws.getCell(`A${currentIdx}`);
  elCell.value = elaboratedList.map((e) => `${e.name}\n${e.role}`).join("\n\n");
  elCell.alignment = { vertical: "top", wrapText: true };
  elCell.border = borderAll;

  ws.mergeCells(`C${currentIdx}:E${currentIdx + 3}`);
  const revCell = ws.getCell(`C${currentIdx}`);
  revCell.value = `${reviewed?.name || plan.coordinator_name}\n${reviewed?.role || "COORDINADORA DECE"}`;
  revCell.alignment = { vertical: "top", wrapText: true };
  revCell.border = borderAll;

  ws.mergeCells(`F${currentIdx}:H${currentIdx + 3}`);
  const appCell = ws.getCell(`F${currentIdx}`);
  appCell.value = `${approved?.name || "Mg. Rectora"}\n${approved?.role || "RECTORA DE LA INSTITUCIÓN"}`;
  appCell.alignment = { vertical: "top", wrapText: true };
  appCell.border = borderAll;

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `Plan_Accion_DECE_${plan.school_year_text.replace(/\s+/g, "_")}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
