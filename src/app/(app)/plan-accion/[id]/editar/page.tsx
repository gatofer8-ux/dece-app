import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { listSchoolYears } from "@/lib/schoolYear";
import { parseActionPlanItems, parseActionPlanAnalysts, parseActionPlanSignatories } from "@/lib/actionPlan";
import { getSignatureDefaults } from "@/lib/caseDocumentDefaults";
import type { ActionPlanRow } from "@/lib/types";
import ActionPlanForm from "../../ActionPlanForm";

export default async function EditarPlanAccionPage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const sig = getSignatureDefaults(session, institutionId);

  const plan = db
    .prepare("SELECT * FROM action_plans WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as ActionPlanRow | undefined;

  if (!plan) notFound();

  const institution = db
    .prepare("SELECT id, name, amie_code as amie FROM institutions WHERE id = ?")
    .get(institutionId) as { id: string; name: string; amie: string };

  const schoolYears = listSchoolYears(institutionId);

  const deceUsers = db
    .prepare(
      "SELECT id, name, role, email FROM users WHERE institution_id = ? AND role IN ('DECE', 'ADMIN') AND active = 1"
    )
    .all(institutionId) as { id: string; name: string; role: string; email: string }[];

  const deceStaffNames = deceUsers.map((u) => u.name);
  const institutionalDece =
    deceUsers.find((u) => u.role === "DECE") ||
    deceUsers.find((u) => u.id === session.user.id) ||
    deceUsers[0];
  const deceResponsibleName = institutionalDece?.name || session.user.name || "Profesional DECE Responsable";
  const rawItems = parseActionPlanItems(plan.items_data);
  const items = rawItems.map((it) => {
    let resp = it.responsible || "";
    if (resp.toUpperCase().includes("SANTIAGO")) {
      resp = deceResponsibleName;
    }
    return { ...it, responsible: resp };
  });
  const analysts = parseActionPlanAnalysts(plan.analysts_data);
  const elaborated = parseActionPlanSignatories(plan.elaborated_by);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <ActionPlanForm
        planId={plan.id}
        institutionId={institutionId}
        institutionName={institution.name}
        schoolYears={schoolYears}
        defaultSchoolYearId={plan.school_year_id}
        defaultSchoolYearText={plan.school_year_text}
        defaultStudentsCount={plan.students_count}
        defaultCoordinatorName={plan.coordinator_name || sig.deceCoordinator.fullName || ""}
        defaultAnalysts={analysts}
        defaultAvailableResources={plan.available_resources}
        defaultItems={items}
        defaultDeceResponsibleName={deceResponsibleName}
        defaultEvaluationNotes={plan.evaluation_notes}
        defaultElaboratedBy={elaborated}
        defaultReviewedBy={plan.reviewed_by ? JSON.parse(plan.reviewed_by) : (sig.deceCoordinator.fullName ? { name: sig.deceCoordinator.fullName, role: "Coordinador(a) DECE" } : undefined)}
        defaultApprovedBy={plan.approved_by ? JSON.parse(plan.approved_by) : (sig.authority.fullName ? { name: sig.authority.fullName, role: sig.authority.role } : undefined)}
        deceStaffNames={deceStaffNames}
        isEditing={true}
      />
    </div>
  );
}
