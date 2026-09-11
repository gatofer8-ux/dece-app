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
// DESPACHADOR CENTRAL DE MATERIALES
// -------------------------------------------------------------
export async function generateWorkshopMaterialDocx(
  workshopId: string,
  materialId: string,
  institutionName?: string
): Promise<{ buffer: Buffer; fileName: string } | null> {
  switch (materialId) {
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
    default:
      return null;
  }
}
