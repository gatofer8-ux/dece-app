"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import type { Trimester, CourseBoardReportCaseItem, CourseBoardReportRow } from "@/lib/types";
import {
  generateCourseBoardReportCode,
  getCasesForCourse,
} from "@/lib/juntasCurso";
import {
  draftCourseBoardCaseRecommendations,
  draftCourseBoardConclusions,
} from "@/lib/ai";

export async function saveCourseBoardReportAction(data: {
  id?: string;
  schoolYearId: string;
  schoolYearText: string;
  trimester: Trimester;
  course: string;
  parallel: string;
  jornada: string;
  reportDate: string;
  userRoleLabel: string;
  userContact?: string;
  userEmail?: string;
  userExtension?: string;
  tutorName: string;
  tutorRoleLabel?: string;
  tutorContact?: string;
  tutorEmail?: string;
  tutorExtension?: string;
  reportCode?: string;
  antecedentes: string;
  alcance: string;
  objetivo: string;
  cases: CourseBoardReportCaseItem[];
  generalActions?: string;
  conclusiones: string;
  recomendaciones: string;
  signaturesJson?: string;
  signatureType?: string;
  physicalFileRef?: string;
  physicalEvidenceUrl?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const session = await requireRole(["ADMIN", "DECE"]);
    const institutionId = requireInstitutionId(session);

    const institution = db
      .prepare("SELECT name FROM institutions WHERE id = ?")
      .get(institutionId) as { name: string } | undefined;

    let id = data.id;
    const isNew = !id;
    if (!id) {
      id = randomUUID();
    }

    const reportCode =
      data.reportCode?.trim() ||
      generateCourseBoardReportCode({
        institutionId,
        institutionName: institution?.name,
        schoolYearText: data.schoolYearText,
        trimester: data.trimester,
        userName: session.user.name || "Profesional DECE",
        course: data.course,
        parallel: data.parallel,
        jornada: data.jornada,
      });

    const casesJson = JSON.stringify(data.cases || []);

    if (isNew) {
      db.prepare(
        `INSERT INTO course_board_reports (
          id, institution_id, school_year_id, school_year_text,
          user_id, user_name, user_role_label, user_contact, user_email, user_extension,
          tutor_name, tutor_role_label, tutor_contact, tutor_email, tutor_extension,
          report_code, trimester, course, parallel, jornada, report_date,
          antecedentes, alcance, objetivo, cases_json, general_actions,
          conclusiones, recomendaciones,
          signatures_json, signature_type, physical_file_ref, physical_evidence_url,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?,
          ?, ?, ?, ?,
          datetime('now'), datetime('now')
        )`
      ).run(
        id,
        institutionId,
        data.schoolYearId,
        data.schoolYearText,
        session.user.id,
        session.user.name,
        data.userRoleLabel || "ANALISTA DECE",
        data.userContact || null,
        data.userEmail || session.user.email || null,
        data.userExtension || null,
        data.tutorName,
        data.tutorRoleLabel || "DOCENTE TUTOR",
        data.tutorContact || null,
        data.tutorEmail || null,
        data.tutorExtension || null,
        reportCode,
        data.trimester,
        data.course,
        data.parallel,
        data.jornada || "MATUTINA",
        data.reportDate,
        data.antecedentes,
        data.alcance,
        data.objetivo,
        casesJson,
        data.generalActions || null,
        data.conclusiones,
        data.recomendaciones,
        data.signaturesJson || null,
        data.signatureType || "MANUSCRITA",
        data.physicalFileRef?.trim() || null,
        data.physicalEvidenceUrl || null
      );
    } else {
      db.prepare(
        `UPDATE course_board_reports SET
          school_year_id = ?,
          school_year_text = ?,
          user_role_label = ?,
          user_contact = ?,
          user_email = ?,
          user_extension = ?,
          tutor_name = ?,
          tutor_role_label = ?,
          tutor_contact = ?,
          tutor_email = ?,
          tutor_extension = ?,
          report_code = ?,
          trimester = ?,
          course = ?,
          parallel = ?,
          jornada = ?,
          report_date = ?,
          antecedentes = ?,
          alcance = ?,
          objetivo = ?,
          cases_json = ?,
          general_actions = ?,
          conclusiones = ?,
          recomendaciones = ?,
          signatures_json = ?,
          signature_type = ?,
          physical_file_ref = ?,
          physical_evidence_url = ?,
          updated_at = datetime('now')
        WHERE id = ? AND institution_id = ?`
      ).run(
        data.schoolYearId,
        data.schoolYearText,
        data.userRoleLabel || "ANALISTA DECE",
        data.userContact || null,
        data.userEmail || null,
        data.userExtension || null,
        data.tutorName,
        data.tutorRoleLabel || "DOCENTE TUTOR",
        data.tutorContact || null,
        data.tutorEmail || null,
        data.tutorExtension || null,
        reportCode,
        data.trimester,
        data.course,
        data.parallel,
        data.jornada || "MATUTINA",
        data.reportDate,
        data.antecedentes,
        data.alcance,
        data.objetivo,
        casesJson,
        data.generalActions || null,
        data.conclusiones,
        data.recomendaciones,
        data.signaturesJson || null,
        data.signatureType || "MANUSCRITA",
        data.physicalFileRef?.trim() || null,
        data.physicalEvidenceUrl || null,
        id,
        institutionId
      );
    }

    revalidatePath("/juntas-curso");
    revalidatePath(`/juntas-curso/${id}`);
    revalidatePath(`/juntas-curso/${id}/imprimir`);

    return { success: true, id };
  } catch (err: any) {
    console.error("[saveCourseBoardReportAction] Error:", err);
    return { success: false, error: err?.message || "Error al guardar el informe." };
  }
}

export async function deleteCourseBoardReportAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireRole(["ADMIN", "DECE"]);
    const institutionId = requireInstitutionId(session);

    const report = db
      .prepare("SELECT * FROM course_board_reports WHERE id = ? AND institution_id = ?")
      .get(id, institutionId) as CourseBoardReportRow | undefined;

    if (!report) {
      return { success: false, error: "Informe no encontrado o no autorizado." };
    }

    // Si es analista, verificar que sea su informe
    if (session.user.role === "DECE" && report.user_id !== session.user.id) {
      return { success: false, error: "No tienes permiso para eliminar este informe." };
    }

    db.prepare("DELETE FROM course_board_reports WHERE id = ? AND institution_id = ?").run(
      id,
      institutionId
    );

    revalidatePath("/juntas-curso");
    return { success: true };
  } catch (err: any) {
    console.error("[deleteCourseBoardReportAction] Error:", err);
    return { success: false, error: err?.message || "Error al eliminar el informe." };
  }
}

export async function fetchCasesForCourseAction(
  course: string,
  parallel?: string,
  jornada?: string
): Promise<{ cases: CourseBoardReportCaseItem[]; error?: string }> {
  try {
    const session = await requireRole(["ADMIN", "DECE"]);
    const institutionId = requireInstitutionId(session);

    const cases = getCasesForCourse(institutionId, course, parallel, jornada);
    return { cases };
  } catch (err: any) {
    console.error("[fetchCasesForCourseAction] Error:", err);
    return { cases: [], error: err?.message || "Error al consultar los casos." };
  }
}

export async function getCourseDetailsAndCasesAction(opts: {
  schoolYearText: string;
  trimester: Trimester;
  course: string;
  parallel: string;
  jornada: string;
}): Promise<{
  reportCode: string;
  cases: CourseBoardReportCaseItem[];
  tutorName?: string | null;
  error?: string;
}> {
  try {
    const session = await requireRole(["ADMIN", "DECE"]);
    const institutionId = requireInstitutionId(session);

    const institution = db
      .prepare("SELECT name FROM institutions WHERE id = ?")
      .get(institutionId) as { name: string } | undefined;

    const reportCode = generateCourseBoardReportCode({
      institutionId,
      institutionName: institution?.name,
      schoolYearText: opts.schoolYearText,
      trimester: opts.trimester,
      userName: session.user.name || "Profesional DECE",
      course: opts.course,
      parallel: opts.parallel,
      jornada: opts.jornada,
    });

    const cases = getCasesForCourse(institutionId, opts.course, opts.parallel, opts.jornada);

    let tutorName: string | null = null;
    try {
      const quotaRow = db
        .prepare(
          `SELECT tutor_name FROM institution_course_quotas 
           WHERE institution_id = ? 
             AND LOWER(TRIM(course)) = LOWER(TRIM(?)) 
             AND (parallel IS NULL OR LOWER(TRIM(parallel)) = LOWER(TRIM(?))) 
             AND tutor_name IS NOT NULL 
             AND TRIM(tutor_name) != '' 
           LIMIT 1`
        )
        .get(institutionId, opts.course, opts.parallel) as { tutor_name: string } | undefined;
      if (quotaRow?.tutor_name) {
        tutorName = quotaRow.tutor_name;
      }
    } catch {}

    return {
      reportCode,
      cases,
      tutorName,
    };
  } catch (err: any) {
    console.error("[getCourseDetailsAndCasesAction] Error:", err);
    return {
      reportCode: "",
      cases: [],
      error: err?.message || "Error al obtener datos del curso.",
    };
  }
}

export async function generateCaseRecommendationsAiAction(opts: {
  studentName: string;
  course: string;
  problematic: string;
  actionsTaken: string;
  currentRecommendations?: {
    coordination?: string;
    academic?: string;
    climate?: string;
    protocols?: string;
  };
}) {
  try {
    await requireRole(["ADMIN", "DECE"]);
    const res = await draftCourseBoardCaseRecommendations(opts);
    return res;
  } catch (err: any) {
    console.error("[generateCaseRecommendationsAiAction] Error:", err);
    return { error: err?.message || "Error al generar recomendaciones con IA." };
  }
}

export async function generateConclusionsAiAction(opts: {
  course: string;
  parallel: string;
  trimesterLabel: string;
  casesSummary: string;
  generalActions?: string;
}) {
  try {
    await requireRole(["ADMIN", "DECE"]);
    const res = await draftCourseBoardConclusions(opts);
    return res;
  } catch (err: any) {
    console.error("[generateConclusionsAiAction] Error:", err);
    return { error: err?.message || "Error al generar conclusiones con IA." };
  }
}

/* ------------------------------------------------------------------------- */
/* Formato E.D1.C2.DE3 (Reporte para Juntas de Grado/Curso)                  */
/* ------------------------------------------------------------------------- */

const DE3 = "REPORTE_DE3";

function cleanText(v: unknown, max = 8000): string {
  return typeof v === "string" ? v.replace(/\r/g, "").slice(0, max).trim() : "";
}

function cleanCases(cases: CourseBoardReportCaseItem[]): CourseBoardReportCaseItem[] {
  return (Array.isArray(cases) ? cases : []).slice(0, 80).map((c) => ({
    id: cleanText(c?.id, 64) || randomUUID(),
    student_name: cleanText(c?.student_name, 200),
    student_id: cleanText(c?.student_id, 64) || undefined,
    case_id: cleanText(c?.case_id, 64) || undefined,
    case_code: cleanText(c?.case_code, 80) || undefined,
    problematic: cleanText(c?.problematic, 300),
    actions_taken: cleanText(c?.actions_taken),
    teacher_advice: cleanText(c?.teacher_advice),
    observations: cleanText(c?.observations),
    recommendations: {},
  }));
}

export async function saveReporteJuntaDE3Action(data: {
  id?: string;
  schoolYearId: string;
  schoolYearText: string;
  trimester: Trimester;
  course: string;
  parallel: string;
  jornada: string;
  reportDate: string;
  userRoleLabel: string;
  userName?: string;
  tutorName: string;
  vicerrectorName?: string;
  cases: CourseBoardReportCaseItem[];
  generalActions?: string;
  observacionesGenerales?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const session = await requireRole(["ADMIN", "DECE"]);
    const institutionId = requireInstitutionId(session);

    if (!data.course?.trim()) return { success: false, error: "Selecciona el grado o curso." };
    if (!["1T", "2T", "3T"].includes(data.trimester)) return { success: false, error: "Trimestre no válido." };
    if (!data.schoolYearId) return { success: false, error: "Selecciona el año lectivo." };

    const cases = JSON.stringify(cleanCases(data.cases));
    const fields = {
      school_year_id: data.schoolYearId,
      school_year_text: cleanText(data.schoolYearText, 20),
      user_role_label: cleanText(data.userRoleLabel, 120) || "ANALISTA DECE",
      tutor_name: cleanText(data.tutorName, 200),
      vicerrector_name: cleanText(data.vicerrectorName, 200) || null,
      trimester: data.trimester,
      course: cleanText(data.course, 200),
      parallel: cleanText(data.parallel, 20),
      jornada: cleanText(data.jornada, 40) || "MATUTINA",
      report_date: cleanText(data.reportDate, 10),
      cases_json: cases,
      general_actions: cleanText(data.generalActions) || null,
      observaciones_generales: cleanText(data.observacionesGenerales) || null,
    };

    if (data.id) {
      const existing = db
        .prepare("SELECT user_id FROM course_board_reports WHERE id = ? AND institution_id = ?")
        .get(data.id, institutionId) as { user_id: string } | undefined;
      if (!existing) return { success: false, error: "Reporte no encontrado." };
      if (session.user.role === "DECE" && existing.user_id !== session.user.id) {
        return { success: false, error: "No tienes permiso para editar este reporte." };
      }
      db.prepare(
        `UPDATE course_board_reports SET
           school_year_id = @school_year_id, school_year_text = @school_year_text,
           user_role_label = @user_role_label, tutor_name = @tutor_name, vicerrector_name = @vicerrector_name,
           trimester = @trimester, course = @course, parallel = @parallel, jornada = @jornada,
           report_date = @report_date, cases_json = @cases_json, general_actions = @general_actions,
           observaciones_generales = @observaciones_generales, report_format = '${DE3}',
           updated_at = datetime('now')
         WHERE id = @id AND institution_id = @institution_id`
      ).run({ ...fields, id: data.id, institution_id: institutionId });
      logAudit({ userId: session.user.id, action: "EDITAR", entityType: "CourseBoardReport", entityId: data.id, details: "Formato E.D1.C2.DE3", institutionId });
      revalidatePath("/juntas-curso");
      revalidatePath(`/juntas-curso/${data.id}`);
      return { success: true, id: data.id };
    }

    const institution = db.prepare("SELECT name FROM institutions WHERE id = ?").get(institutionId) as
      | { name: string }
      | undefined;
    const id = randomUUID();
    const reportCode = generateCourseBoardReportCode({
      institutionId,
      institutionName: institution?.name,
      schoolYearText: fields.school_year_text,
      trimester: data.trimester,
      userName: session.user.name || "Profesional DECE",
      course: fields.course,
      parallel: fields.parallel,
      jornada: fields.jornada,
    });

    // Las columnas del formato anterior son obligatorias en la tabla: se guardan vacías.
    db.prepare(
      `INSERT INTO course_board_reports (
         id, institution_id, school_year_id, school_year_text, user_id, user_name, user_role_label, user_email,
         tutor_name, report_code, trimester, course, parallel, jornada, report_date,
         antecedentes, alcance, objetivo, cases_json, general_actions, conclusiones, recomendaciones,
         report_format, observaciones_generales, vicerrector_name
       ) VALUES (
         @id, @institution_id, @school_year_id, @school_year_text, @user_id, @user_name, @user_role_label, @user_email,
         @tutor_name, @report_code, @trimester, @course, @parallel, @jornada, @report_date,
         '', '', '', @cases_json, @general_actions, '', '',
         '${DE3}', @observaciones_generales, @vicerrector_name
       )`
    ).run({
      ...fields,
      id,
      institution_id: institutionId,
      user_id: session.user.id,
      user_name: cleanText(data.userName, 200) || session.user.name || "Profesional DECE",
      user_email: session.user.email || null,
      report_code: reportCode,
    });
    logAudit({ userId: session.user.id, action: "CREAR", entityType: "CourseBoardReport", entityId: id, details: "Formato E.D1.C2.DE3", institutionId });
    revalidatePath("/juntas-curso");
    return { success: true, id };
  } catch (err: any) {
    console.error("[saveReporteJuntaDE3Action] Error:", err);
    return { success: false, error: err?.message || "Error al guardar el reporte." };
  }
}

/** Fichas de notificación de alerta de docentes para estudiantes del curso, en el año lectivo. */
export async function countCourseAlertsAction(opts: {
  schoolYearId: string;
  course: string;
  parallel: string;
}): Promise<{ count: number }> {
  try {
    const session = await requireRole(["ADMIN", "DECE"]);
    const institutionId = requireInstitutionId(session);
    const row = db
      .prepare(
        `SELECT COUNT(*) AS n FROM teacher_alerts ta
           JOIN students s ON s.id = ta.student_id
          WHERE ta.institution_id = ?
            AND (ta.school_year_id IS NULL OR ta.school_year_id = ?)
            AND LOWER(TRIM(s.course)) = LOWER(TRIM(?))
            AND (s.parallel IS NULL OR LOWER(TRIM(s.parallel)) = LOWER(TRIM(?)))`
      )
      .get(institutionId, opts.schoolYearId, opts.course, opts.parallel) as { n: number } | undefined;
    return { count: row?.n || 0 };
  } catch {
    return { count: 0 };
  }
}
