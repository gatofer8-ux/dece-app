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
  ShadingType,
  Footer,
  PageNumber,
  HeadingLevel,
} from "docx";

const FONT = "Arial";
const PAGE_W = 11906; // A4
const MARGIN = { top: 1000, right: 1000, bottom: 1000, left: 1000 };
const USABLE = PAGE_W - MARGIN.left - MARGIN.right;

const CUT_BORDER = {
  style: BorderStyle.DASHED,
  size: 8,
  color: "64748B", // slate-500
};

const ALL_CUT_BORDERS = {
  top: CUT_BORDER,
  bottom: CUT_BORDER,
  left: CUT_BORDER,
  right: CUT_BORDER,
};

const SOLID_BORDER = {
  style: BorderStyle.SINGLE,
  size: 6,
  color: "0F172A",
};

const ALL_SOLID_BORDERS = {
  top: SOLID_BORDER,
  bottom: SOLID_BORDER,
  left: SOLID_BORDER,
  right: SOLID_BORDER,
};

function pRun(text: string, o: { bold?: boolean; italics?: boolean; size?: number; color?: string } = {}) {
  return new TextRun({
    text,
    bold: o.bold,
    italics: o.italics,
    size: o.size ?? 20, // 10pt default
    color: o.color ?? "0F172A",
    font: FONT,
  });
}

function headerBanner(title: string, subtitle: string, institutionName?: string): Paragraph[] {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        pRun(institutionName ? institutionName.toUpperCase() : "INSTITUCIÓN EDUCATIVA", {
          bold: true,
          size: 22,
          color: "1E293B",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        pRun("DEPARTAMENTO DE CONSEJERÍA ESTUDIANTIL (DECE) • SADEX", {
          bold: true,
          size: 18,
          color: "0284C7",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 140 },
      children: [
        pRun(title, { bold: true, size: 24, color: "0F172A" }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        pRun(subtitle, { italics: true, size: 18, color: "475569" }),
      ],
    }),
  ];
}

/** 1. Casos de Simulación para Prevención del Suicidio */
export async function generateSuicidioCasesDocx(institutionName?: string): Promise<Buffer> {
  const casesData = [
    {
      num: 1,
      level: "NIVEL DE RIESGO BAJO (VERDE)",
      badgeColor: "DCFCE7",
      textColor: "166534",
      age: "15 años",
      diag: "Estrés académico, ansiedad leve ante exámenes",
      fam: "Familia con apoyo moderado; presión parental por obtener calificaciones de excelencia.",
      esc: "Buen rendimiento escolar previo; aislamiento ocasional durante semanas de evaluaciones.",
      sit: "El estudiante ha mencionado sentirse abrumado en conversaciones informales con compañeros. No expresa ideación suicida ni autolesiones, pero manifiesta cansancio emocional persistente y temor al fracaso.",
    },
    {
      num: 2,
      level: "NIVEL DE RIESGO MODERADO (AMARILLO)",
      badgeColor: "FEF08A",
      textColor: "854D0E",
      age: "17 años",
      diag: "Tristeza profunda prolongada, pensamientos de escape no estructurados",
      fam: "Conflictos intrafamiliares severos, distanciamiento afectivo y falta de escucha en el hogar.",
      esc: "Caída drástica en el rendimiento escolar, abandono de actividades deportivas y aislamiento social creciente.",
      sit: "El estudiante le confió a un docente tutor que siente que 'estaría mejor si no despertara mañana'. No cuenta con un plan específico ni antecedentes de intento, pero muestra deterioro significativo de su autoimagen.",
    },
    {
      num: 3,
      level: "NIVEL DE RIESGO ALTO (NARANJA)",
      badgeColor: "FFEDD5",
      textColor: "9A3412",
      age: "16 años",
      diag: "Trastorno del estado de ánimo, historial de autolesiones y desesperanza",
      fam: "Hogar disfuncional con antecedentes familiares de salud mental no tratados.",
      esc: "Problemas graves de conducta, ausentismo injustificado y aislamiento total de su grupo de pares.",
      sit: "El estudiante tuvo un intento autolítico reciente en su domicilio y se reincorpora al aula. En sus libretas se han encontrado notas de despedida veladas y marcas de cortes en sus antebrazos.",
    },
    {
      num: 4,
      level: "NIVEL DE RIESGO CRÍTICO (ROJO - EMERGENCIA)",
      badgeColor: "FEE2E2",
      textColor: "991B1B",
      age: "14 años",
      diag: "Ideación suicida estructurada con método definido e inminencia",
      fam: "Entorno familiar hostil con negligencia grave y violencia intrafamiliar reportada.",
      esc: "Aislamiento extremo, despedida de amigos cercanos regalando sus pertenencias personales.",
      sit: "El estudiante ha manifestado a dos compañeros un plan concreto para atentar contra su vida en el transcurso del día, indicando lugar y medio. ¡Requiere activación emergente de ECU-911 y contención inmediata!",
    },
    {
      num: 5,
      level: "NIVEL DE RIESGO BAJO / PREVENTIVO (VERDE)",
      badgeColor: "DCFCE7",
      textColor: "166534",
      age: "12 años",
      diag: "Dificultades de adaptación y timidez extrema",
      fam: "Familia protectora pero con dificultades para fomentar habilidades sociales.",
      esc: "Dificultad para hacer amigos, permanece solo durante los recreos; blanco de burlas ocasionales.",
      sit: "El estudiante no presenta ideación autolítica, pero manifiesta soledad y tristeza. Requiere fortalecimiento de habilidades de asertividad, integración y monitoreo de convivencia armónica.",
    },
    {
      num: 6,
      level: "NIVEL DE RIESGO MODERADO (AMARILLO)",
      badgeColor: "FEF08A",
      textColor: "854D0E",
      age: "14 años",
      diag: "Baja autoestima, frustración académica y labilidad emocional",
      fam: "Poco diálogo emocional en casa; padres ausentes por jornadas laborales extensas.",
      esc: "Bajo rendimiento en materias cuantitativas; comentarios frecuentes de 'yo no sirvo para nada'.",
      sit: "El estudiante llora con frecuencia en los cambios de hora y expresa desesperanza sobre su futuro. No hay plan estructurado, pero requiere apoyo psicoemocional y vinculación con tutor.",
    },
  ];

  const tableRows: TableRow[] = [];

  for (const c of casesData) {
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: USABLE, type: WidthType.DXA },
            borders: ALL_CUT_BORDERS,
            shading: { fill: "FFFFFF", type: ShadingType.CLEAR },
            margins: { top: 200, bottom: 200, left: 240, right: 240 },
            children: [
              new Paragraph({
                spacing: { after: 60 },
                children: [
                  pRun("✂️  RECORTAR POR LA LÍNEA PUNTEADA  •  TARJETA DE CASO #" + c.num, {
                    bold: true,
                    size: 16,
                    color: "64748B",
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 120 },
                children: [
                  pRun(c.level, { bold: true, size: 20, color: c.textColor }),
                ],
              }),
              new Paragraph({
                spacing: { after: 60 },
                children: [
                  pRun("Edad: ", { bold: true, size: 18 }),
                  pRun(c.age + "   |   ", { size: 18 }),
                  pRun("Diagnóstico / Motivo: ", { bold: true, size: 18 }),
                  pRun(c.diag, { size: 18 }),
                ],
              }),
              new Paragraph({
                spacing: { after: 60 },
                children: [
                  pRun("Contexto Familiar: ", { bold: true, size: 18 }),
                  pRun(c.fam, { size: 18 }),
                ],
              }),
              new Paragraph({
                spacing: { after: 60 },
                children: [
                  pRun("Contexto Escolar: ", { bold: true, size: 18 }),
                  pRun(c.esc, { size: 18 }),
                ],
              }),
              new Paragraph({
                spacing: { after: 120 },
                children: [
                  pRun("Situación Observada: ", { bold: true, size: 18 }),
                  pRun(c.sit, { italics: true, size: 18 }),
                ],
              }),
              new Paragraph({
                spacing: { after: 40 },
                children: [
                  pRun("PREGUNTAS GUÍA PARA EL GRUPO DE TRABAJO:", { bold: true, size: 16, color: "0284C7" }),
                ],
              }),
              new Paragraph({
                spacing: { after: 20 },
                children: [
                  pRun("1. ¿Qué factores de riesgo y señales de alerta identificaron en este caso?", { size: 16 }),
                ],
              }),
              new Paragraph({
                spacing: { after: 20 },
                children: [
                  pRun("2. ¿Qué respuestas de los compañeros o docentes empeorarían su situación?", { size: 16 }),
                ],
              }),
              new Paragraph({
                spacing: { after: 40 },
                children: [
                  pRun("3. ¿Cuál es el paso concreto que debe activarse de inmediato según el protocolo institucional?", { size: 16 }),
                ],
              }),
            ],
          }),
        ],
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner(
            "MATERIAL RECORTABLE: TARJETAS DE CASOS DE SIMULACIÓN",
            "Taller de Prevención del Suicidio y Conductas Autolíticas (Acuerdo 044-A)",
            institutionName
          ),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              pRun(
                "Instrucciones: Imprimir las hojas y recortar cada caso por la línea punteada (✂️). Entregar un caso a cada subgrupo de docentes o estudiantes para su análisis reflexivo durante la sesión.",
                { italics: true, size: 18, color: "475569" }
              ),
            ],
          }),
          new Table({
            width: { size: USABLE, type: WidthType.DXA },
            rows: tableRows,
          }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

/** 2. Guía de Señales de Alerta y Mitos vs Realidades */
export async function generateSuicidioGuideDocx(institutionName?: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner(
            "FICHA PEDAGÓGICA: SEÑALES TEMPRANAS Y MITOS VS. REALIDADES",
            "Herramienta Informativa y de Actuación Rápida para el Aula",
            institutionName
          ),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              pRun("1. SEÑALES DE ALERTA QUE NO DEBEMOS IGNORAR", { bold: true, size: 22, color: "0284C7" }),
            ],
          }),
          new Table({
            width: { size: USABLE, type: WidthType.DXA },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: USABLE / 3, type: WidthType.DXA },
                    shading: { fill: "F1F5F9" },
                    children: [
                      new Paragraph({ children: [pRun("SEÑALES VERBALES", { bold: true, size: 18 })] }),
                      new Paragraph({ children: [pRun("• 'Desearía no haber nacido'.\n• 'Pronto ya no seré una carga'.\n• 'No le encuentro sentido a nada'.\n• Despedidas inusuales a amigos.", { size: 16 })] }),
                    ],
                  }),
                  new TableCell({
                    width: { size: USABLE / 3, type: WidthType.DXA },
                    shading: { fill: "F1F5F9" },
                    children: [
                      new Paragraph({ children: [pRun("SEÑALES CONDUCTUALES", { bold: true, size: 18 })] }),
                      new Paragraph({ children: [pRun("• Regalar pertenencias queridas.\n• Cortes o quemaduras en la piel.\n• Aislamiento repentino y mutismo.\n• Búsqueda de métodos en internet.", { size: 16 })] }),
                    ],
                  }),
                  new TableCell({
                    width: { size: USABLE / 3, type: WidthType.DXA },
                    shading: { fill: "F1F5F9" },
                    children: [
                      new Paragraph({ children: [pRun("CAMBIOS EMOCIONALES", { bold: true, size: 18 })] }),
                      new Paragraph({ children: [pRun("• Calma repentina tras depresión.\n• Labilidad extrema o llanto.\n• Irritabilidad e ira explosiva.\n• Desesperanza profunda.", { size: 16 })] }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 240, after: 120 },
            children: [
              pRun("2. MITOS VS. REALIDADES SOBRE EL SUICIDIO", { bold: true, size: 22, color: "0284C7" }),
            ],
          }),
          new Table({
            width: { size: USABLE, type: WidthType.DXA },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: USABLE / 2, type: WidthType.DXA },
                    shading: { fill: "FEE2E2" },
                    children: [
                      new Paragraph({ children: [pRun("MITOS COMUNES (FALSO)", { bold: true, size: 18, color: "991B1B" })] }),
                      new Paragraph({ children: [pRun("❌ 'El que se va a suicidar no lo dice, lo hace'.", { bold: true, size: 16 })] }),
                      new Paragraph({ children: [pRun("❌ 'Hablar del suicidio incita a que lo cometan'.", { bold: true, size: 16 })] }),
                      new Paragraph({ children: [pRun("❌ 'Solo quieren llamar la atención'.", { bold: true, size: 16 })] }),
                      new Paragraph({ children: [pRun("❌ 'El suicidio es un acto de cobardía o de valentía'.", { bold: true, size: 16 })] }),
                    ],
                  }),
                  new TableCell({
                    width: { size: USABLE / 2, type: WidthType.DXA },
                    shading: { fill: "DCFCE7" },
                    children: [
                      new Paragraph({ children: [pRun("REALIDAD CIENTÍFICA (VERDADERO)", { bold: true, size: 18, color: "166534" })] }),
                      new Paragraph({ children: [pRun("✔ 8 de cada 10 personas dan señales o advertencias previas.", { size: 16 })] }),
                      new Paragraph({ children: [pRun("✔ Hablar de forma respetuosa alivia y abre la puerta a la ayuda.", { size: 16 })] }),
                      new Paragraph({ children: [pRun("✔ Toda expresión de dolor es un pedido urgente de auxilio.", { size: 16 })] }),
                      new Paragraph({ children: [pRun("✔ Es el resultado de un dolor psicológico intolerable que requiere tratamiento.", { size: 16 })] }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 240, after: 120 },
            children: [
              pRun("3. NÚMEROS DE EMERGENCIA Y APOYO PERMANENTE 24/7", { bold: true, size: 22, color: "0284C7" }),
            ],
          }),
          new Table({
            width: { size: USABLE, type: WidthType.DXA },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: USABLE, type: WidthType.DXA },
                    shading: { fill: "EFF6FF" },
                    children: [
                      new Paragraph({ children: [pRun("📞 LÍNEA NACIONAL DE SALUD MENTAL: Marca 171 (Opción 6) - Gratuita y confidencial.", { bold: true, size: 18, color: "1E40AF" })] }),
                      new Paragraph({ children: [pRun("🚨 EMERGENCIAS INMINENTES: ECU-911 las 24 horas del día a nivel nacional.", { bold: true, size: 18, color: "B91C1C" })] }),
                      new Paragraph({ children: [pRun("🏫 DEPARTAMENTO DE CONSEJERÍA ESTUDIANTIL (DECE): Tu espacio seguro en la institución.", { bold: true, size: 18, color: "0284C7" })] }),
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

/** 3. Guía de Bolsillo de Primeros Auxilios Psicológicos (PAP) para Docentes */
export async function generatePapPocketGuideDocx(institutionName?: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner(
            "GUÍA DE BOLSILLO: PRIMEROS AUXILIOS PSICOLÓGICOS (PAP)",
            "Protocolo Rápido de Contención en el Aula para Personal Docente",
            institutionName
          ),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              pRun("✂️  RECORTAR Y PLEGAR EN TRES PARTES PARA LLEVAR EN EL CUADERNO PEDAGÓGICO", {
                bold: true,
                size: 16,
                color: "64748B",
              }),
            ],
          }),
          new Table({
            width: { size: USABLE, type: WidthType.DXA },
            borders: ALL_SOLID_BORDERS,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: USABLE, type: WidthType.DXA },
                    shading: { fill: "0F172A" },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [pRun("EL PENTÁGONO DE LOS PAP (5 PRINCIPIOS DE ACCIÓN)", { bold: true, size: 18, color: "FFFFFF" })],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: USABLE, type: WidthType.DXA },
                    children: [
                      new Paragraph({ children: [pRun("1. ESCUCHAR: ", { bold: true, size: 16 }), pRun("Ponte a su nivel, mantén contacto visual tranquilo y escucha sin interrumpir.", { size: 16 })] }),
                      new Paragraph({ children: [pRun("2. PROTEGER: ", { bold: true, size: 16 }), pRun("Aleja al estudiante de miradas ajenas. Bríndale un espacio ventilado y seguro.", { size: 16 })] }),
                      new Paragraph({ children: [pRun("3. CONSOLAR: ", { bold: true, size: 16 }), pRun("Ayuda a regular la respiración. Ofrece agua. Valida sus emociones sin juzgar.", { size: 16 })] }),
                      new Paragraph({ children: [pRun("4. INFORMAR: ", { bold: true, size: 16 }), pRun("Responde con hechos reales y claros. Disminuye la incertidumbre y desmiente rumores.", { size: 16 })] }),
                      new Paragraph({ children: [pRun("5. CONECTAR: ", { bold: true, size: 16 }), pRun("No lo dejes solo. Notifica de inmediato al DECE y al representante legal.", { size: 16 })] }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 200, after: 120 },
            children: [pRun("¿QUÉ HACER VS. QUÉ EVITAR EN UNA CRISIS?", { bold: true, size: 20, color: "0284C7" })],
          }),
          new Table({
            width: { size: USABLE, type: WidthType.DXA },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: USABLE / 2, type: WidthType.DXA },
                    shading: { fill: "DCFCE7" },
                    children: [
                      new Paragraph({ children: [pRun("QUÉ HACER (RECOMENDADO)", { bold: true, size: 18, color: "166534" })] }),
                      new Paragraph({ children: [pRun("✔ Usa tono de voz calmado y pausado.", { size: 16 })] }),
                      new Paragraph({ children: [pRun("✔ Di: 'Estás a salvo, estoy aquí contigo'.", { size: 16 })] }),
                      new Paragraph({ children: [pRun("✔ Respeta si no desea hablar en ese momento.", { size: 16 })] }),
                      new Paragraph({ children: [pRun("✔ Acompaña físicamente al estudiante al DECE.", { size: 16 })] }),
                    ],
                  }),
                  new TableCell({
                    width: { size: USABLE / 2, type: WidthType.DXA },
                    shading: { fill: "FEE2E2" },
                    children: [
                      new Paragraph({ children: [pRun("QUÉ EVITAR (PERJUDICIAL)", { bold: true, size: 18, color: "991B1B" })] }),
                      new Paragraph({ children: [pRun("❌ Decir: 'Cálmate', 'No es para tanto', 'Sé fuerte'.", { size: 16 })] }),
                      new Paragraph({ children: [pRun("❌ Forzarlo a contar los detalles del trauma.", { size: 16 })] }),
                      new Paragraph({ children: [pRun("❌ Hacer promesas que no puedas cumplir.", { size: 16 })] }),
                      new Paragraph({ children: [pRun("❌ Dejarlo solo en el pasillo o baño.", { size: 16 })] }),
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

/** 4. Tarjetas Recortables de Grounding y Respiración */
export async function generateGroundingCardsDocx(institutionName?: string): Promise<Buffer> {
  const cards = [
    {
      title: "TÉCNICA 5-4-3-2-1 (ENRAIZAMIENTO SENSORIAL)",
      desc: "Úsala cuando sientas que la ansiedad o el pánico te abruman:",
      steps: [
        "👀 Mira 5 cosas a tu alrededor (el reloj, la ventana, tus zapatos...).",
        "✋ Toca 4 objetos con texturas distintas (tu ropa, la mesa, tu cabello...).",
        "👂 Escucha 3 sonidos cercanos o lejanos (el viento, pasos, tu respiración).",
        "👃 Huele 2 aromas presentes en el ambiente.",
        "👅 Saborea 1 sabor en tu boca o di una afirmación positiva sobre ti.",
      ],
    },
    {
      title: "RESPIRACIÓN CUADRADA 4-4-4-4 (CALMA INMEDIATA)",
      desc: "Regula los latidos de tu corazón y relaja tu sistema nervioso:",
      steps: [
        "1. Inhala suavemente por la nariz contando mentalmente: 1, 2, 3, 4.",
        "2. Sostén el aire en tus pulmones contando: 1, 2, 3, 4.",
        "3. Exhala despacio por la boca contando: 1, 2, 3, 4.",
        "4. Espera sin tomar aire contando: 1, 2, 3, 4.",
        "Repite este ciclo 4 veces seguidas hasta sentir tranquilidad.",
      ],
    },
    {
      title: "ANCLAJE DE SEGURIDAD EMOCIONAL",
      desc: "Recordatorios para cuando la mente se llena de miedo:",
      steps: [
        "• 'Esta emoción es temporal y pasará pronto'.",
        "• 'Aquí y ahora estoy a salvo; puedo dar un paso a la vez'.",
        "• 'Tengo personas que me aprecian y están dispuestas a ayudarme'.",
        "• Pon tu mano sobre tu pecho y siente el ritmo suave de tu corazón.",
      ],
    },
    {
      title: "MI RED DE APOYO Y CONTACTO DE EMERGENCIA",
      desc: "Personas de confianza a las que puedo acudir hoy:",
      steps: [
        "1. Mi familiar de confianza: ____________________________________",
        "2. Mi docente o tutor de apoyo: ________________________________",
        "3. Departamento DECE: Oficina de Consejería Estudiantil.",
        "4. Línea Gratuita de Salud Mental: 171 (Opción 6).",
        "5. Emergencias Inmediatas: 911.",
      ],
    },
  ];

  const rows: TableRow[] = [];
  for (const c of cards) {
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: USABLE, type: WidthType.DXA },
            borders: ALL_CUT_BORDERS,
            margins: { top: 160, bottom: 160, left: 200, right: 200 },
            children: [
              new Paragraph({ children: [pRun("✂️  TARJETA RECORTABLE DE REGULACIÓN EMOCIONAL", { bold: true, size: 14, color: "64748B" })] }),
              new Paragraph({ children: [pRun(c.title, { bold: true, size: 18, color: "0284C7" })] }),
              new Paragraph({ spacing: { after: 80 }, children: [pRun(c.desc, { italics: true, size: 16 })] }),
              ...c.steps.map((s) => new Paragraph({ spacing: { after: 40 }, children: [pRun(s, { size: 16 })] })),
            ],
          }),
        ],
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner(
            "TARJETAS RECORTABLES DE CALMA Y REGULACIÓN EMOCIONAL",
            "Técnicas de Respiración y Grounding para el Aula y el Hogar",
            institutionName
          ),
          new Table({ width: { size: USABLE, type: WidthType.DXA }, rows }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

/** 5. Ficha Didáctica: Mi Flor de Fortalezas (Taller de Autoestima) */
export async function generateFlowerFortalezasDocx(institutionName?: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner(
            "FICHA DIDÁCTICA RECORTABLE: 'MI FLOR DE FORTALEZAS'",
            "Taller de Autoestima: 'El Jardín de Mis Superpoderes' (Para Niñas y Niños)",
            institutionName
          ),
          new Paragraph({
            spacing: { after: 140 },
            children: [
              pRun("Estudiante: __________________________________________________  Grado/Paralelo: ____________  Fecha: ____________", {
                bold: true,
                size: 16,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              pRun(
                "Instrucciones: Dibuja tu carita feliz en el círculo central de la flor. Luego, escribe o dibuja en cada uno de los pétalos recortables tus fortalezas. Recorta los pétalos por las líneas punteadas (✂️) y pégalos alrededor de tu flor.",
                { italics: true, size: 16, color: "475569" }
              ),
            ],
          }),
          new Table({
            width: { size: USABLE, type: WidthType.DXA },
            borders: ALL_CUT_BORDERS,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: USABLE / 2, type: WidthType.DXA },
                    margins: { top: 200, bottom: 200, left: 200, right: 200 },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [pRun("🌸 PÉTALO 1 (RECORTAR)", { bold: true, size: 16, color: "DB2777" })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 120 }, children: [pRun("Algo en lo que soy súper bueno/a es:\n\n____________________________________", { size: 16 })] }),
                    ],
                  }),
                  new TableCell({
                    width: { size: USABLE / 2, type: WidthType.DXA },
                    margins: { top: 200, bottom: 200, left: 200, right: 200 },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [pRun("🌸 PÉTALO 2 (RECORTAR)", { bold: true, size: 16, color: "DB2777" })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 120 }, children: [pRun("Una buena acción que hice por alguien:\n\n____________________________________", { size: 16 })] }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: USABLE / 2, type: WidthType.DXA },
                    margins: { top: 200, bottom: 200, left: 200, right: 200 },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [pRun("🌸 PÉTALO 3 (RECORTAR)", { bold: true, size: 16, color: "DB2777" })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 120 }, children: [pRun("Lo que más me hace sonreír en la vida:\n\n____________________________________", { size: 16 })] }),
                    ],
                  }),
                  new TableCell({
                    width: { size: USABLE / 2, type: WidthType.DXA },
                    margins: { top: 200, bottom: 200, left: 200, right: 200 },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [pRun("🌸 PÉTALO 4 (RECORTAR)", { bold: true, size: 16, color: "DB2777" })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 120 }, children: [pRun("Un sueño grande que quiero alcanzar:\n\n____________________________________", { size: 16 })] }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: USABLE / 2, type: WidthType.DXA },
                    margins: { top: 200, bottom: 200, left: 200, right: 200 },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [pRun("🌸 PÉTALO 5 (RECORTAR)", { bold: true, size: 16, color: "DB2777" })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 120 }, children: [pRun("Mis amigos me aprecian porque yo:\n\n____________________________________", { size: 16 })] }),
                    ],
                  }),
                  new TableCell({
                    width: { size: USABLE / 2, type: WidthType.DXA },
                    margins: { top: 200, bottom: 200, left: 200, right: 200 },
                    children: [
                      new Paragraph({ alignment: AlignmentType.CENTER, children: [pRun("🌸 PÉTALO 6 (RECORTAR)", { bold: true, size: 16, color: "DB2777" })] }),
                      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 120 }, children: [pRun("Lo que más me gusta de mi forma de ser:\n\n____________________________________", { size: 16 })] }),
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

/** 6. Tarjetas Coleccionables de Afirmaciones */
export async function generateAffirmationCardsDocx(institutionName?: string): Promise<Buffer> {
  const affirmations = [
    "⭐ 'Soy una persona única, valiosa e irrepetible'.",
    "💪 'Mis errores no me definen; me enseñan a crecer'.",
    "🎨 'Mis talentos y creatividad hacen el mundo mejor'.",
    "🤝 'Merezco respeto y trato con amor a mis compañeros'.",
    "🦁 'Soy valiente para pedir ayuda cuando la necesito'.",
    "🌈 'Mis sentimientos importan y está bien sentirlos'.",
    "🚀 'Con esfuerzo y paciencia puedo alcanzar mis metas'.",
    "💖 'Hoy elijo sentirme orgulloso de lo que soy'.",
  ];

  const rows: TableRow[] = [];
  for (let i = 0; i < affirmations.length; i += 2) {
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: USABLE / 2, type: WidthType.DXA },
            borders: ALL_CUT_BORDERS,
            margins: { top: 200, bottom: 200, left: 180, right: 180 },
            children: [
              new Paragraph({ alignment: AlignmentType.CENTER, children: [pRun("SUPERPODER EMOCIONAL #" + (i + 1), { bold: true, size: 14, color: "D97706" })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [pRun(affirmations[i], { bold: true, size: 18, color: "1E293B" })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [pRun("SADEX • DECE", { size: 12, color: "94A3B8" })] }),
            ],
          }),
          new TableCell({
            width: { size: USABLE / 2, type: WidthType.DXA },
            borders: ALL_CUT_BORDERS,
            margins: { top: 200, bottom: 200, left: 180, right: 180 },
            children: [
              new Paragraph({ alignment: AlignmentType.CENTER, children: [pRun("SUPERPODER EMOCIONAL #" + (i + 2), { bold: true, size: 14, color: "D97706" })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: [pRun(affirmations[i + 1], { bold: true, size: 18, color: "1E293B" })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [pRun("SADEX • DECE", { size: 12, color: "94A3B8" })] }),
            ],
          }),
        ],
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner(
            "TARJETAS COLECCIONABLES DE AFIRMACIONES POSITIVAS",
            "Incentivos Didácticos Recortables para Guardar en la Cartuchera",
            institutionName
          ),
          new Table({ width: { size: USABLE, type: WidthType.DXA }, rows }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

/** 7. Matriz de Análisis de Contexto DECE */
export async function generateDeceContextMatrixDocx(institutionName?: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner(
            "MATRIZ DE DIAGNÓSTICO CONTEXTUAL Y FACTORES DE RIESGO DECE",
            "Taller Especializado: Enfoque de Derechos y Determinantes Sociales",
            institutionName
          ),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              pRun(
                "Instrucciones: En mesas de trabajo técnico del DECE, completen la matriz analizando cómo los determinantes socioeconómicos de su territorio impactan las trayectorias educativas de NNA.",
                { italics: true, size: 16, color: "475569" }
              ),
            ],
          }),
          new Table({
            width: { size: USABLE, type: WidthType.DXA },
            borders: ALL_SOLID_BORDERS,
            rows: [
              new TableRow({
                children: [
                  new TableCell({ width: { size: USABLE * 0.25, type: WidthType.DXA }, shading: { fill: "F1F5F9" }, children: [new Paragraph({ children: [pRun("DIMENSIÓN CONTEXTUAL", { bold: true, size: 16 })] })] }),
                  new TableCell({ width: { size: USABLE * 0.35, type: WidthType.DXA }, shading: { fill: "F1F5F9" }, children: [new Paragraph({ children: [pRun("BARRERAS OBSERVADAS EN EL TERRITORIO", { bold: true, size: 16 })] })] }),
                  new TableCell({ width: { size: USABLE * 0.4, type: WidthType.DXA }, shading: { fill: "F1F5F9" }, children: [new Paragraph({ children: [pRun("ESTRATEGIA DE ACOMPAÑAMIENTO DECE", { bold: true, size: 16 })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [pRun("Trabajo Infantil y Cuidado Doméstico (Género)", { bold: true, size: 16 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [pRun("Niñas/adolescentes a cargo del cuidado de hermanos menores o ventas informales.\nAusentismo reiterado los días lunes o viernes.", { size: 16 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [pRun("• Flexibilización pedagógica con docentes tutores.\n• Activación de redes de cuidado comunitarias.\n• Acta de corresponsabilidad familiar.", { size: 16 })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [pRun("Vulnerabilidad por Pobreza Extrema", { bold: true, size: 16 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [pRun("Falta de útiles escolares, uniformes o alimentación adecuada.\nDeserción por necesidad de generar ingresos.", { size: 16 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [pRun("• Articulación con MIES / bonos de contingencia.\n• Campañas solidarias internas sin estigmatizar.\n• Derivación a programas de nivelación.", { size: 16 })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [pRun("Riesgos en el Entorno Escolar", { bold: true, size: 16 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [pRun("Microtráfico en exteriores, inseguridad comunitaria y falta de espacios recreativos seguros.", { size: 16 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [pRun("• Coordinación con Policía Comunitaria / DINAPEN.\n• Fortalecimiento de brigadas de seguridad escolar.\n• Talleres preventivos del Acuerdo 044-A.", { size: 16 })] })] }),
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

/** Despachador según materialId */
export async function generateWorkshopMaterialDocx(
  workshopId: string,
  materialId: string,
  institutionName?: string
): Promise<{ buffer: Buffer; fileName: string } | null> {
  switch (materialId) {
    case "casos-simulacion-suicidio":
      return {
        buffer: await generateSuicidioCasesDocx(institutionName),
        fileName: "Casos_Simulacion_Prevencion_Suicidio_SADEX.docx",
      };
    case "guia-senales-alerta-mitos":
      return {
        buffer: await generateSuicidioGuideDocx(institutionName),
        fileName: "Ficha_Senales_Alerta_y_Mitos_SADEX.docx",
      };
    case "guia-bolsillo-pap-docentes":
      return {
        buffer: await generatePapPocketGuideDocx(institutionName),
        fileName: "Guia_Bolsillo_PAP_Docentes_SADEX.docx",
      };
    case "tarjetas-grounding-respiracion":
      return {
        buffer: await generateGroundingCardsDocx(institutionName),
        fileName: "Tarjetas_Recortables_Grounding_Respiracion_SADEX.docx",
      };
    case "ficha-flor-fortalezas":
      return {
        buffer: await generateFlowerFortalezasDocx(institutionName),
        fileName: "Ficha_Recortable_Flor_Fortalezas_Autoestima_SADEX.docx",
      };
    case "tarjetas-afirmaciones-positivas":
      return {
        buffer: await generateAffirmationCardsDocx(institutionName),
        fileName: "Tarjetas_Coleccionables_Afirmaciones_Positivas_SADEX.docx",
      };
    case "matriz-analisis-contexto-dece":
      return {
        buffer: await generateDeceContextMatrixDocx(institutionName),
        fileName: "Matriz_Analisis_Contextual_Pobreza_Infantil_DECE_SADEX.docx",
      };
    default:
      return null;
  }
}
