import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import {
  getDefaultBianualAxisItems,
  DEFAULT_GENERAL_OBJECTIVE,
  DEFAULT_SPECIFIC_OBJECTIVES,
} from "@/lib/strategicPlanBianual";
import { getSignatureDefaults } from "@/lib/caseDocumentDefaults";
import StrategicPlanBianualForm from "../StrategicPlanBianualForm";

export default async function NuevoPlanEstrategicoBianualPage() {
  const session = await requireRole(["ADMIN", "DECE", "SUPERADMIN", "AUTORIDAD"]);
  const institutionId = requireInstitutionId(session);

  let institution = db
    .prepare("SELECT id, name, amie_code as amie FROM institutions WHERE id = ?")
    .get(institutionId) as { id: string; name: string; amie: string } | undefined;

  if (!institution) {
    institution = db
      .prepare(
        "SELECT id, name, amie_code as amie FROM institutions ORDER BY active DESC, created_at ASC LIMIT 1"
      )
      .get() as { id: string; name: string; amie: string } | undefined;
  }

  if (!institution) redirect("/plan-estrategico-bianual");

  const effectiveInstId = institution.id;

  // Estudiantes reales de la institución
  const studentCountRow = db
    .prepare("SELECT COUNT(*) as c FROM students WHERE institution_id = ?")
    .get(effectiveInstId) as { c: number } | undefined;
  const realStudentsCount = studentCountRow?.c || 0;

  // Profesionales DECE del sistema
  const deceUsers = db
    .prepare(
      "SELECT id, name, role, email FROM users WHERE institution_id = ? AND role IN ('DECE', 'ADMIN', 'SUPERADMIN') AND active = 1"
    )
    .all(effectiveInstId) as { id: string; name: string; role: string; email: string }[];

  const deceStaffNames = deceUsers.map((u) => u.name);

  const sig = getSignatureDefaults(session, effectiveInstId);
  const coordinatorUser =
    deceUsers.find(
      (u) =>
        u.role === "ADMIN" ||
        u.role === "SUPERADMIN" ||
        u.name.toLowerCase().includes("coord")
    ) || deceUsers[0];
  const defaultCoordinator =
    sig.deceCoordinator.fullName ||
    coordinatorUser?.name ||
    session.user.name ||
    "Coordinador(a) DECE";

  const defaultAnalysts = deceUsers
    .filter((u) => u.id !== coordinatorUser?.id)
    .map((u) => ({ name: u.name, role: u.role === "DECE" ? "Analista DECE" : u.role }));
  if (defaultAnalysts.length === 0 && deceUsers.length > 0) {
    defaultAnalysts.push({
      name: coordinatorUser?.name || session.user.name || "Profesional DECE",
      role: "Profesional DECE",
    });
  }

  // El plan bianual arranca en el año calendario en curso y abarca dos años.
  const startYear = new Date().getFullYear();
  const endYear = startYear + 2;

  const defaultItems = getDefaultBianualAxisItems(startYear, endYear);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <StrategicPlanBianualForm
        institutionName={institution.name}
        defaultPeriodStartYear={String(startYear)}
        defaultPeriodEndYear={String(endYear)}
        defaultCoordinatorName={defaultCoordinator}
        defaultAnalysts={defaultAnalysts}
        defaultStudentsCount={realStudentsCount}
        defaultProfessionalsCount={Math.max(1, deceUsers.length)}
        defaultAvailableResources="Proyectores de aula, computadoras, conexión a internet, hojas de papel bond, registros de asistencia físicos y digitales, espacios institucionales para talleres y material educomunicacional."
        defaultSocioeconomicCondition=""
        defaultGeneralObjective={DEFAULT_GENERAL_OBJECTIVE}
        defaultSpecificObjectives={DEFAULT_SPECIFIC_OBJECTIVES}
        defaultItems={defaultItems}
        deceStaffNames={deceStaffNames}
        isEditing={false}
      />
    </div>
  );
}
