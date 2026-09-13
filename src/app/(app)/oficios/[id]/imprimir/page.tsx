import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import PrintButton from "@/components/PrintButton";
import DocumentHeader from "@/components/DocumentHeader";
import {
  formatAsunto,
  formatOficioCityDate,
  getOficioSignerSignature,
  getOficioTypeOption,
  OFICIO_DEFAULT_CLOSING_NOTE,
} from "@/lib/oficios";
import type { InstitutionRow, OficioRow } from "@/lib/types";

export default async function ImprimirOficioPage({ params }: { params: { id: string } }) {
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

  const typeOption = getOficioTypeOption(oficio.oficio_type);
  const signerSignature = getOficioSignerSignature(oficio.signatures_json);
  const asuntoText = formatAsunto(oficio.asunto);
  const addresseeInstitution =
    oficio.addressee_institution?.trim() || institution?.name?.trim() || "";

  const introLines = (oficio.body_intro || "").split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const contentLines = (oficio.body_content || "").split(/\n+/).map((l) => l.trim()).filter(Boolean);

  return (
    <div className="max-w-3xl mx-auto bg-white">
      <div className="no-print p-3 bg-slate-100 border-b flex items-center justify-between mb-4 rounded-lg">
        <Link href="/oficios" className="text-xs text-slate-600 font-semibold">← Volver</Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono font-bold">{oficio.oficio_number}</span>
          <Link href={`/oficios/${oficio.id}/editar`} className="text-xs bg-slate-200 px-3 py-1.5 rounded font-semibold">
            ✏️ Editar
          </Link>
          <a
            href={`/api/oficios/${oficio.id}/export-word`}
            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded font-semibold"
          >
            📥 Descargar Word
          </a>
          <PrintButton hideWordButton />
        </div>
      </div>

      <div id="printable-content" className="p-6 print:p-0 text-black">
        <style>{`@media print { @page { size: A4; margin: 1.6cm; } }`}</style>

        <DocumentHeader
          title="OFICIO INSTITUCIONAL DEL DECE"
          subtitle={typeOption.label}
          institutionName={institution?.name}
          sealImage={institution?.seal_image}
          compact
        />

        <div className="mt-4 space-y-3 text-[11pt] leading-relaxed">
          <p>{formatOficioCityDate(oficio.city, oficio.oficio_date)}</p>

          <p>
            <strong>Oficio No.</strong> {oficio.oficio_number}
          </p>

          <p className="font-bold">ASUNTO: {asuntoText}</p>

          <div className="pt-1">
            {oficio.addressee_name?.trim() && <p className="font-bold">{oficio.addressee_name}</p>}
            {oficio.addressee_role?.trim() && (
              <p className="font-bold uppercase">{oficio.addressee_role}</p>
            )}
            {addresseeInstitution && (
              <p className="font-bold uppercase">{addresseeInstitution}</p>
            )}
            <p>Presente.</p>
          </div>

          <p>De mi consideración.</p>

          {introLines.length > 0 && (
            <div className="text-justify space-y-2">
              {introLines.map((l, i) => (
                <p key={`intro-${i}`}>{l}</p>
              ))}
            </div>
          )}

          {contentLines.length > 0 && (
            <div className="text-justify space-y-2">
              {contentLines.map((l, i) => (
                <p key={`content-${i}`}>{l}</p>
              ))}
            </div>
          )}

          {oficio.physical_file_ref?.trim() && (
            <p className="text-[9pt] italic text-slate-500">
              Respaldo físico institucional: el original de este oficio se encuentra custodiado en{" "}
              {oficio.physical_file_ref.trim()}.
            </p>
          )}

          <p>{oficio.closing_note?.trim() || OFICIO_DEFAULT_CLOSING_NOTE}</p>

          <div className="pt-6">
            <p>Atentamente,</p>

            {signerSignature?.tipo === "digital" && signerSignature.firma_data_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={signerSignature.firma_data_url}
                alt={`Firma de ${oficio.signer_name}`}
                className="h-16 max-w-[220px] object-contain my-1"
              />
            ) : signerSignature?.tipo === "fisica" ? (
              <div className="my-2">
                <div className="border-b border-slate-400 w-56 mb-1"></div>
                <p className="text-[9pt] italic text-slate-500">
                  Firma manuscrita en documento físico
                  {signerSignature.referencia_fisica ? ` — archivo: ${signerSignature.referencia_fisica}` : ""}
                </p>
              </div>
            ) : (
              <div className="h-16" />
            )}

            <p className="font-bold">{oficio.signer_name}</p>
            <p className="font-bold uppercase">{oficio.signer_role || "ANALISTA DECE"}</p>
          </div>

          {/* Talonario de recepción — siempre en blanco, se llena a mano al entregar */}
          <div className="pt-8 space-y-3 text-[10pt]">
            <p>Recibido por (firma): _________________________________</p>
            <p>Nombre: ____________________________</p>
            <div className="flex justify-between">
              <p>Fecha: __________________</p>
              <p>Hora: ____________</p>
            </div>
          </div>
        </div>

        {/* ANEXO: RESPALDO FÍSICO DIGITALIZADO */}
        {oficio.physical_evidence_url && (
          <div className="mt-6 pt-4 border-t-2 border-dashed border-slate-300 break-before-page">
            <div className="bg-[#1F3864] text-white px-2 py-1 text-[8pt] font-bold uppercase mb-2">
              ANEXO: OFICIO FÍSICO FIRMADO Y SELLADO (DIGITALIZADO)
            </div>
            {oficio.physical_evidence_url.startsWith("data:application/pdf") ? (
              <div className="text-center py-4">
                <a
                  href={oficio.physical_evidence_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md"
                >
                  Ver PDF del oficio firmado ↗
                </a>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={oficio.physical_evidence_url}
                alt="Oficio físico firmado y sellado"
                className="max-h-[700px] w-auto object-contain border border-slate-200 rounded mx-auto"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
