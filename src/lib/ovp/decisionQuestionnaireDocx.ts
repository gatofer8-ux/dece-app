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
import { studentGradeLabel } from "@/lib/studentCourse";

const FONT = "Calibri";
const NAVY = "1F3864";
const LABEL_FILL = "DEEAF6";
const BORDER = "8497B0";
const BODY = 20; // 10pt
const SMALL = 18; // 9pt

const PAGE_W = 11906;
const PAGE_H = 16838;
const MARGIN = { top: 1200, right: 1100, bottom: 900, left: 1100, header: 460, footer: 320 };
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
function p(runs: TextRun[], o: { after?: number; before?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) {
  return new Paragraph({ spacing: { after: o.after ?? 80, before: o.before ?? 0, line: 240 }, alignment: o.align, children: runs });
}
function blankLines(n: number) {
  return Array.from({ length: n }, () =>
    new Paragraph({
      spacing: { after: 60, line: 300 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "999999", space: 1 } },
      children: [r(" ", { size: SMALL })],
    })
  );
}
function checkboxLine(label: string) {
  return new Paragraph({ spacing: { after: 30, line: 232 }, children: [r(`☐ ${label}`, { size: SMALL })] });
}

function cell(children: Paragraph[], o: { span?: number; fill?: string } = {}) {
  return new TableCell({
    columnSpan: o.span ?? 1,
    shading: o.fill ? { fill: o.fill } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 40, bottom: 40, left: 70, right: 70 },
    children,
  });
}
const th = (t: string, span = 1) =>
  cell([new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [r(t, { bold: true, size: SMALL, color: NAVY })] })], { fill: LABEL_FILL, span });
const td = (t: string) => cell([new Paragraph({ spacing: { after: 0 }, children: [r(t || " ", { size: SMALL })] })]);
const row = (cells: TableCell[]) => new TableRow({ children: cells });

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

function computeAge(birthDate: string | null | undefined): string {
  if (!birthDate) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthDate);
  if (!m) return "";
  const born = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(born.getTime())) return "";
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const beforeBirthday = now.getMonth() < born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() < born.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 && age < 30 ? String(age) : "";
}

const ACTIVITIES: [string, string][] = [
  ["Actividad “Quién soy”", "Autoconocimiento"],
  ["Casa abierta de bachilleratos institucionales", "Informativo"],
  ["Taller informativo / charla sobre las distintas opciones de bachillerato", "Informativo"],
  ["Aplicación del cuestionario de toma de decisiones", "Toma de decisiones"],
  ["Matriz de sondeo de elección de bachillerato", "Toma de decisiones"],
];

export interface QuestionnaireStudentInput {
  full_name: string;
  document_id?: string | null;
  course: string;
  parallel: string;
  jornada?: string | null;
  birth_date?: string | null;
  representative?: string | null;
  representative_document_id?: string | null;
  rep_phone?: string | null;
}

export interface DecisionQuestionnaireDocInput {
  institutionName: string;
  schoolYear?: string;
  interviewDate?: string | null;
  students: QuestionnaireStudentInput[];
}

function buildStudentPage(s: QuestionnaireStudentInput, input: DecisionQuestionnaireDocInput, isFirst: boolean): (Paragraph | Table)[] {
  const schoolYear = input.schoolYear || currentSchoolYearText();
  const courseLabel = studentGradeLabel({ course: s.course, education_level: "EGB" }) || s.course;

  const headerP = new Paragraph({
    pageBreakBefore: !isFirst,
    alignment: AlignmentType.CENTER,
    spacing: { after: 40 },
    children: [r(`CUESTIONARIO DE TOMA DE DECISIONES — AÑO LECTIVO ${schoolYear}`, { bold: true, size: BODY, color: NAVY })],
  });
  const subtitleP = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [
      r(`${input.institutionName} — Departamento de Consejería Estudiantil (DECE)`, { size: SMALL, italics: true }),
    ],
  });

  const datosTable = new Table({
    width: { size: W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [Math.round(W * 0.25), Math.round(W * 0.75) - 1],
    alignment: AlignmentType.CENTER,
    borders,
    rows: [
      row([th("Fecha"), td(fmtDate(input.interviewDate) || "")]),
      row([th("Apellidos y nombres"), td(s.full_name)]),
      row([th("Curso / paralelo / jornada"), td(`${courseLabel} “${s.parallel}” — ${s.jornada || ""}`)]),
      row([th("Edad"), td(computeAge(s.birth_date))]),
    ],
  });

  const questions: (Paragraph | Table)[] = [
    new Paragraph({ spacing: { before: 220, after: 60 }, children: [r("1. ¿Cuáles crees que son las tres carreras con mayor demanda laboral en el Ecuador?", { bold: true })] }),
    ...blankLines(3),

    new Paragraph({ spacing: { before: 140, after: 60 }, children: [r("2. ¿Has identificado un bachillerato que esté acorde con tu proyecto de vida? ¿Cuál?", { bold: true })] }),
    ...blankLines(2),

    new Paragraph({ spacing: { before: 140, after: 60 }, children: [r("3. ¿Cuáles son las profesiones u ocupaciones que te interesan de manera especial? ¿Por qué te interesan?", { bold: true })] }),
    ...blankLines(3),

    new Paragraph({ spacing: { before: 140, after: 60 }, children: [r("4. ¿Cuáles son las profesiones u ocupaciones que NO te interesan en absoluto?", { bold: true })] }),
    ...blankLines(3),

    new Paragraph({ spacing: { before: 140, after: 60 }, children: [r("5. ¿Qué personas han influido en tu interés hacia una profesión u ocupación? (puedes marcar más de una opción)", { bold: true })] }),
    checkboxLine("Padres (mamá o papá)"),
    checkboxLine("Profesores"),
    checkboxLine("Amigas/os"),
    checkboxLine("Otros familiares"),
    checkboxLine("Personajes públicos"),
    new Paragraph({ spacing: { after: 30 }, children: [r("☐ Otros (¿Quiénes?) ", { size: SMALL }), r("_______________________________", { size: SMALL })] }),

    new Paragraph({ spacing: { before: 140, after: 60 }, children: [r("6. ¿Consideras que tus fortalezas y características personales van de acuerdo con lo que requiere la profesión u ocupación?", { bold: true })] }),
    checkboxLine("Sí, bastante"),
    checkboxLine("Sí, lo suficiente"),
    checkboxLine("Un poco"),
    checkboxLine("No van de acuerdo"),

    new Paragraph({ spacing: { before: 140, after: 60 }, children: [r("7. ¿Cuáles serían las dificultades que se presenten en el momento de escoger una profesión/ocupación o bachillerato?", { bold: true })] }),
    checkboxLine("Exigencias familiares"),
    checkboxLine("Limitaciones económicas"),
    checkboxLine("Un bachillerato que no te represente mayor esfuerzo"),
    checkboxLine("Dificultad en trasladarse a otra institución educativa"),
    new Paragraph({ spacing: { after: 30 }, children: [r("☐ Otra (¿Cuál?) ", { size: SMALL }), r("_______________________________", { size: SMALL })] }),

    new Paragraph({ spacing: { before: 140, after: 60 }, children: [r("8. ¿Qué tipo de bachillerato escoges? (2 opciones, en orden de prioridad)", { bold: true })] }),
    new Paragraph({ spacing: { after: 200 }, children: [
      r("1° ", { bold: true }), r("_________________________________     ", { size: SMALL }),
      r("2° ", { bold: true }), r("_________________________________", { size: SMALL }),
    ] }),

    new Paragraph({
      spacing: { after: 120 },
      children: [r("Se registra la entrevista al estudiante y al representante legal con el presente cuestionario de toma de decisiones.", { italics: true, size: SMALL })],
    }),
  ];

  const repTable = new Table({
    width: { size: W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [Math.round(W * 0.65), Math.round(W * 0.35) - 1],
    alignment: AlignmentType.CENTER,
    borders,
    rows: [
      row([th("Datos del representante legal", 2)]),
      row([td(`Nombres y apellidos: ${s.representative || ""}`), cell([new Paragraph({ alignment: AlignmentType.CENTER, children: [r("Firma", { bold: true, size: SMALL })] })])]),
      row([td(`N° de cédula: ${s.representative_document_id || ""}`), cell([new Paragraph({ children: [r(" ")] })])]),
      row([td(`Teléfono: ${s.rep_phone || ""}`), cell([new Paragraph({ children: [r(" ")] })])]),
    ],
  });

  const constanciaHeading = new Paragraph({
    pageBreakBefore: false,
    spacing: { before: 260, after: 100 },
    alignment: AlignmentType.CENTER,
    children: [r("CONSTANCIA DE APLICACIÓN DEL PROYECTO OVP A ESTUDIANTES DE 10MO AÑO EGB", { bold: true, size: BODY, color: NAVY })],
  });

  const constanciaIntro = new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 140, line: 260 },
    children: [
      r("Yo, con CI: ______________________, en calidad de representante legal de ", { size: SMALL }),
      r(s.full_name, { bold: true, size: SMALL }),
      r(`, estudiante del 10mo año paralelo “${s.parallel}” jornada ${s.jornada || "____________"}, certifico que mi representado/a ha recibido los ejes de autoconocimiento e información con las temáticas:`, { size: SMALL }),
    ],
  });

  const activitiesTable = new Table({
    width: { size: W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [Math.round(W * 0.65), Math.round(W * 0.35) - 1],
    alignment: AlignmentType.CENTER,
    borders,
    rows: [
      row([th("Actividad"), th("Eje")]),
      ...ACTIVITIES.map(([actividad, eje]) => row([td(actividad), td(eje)])),
    ],
  });

  const legalText = [
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 140, after: 80, line: 260 },
      children: [r(`En cumplimiento del Proyecto de Orientación Vocacional y Profesional (OVP) a cargo del Departamento de Consejería Estudiantil durante el año lectivo ${schoolYear}.`, { size: SMALL })],
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 160, line: 260 },
      children: [
        r("Tengo total conocimiento de que la elección de bachillerato es decisión del/la estudiante y el trámite de traslado de institución educativa, en caso de necesidad, es neta responsabilidad del representante legal a través de la página web ", { size: SMALL }),
        r("https://juntos.educacion.gob.ec/", { size: SMALL, italics: true }),
        r(", tomando en cuenta la disponibilidad de cupos en la institución a escoger.", { size: SMALL }),
      ],
    }),
    new Paragraph({ spacing: { after: 160 }, children: [r("Lugar y fecha: _____________________________, ______ de __________________ de ______", { size: SMALL })] }),
  ];

  const signTable = new Table({
    width: { size: W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [Math.round(W / 2), W - Math.round(W / 2)],
    alignment: AlignmentType.CENTER,
    borders,
    rows: [
      row([th("Representante legal"), th("Estudiante")]),
      row([td(`Nombre: ${s.representative || ""}`), td(`Nombre: ${s.full_name}`)]),
      row([td(`N° de cédula: ${s.representative_document_id || ""}`), td(`N° de cédula: ${s.document_id || ""}`)]),
      row([td(`N° de teléfono: ${s.rep_phone || ""}`), td("N° de teléfono:")]),
      row([
        cell([new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 260 }, children: [r("Firma", { bold: true, size: SMALL })] })]),
        cell([new Paragraph({ children: [r(" ")] })]),
      ]),
    ],
  });

  const nota = new Paragraph({
    spacing: { before: 120 },
    children: [r("Nota: el estudiante no firmará ningún documento debido a ser menor de edad.", { italics: true, size: SMALL })],
  });

  return [
    headerP,
    subtitleP,
    datosTable,
    ...questions,
    repTable,
    constanciaHeading,
    constanciaIntro,
    activitiesTable,
    ...legalText,
    signTable,
    nota,
  ];
}

export async function generateDecisionQuestionnaireDocx(input: DecisionQuestionnaireDocInput): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];
  input.students.forEach((s, i) => {
    children.push(...buildStudentPage(s, input, i === 0));
  });

  const doc = new Document({
    creator: "DECE App",
    title: "Cuestionario de Toma de Decisiones — OVP",
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
