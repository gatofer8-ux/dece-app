import { INTERVENTION_TYPE_OPTIONS, parseCarePlanActions } from "./carePlan";
import { DESTINATION_OPTIONS } from "./referral";
import { NORMATIVE_TEXT, CONFIDENTIALITY_TEXT as SOCIALIZATION_CONFIDENTIALITY_TEXT, formatCurricularAdaptationText } from "./socializationAct";
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
  PageNumber,
  NumberFormat,
  HorizontalPositionRelativeFrom,
  HorizontalPositionAlign,
  VerticalPositionRelativeFrom,
  VerticalPositionAlign,
  PageOrientation,
  TableLayoutType,
} from "docx";
import path from "path";
import fs from "fs";
import { smartAlign } from "./wordJustify";
import type {
  CaseFileRow,
  StudentRow,
  InstitutionRow,
  UserRow,
  CaseActionRow,
  InterventionPlanRow,
  ReferralRow,
  ViolenceReportRow,
  CaseObservationSheetRow,
  CaseInterviewRow,
  SituationalReportRow,
  SchoolYearRow,
  BimonthlyReportRow,
  CaseCorresponsibilityActRow,
} from "./types";
import { LEGAL_BASIS_TEXT, parseStringList } from "./situationalReport";
import { parseProcessesData } from "./bimonthlyReport";
import { formatDate } from "@/components/ui";
import { parseOfficialObservationData } from "./observationSheet";
import { parseJsonArray } from "./violenceReport";
import { formatStudentCourseFull } from "./studentCourse";
import { buildCorresponsibilityAppearanceText, STANDARD_CLOSING_CLAUSE_1, STANDARD_CLOSING_CLAUSE_2 } from "./corresponsibilityCatalog";

const NAVY = "1E3A8A";
const BORDER_GRAY = "D1D5DB";

function getImageBuffer(fileName: string): Buffer | null {
  try {
    const p = path.join(process.cwd(), "public", "situational_media", fileName);
    if (fs.existsSync(p)) return fs.readFileSync(p);
    const alt = path.join(process.cwd(), "public", fileName);
    if (fs.existsSync(alt)) return fs.readFileSync(alt);
  } catch (e) {
    // fallback
  }
  return null;
}

function textToParagraphs(text: string, size = 20): Paragraph[] {
  if (!text) return [new Paragraph({ text: "" })];
  return text.split("\n").map(
    (line) =>
      new Paragraph({
        alignment: smartAlign(line),
        children: [new TextRun({ text: line, size })],
        spacing: { after: 120 },
      })
  );
}

/**
 * Encabezado oficial: solo la imagen header_4k.png (ya contiene escudo + texto)
 */
function createOfficialHeader(_titleText = "INFORME T\u00C9CNICO SITUACIONAL", _subText = "Informe General") {
  const headerImg = getImageBuffer("header_4k.png");

  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        indent: { left: -1400, right: -1400 },
        children: headerImg
          ? [
              new ImageRun({
                data: headerImg,
                transformation: { width: 596, height: 60 },
                type: "png",
              }),
            ]
          : [],
        spacing: { before: 0, after: 0 },
      }),
    ],
  });
}

/**
 * Pie de página oficial
 */
function createOfficialFooter() {
  const footerImg = getImageBuffer("footer_nuevo_ecuador.png");

  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        indent: { left: -1400, right: -1400 },
        children: footerImg
          ? [
              new ImageRun({
                data: footerImg,
                transformation: { width: 596, height: 111 },
                type: "png",
              }),
            ]
          : [],
        spacing: { before: 0, after: 0 },
      }),
    ],
  });
}

/**
 * Genera el documento de Word para el INFORME TÉCNICO SITUACIONAL.
 */
export async function generateSituationalReportDocx(data: {
  report: SituationalReportRow;
  caseFile: CaseFileRow;
  student: StudentRow;
  institution?: InstitutionRow | null;
activeYear?: SchoolYearRow | null;
}): Promise<Buffer> {
  const { report, caseFile, student, institution, activeYear } = data;
  const methodologyList = parseStringList(report.methodology || "[]");

  const doc = new Document({
    creator: "DECE App",
    title: `Informe Situacional - ${student.full_name}`,
    description: "Informe T\u00C9cnico Situacional Generado Autom\u00E1ticamente",
    styles: {
      default: {
        document: {
          run: { font: "Times New Roman", size: 20, color: "000000" },
          paragraph: { spacing: { line: 260, before: 0, after: 80 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 0, bottom: 0, left: 1400, right: 1400, header: 0, footer: 0 },
          },
        },
        headers: {
          default: createOfficialHeader("INFORME T\u00C9CNICO SITUACIONAL", "Informe General"),
        },
        footers: {
          default: createOfficialFooter(),
        },
        children: [
          // T\u00CDTULO DEL DOCUMENTO
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "INFORME T\u00C9CNICO SITUACIONAL", bold: true, size: 22, color: NAVY })],
            spacing: { after: 60 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "Informe General", size: 18, color: "6B7280" })],
            spacing: { after: 180 },
          }),
          // DATOS GENERALES
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
            },
            rows: [
              // Fila t\u00EDtulo: DATOS GENERALES
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 5,
                    shading: { fill: "D1D5DB" },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "DATOS GENERALES", bold: true, size: 16, color: "1B2D73" })] })],
                  }),
                ],
              }),
              // Fila: Fecha de Informe | valor | No. De Informe | valor (colspan 2)
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 12, type: WidthType.PERCENTAGE },
                    shading: { fill: "F3F4F6" },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Fecha de Informe", bold: true, size: 14, color: "1B2D73" })] })],
                  }),
                  new TableCell({
                    width: { size: 20, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: formatDate(report.report_date), size: 16 })] })],
                  }),
                  new TableCell({
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    shading: { fill: "F3F4F6" },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "No. De Informe", bold: true, size: 14, color: "1B2D73" })] })],
                  }),
                  new TableCell({
                    columnSpan: 2,
                    width: { size: 53, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Mineduc-CZ3-18D02-UESR-DECE-2025/2026-${report.id.substring(0, 4).toUpperCase()}`, bold: true, size: 14 })] })],
                  }),
                ],
              }),
              // Fila: Funcionario Responsable (encabezados)
              new TableRow({
                children: [
                  new TableCell({
                    rowSpan: 2,
                    shading: { fill: "F3F4F6" },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Funcionario Responsable de Informe", bold: true, size: 14, color: "1B2D73" })] })],
                  }),
                  new TableCell({
                    shading: { fill: "F3F4F6" },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Nombres y Apellidos", bold: true, size: 14, color: "1B2D73" })] })],
                  }),
                  new TableCell({
                    shading: { fill: "F3F4F6" },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "C\u00E9dula/ID", bold: true, size: 14, color: "1B2D73" })] })],
                  }),
                  new TableCell({
                    shading: { fill: "F3F4F6" },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Correo", bold: true, size: 14, color: "1B2D73" })] })],
                  }),
                  new TableCell({
                    shading: { fill: "F3F4F6" },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Cargo", bold: true, size: 14, color: "1B2D73" })] })],
                  }),
                ],
              }),
              // Fila: Funcionario Responsable (datos)
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: report.responsible_name || "Lic. Psic\u00F3logo/a DECE", size: 14 })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "0999999999", size: 14 })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "correo@educacion.gob.ec", size: 12, color: "2563EB" })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: report.responsible_role || "ANALISTA DECE", size: 14 })] })],
                  }),
                ],
              }),
              // Fila: Dirigido A (encabezados)
              new TableRow({
                children: [
                  new TableCell({
                    rowSpan: 2,
                    shading: { fill: "F3F4F6" },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Dirigido A:", bold: true, size: 14, color: "1B2D73" })] })],
                  }),
                  new TableCell({
                    shading: { fill: "F3F4F6" },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Nombres y Apellidos", bold: true, size: 14, color: "1B2D73" })] })],
                  }),
                  new TableCell({
                    shading: { fill: "F3F4F6" },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "C\u00E9dula/ID", bold: true, size: 14, color: "1B2D73" })] })],
                  }),
                  new TableCell({
                    shading: { fill: "F3F4F6" },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Correo", bold: true, size: 14, color: "1B2D73" })] })],
                  }),
                  new TableCell({
                    shading: { fill: "F3F4F6" },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Cargo", bold: true, size: 14, color: "1B2D73" })] })],
                  }),
                ],
              }),
              // Fila: Dirigido A (datos)
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: report.addressed_to_name || "Msc. M\u00E1xima Autoridad", size: 14 })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "0999999999", size: 14 })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "autoridad@educacion.gob.ec", size: 12, color: "2563EB" })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: report.addressed_to_role || "RECTOR/A U.E.", size: 14 })] })],
                  }),
                ],
              }),
              // Fila: TEMA
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: "F3F4F6" },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "TEMA:", bold: true, size: 14, color: "1B2D73" })] })],
                  }),
                  new TableCell({
                    columnSpan: 4,
                    children: [new Paragraph({ children: [new TextRun({ text: report.tema || report.situation_type || `INFORME T\u00C9CNICO SITUACIONAL SOBRE PRESUNTO INTENTO AUTOL\u00CDTICO E IDEACI\u00D3N SUICIDA - ${student.full_name}`, bold: true, size: 14 })] })],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { after: 180 } }),

          // 1. ANTECEDENTES
          new Paragraph({
            children: [new TextRun({ text: "1. ANTECEDENTES", bold: true, size: 22, color: "1E3A8A" })],
            spacing: { before: 180, after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "1.1 ÁMBITO LEGAL", bold: true, size: 20, color: "1E3A8A" })],
            spacing: { before: 80, after: 60 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "BASE LEGAL:", bold: true, size: 20 })],
            spacing: { after: 40 },
          }),
          ...textToParagraphs(report.legal_basis || LEGAL_BASIS_TEXT, 20),
          ...(report.scope_text ? [
            new Paragraph({
              children: [new TextRun({ text: "1.2 ÁMBITO ADMINISTRATIVO:", bold: true, size: 20, color: "1E3A8A" })],
              spacing: { before: 80, after: 40 },
            }),
            new Paragraph({
              alignment: smartAlign(String((report.scope_text) ?? "")),
              children: [new TextRun({ text: report.scope_text, size: 20 })],
              spacing: { after: 80 },
            }),
          ] : []),

          // 2. ALCANCE
          new Paragraph({
            children: [new TextRun({ text: "2. ALCANCE", bold: true, size: 22, color: "1E3A8A" })],
            spacing: { before: 180, after: 100 },
          }),
          new Paragraph({
            alignment: smartAlign(String((report.scope_text || `Del Departamento de Consejería Estudiantil hacia la autoridad institucional de la ${institution?.name || "Unidad Educativa"}.`) ?? "")),
            children: [
              new TextRun({
                text: report.scope_text || `Del Departamento de Consejería Estudiantil hacia la autoridad institucional de la ${institution?.name || "Unidad Educativa"}.`,
                size: 20,
              }),
            ],
            spacing: { after: 140 },
          }),

          // 3. OBJETIVOS
          new Paragraph({
            children: [new TextRun({ text: "3. OBJETIVOS", bold: true, size: 22, color: "1E3A8A" })],
            spacing: { before: 180, after: 100 },
          }),
          new Paragraph({
            alignment: smartAlign(String((report.objective_text || `Informar sobre la situación psicosocial y medidas de acompañamiento en favor de el/la estudiante ${student.full_name}, garantizando el interés superior del niño y restitución integral de derechos.`) ?? "")),
            children: [
              new TextRun({
                text: report.objective_text || `Informar sobre la situación psicosocial y medidas de acompañamiento en favor de el/la estudiante ${student.full_name}, garantizando el interés superior del niño y restitución integral de derechos.`,
                size: 20,
              }),
            ],
            spacing: { after: 180 },
          }),

          // 4. DESARROLLO O ANÁLISIS
          new Paragraph({
            children: [new TextRun({ text: "4. DESARROLLO O ANÁLISIS", bold: true, size: 22, color: "1E3A8A" })],
            spacing: { before: 180, after: 100 },
          }),

          // 4.1 DATOS INFORMATIVOS (PRESUNTA VÍCTIMA / DATOS DEL ESTUDIANTE)
          new Paragraph({
            children: [new TextRun({ text: "4.1 DATOS INFORMATIVOS:", bold: true, size: 20, color: "1E3A8A" })],
            spacing: { before: 80, after: 60 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "DATOS DE EL/LA ESTUDIANTE (PRESUNTA VÍCTIMA):", bold: true, size: 20 })],
            spacing: { after: 40 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Nombre de la/el Estudiante: ", bold: true, size: 20 }),
              new TextRun({ text: student.full_name, size: 20 }),
            ],
            spacing: { after: 30 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "C.I. / Cédula: ", bold: true, size: 20 }),
              new TextRun({ text: student.document_id || "No registra", size: 20 }),
            ],
            spacing: { after: 30 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Fecha de nacimiento: ", bold: true, size: 20 }),
              new TextRun({ text: student.birth_date ? formatDate(student.birth_date) : "No registra", size: 20 }),
              new TextRun({ text: "     Edad: ", bold: true, size: 20 }),
              new TextRun({ text: computeAgeViolence(student.birth_date) || "No registra", size: 20 }),
            ],
            spacing: { after: 30 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Grado o Curso: ", bold: true, size: 20 }),
              new TextRun({ text: formatStudentCourseFull(student), size: 20 }),
              new TextRun({ text: "     Jornada: ", bold: true, size: 20 }),
              new TextRun({ text: student.jornada || "Matutina", size: 20 }),
            ],
            spacing: { after: 30 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Teléfono de contacto: ", bold: true, size: 20 }),
              new TextRun({ text: student.rep_phone || "No registra", size: 20 }),
            ],
            spacing: { after: 30 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Dirección domiciliaria: ", bold: true, size: 20 }),
              new TextRun({ text: student.address || "No registra", size: 20 }),
            ],
            spacing: { after: 40 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "DATOS DEL REPRESENTANTE LEGAL:", bold: true, size: 20 })],
            spacing: { before: 40, after: 30 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Nombres y apellidos: ", bold: true, size: 20 }),
              new TextRun({ text: student.representative || "No registra", size: 20 }),
            ],
            spacing: { after: 30 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Cédula de identidad: ", bold: true, size: 20 }),
              new TextRun({ text: student.representative_document_id || "No registra", size: 20 }),
              new TextRun({ text: "     Parentesco: ", bold: true, size: 20 }),
              new TextRun({ text: student.lives_with || "Representante", size: 20 }),
            ],
            spacing: { after: 30 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Teléfono representante: ", bold: true, size: 20 }),
              new TextRun({ text: student.rep_phone || "No registra", size: 20 }),
            ],
            spacing: { after: 80 },
          }),

          // 4.2 EJES DE ACCIÓN
          new Paragraph({
            children: [new TextRun({ text: "4.2 EJES DE ACCIÓN Y ATENCIÓN PSICOSOCIAL:", bold: true, size: 20, color: "1E3A8A" })],
            spacing: { before: 80, after: 60 },
          }),

          ...(report.eje_deteccion
            ? [
                new Paragraph({
                  children: [new TextRun({ text: "4.2.1 Eje de Detección:", bold: true, size: 20 })],
                  spacing: { before: 60, after: 40 },
                }),
                new Paragraph({
                  alignment: smartAlign(String((report.eje_deteccion) ?? "")),
                  children: [new TextRun({ text: report.eje_deteccion, size: 20 })],
                  spacing: { after: 80 },
                }),
              ]
            : []),

          ...(report.eje_diagnostico_individual
            ? [
                new Paragraph({
                  children: [new TextRun({ text: "4.2.2 Valoración Psicosocial Individual:", bold: true, size: 20 })],
                  spacing: { before: 60, after: 40 },
                }),
                new Paragraph({
                  alignment: AlignmentType.JUSTIFIED,
                  children: [new TextRun({ text: report.eje_diagnostico_individual, size: 20 })],
                  spacing: { after: 80 },
                }),
              ]
            : []),

          ...(report.eje_diagnostico_familiar
            ? [
                new Paragraph({
                  children: [new TextRun({ text: "4.2.3 Abordaje Familiar:", bold: true, size: 20 })],
                  spacing: { before: 60, after: 40 },
                }),
                new Paragraph({
                  alignment: AlignmentType.JUSTIFIED,
                  children: [new TextRun({ text: report.eje_diagnostico_familiar, size: 20 })],
                  spacing: { after: 80 },
                }),
              ]
            : []),

          ...(report.eje_atencion_psicosocial
            ? [
                new Paragraph({
                  children: [new TextRun({ text: "4.2.4 Eje de Intervención Psicosocial:", bold: true, size: 20 })],
                  spacing: { before: 60, after: 40 },
                }),
                new Paragraph({
                  alignment: AlignmentType.JUSTIFIED,
                  children: [new TextRun({ text: report.eje_atencion_psicosocial, size: 20 })],
                  spacing: { after: 80 },
                }),
              ]
            : []),

          ...(report.eje_derivacion
            ? [
                new Paragraph({
                  children: [new TextRun({ text: "4.2.5 Eje de Derivación:", bold: true, size: 20 })],
                  spacing: { before: 60, after: 40 },
                }),
                new Paragraph({
                  alignment: AlignmentType.JUSTIFIED,
                  children: [new TextRun({ text: report.eje_derivacion, size: 20 })],
                  spacing: { after: 80 },
                }),
              ]
            : []),

          ...(report.eje_seguimiento
            ? [
                new Paragraph({
                  children: [new TextRun({ text: "4.2.6 Eje de Seguimiento:", bold: true, size: 20 })],
                  spacing: { before: 60, after: 40 },
                }),
                new Paragraph({
                  alignment: AlignmentType.JUSTIFIED,
                  children: [new TextRun({ text: report.eje_seguimiento, size: 20 })],
                  spacing: { after: 80 },
                }),
              ]
            : []),

          // 5. METODOLOGÍA
          new Paragraph({
            children: [new TextRun({ text: "5. METODOLOGÍA", bold: true, size: 22, color: "1E3A8A" })],
            spacing: { before: 180, after: 100 },
          }),
          ...(methodologyList.length > 0
            ? methodologyList.map(
                (m) =>
                  new Paragraph({
                    bullet: { level: 0 },
                    children: [new TextRun({ text: m, size: 20 })],
                    spacing: { after: 40 },
                  })
              )
            : [
                new Paragraph({
                  bullet: { level: 0 },
                  children: [new TextRun({ text: "Entrevistas individuales y acompañamiento psicosocial continuo", size: 20 })],
                }),
              ]),

          new Paragraph({ spacing: { after: 140 } }),

          // 6. CONCLUSIONES
          new Paragraph({
            children: [new TextRun({ text: "6. CONCLUSIONES", bold: true, size: 22, color: "1E3A8A" })],
            spacing: { before: 180, after: 100 },
          }),
          ...textToParagraphs(report.conclusions || "Se cumplieron las acciones psicosociales correspondientes.", 20),

          // 7. RECOMENDACIONES
          new Paragraph({
            children: [new TextRun({ text: "7. RECOMENDACIONES", bold: true, size: 22, color: "1E3A8A" })],
            spacing: { before: 180, after: 100 },
          }),
          ...textToParagraphs(report.recommendations || "Continuar con el acompañamiento en aula y coordinación interinstitucional.", 20),
          
          // 6. FIRMAS DE RESPONSABILIDAD
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
            },
            rows: [
              // DESARROLLO DEL DOCUMENTO
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 3,
                    shading: { fill: "D1D5DB" },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "DESARROLLO DEL DOCUMENTO", bold: true, size: 16, color: "1B2D73" })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, shading: { fill: "F3F4F6" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Nombre", bold: true, size: 14, color: "1B2D73" })] })] }),
                  new TableCell({ width: { size: 45, type: WidthType.PERCENTAGE }, shading: { fill: "F3F4F6" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Firma", bold: true, size: 14, color: "1B2D73" })] })] }),
                  new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, shading: { fill: "F3F4F6" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Fecha", bold: true, size: 14, color: "1B2D73" })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    verticalAlign: VerticalAlign.CENTER,
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: report.preparer_name || report.responsible_name || "Lic. Elaborador", bold: true, size: 14 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: report.preparer_role || "ANALISTA DECE", bold: true, size: 14 })] }),
                    ],
                  }),
                  new TableCell({ children: [new Paragraph({ text: "", spacing: { after: 600 } })] }), // Espacio para firma
                  new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: formatDate(report.report_date), size: 14 })] })] }),
                ],
              }),
              // REVISI\u00D3N DEL DOCUMENTO
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 3,
                    shading: { fill: "D1D5DB" },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "REVISI\u00D3N DEL DOCUMENTO", bold: true, size: 16, color: "1B2D73" })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ shading: { fill: "F3F4F6" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Nombre", bold: true, size: 14, color: "1B2D73" })] })] }),
                  new TableCell({ shading: { fill: "F3F4F6" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Firma", bold: true, size: 14, color: "1B2D73" })] })] }),
                  new TableCell({ shading: { fill: "F3F4F6" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Fecha", bold: true, size: 14, color: "1B2D73" })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    verticalAlign: VerticalAlign.CENTER,
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: (report as any).reviewer_name || "Msc. Coordinador/a", bold: true, size: 14 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: (report as any).reviewer_role || "COORDINADORA DECE", bold: true, size: 14 })] }),
                    ],
                  }),
                  new TableCell({ children: [new Paragraph({ text: "", spacing: { after: 600 } })] }), // Espacio para firma
                  new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: formatDate(report.report_date), size: 14 })] })] }),
                ],
              }),
              // APROBACI\u00D3N DEL DOCUMENTO
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 3,
                    shading: { fill: "D1D5DB" },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "APROBACI\u00D3N DEL DOCUMENTO", bold: true, size: 16, color: "1B2D73" })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ shading: { fill: "F3F4F6" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Nombre", bold: true, size: 14, color: "1B2D73" })] })] }),
                  new TableCell({ shading: { fill: "F3F4F6" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Firma", bold: true, size: 14, color: "1B2D73" })] })] }),
                  new TableCell({ shading: { fill: "F3F4F6" }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Fecha", bold: true, size: 14, color: "1B2D73" })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    verticalAlign: VerticalAlign.CENTER,
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: report.approver_name || report.addressed_to_name || "Mg. Diana Manzano", bold: true, size: 14 })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: report.approver_role || "RECTORA", bold: true, size: 14 })] }),
                    ],
                  }),
                  new TableCell({ children: [new Paragraph({ text: "", spacing: { after: 600 } })] }), // Espacio para firma
                  new TableCell({ verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: formatDate(report.report_date), size: 14 })] })] }),
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

/**
 * 2. EXPEDIENTE COMPLETO DE CASO (DOCX)
 */
export async function generateCaseDocx(opts: {
  caseFile: CaseFileRow;
  student: StudentRow;
  institution?: InstitutionRow | null;
  actions: CaseActionRow[];
  plans: InterventionPlanRow[];
  referrals: ReferralRow[];
}): Promise<Buffer> {
  const { caseFile, student, institution, actions, plans, referrals } = opts;

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22 },
        },
      },
    },
    sections: [
      {
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 0, bottom: 0, left: 1400, right: 1400, header: 0, footer: 0 } } }, headers: { default: createOfficialHeader("EXPEDIENTE PSICOSOCIAL DE CASO", caseFile.code) },
        footers: { default: createOfficialFooter() },
        children: [
          new Paragraph({
            children: [new TextRun({ text: `EXPEDIENTE DE ATENCI\u00D3N: ${caseFile.code}`, bold: true, size: 26, color: NAVY })],
            spacing: { after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Estudiante: ", bold: true }),
              new TextRun({ text: student.full_name }),
              new TextRun({ text: " | Curso: ", bold: true }),
              new TextRun({ text: `${student.course} ${student.parallel || ""}` }),
            ],
            spacing: { after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Motivo / Tipo de Riesgo: ", bold: true }),
              new TextRun({ text: caseFile.risk_type }),
              new TextRun({ text: " | Estado: ", bold: true }),
              new TextRun({ text: caseFile.status }),
            ],
            spacing: { after: 180 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "Descripci\u00F3n de la Situaci\u00F3n:", bold: true })],
          }),
          new Paragraph({
            children: [new TextRun({ text: caseFile.description })],
            spacing: { after: 180 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "Bit\u00E1cora de Acciones e Intervenciones:", bold: true, color: NAVY })],
            spacing: { after: 80 },
          }),
          ...actions.map(
            (a) =>
              new Paragraph({
                bullet: { level: 0 },
                children: [
                  new TextRun({ text: `[${formatDate(a.date)}] `, bold: true }),
                  new TextRun({ text: `(${a.type}) `, bold: true }),
                  new TextRun({ text: a.description }),
                ],
                spacing: { after: 60 },
              })
          ),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

function parseDatePartsViolence(dateStr?: string | null) {
  if (!dateStr) return { day: "", month: "", year: "" };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { day: "", month: "", year: "" };
  return {
    day: String(d.getUTCDate()).padStart(2, "0"),
    month: String(d.getUTCMonth() + 1).padStart(2, "0"),
    year: String(d.getUTCFullYear()),
  };
}

function computeAgeViolence(birthDate?: string | null) {
  if (!birthDate) return "";
  const diff = Date.now() - new Date(birthDate).getTime();
  const ageDate = new Date(diff);
  const years = Math.abs(ageDate.getUTCFullYear() - 1970);
  return isNaN(years) ? "" : `${years} años`;
}

/**
 * 3. REPORTE DE HECHO DE VIOLENCIA (DOCX) - Anexo 1 MINEDUC (Calca Fiel Oficial)
 */
export async function generateViolenceReportDocx(opts: {
  report: ViolenceReportRow;
  student: StudentRow;
  institution?: InstitutionRow | null;
}): Promise<Buffer> {
  const { report, student, institution } = opts;

  const violenceTypes = parseJsonArray<string>(report.violence_types);
  const violenceModalities = parseJsonArray<string>(report.violence_modalities);

  const studentBirth = parseDatePartsViolence(student.birth_date);
  const incidentDate = parseDatePartsViolence(report.incident_date);

  const isFisica = violenceTypes.includes("FISICA");
  const isPsicologica = violenceTypes.includes("PSICOLOGICA");
  const isSexual = violenceTypes.includes("SEXUAL");
  const isNegligencia = violenceTypes.includes("NEGLIGENCIA") || violenceTypes.includes("OMISION");

  const isIntrafamiliar = violenceModalities.includes("INTRAFAMILIAR");
  const isInstitucional = violenceModalities.includes("INSTITUCIONAL");
  const isAcoso = violenceModalities.includes("ACOSO_ESCOLAR");
  const isAdulto = violenceModalities.includes("ESTUDIANTE_ADULTO");
  const isOtras = !!report.violence_modality_other || violenceModalities.includes("OTRA");

  const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: "808080" };
  const tableBorders = {
    top: cellBorder,
    bottom: cellBorder,
    left: cellBorder,
    right: cellBorder,
    insideHorizontal: cellBorder,
    insideVertical: cellBorder,
  };
  const transparentBorder = { style: BorderStyle.NONE, size: 0, color: "auto" };
  const transparentBorders = {
    top: transparentBorder,
    bottom: transparentBorder,
    left: transparentBorder,
    right: transparentBorder,
    insideHorizontal: transparentBorder,
    insideVertical: transparentBorder,
  };
  const cellMargins = { top: 50, bottom: 50, left: 90, right: 90 };
  const FONT_NAME = "Arial";
  const FONT_SIZE = 17; // ~8.5pt
  const HEADER_FONT_SIZE = 18; // 9pt

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 900, bottom: 900, left: 1200, right: 1200 },
          },
        },
        children: [
          // Título Centrado Oficial
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: (institution?.name || "UNIDAD EDUCATIVA “SANTA ROSA”").toUpperCase(),
                bold: true,
                size: 24,
                font: FONT_NAME,
                color: "000000",
              }),
            ],
            spacing: { after: 30, before: 40 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "ANEXO 1. FORMATO: INFORME DE REPORTE DEL HECHO DE VIOLENCIA",
                bold: true,
                size: 19,
                font: FONT_NAME,
                color: "000000",
              }),
            ],
            spacing: { after: 120 },
          }),

          // Tabla Inicial: Datos del Informe
          new Table({
            width: { size: 9500, type: WidthType.DXA },
            borders: tableBorders,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 4,
                    width: { size: 9500, type: WidthType.DXA },
                    shading: { fill: "CECDCD" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({
                            text: "INFORME DE REPORTE DEL HECHO DE VIOLENCIA",
                            bold: true,
                            size: HEADER_FONT_SIZE,
                            font: FONT_NAME,
                            color: "000000",
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 4,
                    width: { size: 9500, type: WidthType.DXA },
                    shading: { fill: "F2F2F2" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({ text: "Institución educativa: ", bold: true, size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: institution?.name || "UNIDAD EDUCATIVA “SANTA ROSA”", size: FONT_SIZE, font: FONT_NAME }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 2,
                    width: { size: 4750, type: WidthType.DXA },
                    shading: { fill: "F2F2F2" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({ text: "Informe Nº: ", bold: true, size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: report.report_number || "001", size: FONT_SIZE, font: FONT_NAME }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    columnSpan: 2,
                    width: { size: 4750, type: WidthType.DXA },
                    shading: { fill: "F2F2F2" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({ text: "Fecha: ", bold: true, size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: formatDate(report.report_date), size: FONT_SIZE, font: FONT_NAME }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 4,
                    width: { size: 9500, type: WidthType.DXA },
                    shading: { fill: "F2F2F2" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({ text: "Nombre de profesional DECE que maneja el caso: ", bold: true, size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: `${report.analyst_name || report.dece_professional_name || "MGTR. MARLON JACOME"}${report.analyst_role ? ` (${report.analyst_role})` : ""}`, size: FONT_SIZE, font: FONT_NAME }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { after: 60 } }),

          // 1. DATOS GENERALES DE IDENTIFICACIÓN DEL ESTUDIANTE O DE LA ESTUDIANTE
          new Table({
            width: { size: 9500, type: WidthType.DXA },
            borders: tableBorders,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 4,
                    width: { size: 9500, type: WidthType.DXA },
                    shading: { fill: "CECDCD" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({
                            text: "1. DATOS GENERALES DE IDENTIFICACIÓN DEL ESTUDIANTE O DE LA ESTUDIANTE",
                            bold: true,
                            size: HEADER_FONT_SIZE,
                            font: FONT_NAME,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 3,
                    width: { size: 7125, type: WidthType.DXA },
                    shading: { fill: "F2F2F2" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({ text: "Apellidos y nombres: ", bold: true, size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: student.full_name, size: FONT_SIZE, font: FONT_NAME }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    columnSpan: 1,
                    width: { size: 2375, type: WidthType.DXA },
                    shading: { fill: "F2F2F2" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({ text: "C.I.: ", bold: true, size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: student.document_id || "", size: FONT_SIZE, font: FONT_NAME }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 2375, type: WidthType.DXA },
                    shading: { fill: "F2F2F2" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        spacing: { after: 0, before: 0 },
                        children: [new TextRun({ text: "Fecha de nacimiento:", bold: true, size: FONT_SIZE, font: FONT_NAME })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 2375, type: WidthType.DXA },
                    shading: { fill: "F2F2F2" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({ text: "Día: ", bold: true, size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: studentBirth.day, size: FONT_SIZE, font: FONT_NAME }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 2375, type: WidthType.DXA },
                    shading: { fill: "F2F2F2" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({ text: "Mes: ", bold: true, size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: studentBirth.month, size: FONT_SIZE, font: FONT_NAME }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 2375, type: WidthType.DXA },
                    shading: { fill: "F2F2F2" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({ text: "Año: ", bold: true, size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: studentBirth.year, size: FONT_SIZE, font: FONT_NAME }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 4,
                    width: { size: 9500, type: WidthType.DXA },
                    shading: { fill: "F2F2F2" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({ text: "Edad: ", bold: true, size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: computeAgeViolence(student.birth_date), size: FONT_SIZE, font: FONT_NAME }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 4,
                    width: { size: 9500, type: WidthType.DXA },
                    shading: { fill: "F2F2F2" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({ text: "Grado o curso: ", bold: true, size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({
                            text: formatStudentCourseFull(student),
                            size: FONT_SIZE,
                            font: FONT_NAME,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { after: 60 } }),

          // 2. DATOS GENERALES DE LA MADRE, PADRE Y/O REPRESENTANTE LEGAL
          new Table({
            width: { size: 9500, type: WidthType.DXA },
            borders: tableBorders,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 4,
                    width: { size: 9500, type: WidthType.DXA },
                    shading: { fill: "CECDCD" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({
                            text: "2. DATOS GENERALES DE LA MADRE, PADRE Y/O REPRESENTANTE LEGAL",
                            bold: true,
                            size: HEADER_FONT_SIZE,
                            font: FONT_NAME,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 4,
                    width: { size: 9500, type: WidthType.DXA },
                    shading: { fill: "F2F2F2" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({ text: "Nombres y apellidos: ", bold: true, size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: student.representative || "", size: FONT_SIZE, font: FONT_NAME }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 4,
                    width: { size: 9500, type: WidthType.DXA },
                    shading: { fill: "F2F2F2" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({ text: "Vínculo entre la persona y el/la estudiante: ", bold: true, size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: report.representative_relationship || "Representante", size: FONT_SIZE, font: FONT_NAME }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 4,
                    width: { size: 9500, type: WidthType.DXA },
                    shading: { fill: "F2F2F2" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({ text: "Dirección del domicilio: ", bold: true, size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: student.representative_address || student.address || "", size: FONT_SIZE, font: FONT_NAME }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 4,
                    width: { size: 9500, type: WidthType.DXA },
                    shading: { fill: "F2F2F2" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({ text: "Teléfono de contacto: ", bold: true, size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: student.rep_phone || "", size: FONT_SIZE, font: FONT_NAME }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { after: 60 } }),

          // 3. DATOS SOBRE LA PRESUNTA SITUACIÓN DE VIOLENCIA
          new Table({
            width: { size: 9500, type: WidthType.DXA },
            borders: tableBorders,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 4,
                    width: { size: 9500, type: WidthType.DXA },
                    shading: { fill: "CECDCD" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({
                            text: "3. DATOS SOBRE LA PRESUNTA SITUACIÓN DE VIOLENCIA",
                            bold: true,
                            size: HEADER_FONT_SIZE,
                            font: FONT_NAME,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 4,
                    width: { size: 9500, type: WidthType.DXA },
                    shading: { fill: "F2F2F2" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({ text: "Fecha y lugar en el que ocurrió la situación de violencia:", bold: true, size: FONT_SIZE, font: FONT_NAME }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 4,
                    width: { size: 9500, type: WidthType.DXA },
                    shading: { fill: "F2F2F2" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({ text: "Día: ", bold: true, size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: incidentDate.day || "—", size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: "     mes: ", bold: true, size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: incidentDate.month || "—", size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: "     año: ", bold: true, size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: incidentDate.year || "—", size: FONT_SIZE, font: FONT_NAME }),
                          ...(!report.incident_date ? [new TextRun({ text: " (Se desconoce)", italics: true, size: FONT_SIZE, font: FONT_NAME })] : []),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 4,
                    width: { size: 9500, type: WidthType.DXA },
                    shading: { fill: "F2F2F2" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({ text: "Lugar: ", bold: true, size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: report.incident_place || "Domicilio del estudiante", size: FONT_SIZE, font: FONT_NAME }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 4,
                    width: { size: 9500, type: WidthType.DXA },
                    shading: { fill: "F2F2F2" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({ text: "Nombres y apellidos de la presunta persona responsable de la agresión: ", bold: true, size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: report.perpetrator_name || "Desconocido", size: FONT_SIZE, font: FONT_NAME }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 2,
                    width: { size: 4750, type: WidthType.DXA },
                    shading: { fill: "F2F2F2" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({ text: "Fecha de nacimiento: ", bold: true, size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: report.perpetrator_birth_date ? formatDate(report.perpetrator_birth_date) : "", size: FONT_SIZE, font: FONT_NAME }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    columnSpan: 2,
                    width: { size: 4750, type: WidthType.DXA },
                    shading: { fill: "F2F2F2" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({ text: "Edad: ", bold: true, size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: report.perpetrator_age ? `${report.perpetrator_age} años` : "Se desconoce", size: FONT_SIZE, font: FONT_NAME }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 4,
                    width: { size: 9500, type: WidthType.DXA },
                    shading: { fill: "F2F2F2" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({ text: "Tipo de relación de quien realizó la agresión con la víctima: ", bold: true, size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: report.perpetrator_relationship || "", size: FONT_SIZE, font: FONT_NAME }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { after: 60 } }),

          // 4. DATOS DE LA PERSONA QUE REFIERE EL CASO
          new Table({
            width: { size: 9500, type: WidthType.DXA },
            borders: tableBorders,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 4,
                    width: { size: 9500, type: WidthType.DXA },
                    shading: { fill: "CECDCD" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({
                            text: "4. DATOS DE LA PERSONA QUE REFIERE EL CASO",
                            bold: true,
                            size: HEADER_FONT_SIZE,
                            font: FONT_NAME,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 4,
                    width: { size: 9500, type: WidthType.DXA },
                    shading: { fill: "F2F2F2" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({ text: "Nombres y apellidos: ", bold: true, size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: report.informant_name || "", size: FONT_SIZE, font: FONT_NAME }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 4,
                    width: { size: 9500, type: WidthType.DXA },
                    shading: { fill: "F2F2F2" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({ text: "Cédula de identidad: ", bold: true, size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: report.informant_id_number || "", size: FONT_SIZE, font: FONT_NAME }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 4,
                    width: { size: 9500, type: WidthType.DXA },
                    shading: { fill: "F2F2F2" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({ text: "Cargo: ", bold: true, size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: report.informant_role || "", size: FONT_SIZE, font: FONT_NAME }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { after: 60 } }),

          // 5. TIPO DE VIOLENCIA IDENTIFICADA
          new Table({
            width: { size: 9500, type: WidthType.DXA },
            borders: tableBorders,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 4,
                    width: { size: 9500, type: WidthType.DXA },
                    shading: { fill: "CECDCD" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({
                            text: "5. TIPO DE VIOLENCIA IDENTIFICADA",
                            bold: true,
                            size: HEADER_FONT_SIZE,
                            font: FONT_NAME,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 2375, type: WidthType.DXA },
                    shading: { fill: "F2F2F2" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({ text: "Física ( ", size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: isFisica ? "X" : "  ", bold: isFisica, underline: isFisica ? {} : undefined, size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: " )", size: FONT_SIZE, font: FONT_NAME }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 2375, type: WidthType.DXA },
                    shading: { fill: "F2F2F2" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({ text: "Psicológica ( ", size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: isPsicologica ? "X" : "  ", bold: isPsicologica, underline: isPsicologica ? {} : undefined, size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: " )", size: FONT_SIZE, font: FONT_NAME }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 2375, type: WidthType.DXA },
                    shading: { fill: "F2F2F2" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({ text: "Sexual ( ", size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: isSexual ? "X" : "  ", bold: isSexual, underline: isSexual ? {} : undefined, size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: " )", size: FONT_SIZE, font: FONT_NAME }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 2375, type: WidthType.DXA },
                    shading: { fill: "F2F2F2" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({ text: "Negligencia ( ", size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: isNegligencia ? "X" : "  ", bold: isNegligencia, underline: isNegligencia ? {} : undefined, size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: " )", size: FONT_SIZE, font: FONT_NAME }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { after: 60 } }),

          // 6. MODALIDAD DE VIOLENCIA IDENTIFICADA
          new Table({
            width: { size: 9500, type: WidthType.DXA },
            borders: tableBorders,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 4,
                    width: { size: 9500, type: WidthType.DXA },
                    shading: { fill: "CECDCD" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({
                            text: "6. MODALIDAD DE VIOLENCIA IDENTIFICADA",
                            bold: true,
                            size: HEADER_FONT_SIZE,
                            font: FONT_NAME,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 2375, type: WidthType.DXA },
                    shading: { fill: "F2F2F2" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({ text: "Intrafamiliar ( ", size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: isIntrafamiliar ? "X" : "  ", bold: isIntrafamiliar, underline: isIntrafamiliar ? {} : undefined, size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: " )", size: FONT_SIZE, font: FONT_NAME }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 2375, type: WidthType.DXA },
                    shading: { fill: "F2F2F2" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({ text: "Institucional ( ", size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: isInstitucional ? "X" : "  ", bold: isInstitucional, underline: isInstitucional ? {} : undefined, size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: " )", size: FONT_SIZE, font: FONT_NAME }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 2375, type: WidthType.DXA },
                    shading: { fill: "F2F2F2" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({ text: "Acoso escolar ( ", size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: isAcoso ? "X" : "  ", bold: isAcoso, underline: isAcoso ? {} : undefined, size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: " )", size: FONT_SIZE, font: FONT_NAME }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 2375, type: WidthType.DXA },
                    shading: { fill: "F2F2F2" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({ text: "Violencia est.-adulta ( ", size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: isAdulto ? "X" : "  ", bold: isAdulto, underline: isAdulto ? {} : undefined, size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: " )", size: FONT_SIZE, font: FONT_NAME }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 4,
                    width: { size: 9500, type: WidthType.DXA },
                    shading: { fill: "F2F2F2" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({ text: "Otras ( ", size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: isOtras ? "X" : "  ", bold: isOtras, underline: isOtras ? {} : undefined, size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: " ) : ", size: FONT_SIZE, font: FONT_NAME }),
                          new TextRun({ text: report.violence_modality_other || "………………………………………………………………………….", size: FONT_SIZE, font: FONT_NAME }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { after: 60 } }),

          // 7. RESUMEN DEL PRESUNTO HECHO DE VIOLENCIA COMETIDO O DETECTADO
          new Table({
            width: { size: 9500, type: WidthType.DXA },
            borders: tableBorders,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 4,
                    width: { size: 9500, type: WidthType.DXA },
                    shading: { fill: "CECDCD" },
                    margins: cellMargins,
                    children: [
                      new Paragraph({
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({
                            text: "7. RESUMEN DEL PRESUNTO HECHO DE VIOLENCIA COMETIDO O DETECTADO ",
                            bold: true,
                            size: HEADER_FONT_SIZE,
                            font: FONT_NAME,
                          }),
                          new TextRun({
                            text: "(Transcriba detalladamente lo expresado por el/la estudiante o la persona que refiere la presunta situación, de manera objetiva)",
                            italics: true,
                            size: 15,
                            font: FONT_NAME,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 4,
                    width: { size: 9500, type: WidthType.DXA },
                    shading: { fill: "F2F2F2" },
                    margins: { top: 80, bottom: 80, left: 100, right: 100 },
                    children: (report.summary || "—").split("\n").map(
                      (p) =>
                        new Paragraph({
                          alignment: AlignmentType.JUSTIFIED,
                          spacing: { after: 60 },
                          children: [
                            new TextRun({
                              text: p || " ",
                              size: FONT_SIZE,
                              font: FONT_NAME,
                            }),
                          ],
                        })
                    ),
                  }),
                ],
              }),
            ],
          }),

          // Observaciones si existen
          ...(report.observations
            ? [
                new Paragraph({ spacing: { after: 60 } }),
                new Table({
                  width: { size: 9500, type: WidthType.DXA },
                  borders: tableBorders,
                  rows: [
                    new TableRow({
                      children: [
                        new TableCell({
                          columnSpan: 4,
                          width: { size: 9500, type: WidthType.DXA },
                          shading: { fill: "F2F2F2" },
                          margins: cellMargins,
                          children: [
                            new Paragraph({
                              spacing: { after: 0, before: 0 },
                              children: [
                                new TextRun({ text: "Observaciones: ", bold: true, size: FONT_SIZE, font: FONT_NAME }),
                                new TextRun({ text: report.observations, size: FONT_SIZE, font: FONT_NAME }),
                              ],
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              ]
            : []),

          new Paragraph({ spacing: { after: 120 } }),

          // Firmas de Responsabilidad
          new Table({
            width: { size: 9500, type: WidthType.DXA },
            borders: transparentBorders,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 4750, type: WidthType.DXA },
                    margins: { top: 250, bottom: 40, left: 100, right: 100 },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 30, before: 0 },
                        children: [
                          new TextRun({ text: "________________________________________", color: "000000" }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 20, before: 0 },
                        children: [
                          new TextRun({
                            text: report.analyst_name || "Mgtr. Marlon Alberto Jácome Santana",
                            bold: true,
                            size: FONT_SIZE,
                            font: FONT_NAME,
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({
                            text: report.analyst_role || "ANALISTA DECE",
                            bold: true,
                            size: 15,
                            font: FONT_NAME,
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 4750, type: WidthType.DXA },
                    margins: { top: 250, bottom: 40, left: 100, right: 100 },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 30, before: 0 },
                        children: [
                          new TextRun({ text: "________________________________________", color: "000000" }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 20, before: 0 },
                        children: [
                          new TextRun({
                            text: report.rectora_name || "Msc. Diana Fernanda Manzano Villacís",
                            bold: true,
                            size: FONT_SIZE,
                            font: FONT_NAME,
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 0, before: 0 },
                        children: [
                          new TextRun({
                            text: "RECTORA",
                            bold: true,
                            size: 15,
                            font: FONT_NAME,
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          // Nota Legal del COIP
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "Recuerde el deber de denunciar según el artículo 422 del COIP.",
                italics: true,
                size: 15,
                font: FONT_NAME,
                color: "334155",
              }),
            ],
            spacing: { before: 120 },
          }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

/**
 * 4. FICHA DE OBSERVACIÓN ÁULICA (DOCX) - Calca fiel ministerial de 35 filas
 */
export async function generateObservationSheetDocx(opts: {
  sheet: CaseObservationSheetRow;
  student: StudentRow;
  institution?: InstitutionRow | null;
}): Promise<Buffer> {
  const { sheet, student, institution } = opts;
  const official = parseOfficialObservationData(sheet.observation_data);
  const studentCourse = formatStudentCourseFull(student);

  const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
  const tableBorders = {
    top: cellBorder,
    bottom: cellBorder,
    left: cellBorder,
    right: cellBorder,
    insideHorizontal: cellBorder,
    insideVertical: cellBorder,
  };
  const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

  const rows: TableRow[] = [];

  // Fila 1: Título de Ficha
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 4,
          shading: { fill: "D9E2F3" },
          margins: cellMargins,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "FICHA DE OBSERVACIÓN", bold: true, size: 22, font: "Arial" })],
              spacing: { after: 40, before: 40 },
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "Departamento de Consejería Estudiantil - DECE", bold: true, size: 18, font: "Arial" })],
              spacing: { after: 40 },
            }),
          ],
        }),
      ],
    })
  );

  // Fila 2: Subtítulo
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 4,
          shading: { fill: "D9E2F3" },
          margins: cellMargins,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "DATOS INFORMATIVOS GENERALES", bold: true, size: 19, font: "Arial" })],
              spacing: { after: 30, before: 30 },
            }),
          ],
        }),
      ],
    })
  );

  // Fila 3: Nombre Estudiante
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          width: { size: 3600, type: WidthType.DXA },
          shading: { fill: "D9E2F3" },
          margins: cellMargins,
          children: [new Paragraph({ children: [new TextRun({ text: "Nombre de el/la estudiante:", bold: true, size: 18, font: "Arial" })] })],
        }),
        new TableCell({
          columnSpan: 3,
          width: { size: 6465, type: WidthType.DXA },
          margins: cellMargins,
          children: [new Paragraph({ children: [new TextRun({ text: student.full_name, bold: true, size: 18, font: "Arial" })] })],
        }),
      ],
    })
  );

  // Fila 4: Grado o Curso
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          width: { size: 3600, type: WidthType.DXA },
          shading: { fill: "D9E2F3" },
          margins: cellMargins,
          children: [new Paragraph({ children: [new TextRun({ text: "Grado o Curso:", bold: true, size: 18, font: "Arial" })] })],
        }),
        new TableCell({
          columnSpan: 3,
          width: { size: 6465, type: WidthType.DXA },
          margins: cellMargins,
          children: [new Paragraph({ children: [new TextRun({ text: studentCourse, size: 18, font: "Arial" })] })],
        }),
      ],
    })
  );

  // Fila 5: Duración de la observación
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          width: { size: 3600, type: WidthType.DXA },
          shading: { fill: "D9E2F3" },
          margins: cellMargins,
          children: [new Paragraph({ children: [new TextRun({ text: "Duración de la observación", bold: true, size: 18, font: "Arial" })] })],
        }),
        new TableCell({
          columnSpan: 3,
          width: { size: 6465, type: WidthType.DXA },
          margins: cellMargins,
          children: [new Paragraph({ children: [new TextRun({ text: official.duration || "1:30", size: 18, font: "Arial" })] })],
        }),
      ],
    })
  );

  // Fila 6: Tipo de observación
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          width: { size: 3600, type: WidthType.DXA },
          shading: { fill: "D9E2F3" },
          margins: cellMargins,
          children: [new Paragraph({ children: [new TextRun({ text: "Observación áulica", bold: true, size: 18, font: "Arial" })] })],
        }),
        new TableCell({
          width: { size: 600, type: WidthType.DXA },
          margins: cellMargins,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: official.is_aulica ? "X" : "", bold: true, size: 20, font: "Arial" })] })],
        }),
        new TableCell({
          width: { size: 4665, type: WidthType.DXA },
          shading: { fill: "D9E2F3" },
          margins: cellMargins,
          children: [new Paragraph({ children: [new TextRun({ text: "Observación en otros espacios externos al aula", bold: true, size: 18, font: "Arial" })] })],
        }),
        new TableCell({
          width: { size: 1200, type: WidthType.DXA },
          margins: cellMargins,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: official.is_externa ? "X" : "", bold: true, size: 20, font: "Arial" })] })],
        }),
      ],
    })
  );

  // Fila 7: Cabecera Sección 2
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 4,
          shading: { fill: "D9E2F3" },
          margins: cellMargins,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "Preguntas para responder durante la observación", bold: true, size: 19, font: "Arial" })],
              spacing: { after: 30, before: 30 },
            }),
          ],
        }),
      ],
    })
  );

  // Fila 8: Cabecera columnas preguntas
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          width: { size: 3600, type: WidthType.DXA },
          shading: { fill: "D9E2F3" },
          margins: cellMargins,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Preguntas", bold: true, size: 18, font: "Arial" })] })],
        }),
        new TableCell({
          width: { size: 600, type: WidthType.DXA },
          shading: { fill: "D9E2F3" },
          margins: cellMargins,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Si", bold: true, size: 18, font: "Arial" })] })],
        }),
        new TableCell({
          width: { size: 600, type: WidthType.DXA },
          shading: { fill: "D9E2F3" },
          margins: cellMargins,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "No", bold: true, size: 18, font: "Arial" })] })],
        }),
        new TableCell({
          width: { size: 5265, type: WidthType.DXA },
          shading: { fill: "D9E2F3" },
          margins: cellMargins,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Comentario", bold: true, size: 18, font: "Arial" })] })],
        }),
      ],
    })
  );

  // Filas 9 a 25: 17 Preguntas
  for (const q of official.questions) {
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: 3600, type: WidthType.DXA },
            shading: { fill: "D9E2F3" },
            margins: cellMargins,
            children: [new Paragraph({ children: [new TextRun({ text: q.question, size: 17, font: "Arial" })] })],
          }),
          new TableCell({
            width: { size: 600, type: WidthType.DXA },
            margins: cellMargins,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: q.answer === "SI" ? "x" : "", bold: true, size: 18, font: "Arial" })] })],
          }),
          new TableCell({
            width: { size: 600, type: WidthType.DXA },
            margins: cellMargins,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: q.answer === "NO" ? "x" : "", bold: true, size: 18, font: "Arial" })] })],
          }),
          new TableCell({
            width: { size: 5265, type: WidthType.DXA },
            margins: cellMargins,
            children: q.comment
              ? q.comment.split("\n").map((line) => new Paragraph({ alignment: smartAlign(line), children: [new TextRun({ text: line, size: 17, font: "Arial" })] }))
              : [new Paragraph({ text: "" })],
          }),
        ],
      })
    );
  }

  // Fila 26: Cabecera Sección 3
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 4,
          shading: { fill: "D9E2F3" },
          margins: cellMargins,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "Preguntas para identificar los posibles tipos de atención requerida", bold: true, size: 19, font: "Arial" })],
              spacing: { after: 30, before: 30 },
            }),
          ],
        }),
      ],
    })
  );

  // Fila 27: Cabecera columnas atención
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          width: { size: 3600, type: WidthType.DXA },
          shading: { fill: "D9E2F3" },
          margins: cellMargins,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Preguntas", bold: true, size: 18, font: "Arial" })] })],
        }),
        new TableCell({
          width: { size: 600, type: WidthType.DXA },
          shading: { fill: "D9E2F3" },
          margins: cellMargins,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Sí", bold: true, size: 18, font: "Arial" })] })],
        }),
        new TableCell({
          width: { size: 600, type: WidthType.DXA },
          shading: { fill: "D9E2F3" },
          margins: cellMargins,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "No", bold: true, size: 18, font: "Arial" })] })],
        }),
        new TableCell({
          width: { size: 5265, type: WidthType.DXA },
          shading: { fill: "D9E2F3" },
          margins: cellMargins,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Detalle del tipo de intervención requerida si la respuesta es SÍ", bold: true, size: 18, font: "Arial" })] })],
        }),
      ],
    })
  );

  // Fila 28: Atención DECE
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          width: { size: 3600, type: WidthType.DXA },
          shading: { fill: "D9E2F3" },
          margins: cellMargins,
          children: [new Paragraph({ children: [new TextRun({ text: "¿A partir de la observación se identifica que él o la estudiante posiblemente requiere atención psicosocial de parte del Departamento de Consejería Estudiantil?", size: 17, font: "Arial" })] })],
        }),
        new TableCell({
          width: { size: 600, type: WidthType.DXA },
          margins: cellMargins,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: official.care_types.requires_dece.answer === "SI" ? "X" : "", bold: true, size: 18, font: "Arial" })] })],
        }),
        new TableCell({
          width: { size: 600, type: WidthType.DXA },
          margins: cellMargins,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: official.care_types.requires_dece.answer === "NO" ? "X" : "", bold: true, size: 18, font: "Arial" })] })],
        }),
        new TableCell({
          width: { size: 5265, type: WidthType.DXA },
          margins: cellMargins,
          children: official.care_types.requires_dece.detail
            ? official.care_types.requires_dece.detail.split("\n").map((line) => new Paragraph({ alignment: smartAlign(line), children: [new TextRun({ text: line, size: 17, font: "Arial" })] }))
            : [new Paragraph({ text: "" })],
        }),
      ],
    })
  );

  // Fila 29: Atención distinta
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          width: { size: 3600, type: WidthType.DXA },
          shading: { fill: "D9E2F3" },
          margins: cellMargins,
          children: [
            new Paragraph({ children: [new TextRun({ text: "¿A partir de la observación se identifica que él o la estudiante posiblemente requiere una atención distinta a la psicosocial?", size: 17, font: "Arial" })] }),
            new Paragraph({ children: [new TextRun({ text: "Por ejemplo: evaluación psicopedagógica; valoración de lenguaje, valoración médica", italics: true, size: 15, font: "Arial" })] }),
          ],
        }),
        new TableCell({
          width: { size: 600, type: WidthType.DXA },
          margins: cellMargins,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: official.care_types.requires_other.answer === "SI" ? "X" : "", bold: true, size: 18, font: "Arial" })] })],
        }),
        new TableCell({
          width: { size: 600, type: WidthType.DXA },
          margins: cellMargins,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: official.care_types.requires_other.answer === "NO" ? "X" : "", bold: true, size: 18, font: "Arial" })] })],
        }),
        new TableCell({
          width: { size: 5265, type: WidthType.DXA },
          margins: cellMargins,
          children: official.care_types.requires_other.detail
            ? official.care_types.requires_other.detail.split("\n").map((line) => new Paragraph({ alignment: smartAlign(line), children: [new TextRun({ text: line, size: 17, font: "Arial" })] }))
            : [new Paragraph({ text: "" })],
        }),
      ],
    })
  );

  // Fila 30: Cabecera Sección 4
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 4,
          shading: { fill: "D9E2F3" },
          margins: cellMargins,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "Preguntas que guían a identificar la necesidad de derivar estudiantes para la atención con otras instancias", bold: true, size: 19, font: "Arial" })],
              spacing: { after: 30, before: 30 },
            }),
          ],
        }),
      ],
    })
  );

  // Fila 31: Cabecera columnas derivaciones
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          width: { size: 3600, type: WidthType.DXA },
          shading: { fill: "D9E2F3" },
          margins: cellMargins,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Preguntas", bold: true, size: 18, font: "Arial" })] })],
        }),
        new TableCell({
          width: { size: 600, type: WidthType.DXA },
          shading: { fill: "D9E2F3" },
          margins: cellMargins,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Sí", bold: true, size: 18, font: "Arial" })] })],
        }),
        new TableCell({
          width: { size: 600, type: WidthType.DXA },
          shading: { fill: "D9E2F3" },
          margins: cellMargins,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "No", bold: true, size: 18, font: "Arial" })] })],
        }),
        new TableCell({
          width: { size: 5265, type: WidthType.DXA },
          shading: { fill: "D9E2F3" },
          margins: cellMargins,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Seleccione solo cuando la respuesta sea SÍ", bold: true, size: 18, font: "Arial" })] })],
        }),
      ],
    })
  );

  // Fila 32: Derivación Interna
  const internalOptionsText = `Inspección ( ${official.referrals.internal.inspeccion ? "X" : " "} )   Dpto. Inclusión ( ${official.referrals.internal.inclusion ? "X" : " "} )   Dpto. médico ( ${official.referrals.internal.medico ? "X" : " "} )   Otro ( ${official.referrals.internal.otro ? "X" : " "} ) ${official.referrals.internal.otro && official.referrals.internal.otro_detail ? `¿Cuál? ${official.referrals.internal.otro_detail}` : "¿Cuál? ………………………."}`;

  rows.push(
    new TableRow({
      children: [
        new TableCell({
          width: { size: 3600, type: WidthType.DXA },
          shading: { fill: "D9E2F3" },
          margins: cellMargins,
          children: [new Paragraph({ children: [new TextRun({ text: "¿Se requiere derivar al estudiante a un departamento o unidad interna a la institución educativa?", size: 17, font: "Arial" })] })],
        }),
        new TableCell({
          width: { size: 600, type: WidthType.DXA },
          margins: cellMargins,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: official.referrals.internal.answer === "SI" ? "X" : "", bold: true, size: 18, font: "Arial" })] })],
        }),
        new TableCell({
          width: { size: 600, type: WidthType.DXA },
          margins: cellMargins,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: official.referrals.internal.answer === "NO" ? "X" : "", bold: true, size: 18, font: "Arial" })] })],
        }),
        new TableCell({
          width: { size: 5265, type: WidthType.DXA },
          margins: cellMargins,
          children: [new Paragraph({ children: [new TextRun({ text: internalOptionsText, size: 17, font: "Arial" })] })],
        }),
      ],
    })
  );

  // Fila 33: Derivación Externa
  const externalOptionsText = `Centro atención médica ( ${official.referrals.external.medica ? "X" : " "} )   Centro atención psicológica ( ${official.referrals.external.psicologica ? "X" : " "} )   UDAI ( ${official.referrals.external.udai ? "X" : " "} )   Otro ( ${official.referrals.external.otro ? "X" : " "} ) ${official.referrals.external.otro && official.referrals.external.otro_detail ? `¿Cuál? ${official.referrals.external.otro_detail}` : "¿Cuál? ………………………."}`;

  rows.push(
    new TableRow({
      children: [
        new TableCell({
          width: { size: 3600, type: WidthType.DXA },
          shading: { fill: "D9E2F3" },
          margins: cellMargins,
          children: [new Paragraph({ children: [new TextRun({ text: "¿Se requiere derivar al estudiante a una entidad u organización externa a la institución educativa?", size: 17, font: "Arial" })] })],
        }),
        new TableCell({
          width: { size: 600, type: WidthType.DXA },
          margins: cellMargins,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: official.referrals.external.answer === "SI" ? "X" : "", bold: true, size: 18, font: "Arial" })] })],
        }),
        new TableCell({
          width: { size: 600, type: WidthType.DXA },
          margins: cellMargins,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: official.referrals.external.answer === "NO" ? "X" : "", bold: true, size: 18, font: "Arial" })] })],
        }),
        new TableCell({
          width: { size: 5265, type: WidthType.DXA },
          margins: cellMargins,
          children: [new Paragraph({ children: [new TextRun({ text: externalOptionsText, size: 17, font: "Arial" })] })],
        }),
      ],
    })
  );

  // Fila 34: Firma y Profesional
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 4,
          margins: { top: 120, bottom: 120, left: 140, right: 140 },
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "Nombre de la o el profesional DECE que realiza la observación: ", bold: true, size: 18, font: "Arial" }),
                new TextRun({ text: official.professional_name || "—", size: 18, font: "Arial" }),
              ],
              spacing: { after: 360 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Firma de responsabilidad:  _____________________________________", bold: true, size: 18, font: "Arial" }),
              ],
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Fecha de aplicación: ", bold: true, size: 18, font: "Arial" }),
                new TextRun({ text: official.application_date ? formatDate(official.application_date) : formatDate(sheet.observation_date), size: 18, font: "Arial" }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  // Fila 35: Confidencialidad
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 4,
          margins: cellMargins,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: "*La información registrada en este documento es confidencial y de uso exclusivo del Departamento de Consejería Estudiantil.",
                  italics: true,
                  size: 16,
                  font: "Arial",
                }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  const table = new Table({
    width: { size: 10065, type: WidthType.DXA },
    borders: tableBorders,
    rows,
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1000, bottom: 1000, left: 1000, right: 1000, header: 500, footer: 500 },
          },
        },
        headers: { default: createOfficialHeader("FICHA DE OBSERVACIÓN", "Departamento de Consejería Estudiantil - DECE") },
        footers: { default: createOfficialFooter() },
        children: [table],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

/**
 * 5. FICHA DE DERIVACIÓN (DOCX) - Formato oficial apaisado (Landscape)
 * Reproduce exactamente la estructura oficial de la plantilla ministerial
 * "FICHA DE DERIVACIÓN.xlsx", sin sección de consentimiento informado.
 */
export async function generateReferralDocx(opts: {
  referral: ReferralRow;
  caseFile: CaseFileRow;
  student: StudentRow;
  institution?: InstitutionRow | null;
  user?: UserRow | null;
}): Promise<Buffer> {
  const { referral, caseFile: _caseFile, student, institution, user } = opts;

  const COLOR_BLUE_HEADER = "D9E2F3";
  const COLOR_ORANGE_HEADER = "FBE5D6";
  const COLOR_BORDER = "8EAADB";
  const COLOR_TEXT_BLACK = "000000";

  const COL_WIDTHS_DXA = [
    930,  // Col 0: A
    930,  // Col 1: B
    930,  // Col 2: C
    930,  // Col 3: D
    93,   // Col 4: E
    1022, // Col 5: F
    496,  // Col 6: G
    898,  // Col 7: H
    1270, // Col 8: I
    1807, // Col 9: J
    1063, // Col 10: K
    599,  // Col 11: L
    930,  // Col 12: M
    2940, // Col 13: N
  ];

  function spanWidth(startCol: number, colSpan: number): number {
    let sum = 0;
    for (let i = 0; i < colSpan; i++) {
      sum += COL_WIDTHS_DXA[startCol + i] || 0;
    }
    return sum;
  }

  const tableBorders = {
    top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
    left: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
    right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
    insideVertical: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
  };

  function headerBar(text: string, colSpan = 14, bgColor = COLOR_BLUE_HEADER): TableRow {
    return new TableRow({
      children: [
        new TableCell({
          columnSpan: colSpan,
          width: { size: spanWidth(0, colSpan), type: WidthType.DXA },
          shading: { fill: bgColor },
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { line: 250, before: 0, after: 0 },
              children: [
                new TextRun({
                  text,
                  bold: true,
                  color: COLOR_TEXT_BLACK,
                  size: 20,
                  font: "Calibri",
                }),
              ],
            }),
          ],
        }),
      ],
    });
  }

  function richCell(opts: {
    startCol: number;
    colSpan: number;
    rowSpan?: number;
    boldPrefix?: string;
    regularText?: string | null;
    boldText?: string | null;
    boldText2?: string | null;
    regularText2?: string | null;
    fontSize?: number;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    bgColor?: string;
    color?: string;
  }): TableCell {
    const runs: TextRun[] = [];
    const size = opts.fontSize ?? 20;
    const color = opts.color ?? COLOR_TEXT_BLACK;

    if (opts.boldPrefix) {
      runs.push(
        new TextRun({
          text: opts.boldPrefix,
          bold: true,
          size,
          font: "Calibri",
          color,
        })
      );
    }
    if (opts.regularText) {
      runs.push(
        new TextRun({
          text: opts.regularText,
          bold: false,
          size,
          font: "Calibri",
          color,
        })
      );
    }
    if (opts.boldText) {
      runs.push(
        new TextRun({
          text: opts.boldText,
          bold: true,
          size,
          font: "Calibri",
          color,
        })
      );
    }
    if (opts.regularText2) {
      runs.push(
        new TextRun({
          text: opts.regularText2,
          bold: false,
          size,
          font: "Calibri",
          color,
        })
      );
    }
    if (opts.boldText2) {
      runs.push(
        new TextRun({
          text: opts.boldText2,
          bold: true,
          size,
          font: "Calibri",
          color,
        })
      );
    }

    return new TableCell({
      columnSpan: opts.colSpan,
      rowSpan: opts.rowSpan,
      width: { size: spanWidth(opts.startCol, opts.colSpan), type: WidthType.DXA },
      shading: opts.bgColor ? { fill: opts.bgColor } : undefined,
      margins: { top: 40, bottom: 40, left: 80, right: 80 },
      children: [
        new Paragraph({
          alignment: opts.align ?? AlignmentType.LEFT,
          spacing: { line: 250, before: 0, after: 20 },
          children: runs.length > 0 ? runs : [new TextRun({ text: "—", size, font: "Calibri" })],
        }),
      ],
    });
  }

  function multilineCell(opts: {
    startCol: number;
    colSpan: number;
    boldPrefix: string;
    content: string | null | undefined;
    fontSize?: number;
  }): TableCell {
    const size = opts.fontSize ?? 20;
    const raw = opts.content && opts.content.trim() ? opts.content.trim() : "—";
    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    const paragraphs: Paragraph[] = [];

    if (lines.length === 0) {
      paragraphs.push(
        new Paragraph({
          spacing: { line: 250, before: 0, after: 20 },
          children: [
            new TextRun({ text: opts.boldPrefix, bold: true, size, font: "Calibri", color: COLOR_TEXT_BLACK }),
            new TextRun({ text: " —", bold: false, size, font: "Calibri", color: COLOR_TEXT_BLACK }),
          ],
        })
      );
    } else {
      paragraphs.push(
        new Paragraph({
          spacing: { line: 250, before: 0, after: 20 },
          children: [
            new TextRun({ text: opts.boldPrefix, bold: true, size, font: "Calibri", color: COLOR_TEXT_BLACK }),
            new TextRun({ text: " " + lines[0], bold: false, size, font: "Calibri", color: COLOR_TEXT_BLACK }),
          ],
        })
      );
      for (let i = 1; i < lines.length; i++) {
        paragraphs.push(
          new Paragraph({
            spacing: { line: 250, before: 0, after: 20 },
            children: [
              new TextRun({ text: lines[i], bold: false, size, font: "Calibri", color: COLOR_TEXT_BLACK }),
            ],
          })
        );
      }
    }

    return new TableCell({
      columnSpan: opts.colSpan,
      width: { size: spanWidth(opts.startCol, opts.colSpan), type: WidthType.DXA },
      margins: { top: 40, bottom: 40, left: 80, right: 80 },
      children: paragraphs,
    });
  }

  function checkboxCell(startCol: number, isChecked: boolean, rowSpan?: number): TableCell {
    return new TableCell({
      columnSpan: 1,
      rowSpan: rowSpan,
      width: { size: spanWidth(startCol, 1), type: WidthType.DXA },
      margins: { top: 40, bottom: 40, left: 20, right: 20 },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { line: 250, before: 0, after: 0 },
          children: [
            new TextRun({
              text: isChecked ? "X" : "",
              bold: true,
              size: 20,
              font: "Calibri",
              color: COLOR_TEXT_BLACK,
            }),
          ],
        }),
      ],
    });
  }

  function formatStudentAge(studentAge: string | null | undefined, birthDate: string | null | undefined, refDate?: string | null): string {
    if (studentAge && studentAge.trim()) {
      const trimmed = studentAge.trim();
      return trimmed.includes("año") ? trimmed : `${trimmed} años`;
    }
    if (birthDate) {
      const b = new Date(birthDate);
      const ref = refDate ? new Date(refDate) : new Date();
      if (!isNaN(b.getTime())) {
        let age = ref.getFullYear() - b.getFullYear();
        const m = ref.getMonth() - b.getMonth();
        if (m < 0 || (m === 0 && ref.getDate() < b.getDate())) age--;
        if (age >= 0) return `${age} años`;
      }
    }
    return "—";
  }

  function formatCourseForReferral(st: StudentRow): string {
    const parts: string[] = [];
    if (st.course) parts.push(st.course.trim());
    if (st.parallel) parts.push(`"${st.parallel.trim().toLowerCase()}"`);
    if (st.jornada) parts.push(st.jornada.trim().toLowerCase());
    return parts.join(" ") || "—";
  }

  function formatGender(gender: string | null | undefined): string {
    if (!gender) return "—";
    const g = gender.trim().toLowerCase();
    if (g === "f" || g === "femenino" || g === "femenina") return "femenina";
    if (g === "m" || g === "masculino") return "masculino";
    return g;
  }

  function formatDisability(referralDisability: string | null | undefined, st: StudentRow): string {
    if (referralDisability && referralDisability.trim()) return referralDisability.trim();
    if (st.disability_card_detail && st.disability_card_detail.trim()) return st.disability_card_detail.trim();
    return "Ninguna";
  }

  const sel = referral.destination_detail;

  const studentAgeDisplay = formatStudentAge(referral.student_age, student.birth_date, referral.referral_date);
  const birthDateDisplay = student.birth_date ? formatDate(student.birth_date) : "—";
  const courseDisplay = formatCourseForReferral(student);
  const genderDisplay = formatGender(student.gender);
  const disabilityDisplay = formatDisability(referral.student_disability, student);
  const nationalityDisplay = referral.student_nationality || student.nationality || "ecuatoriana";
  const representativeDocId = referral.representative_document_id || student.representative_document_id || "—";

  const fichaNo = _caseFile?.code
    ? (_caseFile.code.replace(/[^0-9]/g, "").slice(-3) || _caseFile.code)
    : (referral.id.length > 5 ? referral.id.slice(0, 5).toUpperCase() : referral.id);

  const deceName = (user?.title_prefix ? `${user.title_prefix} ` : "") + (referral.elaborated_by_name || user?.name || "—");
  const deceRole = user?.job_title || "ANALISTA  DECE";
  const deceDoc = user?.document_id ? `C.I. ${user.document_id}` : "";

  const receivedName = referral.received_by || student.representative || "—";

  const authorityName = (institution?.rector_title ? `${institution.rector_title} ` : "") + (institution?.rector_name || referral.authority_name || "—");
  const authorityRole = institution?.rector_role || "RECTOR/A DE LA INSTITUCIÓN";

  const rows: TableRow[] = [
    // 1. Título
    headerBar("FICHA DE DERIVACIÓN", 14, COLOR_BLUE_HEADER),

    // 2. Datos institucionales
    headerBar("DATOS INSTITUCIONALES", 14, COLOR_BLUE_HEADER),
    new TableRow({
      children: [
        richCell({
          startCol: 0,
          colSpan: 8,
          boldPrefix: "Nombre de la institución educativa:   ",
          boldText: institution?.name || "—",
        }),
        richCell({
          startCol: 8,
          colSpan: 6,
          boldText: ` ${referral.district_office_label || institution?.district || "—"}`,
        }),
      ],
    }),
    new TableRow({
      children: [
        richCell({
          startCol: 0,
          colSpan: 14,
          boldPrefix: "Dirección de la institución: ",
          regularText: `${institution?.address || "—"}                                               `,
          boldText: "Teléfono: ",
          regularText2: institution?.institution_phone || "—",
        }),
      ],
    }),
    new TableRow({
      children: [
        richCell({
          startCol: 0,
          colSpan: 8,
          boldPrefix: "Fecha de derivación: ",
          regularText: formatDate(referral.referral_date),
        }),
        new TableCell({
          columnSpan: 6,
          width: { size: spanWidth(8, 6), type: WidthType.DXA },
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [
            new Paragraph({
              spacing: { line: 250, before: 0, after: 20 },
              children: [
                new TextRun({ text: " Ficha No.: ", bold: true, size: 20, font: "Calibri", color: "0070C0" }),
                new TextRun({ text: fichaNo, bold: true, size: 20, font: "Calibri", color: "0070C0" }),
              ],
            }),
          ],
        }),
      ],
    }),

    // 3. INTERNA
    headerBar("INTERNA\nMarque con una X", 14, COLOR_BLUE_HEADER),
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 6,
          width: { size: spanWidth(0, 6), type: WidthType.DXA },
          shading: { fill: COLOR_BLUE_HEADER },
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { line: 250, before: 0, after: 0 },
              children: [new TextRun({ text: "INTERNA A LA INSTITUCIÓN EDUCATIVA", bold: true, size: 20, font: "Calibri", color: COLOR_TEXT_BLACK })],
            }),
          ],
        }),
        new TableCell({
          columnSpan: 8,
          width: { size: spanWidth(6, 8), type: WidthType.DXA },
          shading: { fill: COLOR_BLUE_HEADER },
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { line: 250, before: 0, after: 0 },
              children: [new TextRun({ text: "INTERNA AL MINISTERIO DE EDUCACIÓN", bold: true, size: 20, font: "Calibri", color: COLOR_TEXT_BLACK })],
            }),
          ],
        }),
      ],
    }),
    // Row 11
    new TableRow({
      children: [
        richCell({ startCol: 0, colSpan: 5, boldText: "Departamento de Inclusión Educativa:" }),
        checkboxCell(5, sel === "DEPARTAMENTO_INCLUSION"),
        richCell({ startCol: 6, colSpan: 5, rowSpan: 2, boldText: "Unidad Distrital de Apoyo a la Inclusión (UDAI):" }),
        checkboxCell(11, sel === "UDAI", 2),
        richCell({ startCol: 12, colSpan: 2, rowSpan: 2, regularText: sel === "UDAI" ? (referral.institution || "") : "" }),
      ],
    }),
    // Row 12
    new TableRow({
      children: [
        richCell({ startCol: 0, colSpan: 5, boldText: "Docente de apoyo a la inclusión:" }),
        checkboxCell(5, sel === "DOCENTE_APOYO_INCLUSION"),
      ],
    }),
    // Row 13
    new TableRow({
      children: [
        richCell({ startCol: 0, colSpan: 5, boldText: "Rectorado / Vicerrectorado:" }),
        checkboxCell(5, sel === "RECTORADO_VICERRECTORADO"),
        richCell({ startCol: 6, colSpan: 5, boldText: "Dirección Distrital de Educación:" }),
        checkboxCell(11, sel === "DIRECCION_DISTRITAL"),
        richCell({ startCol: 12, colSpan: 2, regularText: sel === "DIRECCION_DISTRITAL" ? (referral.institution || "") : "" }),
      ],
    }),
    // Row 14
    new TableRow({
      children: [
        richCell({ startCol: 0, colSpan: 5, boldText: "Inspección:" }),
        checkboxCell(5, sel === "INSPECCION"),
        richCell({ startCol: 6, colSpan: 5, rowSpan: 2, boldText: "Otro (indique):" }),
        checkboxCell(11, sel === "OTRO_INTERNA_MINEDUC", 2),
        richCell({ startCol: 12, colSpan: 2, rowSpan: 2, regularText: sel === "OTRO_INTERNA_MINEDUC" ? (referral.institution || "") : "" }),
      ],
    }),
    // Row 15
    new TableRow({
      children: [
        richCell({ startCol: 0, colSpan: 5, boldText: "Otro (indique):" }),
        checkboxCell(5, sel === "OTRO_INTERNA_IE"),
      ],
    }),

    // 4. EXTERNA
    headerBar("EXTERNA\nMarque con una X", 14, COLOR_BLUE_HEADER),
    headerBar("EXTERNA AL MINISTERIO DE EDUCACIÓN", 14, COLOR_BLUE_HEADER),
    // Row 18
    new TableRow({
      children: [
        richCell({ startCol: 0, colSpan: 6, boldText: "Unidades especializadas de la policía:" }),
        checkboxCell(6, sel === "POLICIA_ESPECIALIZADA"),
        richCell({ startCol: 7, colSpan: 4, boldText: "Ministerio de Inclusión Económica y Social:" }),
        checkboxCell(11, sel === "MIES"),
        richCell({ startCol: 12, colSpan: 2, regularText: sel === "MIES" ? (referral.institution || "") : "" }),
      ],
    }),
    // Row 19
    new TableRow({
      children: [
        richCell({
          startCol: 0,
          colSpan: 6,
          boldText: "Establecimiento de salud pública: ",
          regularText: sel === "SALUD_PUBLICA" && referral.institution ? `(${referral.institution})` : "",
        }),
        checkboxCell(6, sel === "SALUD_PUBLICA"),
        richCell({ startCol: 7, colSpan: 4, boldText: "Ministerio de la mujer y derechos humanos:" }),
        checkboxCell(11, sel === "MINISTERIO_MUJER_DDHH"),
        richCell({ startCol: 12, colSpan: 2, regularText: sel === "MINISTERIO_MUJER_DDHH" ? (referral.institution || "") : "" }),
      ],
    }),
    // Row 20
    new TableRow({
      children: [
        richCell({
          startCol: 0,
          colSpan: 6,
          boldText: "Establecimiento de salud privada:",
          regularText: sel === "SALUD_PRIVADA" && referral.institution ? `(${referral.institution})` : "",
        }),
        checkboxCell(6, sel === "SALUD_PRIVADA"),
        richCell({
          startCol: 7,
          colSpan: 7,
          boldPrefix: "Otro (indique): ",
          regularText: sel === "OTRO_EXTERNA" ? `[X] ${referral.institution || ""}` : "",
        }),
      ],
    }),

    // 5. DATOS PERSONALES DEL ESTUDIANTE
    headerBar("DATOS PERSONALES DEL O LA ESTUDIANTE QUE SE DERIVA", 14, COLOR_ORANGE_HEADER),
    new TableRow({
      children: [
        richCell({
          startCol: 0,
          colSpan: 14,
          boldPrefix: "Apellidos y Nombres completos: ",
          boldText: student.full_name.toUpperCase(),
        }),
      ],
    }),
    new TableRow({
      children: [
        richCell({ startCol: 0, colSpan: 1, boldText: "Edad:" }),
        richCell({ startCol: 1, colSpan: 1, regularText: ` ${studentAgeDisplay}`, fontSize: 18 }),
        richCell({ startCol: 2, colSpan: 3, boldText: "Fecha de nacimiento:" }),
        richCell({ startCol: 5, colSpan: 3, regularText: birthDateDisplay, fontSize: 18 }),
        richCell({ startCol: 8, colSpan: 1, boldText: "Grado/curso:" }),
        richCell({ startCol: 9, colSpan: 2, regularText: courseDisplay, fontSize: 18 }),
        richCell({ startCol: 11, colSpan: 2, boldText: "Género:" }),
        richCell({ startCol: 13, colSpan: 1, regularText: genderDisplay, fontSize: 18 }),
      ],
    }),
    new TableRow({
      children: [
        richCell({ startCol: 0, colSpan: 3, boldText: "N° documento identidad:" }),
        richCell({ startCol: 3, colSpan: 8, regularText: student.document_id || "—", fontSize: 18 }),
        richCell({ startCol: 11, colSpan: 2, boldText: "Discapacidad:" }),
        richCell({ startCol: 13, colSpan: 1, regularText: disabilityDisplay, fontSize: 18 }),
      ],
    }),
    new TableRow({
      children: [
        richCell({
          startCol: 0,
          colSpan: 14,
          boldPrefix: "Dirección domiciliaria: ",
          regularText: student.address || "—",
        }),
      ],
    }),
    new TableRow({
      children: [
        richCell({
          startCol: 0,
          colSpan: 10,
          boldPrefix: "Nacionalidad: ",
          regularText: nationalityDisplay,
        }),
        richCell({ startCol: 10, colSpan: 3, boldText: "N° contacto telefónico" }),
        richCell({ startCol: 13, colSpan: 1, regularText: student.rep_phone || "—" }),
      ],
    }),
    new TableRow({
      children: [
        richCell({
          startCol: 0,
          colSpan: 10,
          boldPrefix: "Nombre de representante: ",
          regularText: student.representative || "—",
        }),
        richCell({ startCol: 10, colSpan: 3, boldText: "N° documento identidad:" }),
        richCell({ startCol: 13, colSpan: 1, regularText: representativeDocId }),
      ],
    }),

    // 6. MOTIVO DE REFERENCIA
    headerBar("MOTIVO DE REFERENCIA", 14, COLOR_ORANGE_HEADER),
    new TableRow({
      children: [
        multilineCell({
          startCol: 0,
          colSpan: 14,
          boldPrefix: "Historia de la situación actual: ",
          content: referral.current_situation_history || referral.background_summary || referral.reason || "—",
        }),
      ],
    }),
    new TableRow({
      children: [
        multilineCell({
          startCol: 0,
          colSpan: 14,
          boldPrefix: "Acciones desarrolladas: ",
          content: referral.actions_taken
            ? referral.actions_taken
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line) => (line.startsWith("-") ? line : `- ${line.replace(/^(\d+[\.\)]|[•\*\+])\s*/, "")}`))
                .join("\n")
            : "—",
        }),
      ],
    }),
    new TableRow({
      children: [
        multilineCell({
          startCol: 0,
          colSpan: 14,
          boldPrefix: "Tipo de atención que se requiere de parte de la entidad interna/externa:   ",
          content: referral.care_type_required || "—",
        }),
      ],
    }),
    new TableRow({
      children: [
        multilineCell({
          startCol: 0,
          colSpan: 14,
          boldPrefix: "Observaciones: ",
          content: referral.observations
            ? referral.observations
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line) => (line.startsWith("•") ? line : `• ${line.replace(/^(\d+[\.\)]|[\*\-\+])\s*/, "")}`))
                .join("\n")
            : "—",
        }),
      ],
    }),

    // 7. FIRMAS
    new TableRow({
      children: [
        richCell({ startCol: 0, colSpan: 5, boldText: "FICHA ELABORADA POR:", align: AlignmentType.CENTER }),
        richCell({ startCol: 5, colSpan: 5, boldText: "RECIBIDO POR", align: AlignmentType.CENTER }),
        richCell({ startCol: 10, colSpan: 4, boldText: "AUTORIDAD INSTITUCIONAL", align: AlignmentType.CENTER }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 5,
          width: { size: spanWidth(0, 5), type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 60, right: 60 },
          children: [
            new Paragraph({ text: "", spacing: { before: 180, after: 120 } }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { line: 250, before: 0, after: 0 },
              children: [
                new TextRun({ text: "____________________________________\n", color: "64748B", size: 16 }),
                new TextRun({ text: `${deceName}\n`, bold: true, size: 20, font: "Calibri" }),
                new TextRun({ text: `${deceRole}\n`, size: 16, font: "Calibri" }),
                ...(deceDoc ? [new TextRun({ text: deceDoc, size: 16, font: "Calibri" })] : []),
              ],
            }),
          ],
        }),
        new TableCell({
          columnSpan: 5,
          width: { size: spanWidth(5, 5), type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 60, right: 60 },
          children: [
            new Paragraph({ text: "", spacing: { before: 180, after: 120 } }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { line: 250, before: 0, after: 0 },
              children: [
                new TextRun({ text: "..............................................................\n", color: "64748B", size: 16 }),
                new TextRun({ text: `${receivedName}\n`, bold: true, size: 20, font: "Calibri" }),
                new TextRun({ text: "Representante legal", size: 16, font: "Calibri" }),
              ],
            }),
          ],
        }),
        new TableCell({
          columnSpan: 4,
          width: { size: spanWidth(10, 4), type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 60, right: 60 },
          children: [
            new Paragraph({ text: "", spacing: { before: 180, after: 120 } }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { line: 250, before: 0, after: 0 },
              children: [
                new TextRun({ text: "____________________________________\n", color: "64748B", size: 16 }),
                new TextRun({ text: `${authorityName}\n`, bold: true, size: 20, font: "Calibri" }),
                new TextRun({ text: authorityRole, size: 16, font: "Calibri" }),
              ],
            }),
          ],
        }),
      ],
    }),
    new TableRow({
      children: [
        richCell({ startCol: 0, colSpan: 5, boldText: "Fecha: …......................................................" }),
        richCell({ startCol: 5, colSpan: 5, boldText: "Fecha: …......................................................" }),
        richCell({ startCol: 10, colSpan: 4, boldText: "Fecha: …......................................................" }),
      ],
    }),

    // 8. Nota legal
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 14,
          width: { size: 14838, type: WidthType.DXA },
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { line: 220, before: 0, after: 0 },
              children: [
                new TextRun({
                  text: "ES RESPONSABILIDAD DEL REPRESENTANTE LEGAL AGENDAR LOS TURNOS NECESARIOS EN EL MSP 171 O IESS U OTRO PROFESIONAL EN SALUD Y/O SALUD MENTAL\nTIENE 15 DIAS A PARTIR DE LA FECHA PARA PRESENTAR EL CERTIFICADO CORRESPONDIENTE O DOCUMENTO DE RESPALDO EN EL DEPARTAMENTO DE CONSEJERÍA ESTUDIANTIL PARA SEGUIMIENTO DEL CASO",
                  bold: true,
                  size: 16, // 8pt
                  font: "Calibri",
                  color: COLOR_TEXT_BLACK,
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  ];

  const doc = new Document({
    creator: "DECE App",
    title: `Ficha de Derivación - ${student.full_name}`,
    description: "Ficha oficial de derivación del DECE",
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 16, color: "0F172A" },
          paragraph: { spacing: { line: 240, before: 0, after: 40 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 16838, // A4 Landscape
              height: 11906,
              orientation: PageOrientation.LANDSCAPE,
            },
            margin: {
              top: 1000,
              right: 1000,
              bottom: 1000,
              left: 1000,
              header: 500,
              footer: 500,
            },
          },
        },
        headers: { default: createOfficialLandscapeHeader() },
        footers: { default: createOfficialLandscapeFooter() },
        children: [
          new Table({
            layout: TableLayoutType.FIXED,
            width: { size: 14838, type: WidthType.DXA },
            columnWidths: COL_WIDTHS_DXA,
            borders: tableBorders,
            rows: rows,
          }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

/**
 * Encabezado oficial en formato horizontal (Landscape)
 */
function createOfficialLandscapeHeader() {
  const headerImg = getImageBuffer("header_4k.png");

  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        indent: { left: -1700, right: -1700 },
        children: headerImg
          ? [
              new ImageRun({
                data: headerImg,
                transformation: { width: 840, height: 75 },
                type: "png",
              }),
            ]
          : [],
        spacing: { after: 0, before: 0 },
      }),
    ],
  });
}

/**
 * Pie de página oficial en formato horizontal (Landscape)
 */
function createOfficialLandscapeFooter() {
  const footerImg = getImageBuffer("footer_nuevo_ecuador.png");

  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        indent: { left: -1700, right: -1700 },
        children: footerImg
          ? [
              new ImageRun({
                data: footerImg,
                transformation: { width: 840, height: 68 },
                type: "png",
              }),
            ]
          : [],
        spacing: { before: 0, after: 0 },
      }),
    ],
  });
}

/**
 * Genera el documento de Word (.docx) para el INFORME BIMENSUAL DE SEGUIMIENTO AL PLAN
 * DE ACOMPAÑAMIENTO INSTITUCIONAL (Casos de Violencia Sexual) en formato A4 Horizontal.
 */
export async function generateBimonthlyReportDocx(report: BimonthlyReportRow): Promise<Buffer> {
  const processes = parseProcessesData(report.processes_data);

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 16838, // 29.7 cm A4 Landscape
              height: 11906, // 21 cm A4 Landscape
              orientation: PageOrientation.LANDSCAPE,
            },
            margin: {
              top: 1701,
              right: 1701,
              bottom: 1701,
              left: 1701,
              header: 709,
              footer: 709,
            },
          },
        },
        headers: {
          default: createOfficialLandscapeHeader(),
        },
        footers: {
          default: createOfficialLandscapeFooter(),
        },
        children: [
          // Título del informe
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "SEGUIMIENTO AL PLAN DE ACOMPAÑAMIENTO INSTITUCIONAL",
                bold: true,
                size: 24,
                font: "Calibri",
                color: "111827",
              }),
            ],
            spacing: { before: 120, after: 40 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `Año lectivo ${report.school_year_text} (Meses: ${report.period_months})`,
                bold: true,
                size: 22,
                font: "Calibri",
                color: "1F2937",
              }),
            ],
            spacing: { after: 180 },
          }),

          // Tabla 1: Datos Informativos Institucionales
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    shading: { fill: "E5E7EB" },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "Nombre de la institución educativa:",
                            bold: true,
                            size: 19,
                            font: "Calibri",
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: report.institution_name, size: 19, font: "Calibri" })],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    shading: { fill: "E5E7EB" },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: "Código AMIE:", bold: true, size: 19, font: "Calibri" }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: report.amie_code, size: 19, font: "Calibri" })],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    shading: { fill: "E5E7EB" },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "N° de presuntas víctimas:",
                            bold: true,
                            size: 19,
                            font: "Calibri",
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: report.victim_initials, bold: true, size: 19, font: "Calibri" }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { after: 120 } }),

          // Tabla 2: Matriz de los Procesos Implementados (5 columnas)
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
            },
            rows: [
              new TableRow({
                tableHeader: true,
                children: [
                  new TableCell({
                    width: { size: 22, type: WidthType.PERCENTAGE },
                    shading: { fill: "D1D5DB" },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: "PROCESO IMPLEMENTADO", bold: true, size: 18, font: "Calibri" }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 36, type: WidthType.PERCENTAGE },
                    shading: { fill: "D1D5DB" },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: "¿QUIÉNES EJECUTARÁN?\n(institución que brindará el servicio)",
                            bold: true,
                            size: 18,
                            font: "Calibri",
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 14, type: WidthType.PERCENTAGE },
                    shading: { fill: "D1D5DB" },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: "NÚMERO DE PERSONAS QUE RECIBIRÁN EL ACOMPAÑAMIENTO",
                            bold: true,
                            size: 16,
                            font: "Calibri",
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 14, type: WidthType.PERCENTAGE },
                    shading: { fill: "D1D5DB" },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: "FECHA DE INICIO DEL ACOMPAÑAMIENTO",
                            bold: true,
                            size: 16,
                            font: "Calibri",
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 14, type: WidthType.PERCENTAGE },
                    shading: { fill: "D1D5DB" },
                    verticalAlign: VerticalAlign.CENTER,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: "FECHA DE FINALIZACIÓN DEL ACOMPAÑAMIENTO",
                            bold: true,
                            size: 16,
                            font: "Calibri",
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              ...processes.map(
                (p) =>
                  new TableRow({
                    children: [
                      new TableCell({
                        width: { size: 22, type: WidthType.PERCENTAGE },
                        shading: { fill: "F9FAFB" },
                        children: [
                          new Paragraph({
                            children: [new TextRun({ text: p.process_name, bold: true, size: 18, font: "Calibri" })],
                          }),
                        ],
                      }),
                      new TableCell({
                        width: { size: 36, type: WidthType.PERCENTAGE },
                        children: (p.executed_by || "—")
                          .split("\n")
                          .map(
                            (line) =>
                              new Paragraph({
                                children: [new TextRun({ text: line, size: 18, font: "Calibri" })],
                                spacing: { after: 40 },
                              })
                          ),
                      }),
                      new TableCell({
                        width: { size: 14, type: WidthType.PERCENTAGE },
                        verticalAlign: VerticalAlign.CENTER,
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: p.beneficiaries_count || "—", size: 18, font: "Calibri" })],
                          }),
                        ],
                      }),
                      new TableCell({
                        width: { size: 14, type: WidthType.PERCENTAGE },
                        verticalAlign: VerticalAlign.CENTER,
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: p.start_date || "—", size: 18, font: "Calibri" })],
                          }),
                        ],
                      }),
                      new TableCell({
                        width: { size: 14, type: WidthType.PERCENTAGE },
                        verticalAlign: VerticalAlign.CENTER,
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: p.end_date || "—", size: 18, font: "Calibri" })],
                          }),
                        ],
                      }),
                    ],
                  })
              ),
            ],
          }),

          new Paragraph({ spacing: { after: 140 } }),

          // Tabla 3: Firmas de Responsabilidad
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    shading: { fill: "E5E7EB" },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: "Elaborado por:", bold: true, size: 19, font: "Calibri" }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: report.elaborated_by_role, size: 17, font: "Calibri" }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: "Nombre:", bold: true, size: 19, font: "Calibri" }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: report.elaborated_by_name || "—", size: 19, font: "Calibri" }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: "Firma:", bold: true, size: 19, font: "Calibri" })],
                      }),
                      new Paragraph({ text: "", spacing: { after: 700 } }),
                    ],
                  }),
                ],
              }),

              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    shading: { fill: "E5E7EB" },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: "Revisado por:", bold: true, size: 19, font: "Calibri" }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: report.reviewed_by_role, size: 17, font: "Calibri" }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: "Nombre:", bold: true, size: 19, font: "Calibri" }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: report.reviewed_by_name || "—", size: 19, font: "Calibri" }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: "Firma:", bold: true, size: 19, font: "Calibri" })],
                      }),
                      new Paragraph({ text: "", spacing: { after: 700 } }),
                    ],
                  }),
                ],
              }),

              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    shading: { fill: "E5E7EB" },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: "Aprobado por:", bold: true, size: 19, font: "Calibri" }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: report.approved_by_role, size: 17, font: "Calibri" }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: "Nombre:", bold: true, size: 19, font: "Calibri" }),
                        ],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: report.approved_by_name || "—", size: 19, font: "Calibri" }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: "Firma:", bold: true, size: 19, font: "Calibri" })],
                      }),
                      new Paragraph({ text: "", spacing: { after: 700 } }),
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



/**
 * 8. ACTA DE CORRESPONSABILIDAD CON REPRESENTANTES LEGALES (DOCX)
 * Calca fiel ministerial a ACTAS DE COMPROMISO CORRESPONSABILIDAD CON REPRESENTANTES LEGALES.docx
 */
export async function generateCorresponsibilityActDocx(opts: {
  act: CaseCorresponsibilityActRow;
  student: StudentRow;
  institution?: InstitutionRow | null;
}): Promise<Buffer> {
  const { act, student, institution } = opts;

  const appearanceText = buildCorresponsibilityAppearanceText({
    city: act.city,
    date: act.act_date,
    time: act.act_time || "09:00",
    representativeName: act.representative_name,
    representativeIdNum: act.representative_id_num,
    studentName: act.student_name,
    studentGrade: act.student_grade,
    studentParallel: act.student_parallel,
    jornada: act.jornada === "MATUTINA" ? "M ( X ) V ( )" : "M ( ) V ( X )",
  });

  const children: (Paragraph | Table)[] = [];

  // Título
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "ACTA DE CORRESPONSABILIDAD ENTRE DECE Y REPRESENTANTES LEGALES",
          bold: true,
          size: 24,
          font: "Times New Roman",
        }),
      ],
      spacing: { before: 200, after: 240 },
    })
  );

  // Comparecencia
  children.push(
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      indent: { firstLine: 400 },
      children: [
        new TextRun({
          text: appearanceText,
          size: 22,
          font: "Times New Roman",
        }),
      ],
      spacing: { after: 180, line: 276 },
    })
  );

  // Dificultad detectada encabezado
  children.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({
          text: "Dificultad detectada:",
          bold: true,
          size: 22,
          font: "Times New Roman",
        }),
      ],
      spacing: { before: 120, after: 80 },
    })
  );

  // Dificultad detectada texto
  const diffParas = textToParagraphs(act.detected_difficulty, 22);
  diffParas.forEach((p) => children.push(p));

  // Fundamentación Legal
  children.push(
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      children: [
        new TextRun({
          text: act.legal_framework,
          size: 22,
          font: "Times New Roman",
        }),
      ],
      spacing: { before: 140, after: 180, line: 276 },
    })
  );

  // Acuerdos y compromisos encabezado
  children.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({
          text: "Para ello se llega a los siguientes acuerdos y compromisos:",
          bold: true,
          size: 22,
          font: "Times New Roman",
        }),
      ],
      spacing: { before: 140, after: 120 },
    })
  );

  // Compromisos Representante
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Por parte de el/la Representante Legal:",
          bold: true,
          underline: {},
          size: 21,
          font: "Times New Roman",
        }),
      ],
      spacing: { before: 80, after: 60 },
    })
  );
  textToParagraphs(act.commitments_representative, 21).forEach((p) => children.push(p));

  // Compromisos DECE
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Por parte del Profesional DECE y la Institución Educativa:",
          bold: true,
          underline: {},
          size: 21,
          font: "Times New Roman",
        }),
      ],
      spacing: { before: 100, after: 60 },
    })
  );
  textToParagraphs(act.commitments_dece, 21).forEach((p) => children.push(p));

  // Compromisos Estudiante si existen
  if (act.commitments_student) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Por parte de el/la Estudiante:",
            bold: true,
            underline: {},
            size: 21,
            font: "Times New Roman",
          }),
        ],
        spacing: { before: 100, after: 60 },
      })
    );
    textToParagraphs(act.commitments_student, 21).forEach((p) => children.push(p));
  }

  // Cláusulas de Advertencia
  children.push(
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      children: [
        new TextRun({
          text: STANDARD_CLOSING_CLAUSE_1,
          size: 21,
          font: "Times New Roman",
        }),
      ],
      spacing: { before: 140, after: 120, line: 260 },
    })
  );

  children.push(
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      children: [
        new TextRun({
          text: STANDARD_CLOSING_CLAUSE_2,
          size: 21,
          font: "Times New Roman",
        }),
      ],
      spacing: { before: 60, after: 240, line: 260 },
    })
  );

  if (act.observations) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Observaciones: ", bold: true, size: 20, font: "Times New Roman" }),
          new TextRun({ text: act.observations, size: 20, font: "Times New Roman" }),
        ],
        spacing: { after: 200 },
      })
    );
  }

  // Tabla de Firmas
  const borderNone = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const tableBordersNone = {
    top: borderNone,
    bottom: borderNone,
    left: borderNone,
    right: borderNone,
    insideHorizontal: borderNone,
    insideVertical: borderNone,
  };

  const sigRows = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "____________________________________", font: "Times New Roman" })],
              spacing: { before: 300, after: 60 },
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "PROFESIONAL DECE", bold: true, size: 20, font: "Times New Roman" })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: `Nombres: ${act.dece_professional_name}`, size: 18, font: "Times New Roman" })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: `C.I.: ${act.dece_professional_id_num || "—"}`, size: 18, font: "Times New Roman" })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "____________________________________", font: "Times New Roman" })],
              spacing: { before: 300, after: 60 },
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "REPRESENTANTE LEGAL", bold: true, size: 20, font: "Times New Roman" })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: `Nombres: ${act.representative_name}`, size: 18, font: "Times New Roman" })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: `C.I.: ${act.representative_id_num || "............................"}`, size: 18, font: "Times New Roman" })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: `Teléfono: ${act.representative_phone || "............................"}`, size: 18, font: "Times New Roman" })],
            }),
          ],
        }),
      ],
    }),
  ];

  if (act.tutor_authority_name) {
    sigRows.push(
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "____________________________________", font: "Times New Roman" })],
                spacing: { before: 300, after: 60 },
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "TUTOR / AUTORIDAD", bold: true, size: 20, font: "Times New Roman" })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `Nombres: ${act.tutor_authority_name}`, size: 18, font: "Times New Roman" })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `Cargo: ${act.tutor_authority_role || "Docente Tutor"}`, size: 18, font: "Times New Roman" })],
              }),
            ],
          }),
        ],
      })
    );
  }

  const sigTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBordersNone,
    rows: sigRows,
  });

  children.push(sigTable);

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1200, bottom: 1200, left: 1400, right: 1400, header: 500, footer: 500 },
          },
        },
        headers: { default: createOfficialHeader("ACTA DE CORRESPONSABILIDAD", "Departamento de Consejería Estudiantil - DECE") },
        footers: { default: createOfficialFooter() },
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}


/**
 * Generador nativo DOCX para Entrevista Semiestructurada (Calca fiel ministerial)
 */
export async function generateInterviewDocx(opts: {
  interview: any;
  student: any;
  institution?: any;
  analystRole?: string;
  professionalName?: string;
}): Promise<Buffer> {
  const { interview, student, institution, analystRole, professionalName } = opts;
  const FONT_NAME = "Arial";
  const FONT_SIZE = 18; // 9pt
  const FONT_SIZE_SM = 16; // 8pt
  const FONT_SIZE_XS = 14; // 7pt
  const TITLE_SIZE = 22; // 11pt

  const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
  const tableBorders = {
    top: cellBorder,
    bottom: cellBorder,
    left: cellBorder,
    right: cellBorder,
    insideHorizontal: cellBorder,
    insideVertical: cellBorder,
  };
  const tableBordersNone = {
    top: { style: BorderStyle.NONE, size: 0, color: "auto" },
    bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
    left: { style: BorderStyle.NONE, size: 0, color: "auto" },
    right: { style: BorderStyle.NONE, size: 0, color: "auto" },
    insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
    insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
  };

  const renderCheck = (value: string | null | undefined, target: string) => {
    const isChecked = value?.includes(target);
    return `${target} ( ${isChecked ? "X" : "  "} )`;
  };

  const courseFormatted = formatStudentCourseFull(student) || interview.course || `${student.course || ""} ${student.parallel || ""}`.trim();
  const studentAge = interview.age || computeAgeViolence(student.birth_date);
  const interviewDate = formatDate(interview.application_date);

  // Logo / Escudo si existe
  const logoBuffer = getImageBuffer("institution-logo-default.png") || getImageBuffer("mineduc-logo.png");

  const children: (Paragraph | Table)[] = [];

  // Encabezado institucional alineado a la derecha sin cuadro de logo
  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: "Departamento de Consejería Estudiantil - DECE",
          font: FONT_NAME,
          italics: true,
          size: 24,
          color: "4A5568",
        }),
      ],
      spacing: { after: 40 },
    })
  );

  // Línea decorativa tridimensional azul/plateada
  children.push(
    new Table({
      width: { size: 9500, type: WidthType.DXA },
      borders: tableBordersNone,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 9500, type: WidthType.DXA },
              shading: { fill: "7FA9D6" },
              children: [new Paragraph({ text: "", spacing: { before: 10, after: 10 } })],
            }),
          ],
        }),
      ],
    })
  );

  children.push(new Paragraph({ spacing: { after: 50 } }));

  // Título centrado con borde negro exacto
  children.push(
    new Table({
      width: { size: 9500, type: WidthType.DXA },
      borders: tableBorders,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 9500, type: WidthType.DXA },
              margins: { top: 60, bottom: 60, left: 100, right: 100 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: "ENTREVISTA SEMIESTRUCTURADA A ESTUDIANTES / REPRESENTANTES",
                      bold: true,
                      font: FONT_NAME,
                      size: TITLE_SIZE,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  children.push(new Paragraph({ spacing: { after: 50 } }));

  // DATOS PERSONALES (sin recuadro de foto, calca fiel al formato ministerial)
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "DATOS PERSONALES:",
          italics: true,
          bold: true,
          font: FONT_NAME,
          size: FONT_SIZE_SM,
          color: "4B5563",
        }),
      ],
      spacing: { after: 40 },
    })
  );

  children.push(
    new Table({
      width: { size: 9500, type: WidthType.DXA },
      borders: tableBordersNone,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 1200, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: "NOMBRES:", bold: true, font: FONT_NAME, size: FONT_SIZE_SM })] })],
            }),
            new TableCell({
              width: { size: 5300, type: WidthType.DXA },
              borders: { bottom: { style: BorderStyle.DOTTED, size: 4, color: "000000" } },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: interview.interviewee_full_name || student.full_name, font: FONT_NAME, size: FONT_SIZE_SM, color: "1E3A8A" })] })],
            }),
            new TableCell({
              width: { size: 600, type: WidthType.DXA },
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "CI:", bold: true, font: FONT_NAME, size: FONT_SIZE_SM })] })],
            }),
            new TableCell({
              width: { size: 2400, type: WidthType.DXA },
              borders: { bottom: { style: BorderStyle.DOTTED, size: 4, color: "000000" } },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: interview.interviewee_cedula || student.document_id || "", font: FONT_NAME, size: FONT_SIZE_SM, color: "1E3A8A" })] })],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: 1200, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: "CURSO:", bold: true, font: FONT_NAME, size: FONT_SIZE_SM })] })],
            }),
            new TableCell({
              columnSpan: 3,
              width: { size: 8300, type: WidthType.DXA },
              borders: { bottom: { style: BorderStyle.DOTTED, size: 4, color: "000000" } },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: courseFormatted, font: FONT_NAME, size: FONT_SIZE_SM, color: "1E3A8A" })] })],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: 1200, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: "EDAD:", bold: true, font: FONT_NAME, size: FONT_SIZE_SM })] })],
            }),
            new TableCell({
              width: { size: 3000, type: WidthType.DXA },
              borders: { bottom: { style: BorderStyle.DOTTED, size: 4, color: "000000" } },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(studentAge || ""), font: FONT_NAME, size: FONT_SIZE_SM, color: "1E3A8A" })] })],
            }),
            new TableCell({
              width: { size: 2300, type: WidthType.DXA },
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "FECHA APLICACIÓN:", bold: true, font: FONT_NAME, size: FONT_SIZE_SM })] })],
            }),
            new TableCell({
              width: { size: 3000, type: WidthType.DXA },
              borders: { bottom: { style: BorderStyle.DOTTED, size: 4, color: "000000" } },
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: interviewDate || "", font: FONT_NAME, size: FONT_SIZE_SM, color: "1E3A8A" })] })],
            }),
          ],
        }),
      ],
    })
  );

  children.push(new Paragraph({ spacing: { after: 80 } }));

  // TABLA PRINCIPAL DE 2 COLUMNAS CON SUBSECCIONES Y BORDES EXACTOS A LA PREVISUALIZACIÓN
  const familyText = [
    renderCheck(interview.family_relation, "Buena"),
    renderCheck(interview.family_relation, "Regular"),
    renderCheck(interview.family_relation, "Mala"),
    renderCheck(interview.family_relation, "Ausentes"),
  ].join("       ");

  const emoText1 = [
    renderCheck(interview.emotional_state, "Estable"),
    renderCheck(interview.emotional_state, "Inestable"),
    renderCheck(interview.emotional_state, "Llanto fácil"),
    renderCheck(interview.emotional_state, "Triste"),
  ].join("   ");

  const emoText2 = [
    renderCheck(interview.emotional_state, "Alegre"),
    renderCheck(interview.emotional_state, "Agresivo"),
    renderCheck(interview.emotional_state, "Evasivo"),
  ].join("   ");

  const socText = [
    renderCheck(interview.social_relations, "Sociable"),
    renderCheck(interview.social_relations, "Aislado"),
  ].join("             ");

  const bullyingText = `Antecedentes de acoso escolar ( ${interview.bullying_history ? "X" : "  "} )`;

  const acadText = [
    renderCheck(interview.academic_history, "Bueno"),
    renderCheck(interview.academic_history, "Regular"),
    renderCheck(interview.academic_history, "Malo"),
  ].join("          ");

  children.push(
    new Table({
      width: { size: 9500, type: WidthType.DXA },
      borders: tableBorders,
      rows: [
        new TableRow({
          children: [
            // Columna Izquierda: 1. RESUMEN DE LO TRATADO
            new TableCell({
              width: { size: 4275, type: WidthType.DXA },
              margins: { top: 60, bottom: 60, left: 80, right: 80 },
              verticalAlign: VerticalAlign.TOP,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: "1. RESUMEN DE LO TRATADO EN LA ENTREVISTA", bold: true, font: FONT_NAME, size: FONT_SIZE_SM })],
                  spacing: { after: 60 },
                }),
                ...((interview.summary || "—").split("\n").map((line: string) =>
                  new Paragraph({
                    alignment: AlignmentType.JUSTIFIED,
                    children: [new TextRun({ text: line || " ", font: FONT_NAME, size: FONT_SIZE_XS })],
                    spacing: { after: 40 },
                  })
                )),
              ],
            }),

            // Columna Derecha: Tabla interna con líneas divisorias en cada sección
            new TableCell({
              width: { size: 5225, type: WidthType.DXA },
              margins: { top: 0, bottom: 0, left: 0, right: 0 },
              verticalAlign: VerticalAlign.TOP,
              children: [
                new Table({
                  width: { size: 5225, type: WidthType.DXA },
                  borders: tableBordersNone,
                  rows: [
                    // Header 2. SITUACIÓN DEL ESTUDIANTE
                    new TableRow({
                      children: [
                        new TableCell({
                          borders: { bottom: cellBorder },
                          margins: { top: 40, bottom: 40, left: 60, right: 60 },
                          children: [
                            new Paragraph({
                              children: [new TextRun({ text: "2. SITUACIÓN DEL ESTUDIANTE", bold: true, font: FONT_NAME, size: FONT_SIZE_SM })],
                            }),
                          ],
                        }),
                      ],
                    }),
                    // Relación familiar
                    new TableRow({
                      children: [
                        new TableCell({
                          borders: { bottom: cellBorder },
                          margins: { top: 30, bottom: 30, left: 60, right: 60 },
                          children: [
                            new Paragraph({
                              children: [new TextRun({ text: "Relación Familiar:", bold: true, font: FONT_NAME, size: FONT_SIZE_XS })],
                              spacing: { after: 15 },
                            }),
                            new Paragraph({
                              children: [new TextRun({ text: familyText, font: FONT_NAME, size: FONT_SIZE_XS })],
                            }),
                          ],
                        }),
                      ],
                    }),
                    // Estado emocional
                    new TableRow({
                      children: [
                        new TableCell({
                          borders: { bottom: cellBorder },
                          margins: { top: 30, bottom: 30, left: 60, right: 60 },
                          children: [
                            new Paragraph({
                              children: [new TextRun({ text: "Estado emocional:", bold: true, font: FONT_NAME, size: FONT_SIZE_XS })],
                              spacing: { after: 15 },
                            }),
                            new Paragraph({
                              children: [new TextRun({ text: emoText1, font: FONT_NAME, size: FONT_SIZE_XS })],
                              spacing: { after: 15 },
                            }),
                            new Paragraph({
                              children: [new TextRun({ text: emoText2, font: FONT_NAME, size: FONT_SIZE_XS })],
                            }),
                          ],
                        }),
                      ],
                    }),
                    // Relaciones sociales
                    new TableRow({
                      children: [
                        new TableCell({
                          borders: { bottom: cellBorder },
                          margins: { top: 30, bottom: 30, left: 60, right: 60 },
                          children: [
                            new Paragraph({
                              children: [new TextRun({ text: "Relaciones sociales:", bold: true, font: FONT_NAME, size: FONT_SIZE_XS })],
                              spacing: { after: 15 },
                            }),
                            new Paragraph({
                              children: [new TextRun({ text: socText, font: FONT_NAME, size: FONT_SIZE_XS })],
                            }),
                          ],
                        }),
                      ],
                    }),
                    // Bullying
                    new TableRow({
                      children: [
                        new TableCell({
                          borders: { bottom: cellBorder },
                          margins: { top: 30, bottom: 30, left: 60, right: 60 },
                          children: [
                            new Paragraph({
                              children: [new TextRun({ text: bullyingText, bold: true, font: FONT_NAME, size: FONT_SIZE_XS })],
                            }),
                          ],
                        }),
                      ],
                    }),
                    // Antecedentes académicos
                    new TableRow({
                      children: [
                        new TableCell({
                          borders: { bottom: cellBorder },
                          margins: { top: 30, bottom: 30, left: 60, right: 60 },
                          children: [
                            new Paragraph({
                              children: [new TextRun({ text: "Antecedentes académicos:", bold: true, font: FONT_NAME, size: FONT_SIZE_XS })],
                              spacing: { after: 15 },
                            }),
                            new Paragraph({
                              children: [new TextRun({ text: acadText, font: FONT_NAME, size: FONT_SIZE_XS })],
                            }),
                          ],
                        }),
                      ],
                    }),
                    // 3. RECOMENDACIONES
                    new TableRow({
                      children: [
                        new TableCell({
                          borders: { bottom: cellBorder },
                          margins: { top: 40, bottom: 40, left: 60, right: 60 },
                          children: [
                            new Paragraph({
                              children: [new TextRun({ text: "3. RECOMENDACIONES", bold: true, font: FONT_NAME, size: FONT_SIZE_SM })],
                              spacing: { after: 30 },
                            }),
                            ...((interview.recommendations || "—").split("\n").map((line: string) =>
                              new Paragraph({
                                alignment: AlignmentType.JUSTIFIED,
                                children: [new TextRun({ text: line || " ", font: FONT_NAME, size: FONT_SIZE_XS })],
                                spacing: { after: 20 },
                              })
                            )),
                          ],
                        }),
                      ],
                    }),
                    // 4. COMPROMISO
                    new TableRow({
                      children: [
                        new TableCell({
                          margins: { top: 40, bottom: 40, left: 60, right: 60 },
                          children: [
                            new Paragraph({
                              children: [new TextRun({ text: "4. COMPROMISO", bold: true, font: FONT_NAME, size: FONT_SIZE_SM })],
                              spacing: { after: 30 },
                            }),
                            ...((interview.commitment || "—").split("\n").map((line: string) =>
                              new Paragraph({
                                alignment: AlignmentType.JUSTIFIED,
                                children: [new TextRun({ text: line || " ", font: FONT_NAME, size: FONT_SIZE_XS })],
                                spacing: { after: 20 },
                              })
                            )),
                          ],
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
    })
  );

  children.push(new Paragraph({ spacing: { after: 140 } }));

  // Firmas de Responsabilidad triples
  const roleLabel = analystRole || "PROFESIONAL DECE";
  children.push(
    new Table({
      width: { size: 9500, type: WidthType.DXA },
      borders: tableBordersNone,
      rows: [
        new TableRow({
          children: [
            // Profesional DECE
            new TableCell({
              width: { size: 3000, type: WidthType.DXA },
              verticalAlign: VerticalAlign.BOTTOM,
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "___________________________", font: FONT_NAME, size: FONT_SIZE_SM })], spacing: { after: 30 } }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: roleLabel.toUpperCase(), bold: true, font: FONT_NAME, size: FONT_SIZE_SM })] }),
                ...(professionalName ? [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: professionalName, font: FONT_NAME, size: FONT_SIZE_XS })] })] : []),
              ],
            }),

            // Representante
            new TableCell({
              width: { size: 3800, type: WidthType.DXA },
              verticalAlign: VerticalAlign.BOTTOM,
              margins: { left: 100, right: 100 },
              children: [
                new Paragraph({ children: [new TextRun({ text: "REPRESENTANTE", bold: true, font: FONT_NAME, size: FONT_SIZE_SM })], spacing: { after: 30 } }),
                new Paragraph({ children: [new TextRun({ text: "NOMBRE: ___________________________", font: FONT_NAME, size: FONT_SIZE_XS })], spacing: { after: 15 } }),
                new Paragraph({ children: [new TextRun({ text: "CI: _______________________________", font: FONT_NAME, size: FONT_SIZE_XS })], spacing: { after: 15 } }),
                new Paragraph({ children: [new TextRun({ text: "TELÉFONO: _________________________", font: FONT_NAME, size: FONT_SIZE_XS })], spacing: { after: 15 } }),
                new Paragraph({ children: [new TextRun({ text: "FIRMA: ____________________________", font: FONT_NAME, size: FONT_SIZE_XS })] }),
              ],
            }),

            // Estudiante
            new TableCell({
              width: { size: 2700, type: WidthType.DXA },
              verticalAlign: VerticalAlign.BOTTOM,
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "___________________________", font: FONT_NAME, size: FONT_SIZE_SM })], spacing: { after: 30 } }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "ESTUDIANTE", bold: true, font: FONT_NAME, size: FONT_SIZE_SM })] }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 800, bottom: 800, left: 1000, right: 1000 },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}


/**
 * Generador nativo DOCX para el Plan de Atención Psicosocial y Seguimiento
 * Calca fiel 100% a la previsualización ministerial
 */
export async function generateCarePlanDocx(opts: {
  plan: any;
  student: any;
  institution?: any;
  professional?: any;
  analystRole?: string;
}): Promise<Buffer> {
  const { plan, student, institution, professional, analystRole } = opts;
  const FONT_NAME = "Arial";
  const FONT_SIZE = 18; // 9pt
  const FONT_SIZE_SM = 16; // 8pt
  const FONT_SIZE_XS = 14; // 7pt
  const HEADER_BLUE = "2F5496";

  const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" };
  const tableBorders = {
    top: cellBorder,
    bottom: cellBorder,
    left: cellBorder,
    right: cellBorder,
    insideHorizontal: cellBorder,
    insideVertical: cellBorder,
  };
  const tableBordersNone = {
    top: { style: BorderStyle.NONE, size: 0, color: "auto" },
    bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
    left: { style: BorderStyle.NONE, size: 0, color: "auto" },
    right: { style: BorderStyle.NONE, size: 0, color: "auto" },
    insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
    insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
  };

  const logoBuffer = getImageBuffer("institution-logo-default.png") || getImageBuffer("mineduc-logo.png");
  const courseFormatted = formatStudentCourseFull(student) || `${student.course || ""} ${student.parallel || ""}`.trim();
  const interventionTypes: string[] = typeof plan.intervention_types === "string" ? (() => { try { return JSON.parse(plan.intervention_types); } catch { return []; } })() : (plan.intervention_types || []);
  const actions = parseCarePlanActions(typeof plan.actions === "string" ? plan.actions : JSON.stringify(plan.actions || []));

  const children: (Paragraph | Table)[] = [];

  // Cabecera institucional
  children.push(
    new Table({
      width: { size: 9500, type: WidthType.DXA },
      borders: tableBordersNone,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 1400, type: WidthType.DXA },
              children: [
                new Paragraph({
                  children: logoBuffer
                    ? [new ImageRun({ data: logoBuffer, transformation: { width: 50, height: 50 }, type: "png" })]
                    : [new TextRun({ text: "[Logo]", font: FONT_NAME, size: FONT_SIZE_SM, color: "999999" })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 8100, type: WidthType.DXA },
              verticalAlign: VerticalAlign.CENTER,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: "Plan de Atención Psicosocial y Seguimiento",
                      bold: true,
                      font: FONT_NAME,
                      size: 24,
                      color: HEADER_BLUE,
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: "Departamento de Consejería Estudiantil",
                      font: FONT_NAME,
                      size: FONT_SIZE_SM,
                      color: "4A5568",
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: institution?.name || "Institución Educativa",
                      font: FONT_NAME,
                      size: FONT_SIZE_XS,
                      color: "64748B",
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  children.push(new Paragraph({ spacing: { after: 60 } }));

  // Tabla informativa (4 columnas)
  children.push(
    new Table({
      width: { size: 9500, type: WidthType.DXA },
      borders: tableBorders,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 2400, type: WidthType.DXA },
              shading: { fill: "F1F5F9" },
              margins: { top: 40, bottom: 40, left: 60, right: 60 },
              children: [new Paragraph({ children: [new TextRun({ text: "Estudiante a atender", bold: true, font: FONT_NAME, size: FONT_SIZE_XS })] })],
            }),
            new TableCell({
              width: { size: 2800, type: WidthType.DXA },
              margins: { top: 40, bottom: 40, left: 60, right: 60 },
              children: [new Paragraph({ children: [new TextRun({ text: student.full_name, font: FONT_NAME, size: FONT_SIZE_XS })] })],
            }),
            new TableCell({
              width: { size: 1900, type: WidthType.DXA },
              shading: { fill: "F1F5F9" },
              margins: { top: 40, bottom: 40, left: 60, right: 60 },
              children: [new Paragraph({ children: [new TextRun({ text: "Grado/curso", bold: true, font: FONT_NAME, size: FONT_SIZE_XS })] })],
            }),
            new TableCell({
              width: { size: 2400, type: WidthType.DXA },
              margins: { top: 40, bottom: 40, left: 60, right: 60 },
              children: [new Paragraph({ children: [new TextRun({ text: courseFormatted, font: FONT_NAME, size: FONT_SIZE_XS })] })],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: 2400, type: WidthType.DXA },
              shading: { fill: "F1F5F9" },
              margins: { top: 40, bottom: 40, left: 60, right: 60 },
              children: [new Paragraph({ children: [new TextRun({ text: "Jornada", bold: true, font: FONT_NAME, size: FONT_SIZE_XS })] })],
            }),
            new TableCell({
              width: { size: 2800, type: WidthType.DXA },
              margins: { top: 40, bottom: 40, left: 60, right: 60 },
              children: [new Paragraph({ children: [new TextRun({ text: plan.jornada || "—", font: FONT_NAME, size: FONT_SIZE_XS })] })],
            }),
            new TableCell({
              width: { size: 1900, type: WidthType.DXA },
              shading: { fill: "F1F5F9" },
              margins: { top: 40, bottom: 40, left: 60, right: 60 },
              children: [new Paragraph({ children: [new TextRun({ text: "Fecha de elaboración", bold: true, font: FONT_NAME, size: FONT_SIZE_XS })] })],
            }),
            new TableCell({
              width: { size: 2400, type: WidthType.DXA },
              margins: { top: 40, bottom: 40, left: 60, right: 60 },
              children: [new Paragraph({ children: [new TextRun({ text: formatDate(plan.plan_date), font: FONT_NAME, size: FONT_SIZE_XS })] })],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: 2400, type: WidthType.DXA },
              shading: { fill: "F1F5F9" },
              margins: { top: 40, bottom: 40, left: 60, right: 60 },
              children: [new Paragraph({ children: [new TextRun({ text: "Docente tutor/a", bold: true, font: FONT_NAME, size: FONT_SIZE_XS })] })],
            }),
            new TableCell({
              width: { size: 2800, type: WidthType.DXA },
              margins: { top: 40, bottom: 40, left: 60, right: 60 },
              children: [new Paragraph({ children: [new TextRun({ text: plan.tutor_name || "—", font: FONT_NAME, size: FONT_SIZE_XS })] })],
            }),
            new TableCell({
              width: { size: 1900, type: WidthType.DXA },
              shading: { fill: "F1F5F9" },
              margins: { top: 40, bottom: 40, left: 60, right: 60 },
              children: [new Paragraph({ children: [new TextRun({ text: "Profesional DECE", bold: true, font: FONT_NAME, size: FONT_SIZE_XS })] })],
            }),
            new TableCell({
              width: { size: 2400, type: WidthType.DXA },
              margins: { top: 40, bottom: 40, left: 60, right: 60 },
              children: [new Paragraph({ children: [new TextRun({ text: professional?.name || "—", font: FONT_NAME, size: FONT_SIZE_XS })] })],
            }),
          ],
        }),
      ],
    })
  );

  children.push(new Paragraph({ spacing: { after: 80 } }));

  // Helper banner azul
  const createBlueBanner = (titleText: string) =>
    new Table({
      width: { size: 9500, type: WidthType.DXA },
      borders: tableBordersNone,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 9500, type: WidthType.DXA },
              shading: { fill: HEADER_BLUE },
              margins: { top: 40, bottom: 40, left: 80, right: 80 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: titleText, bold: true, font: FONT_NAME, size: FONT_SIZE_SM, color: "FFFFFF" })],
                }),
              ],
            }),
          ],
        }),
      ],
    });

  // Sección 1: Resumen del diagnóstico situacional
  children.push(createBlueBanner("RESUMEN DEL DIAGNÓSTICO SITUACIONAL"));
  children.push(new Paragraph({ spacing: { after: 30 } }));
  children.push(
    new Paragraph({
      alignment: smartAlign(String((plan.diagnosis_summary || "Sin registrar.") ?? "")),
      children: [new TextRun({ text: plan.diagnosis_summary || "Sin registrar.", font: FONT_NAME, size: FONT_SIZE_SM })],
      spacing: { after: 80 },
    })
  );

  // Sección 2: Tipo(s) de intervención psicosocial
  children.push(createBlueBanner("TIPO(S) DE INTERVENCIÓN PSICOSOCIAL A REALIZAR"));
  children.push(new Paragraph({ spacing: { after: 30 } }));
  INTERVENTION_TYPE_OPTIONS.forEach((opt) => {
    const isChecked = interventionTypes.includes(opt.value);
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: isChecked ? "[X] " : "[  ] ", bold: isChecked, font: FONT_NAME, size: FONT_SIZE_SM }),
          new TextRun({ text: opt.label, bold: isChecked, font: FONT_NAME, size: FONT_SIZE_SM }),
        ],
        spacing: { after: 20 },
      })
    );
  });
  children.push(new Paragraph({ spacing: { after: 60 } }));

  // Sección 3: Acciones para implementar
  children.push(createBlueBanner("ACCIONES PARA IMPLEMENTAR"));
  children.push(new Paragraph({ spacing: { after: 30 } }));

  const actionRows = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 3600, type: WidthType.DXA },
          shading: { fill: HEADER_BLUE },
          margins: { top: 40, bottom: 40, left: 60, right: 60 },
          children: [new Paragraph({ children: [new TextRun({ text: "Acción", bold: true, font: FONT_NAME, size: FONT_SIZE_XS, color: "FFFFFF" })] })],
        }),
        new TableCell({
          width: { size: 2200, type: WidthType.DXA },
          shading: { fill: HEADER_BLUE },
          margins: { top: 40, bottom: 40, left: 60, right: 60 },
          children: [new Paragraph({ children: [new TextRun({ text: "Profesional", bold: true, font: FONT_NAME, size: FONT_SIZE_XS, color: "FFFFFF" })] })],
        }),
        new TableCell({
          width: { size: 1400, type: WidthType.DXA },
          shading: { fill: HEADER_BLUE },
          margins: { top: 40, bottom: 40, left: 60, right: 60 },
          children: [new Paragraph({ children: [new TextRun({ text: "Tiempo", bold: true, font: FONT_NAME, size: FONT_SIZE_XS, color: "FFFFFF" })] })],
        }),
        new TableCell({
          width: { size: 2300, type: WidthType.DXA },
          shading: { fill: HEADER_BLUE },
          margins: { top: 40, bottom: 40, left: 60, right: 60 },
          children: [new Paragraph({ children: [new TextRun({ text: "Observaciones", bold: true, font: FONT_NAME, size: FONT_SIZE_XS, color: "FFFFFF" })] })],
        }),
      ],
    }),
  ];

  if (actions.length === 0) {
    actionRows.push(
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 4,
            width: { size: 9500, type: WidthType.DXA },
            margins: { top: 40, bottom: 40, left: 60, right: 60 },
            children: [new Paragraph({ children: [new TextRun({ text: "Sin acciones registradas.", font: FONT_NAME, size: FONT_SIZE_XS, color: "94A3B8" })] })],
          }),
        ],
      })
    );
  } else {
    actions.forEach((a) => {
      actionRows.push(
        new TableRow({
          children: [
            new TableCell({
              width: { size: 3600, type: WidthType.DXA },
              margins: { top: 40, bottom: 40, left: 60, right: 60 },
              children: [new Paragraph({ children: [new TextRun({ text: a.accion || "—", font: FONT_NAME, size: FONT_SIZE_XS })] })],
            }),
            new TableCell({
              width: { size: 2200, type: WidthType.DXA },
              margins: { top: 40, bottom: 40, left: 60, right: 60 },
              children: [new Paragraph({ children: [new TextRun({ text: a.profesional || "—", font: FONT_NAME, size: FONT_SIZE_XS })] })],
            }),
            new TableCell({
              width: { size: 1400, type: WidthType.DXA },
              margins: { top: 40, bottom: 40, left: 60, right: 60 },
              children: [new Paragraph({ children: [new TextRun({ text: a.tiempo || "—", font: FONT_NAME, size: FONT_SIZE_XS })] })],
            }),
            new TableCell({
              width: { size: 2300, type: WidthType.DXA },
              margins: { top: 40, bottom: 40, left: 60, right: 60 },
              children: [new Paragraph({ children: [new TextRun({ text: a.observaciones || "—", font: FONT_NAME, size: FONT_SIZE_XS })] })],
            }),
          ],
        })
      );
    });
  }

  children.push(
    new Table({
      width: { size: 9500, type: WidthType.DXA },
      borders: tableBorders,
      rows: actionRows,
    })
  );

  children.push(new Paragraph({ spacing: { after: 80 } }));

  // Nota de confidencialidad
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "La información registrada en este documento es confidencial y de uso exclusivo del Departamento de Consejería Estudiantil.",
          italics: true,
          font: FONT_NAME,
          size: FONT_SIZE_XS,
          color: "64748B",
        }),
      ],
      spacing: { after: 140 },
    })
  );

  // Firma
  const dynamicRole = analystRole || "PROFESIONAL DECE";
  children.push(
    new Table({
      width: { size: 9500, type: WidthType.DXA },
      borders: tableBordersNone,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 9500, type: WidthType.DXA },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: "____________________________________", font: FONT_NAME, size: FONT_SIZE_SM })],
                  spacing: { after: 30 },
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: `FIRMA ${dynamicRole.toUpperCase()}`, bold: true, font: FONT_NAME, size: FONT_SIZE_SM })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: professional?.name || "—", font: FONT_NAME, size: FONT_SIZE_XS, color: "475569" })],
                }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 800, bottom: 800, left: 1000, right: 1000 },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}


/**
 * Generador nativo DOCX para el Acta de Socialización de Estudiantes en Situación de Vulnerabilidad
 * Incluye cabecera ministerial, base legal, nuevo apartado de Estrategias Psicosociales, acuerdos y firmas completas
 */
export async function generateSocializationActDocx(opts: {
  act: any;
  student: any;
  institution?: any;
  analystRole?: string;
}): Promise<Buffer> {
  const { act, student, institution, analystRole } = opts;
  const FONT_NAME = "Arial";
  const FONT_SIZE = 18; // 9pt
  const FONT_SIZE_SM = 16; // 8pt
  const FONT_SIZE_XS = 14; // 7pt
  const HEADER_BLUE = "2F5496";

  const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" };
  const tableBorders = {
    top: cellBorder,
    bottom: cellBorder,
    left: cellBorder,
    right: cellBorder,
    insideHorizontal: cellBorder,
    insideVertical: cellBorder,
  };
  const tableBordersNone = {
    top: { style: BorderStyle.NONE, size: 0, color: "auto" },
    bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
    left: { style: BorderStyle.NONE, size: 0, color: "auto" },
    right: { style: BorderStyle.NONE, size: 0, color: "auto" },
    insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
    insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
  };

  const logoBuffer = getImageBuffer("institution-logo-default.png") || getImageBuffer("mineduc-logo.png");
  const courseFormatted = formatStudentCourseFull(student) || `${student.course || ""} ${student.parallel || ""}`.trim();

  const agreements: string[] = typeof act.agreements === "string" ? (() => { try { return JSON.parse(act.agreements); } catch { return []; } })() : (act.agreements || []);
  const teacherSignatures: { asignatura: string; docente: string }[] = typeof act.teacher_signatures === "string" ? (() => { try { return JSON.parse(act.teacher_signatures); } catch { return []; } })() : (act.teacher_signatures || []);

  const children: (Paragraph | Table)[] = [];

  // Cabecera institucional
  children.push(
    new Table({
      width: { size: 9500, type: WidthType.DXA },
      borders: tableBordersNone,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 1400, type: WidthType.DXA },
              children: [
                new Paragraph({
                  children: logoBuffer
                    ? [new ImageRun({ data: logoBuffer, transformation: { width: 50, height: 50 }, type: "png" })]
                    : [new TextRun({ text: "[Logo]", font: FONT_NAME, size: FONT_SIZE_SM, color: "999999" })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 8100, type: WidthType.DXA },
              verticalAlign: VerticalAlign.CENTER,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: "Acta de Socialización de Estudiantes en Situación de Vulnerabilidad",
                      bold: true,
                      font: FONT_NAME,
                      size: 22,
                      color: HEADER_BLUE,
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: "Departamento de Consejería Estudiantil",
                      font: FONT_NAME,
                      size: FONT_SIZE_SM,
                      color: "4A5568",
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: `${institution?.name || "Institución Educativa"} · Fecha del acta: ${formatDate(act.act_date)}${act.act_place ? ` · Lugar: ${act.act_place}` : ""}`,
                      font: FONT_NAME,
                      size: FONT_SIZE_XS,
                      color: "64748B",
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  children.push(new Paragraph({ spacing: { after: 50 } }));

  // Cuadro de base normativa
  children.push(
    new Table({
      width: { size: 9500, type: WidthType.DXA },
      borders: tableBorders,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 9500, type: WidthType.DXA },
              shading: { fill: "F8FAFC" },
              margins: { top: 40, bottom: 40, left: 60, right: 60 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.JUSTIFIED,
                  children: [
                    new TextRun({
                      text: NORMATIVE_TEXT,
                      font: FONT_NAME,
                      size: 13, // 6.5pt
                      color: "475569",
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  children.push(new Paragraph({ spacing: { after: 50 } }));

  // Texto introductorio del estudiante
  children.push(
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      children: [
        new TextRun({ text: "Con este antecedente me permito indicar que, por medio de la presente acta, se da a conocer que a la estudiante/el estudiante ", font: FONT_NAME, size: FONT_SIZE_SM }),
        new TextRun({ text: student.full_name, bold: true, font: FONT_NAME, size: FONT_SIZE_SM }),
        new TextRun({ text: ", quien cursa el ", font: FONT_NAME, size: FONT_SIZE_SM }),
        new TextRun({ text: courseFormatted, bold: true, font: FONT_NAME, size: FONT_SIZE_SM }),
        new TextRun({ text: `, se encuentra recibiendo atención psicosocial por parte del Departamento de Consejería Estudiantil de la ${institution?.name || "institución educativa"}, por encontrarse en situación de vulnerabilidad; dificultades `, font: FONT_NAME, size: FONT_SIZE_SM }),
        new TextRun({ text: act.vulnerability_type || "—", bold: true, font: FONT_NAME, size: FONT_SIZE_SM }),
        new TextRun({ text: ".", font: FONT_NAME, size: FONT_SIZE_SM }),
      ],
      spacing: { after: 60 },
    })
  );

  // Helper banner azul
  const createBlueBanner = (titleText: string) =>
    new Table({
      width: { size: 9500, type: WidthType.DXA },
      borders: tableBordersNone,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 9500, type: WidthType.DXA },
              shading: { fill: HEADER_BLUE },
              margins: { top: 40, bottom: 40, left: 80, right: 80 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: titleText, bold: true, font: FONT_NAME, size: FONT_SIZE_SM, color: "FFFFFF" })],
                }),
              ],
            }),
          ],
        }),
      ],
    });

  // APARTADO: ESTRATEGIAS PARA EL ACOMPAÑAMIENTO SOCIOEMOCIONAL
  children.push(createBlueBanner("ESTRATEGIAS PARA EL ACOMPAÑAMIENTO SOCIOEMOCIONAL"));
  children.push(new Paragraph({ spacing: { after: 30 } }));
  children.push(
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      children: [
        new TextRun({
          text: act.psychosocial_strategies || "Sin registrar.",
          font: FONT_NAME,
          size: FONT_SIZE_SM,
        }),
      ],
      spacing: { after: 60 },
    })
  );

  // Apartado: ACUERDOS
  children.push(createBlueBanner("ACUERDOS"));
  children.push(new Paragraph({ spacing: { after: 30 } }));
  if (agreements.length === 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "Sin registrar.", font: FONT_NAME, size: FONT_SIZE_SM, color: "94A3B8" })],
        spacing: { after: 30 },
      })
    );
  } else {
    agreements.forEach((a) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: "• ", bold: true, font: FONT_NAME, size: FONT_SIZE_SM }),
            new TextRun({ text: a, font: FONT_NAME, size: FONT_SIZE_SM }),
          ],
          spacing: { after: 20 },
        })
      );
    });
  }
  const adaptationText = formatCurricularAdaptationText(act.curricular_adaptation_grade);
  if (adaptationText) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: "• ", bold: true, font: FONT_NAME, size: FONT_SIZE_SM }),
          new TextRun({ text: adaptationText, font: FONT_NAME, size: FONT_SIZE_SM }),
        ],
        spacing: { after: 20 },
      })
    );
  }

  // Acuerdo adicional a mano
  children.push(new Paragraph({ spacing: { before: 80, after: 30 } }));
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Acuerdo adicional acordado en la socialización (a completar a mano):",
          bold: true,
          font: FONT_NAME,
          size: FONT_SIZE_SM,
          color: "334155",
        }),
      ],
      spacing: { after: 30 },
    })
  );
  for (let i = 0; i < 3; i++) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "____________________________________________________________________________________________________",
            font: FONT_NAME,
            size: FONT_SIZE_SM,
            color: "94A3B8",
          }),
        ],
        spacing: { after: 30 },
      })
    );
  }

  children.push(new Paragraph({ spacing: { after: 60 } }));

  // Apartado: FIRMAS DE RESPONSABILIDAD (Docentes)
  children.push(createBlueBanner("FIRMAS DE RESPONSABILIDAD"));
  children.push(new Paragraph({ spacing: { after: 30 } }));

  const teacherRows = [
    new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: [
        new TableCell({
          width: { size: 2800, type: WidthType.DXA },
          shading: { fill: HEADER_BLUE },
          margins: { top: 40, bottom: 40, left: 60, right: 60 },
          children: [new Paragraph({ children: [new TextRun({ text: "Asignatura", bold: true, font: FONT_NAME, size: FONT_SIZE_XS, color: "FFFFFF" })] })],
        }),
        new TableCell({
          width: { size: 3400, type: WidthType.DXA },
          shading: { fill: HEADER_BLUE },
          margins: { top: 40, bottom: 40, left: 60, right: 60 },
          children: [new Paragraph({ children: [new TextRun({ text: "Nombre del docente", bold: true, font: FONT_NAME, size: FONT_SIZE_XS, color: "FFFFFF" })] })],
        }),
        new TableCell({
          width: { size: 1800, type: WidthType.DXA },
          shading: { fill: HEADER_BLUE },
          margins: { top: 40, bottom: 40, left: 60, right: 60 },
          children: [new Paragraph({ children: [new TextRun({ text: "Firma", bold: true, font: FONT_NAME, size: FONT_SIZE_XS, color: "FFFFFF" })] })],
        }),
        new TableCell({
          width: { size: 1500, type: WidthType.DXA },
          shading: { fill: HEADER_BLUE },
          margins: { top: 40, bottom: 40, left: 60, right: 60 },
          children: [new Paragraph({ children: [new TextRun({ text: "Cédula", bold: true, font: FONT_NAME, size: FONT_SIZE_XS, color: "FFFFFF" })] })],
        }),
      ],
    }),
  ];

  const rowsToExport = teacherSignatures.length >= 6
    ? teacherSignatures
    : [
        ...teacherSignatures,
        ...Array.from({ length: 6 - teacherSignatures.length }).map(() => ({ asignatura: "", docente: "" })),
      ];

  rowsToExport.forEach((t) => {
    teacherRows.push(
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: 2800, type: WidthType.DXA },
            margins: { top: 60, bottom: 60, left: 60, right: 60 },
            children: [new Paragraph({ children: [new TextRun({ text: t.asignatura || "", font: FONT_NAME, size: FONT_SIZE_XS })] })],
          }),
          new TableCell({
            width: { size: 3400, type: WidthType.DXA },
            margins: { top: 60, bottom: 60, left: 60, right: 60 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: t.docente || (t.asignatura ? "................................................" : ""),
                    font: FONT_NAME,
                    size: FONT_SIZE_XS,
                    color: t.docente ? "000000" : "94A3B8",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 1800, type: WidthType.DXA },
            margins: { top: 60, bottom: 60, left: 60, right: 60 },
            children: [new Paragraph({ text: "" })],
          }),
          new TableCell({
            width: { size: 1500, type: WidthType.DXA },
            margins: { top: 60, bottom: 60, left: 60, right: 60 },
            children: [new Paragraph({ text: "" })],
          }),
        ],
      })
    );
  });

  children.push(
    new Table({
      width: { size: 9500, type: WidthType.DXA },
      borders: tableBorders,
      rows: teacherRows,
    })
  );

  children.push(new Paragraph({ spacing: { after: 40 } }));

  // Nota digital
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "NOTA: El presente documento será enviado de manera digital a los correos institucionales.",
          font: FONT_NAME,
          size: FONT_SIZE_XS,
          color: "64748B",
        }),
      ],
      spacing: { after: 40 },
    })
  );

  // Texto de confidencialidad
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: SOCIALIZATION_CONFIDENTIALITY_TEXT,
          italics: true,
          font: FONT_NAME,
          size: 13,
          color: "64748B",
        }),
      ],
      spacing: { after: 60 },
    })
  );

  // Firmas institucionales (Tabla de 4 columnas)
  children.push(
    new Table({
      width: { size: 9500, type: WidthType.DXA },
      borders: tableBorders,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 2800, type: WidthType.DXA },
              shading: { fill: HEADER_BLUE },
              margins: { top: 40, bottom: 40, left: 60, right: 60 },
              children: [new Paragraph({ children: [new TextRun({ text: "Rol", bold: true, font: FONT_NAME, size: FONT_SIZE_XS, color: "FFFFFF" })] })],
            }),
            new TableCell({
              width: { size: 3300, type: WidthType.DXA },
              shading: { fill: HEADER_BLUE },
              margins: { top: 40, bottom: 40, left: 60, right: 60 },
              children: [new Paragraph({ children: [new TextRun({ text: "Nombre", bold: true, font: FONT_NAME, size: FONT_SIZE_XS, color: "FFFFFF" })] })],
            }),
            new TableCell({
              width: { size: 2000, type: WidthType.DXA },
              shading: { fill: HEADER_BLUE },
              margins: { top: 40, bottom: 40, left: 60, right: 60 },
              children: [new Paragraph({ children: [new TextRun({ text: "Firma", bold: true, font: FONT_NAME, size: FONT_SIZE_XS, color: "FFFFFF" })] })],
            }),
            new TableCell({
              width: { size: 1400, type: WidthType.DXA },
              shading: { fill: HEADER_BLUE },
              margins: { top: 40, bottom: 40, left: 60, right: 60 },
              children: [new Paragraph({ children: [new TextRun({ text: "Fecha", bold: true, font: FONT_NAME, size: FONT_SIZE_XS, color: "FFFFFF" })] })],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: 2800, type: WidthType.DXA },
              margins: { top: 40, bottom: 40, left: 60, right: 60 },
              children: [new Paragraph({ children: [new TextRun({ text: "Desarrollo del documento", bold: true, font: FONT_NAME, size: FONT_SIZE_XS })] })],
            }),
            new TableCell({
              width: { size: 3300, type: WidthType.DXA },
              margins: { top: 40, bottom: 40, left: 60, right: 60 },
              children: [new Paragraph({ children: [new TextRun({ text: act.prepared_by_name || "—", font: FONT_NAME, size: FONT_SIZE_XS })] })],
            }),
            new TableCell({ width: { size: 2000, type: WidthType.DXA }, margins: { top: 40, bottom: 40, left: 60, right: 60 }, children: [new Paragraph({ text: "" })] }),
            new TableCell({
              width: { size: 1400, type: WidthType.DXA },
              margins: { top: 40, bottom: 40, left: 60, right: 60 },
              children: [new Paragraph({ children: [new TextRun({ text: formatDate(act.act_date), font: FONT_NAME, size: FONT_SIZE_XS })] })],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: 2800, type: WidthType.DXA },
              margins: { top: 40, bottom: 40, left: 60, right: 60 },
              children: [
                new Paragraph({ children: [new TextRun({ text: "Aprobación del documento", bold: true, font: FONT_NAME, size: FONT_SIZE_XS })] }),
                new Paragraph({ children: [new TextRun({ text: "Rectora/Rector", font: FONT_NAME, size: 12, color: "64748B" })] }),
              ],
            }),
            new TableCell({
              width: { size: 3300, type: WidthType.DXA },
              margins: { top: 40, bottom: 40, left: 60, right: 60 },
              children: [new Paragraph({ children: [new TextRun({ text: act.approved_by_name || "—", font: FONT_NAME, size: FONT_SIZE_XS })] })],
            }),
            new TableCell({ width: { size: 2000, type: WidthType.DXA }, margins: { top: 40, bottom: 40, left: 60, right: 60 }, children: [new Paragraph({ text: "" })] }),
            new TableCell({ width: { size: 1400, type: WidthType.DXA }, margins: { top: 40, bottom: 40, left: 60, right: 60 }, children: [new Paragraph({ text: "" })] }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: 2800, type: WidthType.DXA },
              margins: { top: 40, bottom: 40, left: 60, right: 60 },
              children: [
                new Paragraph({ children: [new TextRun({ text: "Recibido por", bold: true, font: FONT_NAME, size: FONT_SIZE_XS })] }),
                new Paragraph({ children: [new TextRun({ text: act.received_by_role || "Tutor del curso", font: FONT_NAME, size: 12, color: "64748B" })] }),
              ],
            }),
            new TableCell({
              width: { size: 3300, type: WidthType.DXA },
              margins: { top: 40, bottom: 40, left: 60, right: 60 },
              children: [new Paragraph({ children: [new TextRun({ text: act.received_by_name || "—", font: FONT_NAME, size: FONT_SIZE_XS })] })],
            }),
            new TableCell({ width: { size: 2000, type: WidthType.DXA }, margins: { top: 40, bottom: 40, left: 60, right: 60 }, children: [new Paragraph({ text: "" })] }),
            new TableCell({ width: { size: 1400, type: WidthType.DXA }, margins: { top: 40, bottom: 40, left: 60, right: 60 }, children: [new Paragraph({ text: "" })] }),
          ],
        }),
      ],
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 800, bottom: 800, left: 1000, right: 1000 },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
