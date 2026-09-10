import { randomUUID } from "crypto";
import type Database from "better-sqlite3";
import type { InstitutionRow, UserRow } from "./types";
import {
  type ReportConfigParts,
  formatZoneCode,
  formatDistrictCode,
  formatInstitutionAcronym,
  getProfessionalReportCode,
  normalizeSchoolYearCode,
  buildReportNumberString,
  getReportConfigParts,
} from "./reportNumberingShared";
import { db as defaultDb } from "./db";

export * from "./reportNumberingShared";

function getDb(dbInstance?: Database.Database): Database.Database {
  return dbInstance || defaultDb;
}


/**
 * Previsualiza el siguiente número de informe que se asignará (sin consumir la secuencia).
 * Visible en el formulario antes de guardar.
 */
export function previewNextReportNumber(
  params: {
    institutionId: string;
    userId?: string | null;
    userName?: string | null;
    professionalCode?: string | null;
    schoolYearText?: string | null;
  },
  dbInstance?: Database.Database
): { reportNumber: string; sequenceNumber: number; schoolYearCode: string } {
  const resolvedDb = getDb(dbInstance);
  const { institutionId, userId, userName, professionalCode, schoolYearText } = params;

  let userParam: { id?: string; name?: string; professional_code?: string | null } | string | null = null;
  if (userId) {
    userParam = userId;
  } else if (userName || professionalCode) {
    userParam = { name: userName || undefined, professional_code: professionalCode };
  }

  const config = getReportConfigParts(resolvedDb, institutionId, userParam, schoolYearText);

  const seqRow = resolvedDb
    .prepare(
      "SELECT last_number FROM dece_report_sequences WHERE institution_id = ? AND school_year_code = ?"
    )
    .get(institutionId, config.schoolYearCode) as { last_number: number } | undefined;

  const nextSequence = (seqRow?.last_number || 0) + 1;

  const reportNumber = buildReportNumberString({
    mineduc: config.mineducCode,
    zone: config.zoneCode,
    district: config.districtCode,
    institution: config.institutionCode,
    dece: config.deceCode,
    professional: config.professionalCode,
    schoolYear: config.schoolYearCode,
    sequence: nextSequence,
  });

  return {
    reportNumber,
    sequenceNumber: nextSequence,
    schoolYearCode: config.schoolYearCode,
  };
}

/**
 * Asigna atómicamente el siguiente número consecutivo de informe dentro de una transacción.
 * Garantiza:
 * 1. Concurrencia segura: dos usuarios guardando al mismo tiempo no reciben el mismo número.
 * 2. Unicidad estricta dentro del año lectivo correspondiente.
 * 3. No reutilización: si se elimina un informe, el contador nunca retrocede.
 * 4. Registro inmutable en dece_issued_reports.
 */
export function assignNextReportNumber(
  params: {
    institutionId: string;
    userId?: string | null;
    userName?: string | null;
    professionalCode?: string | null;
    schoolYearText?: string | null;
    reportType: string;
    recordId?: string | null;
    caseFileId?: string | null;
    studentId?: string | null;
  },
  dbInstance?: Database.Database
): { reportNumber: string; sequenceNumber: number; schoolYearCode: string } {
  const resolvedDb = getDb(dbInstance);
  const {
    institutionId,
    userId,
    userName,
    professionalCode,
    schoolYearText,
    reportType,
    recordId,
    caseFileId,
    studentId,
  } = params;

  let userParam: { id?: string; name?: string | null; professional_code?: string | null } | string | null = null;
  if (userId) {
    userParam = userId;
  } else if (userName || professionalCode) {
    userParam = { name: userName, professional_code: professionalCode };
  }

  const config = getReportConfigParts(resolvedDb, institutionId, userParam, schoolYearText);

  const executeAssignment = resolvedDb.transaction(() => {
    // 1. Asegura o incrementa la secuencia atómicamente
    resolvedDb
      .prepare(
        `INSERT INTO dece_report_sequences (institution_id, school_year_code, last_number, updated_at)
         VALUES (?, ?, 1, datetime('now'))
         ON CONFLICT(institution_id, school_year_code) DO UPDATE SET
           last_number = dece_report_sequences.last_number + 1,
           updated_at = datetime('now')`
      )
      .run(institutionId, config.schoolYearCode);

    // 2. Obtiene el consecutivo asignado
    const updatedSeq = resolvedDb
      .prepare(
        "SELECT last_number FROM dece_report_sequences WHERE institution_id = ? AND school_year_code = ?"
      )
      .get(institutionId, config.schoolYearCode) as { last_number: number };

    const assignedSeq = updatedSeq.last_number;

    const reportNumber = buildReportNumberString({
      mineduc: config.mineducCode,
      zone: config.zoneCode,
      district: config.districtCode,
      institution: config.institutionCode,
      dece: config.deceCode,
      professional: config.professionalCode,
      schoolYear: config.schoolYearCode,
      sequence: assignedSeq,
    });

    // 3. Registra en el log inmutable de informes emitidos
    resolvedDb
      .prepare(
        `INSERT INTO dece_issued_reports (
           id, institution_id, school_year_code, sequence_number, report_number,
           report_type, record_id, case_file_id, student_id, professional_id, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .run(
        randomUUID(),
        institutionId,
        config.schoolYearCode,
        assignedSeq,
        reportNumber,
        reportType,
        recordId || null,
        caseFileId || null,
        studentId || null,
        userId || null
      );

    return {
      reportNumber,
      sequenceNumber: assignedSeq,
      schoolYearCode: config.schoolYearCode,
    };
  });

  return executeAssignment();
}
