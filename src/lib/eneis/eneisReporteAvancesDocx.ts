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
  TableLayoutType,
} from "docx";
import { formatPeriodoReporte, type ReporteAvanceRow } from "./eneisReporteAvances";

/**
 * "Reporte de avances" mensual por materia/docente — réplica fiel del
 * formato propio de la institución: tabla simple en blanco y negro con las
 * columnas FECHA/ACTIVIDAD/ESTADO/HERRAMIENTA UTILIZADA/POBLACIÓN OBJETIVO
 * ALCANZADA, calculada a partir de las fichas de aplicación ya cargadas.
 */

const FONT = "Calibri";
const BODY = 20; // 10pt

const PAGE_W = 16838; // A4 apaisado
const PAGE_H = 11906;
const MARGIN = { top: 900, right: 900, bottom: 900, left: 900, header: 0, footer: 0 };
const W = PAGE_W - MARGIN.left - MARGIN.right;

const Bd = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const borders = { top: Bd, bottom: Bd, left: Bd, right: Bd, insideHorizontal: Bd, insideVertical: Bd };

function r(text: string, o: { bold?: boolean } = {}) {
  return new TextRun({ text, bold: o.bold ?? false, size: BODY, font: FONT });
}
function multiP(text: string, o: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) {
  const lines = text.split("\n").filter(Boolean);
  if (lines.length === 0) return [new Paragraph({ alignment: o.align, spacing: { after: 0, line: 232 }, children: [r(" ")] })];
  return lines.map((l) => new Paragraph({ alignment: o.align, spacing: { after: 0, line: 232 }, children: [r(l, { bold: o.bold })] }));
}

type VAlign = typeof VerticalAlign.TOP | typeof VerticalAlign.CENTER | typeof VerticalAlign.BOTTOM;
function cell(children: Paragraph[], o: { span?: number; valign?: VAlign } = {}) {
  return new TableCell({
    columnSpan: o.span ?? 1,
    verticalAlign: o.valign ?? VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children,
  });
}
const row = (cells: TableCell[]) => new TableRow({ children: cells });

function fmtDate(d: string | null | undefined) {
  const m = (d || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d || "";
}

export interface EneisReporteAvancesInfoLike {
  periodo: string;
  numero: number;
  institutionName: string;
  amieCode: string;
  firmaNombre: string;
  firmaRol: string;
}

export async function generateEneisReporteAvancesDocx(rows: ReporteAvanceRow[], ctx: EneisReporteAvancesInfoLike): Promise<Buffer> {
  const N = 5;
  const colW = [Math.floor(W * 0.12), Math.floor(W * 0.28), Math.floor(W * 0.14), Math.floor(W * 0.24)];
  const GRID = [...colW, W - colW.reduce((a, b) => a + b, 0)];

  const headerRow = row([
    cell(multiP("FECHA", { bold: true, align: AlignmentType.CENTER })),
    cell(multiP("ACTIVIDAD", { bold: true, align: AlignmentType.CENTER })),
    cell(multiP("ESTADO\n(Pendiente/ En Curso/ Finalizado)", { bold: true, align: AlignmentType.CENTER })),
    cell(multiP("HERRAMIENTA UTILIZADA", { bold: true, align: AlignmentType.CENTER })),
    cell(multiP("POBLACIÓN OBJETIVO ALCANZADA (Resultados numéricos)", { bold: true, align: AlignmentType.CENTER })),
  ]);

  const dataRows = rows.map((rrow) =>
    row([
      cell(multiP(fmtDate(rrow.fecha))),
      cell(multiP(`${rrow.asignatura}.\nTema: ${rrow.tema}`), { valign: VerticalAlign.TOP }),
      cell(multiP("Finalizado")),
      cell(multiP(rrow.herramienta), { valign: VerticalAlign.TOP }),
      cell(multiP(rrow.poblacion), { valign: VerticalAlign.TOP }),
    ])
  );

  const table = new Table({
    width: { size: W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: GRID,
    borders,
    rows: [headerRow, ...(dataRows.length ? dataRows : [row([cell([new Paragraph({ children: [r(" ")] })], { span: N })])])],
  });

  const doc = new Document({
    creator: "DECE App",
    title: `Informe de Actividades Nº ${ctx.numero} — ${formatPeriodoReporte(ctx.periodo)}`,
    styles: { default: { document: { run: { font: FONT, size: BODY } } } },
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: PAGE_H }, margin: MARGIN } },
        children: [
          new Paragraph({ spacing: { after: 0 }, children: [r(`INFORME DE ACTIVIDADES Nº ${ctx.numero}`, { bold: true })] }),
          new Paragraph({ spacing: { after: 0 }, children: [r(`INSTITUCIÓN EDUCATIVA:  ${ctx.institutionName.toUpperCase()}`, { bold: true })] }),
          new Paragraph({ spacing: { after: 0 }, children: [r(`CODIGO AMIE: ${ctx.amieCode}`, { bold: true })] }),
          new Paragraph({ spacing: { after: 120 }, children: [r(`MES Y AÑO: ${formatPeriodoReporte(ctx.periodo)}`, { bold: true })] }),
          table,
          new Paragraph({ spacing: { before: 300, after: 0 }, children: [r("Firma:")] }),
          new Paragraph({ spacing: { after: 0 }, children: [r("_______________________")] }),
          new Paragraph({ spacing: { after: 0 }, children: [r(ctx.firmaNombre)] }),
          new Paragraph({ spacing: { after: 0 }, children: [r(ctx.firmaRol)] }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
