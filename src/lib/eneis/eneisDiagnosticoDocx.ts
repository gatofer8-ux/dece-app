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
  ImageRun,
  Packer,
  AlignmentType,
  BorderStyle,
  WidthType,
  VerticalAlign,
  TableLayoutType,
} from "docx";
import {
  ENEIS_DIAGNOSTICO_GUIA_PREGUNTAS,
  type EneisDiagnosticoResultadoEje,
  type EneisDiagnosticoResponsable,
} from "./eneisDiagnostico";

/**
 * Informe del Diagnóstico Institucional sobre la ENEIS — réplica fiel del
 * formato propio de la institución: documento narrativo con una tabla de
 * resultados por eje, en blanco y negro, sin colores de relleno.
 */

const FONT = "Calibri";
const BODY = 20; // 10pt
const SMALL = 18; // 9pt

const PAGE_W = 11906;
const PAGE_H = 16838;
const MARGIN = { top: 1500, right: 900, bottom: 1200, left: 900, header: 460, footer: 320 };
const W = PAGE_W - MARGIN.left - MARGIN.right;

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

const Bd = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const borders = { top: Bd, bottom: Bd, left: Bd, right: Bd, insideHorizontal: Bd, insideVertical: Bd };

function r(text: string, o: { bold?: boolean; italics?: boolean; size?: number } = {}) {
  return new TextRun({ text, bold: o.bold ?? false, italics: o.italics ?? false, size: o.size ?? BODY, font: FONT });
}
function h(text: string) {
  return new Paragraph({ spacing: { before: 200, after: 80 }, children: [r(text, { bold: true })] });
}
function multiP(text: string | null | undefined): Paragraph[] {
  const t = (text || "").trim();
  if (!t) return [new Paragraph({ spacing: { after: 0, line: 240 }, children: [r(" ")] })];
  return t
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 80, line: 240 }, children: [r(l)] }));
}
function bulletList(items: string[]) {
  if (!items.length) return [new Paragraph({ spacing: { after: 0 }, children: [r(" ")] })];
  return items.map((it) => new Paragraph({ spacing: { after: 40 }, children: [r(`•  ${it}`)] }));
}

type VAlign = typeof VerticalAlign.TOP | typeof VerticalAlign.CENTER | typeof VerticalAlign.BOTTOM;
function cell(children: Paragraph[], o: { span?: number; valign?: VAlign } = {}) {
  return new TableCell({
    columnSpan: o.span ?? 1,
    verticalAlign: o.valign ?? VerticalAlign.TOP,
    margins: { top: 40, bottom: 40, left: 70, right: 70 },
    children,
  });
}
const row = (cells: TableCell[]) => new TableRow({ children: cells });

function fmtDate(d: string | null | undefined) {
  const m = (d || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d || "";
}

export interface EneisDiagnosticoRowLike {
  zona: string | null;
  distrito: string | null;
  fecha: string | null;
  antecedentes: string | null;
  objetivo_general: string | null;
  conclusiones: string | null;
  recomendaciones: string | null;
}

export async function generateEneisDiagnosticoDocx(
  d: EneisDiagnosticoRowLike,
  objetivosEspecificos: string[],
  actividades: string[],
  resultados: EneisDiagnosticoResultadoEje[],
  responsables: EneisDiagnosticoResponsable[],
  institutionName: string
): Promise<Buffer> {
  const respRows = [...responsables, ...Array(Math.max(2, 4 - responsables.length)).fill({ nombre: "", cargo: "" })];

  const N7 = 7;
  const c7 = Math.floor(W / N7);
  const GRID7 = Array.from({ length: N7 }, (_, i) => (i === N7 - 1 ? W - c7 * (N7 - 1) : c7));
  const HEADS7 = ["Eje asociado", "Componentes", "Fuente de información", "Dificultades identificadas", "Aspectos positivos", "Aspectos negativos", "Aspectos sesgados"];
  const resultadosTable = new Table({
    width: { size: W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: GRID7,
    borders,
    rows: [
      row(HEADS7.map((t) => cell([new Paragraph({ alignment: AlignmentType.CENTER, children: [r(t, { bold: true, size: SMALL })] })]))),
      ...resultados.map((rr) =>
        row(
          [rr.eje, rr.componentes, rr.fuente, rr.dificultades, rr.positivos, rr.negativos, rr.sesgados].map((v) =>
            cell([new Paragraph({ children: [r(v || "", { size: SMALL })] })])
          )
        )
      ),
    ],
  });

  const respTable = new Table({
    width: { size: W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [Math.floor(W / 2), W - Math.floor(W / 2)],
    borders,
    rows: [
      ...respRows.map((rp) =>
        row([
          cell([new Paragraph({ spacing: { after: 0 }, children: [r("Firma: _______________________")] }), new Paragraph({ spacing: { after: 0 }, children: [r(`Nombre: ${rp.nombre || ""}`)] })]),
          cell([new Paragraph({ spacing: { after: 0 }, children: [r(`Cargo: ${rp.cargo || ""}`)] })]),
        ])
      ),
    ],
  });

  const doc = new Document({
    creator: "DECE App",
    title: `Informe del Diagnóstico Institucional sobre la ENEIS`,
    styles: { default: { document: { run: { font: FONT, size: BODY } } } },
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
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100, after: 200 }, children: [r("INFORME DEL DIAGNÓSTICO INSTITUCIONAL", { bold: true, size: 24 })] }),

          h("DATOS INFORMATIVOS:"),
          new Paragraph({ children: [r("Zona: ", { bold: true }), r(d.zona || "")] }),
          new Paragraph({ children: [r("Distrito: ", { bold: true }), r(d.distrito || "")] }),
          new Paragraph({ children: [r("Institución: ", { bold: true }), r(institutionName)] }),
          new Paragraph({ children: [r("Fecha: ", { bold: true }), r(fmtDate(d.fecha))] }),

          h("ANTECEDENTES:"),
          ...multiP(d.antecedentes),

          h("OBJETIVOS:"),
          new Paragraph({ spacing: { after: 80 }, children: [r("Objetivo General: ", { bold: true }), r(d.objetivo_general || "")] }),
          new Paragraph({ spacing: { after: 40 }, children: [r("Objetivos Específicos:", { bold: true })] }),
          ...bulletList(objetivosEspecificos),

          h("ACTIVIDADES REALIZADAS:"),
          ...bulletList(actividades),

          h("RESULTADOS POR EJE:"),
          resultadosTable,

          h("CONCLUSIONES:"),
          ...multiP(d.conclusiones),

          h("RECOMENDACIONES:"),
          ...multiP(d.recomendaciones),

          h("RESPONSABLES:"),
          respTable,

          new Paragraph({ pageBreakBefore: true, alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [r("DIAGNÓSTICO INSTITUCIONAL SOBRE LA ENEIS", { bold: true })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [r("(Estrategia Nacional de Educación Integral en Sexualidad)", { italics: true, size: SMALL })] }),
          ...ENEIS_DIAGNOSTICO_GUIA_PREGUNTAS.flatMap((q, i) => [
            new Paragraph({ spacing: { before: 120, after: 40 }, children: [r(`${i + 1}. ${q}`, { bold: true, size: SMALL })] }),
          ]),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
