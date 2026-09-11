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
  ACTA_ALERTAS_ACEPTACION_TEXT,
  ACTA_ALERTAS_NOTIFICACION_TEXT,
  ACTA_ALERTAS_ACEPTACION_NOTE,
  parseAttendees,
  mergeAttendeesWithReportingTeachers,
} from "./alertIdentification";
import { RISK_TYPE_LABELS, type RiskType } from "./types";

/**
 * Acta de Identificación de Alertas (Junta de Curso) — réplica fiel del
 * formato oficial: fondos gris (BFBFBF franjas de sección, D9D9D9 etiquetas
 * de campo) con texto en azul marino (366092), igual que el modelo original.
 */

const FONT = "Aptos";
const NAVY = "366092";
const LABEL_FILL = "D9D9D9";
const BAR_FILL = "BFBFBF";
const BORDER = "808080";
const BODY = 20; // 10pt
const SMALL = 18; // 9pt

const PAGE_W = 11906;
const PAGE_H = 16838;
const MARGIN = { top: 1644, right: 1701, bottom: 1418, left: 1701, header: 460, footer: 320 };
const W = PAGE_W - MARGIN.left - MARGIN.right;
const N = 8;
const COL = Math.floor(W / N);
const GRID = Array.from({ length: N }, (_, i) => (i === N - 1 ? W - COL * (N - 1) : COL));

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
  return new TextRun({ text, bold: o.bold ?? false, size: o.size ?? BODY, color: o.color ?? NAVY, font: FONT });
}
function multiP(text: string | null | undefined, o: { bold?: boolean } = {}): Paragraph[] {
  const t = (text || "").trim();
  if (!t) return [new Paragraph({ spacing: { after: 0, line: 240 }, children: [r(" ", { size: SMALL, bold: o.bold })] })];
  return t.split("\n").map((l) => l.trim()).filter(Boolean).map(
    (l) => new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 80, line: 240 }, children: [r(l, { size: SMALL, bold: o.bold })] })
  );
}

type VAlign = typeof VerticalAlign.TOP | typeof VerticalAlign.CENTER | typeof VerticalAlign.BOTTOM;
function cell(children: Paragraph[], o: { span?: number; rowSpan?: number; fill?: string; valign?: VAlign } = {}) {
  return new TableCell({
    columnSpan: o.span ?? 1,
    rowSpan: o.rowSpan,
    shading: o.fill ? { fill: o.fill } : undefined,
    verticalAlign: o.valign ?? VerticalAlign.CENTER,
    margins: { top: 30, bottom: 30, left: 70, right: 70 },
    children,
  });
}
const lbl = (t: string, span = 1) =>
  cell([new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0, line: 232 }, children: [r(t, { bold: true, size: SMALL })] })], { fill: LABEL_FILL, span });
const val = (t: string, span = 1, o: { color?: string } = {}) =>
  cell([new Paragraph({ spacing: { after: 0, line: 232 }, children: [r(t || " ", { size: SMALL, color: o.color ?? "000000" })] })], { span });
const bar = (t: string) =>
  new TableRow({
    children: [cell([new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [r(t, { bold: true, size: BODY })] })], { span: N, fill: BAR_FILL })],
  });
const row = (cells: TableCell[]) => new TableRow({ children: cells });

function fmtD(d: string | null | undefined) {
  const m = (d || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d || "";
}

export interface AlertIdentificationSessionRowLike {
  curso: string | null;
  fecha: string | null;
  lugar: string | null;
  responsible_name: string | null;
  responsible_email: string | null;
  responsible_phone_ext: string | null;
  responsible_role: string | null;
  attendees_json: string;
  observaciones: string | null;
}
export interface AlertIdentificationEntryLike {
  student_name: string;
  risk_type: string;
  teacher_name: string;
  description?: string | null;
}

export async function generateAlertIdentificationDocx(
  s: AlertIdentificationSessionRowLike,
  entries: AlertIdentificationEntryLike[],
  institutionName: string
): Promise<Buffer> {
  const attendees = mergeAttendeesWithReportingTeachers(parseAttendees(s.attendees_json), entries);
  const attRows = [...attendees, ...Array(Math.max(2, 8 - attendees.length)).fill({ nombre: "", telefono: "" })];
  const entryRows = [...entries, ...Array(Math.max(2, 8 - entries.length)).fill({ student_name: "", risk_type: "", teacher_name: "", description: "" })];

  const rows: TableRow[] = [
    row([
      cell([new Paragraph({ children: [] })], { span: 2 }),
      cell(
        [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [r("Ministerio de Educación, Deporte y Cultura", { bold: true, size: SMALL })] })],
        { span: 4 }
      ),
      lbl("Versión:", 1),
      val("2.0", 1),
    ]),
    row([cell([new Paragraph({ children: [] })], { span: N })]),
    row([
      cell([new Paragraph({ children: [] })], { span: 2 }),
      cell([new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [r("ACTA DE IDENTIFICACIÓN DE ALERTAS", { bold: true, size: 24 })] })], { span: 6 }),
    ]),

    bar("DATOS GENERALES"),
    row([lbl("Fecha reunión", 2), val(fmtD(s.fecha), 2), lbl("Dependencia", 2), val("DEPARTAMENTO DE CONSEJERÍA ESTUDIANTIL", 2)]),
    row([lbl("Responsable del Acta", 2), lbl("Nombre", 2), lbl("Correo Electrónico", 2), lbl("Extensión Telefónica", 1), lbl("Cargo", 1)]),
    row([cell([], { span: 2 }), val(s.responsible_name || "", 2), val(s.responsible_email || "", 2), val(s.responsible_phone_ext || "", 1), val(s.responsible_role || "", 1)]),

    bar("Antecedentes de la Reunión"),
    row([lbl("Tema Reunión", 2), val(`JUNTA DE CURSO ${s.curso || ""}`, 4), lbl("Institución", 2)]),
    row([lbl("Lugar", 2), val(s.lugar || "", 4), val(institutionName, 2)]),

    bar("ESTUDIANTES EN ALERTA"),
    row([lbl("Nombre", 2), lbl("Riesgo psicosocial", 2), lbl("Descripción del caso", 2), lbl("Nombre y Firma del docente que alerta", 2)]),
    ...entryRows.map((e) =>
      row([
        val(e.student_name, 2),
        val(RISK_TYPE_LABELS[e.risk_type as RiskType] || e.risk_type || "", 2),
        cell(multiP(e.description), { span: 2, valign: VerticalAlign.TOP }),
        val(e.teacher_name, 2),
      ])
    ),

    bar("Observaciones"),
    row([cell(multiP(s.observaciones), { span: N, valign: VerticalAlign.TOP })]),

    row([cell([...multiP(ACTA_ALERTAS_ACEPTACION_TEXT, { bold: true }), ...multiP(ACTA_ALERTAS_NOTIFICACION_TEXT, { bold: true }), ...multiP(ACTA_ALERTAS_ACEPTACION_NOTE, { bold: true })], { span: N })]),

    bar("Asistentes"),
    row([lbl("Nombre", 3), lbl("Teléfono de contacto", 3), lbl("Firma", 2)]),
    ...attRows.map((a) => row([val(a.nombre, 3), val(a.telefono, 3), val(" ", 2)])),
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
    title: "Acta de Identificación de Alertas",
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
          table,
          new Paragraph({ spacing: { before: 200 }, children: [] }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: "000000" }, bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" } },
            children: [r("DOCUMENTACIÓN DE LA DIRECCIÓN NACIONAL DE ADMINISTRACIÓN DE PROCESOS", { bold: true, size: SMALL, color: "000000" })],
          }),
          new Table({
            width: { size: W, type: WidthType.DXA },
            layout: TableLayoutType.FIXED,
            columnWidths: (() => {
              const c = Math.floor(W / 5);
              return [c, c, c, c, W - c * 4];
            })(),
            borders: { top: Bd, bottom: Bd, left: Bd, right: Bd, insideHorizontal: Bd, insideVertical: Bd },
            rows: [
              row([
                cell([new Paragraph({ children: [r("Fecha Desarrollo", { bold: true, size: SMALL, color: "000000" })] })]),
                cell([new Paragraph({ children: [r("01/04/2014", { size: SMALL, color: "000000" })] })]),
                cell([new Paragraph({ children: [r("Responsable Desarrollo", { bold: true, size: SMALL, color: "000000" })] })]),
                cell([new Paragraph({ children: [r("Jessica Torres C.", { size: SMALL, color: "000000" })] })]),
                cell([new Paragraph({ alignment: AlignmentType.CENTER, children: [r("Versión del Formato", { bold: true, size: SMALL, color: "000000" })] })]),
              ]),
              row([
                cell([new Paragraph({ children: [r("Fecha Última Revisión", { bold: true, size: SMALL, color: "000000" })] })]),
                cell([new Paragraph({ children: [r("24/07/2014", { size: SMALL, color: "000000" })] })]),
                cell([new Paragraph({ children: [r("Código del Formato", { bold: true, size: SMALL, color: "000000" })] })]),
                cell([new Paragraph({ children: [r("AR-01-2014", { size: SMALL, color: "000000" })] })]),
                cell([new Paragraph({ alignment: AlignmentType.CENTER, children: [r("2.0", { size: SMALL, color: "000000" })] })]),
              ]),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
