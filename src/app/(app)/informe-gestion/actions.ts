"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import {
  AnnualManagementReportRow,
  ManagementReportType,
} from "@/lib/types";
import {
  aggregateAnnualStats,
  generateAnnualManagementReportCode,
} from "@/lib/informeGestion";
import {
  draftAnnualSituationalDiagnosis,
  draftAnnualComparativeAnalysis,
  draftAnnualConclusionsAndRecommendations,
  draftAnnualAchievementsAndKnots,
} from "@/lib/ai";
import crypto from "crypto";

export async function saveAnnualReportAction(formData: {
  id?: string;
  school_year_id: string;
  school_year_text: string;
  report_type: ManagementReportType;
  report_code: string;
  report_date: string;
  title_topic: string;
  recipients_json: string;
  professionals_json: string;
  antecedentes_legal: string;
  situational_diagnosis: string;
  distributivo_summary_json: string;
  alcance: string;
  objetivos: string;
  counseling_stats_json: string;
  case_typologies_json: string;
  comparative_analysis_json: string;
  psychosocial_note: string;
  prevention_projects_json: string;
  pending_processes: string;
  achievements: string;
  critical_knots: string;
  conclusions_counseling: string;
  conclusions_prevention: string;
  conclusions_psychosocial: string;
  conclusions_inclusion: string;
  recommendations_institutional: string;
  recommendations_district: string;
  annexes_notes: string;
  annex_photos_json: string;
  signatures_json: string;
}) {
  const session = await getSession();
  if (!session || !session.user) {
    return { error: "No autenticado" };
  }

  const institutionId = session.user.institution_id;
  if (!institutionId) {
    return { error: "No tienes institución asignada." };
  }

  try {
    const isNew = !formData.id;
    const reportId = formData.id || crypto.randomUUID();

    if (isNew) {
      db.prepare(`
        INSERT INTO annual_management_reports (
          id, institution_id, school_year_id, school_year_text,
          user_id, user_name, user_role_label, report_type,
          report_code, report_date, title_topic, recipients_json,
          professionals_json, antecedentes_legal, situational_diagnosis,
          distributivo_summary_json, alcance, objetivos,
          counseling_stats_json, case_typologies_json, comparative_analysis_json,
          psychosocial_note, prevention_projects_json, pending_processes,
          achievements, critical_knots, conclusions_counseling,
          conclusions_prevention, conclusions_psychosocial, conclusions_inclusion,
          recommendations_institutional, recommendations_district, annexes_notes,
          annex_photos_json, signatures_json
        ) VALUES (
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?
        )
      `).run(
        reportId,
        institutionId,
        formData.school_year_id,
        formData.school_year_text,
        session.user.id,
        session.user.name,
        session.user.role === "ADMIN" ? "COORDINADORA DECE" : "ANALISTA DECE",
        formData.report_type,
        formData.report_code,
        formData.report_date,
        formData.title_topic,
        formData.recipients_json || "[]",
        formData.professionals_json || "[]",
        formData.antecedentes_legal || "",
        formData.situational_diagnosis || "",
        formData.distributivo_summary_json || "{}",
        formData.alcance || "",
        formData.objetivos || "",
        formData.counseling_stats_json || "[]",
        formData.case_typologies_json || "[]",
        formData.comparative_analysis_json || "[]",
        formData.psychosocial_note || "",
        formData.prevention_projects_json || "[]",
        formData.pending_processes || "",
        formData.achievements || "",
        formData.critical_knots || "",
        formData.conclusions_counseling || "",
        formData.conclusions_prevention || "",
        formData.conclusions_psychosocial || "",
        formData.conclusions_inclusion || "",
        formData.recommendations_institutional || "",
        formData.recommendations_district || "",
        formData.annexes_notes || "",
        formData.annex_photos_json || "[]",
        formData.signatures_json || "[]"
      );
    } else {
      db.prepare(`
        UPDATE annual_management_reports SET
          school_year_id = ?,
          school_year_text = ?,
          report_type = ?,
          report_code = ?,
          report_date = ?,
          title_topic = ?,
          recipients_json = ?,
          professionals_json = ?,
          antecedentes_legal = ?,
          situational_diagnosis = ?,
          distributivo_summary_json = ?,
          alcance = ?,
          objetivos = ?,
          counseling_stats_json = ?,
          case_typologies_json = ?,
          comparative_analysis_json = ?,
          psychosocial_note = ?,
          prevention_projects_json = ?,
          pending_processes = ?,
          achievements = ?,
          critical_knots = ?,
          conclusions_counseling = ?,
          conclusions_prevention = ?,
          conclusions_psychosocial = ?,
          conclusions_inclusion = ?,
          recommendations_institutional = ?,
          recommendations_district = ?,
          annexes_notes = ?,
          annex_photos_json = ?,
          signatures_json = ?,
          updated_at = datetime('now')
        WHERE id = ? AND institution_id = ?
      `).run(
        formData.school_year_id,
        formData.school_year_text,
        formData.report_type,
        formData.report_code,
        formData.report_date,
        formData.title_topic,
        formData.recipients_json || "[]",
        formData.professionals_json || "[]",
        formData.antecedentes_legal || "",
        formData.situational_diagnosis || "",
        formData.distributivo_summary_json || "{}",
        formData.alcance || "",
        formData.objetivos || "",
        formData.counseling_stats_json || "[]",
        formData.case_typologies_json || "[]",
        formData.comparative_analysis_json || "[]",
        formData.psychosocial_note || "",
        formData.prevention_projects_json || "[]",
        formData.pending_processes || "",
        formData.achievements || "",
        formData.critical_knots || "",
        formData.conclusions_counseling || "",
        formData.conclusions_prevention || "",
        formData.conclusions_psychosocial || "",
        formData.conclusions_inclusion || "",
        formData.recommendations_institutional || "",
        formData.recommendations_district || "",
        formData.annexes_notes || "",
        formData.annex_photos_json || "[]",
        formData.signatures_json || "[]",
        reportId,
        institutionId
      );
    }

    revalidatePath("/informe-gestion");
    return { success: true, id: reportId };
  } catch (error: any) {
    console.error("Error saving annual management report:", error);
    return { error: error?.message || "Error al guardar el informe anual." };
  }
}

export async function deleteAnnualReportAction(id: string) {
  const session = await getSession();
  if (!session || !session.user) {
    return { error: "No autenticado" };
  }

  const institutionId = session.user.institution_id;
  if (!institutionId) {
    return { error: "No tienes institución asignada." };
  }

  try {
    const existing = db
      .prepare("SELECT * FROM annual_management_reports WHERE id = ? AND institution_id = ?")
      .get(id, institutionId) as AnnualManagementReportRow | undefined;

    if (!existing) {
      return { error: "Informe no encontrado" };
    }

    if (
      session.user.role !== "ADMIN" &&
      session.user.role !== "DISTRITO" &&
      existing.user_id !== session.user.id
    ) {
      return { error: "No tienes permiso para eliminar este informe." };
    }

    db.prepare("DELETE FROM annual_management_reports WHERE id = ? AND institution_id = ?").run(
      id,
      institutionId
    );

    revalidatePath("/informe-gestion");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting annual report:", error);
    return { error: "Error al eliminar el informe." };
  }
}

export async function aggregateAnnualStatsAction(
  schoolYearId: string,
  reportType: ManagementReportType
) {
  const session = await getSession();
  if (!session || !session.user) {
    return { error: "No autenticado" };
  }

  const institutionId = session.user.institution_id;
  if (!institutionId) {
    return { error: "No tienes institución asignada." };
  }

  try {
    const stats = aggregateAnnualStats(institutionId, schoolYearId, {
      reportType,
      userId: session.user.id,
      userName: session.user.name || "",
    });
    return { success: true, stats };
  } catch (error: any) {
    console.error("Error aggregating stats:", error);
    return { error: "Error al cargar las estadísticas del año lectivo." };
  }
}

export async function generateSituationalDiagnosisAiAction(data: {
  schoolYearText: string;
  reportType: string;
  professionalsCount: number;
}) {
  const session = await getSession();
  if (!session?.user?.institution_id) return { error: "No autenticado" };

  const inst = db
    .prepare("SELECT * FROM institutions WHERE id = ?")
    .get(session.user.institution_id) as any;

  return await draftAnnualSituationalDiagnosis({
    institutionName: inst?.name || "Unidad Educativa",
    schoolYearText: data.schoolYearText,
    professionalsCount: data.professionalsCount,
    reportType: data.reportType,
  });
}

export async function generateComparativeAnalysisAiAction(data: {
  typologiesData: Array<{ typology: string; prev: number; curr: number }>;
}) {
  const session = await getSession();
  if (!session?.user) return { error: "No autenticado" };

  return await draftAnnualComparativeAnalysis({
    typologiesData: data.typologiesData,
  });
}

export async function generateAnnualConclusionsAiAction(data: {
  schoolYearText: string;
  totalAttentions: number;
  totalCases: number;
  topTypologies: string;
  reportType: string;
}) {
  const session = await getSession();
  if (!session?.user?.institution_id) return { error: "No autenticado" };

  const inst = db
    .prepare("SELECT * FROM institutions WHERE id = ?")
    .get(session.user.institution_id) as any;

  return await draftAnnualConclusionsAndRecommendations({
    institutionName: inst?.name || "Unidad Educativa",
    schoolYearText: data.schoolYearText,
    totalAttentions: data.totalAttentions,
    totalCases: data.totalCases,
    topTypologies: data.topTypologies,
    reportType: data.reportType,
  });
}

export async function generateAnnualAchievementsKnotsAiAction(data: {
  schoolYearText: string;
  totalAttentions: number;
  totalCases: number;
}) {
  const session = await getSession();
  if (!session?.user?.institution_id) return { error: "No autenticado" };

  const inst = db
    .prepare("SELECT * FROM institutions WHERE id = ?")
    .get(session.user.institution_id) as any;

  return await draftAnnualAchievementsAndKnots({
    institutionName: inst?.name || "Unidad Educativa",
    schoolYearText: data.schoolYearText,
    totalAttentions: data.totalAttentions,
    totalCases: data.totalCases,
  });
}
