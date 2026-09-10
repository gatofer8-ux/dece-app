import Link from "next/link";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { getStatisticalReport, type StatPeriodMode, type StatUniverse } from "@/lib/statistics";
import StatisticalDashboardClient from "./StatisticalDashboardClient";
export const dynamic = "force-dynamic";

export default async function EstadisticasReportesPage({
  searchParams,
}: {
  searchParams: {
    periodMode?: string;
    universe?: string;
    month?: string;
    trimester?: string;
    schoolYearId?: string;
    startDate?: string;
    endDate?: string;
  };
}) {
  const session = await requireRole(["SUPERADMIN", "ADMIN", "DECE", "AUTORIDAD"]);
  const institutionId = requireInstitutionId(session);

  const periodMode = (searchParams.periodMode as StatPeriodMode) || "MES";
  const universe = (searchParams.universe as StatUniverse) || "CASOS";
  const month = searchParams.month;
  const trimester = (searchParams.trimester as "1T" | "2T" | "3T") || "1T";
  const schoolYearId = searchParams.schoolYearId;
  const startDate = searchParams.startDate;
  const endDate = searchParams.endDate;

  const report = getStatisticalReport(institutionId, {
    periodMode,
    universe,
    month,
    trimester,
    schoolYearId,
    startDate,
    endDate,
  });

  return (
    <div className="space-y-6">
      <div className="no-print">
        <PageHeader
          title="Cuadros Estadísticos DECE"
          description="Consolidación multidimensional cruzada por Cursos, Tipologías, Jornadas, Edades, Sexo, Etnia y Nacionalidad. Filtrable por Mes, Trimestre y Año Lectivo."
          action={
            <div className="flex items-center gap-2">
              <Link href="/reportes" className="btn-secondary text-xs">
                ← Volver a Reportes
              </Link>
              <Link href="/dashboard" className="btn-secondary text-xs">
                📊 Panel General
              </Link>
            </div>
          }
        />
      </div>

      <StatisticalDashboardClient
        data={report}
        currentUserName={session.user.name || "Profesional DECE"}
      />
    </div>
  );
}
