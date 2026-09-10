import { requireRole, requireInstitutionId } from "@/lib/session";
import { listSchoolYears, getSelectedSchoolYear } from "@/lib/schoolYear";
import { getInstitutionCoursesWithCounts, getInstitutionDeceTeam } from "@/lib/distributivo";
import { getSignatureDefaults } from "@/lib/caseDocumentDefaults";
import DistributivoForm from "../DistributivoForm";
import Link from "next/link";

export default async function NuevoDistributivoPage() {
  const session = await requireRole(["ADMIN"]);
  const institutionId = requireInstitutionId(session);

  const schoolYears = listSchoolYears(institutionId);
  const activeYear = await getSelectedSchoolYear(institutionId);
  const deceTeam = getInstitutionDeceTeam(institutionId);
  const { courseSummaries, totalStudents } = getInstitutionCoursesWithCounts(institutionId, activeYear?.id);
  const sig = getSignatureDefaults(session, institutionId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/distributivo" className="hover:text-slate-800">
          Distributivo DECE
        </Link>
        <span>/</span>
        <span className="text-slate-700 font-medium">Nuevo Distributivo</span>
      </div>

      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Elaborar Distributivo Institucional DECE
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Asigna los cursos, paralelos, jornadas y niveles a cada profesional del equipo DECE.
          El estándar técnico ministerial recomienda una cobertura promedio de ~450 estudiantes por profesional.
        </p>
      </div>

      <DistributivoForm
        schoolYears={schoolYears}
        selectedYearId={activeYear?.id}
        deceTeam={deceTeam}
        courseSummaries={courseSummaries}
        totalStudents={totalStudents}
        currentUserName={sig.deceCoordinator.fullName || sig.deceProfessional.fullName || session.user.name || ""}
      />
    </div>
  );
}
