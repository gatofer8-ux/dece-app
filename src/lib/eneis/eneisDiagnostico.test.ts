import { describe, it, expect } from "vitest";
import {
  parseEneisDiagnosticoObjetivos,
  parseEneisDiagnosticoResultados,
  parseEneisDiagnosticoResponsables,
  ENEIS_DIAGNOSTICO_GUIA_PREGUNTAS,
} from "./eneisDiagnostico";

describe("eneisDiagnostico parse helpers", () => {
  it("devuelve arreglos vacíos para JSON inválido o nulo", () => {
    expect(parseEneisDiagnosticoObjetivos(null)).toEqual([]);
    expect(parseEneisDiagnosticoResultados("no-json")).toEqual([]);
    expect(parseEneisDiagnosticoResponsables(undefined)).toEqual([]);
  });

  it("parsea objetivos y responsables válidos", () => {
    expect(parseEneisDiagnosticoObjetivos(JSON.stringify(["Objetivo 1"]))).toEqual(["Objetivo 1"]);
    expect(parseEneisDiagnosticoResponsables(JSON.stringify([{ nombre: "Ana", cargo: "Rectora" }]))).toEqual([
      { nombre: "Ana", cargo: "Rectora" },
    ]);
  });

  it("la guía de preguntas tiene las 5 preguntas oficiales", () => {
    expect(ENEIS_DIAGNOSTICO_GUIA_PREGUNTAS).toHaveLength(5);
  });
});
