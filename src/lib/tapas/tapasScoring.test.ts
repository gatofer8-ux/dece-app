import { describe, it, expect } from "vitest";
import { ARCHETYPES, ARCHETYPE_COUNT, TAPAS_FAMILIES } from "./archetypes";
import { scoreTapas } from "./tapasScoring";

describe("TaPas — arquetipos", () => {
  it("tiene 74 arquetipos con clave única y familia válida", () => {
    expect(ARCHETYPE_COUNT).toBe(74);
    const keys = new Set(ARCHETYPES.map((a) => a.key));
    expect(keys.size).toBe(74);
    for (const a of ARCHETYPES) {
      expect(a.name.length).toBeGreaterThan(0);
      expect(a.meaning.length).toBeGreaterThan(0);
      expect(Object.keys(TAPAS_FAMILIES)).toContain(a.familia);
    }
  });
});

describe("TaPas — agregado", () => {
  it("cuenta identificados, dudas y descartados", () => {
    const cls: Record<string, "SI" | "DUDA" | "NO"> = {};
    ARCHETYPES.forEach((a, i) => (cls[a.key] = i < 12 ? "SI" : i < 20 ? "DUDA" : "NO"));
    const r = scoreTapas(cls, []);
    expect(r.identifiedCount).toBe(12);
    expect(r.dudaCount).toBe(8);
    expect(r.noCount).toBe(74 - 20);
  });

  it("familia dominante refleja los arquetipos identificados", () => {
    const cls: Record<string, "SI" | "DUDA" | "NO"> = {};
    for (const a of ARCHETYPES) cls[a.key] = a.familia === "CUIDAR" ? "SI" : "NO";
    const r = scoreTapas(cls, []);
    expect(r.dominantFamilias[0]).toBe("CUIDAR");
    expect(r.familias[0].familia).toBe("CUIDAR");
    expect(r.familias[0].pct).toBe(100);
  });

  it("limpia grupos vacíos y arquetipos inexistentes; conserva el orden", () => {
    const cls: Record<string, "SI" | "DUDA" | "NO"> = {};
    for (const a of ARCHETYPES) cls[a.key] = "NO";
    const r = scoreTapas(cls, [
      { name: "Crear e imaginar", archetypes: ["artista", "musico", "inexistente"] },
      { name: "Vacío", archetypes: [] },
      { name: "Cuidar", archetypes: ["medico"] },
    ]);
    expect(r.groupCount).toBe(2);
    expect(r.groups[0].name).toBe("Crear e imaginar");
    expect(r.groups[0].archetypes).toEqual(["artista", "musico"]);
    expect(r.groups[1].name).toBe("Cuidar");
  });
});
