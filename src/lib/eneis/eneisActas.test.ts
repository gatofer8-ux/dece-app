import { describe, it, expect } from "vitest";
import { parseEneisActaParticipants, parseEneisActaCompromisos } from "./eneisActas";

describe("eneisActas parse helpers", () => {
  it("parsea participantes válidos", () => {
    const json = JSON.stringify([{ nombre: "Ana Pérez", cargo: "Rectora" }]);
    expect(parseEneisActaParticipants(json)).toEqual([{ nombre: "Ana Pérez", cargo: "Rectora" }]);
  });

  it("devuelve arreglo vacío para JSON inválido o nulo", () => {
    expect(parseEneisActaParticipants(null)).toEqual([]);
    expect(parseEneisActaParticipants("no-json")).toEqual([]);
    expect(parseEneisActaCompromisos(undefined)).toEqual([]);
  });

  it("parsea compromisos válidos", () => {
    const json = JSON.stringify([{ compromiso: "Hacer taller", responsable: "DECE", fecha: "2026-01-01" }]);
    expect(parseEneisActaCompromisos(json)).toEqual([{ compromiso: "Hacer taller", responsable: "DECE", fecha: "2026-01-01" }]);
  });
});
