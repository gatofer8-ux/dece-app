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
import type { ConsolidatedVocationalData } from "./consolidatedVocationalReport";
import { TAPAS_FAMILIES, ARCHETYPE_MAP, type TapasFamily } from "@/lib/tapas/archetypes";
import { IPPJ_SCALE_META, IPPJ_DISCLAIMER, type IppjScale } from "./ippjInstrument";
import { studentGradeLabel } from "@/lib/studentCourse";
import { currentSchoolYearText } from "@/lib/schoolYearText";

const FONT = "Calibri";
const NAVY = "1F3864";
const BLUE_LIGHT = "DEEAF6";
const GRAY_BG = "F2F2F2";
const BORDER_COLOR = "8497B0";
const BODY_SIZE = 21; // 10.5 pt
const SMALL_SIZE = 18; // 9 pt
const TITLE_SIZE = 26; // 13 pt
const SUBTITLE_SIZE = 22; // 11 pt

const PAGE_W = 11906; // A4 twips
const MARGINS = { top: 1200, right: 1100, bottom: 1000, left: 1100, header: 460, footer: 320 };
const W = PAGE_W - MARGINS.left - MARGINS.right; // 9706 dxa

function getImgBuffer(fileName: string): Buffer | null {
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

const borderSingle = { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR };
const cellBorders = {
  top: borderSingle,
  bottom: borderSingle,
  left: borderSingle,
  right: borderSingle,
  insideHorizontal: borderSingle,
  insideVertical: borderSingle,
};

function run(text: string, o: { bold?: boolean; italics?: boolean; size?: number; color?: string } = {}) {
  return new TextRun({
    text: text || " ",
    bold: o.bold ?? false,
    italics: o.italics ?? false,
    size: o.size ?? BODY_SIZE,
    color: o.color,
    font: FONT,
  });
}

function p(runs: TextRun[], o: { after?: number; before?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) {
  return new Paragraph({
    spacing: { after: o.after ?? 100, before: o.before ?? 0, line: 260 },
    alignment: o.align ?? AlignmentType.JUSTIFIED,
    children: runs,
  });
}

function multiP(text: string | null | undefined, o: { size?: number; bold?: boolean } = {}): Paragraph[] {
  const t = (text || "").trim();
  if (!t) return [p([run("—", o)])];
  return t
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => p([run(l, o)]));
}

function secTitle(title: string): Paragraph {
  return new Paragraph({
    spacing: { before: 240, after: 100 },
    alignment: AlignmentType.LEFT,
    children: [run(title, { bold: true, size: SUBTITLE_SIZE, color: NAVY })],
  });
}

function tableCell(children: Paragraph[], o: { span?: number; width?: number; fill?: string } = {}): TableCell {
  return new TableCell({
    columnSpan: o.span ?? 1,
    width: o.width ? { size: o.width, type: WidthType.DXA } : undefined,
    shading: o.fill ? { fill: o.fill } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children,
  });
}

function th(text: string, span = 1, width?: number): TableCell {
  return tableCell(
    [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [run(text, { bold: true, size: SMALL_SIZE, color: NAVY })] })],
    { span, width, fill: BLUE_LIGHT }
  );
}

function td(text: string, o: { span?: number; width?: number; bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}): TableCell {
  return tableCell(
    [new Paragraph({ alignment: o.align ?? AlignmentType.LEFT, spacing: { after: 0 }, children: [run(text || " ", { size: SMALL_SIZE, bold: o.bold })] })],
    { span: o.span, width: o.width }
  );
}

function formatDateEC(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

export async function generateConsolidatedVocationalReportDocx(data: ConsolidatedVocationalData): Promise<Buffer> {
  const { student, institution, professional, tapasApp, tapasResult, ippjApp, ippjResult, ippjSurvey, suggestedAreas, coherenceTitle, coherenceAnalysis, recommendedCareers, evaluationDate } = data;

  const headerLogo = getImgBuffer("header_4k.png");
  const footerLogo = getImgBuffer("footer_nuevo_ecuador.png");

  // Tabla 1: Datos Informativos del Estudiante
  const studentGrade = studentGradeLabel(student);
  const infoTable = new Table({
    width: { size: W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: cellBorders,
    rows: [
      new TableRow({ children: [th("1. DATOS INFORMATIVOS DEL ESTUDIANTE Y CONTEXTO FAMILIAR", 4)] }),
      new TableRow({
        children: [
          th("Nombres y Apellidos:", 1, Math.round(W * 0.25)),
          td(student.full_name, { span: 3, bold: true }),
        ],
      }),
      new TableRow({
        children: [
          th("Cédula / Documento:", 1, Math.round(W * 0.25)),
          td(student.document_id || "No registra", { width: Math.round(W * 0.25) }),
          th("Curso / Nivel:", 1, Math.round(W * 0.25)),
          td(studentGrade || "3ro de Bachillerato", { width: Math.round(W * 0.25) }),
        ],
      }),
      new TableRow({
        children: [
          th("Especialidad Bachillerato:", 1, Math.round(W * 0.25)),
          td(student.bachillerato_specialty || "Ciencias Generales / BGU", { width: Math.round(W * 0.25) }),
          th("Fecha de Evaluación:", 1, Math.round(W * 0.25)),
          td(formatDateEC(evaluationDate), { width: Math.round(W * 0.25) }),
        ],
      }),
      new TableRow({
        children: [
          th("Representante Legal:", 1, Math.round(W * 0.25)),
          td(student.representative || "No registra", { width: Math.round(W * 0.25) }),
          th("Teléfono de Contacto:", 1, Math.round(W * 0.25)),
          td(student.rep_phone || student.mother_phone || student.father_phone || "No registra", { width: Math.round(W * 0.25) }),
        ],
      }),
      new TableRow({
        children: [
          th("Institución Educativa:", 1, Math.round(W * 0.25)),
          td(institution.name, { width: Math.round(W * 0.25) }),
          th("Profesional DECE:", 1, Math.round(W * 0.25)),
          td(professional?.name || "Equipo DECE Institucional", { width: Math.round(W * 0.25), bold: true }),
        ],
      }),
    ],
  });

  // Filas de Familias TaPas
  const tapasRows: TableRow[] = [
    new TableRow({
      children: [
        th("Familia de Talentos (TaPas)", 1, Math.round(W * 0.45)),
        th("Arquetipos Identificados", 1, Math.round(W * 0.25)),
        th("Porcentaje (%)", 1, Math.round(W * 0.3)),
      ],
    }),
  ];

  if (tapasResult && tapasResult.familias && tapasResult.familias.length > 0) {
    for (const f of tapasResult.familias) {
      const famMeta = TAPAS_FAMILIES[f.familia as TapasFamily];
      tapasRows.push(
        new TableRow({
          children: [
            td(`${famMeta?.emoji || "⭐"} ${famMeta?.label || f.familia}`, { bold: tapasResult.dominantFamilias.includes(f.familia) }),
            td(String(f.count), { align: AlignmentType.CENTER }),
            td(`${f.pct}%`, { align: AlignmentType.CENTER, bold: tapasResult.dominantFamilias.includes(f.familia) }),
          ],
        })
      );
    }
  } else {
    tapasRows.push(
      new TableRow({
        children: [
          td("Evaluación TaPas en proceso o pendiente de registro final.", { span: 3, align: AlignmentType.CENTER }),
        ],
      })
    );
  }

  const tapasTable = new Table({
    width: { size: W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: cellBorders,
    rows: tapasRows,
  });

  // Filas de Escalas IPPJ (Holland RIASEC)
  const ippjRows: TableRow[] = [
    new TableRow({
      children: [
        th("Dimensión RIASEC (Holland)", 1, Math.round(W * 0.4)),
        th("Puntaje Directo", 1, Math.round(W * 0.2)),
        th("Puntaje STEN (1–10)", 1, Math.round(W * 0.2)),
        th("Nivel de Preferencia", 1, Math.round(W * 0.2)),
      ],
    }),
  ];

  if (ippjResult && ippjResult.scales) {
    for (const sc of ippjResult.scales) {
      const meta = IPPJ_SCALE_META[sc.scale];
      const isDominant = ippjResult.topTypes.includes(sc.scale);
      ippjRows.push(
        new TableRow({
          children: [
            td(`${meta.label} (${meta.letter})`, { bold: isDominant }),
            td(String(sc.raw), { align: AlignmentType.CENTER }),
            td(`STEN ${sc.sten}`, { align: AlignmentType.CENTER, bold: isDominant }),
            td(sc.level, { align: AlignmentType.CENTER, bold: isDominant }),
          ],
        })
      );
    }
  } else {
    ippjRows.push(
      new TableRow({
        children: [
          td("Evaluación IPPJ en proceso o pendiente de registro final.", { span: 4, align: AlignmentType.CENTER }),
        ],
      })
    );
  }

  const ippjTable = new Table({
    width: { size: W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: cellBorders,
    rows: ippjRows,
  });

  // Matriz de Coherencia Vocacional (Cruce TaPas ⨉ IPPJ)
  const coherenceTable = new Table({
    width: { size: W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: cellBorders,
    rows: [
      new TableRow({ children: [th("5. MATRIZ DE COHERENCIA Y SÍNTESIS INTEGRADA (TaPas ⨉ IPPJ)", 2)] }),
      new TableRow({
        children: [
          th("Dictamen de Coherencia:", 1, Math.round(W * 0.3)),
          td(coherenceTitle, { width: Math.round(W * 0.7), bold: true }),
        ],
      }),
      new TableRow({
        children: [
          th("Análisis de Sinergia Vocacional:", 1, Math.round(W * 0.3)),
          td(coherenceAnalysis, { width: Math.round(W * 0.7) }),
        ],
      }),
      new TableRow({
        children: [
          th("Código Vocacional Holland:", 1, Math.round(W * 0.3)),
          td(ippjResult?.hollandCode ? `${ippjResult.hollandCode} (${ippjResult.topTypes.map((t) => IPPJ_SCALE_META[t].label).join(", ")})` : "Pendiente", { width: Math.round(W * 0.7), bold: true }),
        ],
      }),
      new TableRow({
        children: [
          th("Familias Dominantes de Talentos:", 1, Math.round(W * 0.3)),
          td(tapasResult?.dominantFamilias?.length ? tapasResult.dominantFamilias.map((f) => TAPAS_FAMILIES[f as TapasFamily]?.label || f).join(" + ") : "Pendiente", { width: Math.round(W * 0.7), bold: true }),
        ],
      }),
    ],
  });

  // Tabla de Carreras Universitarias y Técnicas Recomendadas
  const careerRows: TableRow[] = [
    new TableRow({
      children: [
        th("Campo Amplio de Conocimiento (SENESCYT)", 1, Math.round(W * 0.35)),
        th("Carreras Universitarias y Opciones Tecnológicas Sugeridas", 1, Math.round(W * 0.65)),
      ],
    }),
  ];

  if (suggestedAreas.length > 0) {
    for (const { area } of suggestedAreas) {
      careerRows.push(
        new TableRow({
          children: [
            td(area.area, { bold: true }),
            td(area.ejemplos.join(" · ")),
          ],
        })
      );
    }
  } else if (recommendedCareers.length > 0) {
    careerRows.push(
      new TableRow({
        children: [
          td("Áreas Vocacionales Priorizadas", { bold: true }),
          td(recommendedCareers.join(" · ")),
        ],
      })
    );
  } else {
    careerRows.push(
      new TableRow({
        children: [
          td("Área de Exploración General", { bold: true }),
          td("Se recomienda contrastar opciones en las ferias vocacionales institucionales y la oferta pública de SENESCYT."),
        ],
      })
    );
  }

  const careersTable = new Table({
    width: { size: W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: cellBorders,
    rows: careerRows,
  });

  // Tabla de Firmas Formales (4 Firmas: DECE, Representante, Estudiante, Rectorado)
  const signaturesTable = new Table({
    width: { size: W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: cellBorders,
    rows: [
      new TableRow({ children: [th("FIRMAS DE RESPONSABILIDAD INSTITUCIONAL Y CONOCIMIENTO", 4)] }),
      new TableRow({
        children: [
          th("Elaborado por (DECE):", 1, Math.round(W * 0.25)),
          th("Representante Legal:", 1, Math.round(W * 0.25)),
          th("Estudiante (3ro Bach.):", 1, Math.round(W * 0.25)),
          th("Aprobado por (Rectorado):", 1, Math.round(W * 0.25)),
        ],
      }),
      new TableRow({
        children: [
          tableCell([p([run(" ")], { after: 1200 }), p([run(professional?.name || "Profesional DECE", { bold: true, size: SMALL_SIZE }), run("\nDEPARTAMENTO DECE", { size: SMALL_SIZE })], { align: AlignmentType.CENTER })], { width: Math.round(W * 0.25) }),
          tableCell([p([run(" ")], { after: 1200 }), p([run(student.representative || "Representante de Familia", { bold: true, size: SMALL_SIZE }), run("\nC.I.: ___________________", { size: SMALL_SIZE })], { align: AlignmentType.CENTER })], { width: Math.round(W * 0.25) }),
          tableCell([p([run(" ")], { after: 1200 }), p([run(student.full_name, { bold: true, size: SMALL_SIZE }), run(`\nC.I.: ${student.document_id || "___________________"}`, { size: SMALL_SIZE })], { align: AlignmentType.CENTER })], { width: Math.round(W * 0.25) }),
          tableCell([p([run(" ")], { after: 1200 }), p([run("Rector/a Institucional", { bold: true, size: SMALL_SIZE }), run("\nRECTORADO / DIRECCIÓN", { size: SMALL_SIZE })], { align: AlignmentType.CENTER })], { width: Math.round(W * 0.25) }),
        ],
      }),
    ],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_W, height: 16838 },
            margin: MARGINS,
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                indent: { left: -1000, right: -1000 },
                spacing: { after: 0 },
                children: headerLogo
                  ? [new ImageRun({ data: headerLogo, transformation: { width: 596, height: 60 }, type: "png" })]
                  : [run(institution.name, { bold: true, size: SMALL_SIZE })],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                indent: { left: -1000, right: -1000 },
                spacing: { before: 0 },
                children: footerLogo
                  ? [new ImageRun({ data: footerLogo, transformation: { width: 596, height: 95 }, type: "png" })]
                  : [run("Ministerio de Educación del Ecuador · Departamento de Consejería Estudiantil", { size: SMALL_SIZE })],
              }),
            ],
          }),
        },
        children: [
          // Título del Documento
          p([run("DEPARTAMENTO DE CONSEJERÍA ESTUDIANTIL (DECE)", { bold: true, size: TITLE_SIZE, color: NAVY })], { align: AlignmentType.CENTER, after: 40 }),
          p([run("INFORME PSICOPEDAGÓGICO DE ORIENTACIÓN VOCACIONAL Y PROFESIONAL (OVP)", { bold: true, size: SUBTITLE_SIZE, color: NAVY })], { align: AlignmentType.CENTER, after: 40 }),
          p([run("EVALUACIÓN VOCACIONAL INTEGRADA: TALENTOS (TAPAS) + INTERESES (IPPJ - MINEDUC) + PROYECTO DE VIDA", { italics: true, size: SMALL_SIZE })], { align: AlignmentType.CENTER, after: 180 }),

          // Sección 1: Datos Informativos
          infoTable,
          p([], { after: 140 }),

          // Sección 2: Marco y Objetivos
          secTitle("2. OBJETIVO DEL INFORME VOCACIONAL INTEGRADO"),
          p([
            run(
              "El presente informe tiene por objetivo articular de manera técnica y pedagógica los resultados obtenidos por el estudiante en los instrumentos oficiales de Orientación Vocacional y Profesional (OVP) del Ministerio de Educación: el "
            ),
            run("Juego de Tarjetas de Arquetipos y Talentos (TaPas)", { bold: true }),
            run(" y el "),
            run("Inventario de Preferencias Profesionales para Jóvenes (IPPJ)", { bold: true }),
            run(
              ". Esta evaluación integrada orienta la toma de decisiones informada, el desarrollo de la autonomía y la formulación del Proyecto de Vida personal y académico para el ingreso a la educación superior o formación técnica al culminar el 3ro de Bachillerato."
            ),
          ]),

          // Sección 3: Resultados TaPas
          secTitle("3. EVALUACIÓN DE PERSONALIDAD VOCACIONAL Y TALENTOS (TaPas - VVOB)"),
          p([
            run(
              "El juego TaPas evalúa la autoidentificación del estudiante frente a 74 arquetipos ocupacionales, organizados en grupos de talentos del más prioritario al más débil. En esta dimensión, las familias dominantes identificadas fueron: "
            ),
            run(
              tapasResult?.dominantFamilias?.length
                ? tapasResult.dominantFamilias.map((f) => TAPAS_FAMILIES[f as TapasFamily]?.label || f).join(", ")
                : "En proceso de finalización.",
              { bold: true }
            ),
            run("."),
          ]),
          tapasTable,
          ...(tapasResult?.groups?.length
            ? [
                p([], { after: 60 }),
                p([run("Grupos de Talentos Priorizados por el Estudiante:", { bold: true, size: SMALL_SIZE })]),
                ...tapasResult.groups.map((g, i) =>
                  p([
                    run(`${i + 1}. ${g.name || "(Sin título)"}: `, { bold: true, size: SMALL_SIZE }),
                    run(g.archetypes.map((k) => ARCHETYPE_MAP[k]?.name || k).join(", "), { size: SMALL_SIZE }),
                  ])
                ),
              ]
            : []),
          ...(tapasApp?.reflection
            ? [
                p([], { after: 60 }),
                p([run("Reflexión Vocacional del Estudiante:", { bold: true, size: SMALL_SIZE })]),
                p([run(`"${tapasApp.reflection}"`, { italics: true, size: SMALL_SIZE })]),
              ]
            : []),

          p([], { after: 140 }),

          // Sección 4: Resultados IPPJ
          secTitle("4. INVENTARIO DE PREFERENCIAS PROFESIONALES PARA JÓVENES (IPPJ - MINEDUC)"),
          p([
            run(
              "El inventario IPPJ se fundamenta en el modelo tipológico de Holland (RIASEC). Permite medir la afinidad hacia actividades, profesiones y entornos laborales, arrojando el código vocacional "
            ),
            run(ippjResult?.hollandCode || "—", { bold: true }),
            run(". La intensidad de sus preferencias es "),
            run(ippjResult?.intensidad?.level?.toLowerCase() || "adecuada", { bold: true }),
            run(", con consistencia "),
            run(ippjResult?.consistencia?.overall?.toLowerCase() || "coherente", { bold: true }),
            run(" y nivel de diferenciación "),
            run(ippjResult?.diferenciacion?.nivel?.toLowerCase() || "definido", { bold: true }),
            run("."),
          ]),
          ippjTable,
          ...(ippjSurvey && Array.isArray(ippjSurvey.carreras_pref) && ippjSurvey.carreras_pref.length > 0
            ? [
                p([], { after: 60 }),
                p([
                  run("Carreras de Interés Declaradas Inicialmente por el Estudiante: ", { bold: true, size: SMALL_SIZE }),
                  run((ippjSurvey.carreras_pref as string[]).filter(Boolean).join(", "), { size: SMALL_SIZE, bold: true }),
                ]),
              ]
            : []),

          p([], { after: 140 }),

          // Sección 5: Matriz de Coherencia
          secTitle("5. MATRIZ INTEGRADA DE COHERENCIA VOCACIONAL"),
          coherenceTable,
          p([], { after: 140 }),

          // Sección 6: Toma de Decisiones y Opciones Formativas
          secTitle("6. CAMPOS OCUPACIONALES Y CARRERAS UNIVERSITARIAS SUGERIDAS (3RO BACHILLERATO)"),
          p([
            run(
              "Con base en la integración de talentos (TaPas), intereses ocupacionales (IPPJ) y la oferta académica de tercer nivel en el Ecuador (universidades públicas, privadas y escuelas politécnicas / institutos tecnológicos superiores acreditados por SENESCYT / CES), se priorizan los siguientes campos:"
            ),
          ]),
          careersTable,
          p([], { after: 140 }),

          // Sección 7: Conclusiones y Recomendaciones
          secTitle("7. CONCLUSIONES Y RECOMENDACIONES"),
          p([run("7.1 Para el Estudiante:", { bold: true })]),
          p([
            run(
              "• Investigar a profundidad las mallas curriculares, modalidades de estudio (presencial, híbrida, dual) y requisitos de admisión en las instituciones de educación superior seleccionadas.\n" +
              "• Prepararse con anticipación para las evaluaciones de competencias y razonamiento del proceso de acceso a la educación superior.\n" +
              "• Mantener una actitud abierta hacia carreras tecnológicas de tercer nivel superior, las cuales brindan alta empleabilidad y rápida inserción laboral."
            ),
          ]),
          p([run("7.2 Para la Familia y Representantes Legales:", { bold: true })]),
          p([
            run(
              "• Brindar un acompañamiento respetuoso y constructivo, reconociendo las fortalezas y talentos genuinos del estudiante sin imponer expectativas ajenas a su vocación.\n" +
              "• Dialogar abiertamente sobre el presupuesto familiar, costos de aranceles, posibilidades de becas institucionales y ubicación geográfica de las opciones formativas.\n" +
              "• Apoyar la asistencia del estudiante a casas abiertas, ferias vocacionales y visitas a campus universitarios."
            ),
          ]),
          p([run("7.3 Para el Departamento de Consejería Estudiantil (DECE):", { bold: true })]),
          p([
            run(
              "• Realizar el seguimiento personalizado en el marco del Proyecto de Vida durante el último trimestre escolar.\n" +
              "• Facilitar espacios de asesoría individual para estudiantes con perfiles de alta dispersión o nudos de decisión familiar.\n" +
              "• Archivar el presente informe técnico en el expediente físico y digital del estudiante para constancia institucional."
            ),
          ]),

          p([], { after: 200 }),

          // Sección 8: Firmas
          signaturesTable,
          p([], { after: 80 }),
          p([run("Nota Ministerial: Documento oficial confidencial emitido por el Departamento de Consejería Estudiantil en el marco de la LOEI y el Modelo Nacional de OVP del Ministerio de Educación del Ecuador.", { italics: true, size: 16, color: "7F7F7F" })], { align: AlignmentType.CENTER }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
