import { notFound } from "next/navigation";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { listSchoolYears } from "@/lib/schoolYear";
import { getDistributivoById, getInstitutionCoursesWithCounts, getInstitutionDeceTeam } from "@/lib/distributivo";
import DistributivoForm from "../../DistributivoForm";
import Link from "next/link";

export default async function EditarDistributivoPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await requireRole(["ADMIN"]);
  const institutionId = requireInstitutionId(session);

  const data = getDistributivoById(params.id, institutionId);
  if (!data) {
    notFound();
  }

  const schoolYears = listSchoolYears(institutionId);
  const deceTeam = getInstitutionDeceTeam(institutionId);
  const { courseSummaries, totalStudents } = getInstitutionCoursesWithCounts(institutionId, data.distributivo.school_year_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/distributivo" className="hover:text-slate-800">
          Distributivo DECE
        </Link>
        <span>/</span>
        <span className="text-slate-700 font-medium">Editar Distributivo</span>
      </div>

      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Editar Distributivo Institucional DECE
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Actualiza la asignación de cobertura institucional. Las modificaciones impactarán de inmediato en los filtros de acceso de cada analista.
        </p>
      </div>

      <DistributivoForm
        distributivo={data.distributivo}
        existingAssignments={data.assignments}
        schoolYears={schoolYears}
        selectedYearId={data.distributivo.school_year_id}
        deceTeam={deceTeam}
        courseSummaries={courseSummaries}
        totalStudents={totalStudents}
        currentUserName={session.user.name || ""}
      />
    </div>
  );
}
