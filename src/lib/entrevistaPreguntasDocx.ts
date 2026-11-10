import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Header,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import {
  pairQuestions,
  visibleStructure,
  type Answers,
  type InterviewStructure,
  type Letterhead,
} from "./entrevistaPreguntas";

const FONT = "Times New Roman";
const PAGE_W = 11906;
const PAGE_H = 16838;
const MARGIN_X = 1134; // 2 cm
const CONTENT_W = PAGE_W - MARGIN_X * 2; // 9638

export interface InterviewDocData {
  letterhead: Letterhead;
  logoDataUri: string | null;
  structure: InterviewStructure;
  answers: Answers;
  student: string;
  course: string;
  date: string;
  professional: string;
  professionalRole: string;
  schoolYear: string;
}

/* ---------------- Imagen (logo) ---------------- */

export function dataUriToBuffer(uri: string | null): { buf: Buffer; type: "png" | "jpg" | "gif" } | null {
  if (!uri) return null;
  const m = uri.match(/^data:image\/(png|jpe?g|gif);base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!m) return null;
  const kind = m[1].toLowerCase();
  return { buf: Buffer.from(m[2].replace(/\s/g, ""), "base64"), type: kind === "png" ? "png" : kind === "gif" ? "gif" : "jpg" };
}

export function imageSize(buf: Buffer, type: "png" | "jpg" | "gif"): { w: number; h: number } | null {
  try {
    if (type === "png") return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
    if (type === "gif") return { w: buf.readUInt16LE(6), h: buf.readUInt16LE(8) };
    let i = 2;
    while (i < buf.length) {
      if (buf[i] !== 0xff) return null;
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      }
      i += 2 + len;
    }
  } catch {
    /* imagen ilegible: se omite el logo */
  }
  return null;
}

function logoRun(uri: string | null): ImageRun | null {
  const img = dataUriToBuffer(uri);
  if (!img) return null;
  const size = imageSize(img.buf, img.type);
  if (!size || !size.w || !size.h) return null;
  const maxH = 70;
  const maxW = 90;
  const scale = Math.min(maxW / size.w, maxH / size.h, 1);
  return new ImageRun({
    data: img.buf,
    type: img.type,
    transformation: { width: Math.max(1, Math.round(size.w * scale)), height: Math.max(1, Math.round(size.h * scale)) },
  });
}

/* ---------------- Documento por defecto ---------------- */

const line = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const noLine = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
type CellBorders = { top: typeof line | typeof noLine; bottom: typeof line | typeof noLine; left: typeof line | typeof noLine; right: typeof line | typeof noLine };
const allBorders: CellBorders = { top: line, bottom: line, left: line, right: line };
const noBorders: CellBorders = { top: noLine, bottom: noLine, left: noLine, right: noLine };

function run(text: string, opts: { bold?: boolean; italics?: boolean; size?: number } = {}) {
  return new TextRun({ text, font: FONT, size: opts.size ?? 22, bold: opts.bold, italics: opts.italics });
}

function cell(
  children: Paragraph[],
  opts: { span?: number; width?: number; fill?: string; borders?: CellBorders } = {}
) {
  return new TableCell({
    children,
    columnSpan: opts.span,
    width: { size: opts.width ?? CONTENT_W, type: WidthType.DXA },
    borders: opts.borders ?? allBorders,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    verticalAlign: VerticalAlign.CENTER,
    shading: opts.fill ? { type: ShadingType.CLEAR, color: "auto", fill: opts.fill } : undefined,
  });
}

function para(text: string, opts: { bold?: boolean; italics?: boolean; size?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) {
  // Respeta saltos de línea escritos en las respuestas.
  const parts = (text || "").split(/\r?\n/);
  return new Paragraph({
    alignment: opts.align,
    spacing: { before: 0, after: 0 },
    children: parts.map((p, i) => new TextRun({ text: p, break: i ? 1 : 0, font: FONT, size: opts.size ?? 22, bold: opts.bold, italics: opts.italics })),
  });
}

function buildHeader(d: InterviewDocData): Header {
  const lh = d.letterhead;
  const logo = lh.showLogo ? logoRun(d.logoDataUri) : null;
  const textLines: Paragraph[] = [];
  if (lh.institutionName) textLines.push(para(lh.institutionName.toUpperCase(), { bold: true, size: 26, align: AlignmentType.CENTER }));
  if (lh.motto) textLines.push(para(lh.motto, { italics: true, size: 20, align: AlignmentType.CENTER }));
  if (lh.department) textLines.push(para(lh.department.toUpperCase(), { bold: true, size: 22, align: AlignmentType.CENTER }));
  if (lh.showSchoolYear && d.schoolYear) textLines.push(para(`Año Lectivo ${d.schoolYear}`, { size: 22, align: AlignmentType.CENTER }));

  const logoW = 1700;
  const rows = [
    new TableRow({
      children: [
        cell([new Paragraph({ children: logo ? [logo] : [] })], { width: logoW, borders: noBorders }),
        cell(textLines.length ? textLines : [new Paragraph({})], { width: CONTENT_W - logoW, borders: noBorders }),
      ],
    }),
  ];
  return new Header({
    children: [
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [logoW, CONTENT_W - logoW],
        borders: { ...noBorders, insideHorizontal: noLine, insideVertical: noLine },
        rows,
      }),
    ],
  });
}

export async function generateDefaultInterviewDocx(d: InterviewDocData): Promise<Buffer> {
  const vis = visibleStructure(d.structure);
  const half = Math.floor(CONTENT_W / 2);
  const rows: TableRow[] = [];

  rows.push(new TableRow({ children: [cell([para(vis.title, { bold: true, size: 24, align: AlignmentType.CENTER })], { fill: "D9D9D9" })] }));
  rows.push(new TableRow({ children: [cell([para(`NOMBRES Y APELLIDOS: ${d.student}`, { bold: true })])] }));
  rows.push(new TableRow({ children: [cell([para(`CURSO/PARALELO/ JORNADA: ${d.course}`, { bold: true })])] }));
  rows.push(new TableRow({ children: [cell([para(`FECHA: ${d.date}`, { bold: true })])] }));

  for (const sec of vis.sections) {
    rows.push(new TableRow({ children: [cell([para(sec.title, { bold: true })], { fill: "D9D9D9" })] }));
    for (const pair of pairQuestions(sec.questions)) {
      const widths = pair.length === 2 ? [half, CONTENT_W - half] : [CONTENT_W];
      rows.push(
        new TableRow({
          children: pair.map((qq, i) => cell([para(qq.text, { bold: true })], { width: widths[i], fill: "F2F2F2" })),
        })
      );
      rows.push(
        new TableRow({
          height: { value: 700, rule: "atLeast" as any },
          children: pair.map((qq, i) => cell([para(d.answers[qq.id] || "")], { width: widths[i] })),
        })
      );
    }
  }

  // Firmas
  rows.push(
    new TableRow({
      height: { value: 1100, rule: "atLeast" as any },
      children: [
        cell([para("")], { width: half, borders: noBorders }),
        cell([para("")], { width: CONTENT_W - half, borders: noBorders }),
      ],
    })
  );
  rows.push(
    new TableRow({
      children: [
        cell([para("_____________________________________", { align: AlignmentType.CENTER }), para("Nombres y Apellidos del estudiante", { align: AlignmentType.CENTER, size: 20 })], { width: half, borders: noBorders }),
        cell(
          [
            para("__________________________________", { align: AlignmentType.CENTER }),
            para(d.professional ? `${d.professional}` : "Profesional DECE", { align: AlignmentType.CENTER, size: 20 }),
            para(d.professionalRole || "Profesional DECE", { align: AlignmentType.CENTER, size: 20 }),
          ],
          { width: CONTENT_W - half, borders: noBorders }
        ),
      ],
    })
  );

  const doc = new Document({
    creator: "SADEX",
    styles: { default: { document: { run: { font: FONT, size: 22 } } } },
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: PAGE_H }, margin: { top: 1700, bottom: 1134, left: MARGIN_X, right: MARGIN_X, header: 500 } } },
        headers: { default: buildHeader(d) },
        children: [
          new Table({
            width: { size: CONTENT_W, type: WidthType.DXA },
            columnWidths: [half, CONTENT_W - half],
            rows,
          }),
        ],
      },
    ],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

/* ---------------- Plantilla propia (.docx con marcadores {{...}}) ---------------- */

/** Datos disponibles para los marcadores de una plantilla propia. */
export function buildFillData(d: InterviewDocData) {
  const vis = visibleStructure(d.structure);
  const secciones = vis.sections.map((sec) => ({
    titulo: sec.title,
    preguntas: sec.questions.map((qq) => ({ pregunta: qq.text, respuesta: d.answers[qq.id] || "" })),
  }));
  const flat: Record<string, string> = {};
  for (const sec of d.structure.sections) {
    for (const qq of sec.questions) {
      flat[`r_${qq.id}`] = d.answers[qq.id] || "";
      flat[`p_${qq.id}`] = qq.text;
    }
  }
  return {
    titulo: vis.title,
    institucion: d.letterhead.institutionName,
    lema: d.letterhead.motto,
    departamento: d.letterhead.department,
    anio_lectivo: d.schoolYear,
    estudiante: d.student,
    curso: d.course,
    fecha: d.date,
    profesional: d.professional,
    cargo_profesional: d.professionalRole,
    secciones,
    ...flat,
  };
}

function newTemplater(buffer: Buffer) {
  const zip = new PizZip(buffer);
  if (!zip.file("word/document.xml")) throw new Error("El archivo no es un documento Word (.docx) válido.");
  return new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{{", end: "}}" },
    nullGetter: () => "",
  });
}

/** Revisa que la plantilla compile (marcadores bien cerrados) y devuelve un mensaje legible si no. */
export function validateTemplate(buffer: Buffer): string | null {
  try {
    const t = newTemplater(buffer);
    t.render({});
    return null;
  } catch (e: any) {
    const sub = e?.properties?.errors as any[] | undefined;
    if (sub?.length) {
      const first = sub[0]?.properties;
      return `La plantilla tiene un marcador mal escrito: ${first?.explanation || sub[0]?.message || "revisa las llaves {{ }}"}.`;
    }
    return e?.message?.startsWith("El archivo") ? e.message : "No se pudo leer la plantilla. Verifica que sea un .docx válido y que los marcadores {{ }} estén completos.";
  }
}

export function fillCustomTemplate(buffer: Buffer, d: InterviewDocData): Buffer {
  const t = newTemplater(buffer);
  t.render(buildFillData(d));
  return t.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
}

/** Plantilla base descargable: el usuario la edita en Word (membrete, letra, logo) y la vuelve a subir. */
export async function buildBaseTemplate(): Promise<Buffer> {
  const p = (text: string, o: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; size?: number; italics?: boolean } = {}) =>
    new Paragraph({
      alignment: o.align,
      spacing: { after: 80 },
      children: [new TextRun({ text, font: FONT, size: o.size ?? 22, bold: o.bold, italics: o.italics })],
    });
  const header = new Header({
    children: [
      p("{{institucion}}", { bold: true, align: AlignmentType.CENTER, size: 26 }),
      p("{{lema}}", { italics: true, align: AlignmentType.CENTER, size: 20 }),
      p("{{departamento}}", { bold: true, align: AlignmentType.CENTER }),
      p("Año Lectivo {{anio_lectivo}}", { align: AlignmentType.CENTER }),
    ],
  });
  const doc = new Document({
    creator: "SADEX",
    styles: { default: { document: { run: { font: FONT, size: 22 } } } },
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: PAGE_H }, margin: { top: 1700, bottom: 1134, left: MARGIN_X, right: MARGIN_X, header: 500 } } },
        headers: { default: header },
        children: [
          p("{{titulo}}", { bold: true, align: AlignmentType.CENTER, size: 24 }),
          p("NOMBRES Y APELLIDOS: {{estudiante}}", { bold: true }),
          p("CURSO/PARALELO/JORNADA: {{curso}}", { bold: true }),
          p("FECHA: {{fecha}}", { bold: true }),
          p("{{#secciones}}"),
          p("{{titulo}}", { bold: true }),
          p("{{#preguntas}}"),
          p("{{pregunta}}", { bold: true }),
          p("{{respuesta}}"),
          p("{{/preguntas}}"),
          p("{{/secciones}}"),
          p(""),
          p("_____________________________________", { align: AlignmentType.CENTER }),
          p("{{estudiante}}", { align: AlignmentType.CENTER, size: 20 }),
          p("{{profesional}} — {{cargo_profesional}}", { align: AlignmentType.CENTER, size: 20 }),
        ],
      },
    ],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}
