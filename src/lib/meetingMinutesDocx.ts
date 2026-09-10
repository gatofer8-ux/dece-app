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
import {
  parseAttendees,
  parseAgenda,
  parseSignatories,
  ACCEPTANCE_TEXT,
  ACCEPTANCE_NOTE,
} from "./meetingMinutes";

const FONT = "Calibri";
const NAVY = "1F3864";
const LABEL_FILL = "DEEAF6"; // azul muy claro (celdas de etiqueta)
const BAR_FILL = "BDD7EE"; // azul claro (franjas de sección)
const BORDER = "8497B0";
const BODY = 20; // 10pt
const SMALL = 18; // 9pt

const PAGE_W = 11906;
const PAGE_H = 16838;
const MARGIN = { top: 1500, right: 1000, bottom: 1200, left: 1000, header: 460, footer: 320 };
const W = PAGE_W - MARGIN.left - MARGIN.right;
const N = 12;
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
  return new TextRun({ text, bold: o.bold ?? false, size: o.size ?? BODY, color: o.color, font: FONT });
}
function multiP(text: string | null | undefined): Paragraph[] {
  const t = (text || "").trim();
  if (!t) return [new Paragraph({ spacing: { after: 0, line: 240 }, children: [r(" ", { size: SMALL })] })];
  return t.split("\n").map((l) => l.trim()).filter(Boolean).map(
    (l) => new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 0, line: 240 }, children: [r(l, { size: SMALL })] })
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
const lbl = (t: string, span = 1, o: { rowSpan?: number } = {}) =>
  cell([new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0, line: 232 }, children: [r(t, { bold: true, size: SMALL, color: NAVY })] })], { fill: LABEL_FILL, span, rowSpan: o.rowSpan });
const val = (t: string, span = 1) =>
  cell([new Paragraph({ spacing: { after: 0, line: 232 }, children: [r(t || " ", { size: SMALL })] })], { span });
const bar = (t: string) =>
  new TableRow({
    children: [
      cell([new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [r(t, { bold: true, size: BODY, color: NAVY })] })], { span: N, fill: BAR_FILL }),
    ],
  });
const row = (cells: TableCell[]) => new TableRow({ children: cells });

function fmtD(d: string | null | undefined) {
  const m = (d || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d || "";
}

export interface MeetingMinutesRowLike {
  meeting_code: string | null;
  meeting_date: string | null;
  next_meeting_date: string | null;
  responsible_name: string | null;
  responsible_email: string | null;
  responsible_phone_ext: string | null;
  responsible_role: string | null;
  meeting_topic: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  thematic_background: string | null;
  attendees_json: string;
  agenda_json: string;
  signatories_json: string;
  additional_comments: string | null;
}

export async function generateMeetingMinutesDocx(m: MeetingMinutesRowLike): Promise<Buffer> {
  const attendees = parseAttendees(m.attendees_json);
  const agenda = parseAgenda(m.agenda_json);
  const signatories = parseSignatories(m.signatories_json);
  // El acta oficial reserva filas en blanco para completar a mano.
  const attRows = [...attendees, ...Array(Math.max(2, 8 - attendees.length)).fill({ nombre: "", correo: "", cargo: "" })];
  const agRows = agenda.length ? agenda : [{ tema: "", compromiso: "", responsable: "", fecha_plazo: "" }];
  const sigRows = [...signatories, ...Array(Math.max(2, 8 - signatories.length)).fill({ nombre: "" })];

  const rows: TableRow[] = [
    // Encabezado del formato
    row([
      cell([new Paragraph({ children: [] })], { span: 2 }),
      cell(
        [
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [r("Ministerio de Educación", { bold: true, size: SMALL, color: NAVY })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [r("Dirección Nacional de Administración de Procesos", { bold: true, size: SMALL, color: NAVY })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [r("Acta de Reunión", { bold: true, size: SMALL, color: NAVY })] }),
        ],
        { span: 8, fill: LABEL_FILL }
      ),
      cell([new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [r("Versión: 2.0", { bold: true, size: SMALL, color: NAVY })] })], { span: 2, fill: LABEL_FILL }),
    ]),

    bar("DATOS GENERALES"),
    row([lbl("Fecha reunión", 3), val(fmtD(m.meeting_date), 3), lbl("Código Reunión", 3), val(m.meeting_code || "", 3)]),
    row([lbl("Fecha próxima reunión", 3), val(fmtD(m.next_meeting_date), 3), lbl("Dependencia", 3), val("DECE", 3)]),
    row([lbl("Responsable del Acta", 3, { rowSpan: 2 }), lbl("Nombre", 3), lbl("Contacto (correo / ext.)", 3), lbl("Cargo", 3)]),
    row([val(m.responsible_name || "", 3), val(`${m.responsible_email || ""}${m.responsible_phone_ext ? ` / Ext. ${m.responsible_phone_ext}` : ""}`, 3), val(m.responsible_role || "", 3)]),

    bar("Antecedentes de la Reunión"),
    row([lbl("Tema Reunión", 3), val(m.meeting_topic || "", 5), lbl("Hora Inicio", 2), val(m.start_time || "", 2)]),
    row([lbl("Lugar", 3), val(m.location || "", 5), lbl("Hora Fin", 2), val(m.end_time || "", 2)]),
    row([lbl("Antecedentes de la Temática", 3), cell(multiP(m.thematic_background), { span: 9, valign: VerticalAlign.TOP })]),

    bar("Asistentes"),
    row([lbl("Nombre", 4), lbl("Contacto (correo electrónico)", 4), lbl("Cargo", 4)]),
    ...attRows.map((a) => row([val(a.nombre, 4), val(a.correo, 4), val(a.cargo, 4)])),

    bar("Desarrollo de la Reunión"),
    row([lbl("Tema", 2), lbl("Compromiso", 6), lbl("Responsable", 2), lbl("Fecha Plazo", 2)]),
    ...agRows.map((it) =>
      row([
        cell(multiP(it.tema), { span: 2, valign: VerticalAlign.TOP }),
        cell(multiP(it.compromiso), { span: 6, valign: VerticalAlign.TOP }),
        cell(multiP(it.responsable), { span: 2, valign: VerticalAlign.TOP }),
        cell(multiP(it.fecha_plazo), { span: 2, valign: VerticalAlign.TOP }),
      ])
    ),

    bar("Aceptación"),
    row([
      cell(
        [
          new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 40, line: 240 }, children: [r(ACCEPTANCE_TEXT, { size: SMALL, color: NAVY })] }),
          new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 0, line: 240 }, children: [r(ACCEPTANCE_NOTE, { bold: true, size: SMALL, color: NAVY })] }),
        ],
        { span: N }
      ),
    ]),
    row([lbl("NOMBRE", 6), lbl("FIRMA", 6)]),
    ...sigRows.map((s) => row([val(s.nombre, 6), val(" ", 6)])),

    bar("OBSERVACIONES Y COMENTARIOS ADICIONALES"),
    row([cell(multiP(m.additional_comments), { span: N, valign: VerticalAlign.TOP })]),
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
    title: `Acta de Reunión ${m.meeting_code || ""}`,
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
        children: [table],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
