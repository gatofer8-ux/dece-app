import { notFound } from "next/navigation";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { getCourseBoardReportById } from "@/lib/juntasCurso";
import { TRIMESTER_LABELS } from "@/lib/types";
import JuntaCursoViewerClient from "../JuntaCursoViewerClient";

export default async function ImprimirInformeJuntaPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await requireRole(["ADMIN", "DECE", "AUTORIDAD"]);
  const institutionId = requireInstitutionId(session);

  const report = getCourseBoardReportById(params.id, institutionId);
  if (!report) notFound();

  const trimesterLabel = TRIMESTER_LABELS[report.trimester] || report.trimester;
  const courseLabel = `${trimesterLabel} · ${report.course} "${report.parallel}" (${report.jornada})`;

  return (
    <div className="py-6 px-4 sm:px-6">
      <JuntaCursoViewerClient
        reportId={report.id}
        reportCode={report.report_code}
        courseLabel={courseLabel}
        previewBaseUrl={`/api/juntas-curso/${report.id}/preview`}
        pdfUrl={`/api/juntas-curso/${report.id}/export-pdf`}
        wordUrl={`/api/juntas-curso/${report.id}/export-word`}
        editUrl={`/juntas-curso/${report.id}/editar`}
        initialTotalPages={4}
        updatedAt={report.updated_at || report.created_at}
        physicalFileRef={report.physical_file_ref}
        physicalEvidenceUrl={report.physical_evidence_url}
        signaturesJson={report.signatures_json}
        signatureType={report.signature_type}
      />
    </div>
  );
}
