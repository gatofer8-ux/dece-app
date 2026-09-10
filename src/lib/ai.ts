import { GoogleGenAI } from "@google/genai";
import { pseudonymize } from "./aiPrivacy";
import { REPRESENTATIVE_AWARENESS_NOTE } from "./interviewDefaults";

// Asistente de redacción con IA para los documentos técnicos del DECE.
// Usa la API gratuita de Gemini (Google AI Studio) — a diferencia de la API
// de Anthropic, Gemini ofrece un nivel de uso sin costo (con límite de
// solicitudes por día) que no requiere tarjeta de crédito, pensado para el
// volumen normal de un departamento DECE.
//
// Variables de entorno:
//   GEMINI_API_KEY — clave gratuita de https://aistudio.google.com/apikey
//   GEMINI_MODEL (opcional) — modelo a intentar primero; por defecto se usa
//     una lista de modelos de respaldo (ver MODEL_FALLBACK_CHAIN) porque el
//     modelo más nuevo de Gemini suele devolver 503 "high demand" en sus
//     primeras semanas — probar el siguiente de la lista evita que el
//     asistente quede inutilizable solo por eso.
//
// IMPORTANTE: las claves de API nuevas (creadas después de cierta fecha) no
// pueden usar modelos de la generación 2.5 — Google devuelve 404 "no longer
// available to new users". Por eso la lista de respaldo solo incluye
// modelos de la generación 3.x.
//
// Si GEMINI_API_KEY no está configurada, draftText no falla: devuelve un
// error legible para mostrar en la interfaz, sin romper el resto del
// formulario donde se use.

const MODEL_FALLBACK_CHAIN = [
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.7-flash",
];

let currentKeyIndex = 0;

/**
 * Sanitiza la respuesta generada por la IA para garantizar texto plano formal institucional:
 * - Sin sintaxis Markdown (negritas **, cursivas _, encabezados #, backticks `, citas >).
 * - Normaliza viñetas con símbolos (•, -, *, +) a listas ordenadas limpias "1. ", "2. ".
 * - Colapsa saltos de línea excesivos (\n{3,} -> \n\n).
 * - Elimina espacios en blanco residuales al inicio y fin de cada línea y del documento.
 */
export function sanitizeAiText(raw: string | null | undefined): string {
  if (!raw) return "";
  let text = String(raw).replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // 1. Quitar bloques de código y backticks
  text = text.replace(/```[\s\S]*?```/g, (match) => {
    return match.replace(/^```[a-zA-Z0-9_-]*\n?/, "").replace(/\n?```$/, "");
  });
  text = text.replace(/`([^`\n]+)`/g, "$1");

  // 2. Quitar encabezados Markdown (#, ##, etc.) al inicio de línea
  text = text.replace(/^#{1,6}\s+/gm, "");

  // 3. Quitar negritas y cursivas Markdown
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");
  text = text.replace(/(^|[^\w*])\*([^*\n]+)\*([^\w*]|$)/g, "$1$2$3");
  text = text.replace(/(^|[^\w_])_([^_\n]+)_([^\w_]|$)/g, "$1$2$3");

  // 4. Quitar citas Markdown
  text = text.replace(/^>\s*/gm, "");

  // 5. Normalizar viñetas con símbolos a listas numeradas limpias
  const lines = text.split("\n");
  let listCounter = 1;

  const normalizedLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      listCounter = 1;
      return "";
    }

    // Viñeta con símbolo: •, *, -, +
    const bulletMatch = trimmed.match(/^([•\*\-\+])\s+(.*)$/);
    if (bulletMatch) {
      const content = bulletMatch[2];
      const res = `${listCounter}. ${content}`;
      listCounter++;
      return res;
    }

    // Número existente: 1., 1), 1 -
    const numMatch = trimmed.match(/^(\d+)[\.\)\-]\s*(.*)$/);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      listCounter = num + 1;
      return `${num}. ${numMatch[2]}`;
    }

    return line.trimEnd();
  });

  text = normalizedLines.join("\n");

  // 6. Colapsar 3 o más saltos de línea a máximo 2
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}

function getClient(): GoogleGenAI | null {
  const apiKeyString = process.env.GEMINI_API_KEY;
  if (!apiKeyString) {
    console.warn("[ai] GEMINI_API_KEY no configurada.");
    return null;
  }
  const keys = apiKeyString.split(",").map(k => k.trim()).filter(Boolean);
  if (keys.length === 0) return null;
  const apiKey = keys[currentKeyIndex % keys.length];
  currentKeyIndex++;
  const client = new GoogleGenAI({ apiKey });

  // Red de seguridad: antes de que CUALQUIER prompt salga hacia Google, se le
  // pasa un barrido genérico que elimina cédulas, RUC, teléfonos y correos que
  // se hayan colado en texto libre. La seudonimización de nombres se hace en
  // origen (buildCaseContext / aiPrivacy), esto es la última barrera.
  const realGenerate = client.models.generateContent.bind(client.models);
  client.models.generateContent = (async (params: any) => {
    if (typeof params?.contents === "string") {
      params = { ...params, contents: pseudonymize(params.contents) };
    }
    const res = await realGenerate(params);
    if (res && typeof res.text === "string") {
      const clean = sanitizeAiText(res.text);
      Object.defineProperty(res, "text", {
        value: clean,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
    return res;
  }) as typeof client.models.generateContent;

  return client;
}

export function isAiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export async function draftText(opts: {
  fieldLabel: string;
  context: string;
  currentText: string;
}): Promise<{ text: string } | { error: string }> {
  const ai = getClient();
  if (!ai) {
    return { error: "La ayuda de IA todavía no está configurada en este sistema." };
  }

    const isSocializationStrategies =
    opts.fieldLabel.toLowerCase().includes("estrategia") &&
    (opts.fieldLabel.toLowerCase().includes("socializ") || opts.fieldLabel.toLowerCase().includes("acompañamiento") || opts.fieldLabel.toLowerCase().includes("docente") || opts.fieldLabel.toLowerCase().includes("psicosocial") || opts.fieldLabel.toLowerCase().includes("socioemocional"));

  const socializationRule = isSocializationStrategies
    ? "\nREGLA OBLIGATORIA PARA ESTRATEGIAS EN ACTA DE SOCIALIZACIÓN (DIRIGIDAS AL PERSONAL DOCENTE):\n" +
      "Las estrategias DEBEN SER ESTRATEGIAS DE AULA dirigidas directa y prioritariamente al personal docente (profesores de asignatura y tutor/a).\n" +
      "Integra minuciosamente la información del caso (situación de vulnerabilidad, entrevistas, observaciones y dinámica escolar).\n" +
      "Debes estructurar entre 4 y 6 estrategias de aula numeradas (1., 2., 3., 4., 5.), con redacción formal y de aplicación inmediata en el aula, abarcando:\n" +
      "1. Pautas concretas de contención emocional en clase y clima empático de aula, evitando exponer, juzgar o señalar al estudiante ante sus pares.\n" +
      "2. Manejo de aula y mediación respetuosa en dinámicas grupales y actividades colaborativas.\n" +
      "3. Flexibilidad en tiempos de entrega de tareas, evaluaciones diferenciadas y refuerzo académico formativo.\n" +
      "4. Confidencialidad absoluta y principio de no revictimización respecto a su situación de vulnerabilidad.\n" +
      "5. Observación de señales de alerta anímicas o conductuales para reporte oportuno al DECE.\n" +
      "6. Comunicación asertiva, escucha activa y motivación que refuercen sus factores protectores y resiliencia.\n"
    : "";

  const isSocializationAgreements =
    opts.fieldLabel.toLowerCase().includes("acuerdo") &&
    (opts.fieldLabel.toLowerCase().includes("socializ") || opts.fieldLabel.toLowerCase().includes("vulnerabilidad"));

  const socializationAgreementsRule = isSocializationAgreements
    ? "\nREGLA OBLIGATORIA PARA ACUERDOS EN ACTA DE SOCIALIZACIÓN:\n" +
      "Debes proponer entre 3 y 6 acuerdos y compromisos concretos, verificables y articulados para garantizar los derechos y la permanencia del/la estudiante en situación de vulnerabilidad.\n" +
      "Toma en cuenta exhaustivamente la situación de vulnerabilidad descrita, las estrategias socioemocionales de aula y los antecedentes del caso.\n" +
      "Cada acuerdo DEBE estar redactado como un compromiso específico de los actores escolares y familiares, estructurado con la fórmula de compromiso formal:\n" +
      "1. 'El docente tutor se compromete a...'\n" +
      "2. 'Los docentes de las diferentes asignaturas se comprometen a...'\n" +
      "3. 'El Departamento de Consejería Estudiantil (DECE) se compromete a...'\n" +
      "4. 'El representante legal se compromete a...'\n" +
      "5. (Otros acuerdos formativos o pedagógicos específicos del caso).\n" +
      "Presenta la respuesta ÚNICAMENTE como una lista numerada (1., 2., 3., 4., etc.), con un acuerdo por línea, en texto plano.\n"
    : "";

  const isAccompanimentTechnical =
    opts.fieldLabel.toLowerCase().includes("informe técnico de acompañamiento") ||
    opts.fieldLabel.toLowerCase().includes("informe tecnico de acompañamiento") ||
    opts.fieldLabel.toLowerCase().includes("acciones inmediatas de acompañamiento") ||
    (opts.fieldLabel.toLowerCase().includes("acompañamiento") &&
      (opts.fieldLabel.toLowerCase().includes("víctimas de violencia") || opts.fieldLabel.toLowerCase().includes("victimas de violencia")));

  const isBimonthly =
    !isAccompanimentTechnical &&
    !isSocializationStrategies &&
    (opts.fieldLabel.toLowerCase().includes("bimensual") ||
      (opts.fieldLabel.toLowerCase().includes("acompañamiento") &&
        !opts.fieldLabel.toLowerCase().includes("técnico") &&
        !opts.fieldLabel.toLowerCase().includes("tecnico")));

  const accompanimentTechnicalRule = isAccompanimentTechnical
    ? "\nREGLAS OBLIGATORIAS PARA EL INFORME TÉCNICO DE ACOMPAÑAMIENTO:\n" +
      "1. IDENTIFICACIÓN Y NIVEL EDUCATIVO DEL ESTUDIANTE: Cuando redactes la situación familiar o el rendimiento académico, identifica al estudiante con su nombre completo y edad. Si pertenece a Bachillerato, DEBES indicar explícitamente que es estudiante de Bachillerato y señalar con exactitud su especialidad o figura profesional según el contexto (por ejemplo: 'estudiante de 3.° de Bachillerato Técnico en Informática', 'estudiante de 2.° de Bachillerato en Ciencias', o 'estudiante de Bachillerato General Unificado').\n" +
      "2. ACCIONES CON FECHAS OBLIGATORIAS: En el campo de 'Acciones de acompañamiento', presenta un resumen de las intervenciones del DECE donde DEBES INCLUIR OBLIGATORIAMENTE LAS FECHAS EXACTAS de cada acción (entrevistas, convocatorias, seguimientos, derivaciones) tal como constan en el historial del contexto (por ejemplo: 'El [Fecha] se realizó...', o formato viñeta '• [Fecha]: Acción...'). NUNCA omitas las fechas si están disponibles en el contexto.\n" +
      "3. PROHIBICIÓN ESTRICTA DE CONCLUSIONES INSTITUCIONALES: NO incluyas bajo ninguna circunstancia apartados, encabezados ni párrafos de 'Conclusiones del seguimiento institucional', 'Conclusiones institucionales', ni clasificaciones burocráticas de actores externos (fiscalía, juzgado, etc.). Redacta única y exclusivamente el contenido técnico correspondiente al campo solicitado, sin secciones adicionales de conclusiones.\n"
    : "";

  const isInterviewCommitment =
    opts.fieldLabel.toLowerCase().includes("compromiso") &&
    (opts.fieldLabel.toLowerCase().includes("entrevista") || opts.fieldLabel.toLowerCase().includes("asumidos"));

  const interviewCommitmentRule = isInterviewCommitment
    ? "\nREGLA OBLIGATORIA PARA COMPROMISOS EN ENTREVISTA SEMIESTRUCTURADA:\n" +
      "1. Enumera entre 2 y 4 compromisos formativos, claros, realistas y medibles para la madre, padre y/o representante legal, el DECE y el/la estudiante.\n" +
      "2. Al final de la redacción de los compromisos, anexa OBLIGATORIAMENTE la siguiente nota formal de toma de conocimiento y corresponsabilidad del representante:\n\n" +
      REPRESENTATIVE_AWARENESS_NOTE + "\n"
    : "";
  const bimonthlyRule = isBimonthly
    ? "\nREGLA OBLIGATORIA PARA INFORME BIMENSUAL (Violencia Sexual):\n" +
      "La redacción en el campo '¿Quiénes ejecutarán?' DEBE estar desglosada y estructurada obligatoriamente por ENTIDADES Y ACTORES pertinentes (entidades de protección, personal de salud, DECE, docente tutor, autoridades educativas, representante legal y estudiante):\n" +
      "• Para Acompañamiento legal:\n" +
      "  - Fiscalía\n" +
      "  - Junta Cantonal de Protección de Derechos (JCPDNA)\n" +
      "  - Junta Distrital de Resolución de Conflictos\n" +
      "• Para Acompañamiento psicológico a la víctima:\n" +
      "  - Centro de Salud / MSP (Personal de salud / Psicología Clínica o Viceministerio de la Mujer)\n" +
      "  - DECE (Acompañamiento socioemocional institucional)\n" +
      "  - Docente Tutor (Observación del estado anímico y desenvolvimiento en aula)\n" +
      "  - Representante Legal (Reporte del entorno y dinámica familiar)\n" +
      "  - Estudiante (Manifestación sobre su bienestar emocional)\n" +
      "• Para Apoyo psicológico a familiares:\n" +
      "  - Representante Legal / Familiares (Sesiones de contención o 'NO APLICA. Representante refiere que no asiste a terapia o no se cuenta con consentimiento informado')\n" +
      "• Para Apoyo psicológico a la comunidad educativa:\n" +
      "  - DECE (Atención psicosocial: talleres preventivos en el aula con temas como habilidades para la vida, prevención de violencia o consumo de sustancias)\n" +
      "• Para Acompañamiento médico (víctima o familiares):\n" +
      "  - Centro de Salud / MSP o 'NO APLICA. Representante refiere que no requiere acompañamiento médico especializado en el período'\n" +
      "• Para Acompañamiento pedagógico a la víctima:\n" +
      "  - DECE (Articulación con docente tutor, vicerrectorado, estudiante y representante; juntas de curso)\n" +
      "  - Docente Tutor / Docentes (Desempeño escolar, tareas, convivencia sin alertas de revictimización)\n" +
      "  - Vicerrectorado (Garantías institucionales de permanencia, sin reportes disciplinarios)\n" +
      "  - Juntas de Curso (Seguimiento favorable de calificaciones y aprobación)\n" +
      "  - DAI / UDAI (NO APLICA o adaptaciones pertinentes)\n" +
      "  - Representante Legal (Acompañamiento escolar en el hogar)\n" +
      "• Para Acciones preventivas con la comunidad educativa:\n" +
      "  - DECE (Campañas como 'Mi cuerpo se cuida y se respeta', convivencia armónica, prevención de acoso escolar)\n" +
      "Usa viñetas (•) con saltos de línea físicos para separar cada actor o entidad.\n"
    : "";

  const isReferralActions =
    opts.fieldLabel.toLowerCase().includes("acciones desarrolladas") &&
    (opts.fieldLabel.toLowerCase().includes("derivaci") ||
      opts.fieldLabel.toLowerCase().includes("psicosocial") ||
      opts.fieldLabel.toLowerCase().includes("ficha"));

  const referralActionsRule = isReferralActions
    ? "\nEXCEPCIÓN Y REGLA OBLIGATORIA PARA 'ACCIONES DESARROLLADAS' EN FICHA DE DERIVACIÓN:\n" +
      "1. Debes generar EXCLUSIVAMENTE una lista breve de entre 4 y 8 líneas.\n" +
      "2. Cada línea DEBE iniciar con un guion seguido de espacio: '- '\n" +
      "3. Cada línea debe tener un MÁXIMO de 8 a 10 palabras.\n" +
      "4. Emplea frases nominales breves y directas (ejemplos exactos del formato oficial: '- Diálogo con la madre de familia', '- Acta de consentimiento informado', '- Intervención con el estudiante', '- Agendamiento de cita', '- Diálogo con docente tutor', '- Coordinación interinstitucional').\n" +
      "5. NO redactes párrafos explicativos, ni introducciones, ni burocracia extensa. Devuelve ÚNICAMENTE la lista con guiones.\n"
    : "";

  const isCurrentSituationHistory =
    opts.fieldLabel.toLowerCase().includes("historia de la situación actual") ||
    opts.fieldLabel.toLowerCase().includes("situación actual en la ficha de derivación");

  const currentSituationRule = isCurrentSituationHistory
    ? "\nREGLA OBLIGATORIA PARA 'HISTORIA DE LA SITUACIÓN ACTUAL' EN FICHA DE DERIVACIÓN:\n" +
      "1. Redacta un resumen clínico y psicosocial conciso de EXACTAMENTE 4 a 6 oraciones continuas en un solo párrafo.\n" +
      "2. Redacción estrictamente factual, objetiva, profesional y en tercera persona ('El estudiante...', 'Se evidencia...', 'La representante refiere...').\n" +
      "3. Describe de forma sucinta el motivo de seguimiento, la conducta o sintomatología observada, la dinámica familiar y los factores identificados.\n" +
      "4. NO redactes párrafos excesivamente largos, NO uses listas numeradas ni viñetas, mantén una redacción compacta y clínica.\n" +
      "5. NO emitas juicios de valor ni diagnósticos clínicos nosológicos definitivos.\n"
    : "";

  const isReferralObservations =
    opts.fieldLabel.toLowerCase().includes("observaciones") &&
    (opts.fieldLabel.toLowerCase().includes("derivaci") ||
      opts.fieldLabel.toLowerCase().includes("ficha"));

  const referralObservationsRule = isReferralObservations
    ? "\nEXCEPCIÓN Y REGLA OBLIGATORIA PARA 'OBSERVACIONES' EN FICHA DE DERIVACIÓN:\n" +
      "1. Debes generar EXCLUSIVAMENTE una lista de 2 a 5 líneas con viñeta de punto '• ' al inicio de cada línea.\n" +
      "2. Redacta oraciones imperativas o directivas breves, formales y directas (ejemplos exactos del formato oficial: '• Brindar atención psicológica al adolescente.', '• Favor enviar certificado de asistencia.', '• Realizar seguimiento conjunto del caso.').\n" +
      "3. Si en el contexto del caso aparece información de una cita ('CITA_DETALLE' o N° de cita, fecha, hora), incluye al final una línea con la información de la cita: '• N° cita: ...; Fecha: ...; Hora: ...'.\n" +
      "4. NO agregues introducciones ni explicaciones. Devuelve ÚNICAMENTE las líneas con viñeta '• '.\n"
    : "";

  const isActionDescription =
    opts.fieldLabel.toLowerCase().includes("descripción") &&
    (opts.fieldLabel.toLowerCase().includes("atención psicosocial") ||
      opts.fieldLabel.toLowerCase().includes("bitácora") ||
      opts.fieldLabel.toLowerCase().includes("acción"));

  const actionDescriptionRule = isActionDescription
    ? "\nREGLA OBLIGATORIA PARA 'DESCRIPCIÓN DE LA ATENCIÓN PSICOSOCIAL' EN BITÁCORA:\n" +
      "1. Redacta ÚNICAMENTE una descripción breve, concisa y ejecutiva de 1 a 2 oraciones (máximo 20 a 35 palabras).\n" +
      "2. Debe sintetizar únicamente la modalidad y el propósito directo de la sesión (por ejemplo: 'Entrevista presencial con la representante legal para socializar el reporte de novedades áulicas y coordinar compromisos formativos.').\n" +
      "3. NO detalles aquí acuerdos extensos, análisis ni conclusiones; todo lo medular y los compromisos van en el campo de 'Observaciones / Acuerdos'.\n"
    : "";

  const isActionObservations =
    (opts.fieldLabel.toLowerCase().includes("observaciones") ||
      opts.fieldLabel.toLowerCase().includes("acuerdos")) &&
    (opts.fieldLabel.toLowerCase().includes("atención psicosocial") ||
      opts.fieldLabel.toLowerCase().includes("bitácora") ||
      opts.fieldLabel.toLowerCase().includes("acción en bitácora")) &&
    !opts.fieldLabel.toLowerCase().includes("derivaci");

  const actionObservationsRule = isActionObservations
    ? "\nREGLA OBLIGATORIA PARA 'OBSERVACIONES / ACUERDOS' DE LA ACCIÓN EN BITÁCORA:\n" +
      "1. Esta es la PARTE MEDULAR de la acción: contiene lo más destacable, el resumen de la intervención y los acuerdos/compromisos establecidos.\n" +
      "2. Estructura el contenido de forma clara y profesional:\n" +
      "   - Resumen y puntos más destacables tratados durante la sesión con el estudiante, representante o docentes.\n" +
      "   - Acuerdos y compromisos concretos asumidos por las partes para garantizar el bienestar y seguimiento escolar.\n" +
      "3. Extensión: 1 a 2 párrafos sólidos o lista numerada de acuerdos (entre 40 y 100 palabras).\n" +
      "4. Lenguaje técnico psicosocial DECE, empático, sin juicios de valor y con enfoque de corresponsabilidad.\n"
    : "";

  const prompt = `Eres un asistente que ayuda a un profesional del Departamento de Consejería Estudiantil (DECE) en Ecuador a redactar documentos técnicos oficiales de gestión de casos. Usa lenguaje profesional, claro, objetivo, respetuoso y con enfoque de derechos, sin emitir juicios de valor ni diagnósticos clínicos que no correspondan a un informe DECE.

REGLAS DE FORMATO Y ESTILO ESTRICTAS (OBLIGATORIAS):
1. Devuelve SIEMPRE texto plano limpio. NUNCA uses sintaxis Markdown (sin negritas **, sin cursivas _, sin títulos #, sin backticks \`).
2. NUNCA uses viñetas con símbolos (como •, *, -) EXCEPTO cuando se indique expresamente en las reglas específicas de abajo. Para listas generales, conclusiones o recomendaciones, usa numeración secuencial limpia: "1. ", "2. ", "3. ".
3. Cada punto de una lista debe ir en un renglón nuevo.
4. No dejes líneas en blanco al inicio ni al final del texto. Deja un máximo de una sola línea en blanco entre párrafos o secciones.
5. Si son conclusiones o recomendaciones, redacta al menos 4 puntos enumerados de forma independiente.

  ${socializationRule}
  ${socializationAgreementsRule}
  ${bimonthlyRule}
  ${accompanimentTechnicalRule}
  ${interviewCommitmentRule}
  ${referralActionsRule}
  ${currentSituationRule}
  ${referralObservationsRule}
  ${actionDescriptionRule}
  ${actionObservationsRule}
  Vas a redactar o mejorar el siguiente campo de un documento: "${opts.fieldLabel}".

Contexto del caso (datos ya registrados en el sistema; úsalos para dar coherencia, pero NO inventes datos, nombres, fechas ni hechos que no aparezcan aquí):
${opts.context.trim() || "(sin contexto adicional disponible)"}

${
  opts.currentText.trim()
    ? `Texto actual escrito por el profesional (mejóralo y amplíalo si hace falta, pero mantén su idea central e intención):\n${opts.currentText}`
    : "El campo está vacío — redacta un borrador inicial razonable basado únicamente en el contexto disponible."
}

Responde ÚNICAMENTE con el texto final del campo, en español, en texto plano sin markdown, sin encabezados, sin comillas, sin explicaciones adicionales ni notas fuera del texto del documento.`;

  const preferredModel = process.env.GEMINI_MODEL;
  const modelsToTry = preferredModel
    ? [preferredModel, ...MODEL_FALLBACK_CHAIN.filter((m) => m !== preferredModel)]
    : MODEL_FALLBACK_CHAIN;

  let lastError: any = null;
  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });
      let text = (response.text || "").trim();
      if (!text) {
        lastError = new Error("empty-response");
        continue;
      }
      if (isReferralActions) {
        text = text
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .map((l) => (l.startsWith("-") ? l : `- ${l.replace(/^(\d+[\.\)]|[•\*\+])\s*/, "")}`))
          .join("\n");
      }
      if (isReferralObservations) {
        text = text
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .map((l) => (l.startsWith("•") ? l : `• ${l.replace(/^(\d+[\.\)]|[\*\-\+])\s*/, "")}`))
          .join("\n");
      }
      if (isAccompanimentTechnical) {
        // Eliminar de raíz cualquier posible encabezado o sección residual de "Conclusiones del seguimiento institucional"
        text = text
          .replace(/(?:\r?\n)+(?:(?:\d+[\.\)]|[•\*\-#])\s*)?(?:conclusiones(?:\s+del)?\s+seguimiento\s+institucional|seguimiento\s+institucional)[\s\S]*$/i, "")
          .trim();
      }
      if (isInterviewCommitment) {
        if (!text.includes("NOTA DE CONOCIMIENTO Y CORRESPONSABILIDAD") && !text.includes("plena toma de conocimiento")) {
          text = `${text.trim()}\n\n${REPRESENTATIVE_AWARENESS_NOTE}`;
        }
      }
      return { text };
    } catch (err: any) {
      lastError = err;
      const message = String(err?.message || err || "");
      const status = err?.status || (message.match(/"code":\s*(\d+)/)?.[1] ? Number(message.match(/"code":\s*(\d+)/)?.[1]) : undefined);
      const overloaded = status === 503 || message.toUpperCase().includes("UNAVAILABLE") || message.toLowerCase().includes("high demand");
      const unavailableModel =
        status === 404 ||
        message.toUpperCase().includes("NOT_FOUND") ||
        message.toLowerCase().includes("no longer available");
      if (overloaded || unavailableModel || message.includes("429") || message.toLowerCase().includes("quota") || message.toLowerCase().includes("resource_exhausted")) {
        // Este modelo está saturado o ya no disponible para esta clave —
        // probar el siguiente de la lista en vez de fallar de una vez.
        console.warn(`[ai] Modelo ${model} no disponible (${status || "?"}), probando el siguiente...`);
        continue;
      }
      // Cualquier otro error (clave inválida, cuota agotada, etc.) no mejora
      // probando otro modelo — cortar aquí.
      break;
    }
  }

  console.error("[ai] Error al generar borrador (todos los modelos probados fallaron):", lastError);
  const message = String(lastError?.message || lastError || "");
  if (message.includes("429") || message.toLowerCase().includes("quota") || message.toLowerCase().includes("resource_exhausted")) {
    return { error: "Se alcanzó el límite de la clave de IA (posiblemente por minuto). Espera 1 minuto y vuelve a intentar. Si el error persiste, el límite diario se agotó." };
  }
  if (message.toUpperCase().includes("UNAVAILABLE") || message.toLowerCase().includes("high demand")) {
    return { error: "Los servidores de Gemini están saturados en este momento. Intenta de nuevo en unos minutos, o escribe el texto manualmente." };
  }
  return { error: "Ocurrió un error al conectar con el servicio de IA. Verifica que la clave esté bien configurada." };
}

/**
 * Genera un resumen ejecutivo cronológico y pedagógico de un expediente para autoridades o distrito.
 */
export async function generateCaseExecutiveSummary(opts: {
  caseCode: string;
  studentName: string;
  riskType: string;
  description: string;
  actions: string[];
}): Promise<{ summary: string } | { error: string }> {
  const context = `Caso: ${opts.caseCode}
Estudiante: ${opts.studentName}
Tipo de riesgo: ${opts.riskType}
Situación inicial relatada: ${opts.description}
Acciones registradas en bitácora:
${opts.actions.length > 0 ? opts.actions.join("\n") : "Sin acciones registradas aún."}`;

  const res = await draftText({
    fieldLabel: "Resumen Ejecutivo del Expediente para Autoridades",
    context,
    currentText: "",
  });

  if ("error" in res) return { error: res.error };
  return { summary: res.text };
}

/**
 * Sugiere objetivos y acciones de acompañamiento psicopedagógico según el tipo de riesgo MinEduc.
 */
export async function generateInterventionPlanSuggestions(opts: {
  riskType: string;
  studentGrade: string;
  description: string;
}): Promise<{ objective: string; actions: string } | { error: string }> {
  const context = `Tipo de riesgo: ${opts.riskType}
Curso/Nivel del estudiante: ${opts.studentGrade}
Situación detectada: ${opts.description}`;

  const resObj = await draftText({
    fieldLabel: "Objetivo General del Plan de Acompañamiento Socioemocional",
    context,
    currentText: "",
  });

  const resAct = await draftText({
    fieldLabel: "Acciones y Estrategias Concretas de Intervención (enfoque de derechos, no punitivo)",
    context,
    currentText: "",
  });

  if ("error" in resObj) return { error: resObj.error };
  if ("error" in resAct) return { error: resAct.error };

  return {
    objective: resObj.text,
    actions: resAct.text,
  };
}

/**
 * Genera borradores sugeridos para los 8 procesos de la matriz del Informe Bimensual (Violencia Sexual).
 */
export async function draftBimonthlyMatrixDraft(opts: {
  context: string;
}): Promise<{ suggestions: Record<string, string> } | { error: string }> {
  const ai = getClient();
  if (!ai) {
    return { error: "La ayuda de IA todavía no está configurada en este sistema." };
  }

  const prompt = `Eres un profesional especialista del Departamento de Consejería Estudiantil (DECE) del Ministerio de Educación de Ecuador (MINEDUC).
Estás redactando el "Informe Bimensual de Seguimiento al Plan de Acompañamiento Institucional" para un caso de violencia sexual.
Contexto del caso institucional:
${opts.context.trim() || "(sin contexto adicional disponible)"}

Debes redactar la descripción institucional y técnica para el campo '¿QUIÉNES EJECUTARÁN? (institución que brindará el servicio)' de cada uno de los 8 procesos estándar de la matriz bimensual.

REGLA OBLIGATORIA DE ESTRUCTURACIÓN POR ENTIDADES Y ACTORES:
La redacción de cada proceso DEBE estructurarse desglosando obligatoriamente por las ENTIDADES Y ACTORES pertinentes (entidades de protección, personal de salud, DECE, docentes tutores, autoridades educativas, representante legal y estudiante), siguiendo el modelo oficial:

- "proc-1" (Acompañamiento legal):
  Se brinda el acompañamiento y seguimiento continuo desde las siguientes instancias:
  • Fiscalía
  • Junta Cantonal de Protección de Derechos (JCPDNA)
  • Junta Distrital de Resolución de Conflictos

- "proc-2" (Acompañamiento psicológico a la o a las víctimas):
  Desglosar obligatoriamente por entidades y actores:
  • Centro de Salud / MSP (o Viceministerio de la Mujer / Personal de Psicología Clínica): Seguimiento de atención terapéutica externa, asistencia periódica y novedades clínicas.
  • DECE: Acompañamiento socioemocional, verificación de bienestar en el plantel y contención.
  • Docente Tutor: Reporte sobre estado anímico, tranquilidad y participación en clases.
  • Representante Legal: Reporte sobre la convivencia familiar y dinámica en el hogar.
  • Estudiante: Manifestación personal sobre su estado de ánimo y bienestar.

- "proc-3" (Apoyo psicológico a familiares de la o las víctimas):
  • Representante Legal / Familiares: Detalle del apoyo psicológico / contención, o indicar:
  NO APLICA
  Representante refiere que no asiste a terapia psicológica o no se cuenta con consentimiento informado.

- "proc-4" (Apoyo psicológico a la comunidad educativa):
  • DECE (Atención psicosocial):
  Talleres en aula (ej. Prevención de consumo de sustancias, educación integral en sexualidad, habilidades para la vida) o indicar si no hubo actividades exclusivas para el paralelo en el periodo.

- "proc-5" (Acompañamiento médico a la o a las víctimas):
  • Centro de Salud / MSP o indicar:
  NO APLICA
  La representante refiere que la estudiante no recibe acompañamiento médico.

- "proc-6" (Acompañamiento médico a familiares de la o las víctimas):
  NO APLICA
  Representante refiere que no recibe acompañamiento médico.

- "proc-7" (Acompañamiento pedagógico a la o a las víctimas):
  Desglosar obligatoriamente por los actores de la comunidad educativa:
  • DECE: Diálogo con estudiante, representante, docente tutor y vicerrector; asistencia a juntas de curso.
  • Docente Tutor / Docentes: Reporte de desempeño académico favorable, cumplimiento de tareas y sin novedades disciplinarias.
  • Vicerrectorado: Garantías de permanencia educativa sin reportes disciplinarios.
  • Juntas de Curso: Aprobación satisfactoria y desempeño favorable.
  • DAI / UDAI: NO APLICA (o adaptaciones pedagógicas si corresponde).
  • Representante Legal: Acompañamiento constante en el hogar.

- "proc-8" (Acciones preventivas a favor de la comunidad educativa):
  • DECE:
  - Prevención "Mi cuerpo se cuida y se respeta"
  - Prevención de violencia escolar (Acoso escolar - Bullying)
  - Prevención de consumo de alcohol y otras sustancias
  - Convivencia armónica y normas de conducta

REGLAS ESTRICTAS:
1. Lenguaje técnico, respetuoso, oficial, con enfoque de derechos y no revictimización.
2. Cada actor o entidad debe ir con viñeta (•) y salto de línea claro.
3. Responde ÚNICAMENTE con un objeto JSON sin formato markdown extra, con la siguiente estructura exacta:
{
  "proc-1": "texto...",
  "proc-2": "texto...",
  "proc-3": "texto...",
  "proc-4": "texto...",
  "proc-5": "texto...",
  "proc-6": "texto...",
  "proc-7": "texto...",
  "proc-8": "texto..."
}`;

  const preferredModel = process.env.GEMINI_MODEL;
  const modelsToTry = preferredModel
    ? [preferredModel, ...MODEL_FALLBACK_CHAIN.filter((m) => m !== preferredModel)]
    : MODEL_FALLBACK_CHAIN;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });
      const text = (response.text || "").trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return { suggestions: parsed };
      }
    } catch (err: any) {
      console.warn("[ai bimonthly matrix] Falló modelo " + model + ":", err?.message || err);
    }
  }

  return { error: "No se pudieron generar las sugerencias automáticas de la matriz bimensual." };
}

/**
 * Redacta y optimiza una fila técnica del Plan de Acción Anual DECE vinculando la actividad
 * al número real de estudiantes, suministros disponibles, profesionales del equipo y los
 * Estándares de Calidad DECE (MINEDUC).
 */
export async function draftActionPlanItem(opts: {
  dimension: string;
  component: string;
  action: string;
  expected_goal_standard: string;
  institutionName: string;
  studentsCount: number;
  availableResources: string;
  professionalsList: string[];
  currentActivities?: string;
  currentTargetPopulation?: string;
  currentSupplies?: string;
  currentExecutionTerm?: string;
  currentResponsible?: string;
}): Promise<{
  activities: string;
  target_population: string;
  execution_term: string;
  supplies_inputs: string;
  responsible: string;
  observations: string;
} | { error: string }> {
  const ai = getClient();
  if (!ai) {
    return { error: "La ayuda de IA todavía no está configurada en este sistema." };
  }

  const prompt = `Eres un especialista técnico del Departamento de Consejería Estudiantil (DECE) del Ministerio de Educación de Ecuador.
Tu tarea es redactar y estructurar con precisión técnica y total viabilidad operativa una fila del PLAN DE ACCIÓN ANUAL DECE (POA), asegurando cumplimiento estricto con los ESTÁNDARES DE CALIDAD DECE y adecuándolo fielmente a las condiciones y recursos reales de la institución.

REALIDAD INSTITUCIONAL:
- Institución Educativa: ${opts.institutionName || "UNIDAD EDUCATIVA"}
- Población estudiantil total: ${opts.studentsCount || 0} estudiantes
- Profesionales DECE disponibles: ${opts.professionalsList.length > 0 ? opts.professionalsList.join(", ") : "Equipo DECE institucional"}
- Suministros y recursos materiales disponibles: ${opts.availableResources?.trim() || "Papelería institucional, proyectores, formularios DECE, reactivos y matrices digitales"}

DATOS DE LA FILA A COMPLETAR:
- Dimensión: ${opts.dimension}
- Componente: ${opts.component}
- Acción: ${opts.action}
- Estándar de Calidad DECE: ${opts.expected_goal_standard || "Estándares de Calidad de la Gestión DECE"}
${opts.currentActivities ? `\nActividades previas registradas:\n${opts.currentActivities}` : ""}
${opts.currentTargetPopulation ? `\nPoblación objetivo previa:\n${opts.currentTargetPopulation}` : ""}

DIRECTRICES TÉCNICAS OBLIGATORIAS:
1. Actividades REALES, MEDIBLES y FACTIBLES: No propongas actividades imposibles de abarcar con la carga horaria del DECE. Para poblaciones grandes (${opts.studentsCount} estudiantes), especifica subniveles focalizados (ej. 10mo EGB, 3ro BGU, o talleres por paralelos) y metodologías grupales o en cascada con docentes tutores.
2. Población Objetivo cuantificada o claramente delimitada (ej. estudiantes por subnivel, docentes tutores, padres de familia, etc.).
3. Plazos de ejecución viables a lo largo de los trimestres del año lectivo (ej. "Primer Trimestre: Octubre - Noviembre", "Todo el año lectivo").
4. Insumos y suministros concretos (ej. registros de asistencia con firmas, matrices de observación, actas de compromiso, reactivos impresos, material educomunicacional).
5. Asignar responsables de entre la lista de profesionales proporcionada (${opts.professionalsList.join(", ") || "TODOS"}). Si es una labor compartida, puedes indicar "TODOS" o el profesional más idóneo según el rol.
6. En "observations", indicar la verificación y conformidad técnica con el cumplimiento del estándar (ej: "INFORME TÉCNICO DEL CUMPLIMIENTO AL ESTÁNDAR").

Responde ÚNICAMENTE con un objeto JSON válido (sin formato markdown adicional ni bloques envolventes de texto) con esta estructura exacta:
{
  "activities": "1. ...\\n2. ...",
  "target_population": "1. ...\\n2. ...",
  "execution_term": "1. ...\\n2. ...",
  "supplies_inputs": "1. ...\\n2. ...",
  "responsible": "Nombre del profesional o TODOS",
  "observations": "INFORME TÉCNICO DEL CUMPLIMIENTO AL ESTÁNDAR"
}`;

  const preferredModel = process.env.GEMINI_MODEL;
  const modelsToTry = preferredModel
    ? [preferredModel, ...MODEL_FALLBACK_CHAIN.filter((m) => m !== preferredModel)]
    : MODEL_FALLBACK_CHAIN;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });
      const text = (response.text || "").trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          activities: String(parsed.activities || ""),
          target_population: String(parsed.target_population || ""),
          execution_term: String(parsed.execution_term || ""),
          supplies_inputs: String(parsed.supplies_inputs || ""),
          responsible: String(parsed.responsible || ""),
          observations: String(parsed.observations || "INFORME TÉCNICO DEL CUMPLIMIENTO AL ESTÁNDAR"),
        };
      }
    } catch (err: any) {
      console.warn(`[ai action plan item] Falló modelo ${model}:`, err?.message || err);
    }
  }

  return { error: "No se pudo generar la propuesta de actividades para este estándar." };
}

/**
 * Genera el análisis de evaluación y ajustes globales del Plan de Acción DECE.
 */
export async function draftActionPlanGlobal(opts: {
  institutionName: string;
  schoolYear: string;
  studentsCount: number;
  availableResources: string;
  professionalsList: string[];
  coordinatorName: string;
}): Promise<{
  evaluation_notes: string;
} | { error: string }> {
  const ai = getClient();
  if (!ai) {
    return { error: "La ayuda de IA todavía no está configurada en este sistema." };
  }

  const prompt = `Eres la Coordinación del Departamento de Consejería Estudiantil (DECE) en Ecuador.
Debes redactar la sección técnica oficial de "EVALUACIÓN Y AJUSTES" del Plan de Acción Anual DECE para el año lectivo ${opts.schoolYear}.

DATOS INSTITUCIONALES:
- Institución: ${opts.institutionName}
- Estudiantes matriculados: ${opts.studentsCount}
- Equipo DECE: ${opts.professionalsList.join(", ") || "Equipo profesional DECE"}
- Coordinación: ${opts.coordinatorName}
- Recursos disponibles: ${opts.availableResources || "Recursos institucionales ordinarios"}

Estructura obligatoria según formato oficial MINEDUC:
• Resultados alcanzados en relación con los indicadores de evaluación de la planificación estratégica y estándares de calidad.
• Nudos críticos en relación con la gestión técnica u organizacional (ej. ratio estudiante-profesional, tiempos de atención, articulación interinstitucional).
• Recomendaciones y compromisos para el ajuste continuo en los tres trimestres escolares.

Responde únicamente con el texto formal técnico estructurado con viñetas claras y saltos de línea físicos.`;

  const preferredModel = process.env.GEMINI_MODEL;
  const modelsToTry = preferredModel
    ? [preferredModel, ...MODEL_FALLBACK_CHAIN.filter((m) => m !== preferredModel)]
    : MODEL_FALLBACK_CHAIN;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });
      const text = (response.text || "").trim();
      if (text) {
        return { evaluation_notes: text };
      }
    } catch (err: any) {
      console.warn(`[ai action plan global] Falló modelo ${model}:`, err?.message || err);
    }
  }

  return { error: "No se pudo generar la evaluación global del plan." };
}


/**
 * Respuesta del Asistente Virtual DECE para el canal de chat integrado.
 */
export async function generateChatAiResponse(opts: {
  userMessage: string;
}): Promise<string> {
  const ai = getClient();
  const systemInstruction = `Eres el "Asistente Virtual DECE", un especialista experto en el Modelo de Gestión de los Departamentos de Consejería Estudiantil (DECE) del Ministerio de Educación de Ecuador (MINEDUC).
Tu rol es orientar a psicólogos educativos, trabajadores sociales, docentes y directivos escolares sobre:
1. Protocolos de actuación frente a situaciones de violencia detectadas o cometidas en el sistema educativo.
2. Rutas y protocolos de intervención ante presuntos intentos autolíticos, ideación suicida, autolesiones y salud mental.
3. Rutas de derivación externa (Salud Pública MSP, Fiscalía General del Estado, JCPDNA Junta Cantonal de Protección de Derechos, DINAPEN).
4. Medidas de protección institucional y restitución de derechos.
5. Elaboración y redacción de informes técnicos situacionales, fichas de observación psicosocial y planes de acompañamiento.
6. Enfoques: de derechos, género, inclusión, bienestar y no revictimización.

Responde siempre en español, con tono empático, sumamente profesional, estructurado (con viñetas o pasos claros) y alineado a la normativa ecuatoriana (LOEI, Código de la Niñez y Adolescencia, Acuerdos Ministeriales).`;

  if (ai) {
    const primaryModel = process.env.GEMINI_MODEL || MODEL_FALLBACK_CHAIN[0];
    const modelsToTry = [primaryModel, ...MODEL_FALLBACK_CHAIN.filter((m) => m !== primaryModel)];

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: opts.userMessage,
          config: {
            systemInstruction,
            temperature: 0.6,
            maxOutputTokens: 8192,
          },
        });
        if (response.text) {
          return response.text.trim();
        }
      } catch (err: any) {
        console.warn(`[ai chat] Falló modelo ${model}:`, err?.message || err);
      }
    }
  }

  // Fallback estructurado si no hay API key configurada:
  const query = opts.userMessage.toLowerCase();
  if (query.includes("violencia") || query.includes("agres") || query.includes("abuso") || query.includes("acoso") || query.includes("golpe")) {
    return `ðŸ“Œ **Orientación Protocolar DECE — Detección de Hechos de Violencia:**

1. **Detección y Registro Inmediato**: Completar el *Reporte del Hecho de Violencia* (Anexo 1 MINEDUC) en las primeras 24 a 48 horas.
2. **Medidas de Protección Institucional**: Separar de inmediato a la presunta persona agresora del entorno de la víctima. Garantizar la confidencialidad y evitar revictimización.
3. **Derivación Legal y Externa**:
   - **Fiscalía / DINAPEN**: En casos de presunto delito de violencia sexual o física grave.
   - **Junta Cantonal de Protección de Derechos (JCPDNA)**: Para medidas administrativas de protección emergentes.
   - **Ministerio de Salud Pública (MSP)**: Para valoración médica y atención psicológica clínica especializada.
4. **Comunicación a Representantes**: Notificar a los padres o representantes legales de la víctima (salvo que sean los presuntos agresores).
5. **Plan de Acompañamiento**: Elaborar el Plan de Restitución de Derechos y dar seguimiento continuo en el sistema.`;
  }

  if (query.includes("suicid") || query.includes("autolit") || query.includes("autolesi") || query.includes("depre") || query.includes("cortes")) {
    return `ðŸš¨ **Protocolo de Actuación DECE — Riesgo Autolítico y Salud Mental:**

1. **Primeros Auxilios Psicológicos y Escucha Activa**:
   - Contener emocionalmente al/la estudiante en un ambiente privado y seguro.
   - No dejar solo/a al estudiante en ningún momento.
2. **Valoración y Ficha de Observación Psicosocial**:
   - Registrar la *Ficha de Observación Psicosocial* identificando factores de riesgo y factores protectores.
3. **Derivación Inmediata a Salud (MSP)**:
   - Coordinar con el centro de salud más cercano para atención prioritaria por Psicología Clínica o Psiquiatría.
4. **Convocatoria Urgente a Representantes Legales**:
   - Firmar acta de compromiso de seguimiento médico/psiquiátrico y acuerdos de cuidado en el hogar.
5. **Informe Técnico Situacional**:
   - Elaborar el *Informe Técnico Situacional* institucional para el expediente y conocimiento de la Autoridad.`;
  }

  if (query.includes("derivaci") || query.includes("extern") || query.includes("junta") || query.includes("fiscalia") || query.includes("msp")) {
    return `ðŸ”€ **Guía de Derivaciones del DECE:**

- **Ámbito Interno**:
  - Remisión a docentes tutores o autoridades para adaptaciones curriculares, cambios de jornada o seguimiento de aula.
- **Ámbito Externo (Red de Protección Integral)**:
  - **MSP (Salud Pública)**: Atención psicológica clínica, psiquiátrica, medicina general o neuropediatría.
  - **JCPDNA / Junta Cantonal**: Medidas de protección emergentes ante vulneración de derechos o negligencia familiar.
  - **Fiscalía / DINAPEN**: Delitos sexuales, violencia intrafamiliar grave o trata.
  - **UDAI**: Evaluación psicopedagógica para Necesidades Educativas Específicas (NEE).

*Recuerda generar la Ficha de Derivación Oficial con consentimiento informado firmado por el representante.*`;
  }

  return `Hola, soy tu **Asistente Virtual DECE**. Estoy aquí para orientarte en cualquier consulta sobre:

• 📋 **Protocolos Oficiales MINEDUC** (Violencia física, psicológica, sexual, consumo de sustancias, etc.)
• 🚨 **Manejo de Crisis y Riesgo Autolítico**
• 🔀 **Rutas de Derivación Externa** (JCPDNA, Fiscalía, MSP, DINAPEN, UDAI)
• 📄 **Redacción de Informes Técnicos Situacionales y Fichas Psicosociales**
• 🤝 **Planes de Acompañamiento y Restitución de Derechos**

¿En qué caso o procedimiento institucional te puedo apoyar hoy?`;
}

/**
 * Genera la redacción técnica contextual para una pregunta específica de la Ficha de Observación Oficial.
 */
export async function draftObservationComment(opts: {
  studentName: string;
  course: string;
  riskType: string;
  caseDescription: string;
  previousActionsSummary?: string;
  currentObservationContext?: string;
  answeredQuestionsSummary?: string;
  targetQuestion: string;
  targetQuestionGuidance?: string;
  userDraft?: string;
}): Promise<{ text: string } | { error: string }> {
  const ai = getClient();
  if (!ai) {
    return { error: "El servicio de Inteligencia Artificial no está configurado." };
  }

  const prompt = `Eres un/a profesional del Departamento de Consejería Estudiantil (DECE) del Ministerio de Educación de Ecuador.
Estás completando la "FICHA DE OBSERVACIÓN OFICIAL" de un/a estudiante atendido/a en la institución educativa.

DATOS DEL EXPEDIENTE INSTITUCIONAL:
- Estudiante: ${opts.studentName} (${opts.course})
- Motivo / Tipo de riesgo psicosocial: ${opts.riskType}
- Hechos conocidos / Narrativa del caso: ${opts.caseDescription || "Sin descripción previa"}
${opts.previousActionsSummary ? `- Acciones previas en el expediente: ${opts.previousActionsSummary}` : ""}

OBSERVACIÓN ACTUAL EN CURSO:
- Contexto / Espacio: ${opts.currentObservationContext || "Observación institucional"}
${opts.answeredQuestionsSummary ? `- Respuestas ya registradas en la ficha:\n${opts.answeredQuestionsSummary}` : ""}

PREGUNTA DE OBSERVACIÓN CONDUCTUAL A REDACTAR:
"${opts.targetQuestion}"
${opts.targetQuestionGuidance ? `(Pauta técnica orientativa: ${opts.targetQuestionGuidance})` : ""}
${opts.userDraft ? `(Borrador iniciado por el profesional: "${opts.userDraft}")` : ""}

DIRECTRICES TÉCNICAS DE REDACCIÓN DECE:
1. Redacta de 1 a 3 oraciones sumamente profesionales, empáticas, objetivas, técnicas y no revictimizantes ni estigmatizantes.
2. Articula de forma natural la conducta observada con el impacto emocional derivado de la situación reportada en el expediente y con los demás indicadores marcados en la ficha (ejemplo: "Durante el espacio de observación / entrevista, la estudiante presentó episodios de llanto contenido y visible afectación emocional al abordar la situación referida, evidenciando necesidad de pausas y contención...").
3. Mantén un tono formal de reporte de observación psicológica-socioeducativa ecuatoriana.
4. Responde ÚNICAMENTE con el texto final del comentario, sin saludos, sin explicaciones ni comillas envolventes.`;

  const preferredModel = process.env.GEMINI_MODEL;
  const modelsToTry = preferredModel
    ? [preferredModel, ...MODEL_FALLBACK_CHAIN.filter((m) => m !== preferredModel)]
    : MODEL_FALLBACK_CHAIN;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });
      const text = (response.text || "").trim();
      if (text) {
        return { text };
      }
    } catch (err: any) {
      console.warn(`[ai observation comment] Falló modelo ${model}:`, err?.message || err);
    }
  }

  return { error: "No se pudo generar la redacción de la observación." };
}

/**
 * Genera la síntesis técnica global de atención requerida y derivaciones para la Ficha de Observación Oficial.
 */
export async function draftObservationGlobalAnalysis(opts: {
  studentName: string;
  course: string;
  riskType: string;
  caseDescription: string;
  observationSummary: string;
}): Promise<{
  requires_dece: "SI" | "NO";
  requires_dece_detail: string;
  requires_other: "SI" | "NO";
  requires_other_detail: string;
  internal_referral_suggested: boolean;
  internal_departments: string[];
  internal_other: string;
  external_referral_suggested: boolean;
  external_departments: string[];
  external_other: string;
} | { error: string }> {
  const ai = getClient();
  if (!ai) {
    return { error: "El servicio de Inteligencia Artificial no está configurado." };
  }

  const prompt = `Eres la Coordinación del Departamento de Consejería Estudiantil (DECE) en Ecuador.
Debes realizar la síntesis técnica oficial de las secciones de ATENCIÓN REQUERIDA y DERIVACIONES de la Ficha de Observación.

DATOS DEL CASO:
- Estudiante: ${opts.studentName} (${opts.course})
- Tipo de riesgo: ${opts.riskType}
- Hechos del caso: ${opts.caseDescription || "Sin descripción"}

RESULTADOS DE LA OBSERVACIÓN CONDUCTUAL (17 preguntas y comentarios):
${opts.observationSummary}

Debes responder ÚNICAMENTE con un objeto JSON válido con esta estructura exacta:
{
  "requires_dece": "SI",
  "requires_dece_detail": "A partir de la entrevista/observación realizada y de los indicadores emocionales observados, se identifica la necesidad de brindar atención psicosocial desde el Departamento de Consejería Estudiantil, con el fin de proporcionar contención emocional, acompañamiento permanente y seguimiento del bienestar integral de la/el estudiante, garantizando el enfoque de protección y el interés superior de la niñez y adolescencia.",
  "requires_other": "NO",
  "requires_other_detail": "",
  "internal_referral_suggested": false,
  "internal_departments": [],
  "internal_other": "",
  "external_referral_suggested": true,
  "external_departments": ["psicologica"],
  "external_other": ""
}`;

  const preferredModel = process.env.GEMINI_MODEL;
  const modelsToTry = preferredModel
    ? [preferredModel, ...MODEL_FALLBACK_CHAIN.filter((m) => m !== preferredModel)]
    : MODEL_FALLBACK_CHAIN;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });
      const text = (response.text || "").trim();
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return {
          requires_dece: parsed.requires_dece === "NO" ? "NO" : "SI",
          requires_dece_detail: String(parsed.requires_dece_detail || ""),
          requires_other: parsed.requires_other === "SI" ? "SI" : "NO",
          requires_other_detail: String(parsed.requires_other_detail || ""),
          internal_referral_suggested: Boolean(parsed.internal_referral_suggested),
          internal_departments: Array.isArray(parsed.internal_departments) ? parsed.internal_departments : [],
          internal_other: String(parsed.internal_other || ""),
          external_referral_suggested: Boolean(parsed.external_referral_suggested),
          external_departments: Array.isArray(parsed.external_departments) ? parsed.external_departments : [],
          external_other: String(parsed.external_other || ""),
        };
      }
    } catch (err: any) {
      console.warn(`[ai observation global] Falló modelo ${model}:`, err?.message || err);
    }
  }

  return { error: "No se pudo generar el análisis de atención y derivaciones." };
}


import type { CorresponsibilityConflictType } from "./types";
import { CONFLICT_TYPES_CATALOG } from "./corresponsibilityCatalog";

/**
 * Redacta la Dificultad Detectada / Motivo del Acta de Corresponsabilidad
 */
export async function draftCorresponsibilityDifficulty(opts: {
  studentName: string;
  studentGrade: string;
  conflictType: CorresponsibilityConflictType;
  detectedNotes?: string;
  caseContext?: {
    code?: string;
    situationType?: string;
    background?: string;
    actionsSummary?: string;
  };
}): Promise<{ text?: string; error?: string }> {
  const ai = getClient();
  if (!ai) {
    const catalogInfo = CONFLICT_TYPES_CATALOG[opts.conflictType] || CONFLICT_TYPES_CATALOG.OTRO;
    return {
      text: opts.detectedNotes
        ? `Se evidencia en el/la estudiante ${opts.studentName}, que cursa el ${opts.studentGrade}, la siguiente situación relevante: ${opts.detectedNotes}. Se identifica la necesidad de articular compromisos formales con el representante legal.`
        : `En el marco del seguimiento integral al estudiante ${opts.studentName} (${opts.studentGrade}), se detecta una situación clasificada bajo ${catalogInfo.label}: ${catalogInfo.shortDescription}. Lo cual requiere intervención coordinada y compromisos formales.`,
    };
  }

  const catalogInfo = CONFLICT_TYPES_CATALOG[opts.conflictType] || CONFLICT_TYPES_CATALOG.OTRO;

  const prompt = `Actúa como un profesional senior del Departamento de Consejería Estudiantil (DECE) de Ecuador.
Tu tarea es redactar la sección "Dificultad detectada" de un Acta Oficial de Corresponsabilidad con los Representantes Legales.

DATOS DEL CASO:
- Estudiante: ${opts.studentName}
- Grado / Curso: ${opts.studentGrade}
- Categoría de Conflicto: ${catalogInfo.label} (${catalogInfo.shortDescription})
- Notas o hechos ingresados por el profesional: ${opts.detectedNotes || "No se ingresaron notas adicionales."}
${opts.caseContext?.situationType ? `- Tipo de situación en expediente: ${opts.caseContext.situationType}` : ""}
${opts.caseContext?.background ? `- Antecedentes del expediente: ${opts.caseContext.background.slice(0, 400)}` : ""}
${opts.caseContext?.actionsSummary ? `- Bitácora previa: ${opts.caseContext.actionsSummary.slice(0, 300)}` : ""}

CRITERIOS DE REDACCIÓN DECE:
1. Lenguaje formal, técnico, objetivo, desprovisto de juicios morales o sesgos personales.
2. Describir los hechos observados, las conductas o el riesgo psicosocial de forma clara, contextualizada y respetuosa del interés superior de la niñez y adolescencia.
3. Evitar revictimizar o inculpar sin pruebas; redactar con precisión técnica psicosocial y psicológica institucional.
4. Extensión: 1 a 2 párrafos sólidos (entre 60 y 150 palabras).

Devuelve ÚNICAMENTE el texto redactado, sin introducciones ni títulos markdown.`;

  const preferredModel = process.env.GEMINI_MODEL;
  const modelsToTry = preferredModel
    ? [preferredModel, ...MODEL_FALLBACK_CHAIN.filter((m) => m !== preferredModel)]
    : MODEL_FALLBACK_CHAIN;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });
      const text = (response.text || "").trim();
      if (text) return { text };
    } catch (err: any) {
      console.warn(`[ai corresponsibility difficulty] Falló modelo ${model}:`, err?.message || err);
    }
  }

  return { error: "No se pudo generar la redacción de la dificultad detectada." };
}

/**
 * Genera la fundamentación normativa legal estricta y adaptada al conflicto
 * Buscando rigurosamente en la LOEI, RGLOEI, CONNA, Constitución y Acuerdos Ministeriales MINEDUC
 */
export async function draftCorresponsibilityLegalFramework(opts: {
  conflictType: CorresponsibilityConflictType;
  difficultySummary: string;
  studentName?: string;
}): Promise<{ text?: string; error?: string }> {
  const ai = getClient();
  const catalogInfo = CONFLICT_TYPES_CATALOG[opts.conflictType] || CONFLICT_TYPES_CATALOG.OTRO;

  if (!ai) {
    return { text: catalogInfo.defaultLegalFramework };
  }

  const prompt = `Actúa como especialista legal y psicosocial del DECE y del Ministerio de Educación de Ecuador.
Tu tarea es redactar la sección de "Fundamentación Jurídica y Normativa Legal" de un Acta de Corresponsabilidad con Representantes Legales, asegurando que la normativa legal se ajuste ESTRICTAMENTE al conflicto detectado.

DATOS DEL CONFLICTO:
- Tipo de conflicto: ${catalogInfo.label}
- Detalle de la situación: ${opts.difficultySummary || catalogInfo.shortDescription}
- Estudiante: ${opts.studentName || "el/la estudiante"}

FUENTES NORMATIVAS OBLIGATORIAS (Debes citar con precisión los artículos correspondientes al caso):
1. LEY ORGÁNICA DE EDUCACIÓN INTERCULTURAL (LOEI):
   - Art. 13: Obligaciones de las madres, padres y/o representantes legales (citar específicamente los incisos pertinentes entre "a" y "k", ej. lit. a sobre garantizar asistencia, lit. b sobre apoyar el proceso educativo, lit. c sobre cultura de paz, lit. d sobre no discriminación, lit. e sobre tareas, lit. f sobre acudir a convocatorias y citas, lit. g sobre bienestar integral, lit. h sobre diálogo).
   - Art. 8: Derechos de las y los estudiantes.
   - Art. 132 y 134: Régimen disciplinario escolar y resolución de conflictos.
2. CÓDIGO DE LA NIÑEZ Y ADOLESCENCIA (CONNA):
   - Art. 11: Principio del Interés Superior del Niño.
   - Art. 27: Derecho a la salud y desarrollo integral.
   - Art. 29 y 39: Derechos y deberes de los progenitores con relación al derecho a la educación (numerales 1 al 8).
   - Art. 40 y 41: Deberes y responsabilidades compartidas de los progenitores.
   - Art. 50: Derecho a la integridad personal (física, psicológica y sexual).
   - Art. 78 y 79: Negligencia parental y medidas de protección.
3. CONSTITUCIÓN DE LA REPÚBLICA DEL ECUADOR (CRE):
   - Art. 35, 44, 45, 46: Protección prioritaria y garantía de derechos de niñas, niños y adolescentes.
   - Art. 69: Maternidad y paternidad responsables.
4. ACUERDOS MINISTERIALES Y PROTOCOLOS MINEDUC (Selecciona el pertinente al conflicto):
    - Si es convivencia/agresión: Acuerdo Ministerial MINEDUC-2023-00008-A (Resolución pacífica de conflictos) y Código de Convivencia Institucional.
    - Si es ausentismo: Protocolo de Prevención y Detección del Abandono Escolar.
    - Si es violencia: Protocolos de Actuación Frente a Situaciones de Violencia en el Sistema Educativo.
    - Si es consumo de sustancias: Protocolo Interinstitucional para el Abordaje del Uso y Consumo de Drogas.
    - Si es apoyo externo / derivación médica o psicológica: LOEI Art. 13 lit. f y g, CONNA Art. 27 y 39 num. 3.
    - Si es salud mental / riesgo autolesivo: Ley Orgánica de Salud Mental (Arts. 1, 6, 10, 16), Protocolos de Actuación Frente a Alertas de Suicidio y Autolesiones (MINEDUC), LOEI Art. 13 lit. f, g, h y CONNA Art. 27.
    - Si es vulnerabilidad médica: Constitución Art. 35 y 44 (atención prioritaria a enfermedades catastróficas y NNA), LOEI Art. 13 lit. g, h, RGLOEI (atención a estudiantes en reposo médico prolongado) y CONNA Art. 27.
    - Si son hurtos / apropiación indebida: LOEI Art. 13 lit. c, d, e, Art. 132 y 134, Acuerdo MINEDUC-2023-00008-A (prácticas restaurativas y reparación integral del perjuicio), CONNA Art. 39 num. 1 y 5, y Código de Convivencia Institucional.
    - Si es mal uso del uniforme escolar: LOEI Art. 13 lit. b, c, Art. 132 y 134, Acuerdo MINEDUC-2023-00008-A y Código de Convivencia Institucional (código de vestimenta e identidad institucional).
    - Si es mal uso de redes sociales (stickers, memes, videos o difamación): Constitución Art. 66 num. 18, 19, 20 (derecho al honor, buen nombre e imagen personal), LOEI Art. 13 lit. c, d, h, Art. 132 y 134, CONNA Art. 50 y 52 (prohibición de difusión indebida de contenidos lesivos), Acuerdo MINEDUC-2023-00008-A (convivencia digital y ciberacoso escolar), y COIP.
    - Si son dispositivos tecnológicos no autorizados: Acuerdos Ministeriales MINEDUC-2017-00072-A y MINEDUC-2023-00008-A (regulación del uso de celulares y dispositivos exclusivamente para fines pedagógicos guiados), LOEI Art. 13 lit. b, c, Art. 132 y 134, y Código de Convivencia Institucional.
    - Si son conductas inapropiadas dentro del aula: LOEI Art. 13 lit. c, d, e, Art. 132 y 134, Acuerdo MINEDUC-2023-00008-A (disciplina positiva y resolución constructiva de conflictos áulicos), CONNA Art. 39 num. 1 y 5, y Acuerdos de Aula.

FORMATO DE SALIDA:
Redacta un texto fluido y contundente, comenzando formalmente con:
"Se realiza la atención y valoración integral, llegando a los siguientes acuerdos y compromisos por el bienestar del/la estudiante, en consideración a lo que menciona..." y articulando de manera precisa los artículos exactos que fundamentan la exigibilidad de la corresponsabilidad parental para este conflicto específico.

Devuelve ÚNICAMENTE el texto de la fundamentación legal, sin preámbulos.`;

  const preferredModel = process.env.GEMINI_MODEL;
  const modelsToTry = preferredModel
    ? [preferredModel, ...MODEL_FALLBACK_CHAIN.filter((m) => m !== preferredModel)]
    : MODEL_FALLBACK_CHAIN;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });
      const text = (response.text || "").trim();
      if (text) return { text };
    } catch (err: any) {
      console.warn(`[ai corresponsibility legal] Falló modelo ${model}:`, err?.message || err);
    }
  }

  return { text: catalogInfo.defaultLegalFramework };
}

/**
 * Genera compromisos específicos, concretos y realistas para el representante y el DECE
 */
export async function draftCorresponsibilityCommitments(opts: {
  studentName: string;
  conflictType: CorresponsibilityConflictType;
  detectedDifficulty: string;
}): Promise<{
  representativeCommitments?: string;
  deceCommitments?: string;
  studentCommitments?: string;
  error?: string;
}> {
  const ai = getClient();
  const catalogInfo = CONFLICT_TYPES_CATALOG[opts.conflictType] || CONFLICT_TYPES_CATALOG.OTRO;

  if (!ai) {
    return {
      representativeCommitments: catalogInfo.defaultRepresentativeCommitments,
      deceCommitments: catalogInfo.defaultDeceCommitments,
      studentCommitments: "Cumplir responsablemente con mis deberes escolares y respetar las normas institucionales.",
    };
  }

  const prompt = `Actúa como especialista del DECE (Ministerio de Educación de Ecuador).
Tu tarea es generar acuerdos y compromisos claros, específicos, medibles y viables para un Acta Oficial de Corresponsabilidad.

DATOS:
- Estudiante: ${opts.studentName}
- Tipo de Conflicto: ${catalogInfo.label}
- Dificultad Detectada: ${opts.detectedDifficulty || catalogInfo.shortDescription}

INSTRUCCIONES:
1. Compromisos del Representante Legal (3 a 5 puntos numerados):
   - Deben ser compromisos prácticos y realizables en el hogar y en la institución (supervisión de horarios, revisión de tareas, acudir a citas, llevar a citas externas si aplica, comunicación permanente).
2. Compromisos del Profesional DECE e Institución (2 a 3 puntos numerados):
   - Seguimiento psicosocial periódico, coordinación con docentes, reporte de novedades.
3. Compromisos del Estudiante (1 a 2 puntos numerados):
   - Participación activa y respeto.

RESPONDE EXCLUSIVAMENTE EN FORMATO JSON VÁLIDO CON ESTA ESTRUCTURA EXACTA:
{
  "representativeCommitments": "1. ...\\n2. ...\\n3. ...",
  "deceCommitments": "1. ...\\n2. ...",
  "studentCommitments": "1. ..."
}`;

  const preferredModel = process.env.GEMINI_MODEL;
  const modelsToTry = preferredModel
    ? [preferredModel, ...MODEL_FALLBACK_CHAIN.filter((m) => m !== preferredModel)]
    : MODEL_FALLBACK_CHAIN;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });
      const text = (response.text || "").trim();
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return {
          representativeCommitments: String(parsed.representativeCommitments || catalogInfo.defaultRepresentativeCommitments),
          deceCommitments: String(parsed.deceCommitments || catalogInfo.defaultDeceCommitments),
          studentCommitments: String(parsed.studentCommitments || ""),
        };
      }
    } catch (err: any) {
      console.warn(`[ai corresponsibility commitments] Falló modelo ${model}:`, err?.message || err);
    }
  }

  return {
    representativeCommitments: catalogInfo.defaultRepresentativeCommitments,
    deceCommitments: catalogInfo.defaultDeceCommitments,
  };
}

/**
 * Genera el Asesoramiento y Recomendaciones socioeducativas (DUA, Convivencia, Coordinación, Protocolos)
 * para un caso de estudiante en el Informe Técnico de Juntas de Curso.
 */
export async function draftCourseBoardCaseRecommendations(opts: {
  studentName: string;
  course: string;
  problematic: string;
  actionsTaken: string;
  currentRecommendations?: {
    coordination?: string;
    academic?: string;
    climate?: string;
    protocols?: string;
  };
}): Promise<{
  coordination: string;
  academic: string;
  climate: string;
  protocols: string;
} | { error: string }> {
  const ai = getClient();
  if (!ai) {
    return { error: "El servicio de Inteligencia Artificial no está configurado." };
  }

  const prompt = `Eres un/a profesional del Departamento de Consejería Estudiantil (DECE) del Ministerio de Educación de Ecuador.
Estás elaborando la sección de "ASESORAMIENTO Y RECOMENDACIONES (A la Junta de Docentes de Grado o Curso)" para el estudiante:
- Estudiante: ${opts.studentName}
- Curso / Paralelo: ${opts.course}
- Problemática detectada: ${opts.problematic}
- Acciones ya realizadas por el DECE: ${opts.actionsTaken || "Acompañamiento institucional"}

Debes generar recomendaciones oficiales, viables, técnicas y con enfoque de derechos y Diseño Universal para el Aprendizaje (DUA), divididas en 4 dimensiones obligatorias:
1. "coordination" (Comunicación y Coordinación):
   - Coordinación constante entre docentes de área, docente tutor y DECE.
   - Manejo de confidencialidad estricta y prevención total de estigmatización o etiquetas.
2. "academic" (Académico / Ajustes Razonables - DUA):
   - Aplicación de ajustes razonables (DUA), flexibilización de cronogramas y entregas.
   - Evaluaciones diferenciadas o alternativas formativas, apoyo institucional focalizado.
3. "climate" (Clima Escolar / Convivencia):
   - Acompañamiento socioemocional, fomento de empatía y prevención de conductas discriminatorias o de rechazo entre pares.
4. "protocols" (Protección y Protocolos):
   - Notificación oportuna ante cambios conductuales, activación o seguimiento de protocolos MINEDUC si aplica.

REGLAS DE RESPUESTA:
- Cada recomendación debe tener de 1 a 3 viñetas claras (•) con saltos de línea físicos.
- Responde ÚNICAMENTE con un objeto JSON válido con la siguiente estructura exacta:
{
  "coordination": "• ...\\n• ...",
  "academic": "• ...\\n• ...",
  "climate": "• ...\\n• ...",
  "protocols": "• ..."
}`;

  const preferredModel = process.env.GEMINI_MODEL;
  const modelsToTry = preferredModel
    ? [preferredModel, ...MODEL_FALLBACK_CHAIN.filter((m) => m !== preferredModel)]
    : MODEL_FALLBACK_CHAIN;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });
      const text = (response.text || "").trim();
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return {
          coordination: String(parsed.coordination || ""),
          academic: String(parsed.academic || ""),
          climate: String(parsed.climate || ""),
          protocols: String(parsed.protocols || ""),
        };
      }
    } catch (err: any) {
      console.warn(`[ai junta case recs] Falló modelo ${model}:`, err?.message || err);
    }
  }

  return { error: "No se pudieron generar las recomendaciones por IA." };
}

/**
 * Genera y pule las Conclusiones y Recomendaciones de la Junta de Curso
 * conforme al Acuerdo MINEDUC-MINEDUC-2024-00066-A.
 */
export async function draftCourseBoardConclusions(opts: {
  course: string;
  parallel: string;
  trimesterLabel: string;
  casesSummary: string;
  generalActions?: string;
}): Promise<{
  conclusiones: string;
  recomendaciones: string;
} | { error: string }> {
  const ai = getClient();
  if (!ai) {
    return { error: "El servicio de Inteligencia Artificial no está configurado." };
  }

  const prompt = `Eres un profesional especialista del DECE (Ministerio de Educación de Ecuador).
Estás redactando las CONCLUSIONES y RECOMENDACIONES del "Informe Técnico de Juntas de Curso" para:
- Curso: ${opts.course} ${opts.parallel}
- Período: ${opts.trimesterLabel}
- Situaciones de atención y seguimiento psicosocial abordadas en el período:
${opts.casesSummary || "Se realizó acompañamiento y seguimiento psicosocial preventivo."}
- Acciones generales del DECE en el curso:
${opts.generalActions || "Activación de rutas y protocolos, articulación con equipo docente y tutor."}

NORMATIVA Y COMPETENCIAS DEL MODELO DE GESTIÓN DECE:
- En Ecuador el DECE NO atiende "casos especiales" ni realiza psicoterapia clínica ni diagnósticos médicos. Sus competencias son el acompañamiento psicosocial, restitución de derechos, ajustes razonables (DUA) y derivación. No uses nunca la expresión "casos especiales".
- ACUERDO Nro. MINEDUC-MINEDUC-2024-00066-A (Arts. 15 y 16: Junta de Docentes de Grado o Curso).
- Reglamento General a la LOEI.

DIRECTRICES:
1. Conclusiones (3 a 4 puntos con viñetas "- "):
   - Cumplimiento del acompañamiento y seguimiento psicosocial a estudiantes según las problemáticas o situaciones de vulnerabilidad detectadas.
   - Puesta en conocimiento formal de los miembros de la Junta de Curso respecto a los factores de riesgo detectados y medidas de protección aplicadas.
   - Balance del clima socioemocional y permanencia escolar.
2. Recomendaciones (4 a 5 puntos con viñetas "- "):
   - Remisión oportuna mediante fichas de notificación DECE con evidencias.
   - Comunicación continua y formal del Docente Tutor con los representantes legales (Art. LOEI).
   - Notificación prioritaria ante alertas de vulneración de derechos para activación de rutas y protocolos.
   - Agendamiento anticipado de entrevistas con familias.
   - Aplicación rigurosa de los ajustes razonables (DUA) acordados en la junta.

Responde ÚNICAMENTE con un objeto JSON válido:
{
  "conclusiones": "- ...\\n- ...\\n- ...",
  "recomendaciones": "- ...\\n- ...\\n- ...\\n- ..."
}`;

  const preferredModel = process.env.GEMINI_MODEL;
  const modelsToTry = preferredModel
    ? [preferredModel, ...MODEL_FALLBACK_CHAIN.filter((m) => m !== preferredModel)]
    : MODEL_FALLBACK_CHAIN;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });
      const text = (response.text || "").trim();
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return {
          conclusiones: String(parsed.conclusiones || ""),
          recomendaciones: String(parsed.recomendaciones || ""),
        };
      }
    } catch (err: any) {
      console.warn(`[ai junta conclusions] Falló modelo ${model}:`, err?.message || err);
    }
  }

  return { error: "No se pudieron generar las conclusiones y recomendaciones por IA." };
}



/**
 * Genera el Diagnóstico Situacional para el Informe de Fin de Gestión DECE.
 */
export async function draftAnnualSituationalDiagnosis(opts: {
  institutionName: string;
  schoolYearText: string;
  professionalsCount: number;
  reportType: string;
}): Promise<{ text: string } | { error: string }> {
  const ai = getClient();
  if (!ai) return { error: "La ayuda de IA todavía no está configurada." };

  const prompt = `Eres un asesor técnico experto en el Modelo de Gestión de los Departamentos de Consejería Estudiantil (DECE) del Ministerio de Educación del Ecuador (Acuerdo Nro. MINEDUC-MINEDUC-2023-00010-A y Reglamento LOEI).
Redacta el "Diagnóstico situacional de la institución educativa" para el Informe Anual de Fin de Gestión del DECE.

DATOS:
- Institución: ${opts.institutionName}
- Año Lectivo: ${opts.schoolYearText}
- Tipo de Informe: ${opts.reportType === "INDIVIDUAL" ? "Gestión Individual de Profesional DECE" : "Gestión Departamental Consolidada"}
- Número de profesionales DECE: ${opts.professionalsCount}

INSTRUCCIONES:
- Redacta de 2 a 3 párrafos técnicos, formales y claros.
- Describe la realidad socioeducativa, dinámicas familiares prevalentes, factores protectores y de riesgo en el entorno educativo.
- Enfatiza el rol preventivo, de acompañamiento psicosocial integral, articulación con docentes y restitución de derechos (sin usar jamás la expresión "casos especiales" ni terminología clínica).
- Redacta en tercera persona formal. Devuelve ÚNICAMENTE el texto redactado, sin encabezados ni markdown adicional.`;

  const preferredModel = process.env.GEMINI_MODEL;
  const modelsToTry = preferredModel
    ? [preferredModel, ...MODEL_FALLBACK_CHAIN.filter((m) => m !== preferredModel)]
    : MODEL_FALLBACK_CHAIN;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({ model, contents: prompt });
      const text = (response.text || "").trim();
      if (text) return { text };
    } catch (err: any) {
      console.warn(`[ai annual diag] Falló modelo ${model}:`, err?.message || err);
    }
  }

  return { error: "No se pudo generar el diagnóstico situacional con IA." };
}

/**
 * Analiza tendencias comparativas de casos entre dos años lectivos.
 */
export async function draftAnnualComparativeAnalysis(opts: {
  typologiesData: Array<{ typology: string; prev: number; curr: number }>;
}): Promise<Record<string, string> | { error: string }> {
  const ai = getClient();
  if (!ai) return { error: "La ayuda de IA no está configurada." };

  const listStr = opts.typologiesData
    .map((t) => `${t.typology}: Anterior=${t.prev}, Actual=${t.curr}`)
    .join("\n");

  const prompt = `Eres un analista experto del DECE en Ecuador (Acuerdo MINEDUC-MINEDUC-2023-00010-A).
Analiza los datos comparativos de casos de vulnerabilidad atendidos entre el año lectivo anterior y el actual.
Para cada tipología, redacta una breve explicación técnica (1 a 2 oraciones) de por qué aumentó, disminuyó o se mantuvo la cifra, destacando factores de detección oportuna, sensibilización, trabajo docente o prevención.

DATOS:
${listStr}

Responde ÚNICAMENTE con un JSON válido mapeando cada tipología exacta con su análisis:
{
  "Violencia psicológica": "...",
  "Violencia Física": "...",
  ...
}`;

  const preferredModel = process.env.GEMINI_MODEL;
  const modelsToTry = preferredModel
    ? [preferredModel, ...MODEL_FALLBACK_CHAIN.filter((m) => m !== preferredModel)]
    : MODEL_FALLBACK_CHAIN;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({ model, contents: prompt });
      const text = (response.text || "").trim();
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch (err: any) {
      console.warn(`[ai annual comp] Falló modelo ${model}:`, err?.message || err);
    }
  }

  return { error: "No se pudo generar el análisis comparativo con IA." };
}

/**
 * Genera Conclusiones en los 4 ejes y Recomendaciones Institucionales y Distritales.
 */
export async function draftAnnualConclusionsAndRecommendations(opts: {
  institutionName: string;
  schoolYearText: string;
  totalAttentions: number;
  totalCases: number;
  topTypologies: string;
  reportType: string;
}): Promise<
  | {
      conclusionsCounseling: string;
      conclusionsPrevention: string;
      conclusionsPsychosocial: string;
      conclusionsInclusion: string;
      recommendationsInstitutional: string;
      recommendationsDistrict: string;
    }
  | { error: string }
> {
  const ai = getClient();
  if (!ai) return { error: "La ayuda de IA todavía no está configurada." };

  const prompt = `Eres un consultor experto del Ministerio de Educación de Ecuador en el Modelo de Gestión DECE (Acuerdo Nro. MINEDUC-MINEDUC-2023-00010-A).
Redacta las CONCLUSIONES (desglosadas en los 4 ejes obligatorios) y RECOMENDACIONES (institucionales y distritales) para el Informe Anual de Fin de Gestión.

DATOS:
- Institución: ${opts.institutionName}
- Año Lectivo: ${opts.schoolYearText}
- Tipo de Informe: ${opts.reportType}
- Total de atenciones a la comunidad educativa: ${opts.totalAttentions}
- Total de casos de vulnerabilidad abordados: ${opts.totalCases}
- Principales tipologías: ${opts.topTypologies}

REGLAS OBLIGATORIAS:
1. En Ecuador el DECE NO atiende "casos especiales" ni realiza terapia clínica. Usa siempre "estudiantes en situación de vulnerabilidad o riesgo psicosocial", "acompañamiento psicosocial" y "ajustes razonables DUA".
2. Conclusiones en 4 ejes:
   - Eje de Consejería: Orientación, mediación, atención a familias y docentes.
   - Eje de Promoción y Prevención: Campañas de convivencia, factores protectores, habilidades para la vida.
   - Eje de Atención Psicosocial: Balance cuali-cuantitativo de los casos atendidos, activación de protocolos y derivaciones externas.
   - Eje de Inclusión Socioeducativa: Permanencia escolar, ajustes razonables y acompañamiento a estudiantes vulnerables.
3. Recomendaciones:
   - Mínimo 3 sugerencias a autoridades institucionales, equipo docente y administrativos.
   - Mínimo 3 sugerencias a las autoridades distritales.

Responde ÚNICAMENTE con un JSON válido:
{
  "conclusionsCounseling": "Eje de Consejería:\n- ...\n- ...",
  "conclusionsPrevention": "Eje de Promoción y Prevención:\n- ...\n- ...",
  "conclusionsPsychosocial": "Eje de Atención Psicosocial:\n- ...\n- ...",
  "conclusionsInclusion": "Eje de Inclusión Socioeducativa:\n- ...\n- ...",
  "recommendationsInstitutional": "1. ...\n2. ...\n3. ...",
  "recommendationsDistrict": "1. ...\n2. ...\n3. ..."
}`;

  const preferredModel = process.env.GEMINI_MODEL;
  const modelsToTry = preferredModel
    ? [preferredModel, ...MODEL_FALLBACK_CHAIN.filter((m) => m !== preferredModel)]
    : MODEL_FALLBACK_CHAIN;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({ model, contents: prompt });
      const text = (response.text || "").trim();
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return {
          conclusionsCounseling: String(parsed.conclusionsCounseling || ""),
          conclusionsPrevention: String(parsed.conclusionsPrevention || ""),
          conclusionsPsychosocial: String(parsed.conclusionsPsychosocial || ""),
          conclusionsInclusion: String(parsed.conclusionsInclusion || ""),
          recommendationsInstitutional: String(parsed.recommendationsInstitutional || ""),
          recommendationsDistrict: String(parsed.recommendationsDistrict || ""),
        };
      }
    } catch (err: any) {
      console.warn(`[ai annual conc] Falló modelo ${model}:`, err?.message || err);
    }
  }

  return { error: "No se pudieron generar las conclusiones y recomendaciones anuales con IA." };
}

/**
 * Sugiere logros alcanzados y nudos críticos para el informe anual.
 */
export async function draftAnnualAchievementsAndKnots(opts: {
  institutionName: string;
  schoolYearText: string;
  totalAttentions: number;
  totalCases: number;
}): Promise<{ achievements: string; criticalKnots: string } | { error: string }> {
  const ai = getClient();
  if (!ai) return { error: "La ayuda de IA no está configurada." };

  const prompt = `Eres especialista en el DECE de Ecuador.
Formula mínimo 3 "Logros alcanzados" y mínimo 3 "Nudos críticos" realistas para el Informe de Fin de Gestión de la institución ${opts.institutionName} (${opts.schoolYearText}), donde se realizaron ${opts.totalAttentions} atenciones y se abordaron ${opts.totalCases} casos.
Cumple estrictamente con el Modelo de Gestión DECE (no tratamiento clínico, sin "casos especiales").

Responde ÚNICAMENTE con un JSON:
{
  "achievements": "1. ...\n2. ...\n3. ...",
  "criticalKnots": "1. ...\n2. ...\n3. ..."
}`;

  const preferredModel = process.env.GEMINI_MODEL;
  const modelsToTry = preferredModel
    ? [preferredModel, ...MODEL_FALLBACK_CHAIN.filter((m) => m !== preferredModel)]
    : MODEL_FALLBACK_CHAIN;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({ model, contents: prompt });
      const text = (response.text || "").trim();
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return {
          achievements: String(parsed.achievements || ""),
          criticalKnots: String(parsed.criticalKnots || ""),
        };
      }
    } catch (err: any) {
      console.warn(`[ai annual knots] Falló modelo ${model}:`, err?.message || err);
    }
  }

  return { error: "No se pudieron generar los logros y nudos críticos con IA." };
}
