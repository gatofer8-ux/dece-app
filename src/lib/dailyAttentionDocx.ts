import path from "path";
import fs from "fs";
import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  Packer,
  AlignmentType,
  BorderStyle,
  WidthType,
  VerticalAlign,
  PageOrientation,
} from "docx";
import type { DailyAttentionRow, InstitutionRow } from "@/lib/types";
import {
  actionAxisOptionsFor,
  parseStringList,
  type AttendeeType,
} from "@/lib/dailyAttention";

const FONT = "Calibri";
const NAVY_COLOR = "2F5496";
const BORDER_COLOR = "8EA9DB";
const BORDER_DARK = "2F5496";

const PAGE_W = 16838; // Landscape A4 width in dxa
const PAGE_H = 11906; // Landscape A4 height in dxa
const MARGIN = { top: 720, right: 720, bottom: 720, left: 720 };
const USABLE_W = PAGE_W - MARGIN.left - MARGIN.right; // 15398 dxa

function imgBuf(fileName: string): Buffer | null {
  try {
    for (const p of [
      path.join(process.cwd(), "public", "situational_media", fileName),
      path.join(process.cwd(), "public", fileName),
    ]) {
      if (fs.existsSync(p)) return fs.readFileSync(p);
    }
  } catch {
    /* noop */
  }
  return null;
}

const borderThin = { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR };
const cellBorders = {
  top: borderThin,
  bottom: borderThin,
  left: borderThin,
  right: borderThin,
};

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d;
}

export async function generateDailyAttentionDocx(params: {
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

  // Table Headers
  const headerCells: TableCell[] = [];

  const addHCell = (text: string, width: number) => {
    headerCells.push(
      new TableCell({
        width: { size: width, type: WidthType.DXA },
        shading: { fill: NAVY_COLOR },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 6, color: BORDER_DARK },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: BORDER_DARK },
          left: { style: BorderStyle.SINGLE, size: 4, color: "FFFFFF" },
          right: { style: BorderStyle.SINGLE, size: 4, color: "FFFFFF" },
        },
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 40, after: 40 },
            children: [
              new TextRun({
                text,
                bold: true,
                size: 15, // 7.5pt
                color: "FFFFFF",
                font: FONT,
              }),
            ],
          }),
        ],
      })
    );
  };

  // Define widths (total sum should approximate USABLE_W)
  const wNum = 500;
  const wDate = tipo === "DOCENTE_AUTORIDAD" ? 1200 : 1000;
  const wDocRep = 1800;
  const wEst = 1900;
  const wGrad = 1100;
  const wJorn = 900;
  const wMot = 2200;
  const wAxis = Math.floor(2800 / axisOptions.length);
  const wMod = 1300;
  const wDet = 700;
  const wObs = 1600;

  addHCell("N°", wNum);
  addHCell(tipo === "DOCENTE_AUTORIDAD" ? "Fecha / Dur." : "Fecha", wDate);
  if (tipo === "DOCENTE_AUTORIDAD") addHCell("Docente/Autoridad", wDocRep);
  if (tipo === "REPRESENTANTE") addHCell("Representante", wDocRep);
  addHCell("Estudiante", wEst);
  addHCell("Grado/Par.", wGrad);
  addHCell("Jornada", wJorn);
  addHCell(tipo === "REPRESENTANTE" ? "Motivo Asistencia" : "Motivo Atención", wMot);

  for (const o of axisOptions) {
    addHCell(o.label, wAxis);
  }

  addHCell("Medio / Firma", wMod);
  if (tipo === "DOCENTE_AUTORIDAD") addHCell("¿Ficha?", wDet);
  addHCell("Observaciones", wObs);

  const tableRows: TableRow[] = [new TableRow({ children: headerCells, tableHeader: true })];

  // Data rows
  entries.forEach((e, idx) => {
    const axis = parseStringList(e.action_axis);
    const rowCells: TableCell[] = [];
    const isEven = idx % 2 === 0;
    const fill = isEven ? "F2F5F9" : "FFFFFF";

    const addCell = (
      text: string,
      width: number,
      align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT
    ) => {
      rowCells.push(
        new TableCell({
          width: { size: width, type: WidthType.DXA },
          shading: { fill },
          borders: cellBorders,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: align,
              spacing: { before: 30, after: 30 },
              children: [
                new TextRun({
                  text: text || "—",
                  size: 15,
                  font: FONT,
                  color: "262626",
                }),
              ],
            }),
          ],
        })
      );
    };

    addCell(String(idx + 1), wNum, AlignmentType.CENTER);
    const dateStr = `${fmtDate(e.attention_date)}${e.duration ? ` (${e.duration})` : ""}`;
    addCell(dateStr, wDate, AlignmentType.CENTER);

    if (tipo === "DOCENTE_AUTORIDAD") addCell(e.attendee_name || "", wDocRep);
    if (tipo === "REPRESENTANTE") addCell(e.representative_name || "", wDocRep);
    addCell(e.student_name || "", wEst);
    addCell(e.student_grade || "", wGrad, AlignmentType.CENTER);
    addCell(e.jornada || "", wJorn, AlignmentType.CENTER);
    addCell(e.reason, wMot);

    for (const o of axisOptions) {
      const checked = axis.includes(o.value) ? "X" : "";
      addCell(checked, wAxis, AlignmentType.CENTER);
    }

    const modalityDetails = [
      e.modality_tech ? `Medio: ${e.modality_tech}` : "",
      e.modality_phone ? `Telf: ${e.modality_phone}` : "",
      e.modality_signed ? "Firma: Sí" : "",
    ]
      .filter(Boolean)
      .join(" | ");

    addCell(modalityDetails || "Presencial", wMod);
    if (tipo === "DOCENTE_AUTORIDAD") addCell(e.has_detection_sheet || "NO", wDet, AlignmentType.CENTER);
    addCell(e.observations || "", wObs);

    tableRows.push(new TableRow({ children: rowCells }));
  });

  // If empty, add placeholder row
  if (entries.length === 0) {
    const totalCols = headerCells.length;
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: USABLE_W, type: WidthType.DXA },
            columnSpan: totalCols,
            borders: cellBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 120, after: 120 },
                children: [
                  new TextRun({
                    text: "No se registran atenciones en el período seleccionado.",
                    italics: true,
                    size: 18,
                    font: FONT,
                    color: "737373",
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    );
  }

  // Signature table
  const sigTable = new Table({
    width: { size: USABLE_W, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: Math.floor(USABLE_W / 2), type: WidthType.DXA },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "auto" },
              bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
              left: { style: BorderStyle.NONE, size: 0, color: "auto" },
              right: { style: BorderStyle.NONE, size: 0, color: "auto" },
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 400, after: 40 },
                children: [
                  new TextRun({
                    text: "____________________________________________",
                    color: "595959",
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 20, after: 20 },
                children: [
                  new TextRun({
                    text: professionalName || "PROFESIONAL DEL DECE",
                    bold: true,
                    size: 17,
                    font: FONT,
                    color: NAVY_COLOR,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({
                    text: "Responsable de Registro y Atención",
                    size: 15,
                    font: FONT,
                    color: "595959",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: Math.floor(USABLE_W / 2), type: WidthType.DXA },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "auto" },
              bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
              left: { style: BorderStyle.NONE, size: 0, color: "auto" },
              right: { style: BorderStyle.NONE, size: 0, color: "auto" },
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 400, after: 40 },
                children: [
                  new TextRun({
                    text: "____________________________________________",
                    color: "595959",
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 20, after: 20 },
                children: [
                  new TextRun({
                    text: "AUTORIDAD INSTITUCIONAL / RECTORADO",
                    bold: true,
                    size: 17,
                    font: FONT,
                    color: NAVY_COLOR,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({
                    text: "Supervisión y Control de Gestión DECE",
                    size: 15,
                    font: FONT,
                    color: "595959",
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
    creator: "DECE App - Sistema Integral",
    title: titleByType[tipo],
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_W, height: PAGE_H, orientation: PageOrientation.LANDSCAPE },
            margin: MARGIN,
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 40 },
            children: [
              new TextRun({
                text: institution.name.toUpperCase(),
                bold: true,
                size: 24, // 12pt
                color: NAVY_COLOR,
                font: FONT,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 40 },
            children: [
              new TextRun({
                text: titleByType[tipo],
                bold: true,
                size: 22, // 11pt
                color: "1F3864",
                font: FONT,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 140 },
            children: [
              new TextRun({
                text: `Departamento de Consejería Estudiantil (DECE)  |  ${periodLabel}`,
                italics: true,
                size: 17, // 8.5pt
                color: "595959",
                font: FONT,
              }),
            ],
          }),
          new Table({
            width: { size: USABLE_W, type: WidthType.DXA },
            rows: tableRows,
          }),
          new Paragraph({
            spacing: { before: 200, after: 80 },
            children: [],
          }),
          sigTable,
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
