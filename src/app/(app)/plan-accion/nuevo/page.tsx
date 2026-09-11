import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentSchoolYearSpaced } from "@/lib/schoolYearText";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { listSchoolYears, getSelectedSchoolYear, ensureDefaultSchoolYear } from "@/lib/schoolYear";
import { getDefaultActionPlanItems } from "@/lib/actionPlan";
import { getSignatureDefaults } from "@/lib/caseDocumentDefaults";
import ActionPlanForm from "../ActionPlanForm";

export default async function NuevoPlanAccionPage() {
  const session = await requireRole(["ADMIN", "DECE", "SUPERADMIN", "AUTORIDAD"]);
  const institutionId = requireInstitutionId(session);

  let institution = db
    .prepare("SELECT id, name, amie_code as amie FROM institutions WHERE id = ?")
    .get(institutionId) as { id: string; name: string; amie: string } | undefined;

  if (!institution) {
    institution = db
      .prepare("SELECT id, name, amie_code as amie FROM institutions ORDER BY active DESC, created_at ASC LIMIT 1")
      .get() as { id: string; name: string; amie: string } | undefined;
  }

  if (!institution) redirect("/plan-accion");

  const effectiveInstId = institution.id;
  ensureDefaultSchoolYear(effectiveInstId);
  const schoolYears = listSchoolYears(effectiveInstId);
  const selectedYear = await getSelectedSchoolYear(effectiveInstId);
  const activeYear = selectedYear || (schoolYears.length > 0 ? schoolYears[0] : null);

  // Contar estudiantes reales de la institución
  const studentCountRow = db
    .prepare("SELECT COUNT(*) as c FROM students WHERE institution_id = ?")
    .get(effectiveInstId) as { c: number } | undefined;
  const realStudentsCount = studentCountRow?.c || 0;

  // Obtener profesionales DECE del sistema
  const deceUsers = db
    .prepare(
      "SELECT id, name, role, email FROM users WHERE institution_id = ? AND role IN ('DECE', 'ADMIN', 'SUPERADMIN') AND active = 1"
    )
    .all(effectiveInstId) as { id: string; name: string; role: string; email: string }[];

  const deceStaffNames = deceUsers.map((u) => u.name);

  // Identificar con precisión al profesional DECE responsable del equipo institucional
  const institutionalDece =
    deceUsers.find((u) => u.role === "DECE") ||
    deceUsers.find((u) => u.id === session.user.id) ||
    deceUsers[0];
  const deceResponsibleName = institutionalDece?.name || session.user.name || "Profesional DECE Responsable";

  const sig = getSignatureDefaults(session, effectiveInstId);
  const coordinatorUser =
    deceUsers.find((u) => u.role === "ADMIN" || u.role === "SUPERADMIN" || u.name.toLowerCase().includes("coord")) ||
    deceUsers[0];
  const defaultCoordinator =
    sig.deceCoordinator.fullName || coordinatorUser?.name || session.user.name || "Coordinador(a) DECE";

  const defaultAnalysts = deceUsers
    .filter((u) => u.id !== coordinatorUser?.id)
    .map((u) => ({ name: u.name, role: u.role === "DECE" ? "Analista DECE" : u.role }));
  if (defaultAnalysts.length === 0 && deceUsers.length > 0) {
    defaultAnalysts.push({ name: deceResponsibleName, role: "Profesional DECE" });
  }

  // Actividades oficiales del plan (sin asignación automática: el usuario escoge si es TODOS o un profesional)
  const defaultItems = getDefaultActionPlanItems();

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <ActionPlanForm
        institutionId={effectiveInstId}
        institutionName={institution.name}
        schoolYears={schoolYears}
        defaultSchoolYearId={activeYear?.id || ""}
        defaultSchoolYearText={activeYear?.name || currentSchoolYearSpaced()}
        defaultStudentsCount={realStudentsCount > 0 ? realStudentsCount : 1922}
        defaultCoordinatorName={defaultCoordinator}
        defaultAnalysts={defaultAnalysts}
        defaultAvailableResources="Proyectores de aula, computadoras, conexión a internet, hojas de papel bond, registros de asistencia físicos y digitales, reactivos de Test OVP impresos, fichas de observación y derivación oficial."
        defaultItems={defaultItems}
        defaultDeceResponsibleName={deceResponsibleName}
        deceStaffNames={deceStaffNames}
        isEditing={false}
      />
    </div>
  );
}
