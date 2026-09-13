import { describe, it, expect } from "vitest";
import { computeVocationalCoherence } from "./consolidatedVocationalReport";
import { generateConsolidatedVocationalReportDocx } from "./consolidatedVocationalDocx";
import { generateOvpProcessReportDocx } from "./ovpProcessReportDocx";
import type { ConsolidatedVocationalData } from "./consolidatedVocationalReport";
import type { OvpProcessReportData } from "./ovpProcessReportData";
import type { StudentRow, InstitutionRow, UserRow } from "@/lib/types";
import type { TapasResult } from "@/lib/tapas/tapasScoring";

describe("computeVocationalCoherence", () => {
  it("determina ALTA_COHERENCIA cuando los arquetipos TaPas coinciden directamente con el código RIASEC", () => {
    const res = computeVocationalCoherence(
      ["CREAR", "INDAGAR"],
      ["ARTISTICA", "INVESTIGADORA", "SOCIAL"]
    );

    expect(res.level).toBe("ALTA_COHERENCIA");
    expect(res.title).toContain("Alta Coherencia");
    expect(res.analysis).toContain("claridad y autoeficacia");
  });

  it("determina COMPLEMENTARIO cuando hay intersección parcial interdisciplinaria", () => {
    const res = computeVocationalCoherence(
      ["LIDERAR", "CUIDAR"],
      ["EMPRENDEDORA", "REALISTA", "CONVENCIONAL"]
    );

    expect(res.level).toBe("COMPLEMENTARIO");
    expect(res.title).toContain("Complementario");
  });

  it("determina EN_EXPLORACION cuando no hay coincidencia o datos insuficientes", () => {
    const res = computeVocationalCoherence([], ["REALISTA"]);
    expect(res.level).toBe("EN_EXPLORACION");
    expect(res.title).toContain("Exploración");
  });
});

describe("generateConsolidatedVocationalReportDocx", () => {
  const mockStudent = {
    id: "st-1",
    institution_id: "inst-1",
    full_name: "Mateo Sebastián Alarcón Morales",
    document_type: "CEDULA",
    document_id: "1720000001",
    course: "3ro Bachillerato",
    parallel: "A",
    jornada: "Matutina",
    education_level: "BACHILLERATO",
    bachillerato_specialty: "Ciencias",
    birth_date: "2008-04-12",
    gender: "MASCULINO",
    representative: "Gladys Morales",
    representative_document_id: "1700000002",
    rep_phone: "0991234567",
    rep_email: "gladys@test.com",
    address: "Quito, Av. América",
    legal_guardian: "MADRE",
    lives_with: "MADRE",
    has_nee: 0,
    nee_types: "[]",
    nee_description: null,
    active: 1,
    father_name: "Carlos Alarcón",
    father_phone: null,
    mother_name: "Gladys Morales",
    mother_phone: "0991234567",
    medical_condition: null,
    medical_allergies: null,
    medical_medication_intolerance: null,
    medical_food_intolerance: null,
    emergency_contact_name: "Gladys Morales",
    emergency_contact_phone: "0991234567",
    emergency_relationship: "Madre",
    notes: null,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  } as unknown as StudentRow;

  const mockInstitution = {
    id: "inst-1",
    name: "Unidad Educativa Fiscal Central",
    amie_code: "17H00001",
    district: "17D05",
    circuit: "C01",
    zona: "ZONA 9",
    address: "Quito, Ecuador",
    seal_image: null,
    rector_title: "Msc.",
    rector_name: "Ana Gabriela Viteri",
    rector_role: "Rectora Institucional",
    active: 1,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  } as unknown as InstitutionRow;

  const mockProfessional = {
    id: "usr-1",
    institution_id: "inst-1",
    email: "dece@colegio.edu.ec",
    password_hash: "hash",
    name: "Lic. Roberto Carlos Mendoza",
    role: "DECE",
    active: 1,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  } as unknown as UserRow;

  it("genera un documento Word (.docx) válido con perfil completo TaPas + IPPJ", async () => {
    const data: ConsolidatedVocationalData = {
      student: mockStudent,
      institution: mockInstitution,
      professional: mockProfessional,
      tapasApp: null,
      tapasResult: {
        groups: [
          { name: "Liderazgo y Gestión", archetypes: ["EL_EMPRESARIO", "EL_DIRECTOR"] },
          { name: "Diseño y Creación", archetypes: ["EL_ARQUITECTO", "EL_CREATIVO"] },
        ],
        familias: [
          { familia: "LIDERAR", label: "Liderar", color: "blue", count: 14, pct: 45 },
          { familia: "CREAR", label: "Crear", color: "purple", count: 10, pct: 32 },
          { familia: "INDAGAR", label: "Indagar", color: "amber", count: 7, pct: 23 },
        ],
        dominantFamilias: ["LIDERAR", "CREAR"],
      } as unknown as TapasResult,
      ippjApp: null,
      ippjResult: {
        gender: "MASCULINO",
        answered: 60,
        complete: true,
        scales: [
          { scale: "EMPRENDEDORA", letter: "E", label: "Emprendedora", raw: 42, sten: 8, level: "Alta" },
          { scale: "ARTISTICA", letter: "A", label: "Artística", raw: 40, sten: 7, level: "Alta" },
          { scale: "SOCIAL", letter: "S", label: "Social", raw: 35, sten: 6, level: "Media" },
          { scale: "INVESTIGADORA", letter: "I", label: "Investigadora", raw: 32, sten: 5, level: "Media" },
          { scale: "CONVENCIONAL", letter: "C", label: "Convencional", raw: 30, sten: 4, level: "Baja" },
          { scale: "REALISTA", letter: "R", label: "Realista", raw: 25, sten: 3, level: "Baja" },
        ],
        ranked: [],
        hollandCode: "EAS",
        topTypes: ["EMPRENDEDORA", "ARTISTICA", "SOCIAL"],
        intensidad: { raw: 204, sten: 5, level: "Media" },
        consistencia: { pairs: [], overall: "Alta" },
        diferenciacion: { spread: 5, nivel: "Alta" },
      },
      ippjSurvey: {
        carreras_pref: ["Administración de Empresas", "Marketing Digital", "Diseño Gráfico"],
      },
      suggestedAreas: [
        {
          fromType: "EMPRENDEDORA",
          area: {
            area: "Administración, negocios y finanzas",
            ejemplos: ["Administración de empresas", "Comercio exterior", "Marketing"],
            bachillerato: "Técnico en Servicios",
          },
        },
      ],
      coherenceLevel: "ALTA_COHERENCIA",
      coherenceTitle: "Alta Coherencia Vocacional (Convergencia Armónica)",
      coherenceAnalysis: "Existe alineación clara entre sus talentos autopercibidos y sus preferencias ocupacionales.",
      recommendedCareers: ["Administración de Empresas", "Marketing Digital", "Diseño Gráfico", "Comercio Exterior"],
      evaluationDate: "2026-09-12",
    };

    const buffer = await generateConsolidatedVocationalReportDocx(data);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(5000);
  });
});

describe("generateOvpProcessReportDocx", () => {
  it("genera un informe de proceso global en base a los 3 ejes siguiendo el formato oficial de talleres", async () => {
    const data: OvpProcessReportData = {
      institution: {
        id: "inst-1",
        name: "Colegio de Bachillerato República",
        amie_code: "18H00123",
        district: "18D01",
        circuit: "C01",
        zona: "ZONA 3",
        address: "Ambato, Tungurahua",
        seal_image: null,
        active: 1,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      } as unknown as InstitutionRow,
      professional: {
        id: "usr-1",
        institution_id: "inst-1",
        email: "dece@rep.edu.ec",
        password_hash: "hash",
        name: "Lic. Silvia Paredes",
        role: "DECE",
        active: 1,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      } as unknown as UserRow,
      authority: {
        id: "usr-2",
        institution_id: "inst-1",
        email: "rectorado@rep.edu.ec",
        password_hash: "hash",
        name: "Dr. Marcelo Espinoza",
        role: "AUTORIDAD",
        active: 1,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      } as unknown as UserRow,
      reportNumber: "DECE-OVP-2026-001",
      reportDate: "2026-09-12",
      tema: "INFORME TÉCNICO CONSOLIDADO DEL PROCESO DE OVP EN TERCERO DE BACHILLERATO",
      legalBasis: "Constitución de la República del Ecuador (Art. 26 y 27).\nLey Orgánica de Educación Intercultural (Art. 73).",
      scopeText: "Estudiantes de Tercer Año de Bachillerato de la jornada matutina.",
      objectiveGeneral: "Acompañar la construcción del proyecto de vida vocacional.",
      objectivesSpecific: "1. Fomentar el autoconocimiento mediante TaPas.\n2. Socializar oferta universitaria.\n3. Aplicar IPPJ.",
      developmentAnalysis: "El proceso se ejecutó de forma secuencial y holística.",
      ejeAutoconocimiento: "Desarrollo del eje de autoconocimiento con 74 arquetipos.",
      ejeInformacion: "Desarrollo del eje de información con ferias y catálogos SENESCYT.",
      ejeTomaDecisiones: "Desarrollo del eje de toma de decisiones mediante IPPJ.",
      activities: [
        {
          name: "Juego de Arquetipos TaPas",
          axis: "Autoconocimiento",
          date: "Octubre 2026",
          responsible: "DECE",
          beneficiaries: "3ro Bachillerato",
        },
        {
          name: "Feria Vocacional SENESCYT",
          axis: "Información",
          date: "Noviembre 2026",
          responsible: "DECE",
          beneficiaries: "Comunidad Educativa",
        },
        {
          name: "Evaluación IPPJ y Cuestionario Vocacional",
          axis: "Toma de Decisiones",
          date: "Diciembre 2026",
          responsible: "DECE",
          beneficiaries: "3ro Bachillerato",
        },
      ],
      participantsCount: 120,
      advances: "100% de estudiantes evaluados.",
      criticalNodes: "Demora en respuestas familiares.",
      conclusions: "El 92% definió con claridad su primera opción universitaria.",
      recommendations: "Continuar el seguimiento individual y esquelas de restitución.",
      elaboratedByName: "Lic. Silvia Paredes",
      elaboratedByRole: "Psicóloga Educativa - DECE",
      approvedByName: "Dr. Marcelo Espinoza",
      approvedByRole: "Rector Institucional",
    };

    const buffer = await generateOvpProcessReportDocx(data);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(5000);
  });
});
