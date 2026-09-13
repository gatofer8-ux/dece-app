/**
 * Generador real (.docx, vía la librería `docx`) de la Ficha de Seguimiento de
 * la Atención Psicosocial — calca fiel del formato oficial institucional.
 *
 * Reemplaza el truco anterior de exportar el innerHTML de la vista impresa
 * envuelto como .doc: ese truco depende de un stylesheet de reemplazo que no
 * puede traducir todas las clases de Tailwind con valores arbitrarios, y las
 * imágenes con ruta relativa (el logo del Ministerio) no se resuelven al
 * abrir el archivo fuera del navegador. Un .docx real no tiene ninguno de
 * esos problemas: las imágenes se incrustan como datos binarios y la
 * orientación de página es una propiedad real del documento, respetada por
 * cualquier lector compatible con OOXML (Word, LibreOffice, Google Docs).
 */

import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  ImageRun,
  Packer,
  AlignmentType,
  BorderStyle,
  WidthType,
  VerticalAlign,
  PageOrientation,
} from "docx";
import path from "path";
import fs from "fs";
import { INTERVENTION_TYPE_LABELS } from "@/lib/types";
import { currentSchoolYearSpaced } from "@/lib/schoolYearText";
import type { CaseActionRow, InstitutionRow, StudentRow } from "@/lib/types";

const FONT_NAME = "Calibri";
const TITLE_BLUE = "2F5496";
const HEADER_FILL = "D5DCE4";
const BORDER_COLOR = "94A3B8";
// Ancho útil de la página en A4 horizontal (16838 twips) menos márgenes izq/der
// (700 + 700): las tablas deben ocupar este ancho, no el de una página vertical.
const CONTENT_WIDTH_DXA = 15400;

function getPublicImageBuffer(fileName: string): Buffer | null {
  try {
    const p = path.join(process.cwd(), "public", fileName);
    if (fs.existsSync(p)) return fs.readFileSync(p);
  } catch {
    // Sin logo: el documento se genera igual, solo sin la imagen.
  }
  return null;
}

/** Convierte un data URL base64 (como se guarda institutions.seal_image) en buffer para ImageRun. */
function dataUrlToBuffer(dataUrl?: string | null): Buffer | null {
  if (!dataUrl || !dataUrl.startsWith("data:image")) return null;
  try {
    const base64 = dataUrl.split(",")[1];
    if (!base64) return null;
    return Buffer.from(base64, "base64");
  } catch {
    return null;
  }
}

const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR };
const tableBorders = {
  top: cellBorder,
  bottom: cellBorder,
  left: cellBorder,
  right: cellBorder,
  insideHorizontal: cellBorder,
  insideVertical: cellBorder,
};
const cellMargins = { top: 60, bottom: 60, left: 80, right: 80 };

export interface SeguimientoDocxData {
  student: StudentRow;
  studentGrade: string;
  actions: CaseActionRow[];
  institution: InstitutionRow;
  professional: { name: string };
  userMap: Record<string, string>;
  folioNumber: number;
  showPerRowSign: boolean;
  blankRowsCount: number;
}

export async function generateSeguimientoDocx(data: SeguimientoDocxData): Promise<Buffer> {
  const { student, studentGrade, actions, institution, professional, userMap, folioNumber, showPerRowSign, blankRowsCount } = data;

  const mineducLogo = getPublicImageBuffer("mineduc-logo.png");
  const sealImage = dataUrlToBuffer(institution?.seal_image) || getPublicImageBuffer("institution-logo-default.png");

  const displayInstName = institution?.name
    ? institution.name.includes("18H") ? institution.name : `${institution.name} - 18H00313`
    : "UNIDAD EDUCATIVA";

  // Fila superior (membrete): logo Mineduc | nombre institución / depto / año | sello institucional
  const letterheadTable = new Table({
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 2400, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                children: mineducLogo
                  ? [new ImageRun({ data: mineducLogo, transformation: { width: 170, height: 45 }, type: "png" })]
                  : [],
              }),
            ],
          }),
          new TableCell({
            width: { size: 4800, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: displayInstName, bold: true, font: FONT_NAME, size: 20, color: "475569" })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "DEPARTAMENTO DE CONSEJERÍA ESTUDIANTIL", bold: true, font: FONT_NAME, size: 16, color: "767171" })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `AÑO LECTIVO ${currentSchoolYearSpaced()}`, bold: true, font: FONT_NAME, size: 15, color: "767171" })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 2400, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: sealImage
                  ? [new ImageRun({ data: sealImage, transformation: { width: 55, height: 55 }, type: "png" })]
                  : [],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const children: (Paragraph | Table)[] = [letterheadTable];

  // Barra de título azul (calca del membrete institucional)
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      shading: { fill: TITLE_BLUE },
      border: {
        top: { style: BorderStyle.SINGLE, size: 4, color: TITLE_BLUE },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: TITLE_BLUE },
        left: { style: BorderStyle.SINGLE, size: 4, color: TITLE_BLUE },
        right: { style: BorderStyle.SINGLE, size: 4, color: TITLE_BLUE },
      },
      spacing: { before: 120, after: 160 },
      children: [
        new TextRun({ text: "SEGUIMIENTO DE LA ATENCIÓN PSICOSOCIAL", bold: true, font: FONT_NAME, size: 22, color: "FFFFFF" }),
      ],
    })
  );

  // Nota de confidencialidad
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [
        new TextRun({
          text: "*La información registrada en este documento es confidencial y de uso exclusivo del Departamento de Consejería Estudiantil",
          italics: true,
          font: FONT_NAME,
          size: 17,
          color: "475569",
        }),
      ],
    })
  );

  // Nombre y Apellidos / Curso y Paralelo
  children.push(
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({ text: "Nombre y Apellidos: ", bold: true, font: FONT_NAME, size: 19 }),
        new TextRun({ text: student.full_name, font: FONT_NAME, size: 19 }),
        new TextRun({ text: "          Curso y Paralelo: ", bold: true, font: FONT_NAME, size: 19 }),
        new TextRun({ text: studentGrade, font: FONT_NAME, size: 19 }),
      ],
    })
  );

  // Título de sección
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: `Acciones implementadas para la atención psicosocial${folioNumber > 1 ? ` (Continuación ${folioNumber})` : ""}`,
          bold: true,
          font: FONT_NAME,
          size: 20,
        }),
      ],
    })
  );

  // Tabla principal
  const headerCell = (text: string, widthPct: number, extra?: { fill?: string; color?: string }) =>
    new TableCell({
      width: { size: widthPct * (CONTENT_WIDTH_DXA / 100), type: WidthType.DXA },
      shading: { fill: extra?.fill || HEADER_FILL },
      verticalAlign: VerticalAlign.CENTER,
      margins: cellMargins,
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text, bold: true, font: FONT_NAME, size: 16, color: extra?.color || "0F172A" })],
        }),
      ],
    });

  const obsWidth = showPerRowSign ? 31 : 44;
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell("Tipo de intervención realizada (individual, familiar o grupal, en crisis)", 13),
      headerCell("Descripción de la atención psicosocial realizada", 23),
      headerCell("Profesional que realiza la atención psicosocial", 11),
      headerCell("Fecha de atención", 9),
      headerCell("Observaciones", obsWidth),
      ...(showPerRowSign ? [headerCell("Firma", 13, { fill: "DBEAFE", color: "1E3A8A" })] : []),
    ],
  });

  const bodyCell = (text: string, opts?: { center?: boolean; height?: number }) =>
    new TableCell({
      margins: cellMargins,
      verticalAlign: VerticalAlign.TOP,
      children: [
        new Paragraph({
          alignment: opts?.center ? AlignmentType.CENTER : AlignmentType.LEFT,
          children: [new TextRun({ text, font: FONT_NAME, size: 16 })],
        }),
      ],
    });

  const formatDateEs = (iso: string): string => {
    if (!iso) return "";
    const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" }).replace(".", "");
  };

  const dataRows = actions.map((a) => {
    const tipo = a.intervention_type ? INTERVENTION_TYPE_LABELS[a.intervention_type] || a.intervention_type : a.type;
    return new TableRow({
      children: [
        bodyCell(tipo),
        bodyCell(a.description || ""),
        bodyCell(userMap[a.author_id] || professional.name),
        bodyCell(formatDateEs(a.date), { center: true }),
        bodyCell(a.observations || "—"),
        ...(showPerRowSign ? [bodyCell("")] : []),
      ],
    });
  });

  const blankRows = Array.from({ length: blankRowsCount }).map(
    () =>
      new TableRow({
        children: [
          bodyCell(""),
          bodyCell(""),
          bodyCell(""),
          bodyCell(""),
          bodyCell(""),
          ...(showPerRowSign ? [bodyCell("")] : []),
        ],
      })
  );

  children.push(
    new Table({
      width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
      borders: tableBorders,
      rows: [headerRow, ...dataRows, ...blankRows],
    })
  );

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: FONT_NAME, size: 18 }, paragraph: { spacing: { line: 264, after: 0 } } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            // Tamaño A4 "lógico" (retrato) + orientación explícita: es la librería
            // `docx` la que gira las dimensiones internamente al fijar `orientation`.
            // Pasar ya invertidas width/height SIN esta bandera es insuficiente —
            // algunos lectores de Word ignoran las dimensiones y siguen mostrando
            // la página en vertical si no está también el atributo w:orient real.
            size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE },
            margin: { top: 700, bottom: 700, left: 700, right: 700 },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
