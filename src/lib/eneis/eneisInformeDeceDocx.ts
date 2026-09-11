import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  ImageRun,
  Packer,
  AlignmentType,
  BorderStyle,
  WidthType,
  VerticalAlign,
  TableLayoutType,
} from "docx";
import { ENEIS_INFORME_DECE_ACTIVIDADES_REQUERIDAS, formatPeriodoDece, type EneisInformeDeceActividad } from "./eneisInformeDece";

/**
 * Informe mensual de actividades DECE ("INFORME DE ACTIVIDADES Nº ...") —
 * réplica fiel del formato propio de la institución: tabla simple en blanco
 * y negro con las 4 actividades requeridas fijas por la ENEIS.
 */

const FONT = "Calibri";
const BODY = 20; // 10pt

const PAGE_W = 11906;
const PAGE_H = 16838;
const MARGIN = { top: 900, right: 900, bottom: 900, left: 900, header: 0, footer: 0 };
const W = PAGE_W - MARGIN.left - MARGIN.right;

const Bd = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const borders = { top: Bd, bottom: Bd, left: Bd, right: Bd, insideHorizontal: Bd, insideVertical: Bd };

function r(text: string, o: { bold?: boolean } = {}) {
  return new TextRun({ text, bold: o.bold ?? false, size: BODY, font: FONT });
}
function p(text: string, o: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) {
  return new Paragraph({ alignment: o.align, spacing: { after: 0, line: 240 }, children: [r(text, { bold: o.bold })] });
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

function decodeDataUri(dataUri: string | null): { data: Buffer; type: "png" | "jpg" } | null {
  if (!dataUri) return null;
  const m = dataUri.match(/^data:image\/(png|jpe?g);base64,(.+)$/);
  if (!m) return null;
  return { data: Buffer.from(m[2], "base64"), type: m[1].startsWith("jp") ? "jpg" : "png" };
}

export interface EneisInformeDeceRowLike {
  periodo: string;
  actividades_json: string;
}

export async function generateEneisInformeDeceDocx(
  informe: EneisInformeDeceRowLike,
  actividades: EneisInformeDeceActividad[],
  ctx: { numero: string; institutionName: string; amieCode: string; firmaNombre: string; firmaRol: string }
): Promise<Buffer> {
  const N = 5;
  const colW = [
    Math.floor(W * 0.28),
    Math.floor(W * 0.24),
    Math.floor(W * 0.12),
    Math.floor(W * 0.14),
  ];
  const GRID = [...colW, W - colW.reduce((a, b) => a + b, 0)];

  const bodyRows: TableRow[] = [
    row([
      cell([p("Actividad Requerida", { bold: true, align: AlignmentType.CENTER })]),
      cell([p("Actividad ejecutada", { bold: true, align: AlignmentType.CENTER })]),
      cell([p("Fecha", { bold: true, align: AlignmentType.CENTER })]),
      cell([p("Nº de beneficiados", { bold: true, align: AlignmentType.CENTER })]),
      cell([p("Registro Fotográfico (sólo 1 fotografía, no collage, por cada ítem)", { bold: true, align: AlignmentType.CENTER })]),
    ]),
    ...ENEIS_INFORME_DECE_ACTIVIDADES_REQUERIDAS.map((req, i) => {
      const a = actividades[i] || { ejecutada: "", fecha: "", beneficiarios: "", foto: null };
      const img = decodeDataUri(a.foto);
      return row([
        cell([p(req)], { valign: VerticalAlign.TOP }),
        cell([p(a.ejecutada || "")]),
        cell([p(fmtDate(a.fecha))]),
        cell([p(a.beneficiarios || "")]),
        cell(
          [
            img
              ? new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ data: img.data, transformation: { width: 120, height: 90 }, type: img.type })] })
              : p(" "),
          ],
          { valign: VerticalAlign.CENTER }
        ),
      ]);
    }),
  ];

  const table = new Table({ width: { size: W, type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: GRID, borders, rows: bodyRows });

  const doc = new Document({
    creator: "DECE App",
    title: `Informe de Actividades DECE Nº ${ctx.numero}`,
    styles: { default: { document: { run: { font: FONT, size: BODY } } } },
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: PAGE_H }, margin: MARGIN } },
        children: [
          p(`INFORME DE ACTIVIDADES Nº ${ctx.numero}`, { bold: true }),
          p(`INSTITUCIÓN EDUCATIVA:  ${ctx.institutionName}`, { bold: true }),
          p(`CODIGO AMIE: ${ctx.amieCode}`, { bold: true }),
          p(`MES Y AÑO: ${formatPeriodoDece(informe.periodo)}`, { bold: true }),
          new Paragraph({ spacing: { before: 120, after: 0 }, children: [] }),
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
