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
} from "docx";
import { smartAlign } from "./wordJustify";
import { currentSchoolYearText } from "./schoolYearText";
import path from "path";
import fs from "fs";
import type {
  CaseRestitutionPlanRow,
  StudentRow,
  InstitutionRow,
  CaseFileRow,
  SchoolYearRow,
} from "@/lib/types";
import {
  parseJsonArray,
  type VictimEntry,
  type PerpetratorEntry,
  type LegalInstanceEntry,
  type AccompanimentActionEntry,
  NORMATIVE_TEXT,
  OBJECTIVE_GENERAL_TEXT,
  OBJECTIVES_SPECIFIC_TEXT,
  LEGAL_INSTANCE_CATEGORIES,
  ACCOMPANIMENT_ACTION_CATEGORIES,
} from "./restitutionPlan";
import { formatStudentCourseFull } from "./studentCourse";
import { formatDate } from "@/components/ui";

export interface RestitutionInstitutionInfo {
  id?: string;
  name?: string | null;
  amie_code?: string | null;
  funding_type?: string | null;
  address?: string | null;
  province?: string | null;
  canton?: string | null;
  parish?: string | null;
  phone?: string | null;
  rector_name?: string | null;
  rector_phone?: string | null;
  email?: string | null;
  district?: string | null;
  circuit?: string | null;
  zona?: string | null;
  active?: number;
  seal_image?: string | null;
}

function getImageBuffer(fileName: string): Buffer | null {
  try {
    const p = path.join(process.cwd(), "public", fileName);
    if (fs.existsSync(p)) return fs.readFileSync(p);
  } catch {
    // fallback
  }
  return null;
}

export async function generateRestitutionPlanDocx(data: {
  plan: CaseRestitutionPlanRow;
  caseFile: CaseFileRow;
  student: StudentRow;
  institution?: (InstitutionRow & RestitutionInstitutionInfo) | RestitutionInstitutionInfo | null;
  activeYear?: SchoolYearRow | null;
}): Promise<Buffer> {
  const { plan, student, institution, activeYear } = data;

  const violenceTypes = parseJsonArray<string>(plan.violence_types);
  const violenceModality = parseJsonArray<string>(plan.violence_modality);
  const victims = parseJsonArray<VictimEntry>(plan.victims);
  const perpetrators = parseJsonArray<PerpetratorEntry>(plan.perpetrators);
  const legalInstances = parseJsonArray<LegalInstanceEntry>(plan.legal_instances);
  const accompanimentActions = parseJsonArray<AccompanimentActionEntry>(plan.accompaniment_actions);

  const formattedCourse = formatStudentCourseFull(student);

  const primaryVictim: VictimEntry = victims[0] || {
    iniciales: student.full_name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0]?.toUpperCase() + ".")
      .join(" "),
    cedula: student.document_id || "",
    edad: "",
    genero: student.gender || "",
    nivel_instruccion: `${formattedCourse} - Jornada ${student.jornada || "Matutina"}`.trim(),
  };

  const primaryPerp: PerpetratorEntry = perpetrators[0] || {
    nombre: "Desconoce",
    edad: "Desconoce",
    sexo: "Masculino",
    cargo_funcion: "Docente",
  };

  const formattedElabDate = plan.elaboration_date
    ? plan.elaboration_date.split("-").reverse().join("/")
    : "20/02/2026";

  const isAnalista =
    Boolean(plan.reviewed_coordinator_name) ||
    (plan.prepared_by_role ? plan.prepared_by_role.toUpperCase().includes("ANALISTA") : true);

  const FONT_NAME = "Calibri";
  const FONT_SIZE = 19; // 9.5pt
  const HEADER_FILL = "9CC2E5";

  const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
  const tableBorders = {
    top: cellBorder,
    bottom: cellBorder,
    left: cellBorder,
    right: cellBorder,
    insideHorizontal: cellBorder,
    insideVertical: cellBorder,
  };
  const cellMargins = { top: 40, bottom: 40, left: 80, right: 80 };

  const headerImg = getImageBuffer("plan_acomp_header.png");
  const footerImg = getImageBuffer("plan_acomp_footer.png");

  // Document header
  const header = new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        indent: { left: -1000, right: -1000 },
        children: headerImg
          ? [
              new ImageRun({
                data: headerImg,
                transformation: { width: 595, height: 60 },
                type: "png",
              }),
            ]
          : [],
        spacing: { before: 0, after: 0 },
      }),
    ],
  });

  // Document footer
  const footer = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: "Ministerio de Educación\nDirección: Av. Amazonas N34-451 y Av. Atahualpa. Código postal: 170507 / Quito-Ecuador\nTeléfono: 593-2-396-1300 / www.educacion.gob.ec",
            size: 14,
            font: FONT_NAME,
            color: "64748B",
          }),
        ],
        spacing: { before: 0, after: 40 },
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        indent: { left: -1000, right: -1000 },
        children: footerImg
          ? [
              new ImageRun({
                data: footerImg,
                transformation: { width: 595, height: 35 },
                type: "png",
              }),
            ]
          : [],
        spacing: { before: 0, after: 0 },
      }),
    ],
  });

  const children: (Paragraph | Table)[] = [];

  // Título
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "PLAN DE ACOMPAÑAMIENTO Y RESTITUCIÓN",
          bold: true,
          font: FONT_NAME,
          size: 24,
        }),
      ],
      spacing: { before: 80, after: 40 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Año lectivo ${plan.school_year || activeYear?.name || currentSchoolYearText()}`,
          bold: true,
          font: FONT_NAME,
          size: 22,
        }),
      ],
      spacing: { after: 40 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Fecha de elaboración: ${formattedElabDate}`,
          bold: true,
          font: FONT_NAME,
          size: 20,
        }),
      ],
      spacing: { after: 140 },
    })
  );

  // ================= TABLA 1: DIAGNÓSTICO =================
  const isFisica = violenceTypes.includes("FISICA");
  const isPsico = violenceTypes.includes("PSICOLOGICA");
  const isSexual = violenceTypes.includes("SEXUAL");
  const isNegligencia = violenceTypes.includes("NEGLIGENCIA");
  const isVirtual = violenceTypes.includes("VIRTUAL");

  const isInst = violenceModality.includes("INSTITUCIONAL");
  const isIntra = violenceModality.includes("INTRAFAMILIAR");
  const isPares = violenceModality.includes("ENTRE_PARES");
  const isOtros = violenceModality.includes("OTROS");
  const otrosTxt = plan.violence_modality_other ? ` (${plan.violence_modality_other})` : "";

  const provText = `${institution?.province || "Tungurahua"}/ ${institution?.canton || "Ambato"}/ ${institution?.parish || "Santa Rosa"}`;

  const t1Rows: TableRow[] = [
    // Header Diagnóstico
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 11,
          shading: { fill: HEADER_FILL },
          margins: cellMargins,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "DIAGNÓSTICO", bold: true, font: FONT_NAME, size: 20 })],
            }),
          ],
        }),
      ],
    }),

    // Fila 2: Institución educativa & Código AMIE
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 11,
          margins: cellMargins,
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "Institución educativa: ", bold: true, font: FONT_NAME, size: FONT_SIZE }),
                new TextRun({ text: institution?.name || "Unidad Educativa Santa Rosa", font: FONT_NAME, size: FONT_SIZE }),
                new TextRun({ text: "        Código AMIE: ", bold: true, font: FONT_NAME, size: FONT_SIZE }),
                new TextRun({ text: institution?.amie_code || "18H00313", font: FONT_NAME, size: FONT_SIZE }),
              ],
            }),
          ],
        }),
      ],
    }),

    // Fila 3: Sostenimiento
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 11,
          margins: cellMargins,
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "Tipo de sostenimiento de la IE: ", bold: true, font: FONT_NAME, size: FONT_SIZE }),
                new TextRun({ text: institution?.funding_type || "Fiscal", font: FONT_NAME, size: FONT_SIZE }),
              ],
            }),
          ],
        }),
      ],
    }),

    // Fila 4: Dirección
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 11,
          margins: cellMargins,
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "Dirección institucional: ", bold: true, font: FONT_NAME, size: FONT_SIZE }),
                new TextRun({ text: institution?.address || "Calle Rocafuerte Parroquia Santa Rosa", font: FONT_NAME, size: FONT_SIZE }),
              ],
            }),
          ],
        }),
      ],
    }),

    // Fila 5: Provincia / Cantón / Parroquia / Teléfono
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 11,
          margins: cellMargins,
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "Provincia, cantón, parroquia: ", bold: true, font: FONT_NAME, size: FONT_SIZE }),
                new TextRun({ text: provText, font: FONT_NAME, size: FONT_SIZE }),
                new TextRun({ text: "        No. de teléfono institucional: ", bold: true, font: FONT_NAME, size: FONT_SIZE }),
                new TextRun({ text: institution?.phone || "032754073 - 032754097", font: FONT_NAME, size: FONT_SIZE }),
              ],
            }),
          ],
        }),
      ],
    }),

    // Fila 6: Autoridad institucional / Teléfono
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 11,
          margins: cellMargins,
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "Nombre de la autoridad institucional: ", bold: true, font: FONT_NAME, size: FONT_SIZE }),
                new TextRun({ text: plan.reviewed_authority_name || institution?.rector_name || "Diana Fernanda Manzano Villacís", font: FONT_NAME, size: FONT_SIZE }),
                new TextRun({ text: "        No. de teléfono de la autoridad: ", bold: true, font: FONT_NAME, size: FONT_SIZE }),
                new TextRun({ text: institution?.rector_phone || "098306665", font: FONT_NAME, size: FONT_SIZE }),
              ],
            }),
          ],
        }),
      ],
    }),

    // Fila 7: Correo institucional
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 11,
          margins: cellMargins,
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "Correo electrónico institucional: ", bold: true, font: FONT_NAME, size: FONT_SIZE }),
                new TextRun({ text: plan.prepared_by_email || institution?.email || "marlon.jacome@educacion.gob.ec", font: FONT_NAME, size: FONT_SIZE }),
              ],
            }),
          ],
        }),
      ],
    }),

    // Header Factores de Riesgo
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 11,
          shading: { fill: HEADER_FILL },
          margins: cellMargins,
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "FACTORES DE RIESGO: Describir los factores de riesgo que refieran de acuerdo con la situación de violencia identificada, individual, familiar y comunitario.",
                  bold: true,
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
              ],
            }),
          ],
        }),
      ],
    }),

    // Fila 9: Contenido Factores de Riesgo
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 11,
          margins: cellMargins,
          children: (plan.risk_factors || "No registrados.").split("\n").map(
            (p) =>
              new Paragraph({
                alignment: smartAlign(String((p || " ") ?? "")),
                children: [new TextRun({ text: p || " ", font: FONT_NAME, size: FONT_SIZE })],
                spacing: { after: 40 },
              })
          ),
        }),
      ],
    }),

    // Header Presunta Situación de Violencia
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 11,
          shading: { fill: HEADER_FILL },
          margins: cellMargins,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "PRESUNTA SITUACIÓN DE VIOLENCIA REPORTADA", bold: true, font: FONT_NAME, size: 20 })],
            }),
          ],
        }),
      ],
    }),

    // Fila 11: Tipo de violencia
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 11,
          margins: cellMargins,
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "Tipo de violencia (marcar con una x):  ", bold: true, font: FONT_NAME, size: FONT_SIZE }),
                new TextRun({ text: `Física ( ${isFisica ? "X" : "  "} )    `, font: FONT_NAME, size: FONT_SIZE }),
                new TextRun({ text: `Psicológica ( ${isPsico ? "X" : "  "} )    `, font: FONT_NAME, size: FONT_SIZE }),
                new TextRun({ text: `Sexual ( ${isSexual ? "X" : "  "} )    `, font: FONT_NAME, size: FONT_SIZE }),
                new TextRun({ text: `Negligencia ( ${isNegligencia ? "X" : "  "} )    `, font: FONT_NAME, size: FONT_SIZE }),
                new TextRun({ text: `Virtual ( ${isVirtual ? "X" : "  "} )`, font: FONT_NAME, size: FONT_SIZE }),
              ],
            }),
          ],
        }),
      ],
    }),

    // Fila 12: Modalidad de violencia
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 11,
          margins: cellMargins,
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "Modalidad de violencia (marcar con una x):  ", bold: true, font: FONT_NAME, size: FONT_SIZE }),
                new TextRun({ text: `Institucional ( ${isInst ? "X" : "  "} )    `, font: FONT_NAME, size: FONT_SIZE }),
                new TextRun({ text: `Intrafamiliar ( ${isIntra ? "X" : "  "} )    `, font: FONT_NAME, size: FONT_SIZE }),
                new TextRun({ text: `Entre pares ( ${isPares ? "X" : "  "} )    `, font: FONT_NAME, size: FONT_SIZE }),
                new TextRun({ text: `Otros ( ${isOtros ? "X" : "  "} )${otrosTxt}`, font: FONT_NAME, size: FONT_SIZE }),
              ],
            }),
          ],
        }),
      ],
    }),

    // Fila 13: Relación presunta persona agresora
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 11,
          margins: cellMargins,
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "Relación de la presunta persona agresora con la víctima (familiar, pareja, etc.): ", bold: true, font: FONT_NAME, size: FONT_SIZE }),
                new TextRun({ text: plan.perpetrator_relation || "Docente", font: FONT_NAME, size: FONT_SIZE }),
              ],
            }),
          ],
        }),
      ],
    }),

    // Fila 14: Total víctimas y relato
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 11,
          margins: cellMargins,
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: `Número total de víctimas: ${victims.length || 1}`, bold: true, font: FONT_NAME, size: FONT_SIZE }),
              ],
              spacing: { after: 40 },
            }),
            ...((plan.report_narrative || "").split("\n").map(
              (p) =>
                new Paragraph({
                  alignment: smartAlign(String((p || " ") ?? "")),
                  children: [new TextRun({ text: p || " ", font: FONT_NAME, size: FONT_SIZE })],
                  spacing: { after: 40 },
                })
            )),
          ],
        }),
      ],
    }),

    // Fila 15: Datos de la víctima
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 11,
          margins: cellMargins,
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "Datos de la víctima (ingresar solo las iniciales de la presunta víctima): ", bold: true, font: FONT_NAME, size: FONT_SIZE }),
                new TextRun({ text: primaryVictim.iniciales, bold: true, font: FONT_NAME, size: FONT_SIZE }),
                new TextRun({ text: "         CI. ", font: FONT_NAME, size: FONT_SIZE }),
                new TextRun({ text: primaryVictim.cedula || "No registra", font: FONT_NAME, size: FONT_SIZE }),
              ],
            }),
          ],
        }),
      ],
    }),

    // Fila 16: Edad y sexo víctima
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 11,
          margins: cellMargins,
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "Edad: ", bold: true, font: FONT_NAME, size: FONT_SIZE }),
                new TextRun({ text: `${primaryVictim.edad || "16"} años`, font: FONT_NAME, size: FONT_SIZE }),
                new TextRun({ text: "                                                 Sexo: ", bold: true, font: FONT_NAME, size: FONT_SIZE }),
                new TextRun({ text: primaryVictim.genero || "Femenino", font: FONT_NAME, size: FONT_SIZE }),
              ],
            }),
          ],
        }),
      ],
    }),

    // Fila 17: Nivel de instrucción víctima
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 11,
          margins: cellMargins,
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "Nivel de instrucción de la víctima (consignar el grado escolar que cursa): ", bold: true, font: FONT_NAME, size: FONT_SIZE }),
                new TextRun({ text: primaryVictim.nivel_instruccion || formattedCourse, font: FONT_NAME, size: FONT_SIZE }),
              ],
            }),
          ],
        }),
      ],
    }),

    // Fila 18: Presunto agresor - Nombres y apellidos
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 11,
          margins: cellMargins,
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "Datos de la presunta persona implicada: Nombres y apellidos: ", bold: true, font: FONT_NAME, size: FONT_SIZE }),
                new TextRun({ text: primaryPerp.nombre || "Desconoce", font: FONT_NAME, size: FONT_SIZE }),
              ],
            }),
          ],
        }),
      ],
    }),

    // Fila 19: Presunto agresor - Edad y Sexo
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 11,
          margins: cellMargins,
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "Edad: ", bold: true, font: FONT_NAME, size: FONT_SIZE }),
                new TextRun({ text: primaryPerp.edad || "Desconoce", font: FONT_NAME, size: FONT_SIZE }),
                new TextRun({ text: "                                                 Sexo: ", bold: true, font: FONT_NAME, size: FONT_SIZE }),
                new TextRun({ text: primaryPerp.sexo || "Masculino", font: FONT_NAME, size: FONT_SIZE }),
              ],
            }),
          ],
        }),
      ],
    }),

    // Fila 20: Presunto agresor - Cargo o función
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 11,
          margins: cellMargins,
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "Cargo, función o actividad de la presunta persona implicada: ", bold: true, font: FONT_NAME, size: FONT_SIZE }),
                new TextRun({ text: primaryPerp.cargo_funcion || "Docente", font: FONT_NAME, size: FONT_SIZE }),
              ],
            }),
          ],
        }),
      ],
    }),

    // Header 1.- PLAN DE ACOMPAÑAMIENTO Y RESTITUCIÓN
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 11,
          shading: { fill: HEADER_FILL },
          margins: cellMargins,
          children: [
            new Paragraph({
              children: [new TextRun({ text: "1.- PLAN DE ACOMPAÑAMIENTO Y RESTITUCIÓN", bold: true, font: FONT_NAME, size: 20 })],
            }),
          ],
        }),
      ],
    }),

    // Fila 22: Aspecto normativo
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 11,
          margins: cellMargins,
          children: [
            new Paragraph({
              alignment: smartAlign(String(("Aspecto normativo. – ") ?? "")),
              children: [
                new TextRun({ text: "Aspecto normativo. – ", bold: true, font: FONT_NAME, size: FONT_SIZE }),
                new TextRun({ text: NORMATIVE_TEXT, font: FONT_NAME, size: FONT_SIZE }),
              ],
              spacing: { after: 40 },
            }),
          ],
        }),
      ],
    }),

    // Fila 23: Objetivos y Alcance
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 11,
          margins: cellMargins,
          children: [
            new Paragraph({
              alignment: smartAlign(String(("Objetivo general. – ") ?? "")),
              children: [
                new TextRun({ text: "Objetivo general. – ", bold: true, font: FONT_NAME, size: FONT_SIZE }),
                new TextRun({ text: OBJECTIVE_GENERAL_TEXT, font: FONT_NAME, size: FONT_SIZE }),
              ],
              spacing: { after: 40 },
            }),
            new Paragraph({
              children: [new TextRun({ text: "Objetivos específicos. –", bold: true, font: FONT_NAME, size: FONT_SIZE })],
              spacing: { after: 20 },
            }),
            ...OBJECTIVES_SPECIFIC_TEXT.map(
              (t) =>
                new Paragraph({
                  bullet: { level: 0 },
                  children: [new TextRun({ text: t, font: FONT_NAME, size: FONT_SIZE })],
                  spacing: { after: 20 },
                })
            ),
            new Paragraph({
              alignment: smartAlign(String(("Alcance. – ") ?? "")),
              children: [
                new TextRun({ text: "Alcance. – ", bold: true, font: FONT_NAME, size: FONT_SIZE }),
                new TextRun({
                  text: `A la Unidad Educativa "${institution?.name || "Santa Rosa"}", autoridades, docentes, estudiantes y familias desde los Niveles de Educación Inicial hasta los Terceros Años de Bachillerato.`,
                  font: FONT_NAME,
                  size: FONT_SIZE,
                }),
              ],
              spacing: { before: 40, after: 40 },
            }),
          ],
        }),
      ],
    }),

    // Header Acompañamiento legal
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 11,
          shading: { fill: HEADER_FILL },
          margins: cellMargins,
          children: [
            new Paragraph({
              children: [new TextRun({ text: "c.- Acompañamiento legal:", bold: true, font: FONT_NAME, size: 20 })],
            }),
          ],
        }),
      ],
    }),
  ];

  // Subtabla de Acompañamiento Legal (6 columnas)
  const legalMap: Record<string, LegalInstanceEntry> = {};
  legalInstances.forEach((li) => {
    legalMap[li.instancia] = li;
  });

  const legalSubTableRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({ width: { size: 2600, type: WidthType.DXA }, shading: { fill: "F1F5F9" }, margins: cellMargins, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "INSTANCIAS ADMINISTRATIVAS Y JUDICIALES", bold: true, font: FONT_NAME, size: 15 })] })] }),
        new TableCell({ width: { size: 1500, type: WidthType.DXA }, shading: { fill: "F1F5F9" }, margins: cellMargins, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "FECHA DE LA DENUNCIA", bold: true, font: FONT_NAME, size: 15 })] })] }),
        new TableCell({ width: { size: 1800, type: WidthType.DXA }, shading: { fill: "F1F5F9" }, margins: cellMargins, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "N°- DE LA DENUNCIA", bold: true, font: FONT_NAME, size: 15 })] })] }),
        new TableCell({ width: { size: 1600, type: WidthType.DXA }, shading: { fill: "F1F5F9" }, margins: cellMargins, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "MEDIDAS ADOPTADAS", bold: true, font: FONT_NAME, size: 15 })] })] }),
        new TableCell({ width: { size: 1200, type: WidthType.DXA }, shading: { fill: "F1F5F9" }, margins: cellMargins, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "ESTADO ACTUAL DEL CASO", bold: true, font: FONT_NAME, size: 15 })] })] }),
        new TableCell({ width: { size: 800, type: WidthType.DXA }, shading: { fill: "F1F5F9" }, margins: cellMargins, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "TOTAL", bold: true, font: FONT_NAME, size: 15 })] })] }),
      ],
    }),
    ...LEGAL_INSTANCE_CATEGORIES.map((cat) => {
      const entry = legalMap[cat.value];
      const hasData = entry && (entry.numero_denuncia || entry.fecha_denuncia);

      return new TableRow({
        children: [
          new TableCell({ margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: cat.label, font: FONT_NAME, size: 15 })] })] }),
          new TableCell({ margins: cellMargins, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: entry?.fecha_denuncia ? (entry.fecha_denuncia.includes("-") ? entry.fecha_denuncia.split("-").reverse().join("-") : entry.fecha_denuncia) : (hasData ? "—" : "No aplica"), font: FONT_NAME, size: 15 })] })] }),
          new TableCell({ margins: cellMargins, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: entry?.numero_denuncia || (hasData ? "—" : "No aplica"), font: FONT_NAME, size: 15 })] })] }),
          new TableCell({ margins: cellMargins, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: entry?.medidas || (hasData ? "—" : "No aplica"), font: FONT_NAME, size: 15 })] })] }),
          new TableCell({ margins: cellMargins, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: entry?.estado || (hasData ? "—" : "No aplica"), font: FONT_NAME, size: 15 })] })] }),
          new TableCell({ margins: cellMargins, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: (entry as any)?.total || (hasData ? "1" : "No aplica"), bold: true, font: FONT_NAME, size: 15 })] })] }),
        ],
      });
    }),
  ];

  t1Rows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 11,
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
          children: [
            new Table({
              width: { size: 9500, type: WidthType.DXA },
              borders: tableBorders,
              rows: legalSubTableRows,
            }),
          ],
        }),
      ],
    })
  );

  children.push(
    new Table({
      width: { size: 9500, type: WidthType.DXA },
      borders: tableBorders,
      rows: t1Rows,
    })
  );

  children.push(new Paragraph({ spacing: { after: 140 } }));

  // ================= TABLA 2: ACCIONES DE ACOMPAÑAMIENTO Y RESTITUCIÓN =================
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "2.- ACCIONES DE ACOMPAÑAMIENTO Y RESTITUCIÓN (describir brevemente los puntos señalados)",
          bold: true,
          font: FONT_NAME,
          size: 20,
        }),
      ],
      spacing: { after: 60 },
    })
  );

  const t2Rows: TableRow[] = [
    // Header 5 columnas
    new TableRow({
      children: [
        new TableCell({ width: { size: 2470, type: WidthType.DXA }, shading: { fill: HEADER_FILL }, margins: cellMargins, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "PROCESO IMPLEMENTADO", bold: true, font: FONT_NAME, size: 15 })] })] }),
        new TableCell({ width: { size: 2660, type: WidthType.DXA }, shading: { fill: HEADER_FILL }, margins: cellMargins, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "¿QUIÉNES EJECUTARÁN?\n(mencione la institución que brindará el servicio)", bold: true, font: FONT_NAME, size: 14 })] })] }),
        new TableCell({ width: { size: 1520, type: WidthType.DXA }, shading: { fill: HEADER_FILL }, margins: cellMargins, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "NÚMERO DE PERSONAS\n(que recibirán el servicio)", bold: true, font: FONT_NAME, size: 14 })] })] }),
        new TableCell({ width: { size: 1425, type: WidthType.DXA }, shading: { fill: HEADER_FILL }, margins: cellMargins, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "FECHA DE INICIO\n(del servicio)", bold: true, font: FONT_NAME, size: 14 })] })] }),
        new TableCell({ width: { size: 1425, type: WidthType.DXA }, shading: { fill: HEADER_FILL }, margins: cellMargins, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "FECHA DE FINALIZACIÓN\n(del servicio)", bold: true, font: FONT_NAME, size: 14 })] })] }),
      ],
    }),
    // Filas dinámicas de acciones
    ...ACCOMPANIMENT_ACTION_CATEGORIES.map((cat) => {
      const entry = accompanimentActions.find((a) => a.categoria === cat.value) || {
        categoria: cat.value,
        ejecutor: "No aplica",
        num_personas: "No aplica",
        fecha_inicio: "No aplica",
        fecha_fin: "No aplica",
      };

      return new TableRow({
        children: [
          new TableCell({ margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: cat.label, font: FONT_NAME, size: 15 })] })] }),
          new TableCell({ margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: entry.ejecutor || "No aplica", font: FONT_NAME, size: 15 })] })] }),
          new TableCell({ margins: cellMargins, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: entry.num_personas || "1", font: FONT_NAME, size: 15 })] })] }),
          new TableCell({ margins: cellMargins, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: entry.fecha_inicio || "—", font: FONT_NAME, size: 15 })] })] }),
          new TableCell({ margins: cellMargins, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: entry.fecha_fin || "—", font: FONT_NAME, size: 15 })] })] }),
        ],
      });
    }),

    // Firmas dentro de la Tabla 2
    // 1. Elaborado por
    new TableRow({
      children: [
        new TableCell({
          margins: cellMargins,
          children: [
            new Paragraph({ children: [new TextRun({ text: "Elaborado por el DECE institucional", bold: true, font: FONT_NAME, size: 15 })] }),
            new Paragraph({ children: [new TextRun({ text: `Fecha: ${plan.prepared_date ? (plan.prepared_date.includes("-") ? plan.prepared_date.split("-").reverse().join("-") : plan.prepared_date) : "20-02-2026"}`, font: FONT_NAME, size: 14, color: "4A5568" })] }),
          ],
        }),
        new TableCell({
          margins: cellMargins,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Nombre", bold: true, font: FONT_NAME, size: 15 })] })],
        }),
        new TableCell({
          columnSpan: 2,
          margins: cellMargins,
          children: [new Paragraph({ children: [new TextRun({ text: plan.prepared_by_name || "Lic. Martha Punina", bold: true, font: FONT_NAME, size: 15 })] })],
        }),
        new TableCell({
          margins: cellMargins,
          children: [new Paragraph({ children: [new TextRun({ text: "Firma:", bold: true, font: FONT_NAME, size: 15 })] })],
        }),
      ],
    }),

    // 2. Revisado por Coordinador DECE (si es Analista)
    ...(isAnalista
      ? [
          new TableRow({
            children: [
              new TableCell({
                margins: cellMargins,
                children: [
                  new Paragraph({ children: [new TextRun({ text: "Revisado por:\nCoordinador/a DECE", bold: true, font: FONT_NAME, size: 15 })] }),
                  new Paragraph({ children: [new TextRun({ text: `Fecha: ${plan.reviewed_coordinator_date ? (plan.reviewed_coordinator_date.includes("-") ? plan.reviewed_coordinator_date.split("-").reverse().join("-") : plan.reviewed_coordinator_date) : "20-02-2026"}`, font: FONT_NAME, size: 14, color: "4A5568" })] }),
                ],
              }),
              new TableCell({
                margins: cellMargins,
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Nombre", bold: true, font: FONT_NAME, size: 15 })] })],
              }),
              new TableCell({
                columnSpan: 2,
                margins: cellMargins,
                children: [new Paragraph({ children: [new TextRun({ text: plan.reviewed_coordinator_name || "Psic. Cl. Marlon Jácome", bold: true, font: FONT_NAME, size: 15 })] })],
              }),
              new TableCell({
                margins: cellMargins,
                children: [new Paragraph({ children: [new TextRun({ text: "Firma:", bold: true, font: FONT_NAME, size: 15 })] })],
              }),
            ],
          }),
        ]
      : []),

    // 3. Revisado por Autoridad Educativa
    new TableRow({
      children: [
        new TableCell({
          margins: cellMargins,
          children: [
            new Paragraph({ children: [new TextRun({ text: "Revisado por la\nAutoridad Educativa", bold: true, font: FONT_NAME, size: 15 })] }),
            new Paragraph({ children: [new TextRun({ text: `Fecha: ${plan.reviewed_authority_date ? (plan.reviewed_authority_date.includes("-") ? plan.reviewed_authority_date.split("-").reverse().join("-") : plan.reviewed_authority_date) : "20-02-2026"}`, font: FONT_NAME, size: 14, color: "4A5568" })] }),
          ],
        }),
        new TableCell({
          margins: cellMargins,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Nombre", bold: true, font: FONT_NAME, size: 15 })] })],
        }),
        new TableCell({
          columnSpan: 2,
          margins: cellMargins,
          children: [new Paragraph({ children: [new TextRun({ text: plan.reviewed_authority_name || institution?.rector_name || "Mg. Diana Manzano", bold: true, font: FONT_NAME, size: 15 })] })],
        }),
        new TableCell({
          margins: cellMargins,
          children: [new Paragraph({ children: [new TextRun({ text: "Firma:", bold: true, font: FONT_NAME, size: 15 })] })],
        }),
      ],
    }),

    // 4. Aprobado por Profesional de Apoyo
    new TableRow({
      children: [
        new TableCell({
          margins: cellMargins,
          children: [
            new Paragraph({ children: [new TextRun({ text: "Aprobado por:\nProfesional de Apoyo al DECE", bold: true, font: FONT_NAME, size: 15 })] }),
            new Paragraph({ children: [new TextRun({ text: `Fecha: ${plan.approved_date ? (plan.approved_date.includes("-") ? plan.approved_date.split("-").reverse().join("-") : plan.approved_date) : "20-02-2026"}`, font: FONT_NAME, size: 14, color: "4A5568" })] }),
          ],
        }),
        new TableCell({
          margins: cellMargins,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Nombre", bold: true, font: FONT_NAME, size: 15 })] })],
        }),
        new TableCell({
          columnSpan: 2,
          margins: cellMargins,
          children: [new Paragraph({ children: [new TextRun({ text: plan.approved_by_name || "Psic. Silvia Paredes", bold: true, font: FONT_NAME, size: 15 })] })],
        }),
        new TableCell({
          margins: cellMargins,
          children: [new Paragraph({ children: [new TextRun({ text: "Firma:", bold: true, font: FONT_NAME, size: 15 })] })],
        }),
      ],
    }),
  ];

  children.push(
    new Table({
      width: { size: 9500, type: WidthType.DXA },
      borders: tableBorders,
      rows: t2Rows,
    })
  );

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT_NAME, size: FONT_SIZE },
          paragraph: { spacing: { line: 260, after: 80 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 900, bottom: 900, left: 1200, right: 1200 },
          },
        },
        headers: { default: header },
        footers: { default: footer },
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
