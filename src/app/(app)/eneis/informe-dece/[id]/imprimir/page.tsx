import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import PrintButton from "@/components/PrintButton";
import { getSignatureDefaults } from "@/lib/caseDocumentDefaults";
import {
  ENEIS_INFORME_DECE_ACTIVIDADES_REQUERIDAS,
  parseEneisInformeDeceActividades,
  formatPeriodoDece,
} from "@/lib/eneis/eneisInformeDece";
import { getEneisInformeDeceNumero } from "@/lib/eneis/eneisInformeDeceNumero";
import type { EneisInformeDeceRow, InstitutionRow } from "@/lib/types";

function fmt(d: string | null | undefined) {
  const m = (d || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d || "—";
}

export default async function ImprimirEneisInformeDecePage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const informe = db
    .prepare("SELECT * FROM eneis_informes_dece WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as EneisInformeDeceRow | undefined;
  if (!informe) notFound();
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;
  const sig = getSignatureDefaults(session as never, institutionId);
  const numero = getEneisInformeDeceNumero(institutionId, informe.id);
  const actividades = parseEneisInformeDeceActividades(informe.actividades_json);

  let signaturesList: { tipo: "digital" | "fisica"; firma_data_url?: string; observacion?: string }[] = [];
  if (informe.signatures_json) {
    try {
      signaturesList = JSON.parse(informe.signatures_json);
    } catch {
      signaturesList = [];
    }
  }
  const deceSig = signaturesList[0] || null;

  const cell = "border border-slate-800 px-2 py-1 align-top text-[9.5pt]";
  const title = `${cell} font-bold text-center`;

  return (
    <div className="max-w-4xl mx-auto bg-white">
      <div className="no-print p-3 bg-slate-100 border-b flex items-center justify-between mb-4 rounded-lg">
        <Link href="/eneis/informe-dece" className="text-xs text-slate-600 font-semibold">← Volver</Link>
        <div className="flex items-center gap-2">
          <Link href={`/eneis/informe-dece/${params.id}/editar`} className="text-xs bg-slate-200 px-3 py-1.5 rounded font-semibold">✏️ Editar</Link>
          <a href={`/api/eneis/informe-dece/${params.id}/export-word`} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded font-semibold">📥 Descargar Word</a>
          <PrintButton hideWordButton />
        </div>
      </div>

      <div id="printable-content" className="p-6 print:p-0 text-black">
        <style>{`@media print { @page { size: A4 landscape; margin: 1.2cm; } }`}</style>

        <p className="text-sm font-bold">INFORME DE ACTIVIDADES Nº {numero}</p>
        <p className="text-sm font-bold">INSTITUCIÓN EDUCATIVA: {institution.name}</p>
        <p className="text-sm font-bold">CODIGO AMIE: {institution.amie_code || "—"}</p>
        <p className="text-sm font-bold mb-3">MES Y AÑO: {formatPeriodoDece(informe.periodo)}</p>

        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className={title} style={{ width: "28%" }}>Actividad Requerida</td>
              <td className={title} style={{ width: "24%" }}>Actividad ejecutada</td>
              <td className={title} style={{ width: "10%" }}>Fecha</td>
              <td className={title} style={{ width: "14%" }}>Nº de beneficiados</td>
              <td className={title}>Registro Fotográfico (sólo 1 fotografía, no collage, por cada ítem)</td>
            </tr>
            {ENEIS_INFORME_DECE_ACTIVIDADES_REQUERIDAS.map((req, i) => {
              const a = actividades[i];
              return (
                <tr key={i}>
                  <td className={`${cell} text-justify`}>{req}</td>
                  <td className={cell}>{a?.ejecutada || " "}</td>
                  <td className={cell}>{fmt(a?.fecha)}</td>
                  <td className={cell}>{a?.beneficiarios || " "}</td>
                  <td className={`${cell} text-center`}>
                    {a?.foto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.foto} alt="Registro fotográfico" className="inline-block max-h-20" />
                    ) : (
                      " "
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-8 text-sm break-inside-avoid">
          <p className="font-semibold text-xs text-slate-700 uppercase mb-2">Firma de Responsabilidad:</p>
          {deceSig?.tipo === "digital" && deceSig.firma_data_url ? (
            <div className="mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={deceSig.firma_data_url} alt="Firma digital" className="max-h-14 max-w-[150px] object-contain" />
              <span className="text-[7.5px] text-emerald-800 font-bold uppercase block mt-0.5">Firma Digital Registrada</span>
            </div>
          ) : deceSig?.tipo === "fisica" ? (
            <div className="text-xs text-slate-500 italic mb-2">
              <span className="text-slate-400">_______________________</span>
              <div className="text-[8.5px] text-amber-800 font-semibold">[Firma física manuscrita]</div>
              {deceSig.observacion && <div className="text-[7.5px] text-slate-500">{deceSig.observacion}</div>}
            </div>
          ) : (
            <p className="mt-6 text-slate-400">_______________________</p>
          )}
          <p className="font-semibold text-xs">{sig.deceProfessional.fullName}</p>
          <p className="text-xs text-slate-600">{sig.deceProfessional.role}</p>
        </div>

        {/* Banner de Custodia de Respaldo Físico */}
        {informe.physical_file_ref && (
          <div className="mt-4 p-2 bg-amber-50 border border-amber-300 rounded text-xs text-amber-900 flex items-center justify-between break-inside-avoid">
            <div>
              <span className="font-bold">📁 UBICACIÓN DE RESPALDO FÍSICO EN ARCHIVO INSTITUCIONAL: </span>
              <span>{informe.physical_file_ref}</span>
            </div>
            <span className="text-[9px] bg-amber-200/70 border border-amber-400 px-1.5 py-0.5 rounded font-bold uppercase">
              Custodia DECE
            </span>
          </div>
        )}

        {/* Anexo de Auditoría Distrital: Respaldo Físico Escaneado */}
        {informe.physical_evidence_url && (
          <div className="mt-4 pt-4 border-t border-dashed border-slate-300 page-break-inside-avoid">
            <div className="text-center font-bold text-xs text-slate-800 uppercase tracking-wide bg-slate-100 py-1 border border-slate-300 rounded mb-2">
              ANEXO DE AUDITORÍA DISTRITAL: RESPALDO FÍSICO DIGITALIZADO
            </div>
            <div className="text-[9.5px] text-slate-600 mb-2 italic text-center">
              Copia digitalizada del informe DECE mensual firmado y sellado bajo custodia institucional.
            </div>
            <div className="flex justify-center border border-slate-200 p-2 bg-slate-50 rounded">
              {informe.physical_evidence_url.startsWith("data:application/pdf") ? (
                <div className="text-center p-3 text-xs text-blue-700 font-semibold">
                  <span>📄 Documento PDF de Respaldo Físico Digitalizado Adjunto</span>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={informe.physical_evidence_url}
                  alt="Respaldo Físico Digitalizado"
                  className="max-h-[350px] w-auto object-contain border border-slate-300 rounded shadow-xs"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
