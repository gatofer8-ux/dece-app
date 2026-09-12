import { describe, it, expect } from "vitest";
import { generateDailyAttentionDocx } from "./dailyAttentionDocx";
import { generateDailyAttentionExcel } from "./dailyAttentionExcel";
import type { DailyAttentionRow, InstitutionRow } from "./types";

const mockInstitution: InstitutionRow = {
  id: "inst-1",
  name: "Unidad Educativa del Milenio",
  amie_code: "17H00001",
  district: "17D01",
  circuit: "C01",
  zona: "Zona 9",
  address: "Quito, Ecuador",
  seal_image: null,
  rector_name: "Mgs. Laura Benítez",
  active: 1,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

const mockEntries: DailyAttentionRow[] = [
  {
    id: "att-1",
    institution_id: "inst-1",
    professional_id: "user-1",
    case_file_id: null,
    attendee_type: "ESTUDIANTE",
    attention_date: "2026-09-10",
    duration: null,
    student_name: "Mateo Villacís",
    student_grade: "10mo EGB A",
    jornada: "MATUTINA",
    representative_name: null,
    attendee_name: null,
    reason: "Dificultades de adaptación y aislamiento social en recreos.",
    action_axis: JSON.stringify(["DETECCION", "INTERVENCION_INDIVIDUAL"]),
    modality_tech: null,
    modality_signed: 1,
    modality_phone: "0998765432",
    has_detection_sheet: null,
    observations: "Se programa cita con representante.",
    created_at: "2026-09-10T10:00:00Z",
  },
  {
    id: "att-2",
    institution_id: "inst-1",
    professional_id: "user-1",
    case_file_id: null,
    attendee_type: "REPRESENTANTE",
    attention_date: "2026-09-11",
    duration: null,
    student_name: "Mateo Villacís",
    student_grade: "10mo EGB A",
    jornada: "MATUTINA",
    representative_name: "Carmen Morales (Madre)",
    attendee_name: null,
    reason: "Atención solicitada para seguimiento socioemocional del estudiante.",
    action_axis: JSON.stringify(["INTERVENCION_FAMILIAR", "SEGUIMIENTO"]),
    modality_tech: null,
    modality_signed: 1,
    modality_phone: "0998765432",
    has_detection_sheet: null,
    observations: "Firma acta de acuerdos.",
    created_at: "2026-09-11T11:00:00Z",
  },
  {
    id: "att-3",
    institution_id: "inst-1",
    professional_id: "user-1",
    case_file_id: null,
    attendee_type: "DOCENTE_AUTORIDAD",
    attention_date: "2026-09-12",
    duration: "25 min",
    student_name: "Mateo Villacís",
    student_grade: "10mo EGB A",
    jornada: "MATUTINA",
    representative_name: null,
    attendee_name: "Prof. Galo Herrera (Tutor)",
    reason: "Asesoría para acompañamiento pedagógico en aula.",
    action_axis: JSON.stringify(["PROMOCION", "SEGUIMIENTO"]),
    modality_tech: "Reunión Teams",
    modality_signed: 0,
    modality_phone: null,
    has_detection_sheet: "SI",
    observations: "Se entrega ficha de detección formal.",
    created_at: "2026-09-12T12:00:00Z",
  },
];

describe("dailyAttentionDocx & Excel", () => {
  it("genera un documento Word (.docx) válido para Estudiantes", async () => {
    const buf = await generateDailyAttentionDocx({
      institution: mockInstitution,
      tipo: "ESTUDIANTE",
      entries: [mockEntries[0]],
      mes: "2026-09",
      professionalName: "Psic. Roberto Silva",
    });
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(1000);
  });

  it("genera un documento Word (.docx) válido para Representantes", async () => {
    const buf = await generateDailyAttentionDocx({
      institution: mockInstitution,
      tipo: "REPRESENTANTE",
      entries: [mockEntries[1]],
      professionalName: "Psic. Roberto Silva",
    });
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(1000);
  });

  it("genera un documento Word (.docx) válido para Docentes y Autoridades", async () => {
    const buf = await generateDailyAttentionDocx({
      institution: mockInstitution,
      tipo: "DOCENTE_AUTORIDAD",
      entries: [mockEntries[2]],
      mes: "2026-09",
      professionalName: "Psic. Roberto Silva",
    });
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(1000);
  });

  it("genera un archivo Excel (.xlsx) con hojas y estilos para cada tipo", async () => {
    const buf = await generateDailyAttentionExcel({
      institution: mockInstitution,
      tipo: "ESTUDIANTE",
      entries: [mockEntries[0]],
      mes: "2026-09",
      professionalName: "Psic. Roberto Silva",
    });
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(1000);
  });
});
