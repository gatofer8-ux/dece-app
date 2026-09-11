import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  detectEngineIntent,
  runAiContextEngine,
  type AiContextEngineInput,
} from "./aiContextEngine";
import * as aiModule from "./ai";

describe("AI_CONTEXT_ENGINE - Detección de Intenciones y Estrategias", () => {
  it("Escenario A: detecta generación contextual cuando el campo está vacío", () => {
    const result = detectEngineIntent(false, false);
    expect(result.strategy).toBe("generate");
    expect(result.intentLabel).toContain("CAMPO VACÍO");
    expect(result.constraints).toEqual([]);
  });

  it("Escenario B: detecta mejora y pulido de redacción cuando el campo tiene información", () => {
    const result = detectEngineIntent(true, false);
    expect(result.strategy).toBe("improve");
    expect(result.intentLabel).toContain("MEJORAR Y PULIR");
  });

  it("Escenario C: interpreta instrucciones específicas del usuario con prioridad", () => {
    // 1. Resumir / Sintetizar
    const resSummarize = detectEngineIntent(true, false, "Resume en dos párrafos concisos");
    expect(resSummarize.strategy).toBe("summarize");

    // 2. Ampliar / Desarrollar
    const resExpand = detectEngineIntent(true, false, "Amplía los compromisos formativos");
    expect(resExpand.strategy).toBe("expand");

    // 3. Corregir ortografía
    const resCorrect = detectEngineIntent(true, false, "Corrige la ortografía y puntuación únicamente");
    expect(resCorrect.strategy).toBe("correct");

    // 4. Profesionalizar / Lenguaje técnico
    const resTransform = detectEngineIntent(true, false, "Hazlo más técnico y con formato institucional");
    expect(resTransform.strategy).toBe("transform");
  });

  it("Detección de restricciones obligatorias (patrones negativos y límites)", () => {
    const res = detectEngineIntent(
      true,
      false,
      "Hazlo más formal, no incluyas diagnósticos clínicos y sin inventar hechos familiares"
    );
    expect(res.strategy).toBe("transform");
    expect(res.constraints).toContain("no incluyas diagnósticos clínicos");
    expect(res.constraints).toContain("sin inventar hechos familiares");
  });

  it("Modificación parcial cuando el usuario seleccionó un fragmento específico", () => {
    const res = detectEngineIntent(true, true, "Reformula esta frase");
    expect(res.strategy).toBe("partial_edit");
    expect(res.intentLabel).toContain("MODIFICACIÓN PARCIAL");
  });
});

describe("AI_CONTEXT_ENGINE - Ejecución Universal con Contexto y Validación", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("retorna error explicativo si la IA no está configurada", async () => {
    vi.spyOn(aiModule, "isAiConfigured").mockReturnValue(false);

    const input: AiContextEngineInput = {
      section: "Observaciones",
      currentContent: "",
    };

    const res = await runAiContextEngine(input);
    expect(res.error).toBeDefined();
    expect(res.error).toContain("no está configurada");
  });

  it("Escenario A: genera contenido a partir del contexto del caso en campo vacío", async () => {
    vi.spyOn(aiModule, "isAiConfigured").mockReturnValue(true);
    const mockGenerate = vi.spyOn(aiModule, "generateWithFallback").mockResolvedValue({
      text: "Se realizó el acompañamiento socioemocional conforme al protocolo institucional.",
    });

    const input: AiContextEngineInput = {
      documentType: "FICHA_DERIVACION",
      section: "Historia de la situación actual",
      currentContent: "",
      caseContext: "Estudiante de 10mo EGB con reporte de dificultades de adaptación escolar.",
    };

    const res = await runAiContextEngine(input);

    expect(res.strategy).toBe("generate");
    expect(res.error).toBeUndefined();
    expect(res.text).toBe("Se realizó el acompañamiento socioemocional conforme al protocolo institucional.");

    // Verificar que el prompt ensamblado contiene las directrices del Escenario A
    expect(mockGenerate).toHaveBeenCalled();
    const promptArg = mockGenerate.mock.calls[0][0].prompt;
    expect(promptArg).toContain("EL APARTADO ESTÁ VACÍO");
    expect(promptArg).toContain("Estudiante de 10mo EGB");
  });

  it("Escenario B: preserva hechos y mejora la redacción cuando hay información existente", async () => {
    vi.spyOn(aiModule, "isAiConfigured").mockReturnValue(true);
    const mockGenerate = vi.spyOn(aiModule, "generateWithFallback").mockResolvedValue({
      text: "Se mantuvo una entrevista formal con la representante legal para socializar el progreso socioemocional del estudiante.",
    });

    const input: AiContextEngineInput = {
      documentType: "BITACORA",
      section: "Descripción de la atención",
      currentContent: "hable con la mama sobre el alumno",
    };

    const res = await runAiContextEngine(input);

    expect(res.strategy).toBe("improve");
    expect(res.originalText).toBe("hable con la mama sobre el alumno");
    expect(res.text).toContain("Se mantuvo una entrevista formal");

    // Verificar directiva de no sobrescritura de hechos
    const promptArg = mockGenerate.mock.calls[0][0].prompt;
    expect(promptArg).toContain("EL APARTADO YA CONTIENE INFORMACIÓN (PRIORIDAD 2)");
    expect(promptArg).toContain("hable con la mama sobre el alumno");
    expect(promptArg).toContain("Preserva fielmente las ideas");
  });

  it("Escenario C: cumple instrucciones prioritarias y aplica restricciones", async () => {
    vi.spyOn(aiModule, "isAiConfigured").mockReturnValue(true);
    vi.spyOn(aiModule, "generateWithFallback").mockResolvedValue({
      text: "El estudiante presenta un trastorno depresivo grave según lo observado.",
    });

    const input: AiContextEngineInput = {
      section: "Diagnóstico situacional",
      currentContent: "El estudiante está desanimado",
      userInstruction: "Mejora el texto, sin diagnóstico clínico",
    };

    const res = await runAiContextEngine(input);

    // Debe detectar la restricción y reemplazar términos diagnósticos clínicos invasivos
    expect(res.extractedConstraints.some((c) => c.includes("sin diagnóstico"))).toBe(true);
    expect(res.text).not.toContain("trastorno depresivo");
    expect(res.text).toContain("situación socioemocional identificada");
    expect(res.warning).toBeDefined();
  });

  it("Modificación parcial: reemplaza únicamente el fragmento seleccionado", async () => {
    vi.spyOn(aiModule, "isAiConfigured").mockReturnValue(true);
    const mockGenerate = vi.spyOn(aiModule, "generateWithFallback").mockResolvedValue({
      text: "se establecieron acuerdos formativos de corresponsabilidad",
    });

    const fullText = "Durante la sesión, el alumno lloró y luego hicimos compromisos para mejorar.";
    const selectedPart = "hicimos compromisos para mejorar";

    const input: AiContextEngineInput = {
      section: "Acuerdos",
      currentContent: fullText,
      selectedText: selectedPart,
      userInstruction: "Haz más técnica esta frase",
    };

    const res = await runAiContextEngine(input);

    expect(res.strategy).toBe("partial_edit");
    expect(res.originalText).toBe(selectedPart);
    expect(res.text).toBe("se establecieron acuerdos formativos de corresponsabilidad");

    const promptArg = mockGenerate.mock.calls[0][0].prompt;
    expect(promptArg).toContain("MODIFICACIÓN DE FRAGMENTO SELECCIONADO");
    expect(promptArg).toContain(selectedPart);
  });

  it("Consistencia entre apartados: inyecta relatedSections en el prompt de la IA", async () => {
    vi.spyOn(aiModule, "isAiConfigured").mockReturnValue(true);
    const mockGenerate = vi.spyOn(aiModule, "generateWithFallback").mockResolvedValue({
      text: "Conclusiones coherentes con la observación áulica y la entrevista.",
    });

    const input: AiContextEngineInput = {
      section: "Conclusiones",
      currentContent: "",
      relatedSections: {
        "Motivo de consulta": "Dificultades en convivencia escolar",
        "Observaciones de aula": "Participación activa pero distracciones esporádicas",
      },
    };

    const res = await runAiContextEngine(input);

    expect(res.error).toBeUndefined();
    const promptArg = mockGenerate.mock.calls[0][0].prompt;
    expect(promptArg).toContain("GARANTIZAR COHERENCIA CRUZADA");
    expect(promptArg).toContain("Dificultades en convivencia escolar");
    expect(promptArg).toContain("Participación activa pero distracciones esporádicas");
  });
});
