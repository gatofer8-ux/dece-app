import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import PrintButton from "@/components/PrintButton";
import {
  parseEneisDiagnosticoObjetivos,
  parseEneisDiagnosticoActividades,
  parseEneisDiagnosticoResultados,
  parseEneisDiagnosticoResponsables,
  ENEIS_DIAGNOSTICO_GUIA_PREGUNTAS,
} from "@/lib/eneis/eneisDiagnostico";
import type { EneisDiagnosticoRow, InstitutionRow } from "@/lib/types";

function fmt(d: string | null | undefined) {
  if (!d) return "—";
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d;
}
function lines(t: string | null | undefined) {
  return (t || "").split("\n").map((s) => s.trim()).filter(Boolean);
}

export default async function ImprimirEneisDiagnosticoPage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const d = db
    .prepare("SELECT * FROM eneis_diagnosticos WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as EneisDiagnosticoRow | undefined;
  if (!d) notFound();
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;

  const objetivos = parseEneisDiagnosticoObjetivos(d.objetivos_especificos_json);
  const actividades = parseEneisDiagnosticoActividades(d.actividades_json);
  const resultados = parseEneisDiagnosticoResultados(d.resultados_json);
  const responsables = parseEneisDiagnosticoResponsables(d.responsables_json);
  const respRows = [...responsables, ...Array(Math.max(2, 4 - responsables.length)).fill({ nombre: "", cargo: "" })];

  const cell = "border border-slate-800 px-2 py-1 align-top text-[9pt]";
  const title = `${cell} font-bold text-center`;

  return (
    <div className="max-w-4xl mx-auto bg-white">
      <div className="no-print p-3 bg-slate-100 border-b flex items-center justify-between mb-4 rounded-lg">
        <Link href="/eneis/diagnostico" className="text-xs text-slate-600 font-semibold">← Volver</Link>
        <div className="flex items-center gap-2">
          <Link href={`/eneis/diagnostico/${params.id}/editar`} className="text-xs bg-slate-200 px-3 py-1.5 rounded font-semibold">✏️ Editar</Link>
          <a href={`/api/eneis/diagnostico/${params.id}/export-word`} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded font-semibold">📥 Descargar Word</a>
          <PrintButton hideWordButton />
        </div>
      </div>

      <div id="printable-content" className="p-6 print:p-0 text-black text-sm">
        <style>{`@media print { @page { size: A4; margin: 1.4cm; } }`}</style>

        <p className="text-center font-bold text-base mb-4">INFORME DEL DIAGNÓSTICO INSTITUCIONAL</p>

        <p className="font-bold mb-1">DATOS INFORMATIVOS:</p>
        <p><strong>Zona:</strong> {d.zona || "—"}</p>
        <p><strong>Distrito:</strong> {d.distrito || "—"}</p>
        <p><strong>Institución:</strong> {institution.name}</p>
        <p className="mb-3"><strong>Fecha:</strong> {fmt(d.fecha)}</p>

        <p className="font-bold mb-1">ANTECEDENTES:</p>
        {lines(d.antecedentes).map((l, i) => <p key={i} className="text-justify mb-1">{l}</p>)}
        {lines(d.antecedentes).length === 0 && <p className="mb-3">—</p>}

        <p className="font-bold mt-3 mb-1">OBJETIVOS:</p>
        <p><strong>Objetivo General:</strong> {d.objetivo_general || "—"}</p>
        <p className="font-semibold mt-1">Objetivos Específicos:</p>
        <ul className="list-disc pl-5">
          {objetivos.length ? objetivos.map((o, i) => <li key={i}>{o}</li>) : <li>—</li>}
        </ul>

        <p className="font-bold mt-3 mb-1">ACTIVIDADES REALIZADAS:</p>
        <ul className="list-disc pl-5">
          {actividades.length ? actividades.map((a, i) => <li key={i}>{a}</li>) : <li>—</li>}
        </ul>

        <p className="font-bold mt-3 mb-1">RESULTADOS POR EJE:</p>
        <table className="w-full border-collapse mb-3">
          <tbody>
            <tr>
              <td className={title}>Eje asociado</td>
              <td className={title}>Componentes</td>
              <td className={title}>Fuente</td>
              <td className={title}>Dificultades</td>
              <td className={title}>Positivos</td>
              <td className={title}>Negativos</td>
              <td className={title}>Sesgados</td>
            </tr>
            {(resultados.length ? resultados : [{ eje: "", componentes: "", fuente: "", dificultades: "", positivos: "", negativos: "", sesgados: "" }]).map((r, i) => (
              <tr key={i}>
                <td className={cell}>{r.eje || " "}</td>
                <td className={cell}>{r.componentes || " "}</td>
                <td className={cell}>{r.fuente || " "}</td>
                <td className={cell}>{r.dificultades || " "}</td>
                <td className={cell}>{r.positivos || " "}</td>
                <td className={cell}>{r.negativos || " "}</td>
                <td className={cell}>{r.sesgados || " "}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="font-bold mb-1">CONCLUSIONES:</p>
        {lines(d.conclusiones).map((l, i) => <p key={i} className="text-justify mb-1">{l}</p>)}
        {lines(d.conclusiones).length === 0 && <p className="mb-3">—</p>}

        <p className="font-bold mt-3 mb-1">RECOMENDACIONES:</p>
        {lines(d.recomendaciones).map((l, i) => <p key={i} className="text-justify mb-1">{l}</p>)}
        {lines(d.recomendaciones).length === 0 && <p className="mb-3">—</p>}

        <p className="font-bold mt-3 mb-2">RESPONSABLES:</p>
        <table className="w-full border-collapse mb-6">
          <tbody>
            {respRows.map((rp, i) => (
              <tr key={i}>
                <td className={cell}>Firma: _______________________<br />Nombre: {rp.nombre || " "}</td>
                <td className={cell}>Cargo: {rp.cargo || " "}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="print:break-before-page">
          <p className="text-center font-bold mt-6 mb-1">DIAGNÓSTICO INSTITUCIONAL SOBRE LA ENEIS</p>
          <p className="text-center italic text-xs mb-3">(Estrategia Nacional de Educación Integral en Sexualidad)</p>
          {ENEIS_DIAGNOSTICO_GUIA_PREGUNTAS.map((q, i) => (
            <p key={i} className="font-semibold mt-2">{i + 1}. {q}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
