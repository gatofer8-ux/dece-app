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
import { parseEneisActaParticipants, parseEneisActaCompromisos } from "./eneisActas";

/**
 * Acta de reunión ENEIS — réplica fiel del formato propio de seguimiento
 * mensual de la Comisión/Red institucional ENEIS que usa la institución
 * (distinto del acta general del DECE en /actas-reunion): tabla simple en
 * blanco y negro, sin colores de relleno, con las mismas secciones y
 * columnas del modelo original.
 */

const FONT = "Calibri";
const BODY = 20; // 10pt
const SMALL = 18; // 9pt

const PAGE_W = 11906;
const PAGE_H = 16838;
const MARGIN = { top: 1500, right: 1000, bottom: 1200, left: 1000, header: 460, footer: 320 };
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

function r(text: string, o: { bold?: boolean; size?: number } = {}) {
  return new TextRun({ text, bold: o.bold ?? false, size: o.size ?? BODY, font: FONT });
}
function labelValue(label: string, value: string) {
  return new Paragraph({ spacing: { after: 0, line: 240 }, children: [r(`${label}: `, { bold: true }), r(value || "")] });
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

type VAlign = typeof VerticalAlign.TOP | typeof VerticalAlign.CENTER | typeof VerticalAlign.BOTTOM;
function cell(children: Paragraph[], o: { span?: number; valign?: VAlign } = {}) {
  return new TableCell({
    columnSpan: o.span ?? 1,
    verticalAlign: o.valign ?? VerticalAlign.CENTER,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children,
  });
}
const titleRow = (t: string, span: number) =>
  new TableRow({
    children: [cell([new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [r(t, { bold: true })] })], { span })],
  });
const row = (cells: TableCell[]) => new TableRow({ children: cells });

function fmtDateParts(iso: string | null | undefined): { dia: string; mes: string; anio: string } {
  const m = (iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return { dia: "", mes: "", anio: "" };
  const MESES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  return { dia: String(Number(m[3])), mes: MESES[Number(m[2]) - 1] || m[2], anio: m[1] };
}
function fmtShortDate(d: string | null | undefined) {
  const m = (d || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d || "";
}

export interface EneisActaRowLike {
  ciudad: string | null;
  meeting_date: string | null;
  tema: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  lugar: string | null;
  desarrollo: string | null;
  participants_json: string;
  compromisos_json: string;
}

export interface EneisActaInstitutionHeader {
  districtLine: string;
  institutionName: string;
  actaNumero: string;
}

export async function generateEneisActaDocx(a: EneisActaRowLike, header: EneisActaInstitutionHeader): Promise<Buffer> {
  const { dia, mes, anio } = fmtDateParts(a.meeting_date);
  const participants = parseEneisActaParticipants(a.participants_json);
  const compromisos = parseEneisActaCompromisos(a.compromisos_json);
  const partRows = [...participants, ...Array(Math.max(2, 6 - participants.length)).fill({ nombre: "", cargo: "" })];
  const compRows = compromisos.length ? compromisos : [{ compromiso: "", responsable: "", fecha: "" }];

  const N = 4;
  const COL = Math.floor(W / N);
  const GRID = Array.from({ length: N }, (_, i) => (i === N - 1 ? W - COL * (N - 1) : COL));

  const rows: TableRow[] = [
    row([
      cell([labelValue("Ciudad", a.ciudad || "")]),
      cell([labelValue("Mes", mes)]),
      cell([labelValue("Día", dia)]),
      cell([labelValue("Año", anio)]),
    ]),
    row([cell([labelValue("Tema", a.tema || "")], { span: 2 }), cell([labelValue("Hora Inicial", a.hora_inicio || "")]), cell([labelValue("Hora Final", a.hora_fin || "")])]),
    row([cell([labelValue("Lugar", a.lugar || "")], { span: N })]),
  ];
  const datosTable = new Table({ width: { size: W, type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: GRID, borders, rows });

  const partN = 2;
  const partCol = Math.floor(W / partN);
  const partGrid = [partCol, W - partCol];
  const participantsTable = new Table({
    width: { size: W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: partGrid,
    borders,
    rows: [
      row([cell([new Paragraph({ alignment: AlignmentType.CENTER, children: [r("NOMBRES Y APELLIDOS", { bold: true })] })]), cell([new Paragraph({ alignment: AlignmentType.CENTER, children: [r("CARGO", { bold: true })] })])]),
      ...partRows.map((p) => row([cell([new Paragraph({ children: [r(p.nombre || "")] })]), cell([new Paragraph({ children: [r(p.cargo || "")] })])])),
    ],
  });

  const desarrolloTable = new Table({
    width: { size: W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [W],
    borders,
    rows: [titleRow("DESARROLLO DE LA REUNIÓN", 1), row([cell(multiP(a.desarrollo), { valign: VerticalAlign.TOP })])],
  });

  const compN = 3;
  const compCol = Math.floor(W / compN);
  const compGrid = [compCol, compCol, W - compCol * 2];
  const compromisosTable = new Table({
    width: { size: W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: compGrid,
    borders,
    rows: [
      row([
        cell([new Paragraph({ alignment: AlignmentType.CENTER, children: [r("COMPROMISOS", { bold: true })] })]),
        cell([new Paragraph({ alignment: AlignmentType.CENTER, children: [r("RESPONSABLES", { bold: true })] })]),
        cell([new Paragraph({ alignment: AlignmentType.CENTER, children: [r("FECHAS TENTATIVAS", { bold: true })] })]),
      ]),
      ...compRows.map((c) =>
        row([
          cell(multiP(c.compromiso), { valign: VerticalAlign.TOP }),
          cell([new Paragraph({ children: [r(c.responsable || "")] })]),
          cell([new Paragraph({ children: [r(fmtShortDate(c.fecha) || c.fecha || "")] })]),
        ])
      ),
    ],
  });

  const firmasTable = new Table({
    width: { size: W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [Math.floor(W * 0.38), Math.floor(W * 0.3), W - Math.floor(W * 0.38) - Math.floor(W * 0.3)],
    borders,
    rows: [
      row([
        cell([new Paragraph({ alignment: AlignmentType.CENTER, children: [r("NOMBRES Y APELLIDOS", { bold: true })] })]),
        cell([new Paragraph({ alignment: AlignmentType.CENTER, children: [r("CARGO", { bold: true })] })]),
        cell([new Paragraph({ alignment: AlignmentType.CENTER, children: [r("FIRMAS", { bold: true })] })]),
      ]),
      ...partRows.map((p) =>
        row([
          cell([new Paragraph({ children: [r(p.nombre || "")] })]),
          cell([new Paragraph({ children: [r(p.cargo || "")] })]),
          cell([new Paragraph({ children: [r(" ")] })], { valign: VerticalAlign.CENTER }),
        ])
      ),
    ],
  });

  const doc = new Document({
    creator: "DECE App",
    title: `Acta de Reunión ENEIS ${header.actaNumero}`,
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
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 0 }, children: [r(header.districtLine, { bold: true, size: SMALL })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [r(`INSTITUCIÓN EDUCATIVA "${header.institutionName}"`, { bold: true, size: SMALL })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [r(`ACTA N° ${header.actaNumero}`, { bold: true, size: SMALL })] }),
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
          datosTable,
          new Paragraph({ spacing: { before: 120, after: 60 }, children: [r("Personas convocadas:", { bold: true })] }),
          participantsTable,
          new Paragraph({ spacing: { before: 120, after: 0 }, children: [] }),
          desarrolloTable,
          new Paragraph({ spacing: { before: 120, after: 0 }, children: [] }),
          compromisosTable,
          new Paragraph({ spacing: { before: 120, after: 60 }, children: [r("FIRMAS DE RESPONSABILIDAD", { bold: true })] }),
          firmasTable,
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
