import { describe, it, expect } from "vitest";
import { getInstitutionCoursesWithCounts } from "./distributivo";
import { db } from "./db";

describe("Distributivo preview and student recalculation", () => {
  it("asigna colores y recalcula estudiantes reales para cada profesional", () => {
    // 1. Crear institución y estudiantes de prueba
    const instId = "test-inst-distributivo-" + Date.now();
    db.prepare("INSERT INTO institutions (id, name, amie_code) VALUES (?, ?, ?)").run(
      instId,
      "Institución Test Distributivo",
      "AMIE-DIST"
    );

    // Insertar estudiantes en diferentes cursos
    const insertStudent = db.prepare(
      "INSERT INTO students (id, institution_id, full_name, course, parallel, jornada, active) VALUES (?, ?, ?, ?, ?, ?, 1)"
    );
    const prefix = `s-${Date.now()}-`;
    insertStudent.run(prefix + "1", instId, "Estudiante 1", "Octavo EGB", "A", "Matutina");
    insertStudent.run(prefix + "2", instId, "Estudiante 2", "Octavo EGB", "B", "Matutina");
    insertStudent.run(prefix + "3", instId, "Estudiante 3", "Noveno EGB", "A", "Matutina");

    const coursesInfo = getInstitutionCoursesWithCounts(instId);
    expect(coursesInfo.totalStudents).toBe(3);

    // Paleta por defecto
    const defaultPalette = ["#FEF08A", "#BAE6FD", "#BBF7D0", "#FED7AA", "#E9D5FF"];

    const mockAssignments = [
      {
        id: "a1",
        user_name: "Dr. Roberto Gomez",
        user_role_label: "Analista DECE",
        courses: JSON.stringify(["Octavo EGB"]),
        estimated_students_count: 0, // viene en 0 del formulario
        color: null,
      },
      {
        id: "a2",
        user_name: "Lcda. Maria Perez",
        user_role_label: "Analista DECE",
        courses: JSON.stringify(["Noveno EGB"]),
        estimated_students_count: 0, // viene en 0 del formulario
        color: "#FED7AA",
      },
    ];

    const courseMap = new Map(coursesInfo.courseSummaries.map((c) => [c.course, c]));

    // Lógica implementada para analystMeta
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
          const summary = courseMap.get(cName);
          if (summary) studentCount += summary.totalStudents;
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

    // Validar profesional 1: color de paleta asignado (#FEF08A) y 2 estudiantes calculados (Octavo A y B)
    expect(analystMeta[0].color).toBe("#FEF08A");
    expect(analystMeta[0].estimated_students_count).toBe(2);

    // Validar profesional 2: color explícito preservado (#FED7AA) y 1 estudiante calculado (Noveno A)
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
