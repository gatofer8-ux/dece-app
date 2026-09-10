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
const W = 9600;

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
};

function r(text: string, o: { bold?: boolean; size?: number } = {}) {
  return new TextRun({ text, bold: o.bold ?? false, size: o.size ?? BODY, font: FONT });
}
function p(text: string, o: { bold?: boolean; size?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) {
  return new Paragraph({
    alignment: o.align ?? AlignmentType.JUSTIFIED,
    spacing: { after: 60, line: 264 },
    children: [r(text, o)],
  });
}
function multi(text: string | null | undefined, o: { size?: number } = {}): Paragraph[] {
  const t = (text || "").trim();
  if (!t) return [p("—", o)];
  return t.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => p(l, o));
}

type VAlign = typeof VerticalAlign.TOP | typeof VerticalAlign.CENTER | typeof VerticalAlign.BOTTOM;
function cell(children: Paragraph[], o: { fill?: string; colSpan?: number; width?: number; valign?: VAlign } = {}) {
  return new TableCell({
    columnSpan: o.colSpan,
    width: o.width ? { size: o.width, type: WidthType.DXA } : undefined,
    shading: o.fill ? { fill: o.fill } : undefined,
    verticalAlign: o.valign ?? VerticalAlign.CENTER,
    margins: { top: 40, bottom: 40, left: 90, right: 90 },
    children,
  });
}
const lbl = (t: string, o: { colSpan?: number; width?: number } = {}) =>
  cell([new Paragraph({ spacing: { after: 0, line: 240 }, children: [r(t, { bold: true, size: SMALL })] })], { fill: LABEL_FILL, ...o });
const val = (t: string, o: { colSpan?: number; width?: number } = {}) =>
  cell([new Paragraph({ spacing: { after: 0, line: 240 }, children: [r(t || " ", { size: SMALL })] })], o);

function sectionBar(text: string) {
  return new Table({
    width: { size: W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders,
    rows: [
      new TableRow({
        children: [
          cell([new Paragraph({ spacing: { after: 0 }, children: [r(text, { bold: true, size: SMALL })] })], {
            fill: HEAD_FILL,
            colSpan: 1,
            width: W,
          }),
        ],
      }),
    ],
  });
}

function checklist(title: string, options: string[], selected: string[], otros: string): Paragraph[] {
  const out: Paragraph[] = [new Paragraph({ spacing: { after: 40 }, children: [r(title, { bold: true, size: SMALL })] })];
  for (const opt of options) {
    const mark = selected.includes(opt) ? "☑ " : "☐ ";
    out.push(new Paragraph({ spacing: { after: 20, line: 232 }, children: [r(mark + opt, { size: 18 })] }));
  }
  out.push(new Paragraph({ spacing: { after: 0, line: 232 }, children: [r(`Otros: ${otros || ""}`, { size: 18 })] }));
  return out;
}

function fmtD(d: string | null | undefined) {
  if (!d) return "";
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d;
}

export async function generateAccompanimentReportDocx(report: CaseAccompanimentReportRow): Promise<Buffer> {
  const ind = parseIndicators(report.indicators_json);
  const rp = parseRiskProtection(report.risk_protection_json);
  const ext = parseExtReferral(report.ext_referral_json);
  const psy = parsePsychosocialReferral(report.psychosocial_referral_json);
  const psyByOption = new Map(psy.entries.map((e) => [e.option, e.name]));

  const t3 = (cells: TableCell[]) => new TableRow({ children: cells });

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [
        r(
          "INFORME DE ACOMPAÑAMIENTO A VÍCTIMAS FRENTE A SITUACIONES DE VIOLENCIA DETECTADAS EN EL ÁMBITO EDUCATIVO",
          { bold: true, size: BODY }
        ),
      ],
    }),

    // Cabecera
    new Table({
      width: { size: W, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      borders,
      rows: [
        t3([lbl("Institución educativa:", { width: W * 0.3 }), val("", { width: W * 0.4 }), lbl("Código AMIE:", { width: W * 0.15 }), val("", { width: W * 0.15 })]),
        t3([lbl("Informe N°:", { width: W * 0.2 }), val(report.report_number || "", { width: W * 0.3 }), lbl("Fecha de elaboración del informe:", { width: W * 0.3 }), val(fmtD(report.report_date), { width: W * 0.2 })]),
        t3([lbl("Nombre de profesional DECE que maneja el caso:", { width: W * 0.5 }), val(report.professional_managing || "", { colSpan: 3, width: W * 0.5 })]),
      ],
    }),
    p("", { size: 8 }),

    sectionBar("1. DATOS GENERALES DE IDENTIFICACIÓN DEL ESTUDIANTE O DE LA ESTUDIANTE"),
    new Table({
      width: { size: W, type: WidthType.DXA }, layout: TableLayoutType.FIXED, borders,
      rows: [
        t3([lbl("Apellidos y nombres:", { width: W * 0.3 }), val(report.student_full_name || "", { colSpan: 3, width: W * 0.7 })]),
        t3([
          lbl("Fecha de nacimiento:", { width: W * 0.3 }),
          val(`Día: ${report.student_birth_day || "__"}`, { width: W * 0.23 }),
          val(`Mes: ${report.student_birth_month || "__"}`, { width: W * 0.23 }),
          val(`Año: ${report.student_birth_year || "____"}`, { width: W * 0.24 }),
        ]),
        t3([lbl("Edad:", { width: W * 0.3 }), val(report.student_age || "", { colSpan: 3 })]),
        t3([lbl("Nacionalidad:", { width: W * 0.3 }), val(report.student_nationality || "", { colSpan: 3 })]),
        t3([lbl("Número de cédula o pasaporte:", { width: W * 0.3 }), val(report.student_document_id || "", { colSpan: 3 })]),
        t3([lbl("Grado o curso:", { width: W * 0.3 }), val(report.student_grade || "", { width: W * 0.35 }), lbl("Jornada:", { width: W * 0.15 }), val(report.student_jornada || "", { width: W * 0.2 })]),
      ],
    }),
    p("", { size: 8 }),

    sectionBar("2. DATOS GENERALES DE LA MADRE, PADRE Y/O REPRESENTANTE LEGAL"),
    new Table({
      width: { size: W, type: WidthType.DXA }, layout: TableLayoutType.FIXED, borders,
      rows: [
        t3([lbl("Nombres y apellidos:", { width: W * 0.32 }), val(report.rep_full_name || "", { colSpan: 3, width: W * 0.68 })]),
        t3([lbl("Número de cédula:", { width: W * 0.32 }), val(report.rep_document_id || "", { colSpan: 3 })]),
        t3([lbl("Vínculo entre la persona y el estudiante o la estudiante:", { width: W * 0.32 }), val(report.rep_relationship || "", { colSpan: 3 })]),
        t3([lbl("Dirección del domicilio:", { width: W * 0.32 }), val(report.rep_address || "", { colSpan: 3 })]),
        t3([
          lbl("Teléfono de contacto:", { width: W * 0.32 }),
          val(`Celular: ${report.rep_phone_cell || ""}`, { width: W * 0.34 }),
          val(`Convencional: ${report.rep_phone_landline || ""}`, { colSpan: 2, width: W * 0.34 }),
        ]),
      ],
    }),
    p("", { size: 8 }),

    sectionBar("3. CONTEXTO PSICOSOCIAL Y PEDAGÓGICO"),
    new Table({
      width: { size: W, type: WidthType.DXA }, layout: TableLayoutType.FIXED, borders,
      rows: [
        t3([lbl("SITUACIÓN FAMILIAR. (Breve explicación de con quién vive el NNA, su configuración familiar, su situación familiar, etc.)", { colSpan: 1, width: W })]),
        t3([cell(multi(report.family_situation), { width: W, colSpan: 1, valign: VerticalAlign.TOP })]),
        t3([lbl("INDICADORES (LLENAR DE ACUERDO CON LINEAMIENTOS DE LA SECCIÓN 3.2.1 A. PROTOCOLOS Y RUTAS):", { width: W })]),
        t3([lbl("Signos físicos", { width: W / 3 }), lbl("Signos de comportamiento", { width: W / 3 }), lbl("Comportamientos o conductas que se pueden identificar en la institución educativa", { width: W / 3 })]),
        t3([
          cell(checklist("Signos físicos", INDICATOR_SIGNOS_FISICOS, ind.signos_fisicos, ind.signos_fisicos_otros), { width: W / 3, valign: VerticalAlign.TOP }),
          cell(checklist("Signos de comportamiento", INDICATOR_SIGNOS_COMPORTAMIENTO, ind.signos_comportamiento, ind.signos_comportamiento_otros), { width: W / 3, valign: VerticalAlign.TOP }),
          cell(checklist("Conductas en la IE", INDICATOR_CONDUCTAS_IE, ind.conductas_ie, ind.conductas_ie_otros), { width: W / 3, valign: VerticalAlign.TOP }),
        ]),
        t3([lbl("FACTORES DE RIESGO Y PROTECCIÓN (LLENAR DE ACUERDO CON LINEAMIENTOS SECCIÓN 3.2.1 B. PROTOCOLOS Y RUTAS):", { width: W })]),
        t3([lbl("PERSONALES (del NNA)", { width: W / 3 }), lbl("FAMILIARES", { width: W / 3 }), lbl("SITUACIONALES Y SOCIALES", { width: W / 3 })]),
        t3([
          cell([
            ...checklist("Factores de riesgo:", FACTOR_PERSONALES_RIESGO, rp.personales_riesgo, rp.personales_riesgo_otros),
            ...checklist("Factores protector:", FACTOR_PERSONALES_PROTECCION, rp.personales_proteccion, rp.personales_proteccion_otros),
          ], { width: W / 3, valign: VerticalAlign.TOP }),
          cell([
            ...checklist("Factores de riesgo:", FACTOR_FAMILIARES_RIESGO, rp.familiares_riesgo, rp.familiares_riesgo_otros),
            ...checklist("Factores protector:", FACTOR_FAMILIARES_PROTECCION, rp.familiares_proteccion, rp.familiares_proteccion_otros),
          ], { width: W / 3, valign: VerticalAlign.TOP }),
          cell([
            ...checklist("Factores de riesgo:", FACTOR_SITUACIONALES_RIESGO, rp.situacionales_riesgo, rp.situacionales_riesgo_otros),
            ...checklist("Factores protector:", FACTOR_SITUACIONALES_PROTECCION, rp.situacionales_proteccion, rp.situacionales_proteccion_otros),
          ], { width: W / 3, valign: VerticalAlign.TOP }),
        ]),
        t3([lbl("RENDIMIENTO ACADÉMICO (Explicar de manera breve y concisa el rendimiento académico del niño, niña o adolescente, identificando si ha presentado dificultades o cambios dentro y fuera del aula —si aplica el caso—):", { width: W })]),
        t3([cell(multi(report.academic_performance), { width: W, valign: VerticalAlign.TOP })]),
      ],
    }),
    p("", { size: 8 }),

    sectionBar("4. ACCIONES DE ACOMPAÑAMIENTO"),
    p("(Resuma brevemente las acciones inmediatas de acompañamiento, por ejemplo: entrevistas con padres y madres de familia, entrevista con docentes, seguimiento académico, derivaciones a centros de salud y atención psicológica, talleres preventivos, entre otras)", { size: 16 }),
    new Table({
      width: { size: W, type: WidthType.DXA }, layout: TableLayoutType.FIXED, borders,
      rows: [t3([cell(multi(report.accompaniment_actions), { width: W, valign: VerticalAlign.TOP })])],
    }),
    p("", { size: 8 }),

    sectionBar("REFERENCIA EXTERNA"),
    p("Procedimiento de referencia a instancias externas (marcar uno o más círculos según corresponda):", { bold: true, size: SMALL }),
    new Table({
      width: { size: W, type: WidthType.DXA }, layout: TableLayoutType.FIXED, borders,
      rows: EXT_REFERRAL_INSTANCES.map((inst) =>
        t3([val(ext.selected.includes(inst) ? "X" : "", { width: W * 0.1 }), val(inst, { colSpan: 3, width: W * 0.9 })])
      ),
    }),
    p("Procedimiento recomendado de referencia externa para tratamiento psicológico-social (marcar uno o más círculos según corresponda):", { bold: true, size: SMALL }),
    new Table({
      width: { size: W, type: WidthType.DXA }, layout: TableLayoutType.FIXED, borders,
      rows: PSYCHOSOCIAL_REFERRAL_OPTIONS.map((opt) => {
        const name = psyByOption.get(opt);
        return t3([
          val(name != null ? "X" : "", { width: W * 0.1 }),
          val(`${opt}. Indicar nombre: ${name || ""}`, { colSpan: 3, width: W * 0.9 }),
        ]);
      }),
    }),
    p("", { size: 8 }),

    p(`Fecha de elaboración del Informe técnico de acompañamiento a víctimas de violencia (${fmtD(report.signing_date || report.report_date)}):`, { size: SMALL }),
    p(`Nombre del profesional o la profesional DECE que elaboró el Informe técnico de acompañamiento a víctimas de violencia: ${report.professional_signing || ""}`, { size: SMALL }),
    new Paragraph({ spacing: { before: 300 }, children: [r("_______________________________", { size: SMALL })] }),
    new Paragraph({ children: [r("FIRMA", { size: SMALL })] }),
  ];

  const doc = new Document({
    creator: "DECE App",
    title: `Informe Técnico de Acompañamiento - ${report.student_full_name || ""}`,
    styles: { default: { document: { run: { font: FONT, size: BODY } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1100, right: 1000, bottom: 1100, left: 1000, header: 480, footer: 340 },
          },
        },
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
