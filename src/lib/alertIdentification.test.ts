import { describe, it, expect } from "vitest";
import { parseAttendees, defaultObservaciones } from "./alertIdentification";

describe("alertIdentification (puro)", () => {
  it("defaultObservaciones interpola el año lectivo", () => {
    expect(defaultObservaciones("2026-2027")).toBe(
      "Los docentes miembros de la junta de grado/curso conocen los casos de vulnerabilidad atendidos por el DECE durante el año lectivo 2026-2027."
    );
  });

  it("parseAttendees devuelve arreglo vacío para JSON inválido o nulo", () => {
    expect(parseAttendees(null)).toEqual([]);
    expect(parseAttendees("no-json")).toEqual([]);
    expect(parseAttendees(JSON.stringify([{ nombre: "Ana", telefono: "099" }]))).toEqual([{ nombre: "Ana", telefono: "099" }]);
  });
});
