import { notFound } from "next/navigation";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { normalizeOficioType } from "@/lib/oficios";
import OficioForm, { type OficioCaseOption } from "../../OficioForm";
import type { InstitutionRow, OficioRow } from "@/lib/types";

export default async function EditarOficioPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const isSuperAdmin = session.user.role === "SUPERADMIN";

  const oficio = db
    .prepare(
      isSuperAdmin
        ? "SELECT * FROM oficios WHERE id = ?"
        : "SELECT * FROM oficios WHERE id = ? AND institution_id = ?"
    )
    .get(...(isSuperAdmin ? [params.id] : [params.id, institutionId])) as OficioRow | undefined;

  if (!oficio) notFound();

  const institution = db
    .prepare("SELECT * FROM institutions WHERE id = ?")
    .get(oficio.institution_id) as InstitutionRow | undefined;

  const cases = db
    .prepare(
      `SELECT cf.id, cf.code as case_code, s.full_name as student_name, cf.risk_type
       FROM case_files cf JOIN students s ON s.id = cf.student_id
       WHERE cf.institution_id = ?
       ORDER BY cf.created_at DESC
       LIMIT 300`
    )
    .all(oficio.institution_id) as OficioCaseOption[];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Editar Oficio N° ${oficio.oficio_number}`}
        description="Modificación de los datos del oficio. El número consecutivo permanece inmutable."
      />

      <OficioForm
        isEditing
        oficioId={oficio.id}
        institutionName={institution?.name || "la institución educativa"}
        currentOficioNumber={oficio.oficio_number}
        cases={cases}
        defaultOficioType={normalizeOficioType(oficio.oficio_type)}
        defaultOficioDate={oficio.oficio_date}
        defaultCity={oficio.city}
        defaultAsunto={oficio.asunto}
        defaultAddresseeName={oficio.addressee_name}
        defaultAddresseeRole={oficio.addressee_role}
        defaultAddresseeInstitution={oficio.addressee_institution || ""}
        defaultBodyIntro={oficio.body_intro || ""}
        defaultBodyContent={oficio.body_content}
        defaultClosingNote={oficio.closing_note}
        defaultSignerName={oficio.signer_name}
        defaultSignerRole={oficio.signer_role}
        defaultCaseFileId={oficio.case_file_id || ""}
        defaultSignatures={oficio.signatures_json || "[]"}
        defaultSignatureType={oficio.signature_type || "PENDIENTE"}
        defaultPhysicalFileRef={oficio.physical_file_ref || ""}
        defaultPhysicalEvidenceUrl={oficio.physical_evidence_url || ""}
      />
    </div>
  );
}
