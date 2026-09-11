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
  ImageRun,
  Packer,
  AlignmentType,
  BorderStyle,
  WidthType,
  VerticalAlign,
  TableLayoutType,
} from "docx";
import {
  ENEIS_NIVELES_PREPARACION,
  ENEIS_TEMAS_EIS,
  ENEIS_RECURSOS_INSTITUCIONALES,
  type EneisFichaTecnicaFuncionario,
  type EneisFichaTecnicaCronogramaItem,
  type EneisFichaTecnicaAvanceItem,
  type EneisFichaTecnicaFirma,
} from "./eneisFichaTecnica";

/**
 * Ficha Técnica del Equipo Escolar — réplica fiel del formato propio de la
 * institución: documento en blanco y negro, sin colores de relleno.
 */

const FONT = "Calibri";
const BODY = 20; // 10pt
const SMALL = 18; // 9pt

const PAGE_W = 11906;
const PAGE_H = 16838;
const MARGIN = { top: 1500, right: 900, bottom: 1200, left: 900, header: 460, footer: 320 };
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

const Bd = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const borders = { top: Bd, bottom: Bd, left: Bd, right: Bd, insideHorizontal: Bd, insideVertical: Bd };

function r(text: string, o: { bold?: boolean; size?: number } = {}) {
  return new TextRun({ text, bold: o.bold ?? false, size: o.size ?? BODY, font: FONT });
}
function h(text: string) {
  return new Paragraph({ spacing: { before: 200, after: 80 }, children: [r(text, { bold: true })] });
}
function p(text: string, o: { bold?: boolean } = {}) {
  return new Paragraph({ spacing: { after: 40 }, children: [r(text, o)] });
}

type VAlign = typeof VerticalAlign.TOP | typeof VerticalAlign.CENTER | typeof VerticalAlign.BOTTOM;
function cell(children: Paragraph[], o: { span?: number; valign?: VAlign } = {}) {
  return new TableCell({
    columnSpan: o.span ?? 1,
    verticalAlign: o.valign ?? VerticalAlign.TOP,
    margins: { top: 40, bottom: 40, left: 70, right: 70 },
    children,
  });
}
const row = (cells: TableCell[]) => new TableRow({ children: cells });

function fmtDate(d: string | null | undefined) {
  const m = (d || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d || "";
}

function headTable(rows: TableRow[], grid: number[]) {
  return new Table({ width: { size: W, type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: grid, borders, rows });
}
function equalGrid(n: number) {
  const c = Math.floor(W / n);
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? W - c * (n - 1) : c));
}
function headRow(labels: string[]) {
  return row(labels.map((t) => cell([new Paragraph({ alignment: AlignmentType.CENTER, children: [r(t, { bold: true, size: SMALL })] })])));
}

export interface EneisFichaTecnicaRowLike {
  coordinacion_zonal_distrito: string | null;
  fecha_elaboracion: string | null;
  nudos_criticos: string | null;
}

export async function generateEneisFichaTecnicaDocx(
  f: EneisFichaTecnicaRowLike,
  funcionarios: EneisFichaTecnicaFuncionario[],
  nivelIndex: number | null,
  temasSeleccionados: string[],
  recursosSeleccionados: number[],
  cronograma: EneisFichaTecnicaCronogramaItem[],
  avances: EneisFichaTecnicaAvanceItem[],
  firmasEscolares: EneisFichaTecnicaFirma[],
  firmasDistritales: EneisFichaTecnicaFirma[],
  institutionName: string
): Promise<Buffer> {
  const funcRows = funcionarios.length ? funcionarios : [{ nombre: "", cargo: "" }];
  const funcionariosTable = headTable(
    [headRow(["Nombre", "Cargo"]), ...funcRows.map((fu) => row([cell([p(fu.nombre || "")]), cell([p(fu.cargo || "")])]))],
    equalGrid(2)
  );

  const nivelesTable = headTable(
    [
      headRow(["Nivel de preparación", "(X)", "Objetivos"]),
      ...ENEIS_NIVELES_PREPARACION.map((n, i) =>
        row([
          cell([p(n.etapa)]),
          cell([new Paragraph({ alignment: AlignmentType.CENTER, children: [r(nivelIndex === i ? "X" : "")] })]),
          cell([p(n.objetivo || "")]),
        ])
      ),
    ],
    [Math.floor(W * 0.32), Math.floor(W * 0.1), W - Math.floor(W * 0.32) - Math.floor(W * 0.1)]
  );

  const temasSet = new Set(temasSeleccionados);
  const temasTable = headTable(
    [headRow(["Conceptos clave", "Temas", "(X)"]), ...ENEIS_TEMAS_EIS.map((t) => row([cell([p(t.concepto)]), cell([p(t.tema)]), cell([new Paragraph({ alignment: AlignmentType.CENTER, children: [r(temasSet.has(t.id) ? "X" : "")] })])]))],
    [Math.floor(W * 0.28), Math.floor(W * 0.6), W - Math.floor(W * 0.28) - Math.floor(W * 0.6)]
  );

  const recursosSet = new Set(recursosSeleccionados);
  const recursosTable = headTable(
    [
      headRow(["Nombre", "Población objetiva / Espacio de implementación", "(X)"]),
      ...ENEIS_RECURSOS_INSTITUCIONALES.map((rc, i) =>
        row([cell([p(rc.nombre)]), cell([p(rc.poblacion)]), cell([new Paragraph({ alignment: AlignmentType.CENTER, children: [r(recursosSet.has(i) ? "X" : "")] })])])
      ),
    ],
    [Math.floor(W * 0.5), Math.floor(W * 0.4), W - Math.floor(W * 0.5) - Math.floor(W * 0.4)]
  );

  const cronRows = cronograma.length ? cronograma : [{ actividad: "", poblacion: "", fecha: "", responsable: "" }];
  const cronogramaTable = headTable(
    [
      headRow(["Actividad / Herramienta utilizada", "Población objetivo", "Fechas", "Responsable"]),
      ...cronRows.map((c) => row([cell([p(c.actividad || "")]), cell([p(c.poblacion || "")]), cell([p(fmtDate(c.fecha))]), cell([p(c.responsable || "")])])),
    ],
    equalGrid(4)
  );

  const avanceRows = avances.length ? avances : [{ actividad: "", estado: "", poblacion: "" }];
  const avancesTable = headTable(
    [
      headRow(["Actividad / Herramienta utilizada", "Estado (Pendiente/en curso/Finalizado)", "Población alcanzada (Resultados)"]),
      ...avanceRows.map((a) => row([cell([p(a.actividad || "")]), cell([p(a.estado || "")]), cell([p(a.poblacion || "")])])),
    ],
    equalGrid(3)
  );

  const firmasTable = (firmas: EneisFichaTecnicaFirma[]) =>
    headTable(
      firmas.map((fi) => row([cell([p("Firma: _______________________")]), cell([p(`Nombre: ${fi.nombre || ""}`)]), cell([p(`Cargo: ${fi.role}`)])])),
      [Math.floor(W * 0.34), Math.floor(W * 0.33), W - Math.floor(W * 0.34) - Math.floor(W * 0.33)]
    );

  const doc = new Document({
    creator: "DECE App",
    title: "Ficha Técnica del Equipo Escolar — Implementación de EIS",
    styles: { default: { document: { run: { font: FONT, size: BODY } } } },
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
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [r("FICHA TÉCNICA DEL EQUIPO ESCOLAR", { bold: true, size: 24 })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [r("Implementación de Educación Integral en Sexualidad en Instituciones Educativas", { bold: true, size: SMALL })] }),

          new Paragraph({ children: [r("Coordinación zonal / Distrito: ", { bold: true }), r(f.coordinacion_zonal_distrito || "")] }),
          new Paragraph({ children: [r("Nombre de la institución educativa: ", { bold: true }), r(institutionName)] }),
          new Paragraph({ children: [r("Fecha de elaboración: ", { bold: true }), r(fmtDate(f.fecha_elaboracion))] }),

          h("Funcionarios que conforman el equipo escolar EIS"),
          funcionariosTable,

          h("Determinación del nivel de preparación de la comunidad educativa"),
          nivelesTable,

          h("Priorización de temas de trabajo"),
          temasTable,

          h("Selección de recursos institucionales"),
          recursosTable,

          h("Planificación de actividades (cronograma)"),
          cronogramaTable,

          h("Reporte de avances y resultados"),
          avancesTable,

          h("Nudos críticos:"),
          p(f.nudos_criticos || " "),

          h("Firmas de responsabilidad — Equipo Escolar de Educación Integral en Sexualidad"),
          firmasTable(firmasEscolares),

          h("Firmas de responsabilidad — Equipo Distrital de Educación Integral en Sexualidad"),
          firmasTable(firmasDistritales),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
