import { db } from "@/lib/db";
import { getSignatureDefaults } from "@/lib/caseDocumentDefaults";
import { axisToReportLabel, legalBasisForTheme, composeTema, composeScope } from "@/lib/activityReport";
import type { ActivityRow } from "@/lib/types";

interface SessionLike {
  user?: { id?: string; name?: string | null } | null;
}

function buildDefaults(activity: ActivityRow | null, session: SessionLike, institutionId: string) {
  const sig = getSignatureDefaults(session as never, institutionId);
  const institution = db.prepare("SELECT name FROM institutions WHERE id = ?").get(institutionId) as
    | { name: string }
    | undefined;
  const beneficiaries = activity?.target_audience || activity?.courses || "";
  const today = new Date().toISOString().slice(0, 10);
  return {
    report_date: today,
    school_year_text: sig.schoolYearText,
    responsible_name: sig.deceProfessional.fullName || session.user?.name || "",
    responsible_role: sig.deceProfessional.role || "ANALISTA DECE",
    responsible_phone_ext: sig.deceProfessional.phoneExt || sig.deceProfessional.phone || "",
    responsible_email: sig.deceProfessional.email || "",
    directed_to_name: sig.authority.fullName || "",
    directed_to_role: sig.authority.role || "RECTOR/A DE LA INSTITUCIÓN",
    directed_to_phone_ext: "",
    directed_to_email: "",
    tema: composeTema(activity?.title, beneficiaries),
    legal_basis: legalBasisForTheme(activity?.prevention_theme),
    scope_text: composeScope(sig.authority.fullName, institution?.name),
    objective_general: "",
    objectives_specific: "",
    development_analysis: "",
    activity_name: activity?.title || "",
    activity_axis: axisToReportLabel(activity?.axis),
    activity_date: activity?.date || today,
    activity_responsible: "DECE",
    activity_beneficiaries: beneficiaries,
    participants_count: activity?.participants_count ?? null,
    advances: "",
    critical_nodes: "",
    conclusions: "",
    recommendations: "",
    prevention_theme: activity?.prevention_theme || "",
    elaborated_by_name: sig.deceProfessional.fullName || session.user?.name || "",
    elaborated_by_role: sig.deceProfessional.role || "ANALISTA DECE",
    elaborated_date: today,
    approved_by_name: sig.authority.fullName || "",
    approved_by_role: sig.authority.role || "RECTOR/A",
    approved_date: today,
  } as Record<string, string | number | null>;
}

export function getActivityReportPrefill(activityId: string | null, session: SessionLike, institutionId: string) {
  const activity = activityId
    ? (db.prepare("SELECT * FROM activities WHERE id = ? AND institution_id = ?").get(activityId, institutionId) as
        | ActivityRow
        | undefined)
    : undefined;
  return buildDefaults(activity || null, session, institutionId);
}
