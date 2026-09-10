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
      </div>
    </div>
  );
}
