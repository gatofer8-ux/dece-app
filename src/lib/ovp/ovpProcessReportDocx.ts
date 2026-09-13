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
import type { OvpProcessReportData } from "./ovpProcessReportData";

const FONT = "Cambria";
const HEADING_BLUE = "17365D";
const SUBHEADING_BLUE = "2E74B5";
const GRAY = "D9D9D9";
const GRAY_DARK = "BFBFBF";
const BORDER = "808080";
const BODY = 22; // 11pt
const SMALL = 18; // 9pt

function getImageBuffer(fileName: string): Buffer | null {
  try {
    const candidates = [
      path.join(process.cwd(), "public", "situational_media", fileName),
      path.join(process.cwd(), "public", fileName),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return fs.readFileSync(p);
    }
  } catch {
    /* noop */
  }
  return null;
}

const cellBorders = {
  top: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
  left: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
  right: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
};

function run(text: string, opts: { bold?: boolean; size?: number; color?: string; italics?: boolean } = {}) {
  return new TextRun({
    text: text || " ",
    bold: opts.bold ?? false,
    italics: opts.italics ?? false,
    size: opts.size ?? BODY,
    color: opts.color,
    font: FONT,
  });
}

function para(
  text: string,
  opts: {
    bold?: boolean;
    size?: number;
    color?: string;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    after?: number;
    before?: number;
  } = {}
) {
  return new Paragraph({
    alignment: opts.align ?? AlignmentType.JUSTIFIED,
    spacing: { after: opts.after ?? 120, before: opts.before ?? 0, line: 276 },
    children: [run(text, opts)],
  });
}

function multiPara(
  text: string | null | undefined,
  opts: { size?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}
): Paragraph[] {
  const t = (text || "").trim();
  if (!t) return [para("—", opts)];
  return t
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => para(l, opts));
}

function sectionHeading(text: string) {
  return new Paragraph({
    spacing: { before: 240, after: 120 },
    children: [run(text, { bold: true, size: 24, color: HEADING_BLUE })],
  });
}

function subHeading(text: string) {
  return new Paragraph({
    spacing: { before: 140, after: 80 },
    children: [run(text, { bold: true, size: BODY, color: SUBHEADING_BLUE })],
  });
}

function headerCell(text: string, opts: { width?: number; colSpan?: number; dark?: boolean } = {}) {
  return new TableCell({
    columnSpan: opts.colSpan,
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    shading: { fill: opts.dark ? GRAY_DARK : GRAY },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 0, line: 240 },
        children: [run(text, { bold: true, size: SMALL })],
      }),
    ],
  });
}

function valueCell(
  text: string | string[],
  opts: { width?: number; colSpan?: number; bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}
) {
  const lines = Array.isArray(text) ? text : String(text ?? "").split("\n");
  return new TableCell({
    columnSpan: opts.colSpan,
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: lines.map(
      (l) =>
        new Paragraph({
          alignment: opts.align ?? AlignmentType.LEFT,
          spacing: { after: 0, line: 240 },
          children: [run(l || " ", { size: SMALL, bold: opts.bold })],
        })
    ),
  });
}

function officialHeader() {
  const img = getImageBuffer("header_4k.png");
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        indent: { left: -1000, right: -1000 },
        spacing: { after: 0 },
        children: img ? [new ImageRun({ data: img, transformation: { width: 596, height: 60 }, type: "png" })] : [],
      }),
    ],
  });
}

function officialFooter() {
  const img = getImageBuffer("footer_nuevo_ecuador.png");
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        indent: { left: -1000, right: -1000 },
        spacing: { before: 0 },
        children: img ? [new ImageRun({ data: img, transformation: { width: 596, height: 100 }, type: "png" })] : [],
      }),
    ],
  });
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d;
}

export async function generateOvpProcessReportDocx(data: OvpProcessReportData): Promise<Buffer> {
  const W = 9600; // twips A4 portrait

  // 1. DATOS GENERALES
  const datosGenerales = new Table({
    width: { size: W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: cellBorders,
    rows: [
      new TableRow({ children: [headerCell("DATOS GENERALES", { colSpan: 4, dark: true })] }),
      new TableRow({
        children: [
          headerCell("Fecha de Informe", { width: Math.round(W * 0.22) }),
          valueCell(fmtDate(data.reportDate), { width: Math.round(W * 0.28) }),
          headerCell("No. De Informe", { width: Math.round(W * 0.2) }),
          valueCell(data.reportNumber, { width: Math.round(W * 0.3), bold: true }),
        ],
      }),
      new TableRow({
        children: [
          headerCell("Funcionario Responsable de Informe", { colSpan: 1 }),
          headerCell("Nombre", { colSpan: 1 }),
          headerCell("Contacto", { colSpan: 1 }),
          headerCell("Cargo", { colSpan: 1 }),
        ],
      }),
      new TableRow({
        children: [
          valueCell(" "),
          valueCell(data.elaboratedByName || "—", { bold: true }),
          valueCell([
            `Ext. telefónica: ${data.professional?.phone || "DECE"}`,
            `Correo: ${data.professional?.email || "dece@institucion.edu.ec"}`,
          ]),
          valueCell(data.elaboratedByRole || "PROFESIONAL DECE"),
        ],
      }),
      new TableRow({
        children: [
          headerCell("Informe dirigido a"),
          headerCell("Nombre"),
          headerCell("Contacto"),
          headerCell("Cargo"),
        ],
      }),
      new TableRow({
        children: [
          valueCell(" "),
          valueCell(data.approvedByName || "Rector/a Institucional", { bold: true }),
          valueCell([
            `Ext. telefónica: Rectorado`,
            `Correo: ${data.authority?.email || "rectorado@institucion.edu.ec"}`,
          ]),
          valueCell(data.approvedByRole || "RECTORADO / MÁXIMA AUTORIDAD"),
        ],
      }),
    ],
  });

  // 2. TEMA
  const temaTable = new Table({
    width: { size: W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: cellBorders,
    rows: [
      new TableRow({
        children: [
          headerCell("TEMA:", { width: Math.round(W * 0.12) }),
          valueCell(data.tema, { width: Math.round(W * 0.88), bold: true, align: AlignmentType.JUSTIFIED }),
        ],
      }),
    ],
  });

  // 3. ACTIVIDADES
  const activityRows: TableRow[] = [
    new TableRow({
      children: [
        headerCell("ACTIVIDAD", { width: Math.round(W * 0.28) }),
        headerCell("EJE OVP", { width: Math.round(W * 0.2) }),
        headerCell("FECHA / PERÍODO", { width: Math.round(W * 0.18) }),
        headerCell("RESPONSABLE", { width: Math.round(W * 0.14) }),
        headerCell("BENEFICIARIOS", { width: Math.round(W * 0.2) }),
      ],
    }),
  ];

  for (const act of data.activities) {
    activityRows.push(
      new TableRow({
        children: [
          valueCell(act.name, { bold: true }),
          valueCell(act.axis, { align: AlignmentType.CENTER }),
          valueCell(act.date, { align: AlignmentType.CENTER }),
          valueCell(act.responsible),
          valueCell(act.beneficiaries),
        ],
      })
    );
  }

  const actividadTable = new Table({
    width: { size: W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: cellBorders,
    rows: activityRows,
  });

  // 4. RESULTADOS
  const resultadosTable = new Table({
    width: { size: W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: cellBorders,
    rows: [
      new TableRow({
        children: [
          headerCell("Participantes / Beneficiarios", { width: Math.round(W * 0.2) }),
          headerCell("Avances y Logros Institucionales", { width: Math.round(W * 0.4) }),
          headerCell("Nudos Críticos Identificados", { width: Math.round(W * 0.4) }),
        ],
      }),
      new TableRow({
        children: [
          valueCell(`${data.participantsCount} estudiantes`, {
            align: AlignmentType.CENTER,
            bold: true,
          }),
          valueCell(data.advances.split("\n")),
          valueCell(data.criticalNodes.split("\n")),
        ],
      }),
    ],
  });

  // 5. TABLA DE FIRMAS
  const firmaTable = (title: string, name: string, role: string, date: string) => {
    return new Table({
      width: { size: W, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      borders: cellBorders,
      rows: [
        new TableRow({ children: [headerCell(title, { colSpan: 3, dark: true })] }),
        new TableRow({
          children: [
            headerCell("Nombre / Cargo", { width: Math.round(W * 0.5) }),
            headerCell("Firma y Sello", { width: Math.round(W * 0.3) }),
            headerCell("Fecha", { width: Math.round(W * 0.2) }),
          ],
        }),
        new TableRow({
          children: [
            valueCell([name || "—", role || ""]),
            new TableCell({
              width: { size: Math.round(W * 0.3), type: WidthType.DXA },
              margins: { top: 60, bottom: 60, left: 80, right: 80 },
              verticalAlign: VerticalAlign.CENTER,
              children: [
                new Paragraph({ children: [run(" ")], spacing: { after: 1000 } }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [run("Firma y Sello Oficial", { size: 16, italics: true, color: "888888" })],
                }),
              ],
            }),
            valueCell(fmtDate(date), { align: AlignmentType.CENTER }),
          ],
        }),
      ],
    });
  };

  // Cuadro de Resguardo y Custodia Física
  const custodyCallout = new Table({
    width: { size: W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: cellBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: W, type: WidthType.DXA },
            shading: { fill: "F9FAFB" },
            margins: { top: 60, bottom: 60, left: 80, right: 80 },
            children: [
              new Paragraph({
                children: [
                  run("RESGUARDO EN ARCHIVO FÍSICO Y AUDITORÍA MINISTERIAL: ", { bold: true, size: SMALL, color: HEADING_BLUE }),
                  run("El presente informe técnico del proceso de OVP, junto con las matrices consolidadas y esquelas de citación, reposa bajo custodia física en la carpeta DECE institucional para fines de control distrital y auditoría educativa.", { size: SMALL }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1200, right: 1100, bottom: 1000, left: 1100, header: 460, footer: 320 },
          },
        },
        headers: { default: officialHeader() },
        footers: { default: officialFooter() },
        children: [
          datosGenerales,
          para("", { after: 120 }),
          temaTable,
          para("", { after: 120 }),

          sectionHeading("1. ANTECEDENTES"),
          subHeading("1.1 ÁMBITO LEGAL"),
          ...multiPara(data.legalBasis),
          subHeading("1.2 ALCANCE"),
          ...multiPara(data.scopeText),
          subHeading("1.3 OBJETIVOS"),
          para("Objetivo General:", { bold: true }),
          ...multiPara(data.objectiveGeneral),
          para("Objetivos Específicos:", { bold: true }),
          ...multiPara(data.objectivesSpecific),

          sectionHeading("2. DESARROLLO O ANÁLISIS EN BASE A LOS TRES EJES DE OVP"),
          ...multiPara(data.developmentAnalysis),

          subHeading("2.1 EJE DE AUTOCONOCIMIENTO (TALENTOS Y ARQUETIPOS VOCACIONALES)"),
          ...multiPara(data.ejeAutoconocimiento),

          subHeading("2.2 EJE DE INFORMACIÓN (OFERTA EDUCATIVA Y CAMPOS PROFESIONALES)"),
          ...multiPara(data.ejeInformacion),

          subHeading("2.3 EJE DE TOMA DE DECISIONES (PREFERENCIAS IPPJ Y PROYECTO DE VIDA)"),
          ...multiPara(data.ejeTomaDecisiones),

          sectionHeading("3. ACTIVIDADES REALIZADAS Y CRONOGRAMA"),
          actividadTable,
          para("", { after: 120 }),

          sectionHeading("4. RESULTADOS Y COBERTURA"),
          resultadosTable,
          para("", { after: 120 }),

          sectionHeading("5. CONCLUSIONES"),
          ...multiPara(data.conclusions),

          sectionHeading("6. RECOMENDACIONES"),
          ...multiPara(data.recommendations),

          para("", { before: 200 }),
          firmaTable("DESARROLLO DEL DOCUMENTO", data.elaboratedByName, data.elaboratedByRole, data.reportDate),
          para("", { after: 120 }),
          firmaTable("APROBACIÓN DEL DOCUMENTO", data.approvedByName, data.approvedByRole, data.reportDate),
          para("", { after: 120 }),
          custodyCallout,
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
