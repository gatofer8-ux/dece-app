import { randomUUID } from "crypto";
import type Database from "better-sqlite3";
import { db as defaultDb } from "./db";
import type { DeceEsquelaRow, InstitutionRow } from "./types";
import { formatInstitutionAcronym, normalizeSchoolYearCode } from "./reportNumberingShared";

function getDb(dbInstance?: Database.Database): Database.Database {
  return dbInstance || defaultDb;
}

export function buildCitationNumberString(opts: {
  institutionAcronym: string;
  schoolYear: string;
  sequence: number;
}): string {
  const seqPad = String(opts.sequence).padStart(3, "0");
  return `CIT-${opts.institutionAcronym}-${opts.schoolYear}-${seqPad}`;
}

/**
 * Previsualiza el siguiente número de citación institucional (sin incrementar la secuencia).
 */
export function previewNextCitationNumber(
  params: {
    institutionId: string;
    schoolYearText?: string | null;
  },
  dbInstance?: Database.Database
): { citationNumber: string; sequenceNumber: number; schoolYearCode: string } {
  const resolvedDb = getDb(dbInstance);
  const { institutionId, schoolYearText } = params;

  const institution = resolvedDb
    .prepare("SELECT * FROM institutions WHERE id = ?")
    .get(institutionId) as InstitutionRow | undefined;

  const instAcronym = formatInstitutionAcronym(institution?.name, institution?.acronym);
  const schoolYearCode = normalizeSchoolYearCode(schoolYearText);

  const seqRow = resolvedDb
    .prepare(
      "SELECT last_number FROM dece_citation_sequences WHERE institution_id = ? AND school_year_code = ?"
    )
    .get(institutionId, schoolYearCode) as { last_number: number } | undefined;

  const nextSeq = (seqRow?.last_number || 0) + 1;
  const citationNumber = buildCitationNumberString({
    institutionAcronym: instAcronym,
    schoolYear: schoolYearCode,
    sequence: nextSeq,
  });

  return {
    citationNumber,
    sequenceNumber: nextSeq,
    schoolYearCode,
  };
}

/**
 * Asigna atómicamente el siguiente número consecutivo de citación dentro de una transacción.
 */
export function assignNextCitationNumber(
  params: {
    institutionId: string;
    schoolYearText?: string | null;
  },
  dbInstance?: Database.Database
): { citationNumber: string; sequenceNumber: number; schoolYearCode: string } {
  const resolvedDb = getDb(dbInstance);
  const { institutionId, schoolYearText } = params;

  const institution = resolvedDb
    .prepare("SELECT * FROM institutions WHERE id = ?")
    .get(institutionId) as InstitutionRow | undefined;

  const instAcronym = formatInstitutionAcronym(institution?.name, institution?.acronym);
  const schoolYearCode = normalizeSchoolYearCode(schoolYearText);

  const executeAssignment = resolvedDb.transaction(() => {
    resolvedDb
      .prepare(
        `INSERT INTO dece_citation_sequences (institution_id, school_year_code, last_number, updated_at)
         VALUES (?, ?, 1, datetime('now'))
         ON CONFLICT(institution_id, school_year_code) DO UPDATE SET
           last_number = dece_citation_sequences.last_number + 1,
           updated_at = datetime('now')`
      )
      .run(institutionId, schoolYearCode);

    const updatedSeq = resolvedDb
      .prepare(
        "SELECT last_number FROM dece_citation_sequences WHERE institution_id = ? AND school_year_code = ?"
      )
      .get(institutionId, schoolYearCode) as { last_number: number };

    const assignedSeq = updatedSeq.last_number;
    const citationNumber = buildCitationNumberString({
      institutionAcronym: instAcronym,
      schoolYear: schoolYearCode,
      sequence: assignedSeq,
    });

    return {
      citationNumber,
      sequenceNumber: assignedSeq,
      schoolYearCode,
    };
  });

  return executeAssignment();
}

export interface CreateEsquelaInput {
  institutionId: string;
  caseFileId?: string | null;
  studentId?: string | null;
  studentName: string;
  studentIdNumber?: string | null;
  course?: string | null;
  parallel?: string | null;
  jornada?: string | null;
  representativeName: string;
  representativeIdNumber?: string | null;
  representativePhone?: string | null;
  citationDate: string;
  citationTime: string;
  citationPlace?: string | null;
  citationReason: string;
  urgencyLevel?: "ORDINARIA" | "URGENTE";
  professionalId?: string | null;
  professionalName: string;
  professionalRole?: string | null;
  observations?: string | null;
  schoolYearText?: string | null;
}

/**
 * Crea una nueva esquela de citación.
 * Si está vinculada a un caso (caseFileId), añade un registro en case_actions para
 * que conste en el expediente y reinicie la alerta de seguimiento.
 */
export function createEsquela(
  input: CreateEsquelaInput,
  dbInstance?: Database.Database
): DeceEsquelaRow {
  const resolvedDb = getDb(dbInstance);
  const { citationNumber, sequenceNumber, schoolYearCode } = assignNextCitationNumber(
    {
      institutionId: input.institutionId,
      schoolYearText: input.schoolYearText,
    },
    resolvedDb
  );

  const id = randomUUID();
  const urgency = input.urgencyLevel === "URGENTE" ? "URGENTE" : "ORDINARIA";
  const place = input.citationPlace?.trim() || "Oficina del DECE";
  const role = input.professionalRole?.trim() || "Profesional DECE";

  const runInsert = resolvedDb.transaction(() => {
    resolvedDb
      .prepare(
        `INSERT INTO dece_esquelas (
           id, institution_id, citation_number, sequence_number, school_year_code,
           case_file_id, student_id, student_name, student_id_number, course, parallel, jornada,
           representative_name, representative_id_number, representative_phone,
           citation_date, citation_time, citation_place, citation_reason, urgency_level,
           professional_id, professional_name, professional_role, observations,
           talon_returned, talon_attended, created_at, updated_at
         ) VALUES (
           ?, ?, ?, ?, ?,
           ?, ?, ?, ?, ?, ?, ?,
           ?, ?, ?,
           ?, ?, ?, ?, ?,
           ?, ?, ?, ?,
           0, 0, datetime('now'), datetime('now')
         )`
      )
      .run(
        id,
        input.institutionId,
        citationNumber,
        sequenceNumber,
        schoolYearCode,
        input.caseFileId || null,
        input.studentId || null,
        input.studentName.trim(),
        input.studentIdNumber?.trim() || null,
        input.course?.trim() || null,
        input.parallel?.trim() || null,
        input.jornada?.trim() || null,
        input.representativeName.trim(),
        input.representativeIdNumber?.trim() || null,
        input.representativePhone?.trim() || null,
        input.citationDate,
        input.citationTime,
        place,
        input.citationReason.trim(),
        urgency,
        input.professionalId || null,
        input.professionalName.trim(),
        role,
        input.observations?.trim() || null
      );

    // Si tiene expediente de caso, se asienta la acción en la bitácora del caso
    if (input.caseFileId) {
      try {
        const actionId = randomUUID();
        const actionDesc = `Emisión de Esquela de Citación N° ${citationNumber} para el representante ${input.representativeName.trim()} (Cita programada: ${input.citationDate} a las ${input.citationTime} en ${place}). Motivo: ${input.citationReason.trim()}`;
        resolvedDb
          .prepare(
            `INSERT INTO case_actions (id, case_file_id, author_id, date, type, description, intervention_type, observations)
             VALUES (?, ?, ?, ?, 'Esquela de citación', ?, 'FAMILIAR', ?)`
          )
          .run(
            actionId,
            input.caseFileId,
            input.professionalId || null,
            input.citationDate,
            actionDesc,
            `Citación formal ${urgency}`
          );
      } catch {
        // Ignora si falla la inserción en bitácora para no bloquear la esquela
      }
    }

    return resolvedDb
      .prepare("SELECT * FROM dece_esquelas WHERE id = ?")
      .get(id) as DeceEsquelaRow;
  });

  return runInsert();
}

/**
 * Obtiene una esquela por ID
 */
export function getEsquelaById(
  id: string,
  institutionId: string,
  dbInstance?: Database.Database
): DeceEsquelaRow | undefined {
  const resolvedDb = getDb(dbInstance);
  return resolvedDb
    .prepare("SELECT * FROM dece_esquelas WHERE id = ? AND institution_id = ?")
    .get(id, institutionId) as DeceEsquelaRow | undefined;
}

/**
 * Lista esquelas por caso
 */
export function listEsquelasByCase(
  caseFileId: string,
  institutionId: string,
  dbInstance?: Database.Database
): DeceEsquelaRow[] {
  const resolvedDb = getDb(dbInstance);
  return resolvedDb
    .prepare(
      `SELECT * FROM dece_esquelas
       WHERE case_file_id = ? AND institution_id = ?
       ORDER BY citation_date DESC, sequence_number DESC`
    )
    .all(caseFileId, institutionId) as DeceEsquelaRow[];
}

/**
 * Lista general de esquelas con filtros
 */
export function listEsquelas(
  institutionId: string,
  filters?: {
    caseFileId?: string | null;
    studentId?: string | null;
    statusTalon?: string | null; // "DEVUELTO" | "PENDIENTE"
    statusAttended?: string | null; // "ASISTIO" | "PENDIENTE" | "NO_ASISTIO"
    scope?: string | null; // "EN_CASO" | "FUERA_CASO"
    q?: string | null;
  },
  dbInstance?: Database.Database
): DeceEsquelaRow[] {
  const resolvedDb = getDb(dbInstance);
  const conditions: string[] = ["institution_id = ?"];
  const params: unknown[] = [institutionId];

  if (filters?.caseFileId) {
    conditions.push("case_file_id = ?");
    params.push(filters.caseFileId);
  }

  if (filters?.studentId) {
    conditions.push("student_id = ?");
    params.push(filters.studentId);
  }

  if (filters?.scope === "EN_CASO") {
    conditions.push("case_file_id IS NOT NULL");
  } else if (filters?.scope === "FUERA_CASO") {
    conditions.push("case_file_id IS NULL");
  }

  if (filters?.statusTalon === "DEVUELTO") {
    conditions.push("talon_returned = 1");
  } else if (filters?.statusTalon === "PENDIENTE") {
    conditions.push("talon_returned = 0");
  }

  if (filters?.statusAttended === "ASISTIO") {
    conditions.push("talon_attended = 1");
  } else if (filters?.statusAttended === "PENDIENTE") {
    conditions.push("talon_attended = 0");
  } else if (filters?.statusAttended === "NO_ASISTIO") {
    conditions.push("talon_attended IN (2, 3)");
  }

  if (filters?.q && filters.q.trim()) {
    const term = `%${filters.q.trim()}%`;
    conditions.push(
      "(citation_number LIKE ? OR student_name LIKE ? OR representative_name LIKE ? OR course LIKE ?)"
    );
    params.push(term, term, term, term);
  }

  const whereClause = conditions.join(" AND ");
  return resolvedDb
    .prepare(
      `SELECT * FROM dece_esquelas
       WHERE ${whereClause}
       ORDER BY citation_date DESC, created_at DESC
       LIMIT 300`
    )
    .all(...params) as DeceEsquelaRow[];
}

/**
 * Actualiza los datos editables de una esquela (el número es inmutable)
 */
export function updateEsquela(
  id: string,
  institutionId: string,
  data: Partial<CreateEsquelaInput>,
  dbInstance?: Database.Database
): DeceEsquelaRow {
  const resolvedDb = getDb(dbInstance);
  const existing = getEsquelaById(id, institutionId, resolvedDb);
  if (!existing) throw new Error("Esquela no encontrada");

  resolvedDb
    .prepare(
      `UPDATE dece_esquelas SET
         student_name = COALESCE(?, student_name),
         student_id_number = COALESCE(?, student_id_number),
         course = COALESCE(?, course),
         parallel = COALESCE(?, parallel),
         jornada = COALESCE(?, jornada),
         representative_name = COALESCE(?, representative_name),
         representative_id_number = COALESCE(?, representative_id_number),
         representative_phone = COALESCE(?, representative_phone),
         citation_date = COALESCE(?, citation_date),
         citation_time = COALESCE(?, citation_time),
         citation_place = COALESCE(?, citation_place),
         citation_reason = COALESCE(?, citation_reason),
         urgency_level = COALESCE(?, urgency_level),
         professional_name = COALESCE(?, professional_name),
         professional_role = COALESCE(?, professional_role),
         observations = COALESCE(?, observations),
         updated_at = datetime('now')
       WHERE id = ? AND institution_id = ?`
    )
    .run(
      data.studentName?.trim() || null,
      data.studentIdNumber?.trim() || null,
      data.course?.trim() || null,
      data.parallel?.trim() || null,
      data.jornada?.trim() || null,
      data.representativeName?.trim() || null,
      data.representativeIdNumber?.trim() || null,
      data.representativePhone?.trim() || null,
      data.citationDate || null,
      data.citationTime || null,
      data.citationPlace?.trim() || null,
      data.citationReason?.trim() || null,
      data.urgencyLevel || null,
      data.professionalName?.trim() || null,
      data.professionalRole?.trim() || null,
      data.observations?.trim() || null,
      id,
      institutionId
    );

  return getEsquelaById(id, institutionId, resolvedDb)!;
}

/**
 * Actualiza el estado del talón de acuse de recibo y la comparecencia a la cita.
 * Permite registrar si lo recibió el estudiante, el representante u otro familiar.
 */
export function updateTalonStatus(
  id: string,
  institutionId: string,
  data: {
    talonReturned: boolean;
    receivedByName?: string | null;
    receivedByRelation?: string | null;
    receivedByIdNumber?: string | null;
    receivedDate?: string | null;
    talonAttended?: number; // 0=pendiente, 1=asistió, 2=justificó, 3=no asistió injustificado
    talonNotes?: string | null;
    physicalFileRef?: string | null;
    physicalEvidenceUrl?: string | null;
  },
  dbInstance?: Database.Database
): DeceEsquelaRow {
  const resolvedDb = getDb(dbInstance);
  const existing = getEsquelaById(id, institutionId, resolvedDb);
  if (!existing) throw new Error("Esquela no encontrada");

  const runUpdate = resolvedDb.transaction(() => {
    resolvedDb
      .prepare(
        `UPDATE dece_esquelas SET
           talon_returned = ?,
           received_by_name = ?,
           received_by_relation = ?,
           received_by_id_number = ?,
           received_date = ?,
           talon_attended = ?,
           talon_notes = ?,
           physical_file_ref = COALESCE(?, physical_file_ref),
           physical_evidence_url = COALESCE(?, physical_evidence_url),
           updated_at = datetime('now')
         WHERE id = ? AND institution_id = ?`
      )
      .run(
        data.talonReturned ? 1 : 0,
        data.receivedByName?.trim() || null,
        data.receivedByRelation?.trim() || null,
        data.receivedByIdNumber?.trim() || null,
        data.receivedDate || null,
        data.talonAttended ?? 0,
        data.talonNotes?.trim() || null,
        data.physicalFileRef?.trim() || null,
        data.physicalEvidenceUrl || null,
        id,
        institutionId
      );

    // Si asistió a la cita (talonAttended === 1) y tiene caso, registra una acción de entrevista/atención en la bitácora
    if (existing.case_file_id && data.talonAttended === 1 && existing.talon_attended !== 1) {
      try {
        const actionId = randomUUID();
        const actionDesc = `Comparecencia y atención por citación N° ${existing.citation_number}: Asistencia del representante ${existing.representative_name}. ${data.talonNotes?.trim() ? `Detalle: ${data.talonNotes.trim()}` : ""}`;
        resolvedDb
          .prepare(
            `INSERT INTO case_actions (id, case_file_id, author_id, date, type, description, intervention_type, observations)
             VALUES (?, ?, ?, ?, 'Entrevista', ?, 'FAMILIAR', ?)`
          )
          .run(
            actionId,
            existing.case_file_id,
            existing.professional_id || null,
            existing.citation_date,
            actionDesc,
            "Atención a citación formal"
          );
      } catch {
        // Ignorar si falla
      }
    }

    return getEsquelaById(id, institutionId, resolvedDb)!;
  });

  return runUpdate();
}

/**
 * Elimina una esquela. La secuencia nunca retrocede para proteger la integridad.
 */
export function deleteEsquela(
  id: string,
  institutionId: string,
  dbInstance?: Database.Database
): void {
  const resolvedDb = getDb(dbInstance);
  resolvedDb
    .prepare("DELETE FROM dece_esquelas WHERE id = ? AND institution_id = ?")
    .run(id, institutionId);
}
