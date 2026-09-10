import { db } from "@/lib/db";
import { getCaseDocumentDefaults } from "@/lib/caseDocumentDefaults";
import { studentGradeLabel } from "@/lib/studentCourse";
import type { CaseRestitutionPlanRow } from "@/lib/types";

interface SessionLike {
  user: { id: string; institution_id: string | null; name?: string | null; email?: string | null };
}

export interface AccompanimentPrefill {
  values: Record<string, string>;
  restitutionPlans: { id: string; label: string }[];
}

function splitBirth(d: string | null | undefined) {
  const m = (d || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? { d: m[3], mo: m[2], y: m[1] } : { d: "", mo: "", y: "" };
}

export function getAccompanimentPrefill(
  caseId: string,
  session: SessionLike,
  institutionId: string
): AccompanimentPrefill {
  const d = getCaseDocumentDefaults(caseId, session, institutionId);
  const today = new Date().toISOString().slice(0, 10);
  const st = d?.student;
  const b = splitBirth(st?.birth_date);

  const plans = db
    .prepare(
      "SELECT id, elaboration_date FROM case_restitution_plans WHERE case_file_id = ? ORDER BY created_at DESC"
    )
    .all(caseId) as { id: string; elaboration_date: string }[];

  const latestPlan = plans.length
    ? (db.prepare("SELECT * FROM case_restitution_plans WHERE id = ?").get(plans[0].id) as CaseRestitutionPlanRow | undefined)
    : undefined;

  let accompanimentActions = "";
  if (latestPlan) {
    try {
      const acts = JSON.parse(latestPlan.accompaniment_actions || "[]") as Array<Record<string, string>>;
      accompanimentActions = acts
        .map(
          (a) =>
            `- ${a.categoria || "Acción"}: a cargo de ${a.ejecutor || "—"}${
              a.fecha_inicio ? `, desde ${a.fecha_inicio}` : ""
            }${a.fecha_fin ? ` hasta ${a.fecha_fin}` : ""}.`
        )
        .join("\n");
    } catch {
      /* noop */
    }
  }

  return {
    values: {
      report_date: today,
      signing_date: today,
      professional_managing: d?.deceProfessional.fullName || session.user.name || "",
      professional_signing: d?.deceProfessional.fullName || session.user.name || "",
      student_full_name: st?.full_name || "",
      student_birth_day: b.d,
      student_birth_month: b.mo,
      student_birth_year: b.y,
      student_age: d?.studentAge != null ? `${d.studentAge} años` : "",
      student_nationality: st?.nationality || "Ecuatoriano/a",
      student_document_id: st?.document_id || "",
      student_grade: studentGradeLabel(st) || [st?.course, st?.parallel].filter(Boolean).join(" "),
      student_jornada: st?.jornada || "",
      rep_full_name: st?.representative || "",
      rep_document_id: st?.representative_document_id || "",
      rep_relationship: "",
      rep_address: st?.representative_address || st?.address || "",
      rep_phone_cell: st?.rep_phone || "",
      rep_phone_landline: "",
      family_situation: "",
      academic_performance: "",
      accompaniment_actions: accompanimentActions,
      restitution_plan_id: latestPlan?.id || "",
    },
    restitutionPlans: plans.map((pl) => ({
      id: pl.id,
      label: `Plan de acompañamiento y restitución — ${pl.elaboration_date?.slice(0, 10) || ""}`,
    })),
  };
}
