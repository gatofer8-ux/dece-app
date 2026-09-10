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
import type { CaseAccompanimentReportRow } from "./types";
import {
  parseIndicators,
  parseRiskProtection,
  parseExtReferral,
  parsePsychosocialReferral,
  INDICATOR_SIGNOS_FISICOS,
  INDICATOR_SIGNOS_COMPORTAMIENTO,
  INDICATOR_CONDUCTAS_IE,
  FACTOR_PERSONALES_RIESGO,
  FACTOR_PERSONALES_PROTECCION,
  FACTOR_FAMILIARES_RIESGO,
  FACTOR_FAMILIARES_PROTECCION,
  FACTOR_SITUACIONALES_RIESGO,
  FACTOR_SITUACIONALES_PROTECCION,
  EXT_REFERRAL_INSTANCES,
  PSYCHOSOCIAL_REFERRAL_OPTIONS,
} from "./accompanimentReport";

// Calca del formato oficial: una sola tabla continua, todo el cuerpo con
// relleno gris claro (F2F2F2), franjas de sección en gris medio (BFBFBF /
// D9D9D9), título en A6A6A6, bordes negros finos (estilo "Tabla con cuadrícula"
// de Word).
const FONT = "Calibri";
const FILL_BODY = "F2F2F2";
const FILL_SEC = "BFBFBF";
const FILL_SEC2 = "D9D9D9";
const FILL_TITLE = "A6A6A6";
const FILL_MARK = "FFFFFF";
const BODY = 22; // 11pt
const SMALL = 20; // 10pt
const TINY = 16; // 8pt

const PAGE_W = 11900;
const PAGE_H = 15874;
const MARGIN = { top: 1700, right: 1130, bottom: 1280, left: 1420, header: 460, footer: 320 };
const W = PAGE_W - MARGIN.left - MARGIN.right; // ≈ 9350
const NCOLS = 12;
const COL = Math.floor(W / NCOLS);
const GRID = Array.from({ length: NCOLS }, (_, i) => (i === NCOLS - 1 ? W - COL * (NCOLS - 1) : COL));

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

const B = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const borders = { top: B, bottom: B, left: B, right: B, insideHorizontal: B, insideVertical: B };

function run(text: string, o: { bold?: boolean; size?: number } = {}) {
  return new TextRun({ text, bold: o.bold ?? false, size: o.size ?? SMALL, font: FONT });
}
function pJust(text: string, size = SMALL) {
  return new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 0, line: 248 }, children: [run(text, { size })] });
}
function pLines(text: string | null | undefined, size = SMALL): Paragraph[] {
  const t = (text || "").trim();
  if (!t) return [pJust("—", size)];
  return t.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => pJust(l, size));
}

type VAlign = typeof VerticalAlign.TOP | typeof VerticalAlign.CENTER | typeof VerticalAlign.BOTTOM;
function cell(
  children: Paragraph[],
  o: { span?: number; fill?: string; valign?: VAlign; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}
) {
  return new TableCell({
    columnSpan: o.span ?? NCOLS,
    shading: { fill: o.fill ?? FILL_BODY },
    verticalAlign: o.valign ?? VerticalAlign.CENTER,
    margins: { top: 30, bottom: 30, left: 80, right: 80 },
    children,
  });
}
const R = (cells: TableCell[]) => new TableRow({ children: cells });

// Fila a todo el ancho con etiqueta en negrita seguida de valor normal.
function fieldRow(label: string, value: string) {
  return R([
    cell([
      new Paragraph({
        spacing: { after: 0, line: 248 },
        children: [run(label + " ", { bold: true }), run(value || "", {})],
      }),
    ]),
  ]);
}
function sectionRow(text: string, fill = FILL_SEC) {
  return R([cell([new Paragraph({ spacing: { after: 0 }, children: [run(text, { bold: true })] })], { fill })]);
}
function textBlockRow(text: string | null | undefined) {
  return R([cell(pLines(text), { valign: VerticalAlign.TOP })]);
}
function checklistParas(prefix: string, options: string[], selected: string[], otros: string): Paragraph[] {
  const out: Paragraph[] = [];
  if (prefix) out.push(new Paragraph({ spacing: { after: 30 }, children: [run(prefix, { bold: true, size: TINY })] }));
  for (const opt of options) {
    out.push(new Paragraph({ spacing: { after: 14, line: 216 }, children: [run(`${selected.includes(opt) ? "☑" : "☐"} ${opt}`, { size: TINY })] }));
  }
  out.push(new Paragraph({ spacing: { after: 0, line: 216 }, children: [run(`Otros: ${otros || ""}`, { size: TINY })] }));
  return out;
}
function markRow(marked: boolean, label: string) {
  return R([
    cell([new Paragraph({ spacing: { after: 0 }, children: [] })], { span: 1 }),
    cell([new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [run(marked ? "X" : "", { bold: true })] })], { span: 1, fill: FILL_MARK }),
    cell([new Paragraph({ spacing: { after: 0, line: 248 }, children: [run(label, {})] })], { span: NCOLS - 2 }),
  ]);
}
const spacerRow = () => R([cell([new Paragraph({ spacing: { after: 0 }, children: [] })])]);

function fmtD(d: string | null | undefined) {
  const m = (d || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d || "";
}

export async function generateAccompanimentReportDocx(report: CaseAccompanimentReportRow): Promise<Buffer> {
  const ind = parseIndicators(report.indicators_json);
  const rp = parseRiskProtection(report.risk_protection_json);
  const ext = parseExtReferral(report.ext_referral_json);
  const psy = parsePsychosocialReferral(report.psychosocial_referral_json);
  const psyByOption = new Map(psy.entries.map((e) => [e.option, e.name]));
  const S4 = NCOLS / 4; // 3
  const S3 = NCOLS / 3; // 4

  const rows: TableRow[] = [
    // Título
    R([cell([new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [run("INFORME DE ACOMPAÑAMIENTO A VÍCTIMAS FRENTE A SITUACIONES DE VIOLENCIA DETECTADAS EN EL ÁMBITO EDUCATIVO", { bold: true, size: BODY })] })], { fill: FILL_TITLE })]),

    // Cabecera
    fieldRow("Institución educativa:", ""),
    R([
      cell([new Paragraph({ spacing: { after: 0 }, children: [run("Informe N°: ", { bold: true }), run(report.report_number || "", {})] })], { span: NCOLS / 2 }),
      cell([new Paragraph({ spacing: { after: 0 }, children: [run("Fecha de elaboración del informe: ", { bold: true }), run(fmtD(report.report_date), {})] })], { span: NCOLS / 2 }),
    ]),
    fieldRow("Nombre de profesional DECE que maneja el caso:", report.professional_managing || ""),

    // 1. Datos del estudiante
    sectionRow("1. DATOS GENERALES DE IDENTIFICACIÓN DEL ESTUDIANTE O DE LA ESTUDIANTE"),
    fieldRow("Apellidos y nombres:", report.student_full_name || ""),
    R([
      cell([new Paragraph({ spacing: { after: 0 }, children: [run("Fecha de nacimiento:", { bold: true })] })], { span: S4 }),
      cell([new Paragraph({ spacing: { after: 0 }, children: [run(`Día: ${report.student_birth_day || "__"}`, {})] })], { span: S4 }),
      cell([new Paragraph({ spacing: { after: 0 }, children: [run(`Mes: ${report.student_birth_month || "__"}`, {})] })], { span: S4 }),
      cell([new Paragraph({ spacing: { after: 0 }, children: [run(`Año: ${report.student_birth_year || "____"}`, {})] })], { span: NCOLS - 3 * S4 }),
    ]),
    fieldRow("Edad:", report.student_age || ""),
    fieldRow("Nacionalidad:", report.student_nationality || ""),
    fieldRow("Número de cédula o pasaporte:", report.student_document_id || ""),
    R([
      cell([new Paragraph({ spacing: { after: 0 }, children: [run("Grado o curso: ", { bold: true }), run(report.student_grade || "", {})] })], { span: NCOLS / 2 }),
      cell([new Paragraph({ spacing: { after: 0 }, children: [run("Jornada: ", { bold: true }), run(report.student_jornada || "", {})] })], { span: NCOLS / 2 }),
    ]),

    // 2. Representante
    sectionRow("2. DATOS GENERALES DE LA MADRE, PADRE Y/O REPRESENTANTE LEGAL"),
    fieldRow("Nombres y apellidos:", report.rep_full_name || ""),
    fieldRow("Número de cédula:", report.rep_document_id || ""),
    fieldRow("Vínculo entre la persona y el estudiante o la estudiante:", report.rep_relationship || ""),
    fieldRow("Dirección del domicilio:", report.rep_address || ""),
    R([
      cell([new Paragraph({ spacing: { after: 0 }, children: [run("Teléfono de contacto: ", { bold: true }), run(`Celular: ${report.rep_phone_cell || ""}`, {})] })], { span: NCOLS / 2 }),
      cell([new Paragraph({ spacing: { after: 0 }, children: [run(`Convencional: ${report.rep_phone_landline || ""}`, {})] })], { span: NCOLS / 2 }),
    ]),

    // 3. Contexto
    sectionRow("3. CONTEXTO PSICOSOCIAL Y PEDAGÓGICO"),
    sectionRow("SITUACIÓN FAMILIAR. (Breve explicación de con quién vive el NNA, su configuración familiar, su situación familiar, etc.)"),
    textBlockRow(report.family_situation),
    sectionRow("INDICADORES (LLENAR DE ACUERDO CON LINEAMIENTOS DE LA SECCIÓN 3.2.1 A. PROTOCOLOS Y RUTAS):"),
    R([
      cell([new Paragraph({ spacing: { after: 0 }, children: [run("Signos físicos", { bold: true, size: TINY })] })], { span: S3 }),
      cell([new Paragraph({ spacing: { after: 0 }, children: [run("Signos de comportamiento", { bold: true, size: TINY })] })], { span: S3 }),
      cell([new Paragraph({ spacing: { after: 0 }, children: [run("Comportamientos o conductas que se pueden identificar en la institución educativa", { bold: true, size: TINY })] })], { span: NCOLS - 2 * S3 }),
    ]),
    R([
      cell(checklistParas("", INDICATOR_SIGNOS_FISICOS, ind.signos_fisicos, ind.signos_fisicos_otros), { span: S3, valign: VerticalAlign.TOP }),
      cell(checklistParas("", INDICATOR_SIGNOS_COMPORTAMIENTO, ind.signos_comportamiento, ind.signos_comportamiento_otros), { span: S3, valign: VerticalAlign.TOP }),
      cell(checklistParas("", INDICATOR_CONDUCTAS_IE, ind.conductas_ie, ind.conductas_ie_otros), { span: NCOLS - 2 * S3, valign: VerticalAlign.TOP }),
    ]),
    sectionRow("FACTORES DE RIESGO Y PROTECCIÓN (LLENAR DE ACUERDO CON LINEAMIENTOS SECCIÓN 3.2.1 B. PROTOCOLOS Y RUTAS):", FILL_SEC2),
    R([
      cell([new Paragraph({ spacing: { after: 0 }, children: [run("PERSONALES (del NNA)", { bold: true, size: TINY })] })], { span: S3 }),
      cell([new Paragraph({ spacing: { after: 0 }, children: [run("FAMILIARES", { bold: true, size: TINY })] })], { span: S3 }),
      cell([new Paragraph({ spacing: { after: 0 }, children: [run("SITUACIONALES Y SOCIALES", { bold: true, size: TINY })] })], { span: NCOLS - 2 * S3 }),
    ]),
    R([
      cell([...checklistParas("Factores de riesgo:", FACTOR_PERSONALES_RIESGO, rp.personales_riesgo, rp.personales_riesgo_otros), ...checklistParas("Factores protector:", FACTOR_PERSONALES_PROTECCION, rp.personales_proteccion, rp.personales_proteccion_otros)], { span: S3, valign: VerticalAlign.TOP }),
      cell([...checklistParas("Factores de riesgo:", FACTOR_FAMILIARES_RIESGO, rp.familiares_riesgo, rp.familiares_riesgo_otros), ...checklistParas("Factores protector:", FACTOR_FAMILIARES_PROTECCION, rp.familiares_proteccion, rp.familiares_proteccion_otros)], { span: S3, valign: VerticalAlign.TOP }),
      cell([...checklistParas("Factores de riesgo:", FACTOR_SITUACIONALES_RIESGO, rp.situacionales_riesgo, rp.situacionales_riesgo_otros), ...checklistParas("Factores protector:", FACTOR_SITUACIONALES_PROTECCION, rp.situacionales_proteccion, rp.situacionales_proteccion_otros)], { span: NCOLS - 2 * S3, valign: VerticalAlign.TOP }),
    ]),
    sectionRow("RENDIMIENTO ACADÉMICO (Explicar de manera breve y concisa el rendimiento académico del niño, niña o adolescente, identificando si ha presentado dificultades o cambios dentro y fuera del aula —si aplica el caso—):", FILL_SEC2),
    textBlockRow(report.academic_performance),

    // 4. Acciones
    sectionRow("4. ACCIONES DE ACOMPAÑAMIENTO *(Resuma brevemente las acciones inmediatas de acompañamiento, por ejemplo: entrevistas con padres y madres de familia, entrevista con docentes, seguimiento académico, derivaciones a centros de salud y atención psicológica, talleres preventivos, entre otras)"),
    textBlockRow(report.accompaniment_actions),

    // Referencia externa
    R([cell([new Paragraph({ spacing: { after: 0 }, children: [run("REFERENCIA EXTERNA:", { bold: true })] })])]),
    R([cell([new Paragraph({ spacing: { after: 0 }, children: [run("Procedimiento de referencia a instancias externas (marcar uno o más círculos según corresponda):", { bold: true, size: TINY })] })])]),
  ];

  for (const inst of EXT_REFERRAL_INSTANCES) {
    rows.push(markRow(ext.selected.includes(inst), inst));
    rows.push(spacerRow());
  }
  rows.push(R([cell([new Paragraph({ spacing: { after: 0 }, children: [run("Procedimiento recomendado de referencia externa para tratamiento psicológico-social (marcar uno o más círculos según corresponda):", { bold: true, size: TINY })] })])]));
  for (const opt of PSYCHOSOCIAL_REFERRAL_OPTIONS) {
    const name = psyByOption.get(opt);
    rows.push(markRow(name != null, `${opt}. Indicar nombre: ${name || ""}`));
    rows.push(spacerRow());
  }

  rows.push(fieldRow("Fecha de elaboración del Informe técnico de acompañamiento a víctimas de violencia", `(${fmtD(report.signing_date || report.report_date)}):`));
  rows.push(fieldRow("Nombre del profesional o la profesional DECE que elaboró el Informe técnico de acompañamiento a víctimas de violencia:", report.professional_signing || ""));
  rows.push(
    R([
      cell([
        new Paragraph({ spacing: { before: 260, after: 0 }, children: [run("_______________________________", {})] }),
        new Paragraph({ spacing: { after: 0 }, children: [run("FIRMA", {})] }),
      ], { valign: VerticalAlign.TOP }),
    ])
  );

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
    title: `Informe Técnico de Acompañamiento - ${report.student_full_name || ""}`,
    styles: { default: { document: { run: { font: FONT, size: SMALL } } } },
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: PAGE_H }, margin: MARGIN } },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                indent: { left: -900, right: -900 },
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
                indent: { left: -900, right: -900 },
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
