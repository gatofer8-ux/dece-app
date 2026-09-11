import { describe, it, expect } from "vitest";
import {
  ENEIS_INFORME_DECE_ACTIVIDADES_REQUERIDAS,
  parseEneisInformeDeceActividades,
  formatPeriodoDece,
} from "./eneisInformeDece";

describe("eneisInformeDece", () => {
  it("tiene exactamente 4 actividades requeridas fijas", () => {
    expect(ENEIS_INFORME_DECE_ACTIVIDADES_REQUERIDAS).toHaveLength(4);
  });

  it("formatPeriodoDece convierte YYYY-MM a MES - AÑO", () => {
    expect(formatPeriodoDece("2026-03")).toBe("MARZO - 2026");
    expect(formatPeriodoDece("2025-12")).toBe("DICIEMBRE - 2025");
  });

  it("parseEneisInformeDeceActividades siempre devuelve 4 filas, aunque el JSON esté vacío", () => {
    const rows = parseEneisInformeDeceActividades(null);
    expect(rows).toHaveLength(4);
    expect(rows[0]).toEqual({ ejecutada: "", fecha: "", beneficiarios: "", foto: null });
  });

  it("parseEneisInformeDeceActividades preserva los datos guardados", () => {
    const json = JSON.stringify([{ ejecutada: "Taller X", fecha: "2026-03-04", beneficiarios: "67", foto: null }]);
    const rows = parseEneisInformeDeceActividades(json);
    expect(rows[0].ejecutada).toBe("Taller X");
    expect(rows[1].ejecutada).toBe("");
  });
});
