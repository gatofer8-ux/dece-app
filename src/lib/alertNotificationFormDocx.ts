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
import {
  ALERT_NOTIFICATION_CHECKLIST,
  ALERT_NOTIFICATION_VIOLENCE_NOTE,
  ALERT_NOTIFICATION_DESCRIPTION_HINT,
  ALERT_NOTIFICATION_INTERVENTION_QUESTIONS,
} from "./alertNotificationForm";
import { RISK_TYPE_LABELS, type RiskType } from "./types";

/**
 * Ficha de Notificación de Alerta — réplica fiel del formato original
 * (apaisado, sin logos, título en azul claro y subtítulos de sección en
 * durazno claro). Se completan solo los datos que el sistema ya conoce
 * (a partir del Acta de Identificación de Alertas); el resto queda en
 * blanco para llenarlo a mano.
 */

const FONT = "Calibri";
const TITLE_FILL = "D9E2F3";
const SECTION_FILL = "FBE4D5";
const BORDER = "808080";
const BODY = 20; // 10pt
const SMALL = 18; // 9pt

// Apaisado (A4 landscape): ancho > alto.
const PAGE_W = 16838;
const PAGE_H = 11906;
const MARGIN = { top: 1560, right: 1418, bottom: 993, left: 1134 };
const W = PAGE_W - MARGIN.left - MARGIN.right;
const N = 12;
const COL = Math.floor(W / N);
const GRID = Array.from({ length: N }, (_, i) => (i === N - 1 ? W - COL * (N - 1) : COL));

const Bd = { style: BorderStyle.SINGLE, size: 4, color: BORDER };
const borders = { top: Bd, bottom: Bd, left: Bd, right: Bd, insideHorizontal: Bd, insideVertical: Bd };

function r(text: string, o: { bold?: boolean; size?: number } = {}) {
  return new TextRun({ text, bold: o.bold ?? false, size: o.size ?? BODY, font: FONT });
}
function multiP(text: string | null | undefined): Paragraph[] {
  const t = (text || "").trim();
  if (!t) return [new Paragraph({ spacing: { after: 0, line: 240 }, children: [r(" ", { size: SMALL })] })];
  return t.split("\n").map((l) => l.trim()).filter(Boolean).map(
    (l) => new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 60, line: 240 }, children: [r(l, { size: SMALL })] })
  );
}

type VAlign = typeof VerticalAlign.TOP | typeof VerticalAlign.CENTER | typeof VerticalAlign.BOTTOM;
function cell(children: Paragraph[], o: { span?: number; fill?: string; valign?: VAlign } = {}) {
  return new TableCell({
    columnSpan: o.span ?? 1,
    shading: o.fill ? { fill: o.fill } : undefined,
    verticalAlign: o.valign ?? VerticalAlign.TOP,
    margins: { top: 40, bottom: 40, left: 70, right: 70 },
    children,
  });
}
function labelValue(label: string, value: string, span: number) {
  return cell([new Paragraph({ spacing: { after: 0, line: 232 }, children: [r(`${label}: `, { bold: true, size: SMALL }), r(value || "", { size: SMALL })] })], { span });
}
const title = (t: string) =>
  new TableRow({ children: [cell([new Paragraph({ alignment: AlignmentType.CENTER, children: [r(t, { bold: true, size: 24 })] })], { span: N, fill: TITLE_FILL })] });
const sectionBar = (t: string) =>
  new TableRow({ children: [cell([new Paragraph({ children: [r(t, { bold: true })] })], { span: N, fill: SECTION_FILL })] });
const row = (cells: TableCell[]) => new TableRow({ children: cells });

function checkboxCell(label: string, span: number) {
  return cell([new Paragraph({ spacing: { after: 0, line: 232 }, children: [r("(   )  ", { bold: true, size: SMALL }), r(label, { size: SMALL })] })], { span });
}

function fmtD(d: string | null | undefined) {
  const m = (d || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d || "";
}

export interface AlertNotificationEntryLike {
  student_name: string;
  risk_type: string;
  teacher_name: string;
  description: string | null;
}
export interface AlertNotificationSessionLike {
  curso: string | null;
  fecha: string | null;
  lugar: string | null;
}

export async function generateAlertNotificationFormDocx(
  entry: AlertNotificationEntryLike,
  session: AlertNotificationSessionLike
): Promise<Buffer> {
  const riskLabel = RISK_TYPE_LABELS[entry.risk_type as RiskType] || entry.risk_type || "";
  const lugarFecha = [session.lugar, fmtD(session.fecha)].filter(Boolean).join(" — ");
  const especificarText = [
    entry.description ? entry.description.trim() : "",
    riskLabel ? `Categoría de riesgo psicosocial reportada en el Acta de Identificación de Alertas: ${riskLabel}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const todayIso = new Date().toISOString().slice(0, 10);

  const checklistRows: TableRow[] = [];
  for (let i = 0; i < ALERT_NOTIFICATION_CHECKLIST.length; i += 2) {
    checklistRows.push(
      row([
        checkboxCell(ALERT_NOTIFICATION_CHECKLIST[i], 6),
        ALERT_NOTIFICATION_CHECKLIST[i + 1] ? checkboxCell(ALERT_NOTIFICATION_CHECKLIST[i + 1], 6) : cell([new Paragraph({ children: [] })], { span: 6 }),
      ])
    );
  }

  const rows: TableRow[] = [
    title("FICHA DE NOTIFICACIÓN DE ALERTA"),

    sectionBar("Información de la o el estudiante"),
    row([labelValue("Nombres y Apellidos", entry.student_name, 8), labelValue("C.I.", "", 4)]),
    row([labelValue("Fecha de nacimiento", "", 6), labelValue("Edad", "", 6)]),
    row([labelValue("Nombre del Representante", "", 8), labelValue("C.I.", "", 4)]),
    row([labelValue("Dirección domiciliaria", "", 8), labelValue("Teléfono", "", 4)]),
    row([labelValue("Grado o curso", session.curso || "", 4), labelValue("Paralelo", "", 4), labelValue("Jornada", "M (   )   V (   )", 4)]),
    row([labelValue("Docente Tutor", "", 12)]),

    sectionBar("INFORMACIÓN SOBRE LA ALERTA"),
    row([cell(multiP(ALERT_NOTIFICATION_VIOLENCE_NOTE), { span: N })]),
    row([cell([new Paragraph({ children: [r("Marque con una (X) en el aspecto que usted considere que el niño, niña o adolescente presenta dificultad:", { bold: true, size: SMALL })] })], { span: N })]),
    ...checklistRows,
    row([cell([new Paragraph({ spacing: { after: 40 }, children: [r("Descripción de la alerta ", { bold: true }), r(`(${ALERT_NOTIFICATION_DESCRIPTION_HINT})`, { size: SMALL })] })], { span: N })]),
    row([cell([new Paragraph({ spacing: { after: 40, line: 232 }, children: [r("Lugar y fecha del acontecimiento: ", { bold: true, size: SMALL }), r(lugarFecha, { size: SMALL })] })], { span: N })]),
    row([cell([new Paragraph({ spacing: { after: 40 }, children: [r("Especificar:", { bold: true, size: SMALL })] }), ...multiP(especificarText)], { span: N })]),

    sectionBar("INTERVENCIÓN DEL FUNCIONARIO QUE DETECTA EL CASO"),
    row([cell([new Paragraph({ children: [r("Medidas adoptadas por el docente (resuma el procedimiento que siguió con el estudiante antes de derivar al DECE)", { size: SMALL })] })], { span: N })]),
    ...ALERT_NOTIFICATION_INTERVENTION_QUESTIONS.map((q) =>
      row([
        cell(
          [
            new Paragraph({ spacing: { after: 40 }, children: [r(q, { bold: true, size: SMALL })] }),
            new Paragraph({ spacing: { after: 200 }, children: [r(" ", { size: SMALL })] }),
          ],
          { span: N }
        ),
      ])
    ),

    sectionBar("Información de quien notifica la alerta"),
    row([labelValue("Nombre y apellido", entry.teacher_name, 5), cell([new Paragraph({ alignment: AlignmentType.CENTER, children: [r("FIRMA", { bold: true, size: SMALL })] })], { span: 3 }), labelValue("Cargo", "", 4)]),
    row([labelValue("Contacto", "", 12)]),
    row([labelValue("Fecha de entrega de la ficha", fmtD(todayIso), 12)]),
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
    title: `Ficha de Notificación de Alerta — ${entry.student_name}`,
    styles: { default: { document: { run: { font: FONT, size: BODY } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_W, height: PAGE_H },
            margin: MARGIN,
          },
        },
        children: [table],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
