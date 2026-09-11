import type Database from "better-sqlite3";
import { db as defaultDb } from "./db";
import type { CaseFileRow, StudentRow } from "./types";

function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.slice(0, 10).split("-").map(Number);
  if (parts.length === 3 && !parts.some(isNaN)) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getDb(dbInstance?: Database.Database): Database.Database {
  return dbInstance || defaultDb;
}

export interface InactiveCaseItem {
  id: string;
  code: string;
  legacy_code: string | null;
  status: string;
  priority: string;
  risk_type: string;
  detection_date: string;
  student_id: string;
  student_name: string;
  student_course: string | null;
  student_parallel: string | null;
  representative_name: string | null;
  representative_phone: string | null;
  last_conversation_date: string;
  last_conversation_type: string;
  days_without_conversation: number;
  last_action_date: string | null;
  days_without_action: number;
  is_urgent_alert: boolean; // >= 45 días
}

export interface InactivitySummary {
  totalOpenCases: number;
  alertCasesCount: number;
  urgentAlertCasesCount: number;
  cases: InactiveCaseItem[];
}

/**
 * Lista de tipos de acciones en bitácora consideradas diálogo o contacto directo
 * con el estudiante o su representante legal.
 */
export const CONVERSATION_ACTION_TYPES = [
  "Entrevista",
  "Comunicación con representante",
  "Llamada telefónica",
  "Visita domiciliaria",
  "Acta de compromiso y corresponsabilidad",
  "Cita agendada",
  "Esquela de citación",
];

/**
 * Obtiene el reporte y lista de casos sin contacto directo con el estudiante
 * o representante en más de un mes (> 30 días).
 */
export function getInactiveCases(
  institutionId: string,
  thresholdDays: number = 30,
  dbInstance?: Database.Database
): InactivitySummary {
  const resolvedDb = getDb(dbInstance);

  // Consulta todos los casos abiertos de la institución con sus estudiantes
  const openCases = resolvedDb
    .prepare(
      `SELECT cf.*, s.full_name as student_name, s.course as student_course,
              s.parallel as student_parallel,
              s.representative as representative_name,
              s.rep_phone as representative_phone
       FROM case_files cf
       LEFT JOIN students s ON s.id = cf.student_id
       WHERE cf.institution_id = ? AND cf.status != 'CERRADO'`
    )
    .all(institutionId) as (CaseFileRow & {
      student_name: string;
      student_course: string | null;
      student_parallel: string | null;
      representative_name: string | null;
      representative_phone: string | null;
    })[];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parsedItems: InactiveCaseItem[] = [];

  const conversationPlaceholders = CONVERSATION_ACTION_TYPES.map(() => "?").join(", ");

  const stmtConvAction = resolvedDb.prepare(
    `SELECT date, type FROM case_actions
     WHERE case_file_id = ? AND type IN (${conversationPlaceholders})
     ORDER BY date DESC, created_at DESC LIMIT 1`
  );

  const stmtInterview = resolvedDb.prepare(
    `SELECT application_date FROM case_interviews
     WHERE case_file_id = ? AND application_date IS NOT NULL
     ORDER BY application_date DESC LIMIT 1`
  );

  let stmtEsquela: Database.Statement | null = null;
  try {
    stmtEsquela = resolvedDb.prepare(
      `SELECT citation_date FROM dece_esquelas
       WHERE case_file_id = ?
       ORDER BY citation_date DESC LIMIT 1`
    );
  } catch {
    // Si la tabla dece_esquelas aún no está disponible
  }

  const stmtLastAnyAction = resolvedDb.prepare(
    `SELECT date FROM case_actions
     WHERE case_file_id = ?
     ORDER BY date DESC, created_at DESC LIMIT 1`
  );

  for (const cf of openCases) {
    // 1. Buscar última acción de conversación
    const convAction = stmtConvAction.get(cf.id, ...CONVERSATION_ACTION_TYPES) as
      | { date: string; type: string }
      | undefined;
    const interview = stmtInterview.get(cf.id) as { application_date: string } | undefined;
    const esquela = stmtEsquela?.get(cf.id) as { citation_date: string } | undefined;

    // Fechas candidatas para contacto directo
    const contactDates: { date: string; type: string }[] = [];
    if (convAction?.date) contactDates.push({ date: convAction.date.slice(0, 10), type: convAction.type });
    if (interview?.application_date) {
      contactDates.push({ date: interview.application_date.slice(0, 10), type: "Entrevista semiestructurada" });
    }
    if (esquela?.citation_date) {
      contactDates.push({ date: esquela.citation_date.slice(0, 10), type: "Esquela de citación" });
    }

    // Ordenar de más reciente a más antigua
    contactDates.sort((a, b) => b.date.localeCompare(a.date));

    let lastContactDateStr: string;
    let lastContactType: string;

    if (contactDates.length > 0) {
      lastContactDateStr = contactDates[0].date;
      lastContactType = contactDates[0].type;
    } else {
      // Si nunca hubo conversación registrada, se toma la fecha de detección / apertura
      lastContactDateStr = (cf.detection_date || cf.created_at || "").slice(0, 10);
      lastContactType = "Apertura del caso (sin conversaciones posteriores)";
    }

    const lastContactDate = parseLocalDate(lastContactDateStr);
    const diffTime = today.getTime() - (isNaN(lastContactDate.getTime()) ? today.getTime() : lastContactDate.getTime());
    const daysWithoutContact = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));

    // Última acción general (cualquiera)
    const anyAction = stmtLastAnyAction.get(cf.id) as { date: string } | undefined;
    const lastAnyDateStr = (anyAction?.date || cf.detection_date || cf.created_at || "").slice(0, 10);
    const lastAnyDate = parseLocalDate(lastAnyDateStr);
    const diffAny = today.getTime() - (isNaN(lastAnyDate.getTime()) ? today.getTime() : lastAnyDate.getTime());
    const daysWithoutAnyAction = Math.max(0, Math.round(diffAny / (1000 * 60 * 60 * 24)));

    if (daysWithoutContact >= thresholdDays) {
      parsedItems.push({
        id: cf.id,
        code: cf.code,
        legacy_code: cf.legacy_code ?? null,
        status: cf.status,
        priority: cf.priority,
        risk_type: cf.risk_type,
        detection_date: cf.detection_date,
        student_id: cf.student_id,
        student_name: cf.student_name,
        student_course: cf.student_course,
        student_parallel: cf.student_parallel,
        representative_name: cf.representative_name,
        representative_phone: cf.representative_phone,
        last_conversation_date: lastContactDateStr,
        last_conversation_type: lastContactType,
        days_without_conversation: daysWithoutContact,
        last_action_date: lastAnyDateStr,
        days_without_action: daysWithoutAnyAction,
        is_urgent_alert: daysWithoutContact >= 45,
      });
    }
  }

  // Ordenar los casos con más días sin conversación al inicio
  parsedItems.sort((a, b) => b.days_without_conversation - a.days_without_conversation);

  return {
    totalOpenCases: openCases.length,
    alertCasesCount: parsedItems.length,
    urgentAlertCasesCount: parsedItems.filter((i) => i.is_urgent_alert).length,
    cases: parsedItems,
  };
}

/**
 * Evalúa la inactividad de un caso específico para mostrar su banner de advertencia.
 */
export function getCaseInactivityInfo(
  caseFileId: string,
  institutionId: string,
  dbInstance?: Database.Database
): {
  daysWithoutConversation: number;
  lastConversationDate: string;
  lastConversationType: string;
  isAlert: boolean;
  isUrgent: boolean;
} {
  const resolvedDb = getDb(dbInstance);
  const cf = resolvedDb
    .prepare("SELECT * FROM case_files WHERE id = ? AND institution_id = ?")
    .get(caseFileId, institutionId) as CaseFileRow | undefined;

  if (!cf || cf.status === "CERRADO") {
    return {
      daysWithoutConversation: 0,
      lastConversationDate: "",
      lastConversationType: "",
      isAlert: false,
      isUrgent: false,
    };
  }

  const conversationPlaceholders = CONVERSATION_ACTION_TYPES.map(() => "?").join(", ");
  const convAction = resolvedDb
    .prepare(
      `SELECT date, type FROM case_actions
       WHERE case_file_id = ? AND type IN (${conversationPlaceholders})
       ORDER BY date DESC, created_at DESC LIMIT 1`
    )
    .get(caseFileId, ...CONVERSATION_ACTION_TYPES) as { date: string; type: string } | undefined;

  const interview = resolvedDb
    .prepare(
      `SELECT application_date FROM case_interviews
       WHERE case_file_id = ? AND application_date IS NOT NULL
       ORDER BY application_date DESC LIMIT 1`
    )
    .get(caseFileId) as { application_date: string } | undefined;

  let esquela: { citation_date: string } | undefined;
  try {
    esquela = resolvedDb
      .prepare(
        `SELECT citation_date FROM dece_esquelas
         WHERE case_file_id = ?
         ORDER BY citation_date DESC LIMIT 1`
      )
      .get(caseFileId) as { citation_date: string } | undefined;
  } catch {
    // Si la tabla dece_esquelas aún no está disponible
  }

  const contactDates: { date: string; type: string }[] = [];
  if (convAction?.date) contactDates.push({ date: convAction.date.slice(0, 10), type: convAction.type });
  if (interview?.application_date) {
    contactDates.push({ date: interview.application_date.slice(0, 10), type: "Entrevista semiestructurada" });
  }
  if (esquela?.citation_date) {
    contactDates.push({ date: esquela.citation_date.slice(0, 10), type: "Esquela de citación" });
  }

  contactDates.sort((a, b) => b.date.localeCompare(a.date));

  let lastDateStr: string;
  let lastType: string;

  if (contactDates.length > 0) {
    lastDateStr = contactDates[0].date;
    lastType = contactDates[0].type;
  } else {
    lastDateStr = (cf.detection_date || cf.created_at || "").slice(0, 10);
    lastType = "Apertura del caso (sin conversaciones posteriores)";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = parseLocalDate(lastDateStr);
  const diffTime = today.getTime() - (isNaN(targetDate.getTime()) ? today.getTime() : targetDate.getTime());
  const daysWithoutConversation = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));

  return {
    daysWithoutConversation,
    lastConversationDate: lastDateStr,
    lastConversationType: lastType,
    isAlert: daysWithoutConversation >= 30,
    isUrgent: daysWithoutConversation >= 45,
  };
}
