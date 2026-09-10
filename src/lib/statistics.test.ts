import { describe, it, expect } from "vitest";
import {
  normalizeGender,
  normalizeJornada,
  normalizeEthnicity,
  normalizeNationality,
  calculateAge,
  getAgeBracket,
  getMonthDateRange,
  getTrimesterDateRange,
} from "./statistics";
import type { SchoolYearRow } from "./types";

describe("statistics helpers", () => {
  describe("normalizeGender", () => {
    it("normaliza variantes de femenino y masculino", () => {
      expect(normalizeGender("f")).toBe("F");
      expect(normalizeGender("Femenino")).toBe("F");
      expect(normalizeGender("MUJER")).toBe("F");

      expect(normalizeGender("m")).toBe("M");
      expect(normalizeGender("Masculino")).toBe("M");
      expect(normalizeGender("HOMBRE")).toBe("M");
      expect(normalizeGender("varon")).toBe("M");

      expect(normalizeGender("otro")).toBe("OTRO");
      expect(normalizeGender(null)).toBe("OTRO");
      expect(normalizeGender(undefined)).toBe("OTRO");
    });
  });

  describe("normalizeJornada", () => {
    it("normaliza jornadas correctamente", () => {
      expect(normalizeJornada("Matutina")).toBe("Matutina");
      expect(normalizeJornada("mañana")).toBe("Matutina");
      expect(normalizeJornada("vespertina")).toBe("Vespertina");
      expect(normalizeJornada("nocturna")).toBe("Nocturna");
      expect(normalizeJornada("")).toBe("No especificada");
      expect(normalizeJornada(null)).toBe("No especificada");
    });
  });

  describe("normalizeEthnicity", () => {
    it("normaliza etnias a estándares ecuatorianos", () => {
      expect(normalizeEthnicity("mestizo")).toBe("Mestizo/a");
      expect(normalizeEthnicity("afroecuatoriano")).toBe("Afroecuatoriano/a");
      expect(normalizeEthnicity("indígena kichwa")).toBe("Indígena");
      expect(normalizeEthnicity("montubio")).toBe("Montubio/a");
      expect(normalizeEthnicity("blanco")).toBe("Blanco/a");
      expect(normalizeEthnicity("")).toBe("No registrada");
    });
  });

  describe("normalizeNationality", () => {
    it("normaliza nacionalidades comunes", () => {
      expect(normalizeNationality("Ecuatoriana")).toBe("Ecuatoriana");
      expect(normalizeNationality("venezolana")).toBe("Venezolana");
      expect(normalizeNationality("colombiana")).toBe("Colombiana");
      expect(normalizeNationality("peruana")).toBe("Peruana");
      expect(normalizeNationality("")).toBe("Ecuatoriana");
    });
  });

  describe("calculateAge y getAgeBracket", () => {
    it("calcula la edad correctamente según fecha de nacimiento", () => {
      const refDate = new Date(2026, 8, 10); // 10 Septiembre 2026
      expect(calculateAge("2010-05-15", refDate)).toBe(16);
      expect(calculateAge("2016-09-15", refDate)).toBe(9); // Cumple en 5 días
      expect(calculateAge("2016-09-05", refDate)).toBe(10); // Ya cumplió
      expect(calculateAge(null)).toBeNull();
      expect(calculateAge("fecha_invalida")).toBeNull();
    });

    it("asigna los rangos de edad oficiales MINEDUC", () => {
      expect(getAgeBracket(4).key).toBe("menor_6");
      expect(getAgeBracket(7).key).toBe("6_8");
      expect(getAgeBracket(10).key).toBe("9_11");
      expect(getAgeBracket(13).key).toBe("12_14");
      expect(getAgeBracket(16).key).toBe("15_17");
      expect(getAgeBracket(19).key).toBe("18_mas");
      expect(getAgeBracket(null).key).toBe("no_registrada");
    });
  });

  describe("getMonthDateRange", () => {
    it("calcula inicio y fin de mes correctamente", () => {
      const feb2026 = getMonthDateRange("2026-02");
      expect(feb2026.start).toBe("2026-02-01");
      expect(feb2026.end).toBe("2026-02-28");
      expect(feb2026.label).toBe("Febrero 2026");

      const mar2026 = getMonthDateRange("2026-03");
      expect(mar2026.start).toBe("2026-03-01");
      expect(mar2026.end).toBe("2026-03-31");
    });
  });

  describe("getTrimesterDateRange", () => {
    it("calcula los tres trimestres de un año escolar", () => {
      const mockSchoolYear: SchoolYearRow = {
        id: "sy-test",
        institution_id: "inst-1",
        name: "2025-2026 Sierra",
        regime: "SIERRA_AMAZONIA",
        start_date: "2025-09-01",
        end_date: "2026-06-30",
        is_active: 1,
        created_at: "",
        updated_at: "",
      };

      const t1 = getTrimesterDateRange(mockSchoolYear, "1T");
      expect(t1.start).toBe("2025-09-01");
      expect(t1.label).toContain("Primer Trimestre");

      const t2 = getTrimesterDateRange(mockSchoolYear, "2T");
      expect(t2.label).toContain("Segundo Trimestre");

      const t3 = getTrimesterDateRange(mockSchoolYear, "3T");
      expect(t3.end).toBe("2026-06-30");
      expect(t3.label).toContain("Tercer Trimestre");
    });
  });
});
