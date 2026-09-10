import { describe, it, expect } from "vitest";
import {
  formatStudentCourseFull,
  studentGradeLabel,
  studentGradeOnly,
  isBachilleratoStudent,
  getBachilleratoSpecialty,
} from "./studentCourse";

describe("studentCourse - bachillerato + especialidad", () => {
  const gabriel = { course: "3ro", parallel: "A", education_level: "Bachillerato", bachillerato_specialty: "Soporte Técnico de Equipos Informáticos", jornada: "Matutina" };
  it("Gabriel (figura profesional con 'Técnico' en el nombre)", () => {
    expect(studentGradeLabel(gabriel)).toBe('3.° de Bachillerato Técnico, figura profesional “Soporte Técnico de Equipos Informáticos” “A”');
    expect(studentGradeOnly(gabriel)).toBe('3.° de Bachillerato Técnico, figura profesional “Soporte Técnico de Equipos Informáticos”');
    expect(isBachilleratoStudent(gabriel)).toBe(true);
    expect(getBachilleratoSpecialty(gabriel)).toBe('Técnico, figura profesional “Soporte Técnico de Equipos Informáticos”');
  });
  it("Contabilidad", () => {
    const student = { course: "3ro", parallel: "B", education_level: "Bachillerato", bachillerato_specialty: "Contabilidad" };
    expect(studentGradeLabel(student))
      .toBe('3.° de Bachillerato Técnico en Contabilidad “B”');
    expect(isBachilleratoStudent(student)).toBe(true);
    expect(getBachilleratoSpecialty(student)).toBe("Técnico en Contabilidad");
  });
  it("Ciencias", () => {
    const student = { course: "2do", parallel: "C", education_level: "Bachillerato", bachillerato_specialty: "Ciencias" };
    expect(studentGradeLabel(student))
      .toBe('2.° de Bachillerato en Ciencias “C”');
    expect(isBachilleratoStudent(student)).toBe(true);
    expect(getBachilleratoSpecialty(student)).toBe("Ciencias");
  });
  it("1ro BGU / General Unificado", () => {
    const student = { course: "1ro BGU", parallel: "A" };
    expect(studentGradeLabel(student)).toBe('1.° de Bachillerato General Unificado “A”');
    expect(isBachilleratoStudent(student)).toBe(true);
    expect(getBachilleratoSpecialty(student)).toBe("General Unificado");
  });
  it("1 BGU", () => {
    const student = { course: "1 BGU", parallel: "B" };
    expect(studentGradeLabel(student)).toBe('1.° de Bachillerato General Unificado “B”');
    expect(isBachilleratoStudent(student)).toBe(true);
  });
  it("EGB", () => {
    const student = { course: "10mo EGB", parallel: "A", education_level: "EGB" };
    expect(studentGradeLabel(student)).toBe('10.° de EGB “A”');
    expect(isBachilleratoStudent(student)).toBe(false);
  });
  it("con jornada", () => {
    expect(formatStudentCourseFull(gabriel)).toContain("— Matutina");
    expect(formatStudentCourseFull(gabriel, { includeJornada: false })).not.toContain("Matutina");
  });
});
