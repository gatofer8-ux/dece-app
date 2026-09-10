import { describe, it, expect } from "vitest";
import { IPPJ_ITEMS, scaleForItem } from "./ippjInstrument";
import { scoreIppj } from "./ippjScoring";

function answersAll(v: number): Record<number, number> {
  const o: Record<number, number> = {};
  for (let n = 1; n <= 60; n++) o[n] = v;
  return o;
}

describe("IPPJ — instrumento", () => {
  it("tiene 60 ítems y 10 por tipo", () => {
    expect(IPPJ_ITEMS).toHaveLength(60);
    const counts: Record<string, number> = {};
    for (const it of IPPJ_ITEMS) counts[it.scale] = (counts[it.scale] || 0) + 1;
    expect(Object.values(counts)).toEqual([10, 10, 10, 10, 10, 10]);
  });

  it("mapea el ítem al tipo por patrón cíclico", () => {
    expect(scaleForItem(1)).toBe("REALISTA");
    expect(scaleForItem(2)).toBe("INVESTIGADORA");
    expect(scaleForItem(6)).toBe("CONVENCIONAL");
    expect(scaleForItem(7)).toBe("REALISTA");
    expect(scaleForItem(60)).toBe("CONVENCIONAL");
  });
});

describe("IPPJ — calificación", () => {
  it("todo en 5 -> bruto 50 por tipo, STEN 10, intensidad 300", () => {
    const r = scoreIppj(answersAll(5), "FEMENINO");
    expect(r.complete).toBe(true);
    expect(r.answered).toBe(60);
    for (const s of r.scales) {
      expect(s.raw).toBe(50);
      expect(s.sten).toBe(10);
      expect(s.level).toBe("Alta");
    }
    expect(r.intensidad.raw).toBe(300);
    expect(r.intensidad.sten).toBe(10);
  });

  it("todo en 1 -> bruto 10 por tipo, STEN 1, intensidad 60", () => {
    const r = scoreIppj(answersAll(1), "MASCULINO");
    for (const s of r.scales) {
      expect(s.raw).toBe(10);
      expect(s.sten).toBe(1);
      expect(s.level).toBe("Baja");
    }
    expect(r.intensidad.raw).toBe(60);
    expect(r.intensidad.sten).toBe(1);
  });

  it("marca incompleto cuando faltan respuestas", () => {
    const a = answersAll(3);
    delete a[7];
    delete a[8];
    const r = scoreIppj(a, "OTRO");
    expect(r.complete).toBe(false);
    expect(r.answered).toBe(58);
  });

  it("baremo por género: mismo bruto SOCIAL da distinto STEN", () => {
    // SOCIAL bruto 40: mujeres > 37 -> STEN 6 ; hombres > 39 -> STEN 8
    const a: Record<number, number> = {};
    for (const it of IPPJ_ITEMS) a[it.n] = it.scale === "SOCIAL" ? 4 : 1;
    const f = scoreIppj(a, "FEMENINO").scales.find((s) => s.scale === "SOCIAL")!;
    const m = scoreIppj(a, "MASCULINO").scales.find((s) => s.scale === "SOCIAL")!;
    expect(f.raw).toBe(40);
    expect(m.raw).toBe(40);
    expect(f.sten).toBe(6);
    expect(m.sten).toBe(8);
  });

  it("código Holland = 3 tipos con mayor STEN", () => {
    const a: Record<number, number> = {};
    for (const it of IPPJ_ITEMS) {
      a[it.n] =
        it.scale === "ARTISTICA" ? 5 : it.scale === "SOCIAL" ? 4 : it.scale === "INVESTIGADORA" ? 3 : 1;
    }
    const r = scoreIppj(a, "FEMENINO");
    expect(r.hollandCode[0]).toBe("A");
    expect(r.topTypes[0]).toBe("ARTISTICA");
    expect(r.ranked[0].sten).toBeGreaterThanOrEqual(r.ranked[5].sten);
  });

  it("consistencia alta para tipos adyacentes, baja para opuestos", () => {
    const adj: Record<number, number> = {};
    for (const it of IPPJ_ITEMS) adj[it.n] = it.scale === "ARTISTICA" || it.scale === "SOCIAL" ? 5 : 1;
    expect(scoreIppj(adj, "FEMENINO").consistencia.overall).toBe("Alta");

    const opp: Record<number, number> = {};
    for (const it of IPPJ_ITEMS) opp[it.n] = it.scale === "REALISTA" || it.scale === "SOCIAL" ? 5 : 1;
    expect(scoreIppj(opp, "FEMENINO").consistencia.overall).toBe("Baja");
  });
});
