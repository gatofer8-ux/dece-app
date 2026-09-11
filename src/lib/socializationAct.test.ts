import { describe, it, expect } from "vitest";
import { generateSocializationActDocx } from "./docxExport";
import { parseJsonArray, type TeacherSignatureEntry } from "./socializationAct";

describe("socializationAct - docx export and signatures", () => {
  const mockStudent = {
    id: "st-1",
    full_name: "Juan Sebastián Pérez Morales",
    course: "Segundo de Bachillerato",
    parallel: "A",
  };

  const mockInstitution = {
    id: "inst-1",
    name: "Colegio Nacional Experimental",
  };

  it("genera un buffer de Word válido con casilleros vacíos agregados para firma a mano", async () => {
    const blankTeacherRows: TeacherSignatureEntry[] = Array.from({ length: 14 }).map(() => ({
      asignatura: "",
      docente: "",
    }));

    const mockAct = {
      id: "act-1",
      case_file_id: "case-1",
      act_date: "2026-09-10",
      act_place: "Quito",
      vulnerability_type: "Académica y psicosocial",
      curricular_adaptation_grade: "Ajustes razonables",
      agreements: JSON.stringify(["Mantener comunicación fluida con el DECE"]),
      teacher_signatures: JSON.stringify(blankTeacherRows),
      prepared_by_name: "Lic. Carlos Méndez",
      approved_by_name: "Dra. Martha Ruiz",
      received_by_name: "Lic. Tutor Juan",
      received_by_role: "Tutor de curso",
    };

    const buffer = await generateSocializationActDocx({
      act: mockAct,
      student: mockStudent,
      institution: mockInstitution,
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);

    const parsed = parseJsonArray<TeacherSignatureEntry>(mockAct.teacher_signatures);
    expect(parsed).toHaveLength(14);
    expect(parsed[0]).toEqual({ asignatura: "", docente: "" });
  });

  it("mantiene exactamente las filas mixtas con y sin datos", async () => {
    const mixedTeacherRows: TeacherSignatureEntry[] = [
      { asignatura: "Matemáticas", docente: "Lic. Pedro Gómez" },
      { asignatura: "Lengua y Literatura", docente: "" },
      { asignatura: "", docente: "" },
      { asignatura: "", docente: "" },
    ];

    const mockAct = {
      id: "act-2",
      case_file_id: "case-2",
      act_date: "2026-09-10",
      vulnerability_type: "Socioemocional",
      teacher_signatures: JSON.stringify(mixedTeacherRows),
    };

    const buffer = await generateSocializationActDocx({
      act: mockAct,
      student: mockStudent,
      institution: mockInstitution,
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);

    const parsed = parseJsonArray<TeacherSignatureEntry>(mockAct.teacher_signatures);
    expect(parsed).toHaveLength(4);
    expect(parsed[2]).toEqual({ asignatura: "", docente: "" });
    expect(parsed[3]).toEqual({ asignatura: "", docente: "" });
  });

  it("si no hay firmas registradas legacy exporta 18 casilleros en blanco", async () => {
    const mockAct = {
      id: "act-3",
      case_file_id: "case-3",
      act_date: "2026-09-10",
      vulnerability_type: "Vulnerabilidad",
      teacher_signatures: JSON.stringify([]),
    };

    const buffer = await generateSocializationActDocx({
      act: mockAct,
      student: mockStudent,
      institution: mockInstitution,
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);
  });
});
