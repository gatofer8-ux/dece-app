import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import {
  previewNextCitationNumber,
  assignNextCitationNumber,
  createEsquela,
  getEsquelaById,
  listEsquelas,
  listEsquelasByCase,
  updateTalonStatus,
  deleteEsquela,
} from "./esquelas";

describe("Sistema de Esquelas de Citación", () => {
  let db: Database.Database;
  const instId = "inst-uesr";

  beforeEach(() => {
    db = new Database(":memory:");
    db.exec(`
      CREATE TABLE institutions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        acronym TEXT
      );

      CREATE TABLE case_files (
        id TEXT PRIMARY KEY,
        institution_id TEXT NOT NULL,
        code TEXT NOT NULL
      );

      CREATE TABLE case_actions (
        id TEXT PRIMARY KEY,
        case_file_id TEXT NOT NULL,
        author_id TEXT,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        intervention_type TEXT,
        observations TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE dece_citation_sequences (
        institution_id TEXT NOT NULL,
        school_year_code TEXT NOT NULL,
        last_number INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (institution_id, school_year_code)
      );

      CREATE TABLE dece_esquelas (
        id TEXT PRIMARY KEY,
        institution_id TEXT NOT NULL,
        citation_number TEXT NOT NULL UNIQUE,
        sequence_number INTEGER NOT NULL,
        school_year_code TEXT NOT NULL,
        case_file_id TEXT,
        student_id TEXT,
        student_name TEXT NOT NULL,
        student_id_number TEXT,
        course TEXT,
        parallel TEXT,
        jornada TEXT,
        representative_name TEXT NOT NULL,
        representative_id_number TEXT,
        representative_phone TEXT,
        citation_date TEXT NOT NULL,
        citation_time TEXT NOT NULL,
        citation_place TEXT DEFAULT 'Oficina del DECE',
        citation_reason TEXT NOT NULL,
        urgency_level TEXT DEFAULT 'ORDINARIA',
        professional_id TEXT,
        professional_name TEXT NOT NULL,
        professional_role TEXT DEFAULT 'Profesional DECE',
        observations TEXT,
        talon_returned INTEGER DEFAULT 0,
        received_by_name TEXT,
        received_by_relation TEXT,
        received_by_id_number TEXT,
        received_date TEXT,
        talon_attended INTEGER DEFAULT 0,
        talon_notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      INSERT INTO institutions (id, name, acronym)
      VALUES ('inst-uesr', 'Unidad Educativa San Rafael', 'UESR');

      INSERT INTO case_files (id, institution_id, code)
      VALUES ('case-01', 'inst-uesr', 'UESR-1801234567-2025-01');
    `);
  });

  it("previsualiza el número de citación correctamente sin consumir la secuencia", () => {
    const preview1 = previewNextCitationNumber(
      { institutionId: instId, schoolYearText: "2025/2026" },
      db
    );
    expect(preview1.citationNumber).toBe("CIT-UESR-2025/2026-001");
    expect(preview1.sequenceNumber).toBe(1);

    // Segundo preview no debe incrementar
    const preview2 = previewNextCitationNumber(
      { institutionId: instId, schoolYearText: "2025/2026" },
      db
    );
    expect(preview2.citationNumber).toBe("CIT-UESR-2025/2026-001");
    expect(preview2.sequenceNumber).toBe(1);
  });

  it("asigna números correlativos atómicos consecutivos", () => {
    const assign1 = assignNextCitationNumber(
      { institutionId: instId, schoolYearText: "2025/2026" },
      db
    );
    const assign2 = assignNextCitationNumber(
      { institutionId: instId, schoolYearText: "2025/2026" },
      db
    );

    expect(assign1.citationNumber).toBe("CIT-UESR-2025/2026-001");
    expect(assign1.sequenceNumber).toBe(1);

    expect(assign2.citationNumber).toBe("CIT-UESR-2025/2026-002");
    expect(assign2.sequenceNumber).toBe(2);
  });

  it("reinicia la secuencia de citación en un año lectivo diferente", () => {
    assignNextCitationNumber({ institutionId: instId, schoolYearText: "2025/2026" }, db);
    assignNextCitationNumber({ institutionId: instId, schoolYearText: "2025/2026" }, db);

    const nextYear = assignNextCitationNumber(
      { institutionId: instId, schoolYearText: "2026/2027" },
      db
    );
    expect(nextYear.citationNumber).toBe("CIT-UESR-2026/2027-001");
    expect(nextYear.sequenceNumber).toBe(1);
  });

  it("crea una esquela fuera de caso sin requerir caseFileId", () => {
    const esquela = createEsquela(
      {
        institutionId: instId,
        studentName: "Carlos Pérez",
        studentIdNumber: "1801112233",
        course: "Décimo EGB",
        parallel: "A",
        representativeName: "Rosa Pérez",
        representativePhone: "0991234567",
        citationDate: "2026-09-15",
        citationTime: "08:30",
        citationReason: "Dificultades académicas y comportamentales",
        professionalName: "Lic. Marlon Jácome",
        schoolYearText: "2025/2026",
      },
      db
    );

    expect(esquela.id).toBeDefined();
    expect(esquela.citation_number).toBe("CIT-UESR-2025/2026-001");
    expect(esquela.case_file_id).toBeNull();
    expect(esquela.talon_returned).toBe(0);
    expect(esquela.talon_attended).toBe(0);

    const fetched = getEsquelaById(esquela.id, instId, db);
    expect(fetched?.student_name).toBe("Carlos Pérez");
  });

  it("crea una esquela dentro de un caso y registra automáticamente la acción en case_actions", () => {
    const esquela = createEsquela(
      {
        institutionId: instId,
        caseFileId: "case-01",
        studentName: "Ana López",
        representativeName: "Pedro López",
        citationDate: "2026-09-18",
        citationTime: "10:00",
        citationReason: "Seguimiento psicopedagógico del caso",
        professionalName: "Lic. Marlon Jácome",
        professionalId: "user-01",
        schoolYearText: "2025/2026",
      },
      db
    );

    expect(esquela.case_file_id).toBe("case-01");
    expect(esquela.citation_number).toBe("CIT-UESR-2025/2026-001");

    // Verificar inserción en case_actions
    const action = db
      .prepare("SELECT * FROM case_actions WHERE case_file_id = ?")
      .get("case-01") as any;

    expect(action).toBeDefined();
    expect(action.type).toBe("Esquela de citación");
    expect(action.intervention_type).toBe("FAMILIAR");
    expect(action.description).toContain("CIT-UESR-2025/2026-001");
    expect(action.description).toContain("Pedro López");
  });

  it("actualiza el estado del talón permitiendo que lo reciba el estudiante u otro familiar", () => {
    const esquela = createEsquela(
      {
        institutionId: instId,
        studentName: "Ana López",
        representativeName: "Pedro López",
        citationDate: "2026-09-18",
        citationTime: "10:00",
        citationReason: "Seguimiento",
        professionalName: "Lic. Marlon Jácome",
        schoolYearText: "2025/2026",
      },
      db
    );

    // Registro de talón recibido en mano por el estudiante
    const updated = updateTalonStatus(
      esquela.id,
      instId,
      {
        talonReturned: true,
        receivedByName: "Ana López",
        receivedByRelation: "Estudiante",
        receivedByIdNumber: "1801234567",
        receivedDate: "2026-09-11",
        talonAttended: 1, // Asistió a la cita
        talonNotes: "El representante asistió puntualmente a la convocatoria.",
      },
      db
    );

    expect(updated.talon_returned).toBe(1);
    expect(updated.received_by_name).toBe("Ana López");
    expect(updated.received_by_relation).toBe("Estudiante");
    expect(updated.talon_attended).toBe(1);
  });

  it("lista esquelas filtradas por caso y por institución", () => {
    createEsquela(
      {
        institutionId: instId,
        caseFileId: "case-01",
        studentName: "Estudiante 1",
        representativeName: "Rep 1",
        citationDate: "2026-09-12",
        citationTime: "08:00",
        citationReason: "Motivo 1",
        professionalName: "Prof 1",
        schoolYearText: "2025/2026",
      },
      db
    );

    createEsquela(
      {
        institutionId: instId,
        caseFileId: null,
        studentName: "Estudiante Fuera",
        representativeName: "Rep 2",
        citationDate: "2026-09-13",
        citationTime: "09:00",
        citationReason: "Motivo 2",
        professionalName: "Prof 1",
        schoolYearText: "2025/2026",
      },
      db
    );

    const caseList = listEsquelasByCase("case-01", instId, db);
    expect(caseList.length).toBe(1);
    expect(caseList[0].student_name).toBe("Estudiante 1");

    const allList = listEsquelas(instId, {}, db);
    expect(allList.length).toBe(2);

    const outsideList = listEsquelas(instId, { scope: "FUERA_CASO" }, db);
    expect(outsideList.length).toBe(1);
    expect(outsideList[0].student_name).toBe("Estudiante Fuera");
  });

  it("elimina una esquela sin decrementar la secuencia para proteger la trazabilidad", () => {
    const esq = createEsquela(
      {
        institutionId: instId,
        studentName: "Estudiante X",
        representativeName: "Rep X",
        citationDate: "2026-09-14",
        citationTime: "11:00",
        citationReason: "Motivo X",
        professionalName: "Prof 1",
        schoolYearText: "2025/2026",
      },
      db
    );
    expect(esq.citation_number).toBe("CIT-UESR-2025/2026-001");

    deleteEsquela(esq.id, instId, db);
    expect(getEsquelaById(esq.id, instId, db)).toBeUndefined();

    // Siguiente esquela debe ser 002, nunca reciclar el 001
    const nextEsq = createEsquela(
      {
        institutionId: instId,
        studentName: "Estudiante Y",
        representativeName: "Rep Y",
        citationDate: "2026-09-15",
        citationTime: "12:00",
        citationReason: "Motivo Y",
        professionalName: "Prof 1",
        schoolYearText: "2025/2026",
      },
      db
    );
    expect(nextEsq.citation_number).toBe("CIT-UESR-2025/2026-002");
  });
});
