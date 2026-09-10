import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { getStatisticalReport, type StatQueryOptions } from "@/lib/statistics";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (
      !session?.user ||
      !["SUPERADMIN", "ADMIN", "DECE", "AUTORIDAD"].includes(session.user.role) ||
      !session.user.institution_id
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const institutionId = session.user.institution_id;

    const { searchParams } = new URL(req.url);
    const periodMode = (searchParams.get("periodMode") as any) || "MES";
    const universe = (searchParams.get("universe") as any) || "CASOS";
    const month = searchParams.get("month") || undefined;
    const trimester = (searchParams.get("trimester") as any) || undefined;
    const schoolYearId = searchParams.get("schoolYearId") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const opts: StatQueryOptions = {
      periodMode,
      universe,
      month,
      trimester,
      schoolYearId,
      startDate,
      endDate,
    };

    const report = getStatisticalReport(institutionId, opts);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Sistema de Gestión DECE Ecuador";
    workbook.created = new Date();

    const HEADER_FILL: ExcelJS.Fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "1F4E79" }, // Azul institucional oscuro
    };
    const HEADER_FONT: Partial<ExcelJS.Font> = {
      bold: true,
      color: { argb: "FFFFFF" },
      size: 11,
      name: "Calibri",
    };
    const SECTION_FILL: ExcelJS.Fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "D9E1F2" }, // Azul suave
    };
    const TOTAL_FILL: ExcelJS.Fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "E2EFDA" }, // Verde suave
    };
    const BORDER: Partial<ExcelJS.Borders> = {
      top: { style: "thin", color: { argb: "BFBFBF" } },
      bottom: { style: "thin", color: { argb: "BFBFBF" } },
      left: { style: "thin", color: { argb: "BFBFBF" } },
      right: { style: "thin", color: { argb: "BFBFBF" } },
    };

    // 1. Hoja Completa: "Cuadros Estadísticos"
    const mainSheet = workbook.addWorksheet("Todos los Cuadros");
    mainSheet.columns = [
      { width: 44 }, // A: Categoría
      { width: 14 }, // B: Femenino
      { width: 14 }, // C: Masculino
      { width: 14 }, // D: Otro
      { width: 16 }, // E: Total
      { width: 16 }, // F: % Incidencia
    ];

    // Banner principal
    mainSheet.addRow([report.institutionName.toUpperCase()]);
    mainSheet.getRow(1).font = { bold: true, size: 14, color: { argb: "1F4E79" } };

    mainSheet.addRow([`DEPARTAMENTO DE CONSEJERÍA ESTUDIANTIL (DECE) - CUADROS ESTADÍSTICOS`]);
    mainSheet.getRow(2).font = { bold: true, size: 12 };

    mainSheet.addRow([`Período de Análisis: ${report.periodLabel} | Universo: ${report.universe === "CASOS" ? "Casos Atendidos DECE" : "Población Estudiantil Total"}`]);
    mainSheet.getRow(3).font = { italic: true, size: 10, color: { argb: "595959" } };

    mainSheet.addRow([`Generado por: ${session.user.name} (${session.user.role}) - Fecha de Corte: ${new Date().toLocaleDateString("es-EC")}`]);
    mainSheet.getRow(4).font = { size: 9, color: { argb: "7F7F7F" } };
    mainSheet.addRow([]); // Fila vacía

    // Función auxiliar para imprimir cada tabla
    const addTableToSheet = (sheet: ExcelJS.Worksheet, table: typeof report.tables.byCourse, numeral: number) => {
      // Título del cuadro
      const titleRow = sheet.addRow([`${numeral}. ${table.title.toUpperCase()}`]);
      titleRow.font = { bold: true, size: 11, color: { argb: "1F4E79" } };
      sheet.mergeCells(`A${titleRow.number}:F${titleRow.number}`);
      titleRow.getCell(1).fill = SECTION_FILL;

      // Cabecera de columnas
      const headerRow = sheet.addRow([
        table.dimension,
        "Mujeres (F)",
        "Hombres (M)",
        "Otro / No esp.",
        "Total",
        "% Incidencia",
      ]);
      headerRow.font = HEADER_FONT;
      headerRow.alignment = { vertical: "middle", horizontal: "center" };
      headerRow.getCell(1).alignment = { vertical: "middle", horizontal: "left" };
      for (let c = 1; c <= 6; c++) {
        const cell = headerRow.getCell(c);
        cell.fill = HEADER_FILL;
        cell.border = BORDER;
      }

      // Filas de datos
      table.rows.forEach((row) => {
        const r = sheet.addRow([
          row.label,
          row.female,
          row.male,
          row.other,
          row.total,
          `${row.percentage}%`,
        ]);
        r.getCell(1).alignment = { horizontal: "left" };
        r.getCell(2).alignment = { horizontal: "right" };
        r.getCell(3).alignment = { horizontal: "right" };
        r.getCell(4).alignment = { horizontal: "right" };
        r.getCell(5).alignment = { horizontal: "right" };
        r.getCell(6).alignment = { horizontal: "right" };
        for (let c = 1; c <= 6; c++) {
          r.getCell(c).border = BORDER;
        }
      });

      // Fila de Total
      const totalRow = sheet.addRow([
        "TOTAL GENERAL",
        table.totalFemale,
        table.totalMale,
        table.totalOther,
        table.grandTotal,
        table.grandTotal > 0 ? "100.0%" : "0.0%",
      ]);
      totalRow.font = { bold: true, size: 11 };
      totalRow.getCell(1).alignment = { horizontal: "left" };
      for (let c = 1; c <= 6; c++) {
        const cell = totalRow.getCell(c);
        cell.fill = TOTAL_FILL;
        cell.border = BORDER;
        if (c > 1) cell.alignment = { horizontal: "right" };
      }

      sheet.addRow([]); // Separador
    };

    // Imprimir los 7 cuadros en la hoja consolidada
    const tablesList = [
      report.tables.byCourse,
      report.tables.byTypology,
      report.tables.byJornada,
      report.tables.byAge,
      report.tables.byGender,
      report.tables.byEthnicity,
      report.tables.byNationality,
    ];

    tablesList.forEach((tbl, idx) => {
      addTableToSheet(mainSheet, tbl, idx + 1);
    });

    // 2. Hojas individuales para cada una de las 7 tablas
    const sheetConfigs = [
      { name: "1. Cursos", tbl: report.tables.byCourse, num: 1 },
      { name: "2. Tipologías", tbl: report.tables.byTypology, num: 2 },
      { name: "3. Jornadas", tbl: report.tables.byJornada, num: 3 },
      { name: "4. Edades", tbl: report.tables.byAge, num: 4 },
      { name: "5. Sexo", tbl: report.tables.byGender, num: 5 },
      { name: "6. Etnia", tbl: report.tables.byEthnicity, num: 6 },
      { name: "7. Nacionalidad", tbl: report.tables.byNationality, num: 7 },
    ];

    sheetConfigs.forEach((cfg) => {
      const s = workbook.addWorksheet(cfg.name);
      s.columns = [
        { width: 44 },
        { width: 14 },
        { width: 14 },
        { width: 14 },
        { width: 16 },
        { width: 16 },
      ];
      s.addRow([report.institutionName.toUpperCase()]);
      s.getRow(1).font = { bold: true, size: 13, color: { argb: "1F4E79" } };
      s.addRow([`Cuadro Estadístico - ${cfg.tbl.dimension} (${report.periodLabel})`]);
      s.getRow(2).font = { italic: true, size: 10 };
      s.addRow([]);
      addTableToSheet(s, cfg.tbl, cfg.num);
    });

    logAudit({
      userId: session.user.id,
      action: "EXPORTAR",
      entityType: "CuadrosEstadisticos",
      details: `${report.periodLabel} (${report.universe})`,
      institutionId,
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const cleanPeriod = report.periodLabel.replace(/[/\\:*?"<>|]/g, "_").slice(0, 30);
    const filename = `Cuadros_Estadisticos_DECE_${cleanPeriod}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error("[export-excel-estadisticas] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Error al exportar cuadros estadísticos" },
      { status: 500 }
    );
  }
}
