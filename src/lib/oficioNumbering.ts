/**
 * Numeración consecutiva de OFICIOS institucionales del DECE.
 *
 * En la práctica real del departamento se llevan DOS libros de registro
 * distintos: el de "informes técnicos" y el de "oficios enviados"
 * (correspondencia saliente). Por eso este contador es INDEPENDIENTE del de
 * `reportNumbering.ts`: usa su propia tabla `oficio_sequences` y su propio log
 * inmutable `oficios_issued`, y nunca toca `dece_report_sequences` ni
 * `dece_issued_reports`.
 *
 * Lo único que se comparte es el FORMATO del número, reusando los helpers
 * puros de `reportNumberingShared.ts`, de modo que un oficio y un informe se
 * ven estructuralmente idénticos:
 *   Mineduc-CZ3-18D02-UESR-DECE-MJ-2025/2026-032
 */

import { randomUUID } from "crypto";
import type Database from "better-sqlite3";
import { buildReportNumberString, getReportConfigParts } from "./reportNumberingShared";
import { db as defaultDb } from "./db";

function getDb(dbInstance?: Database.Database): Database.Database {
  return dbInstance || defaultDb;
}

export interface OficioNumberAssignment {
  oficioNumber: string;
  sequenceNumber: number;
  schoolYearCode: string;
}

interface OficioNumberParams {
  institutionId: string;
  userId?: string | null;
  userName?: string | null;
  professionalCode?: string | null;
  schoolYearText?: string | null;
}

function resolveUserParam(params: OficioNumberParams) {
  if (params.userId) return params.userId;
  if (params.userName || params.professionalCode) {
    return { name: params.userName, professional_code: params.professionalCode };
  }
  return null;
}

/**
 * Previsualiza el siguiente número de oficio SIN consumir la secuencia.
 * Se muestra en el formulario antes de guardar.
 */
export function previewNextOficioNumber(
  params: OficioNumberParams,
  dbInstance?: Database.Database
): OficioNumberAssignment {
  const resolvedDb = getDb(dbInstance);
  const config = getReportConfigParts(
    resolvedDb,
    params.institutionId,
    resolveUserParam(params),
    params.schoolYearText
  );

  const seqRow = resolvedDb
    .prepare(
      "SELECT last_number FROM oficio_sequences WHERE institution_id = ? AND school_year_code = ?"
    )
    .get(params.institutionId, config.schoolYearCode) as { last_number: number } | undefined;

  const nextSequence = (seqRow?.last_number || 0) + 1;

  return {
    oficioNumber: buildReportNumberString({
      mineduc: config.mineducCode,
      zone: config.zoneCode,
      district: config.districtCode,
      institution: config.institutionCode,
      dece: config.deceCode,
      professional: config.professionalCode,
      schoolYear: config.schoolYearCode,
      sequence: nextSequence,
    }),
    sequenceNumber: nextSequence,
    schoolYearCode: config.schoolYearCode,
  };
}

/**
 * Asigna atómicamente el siguiente consecutivo de oficio dentro de una
 * transacción. Garantiza:
 * 1. Concurrencia segura: dos usuarios guardando a la vez no reciben el mismo número.
 * 2. Unicidad estricta por institución y año lectivo (reinicio anual desde 001).
 * 3. No reutilización: eliminar un oficio jamás hace retroceder el contador.
 * 4. Registro inmutable en `oficios_issued`.
 * 5. Independencia total del contador de informes (`dece_report_sequences`).
 */
export function assignNextOficioNumber(
  params: OficioNumberParams & {
    oficioType?: string | null;
    recordId?: string | null;
    caseFileId?: string | null;
  },
  dbInstance?: Database.Database
): OficioNumberAssignment {
  const resolvedDb = getDb(dbInstance);
  const config = getReportConfigParts(
    resolvedDb,
    params.institutionId,
    resolveUserParam(params),
    params.schoolYearText
  );

  const executeAssignment = resolvedDb.transaction(() => {
    // 1. Asegura o incrementa la secuencia de oficios atómicamente
    resolvedDb
      .prepare(
        `INSERT INTO oficio_sequences (institution_id, school_year_code, last_number, updated_at)
         VALUES (?, ?, 1, datetime('now'))
         ON CONFLICT(institution_id, school_year_code) DO UPDATE SET
           last_number = oficio_sequences.last_number + 1,
           updated_at = datetime('now')`
      )
      .run(params.institutionId, config.schoolYearCode);

    // 2. Obtiene el consecutivo asignado
    const updatedSeq = resolvedDb
      .prepare(
        "SELECT last_number FROM oficio_sequences WHERE institution_id = ? AND school_year_code = ?"
      )
      .get(params.institutionId, config.schoolYearCode) as { last_number: number };

    const assignedSeq = updatedSeq.last_number;

    const oficioNumber = buildReportNumberString({
      mineduc: config.mineducCode,
      zone: config.zoneCode,
      district: config.districtCode,
      institution: config.institutionCode,
      dece: config.deceCode,
      professional: config.professionalCode,
      schoolYear: config.schoolYearCode,
      sequence: assignedSeq,
    });

    // 3. Registra en el log inmutable de oficios emitidos
    resolvedDb
      .prepare(
        `INSERT INTO oficios_issued (
           id, institution_id, school_year_code, sequence_number, oficio_number,
           oficio_type, record_id, case_file_id, professional_id, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .run(
        randomUUID(),
        params.institutionId,
        config.schoolYearCode,
        assignedSeq,
        oficioNumber,
        params.oficioType || "OTRO",
        params.recordId || null,
        params.caseFileId || null,
        params.userId || null
      );

    return {
      oficioNumber,
      sequenceNumber: assignedSeq,
      schoolYearCode: config.schoolYearCode,
    };
  });

  return executeAssignment();
}
