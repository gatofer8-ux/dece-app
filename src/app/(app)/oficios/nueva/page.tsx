import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import { getSelectedSchoolYear } from "@/lib/schoolYear";
import { previewNextOficioNumber } from "@/lib/oficioNumbering";
import { PageHeader } from "@/components/ui";
import OficioForm, { type OficioCaseOption } from "../OficioForm";
import type { InstitutionRow } from "@/lib/types";

export default async function NuevoOficioPage({
  searchParams,
}: {
  searchParams: { case_file_id?: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const institution = db
    .prepare("SELECT * FROM institutions WHERE id = ?")
    .get(institutionId) as InstitutionRow | undefined;

  const selectedYear = await getSelectedSchoolYear(institutionId);
  const schoolYearText =
    selectedYear?.name || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;

  const preview = previewNextOficioNumber({
    institutionId,
    userId: session.user.id,
    userName: session.user.name,
    schoolYearText,
  });

  const cases = db
    .prepare(
      `SELECT cf.id, cf.code as case_code, s.full_name as student_name, cf.risk_type
       FROM case_files cf JOIN students s ON s.id = cf.student_id
       WHERE cf.institution_id = ?
       ORDER BY cf.created_at DESC
       LIMIT 300`
    )
    .all(institutionId) as OficioCaseOption[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Emitir Oficio Institucional"
        description="Correspondencia oficial saliente del DECE dirigida a la máxima autoridad institucional o a una entidad externa."
      />

      <OficioForm
        institutionName={institution?.name || "la institución educativa"}
        schoolYearText={schoolYearText}
        previewOficioNumber={preview.oficioNumber}
        cases={cases}
        defaultCaseFileId={searchParams.case_file_id || ""}
        defaultSignerName={session.user.name || ""}
      />
    </div>
  );
}
