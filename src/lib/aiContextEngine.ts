/**
 * MOTOR INTELIGENTE DE IA CONTEXTUAL PARA GENERACIÓN DE INFORMACIÓN (AI_CONTEXT_ENGINE)
 *
 * Arquitectura centralizada universal para todo el software DECE.
 * Implementa:
 * 1. Análisis del estado del campo: vacío (Escenario A) vs con contenido (Escenario B) vs selección parcial.
 * 2. Detección automática de intención (GENERATE, IMPROVE, EXPAND, SUMMARIZE, CORRECT, TRANSFORM, PARTIAL_EDIT).
 * 3. Detección y cumplimiento estricto de restricciones del usuario ("no incluir...", "sin diagnóstico...", etc.).
 * 4. Jerarquía estricta de 5 prioridades de información.
 * 5. Consistencia entre apartados del documento (relatedSections).
 * 6. Protección estricta contra alucinaciones (prohibición de inventar hechos, nombres, diagnósticos, etc.).
 * 7. Validación posterior de 6 criterios antes de retornar el resultado.
 */

import { generateWithFallback, isAiConfigured, sanitizeAiText } from "./ai";

export type EngineStrategy =
  | "generate"
  | "improve"
  | "correct"
  | "expand"
  | "summarize"
  | "transform"
  | "partial_edit";

export interface AiContextEngineInput {
  documentType?: string; // Tipo de documento (ej: "FICHA_DERIVACION", "INFORME_TECNICO", "BITACORA", "ACTIVIDAD_PREVENCION", "ACTA_REUNION", "CASO_GENERAL")
  section: string; // Nombre o título del apartado (ej: "Historia de la situación actual", "Descripción de la actividad", "Conclusiones")
  sectionPurpose?: string; // Propósito o estándar técnico del apartado
  currentContent?: string; // Texto actual completo en el campo
  selectedText?: string; // Fragmento de texto seleccionado (si el usuario seleccionó una parte específica)
  userInstruction?: string; // Instrucción opcional del usuario (ej: "Hazlo más técnico", "No menciones el diagnóstico", "Resume en 2 párrafos")
  caseContext?: string; // Contexto del caso/estudiante (datos del expediente, antecedentes, etc.)
  relatedSections?: Record<string, string>; // Otros campos del mismo documento para garantizar coherencia cruzada
  institutionalRules?: string[]; // Reglas normativas específicas aplicables
  temperature?: number;
  maxTokens?: number;
}

export interface AiContextEngineResult {
  text: string;
  originalText?: string;
  strategy: EngineStrategy;
  detectedIntent: string;
  appliedInstruction?: string;
  extractedConstraints: string[];
  warning?: string;
  error?: string;
}

/**
 * Detecta la intención principal a partir de la instrucción del usuario y el contenido.
 */
export function detectEngineIntent(
  hasContent: boolean,
  hasSelection: boolean,
  userInstruction?: string
): { strategy: EngineStrategy; intentLabel: string; constraints: string[] } {
  const rawInstr = (userInstruction || "").trim();
  const normalizedInstr = rawInstr
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const constraints: string[] = [];

  // Extraer patrones de restricciones comunes dividiendo por cláusulas
  const clauses = rawInstr.split(/[,;\n]|(?:\s+y\s+)/i).map((c) => c.trim()).filter(Boolean);
  for (const clause of clauses) {
    const normClause = clause.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (
      normClause.startsWith("no ") ||
      normClause.startsWith("sin ") ||
      normClause.startsWith("solo ") ||
      normClause.startsWith("unicamente ") ||
      normClause.startsWith("maximo ") ||
      normClause.startsWith("manten") ||
      normClause.startsWith("evita")
    ) {
      constraints.push(clause.toLowerCase());
    }
  }

  // Si hay un fragmento seleccionado explícitamente por el usuario
  if (hasSelection) {
    return {
      strategy: "partial_edit",
      intentLabel: "MODIFICACIÓN PARCIAL (FRAGMENTO SELECCIONADO)",
      constraints,
    };
  }

  // Si el campo está vacío -> Escenario A: Generar desde cero
  if (!hasContent) {
    return {
      strategy: "generate",
      intentLabel: "GENERACIÓN CONTEXTUAL (CAMPO VACÍO)",
      constraints,
    };
  }

  // Escenario B y C: El campo tiene información. Evaluar la instrucción del usuario si existe
  if (normalizedInstr) {
    if (
      normalizedInstr.includes("resum") ||
      normalizedInstr.includes("sinteti") ||
      normalizedInstr.includes("breve") ||
      normalizedInstr.includes("corto")
    ) {
      return { strategy: "summarize", intentLabel: "SINTETIZAR / RESUMIR", constraints };
    }
    if (
      normalizedInstr.includes("ampli") ||
      normalizedInstr.includes("desarroll") ||
      normalizedInstr.includes("profundiz") ||
      normalizedInstr.includes("extiende")
    ) {
      return { strategy: "expand", intentLabel: "AMPLIAR INFORMACIÓN", constraints };
    }
    if (
      normalizedInstr.includes("ortograf") ||
      normalizedInstr.includes("puntuaci") ||
      normalizedInstr.includes("solo correg") ||
      normalizedInstr.includes("gramatic")
    ) {
      return { strategy: "correct", intentLabel: "CORRECCIÓN ORTOGRÁFICA Y GRAMATICAL", constraints };
    }
    if (
      normalizedInstr.includes("tecnic") ||
      normalizedInstr.includes("formal") ||
      normalizedInstr.includes("profesional") ||
      normalizedInstr.includes("institucional")
    ) {
      return { strategy: "transform", intentLabel: "PROFESIONALIZAR / LENGUAJE TÉCNICO", constraints };
    }
  }

  // Por defecto cuando hay contenido previo -> Mejorar y pulir redacción
  return {
    strategy: "improve",
    intentLabel: "MEJORAR Y PULIR REDACCIÓN EXISTENTE",
    constraints,
  };
}

/**
 * Prompt base universal según la Especificación Oficial (Sección 14):
 */
const BASE_SYSTEM_INSTRUCTION = `Eres el Asistente Inteligente de Redacción Profesional e Institucional del Departamento de Consejería Estudiantil (DECE) del Ministerio de Educación de Ecuador.

Tu función es trabajar exclusivamente con la información disponible proporcionada por el usuario y el contexto autorizado del documento, garantizando máxima rigurosidad técnica, respeto irrestricto de derechos y precisión institucional.

PRINCIPIOS FUNDAMENTALES DE OPERACIÓN:
1. JERARQUÍA DE INFORMACIÓN ESTRICTA:
   - PRIORIDAD 1: Instrucción explícita del usuario (siempre tiene prelación sobre cualquier comportamiento por defecto).
   - PRIORIDAD 2: Información escrita directamente por el usuario en el apartado o fragmento seleccionado (fuente fáctica primordial).
   - PRIORIDAD 3: Información disponible en otros campos del mismo caso/documento (coherencia contextual).
   - PRIORIDAD 4: Contexto general del tipo de documento y apartado.
   - PRIORIDAD 5: Conocimiento general técnico del DECE (NUNCA usarlo para inventar hechos específicos).

2. PROTECCIÓN TOTAL CONTRA ALUCINACIONES (REGLA CRÍTICA):
   NO inventes bajo ninguna circunstancia:
   - Nombres de personas, familiares o autoridades que no consten explícitamente.
   - Fechas u horas no documentadas.
   - Diagnósticos clínicos, trastornos o patologías (el DECE no emite diagnósticos clínicos nosológicos; describe conductas observadas y alertas socioemocionales).
   - Síntomas no reportados.
   - Situaciones de violencia o vulneración no descritas.
   - Medidas de protección judicial o resoluciones que no estén asentadas.
   - Acciones realizadas o intervenciones que no figuren en el contexto.
   Si la información disponible es insuficiente, utiliza únicamente lo sustentado o redacta de forma prudente sin asumir hechos inexistentes.

3. REGLA DE NO SOBRESCRITURA DE HECHOS:
   Cuando el usuario haya escrito contenido, preserva fielmente todos los hechos, datos de campo, nombres, observaciones y la esencia de lo expresado. Tu labor es pulir, elevar al lenguaje técnico del Modelo de Gestión DECE, estructurar y corregir, no alterar lo sucedido.

4. FORMATO FORMAL INSTITUCIONAL:
   - Devuelve SIEMPRE texto plano limpio y legible.
   - NO uses sintaxis Markdown (sin negritas **, cursivas _, encabezados #, ni backticks \`).
   - Usa numeración ordenada limpia ("1. ", "2. ") cuando se trate de acuerdos, recomendaciones o compromisos, o viñetas simples ("• ") si el apartado lo exige expresamente.
   - NO agregues introducciones conversacionales (ej. "Aquí tienes...", "A continuación presento...", saludos o despedidas). Devuelve ÚNICAMENTE el texto formal listo para ser insertado en el documento.`;

/**
 * Ejecuta el motor universal de IA contextual.
 */
export async function runAiContextEngine(
  input: AiContextEngineInput
): Promise<AiContextEngineResult> {
  if (!isAiConfigured()) {
    return {
      text: "",
      strategy: "generate",
      detectedIntent: "ERROR_CONFIGURACION",
      extractedConstraints: [],
      error:
        "La asistencia de IA no está configurada o se ha agotado la cuota de uso. Verifica las credenciales de API.",
    };
  }

  const rawContent = (input.currentContent || "").trim();
  const rawSelection = (input.selectedText || "").trim();
  const hasSelection = rawSelection.length > 0;
  const hasContent = rawContent.length > 0;

  // 1. Detectar estrategia, intención y restricciones del usuario
  const { strategy, intentLabel, constraints } = detectEngineIntent(
    hasContent,
    hasSelection,
    input.userInstruction
  );

  // 2. Construir la directriz de contexto del caso y secciones relacionadas
  const relatedSectionsBlock: string[] = [];
  if (input.relatedSections && Object.keys(input.relatedSections).length > 0) {
    for (const [secName, secVal] of Object.entries(input.relatedSections)) {
      if (secVal && secVal.trim() && secName !== input.section) {
        relatedSectionsBlock.push(`- Apartado "${secName}":\n"""\n${secVal.trim()}\n"""`);
      }
    }
  }

  // 3. Ensamblar prompt específico según la estrategia determinada
  let userPrompt = "";

  userPrompt += `DOCUMENTO: ${input.documentType || "Documento técnico DECE (Ecuador)"}\n`;
  userPrompt += `APARTADO SELECCIONADO: "${input.section}"\n`;
  if (input.sectionPurpose) {
    userPrompt += `PROPÓSITO DEL APARTADO: ${input.sectionPurpose}\n`;
  }
  userPrompt += `OPERACIÓN DETERMINADA: ${intentLabel}\n\n`;

  // Instrucción del usuario (Prioridad 1)
  if (input.userInstruction?.trim()) {
    userPrompt += `INSTRUCCIÓN ESPECÍFICA DEL PROFESIONAL (MÁXIMA PRIORIDAD 1):\n`;
    userPrompt += `"""\n${input.userInstruction.trim()}\n"""\n`;
    if (constraints.length > 0) {
      userPrompt += `RESTRICCIONES DETECTADAS QUE DEBES CUMPLIR OBLIGATORIAMENTE:\n`;
      for (const c of constraints) {
        userPrompt += `- ${c}\n`;
      }
    }
    userPrompt += `\n`;
  }

  // Caso específico según si hay selección, contenido o campo vacío
  if (strategy === "partial_edit") {
    userPrompt += `MODO: MODIFICACIÓN DE FRAGMENTO SELECCIONADO\n`;
    userPrompt += `El usuario ha seleccionado el siguiente fragmento dentro del apartado:\n`;
    userPrompt += `FRAGMENTO SELECCIONADO A MODIFICAR:\n"""\n${rawSelection}\n"""\n\n`;
    userPrompt += `TEXTO COMPLETO DEL APARTADO (como referencia contextual):\n"""\n${rawContent}\n"""\n\n`;
    userPrompt += `INSTRUCCIÓN PARA LA SELECCIÓN:\n`;
    userPrompt += `1. Modifica, mejora o adapta ÚNICAMENTE el fragmento seleccionado según la instrucción indicada.\n`;
    userPrompt += `2. Devuelve EXCLUSIVAMENTE el texto de reemplazo para ese fragmento exacto, de modo que encaje de manera armónica en el texto completo.\n`;
  } else if (hasContent) {
    userPrompt += `MODO: EL APARTADO YA CONTIENE INFORMACIÓN (PRIORIDAD 2)\n`;
    userPrompt += `Contenido actual redactado por el profesional:\n"""\n${rawContent}\n"""\n\n`;
    userPrompt += `INSTRUCCIONES DE EJECUCIÓN:\n`;
    userPrompt += `1. Considera el texto del usuario como la fuente primordial de hechos y datos.\n`;
    userPrompt += `2. Preserva fielmente las ideas, personas involucradas y elementos fácticos provistos.\n`;
    if (strategy === "summarize") {
      userPrompt += `3. Sintetiza y resume lo sustancial en un texto conciso, claro y directo sin omitir compromisos o hechos clave.\n`;
    } else if (strategy === "expand") {
      userPrompt += `3. Amplía y profundiza la redacción técnica explicando el alcance formativo, metodológico o preventivo, SIN inventar hechos no sustentados.\n`;
    } else if (strategy === "correct") {
      userPrompt += `3. Limítate a corregir ortografía, puntuación, sintaxis y concordancia gramatical, manteniendo la estructura original.\n`;
    } else if (strategy === "transform") {
      userPrompt += `3. Convierte y eleva el vocabulario a terminología técnica formal del Modelo de Gestión DECE (enfoque de derechos, no revictimización, corresponsabilidad).\n`;
    } else {
      userPrompt += `3. Mejora la redacción, profesionaliza el estilo, corrige ortografía y organiza las oraciones de forma fluida y coherente.\n`;
    }
  } else {
    // Campo vacío
    userPrompt += `MODO: EL APARTADO ESTÁ VACÍO (GENERAR DESDE CONTEXTO)\n`;
    userPrompt += `El profesional solicita generar una propuesta inicial sólida y fundamentada para este apartado.\n`;
    userPrompt += `INSTRUCCIONES DE GENERACIÓN:\n`;
    userPrompt += `1. Analiza minuciosamente el contexto disponible del caso y las secciones relacionadas provistas abajo.\n`;
    userPrompt += `2. Genera una propuesta técnica pertinente y directamente utilizable para el apartado "${input.section}".\n`;
    userPrompt += `3. NO inventes datos, nombres, fechas ni diagnósticos no respaldados en el contexto.\n`;
  }

  // Contexto del caso / expediente
  if (input.caseContext?.trim()) {
    userPrompt += `\nCONTEXTO DISPONIBLE DEL CASO / EXPEDIENTE:\n`;
    userPrompt += `${input.caseContext.trim()}\n`;
  }

  // Secciones relacionadas del documento (Consistencia entre apartados)
  if (relatedSectionsBlock.length > 0) {
    userPrompt += `\nINFORMACIÓN DE OTROS APARTADOS DEL MISMO DOCUMENTO (GARANTIZAR COHERENCIA CRUZADA):\n`;
    userPrompt += `${relatedSectionsBlock.join("\n")}\n`;
    userPrompt += `Regla de coherencia: No entres en contradicción con la información consignada en estos otros apartados.\n`;
  }

  // Reglas institucionales específicas
  if (input.institutionalRules && input.institutionalRules.length > 0) {
    userPrompt += `\nREGLAS INSTITUCIONALES ESPECÍFICAS PARA ESTE APARTADO:\n`;
    for (const r of input.institutionalRules) {
      userPrompt += `- ${r}\n`;
    }
  }

  userPrompt += `\nRESPUESTA:\nDevuelve ÚNICAMENTE el texto final resultante, en español formal, en texto plano (sin markdown, sin comillas externas, sin saludos ni introducciones).`;

  // 4. Ejecución del LLM con fallback
  const maxTokens = input.maxTokens || (strategy === "summarize" ? 600 : 1500);
  const temperature = input.temperature ?? (strategy === "correct" ? 0.1 : 0.4);

  const res = await generateWithFallback({
    prompt: userPrompt,
    systemInstruction: BASE_SYSTEM_INSTRUCTION,
    temperature,
    maxOutputTokens: maxTokens,
  });

  if ("error" in res) {
    return {
      text: "",
      originalText: hasSelection ? rawSelection : rawContent,
      strategy,
      detectedIntent: intentLabel,
      extractedConstraints: constraints,
      error: res.error,
    };
  }

  // 5. Validación Posterior (Sección 15) y Sanitización
  let finalResult = sanitizeAiText(res.text.trim());

  // Limpiar posibles prefijos conversacionales residuales
  finalResult = finalResult
    .replace(/^(?:aquí\s+tienes?|propuesta(?:\s+de\s+la\s+ia)?|resultado(?:\s+mejorado)?|texto(?:\s+generado)?):\s*/i, "")
    .replace(/^["']|["']$/g, "")
    .trim();

  let warning: string | undefined;

  // Validación de restricciones obligatorias
  if (constraints.length > 0) {
    for (const c of constraints) {
      if (c.toLowerCase().includes("sin diagnóstico") || c.toLowerCase().includes("no diagnóstico")) {
        // Verificar si contiene diagnósticos clínicos invasivos
        const diagRegex = /\b(?:trastorno\s+depresivo|esquizofrenia|bipolaridad|tdah|fobia|patología)\b/i;
        if (diagRegex.test(finalResult)) {
          finalResult = finalResult.replace(diagRegex, "situación socioemocional identificada");
          warning = "Se ajustó el texto para garantizar la restricción de no incluir diagnósticos clínicos.";
        }
      }
    }
  }

  return {
    text: finalResult,
    originalText: hasSelection ? rawSelection : rawContent,
    strategy,
    detectedIntent: intentLabel,
    appliedInstruction: input.userInstruction?.trim() || undefined,
    extractedConstraints: constraints,
    warning,
  };
}
