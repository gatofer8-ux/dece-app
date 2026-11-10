import { describe, it, expect } from "vitest";
import { DECE_QUALITY_STANDARDS } from "./actionPlan";
import {
  DOCUMENT_STANDARDS,
  STANDARD_PRINT_TEXT,
  ACTIVITY_AXIS_STANDARDS,
  getDocumentStandards,
  getDocumentStandardTexts,
  attentionRegisterKind,
} from "./documentStandards";
import { auditStandardCoverage, baseStandardCode } from "./documentStandardsAudit";

const catalogBaseCodes = DECE_QUALITY_STANDARDS.map((s) => baseStandardCode(s.code));

describe("documentStandards", () => {
  it("baseStandardCode quita la letra de nivel del catálogo", () => {
    expect(baseStandardCode("E.D3.C1.DE12.c")).toBe("E.D3.C1.DE12");
    expect(baseStandardCode("E.D1.C3.DE5")).toBe("E.D1.C3.DE5");
  });

  it("cada estándar del catálogo tiene su enunciado impreso, y ninguno sobra", () => {
    expect(Object.keys(STANDARD_PRINT_TEXT).sort()).toEqual([...catalogBaseCodes].sort());
  });

  it("todo código asignado a un documento o eje de actividad existe en el catálogo", () => {
    const used = [
      ...Object.values(DOCUMENT_STANDARDS).flat(),
      ...Object.values(ACTIVITY_AXIS_STANDARDS).flat(),
    ];
    for (const code of used) expect(catalogBaseCodes).toContain(code);
  });

  it("ningún documento repite un código y todos tienen al menos uno", () => {
    for (const [kind, codes] of Object.entries(DOCUMENT_STANDARDS)) {
      expect(codes.length, kind).toBeGreaterThan(0);
      expect(new Set(codes).size, kind).toBe(codes.length);
    }
  });

  it("el Registro de atención se codifica igual que el formato físico (DE1 + DE12)", () => {
    expect(getDocumentStandardTexts("registro_atencion_diaria")).toEqual([
      "E.D1.C1.DE1. Elabora documentos sobre los procesos de acompañamiento y seguimiento psicosocial a la población estudiantil, correspondientes a los ejes de acción del Departamento de Consejería Estudiantil.",
      "E.D3.C1.DE12. Realiza la intervención de estudiantes que requieren atención psicosocial.",
    ]);
    expect(getDocumentStandards("registro_atencion_diaria").map((s) => s.code)).toEqual(["E.D1.C1.DE1.", "E.D3.C1.DE12."]);
  });

  it("el registro de atención a docentes/autoridades no reclama la intervención a estudiantes (DE12)", () => {
    expect(attentionRegisterKind("ESTUDIANTE")).toBe("registro_atencion_diaria");
    expect(attentionRegisterKind("REPRESENTANTE")).toBe("registro_atencion_diaria");
    const codes = getDocumentStandards(attentionRegisterKind("DOCENTE_AUTORIDAD")).map((s) => s.code);
    expect(codes).toEqual(["E.D1.C1.DE1.", "E.D2.C2.DE8.", "E.D4.C1.DE14."]);
  });

  it("auditoría: los estándares sin ningún documento que los evidencie son exactamente los conocidos", () => {
    const uncovered = auditStandardCoverage()
      .filter((s) => s.documents.length === 0 && !s.viaActivityAxis)
      .map((s) => s.code);
    // DE4 se evidencia con registros de asistencia / oficios / informes de
    // capacitación que la app todavía no genera como documento codificado.
    // DE10 (NEE) solo lo evidencia el plan de atención cuando el estudiante
    // tiene NEE, así que no se imprime fijo en todos los planes.
    // Al cubrir alguno, esta lista debe encogerse.
    expect(uncovered).toEqual(["E.D1.C2.DE4", "E.D2.C3.DE10"]);
  });
});
