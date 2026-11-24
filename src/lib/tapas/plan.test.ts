import { describe, it, expect } from "vitest";
import { buildPlan, isHojaOpen, isMultiHoja, parsePlan, suggestSchedule } from "./plan";

describe("proceso TaPas de varias hojas", () => {
  it("las aplicaciones antiguas (sin plan) siguen siendo de una sola hoja", () => {
    const plan = parsePlan({ instrument: "ARQUETIPOS", nivel: "BACHILLERATO", plan_json: null });
    expect(plan.instruments).toEqual(["ARQUETIPOS"]);
    expect(isMultiHoja(plan)).toBe(false);
    expect(isHojaOpen(plan, "ARQUETIPOS")).toBe(true);
  });

  it("ordena las hojas como el manual (perfil → tarjetas → experimento) y valida el nivel", () => {
    const ok = buildPlan(["EXPERIMENTO", "ARQUETIPOS", "PERFIL_V1"], "BASICA", "VARIAS", "40");
    expect(ok.ok && ok.plan.instruments).toEqual(["PERFIL_V1", "ARQUETIPOS", "EXPERIMENTO"]);
    // en varias sesiones solo arranca abierta la primera hoja
    expect(ok.ok && ok.plan.open).toEqual(["PERFIL_V1"]);
    expect(buildPlan(["EXPERIMENTO"], "INICIAL", "UNA", 40).ok).toBe(false);
    expect(buildPlan([], "BASICA", "UNA", 40).ok).toBe(false);
  });

  it("en una sola sesión todas las hojas quedan abiertas", () => {
    const built = buildPlan(["PERFIL_V1", "ARQUETIPOS"], "BACHILLERATO", "UNA", 40);
    expect(built.ok && built.plan.open).toEqual(["PERFIL_V1", "ARQUETIPOS"]);
  });

  it("reparte en horas de clase: parte las 74 tarjetas si no caben y deja la sesión 2 del experimento una semana después", () => {
    const built = buildPlan(["PERFIL_V1", "PERFIL_V2", "ARQUETIPOS", "EXPERIMENTO"], "BACHILLERATO", "VARIAS", 40);
    if (!built.ok) throw new Error(built.error);
    const sch = suggestSchedule(built.plan, "BACHILLERATO");
    expect(sch.every((s) => s.minutos <= 40)).toBe(true);
    const arq = sch.flatMap((s) => s.bloques).filter((b) => b.instrument === "ARQUETIPOS");
    expect(arq).toHaveLength(2);
    expect(sch[sch.length - 1].nota).toMatch(/semana/);
    expect(sch[sch.length - 1].bloques[0].parte).toMatch(/sesión 2/);

    const hora45 = suggestSchedule({ ...built.plan, minutosHora: 45 }, "BACHILLERATO");
    expect(hora45.map((s) => s.minutos)).toEqual([45, 45, 30, 30]);
  });
});
