import { describe, it, expect } from "vitest";
import { AlignmentType } from "docx";
import { smartAlign } from "./wordJustify";

describe("smartAlign", () => {
  it("texto corto -> izquierda (evita huecos al justificar)", () => {
    expect(smartAlign("No aplica.")).toBe(AlignmentType.LEFT);
    expect(smartAlign("El estudiante no presenta novedades.")).toBe(AlignmentType.LEFT);
    expect(smartAlign("")).toBe(AlignmentType.LEFT);
    expect(smartAlign(null)).toBe(AlignmentType.LEFT);
  });

  it("párrafo largo de varias líneas -> justificado", () => {
    const largo =
      "El Departamento de Consejería Estudiantil, en cumplimiento de sus funciones de " +
      "prevención, acompañamiento y promoción de la convivencia armónica, desarrollará un " +
      "plan de intervención individual con enfoque de derechos y sin revictimización.";
    expect(smartAlign(largo)).toBe(AlignmentType.JUSTIFIED);
  });

  it("varias líneas cortas -> izquierda", () => {
    expect(smartAlign("Línea uno.\nLínea dos.\nLínea tres.")).toBe(AlignmentType.LEFT);
  });
});
