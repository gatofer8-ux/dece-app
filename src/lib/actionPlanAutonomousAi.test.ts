import { describe, it, expect } from "vitest";
import { draftAutonomousActionPlan } from "./ai";
import { DEFAULT_ACTION_PLAN_ITEMS } from "./actionPlan";

describe("draftAutonomousActionPlan (Acuerdo MINEDUC-044-A)", () => {
  const initialItems = DEFAULT_ACTION_PLAN_ITEMS.map((item, idx) => ({
    ...item,
    id: `custom_id_${idx + 1}`, // Testea que funcione incluso con IDs dinámicos/UUIDs
    responsible: "",
  }));

  it("debe generar actividades articuladas con temáticas del Acuerdo 044-A y trazabilidad [SADEX: ...]", async () => {
    const res = await draftAutonomousActionPlan({
      institutionName: "Unidad Educativa Modelo",
      schoolYear: "2025 - 2026",
      studentsCount: 950,
      availableResources: "Hojas bond, proyectores, actas institucionales",
      professionalsList: ["Lcda. Maria Perez", "Ps. Juan Rodriguez"],
      targetScope: "PREVENCION",
      currentItems: initialItems,
    });

    expect("error" in res).toBe(false);
    if ("error" in res) return;

    expect(res.appliedCount).toBeGreaterThan(0);
    expect(res.updatedItems.length).toBe(initialItems.length);

    // Filtrar actividades actualizadas con etiquetas SADEX
    const sadexTagged = res.updatedItems.filter((it: any) =>
      it.meansOfVerification?.includes("[SADEX:") ||
      it.activities?.includes("[SADEX:") ||
      it.observations?.includes("SADEX")
    );
    expect(sadexTagged.length).toBeGreaterThan(0);

    // Verificar distribución equitativa de profesionales
    const responsibles = res.updatedItems.map((it: any) => it.responsible).filter(Boolean);
    expect(responsibles).toContain("Lcda. Maria Perez");
    expect(responsibles).toContain("Ps. Juan Rodriguez");

    // Verificar que aborde temáticas 044-A (violencia, drogas, acoso, salud mental, círculos restaurativos)
    const allText = res.updatedItems.map((it: any) => it.activities + " " + it.observations).join(" ");
    const has044Topics = /violencia|acoso|drogas|suicid|embarazo|socioemocional|restaurativo|convivencia/i.test(allText);
    expect(has044Topics).toBe(true);
  });

  it("debe calibrar adecuadamente cuando se solicita alcance integral TODO", async () => {
    const res = await draftAutonomousActionPlan({
      institutionName: "Colegio Nacional",
      schoolYear: "2025 - 2026",
      studentsCount: 1500,
      availableResources: "Computadoras, impresoras",
      professionalsList: ["Ps. Carla Ramos", "Lcdo. Pedro Vega", "Ps. Sofia Lopez"],
      targetScope: "TODO",
      currentItems: initialItems,
    });

    expect("error" in res).toBe(false);
    if ("error" in res) return;

    expect(res.appliedCount).toBe(initialItems.length);
    // Cada item debe tener responsable asignado
    const assignedCount = res.updatedItems.filter((it: any) => it.responsible?.trim()).length;
    expect(assignedCount).toBe(initialItems.length);
  });
});
