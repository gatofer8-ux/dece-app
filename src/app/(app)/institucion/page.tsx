import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import type { InstitutionRow } from "@/lib/types";
import InstitutionSettingsForm from "./InstitutionSettingsForm";

export default async function MiInstitucionPage() {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Datos y Membrete Institucional"
        description="Personaliza el nombre de tu colegio, código AMIE, distrito, zona y el logo institucional que aparecerá en los documentos oficiales (Word y PDF)."
      />

      <section className="card p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Formato de documentos</h2>
          <p className="text-xs text-slate-500">
            Adapta la entrevista a estudiantes al formato de tu institución: membrete, secciones y preguntas, o tu propia plantilla Word.
          </p>
        </div>
        <Link href="/institucion/formatos" className="btn-secondary text-xs">Configurar formato de la entrevista</Link>
      </section>

      <InstitutionSettingsForm institution={institution} />
    </div>
  );
}
