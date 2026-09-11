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
import { getMaterialLabel } from "./eneisMaterialesCatalog";

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

function r(text: string, o: { bold?: boolean; italics?: boolean; size?: number; color?: string } = {}) {
  return new TextRun({ text, bold: o.bold ?? false, italics: o.italics, size: o.size ?? SMALL, color: o.color, font: FONT });
}
function cell(children: Paragraph[], o: { span?: number; fill?: string } = {}) {
  return new TableCell({
    columnSpan: o.span ?? 1,
    shading: o.fill ? { fill: o.fill } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 50, bottom: 50, left: 80, right: 80 },
    children,
  });
}
const lbl = (t: string) =>
  cell([new Paragraph({ spacing: { after: 0, line: 232 }, children: [r(t, { bold: true, size: SMALL, color: NAVY })] })], { fill: LABEL_FILL });
const val = (t: string, span = 1) => cell([new Paragraph({ spacing: { after: 0, line: 232 }, children: [r(t || " ", { size: SMALL })] })], { span });
const row = (cells: TableCell[]) => new TableRow({ children: cells });
const barRow = (t: string, span: number) =>
  row([cell([new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [r(t, { bold: true, size: BODY, color: NAVY })] })], { span, fill: LABEL_FILL })]);

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}
function fechasRango(desde: string | null, hasta: string | null): string {
  if (desde && hasta && desde !== hasta) return `${fmtDate(desde)} al ${fmtDate(hasta)}`;
  return fmtDate(desde || hasta) || "";
}

function buildFichaTable(ficha: EneisFichaRow, courseLabel: string): Table {
  const rows: TableRow[] = [
    row([lbl("Herramienta"), val("Oportunidades Curriculares de Educación Integral en Sexualidad.", 3)]),
    row([lbl("Subnivel de educación"), val(ficha.subnivel || "", 3)]),
    row([lbl("Fechas"), val(fechasRango(ficha.fecha_desde, ficha.fecha_hasta)), lbl("Grado/Curso"), val(courseLabel)]),
    row([lbl("Docente"), val(ficha.docente_nombre), lbl("Paralelo"), val(ficha.paralelo || "")]),
    row([lbl("Asignatura"), val(ficha.asignatura, 3)]),
    row([lbl("Nombre de la ficha"), val((ficha.nombre_ficha || "").toUpperCase(), 3)]),
    row([lbl("Material de referencia"), val(getMaterialLabel(ficha.material_id) || "", 3)]),
    row([lbl("Objetivo Curricular del Área"), val(ficha.objetivo_curricular || "", 3)]),
    row([lbl("Objetivo de Educación Integral en Sexualidad"), val(ficha.objetivo_eis || "", 3)]),
    row([lbl("Destrezas con criterios de desempeño a evaluar"), val(ficha.destrezas || "", 3)]),
    row([lbl("Orientación Conceptual"), val(ficha.orientacion_conceptual || "", 3)]),
    row([lbl("Recursos"), val(ficha.recursos || "", 3)]),
    barRow("Propuesta Didáctica", 4),
    row([lbl("Anticipación"), val(ficha.anticipacion || "", 3)]),
    row([lbl("Conceptualización y construcción de conocimiento"), val(ficha.conceptualizacion || "", 3)]),
    row([lbl("Consolidación"), val(ficha.consolidacion || "", 3)]),
    row([lbl("Indicadores de evaluación"), val(ficha.indicadores_evaluacion || "", 3)]),
    row([
      lbl("Resultados"),
      val(
        ficha.num_estudiantes_capacitados
          ? `Número de estudiantes capacitados: ${ficha.num_estudiantes_capacitados}${courseLabel ? ` (${courseLabel}${ficha.paralelo ? ` "${ficha.paralelo}"` : ""})` : ""}`
          : "",
        3
      ),
    ]),
    row([lbl("Observaciones"), val(ficha.observaciones || "", 3)]),
  ];

  return new Table({
    width: { size: W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [Math.round(W * 0.22), Math.round(W * 0.28), Math.round(W * 0.22), Math.round(W * 0.28) - 1],
    alignment: AlignmentType.CENTER,
    borders,
    rows,
  });
}

function buildFirmasTable(ficha: EneisFichaRow): Table {
  const col = Math.floor(W / 3);
  return new Table({
    width: { size: W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [col, col, W - col * 2],
    alignment: AlignmentType.CENTER,
    borders,
    rows: [
      row([lbl("Elaborado por Docente"), lbl("Entregado Rectorado"), lbl("Aprobado Coordinador ENEIS")]),
      row([val(`Nombre: ${ficha.docente_nombre}`), val("Nombre:"), val("Nombre:")]),
      row([
        cell([new Paragraph({ spacing: { before: 260 }, children: [r("Firma:", { size: SMALL })] })]),
        cell([new Paragraph({ spacing: { before: 260 }, children: [r("Firma:", { size: SMALL })] })]),
        cell([new Paragraph({ spacing: { before: 260 }, children: [r("Firma:", { size: SMALL })] })]),
      ]),
      row([val(`Fecha: ${fmtDate(ficha.fecha_hasta || ficha.fecha_desde)}`), val("Fecha:"), val("Fecha:")]),
    ],
  });
}

function buildFichaBlock(ficha: EneisFichaRow, institutionName: string, isFirst: boolean): (Paragraph | Table)[] {
  const schoolYear = currentSchoolYearText();
  const courseLabel = ficha.curso || "";
  return [
    new Paragraph({
      pageBreakBefore: !isFirst,
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [r("FICHA DE ACTIVIDADES DE APLICACIÓN ENEIS", { bold: true, size: BODY, color: NAVY })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [r(`${institutionName} — Año lectivo ${schoolYear}`, { size: SMALL, italics: true })],
    }),
    buildFichaTable(ficha, courseLabel),
    new Paragraph({ spacing: { before: 200 } }),
    buildFirmasTable(ficha),
  ];
}

export async function generateEneisFichaDocx(ficha: EneisFichaRow, institutionName: string): Promise<Buffer> {
  return packDoc([...buildFichaBlock(ficha, institutionName, true)], "Ficha de Aplicación ENEIS");
}

export async function generateEneisFichasBatchDocx(fichas: EneisFichaRow[], institutionName: string): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];
  fichas.forEach((f, i) => children.push(...buildFichaBlock(f, institutionName, i === 0)));
  return packDoc(children, "Fichas de Aplicación ENEIS");
}

async function packDoc(children: (Paragraph | Table)[], title: string): Promise<Buffer> {
  const doc = new Document({
    creator: "DECE App",
    title,
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
        children,
      },
    ],
  });
  return await Packer.toBuffer(doc);
}
