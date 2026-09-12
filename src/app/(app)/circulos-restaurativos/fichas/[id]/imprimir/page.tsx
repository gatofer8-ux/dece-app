import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import PrintButton from "@/components/PrintButton";
import { QUESTION_STAGES, splitLines } from "@/lib/restorativeCircleFicha";
import type { RestorativeCircleFichaRow } from "@/lib/types";

function fmt(d: string | null | undefined) {
  if (!d) return "";
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d;
}

export default async function ImprimirFichaCirculoPage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const f = db
    .prepare("SELECT * FROM restorative_circle_fichas WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as RestorativeCircleFichaRow | undefined;
  if (!f) notFound();

  const box = "border border-black p-3 text-[11pt] leading-relaxed";
  const datosRows: Array<[string, string]> = [
    ["CENTRO EDUCATIVO:", f.center_name || ""],
    ["DISTRITO EDUCATIVO:", f.district_name || ""],
    ["FACILITADOR - FACILITADORA:", f.facilitator_name || ""],
    ["TIPO DE CÍRCULO RESTAURATIVO:", f.circle_type || ""],
    ["N.º PARTICIPANTES:", f.participants_count || ""],
    ["TIPO DE PARTICIPANTES:", f.participant_type || ""],
    ["PROBLEMÁTICA:", f.problematica || ""],
    ["FECHA DEL CÍRCULO RESTAURATIVO:", fmt(f.circle_date)],
    ["HORARIO DEL CÍRCULO RESTAURATIVO:", f.circle_time || ""],
  ];

  const Section = ({ n, title, text, bullets }: { n: string; title: string; text: string | null; bullets?: boolean }) => (
    <section className="mt-5 break-inside-avoid">
      <h2 className="font-bold text-[12.5pt] mb-1.5">
        {n}) {title}
      </h2>
      <div className={box}>
        {splitLines(text).length > 0 ? (
          splitLines(text).map((l, i) => (
            <p key={i} className="mb-1 text-justify">
              {bullets ? `•  ${l}` : l}
            </p>
          ))
        ) : (
          <p>&nbsp;</p>
        )}
      </div>
    </section>
  );

  return (
    <div className="max-w-3xl mx-auto bg-white">
      <div className="no-print p-3 bg-slate-100 border-b flex items-center justify-between mb-4 rounded-lg">
        <Link href="/circulos-restaurativos/fichas" className="text-xs text-slate-600 font-semibold">
          ← Volver
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/circulos-restaurativos/fichas/${params.id}/editar`}
            className="text-xs bg-slate-200 px-3 py-1.5 rounded font-semibold"
          >
            ✏️ Editar
          </Link>
          <a
            href={`/api/circulos-restaurativos/fichas/${params.id}/export-word`}
            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded font-semibold"
          >
            📥 Descargar Word
          </a>
          <PrintButton hideWordButton />
        </div>
      </div>

      <div id="printable-content" className="p-6 print:p-0 font-serif text-black">
        <style>{`@media print { @page { size: A4; margin: 2cm; } }`}</style>

        <h1 className="text-center text-[22pt] font-bold mb-4">FICHA CÍRCULO RESTAURATIVO</h1>

        <h2 className="font-bold text-[13pt] mb-1.5">DATOS GENERALES</h2>
        <table className="w-full border-collapse mb-2">
          <tbody>
            {datosRows.map(([label, value]) => (
              <tr key={label}>
                <td className="border border-black bg-[#D9D9D9] font-bold px-2 py-1.5 text-[11pt] w-2/5 align-middle">
                  {label}
                </td>
                <td className="border border-black px-2 py-1.5 text-[11pt] text-center align-middle">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <Section n="1" title="DIÁGNOSTICO DE LA PROBLEMÁTICA:" text={f.diagnostico} />
        <Section n="2" title="OBJETIVO(S) DEL CÍRCULO RESTAURATIVO:" text={f.objetivos} bullets />
        <Section n="3" title="DECLARACIÓN AFECTIVA / DECLARACIÓN INICIAL" text={f.declaracion_inicial} />

        <section className="mt-5">
          <h2 className="font-bold text-[12.5pt] mb-1.5">4) PREGUNTAS RESTAURATIVAS</h2>
          {QUESTION_STAGES.map((stage) => (
            <div key={stage.key} className="mb-3 break-inside-avoid">
              <p className="text-right font-bold italic text-[11pt] mb-1">
                {stage.numeral}. {stage.title}
              </p>
              <div className={box}>
                {splitLines((f as unknown as Record<string, string | null>)[stage.key]).length > 0 ? (
                  splitLines((f as unknown as Record<string, string | null>)[stage.key]).map((l, i) => (
                    <p key={i} className="mb-0.5">
                      {l}
                    </p>
                  ))
                ) : (
                  <p>&nbsp;</p>
                )}
              </div>
            </div>
          ))}
        </section>

        <Section n="5" title="DECLARACIÓN DE CIERRE" text={f.declaracion_cierre} />
        <Section n="6" title="INFORME DEL CÍRCULO REALIZADO" text={f.informe_circulo} />
        <Section n="7" title="CONCLUSIÓN DE LA INFORMACIÓN RECOLECTADA" text={f.conclusion} bullets />

        <section className="mt-8 break-inside-avoid">
          <h2 className="font-bold text-[12.5pt] mb-2 uppercase">FIRMA DE RESPONSABILIDAD</h2>
          <table className="w-full border-collapse border border-black">
            <tbody>
              <tr>
                <td className="border border-black bg-[#D9D9D9] font-bold px-3 py-1.5 text-[11pt] w-1/2">
                  ELABORADO POR:
                </td>
                <td className="border border-black bg-[#D9D9D9] font-bold px-3 py-1.5 text-[11pt] w-1/2 text-center">
                  FIRMA
                </td>
              </tr>
              <tr>
                <td className="border border-black p-3 text-[11pt] align-top w-1/2">
                  <p className="mb-1.5">
                    <span className="font-bold">Nombre: </span>
                    <span>{f.facilitator_name || "—"}</span>
                  </p>
                  <p className="mb-1.5">
                    <span className="font-bold">Cargo: </span>
                    <span>Profesional DECE / Facilitador(a)</span>
                  </p>
                  {f.center_name && (
                    <p className="mb-1.5 text-[10pt] text-slate-700">
                      <span className="font-bold text-black">Institución: </span>
                      <span>{f.center_name}</span>
                    </p>
                  )}
                  <p className="text-[10pt] text-slate-700">
                    <span className="font-bold text-black">Fecha: </span>
                    <span>{fmt(f.circle_date)}</span>
                  </p>
                </td>
                <td className="border border-black p-3 text-center align-bottom w-1/2" style={{ height: "130px" }}>
                  <div className="w-64 mx-auto border-t border-black pt-1 text-[10pt] font-semibold">
                    Firma de Responsabilidad
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Banner de Custodia de Archivo Físico */}
        {f.physical_file_ref && (
          <div className="mt-4 p-2.5 bg-amber-50/80 border border-amber-300 rounded text-[10pt] text-amber-950 flex items-center justify-between">
            <span className="font-bold flex items-center gap-1.5">
              <span>📁</span> Ubicación en Archivo Físico Institucional:
            </span>
            <span className="font-semibold text-amber-900">{f.physical_file_ref}</span>
          </div>
        )}
      </div>

      {/* Anexo de Auditoría Distrital si existe evidencia física escaneada */}
      {f.physical_evidence_url && (
        <div className="print:break-before-page p-6 sm:p-8 bg-white border-2 border-dashed border-slate-300 print:border-slate-400 mt-6 max-w-3xl mx-auto w-full shadow-sm print:shadow-none">
          <div className="text-center pb-3 border-b border-slate-300">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              ANEXO DE AUDITORÍA DISTRITAL: RESPALDO DE FICHA TÉCNICA FÍSICA
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Constancia oficial de respaldo documental físico según normativa de archivo y gestión DECE
            </p>
          </div>

          <div className="my-4 p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
            <p><span className="font-semibold text-slate-700">Ubicación en Archivo Físico:</span> {f.physical_file_ref || "Carpeta DECE Institucional"}</p>
            <p><span className="font-semibold text-slate-700">Facilitador/a:</span> {f.facilitator_name} &bull; <span className="font-semibold text-slate-700">Fecha:</span> {fmt(f.circle_date)}</p>
          </div>

          <div className="mt-4 flex flex-col items-center">
            <p className="text-xs text-slate-500 mb-2 font-medium">Documento Físico Firmado y Digitalizado:</p>
            {f.physical_evidence_url.startsWith("data:image/") || f.physical_evidence_url.match(/\.(png|jpg|jpeg|webp)$/i) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={f.physical_evidence_url}
                alt="Ficha Técnica Digitalizada"
                className="max-w-full max-h-[820px] object-contain border border-slate-300 rounded shadow-xs"
              />
            ) : (
              <div className="p-6 border-2 border-dashed border-slate-300 rounded text-center w-full">
                <span className="text-3xl block mb-2">📄</span>
                <p className="text-xs font-semibold text-slate-700">Archivo digital adjunto (PDF / Documento)</p>
                <a
                  href={f.physical_evidence_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-600 underline font-medium mt-1 inline-block"
                >
                  Ver archivo original adjunto
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

