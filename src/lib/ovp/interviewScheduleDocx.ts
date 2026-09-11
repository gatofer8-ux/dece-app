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
  PageOrientation,
} from "docx";
import { currentSchoolYearText } from "@/lib/schoolYearText";
import { studentGradeLabel } from "@/lib/studentCourse";
import { groupEntriesByParallel, type ScheduleEntry } from "./interviewSchedule";

const FONT = "Calibri";
const NAVY = "1F3864";
const LABEL_FILL = "DEEAF6";
const BORDER = "8497B0";
const BODY = 20; // 10pt
const SMALL = 18; // 9pt

// A4 en orientación vertical; docx intercambia ancho/alto al aplicar LANDSCAPE.
const PAGE_W = 11906;
const PAGE_H = 16838;
const MARGIN = { top: 1100, right: 900, bottom: 900, left: 900, header: 460, footer: 320 };
const W = PAGE_H - MARGIN.left - MARGIN.right; // ancho útil ya en horizontal

// N°, Cédula, Nombres, Hora, Opción 1, Opción 2, Apoya SI/NO, Firma
const WEIGHTS = [5, 11, 22, 8, 16, 16, 10, 12];
const TOTAL_W = WEIGHTS.reduce((a, b) => a + b, 0);
const GRID = WEIGHTS.map((w, i) =>
  i === WEIGHTS.length - 1 ? W - Math.round((W * (TOTAL_W - w)) / TOTAL_W) : Math.round((W * w) / TOTAL_W)
);

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

function cell(children: Paragraph[], o: { span?: number; fill?: string } = {}) {
  return new TableCell({
    columnSpan: o.span ?? 1,
    shading: o.fill ? { fill: o.fill } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 40, bottom: 40, left: 60, right: 60 },
    children,
  });
}
const th = (t: string) =>
  cell([new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0, line: 220 }, children: [r(t, { bold: true, size: SMALL, color: NAVY })] })], {
    fill: LABEL_FILL,
  });
const td = (t: string, opts: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) =>
  cell([
    new Paragraph({
      alignment: opts.align ?? AlignmentType.LEFT,
      spacing: { after: 0, line: 232 },
      children: [r(t || " ", { size: SMALL, bold: opts.bold })],
    }),
  ]);
const blank = () => cell([new Paragraph({ spacing: { after: 0, line: 232 }, children: [r(" ", { size: SMALL })] })]);
const row = (cells: TableCell[]) => new TableRow({ children: cells });

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

export interface InterviewScheduleDocInput {
  institutionName: string;
  title: string;
  course: string;
  interviewDate: string | null;
  startTime: string;
  slotMinutes: number;
  studentsPerSlot: number;
  location: string | null;
  entries: ScheduleEntry[];
  schoolYear?: string | null;
}

export async function generateInterviewScheduleDocx(input: InterviewScheduleDocInput): Promise<Buffer> {
  const groups = groupEntriesByParallel(input.entries);
  const schoolYear = input.schoolYear || currentSchoolYearText();
  const courseLabel = studentGradeLabel({ course: input.course, education_level: "EGB" }) || input.course;

  const titleBlock = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
      children: [r("DEPARTAMENTO DE CONSEJERÍA ESTUDIANTIL (DECE)", { bold: true, size: BODY, color: NAVY })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
      children: [r("Orientación Vocacional y Profesional — Cronograma de citas para la toma de decisión", { bold: true, size: SMALL, color: NAVY })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [r(`${input.institutionName} · Año lectivo ${schoolYear}`, { size: SMALL })],
    }),
    new Paragraph({
      spacing: { after: 40 },
      children: [
        r(`${input.title}  ·  ${courseLabel}  ·  `, { bold: true, size: SMALL }),
        r(`Fecha: ${fmtDate(input.interviewDate) || "Por definir"}`, { size: SMALL }),
        r(`   ·   Hora de inicio: ${input.startTime}   ·   Duración de cada turno: ${input.slotMinutes} min. (${input.studentsPerSlot} estudiantes por turno)`, {
          size: SMALL,
        }),
      ],
    }),
    ...(input.location
      ? [new Paragraph({ spacing: { after: 160 }, children: [r(`Lugar: ${input.location}`, { size: SMALL })] })]
      : [new Paragraph({ spacing: { after: 160 }, children: [] })]),
  ];

  const sections: (Paragraph | Table)[] = [...titleBlock];

  groups.forEach((g, gi) => {
    sections.push(
      new Paragraph({
        spacing: { before: gi === 0 ? 0 : 240, after: 100 },
        alignment: AlignmentType.CENTER,
        children: [
          r(`CRONOGRAMA DE CITAS PARA LA TOMA DE DECISIÓN — ${courseLabel.toUpperCase()} PARALELO "${g.parallel}"`, {
            bold: true,
            size: BODY,
            color: NAVY,
          }),
        ],
      })
    );

    const rows: TableRow[] = [
      row([
        th("N°"),
        th("Cédula"),
        th("Nombres completos"),
        th("Hora"),
        th("Figura profesional solicitada Opción 1"),
        th("Figura profesional solicitada Opción 2"),
        th("Apoya la elección SI/NO"),
        th("Firma de representante"),
      ]),
      ...g.entries.map((e) =>
        row([
          td(String(e.position), { align: AlignmentType.CENTER }),
          td(e.document_id || "", { align: AlignmentType.CENTER }),
          td(e.full_name),
          td(e.time, { align: AlignmentType.CENTER, bold: true }),
          blank(),
          blank(),
          blank(),
          blank(),
        ])
      ),
    ];

    sections.push(
      new Table({
        width: { size: W, type: WidthType.DXA },
        layout: TableLayoutType.FIXED,
        columnWidths: GRID,
        alignment: AlignmentType.CENTER,
        borders,
        rows,
      })
    );
  });

  const doc = new Document({
    creator: "DECE App",
    title: input.title,
    styles: { default: { document: { run: { font: FONT, size: BODY } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_W, height: PAGE_H, orientation: PageOrientation.LANDSCAPE },
            margin: MARGIN,
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                indent: { left: -800, right: -800 },
                spacing: { after: 0 },
                children: imgBuf("header_4k.png")
                  ? [new ImageRun({ data: imgBuf("header_4k.png")!, transformation: { width: 760, height: 76 }, type: "png" })]
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
                  ? [new ImageRun({ data: imgBuf("footer_nuevo_ecuador.png")!, transformation: { width: 760, height: 120 }, type: "png" })]
                  : [],
              }),
            ],
          }),
        },
        children: sections,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
