import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  Header,
  Footer,
  ImageRun,
} from "docx";
import { smartAlign } from "./wordJustify";
import path from "path";
import fs from "fs";
import {
  AnnualManagementReportRow,
  InstitutionRow,
  ManagementReportRecipientItem,
  ManagementReportProfessionalItem,
  CounselingStatRow,
  CaseTypologyStatRow,
  ComparativeAnalysisRow,
  PreventionProjectRow,
  ManagementReportSignatureItem,
} from "./types";

function getImageBuffer(fileName: string): Buffer | null {
  try {
    const fullPath = path.join(process.cwd(), "public", fileName);
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath);
    }
  } catch {}
  return null;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const [year, month, day] = dateStr.split("-");
    const months = [
      "enero", "febrero", "marzo", "abril", "mayo", "junio",
      "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
    ];
    const mIdx = parseInt(month, 10) - 1;
    return `${day} de ${months[mIdx] || month} de ${year}`;
  } catch {
    return dateStr;
  }
}

export async function generateAnnualManagementReportDocx(data: {
  report: AnnualManagementReportRow;
  institution?: InstitutionRow | null;
}): Promise<Buffer> {
  const { report, institution } = data;

  let recipients: ManagementReportRecipientItem[] = [];
  let professionals: ManagementReportProfessionalItem[] = [];
  let counselingStats: CounselingStatRow[] = [];
  let caseTypologies: CaseTypologyStatRow[] = [];
  let comparativeAnalysis: ComparativeAnalysisRow[] = [];
  let preventionProjects: PreventionProjectRow[] = [];
  let signatures: ManagementReportSignatureItem[] = [];
  let distributivoSummary: any = null;

  try { recipients = JSON.parse(report.recipients_json || "[]"); } catch {}
  try { professionals = JSON.parse(report.professionals_json || "[]"); } catch {}
  try { counselingStats = JSON.parse(report.counseling_stats_json || "[]"); } catch {}
  try { caseTypologies = JSON.parse(report.case_typologies_json || "[]"); } catch {}
  try { comparativeAnalysis = JSON.parse(report.comparative_analysis_json || "[]"); } catch {}
  try { preventionProjects = JSON.parse(report.prevention_projects_json || "[]"); } catch {}
  try { signatures = JSON.parse(report.signatures_json || "[]"); } catch {}
  try { distributivoSummary = JSON.parse(report.distributivo_summary_json || "{}"); } catch {}

  const headerImgBuffer = getImageBuffer("header_4k.png");
  const footerImgBuffer = getImageBuffer("footer_nuevo_ecuador.png");

  const headerElements: Paragraph[] = [];
  if (headerImgBuffer) {
    headerElements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            data: headerImgBuffer,
            transformation: { width: 520, height: 75 },
            type: "png",
          }),
        ],
      })
    );
  }

  const footerElements: Paragraph[] = [];
  if (footerImgBuffer) {
    footerElements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            data: footerImgBuffer,
            transformation: { width: 520, height: 97 },
            type: "png",
          }),
        ],
      })
    );
  }

  const BORDER_BLACK = "000000";
  const GRAY_HEADER = "E2E8F0";
  const GRAY_BG = "F8FAFC";
  const NAVY = "1E3A8A";

  const borderAllBlack = {
    top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_BLACK },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_BLACK },
    left: { style: BorderStyle.SINGLE, size: 4, color: BORDER_BLACK },
    right: { style: BorderStyle.SINGLE, size: 4, color: BORDER_BLACK },
  };

  const bodyChildren: (Paragraph | Table)[] = [];

  // Título inicial
  bodyChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 150 },
      children: [
        new TextRun({
          text: report.title_topic || "INFORME DE GESTIÓN DEL DECE",
          bold: true,
          size: 22,
          color: NAVY,
        }),
      ],
    })
  );

  // 1. DATOS GENERALES
  const datosGenRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 4,
          shading: { fill: GRAY_HEADER },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: "DATOS GENERALES", bold: true, size: 19, color: NAVY }),
              ],
            }),
          ],
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { fill: GRAY_BG },
          children: [new Paragraph({ children: [new TextRun({ text: "Fecha de Informe", bold: true, size: 17 })] })],
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: formatDate(report.report_date), size: 17 })] })],
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { fill: GRAY_BG },
          children: [new Paragraph({ children: [new TextRun({ text: "No. De Informe", bold: true, size: 17 })] })],
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: report.report_code, bold: true, size: 17 })] })],
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 4,
          shading: { fill: GRAY_BG },
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Funcionario Responsable de Informe", bold: true, size: 17, color: NAVY })],
            }),
          ],
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 40, type: WidthType.PERCENTAGE },
          shading: { fill: GRAY_HEADER },
          children: [new Paragraph({ children: [new TextRun({ text: "Nombre", bold: true, size: 16 })] })],
        }),
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          shading: { fill: GRAY_HEADER },
          children: [new Paragraph({ children: [new TextRun({ text: "Contacto / Correo", bold: true, size: 16 })] })],
        }),
        new TableCell({
          columnSpan: 2,
          width: { size: 30, type: WidthType.PERCENTAGE },
          shading: { fill: GRAY_HEADER },
          children: [new Paragraph({ children: [new TextRun({ text: "Cargo", bold: true, size: 16 })] })],
        }),
      ],
    }),
  ];

  professionals.forEach((p) => {
    datosGenRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: p.name, bold: true, size: 16 })] })],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: p.email ? p.email : (p.extension ? `Ext. ${p.extension}` : "—"), size: 15 }),
                ],
              }),
            ],
          }),
          new TableCell({
            columnSpan: 2,
            children: [new Paragraph({ children: [new TextRun({ text: p.cargo, size: 16 })] })],
          }),
        ],
      })
    );
  });

  // Informe dirigido a
  datosGenRows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 4,
          shading: { fill: GRAY_BG },
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Informe dirigido a", bold: true, size: 17, color: NAVY })],
            }),
          ],
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 40, type: WidthType.PERCENTAGE },
          shading: { fill: GRAY_HEADER },
          children: [new Paragraph({ children: [new TextRun({ text: "Nombre", bold: true, size: 16 })] })],
        }),
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          shading: { fill: GRAY_HEADER },
          children: [new Paragraph({ children: [new TextRun({ text: "Contacto / Correo", bold: true, size: 16 })] })],
        }),
        new TableCell({
          columnSpan: 2,
          width: { size: 30, type: WidthType.PERCENTAGE },
          shading: { fill: GRAY_HEADER },
          children: [new Paragraph({ children: [new TextRun({ text: "Cargo", bold: true, size: 16 })] })],
        }),
      ],
    })
  );

  recipients.forEach((r) => {
    datosGenRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: r.name || "—", bold: true, size: 16 })] })],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: r.email ? r.email : (r.extension ? `Ext. ${r.extension}` : "—"), size: 15 }),
                ],
              }),
            ],
          }),
          new TableCell({
            columnSpan: 2,
            children: [new Paragraph({ children: [new TextRun({ text: r.cargo, size: 16 })] })],
          }),
        ],
      })
    );
  });

  // TEMA
  datosGenRows.push(
    new TableRow({
      children: [
        new TableCell({
          width: { size: 20, type: WidthType.PERCENTAGE },
          shading: { fill: GRAY_BG },
          children: [new Paragraph({ children: [new TextRun({ text: "TEMA:", bold: true, size: 17 })] })],
        }),
        new TableCell({
          columnSpan: 3,
          children: [new Paragraph({ children: [new TextRun({ text: report.title_topic, bold: true, size: 16 })] })],
        }),
      ],
    })
  );

  bodyChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: borderAllBlack,
      rows: datosGenRows,
    })
  );

  // 2. ANTECEDENTES
  bodyChildren.push(
    new Paragraph({
      keepNext: true,
      spacing: { before: 140, after: 60 },
      children: [new TextRun({ text: "ANTECEDENTES", bold: true, size: 20, color: NAVY })],
    }),
    new Paragraph({
      keepNext: true,
      spacing: { before: 60, after: 40 },
      children: [new TextRun({ text: "Base Legal", bold: true, size: 18 })],
    }),
    ...report.antecedentes_legal.split("\n\n").map(
      (p) =>
        new Paragraph({
          alignment: smartAlign(String((p) ?? "")),
          spacing: { after: 80 },
          children: [new TextRun({ text: p, size: 17 })],
        })
    ),
    new Paragraph({
      keepNext: true,
      spacing: { before: 80, after: 40 },
      children: [new TextRun({ text: "Diagnóstico situacional de la institución educativa.", bold: true, size: 18 })],
    }),
    new Paragraph({
      alignment: smartAlign(String((report.situational_diagnosis || "—") ?? "")),
      spacing: { after: 100 },
      children: [new TextRun({ text: report.situational_diagnosis || "—", size: 17 })],
    }),
    new Paragraph({
      keepNext: true,
      spacing: { before: 80, after: 40 },
      children: [new TextRun({ text: "Distributivo del DECE", bold: true, size: 18 })],
    })
  );

  // Tabla Distributivo
  const distRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 6,
          shading: { fill: GRAY_BG },
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "Institución Educativa Núcleo: ", bold: true, size: 17 }),
                new TextRun({ text: institution?.name || "UNIDAD EDUCATIVA", size: 17 }),
              ],
            }),
          ],
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 6, type: WidthType.PERCENTAGE },
          shading: { fill: GRAY_HEADER },
          children: [new Paragraph({ children: [new TextRun({ text: "No.", bold: true, size: 15 })] })],
        }),
        new TableCell({
          width: { size: 24, type: WidthType.PERCENTAGE },
          shading: { fill: GRAY_HEADER },
          children: [new Paragraph({ children: [new TextRun({ text: "Nombres y Apellidos / Cargo", bold: true, size: 15 })] })],
        }),
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          shading: { fill: GRAY_HEADER },
          children: [new Paragraph({ children: [new TextRun({ text: "Cobertura Estudiantes", bold: true, size: 15 })] })],
        }),
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          shading: { fill: GRAY_HEADER },
          children: [new Paragraph({ children: [new TextRun({ text: "Jornadas", bold: true, size: 15 })] })],
        }),
        new TableCell({
          width: { size: 22, type: WidthType.PERCENTAGE },
          shading: { fill: GRAY_HEADER },
          children: [new Paragraph({ children: [new TextRun({ text: "Niveles Educativos", bold: true, size: 15 })] })],
        }),
        new TableCell({
          width: { size: 18, type: WidthType.PERCENTAGE },
          shading: { fill: GRAY_HEADER },
          children: [new Paragraph({ children: [new TextRun({ text: "Tiempo labor IE", bold: true, size: 15 })] })],
        }),
      ],
    }),
  ];

  professionals.forEach((p, idx) => {
    distRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: String(idx + 1), size: 16 })] })],
          }),
          new TableCell({
            children: [
              new Paragraph({ children: [new TextRun({ text: p.name, bold: true, size: 16 })] }),
              new Paragraph({ children: [new TextRun({ text: p.cargo, size: 14, color: "475569" })] }),
            ],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: String(p.coverage_students || 0), size: 16 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: p.coverage_jornadas || "Matutina", size: 15 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: p.coverage_levels || "Básica y Bachillerato", size: 15 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: p.tenure_time || "1 año lectivo", size: 15 })] })],
          }),
        ],
      })
    );
  });

  bodyChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: borderAllBlack,
      rows: distRows,
    })
  );

  // 3. ALCANCE
  bodyChildren.push(
    new Paragraph({
      keepNext: true,
      spacing: { before: 100, after: 40 },
      children: [new TextRun({ text: "ALCANCE", bold: true, size: 20, color: NAVY })],
    }),
    new Paragraph({
      alignment: smartAlign(String((report.alcance) ?? "")),
      spacing: { after: 100 },
      children: [new TextRun({ text: report.alcance, size: 17 })],
    })
  );

  // 4. OBJETIVOS
  bodyChildren.push(
    new Paragraph({
      keepNext: true,
      spacing: { before: 80, after: 40 },
      children: [new TextRun({ text: "OBJETIVOS", bold: true, size: 20, color: NAVY })],
    }),
    new Paragraph({
      alignment: smartAlign(String((report.objetivos) ?? "")),
      spacing: { after: 100 },
      children: [new TextRun({ text: report.objetivos, size: 17 })],
    })
  );

  // 5. DESARROLLO O ANÁLISIS
  bodyChildren.push(
    new Paragraph({
      keepNext: true,
      spacing: { before: 120, after: 60 },
      children: [new TextRun({ text: "DESARROLLO O ANÁLISIS", bold: true, size: 20, color: NAVY })],
    }),
    new Paragraph({
      keepNext: true,
      spacing: { before: 60, after: 40 },
      children: [new TextRun({ text: "4.1 EJE DE CONSEJERÍA AEC 1, AEC 2, AEC 3.", bold: true, size: 18 })],
    }),
    new Paragraph({
      keepNext: true,
      children: [
        new TextRun({
          text: "Casos atendidos por el /la profesional del DECE a la comunidad educativa.\nFuente: registros de atención y/o llamadas telefónicas",
          italics: true,
          size: 15,
        }),
      ],
    })
  );

  // Tabla 1: Consejería Atenciones
  const profNames = professionals.map((p) => p.name);
  const colWidthPct = Math.floor(60 / Math.max(1, profNames.length + 1));

  const t1HeaderCells: TableCell[] = [
    new TableCell({
      width: { size: 40, type: WidthType.PERCENTAGE },
      shading: { fill: GRAY_HEADER },
      children: [new Paragraph({ children: [new TextRun({ text: "Casos atendidos por el /la profesional del DECE a la comunidad educativa", bold: true, size: 15 })] })],
    }),
  ];

  profNames.forEach((pn) => {
    t1HeaderCells.push(
      new TableCell({
        width: { size: colWidthPct, type: WidthType.PERCENTAGE },
        shading: { fill: GRAY_HEADER },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: pn, bold: true, size: 14 })] })],
      })
    );
  });

  t1HeaderCells.push(
    new TableCell({
      width: { size: colWidthPct, type: WidthType.PERCENTAGE },
      shading: { fill: GRAY_HEADER },
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "TOTAL", bold: true, size: 15 })] })],
    })
  );

  const t1Rows: TableRow[] = [new TableRow({ children: t1HeaderCells })];

  counselingStats.forEach((cStat) => {
    const rowCells: TableCell[] = [
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: cStat.category, size: 15 })] })],
      }),
    ];

    profNames.forEach((pn) => {
      const val = cStat.values_by_professional?.[pn] || 0;
      rowCells.push(
        new TableCell({
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(val), size: 14 })] })],
        })
      );
    });

    rowCells.push(
      new TableCell({
        shading: { fill: GRAY_BG },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(cStat.total || 0), bold: true, size: 15 })] })],
      })
    );

    t1Rows.push(new TableRow({ children: rowCells }));
  });

  bodyChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: borderAllBlack,
      rows: t1Rows,
    })
  );

  // Tabla 2: Tipología de Casos
  bodyChildren.push(
    new Paragraph({
      keepNext: true,
      spacing: { before: 80, after: 40 },
      children: [
        new TextRun({
          text: `Fuente: Matriz de tipología, embarazos y riesgos psicosociales del año lectivo ${report.school_year_text}`,
          italics: true,
          size: 15,
        }),
      ],
    })
  );

  const t2HeaderCells: TableCell[] = [
    new TableCell({
      width: { size: 40, type: WidthType.PERCENTAGE },
      shading: { fill: GRAY_HEADER },
      children: [new Paragraph({ children: [new TextRun({ text: "Tipo de caso atendidos", bold: true, size: 15 })] })],
    }),
  ];

  profNames.forEach((pn) => {
    t2HeaderCells.push(
      new TableCell({
        width: { size: colWidthPct, type: WidthType.PERCENTAGE },
        shading: { fill: GRAY_HEADER },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: pn, bold: true, size: 14 })] })],
      })
    );
  });

  t2HeaderCells.push(
    new TableCell({
      width: { size: colWidthPct, type: WidthType.PERCENTAGE },
      shading: { fill: GRAY_HEADER },
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "TOTAL", bold: true, size: 15, color: NAVY })] })],
    })
  );

  const t2Rows: TableRow[] = [new TableRow({ children: t2HeaderCells })];

  caseTypologies.forEach((ct) => {
    const rowCells: TableCell[] = [
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: ct.typology, size: 14 })] })],
      }),
    ];

    profNames.forEach((pn) => {
      const val = ct.values_by_professional?.[pn] || 0;
      rowCells.push(
        new TableCell({
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(val), size: 14 })] })],
        })
      );
    });

    rowCells.push(
      new TableCell({
        shading: { fill: GRAY_BG },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(ct.total || 0), bold: true, size: 14 })] })],
      })
    );

    t2Rows.push(new TableRow({ children: rowCells }));
  });

  bodyChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: borderAllBlack,
      rows: t2Rows,
    })
  );

  // Tabla 3: Análisis comparativo 2 años lectivos
  bodyChildren.push(
    new Paragraph({
      keepNext: true,
      spacing: { before: 80, after: 40 },
      children: [
        new TextRun({
          text: "Análisis comparativo de casos de vulnerabilidad (en este apartado se realiza la comparación de los 2 años lectivos y el análisis del porqué aumentó o disminuyó el número de casos):",
          italics: true,
          size: 15,
        }),
      ],
    })
  );

  const t3Rows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          shading: { fill: GRAY_HEADER },
          children: [new Paragraph({ children: [new TextRun({ text: "Tipo de caso atendidos", bold: true, size: 15 })] })],
        }),
        new TableCell({
          width: { size: 12, type: WidthType.PERCENTAGE },
          shading: { fill: GRAY_HEADER },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Año Anterior", bold: true, size: 14 })] })],
        }),
        new TableCell({
          width: { size: 12, type: WidthType.PERCENTAGE },
          shading: { fill: GRAY_HEADER },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Año Actual", bold: true, size: 14 })] })],
        }),
        new TableCell({
          width: { size: 46, type: WidthType.PERCENTAGE },
          shading: { fill: GRAY_HEADER },
          children: [new Paragraph({ children: [new TextRun({ text: "Análisis comparativo de los 2 años lectivos", bold: true, size: 14 })] })],
        }),
      ],
    }),
  ];

  comparativeAnalysis.forEach((ca) => {
    t3Rows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: ca.typology, size: 14 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(ca.previous_year_count || 0), size: 14 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(ca.current_year_count || 0), bold: true, size: 14 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: ca.comparative_analysis || "Sin novedad", size: 14 })] })],
          }),
        ],
      })
    );
  });

  bodyChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: borderAllBlack,
      rows: t3Rows,
    })
  );

  // 4.2 EJE DE ATENCIÓN PSICOSOCIAL
  bodyChildren.push(
    new Paragraph({
      keepNext: true,
      spacing: { before: 100, after: 40 },
      children: [new TextRun({ text: `4.2 EJE DE ATENCIÓN PSICOSOCIAL AÑO LECTIVO ${report.school_year_text}`, bold: true, size: 18 })],
    }),
    new Paragraph({
      alignment: smartAlign(String((report.psychosocial_note || "") ?? "")),
      spacing: { after: 100 },
      children: [new TextRun({ text: report.psychosocial_note || "", italics: true, size: 15, color: "334155" })],
    })
  );

  // 4.3 EJE PROMOCIÓN Y PREVENCIÓN
  bodyChildren.push(
    new Paragraph({
      keepNext: true,
      spacing: { before: 80, after: 40 },
      children: [new TextRun({ text: "4.3 EJE PROMOCIÓN Y PREVENCIÓN", bold: true, size: 18 })],
    })
  );

  const prevRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          shading: { fill: GRAY_HEADER },
          children: [new Paragraph({ children: [new TextRun({ text: "Eje de prevención", bold: true, size: 15 })] })],
        }),
        new TableCell({
          width: { size: 14, type: WidthType.PERCENTAGE },
          shading: { fill: GRAY_HEADER },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "No. Actividades", bold: true, size: 14 })] })],
        }),
        new TableCell({
          width: { size: 14, type: WidthType.PERCENTAGE },
          shading: { fill: GRAY_HEADER },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Estudiantes", bold: true, size: 14 })] })],
        }),
        new TableCell({
          width: { size: 14, type: WidthType.PERCENTAGE },
          shading: { fill: GRAY_HEADER },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Familias", bold: true, size: 14 })] })],
        }),
        new TableCell({
          width: { size: 14, type: WidthType.PERCENTAGE },
          shading: { fill: GRAY_HEADER },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Directivos", bold: true, size: 14 })] })],
        }),
        new TableCell({
          width: { size: 14, type: WidthType.PERCENTAGE },
          shading: { fill: GRAY_HEADER },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Docentes", bold: true, size: 14 })] })],
        }),
      ],
    }),
  ];

  preventionProjects.forEach((pp) => {
    prevRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: pp.theme, size: 15 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(pp.activities_count || 0), size: 15 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(pp.students_beneficiaries || 0), size: 15 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(pp.families_beneficiaries || 0), size: 15 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(pp.authorities_beneficiaries || 0), size: 15 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(pp.teachers_beneficiaries || 0), size: 15 })] })],
          }),
        ],
      })
    );
  });

  bodyChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: borderAllBlack,
      rows: prevRows,
    })
  );

  // 4.4 PROCESOS PENDIENTES
  bodyChildren.push(
    new Paragraph({
      keepNext: true,
      spacing: { before: 80, after: 40 },
      children: [new TextRun({ text: "4.4 PROCESOS PENDIENTES", bold: true, size: 18 })],
    }),
    new Paragraph({
      alignment: smartAlign(String((report.pending_processes || "Sin procesos pendientes.") ?? "")),
      spacing: { after: 100 },
      children: [new TextRun({ text: report.pending_processes || "Sin procesos pendientes.", size: 17 })],
    })
  );

  // 4.5 LOGROS ALCANZADOS Y NUDOS CRÍTICOS
  bodyChildren.push(
    new Paragraph({
      keepNext: true,
      spacing: { before: 80, after: 40 },
      children: [new TextRun({ text: "4.5 LOGROS ALCANZADOS Y NUDOS CRÍTICOS (MÍNIMO 3)", bold: true, size: 18 })],
    }),
    new Paragraph({
      keepNext: true,
      spacing: { before: 40, after: 20 },
      children: [new TextRun({ text: "Logros alcanzados:", bold: true, size: 17 })],
    }),
    new Paragraph({
      alignment: smartAlign(String((report.achievements || "—") ?? "")),
      spacing: { after: 60 },
      children: [new TextRun({ text: report.achievements || "—", size: 17 })],
    }),
    new Paragraph({
      keepNext: true,
      spacing: { before: 40, after: 20 },
      children: [new TextRun({ text: "Nudos críticos (MÍNIMO 3):", bold: true, size: 17 })],
    }),
    new Paragraph({
      alignment: smartAlign(String((report.critical_knots || "—") ?? "")),
      spacing: { after: 100 },
      children: [new TextRun({ text: report.critical_knots || "—", size: 17 })],
    })
  );

  // CONCLUSIONES
  bodyChildren.push(
    new Paragraph({
      keepNext: true,
      spacing: { before: 120, after: 40 },
      children: [new TextRun({ text: "CONCLUSIONES", bold: true, size: 20, color: NAVY })],
    }),
    new Paragraph({
      keepNext: true,
      spacing: { before: 40, after: 20 },
      children: [new TextRun({ text: "Eje de Consejería:", bold: true, size: 17 })],
    }),
    new Paragraph({
      alignment: smartAlign(String((report.conclusions_counseling || "—") ?? "")),
      spacing: { after: 60 },
      children: [new TextRun({ text: report.conclusions_counseling || "—", size: 17 })],
    }),
    new Paragraph({
      keepNext: true,
      spacing: { before: 40, after: 20 },
      children: [new TextRun({ text: "Eje de Promoción y Prevención:", bold: true, size: 17 })],
    }),
    new Paragraph({
      alignment: smartAlign(String((report.conclusions_prevention || "—") ?? "")),
      spacing: { after: 60 },
      children: [new TextRun({ text: report.conclusions_prevention || "—", size: 17 })],
    }),
    new Paragraph({
      keepNext: true,
      spacing: { before: 40, after: 20 },
      children: [new TextRun({ text: "Eje de Atención Psicosocial:", bold: true, size: 17 })],
    }),
    new Paragraph({
      alignment: smartAlign(String((report.conclusions_psychosocial || "—") ?? "")),
      spacing: { after: 60 },
      children: [new TextRun({ text: report.conclusions_psychosocial || "—", size: 17 })],
    }),
    new Paragraph({
      keepNext: true,
      spacing: { before: 40, after: 20 },
      children: [new TextRun({ text: "Eje de Inclusión Socioeducativa:", bold: true, size: 17 })],
    }),
    new Paragraph({
      alignment: smartAlign(String((report.conclusions_inclusion || "—") ?? "")),
      spacing: { after: 100 },
      children: [new TextRun({ text: report.conclusions_inclusion || "—", size: 17 })],
    })
  );

  // RECOMENDACIONES
  bodyChildren.push(
    new Paragraph({
      keepNext: true,
      spacing: { before: 120, after: 40 },
      children: [new TextRun({ text: "RECOMENDACIONES", bold: true, size: 20, color: NAVY })],
    }),
    new Paragraph({
      keepNext: true,
      spacing: { before: 40, after: 20 },
      children: [
        new TextRun({
          text: "1. Sugerencias a las autoridades institucionales, equipo docente y administrativos para mejorar el trabajo con el DECE:",
          bold: true,
          size: 17,
        }),
      ],
    }),
    new Paragraph({
      alignment: smartAlign(String((report.recommendations_institutional || "—") ?? "")),
      spacing: { after: 80 },
      children: [new TextRun({ text: report.recommendations_institutional || "—", size: 17 })],
    }),
    new Paragraph({
      keepNext: true,
      spacing: { before: 40, after: 20 },
      children: [
        new TextRun({
          text: "2. Sugerencias a las autoridades distritales para mejorar el trabajo con el DECE institucional:",
          bold: true,
          size: 17,
        }),
      ],
    }),
    new Paragraph({
      alignment: smartAlign(String((report.recommendations_district || "—") ?? "")),
      spacing: { after: 100 },
      children: [new TextRun({ text: report.recommendations_district || "—", size: 17 })],
    })
  );

  // ANEXOS
  bodyChildren.push(
    new Paragraph({
      keepNext: true,
      spacing: { before: 100, after: 40 },
      children: [new TextRun({ text: "ANEXOS", bold: true, size: 20, color: NAVY })],
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: "REGISTRO FOTOGRÁFICO DE CADA PROYECTO EJECUTADO DEL PLAN DE ACCIÓN Y ACTIVIDADES RELEVANTES EXTERNAS AL PLAN DE ACCIÓN (4.3 EJE PROMOCIÓN Y PREVENCIÓN).\nNota: Todo lo indicado en el presente informe debe estar sustentado en los archivos físicos o digitales que reposa en cada DECE.",
          italics: true,
          size: 15,
        }),
      ],
    })
  );

  // FIRMAS DE LEGALIZACIÓN
  const desarrolloSignatures = signatures.filter((s) => s.type === "DESARROLLO");
  const aprobacionSignatures = signatures.filter((s) => s.type === "APROBACION");

  // Tabla Desarrollo
  const desRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 3,
          shading: { fill: GRAY_HEADER },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "DESARROLLO DEL DOCUMENTO", bold: true, size: 16, color: NAVY })] })],
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 45, type: WidthType.PERCENTAGE },
          shading: { fill: GRAY_BG },
          children: [new Paragraph({ children: [new TextRun({ text: "Nombre / Cargo", bold: true, size: 15 })] })],
        }),
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          shading: { fill: GRAY_BG },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Firma", bold: true, size: 15 })] })],
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { fill: GRAY_BG },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Fecha", bold: true, size: 15 })] })],
        }),
      ],
    }),
  ];

  desarrolloSignatures.forEach((s) => {
    desRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({ children: [new TextRun({ text: s.name, bold: true, size: 16 })] }),
              new Paragraph({ children: [new TextRun({ text: s.cargo, size: 14, color: "475569" })] }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({ spacing: { before: 200, after: 100 }, children: [new TextRun({ text: "" })] }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: formatDate(s.date || report.report_date), size: 15 })] }),
            ],
          }),
        ],
      })
    );
  });

  // Tabla Aprobación
  const aprRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 3,
          shading: { fill: GRAY_HEADER },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "APROBACIÓN DEL DOCUMENTO", bold: true, size: 16, color: NAVY })] })],
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 45, type: WidthType.PERCENTAGE },
          shading: { fill: GRAY_BG },
          children: [new Paragraph({ children: [new TextRun({ text: "Nombre / Cargo", bold: true, size: 15 })] })],
        }),
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          shading: { fill: GRAY_BG },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Firma", bold: true, size: 15 })] })],
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { fill: GRAY_BG },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Fecha", bold: true, size: 15 })] })],
        }),
      ],
    }),
  ];

  const targetApr = aprobacionSignatures.length > 0 ? aprobacionSignatures : [{ name: "", cargo: "RECTOR / RECTORA DE LA IE", date: report.report_date, type: "APROBACION" as const }];

  targetApr.forEach((s) => {
    aprRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({ children: [new TextRun({ text: s.name || "______________________", bold: true, size: 16 })] }),
              new Paragraph({ children: [new TextRun({ text: s.cargo, size: 14, color: "475569" })] }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({ spacing: { before: 200, after: 100 }, children: [new TextRun({ text: "" })] }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: formatDate(s.date || report.report_date), size: 15 })] }),
            ],
          }),
        ],
      })
    );
  });

  bodyChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: borderAllBlack,
      rows: desRows,
    }),
    new Paragraph({ spacing: { after: 80 } }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: borderAllBlack,
      rows: aprRows,
    })
  );

  const FONT_NAME = "Arial";
  const doc = new Document({
    creator: "DECE App",
    title: `Informe de Gestión DECE - ${report.report_code}`,
    description: "Informe de Fin de Gestión del DECE conforme a normativa MINEDUC",
    styles: {
      default: {
        document: {
          run: {
            font: FONT_NAME,
            size: 20,
            color: "000000",
          },
          paragraph: {
            spacing: {
              line: 260,
              after: 80,
            },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4
            margin: { top: 1134, bottom: 1134, left: 1417, right: 1417 },
          },
        },
        headers: {
          default: new Header({ children: headerElements }),
        },
        footers: {
          default: new Footer({ children: footerElements }),
        },
        children: bodyChildren,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
