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
  ShadingType,
  TableLayoutType,
  Footer,
  PageNumber,
} from "docx";
import { QUESTION_STAGES, splitLines } from "./restorativeCircleFicha";
import type { RestorativeCircleFichaRow } from "./types";

const FONT = "Times New Roman";
const BODY = 24; // 12pt
const LABEL_FILL = "D9D9D9";

const PAGE_W = 11906;
const PAGE_H = 16838;
const MARGIN = { top: 1418, right: 1418, bottom: 1418, left: 1418 };
const USABLE = PAGE_W - MARGIN.left - MARGIN.right;

const BD = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const ALL_BORDERS = {
  top: BD,
  bottom: BD,
  left: BD,
  right: BD,
  insideHorizontal: BD,
  insideVertical: BD,
};

function run(text: string, o: { bold?: boolean; italics?: boolean; size?: number } = {}) {
  return new TextRun({ text, bold: o.bold, italics: o.italics, size: o.size ?? BODY, font: FONT });
}

function fmtDate(d: string | null | undefined): string {
  const m = (d || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d || "";
}

/** Caja con borde de una sola celda que contiene el texto (párrafos justificados). */
function boxTable(text: string | null | undefined, opts: { bullets?: boolean } = {}): Table {
  const lines = splitLines(text);
  const children =
    lines.length > 0
      ? lines.map(
          (l) =>
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 60, line: 300 },
              children: opts.bullets ? [run("•  " + l)] : [run(l)],
            })
        )
      : [new Paragraph({ spacing: { line: 300 }, children: [run(" ")] })];

  return new Table({
    width: { size: USABLE, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [USABLE],
    borders: ALL_BORDERS,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            margins: { top: 120, bottom: 120, left: 140, right: 140 },
            children,
          }),
        ],
      }),
    ],
  });
}

function sectionHeading(numeral: string, title: string): Paragraph {
  return new Paragraph({
    spacing: { before: 260, after: 120 },
    children: [run(`${numeral})  ${title}`, { bold: true })],
  });
}

function subHeading(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    spacing: { before: 180, after: 100 },
    children: [run(text, { bold: true, italics: true, size: 22 })],
  });
}

export async function generateRestorativeCircleFichaDocx(
  f: RestorativeCircleFichaRow
): Promise<Buffer> {
  const labelW = Math.round(USABLE * 0.42);
  const valueW = USABLE - labelW;

  const datosRows: Array<[string, string]> = [
    ["CENTRO EDUCATIVO:", f.center_name || ""],
    ["DISTRITO EDUCATIVO:", f.district_name || ""],
    ["FACILITADOR - FACILITADORA:", f.facilitator_name || ""],
    ["TIPO DE CÍRCULO RESTAURATIVO:", f.circle_type || ""],
    ["N.º PARTICIPANTES:", f.participants_count || ""],
    ["TIPO DE PARTICIPANTES:", f.participant_type || ""],
    ["PROBLEMÁTICA:", f.problematica || ""],
    ["FECHA DEL CÍRCULO RESTAURATIVO:", fmtDate(f.circle_date)],
    ["HORARIO DEL CÍRCULO RESTAURATIVO:", f.circle_time || ""],
  ];

  const datosTable = new Table({
    width: { size: USABLE, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [labelW, valueW],
    borders: ALL_BORDERS,
    rows: datosRows.map(
      ([label, value]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: labelW, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: LABEL_FILL },
              margins: { top: 90, bottom: 90, left: 120, right: 120 },
              children: [new Paragraph({ children: [run(label, { bold: true })] })],
            }),
            new TableCell({
              width: { size: valueW, type: WidthType.DXA },
              margins: { top: 90, bottom: 90, left: 120, right: 120 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [run(value)],
                }),
              ],
            }),
          ],
        })
    ),
  });

  const questionSections = QUESTION_STAGES.flatMap((stage) => [
    subHeading(`${stage.numeral}. ${stage.title}`),
    boxTable((f as unknown as Record<string, string | null>)[stage.key]),
  ]);

  const children = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [run("FICHA CÍRCULO RESTAURATIVO", { bold: true, size: 40 })],
    }),
    new Paragraph({
      spacing: { after: 120 },
      children: [run("DATOS GENERALES", { bold: true, size: 26 })],
    }),
    datosTable,

    sectionHeading("1", "DIÁGNOSTICO DE LA PROBLEMÁTICA:"),
    boxTable(f.diagnostico),

    sectionHeading("2", "OBJETIVO(S) DEL CÍRCULO RESTAURATIVO:"),
    boxTable(f.objetivos, { bullets: true }),

    sectionHeading("3", "DECLARACIÓN AFECTIVA / DECLARACIÓN INICIAL"),
    boxTable(f.declaracion_inicial),

    sectionHeading("4", "PREGUNTAS RESTAURATIVAS"),
    ...questionSections,

    sectionHeading("5", "DECLARACIÓN DE CIERRE"),
    boxTable(f.declaracion_cierre),

    sectionHeading("6", "INFORME DEL CÍRCULO REALIZADO"),
    boxTable(f.informe_circulo),

    sectionHeading("7", "CONCLUSIÓN DE LA INFORMACIÓN RECOLECTADA"),
    boxTable(f.conclusion, { bullets: true }),
  ];

  const doc = new Document({
    creator: "DECE App",
    title: `Ficha Círculo Restaurativo ${f.ficha_code || ""}`.trim(),
    styles: { default: { document: { run: { font: FONT, size: BODY } } } },
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: PAGE_H }, margin: MARGIN } },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18 }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
