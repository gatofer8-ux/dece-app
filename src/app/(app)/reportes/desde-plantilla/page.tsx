import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import TemplateReportGenerator from "./TemplateReportGenerator";

export default async function ReportesDesdePlantillaPage() {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const history = db
    .prepare(
      `SELECT * FROM report_generation_history
       WHERE institution_id = ?
       ORDER BY generated_at DESC LIMIT 50`
    )
    .all(institutionId) as any[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Generador de Reportes desde Plantilla Distrital"
        description="Sube cualquier formato Excel (.xlsx) o Word (.docx) enviado por el Distrito y llénalo automáticamente preservando el 100% de su diseño original."
      />
      <TemplateReportGenerator initialHistory={history} />
    </div>
  );
}
