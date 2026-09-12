import { describe, it, expect } from "vitest";
import {
  STRATEGIC_BIANUAL_AXES,
  DEFAULT_GENERAL_OBJECTIVE,
  DEFAULT_SPECIFIC_OBJECTIVES,
  DEFAULT_BIANUAL_AXIS_ITEMS,
  getDefaultBianualAxisItems,
  parseBianualAxisItems,
  parseBianualSpecificObjectives,
  parseBianualAnalysts,
  parseBianualSignatories,
  calculateBianualPlanStats,
  detectPreventionThemes,
  buildPeriodText,
  buildBianualContextForActionPlan,
  getPreventionSeedRowForTheme,
  PREVENTION_THEME_SEED_ITEM_IDS,
  YEAR_1_TOKEN,
  YEAR_2_TOKEN,
} from "./strategicPlanBianual";
import { PREVENTION_AXIS_THEMES, DECE_QUALITY_STANDARDS } from "./actionPlan";

describe("Plantilla del Plan Estratégico Bianual", () => {
  it("define los 4 ejes de acción oficiales del DECE", () => {
    expect(STRATEGIC_BIANUAL_AXES).toHaveLength(4);
    expect(STRATEGIC_BIANUAL_AXES).toContain("EJE DE ACCIÓN: CONSEJERÍA");
    expect(STRATEGIC_BIANUAL_AXES).toContain("EJE DE ACCIÓN: PROMOCIÓN Y PREVENCIÓN");
    expect(STRATEGIC_BIANUAL_AXES).toContain("EJE DE ACCIÓN: INCLUSIÓN SOCIOEDUCATIVA");
    // Cuarto eje añadido para coincidir con los componentes del POA anual.
    expect(STRATEGIC_BIANUAL_AXES).toContain("EJE DE ACCIÓN: ATENCIÓN PSICOSOCIAL");
  });

  it("la matriz semilla cubre los 4 ejes con al menos una meta cada uno", () => {
    const axes = new Set(DEFAULT_BIANUAL_AXIS_ITEMS.map((i) => i.axis));
    for (const axis of STRATEGIC_BIANUAL_AXES) {
      expect(axes.has(axis)).toBe(true);
    }
    for (const axis of STRATEGIC_BIANUAL_AXES) {
      const count = DEFAULT_BIANUAL_AXIS_ITEMS.filter((i) => i.axis === axis).length;
      expect(count).toBeGreaterThan(0);
    }
  });

  it("cada fila semilla tiene meta, acciones, responsables, indicador y plazos", () => {
    for (const item of DEFAULT_BIANUAL_AXIS_ITEMS) {
      expect(item.id.trim()).not.toBe("");
      expect(item.goal.trim()).not.toBe("");
      expect(item.actions.trim()).not.toBe("");
      expect(item.responsible.trim()).not.toBe("");
      expect(item.evaluation_indicator.trim()).not.toBe("");
      expect(item.execution_term.trim()).not.toBe("");
    }
  });

  it("cubre las 8 temáticas del eje de prevención del Acuerdo 044-A sin saltar ninguna", () => {
    const stats = calculateBianualPlanStats(DEFAULT_BIANUAL_AXIS_ITEMS);
    expect(stats.preventionThemesTotal).toBe(PREVENTION_AXIS_THEMES.length);
    expect(PREVENTION_AXIS_THEMES).toHaveLength(8);
    expect(stats.preventionThemesCovered).toBe(PREVENTION_AXIS_THEMES.length);

    const missing = PREVENTION_AXIS_THEMES.filter(
      (t) => !stats.coveredThemeCodes.includes(t.code)
    );
    expect(missing.map((m) => m.code)).toEqual([]);
  });

  it("cita códigos reales de los Estándares de Calidad DECE en los indicadores", () => {
    const allIndicators = DEFAULT_BIANUAL_AXIS_ITEMS.map((i) => i.evaluation_indicator).join(" ");
    const citedCodes = DECE_QUALITY_STANDARDS.filter((s) => allIndicators.includes(s.code));
    // Los indicadores deben anexarse a varios estándares del catálogo oficial.
    expect(citedCodes.length).toBeGreaterThanOrEqual(5);
  });

  it("el objetivo general y los específicos oficiales están definidos", () => {
    expect(DEFAULT_GENERAL_OBJECTIVE).toContain("promoción de derechos");
    expect(DEFAULT_GENERAL_OBJECTIVE).toContain("proyectos de vida");
    expect(DEFAULT_SPECIFIC_OBJECTIVES.length).toBeGreaterThanOrEqual(4);
    for (const o of DEFAULT_SPECIFIC_OBJECTIVES) {
      expect(o.trim()).not.toBe("");
    }
  });
});

describe("getDefaultBianualAxisItems", () => {
  it("reemplaza los marcadores de año por el periodo bianual real", () => {
    const items = getDefaultBianualAxisItems(2026, 2028);
    const allText = items.map((i) => i.execution_term + " " + i.goal).join(" ");
    expect(allText).not.toContain(YEAR_1_TOKEN);
    expect(allText).not.toContain(YEAR_2_TOKEN);
    expect(allText).toContain("2026");
    expect(allText).toContain("2028");
  });

  it("genera identificadores únicos por fila", () => {
    const items = getDefaultBianualAxisItems(2026, 2028);
    const ids = new Set(items.map((i) => i.id));
    expect(ids.size).toBe(items.length);
  });

  it("conserva el mismo número de filas y ejes que la plantilla", () => {
    const items = getDefaultBianualAxisItems(2026, 2028);
    expect(items).toHaveLength(DEFAULT_BIANUAL_AXIS_ITEMS.length);
    expect(new Set(items.map((i) => i.axis)).size).toBe(
      new Set(DEFAULT_BIANUAL_AXIS_ITEMS.map((i) => i.axis)).size
    );
  });
});

describe("helpers de parseo", () => {
  it("parseBianualAxisItems acepta JSON, arreglos y valores inválidos", () => {
    const items = [{ id: "a", axis: "X", goal: "g", actions: "", responsible: "", evaluation_indicator: "", execution_term: "" }];
    expect(parseBianualAxisItems(JSON.stringify(items))).toEqual(items);
    expect(parseBianualAxisItems(items)).toEqual(items);
    expect(parseBianualAxisItems(null)).toEqual([]);
    expect(parseBianualAxisItems("")).toEqual([]);
    expect(parseBianualAxisItems("{no es json")).toEqual([]);
    expect(parseBianualAxisItems('{"a":1}')).toEqual([]);
  });

  it("parseBianualSpecificObjectives lee JSON y también texto con saltos de línea", () => {
    expect(parseBianualSpecificObjectives('["uno","dos"]')).toEqual(["uno", "dos"]);
    expect(parseBianualSpecificObjectives(["uno"])).toEqual(["uno"]);
    expect(parseBianualSpecificObjectives(null)).toEqual([]);
    // Retrocompatibilidad: objetivos guardados como texto numerado.
    expect(parseBianualSpecificObjectives("1. uno\n2. dos")).toEqual(["uno", "dos"]);
  });

  it("parseBianualAnalysts y parseBianualSignatories toleran datos corruptos", () => {
    expect(parseBianualAnalysts('[{"name":"A","role":"R"}]')).toEqual([
      { name: "A", role: "R" },
    ]);
    expect(parseBianualAnalysts("corrupto")).toEqual([]);
    expect(parseBianualSignatories('[{"name":"A","role":"R","date":"2026-01-01"}]')).toEqual([
      { name: "A", role: "R", date: "2026-01-01" },
    ]);
    expect(parseBianualSignatories("corrupto")).toEqual([]);
  });

  it("buildPeriodText arma el texto del periodo bianual", () => {
    expect(buildPeriodText(2026, 2028)).toBe("2026-2028");
    expect(buildPeriodText(" 2023 ", " 2025 ")).toBe("2023-2025");
  });
});

describe("detectPreventionThemes", () => {
  it("reconoce la temática por palabras clave", () => {
    const drogas = detectPreventionThemes("Talleres de prevención del consumo de alcohol y tabaco");
    expect(drogas.map((t) => t.code)).toContain("DROGAS");

    const acoso = detectPreventionThemes("Prevención del bullying y ciberacoso en redes sociales");
    expect(acoso.map((t) => t.code)).toContain("ACOSO_CIBERACOSO");

    const salud = detectPreventionThemes("Promoción de la salud mental y prevención del suicidio");
    expect(salud.map((t) => t.code)).toContain("SUICIDIO_SALUD_MENTAL");
  });

  it("devuelve vacío cuando no hay texto", () => {
    expect(detectPreventionThemes("")).toEqual([]);
    expect(detectPreventionThemes(null, undefined)).toEqual([]);
    expect(detectPreventionThemes("   ")).toEqual([]);
  });
});

describe("getPreventionSeedRowForTheme", () => {
  it("devuelve una fila semilla para cada una de las 8 temáticas", () => {
    for (const theme of PREVENTION_AXIS_THEMES) {
      expect(PREVENTION_THEME_SEED_ITEM_IDS[theme.code]).toBeTruthy();
      const row = getPreventionSeedRowForTheme(theme.code, 2026, 2028);
      expect(row).not.toBeNull();
      expect(row!.axis).toBe("EJE DE ACCIÓN: PROMOCIÓN Y PREVENCIÓN");
      expect(row!.goal.trim()).not.toBe("");
      // La fila devuelta debe reconocerse como cobertura de esa temática.
      const detected = detectPreventionThemes(
        row!.goal,
        row!.actions,
        row!.evaluation_indicator
      ).map((t) => t.code);
      expect(detected).toContain(theme.code);
    }
  });

  it("devuelve null para una temática inexistente", () => {
    expect(getPreventionSeedRowForTheme("NO_EXISTE")).toBeNull();
  });
});

describe("calculateBianualPlanStats", () => {
  it("cuenta metas, ejes, acciones y responsables asignados", () => {
    const stats = calculateBianualPlanStats([
      {
        id: "1",
        axis: "EJE DE ACCIÓN: CONSEJERÍA",
        goal: "Meta 1",
        actions: "1. a\n2. b\n3. c",
        responsible: "Ps. A",
        evaluation_indicator: "E.D2.C1.DE6.c.",
        execution_term: "Bianio",
      },
      {
        id: "2",
        axis: "EJE DE ACCIÓN: PROMOCIÓN Y PREVENCIÓN",
        goal: "Meta 2",
        actions: "1. x",
        responsible: "",
        evaluation_indicator: "",
        execution_term: "",
      },
    ]);

    expect(stats.totalItems).toBe(2);
    expect(stats.axesCount).toBe(2);
    expect(stats.actionsCount).toBe(4);
    expect(stats.itemsWithResponsible).toBe(1);
    expect(stats.itemsWithIndicator).toBe(1);
    expect(stats.itemsWithGoal).toBe(2);
    expect(stats.completionPercent).toBe(50);
  });

  it("no divide por cero con una matriz vacía", () => {
    const stats = calculateBianualPlanStats([]);
    expect(stats.totalItems).toBe(0);
    expect(stats.completionPercent).toBe(0);
    expect(stats.preventionThemesCovered).toBe(0);
  });
});

describe("buildBianualContextForActionPlan (vínculo bianual → POA)", () => {
  it("arma el contexto con periodo, objetivos y metas por eje", () => {
    const items = getDefaultBianualAxisItems(2026, 2028);
    const context = buildBianualContextForActionPlan({
      period_text: "2026-2028",
      general_objective: DEFAULT_GENERAL_OBJECTIVE,
      specific_objectives: JSON.stringify(DEFAULT_SPECIFIC_OBJECTIVES),
      axis_items_data: JSON.stringify(items),
    });

    expect(context).toContain("2026-2028");
    expect(context).toContain("Objetivo general del plan estratégico");
    expect(context).toContain("Objetivos específicos del plan estratégico");
    expect(context).toContain("Metas bianuales por eje de acción");
    // Los 4 ejes deben aparecer con sus metas.
    for (const axis of STRATEGIC_BIANUAL_AXES) {
      expect(context).toContain(axis);
    }
    expect(context).toContain(DEFAULT_SPECIFIC_OBJECTIVES[0]);
  });

  it("degrada con gracia cuando el plan está casi vacío", () => {
    const context = buildBianualContextForActionPlan({
      period_text: "",
      general_objective: "",
      specific_objectives: "[]",
      axis_items_data: "[]",
    });
    expect(context).toContain("Periodo bianual vigente: no especificado");
    expect(context).not.toContain("Metas bianuales por eje");
  });
});
