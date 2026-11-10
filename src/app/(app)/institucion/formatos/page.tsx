import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { getInterviewFormat } from "@/lib/entrevistaPreguntasFormat";
import FormatoEntrevistaForm from "./FormatoEntrevistaForm";

export default async function FormatosDocumentosPage() {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const format = getInterviewFormat(institutionId);
  const inst = db.prepare("SELECT seal_image FROM institutions WHERE id = ?").get(institutionId) as
    | { seal_image: string | null }
    | undefined;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link href="/institucion" className="text-xs text-brand-700 hover:underline">← Datos y Membrete Institucional</Link>
      </div>
      <PageHeader
        title="Formato de documentos: Entrevista a estudiantes"
        description="Adapta el documento al formato de tu institución: membrete, secciones, preguntas o tu propia plantilla Word. Vale para todos los profesionales de tu institución."
      />
      <FormatoEntrevistaForm
        initialLetterhead={format.letterhead}
        initialStructure={format.structure}
        templateName={format.templateName}
        hasLogo={!!inst?.seal_image}
      />
    </div>
  );
}
