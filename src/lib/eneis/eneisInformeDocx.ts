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
import { ENEIS_BASE_LEGAL, ENEIS_INFORME_OBJETIVO } from "./eneisInformeBaseLegal";
import type { EneisInformeRow } from "./eneisInformes";
import type { InformeTablas } from "./eneisInformeCompute";

const FONT = "Calibri";
const NAVY = "1F3864";
const LABEL_FILL = "DEEAF6";
const BORDER = "8497B0";
const BODY = 20; // 10pt
const SMALL = 18; // 9pt

const PAGE_W = 11906;
const PAGE_H = 16838;
const MARGIN = { top: 1100, right: 900, bottom: 900, left: 900, header: 460, footer: 320 };
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
function cell(children: Paragraph[], o: { span?: number; fill?: string } = {}) {
  return new TableCell({
    columnSpan: o.span ?? 1,
    shading: o.fill ? { fill: o.fill } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 40, bottom: 40, left: 70, right: 70 },
    children,
  });
}
const lbl = (t: string, span = 1) =>
  cell([new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0, line: 220 }, children: [r(t, { bold: true, size: SMALL, color: NAVY })] })], {
    fill: LABEL_FILL,
    span,
  });
const val = (t: string, span = 1, align?: (typeof AlignmentType)[keyof typeof AlignmentType]) =>
  cell([new Paragraph({ alignment: align, spacing: { after: 0, line: 220 }, children: [r(t || " ", { size: SMALL })] })], { span });
const row = (cells: TableCell[]) => new TableRow({ children: cells });
const heading = (t: string) =>
  new Paragraph({ spacing: { before: 220, after: 100 }, children: [r(t, { bold: true, size: BODY, color: NAVY })] });
const body = (t: string, o: { bold?: boolean; italics?: boolean } = {}) =>
  new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 100, line: 260 }, children: [r(t, { size: SMALL, ...o })] });

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

function datosGeneralesTable(informe: EneisInformeRow): Table {
  const col = Math.round(W * 0.25);
  const half = Math.round((W - col) / 2);
  return new Table({
    width: { size: W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [col, half, half],
    alignment: AlignmentType.CENTER,
    borders,
    rows: [
      row([lbl("Fecha de Informe"), val(fmtDate(informe.fecha_informe)), cell([new Paragraph({ children: [] })])]),
      row([lbl("No. de Informe"), val(informe.numero_informe || "", 2)]),
      row([lbl("Funcionario Responsable", 1), lbl("Nombre / Contacto"), lbl("Cargo")]),
      row([
        cell([new Paragraph({ children: [] })]),
        val(`${informe.responsable_nombre || ""}${informe.responsable_contacto ? ` — ${informe.responsable_contacto}` : ""}`),
        val(informe.responsable_cargo || ""),
      ]),
      row([lbl("Informe dirigido a", 1), lbl("Nombre / Contacto"), lbl("Cargo")]),
      row([
        cell([new Paragraph({ children: [] })]),
        val(`${informe.dirigido_nombre || ""}${informe.dirigido_contacto ? ` — ${informe.dirigido_contacto}` : ""}`),
        val(informe.dirigido_cargo || ""),
      ]),
      row([lbl("TEMA"), val(informe.titulo, 2)]),
    ],
  });
}

function actividadesDocentesTable(tablas: InformeTablas): Table {
  const weights = [30, 18, 20, 32];
  const total = weights.reduce((a, b) => a + b, 0);
  const grid = weights.map((w, i) => (i === weights.length - 1 ? W - Math.round((W * (total - w)) / total) : Math.round((W * w) / total)));
  return new Table({
    width: { size: W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: grid,
    alignment: AlignmentType.CENTER,
    borders,
    rows: [
      row([lbl("ÁREA/MATERIA"), lbl("Nro. DE PLANIFICACIONES"), lbl("MES"), lbl("POBLACIÓN")]),
      ...(tablas.actividadesDocentes.length > 0
        ? tablas.actividadesDocentes.map((a) =>
            row([val(a.area), val(String(a.nroPlanificaciones), 1, AlignmentType.CENTER), val(a.mes), val(a.poblacion)])
          )
        : [row([val("Sin fichas registradas en este período.", 4)])]),
    ],
  });
}

function coberturaTable(tablas: InformeTablas, padresAlcanzados: number | null): Table {
  return new Table({
    width: { size: W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [Math.round(W / 4), Math.round(W / 4), Math.round(W / 4), W - 3 * Math.round(W / 4)],
    alignment: AlignmentType.CENTER,
    borders,
    rows: [
      row([
        lbl("No. Estudiantes alcanzados con ENEIS"),
        lbl("No. Docentes alcanzados con ENEIS"),
        lbl("No. Docentes que aplican Oportunidades Curriculares"),
        lbl("No. de padres, madres y/o representantes alcanzados"),
      ]),
      row([
        val(String(tablas.cobertura.estudiantesAlcanzados), 1, AlignmentType.CENTER),
        val(String(tablas.cobertura.docentesAlcanzados), 1, AlignmentType.CENTER),
        val(String(tablas.cobertura.docentesOportunidades), 1, AlignmentType.CENTER),
        val(padresAlcanzados != null ? String(padresAlcanzados) : "", 1, AlignmentType.CENTER),
      ]),
    ],
  });
}

function firmasTable(informe: EneisInformeRow): Table {
  const col = Math.floor(W / 3);
  return new Table({
    width: { size: W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [col, col, W - col * 2],
    alignment: AlignmentType.CENTER,
    borders,
    rows: [
      row([lbl("Nombre", 1), lbl("Cargo"), lbl("Firma")]),
      row([val(informe.responsable_nombre || ""), val(informe.responsable_cargo || ""), cell([new Paragraph({ children: [r(" ")] })])]),
    ],
  });
}

export async function generateEneisInformeDocx(
  informe: EneisInformeRow,
  tablas: InformeTablas,
  institutionName: string
): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [r(institutionName.toUpperCase(), { bold: true, size: BODY, color: NAVY })],
    }),
    datosGeneralesTable(informe),

    heading("ANTECEDENTES"),
    ...ENEIS_BASE_LEGAL.map((p) => (p.heading ? heading(p.text) : body(p.text))),

    heading("ALCANCE"),
    body(`Desde ${institutionName}; hacia el Distrito Educativo${informe.dirigido_cargo ? ` (${informe.dirigido_cargo})` : ""}.`),

    heading("OBJETIVO"),
    body(ENEIS_INFORME_OBJETIVO),

    heading("DESARROLLO"),
    body(informe.desarrollo_resumen || "—"),

    new Paragraph({ spacing: { before: 160, after: 100 }, children: [r("Resultados alcanzados — Actividades realizadas por docentes:", { bold: true, size: SMALL, color: NAVY })] }),
    actividadesDocentesTable(tablas),

    new Paragraph({ spacing: { before: 200, after: 100 }, children: [r("Actividades realizadas por el/la DECE Institucional:", { bold: true, size: SMALL, color: NAVY })] }),
    body(informe.actividades_dece || "—"),

    new Paragraph({ spacing: { before: 200, after: 100 }, children: [r("Cobertura:", { bold: true, size: SMALL, color: NAVY })] }),
    coberturaTable(tablas, informe.padres_alcanzados),

    heading("Buenas prácticas y experiencias exitosas"),
    body(informe.buenas_practicas || "—"),

    heading("Nudos críticos y dificultades"),
    body(informe.nudos_criticos || "—"),

    heading("CONCLUSIONES"),
    body(informe.conclusiones || "—"),

    heading("RECOMENDACIONES"),
    body(informe.recomendaciones || "—"),

    new Paragraph({ spacing: { before: 300 } }),
    firmasTable(informe),
  ];

  const doc = new Document({
    creator: "DECE App",
    title: informe.titulo,
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
