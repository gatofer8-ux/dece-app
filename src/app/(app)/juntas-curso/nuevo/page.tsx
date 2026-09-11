import { requireRole, requireInstitutionId } from "@/lib/session";
import { getUserCoverage, getInstitutionCoursesWithCounts } from "@/lib/distributivo";
import { listSchoolYears, getSelectedSchoolYear } from "@/lib/schoolYear";
import { getSignatureDefaults } from "@/lib/caseDocumentDefaults";
import CourseBoardReportForm from "../CourseBoardReportForm";

export default async function NuevoInformeJuntaPage() {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const schoolYears = await listSchoolYears(institutionId);
  const selectedYear = await getSelectedSchoolYear(institutionId);
  const isCoordinatorOrAdmin = session.user.role === "ADMIN";
  const sig = getSignatureDefaults(session, institutionId);

  const coverage = await getUserCoverage(
    session.user.id,
    institutionId,
    session.user.role,
    selectedYear?.id
  );

  const courseCounts = getInstitutionCoursesWithCounts(institutionId, selectedYear?.id);
  const availableCourses = courseCounts.detailedRows.map((c: any) => ({
    course: c.course,
    parallel: c.parallel || "A",
    jornada: c.jornada || "MATUTINA",
    tutor_name: c.tutor_name || null,
  }));


  // Si no hay cursos cargados aún en la institución, proveer opciones estándar
  const fallbackCourses = [
    { course: "Inicial I", parallel: "A", jornada: "MATUTINA" },
    { course: "Inicial II", parallel: "A", jornada: "MATUTINA" },
    { course: "1.° Grado EGB", parallel: "A", jornada: "MATUTINA" },
    { course: "2.° Grado EGB", parallel: "A", jornada: "MATUTINA" },
    { course: "3.° Grado EGB", parallel: "A", jornada: "MATUTINA" },
    { course: "4.° Grado EGB", parallel: "A", jornada: "MATUTINA" },
    { course: "5.° Grado EGB", parallel: "A", jornada: "MATUTINA" },
    { course: "6.° Grado EGB", parallel: "A", jornada: "MATUTINA" },
    { course: "7.° Grado EGB", parallel: "A", jornada: "MATUTINA" },
    { course: "8.° Grado EGB", parallel: "A", jornada: "MATUTINA" },
    { course: "9.° Grado EGB", parallel: "A", jornada: "MATUTINA" },
    { course: "10.° Grado EGB", parallel: "A", jornada: "MATUTINA" },
    { course: "1.° Bachillerato General Unificado", parallel: "A", jornada: "MATUTINA" },
    { course: "2.° Bachillerato General Unificado", parallel: "A", jornada: "MATUTINA" },
    { course: "3.° Bachillerato General Unificado", parallel: "A", jornada: "MATUTINA" },
  ];

  const coursesToUse = availableCourses.length > 0 ? availableCourses : fallbackCourses;

  return (
    <div className="py-2">
      <CourseBoardReportForm
        coverage={coverage}
        availableCourses={coursesToUse}
        schoolYears={schoolYears}
        selectedYearId={selectedYear?.id}
        currentUserName={sig.deceProfessional.fullName || session.user.name || "Profesional DECE"}
        currentUserEmail={session.user.email || undefined}
        isCoordinatorOrAdmin={isCoordinatorOrAdmin}
      />
    </div>
  );
}
