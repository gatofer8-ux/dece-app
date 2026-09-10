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

const FONT = "Calibri";
const LABEL_FILL = "F2F2F2";
const HEAD_FILL = "BFBFBF";
const BORDER = "808080";
const BODY = 22; // 11pt
const SMALL = 20; // 10pt
const TINY = 17;

const PAGE_W = 11900;
const PAGE_H = 15874;
const MARGIN = { top: 1700, right: 1130, bottom: 1280, left: 1420, header: 480, footer: 340 };
const W = PAGE_W - MARGIN.left - MARGIN.right; // ≈ 9350

function img(fileName: string): Buffer | null {
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

const borders = {
  top: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
  left: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
  right: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
  insideVertical: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
};

function run(text: string, o: { bold?: boolean; size?: number } = {}) {
  return new TextRun({ text, bold: o.bold ?? false, size: o.size ?? BODY, font: FONT });
}
function para(text: string, o: { bold?: boolean; size?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) {
  return new Paragraph({
    alignment: o.align ?? AlignmentType.JUSTIFIED,
    spacing: { after: 60, line: 264 },
    children: [run(text, o)],
  });
}
function multiP(text: string | null | undefined): Paragraph[] {
  const t = (text || "").trim();
  if (!t) return [para("—", { size: SMALL })];
  return t.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => para(l, { size: SMALL }));
}

type VAlign = typeof VerticalAlign.TOP | typeof VerticalAlign.CENTER | typeof VerticalAlign.BOTTOM;
function tc(children: Paragraph[], o: { colSpan?: number; fill?: string; valign?: VAlign } = {}) {
  return new TableCell({
    columnSpan: o.colSpan ?? 1,
    shading: o.fill ? { fill: o.fill } : undefined,
    verticalAlign: o.valign ?? VerticalAlign.CENTER,
    margins: { top: 40, bottom: 40, left: 90, right: 90 },
    children,
  });
}
const lblCell = (t: string, colSpan = 1) =>
  tc([new Paragraph({ spacing: { after: 0, line: 232 }, children: [run(t, { bold: true, size: SMALL })] })], { fill: LABEL_FILL, colSpan });
const valCell = (t: string, colSpan = 1) =>
  tc([new Paragraph({ spacing: { after: 0, line: 232 }, children: [run(t || " ", { size: SMALL })] })], { colSpan });
const headCell = (t: string, colSpan = 1) =>
  tc([new Paragraph({ spacing: { after: 0, line: 232 }, children: [run(t, { bold: true, size: SMALL })] })], { fill: HEAD_FILL, colSpan });

function fixedTable(columnWidths: number[], rows: TableRow[]) {
  return new Table({
    width: { size: columnWidths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths,
    borders,
    rows,
  });
}

function sectionBar(text: string) {
  return fixedTable([W], [new TableRow({ children: [headCell(text)] })]);
}

function checklistParas(title: string, options: string[], selected: string[], otros: string): Paragraph[] {
  const out: Paragraph[] = [];
  if (title) out.push(new Paragraph({ spacing: { after: 40 }, children: [run(title, { bold: true, size: TINY })] }));
  for (const opt of options) {
    out.push(
      new Paragraph({ spacing: { after: 20, line: 224 }, children: [run(`${selected.includes(opt) ? "☑" : "☐"} ${opt}`, { size: TINY })] })
    );
  }
  out.push(new Paragraph({ spacing: { after: 0, line: 224 }, children: [run(`Otros: ${otros || ""}`, { size: TINY })] }));
  return out;
}

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

  const c0 = Math.round(W * 0.3);
  const c1 = Math.round(W * 0.24);
  const c2 = Math.round(W * 0.23);
  const C4 = [c0, c1, c2, W - c0 - c1 - c2];
  const t3w = Math.round(W / 3);
  const C3 = [t3w, t3w, W - 2 * t3w];
  const cRef0 = Math.round(W * 0.08);
  const C_REF = [cRef0, W - cRef0];
  const row = (cells: TableCell[]) => new TableRow({ children: cells });

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [
        run(
          "INFORME DE ACOMPAÑAMIENTO A VÍCTIMAS FRENTE A SITUACIONES DE VIOLENCIA DETECTADAS EN EL ÁMBITO EDUCATIVO",
          { bold: true, size: BODY }
        ),
      ],
    }),

    fixedTable(C4, [
      row([lblCell("Institución educativa:"), valCell("", 1), lblCell("Código AMIE:"), valCell("", 1)]),
      row([lblCell("Informe N°:"), valCell(report.report_number || "", 1), lblCell("Fecha de elaboración del informe:"), valCell(fmtD(report.report_date), 1)]),
      row([lblCell("Nombre de profesional DECE que maneja el caso:"), valCell(report.professional_managing || "", 3)]),
    ]),
    para("", { size: 6 }),

    sectionBar("1. DATOS GENERALES DE IDENTIFICACIÓN DEL ESTUDIANTE O DE LA ESTUDIANTE"),
    fixedTable(C4, [
      row([lblCell("Apellidos y nombres:"), valCell(report.student_full_name || "", 3)]),
      row([lblCell("Fecha de nacimiento:"), valCell(`Día: ${report.student_birth_day || "__"}`), valCell(`Mes: ${report.student_birth_month || "__"}`), valCell(`Año: ${report.student_birth_year || "____"}`)]),
      row([lblCell("Edad:"), valCell(report.student_age || "", 3)]),
      row([lblCell("Nacionalidad:"), valCell(report.student_nationality || "", 3)]),
      row([lblCell("Número de cédula o pasaporte:"), valCell(report.student_document_id || "", 3)]),
      row([lblCell("Grado o curso:"), valCell(report.student_grade || "", 1), lblCell("Jornada:"), valCell(report.student_jornada || "", 1)]),
    ]),
    para("", { size: 6 }),

    sectionBar("2. DATOS GENERALES DE LA MADRE, PADRE Y/O REPRESENTANTE LEGAL"),
    fixedTable(C4, [
      row([lblCell("Nombres y apellidos:"), valCell(report.rep_full_name || "", 3)]),
      row([lblCell("Número de cédula:"), valCell(report.rep_document_id || "", 3)]),
      row([lblCell("Vínculo entre la persona y el estudiante o la estudiante:"), valCell(report.rep_relationship || "", 3)]),
      row([lblCell("Dirección del domicilio:"), valCell(report.rep_address || "", 3)]),
      row([lblCell("Teléfono de contacto:"), valCell(`Celular: ${report.rep_phone_cell || ""}`, 1), valCell(`Convencional: ${report.rep_phone_landline || ""}`, 2)]),
    ]),
    para("", { size: 6 }),

    sectionBar("3. CONTEXTO PSICOSOCIAL Y PEDAGÓGICO"),
    fixedTable([W], [
      row([lblCell("SITUACIÓN FAMILIAR. (Breve explicación de con quién vive el NNA, su configuración familiar, su situación familiar, etc.)")]),
      row([tc(multiP(report.family_situation), { valign: VerticalAlign.TOP })]),
      row([lblCell("INDICADORES (LLENAR DE ACUERDO CON LINEAMIENTOS DE LA SECCIÓN 3.2.1 A. PROTOCOLOS Y RUTAS):")]),
    ]),
    fixedTable(C3, [
      row([lblCell("Signos físicos"), lblCell("Signos de comportamiento"), lblCell("Comportamientos o conductas que se pueden identificar en la institución educativa")]),
      row([
        tc(checklistParas("", INDICATOR_SIGNOS_FISICOS, ind.signos_fisicos, ind.signos_fisicos_otros), { valign: VerticalAlign.TOP }),
        tc(checklistParas("", INDICATOR_SIGNOS_COMPORTAMIENTO, ind.signos_comportamiento, ind.signos_comportamiento_otros), { valign: VerticalAlign.TOP }),
        tc(checklistParas("", INDICATOR_CONDUCTAS_IE, ind.conductas_ie, ind.conductas_ie_otros), { valign: VerticalAlign.TOP }),
      ]),
    ]),
    fixedTable([W], [row([lblCell("FACTORES DE RIESGO Y PROTECCIÓN (LLENAR DE ACUERDO CON LINEAMIENTOS SECCIÓN 3.2.1 B. PROTOCOLOS Y RUTAS):")])]),
    fixedTable(C3, [
      row([lblCell("PERSONALES (del NNA)"), lblCell("FAMILIARES"), lblCell("SITUACIONALES Y SOCIALES")]),
      row([
        tc([...checklistParas("Factores de riesgo:", FACTOR_PERSONALES_RIESGO, rp.personales_riesgo, rp.personales_riesgo_otros), ...checklistParas("Factores protector:", FACTOR_PERSONALES_PROTECCION, rp.personales_proteccion, rp.personales_proteccion_otros)], { valign: VerticalAlign.TOP }),
        tc([...checklistParas("Factores de riesgo:", FACTOR_FAMILIARES_RIESGO, rp.familiares_riesgo, rp.familiares_riesgo_otros), ...checklistParas("Factores protector:", FACTOR_FAMILIARES_PROTECCION, rp.familiares_proteccion, rp.familiares_proteccion_otros)], { valign: VerticalAlign.TOP }),
        tc([...checklistParas("Factores de riesgo:", FACTOR_SITUACIONALES_RIESGO, rp.situacionales_riesgo, rp.situacionales_riesgo_otros), ...checklistParas("Factores protector:", FACTOR_SITUACIONALES_PROTECCION, rp.situacionales_proteccion, rp.situacionales_proteccion_otros)], { valign: VerticalAlign.TOP }),
      ]),
    ]),
    fixedTable([W], [
      row([lblCell("RENDIMIENTO ACADÉMICO (Explicar de manera breve y concisa el rendimiento académico del niño, niña o adolescente, identificando si ha presentado dificultades o cambios dentro y fuera del aula —si aplica el caso—):")]),
      row([tc(multiP(report.academic_performance), { valign: VerticalAlign.TOP })]),
    ]),
    para("", { size: 6 }),

    sectionBar("4. ACCIONES DE ACOMPAÑAMIENTO"),
    para(
      "(Resuma brevemente las acciones inmediatas de acompañamiento, por ejemplo: entrevistas con padres y madres de familia, entrevista con docentes, seguimiento académico, derivaciones a centros de salud y atención psicológica, talleres preventivos, entre otras)",
      { size: 15 }
    ),
    fixedTable([W], [row([tc(multiP(report.accompaniment_actions), { valign: VerticalAlign.TOP })])]),
    para("", { size: 6 }),

    sectionBar("REFERENCIA EXTERNA"),
    para("Procedimiento de referencia a instancias externas (marcar uno o más círculos según corresponda):", { bold: true, size: SMALL }),
    fixedTable(C_REF, EXT_REFERRAL_INSTANCES.map((inst) =>
      row([
        tc([new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [run(ext.selected.includes(inst) ? "X" : "", { bold: true, size: SMALL })] })]),
        valCell(inst),
      ])
    )),
    para("Procedimiento recomendado de referencia externa para tratamiento psicológico-social (marcar uno o más círculos según corresponda):", { bold: true, size: SMALL }),
    fixedTable(C_REF, PSYCHOSOCIAL_REFERRAL_OPTIONS.map((opt) => {
      const name = psyByOption.get(opt);
      return row([
        tc([new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [run(name != null ? "X" : "", { bold: true, size: SMALL })] })]),
        valCell(`${opt}. Indicar nombre: ${name || ""}`),
      ]);
    })),
    para("", { size: 6 }),

    para(`Fecha de elaboración del Informe técnico de acompañamiento a víctimas de violencia (${fmtD(report.signing_date || report.report_date)}):`, { size: SMALL }),
    para(`Nombre del profesional o la profesional DECE que elaboró el Informe técnico de acompañamiento a víctimas de violencia: ${report.professional_signing || ""}`, { size: SMALL }),
    new Paragraph({ spacing: { before: 340 }, children: [run("_______________________________", { size: SMALL })] }),
    new Paragraph({ children: [run("FIRMA", { size: SMALL })] }),
  ];

  const doc = new Document({
    creator: "DECE App",
    title: `Informe Técnico de Acompañamiento - ${report.student_full_name || ""}`,
    styles: { default: { document: { run: { font: FONT, size: BODY } } } },
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
                children: img("header_4k.png")
                  ? [new ImageRun({ data: img("header_4k.png")!, transformation: { width: 596, height: 60 }, type: "png" })]
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
                children: img("footer_nuevo_ecuador.png")
                  ? [new ImageRun({ data: img("footer_nuevo_ecuador.png")!, transformation: { width: 596, height: 100 }, type: "png" })]
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
