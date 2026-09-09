"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
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
          conclusiones, recomendaciones, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, datetime('now'), datetime('now')
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
        data.recomendaciones
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
