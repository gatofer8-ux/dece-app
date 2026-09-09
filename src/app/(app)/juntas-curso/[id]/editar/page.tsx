import { notFound } from "next/navigation";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { getCourseBoardReportById } from "@/lib/juntasCurso";
import { getUserCoverage, getInstitutionCoursesWithCounts } from "@/lib/distributivo";
import { listSchoolYears, getSelectedSchoolYear } from "@/lib/schoolYear";
import CourseBoardReportForm from "../../CourseBoardReportForm";

export default async function EditarInformeJuntaPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const report = getCourseBoardReportById(params.id, institutionId);
  if (!report) notFound();

  // Si es analista DECE, verificar que sea el autor o tenga permiso
  if (session.user.role === "DECE" && report.user_id !== session.user.id) {
    notFound();
  }

  const schoolYears = await listSchoolYears(institutionId);
  const selectedYear = await getSelectedSchoolYear(institutionId);
  const isCoordinatorOrAdmin = session.user.role === "ADMIN";

  const coverage = await getUserCoverage(
    session.user.id,
    institutionId,
    session.user.role,
    report.school_year_id || selectedYear?.id
  );

  const courseCounts = getInstitutionCoursesWithCounts(institutionId, report.school_year_id || selectedYear?.id);
  const availableCourses = courseCounts.detailedRows.map((c: any) => ({
    course: c.course,
    parallel: c.parallel || "A",
    jornada: c.jornada || "MATUTINA",
    tutor_name: c.tutor_name || null,
  }));


  // Asegurar que el curso del informe esté en la lista
  const hasCurrentCourse = availableCourses.some(
    (c) => c.course === report.course && c.parallel === report.parallel && c.jornada === report.jornada
  );
  if (!hasCurrentCourse) {
    availableCourses.unshift({
      course: report.course,
      parallel: report.parallel,
      jornada: report.jornada,
      tutor_name: report.tutor_name || null,
    });
  }

  return (
    <div className="py-2">
      <CourseBoardReportForm
        report={report}
        coverage={coverage}
        availableCourses={availableCourses}
        schoolYears={schoolYears}
        selectedYearId={report.school_year_id}
        currentUserName={report.user_name || session.user.name || "Profesional DECE"}
        currentUserEmail={report.user_email || session.user.email || undefined}
        isCoordinatorOrAdmin={isCoordinatorOrAdmin}
      />
    </div>
  );
}
