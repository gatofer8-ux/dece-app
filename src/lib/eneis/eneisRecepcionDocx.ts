import path from "path";
import fs from "fs";
import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  Header,
  Footer,
  ImageRun,
  Packer,
  AlignmentType,
  BorderStyle,
  WidthType,
  VerticalAlign,
  TableLayoutType,
} from "docx";
import { currentSchoolYearText } from "@/lib/schoolYearText";
import type { EneisFichaRow } from "./eneisSessions";

const FONT = "Calibri";
const NAVY = "1F3864";
const LABEL_FILL = "DEEAF6";
const BORDER = "8497B0";
const BODY = 20; // 10pt
const SMALL = 18; // 9pt

const PAGE_W = 11906;
const PAGE_H = 16838;
const MARGIN = { top: 1100, right: 900, bottom: 900, left: 900, header: 460, footer: 320 };
const W = PAGE_W - MARGIN.left - MARGIN.right;

// N°, Docente, Fecha entrega, Asignatura, Tema implementado, Firma, Observaciones
const WEIGHTS = [4, 16, 11, 16, 22, 11, 20];
const TOTAL_W = WEIGHTS.reduce((a, b) => a + b, 0);
const GRID = WEIGHTS.map((w, i) =>
  i === WEIGHTS.length - 1 ? W - Math.round((W * (TOTAL_W - w)) / TOTAL_W) : Math.round((W * w) / TOTAL_W)
);

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

const Bd = { style: BorderStyle.SINGLE, size: 4, color: BORDER };
const borders = { top: Bd, bottom: Bd, left: Bd, right: Bd, insideHorizontal: Bd, insideVertical: Bd };

function r(text: string, o: { bold?: boolean; size?: number; color?: string } = {}) {
  return new TextRun({ text, bold: o.bold ?? false, size: o.size ?? SMALL, color: o.color, font: FONT });
}
function cell(children: Paragraph[], o: { fill?: string; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) {
  return new TableCell({
    shading: o.fill ? { fill: o.fill } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 40, bottom: 40, left: 60, right: 60 },
    children,
  });
}
const th = (t: string) =>
  cell([new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0, line: 220 }, children: [r(t, { bold: true, size: SMALL, color: NAVY })] })], { fill: LABEL_FILL });
const td = (t: string, align?: (typeof AlignmentType)[keyof typeof AlignmentType]) =>
  cell([new Paragraph({ alignment: align, spacing: { after: 0, line: 232 }, children: [r(t || " ", { size: SMALL })] })]);
const row = (cells: TableCell[]) => new TableRow({ children: cells });

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

export async function generateEneisRecepcionDocx(
  sessionTitle: string,
  fichas: EneisFichaRow[],
  institutionName: string
): Promise<Buffer> {
  const schoolYear = currentSchoolYearText();

  const rows: TableRow[] = [
    row([th("N°"), th("Nombre del Docente"), th("Fecha de Entrega"), th("Asignatura"), th("Tema Implementado"), th("Firma"), th("Observaciones")]),
    ...fichas.map((f, i) =>
      row([
        td(String(i + 1), AlignmentType.CENTER),
        td(f.docente_nombre),
        td(fmtDate(f.fecha_hasta || f.fecha_desde || f.created_at)),
        td(f.asignatura),
        td(f.nombre_ficha || ""),
        cell([new Paragraph({ children: [r(" ")] })]),
        td(f.observaciones || ""),
      ])
    ),
  ];

  const table = new Table({
    width: { size: W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: GRID,
    alignment: AlignmentType.CENTER,
    borders,
    rows,
  });

  const doc = new Document({
    creator: "DECE App",
    title: `Recepción de Fichas ENEIS — ${sessionTitle}`,
    styles: { default: { document: { run: { font: FONT, size: SMALL } } } },
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: PAGE_H }, margin: MARGIN } },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                indent: { left: -800, right: -800 },
                spacing: { after: 0 },
                children: imgBuf("header_4k.png")
                  ? [new ImageRun({ data: imgBuf("header_4k.png")!, transformation: { width: 596, height: 60 }, type: "png" })]
                  : [],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                indent: { left: -800, right: -800 },
                spacing: { before: 0 },
                children: imgBuf("footer_nuevo_ecuador.png")
                  ? [new ImageRun({ data: imgBuf("footer_nuevo_ecuador.png")!, transformation: { width: 596, height: 100 }, type: "png" })]
                  : [],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [r("RECEPCIÓN DE FICHAS DE LA IMPLEMENTACIÓN DE LA ENEIS", { bold: true, size: BODY, color: NAVY })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [r(`${institutionName} — ${sessionTitle} — Año lectivo ${schoolYear}`, { size: SMALL })],
          }),
          table,
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
