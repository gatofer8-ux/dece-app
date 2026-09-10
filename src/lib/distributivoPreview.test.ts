import { describe, it, expect } from "vitest";
import { getInstitutionCoursesWithCounts, normalizeCourseKey } from "./distributivo";
import { db } from "./db";

describe("normalizeCourseKey helper", () => {
  it("normaliza diferentes formatos del mismo curso a la misma clave canónica", () => {
    // 8vo EGB
    const egb8Variants = ["8.° EGB", "Octavo EGB", "8vo EGB", "8vo EGB (Matutina)", "8.º Educación General Básica"];
    egb8Variants.forEach((v) => {
      expect(normalizeCourseKey(v)).toBe("8 egb");
    });

    // 9no EGB
    const egb9Variants = ["9.° EGB", "Noveno EGB", "9no EGB", "9vo EGB"];
    egb9Variants.forEach((v) => {
      expect(normalizeCourseKey(v)).toBe("9 egb");
    });

    // 10mo EGB
    const egb10Variants = ["10.° EGB", "Décimo EGB", "10mo EGB", "Décimo Educación General Básica"];
    egb10Variants.forEach((v) => {
      expect(normalizeCourseKey(v)).toBe("10 egb");
    });

    // 1ro BGU
    const bgu1Variants = ["1.° BGU", "1ro BGU", "Primero Bachillerato", "1ero BGU", "Primero de Bachillerato General Unificado"];
    bgu1Variants.forEach((v) => {
      expect(normalizeCourseKey(v)).toBe("1 bgu");
    });

    // Inicial 2
    const ini2Variants = ["Inicial 2", "Inicial II", "Inicial II (4 años)", "Inicial 2 (4 años)"];
    ini2Variants.forEach((v) => {
      expect(normalizeCourseKey(v)).toBe("inicial 2");
    });
  });
});

describe("Distributivo preview and student recalculation", () => {
  it("asigna colores y recalcula estudiantes reales para cada profesional incluso con formatos de curso dispares", () => {
    // 1. Crear institución y estudiantes de prueba
    const instId = "test-inst-distributivo-" + Date.now();
    db.prepare("INSERT INTO institutions (id, name, amie_code) VALUES (?, ?, ?)").run(
      instId,
      "Institución Test Distributivo",
      "AMIE-DIST"
    );

    // Insertar estudiantes usando nombres coloquiales ("Octavo EGB", "1ro BGU")
    const insertStudent = db.prepare(
      "INSERT INTO students (id, institution_id, full_name, course, parallel, jornada, active) VALUES (?, ?, ?, ?, ?, ?, 1)"
    );
    const prefix = `s-${Date.now()}-`;
    insertStudent.run(prefix + "1", instId, "Estudiante 1", "Octavo EGB", "A", "Matutina");
    insertStudent.run(prefix + "2", instId, "Estudiante 2", "Octavo EGB", "B", "Matutina");
    insertStudent.run(prefix + "3", instId, "Estudiante 3", "1ro BGU", "A", "Matutina");

    const coursesInfo = getInstitutionCoursesWithCounts(instId);
    expect(coursesInfo.totalStudents).toBe(3);

    // Paleta por defecto
    const defaultPalette = ["#FEF08A", "#BAE6FD", "#BBF7D0", "#FED7AA", "#E9D5FF"];

    // Asignaciones guardadas con formato abreviado/oficial ("8.° EGB", "1.° BGU")
    const mockAssignments = [
      {
        id: "a1",
        user_name: "Dr. Roberto Gomez",
        user_role_label: "Analista DECE",
        courses: JSON.stringify(["8.° EGB"]), // Formato con ordinal y punto
        estimated_students_count: 0, // viene en 0 del formulario
        color: null,
      },
      {
        id: "a2",
        user_name: "Lcda. Maria Perez",
        user_role_label: "Analista DECE",
        courses: JSON.stringify(["1.° BGU"]), // Formato con ordinal y punto
        estimated_students_count: 0, // viene en 0 del formulario
        color: "#FED7AA",
      },
    ];

    // Lógica implementada para analystMeta usando normalizeCourseKey
    const analystMeta = mockAssignments.map((a, idx) => {
      const parts = a.user_name.trim().split(/\s+/);
      let initials = "P" + (idx + 1);
      if (parts.length >= 2) {
        initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }

      const parsedCourses = JSON.parse(a.courses || "[]");
      const assignedColor = a.color || defaultPalette[idx % defaultPalette.length];

      let studentCount = Number(a.estimated_students_count) || 0;
      if (studentCount === 0 && parsedCourses.length > 0) {
        for (const cName of parsedCourses) {
          const normKey = normalizeCourseKey(cName);
          const matched = coursesInfo.courseSummaries.find(
            (s) => normalizeCourseKey(s.course) === normKey
          );
          if (matched) studentCount += matched.totalStudents;
        }
      }

      return {
        ...a,
        index: idx + 1,
        initials,
        parsedCourses,
        color: assignedColor,
        estimated_students_count: studentCount,
      };
    });

    // Validar profesional 1: color de paleta (#FEF08A) y 2 estudiantes calculados (Octavo EGB A y B)
    expect(analystMeta[0].color).toBe("#FEF08A");
    expect(analystMeta[0].estimated_students_count).toBe(2);

    // Validar profesional 2: color explícito (#FED7AA) y 1 estudiante calculado (1ro BGU A)
    expect(analystMeta[1].color).toBe("#FED7AA");
    expect(analystMeta[1].estimated_students_count).toBe(1);

    // Validar que en sección 6 todos los profesionales tienen color y número de estudiantes > 0
    analystMeta.forEach((prof) => {
      expect(prof.color).toBeTruthy();
      expect(prof.color).toMatch(/^#[0-9A-F]{6}$/i);
      expect(prof.estimated_students_count).toBeGreaterThan(0);
    });
  });
});

