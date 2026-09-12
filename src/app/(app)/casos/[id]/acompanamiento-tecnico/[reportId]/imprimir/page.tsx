import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import PrintButton from "@/components/PrintButton";
import DocumentHeader from "@/components/DocumentHeader";
import type { CaseAccompanimentReportRow, InstitutionRow } from "@/lib/types";
import {
  parseIndicators,
  parseRiskProtection,
  parseExtReferral,
  parsePsychosocialReferral,
  INDICATOR_SIGNOS_FISICOS,
  INDICATOR_SIGNOS_COMPORTAMIENTO,
  INDICATOR_CONDUCTAS_IE,
  FACTOR_PERSONALES_RIESGO,
  FACTOR_PERSONALES_PROTECCION,
  FACTOR_FAMILIARES_RIESGO,
  FACTOR_FAMILIARES_PROTECCION,
  FACTOR_SITUACIONALES_RIESGO,
  FACTOR_SITUACIONALES_PROTECCION,
  EXT_REFERRAL_INSTANCES,
  PSYCHOSOCIAL_REFERRAL_OPTIONS,
} from "@/lib/accompanimentReport";

function fmt(d: string | null | undefined) {
  const m = (d || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d || "";
}

export default async function ImprimirInformeAcompanamientoPage({
  params,
}: {
  params: { id: string; reportId: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const r = db
    .prepare("SELECT * FROM case_accompaniment_reports WHERE id = ? AND case_file_id = ? AND institution_id = ?")
    .get(params.reportId, params.id, institutionId) as CaseAccompanimentReportRow | undefined;
  if (!r) notFound();
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;

  const ind = parseIndicators(r.indicators_json);
  const rp = parseRiskProtection(r.risk_protection_json);
  const ext = parseExtReferral(r.ext_referral_json);
  const psy = parsePsychosocialReferral(r.psychosocial_referral_json);
  const psyName = (o: string) => psy.entries.find((e) => e.option === o)?.name;

  // Firmas duales y respaldo físico
  let acompSignatures: any[] = [];
  try {
    if (r.signatures_json) {
      acompSignatures = JSON.parse(r.signatures_json);
    }
  } catch {}
  const deceSig = acompSignatures.find((s: any) => s.signer_id === "dece" || s.role?.toLowerCase().includes("dece") || s.tipo);

  const cell = "border border-black px-2 py-1 text-[10pt] align-top bg-[#F2F2F2]";
  const lbl = `${cell} font-semibold`;
  const bar = "border border-black bg-[#BFBFBF] font-bold px-2 py-1 text-[10pt]";
  const chk = (opts: string[], sel: string[], otros: string) => (
    <ul className="text-[9pt] space-y-0.5">
      {opts.map((o) => <li key={o}>{sel.includes(o) ? "☑" : "☐"} {o}</li>)}
      <li>Otros: {otros || ""}</li>
    </ul>
  );

  return (
    <div className="max-w-3xl mx-auto bg-white">
      <div className="no-print p-3 bg-slate-100 border-b flex items-center justify-between mb-4 rounded-lg">
        <Link href={`/casos/${params.id}`} className="text-xs text-slate-600 font-semibold">← Volver al caso</Link>
        <div className="flex items-center gap-2">
          <Link href={`/casos/${params.id}/acompanamiento-tecnico/${params.reportId}/editar`} className="text-xs bg-slate-200 px-3 py-1.5 rounded font-semibold">✏️ Editar</Link>
          <a href={`/api/casos/${params.id}/acompanamiento-tecnico/${params.reportId}/export-word`} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded font-semibold">📥 Descargar Word</a>
          <PrintButton hideWordButton />
        </div>
      </div>

      <div id="printable-content" className="p-6 print:p-0 text-black">
        <style>{`@media print { @page { size: A4; margin: 1.3cm; } }`}</style>
        <DocumentHeader title="Informe de Acompañamiento a Víctimas de Violencia" subtitle="Departamento de Consejería Estudiantil — DECE" institutionName={institution.name} sealImage={institution.seal_image} compact />
        <p className="text-center font-bold text-[11pt] my-3 uppercase">
          Informe de acompañamiento a víctimas frente a situaciones de violencia detectadas en el ámbito educativo
        </p>

        <table className="w-full border-collapse">
          <tbody>
            <tr><td className={cell} colSpan={4}><span className="font-semibold">Institución educativa:</span> {institution.name}</td></tr>
            <tr><td className={cell} colSpan={4}><span className="font-semibold">Código AMIE:</span> {institution.amie_code || ""}</td></tr>
            <tr><td className={cell} colSpan={2}><span className="font-semibold">Informe N°:</span> {r.report_number || ""}</td><td className={cell} colSpan={2}><span className="font-semibold">Fecha de elaboración del informe:</span> {fmt(r.report_date)}</td></tr>
            <tr><td className={cell} colSpan={4}><span className="font-semibold">Nombre de profesional DECE que maneja el caso:</span> {r.professional_managing || ""}</td></tr>
          </tbody>
        </table>

        <p className={`${bar} mt-3`}>1. DATOS GENERALES DE IDENTIFICACIÓN DEL ESTUDIANTE O DE LA ESTUDIANTE</p>
        <table className="w-full border-collapse">
          <tbody>
            <tr><td className={lbl}>Apellidos y nombres:</td><td className={cell} colSpan={3}>{r.student_full_name}</td></tr>
            <tr><td className={lbl}>Fecha de nacimiento:</td><td className={cell}>Día: {r.student_birth_day}</td><td className={cell}>Mes: {r.student_birth_month}</td><td className={cell}>Año: {r.student_birth_year}</td></tr>
            <tr><td className={lbl}>Edad:</td><td className={cell} colSpan={3}>{r.student_age}</td></tr>
            <tr><td className={lbl}>Nacionalidad:</td><td className={cell} colSpan={3}>{r.student_nationality}</td></tr>
            <tr><td className={lbl}>Número de cédula o pasaporte:</td><td className={cell} colSpan={3}>{r.student_document_id}</td></tr>
            <tr><td className={lbl}>Grado o curso:</td><td className={cell}>{r.student_grade}</td><td className={lbl}>Jornada:</td><td className={cell}>{r.student_jornada}</td></tr>
          </tbody>
        </table>

        <p className={`${bar} mt-3`}>2. DATOS GENERALES DE LA MADRE, PADRE Y/O REPRESENTANTE LEGAL</p>
        <table className="w-full border-collapse">
          <tbody>
            <tr><td className={lbl}>Nombres y apellidos:</td><td className={cell} colSpan={3}>{r.rep_full_name}</td></tr>
            <tr><td className={lbl}>Número de cédula:</td><td className={cell} colSpan={3}>{r.rep_document_id}</td></tr>
            <tr><td className={lbl}>Vínculo con el/la estudiante:</td><td className={cell} colSpan={3}>{r.rep_relationship}</td></tr>
            <tr><td className={lbl}>Dirección del domicilio:</td><td className={cell} colSpan={3}>{r.rep_address}</td></tr>
            <tr><td className={lbl}>Teléfono de contacto:</td><td className={cell}>Celular: {r.rep_phone_cell}</td><td className={cell} colSpan={2}>Convencional: {r.rep_phone_landline}</td></tr>
          </tbody>
        </table>

        <p className={`${bar} mt-3`}>3. CONTEXTO PSICOSOCIAL Y PEDAGÓGICO</p>
        <p className={lbl}>SITUACIÓN FAMILIAR</p>
        <p className="text-[10pt] text-justify border border-black px-2 py-1 whitespace-pre-wrap bg-[#F2F2F2]">{r.family_situation || "—"}</p>
        <p className={`${lbl} mt-2`}>INDICADORES (SECCIÓN 3.2.1 A. PROTOCOLOS Y RUTAS)</p>
        <table className="w-full border-collapse"><tbody><tr>
          <td className={cell}><b>Signos físicos</b>{chk(INDICATOR_SIGNOS_FISICOS, ind.signos_fisicos, ind.signos_fisicos_otros)}</td>
          <td className={cell}><b>Signos de comportamiento</b>{chk(INDICATOR_SIGNOS_COMPORTAMIENTO, ind.signos_comportamiento, ind.signos_comportamiento_otros)}</td>
          <td className={cell}><b>Conductas en la IE</b>{chk(INDICATOR_CONDUCTAS_IE, ind.conductas_ie, ind.conductas_ie_otros)}</td>
        </tr></tbody></table>
        <p className={`${lbl} mt-2`}>FACTORES DE RIESGO Y PROTECCIÓN (SECCIÓN 3.2.1 B. PROTOCOLOS Y RUTAS)</p>
        <table className="w-full border-collapse"><tbody><tr>
          <td className={cell}><b>PERSONALES (del NNA)</b>
            <p className="text-[9pt] font-semibold mt-1">Factores de riesgo:</p>{chk(FACTOR_PERSONALES_RIESGO, rp.personales_riesgo, rp.personales_riesgo_otros)}
            <p className="text-[9pt] font-semibold mt-1">Factores protector:</p>{chk(FACTOR_PERSONALES_PROTECCION, rp.personales_proteccion, rp.personales_proteccion_otros)}
          </td>
          <td className={cell}><b>FAMILIARES</b>
            <p className="text-[9pt] font-semibold mt-1">Factores de riesgo:</p>{chk(FACTOR_FAMILIARES_RIESGO, rp.familiares_riesgo, rp.familiares_riesgo_otros)}
            <p className="text-[9pt] font-semibold mt-1">Factores protector:</p>{chk(FACTOR_FAMILIARES_PROTECCION, rp.familiares_proteccion, rp.familiares_proteccion_otros)}
          </td>
          <td className={cell}><b>SITUACIONALES Y SOCIALES</b>
            <p className="text-[9pt] font-semibold mt-1">Factores de riesgo:</p>{chk(FACTOR_SITUACIONALES_RIESGO, rp.situacionales_riesgo, rp.situacionales_riesgo_otros)}
            <p className="text-[9pt] font-semibold mt-1">Factores protector:</p>{chk(FACTOR_SITUACIONALES_PROTECCION, rp.situacionales_proteccion, rp.situacionales_proteccion_otros)}
          </td>
        </tr></tbody></table>
        <p className={`${lbl} mt-2`}>RENDIMIENTO ACADÉMICO</p>
        <p className="text-[10pt] text-justify border border-black px-2 py-1 whitespace-pre-wrap bg-[#F2F2F2]">{r.academic_performance || "—"}</p>

        <p className={`${bar} mt-3`}>4. ACCIONES DE ACOMPAÑAMIENTO</p>
        <p className="text-[10pt] text-justify border border-black px-2 py-1 whitespace-pre-wrap bg-[#F2F2F2]">{r.accompaniment_actions || "—"}</p>

        <p className={`${bar} mt-3`}>REFERENCIA EXTERNA</p>
        <p className="text-[10pt] font-semibold mt-1">Procedimiento de referencia a instancias externas:</p>
        <table className="w-full border-collapse"><tbody>
          {EXT_REFERRAL_INSTANCES.map((o) => (
            <tr key={o}><td className={`${cell} w-8 text-center font-bold`}>{ext.selected.includes(o) ? "X" : ""}</td><td className={cell}>{o}</td></tr>
          ))}
        </tbody></table>
        <p className="text-[10pt] font-semibold mt-2">Referencia externa para tratamiento psicológico-social:</p>
        <table className="w-full border-collapse"><tbody>
          {PSYCHOSOCIAL_REFERRAL_OPTIONS.map((o) => (
            <tr key={o}><td className={`${cell} w-8 text-center font-bold`}>{psyName(o) != null ? "X" : ""}</td><td className={cell}>{o}. Indicar nombre: {psyName(o) || ""}</td></tr>
          ))}
        </tbody></table>

        <p className="text-[10pt] mt-4">Fecha de elaboración del Informe técnico de acompañamiento a víctimas de violencia ({fmt(r.signing_date || r.report_date)}):</p>
        <p className="text-[10pt] mt-1 mb-4">Nombre del profesional o la profesional DECE que elaboró el Informe técnico de acompañamiento a víctimas de violencia: <span className="font-semibold">{r.professional_signing || ""}</span></p>

        <div className="my-4">
          {deceSig?.tipo === "digital" && deceSig?.firma_data_url ? (
            <div className="flex flex-col items-start">
              <img src={deceSig.firma_data_url} alt="Firma Profesional" className="h-12 max-w-[180px] object-contain border border-slate-200 rounded px-2 bg-white" />
              <span className="text-[8pt] text-slate-500 font-mono mt-0.5">Firma Digital Verificada</span>
            </div>
          ) : deceSig?.tipo === "fisica" ? (
            <div>
              <div className="w-56 border-b border-black mb-1"></div>
              <span className="text-[8.5pt] text-amber-900 font-semibold">[ FIRMA FÍSICA EN CUSTODIA INSTITUCIONAL ]</span>
            </div>
          ) : (
            <div>
              <p className="text-[10pt]">_______________________________</p>
              <p className="text-[10pt]">FIRMA</p>
            </div>
          )}
        </div>

        {/* Banner de Custodia de Respaldo Físico */}
        {r.physical_file_ref && (
          <div className="my-4 p-2 bg-amber-50 border border-amber-300 rounded text-[9.5pt] text-amber-900 flex items-center justify-between">
            <div>
              <span className="font-bold">📁 UBICACIÓN DE RESPALDO FÍSICO EN ARCHIVO INSTITUCIONAL: </span>
              <span>{r.physical_file_ref}</span>
            </div>
            <span className="text-[8pt] bg-amber-200/70 border border-amber-400 px-2 py-0.5 rounded font-bold uppercase">
              Custodia DECE
            </span>
          </div>
        )}

        {/* Anexo de Auditoría Distrital: Respaldo Físico Escaneado */}
        {r.physical_evidence_url && (
          <div className="mt-6 pt-4 border-t border-dashed border-slate-300 page-break-inside-avoid">
            <div className="text-center font-bold text-[10pt] text-slate-800 uppercase tracking-wide bg-slate-100 py-1.5 border border-slate-300 rounded mb-2">
              ANEXO DE AUDITORÍA DISTRITAL: RESPALDO FÍSICO DIGITALIZADO
            </div>
            <div className="text-[9pt] text-slate-600 mb-2 italic text-center">
              Copia digitalizada del informe físico de acompañamiento con firma manuscrita y sellos institucionales archivados bajo custodia confidencial DECE.
            </div>
            <div className="flex justify-center border border-slate-200 p-2 bg-slate-50 rounded">
              {r.physical_evidence_url.startsWith("data:application/pdf") ? (
                <div className="text-center p-3 text-[10pt] text-blue-700 font-semibold">
                  <span>📄 Documento PDF de Respaldo Físico Digitalizado Adjunto</span>
                </div>
              ) : (
                <img
                  src={r.physical_evidence_url}
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
