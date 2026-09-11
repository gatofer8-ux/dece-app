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

function instructionBox(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 80, after: 120 },
    children: [pRun("📌 " + text, { italics: true, size: 16, color: "334155" })],
  });
}

function tableCell(text: string, o: { fill?: string; bold?: boolean; color?: string } = {}): TableCell {
  return new TableCell({
    borders: ALL_CUT_BORDERS,
    shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR } : undefined,
    margins: { top: 100, bottom: 100, left: 140, right: 140 },
    children: [
      new Paragraph({
        children: [
          pRun(text, { bold: o.bold, color: o.color ?? "0F172A", size: 15 }),
        ],
      }),
    ],
  });
}

function calloutBox(text: string, o: { fill?: string; bold?: boolean; color?: string } = {}): Table {
  return new Table({
    width: { size: USABLE, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          tableCell(text, o),
        ],
      }),
    ],
  });
}

function cutoutGrid(cards: { title: string; text: string }[]): Table[] {
  const rows: TableRow[] = cards.map((c) =>
    new TableRow({
      children: [
        new TableCell({
          borders: ALL_CUT_BORDERS,
          margins: { top: 120, bottom: 120, left: 160, right: 160 },
          children: [
            new Paragraph({
              spacing: { after: 40 },
              children: [pRun("✂️ RECORTAR • " + c.title, { bold: true, size: 16, color: "0284C7" })],
            }),
            new Paragraph({
              children: [pRun(c.text, { size: 15, color: "1E293B" })],
            }),
          ],
        }),
      ],
    })
  );
  return [new Table({ width: { size: USABLE, type: WidthType.DXA }, rows })];
}

// -------------------------------------------------------------
// 1. Casos de Simulación Suicidio
// -------------------------------------------------------------
export async function generateSuicidioCasesDocx(institutionName?: string): Promise<Buffer> {
  const casesData = [
    { num: 1, level: "NIVEL DE RIESGO BAJO (VERDE)", textColor: "166534", age: "15 años", diag: "Estrés académico y ansiedad leve", fam: "Apoyo moderado; presión por calificaciones de excelencia.", esc: "Buen rendimiento escolar previo; aislamiento temporal.", sit: "Se siente abrumado en conversaciones informales. No expresa ideación suicida ni autolesiones." },
    { num: 2, level: "NIVEL DE RIESGO MODERADO (AMARILLO)", textColor: "854D0E", age: "17 años", diag: "Tristeza profunda prolongada", fam: "Conflictos intrafamiliares severos y falta de escucha.", esc: "Caída drástica en el rendimiento escolar y abandono de amigos.", sit: "Confió a un docente que 'estaría mejor si no despertara mañana'. No cuenta con un plan específico." },
    { num: 3, level: "NIVEL DE RIESGO ALTO (NARANJA)", textColor: "9A3412", age: "16 años", diag: "Historial de autolesiones y desesperanza", fam: "Hogar disfuncional con antecedentes familiares de salud mental.", esc: "Problemas de conducta, ausentismo injustificado y aislamiento.", sit: "Intento autolítico reciente en casa. Notas de despedida veladas y marcas de cortes en antebrazos." },
    { num: 4, level: "NIVEL DE RIESGO CRÍTICO (ROJO - EMERGENCIA)", textColor: "991B1B", age: "14 años", diag: "Ideación suicida estructurada con método definido", fam: "Entorno hostil con violencia intrafamiliar reportada.", esc: "Aislamiento extremo, despidiéndose de amigos regalando objetos.", sit: "Manifestó a compañeros un plan concreto para atentar contra su vida hoy. ¡Activar ECU-911 de inmediato!" },
    { num: 5, level: "NIVEL DE RIESGO BAJO / PREVENTIVO (VERDE)", textColor: "166534", age: "12 años", diag: "Dificultades de adaptación y timidez extrema", fam: "Familia protectora con poca estimulación social.", esc: "Dificultad para hacer amigos, permanece solo en recreos.", sit: "No presenta ideación autolítica, pero manifiesta soledad. Requiere fortalecimiento de asertividad." },
    { num: 6, level: "NIVEL DE RIESGO MODERADO (AMARILLO)", textColor: "854D0E", age: "14 años", diag: "Baja autoestima y frustración académica", fam: "Poco diálogo emocional; padres ausentes por trabajo.", esc: "Bajo rendimiento; comentarios de 'yo no sirvo para nada'.", sit: "Llora con frecuencia en los cambios de hora. Requiere apoyo socioemocional y vinculación con tutor." },
  ];

  const tableRows: TableRow[] = casesData.map((c) => (
    new TableRow({
      children: [
        new TableCell({
          width: { size: USABLE, type: WidthType.DXA },
          borders: ALL_CUT_BORDERS,
          margins: { top: 200, bottom: 200, left: 240, right: 240 },
          children: [
            new Paragraph({ spacing: { after: 60 }, children: [pRun("✂️  RECORTAR POR LA LÍNEA PUNTEADA  •  TARJETA DE CASO #" + c.num, { bold: true, size: 16, color: "64748B" })] }),
            new Paragraph({ spacing: { after: 120 }, children: [pRun(c.level, { bold: true, size: 20, color: c.textColor })] }),
            new Paragraph({ spacing: { after: 60 }, children: [pRun("Edad: ", { bold: true, size: 18 }), pRun(c.age + "   |   ", { size: 18 }), pRun("Diagnóstico: ", { bold: true, size: 18 }), pRun(c.diag, { size: 18 })] }),
            new Paragraph({ spacing: { after: 60 }, children: [pRun("Contexto Familiar: ", { bold: true, size: 18 }), pRun(c.fam, { size: 18 })] }),
            new Paragraph({ spacing: { after: 60 }, children: [pRun("Contexto Escolar: ", { bold: true, size: 18 }), pRun(c.esc, { size: 18 })] }),
            new Paragraph({ spacing: { after: 120 }, children: [pRun("Situación Observada: ", { bold: true, size: 18 }), pRun(c.sit, { italics: true, size: 18 })] }),
            new Paragraph({ spacing: { after: 40 }, children: [pRun("PREGUNTAS GUÍA PARA EL GRUPO DE TRABAJO:", { bold: true, size: 16, color: "0284C7" })] }),
            new Paragraph({ spacing: { after: 20 }, children: [pRun("1. ¿Qué factores de riesgo y señales de alerta identificaron en este caso?", { size: 16 })] }),
            new Paragraph({ spacing: { after: 20 }, children: [pRun("2. ¿Qué respuestas de los compañeros o docentes empeorarían su situación?", { size: 16 })] }),
            new Paragraph({ spacing: { after: 40 }, children: [pRun("3. ¿Cuál es el paso concreto que debe activarse de inmediato según el protocolo institucional?", { size: 16 })] }),
          ],
        }),
      ],
    })
  ));

  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("MATERIAL RECORTABLE: TARJETAS DE CASOS DE SIMULACIÓN", "Taller de Prevención del Suicidio y Conductas Autolíticas (Acuerdo 044-A)", institutionName),
          new Table({ width: { size: USABLE, type: WidthType.DXA }, rows: tableRows }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

// -------------------------------------------------------------
// 2. Guía Señales de Alerta Suicidio
// -------------------------------------------------------------
export async function generateSuicidioGuideDocx(institutionName?: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("FICHA PEDAGÓGICA: SEÑALES TEMPRANAS Y MITOS VS. REALIDADES", "Herramienta Informativa y de Actuación Rápida para el Aula", institutionName),
          new Paragraph({ spacing: { after: 120 }, children: [pRun("1. SEÑALES DE ALERTA QUE NO DEBEMOS IGNORAR", { bold: true, size: 22, color: "0284C7" })] }),
          new Table({
            width: { size: USABLE, type: WidthType.DXA },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ width: { size: USABLE / 3, type: WidthType.DXA }, shading: { fill: "F1F5F9" }, children: [new Paragraph({ children: [pRun("SEÑALES VERBALES\\n• 'Desearía no haber nacido'\\n• 'No le encuentro sentido a nada'\\n• Despedidas inusuales", { size: 16 })] })] }),
                  new TableCell({ width: { size: USABLE / 3, type: WidthType.DXA }, shading: { fill: "F1F5F9" }, children: [new Paragraph({ children: [pRun("SEÑALES CONDUCTUALES\\n• Regalar pertenencias queridas\\n• Cortes o autolesiones\\n• Aislamiento repentino", { size: 16 })] })] }),
                  new TableCell({ width: { size: USABLE / 3, type: WidthType.DXA }, shading: { fill: "F1F5F9" }, children: [new Paragraph({ children: [pRun("CAMBIOS EMOCIONALES\\n• Calma repentina tras depresión\\n• Llanto incontrolable\\n• Desesperanza profunda", { size: 16 })] })] }),
                ],
              }),
            ],
          }),
          new Paragraph({ spacing: { before: 200, after: 120 }, children: [pRun("2. LÍNEAS DE AYUDA PERMANENTES", { bold: true, size: 22, color: "0284C7" })] }),
          new Paragraph({ spacing: { after: 60 }, children: [pRun("📞 LÍNEA NACIONAL DE SALUD MENTAL: Marca 171 (Opción 6) - 24 horas gratuita y confidencial.", { bold: true, size: 18, color: "1E40AF" })] }),
          new Paragraph({ spacing: { after: 60 }, children: [pRun("🚨 EMERGENCIAS INMEDIATAS: ECU-911.", { bold: true, size: 18, color: "B91C1C" })] }),
        ],
      },
    ],
  });
  return await Packer.toBuffer(doc);
}

// -------------------------------------------------------------
// 3. Guía Bolsillo PAP
// -------------------------------------------------------------
export async function generatePapPocketGuideDocx(institutionName?: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("GUÍA DE BOLSILLO: PRIMEROS AUXILIOS PSICOLÓGICOS (PAP)", "Protocolo Rápido de Contención en el Aula para Personal Docente", institutionName),
          new Paragraph({ spacing: { after: 120 }, children: [pRun("✂️ RECORTAR Y PLEGAR PARA LLEVAR EN EL CUADERNO PEDAGÓGICO", { bold: true, size: 16, color: "64748B" })] }),
          new Table({
            width: { size: USABLE, type: WidthType.DXA },
            borders: ALL_SOLID_BORDERS,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: USABLE, type: WidthType.DXA },
                    shading: { fill: "0F172A" },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [pRun("LOS 5 PRINCIPIOS DE LOS PAP (OMS / MINEDUC)", { bold: true, size: 18, color: "FFFFFF" })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: USABLE, type: WidthType.DXA },
                    children: [
                      new Paragraph({ children: [pRun("1. ESCUCHAR: Contacto visual suave, validar la emoción sin juzgar ni minimizar.", { size: 16 })] }),
                      new Paragraph({ children: [pRun("2. PROTEGER: Alejar al estudiante de miradas curiosas. Llevarlo a un espacio seguro y ventilado.", { size: 16 })] }),
                      new Paragraph({ children: [pRun("3. CONSOLAR: Guiar respiración suave. Ofrecer agua a temperatura ambiente.", { size: 16 })] }),
                      new Paragraph({ children: [pRun("4. INFORMAR: Explicar hechos reales con calma, reduciendo la incertidumbre.", { size: 16 })] }),
                      new Paragraph({ children: [pRun("5. CONECTAR: No dejarlo solo. Acompañarlo al DECE y notificar a la familia.", { size: 16 })] }),
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

// -------------------------------------------------------------
// 4. Tarjetas Grounding
// -------------------------------------------------------------
export async function generateGroundingCardsDocx(institutionName?: string): Promise<Buffer> {
  const cards = [
    { title: "TÉCNICA 5-4-3-2-1 (ENRAIZAMIENTO SENSORIAL)", steps: ["👀 5 cosas que puedas VER", "✋ 4 cosas que puedas TOCAR", "👂 3 cosas que puedas ESCUCHAR", "👃 2 cosas que puedas OLER", "👅 1 cosa que puedas SABOREAR o una frase de aprecio a ti mismo."] },
    { title: "RESPIRACIÓN CUADRADA 4-4-4-4", steps: ["1. Inhala suave por la nariz: 1, 2, 3, 4", "2. Sostén el aire: 1, 2, 3, 4", "3. Exhala despacio por la boca: 1, 2, 3, 4", "4. Espera sin aire: 1, 2, 3, 4 (Repetir 4 veces)"] },
    { title: "ANCLAJE DE SEGURIDAD EMOCIONAL", steps: ["• 'Esta emoción es temporal y pasará pronto'.", "• 'Aquí y ahora estoy a salvo; puedo dar un paso a la vez'.", "• Pon tu mano en el pecho y siente el latido calmado de tu corazón."] },
  ];

  const rows: TableRow[] = cards.map((c) => (
    new TableRow({
      children: [
        new TableCell({
          width: { size: USABLE, type: WidthType.DXA },
          borders: ALL_CUT_BORDERS,
          margins: { top: 160, bottom: 160, left: 200, right: 200 },
          children: [
            new Paragraph({ children: [pRun("✂️ TARJETA RECORTABLE DE REGULACIÓN EMOCIONAL", { bold: true, size: 14, color: "64748B" })] }),
            new Paragraph({ children: [pRun(c.title, { bold: true, size: 18, color: "0284C7" })] }),
            ...c.steps.map((s) => new Paragraph({ spacing: { after: 40 }, children: [pRun(s, { size: 16 })] })),
          ],
        }),
      ],
    })
  ));

  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("TARJETAS RECORTABLES DE CALMA Y REGULACIÓN EMOCIONAL", "Técnicas de Respiración y Grounding para el Aula y el Hogar", institutionName),
          new Table({ width: { size: USABLE, type: WidthType.DXA }, rows }),
        ],
      },
    ],
  });
  return await Packer.toBuffer(doc);
}

// -------------------------------------------------------------
// 5. Ficha Flor de Fortalezas
// -------------------------------------------------------------
export async function generateFlowerFortalezasDocx(institutionName?: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("FICHA DIDÁCTICA RECORTABLE: 'MI FLOR DE FORTALEZAS'", "Taller de Autoestima Infantil: El Jardín de Mis Superpoderes", institutionName),
          new Paragraph({ spacing: { after: 120 }, children: [pRun("Instrucciones: Dibuja tu carita en el centro. Escribe o dibuja tus fortalezas en cada pétalo. Recorta por las líneas punteadas (✂️) y arma tu flor.", { italics: true, size: 16 })] }),
          new Table({
            width: { size: USABLE, type: WidthType.DXA },
            borders: ALL_CUT_BORDERS,
            rows: [
              new TableRow({
                children: [
                  new TableCell({ width: { size: USABLE / 2, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [pRun("🌸 PÉTALO 1: Algo en lo que soy genial\\n________________________", { size: 16 })] })] }),
                  new TableCell({ width: { size: USABLE / 2, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [pRun("🌸 PÉTALO 2: Una buena acción que hice\\n________________________", { size: 16 })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ width: { size: USABLE / 2, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [pRun("🌸 PÉTALO 3: Lo que más me hace sonreír\\n________________________", { size: 16 })] })] }),
                  new TableCell({ width: { size: USABLE / 2, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [pRun("🌸 PÉTALO 4: Un sueño que quiero cumplir\\n________________________", { size: 16 })] })] }),
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

// -------------------------------------------------------------
// 6. Tarjetas Afirmaciones Positivas
// -------------------------------------------------------------
export async function generateAffirmationCardsDocx(institutionName?: string): Promise<Buffer> {
  const affirmations = [
    "⭐ 'Soy una persona única, valiosa e irrepetible'.",
    "💪 'Mis errores no me definen; me ayudan a aprender'.",
    "🎨 'Mis talentos y creatividad hacen el mundo mejor'.",
    "🤝 'Merezco respeto y trato con amor a mis compañeros'.",
    "🦁 'Soy valiente para pedir ayuda cuando la necesito'.",
    "💖 'Hoy elijo sentirme orgulloso de lo que soy'.",
  ];

  const rows: TableRow[] = affirmations.map((af, i) => (
    new TableRow({
      children: [
        new TableCell({
          width: { size: USABLE, type: WidthType.DXA },
          borders: ALL_CUT_BORDERS,
          margins: { top: 160, bottom: 160, left: 200, right: 200 },
          children: [
            new Paragraph({ alignment: AlignmentType.CENTER, children: [pRun("✂️ SUPERPODER EMOCIONAL #" + (i + 1), { bold: true, size: 14, color: "D97706" })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 }, children: [pRun(af, { bold: true, size: 18 })] }),
          ],
        }),
      ],
    })
  ));

  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("TARJETAS RECORTABLES DE AFIRMACIONES POSITIVAS", "Incentivos Didácticos para el Aula", institutionName),
          new Table({ width: { size: USABLE, type: WidthType.DXA }, rows }),
        ],
      },
    ],
  });
  return await Packer.toBuffer(doc);
}

// -------------------------------------------------------------
// 7. Matriz Contexto DECE
// -------------------------------------------------------------
export async function generateDeceContextMatrixDocx(institutionName?: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("MATRIZ DE DIAGNÓSTICO CONTEXTUAL DECE", "Análisis de Pobreza Infantil, Roles de Género y Vulnerabilidad", institutionName),
          new Table({
            width: { size: USABLE, type: WidthType.DXA },
            borders: ALL_SOLID_BORDERS,
            rows: [
              new TableRow({
                children: [
                  new TableCell({ width: { size: USABLE * 0.3, type: WidthType.DXA }, shading: { fill: "F1F5F9" }, children: [new Paragraph({ children: [pRun("DIMENSIÓN CONTEXTUAL", { bold: true, size: 16 })] })] }),
                  new TableCell({ width: { size: USABLE * 0.35, type: WidthType.DXA }, shading: { fill: "F1F5F9" }, children: [new Paragraph({ children: [pRun("BARRERAS OBSERVADAS", { bold: true, size: 16 })] })] }),
                  new TableCell({ width: { size: USABLE * 0.35, type: WidthType.DXA }, shading: { fill: "F1F5F9" }, children: [new Paragraph({ children: [pRun("ESTRATEGIA DE ACOMPAÑAMIENTO", { bold: true, size: 16 })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [pRun("Trabajo Infantil y Roles de Cuidado", { bold: true, size: 16 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [pRun("Cuidado de hermanos menores que genera ausentismo escolar.", { size: 16 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [pRun("Flexibilización pedagógica y articulación con redes de apoyo.", { size: 16 })] })] }),
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

// -------------------------------------------------------------
// 8. Bingo de Estilos de Crianza
// -------------------------------------------------------------
export async function generateBingoEstilosCrianzaDocx(institutionName?: string): Promise<Buffer> {
  const bingoCards = [
    { card: 1, items: [["Establece normas con afecto", "Grita cuando se equivoca"], ["No revisa cuadernos ni tareas", "Escucha activamente la opinión"]] },
    { card: 2, items: [["¡Aquí se hace lo que yo mando!", "Deja que el hijo haga lo que quiera"], ["Felicita los esfuerzos del niño", "Ausente en reuniones escolares"]] },
    { card: 3, items: [["Da explicaciones y dialoga", "Pone límites firmes y claros"], ["Compara a los hijos entre sí", "No pone horarios para dormir ni pantallas"]] },
    { card: 4, items: [["Reconoce las emociones del hijo", "Ignora el llanto por estar en el celular"], ["Aplica castigo físico como corrección", "Fomenta la autonomía responsable"]] },
  ];

  const rows: TableRow[] = bingoCards.map((b) => (
    new TableRow({
      children: [
        new TableCell({
          width: { size: USABLE, type: WidthType.DXA },
          borders: ALL_CUT_BORDERS,
          margins: { top: 160, bottom: 160, left: 180, right: 180 },
          children: [
            new Paragraph({ children: [pRun("✂️ CARTÓN DE BINGO #" + b.card + " • TALLER DE ESTILOS DE CRIANZA", { bold: true, size: 14, color: "0284C7" })] }),
            new Paragraph({ spacing: { after: 60 }, children: [pRun("Marque una 'X' cuando el facilitador lea una conducta correspondiente a su cartón:", { italics: true, size: 14 })] }),
            ...b.items.map((pair) => (
              new Paragraph({ spacing: { after: 40 }, children: [pRun("[   ] " + pair[0] + "          |          [   ] " + pair[1], { size: 16 })] })
            )),
          ],
        }),
      ],
    })
  ));

  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("MATERIAL RECORTABLE: BINGO DE ESTILOS DE CRIANZA", "Taller 'Jugando a Criar y Colaborar' (Escuela para Familias)", institutionName),
          new Table({ width: { size: USABLE, type: WidthType.DXA }, rows }),
        ],
      },
    ],
  });
  return await Packer.toBuffer(doc);
}

// -------------------------------------------------------------
// 9. Acuerdos de Corresponsabilidad
// -------------------------------------------------------------
export async function generateAcuerdosCorresponsabilidadDocx(institutionName?: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("ACTA DE COMPROMISOS Y CORRESPONSABILIDAD FAMILIA - ESCUELA", "Alianza Protectora para el Acompañamiento Integral del Estudiante", institutionName),
          new Paragraph({ spacing: { after: 120 }, children: [pRun("Estudiante: _____________________________________________ Grado/Paralelo: _________________\\nRepresentante Legal: ___________________________________ Cédula: _________________________", { bold: true, size: 16 })] }),
          new Table({
            width: { size: USABLE, type: WidthType.DXA },
            borders: ALL_SOLID_BORDERS,
            rows: [
              new TableRow({
                children: [
                  new TableCell({ width: { size: USABLE / 2, type: WidthType.DXA }, shading: { fill: "F1F5F9" }, children: [new Paragraph({ children: [pRun("COMPROMISOS DE LA FAMILIA", { bold: true, size: 16 })] })] }),
                  new TableCell({ width: { size: USABLE / 2, type: WidthType.DXA }, shading: { fill: "F1F5F9" }, children: [new Paragraph({ children: [pRun("COMPROMISOS DE LA INSTITUCIÓN / DOCENTE", { bold: true, size: 16 })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [pRun("1. Dedicar tiempo diario al diálogo afectivo sin pantallas.\\n2. Asistir puntualmente a convocatorias y talleres.\\n3. Fomentar hábitos de sueño y estudio en casa.", { size: 16 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [pRun("1. Informar oportunamente alertas académicas o anímicas.\\n2. Tratar con dignidad, respeto y pedagogía positiva.\\n3. Brindar apoyo psicosocial a través del DECE.", { size: 16 })] })] }),
                ],
              }),
            ],
          }),
          new Paragraph({ spacing: { before: 240 }, children: [pRun("Firma Representante: ____________________       Firma Docente Tutor: ____________________", { bold: true, size: 16 })] }),
        ],
      },
    ],
  });
  return await Packer.toBuffer(doc);
}

// -------------------------------------------------------------
// 10. Pasaporte Triatlón OVP
// -------------------------------------------------------------
export async function generatePasaporteTriatlonDocx(institutionName?: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("PASAPORTE OFICIAL: TRIATLÓN ACADÉMICO OVP", "Circuito de Elección de Bachillerato (Ciencias, Mecánica y Contabilidad)", institutionName),
          new Paragraph({ spacing: { after: 120 }, children: [pRun("Estudiante: __________________________________________________ Grado: 10mo EGB Paralelo: ____", { bold: true, size: 16 })] }),
          new Table({
            width: { size: USABLE, type: WidthType.DXA },
            borders: ALL_CUT_BORDERS,
            rows: [
              new TableRow({
                children: [
                  new TableCell({ width: { size: USABLE / 3, type: WidthType.DXA }, margins: { top: 180, bottom: 180, left: 160, right: 160 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [pRun("ESTACIÓN 1: CIENCIAS\\n🔬\\nReto de Laboratorio\\n\\n[  SELLO / FIRMA  ]\\n\\nMi afinidad: ( 1 al 5 ): ___", { size: 16 })] })] }),
                  new TableCell({ width: { size: USABLE / 3, type: WidthType.DXA }, margins: { top: 180, bottom: 180, left: 160, right: 160 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [pRun("ESTACIÓN 2: MECÁNICA\\n⚙️\\nDesafío de Ensamble\\n\\n[  SELLO / FIRMA  ]\\n\\nMi afinidad: ( 1 al 5 ): ___", { size: 16 })] })] }),
                  new TableCell({ width: { size: USABLE / 3, type: WidthType.DXA }, margins: { top: 180, bottom: 180, left: 160, right: 160 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [pRun("ESTACIÓN 3: CONTABILIDAD\\n📊\\nReto de Presupuesto\\n\\n[  SELLO / FIRMA  ]\\n\\nMi afinidad: ( 1 al 5 ): ___", { size: 16 })] })] }),
                ],
              }),
            ],
          }),
          new Paragraph({ spacing: { before: 160 }, children: [pRun("Reflexión Final del Estudiante: La especialidad que más llamó mi atención fue _____________________ porque ____________________________________________________________________________.", { italics: true, size: 16 })] }),
        ],
      },
    ],
  });
  return await Packer.toBuffer(doc);
}

// -------------------------------------------------------------
// 11. Semáforo Buen Trato Infantil (4 años)
// -------------------------------------------------------------
export async function generateSemaforoBuenTratoDocx(institutionName?: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("FICHA DIDÁCTICA: 'EL SEMÁFORO DEL BUEN TRATO'", "Taller Infantil de Autoprotección: 'Yo tengo derecho a ser bien tratado'", institutionName),
          new Paragraph({ spacing: { after: 120 }, children: [pRun("Instrucciones: Pintar el semáforo. Recortar las figuras por las líneas punteadas (✂️) y pegarlas donde correspondan.", { italics: true, size: 16 })] }),
          new Table({
            width: { size: USABLE, type: WidthType.DXA },
            borders: ALL_CUT_BORDERS,
            rows: [
              new TableRow({
                children: [
                  new TableCell({ width: { size: USABLE, type: WidthType.DXA }, shading: { fill: "DCFCE7" }, children: [new Paragraph({ children: [pRun("🟢 VERDE: COSAS QUE ME HACEN FELIZ (Abrazos con cariño, juegos, palabras amables)", { bold: true, size: 16, color: "166534" })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ width: { size: USABLE, type: WidthType.DXA }, shading: { fill: "FEF08A" }, children: [new Paragraph({ children: [pRun("🟡 AMARILLO: COSAS QUE ME CONFUNDEN (Secretos raros, burlas; avisar a un adulto)", { bold: true, size: 16, color: "854D0E" })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ width: { size: USABLE, type: WidthType.DXA }, shading: { fill: "FEE2E2" }, children: [new Paragraph({ children: [pRun("🔴 ROJO: COSAS QUE NADIE DEBE HACERME (Gritos, golpes, tocar mi cuerpo; ¡DECIR NO Y CORRER!)", { bold: true, size: 16, color: "991B1B" })] })] }),
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

// -------------------------------------------------------------
// 12. Medallas Buen Trato
// -------------------------------------------------------------
export async function generateMedallasBuenTratoDocx(institutionName?: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("MEDALLAS RECORTABLES: DEFENSOR DEL BUEN TRATO", "Recortar, colorear y colgar en el cuello de las niñas y niños", institutionName),
          new Table({
            width: { size: USABLE, type: WidthType.DXA },
            borders: ALL_CUT_BORDERS,
            rows: [
              new TableRow({
                children: [
                  new TableCell({ width: { size: USABLE / 2, type: WidthType.DXA }, margins: { top: 160, bottom: 160, left: 160, right: 160 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [pRun("⭐ MEDALLA DE HONOR ⭐\\n\\n¡DEFENSOR DEL BUEN TRATO!\\n\\nNombre: ____________________\\n\\nSADEX • INICIAL", { bold: true, size: 16, color: "0284C7" })] })] }),
                  new TableCell({ width: { size: USABLE / 2, type: WidthType.DXA }, margins: { top: 160, bottom: 160, left: 160, right: 160 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [pRun("⭐ MEDALLA DE HONOR ⭐\\n\\n¡DEFENSOR DEL BUEN TRATO!\\n\\nNombre: ____________________\\n\\nSADEX • INICIAL", { bold: true, size: 16, color: "0284C7" })] })] }),
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

// -------------------------------------------------------------
// 13. Tarjetas Casos Alerta Aula Epilepsia
// -------------------------------------------------------------
export async function generateTarjetasCasosAlertaAulaDocx(institutionName?: string): Promise<Buffer> {
  const situ = [
    "Situación 1: Estudiante con taquicardia y temblor antes de rendir un examen trimestral.",
    "Situación 2: Estudiante con ausentismo reiterado los lunes, quejándose de insomnio y cefalea.",
    "Situación 3: Alumna aislada que deja de comer y expresa que 'no tiene ganas de vivir'.",
    "Situación 4: Estudiante que convulsiona repentinamente en medio de una clase de ciencias.",
  ];

  const rows: TableRow[] = situ.map((s, i) => (
    new TableRow({
      children: [
        new TableCell({
          width: { size: USABLE, type: WidthType.DXA },
          borders: ALL_CUT_BORDERS,
          margins: { top: 160, bottom: 160, left: 200, right: 200 },
          children: [
            new Paragraph({ children: [pRun("✂️ TARJETA DE SITUACIÓN #" + (i + 1), { bold: true, size: 14, color: "64748B" })] }),
            new Paragraph({ spacing: { before: 60, after: 60 }, children: [pRun(s, { bold: true, size: 16 })] }),
            new Paragraph({ children: [pRun("Pregunta: ¿Cuál es el paso 1 de contención y qué protocolo institucional se activa?", { italics: true, size: 14, color: "0284C7" })] }),
          ],
        }),
      ],
    })
  ));

  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("TARJETAS DE SITUACIONES DE ALERTA EN AULA", "Taller Docente: Riesgos Psicosociales, Salud Mental y Emergencias", institutionName),
          new Table({ width: { size: USABLE, type: WidthType.DXA }, rows }),
        ],
      },
    ],
  });
  return await Packer.toBuffer(doc);
}

// -------------------------------------------------------------
// 14. Protocolo Bolsillo Epilepsia
// -------------------------------------------------------------
export async function generateProtocoloBolsilloEpilepsiaDocx(institutionName?: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("PROTOCOLO DE BOLSILLO: PRIMEROS AUXILIOS ANTE CONVULSIONES", "Guía Médica para Docentes ante Crisis Epilépticas en el Aula", institutionName),
          new Table({
            width: { size: USABLE, type: WidthType.DXA },
            borders: ALL_SOLID_BORDERS,
            rows: [
              new TableRow({
                children: [
                  new TableCell({ width: { size: USABLE / 2, type: WidthType.DXA }, shading: { fill: "DCFCE7" }, children: [new Paragraph({ children: [pRun("QUÉ HACER SIEMPRE (OBLIGATORIO)\\n\\n1. Conserve la calma y cronometre la crisis.\\n2. Coloque algo suave bajo la cabeza.\\n3. Aparte objetos duros o cortantes.\\n4. Despeje el área de curiosos.\\n5. Coloque de lado (Posición Lateral PLS) al terminar.", { size: 16 })] })] }),
                  new TableCell({ width: { size: USABLE / 2, type: WidthType.DXA }, shading: { fill: "FEE2E2" }, children: [new Paragraph({ children: [pRun("QUÉ NUNCA HACER (PROHIBIDO)\\n\\n❌ NUNCA meta objetos, dedos ni cucharas en la boca.\\n❌ NUNCA intente sujetar a la fuerza los movimientos.\\n❌ NUNCA dé agua, comida ni medicación por boca.\\n❌ NUNCA lo deje solo durante la crisis.", { size: 16 })] })] }),
                ],
              }),
            ],
          }),
          new Paragraph({ spacing: { before: 160 }, children: [pRun("🚨 LLAMAR AL ECU-911 SI: La crisis dura más de 5 minutos, si es su primera crisis conocida, o si no recupera la consciencia.", { bold: true, size: 16, color: "B91C1C" })] }),
        ],
      },
    ],
  });
  return await Packer.toBuffer(doc);
}

// -------------------------------------------------------------
// 15. Tarjetas Frases Estereotipos (Interculturalidad)
// -------------------------------------------------------------
export async function generateTarjetasFrasesEstereotiposDocx(institutionName?: string): Promise<Buffer> {
  const phrases = [
    "Frase 1: 'Esos chicos de esa etnia siempre son conflictivos, no les gusta trabajar en grupo'.",
    "Frase 2: 'Esa alumna debería amarrarse ese cabello afro, así no parece formal'.",
    "Frase 3: 'Aquí en Ecuador hablamos bien, los de ese país hablan raro y cantado'.",
    "Frase 4: 'Los indígenas son buenos para el campo, pero no para la universidad'.",
  ];

  const rows: TableRow[] = phrases.map((ph, i) => (
    new TableRow({
      children: [
        new TableCell({
          width: { size: USABLE, type: WidthType.DXA },
          borders: ALL_CUT_BORDERS,
          margins: { top: 160, bottom: 160, left: 200, right: 200 },
          children: [
            new Paragraph({ children: [pRun("✂️ MICROAGRESIÓN PARA DEBATE DOCENTE #" + (i + 1), { bold: true, size: 14, color: "64748B" })] }),
            new Paragraph({ spacing: { before: 60, after: 60 }, children: [pRun(ph, { bold: true, size: 16 })] }),
            new Paragraph({ children: [pRun("Análisis: ¿Qué prejuicio estructural opera detrás y cómo lo deconstruimos en clase?", { italics: true, size: 14, color: "0284C7" })] }),
          ],
        }),
      ],
    })
  ));

  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("TARJETAS DE ANÁLISIS: DECONSTRUYENDO EL RACISMO", "Taller: Educar desde la Interculturalidad y la No Discriminación", institutionName),
          new Table({ width: { size: USABLE, type: WidthType.DXA }, rows }),
        ],
      },
    ],
  });
  return await Packer.toBuffer(doc);
}

// -------------------------------------------------------------
// 16. Decálogo Interculturalidad
// -------------------------------------------------------------
export async function generateDecalogoInterculturalidadDocx(institutionName?: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("DECÁLOGO POR UNA ESCUELA INTERCULTURAL Y LIBRE DE RACISMO", "Pacto Institucional de Convivencia Armónica", institutionName),
          new Paragraph({ spacing: { after: 60 }, children: [pRun("1. En nuestra institución la diversidad de culturas, tonos de piel y orígenes es motivo de orgullo y riqueza colectiva.", { size: 16 })] }),
          new Paragraph({ spacing: { after: 60 }, children: [pRun("2. Cero tolerancia a apodos, burlas o chistes denigrantes basados en raza, nacionalidad o acento.", { size: 16 })] }),
          new Paragraph({ spacing: { after: 60 }, children: [pRun("3. Incorporamos saberes ancestrales y literatura diversa en nuestras clases cotidianas.", { size: 16 })] }),
          new Paragraph({ spacing: { after: 60 }, children: [pRun("4. Escuchamos y validamos la identidad de cada estudiante sin forzar asimilaciones forzadas.", { size: 16 })] }),
          new Paragraph({ spacing: { before: 200 }, children: [pRun("Firma de Compromiso del Claustro Docente: ________________________________________________", { bold: true, size: 16 })] }),
        ],
      },
    ],
  });
  return await Packer.toBuffer(doc);
}

// -------------------------------------------------------------
// 17. Tarjetas Historias Diversidad
// -------------------------------------------------------------
export async function generateTarjetasHistoriasDiversidadDocx(institutionName?: string): Promise<Buffer> {
  const bios = [
    { name: "Dr. Umar Khan (Sierra Leona)", desc: "Científico y médico cirujano experto en medicina tropical. Considerado un héroe nacional, lideró la lucha contra el ébola en África Occidental y entregó su vida atendiendo a los más vulnerables." },
    { name: "Vladimir Franz (República Checa)", desc: "Abogado de formación con el rostro completamente tatuado, es un aclamado catedrático universitario de teatro, compositor de ópera y candidato presidencial. Desafía todo prejuicio estético externo." },
  ];

  const rows: TableRow[] = bios.map((b) => (
    new TableRow({
      children: [
        new TableCell({
          width: { size: USABLE, type: WidthType.DXA },
          borders: ALL_CUT_BORDERS,
          margins: { top: 160, bottom: 160, left: 200, right: 200 },
          children: [
            new Paragraph({ children: [pRun("✂️ BIOGRAFÍA REAL PARA ANÁLISIS • " + b.name, { bold: true, size: 16, color: "0284C7" })] }),
            new Paragraph({ spacing: { before: 60, after: 60 }, children: [pRun(b.desc, { size: 16 })] }),
            new Paragraph({ children: [pRun("Reflexión: ¿Qué etiquetas le habría puesto la sociedad antes de conocer su verdadera obra?", { italics: true, size: 14 })] }),
          ],
        }),
      ],
    })
  ));

  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("TARJETAS DE HISTORIAS DE VIDA QUE ROMPEN ESTEREOTIPOS", "Taller: Diversidad Institucional y Miradas sin Prejuicios", institutionName),
          new Table({ width: { size: USABLE, type: WidthType.DXA }, rows }),
        ],
      },
    ],
  });
  return await Packer.toBuffer(doc);
}

// -------------------------------------------------------------
// 18. Tarjetas Mensajes Yo (Comunicación Asertiva)
// -------------------------------------------------------------
export async function generateTarjetasMensajesYoDocx(institutionName?: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("GUÍA DE BOLSILLO: LA FÓRMULA DEL 'MENSAJE YO'", "Taller de Comunicación Asertiva y Resolución de Conflictos", institutionName),
          new Table({
            width: { size: USABLE, type: WidthType.DXA },
            borders: ALL_SOLID_BORDERS,
            rows: [
              new TableRow({
                children: [
                  new TableCell({ width: { size: USABLE, type: WidthType.DXA }, shading: { fill: "F1F5F9" }, children: [new Paragraph({ children: [pRun("ESTRUCTURA DE UN MENSAJE ASERTIVO:\\n\\n1. CUANDO... [describe el hecho objetivo sin insultar ni exagerar]\\n2. YO ME SIENTO... [nombra tu emoción con claridad]\\n3. PORQUE NECESITO... [explica tu necesidad de respeto o coordinación]\\n4. POR ESO TE PROPONGO... [acuerdo claro hacia el futuro]", { bold: true, size: 16 })] })] }),
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

// -------------------------------------------------------------
// 19. Rueda Emociones y Árbol de Apoyo
// -------------------------------------------------------------
export async function generateRuedaEmocionesArbolDocx(institutionName?: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("FICHA RECORTABLE: RUEDA DE EMOCIONES Y ÁRBOL DE APOYO", "Taller: Construyendo Redes de Apoyo y Resiliencia Emocional", institutionName),
          new Paragraph({ spacing: { after: 120 }, children: [pRun("Estudiante: __________________________________________________ Grado: _________________\\n\\nCompleta tu Árbol de Redes de Apoyo:\\n• EN LAS RAÍCES: Escribe 3 fortalezas tuyas (lo que te sostiene).\\n• EN EL TRONCO: Escribe tus actividades que te dan paz y alegría.\\n• EN LAS RAMAS: Escribe los nombres de 3 personas a quienes puedes acudir cuando estés triste.", { size: 16 })] }),
        ],
      },
    ],
  });
  return await Packer.toBuffer(doc);
}


// -------------------------------------------------------------
// 20. Tarjetas Trivia Acuerdo 015-A (Recortable)
// -------------------------------------------------------------
export async function generateTriviaAcuerdo015aDocx(institutionName?: string): Promise<Buffer> {
  const preguntas = [
    { num: 1, q: "En Educación Inicial y EGB, ¿está permitido que los estudiantes utilicen celulares en el aula?", r: "RESPUESTA: NO. El Acuerdo 015-A prohíbe el uso de teléfonos en Inicial y Básica, salvo excepciones debidamente justificadas de salud o NEE." },
    { num: 2, q: "¿En qué subnivel y bajo qué condiciones específicas se permite el uso de celulares con fines pedagógicos?", r: "RESPUESTA: Exclusivamente en Bachillerato, bajo autorización previa y supervisión directa del docente a cargo de la asignatura." },
    { num: 3, q: "Si un estudiante tiene una condición médica que requiere monitoreo digital continuo (ej. diabetes), ¿qué procede?", r: "RESPUESTA: Es una excepción válida contemplada en el acuerdo; la familia presenta certificado médico y se autoriza el monitoreo." },
    { num: 4, q: "¿Puede un docente o autoridad difundir fotos o videos de estudiantes en sus redes sociales personales?", r: "RESPUESTA: PROHIBICIÓN ESTRICTA. Se protege el derecho a la intimidad y la imagen de NNA, sancionado por la LOEI y el Código de la Niñez." },
    { num: 5, q: "¿Puede un docente utilizar su celular personal para llamadas o redes sociales durante las horas de clase?", r: "RESPUESTA: NO. Los docentes deben modelar el uso ético; el celular solo se utiliza para gestión estrictamente pedagógica o emergencias." },
    { num: 6, q: "¿Qué debe hacer la institución con los estudiantes que requieren traductores por barreras idiomáticas?", r: "RESPUESTA: Es una excepción autorizada para facilitar la inclusión educativa y el derecho a la comunicación." },
    { num: 7, q: "Si un estudiante usa el celular indebidamente, ¿puede el colegio retener el teléfono indefinidamente?", r: "RESPUESTA: NO. Se resguarda temporalmente y se entrega al representante legal al finalizar la jornada conforme al Código de Convivencia." },
    { num: 8, q: "¿Cómo se articulan las excepciones para estudiantes con discapacidad o Necesidades Educativas Específicas?", r: "RESPUESTA: Requieren evaluación e informe técnico favorable de la UDAI (Unidad Distrital de Apoyo a la Inclusión)." },
    { num: 9, q: "¿Qué alternativas pedagógicas y recreativas debe fomentar el colegio para los recreos libres de pantallas?", r: "RESPUESTA: Juegos cooperativos, lectura en biblioteca, deportes de patio, arte y conversación presencial entre pares." },
    { num: 10, q: "¿Dónde debe formalizarse el protocolo interno de uso de dispositivos de la institución?", r: "RESPUESTA: En el Código de Convivencia Institucional, construido de forma participativa con docentes, estudiantes y familias." }
  ];

  const rows = preguntas.map((p) => (
    new TableRow({
      children: [
        new TableCell({
          width: { size: USABLE, type: WidthType.DXA },
          borders: ALL_CUT_BORDERS,
          shading: { fill: "F8FAFC" },
          children: [
            new Paragraph({ children: [pRun("✂️ TARJETA DE TRIVIA ACUERDO 015-A • PREGUNTA #" + p.num, { bold: true, size: 16, color: "0284C7" })] }),
            new Paragraph({ spacing: { before: 40, after: 60 }, children: [pRun(p.q, { bold: true, size: 16 })] }),
            new Paragraph({ children: [pRun(p.r, { italics: true, size: 14, color: "059669" })] }),
          ],
        }),
      ],
    })
  ));

  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("TARJETAS DE TRIVIA EXPRÉS: ACUERDO MINISTERIAL 015-A", "Regulación del uso de celulares y dispositivos móviles en el entorno educativo", institutionName),
          new Paragraph({ spacing: { after: 120 }, children: [pRun("Instrucciones: Recorte por la línea punteada (✂️). Entregue una tarjeta por grupo para la trivia rápida.", { italics: true, size: 14 })] }),
          new Table({ width: { size: USABLE, type: WidthType.DXA }, rows }),
        ],
      },
    ],
  });
  return await Packer.toBuffer(doc);
}

// -------------------------------------------------------------
// 21. Matriz Compromisos Celulares en el Aula
// -------------------------------------------------------------
export async function generateMatrizCompromisosCelularesDocx(institutionName?: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("MATRIZ INSTITUCIONAL DE COMPROMISOS Y CÓDIGO DE CONVIVENCIA", "Implementación efectiva del Acuerdo Ministerial 015-A (Uso Ético de Tecnología)", institutionName),
          new Table({
            width: { size: USABLE, type: WidthType.DXA },
            borders: ALL_SOLID_BORDERS,
            rows: [
              new TableRow({
                children: [
                  new TableCell({ width: { size: 3000, type: WidthType.DXA }, shading: { fill: "0F172A" }, children: [new Paragraph({ children: [pRun("ÁMBITO", { bold: true, size: 16, color: "FFFFFF" })] })] }),
                  new TableCell({ width: { size: 4000, type: WidthType.DXA }, shading: { fill: "0F172A" }, children: [new Paragraph({ children: [pRun("COMPROMISOS PEDAGÓGICOS", { bold: true, size: 16, color: "FFFFFF" })] })] }),
                  new TableCell({ width: { size: 2906, type: WidthType.DXA }, shading: { fill: "0F172A" }, children: [new Paragraph({ children: [pRun("MECANISMO DE SEGUIMIENTO", { bold: true, size: 16, color: "FFFFFF" })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ width: { size: 3000, type: WidthType.DXA }, children: [new Paragraph({ children: [pRun("Nivel Inicial y Básica (Preparatoria a Superior)", { bold: true, size: 15 })] })] }),
                  new TableCell({ width: { size: 4000, type: WidthType.DXA }, children: [new Paragraph({ children: [pRun("• Cero dispositivos en aula durante clases y recreos.\n• Resguardo seguro en casillero institucional si lo traen por traslado.", { size: 14 })] })] }),
                  new TableCell({ width: { size: 2906, type: WidthType.DXA }, children: [new Paragraph({ children: [pRun("Revisión en el ingreso y tutoría periódica.", { size: 14 })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ width: { size: 3000, type: WidthType.DXA }, children: [new Paragraph({ children: [pRun("Nivel de Bachillerato (1ro a 3ro BGU/BT)", { bold: true, size: 15 })] })] }),
                  new TableCell({ width: { size: 4000, type: WidthType.DXA }, children: [new Paragraph({ children: [pRun("• Uso permitido únicamente con rúbrica pedagógica previa.\n• Guardado en mochila cuando finaliza la actividad de investigación.", { size: 14 })] })] }),
                  new TableCell({ width: { size: 2906, type: WidthType.DXA }, children: [new Paragraph({ children: [pRun("Planificación de aula y supervisión docente.", { size: 14 })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ width: { size: 3000, type: WidthType.DXA }, children: [new Paragraph({ children: [pRun("Cuerpo Docente y Administrativo", { bold: true, size: 15 })] })] }),
                  new TableCell({ width: { size: 4000, type: WidthType.DXA }, children: [new Paragraph({ children: [pRun("• No utilizar celular para asuntos personales en horas de clase.\n• No fotografiar ni grabar a estudiantes para redes privadas.", { size: 14 })] })] }),
                  new TableCell({ width: { size: 2906, type: WidthType.DXA }, children: [new Paragraph({ children: [pRun("Supervisión de Vicerrectorado e Inspección.", { size: 14 })] })] }),
                ],
              }),
            ],
          }),
          new Paragraph({ spacing: { before: 200 }, children: [pRun("Firma Coordinador DECE: _______________________     Firma Rector/a: _______________________", { bold: true, size: 16 })] }),
        ],
      },
    ],
  });
  return await Packer.toBuffer(doc);
}

// -------------------------------------------------------------
// 22. Cartillas Bingo Derechos de la Niñez (Recortable)
// -------------------------------------------------------------
export async function generateBingoDerechosNinezDocx(institutionName?: string): Promise<Buffer> {
  const cartones = [
    { id: 1, items: ["Art. 9 Integridad Personal", "Art. 79 Protección Abuso Sexual", "Art. 52 Derecho Identidad", "Art. 11 Interés Superior", "Art. 73 No Explotación Laboral", "Art. 44 Derecho a la Vida", "Art. 37 Derecho Educación", "Art. 60 Participación y Opinión"] },
    { id: 2, items: ["Art. 11 Interés Superior", "Art. 6 No Discriminación", "Art. 12 Prioridad Absoluta", "Art. 37 Derecho Educación", "Art. 44 Derecho a la Vida", "Art. 50 Salud Integral", "Art. 74 Protección Maltrato", "Art. 67 Juego y Recreación"] },
    { id: 3, items: ["Art. 50 Salud Integral", "Art. 37 Derecho Educación", "Art. 73 No Explotación Laboral", "Art. 44 Derecho a la Vida", "Art. 6 No Discriminación", "Art. 67 Juego y Recreación", "Art. 79 Protección Abuso Sexual", "Art. 52 Derecho Identidad"] }
  ];

  const rows = cartones.map((c) => (
    new TableRow({
      children: [
        new TableCell({
          width: { size: USABLE, type: WidthType.DXA },
          borders: ALL_CUT_BORDERS,
          shading: { fill: "F8FAFC" },
          children: [
            new Paragraph({ children: [pRun("✂️ CARTILLA DE BINGO DIDÁCTICO #" + c.id + " • CÓDIGO DE LA NIÑEZ", { bold: true, size: 16, color: "0284C7" })] }),
            new Paragraph({ spacing: { before: 60, after: 60 }, children: [pRun(c.items.join("  |  "), { bold: true, size: 15 })] }),
            new Paragraph({ children: [pRun("Regla: Marca con una 'X' cada artículo conforme el facilitador relate el caso vivencial.", { italics: true, size: 14 })] }),
          ],
        }),
      ],
    })
  ));

  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("BINGO DIDÁCTICO DE LOS DERECHOS DE LA NIÑEZ (CNA)", "Taller Vivencial: Del Código a la Práctica Comunitaria", institutionName),
          new Table({ width: { size: USABLE, type: WidthType.DXA }, rows }),
        ],
      },
    ],
  });
  return await Packer.toBuffer(doc);
}

// -------------------------------------------------------------
// 23. Tarjetas Caminata Derechos CNA (Recortable)
// -------------------------------------------------------------
export async function generateTarjetasCaminataDerechosDocx(institutionName?: string): Promise<Buffer> {
  const perfiles = [
    "Niño indígena de 9 años en comunidad rural sin internet.",
    "Adolescente mujer embarazada de 16 años en situación de pobreza.",
    "Niño de 10 años con discapacidad motriz que asiste a escuela regular.",
    "Adolescente migrante de 15 años sin cédula ni documentación regular.",
    "Niño de 12 años de familia con solvencia económica en la ciudad.",
    "Niña afroecuatoriana de 8 años en barrio periurbano sin centro de salud.",
    "Niño de 11 años que trabaja en el mercado para aportar al hogar.",
    "Adolescente de 14 años con orientación sexual diversa en aula tradicional."
  ];

  const rows = perfiles.map((p, idx) => (
    new TableRow({
      children: [
        new TableCell({
          width: { size: USABLE, type: WidthType.DXA },
          borders: ALL_CUT_BORDERS,
          shading: { fill: "F8FAFC" },
          children: [
            new Paragraph({ children: [pRun("✂️ PERFIL VIVENCIAL #" + (idx + 1) + " • LA CAMINATA DE LOS DERECHOS", { bold: true, size: 16, color: "0284C7" })] }),
            new Paragraph({ spacing: { before: 40, after: 40 }, children: [pRun(p, { bold: true, size: 16 })] }),
            new Paragraph({ children: [pRun("Instrucción: Asume este rol en silencio. Avanza 1 paso solo si tu personaje tiene garantizado el derecho leído.", { italics: true, size: 14 })] }),
          ],
        }),
      ],
    })
  ));

  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("TARJETAS DE IDENTIDADES: LA CAMINATA DE LOS DERECHOS", "Dinámica vivencial sobre brechas estructurales y equidad según el CNA", institutionName),
          new Table({ width: { size: USABLE, type: WidthType.DXA }, rows }),
        ],
      },
    ],
  });
  return await Packer.toBuffer(doc);
}

// -------------------------------------------------------------
// 24. Frases Recortables Ruta Correcta 081-A (Recortable)
// -------------------------------------------------------------
export async function generateFrasesRutaCorrectaDocx(institutionName?: string): Promise<Buffer> {
  const frases = [
    { tipo: "ACCION CORRECTA (VERDE)", texto: "Escuchar a la víctima con calidez en un espacio privado, validando su relato sin juzgar ni poner en duda su palabra." },
    { tipo: "ACCION CORRECTA (VERDE)", texto: "Llenar la Ficha de Detección y entregarla al DECE de manera reservada en un plazo máximo de 24 a 48 horas." },
    { tipo: "ACCION CONDICIONADA (AMARILLO)", texto: "Contactar a la familia únicamente si los presuntos agresores NO forman parte del núcleo del hogar." },
    { tipo: "ACCION PROHIBIDA (ROJO)", texto: "Interrogar minuciosamente al estudiante pidiéndole detalles morbosos o careándolo con el agresor." },
    { tipo: "ACCION PROHIBIDA (ROJO)", texto: "Guardar silencio o intentar mediar acuerdos económicos entre las partes ante violencia sexual." }
  ];

  const rows = frases.map((f) => (
    new TableRow({
      children: [
        new TableCell({
          width: { size: USABLE, type: WidthType.DXA },
          borders: ALL_CUT_BORDERS,
          shading: { fill: f.tipo.includes("VERDE") ? "F0FDF4" : f.tipo.includes("ROJO") ? "FEF2F2" : "FEFCE8" },
          children: [
            new Paragraph({ children: [pRun("✂️ FICHA DE SECUENCIA • " + f.tipo, { bold: true, size: 16, color: f.tipo.includes("VERDE") ? "16A34A" : f.tipo.includes("ROJO") ? "DC2626" : "CA8A04" })] }),
            new Paragraph({ spacing: { before: 40 }, children: [pRun(f.texto, { size: 16 })] }),
          ],
        }),
      ],
    })
  ));

  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("TARJETAS RECORTABLES: LA RUTA CORRECTA (ACUERDO 081-A)", "Taller de Protocolos de Actuación y Derivación sin Errores Procesales", institutionName),
          new Paragraph({ spacing: { after: 120 }, children: [pRun("Instrucción: Recorte cada tarjeta y ordénela en cartulina formando la secuencia temporal del protocolo.", { italics: true, size: 14 })] }),
          new Table({ width: { size: USABLE, type: WidthType.DXA }, rows }),
        ],
      },
    ],
  });
  return await Packer.toBuffer(doc);
}

// -------------------------------------------------------------
// 25. Flujograma Bolsillo Rutas 081-A
// -------------------------------------------------------------
export async function generateFlujogramaRutas081aDocx(institutionName?: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("FLUJOGRAMA DE BOLSILLO: RUTAS Y PROTOCOLOS DOCENTES", "Acuerdo Ministerial 081-A • Actuación Rápida ante Vulneración de Derechos", institutionName),
          new Table({
            width: { size: USABLE, type: WidthType.DXA },
            borders: ALL_SOLID_BORDERS,
            rows: [
              new TableRow({
                children: [
                  new TableCell({ width: { size: USABLE, type: WidthType.DXA }, shading: { fill: "F1F5F9" }, children: [
                    new Paragraph({ children: [pRun("PASO 1: DETECCIÓN Y PRIMERA CONTENCIÓN\n• Si el estudiante revela un hecho de violencia, escucha con calma sin interrogar.\n• Nunca prometas guardar el secreto: 'No puedo ocultarlo porque mi deber es protegerte'.", { size: 15 })] }),
                    new Paragraph({ spacing: { before: 80 }, children: [pRun("PASO 2: DERIVACIÓN INMEDIATA AL DECE\n• Informa a la autoridad institucional y al DECE dentro de las primeras 24 horas.\n• Registra el hecho por escrito en la Ficha de Detección con datos objetivos.", { size: 15 })] }),
                    new Paragraph({ spacing: { before: 80 }, children: [pRun("PASO 3: DENUNCIA EXTERNA (Art. 73 LOEI)\n• En delitos sexuales, la máxima autoridad o DECE denuncia en Fiscalía o Policía (DINAPEN) en menos de 24 horas.\n• No se requiere autorización del representante si el agresor es de la familia.", { size: 15 })] }),
                    new Paragraph({ spacing: { before: 80 }, children: [pRun("LÍNEAS DE EMERGENCIA: ECU-911 | Fiscalía: 1800-FISCALÍA | DECE Institucional", { bold: true, size: 16, color: "0284C7" })] }),
                  ] }),
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

// -------------------------------------------------------------
// 26. Ficha Desgaste Moral DECE
// -------------------------------------------------------------
export async function generateFichaDesgasteMoralDeceDocx(institutionName?: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("FICHA DE ANÁLISIS: EL JUICIO INVISIBLE Y DESGASTE MORAL", "Taller de Terapia Contextual y Autocuidado Radical para Equipos DECE", institutionName),
          new Paragraph({ spacing: { after: 120 }, children: [pRun("Profesional DECE: _________________________________________ Fecha: _______________\n\n1. LAS EXIGENCIAS INVISIBLES DEL SISTEMA:\nEscribe 2 expectativas externas que sientes que el sistema te impone y que no están bajo tu control directo:", { size: 16 })] }),
          new Paragraph({ spacing: { before: 60, after: 120 }, children: [pRun("a) __________________________________________________________________________\nb) __________________________________________________________________________", { size: 15 })] }),
          new Paragraph({ spacing: { after: 120 }, children: [pRun("2. DESLINDE DE RESPONSABILIDADES (LA MOCHILA DE PIEDRAS):\n• LO QUE SÍ DEPENDE DE MÍ: Dar contención técnica cálida, activar la ruta a tiempo y ser ético.\n• LO QUE NO DEPENDE DE MÍ: El fallo judicial, la voluntad de cambio de la familia o las carencias del sistema.", { size: 15, bold: true })] }),
          new Paragraph({ spacing: { before: 100 }, children: [pRun("MI VOTO DE AUTOCUIDADO: 'Hoy suelto la culpa por aquello que no puedo transformar yo solo.'", { italics: true, size: 16, color: "0284C7" })] }),
        ],
      },
    ],
  });
  return await Packer.toBuffer(doc);
}

// -------------------------------------------------------------
// 27. Tarjetas Defusión y Ancla de Valores ACT (Recortable)
// -------------------------------------------------------------
export async function generateTarjetasDefusionValoresActDocx(institutionName?: string): Promise<Buffer> {
  const tarjetas = [
    { titulo: "DEFUSIÓN LINGÜÍSTICA", texto: "Cuando tu mente te diga: 'No sirves para esto', di en voz baja: 'Noto que estoy teniendo el pensamiento de que no sirvo'. Es solo un pensamiento, no es la verdad." },
    { titulo: "EL ANCLA DE VALORES", texto: "¿Por qué decidiste acompañar vidas en el DECE? Recuerda: tu valor cardinal no es el éxito burocrático, es tu compasión y presencia humana auténtica." },
    { titulo: "RESPIRACIÓN COMPASIVA", texto: "Lleva una mano a tu pecho, siente el calor de tu palma. Inhala en 4 tiempos y di: 'Este es un momento difícil. Merezco ser amable y paciente conmigo'." },
    { titulo: "EL LÍMITE PROTECTOR", texto: "Poner un límite laboral (apagar el chat del colegio a las 18:00) no es falta de compromiso: es la única forma de que mañana sigas vivo y entero para tus estudiantes." }
  ];

  const rows = tarjetas.map((t) => (
    new TableRow({
      children: [
        new TableCell({
          width: { size: USABLE, type: WidthType.DXA },
          borders: ALL_CUT_BORDERS,
          shading: { fill: "F8FAFC" },
          children: [
            new Paragraph({ children: [pRun("✂️ TARJETA DE BOLSILLO ACT • " + t.titulo, { bold: true, size: 16, color: "0284C7" })] }),
            new Paragraph({ spacing: { before: 40 }, children: [pRun(t.texto, { size: 15 })] }),
          ],
        }),
      ],
    })
  ));

  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("TARJETAS DE BOLSILLO: DEFUSIÓN COGNITIVA Y VALORES (ACT)", "Herramientas de Autorregulación para Terapeutas y Profesionales DECE", institutionName),
          new Table({ width: { size: USABLE, type: WidthType.DXA }, rows }),
        ],
      },
    ],
  });
  return await Packer.toBuffer(doc);
}

// -------------------------------------------------------------
// 28. Dilemas Laberinto Decisiones Embarazo (Recortable)
// -------------------------------------------------------------
export async function generateDilemasLaberintoDecisionesDocx(institutionName?: string): Promise<Buffer> {
  const dilemas = [
    { caso: "Dilema 1: Presión de Pareja", desc: "Tu pareja te dice: 'Si de verdad me quieres, tenemos que dar el siguiente paso hoy'. ¿Qué camino tomas?\nA) Aceptas por miedo a que termine contigo.\nB) Le dices que lo quieres pero que aún no es el momento y exiges respeto.\nC) Buscas una excusa y huyes de la conversación." },
    { caso: "Dilema 2: Rumores y Presión de Amigos", desc: "Tus amigos se burlan diciendo que eres el único del grupo que no tiene experiencia íntima.\nA) Inventas una historia falsa para que no te molesten.\nB) Tienes una relación apresurada sin protección solo para encajar.\nC) Entiendes que cada persona tiene su ritmo y que la intimidad no es un deporte de competencia." }
  ];

  const rows = dilemas.map((d) => (
    new TableRow({
      children: [
        new TableCell({
          width: { size: USABLE, type: WidthType.DXA },
          borders: ALL_CUT_BORDERS,
          shading: { fill: "F8FAFC" },
          children: [
            new Paragraph({ children: [pRun("✂️ ENCRUCIJADA DE DECISIÓN • " + d.caso, { bold: true, size: 16, color: "0284C7" })] }),
            new Paragraph({ spacing: { before: 40 }, children: [pRun(d.desc, { size: 15 })] }),
          ],
        }),
      ],
    })
  ));

  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("TARJETAS DE DILEMAS: EL LABERINTO DE LAS DECISIONES", "Taller de Prevención del Embarazo en Adolescentes y Asertividad", institutionName),
          new Table({ width: { size: USABLE, type: WidthType.DXA }, rows }),
        ],
      },
    ],
  });
  return await Packer.toBuffer(doc);
}

// -------------------------------------------------------------
// 29. Ficha Quemado de Ideas Mitos Amor
// -------------------------------------------------------------
export async function generateFichaQuemadoIdeasMitosDocx(institutionName?: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("FICHA DE DEBATE: 'EL QUEMADO DE LAS IDEAS'", "Mitos del Enamoramiento vs. Relaciones Sanas y Afectividad", institutionName),
          new Paragraph({ spacing: { after: 120 }, children: [pRun("Analiza las siguientes frases con tu grupo y marca si es MITO o REALIDAD:\n\n1. 'Los celos son una prueba de cuánto le importas a tu pareja.' -> MITO (Los celos indican inseguridad y deseo de control, no amor).\n2. 'Decir NO cuando algo no te hace sentir cómodo es tu derecho indiscutible.' -> REALIDAD.\n3. 'Si una mujer dice 'no sé', en el fondo está diciendo que sí.' -> MITO PELIGROSO (Solo un SÍ claro, entusiasta y lúcido es consentimiento).\n4. 'El amor verdadero no obliga, no lastima y apoya tus proyectos escolares.' -> REALIDAD.", { size: 15 })] }),
        ],
      },
    ],
  });
  return await Packer.toBuffer(doc);
}

// -------------------------------------------------------------
// 30. Bingo Sexualidad Responsable Íconos (Recortable)
// -------------------------------------------------------------
export async function generateBingoSexualidadResponsableDocx(institutionName?: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("CARTONES DEL BINGO DE LA SEXUALIDAD RESPONSABLE", "Taller: Lo que decido hoy, impacta mi mañana (Bachillerato)", institutionName),
          new Table({
            width: { size: USABLE, type: WidthType.DXA },
            borders: ALL_CUT_BORDERS,
            rows: [
              new TableRow({
                children: [
                  new TableCell({ width: { size: USABLE, type: WidthType.DXA }, shading: { fill: "F8FAFC" }, children: [
                    new Paragraph({ children: [pRun("✂️ CARTÓN #1 DE BINGO EDUCATIVO CON ÍCONOS", { bold: true, size: 16, color: "0284C7" })] }),
                    new Paragraph({ spacing: { before: 60, after: 60 }, children: [pRun("🛡️ Condón  |  ✋ Consentimiento  |  🎯 Proyecto de Vida  |  ❤️ Respeto\n🗣️ Comunicación  |  🏥 Centro de Salud  |  ⭐ DECISIÓN RESPONSABLE  |  🧠 Autocuidado", { bold: true, size: 16 })] }),
                    new Paragraph({ children: [pRun("Leyenda: Marca cuando el facilitador mencione el concepto preventivo.", { italics: true, size: 14 })] }),
                  ] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ width: { size: USABLE, type: WidthType.DXA }, shading: { fill: "F8FAFC" }, children: [
                    new Paragraph({ children: [pRun("✂️ CARTÓN #2 DE BINGO EDUCATIVO CON ÍCONOS", { bold: true, size: 16, color: "0284C7" })] }),
                    new Paragraph({ spacing: { before: 60, after: 60 }, children: [pRun("⚖️ Igualdad  |  🏠 Apoyo Familiar  |  🎒 Continuar Estudios  |  🛡️ Condón\n🦠 Prevención ITS  |  ⭐ DECISIÓN RESPONSABLE  |  📍 Implante  |  ✋ Consentimiento", { bold: true, size: 16 })] }),
                    new Paragraph({ children: [pRun("Leyenda: Marca cuando el facilitador mencione el concepto preventivo.", { italics: true, size: 14 })] }),
                  ] }),
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

// -------------------------------------------------------------
// 31. Ficha Proyecto de Vida Decisión Responsable
// -------------------------------------------------------------
export async function generateFichaProyectoVidaResponsableDocx(institutionName?: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("MI COMPROMISO: LO QUE DECIDO HOY, IMPACTA MI MAÑANA", "Diseño de Metas Personales, Afectivas y Profesionales a Mediano Plazo", institutionName),
          new Paragraph({ spacing: { after: 120 }, children: [pRun("Nombre: ___________________________________________ Curso: _______________\n\n1. MI META ACADÉMICA PRINCIPAL AL GRADUARME DE BACHILLER:\n_____________________________________________________________________________\n\n2. ¿QUÉ ACCIONES DE AUTOCUIDADO IMPLEMENTO PARA PROTEGER MI SALUD SEXUAL?\n• Uso de métodos de doble protección (preservativo + información médica).\n• Comunicación abierta con mi pareja sin ceder a presiones.\n\n3. EN CASO DE NECESITAR ASESORÍA O AYUDA MÉDICA, ACUDIRÉ A:\nCentro de Salud más cercano: ________________________ / DECE del Colegio.", { size: 15 })] }),
        ],
      },
    ],
  });
  return await Packer.toBuffer(doc);
}

// -------------------------------------------------------------
// 32. Tarjetas Desafío Masculinidades (Recortable)
// -------------------------------------------------------------
export async function generateTarjetasDesafioMasculinidadesDocx(institutionName?: string): Promise<Buffer> {
  const desafios = [
    { num: 1, mito: "MITO: 'Un hombre debe estar listo para tener relaciones en cualquier momento, si no es poco hombre'.", verdad: "REALIDAD: Los hombres también sienten miedo, dudas y cansancio. Tener el coraje de decir que no es señal de madurez real." },
    { num: 2, mito: "MITO: 'El cuidado de los hijos y la anticoncepción es asunto exclusivo de la mujer'.", verdad: "REALIDAD: La fertilidad y la paternidad son compartidas al 50%. El varón responsable compra, lleva y usa el preservativo siempre." },
    { num: 3, mito: "MITO: 'Los hombres no lloran ni piden ayuda cuando están tristes'.", verdad: "REALIDAD: Reprimir el dolor solo causa agresividad, adicciones y depresión. Expresar lo que sientes te hace fuerte." }
  ];

  const rows = desafios.map((d) => (
    new TableRow({
      children: [
        new TableCell({
          width: { size: USABLE, type: WidthType.DXA },
          borders: ALL_CUT_BORDERS,
          shading: { fill: "F8FAFC" },
          children: [
            new Paragraph({ children: [pRun("✂️ TARJETA DE DECONSTRUCCIÓN MASCULINA #" + d.num, { bold: true, size: 16, color: "0284C7" })] }),
            new Paragraph({ spacing: { before: 40, after: 40 }, children: [pRun(d.mito, { bold: true, size: 15, color: "DC2626" })] }),
            new Paragraph({ children: [pRun(d.verdad, { size: 15, color: "16A34A" })] }),
          ],
        }),
      ],
    })
  ));

  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("TARJETAS RECORTABLES: DE HOMBRE A HOMBRE", "Cuestionando mandatos tradicionales y previniendo la paternidad temprana", institutionName),
          new Table({ width: { size: USABLE, type: WidthType.DXA }, rows }),
        ],
      },
    ],
  });
  return await Packer.toBuffer(doc);
}

// -------------------------------------------------------------
// 33. Pacto Personal Cuido Mi Cuerpo
// -------------------------------------------------------------
export async function generatePactoPersonalCuidoCuerpoDocx(institutionName?: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("PACTO DE HONOR: 'CUIDO MI CUERPO Y CONSTRUYO MIS SUEÑOS'", "Compromiso de Autocuidado, Consentimiento y Responsabilidad Masculina", institutionName),
          new Paragraph({ spacing: { after: 120 }, children: [pRun("Yo, ____________________________________________, reconozco que ser un hombre de verdad implica cuidar de mí mismo y respetar la dignidad de los demás.\n\nPOR TANTO, ME COMPROMETO A:\n1. No presionar a ninguna persona para realizar actos íntimos sin su pleno consentimiento.\n2. Utilizar siempre protección para cuidar mi salud y la de mi pareja.\n3. No compartir jamás fotos íntimas de nadie por redes sociales o chats grupales.\n4. Trabajar cada día con disciplina para alcanzar mis metas y culminar mi bachillerato.\n\nFirma personal: ______________________________  Fecha: _______________", { size: 15 })] }),
        ],
      },
    ],
  });
  return await Packer.toBuffer(doc);
}

// -------------------------------------------------------------
// 34. Ficha Espejo Roto TEA Padres
// -------------------------------------------------------------
export async function generateFichaEspejoRotoTeaDocx(institutionName?: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("FICHA DE REFLEXIÓN INICIAL: 'EL ESPEJO ROTO'", "Taller de Sensibilización para Familias: Antes de Juzgar a un Niño con TEA", institutionName),
          new Paragraph({ spacing: { after: 120 }, children: [pRun("PARTE 1 (Al inicio del taller - honestidad total):\\nCuando veo en la escuela a un niño que grita, golpea o se desborda, yo pienso que:\\n_____________________________________________________________________________\\n_____________________________________________________________________________\\n(Guarda esta hoja en tu bolsillo. No la muestres todavía).\\n\\n------------------------------------------------------------------------------------------------\\n\\nPARTE 2 (Al finalizar el taller vivencial):\\nHoy comprendo que el TEA Grado 3 no es maldad ni mala crianza, sino desbordamiento de su sistema nervioso. Mi compromiso como padre/madre de esta comunidad educativa es:\\n_____________________________________________________________________________", { size: 15 })] }),
        ],
      },
    ],
  });
  return await Packer.toBuffer(doc);
}

// -------------------------------------------------------------
// 35. Guía Origami Grulla Empatía (Recortable)
// -------------------------------------------------------------
export async function generateGuiaOrigamiGrullaEmpatiaDocx(institutionName?: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("GUÍA PASO A PASO: LA GRULLA DE LA EMPATÍA (ORIGAMI)", "Símbolo de Paciencia y Respeto hacia la Neurodiversidad en el Aula", institutionName),
          new Table({
            width: { size: USABLE, type: WidthType.DXA },
            borders: ALL_CUT_BORDERS,
            rows: [
              new TableRow({
                children: [
                  new TableCell({ width: { size: USABLE, type: WidthType.DXA }, shading: { fill: "F8FAFC" }, children: [
                    new Paragraph({ children: [pRun("✂️ 16 PASOS PARA DOBLAR TU GRULLA DE LA COMPRENSIÓN", { bold: true, size: 16, color: "0284C7" })] }),
                    new Paragraph({ spacing: { before: 40 }, children: [pRun("1. Comienza con un papel cuadrado perfecto.\n2. Dobla en diagonal formando un triángulo y desdobla.\n3. Dobla la otra diagonal y desdobla.\n4. Da vuelta la hoja y dobla por la mitad horizontal y vertical.\n5. Colapsa los pliegues hacia el centro formando el cuadrado base preliminar.\n6. Dobla los laterales hacia la línea central formando una cometa.\n7. Dobla la punta superior hacia abajo marcando el pliegue.\n8. Abre la solapa inferior hacia arriba formando un rombo alargado.\n9. Repite del lado opuesto.\n10. Dobla las patas inferiores hacia adentro para hacer cuello y cola.\n11. Dobla la punta del cuello para formar la cabeza de la grulla.\n12. Despliega suavemente las alas hacia los lados.", { size: 14 })] }),
                    new Paragraph({ spacing: { before: 40 }, children: [pRun("Reflexión: 'Así como cada pliegue requiere paciencia, incluir a un niño diferente requiere desaprender nuestros propios prejuicios'.", { italics: true, size: 14, color: "059669" })] }),
                  ] }),
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

// -------------------------------------------------------------
// 36. Caritas Emociones Inicial (Recortable)
// -------------------------------------------------------------
export async function generateCaritasEmocionesInicialDocx(institutionName?: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("LÁMINA RECORTABLE: 'SACO MIS EMOCIONES JUGANDO'", "Educación Inicial (3 a 5 años) • Expresión Somática y Color", institutionName),
          new Table({
            width: { size: USABLE, type: WidthType.DXA },
            borders: ALL_CUT_BORDERS,
            rows: [
              new TableRow({
                children: [
                  new TableCell({ width: { size: USABLE / 2, type: WidthType.DXA }, shading: { fill: "FEFCE8" }, children: [
                    new Paragraph({ children: [pRun("✂️ CARITA ALEGRE (SOL)", { bold: true, size: 16, color: "CA8A04" })] }),
                    new Paragraph({ children: [pRun("[ O   O ]\n   \___/  \n¡Hoy mi corazón salta de alegría!", { size: 16 })] }),
                  ] }),
                  new TableCell({ width: { size: USABLE / 2, type: WidthType.DXA }, shading: { fill: "EFF6FF" }, children: [
                    new Paragraph({ children: [pRun("✂️ CARITA TRISTE (LLUVIA)", { bold: true, size: 16, color: "2563EB" })] }),
                    new Paragraph({ children: [pRun("[ O   O ]\n   /~~~\  \nNecesito un abrazo de osito.", { size: 16 })] }),
                  ] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ width: { size: USABLE / 2, type: WidthType.DXA }, shading: { fill: "FEF2F2" }, children: [
                    new Paragraph({ children: [pRun("✂️ CARITA ENOJADA (LEÓN)", { bold: true, size: 16, color: "DC2626" })] }),
                    new Paragraph({ children: [pRun("[ >   < ]\n   -----  \n¡Soplo como el viento para calmarme!", { size: 16 })] }),
                  ] }),
                  new TableCell({ width: { size: USABLE / 2, type: WidthType.DXA }, shading: { fill: "F0FDF4" }, children: [
                    new Paragraph({ children: [pRun("✂️ CARITA TRANQUILA (PLUMA)", { bold: true, size: 16, color: "16A34A" })] }),
                    new Paragraph({ children: [pRun("[ -   - ]\n   \___/  \nMi cuerpo flota como una nube.", { size: 16 })] }),
                  ] }),
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

// -------------------------------------------------------------
// 37. Ficha Guía Peluche Emoti
// -------------------------------------------------------------
export async function generateFichaGuiaPelucheEmotiDocx(institutionName?: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("GUÍA PEDAGÓGICA: EL RINCÓN DE LA CALMA Y EL PELUCHE EMOTI", "Herramienta de Regulación Emocional en el Aula de Educación Inicial", institutionName),
          new Paragraph({ spacing: { after: 120 }, children: [pRun("1. ¿QUÉ ES EL RINCÓN DE LA CALMA?\nNo es un rincón de castigo. Es un espacio acogedor con cojines, cuentos suaves y el peluche Emoti donde el niño acude voluntariamente cuando se siente abrumado.\n\n2. RUTINA DEL ABRAZO CON EMOTI:\n• Se toma al peluche con ambas manos y se aprieta suavemente contra el pecho.\n• Se cuentan 3 respiraciones profundas: 'Huelo la florecita, apago la velita'.\n• El niño le cuenta al peluche qué le pasó antes de volver a jugar con el grupo.", { size: 15 })] }),
        ],
      },
    ],
  });
  return await Packer.toBuffer(doc);
}

// -------------------------------------------------------------
// 38. Bitácora Explorador Marte (Recortable)
// -------------------------------------------------------------
export async function generateBitacoraExploradorMarteDocx(institutionName?: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("BITÁCORA DEL EXPLORADOR DE MARTE: MINDFULNESS", "Taller: Descarga Emocional y Atención Plena para Niños de 8 a 12 años", institutionName),
          new Table({
            width: { size: USABLE, type: WidthType.DXA },
            borders: ALL_CUT_BORDERS,
            rows: [
              new TableRow({
                children: [
                  new TableCell({ width: { size: USABLE, type: WidthType.DXA }, shading: { fill: "F8FAFC" }, children: [
                    new Paragraph({ children: [pRun("✂️ REGISTRO DEL ASTRONAUTA • MIS 5 SENTIDOS EN PAZ", { bold: true, size: 16, color: "0284C7" })] }),
                    new Paragraph({ spacing: { before: 40 }, children: [pRun("Astronauta: _____________________________________ Fecha estelar: ____________\n\n• VISTA: ¿Qué detalles invisibles descubriste en tu pasa/fruta?\n  ___________________________________________________________________________\n• TACTO: ¿Cómo se sintió en la yema de tus dedos?\n  ___________________________________________________________________________\n• GUSTO: Describe la explosión de sabor al dar el primer bocado lento:\n  ___________________________________________________________________________\n\nMI PODER DE MARTE: 'Cuando sienta que me voy a enojar, haré una pausa de astronauta y respiraré hondo antes de actuar.'", { size: 14 })] }),
                  ] }),
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

// -------------------------------------------------------------
// 39. Tarjetas Técnicas Calma Elemental (Recortable)
// -------------------------------------------------------------
export async function generateTarjetasCalmaElementalDocx(institutionName?: string): Promise<Buffer> {
  const tarjetas = [
    { t: "ABRAZO DE LA MARIPOSA", d: "Cruza tus brazos sobre el pecho con los dedos apoyados bajo las clavículas. Da golpecitos suaves alternados: izquierda, derecha, izquierda... mientras respiras en calma." },
    { t: "RESPIRACIÓN CUADRADA 4x4", d: "Inhala contando 4 segundos... sostén el aire 4 segundos... exhala suavemente en 4 segundos... espera vacío 4 segundos. Tu mente se relaja de inmediato." },
    { t: "EL DETECTIVE DE LOS SENTIDOS", d: "Nombra en tu mente: 3 cosas que ves en el aula, 2 cosas que puedes tocar y 1 sonido lejano que escuchas. ¡Ya estás aquí y estás seguro!" },
    { t: "DESINFLAR EL GLOBO", d: "Imagina que tu estómago es un globo lleno de aire. Suelta el aire con un silbido largo: 'ssssssss' hasta que sientas los hombros livianos." }
  ];

  const rows = tarjetas.map((t) => (
    new TableRow({
      children: [
        new TableCell({
          width: { size: USABLE, type: WidthType.DXA },
          borders: ALL_CUT_BORDERS,
          shading: { fill: "F8FAFC" },
          children: [
            new Paragraph({ children: [pRun("✂️ TÉCNICA DE CALMA INFANTIL • " + t.t, { bold: true, size: 16, color: "0284C7" })] }),
            new Paragraph({ spacing: { before: 40 }, children: [pRun(t.d, { size: 15 })] }),
          ],
        }),
      ],
    })
  ));

  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("TARJETAS DE BOLSILLO: 4 TÉCNICAS RÁPIDAS DE CALMA", "Recursos prácticos de autorregulación para niñas y niños de Básica Elemental", institutionName),
          new Table({ width: { size: USABLE, type: WidthType.DXA }, rows }),
        ],
      },
    ],
  });
  return await Packer.toBuffer(doc);
}

// -------------------------------------------------------------
// 40. Tarjetas Reencuadre Hechos vs Interpretaciones (Recortable)
// -------------------------------------------------------------
export async function generateTarjetasReencuadreHechosDocx(institutionName?: string): Promise<Buffer> {
  const casos = [
    { hecho: "HECHO: Mandaste un mensaje al chat grupal y nadie respondió durante dos horas.", interp: "HISTORIA DE LA MENTE: 'Ya no les caigo bien, me están ignorando a propósito.'", reencuadre: "REENCUADRE OBJETIVO: 'Están almorzando o sin batería. Mi valor como persona no depende de la velocidad de un visto azul.'" },
    { hecho: "HECHO: La profesora te llamó la atención por hablar en clase.", interp: "HISTORIA DE LA MENTE: 'La profe me tiene bronca, solo se fija en mí.'", reencuadre: "REENCUADRE OBJETIVO: 'Solo me pidió silencio porque estaba distraído. No es nada personal contra mí.'" }
  ];

  const rows = casos.map((c, idx) => (
    new TableRow({
      children: [
        new TableCell({
          width: { size: USABLE, type: WidthType.DXA },
          borders: ALL_CUT_BORDERS,
          shading: { fill: "F8FAFC" },
          children: [
            new Paragraph({ children: [pRun("✂️ CASO DE REENCUADRE COGNITIVO #" + (idx + 1), { bold: true, size: 16, color: "0284C7" })] }),
            new Paragraph({ spacing: { before: 40 }, children: [pRun(c.hecho, { bold: true, size: 15 })] }),
            new Paragraph({ children: [pRun(c.interp, { italics: true, size: 14, color: "DC2626" })] }),
            new Paragraph({ spacing: { before: 40 }, children: [pRun(c.reencuadre, { bold: true, size: 15, color: "16A34A" })] }),
          ],
        }),
      ],
    })
  ));

  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("TARJETAS DE REENCUADRE: HECHOS VS. INTERPRETACIONES", "Taller: Lo que ves y lo que crees (Básica Superior)", institutionName),
          new Table({ width: { size: USABLE, type: WidthType.DXA }, rows }),
        ],
      },
    ],
  });
  return await Packer.toBuffer(doc);
}

// -------------------------------------------------------------
// 41. Guía Observación Mindfulness Adolescentes
// -------------------------------------------------------------
export async function generateGuiaMindfulnessAdolescentesDocx(institutionName?: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("GUÍA PRÁCTICA: ATENCIÓN PLENA EN 3 MINUTOS", "Herramienta de Concentración y Manejo del Agobio Mental", institutionName),
          new Paragraph({ spacing: { after: 120 }, children: [pRun("CUANDO SIENTAS QUE LA MENTE ESTÁ SATURADA:\n\n1. DETENTE (Stop): Pausa lo que estás haciendo con el teléfono o las tareas.\n2. OBSERVA: Mira a tu alrededor sin juzgar. Nota 3 texturas o colores reales.\n3. RESPIRA: Siente cómo el aire frío entra por tu nariz y sale tibio.\n4. CONECTA: Pregúntate: '¿Qué necesito en este momento para estar en paz?'.\n\nRecuerda: No puedes evitar las olas del día, pero puedes aprender a surfearlas.", { size: 15 })] }),
        ],
      },
    ],
  });
  return await Packer.toBuffer(doc);
}

// -------------------------------------------------------------
// 42. Mapa Corporal Somatización Bachillerato (Recortable)
// -------------------------------------------------------------
export async function generateMapaCorporalBachilleratoDocx(institutionName?: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("MAPA ANATÓMICO: ¿DÓNDE GUARDA MI CUERPO EL ESTRÉS?", "Taller: Mi cuerpo habla, mi mente escucha (Bachillerato)", institutionName),
          new Table({
            width: { size: USABLE, type: WidthType.DXA },
            borders: ALL_CUT_BORDERS,
            rows: [
              new TableRow({
                children: [
                  new TableCell({ width: { size: USABLE, type: WidthType.DXA }, shading: { fill: "F8FAFC" }, children: [
                    new Paragraph({ children: [pRun("✂️ SILUETA CORPORAL PARA MAPEO SOMÁTICO", { bold: true, size: 16, color: "0284C7" })] }),
                    new Paragraph({ spacing: { before: 40 }, children: [pRun("Estudiante: ______________________________________ Curso: ________________\n\nColorea con rojo donde sientas dolor/tensión, con azul donde sientas vacío o cansancio:\n• CABEZA / MANDÍBULA: __________________________________________________\n• CUELLO Y HOMBROS:   __________________________________________________\n• PECHO (ANSIEDAD):   __________________________________________________\n• ESTÓMAGO (NERVIOS): __________________________________________________\n\nPregunta clave: ¿Qué situación me está generando esta carga y cómo puedo aliviarla?", { size: 14 })] }),
                  ] }),
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

// -------------------------------------------------------------
// 43. Carta Soltar Cargas Compromiso
// -------------------------------------------------------------
export async function generateCartaSoltarCargasDocx(institutionName?: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("CARTA DE PERMISO PARA SOLTAR EL AGOBIO", "Compromiso de Salud Mental y Autocuidado Consciente en Bachillerato", institutionName),
          new Paragraph({ spacing: { after: 120 }, children: [pRun("Hoy me doy permiso para:\n\n1. No ser perfecto ni cumplir las expectativas irreales de todo el mundo.\n2. Descansar sin sentir culpa de no estar estudiando todo el tiempo.\n3. Poner límites a relaciones o situaciones que drenan mi energía.\n4. Pedir ayuda en el DECE o a mi familia cuando sienta que no puedo solo.\n\nFirma de compromiso conmigo mismo: ________________________ Fecha: ___________", { size: 15 })] }),
        ],
      },
    ],
  });
  return await Packer.toBuffer(doc);
}

// -------------------------------------------------------------
// 44. Protocolo Bolsillo Crisis Durante Talleres
// -------------------------------------------------------------
export async function generateProtocoloBolsilloCrisisDocx(institutionName?: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("PROTOCOLO DE ACCIÓN INMEDIATA ANTE CRISIS EN TALLERES", "Herramienta Técnica Obligatoria para Facilitadores y Duplas DECE", institutionName),
          new Table({
            width: { size: USABLE, type: WidthType.DXA },
            borders: ALL_SOLID_BORDERS,
            rows: [
              new TableRow({
                children: [
                  new TableCell({ width: { size: USABLE, type: WidthType.DXA }, shading: { fill: "F1F5F9" }, children: [
                    new Paragraph({ children: [pRun("1. ASIGNACIÓN INMEDIATA DE ROLES:\n• PSICÓLOGO 1 (Contención individual): Acompaña con calma al estudiante en crisis fuera del aula a un espacio seguro (DECE, biblioteca vacía).\n• PSICÓLOGO 2 (Sostén grupal): Continúa la actividad con el resto del grupo, manteniendo serenidad y evitando la dispersión morbosa.", { size: 15, bold: true })] }),
                    new Paragraph({ spacing: { before: 80 }, children: [pRun("2. CONTENCIÓN SOMÁTICA (PSICÓLOGO 1):\n• Pies en el suelo (grounding): contacto firme con la silla.\n• Conteo respiratorio: Inhalo 1..2..3, exhalo 1..2..3.\n• Validación: 'Veo que te sientes angustiado. Es normal sentir dolor y aquí estás a salvo'.", { size: 14 })] }),
                    new Paragraph({ spacing: { before: 80 }, children: [pRun("3. EVALUACIÓN Y DERIVACIÓN:\n• Si hay ideación suicida activa con planificación: no dejar solo al estudiante, llamar a representante y activar ruta de salud (Línea 171 opc 6 / MSP).", { size: 14, bold: true, color: "DC2626" })] }),
                  ] }),
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

// -------------------------------------------------------------
// 45. Tarjetas Honrar Vida Redes Cuidado (Recortable)
// -------------------------------------------------------------
export async function generateTarjetasHonrarVidaDocx(institutionName?: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("TARJETAS DE DESCARGA: 'HONRAR LA VIDA, CUIDAR EL CORAZÓN'", "Taller para Grupos con Nivel de Afectación Alto / Postvención", institutionName),
          new Table({
            width: { size: USABLE, type: WidthType.DXA },
            borders: ALL_CUT_BORDERS,
            rows: [
              new TableRow({
                children: [
                  new TableCell({ width: { size: USABLE, type: WidthType.DXA }, shading: { fill: "F8FAFC" }, children: [
                    new Paragraph({ children: [pRun("✂️ TARJETA DE RESIGNIFICACIÓN • 'DEJO IR PARA CONTINUAR'", { bold: true, size: 16, color: "0284C7" })] }),
                    new Paragraph({ spacing: { before: 40 }, children: [pRun("• LO QUE ELIJO SOLTAR HOY (la culpa, la impotencia, las dudas sin respuesta):\n  ___________________________________________________________________________\n  ___________________________________________________________________________\n\n• EL REGALO DE VIDA QUE ELIJO SOSTENER (la memoria, el cuidado a mis amigos):\n  ___________________________________________________________________________\n\nLÍNEAS DE AYUDA PERMANENTE 24/7: Línea 171 opción 6 | ECU-911 | DECE Colegial", { size: 14 })] }),
                  ] }),
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

// -------------------------------------------------------------
// 46. Tablero y Tarjetas: La Ruta del Caso (Acuerdo 0044-A)
// -------------------------------------------------------------
export async function generateTableroRutaCaso0044aDocx(institutionName?: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("JUEGO DE MESA: 'LA RUTA DEL CASO' (ACUERDO 0044-A)", "Tablero de 24 Casillas, Preguntas, Retos de Actuación y Trampas del Art. 30", institutionName),
          instructionBox("TABLERO DE LA RUTA DEL CASO (24 CASILLAS): Recorrido por las etapas del acompañamiento integral (Prevención → Detección → Atención → Contención → Derivación → Seguimiento → Reparación Socioeducativa). Tiren el dado y avancen. En casillas '❓ Pregunta', respondan la trivia; en '🎭 Reto', representen la acción en 30 segundos; en '⚠️ Trampa', retrocedan 3 casillas por violar el Art. 30."),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  tableCell("1. ❓ INICIO: Señal de alerta detectada (Art. 28)", { fill: "D1FAE5", bold: true }),
                  tableCell("2. Escucha activa y empatía sin juicio (Art. 4)", { fill: "F1F5F9" }),
                  tableCell("3. 🎭 RETO: Mini actuación contención cálida", { fill: "FEF3C7", bold: true }),
                  tableCell("4. Registro objetivo de hechos observados", { fill: "F1F5F9" }),
                ]
              }),
              new TableRow({
                children: [
                  tableCell("8. Comunicación inmediata con la familia (Art. 29)", { fill: "F1F5F9" }),
                  tableCell("7. ⚠️ TRAMPA: Exigir relato repetido (-3 casillas)", { fill: "FEE2E2", bold: true }),
                  tableCell("6. Consentimiento informado revisado (Art. 21)", { fill: "F1F5F9" }),
                  tableCell("5. ❓ PREGUNTA: Plazo contención DECE", { fill: "D1FAE5", bold: true }),
                ]
              }),
              new TableRow({
                children: [
                  tableCell("9. ❓ PREGUNTA: Principio de no abstención", { fill: "D1FAE5", bold: true }),
                  tableCell("10. Activación Equipo de Cuidado (Art. 9)", { fill: "F1F5F9" }),
                  tableCell("11. 🎭 RETO: Explicar acta a la familia", { fill: "FEF3C7", bold: true }),
                  tableCell("12. No revictimización en el aula (Art. 30)", { fill: "F1F5F9" }),
                ]
              }),
              new TableRow({
                children: [
                  tableCell("16. Derivación externa a salud/justicia", { fill: "F1F5F9" }),
                  tableCell("15. ⚠️ TRAMPA: Confrontar víctima y agresor (-3 casillas)", { fill: "FEE2E2", bold: true }),
                  tableCell("14. Contención emocional en 48 horas (Art. 13)", { fill: "F1F5F9" }),
                  tableCell("13. ❓ PREGUNTA: 10 Apartados Plan Acompañamiento", { fill: "D1FAE5", bold: true }),
                ]
              }),
              new TableRow({
                children: [
                  tableCell("17. ❓ PREGUNTA: Asistencia técnica UDAI/DIE", { fill: "D1FAE5", bold: true }),
                  tableCell("18. Ajustes razonables pedagógicos", { fill: "F1F5F9" }),
                  tableCell("19. 🎭 RETO: Adulto referente en shock", { fill: "FEF3C7", bold: true }),
                  tableCell("20. Cuidado al cuidador y equipo DECE (Art. 42)", { fill: "F1F5F9" }),
                ]
              }),
              new TableRow({
                children: [
                  tableCell("24. 🌱 META: Reparación socioeducativa (Art. 35)", { fill: "10B981", bold: true, color: "FFFFFF" }),
                  tableCell("23. Seguimiento continuo no concluye con derivación", { fill: "F1F5F9" }),
                  tableCell("22. ⚠️ TRAMPA: Difundir caso en WhatsApp (-3 casillas)", { fill: "FEE2E2", bold: true }),
                  tableCell("21. ❓ PREGUNTA: Negligencia y reporte", { fill: "D1FAE5", bold: true }),
                ]
              }),
            ]
          }),
          new Paragraph({ spacing: { before: 180, after: 80 }, children: [pRun("TARJETAS DE TRIVIA, RETOS Y TRAMPAS (RECORTAR POR LA LÍNEA ✂️)", { bold: true, color: "065F46" })] }),
          ...cutoutGrid([
            { title: "❓ PREGUNTA 1 (Art. 13)", text: "P: ¿Cuál es el plazo máximo que tiene el DECE para activar la contención emocional inmediata?\nR: 48 horas máximo (Art. 13 num. 6)." },
            { title: "❓ PREGUNTA 2 (Art. 9)", text: "P: ¿Con qué frecuencia mínima se reúne el Equipo de Cuidado y Respuesta?\nR: Ordinaria al menos 1 vez al mes, y extraordinaria ante cualquier riesgo." },
            { title: "❓ PREGUNTA 3 (Art. 11)", text: "P: ¿El Equipo Institucional de Cuidado reemplaza o sustituye al DECE?\nR: No, nunca lo sustituye. Trabajan coordinadamente." },
            { title: "❓ PREGUNTA 4 (Art. 17)", text: "P: ¿Quién recopila los consentimientos informados de familias al inicio del año escolar?\nR: El docente tutor de grado o curso." },
            { title: "❓ PREGUNTA 5 (Art. 27)", text: "P: ¿Es necesario esperar certeza plena sobre la gravedad de un caso para reportarlo?\nR: No. Se comunica de inmediato sin esperar certeza plena." },
            { title: "❓ PREGUNTA 6 (Art. 20)", text: "P: ¿Qué dice el principio de no abstención?\nR: Ningún actor institucional podrá abstenerse de actuar por falta de competencia directa." },
            { title: "🎭 RETO 1 (30 segundos)", text: "Muestren cómo un docente informa a la familia de manera respetuosa y empática sobre una señal de alerta detectada en el aula." },
            { title: "🎭 RETO 2 (30 segundos)", text: "Muestren cómo actúa un 'adulto referente' acompañando físicamente y en calma a un estudiante en estado de conmoción o llanto." },
            { title: "⚠️ TRAMPA 1 (-3 casillas)", text: "¡ERROR PROHIBIDO! Confrontaron a la víctima con la persona presunta agresora para 'aclarar' los hechos (Violación Art. 30 num. 2). Retroceden 3 casillas." },
            { title: "⚠️ TRAMPA 2 (-3 casillas)", text: "¡ERROR PROHIBIDO! Le pidieron al estudiante que contara la historia por tercera vez frente a otro docente (Violación Art. 30 num. 3). Retroceden 3 casillas." },
            { title: "⚠️ TRAMPA 3 (-3 casillas)", text: "¡ERROR PROHIBIDO! Comentaron detalles sensibles del caso en la sala de profesores o en WhatsApp escolar (Violación Arts. 30 y 33). Retroceden 3 casillas." },
            { title: "🌱 REPARACIÓN FINAL", text: "¡LLEGARON A LA META! El Art. 35 establece que el acompañamiento no concluye con la derivación externa, sino con la restitución de derechos y bienestar del NNA." }
          ])
        ],
      },
    ],
  });
  return await Packer.toBuffer(doc);
}

// -------------------------------------------------------------
// 47. Tarjetas Roles y Semáforo de Alerta (Acuerdo 0044-A)
// -------------------------------------------------------------
export async function generateTarjetasRolesSemaforoAlerta0044aDocx(institutionName?: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("TARJETAS DE ROLES Y SEMÁFORO DE ALERTA (ACUERDO 0044-A)", "Dinámicas Vivenciales: '¿Quién soy en el sistema?' y 'Semáforo de Detección Temprana'", institutionName),
          instructionBox("INSTRUCCIONES: Imprimir y recortar con tijeras (✂️). Las Tarjetas de Roles se usan en el Bloque 1 para simular la red del Art. 6. Las Tarjetas del Semáforo entrenan el reflejo de actuar sin certeza plena (Art. 27 y 28)."),
          new Paragraph({ spacing: { before: 120, after: 60 }, children: [pRun("SET 1: 12 ACTORES CORRESPONSABLES DEL SISTEMA DE CUIDADO (ART. 6)", { bold: true, color: "065F46" })] }),
          ...cutoutGrid([
            { title: "1. AUTORIDAD INSTITUCIONAL", text: "Activa el Equipo de Cuidado, suscribe derivaciones externas, garantiza medidas de protección inmediata y no revictimización." },
            { title: "2. DECE INSTITUCIONAL", text: "Brinda contención emocional en máx. 48h, diseña y coordina el Plan de Acompañamiento Integral y da seguimiento." },
            { title: "3. DOCENTE TUTOR/A", text: "Recopila consentimientos informados al inicio de año, primer detector de cambios conductuales y enlace directo con familias." },
            { title: "4. DOCENTE DE AULA", text: "Detecta señales de alerta en clase (Art. 28), aplica el principio de no abstención (Art. 20) y adapta ajustes curriculares." },
            { title: "5. DAI / DIE", text: "Docente de Apoyo a la Inclusión y Departamento de Inclusión: asesoran en NEE, adaptaciones y apoyos pedagógicos específicos." },
            { title: "6. UDAI DISTRITAL", text: "Unidad Distrital de Apoyo a la Inclusión: emite evaluaciones psicopedagógicas integrales y asesora en inclusión educativa." },
            { title: "7. DECE DISTRITAL", text: "Articula con la red interinstitucional cantonal, apoya en casos de alta complejidad y traslados por riesgo psicosocial." },
            { title: "8. ASESORÍA JURÍDICA DISTRITAL", text: "Asesora legalmente a la institución y canaliza denuncias formales ante Fiscalía o Juntas Cantonales de Protección." },
            { title: "9. MADRE / PADRE / REPRESENTANTE", text: "Corresponsable del cuidado, firma consentimientos, asiste a convocatorias y cumple acuerdos para proteger al NNA." },
            { title: "10. ESTUDIANTE (NNA)", text: "Sujeto titular de derechos, centro de todo el acompañamiento, con derecho a ser escuchado en confidencialidad y respetado." },
            { title: "11. SECTOR SALUD (MSP / IESS)", text: "Brinda atención médica, psicológica externa y psiquiátrica especializada; coordina contrarreferencias con el DECE." },
            { title: "12. SISTEMA DE JUSTICIA", text: "Fiscalía, DINAPEN y Juntas Cantonales: dictan medidas de protección y sancionan vulneraciones graves de derechos." }
          ]),
          new Paragraph({ spacing: { before: 200, after: 60 }, children: [pRun("SET 2: TARJETAS DEL SEMÁFORO DE ALERTA (ARTS. 27 Y 28)", { bold: true, color: "065F46" })] }),
          ...cutoutGrid([
            { title: "CASO 1: Lunes por la mañana", text: "Situación: Un estudiante llega cansado y bostezando un lunes por la mañana.\nSemáforo: 🟢 VERDE\nJustificación: Comportamiento esperable de la edad sin patrón de riesgo reiterado." },
            { title: "CASO 2: Participación interrumpida", text: "Situación: Un estudiante muy activo deja de hablar y participar por 2 semanas seguidas.\nSemáforo: 🟡 AMARILLO\nJustificación: Cambio a observar y registrar en bitácora; acercarse a dialogar." },
            { title: "CASO 3: Llanto inexplicable", text: "Situación: Estudiante presenta llanto frecuente en clase sin causa aparente.\nSemáforo: 🔴 ROJO (Art. 28)\nJustificación: Señal de alerta expresa; comunicar de inmediato al DECE." },
            { title: "CASO 4: Verbalización de desesperanza", text: "Situación: Estudiante comenta: 'A veces preferiría no estar aquí ni despertar'.\nSemáforo: 🔴 ROJO (Art. 28)\nJustificación: Riesgo autolítico prioritario; activar contención inmediata." },
            { title: "CASO 5: Lesión visible no coherente", text: "Situación: Estudiante presenta moretones en brazos con explicaciones contradictorias.\nSemáforo: 🔴 ROJO (Art. 28)\nJustificación: Lesión inexplicada; prohibido interrogar, reportar de inmediato." },
            { title: "CASO 6: Aislamiento en el recreo", text: "Situación: Estudiante permanece solo contra la pared en todos los recreos hace un mes.\nSemáforo: 🔴 ROJO (Art. 28)\nJustificación: Aislamiento sostenido y pérdida de red de pares." }
          ])
        ],
      },
    ],
  });
  return await Packer.toBuffer(doc);
}

// -------------------------------------------------------------
// 48. Tarjetas Casos Sociodrama y Guía de Esquinas (Acuerdo 0044-A)
// -------------------------------------------------------------
export async function generateTarjetasCasosSociodramaEsquinas0044aDocx(institutionName?: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("CASOS PARA SOCIODRAMA Y GUÍA DE ESQUINAS (ACUERDO 0044-A)", "Taller Lúdico 'Cuidamos Juntos': Dinámicas de Actuación y Postura Corporal", institutionName),
          instructionBox("INSTRUCCIONES DE TRABAJO: 1) Recortar las 8 tarjetas de casos. En grupos de 4-5 docentes, preparan una dramatización de 2 minutos mostrando primero el error habitual del sistema, dicen '¡REBOBINAR!' y actúan la respuesta legal correcta. 2) Utilizar los 3 letreros para la dinámica de movimiento en esquinas del salón."),
          new Paragraph({ spacing: { before: 120, after: 60 }, children: [pRun("8 TARJETAS DE CASOS FICTICIOS PARA SOCIODRAMA (BLOQUE 5)", { bold: true, color: "065F46" })] }),
          ...cutoutGrid([
            { title: "CASO 1: El comentario en el recreo", text: "Una docente escucha por casualidad que un estudiante le dice a otro: 'Ojalá no tuviera que volver a mi casa hoy'.\nPregunta: ¿Qué hace la docente en los próximos 5 minutos?\nArtículos clave: 27, 28 y 29 (actuación sin esperar certeza)." },
            { title: "CASO 2: El relato repetido", text: "Un estudiante cuenta a su tutor lo que le sucedió. El tutor lo lleva ante el vicerrector, quien le pide que lo cuente 'otra vez con calma'.\nPregunta: ¿Qué grave error se comete y cómo se corrige?\nArtículo clave: Art. 30 num. 3 (prohibición de revictimización)." },
            { title: "CASO 3: La familia que no firma", text: "Una madre se niega a firmar el consentimiento informado sin dar motivo alguno.\nPregunta: ¿Qué ruta obligatoria sigue la institución?\nArtículo clave: Art. 21 (acta de compromiso / reporte por negligencia)." },
            { title: "CASO 4: 'Eso es del DECE, no mío'", text: "Un profesor de Educación Física nota marcas inexplicadas, pero piensa: 'Yo solo doy deportes, que lo vea otro'.\nPregunta: ¿Qué infracción comete según el Art. 20 (no abstención)?" },
            { title: "CASO 5: El grupo de WhatsApp", text: "Tras un hecho en el recreo, docentes comentan detalles sensibles en el chat grupal 'para mantenerse al tanto'.\nPregunta: ¿Qué principios de confidencialidad y no exposición se violan? (Art. 33)." },
            { title: "CASO 6: La reunión que nunca llega", text: "Se detecta un riesgo un lunes, pero el comité decide esperar a la reunión ordinaria de fin de mes para tratarlo.\nPregunta: ¿Por qué el Art. 9 exige reunión extraordinaria inmediata?" },
            { title: "CASO 7: Barreras no diagnosticadas", text: "Un docente nota graves dificultades de comprensión en un estudiante pero no sabe a quién acudir.\nPregunta: ¿Cómo se articula con DAI, DIE y UDAI según los Arts. 18 y 19?" },
            { title: "CASO 8: El caso que ya se derivó", text: "Un estudiante fue derivado a salud mental hace un mes. El colegio piensa que 'ya no es su responsabilidad'.\nPregunta: ¿Por qué el Art. 35 dice que el seguimiento nunca termina ahí?" }
          ]),
          new Paragraph({ spacing: { before: 200, after: 60 }, children: [pRun("GUÍA Y ENUNCIADOS PARA LA DINÁMICA DE ESQUINAS (BLOQUE 4)", { bold: true, color: "065F46" })] }),
          calloutBox("LETREROS DE PARED: Colocar un letrero en cada esquina: [HACERLO] (Verde), [PROHIBIDO] (Rojo), [DEPENDE DEL CASO] (Amarillo)", { fill: "F1F5F9", bold: true }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  tableCell("Enunciado a leer en voz alta", { fill: "E2E8F0", bold: true }),
                  tableCell("Esquina Correcta", { fill: "E2E8F0", bold: true }),
                  tableCell("Fundamento Normativo", { fill: "E2E8F0", bold: true })
                ]
              }),
              new TableRow({
                children: [
                  tableCell("Acompañar al estudiante con un adulto referente mientras se activa el protocolo."),
                  tableCell("HACERLO", { fill: "D1FAE5", bold: true }),
                  tableCell("Art. 29 (Medida de contención segura)")
                ]
              }),
              new TableRow({
                children: [
                  tableCell("Confrontar a la presunta víctima con su presunto agresor en una sala para que hablen."),
                  tableCell("PROHIBIDO", { fill: "FEE2E2", bold: true }),
                  tableCell("Art. 30 num. 2 (Prohibición expresa)")
                ]
              }),
              new TableRow({
                children: [
                  tableCell("Decir 'ese caso no es de mi materia' ante una señal de alerta clara."),
                  tableCell("PROHIBIDO", { fill: "FEE2E2", bold: true }),
                  tableCell("Art. 20 (Principio de no abstención)")
                ]
              }),
              new TableRow({
                children: [
                  tableCell("Exigir al estudiante que repita lo que le pasó ante varios profesores."),
                  tableCell("PROHIBIDO", { fill: "FEE2E2", bold: true }),
                  tableCell("Art. 30 num. 3 (Revictimización)")
                ]
              }),
              new TableRow({
                children: [
                  tableCell("Esperar a estar 100% seguros y tener pruebas antes de avisar al DECE."),
                  tableCell("PROHIBIDO", { fill: "FEE2E2", bold: true }),
                  tableCell("Art. 27 (Obligación de actuar sin certeza previa)")
                ]
              }),
              new TableRow({
                children: [
                  tableCell("Creer que la responsabilidad del colegio terminó porque ya se derivó al hospital."),
                  tableCell("PROHIBIDO", { fill: "FEE2E2", bold: true }),
                  tableCell("Art. 35 (Seguimiento continuo obligatorio)")
                ]
              })
            ]
          })
        ],
      },
    ],
  });
  return await Packer.toBuffer(doc);
}

// -------------------------------------------------------------
// 49. Bingo DECE, Semillas y Certificados (Acuerdo 0044-A)
// -------------------------------------------------------------
export async function generateBingoDeceSemillasCertificados0044aDocx(institutionName?: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: MARGIN } },
        children: [
          ...headerBanner("BINGO DECE, SEMILLAS DE COMPROMISO Y CERTIFICADOS", "Herramientas de Cierre, Evaluación y Compromiso Institucional (Acuerdo 0044-A)", institutionName),
          instructionBox("KIT DE CIERRE PEDAGÓGICO: 1) Cartones de Bingo DECE para fijar vocabulario normativo con pistas conceptuales; 2) Semillas de Compromiso recortables para el mural del colegio; 3) Certificado oficial de participación editable; 4) Ficha de evaluación rápida."),
          new Paragraph({ spacing: { before: 120, after: 60 }, children: [pRun("CARTONES DE BINGO DECE (MATRIZ DE TÉRMINOS TÉCNICOS)", { bold: true, color: "065F46" })] }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  tableCell("DECE", { fill: "E0F2FE", bold: true }),
                  tableCell("DAI", { fill: "F1F5F9" }),
                  tableCell("UDAI", { fill: "F1F5F9" }),
                  tableCell("DIE", { fill: "F1F5F9" }),
                  tableCell("48 HORAS", { fill: "FEF3C7", bold: true }),
                ]
              }),
              new TableRow({
                children: [
                  tableCell("No revictimización", { fill: "F1F5F9" }),
                  tableCell("Interés superior", { fill: "F1F5F9" }),
                  tableCell("Confidencialidad", { fill: "F1F5F9" }),
                  tableCell("Consentimiento", { fill: "F1F5F9" }),
                  tableCell("Equipo Cuidado", { fill: "F1F5F9" }),
                ]
              }),
              new TableRow({
                children: [
                  tableCell("Señal de alerta", { fill: "F1F5F9" }),
                  tableCell("Debida diligencia", { fill: "F1F5F9" }),
                  tableCell("★ LIBRE ★", { fill: "10B981", bold: true, color: "FFFFFF" }),
                  tableCell("Reparación", { fill: "F1F5F9" }),
                  tableCell("Derivación externa", { fill: "F1F5F9" }),
                ]
              }),
              new TableRow({
                children: [
                  tableCell("Ruta negligencia", { fill: "F1F5F9" }),
                  tableCell("Acta compromiso", { fill: "F1F5F9" }),
                  tableCell("No abstención", { fill: "FEF3C7", bold: true }),
                  tableCell("Cuidado cuidador", { fill: "F1F5F9" }),
                  tableCell("Plan integral", { fill: "F1F5F9" }),
                ]
              }),
              new TableRow({
                children: [
                  tableCell("Enfoque restaurativo", { fill: "F1F5F9" }),
                  tableCell("Ajustes razonables", { fill: "F1F5F9" }),
                  tableCell("Seguimiento", { fill: "F1F5F9" }),
                  tableCell("Prevención universal", { fill: "F1F5F9" }),
                  tableCell("Corresponsabilidad", { fill: "E0F2FE", bold: true }),
                ]
              }),
            ]
          }),
          new Paragraph({ spacing: { before: 180, after: 60 }, children: [pRun("PLANTILLAS RECORTABLES: 'SEMILLA DE COMPROMISO' (BLOQUE 7)", { bold: true, color: "065F46" })] }),
          ...cutoutGrid([
            { title: "🌱 MI COMPROMISO SEMANAL", text: "Esta semana, en mi rol dentro del sistema de cuidado institucional, me comprometo formalmente a:\n____________________________________________________________________\n____________________________________________________________________\nFirma del Docente: _______________________" },
            { title: "🌱 MI COMPROMISO SEMANAL", text: "Esta semana, en mi rol dentro del sistema de cuidado institucional, me comprometo formalmente a:\n____________________________________________________________________\n____________________________________________________________________\nFirma del Docente: _______________________" },
            { title: "🌱 MI COMPROMISO SEMANAL", text: "Esta semana, en mi rol dentro del sistema de cuidado institucional, me comprometo formalmente a:\n____________________________________________________________________\n____________________________________________________________________\nFirma del Docente: _______________________" },
            { title: "🌱 MI COMPROMISO SEMANAL", text: "Esta semana, en mi rol dentro del sistema de cuidado institucional, me comprometo formalmente a:\n____________________________________________________________________\n____________________________________________________________________\nFirma del Docente: _______________________" }
          ]),
          new Paragraph({ spacing: { before: 200, after: 60 }, children: [pRun("CERTIFICADO OFICIAL DE PARTICIPACIÓN", { bold: true, color: "065F46" })] }),
          calloutBox("CERTIFICADO DE PARTICIPACIÓN DOCENTE\n\nSe otorga el presente reconocimiento a:\n_________________________________________________________________\nPor su destacada y activa participación en el Taller Lúdico Institucional:\n'CUIDAMOS JUNTOS'\nSocialización vivencial del Acuerdo Ministerial MINEDEC-MINEDEC-2026-00044-A sobre Acompañamiento Integral y Protección de la Niñez y Adolescencia.\n\nDado en: ________________________ el _____ de ______________ de 2026.\n\n\n_________________________________          _________________________________\n  Coordinación DECE Institucional                   Rectorado / Dirección", { fill: "F8FAFC", bold: true })
        ],
      },
    ],
  });
  return await Packer.toBuffer(doc);
}

// -------------------------------------------------------------
// DESPACHADOR CENTRAL DE MATERIALES (49 MATERIALES OFICIALES)
// -------------------------------------------------------------
export async function generateWorkshopMaterialDocx(
  workshopId: string,
  materialId: string,
  institutionName?: string
): Promise<{ buffer: Buffer; fileName: string } | null> {
  switch (materialId) {
    // 2023-2024
    case "casos-simulacion-suicidio":
      return { buffer: await generateSuicidioCasesDocx(institutionName), fileName: "Casos_Simulacion_Prevencion_Suicidio_SADEX.docx" };
    case "guia-senales-alerta-mitos":
      return { buffer: await generateSuicidioGuideDocx(institutionName), fileName: "Ficha_Senales_Alerta_y_Mitos_SADEX.docx" };
    case "guia-bolsillo-pap-docentes":
      return { buffer: await generatePapPocketGuideDocx(institutionName), fileName: "Guia_Bolsillo_PAP_Docentes_SADEX.docx" };
    case "tarjetas-grounding-respiracion":
      return { buffer: await generateGroundingCardsDocx(institutionName), fileName: "Tarjetas_Recortables_Grounding_Respiracion_SADEX.docx" };
    case "ficha-flor-fortalezas":
      return { buffer: await generateFlowerFortalezasDocx(institutionName), fileName: "Ficha_Recortable_Flor_Fortalezas_Autoestima_SADEX.docx" };
    case "tarjetas-afirmaciones-positivas":
      return { buffer: await generateAffirmationCardsDocx(institutionName), fileName: "Tarjetas_Coleccionables_Afirmaciones_Positivas_SADEX.docx" };
    case "matriz-analisis-contexto-dece":
      return { buffer: await generateDeceContextMatrixDocx(institutionName), fileName: "Matriz_Analisis_Contextual_Pobreza_Infantil_DECE_SADEX.docx" };
    
    // 2024-2025
    case "bingo-estilos-crianza":
      return { buffer: await generateBingoEstilosCrianzaDocx(institutionName), fileName: "Bingo_Estilos_Crianza_Familias_SADEX.docx" };
    case "acuerdos-corresponsabilidad":
      return { buffer: await generateAcuerdosCorresponsabilidadDocx(institutionName), fileName: "Ficha_Acuerdos_Corresponsabilidad_Familia_SADEX.docx" };
    case "pasaporte-triatlon-ovp":
      return { buffer: await generatePasaporteTriatlonDocx(institutionName), fileName: "Pasaporte_Triatlon_Academico_OVP_SADEX.docx" };
    case "semaforo-buen-trato-recortable":
      return { buffer: await generateSemaforoBuenTratoDocx(institutionName), fileName: "Ficha_Recortable_Semaforo_Buen_Trato_SADEX.docx" };
    case "medallas-campeon-buen-trato":
      return { buffer: await generateMedallasBuenTratoDocx(institutionName), fileName: "Medallas_Recortables_Buen_Trato_Infantil_SADEX.docx" };
    case "tarjetas-casos-alerta-aula":
      return { buffer: await generateTarjetasCasosAlertaAulaDocx(institutionName), fileName: "Tarjetas_Casos_Alerta_Aula_Epilepsia_SADEX.docx" };
    case "protocolo-bolsillo-epilepsia":
      return { buffer: await generateProtocoloBolsilloEpilepsiaDocx(institutionName), fileName: "Protocolo_Bolsillo_Primeros_Auxilios_Epilepsia_SADEX.docx" };
    case "tarjetas-frases-estereotipos":
      return { buffer: await generateTarjetasFrasesEstereotiposDocx(institutionName), fileName: "Tarjetas_Debate_Racismo_y_Microagresiones_SADEX.docx" };
    case "decalogo-convivencia-intercultural":
      return { buffer: await generateDecalogoInterculturalidadDocx(institutionName), fileName: "Decalogo_Escuela_Intercultural_Inclusiva_SADEX.docx" };
    case "tarjetas-historias-diversidad":
      return { buffer: await generateTarjetasHistoriasDiversidadDocx(institutionName), fileName: "Tarjetas_Historias_Diversidad_y_Prejuicios_SADEX.docx" };
    case "tarjetas-mensajes-yo-asertividad":
      return { buffer: await generateTarjetasMensajesYoDocx(institutionName), fileName: "Tarjetas_Entrenamiento_Mensaje_Yo_Asertividad_SADEX.docx" };
    case "rueda-emociones-arbol-apoyo":
      return { buffer: await generateRuedaEmocionesArbolDocx(institutionName), fileName: "Ficha_Recortable_Rueda_Emociones_y_Arbol_Apoyo_SADEX.docx" };

    // 2025-2026 (26 nuevos materiales)
    case "tarjetas-trivia-acuerdo-015a":
      return { buffer: await generateTriviaAcuerdo015aDocx(institutionName), fileName: "Tarjetas_Trivia_Expres_Acuerdo_015A_Celulares_SADEX.docx" };
    case "matriz-compromisos-convivencia-celulares":
      return { buffer: await generateMatrizCompromisosCelularesDocx(institutionName), fileName: "Matriz_Compromisos_Codigo_Convivencia_Celulares_SADEX.docx" };
    case "cartillas-bingo-derechos-ninez":
      return { buffer: await generateBingoDerechosNinezDocx(institutionName), fileName: "Cartillas_Bingo_Derechos_Ninez_CNA_SADEX.docx" };
    case "tarjetas-caminata-derechos-cna":
      return { buffer: await generateTarjetasCaminataDerechosDocx(institutionName), fileName: "Tarjetas_Caminata_Derechos_CNA_20Perfiles_SADEX.docx" };
    case "set-frases-recortables-ruta-correcta":
      return { buffer: await generateFrasesRutaCorrectaDocx(institutionName), fileName: "Tarjetas_Recortables_Ruta_Correcta_Acuerdo_081A_SADEX.docx" };
    case "flujograma-bolsillo-rutas-081a":
      return { buffer: await generateFlujogramaRutas081aDocx(institutionName), fileName: "Flujograma_Bolsillo_Rutas_Actuacion_Docente_081A_SADEX.docx" };
    case "ficha-desgaste-moral-juicio-invisible":
      return { buffer: await generateFichaDesgasteMoralDeceDocx(institutionName), fileName: "Ficha_Desgaste_Moral_y_Juicio_Invisible_DECE_SADEX.docx" };
    case "tarjetas-defusion-ancla-valores-act":
      return { buffer: await generateTarjetasDefusionValoresActDocx(institutionName), fileName: "Tarjetas_Defusion_Cognitiva_Valores_ACT_DECE_SADEX.docx" };
    case "tarjetas-dilemas-laberinto-decisiones":
      return { buffer: await generateDilemasLaberintoDecisionesDocx(institutionName), fileName: "Tarjetas_Dilemas_Laberinto_Decisiones_Embarazo_SADEX.docx" };
    case "ficha-quemado-ideas-mitos-enamoramiento":
      return { buffer: await generateFichaQuemadoIdeasMitosDocx(institutionName), fileName: "Ficha_Quemado_Ideas_Mitos_Enamoramiento_SADEX.docx" };
    case "bingo-sexualidad-responsable-iconos":
      return { buffer: await generateBingoSexualidadResponsableDocx(institutionName), fileName: "Cartones_Bingo_Sexualidad_Responsable_Iconos_SADEX.docx" };
    case "ficha-proyecto-vida-decision-responsable":
      return { buffer: await generateFichaProyectoVidaResponsableDocx(institutionName), fileName: "Ficha_Proyecto_Vida_Decision_Responsable_SADEX.docx" };
    case "tarjetas-desafio-mitos-sexualidad-masculina":
      return { buffer: await generateTarjetasDesafioMasculinidadesDocx(institutionName), fileName: "Tarjetas_Desafio_Sexualidad_Masculina_DeHombreAHombre_SADEX.docx" };
    case "pacto-personal-cuido-mi-cuerpo":
      return { buffer: await generatePactoPersonalCuidoCuerpoDocx(institutionName), fileName: "Pacto_Honor_Cuido_Mi_Cuerpo_Construyo_Suenos_SADEX.docx" };
    case "ficha-espejo-roto-apertura-tea":
      return { buffer: await generateFichaEspejoRotoTeaDocx(institutionName), fileName: "Ficha_Espejo_Roto_Sensibilizacion_TEA_Familias_SADEX.docx" };
    case "guia-origami-grulla-empatia":
      return { buffer: await generateGuiaOrigamiGrullaEmpatiaDocx(institutionName), fileName: "Guia_Ilustrada_Origami_Grulla_Empatia_TEA_SADEX.docx" };
    case "caritas-emociones-recortables-inicial":
      return { buffer: await generateCaritasEmocionesInicialDocx(institutionName), fileName: "Caritas_Emociones_Recortables_Educacion_Inicial_SADEX.docx" };
    case "ficha-guia-peluche-emoti":
      return { buffer: await generateFichaGuiaPelucheEmotiDocx(institutionName), fileName: "Guia_Metodologica_Rincon_Calma_Peluche_Emoti_SADEX.docx" };
    case "bitacora-explorador-marte-mindfulness":
      return { buffer: await generateBitacoraExploradorMarteDocx(institutionName), fileName: "Bitacora_Explorador_Marte_Mindfulness_Sensorial_SADEX.docx" };
    case "tarjetas-tecnicas-calma-elemental":
      return { buffer: await generateTarjetasCalmaElementalDocx(institutionName), fileName: "Tarjetas_Bolsillo_4Tecnicas_Calma_Elemental_SADEX.docx" };
    case "tarjetas-reencuadre-hechos-interpretaciones":
      return { buffer: await generateTarjetasReencuadreHechosDocx(institutionName), fileName: "Tarjetas_Reencuadre_Hechos_vs_Interpretaciones_SADEX.docx" };
    case "guia-observacion-mindfulness-adolescentes":
      return { buffer: await generateGuiaMindfulnessAdolescentesDocx(institutionName), fileName: "Guia_Mindfulness_Observacion_Consciente_Adolescentes_SADEX.docx" };
    case "mapa-corporal-somatizacion-bachillerato":
      return { buffer: await generateMapaCorporalBachilleratoDocx(institutionName), fileName: "Ficha_Recortable_Mapa_Corporal_Estres_Bachillerato_SADEX.docx" };
    case "carta-soltar-cargas-compromiso":
      return { buffer: await generateCartaSoltarCargasDocx(institutionName), fileName: "Carta_Autocuidado_Permiso_Soltar_Agobio_Bachillerato_SADEX.docx" };
    case "protocolo-bolsillo-crisis-durante-talleres":
      return { buffer: await generateProtocoloBolsilloCrisisDocx(institutionName), fileName: "Protocolo_Bolsillo_Accion_Crisis_Talleres_DECE_SADEX.docx" };
    case "tarjetas-honrar-vida-redes-cuidado":
      return { buffer: await generateTarjetasHonrarVidaDocx(institutionName), fileName: "Tarjetas_Honrar_Vida_Redes_Cuidado_Postvencion_SADEX.docx" };

        case "tablero-y-tarjetas-ruta-del-caso-0044a":
      return { buffer: await generateTableroRutaCaso0044aDocx(institutionName), fileName: "Juego_Mesa_La_Ruta_del_Caso_Acuerdo_0044A_SADEX.docx" };
    case "tarjetas-roles-y-semaforo-alerta-0044a":
      return { buffer: await generateTarjetasRolesSemaforoAlerta0044aDocx(institutionName), fileName: "Tarjetas_Roles_y_Semaforo_Alerta_Acuerdo_0044A_SADEX.docx" };
    case "tarjetas-casos-sociodrama-esquinas-0044a":
      return { buffer: await generateTarjetasCasosSociodramaEsquinas0044aDocx(institutionName), fileName: "Casos_Sociodrama_y_Guia_Esquinas_Acuerdo_0044A_SADEX.docx" };
    case "bingo-dece-semillas-certificados-0044a":
      return { buffer: await generateBingoDeceSemillasCertificados0044aDocx(institutionName), fileName: "Bingo_DECE_Semillas_Compromiso_Certificados_0044A_SADEX.docx" };
default:
      return null;
  }
}
