import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import {
  parseBianualAxisItems,
  parseBianualAnalysts,
  parseBianualSignatories,
  parseBianualSpecificObjectives,
  DEFAULT_GENERAL_OBJECTIVE,
} from "@/lib/strategicPlanBianual";
import { getSignatureDefaults } from "@/lib/caseDocumentDefaults";
import type { StrategicBianualPlanRow } from "@/lib/types";
import StrategicPlanBianualForm from "../../StrategicPlanBianualForm";

export default async function EditarPlanEstrategicoBianualPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await requireRole(["ADMIN", "DECE", "SUPERADMIN", "AUTORIDAD"]);
  const institutionId = requireInstitutionId(session);
  const sig = getSignatureDefaults(session, institutionId);

  let plan: StrategicBianualPlanRow | undefined;
  if (session.user.role === "SUPERADMIN") {
    plan = db
      .prepare("SELECT * FROM strategic_plans_bianual WHERE id = ?")
      .get(params.id) as StrategicBianualPlanRow | undefined;
  } else {
    plan = db
      .prepare("SELECT * FROM strategic_plans_bianual WHERE id = ? AND institution_id = ?")
      .get(params.id, institutionId) as StrategicBianualPlanRow | undefined;
  }

  if (!plan) notFound();

  const planInstId = plan.institution_id || institutionId;

  let institution = db
    .prepare("SELECT id, name, amie_code as amie FROM institutions WHERE id = ?")
    .get(planInstId) as { id: string; name: string; amie: string } | undefined;

  if (!institution) {
    institution = db
      .prepare("SELECT id, name, amie_code as amie FROM institutions ORDER BY active DESC LIMIT 1")
      .get() as { id: string; name: string; amie: string };
  }

  const deceUsers = db
    .prepare(
      "SELECT id, name, role, email FROM users WHERE institution_id = ? AND role IN ('DECE', 'ADMIN', 'SUPERADMIN') AND active = 1"
    )
    .all(institution.id) as { id: string; name: string; role: string; email: string }[];

  const deceStaffNames = deceUsers.map((u) => u.name);

  const items = parseBianualAxisItems(plan.axis_items_data);
  const analysts = parseBianualAnalysts(plan.analysts_data);
  const elaborated = parseBianualSignatories(plan.elaborated_by);
  const specificObjectives = parseBianualSpecificObjectives(plan.specific_objectives);

  const parseSignatorySafe = (val: any, fallback?: any) => {
    if (!val) return fallback;
    if (typeof val === "object") return val;
    try {
      return JSON.parse(val);
    } catch {
      return fallback || { name: String(val), role: "Autoridad" };
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <StrategicPlanBianualForm
        planId={plan.id}
        institutionName={institution.name}
        defaultPeriodStartYear={plan.period_start_year}
        defaultPeriodEndYear={plan.period_end_year}
        defaultDistrictCode={plan.district_code}
        defaultDistrictName={plan.district_name}
        defaultCoordinatorName={plan.coordinator_name || sig.deceCoordinator.fullName || ""}
        defaultAnalysts={analysts}
        defaultStudentsCount={plan.students_count}
        defaultProfessionalsCount={plan.professionals_count}
        defaultAvailableResources={plan.available_resources}
        defaultSocioeconomicCondition={plan.socioeconomic_condition}
        defaultGeneralObjective={plan.general_objective || DEFAULT_GENERAL_OBJECTIVE}
        defaultSpecificObjectives={specificObjectives}
        defaultItems={items}
        defaultElaboratedBy={elaborated}
        defaultReviewedBy={parseSignatorySafe(
          plan.reviewed_by,
          sig.deceCoordinator.fullName
            ? { name: sig.deceCoordinator.fullName, role: "Coordinador(a) DECE", date: "" }
            : undefined
        )}
        defaultApprovedBy={parseSignatorySafe(
          plan.approved_by,
          sig.authority.fullName
            ? { name: sig.authority.fullName, role: sig.authority.role, date: "" }
            : undefined
        )}
        deceStaffNames={deceStaffNames}
        isEditing={true}
      />
    </div>
  );
}
