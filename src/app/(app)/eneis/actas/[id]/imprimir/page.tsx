import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import PrintButton from "@/components/PrintButton";
import { parseEneisActaParticipants, parseEneisActaCompromisos } from "@/lib/eneis/eneisActas";
import { getEneisActaHeaderInfo } from "@/lib/eneis/eneisActaHeader";
import type { EneisActaRow, InstitutionRow } from "@/lib/types";

function fmt(d: string | null | undefined) {
  if (!d) return "—";
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d;
}
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
function dateParts(iso: string | null | undefined) {
  const m = (iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return { dia: "—", mes: "—", anio: "—" };
  return { dia: String(Number(m[3])), mes: MESES[Number(m[2]) - 1] || m[2], anio: m[1] };
}
function lines(t: string | null | undefined) {
  return (t || "").split("\n").map((s) => s.trim()).filter(Boolean);
}

export default async function ImprimirEneisActaPage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const a = db
    .prepare("SELECT * FROM eneis_actas WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as EneisActaRow | undefined;
  if (!a) notFound();
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;
  const header = getEneisActaHeaderInfo(institution, a.id);

  const participants = parseEneisActaParticipants(a.participants_json);
  const compromisos = parseEneisActaCompromisos(a.compromisos_json);
  const partRows = [...participants, ...Array(Math.max(2, 6 - participants.length)).fill({ nombre: "", cargo: "" })];
  const { dia, mes, anio } = dateParts(a.meeting_date);

  const cell = "border border-slate-800 px-2 py-1 align-top text-[10pt]";
  const title = `${cell} font-bold text-center`;

  return (
    <div className="max-w-3xl mx-auto bg-white">
      <div className="no-print p-3 bg-slate-100 border-b flex items-center justify-between mb-4 rounded-lg">
        <Link href="/eneis/actas" className="text-xs text-slate-600 font-semibold">← Volver</Link>
        <div className="flex items-center gap-2">
          <Link href={`/eneis/actas/${params.id}/editar`} className="text-xs bg-slate-200 px-3 py-1.5 rounded font-semibold">✏️ Editar</Link>
          <a href={`/api/eneis/actas/${params.id}/export-word`} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded font-semibold">📥 Descargar Word</a>
          <PrintButton hideWordButton />
        </div>
      </div>

      <div id="printable-content" className="p-6 print:p-0 text-black">
        <style>{`@media print { @page { size: A4; margin: 1.4cm; } }`}</style>

        <div className="text-center mb-3">
          <p className="text-xs font-bold">{header.districtLine}</p>
          <p className="text-xs font-bold">INSTITUCIÓN EDUCATIVA &quot;{header.institutionName}&quot;</p>
          <p className="text-xs font-bold">ACTA N° {header.actaNumero}</p>
        </div>

        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className={cell}><strong>Ciudad:</strong> {a.ciudad || "—"}</td>
              <td className={cell}><strong>Mes:</strong> {mes}</td>
              <td className={cell}><strong>Día:</strong> {dia}</td>
              <td className={cell}><strong>Año:</strong> {anio}</td>
            </tr>
            <tr>
              <td className={cell} colSpan={2}><strong>Tema:</strong> {a.tema || "—"}</td>
              <td className={cell}><strong>Hora Inicial:</strong> {a.hora_inicio || "—"}</td>
              <td className={cell}><strong>Hora Final:</strong> {a.hora_fin || "—"}</td>
            </tr>
            <tr>
              <td className={cell} colSpan={4}><strong>Lugar:</strong> {a.lugar || "—"}</td>
            </tr>
          </tbody>
        </table>

        <p className="text-sm font-bold mt-3 mb-1">Personas convocadas:</p>
        <table className="w-full border-collapse">
          <tbody>
            <tr><td className={title}>NOMBRES Y APELLIDOS</td><td className={title}>CARGO</td></tr>
            {partRows.map((p, i) => (
              <tr key={i}>
                <td className={cell}>{p.nombre || " "}</td>
                <td className={cell}>{p.cargo || " "}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <table className="w-full border-collapse mt-2">
          <tbody>
            <tr><td className={title}>DESARROLLO DE LA REUNIÓN</td></tr>
            <tr>
              <td className={`${cell} text-justify`}>
                {lines(a.desarrollo).map((l, i) => <p key={i} className="mb-1">{l}</p>)}
                {lines(a.desarrollo).length === 0 && " "}
              </td>
            </tr>
          </tbody>
        </table>

        <table className="w-full border-collapse mt-2">
          <tbody>
            <tr>
              <td className={title}>COMPROMISOS</td>
              <td className={title}>RESPONSABLES</td>
              <td className={title}>FECHAS TENTATIVAS</td>
            </tr>
            {(compromisos.length ? compromisos : [{ compromiso: "", responsable: "", fecha: "" }]).map((c, i) => (
              <tr key={i}>
                <td className={`${cell} text-justify`}>{c.compromiso || " "}</td>
                <td className={cell}>{c.responsable || " "}</td>
                <td className={cell}>{fmt(c.fecha)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="text-sm font-bold mt-3 mb-1">FIRMAS DE RESPONSABILIDAD</p>
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className={title}>NOMBRES Y APELLIDOS</td>
              <td className={title}>CARGO</td>
              <td className={title}>FIRMAS</td>
            </tr>
            {partRows.map((p, i) => (
              <tr key={i}>
                <td className={cell}>{p.nombre || " "}</td>
                <td className={cell}>{p.cargo || " "}</td>
                <td className={cell} style={{ height: 34 }}>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
