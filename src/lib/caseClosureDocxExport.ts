import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  Header,
  ImageRun,
  Packer,
  AlignmentType,
  BorderStyle,
  WidthType,
  VerticalAlign,
  HorizontalPositionRelativeFrom,
  HorizontalPositionAlign,
  VerticalPositionRelativeFrom,
  VerticalPositionAlign,
} from "docx";
import path from "path";
import fs from "fs";
import type {
  CaseFileRow,
  StudentRow,
  InstitutionRow,
  CaseClosureReportRow,
} from "./types";
import type { BimonthlyConsolidatedItem } from "./caseClosureReport";

const COLOR_STEEL_BLUE = "366092";
const COLOR_BORDER = "366092";
const COLOR_GRAY_BORDER = "94A3B8";

function getMembreteBuffer(): Buffer | null {
  try {
    const p1 = path.join(process.cwd(), "public", "membrete_informe_cierre.png");
    if (fs.existsSync(p1)) return fs.readFileSync(p1);
    const p2 = path.join(
      process.cwd(),
      "..",
      "..",
      ".gemini",
      "antigravity",
      "brain",
      "4d9da568-28f9-4b45-b757-6aaa8baea100",
      "scratch",
      "informe_cierre_unpacked",
      "word",
      "media",
      "image1.png"
    );
    if (fs.existsSync(p2)) return fs.readFileSync(p2);
  } catch {
    // fallback
  }
  return null;
}

function textToParagraphs(text: string | null | undefined, size = 20, align = AlignmentType.JUSTIFIED): Paragraph[] {
  if (!text) return [new Paragraph({ text: "" })];
  return text.split("\n").map(
    (line) =>
      new Paragraph({
        alignment: align,
        children: [new TextRun({ text: line, size, font: "Calibri" })],
        spacing: { after: 100, line: 260 },
      })
  );
}

function createHeading(text: string, size = 22, spacingBefore = 200, spacingAfter = 100): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    children: [
      new TextRun({
        text,
        bold: true,
        size,
        font: "Calibri",
        color: "000000",
      }),
    ],
    spacing: { before: spacingBefore, after: spacingAfter },
  });
}

function createSubheading(text: string, size = 20): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    children: [
      new TextRun({
        text,
        bold: true,
        size,
        font: "Calibri",
        color: "000000",
      }),
    ],
    spacing: { before: 120, after: 80 },
  });
}

function createHeaderCell(
  text: string,
  opts: {
    columnSpan?: number;
    rowSpan?: number;
    width?: number;
    fontSize?: number;
    vAlign?: any;
    align?: any;
  } = {}
): TableCell {
  return new TableCell({
    columnSpan: opts.columnSpan || 1,
    rowSpan: opts.rowSpan || 1,
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    verticalAlign: opts.vAlign || VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: opts.align || AlignmentType.CENTER,
        children: [
          new TextRun({
            text,
            bold: true,
            size: opts.fontSize || 18,
            color: COLOR_STEEL_BLUE,
            font: "Calibri",
          }),
        ],
        spacing: { before: 0, after: 0 },
      }),
    ],
  });
}

function createDataCell(
  text: string,
  opts: {
    columnSpan?: number;
    rowSpan?: number;
    width?: number;
    bold?: boolean;
    fontSize?: number;
    align?: any;
    vAlign?: any;
  } = {}
): TableCell {
  return new TableCell({
    columnSpan: opts.columnSpan || 1,
    rowSpan: opts.rowSpan || 1,
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    verticalAlign: opts.vAlign || VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: opts.align || AlignmentType.CENTER,
        children: [
          new TextRun({
            text: text || "—",
            bold: opts.bold || false,
            size: opts.fontSize || 18,
            color: "000000",
            font: "Calibri",
          }),
        ],
        spacing: { before: 0, after: 0 },
      }),
    ],
  });
}

/**
 * Genera el documento Word (.docx) como réplica exacta ("calca fiel") del formato oficial de cierre DECE
 */
export async function generateCaseClosureReportDocx(data: {
  report: CaseClosureReportRow;
  caseFile: CaseFileRow;
  student: StudentRow;
  institution?: InstitutionRow | null;
  bimonthlyList?: BimonthlyConsolidatedItem[];
}): Promise<Buffer> {
  const { report, student, bimonthlyList = [] } = data;
  const membreteImg = getMembreteBuffer();

  const cellBorderBlue = {
    top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
    left: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
    right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
  };

  const cellBorderGray = {
    top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_GRAY_BORDER },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_GRAY_BORDER },
    left: { style: BorderStyle.SINGLE, size: 4, color: COLOR_GRAY_BORDER },
    right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_GRAY_BORDER },
  };

  // Encabezado con imagen oficial membretada de fondo de página completa
  const docHeader = new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: membreteImg
          ? [
              new ImageRun({
                data: membreteImg,
                transformation: {
                  width: 795.64,
                  height: 1125.93,
                },
                type: "png",
                floating: {
                  horizontalPosition: {
                    relative: HorizontalPositionRelativeFrom.PAGE,
                    align: HorizontalPositionAlign.RIGHT,
                  },
                  verticalPosition: {
                    relative: VerticalPositionRelativeFrom.PAGE,
                    align: VerticalPositionAlign.TOP,
                  },
                  behindDocument: true,
                },
              }),
            ]
          : [],
        spacing: { before: 0, after: 0 },
      }),
    ],
  });

  // ============================================================
  // TABLA 1: DATOS GENERALES
  // ============================================================
  const table1 = new Table({
    alignment: AlignmentType.CENTER,
    width: { size: 10797, type: WidthType.DXA },
    borders: cellBorderBlue,
    rows: [
      // Fila 1: Título de sección
      new TableRow({
        children: [
          createHeaderCell("DATOS GENERALES", {
            columnSpan: 5,
            fontSize: 20,
            width: 10797,
          }),
        ],
      }),
      // Fila 2: Fecha y N° de Informe
      new TableRow({
        children: [
          createHeaderCell("Fecha de Informe", { width: 1826 }),
          createDataCell(report.report_date, { width: 1799, bold: true }),
          createHeaderCell("No. De Informe", { width: 1473 }),
          createDataCell(report.report_number, {
            columnSpan: 2,
            width: 5699,
            bold: true,
            align: AlignmentType.LEFT,
          }),
        ],
      }),
      // Fila 3: Cabecera Funcionario
      new TableRow({
        children: [
          createHeaderCell("Funcionario Responsable de Informe", {
            rowSpan: 3,
            width: 1826,
          }),
          createHeaderCell("Nombre", { rowSpan: 2, width: 1799 }),
          createHeaderCell("Contacto", { columnSpan: 2, width: 5266 }),
          createHeaderCell("Cargo", { rowSpan: 2, width: 1906 }),
        ],
      }),
      // Fila 4: Subcabecera contacto funcionario
      new TableRow({
        children: [
          createHeaderCell("Extensión Telefónica", { width: 1473 }),
          createHeaderCell("Correo Electrónico", { width: 3793 }),
        ],
      }),
      // Fila 5: Datos funcionario
      new TableRow({
        children: [
          createDataCell(report.dece_name, { width: 1799, bold: true, fontSize: 17 }),
          createDataCell(report.dece_phone_ext || "—", { width: 1473, fontSize: 17 }),
          createDataCell(report.dece_email || "—", { width: 3793, fontSize: 17 }),
          createDataCell(report.dece_role, { width: 1906, bold: true, fontSize: 16 }),
        ],
      }),
      // Fila 6: Cabecera Destinatario
      new TableRow({
        children: [
          createHeaderCell("Informe dirigido a", {
            rowSpan: 3,
            width: 1826,
          }),
          createHeaderCell("Nombre", { rowSpan: 2, width: 1799 }),
          createHeaderCell("Contacto", { columnSpan: 2, width: 5266 }),
          createHeaderCell("Cargo", { rowSpan: 2, width: 1906 }),
        ],
      }),
      // Fila 7: Subcabecera contacto destinatario
      new TableRow({
        children: [
          createHeaderCell("Extensión Telefónica", { width: 1473 }),
          createHeaderCell("Correo Electrónico", { width: 3793 }),
        ],
      }),
      // Fila 8: Datos autoridad
      new TableRow({
        children: [
          createDataCell(report.authority_name, { width: 1799, bold: true, fontSize: 17 }),
          createDataCell(report.authority_phone_ext || "—", { width: 1473, fontSize: 17 }),
          createDataCell(report.authority_email || "—", { width: 3793, fontSize: 17 }),
          createDataCell(report.authority_role, { width: 1906, bold: true, fontSize: 16 }),
        ],
      }),
      // Fila 9: TEMA
      new TableRow({
        children: [
          createHeaderCell("TEMA:", { width: 1826, fontSize: 18 }),
          createDataCell(report.topic, {
            columnSpan: 4,
            width: 8971,
            bold: true,
            align: AlignmentType.CENTER,
            fontSize: 18,
          }),
        ],
      }),
    ],
  });

  // ============================================================
  // TABLA 2: ACTIVIDADES REALIZADAS (CALCA FIEL)
  // ============================================================
  const table2 = new Table({
    alignment: AlignmentType.CENTER,
    width: { size: 9639, type: WidthType.DXA },
    borders: cellBorderGray,
    rows: [
      // Fila 1: Consejería
      new TableRow({
        children: [
          new TableCell({
            width: { size: 1800, type: WidthType.DXA },
            shading: { fill: "F8FAFC" },
            verticalAlign: VerticalAlign.TOP,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "CONSEJERÍA", bold: true, size: 19, font: "Calibri" }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 7839, type: WidthType.DXA },
            verticalAlign: VerticalAlign.TOP,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: textToParagraphs(
              report.activities_counseling ||
                "Capacitaciones institucionales y acompañamiento psicoeducativo continuo.",
              18
            ),
          }),
        ],
      }),
      // Fila 2: Promoción y Prevención
      new TableRow({
        children: [
          new TableCell({
            width: { size: 1800, type: WidthType.DXA },
            shading: { fill: "F8FAFC" },
            verticalAlign: VerticalAlign.TOP,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "PROMOCIÓN Y PREVENCIÓN",
                    bold: true,
                    size: 19,
                    font: "Calibri",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 7839, type: WidthType.DXA },
            verticalAlign: VerticalAlign.TOP,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: textToParagraphs(
              report.activities_prevention ||
                "Socialización de rutas y protocolos ministeriales de actuación frente a situaciones de violencia.",
              18
            ),
          }),
        ],
      }),
      // Fila 3: Atención Psicosocial
      new TableRow({
        children: [
          new TableCell({
            width: { size: 1800, type: WidthType.DXA },
            shading: { fill: "F8FAFC" },
            verticalAlign: VerticalAlign.TOP,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "ATENCIÓN PSICOSOCIAL",
                    bold: true,
                    size: 19,
                    font: "Calibri",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 7839, type: WidthType.DXA },
            verticalAlign: VerticalAlign.TOP,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: textToParagraphs(report.activities_psychosocial, 18),
          }),
        ],
      }),
      // Fila 4: Inclusión Socioeducativa
      new TableRow({
        children: [
          new TableCell({
            width: { size: 1800, type: WidthType.DXA },
            shading: { fill: "F8FAFC" },
            verticalAlign: VerticalAlign.TOP,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "INCLUSIÓN SOCIOEDUCATIVA",
                    bold: true,
                    size: 19,
                    font: "Calibri",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 7839, type: WidthType.DXA },
            verticalAlign: VerticalAlign.TOP,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: textToParagraphs(
              report.activities_inclusion ||
                "En calidad de profesional DECE responsable del acompañamiento en el presente año lectivo se ha brindado la atención psicosocial a favor de la estudiante y su familia con la finalidad de salvaguardar su permanencia en el Sistema Educativo.",
              18
            ),
          }),
        ],
      }),
    ],
  });

  // ============================================================
  // CONSOLIDADO DE INFORMES BIMENSUALES DURANTE EL AÑO LECTIVO
  // ============================================================
  const bimonthlyElements: (Paragraph | Table)[] = [];
  if (bimonthlyList.length > 0) {
    bimonthlyElements.push(
      createSubheading(
        `SEGUIMIENTO BIMENSUAL AL PLAN DE ACOMPAÑAMIENTO INSTITUCIONAL (${report.school_year_text})`,
        20
      )
    );

    for (let i = 0; i < bimonthlyList.length; i++) {
      const bm = bimonthlyList[i];
      bimonthlyElements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Informe Bimensual #${i + 1} — Período: ${bm.period_months} (Año lectivo: ${bm.school_year_text})`,
              bold: true,
              size: 19,
              font: "Calibri",
              color: COLOR_STEEL_BLUE,
            }),
          ],
          spacing: { before: 140, after: 60 },
        })
      );

      if (bm.processes && bm.processes.length > 0) {
        const procRows: TableRow[] = [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 3500, type: WidthType.DXA },
                shading: { fill: "F1F5F9" },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: "Proceso Ministerial", bold: true, size: 17, font: "Calibri" })],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 2500, type: WidthType.DXA },
                shading: { fill: "F1F5F9" },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: "Ejecutado por", bold: true, size: 17, font: "Calibri" })],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 1500, type: WidthType.DXA },
                shading: { fill: "F1F5F9" },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: "Beneficiarios", bold: true, size: 17, font: "Calibri" })],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 2139, type: WidthType.DXA },
                shading: { fill: "F1F5F9" },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: "Fechas (Inicio - Fin)", bold: true, size: 17, font: "Calibri" })],
                  }),
                ],
              }),
            ],
          }),
        ];

        for (const proc of bm.processes) {
          procRows.push(
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 3500, type: WidthType.DXA },
                  margins: { top: 60, bottom: 60, left: 80, right: 80 },
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: proc.process_name, bold: true, size: 16, font: "Calibri" })],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 2500, type: WidthType.DXA },
                  margins: { top: 60, bottom: 60, left: 80, right: 80 },
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: proc.executed_by || "DECE", size: 16, font: "Calibri" })],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 1500, type: WidthType.DXA },
                  margins: { top: 60, bottom: 60, left: 80, right: 80 },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: proc.beneficiaries_count || "1", size: 16, font: "Calibri" })],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 2139, type: WidthType.DXA },
                  margins: { top: 60, bottom: 60, left: 80, right: 80 },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `${proc.start_date || "—"} ${proc.end_date ? `al ${proc.end_date}` : ""}`,
                          size: 16,
                          font: "Calibri",
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            })
          );
        }

        bimonthlyElements.push(
          new Table({
            width: { size: 9639, type: WidthType.DXA },
            borders: cellBorderGray,
            rows: procRows,
          })
        );
      }
    }
  }

  // ============================================================
  // TABLA 3: FIRMAS DE RESPONSABILIDAD (CALCA FIEL)
  // ============================================================
  const table3 = new Table({
    alignment: AlignmentType.CENTER,
    width: { size: 9157, type: WidthType.DXA },
    borders: cellBorderGray,
    rows: [
      // Bloque 1: Desarrollo del documento
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 3,
            shading: { fill: "F1F5F9" },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "DESARROLLO DEL DOCUMENTO",
                    bold: true,
                    size: 18,
                    font: "Calibri",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          createDataCell("Nombre y apellido", { width: 3964, bold: true, fontSize: 17 }),
          createDataCell("Firma", { width: 2487, bold: true, fontSize: 17 }),
          createDataCell("Fecha", { width: 2706, bold: true, fontSize: 17 }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 3964, type: WidthType.DXA },
            margins: { top: 200, bottom: 100, left: 100, right: 100 },
            verticalAlign: VerticalAlign.BOTTOM,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: report.elaborated_by_name || report.dece_name,
                    bold: true,
                    size: 17,
                    font: "Calibri",
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: report.elaborated_by_role || "ANALISTA DECE",
                    size: 15,
                    font: "Calibri",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 2487, type: WidthType.DXA },
            margins: { top: 200, bottom: 100, left: 100, right: 100 },
            verticalAlign: VerticalAlign.BOTTOM,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "____________________", size: 16 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 2706, type: WidthType.DXA },
            margins: { top: 200, bottom: 100, left: 100, right: 100 },
            verticalAlign: VerticalAlign.BOTTOM,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: report.elaborated_date || report.report_date,
                    bold: true,
                    size: 17,
                    font: "Calibri",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),

      // Bloque 2: Revisión del documento
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 3,
            shading: { fill: "F1F5F9" },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "REVISION DEL DOCUMENTO",
                    bold: true,
                    size: 18,
                    font: "Calibri",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          createDataCell("Nombre y apellido", { width: 3964, bold: true, fontSize: 17 }),
          createDataCell("Firma", { width: 2487, bold: true, fontSize: 17 }),
          createDataCell("Fecha", { width: 2706, bold: true, fontSize: 17 }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 3964, type: WidthType.DXA },
            margins: { top: 200, bottom: 100, left: 100, right: 100 },
            verticalAlign: VerticalAlign.BOTTOM,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: report.reviewed_by_name || "Coordinadora DECE",
                    bold: true,
                    size: 17,
                    font: "Calibri",
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: report.reviewed_by_role || "COORDINADORA DECE INSTITUCIONAL",
                    size: 15,
                    font: "Calibri",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 2487, type: WidthType.DXA },
            margins: { top: 200, bottom: 100, left: 100, right: 100 },
            verticalAlign: VerticalAlign.BOTTOM,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "____________________", size: 16 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 2706, type: WidthType.DXA },
            margins: { top: 200, bottom: 100, left: 100, right: 100 },
            verticalAlign: VerticalAlign.BOTTOM,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: report.reviewed_date || report.report_date,
                    bold: true,
                    size: 17,
                    font: "Calibri",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),

      // Bloque 3: Aprobación del documento
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 3,
            shading: { fill: "F1F5F9" },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "APROBACION DEL DOCUMENTO",
                    bold: true,
                    size: 18,
                    font: "Calibri",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          createDataCell("Nombre y apellido", { width: 3964, bold: true, fontSize: 17 }),
          createDataCell("Firma", { width: 2487, bold: true, fontSize: 17 }),
          createDataCell("Fecha", { width: 2706, bold: true, fontSize: 17 }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 3964, type: WidthType.DXA },
            margins: { top: 200, bottom: 100, left: 100, right: 100 },
            verticalAlign: VerticalAlign.BOTTOM,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: report.approved_by_name || report.authority_name,
                    bold: true,
                    size: 17,
                    font: "Calibri",
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: report.approved_by_role || "RECTOR (E) DE LA UNIDAD EDUCATIVA",
                    size: 15,
                    font: "Calibri",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 2487, type: WidthType.DXA },
            margins: { top: 200, bottom: 100, left: 100, right: 100 },
            verticalAlign: VerticalAlign.BOTTOM,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "____________________", size: 16 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 2706, type: WidthType.DXA },
            margins: { top: 200, bottom: 100, left: 100, right: 100 },
            verticalAlign: VerticalAlign.BOTTOM,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: report.approved_date || report.report_date,
                    bold: true,
                    size: 17,
                    font: "Calibri",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    creator: "DECE App",
    title: `Informe Técnico de Cierre - ${student.full_name}`,
    description: report.topic,
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 20, color: "000000" },
          paragraph: { spacing: { line: 260, before: 60, after: 60 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: {
              top: 1701,
              bottom: 1843,
              left: 1080,
              right: 991,
              header: 720,
              footer: 720,
            },
          },
        },
        headers: {
          default: docHeader,
        },
        children: [
          // TABLA 1: DATOS GENERALES
          table1,
          new Paragraph({ text: "", spacing: { after: 150 } }),

          // ANTECEDENTES
          createHeading("ANTECEDENTES", 21, 200, 80),
          createSubheading("RAZONES DEL CIERRE O TRASLADO DE CASO", 20),
          ...textToParagraphs(report.closure_reasons, 20),

          // BASE LEGAL
          createHeading("BASE LEGAL", 21, 200, 80),
          ...textToParagraphs(report.legal_framework, 20),
          new Paragraph({
            children: [
              new TextRun({
                text: "SUJETO A CAMBIOS DE SER NECESARIO.",
                italics: true,
                bold: true,
                size: 19,
                font: "Calibri",
              }),
            ],
            spacing: { before: 80, after: 140 },
          }),

          // ALCANCE
          createHeading("ALCANCE", 21, 200, 80),
          ...textToParagraphs(report.scope, 20),

          // OBJETIVO
          createHeading("OBJETIVO", 21, 200, 80),
          ...textToParagraphs(report.objective, 20),

          // DESARROLLO O ANÁLISIS
          createHeading("DESARROLLO O ANÁLISIS", 21, 200, 80),
          createSubheading("DATOS INFORMATIVOS", 20),
          new Paragraph({
            children: [
              new TextRun({ text: "Apellidos y Nombres: ", bold: true, size: 20 }),
              new TextRun({ text: report.student_name.toUpperCase(), size: 20 }),
            ],
            spacing: { after: 40 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Cédula: ", bold: true, size: 20 }),
              new TextRun({ text: report.student_id_num || "—", size: 20 }),
            ],
            spacing: { after: 40 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Edad: ", bold: true, size: 20 }),
              new TextRun({ text: report.student_age ? `${report.student_age} años` : "—", size: 20 }),
            ],
            spacing: { after: 40 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Fecha de nacimiento: ", bold: true, size: 20 }),
              new TextRun({ text: report.student_birth_date || "—", size: 20 }),
            ],
            spacing: { after: 40 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Grado / curso: ", bold: true, size: 20 }),
              new TextRun({ text: report.student_grade.toUpperCase(), size: 20 }),
            ],
            spacing: { after: 40 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Paralelo: ", bold: true, size: 20 }),
              new TextRun({ text: (report.student_parallel || "—").toUpperCase(), size: 20 }),
            ],
            spacing: { after: 40 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Sección: ", bold: true, size: 20 }),
              new TextRun({ text: (report.student_section || "MATUTINA").toUpperCase(), size: 20 }),
            ],
            spacing: { after: 40 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Dirección: ", bold: true, size: 20 }),
              new TextRun({ text: report.student_address || "—", size: 20 }),
            ],
            spacing: { after: 40 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Referencia: ", bold: true, size: 20 }),
              new TextRun({ text: report.student_address_ref || "—", size: 20 }),
            ],
            spacing: { after: 40 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Representante Legal: ", bold: true, size: 20 }),
              new TextRun({ text: report.rep_name || "—", size: 20 }),
            ],
            spacing: { after: 40 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Cédula: ", bold: true, size: 20 }),
              new TextRun({ text: report.rep_id_num || "—", size: 20 }),
            ],
            spacing: { after: 40 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Teléfono Representante: ", bold: true, size: 20 }),
              new TextRun({ text: report.rep_phone || "—", size: 20 }),
            ],
            spacing: { after: 120 },
          }),

          // TABLA 2: ACTIVIDADES REALIZADAS
          createSubheading("ACTIVIDADES REALIZADAS:", 20),
          table2,
          new Paragraph({ text: "", spacing: { after: 120 } }),

          // CONSOLIDADO BIMENSUAL
          ...bimonthlyElements,
          new Paragraph({ text: "", spacing: { after: 120 } }),

          // METODOLOGÍA
          createHeading("METODOLOGÍA", 21, 200, 80),
          ...textToParagraphs(report.methodology, 20),

          // CONCLUSIONES
          createHeading("CONCLUSIONES", 21, 200, 80),
          ...textToParagraphs(report.conclusions, 20),

          // RECOMENDACIONES
          createHeading("RECOMENDACIONES", 21, 200, 80),
          ...textToParagraphs(report.recommendations, 20),

          // TABLA 3: FIRMAS
          new Paragraph({ text: "", spacing: { after: 140 } }),
          table3,
          new Paragraph({ text: "", spacing: { after: 160 } }),

          // ANEXOS
          createHeading("ANEXOS:", 21, 200, 80),
          new Paragraph({
            children: [new TextRun({ text: "• MATRÍCULA EN CASO DE TRASLADO", bold: true, size: 19 })],
            spacing: { after: 40 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "• CERTIFICADO DE BACHILLER EN CASO DE HABER SALIDO DEL SISTEMA / GRADUACIÓN", bold: true, size: 19 })],
            spacing: { after: 40 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "• OFICIO DE MM/PP-FF Y/O REPRESENTANTE LEGAL DE DESISTIMIENTO", bold: true, size: 19 })],
            spacing: { after: 60 },
          }),
          ...(report.annexes_notes
            ? [
                new Paragraph({
                  children: [
                    new TextRun({ text: "Observaciones de Anexos: ", bold: true, size: 19 }),
                    new TextRun({ text: report.annexes_notes, size: 19 }),
                  ],
                  spacing: { before: 80, after: 100 },
                }),
              ]
            : []),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
