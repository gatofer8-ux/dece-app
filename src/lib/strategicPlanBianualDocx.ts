// Generador Word (.docx) del PLAN ESTRATÉGICO BIANUAL del DECE.
//
// Reproduce la estructura del formato institucional: título, datos informativos,
// planificación (objetivo general y objetivos específicos), matriz agrupada por
// eje de acción con las columnas Metas / Acciones / Responsables / Indicador de
// evaluación / Plazos de ejecución, y los bloques de firmas ELABORACIÓN /
// REVISIÓN / APROBACIÓN.
//
// Sigue las convenciones de `meetingMinutesDocx.ts`: TableLayoutType.FIXED con
// columnWidths explícitos. La orientación es horizontal (se intercambian
// PAGE_W/PAGE_H) porque la matriz es ancha.
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
  parseBianualAxisItems,
  parseBianualAnalysts,
  parseBianualSignatories,
  parseBianualSpecificObjectives,
} from "./strategicPlanBianual";
import type { StrategicBianualPlanRow, ActionPlanSignatory } from "./types";

const FONT = "Calibri";
const NAVY = "1B365D";
const LABEL_FILL = "DEEAF6";
const BAR_FILL = "D9E1F2";
const BORDER = "000000";
const BODY = 20; // 10pt
const SMALL = 18; // 9pt
const TINY = 16; // 8pt

// Hoja A4 horizontal: se intercambian ancho y alto respecto del vertical.
const PAGE_W = 16838;
const PAGE_H = 11906;
const MARGIN = { top: 900, right: 800, bottom: 900, left: 800 };
const W = PAGE_W - MARGIN.left - MARGIN.right;

// Rejilla de 20 columnas: permite repartir las 5 columnas de la matriz
// (22% / 28% / 15% / 22% / 13%) y las tablas de cabecera y firmas.
const N = 20;
const COL = Math.floor(W / N);
const GRID = Array.from({ length: N }, (_, i) => (i === N - 1 ? W - COL * (N - 1) : COL));

const Bd = { style: BorderStyle.SINGLE, size: 4, color: BORDER };
const borders = {
  top: Bd,
  bottom: Bd,
  left: Bd,
  right: Bd,
  insideHorizontal: Bd,
  insideVertical: Bd,
};

function r(
  text: string,
  o: { bold?: boolean; size?: number; color?: string } = {}
): TextRun {
  return new TextRun({
    text,
    bold: o.bold ?? false,
    size: o.size ?? BODY,
    color: o.color,
    font: FONT,
  });
}

function multiP(
  text: string | null | undefined,
  o: { size?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}
): Paragraph[] {
  const t = (text || "").trim();
  if (!t) {
    return [
      new Paragraph({ spacing: { after: 0, line: 240 }, children: [r(" ", { size: o.size ?? SMALL })] }),
    ];
  }
  return t
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map(
      (l) =>
        new Paragraph({
          alignment: o.align ?? AlignmentType.JUSTIFIED,
          spacing: { after: 0, line: 240 },
          children: [r(l, { size: o.size ?? SMALL })],
        })
    );
}

type VAlign = typeof VerticalAlign.TOP | typeof VerticalAlign.CENTER | typeof VerticalAlign.BOTTOM;

function cell(
  children: Paragraph[],
  o: { span?: number; rowSpan?: number; fill?: string; valign?: VAlign } = {}
): TableCell {
  return new TableCell({
    columnSpan: o.span ?? 1,
    rowSpan: o.rowSpan,
    shading: o.fill ? { fill: o.fill } : undefined,
    verticalAlign: o.valign ?? VerticalAlign.CENTER,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children,
  });
}

const lbl = (t: string, span = 1, o: { rowSpan?: number } = {}) =>
  cell(
    [
      new Paragraph({
        spacing: { after: 0, line: 232 },
        children: [r(t, { bold: true, size: SMALL, color: NAVY })],
      }),
    ],
    { fill: LABEL_FILL, span, rowSpan: o.rowSpan }
  );

const val = (t: string, span = 1) =>
  cell([new Paragraph({ spacing: { after: 0, line: 232 }, children: [r(t || " ", { size: SMALL })] })], {
    span,
  });

const row = (cells: TableCell[]) => new TableRow({ children: cells });

/** Franja de sección a todo el ancho (fondo azul oscuro, texto blanco). */
const sectionBar = (t: string) =>
  new TableRow({
    children: [
      cell(
        [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 0 },
            children: [r(t, { bold: true, size: BODY, color: "FFFFFF" })],
          }),
        ],
        { span: N, fill: NAVY }
      ),
    ],
  });

function fmtD(d: string | null | undefined): string {
  const m = (d || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d || "";
}

function parseSignatory(raw: string | null | undefined): ActionPlanSignatory | null {
  if (!raw) return null;
  try {
    const parsed = typeof raw === "object" ? raw : JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as ActionPlanSignatory;
  } catch {
    /* noop */
  }
  return null;
}

export async function generateStrategicPlanBianualDocx(
  plan: StrategicBianualPlanRow,
  institutionName: string
): Promise<Buffer> {
  const items = parseBianualAxisItems(plan.axis_items_data);
  const analysts = parseBianualAnalysts(plan.analysts_data);
  const objectives = parseBianualSpecificObjectives(plan.specific_objectives);
  const elaboratedList = parseBianualSignatories(plan.elaborated_by);
  const reviewed = parseSignatory(plan.reviewed_by);
  const approved = parseSignatory(plan.approved_by);

  const districtText =
    [plan.district_code, plan.district_name].filter((v) => (v || "").trim()).join(" - ") || "—";

  // ── Tabla 1: datos informativos + planificación ──
  const headerRows: TableRow[] = [
    sectionBar("DATOS INFORMATIVOS"),
    row([lbl("Institución Educativa:", 5), val(institutionName, 15)]),
    row([
      lbl("Periodo Bianual:", 5),
      val(plan.period_text, 5),
      lbl("Distrito Educativo:", 4),
      val(districtText, 6),
    ]),
    row([
      lbl("Número de estudiantes:", 5),
      val(String(plan.students_count ?? 0), 5),
      lbl("Número de profesionales DECE:", 4),
      val(String(plan.professionals_count ?? 0), 6),
    ]),
    row([lbl("Coordinador/a DECE:", 5), val(plan.coordinator_name || "Coordinación DECE", 15)]),
    row([
      lbl("Analistas DECE:", 5),
      cell(
        analysts.length > 0
          ? analysts.map(
              (a, i) =>
                new Paragraph({
                  spacing: { after: 0, line: 232 },
                  children: [
                    r(`${i + 1}. ${a.name}${a.role ? ` — ${a.role}` : ""}`, { size: SMALL }),
                  ],
                })
            )
          : multiP("Equipo DECE Institucional"),
        { span: 15, valign: VerticalAlign.TOP }
      ),
    ]),
    row([
      lbl("Recursos institucionales:", 5),
      cell(multiP(plan.available_resources), { span: 15, valign: VerticalAlign.TOP }),
    ]),
    row([
      lbl("Condición socioeconómica:", 5),
      cell(multiP(plan.socioeconomic_condition), { span: 15, valign: VerticalAlign.TOP }),
    ]),

    sectionBar("PLANIFICACIÓN"),
    row([
      lbl("Objetivo general", 5),
      cell(multiP(plan.general_objective), { span: 15, valign: VerticalAlign.TOP }),
    ]),
    row([
      lbl("Objetivos específicos", 5),
      cell(
        objectives.length > 0
          ? objectives.map(
              (o, i) =>
                new Paragraph({
                  alignment: AlignmentType.JUSTIFIED,
                  spacing: { after: 40, line: 240 },
                  children: [r(`${i + 1}. ${o}`, { size: SMALL })],
                })
            )
          : multiP("—"),
        { span: 15, valign: VerticalAlign.TOP }
      ),
    ]),
  ];

  const headerTable = new Table({
    width: { size: W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: GRID,
    alignment: AlignmentType.CENTER,
    borders,
    rows: headerRows,
  });

  // ── Tabla 2: matriz de ejes de acción ──
  // Reparto de las 20 columnas de la rejilla entre las 5 columnas del formato.
  const MATRIX_SPANS = [4, 6, 3, 4, 3];

  const matrixHeader = new TableRow({
    tableHeader: true,
    children: ["Metas", "Acciones", "Responsables", "Indicador de evaluación", "Plazos de ejecución"].map(
      (h, i) =>
        cell(
          [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 0 },
              children: [r(h, { bold: true, size: SMALL, color: "FFFFFF" })],
            }),
          ],
          { span: MATRIX_SPANS[i], fill: NAVY }
        )
    ),
  });

  const matrixRows: TableRow[] = [matrixHeader];

  items.forEach((item, idx) => {
    const isFirstOfAxis = idx === 0 || items[idx - 1].axis !== item.axis;

    if (isFirstOfAxis) {
      matrixRows.push(
        new TableRow({
          children: [
            cell(
              [
                new Paragraph({
                  spacing: { after: 0 },
                  children: [r(item.axis, { bold: true, size: BODY, color: NAVY })],
                }),
              ],
              { span: N, fill: BAR_FILL }
            ),
          ],
        })
      );
    }

    matrixRows.push(
      new TableRow({
        children: [
          cell(multiP(item.goal, { size: TINY }), {
            span: MATRIX_SPANS[0],
            valign: VerticalAlign.TOP,
          }),
          cell(multiP(item.actions, { size: TINY }), {
            span: MATRIX_SPANS[1],
            valign: VerticalAlign.TOP,
          }),
          cell(multiP(item.responsible, { size: TINY, align: AlignmentType.LEFT }), {
            span: MATRIX_SPANS[2],
            valign: VerticalAlign.TOP,
          }),
          cell(multiP(item.evaluation_indicator, { size: TINY }), {
            span: MATRIX_SPANS[3],
            valign: VerticalAlign.TOP,
          }),
          cell(multiP(item.execution_term, { size: TINY, align: AlignmentType.LEFT }), {
            span: MATRIX_SPANS[4],
            valign: VerticalAlign.TOP,
          }),
        ],
      })
    );
  });

  const matrixTable = new Table({
    width: { size: W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: GRID,
    alignment: AlignmentType.CENTER,
    borders,
    rows: matrixRows,
  });

  // ── Tabla 3: firmas ──
  const signatureBlock = (
    sigs: ActionPlanSignatory[]
  ): Paragraph[] => {
    if (sigs.length === 0) {
      return [
        new Paragraph({ spacing: { after: 0 }, children: [r(" ", { size: SMALL })] }),
        new Paragraph({ spacing: { after: 0 }, children: [r("____________________", { size: SMALL })] }),
      ];
    }
    const out: Paragraph[] = [];
    sigs.forEach((s) => {
      out.push(
        new Paragraph({
          spacing: { after: 0, line: 232 },
          children: [r(s.name || " ", { bold: true, size: SMALL })],
        })
      );
      out.push(
        new Paragraph({
          spacing: { after: 0, line: 232 },
          children: [r(s.role || " ", { size: TINY, color: "555555" })],
        })
      );
      out.push(
        new Paragraph({ spacing: { before: 160, after: 0 }, children: [r("____________________", { size: SMALL })] })
      );
      out.push(
        new Paragraph({
          spacing: { after: 160, line: 232 },
          children: [r(`Fecha: ${fmtD(s.date)}`, { size: TINY, color: "555555" })],
        })
      );
    });
    return out;
  };

  const signatureRows: TableRow[] = [
    new TableRow({
      children: [
        cell(
          [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 0 },
              children: [r("Nombres y apellidos / Cargo o Rol / Firmas / Fecha", { bold: true, size: SMALL, color: NAVY })],
            }),
          ],
          { span: N, fill: LABEL_FILL }
        ),
      ],
    }),
    new TableRow({
      children: [
        cell(
          [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 0 },
              children: [r("ELABORACIÓN", { bold: true, size: SMALL, color: NAVY })],
            }),
          ],
          { span: 7, fill: BAR_FILL }
        ),
        cell(
          [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 0 },
              children: [r("REVISIÓN", { bold: true, size: SMALL, color: NAVY })],
            }),
          ],
          { span: 7, fill: BAR_FILL }
        ),
        cell(
          [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 0 },
              children: [r("APROBACIÓN", { bold: true, size: SMALL, color: NAVY })],
            }),
          ],
          { span: 6, fill: BAR_FILL }
        ),
      ],
    }),
    new TableRow({
      children: [
        cell(signatureBlock(elaboratedList), { span: 7, valign: VerticalAlign.TOP }),
        cell(signatureBlock(reviewed ? [reviewed] : []), { span: 7, valign: VerticalAlign.TOP }),
        cell(signatureBlock(approved ? [approved] : []), { span: 6, valign: VerticalAlign.TOP }),
      ],
    }),
  ];

  const signatureTable = new Table({
    width: { size: W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: GRID,
    alignment: AlignmentType.CENTER,
    borders,
    rows: signatureRows,
  });

  const doc = new Document({
    creator: "DECE App",
    title: `Plan Estratégico Bianual DECE ${plan.period_text}`,
    styles: { default: { document: { run: { font: FONT, size: BODY } } } },
    sections: [
      {
        properties: {
          page: { size: { width: PAGE_W, height: PAGE_H }, margin: MARGIN },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [r("MINISTERIO DE EDUCACIÓN DEL ECUADOR", { bold: true, size: 22, color: NAVY })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [
              r("PLAN ESTRATÉGICO BIANUAL DEL DEPARTAMENTO DE CONSEJERÍA ESTUDIANTIL DECE", {
                bold: true,
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              r(`${institutionName} — PERIODO BIANUAL ${plan.period_text}`, { bold: true, size: 20 }),
            ],
          }),
          headerTable,
          new Paragraph({ spacing: { after: 160 }, children: [r(" ", { size: SMALL })] }),
          new Paragraph({
            spacing: { after: 80 },
            children: [r("MATRIZ DE EJES DE ACCIÓN", { bold: true, size: BODY, color: NAVY })],
          }),
          matrixTable,
          new Paragraph({ spacing: { after: 200 }, children: [r(" ", { size: SMALL })] }),
          signatureTable,
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
