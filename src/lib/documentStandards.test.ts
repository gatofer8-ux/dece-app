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

/**
 * Transcripción del documento oficial "Estándares e Indicadores de Calidad
 * Educativa – Profesionales del Departamento de Consejería Estudiantil"
 * (Mineduc, 2025): columna ESTÁNDAR de cada tabla, con su página.
 */
const OFFICIAL: { code: string; dim: string; comp: string; page: number; text: string }[] = [
  { code: "E.D1.C1.DE1", dim: "Gestión", comp: "Gestión Documental", page: 11, text: "Elabora documentos sobre los procesos de acompañamiento y seguimiento psicosocial a la población estudiantil, correspondientes a los ejes de acción del Departamento de Consejería Estudiantil." },
  { code: "E.D1.C1.DE2", dim: "Gestión", comp: "Gestión Documental", page: 12, text: "Actualiza mensualmente el Registro de Casos de Riesgo Psicosocial de acuerdo con los casos presentados en la institución educativa." },
  { code: "E.D1.C2.DE3", dim: "Gestión", comp: "Información y Comunicación", page: 13, text: "Reporta, de manera específica, en la Junta de Docentes de Grado o Curso, las acciones tomadas a fin de garantizar la accesibilidad y exigibilidad de los derechos de la población estudiantil." },
  { code: "E.D1.C2.DE4", dim: "Gestión", comp: "Información y Comunicación", page: 14, text: "Genera dos espacios en el año lectivo para la socialización de políticas, lineamientos, planes, programas y estrategias inherentes a las funciones del Departamento de Consejería Estudiantil." },
  { code: "E.D1.C3.DE5", dim: "Gestión", comp: "Gestión Organizacional", page: 15, text: "Ejecuta el Plan de Acción del Departamento de Consejería Estudiantil." },
  { code: "E.D2.C1.DE6", dim: "Acompañamiento y Seguimiento Psicosocial", comp: "Consejería", page: 17, text: "Implementa procesos y herramientas de intereses profesionales y vocacionales a estudiantes de forma individual y grupal, en función de los lineamientos emitidos por la Autoridad Educativa Nacional." },
  { code: "E.D2.C1.DE7", dim: "Acompañamiento y Seguimiento Psicosocial", comp: "Consejería", page: 18, text: "Genera actividades de sensibilización, diálogo o capacitación, enfocadas en el ejercicio y la promoción de derechos del estudiantado, en cada grado o curso bajo su responsabilidad, por año lectivo." },
  { code: "E.D2.C2.DE8", dim: "Acompañamiento y Seguimiento Psicosocial", comp: "Promoción y Prevención", page: 19, text: "Asesora a docentes tutores de cada grado o curso bajo su responsabilidad, sobre la implementación de las recomendaciones para fortalecer el acompañamiento socioemocional en el aula." },
  { code: "E.D2.C2.DE9", dim: "Acompañamiento y Seguimiento Psicosocial", comp: "Promoción y Prevención", page: 20, text: "Genera espacios de sensibilización y diálogo, relacionados con las temáticas del eje de promoción y prevención, contemplados en el Plan Estratégico del departamento, con estudiantes de cada grado o curso, con otros profesionales de la institución educativa y con familias, por año lectivo." },
  { code: "E.D2.C3.DE10", dim: "Acompañamiento y Seguimiento Psicosocial", comp: "Inclusión Socioeducativa", page: 21, text: "Implementa el Plan de atención y seguimiento psicosocial a estudiantes con necesidades educativas específicas asociadas y no asociadas a la discapacidad, derivados desde la Unidad Distrital de Apoyo a la Inclusión o profesionales avalados que emitan un informe psicopedagógico." },
  { code: "E.D3.C1.DE11", dim: "Protección Integral", comp: "Atención Psicosocial", page: 23, text: "Aplica técnicas y/o herramientas para la detección de estudiantes que requieren atención psicosocial." },
  { code: "E.D3.C1.DE12", dim: "Protección Integral", comp: "Atención Psicosocial", page: 24, text: "Realiza la intervención de estudiantes que requieren atención psicosocial." },
  { code: "E.D3.C1.DE13", dim: "Protección Integral", comp: "Atención Psicosocial", page: 25, text: "Implementa las acciones contempladas en el Plan de acompañamiento y restitución a víctimas de violencia." },
  { code: "E.D4.C1.DE14", dim: "Convivencia", comp: "Trabajo en Red", page: 27, text: "Asesora a la autoridad institucional y a las instancias de solución alternativa de conflictos de las instituciones educativas, en la generación de estrategias enmarcadas en una cultura de paz y no violencia." },
];

describe("contraste con el documento oficial de Estándares de Calidad DECE", () => {
  it("el código refleja dimensión y componente: D<n>.C<m>.DE<k> con DE numerados 1-14", () => {
    expect(OFFICIAL.map((s) => Number(s.code.match(/DE(\d+)$/)![1]))).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
    const dims = new Set(OFFICIAL.filter((s) => s.code.startsWith("E.D3.")).map((s) => s.dim));
    expect([...dims]).toEqual(["Protección Integral"]); // D3 es Protección Integral, no "Atención psicosocial"
  });

  it("el enunciado impreso de cada estándar es idéntico al del documento oficial", () => {
    for (const s of OFFICIAL) expect(STANDARD_PRINT_TEXT[s.code], `${s.code} (p. ${s.page})`).toBe(s.text);
  });

  it("el catálogo del Plan de Acción coincide en código base, dimensión, componente y enunciado", () => {
    expect(DECE_QUALITY_STANDARDS).toHaveLength(OFFICIAL.length);
    for (const s of OFFICIAL) {
      const cat = DECE_QUALITY_STANDARDS.find((c) => baseStandardCode(c.code) === s.code)!;
      expect(cat, s.code).toBeDefined();
      expect(cat.dimension, s.code).toBe(s.dim.toUpperCase());
      expect(cat.component, s.code).toBe(s.comp.toUpperCase());
      expect(cat.description, s.code).toBe(s.text);
    }
  });

  it("los códigos del catálogo llevan nivel de logro válido (a-d) o ninguno", () => {
    for (const c of DECE_QUALITY_STANDARDS) expect(c.code).toMatch(/^E\.D\d\.C\d\.DE\d+(\.[a-d])?$/);
  });
});
