import { describe, it, expect } from "vitest";
import {
  ENEIS_NIVELES_PREPARACION,
  ENEIS_TEMAS_EIS,
  ENEIS_RECURSOS_INSTITUCIONALES,
  ENEIS_FIRMAS_ESCOLARES_ROLES,
  ENEIS_FIRMAS_DISTRITALES_ROLES,
  parseFuncionarios,
  buildFirmas,
} from "./eneisFichaTecnica";

describe("eneisFichaTecnica catálogos fijos", () => {
  it("tiene 9 niveles de preparación", () => {
    expect(ENEIS_NIVELES_PREPARACION).toHaveLength(9);
  });

  it("tiene 8 conceptos clave con al menos un tema cada uno", () => {
    const conceptos = new Set(ENEIS_TEMAS_EIS.map((t) => t.concepto));
    expect(conceptos.size).toBe(8);
    expect(ENEIS_TEMAS_EIS.length).toBeGreaterThanOrEqual(26);
  });

  it("tiene 5 recursos institucionales", () => {
    expect(ENEIS_RECURSOS_INSTITUCIONALES).toHaveLength(5);
  });

  it("tiene 4 roles fijos por cada grupo de firmas", () => {
    expect(ENEIS_FIRMAS_ESCOLARES_ROLES).toHaveLength(4);
    expect(ENEIS_FIRMAS_DISTRITALES_ROLES).toHaveLength(4);
  });
});

describe("eneisFichaTecnica parse helpers", () => {
  it("parseFuncionarios devuelve arreglo vacío para JSON inválido", () => {
    expect(parseFuncionarios(null)).toEqual([]);
    expect(parseFuncionarios("no-json")).toEqual([]);
  });

  it("buildFirmas siempre devuelve una entrada por rol, con nombre vacío si no hay dato", () => {
    const firmas = buildFirmas(JSON.stringify([{ role: ENEIS_FIRMAS_ESCOLARES_ROLES[0], nombre: "Ana" }]), ENEIS_FIRMAS_ESCOLARES_ROLES);
    expect(firmas).toHaveLength(4);
    expect(firmas[0]).toEqual({ role: ENEIS_FIRMAS_ESCOLARES_ROLES[0], nombre: "Ana" });
    expect(firmas[1].nombre).toBe("");
  });
});
