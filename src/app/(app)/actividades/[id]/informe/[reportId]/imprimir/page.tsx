import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import PrintButton from "@/components/PrintButton";
import DocumentHeader from "@/components/DocumentHeader";
import type { ActivityReportRow, InstitutionRow } from "@/lib/types";

function fmt(d: string | null | undefined) {
  if (!d) return "—";
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d;
}
function lines(t: string | null | undefined) {
  return (t || "").split("\n").map((s) => s.trim()).filter(Boolean);
}

export default async function ImprimirInformeTallerPage({
  params,
}: {
  params: { id: string; reportId: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const r = db
    .prepare("SELECT * FROM activity_reports WHERE id = ? AND institution_id = ?")
    .get(params.reportId, institutionId) as ActivityReportRow | undefined;
  if (!r) notFound();
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;
  let signaturesList: { signer_id?: string; tipo: "digital" | "fisica"; firma_data_url?: string; observacion?: string }[] = [];
  if (r.signatures_json) {
    try {
      signaturesList = JSON.parse(r.signatures_json);
    } catch {
      signaturesList = [];
    }
  }
  const elaboratedSig = signaturesList.find((s) => s.signer_id === "elaborated" || !s.signer_id) || null;
  const approvedSig = signaturesList.find((s) => s.signer_id === "approved") || null;

  const photos = db
    .prepare("SELECT id, caption FROM attachments WHERE activity_report_id = ? ORDER BY uploaded_at ASC")
    .all(params.reportId) as { id: string; caption: string | null }[];

  const cell = "border border-slate-500 px-2 py-1 align-top text-[10.5pt]";
  const head = `${cell} bg-[#D9D9D9] font-bold text-center`;
  const secH = "text-[#17365D] font-bold text-[13pt] mt-4 mb-1";
  const subH = "text-[#2E74B5] font-bold text-[10.5pt] mt-2 mb-1";
  const p = "text-[10.5pt] text-justify leading-snug mb-1";

  return (
    <div className="max-w-3xl mx-auto bg-white">
      <div className="no-print p-3 bg-slate-100 border-b flex items-center justify-between mb-4 rounded-lg">
        <Link href={`/actividades/${params.id}`} className="text-xs text-slate-600 font-semibold">← Volver</Link>
        <div className="flex items-center gap-2">
          <Link href={`/actividades/${params.id}/informe/${params.reportId}/editar`} className="text-xs bg-slate-200 px-3 py-1.5 rounded font-semibold">✏️ Editar</Link>
          <a href={`/api/actividades/${params.id}/informe/${params.reportId}/export-word`} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded font-semibold">📥 Descargar Word</a>
          <PrintButton hideWordButton />
        </div>
      </div>

      <div id="printable-content" className="p-6 print:p-0 font-serif text-black">
        <style>{`@media print { @page { size: A4; margin: 1.4cm; } }`}</style>
        <DocumentHeader title="Informe de Talleres" subtitle="Departamento de Consejería Estudiantil — DECE" institutionName={institution.name} sealImage={institution.seal_image} compact />

        <table className="w-full border-collapse mt-3">
          <tbody>
            <tr><td className={head} colSpan={4}>DATOS GENERALES</td></tr>
            <tr>
              <td className={head}>Fecha de Informe</td><td className={cell}>{fmt(r.report_date)}</td>
              <td className={head}>No. De Informe</td><td className={`${cell} font-semibold`}>{r.report_number || "—"}</td>
            </tr>
            <tr><td className={head}>Funcionario Responsable de Informe</td><td className={head}>Nombre</td><td className={head}>Contacto</td><td className={head}>Cargo</td></tr>
            <tr>
              <td className={cell}></td>
              <td className={`${cell} font-semibold`}>{r.responsible_name || "—"}</td>
              <td className={cell}>Ext.: {r.responsible_phone_ext || "—"}<br />{r.responsible_email || "—"}</td>
              <td className={cell}>{r.responsible_role || "—"}</td>
            </tr>
            <tr><td className={head}>Informe dirigido a</td><td className={head}>Nombre</td><td className={head}>Contacto</td><td className={head}>Cargo</td></tr>
            <tr>
              <td className={cell}></td>
              <td className={`${cell} font-semibold`}>{r.directed_to_name || "—"}</td>
              <td className={cell}>Ext.: {r.directed_to_phone_ext || "—"}<br />{r.directed_to_email || "—"}</td>
              <td className={cell}>{r.directed_to_role || "—"}</td>
            </tr>
          </tbody>
        </table>

        <table className="w-full border-collapse mt-2">
          <tbody>
            <tr><td className={head} style={{ width: "12%" }}>TEMA:</td><td className={`${cell} font-semibold text-justify`}>{r.tema || "—"}</td></tr>
          </tbody>
        </table>

        <h2 className={secH}>ANTECEDENTES</h2>
        <p className={subH}>1.1 ÁMBITO LEGAL</p>
        <p className={subH}>BASE LEGAL</p>
        {lines(r.legal_basis).map((l, i) => <p key={i} className={p}>{l}</p>)}
        <p className={subH}>ALCANCE</p>
        {lines(r.scope_text).map((l, i) => <p key={i} className={p}>{l}</p>)}
        <p className={subH}>OBJETIVOS</p>
        {lines(r.objective_general).map((l, i) => <p key={i} className={p}>{l}</p>)}
        <p className={subH}>Objetivos específicos</p>
        {lines(r.objectives_specific).map((l, i) => <p key={i} className={p}>{l}</p>)}

        <h2 className={secH}>DESARROLLO O ANÁLISIS</h2>
        {lines(r.development_analysis).map((l, i) => <p key={i} className={p}>{l}</p>)}

        <h2 className={secH}>ACTIVIDAD</h2>
        <table className="w-full border-collapse">
          <tbody>
            <tr><td className={head}>ACTIVIDAD</td><td className={head}>EJE</td><td className={head}>FECHA</td><td className={head}>RESPONSABLE</td><td className={head}>BENEFICIARIOS</td></tr>
            <tr>
              <td className={cell}>{r.activity_name || "—"}</td>
              <td className={cell}>{r.activity_axis || "—"}</td>
              <td className={cell}>{fmt(r.activity_date)}</td>
              <td className={cell}>{r.activity_responsible || "DECE"}</td>
              <td className={cell}>{r.activity_beneficiaries || "—"}</td>
            </tr>
          </tbody>
        </table>

        <h2 className={secH}>RESULTADOS</h2>
        <table className="w-full border-collapse">
          <tbody>
            <tr><td className={head} style={{ width: "18%" }}>Número de participantes</td><td className={head}>Avances</td><td className={head}>Nudos Críticos</td></tr>
            <tr>
              <td className={`${cell} text-center`}>{r.participants_count ?? "—"}</td>
              <td className={cell}>{lines(r.advances).map((l, i) => <div key={i}>{l}</div>)}</td>
              <td className={cell}>{lines(r.critical_nodes).map((l, i) => <div key={i}>{l}</div>)}</td>
            </tr>
          </tbody>
        </table>

        <h2 className={secH}>CONCLUSIONES</h2>
        {lines(r.conclusions).map((l, i) => <p key={i} className={p}>{l}</p>)}
        <h2 className={secH}>RECOMENDACIONES</h2>
        {lines(r.recommendations).map((l, i) => <p key={i} className={p}>{l}</p>)}

        {[["DESARROLLO DEL DOCUMENTO", r.elaborated_by_name, r.elaborated_by_role, r.elaborated_date, elaboratedSig],
          ["APROBACIÓN DEL DOCUMENTO", r.approved_by_name, r.approved_by_role, r.approved_date, approvedSig]].map(([t, n, c, d, sig], i) => {
          const s = sig as { tipo: "digital" | "fisica"; firma_data_url?: string; observacion?: string } | null;
          return (
            <table key={i} className="w-full border-collapse mt-3 break-inside-avoid">
              <tbody>
                <tr><td className={head} colSpan={3}>{t as string}</td></tr>
                <tr><td className={head} style={{ width: "50%" }}>Nombre / Cargo</td><td className={head}>Firma</td><td className={head}>Fecha</td></tr>
                <tr>
                  <td className={cell}>{(n as string) || "—"}<br />{(c as string) || ""}</td>
                  <td className={`${cell} text-center align-middle`} style={{ height: 44 }}>
                    {s?.tipo === "digital" && s.firma_data_url ? (
                      <div className="flex flex-col items-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={s.firma_data_url} alt="Firma digital" className="max-h-12 max-w-[130px] object-contain" />
                        <span className="text-[7.5px] text-emerald-800 font-bold uppercase mt-0.5">Firma Digital Registrada</span>
                      </div>
                    ) : s?.tipo === "fisica" ? (
                      <div className="text-[8.5px] text-slate-500 italic">
                        <span>___________________________</span>
                        <div className="text-[7.5px] text-amber-800 font-semibold">[Firma física manuscrita]</div>
                        {s.observacion && <div className="text-[7px] text-slate-500">{s.observacion}</div>}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">___________________________</span>
                    )}
                  </td>
                  <td className={`${cell} text-center`}>{fmt(d as string)}</td>
                </tr>
              </tbody>
            </table>
          );
        })}

        {/* Banner de Custodia de Respaldo Físico */}
        {r.physical_file_ref && (
          <div className="mt-4 p-2 bg-amber-50 border border-amber-300 rounded text-xs text-amber-900 flex items-center justify-between break-inside-avoid">
            <div>
              <span className="font-bold">📁 UBICACIÓN DE RESPALDO FÍSICO EN ARCHIVO INSTITUCIONAL: </span>
              <span>{r.physical_file_ref}</span>
            </div>
            <span className="text-[9px] bg-amber-200/70 border border-amber-400 px-1.5 py-0.5 rounded font-bold uppercase">
              Custodia DECE
            </span>
          </div>
        )}

        {/* Anexo de Auditoría Distrital: Respaldo Físico Escaneado */}
        {r.physical_evidence_url && (
          <div className="mt-4 pt-4 border-t border-dashed border-slate-300 page-break-inside-avoid">
            <div className="text-center font-bold text-xs text-slate-800 uppercase tracking-wide bg-slate-100 py-1 border border-slate-300 rounded mb-2">
              ANEXO DE AUDITORÍA DISTRITAL: RESPALDO FÍSICO DIGITALIZADO
            </div>
            <div className="text-[9.5px] text-slate-600 mb-2 italic text-center">
              Copia digitalizada del informe de actividad firmado y sellado bajo custodia institucional.
            </div>
            <div className="flex justify-center border border-slate-200 p-2 bg-slate-50 rounded">
              {r.physical_evidence_url.startsWith("data:application/pdf") ? (
                <div className="text-center p-3 text-xs text-blue-700 font-semibold">
                  <span>📄 Documento PDF de Respaldo Físico Digitalizado Adjunto</span>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.physical_evidence_url}
                  alt="Respaldo Físico Digitalizado"
                  className="max-h-[350px] w-auto object-contain border border-slate-300 rounded shadow-xs"
                />
              )}
            </div>
          </div>
        )}

        {photos.length > 0 && (
          <>
            <h2 className={secH}>ANEXO: REGISTRO FOTOGRÁFICO</h2>
            <div className="grid grid-cols-2 gap-3">
              {photos.map((ph) => (
                <div key={ph.id} className="border border-slate-500 p-2 text-center text-[9pt]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/attachments/${ph.id}`} alt={ph.caption || ""} className="w-full h-40 object-cover mb-1" />
                  <span className="italic">{ph.caption || ""}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
