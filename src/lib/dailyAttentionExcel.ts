import ExcelJS from "exceljs";
import type { DailyAttentionRow, InstitutionRow } from "@/lib/types";
import {
  actionAxisOptionsFor,
  parseStringList,
  type AttendeeType,
} from "@/lib/dailyAttention";

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d;
}

export async function generateDailyAttentionExcel(params: {
  institution: InstitutionRow;
  tipo: AttendeeType;
  entries: DailyAttentionRow[];
  mes?: string;
  professionalName?: string;
}): Promise<Buffer> {
  const { institution, tipo, entries, mes, professionalName } = params;
  const axisOptions = actionAxisOptionsFor(tipo);

  const titleByType: Record<AttendeeType, string> = {
    ESTUDIANTE: "REGISTRO DE ATENCIÓN A ESTUDIANTES",
    REPRESENTANTE: "REGISTRO DE ATENCIÓN A PADRES, MADRES Y REPRESENTANTES LEGALES",
    DOCENTE_AUTORIDAD: "REGISTRO DE ATENCIÓN A PERSONAL DOCENTE Y AUTORIDADES",
  };

  const periodLabel = mes
    ? `Período: ${mes}`
    : "Período: Todos los registros del año lectivo en curso";

  const wb = new ExcelJS.Workbook();
  wb.creator = "DECE App";
  wb.created = new Date();

  const sheetName =
    tipo === "ESTUDIANTE"
      ? "Atención Estudiantes"
      : tipo === "REPRESENTANTE"
      ? "Atención Representantes"
      : "Atención Docentes";

  const ws = wb.addWorksheet(sheetName, {
    pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1 },
  });

  const NAVY = "2F5496";
  const SOFT_BLUE = "D9E1F2";
  const ZEBRA_BG = "F2F5F9";
  const BORDER_COLOR = "B0C4DE";

  const borderThin: Partial<ExcelJS.Border> = {
    style: "thin",
    color: { argb: `FF${BORDER_COLOR}` },
  };

  const cellBorders: Partial<ExcelJS.Borders> = {
    top: borderThin,
    bottom: borderThin,
    left: borderThin,
    right: borderThin,
  };

  // Row 1: Institution Name
  const r1 = ws.addRow([institution.name.toUpperCase()]);
  r1.height = 24;
  r1.font = { name: "Calibri", size: 14, bold: true, color: { argb: `FF${NAVY}` } };
  r1.alignment = { horizontal: "center", vertical: "middle" };

  // Row 2: Document Title
  const r2 = ws.addRow([titleByType[tipo]]);
  r2.height = 20;
  r2.font = { name: "Calibri", size: 12, bold: true, color: { argb: "FF1F3864" } };
  r2.alignment = { horizontal: "center", vertical: "middle" };

  // Row 3: Subtitle & Period
  const r3 = ws.addRow([`Departamento de Consejería Estudiantil (DECE)  |  ${periodLabel}`]);
  r3.height = 18;
  r3.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF595959" } };
  r3.alignment = { horizontal: "center", vertical: "middle" };

  // Row 4: Empty spacer
  ws.addRow([]);

  // Column definitions for Table Header
  const headers: string[] = ["N°", tipo === "DOCENTE_AUTORIDAD" ? "Fecha / Duración" : "Fecha"];
  if (tipo === "DOCENTE_AUTORIDAD") headers.push("Docente / Autoridad");
  if (tipo === "REPRESENTANTE") headers.push("Representante");
  headers.push("Estudiante", "Grado / Paralelo", "Jornada");
  headers.push(tipo === "REPRESENTANTE" ? "Motivo Asistencia" : "Motivo Atención");

  for (const o of axisOptions) {
    headers.push(o.label);
  }

  headers.push("Medio Tecnológico / Firma");
  if (tipo === "DOCENTE_AUTORIDAD") headers.push("¿Ficha detección?");
  headers.push("Observaciones");

  // Merge title rows across the table width
  const totalCols = headers.length;
  ws.mergeCells(1, 1, 1, totalCols);
  ws.mergeCells(2, 1, 2, totalCols);
  ws.mergeCells(3, 1, 3, totalCols);

  // Row 5: Table Header
  const headerRow = ws.addRow(headers);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${NAVY}` },
    };
    cell.font = {
      name: "Calibri",
      size: 9.5,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    cell.border = {
      top: { style: "medium", color: { argb: "FF1F3864" } },
      bottom: { style: "medium", color: { argb: "FF1F3864" } },
      left: borderThin,
      right: borderThin,
    };
  });

  // Data rows
  entries.forEach((e, idx) => {
    const axis = parseStringList(e.action_axis);
    const isEven = idx % 2 === 0;
    const bg = isEven ? ZEBRA_BG : "FFFFFF";

    const dateVal = `${fmtDate(e.attention_date)}${e.duration ? ` (${e.duration})` : ""}`;
    const rowValues: (string | number)[] = [idx + 1, dateVal];

    if (tipo === "DOCENTE_AUTORIDAD") rowValues.push(e.attendee_name || "—");
    if (tipo === "REPRESENTANTE") rowValues.push(e.representative_name || "—");

    rowValues.push(
      e.student_name || "—",
      e.student_grade || "—",
      e.jornada || "—",
      e.reason
    );

    for (const o of axisOptions) {
      rowValues.push(axis.includes(o.value) ? "X" : "");
    }

    const modalityDetails = [
      e.modality_tech ? `Medio: ${e.modality_tech}` : "",
      e.modality_phone ? `Telf: ${e.modality_phone}` : "",
      e.modality_signed ? "Firma: Sí" : "",
    ]
      .filter(Boolean)
      .join(" | ");

    rowValues.push(modalityDetails || "Presencial");
    if (tipo === "DOCENTE_AUTORIDAD") rowValues.push(e.has_detection_sheet || "NO");
    rowValues.push(e.observations || "—");

    const row = ws.addRow(rowValues);
    row.height = 22;

    row.eachCell((cell, colNumber) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: `FF${bg}` },
      };
      cell.font = { name: "Calibri", size: 9, color: { argb: "FF262626" } };
      cell.border = cellBorders;

      // Alignments: center for N°, date, grade, jornada, axes, ficha
      const isCenterCol =
        colNumber === 1 || // N°
        colNumber === 2 || // Fecha
        colNumber === (tipo === "ESTUDIANTE" ? 4 : 5) || // Grado
        colNumber === (tipo === "ESTUDIANTE" ? 5 : 6); // Jornada

      const axisStartCol = tipo === "ESTUDIANTE" ? 7 : 8;
      const axisEndCol = axisStartCol + axisOptions.length - 1;
      const isAxisCol = colNumber >= axisStartCol && colNumber <= axisEndCol;

      if (isCenterCol || isAxisCol) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        if (isAxisCol && cell.value === "X") {
          cell.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: `FF${NAVY}` } };
        }
      } else {
        cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
      }
    });
  });

  // Footer spacing
  ws.addRow([]);
  ws.addRow([]);

  // Signature Block
  const sigRowIdx = ws.rowCount + 1;
  const colHalf1 = Math.floor(totalCols / 4);
  const colHalf2 = Math.floor((totalCols * 3) / 4);

  const rSig1 = ws.addRow([]);
  rSig1.getCell(colHalf1).value = "____________________________________________";
  rSig1.getCell(colHalf1).alignment = { horizontal: "center" };
  rSig1.getCell(colHalf2).value = "____________________________________________";
  rSig1.getCell(colHalf2).alignment = { horizontal: "center" };

  const rSig2 = ws.addRow([]);
  rSig2.getCell(colHalf1).value = professionalName || "PROFESIONAL DEL DECE";
  rSig2.getCell(colHalf1).font = { name: "Calibri", size: 9.5, bold: true, color: { argb: `FF${NAVY}` } };
  rSig2.getCell(colHalf1).alignment = { horizontal: "center" };
  rSig2.getCell(colHalf2).value = "AUTORIDAD INSTITUCIONAL / RECTORADO";
  rSig2.getCell(colHalf2).font = { name: "Calibri", size: 9.5, bold: true, color: { argb: `FF${NAVY}` } };
  rSig2.getCell(colHalf2).alignment = { horizontal: "center" };

  const rSig3 = ws.addRow([]);
  rSig3.getCell(colHalf1).value = "Responsable de Registro y Atención";
  rSig3.getCell(colHalf1).font = { name: "Calibri", size: 8.5, color: { argb: "FF595959" } };
  rSig3.getCell(colHalf1).alignment = { horizontal: "center" };
  rSig3.getCell(colHalf2).value = "Supervisión y Control de Gestión DECE";
  rSig3.getCell(colHalf2).font = { name: "Calibri", size: 8.5, color: { argb: "FF595959" } };
  rSig3.getCell(colHalf2).alignment = { horizontal: "center" };

  // Set explicit column widths
  ws.getColumn(1).width = 6; // N°
  ws.getColumn(2).width = 15; // Fecha
  let cIdx = 3;
  if (tipo !== "ESTUDIANTE") {
    ws.getColumn(cIdx++).width = 24; // Docente / Rep
  }
  ws.getColumn(cIdx++).width = 24; // Estudiante
  ws.getColumn(cIdx++).width = 14; // Grado
  ws.getColumn(cIdx++).width = 12; // Jornada
  ws.getColumn(cIdx++).width = 28; // Motivo

  for (let i = 0; i < axisOptions.length; i++) {
    ws.getColumn(cIdx++).width = 14; // Axis
  }

  ws.getColumn(cIdx++).width = 22; // Medio
  if (tipo === "DOCENTE_AUTORIDAD") ws.getColumn(cIdx++).width = 12; // Ficha
  ws.getColumn(cIdx++).width = 24; // Observaciones

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
