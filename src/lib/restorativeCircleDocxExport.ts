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
  ShadingType,
  TabStopType,
} from "docx";
import path from "path";
import fs from "fs";
import type { RestorativeCircleConsentRow } from "./types";

const FONT_FAMILY = "Times New Roman";
const FONT_SIZE = 20; // 10 pt in half-points

const TABLE_BORDER = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: "000000",
};

const BORDERS_ALL_BLACK = {
  top: TABLE_BORDER,
  bottom: TABLE_BORDER,
  left: TABLE_BORDER,
  right: TABLE_BORDER,
  insideHorizontal: TABLE_BORDER,
  insideVertical: TABLE_BORDER,
};

function getHeaderImageBuffer(): Buffer | null {
  try {
    const p1 = path.join(process.cwd(), "public", "circulo_header.png");
    if (fs.existsSync(p1)) return fs.readFileSync(p1);
    const p2 = path.join(
      process.cwd(),
      "..",
      "..",
      ".gemini",
      "antigravity",
      "brain",
      "4d9da568-28f9-4b45-b757-6aaa8baea100",
      "scratch",
      "circulo_header.png"
    );
    if (fs.existsSync(p2)) return fs.readFileSync(p2);
  } catch {
    // fallback
  }
  return null;
}

export async function generateRestorativeCircleDocx(
  consent: RestorativeCircleConsentRow
): Promise<Buffer> {
  const headerBuf = getHeaderImageBuffer();

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT_FAMILY,
            size: FONT_SIZE,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906, // A4 width in twips
              height: 16838, // A4 height in twips
            },
            margin: {
              top: 1134, // 20 mm
              bottom: 1134,
              left: 1701, // 30 mm
              right: 1701,
              header: 708,
              footer: 708,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 60 },
                children: headerBuf
                  ? [
                      new ImageRun({
                        data: headerBuf,
                        transformation: {
                          width: 530,
                          height: 42,
                        },
                        type: "png",
                      }),
                    ]
                  : [
                      new TextRun({
                        text: "Departamento de Consejería Estudiantil - DECE",
                        font: "Brush Script MT",
                        size: 36,
                        italics: true,
                      }),
                    ],
              }),
            ],
          }),
        },
        children: [
          new Table({
            width: {
              size: 9782,
              type: WidthType.DXA,
            },
            alignment: AlignmentType.CENTER,
            borders: BORDERS_ALL_BLACK,
            rows: [
              // Row 1: Titulo principal
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 2,
                    shading: {
                      type: ShadingType.CLEAR,
                      fill: "D9E2F3",
                    },
                    margins: { top: 80, bottom: 80, left: 120, right: 120 },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: "CONSENTIMIENTO INFORMADO PARA LA ATENCIÓN PSICOSOCIAL",
                            bold: true,
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),

              // Row 2: Subtitulo
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 2,
                    margins: { top: 80, bottom: 80, left: 120, right: 120 },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: "DATOS INFORMATIVOS GENERALES",
                            bold: true,
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),

              // Row 3: Nombre del estudiante
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 2,
                    margins: { top: 80, bottom: 80, left: 120, right: 120 },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "Nombre del/la estudiante: ",
                            bold: true,
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                          new TextRun({
                            text: consent.student_name || "________________________________________________________",
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),

              // Row 4: Curso y paralelo / Jornada
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 2,
                    margins: { top: 80, bottom: 80, left: 120, right: 120 },
                    children: [
                      new Paragraph({
                        tabStops: [
                          {
                            type: TabStopType.LEFT,
                            position: 4600,
                          },
                        ],
                        children: [
                          new TextRun({
                            text: "Curso y paralelo: ",
                            bold: true,
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                          new TextRun({
                            text: consent.course_parallel || "____________________",
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                          new TextRun({
                            text: "\t",
                          }),
                          new TextRun({
                            text: "Jornada: ",
                            bold: true,
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                          new TextRun({
                            text: consent.shift || "Matutina",
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),

              // Row 5: Telefono / Fecha
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 2,
                    margins: { top: 80, bottom: 80, left: 120, right: 120 },
                    children: [
                      new Paragraph({
                        tabStops: [
                          {
                            type: TabStopType.LEFT,
                            position: 4600,
                          },
                        ],
                        children: [
                          new TextRun({
                            text: "Teléfono de representante: ",
                            bold: true,
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                          new TextRun({
                            text: consent.representative_phone || "____________________",
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                          new TextRun({
                            text: "\t",
                          }),
                          new TextRun({
                            text: "Fecha: ",
                            bold: true,
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                          new TextRun({
                            text: consent.consent_date || "____________________",
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),

              // Row 6: Consentimiento informado
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 2,
                    margins: { top: 80, bottom: 80, left: 120, right: 120 },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 80, after: 80 },
                        children: [
                          new TextRun({
                            text: "Consentimiento informado",
                            bold: true,
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),

              // Row 7: Cuerpo del documento
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 2,
                    margins: { top: 100, bottom: 100, left: 120, right: 120 },
                    children: [
                      // 1. Finalidad
                      new Paragraph({
                        spacing: { before: 80, after: 60, line: 240 },
                        children: [
                          new TextRun({
                            text: "1. Finalidad del Círculo Restaurativo",
                            bold: true,
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.JUSTIFIED,
                        spacing: { after: 60, line: 240 },
                        children: [
                          new TextRun({
                            text: "El Departamento de Consejería Estudiantil (DECE), en cumplimiento de sus funciones de prevención, acompañamiento y promoción de la convivencia armónica, desarrollará un ",
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                          new TextRun({
                            text: "Círculo Restaurativo",
                            bold: true,
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                          new TextRun({
                            text: " con los estudiantes del ",
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                          new TextRun({
                            text: consent.course_parallel_full || consent.course_parallel || "1° Año de Bachillerato en Ciencias, paralelo “B”",
                            bold: true,
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                          new TextRun({
                            text: " con el propósito de facilitar el diálogo, promover la reflexión sobre situaciones que afectan la convivencia, reparar daños emocionales o relacionales, y fortalecer la responsabilidad y cohesión grupal.",
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                        ],
                      }),

                      // 2. Naturaleza
                      new Paragraph({
                        spacing: { before: 80, after: 60, line: 240 },
                        children: [
                          new TextRun({
                            text: "2. Naturaleza de la Participación",
                            bold: true,
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { after: 40, line: 240 },
                        indent: { left: 360 },
                        children: [
                          new TextRun({
                            text: "•  Voluntaria:",
                            bold: true,
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                          new TextRun({
                            text: " La participación es libre y no afecta el proceso académico del estudiante.",
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { after: 40, line: 240 },
                        indent: { left: 360 },
                        children: [
                          new TextRun({
                            text: "•  Confidencial:",
                            bold: true,
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                          new TextRun({
                            text: " El contenido dialogado será manejado con reserva profesional, salvo casos de riesgo o vulneración de derechos.",
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { after: 60, line: 240 },
                        indent: { left: 360 },
                        children: [
                          new TextRun({
                            text: "•  Colaborativa:",
                            bold: true,
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                          new TextRun({
                            text: " Requiere escucha activa, respeto y disposición al diálogo.",
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                        ],
                      }),

                      // 3. Procedimiento
                      new Paragraph({
                        spacing: { before: 80, after: 60, line: 240 },
                        children: [
                          new TextRun({
                            text: "3. Procedimiento del Círculo Restaurativo",
                            bold: true,
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { after: 40, line: 240 },
                        children: [
                          new TextRun({
                            text: "El encuentro se desarrollará en:",
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { after: 30, line: 240 },
                        indent: { left: 360 },
                        children: [
                          new TextRun({
                            text: "1.  Establecimiento de acuerdos de convivencia.",
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { after: 30, line: 240 },
                        indent: { left: 360 },
                        children: [
                          new TextRun({
                            text: "2.  Diálogo guiado sobre la situación a tratar.",
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { after: 30, line: 240 },
                        indent: { left: 360 },
                        children: [
                          new TextRun({
                            text: "3.  Identificación de necesidades y perspectivas.",
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { after: 30, line: 240 },
                        indent: { left: 360 },
                        children: [
                          new TextRun({
                            text: "4.  Construcción de compromisos restaurativos.",
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { after: 60, line: 240 },
                        indent: { left: 360 },
                        children: [
                          new TextRun({
                            text: "5.  Cierre y evaluación del encuentro.",
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                        ],
                      }),

                      // 4. Consentimiento del Estudiante
                      new Paragraph({
                        spacing: { before: 80, after: 60, line: 240 },
                        children: [
                          new TextRun({
                            text: "4. Consentimiento del Estudiante",
                            bold: true,
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.JUSTIFIED,
                        spacing: { after: 60, line: 240 },
                        children: [
                          new TextRun({
                            text: `Yo, ${consent.student_name ? consent.student_name : "_________________________________________"} estudiante de ${consent.course_parallel_short || consent.course_parallel || "1° BGU “B”"}, declaro haber recibido información clara sobre los objetivos, metodología y condiciones del Círculo Restaurativo. Comprendo que mi participación es voluntaria y autorizo mi inclusión en dicho espacio.`,
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                        ],
                      }),
                      new Paragraph({
                        spacing: { after: 60, line: 240 },
                        children: [
                          new TextRun({
                            text: "Firma del estudiante: ",
                            bold: true,
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                          new TextRun({
                            text: "_____________________________________",
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                        ],
                      }),

                      // 5. Consentimiento del Representante Legal
                      new Paragraph({
                        spacing: { before: 80, after: 60, line: 240 },
                        children: [
                          new TextRun({
                            text: "5. Consentimiento del Representante Legal",
                            bold: true,
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.JUSTIFIED,
                        spacing: { after: 60, line: 240 },
                        children: [
                          new TextRun({
                            text: `Yo, ${consent.representative_name || "____________________________________________________________"}, con C.I.: ${consent.representative_ci || "_______________________________"}, en calidad de representante de el/la estudiante ${consent.student_name || "______________________________________________________________________"}, una vez que he conocido en qué consiste el proceso de atención psicosocial y la metodología de intervención restaurativa que ejecuta el personal del Departamento de Consejería Estudiantil de la institución educativa, `,
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                          new TextRun({
                            text: "AUTORIZO la participación de mi representado/a en el Círculo Restaurativo",
                            bold: true,
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                          new TextRun({
                            text: " descrito en este documento.",
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.JUSTIFIED,
                        spacing: { after: 60, line: 240 },
                                                children: [
                          new TextRun({
                            text: "Asimismo, manifiesto que se me ha informado sobre los objetivos, beneficios, posibles incomodidades y la confidencialidad del proceso, comprendiendo que se trata de una estrategia formativa orientada a mejorar la convivencia escolar y el manejo constructivo de conflictos.",
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),

              // Row 8: Titulo Firmas
              new TableRow({
                cantSplit: true,
                children: [
                  new TableCell({
                    columnSpan: 2,
                    margins: { top: 80, bottom: 80, left: 120, right: 120 },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        keepNext: true,
                        children: [
                          new TextRun({
                            text: "Firmas",
                            bold: true,
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),

              // Row 9: Espacio de firmas
              new TableRow({
                cantSplit: true,
                children: [
                  new TableCell({
                    width: { size: 4998, type: WidthType.DXA },
                    margins: { top: 120, bottom: 120, left: 120, right: 120 },
                    children: [
                      new Paragraph({ children: [new TextRun({ text: "" })] }),
                      new Paragraph({ children: [new TextRun({ text: "" })] }),
                      new Paragraph({ children: [new TextRun({ text: "" })] }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: "Profesional DECE",
                            bold: true,
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 4784, type: WidthType.DXA },
                    margins: { top: 120, bottom: 120, left: 120, right: 120 },
                    children: [
                      new Paragraph({ children: [new TextRun({ text: "" })] }),
                      new Paragraph({ children: [new TextRun({ text: "" })] }),
                      new Paragraph({ children: [new TextRun({ text: "" })] }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: "Padre/madre/representante legal",
                            bold: true,
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),

              // Row 10: Nombres de los firmantes
              new TableRow({
                cantSplit: true,
                children: [
                  new TableCell({
                    width: { size: 4998, type: WidthType.DXA },
                    margins: { top: 80, bottom: 80, left: 120, right: 120 },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "Nombre: ",
                            bold: true,
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                          new TextRun({
                            text: consent.dece_name,
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 4784, type: WidthType.DXA },
                    margins: { top: 80, bottom: 80, left: 120, right: 120 },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "Nombre: ",
                            bold: true,
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                          new TextRun({
                            text: consent.representative_name || "",
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),

              // Row 11: Nota de confidencialidad
              new TableRow({
                cantSplit: true,
                children: [
                  new TableCell({
                    columnSpan: 2,
                    margins: { top: 80, bottom: 80, left: 120, right: 120 },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "*La información registrada en este documento es confidencial y de uso exclusivo del        Departamento de Consejería Estudiantil",
                            bold: true,
                            font: FONT_FAMILY,
                            size: FONT_SIZE,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
