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
import type { ActivityReportRow, InstitutionRow } from "./types";

// Calca del formato oficial "INFORME DE TALLERES":
//  - fuente Cambria
//  - títulos de sección en azul, negrita
//  - tablas con encabezado gris D9D9D9
//  - encabezado y pie institucional (mismas imágenes que el resto del sistema)
const FONT = "Cambria";
const HEADING_BLUE = "17365D";
const SUBHEADING_BLUE = "2E74B5";
const GRAY = "D9D9D9";
const GRAY_DARK = "BFBFBF";
const BORDER = "808080";
const BODY = 22; // 11pt
const SMALL = 18; // 9pt

export interface ActivityReportPhoto {
  buffer: Buffer;
  mime: string | null;
  caption?: string | null;
}

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
    text,
    bold: opts.bold ?? false,
    italics: opts.italics ?? false,
    size: opts.size ?? BODY,
    color: opts.color,
    font: FONT,
  });
}

function para(text: string, opts: { bold?: boolean; size?: number; color?: string; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; after?: number; before?: number } = {}) {
  return new Paragraph({
    alignment: opts.align ?? AlignmentType.JUSTIFIED,
    spacing: { after: opts.after ?? 120, before: opts.before ?? 0, line: 276 },
    children: [run(text, opts)],
  });
}

function multiPara(text: string | null | undefined, opts: { size?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}): Paragraph[] {
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
    spacing: { before: 120, after: 80 },
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

function valueCell(text: string | string[], opts: { width?: number; colSpan?: number; bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) {
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

export async function generateActivityReportDocx(opts: {
  report: ActivityReportRow;
  institution?: InstitutionRow | null;
  photos?: ActivityReportPhoto[];
}): Promise<Buffer> {
  const { report, institution, photos = [] } = opts;
  const W = 9600; // ancho útil aprox. (twips) A4 portrait con márgenes normales

  // ---- DATOS GENERALES ----
  const datosGenerales = new Table({
    width: { size: W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: cellBorders,
    rows: [
      new TableRow({ children: [headerCell("DATOS GENERALES", { colSpan: 4, dark: true })] }),
      new TableRow({
        children: [
          headerCell("Fecha de Informe", { width: W * 0.22 }),
          valueCell(fmtDate(report.report_date), { width: W * 0.28 }),
          headerCell("No. De Informe", { width: W * 0.2 }),
          valueCell(report.report_number || "—", { width: W * 0.3, bold: true }),
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
          valueCell(report.responsible_name || "—", { bold: true }),
          valueCell([
            `Ext. telefónica: ${report.responsible_phone_ext || "—"}`,
            `Correo: ${report.responsible_email || "—"}`,
          ]),
          valueCell(report.responsible_role || "—"),
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
          valueCell(report.directed_to_name || "—", { bold: true }),
          valueCell([
            `Ext. telefónica: ${report.directed_to_phone_ext || "—"}`,
            `Correo: ${report.directed_to_email || "—"}`,
          ]),
          valueCell(report.directed_to_role || "—"),
        ],
      }),
    ],
  });

  // ---- TEMA ----
  const temaTable = new Table({
    width: { size: W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: cellBorders,
    rows: [
      new TableRow({
        children: [
          headerCell("TEMA:", { width: W * 0.12 }),
          valueCell(report.tema || "—", { width: W * 0.88, bold: true, align: AlignmentType.JUSTIFIED }),
        ],
      }),
    ],
  });

  // ---- ACTIVIDAD ----
  const actividadTable = new Table({
    width: { size: W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: cellBorders,
    rows: [
      new TableRow({
        children: [
          headerCell("ACTIVIDAD", { width: W * 0.24 }),
          headerCell("EJE", { width: W * 0.18 }),
          headerCell("FECHA", { width: W * 0.14 }),
          headerCell("RESPONSABLE", { width: W * 0.14 }),
          headerCell("BENEFICIARIOS", { width: W * 0.3 }),
        ],
      }),
      new TableRow({
        children: [
          valueCell(report.activity_name || "—"),
          valueCell(report.activity_axis || "PROMOCIÓN Y PREVENCIÓN"),
          valueCell(fmtDate(report.activity_date)),
          valueCell(report.activity_responsible || "DECE"),
          valueCell(report.activity_beneficiaries || "—"),
        ],
      }),
    ],
  });

  // ---- RESULTADOS ----
  const resultadosTable = new Table({
    width: { size: W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: cellBorders,
    rows: [
      new TableRow({
        children: [
          headerCell("Número de participantes", { width: W * 0.18 }),
          headerCell("Avances", { width: W * 0.41 }),
          headerCell("Nudos Críticos", { width: W * 0.41 }),
        ],
      }),
      new TableRow({
        children: [
          valueCell(report.participants_count != null ? String(report.participants_count) : "—", {
            align: AlignmentType.CENTER,
          }),
          valueCell((report.advances || "—").split("\n")),
          valueCell((report.critical_nodes || "—").split("\n")),
        ],
      }),
    ],
  });

  // ---- FIRMAS ----
  const firmaTable = (title: string, name: string | null, role: string | null, date: string | null) =>
    new Table({
      width: { size: W, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      borders: cellBorders,
      rows: [
        new TableRow({ children: [headerCell(title, { colSpan: 3, dark: true })] }),
        new TableRow({
          children: [
            headerCell("Nombre / Cargo", { width: W * 0.5 }),
            headerCell("Firma", { width: W * 0.3 }),
            headerCell("Fecha", { width: W * 0.2 }),
          ],
        }),
        new TableRow({
          children: [
            valueCell([name || "—", role || ""]),
            valueCell(" "),
            valueCell(fmtDate(date), { align: AlignmentType.CENTER }),
          ],
        }),
      ],
    });

  const children: (Paragraph | Table)[] = [
    datosGenerales,
    para("", { after: 120 }),
    temaTable,
    para("", { after: 120 }),

    sectionHeading("ANTECEDENTES"),
    subHeading("1.1 ÁMBITO LEGAL"),
    subHeading("BASE LEGAL"),
    ...multiPara(report.legal_basis),
    subHeading("ALCANCE"),
    ...multiPara(report.scope_text),
    subHeading("OBJETIVOS"),
    ...multiPara(report.objective_general),
    subHeading("Objetivos específicos"),
    ...multiPara(report.objectives_specific),

    sectionHeading("DESARROLLO O ANÁLISIS"),
    ...multiPara(report.development_analysis),

    sectionHeading("ACTIVIDAD"),
    actividadTable,

    sectionHeading("RESULTADOS"),
    resultadosTable,

    sectionHeading("CONCLUSIONES"),
    ...multiPara(report.conclusions),

    sectionHeading("RECOMENDACIONES"),
    ...multiPara(report.recommendations),

    para("", { before: 200 }),
    firmaTable("DESARROLLO DEL DOCUMENTO", report.elaborated_by_name, report.elaborated_by_role, report.elaborated_date),
    para("", { after: 120 }),
    firmaTable("APROBACIÓN DEL DOCUMENTO", report.approved_by_name, report.approved_by_role, report.approved_date),
  ];

  // ---- ANEXO: REGISTRO FOTOGRÁFICO ----
  if (photos.length > 0) {
    children.push(sectionHeading("ANEXO: REGISTRO FOTOGRÁFICO"));
    const rows: TableRow[] = [];
    for (let i = 0; i < photos.length; i += 2) {
      const pair = photos.slice(i, i + 2);
      rows.push(
        new TableRow({
          children: pair.concat(pair.length === 1 ? [null as never] : []).map((p) => {
            if (!p) return new TableCell({ width: { size: W / 2, type: WidthType.DXA }, children: [new Paragraph("")] });
            const type = (p.mime || "").includes("png") ? "png" : "jpg";
            return new TableCell({
              width: { size: W / 2, type: WidthType.DXA },
              verticalAlign: VerticalAlign.CENTER,
              margins: { top: 80, bottom: 80, left: 80, right: 80 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 40 },
                  children: [
                    new ImageRun({
                      data: p.buffer,
                      transformation: { width: 230, height: 173 },
                      type: type as "png" | "jpg",
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 0 },
                  children: [run(p.caption || "", { size: SMALL, italics: true })],
                }),
              ],
            });
          }),
        })
      );
    }
    children.push(
      new Table({
        width: { size: W, type: WidthType.DXA },
        layout: TableLayoutType.FIXED,
        borders: cellBorders,
        rows,
      })
    );
  }

  const doc = new Document({
    creator: "DECE App",
    title: `Informe de Taller - ${report.tema || report.activity_name || ""}`,
    styles: {
      default: {
        document: { run: { font: FONT, size: BODY }, paragraph: { spacing: { line: 276 } } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1100, right: 1100, bottom: 1100, left: 1100, header: 480, footer: 340 },
          },
        },
        headers: { default: officialHeader() },
        footers: { default: officialFooter() },
        children,
      },
    ],
  });

  void institution;
  return await Packer.toBuffer(doc);
}
