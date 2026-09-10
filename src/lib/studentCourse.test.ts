import { describe, it, expect } from "vitest";
import { formatStudentCourseFull, studentGradeLabel, studentGradeOnly } from "./studentCourse";

describe("studentCourse - bachillerato + especialidad", () => {
  const gabriel = { course: "3ro", parallel: "A", education_level: "Bachillerato", bachillerato_specialty: "Soporte Técnico de Equipos Informáticos", jornada: "Matutina" };
  it("Gabriel (figura profesional con 'Técnico' en el nombre)", () => {
    expect(studentGradeLabel(gabriel)).toBe('3.° de Bachillerato Técnico, figura profesional “Soporte Técnico de Equipos Informáticos” “A”');
    expect(studentGradeOnly(gabriel)).toBe('3.° de Bachillerato Técnico, figura profesional “Soporte Técnico de Equipos Informáticos”');
  });
  it("Contabilidad", () => {
    expect(studentGradeLabel({ course: "3ro", parallel: "B", education_level: "Bachillerato", bachillerato_specialty: "Contabilidad" }))
      .toBe('3.° de Bachillerato Técnico en Contabilidad “B”');
  });
  it("Ciencias", () => {
    expect(studentGradeLabel({ course: "2do", parallel: "C", education_level: "Bachillerato", bachillerato_specialty: "Ciencias" }))
      .toBe('2.° de Bachillerato en Ciencias “C”');
  });
  it("EGB", () => {
    expect(studentGradeLabel({ course: "10mo EGB", parallel: "A", education_level: "EGB" })).toBe('10.° de EGB “A”');
  });
  it("con jornada", () => {
    expect(formatStudentCourseFull(gabriel)).toContain("— Matutina");
    expect(formatStudentCourseFull(gabriel, { includeJornada: false })).not.toContain("Matutina");
  });
});
