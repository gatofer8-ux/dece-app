import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import PrintButton from "@/components/PrintButton";
import { getSession, listEntriesForSession } from "@/lib/alertIdentificationSessions";
import {
  parseAttendees,
  mergeAttendeesWithReportingTeachers,
  ACTA_ALERTAS_ACEPTACION_TEXT,
  ACTA_ALERTAS_NOTIFICACION_TEXT,
  ACTA_ALERTAS_ACEPTACION_NOTE,
} from "@/lib/alertIdentification";
import { RISK_TYPE_LABELS, type RiskType } from "@/lib/types";
import type { InstitutionRow } from "@/lib/types";

function fmt(d: string | null | undefined) {
  if (!d) return "—";
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d;
}
function lines(t: string | null | undefined) {
  return (t || "").split("\n").map((s) => s.trim()).filter(Boolean);
}

export default async function ImprimirAlertaIdentificacionPage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const s = getSession(params.id, institutionId);
  if (!s) notFound();
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;

  const entries = listEntriesForSession(s.id);
  const attendees = mergeAttendeesWithReportingTeachers(parseAttendees(s.attendees_json), entries);
  const attRows = [...attendees, ...Array(Math.max(2, 8 - attendees.length)).fill({ nombre: "", telefono: "" })];
  const entryRows = [...entries, ...Array(Math.max(2, 8 - entries.length)).fill({ student_name: "", risk_type: "", description: "", teacher_name: "" })];

  const NAVY = "#366092";
  const cell = "border border-slate-500 px-2 py-1 align-top text-[10pt]";
  const lbl = `${cell} bg-[#D9D9D9] font-bold text-center`;
  const bar = `${cell} bg-[#BFBFBF] font-bold text-center`;

  return (
    <div className="max-w-3xl mx-auto bg-white">
      <div className="no-print p-3 bg-slate-100 border-b flex items-center justify-between mb-4 rounded-lg">
        <Link href={`/alertas-identificacion/${params.id}`} className="text-xs text-slate-600 font-semibold">← Volver</Link>
        <div className="flex items-center gap-2">
          <a href={`/api/alertas-identificacion/${params.id}/export-word`} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded font-semibold">📥 Descargar Word</a>
          <PrintButton hideWordButton />
        </div>
      </div>

      <div id="printable-content" className="p-6 print:p-0 text-black" style={{ color: NAVY }}>
        <style>{`@media print { @page { size: A4; margin: 1.4cm; } }`}</style>

        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className={cell} colSpan={2}></td>
              <td className={cell} colSpan={4} style={{ textAlign: "center", fontWeight: "bold" }}>Ministerio de Educación, Deporte y Cultura</td>
              <td className={lbl}>Versión:</td>
              <td className={cell}>2.0</td>
            </tr>
            <tr>
              <td className={cell} colSpan={2}></td>
              <td className={cell} colSpan={6} style={{ textAlign: "center", fontWeight: "bold", fontSize: "12pt" }}>ACTA DE IDENTIFICACIÓN DE ALERTAS</td>
            </tr>

            <tr><td className={bar} colSpan={8}>DATOS GENERALES</td></tr>
            <tr>
              <td className={lbl} colSpan={2}>Fecha reunión</td><td className={cell} colSpan={2}>{fmt(s.fecha)}</td>
              <td className={lbl} colSpan={2}>Dependencia</td><td className={cell} colSpan={2}>DEPARTAMENTO DE CONSEJERÍA ESTUDIANTIL</td>
            </tr>
            <tr>
              <td className={lbl} colSpan={2}>Responsable del Acta</td><td className={lbl} colSpan={2}>Nombre</td>
              <td className={lbl} colSpan={2}>Correo Electrónico</td><td className={lbl}>Ext. Telefónica</td><td className={lbl}>Cargo</td>
            </tr>
            <tr>
              <td className={cell} colSpan={2}></td><td className={cell} colSpan={2}>{s.responsible_name || "—"}</td>
              <td className={cell} colSpan={2}>{s.responsible_email || "—"}</td><td className={cell}>{s.responsible_phone_ext || "—"}</td><td className={cell}>{s.responsible_role || "—"}</td>
            </tr>

            <tr><td className={bar} colSpan={8}>ANTECEDENTES DE LA REUNIÓN</td></tr>
            <tr>
              <td className={lbl} colSpan={2}>Tema Reunión</td><td className={cell} colSpan={4}>JUNTA DE CURSO {s.curso || ""}</td>
              <td className={lbl} colSpan={2}>Institución</td>
            </tr>
            <tr>
              <td className={lbl} colSpan={2}>Lugar</td><td className={cell} colSpan={4}>{s.lugar || "—"}</td>
              <td className={cell} colSpan={2}>{institution.name}</td>
            </tr>

            <tr><td className={bar} colSpan={8}>ESTUDIANTES EN ALERTA</td></tr>
            <tr>
              <td className={lbl} colSpan={2}>Nombre</td>
              <td className={lbl} colSpan={2}>Riesgo psicosocial</td>
              <td className={lbl} colSpan={2}>Descripción del caso</td>
              <td className={lbl} colSpan={2}>Nombre y Firma del docente que alerta</td>
            </tr>
            {entryRows.map((e, i) => (
              <tr key={i}>
                <td className={cell} colSpan={2}>{e.student_name || " "}</td>
                <td className={cell} colSpan={2}>{RISK_TYPE_LABELS[e.risk_type as RiskType] || e.risk_type || " "}</td>
                <td className={`${cell} text-justify`} colSpan={2}>{e.description || " "}</td>
                <td className={cell} colSpan={2}>{e.teacher_name || " "}</td>
              </tr>
            ))}

            <tr><td className={bar} colSpan={8}>OBSERVACIONES</td></tr>
            <tr>
              <td className={`${cell} text-justify`} colSpan={8}>
                {lines(s.observaciones).map((l, i) => <p key={i} className="mb-1">{l}</p>)}
                {lines(s.observaciones).length === 0 && "—"}
              </td>
            </tr>

            <tr>
              <td className={`${cell} text-justify font-bold`} colSpan={8}>
                <p className="mb-1">{ACTA_ALERTAS_ACEPTACION_TEXT}</p>
                <p className="mb-1">{ACTA_ALERTAS_NOTIFICACION_TEXT}</p>
                <p>{ACTA_ALERTAS_ACEPTACION_NOTE}</p>
              </td>
            </tr>

            <tr><td className={bar} colSpan={8}>ASISTENTES</td></tr>
            <tr>
              <td className={lbl} colSpan={3}>Nombre</td>
              <td className={lbl} colSpan={3}>Teléfono de contacto</td>
              <td className={lbl} colSpan={2}>Firma</td>
            </tr>
            {attRows.map((a, i) => (
              <tr key={i}>
                <td className={cell} colSpan={3}>{a.nombre || " "}</td>
                <td className={cell} colSpan={3}>{a.telefono || " "}</td>
                <td className={cell} colSpan={2} style={{ height: 30 }}>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 text-black text-center text-[9pt] border-t border-b border-black py-1 font-bold">
          DOCUMENTACIÓN DE LA DIRECCIÓN NACIONAL DE ADMINISTRACIÓN DE PROCESOS
        </div>
        <table className="w-full border-collapse text-black text-[9pt]">
          <tbody>
            <tr>
              <td className="border border-slate-500 px-2 py-1 font-bold">Fecha Desarrollo</td>
              <td className="border border-slate-500 px-2 py-1">01/04/2014</td>
              <td className="border border-slate-500 px-2 py-1 font-bold">Responsable Desarrollo</td>
              <td className="border border-slate-500 px-2 py-1">Jessica Torres C.</td>
              <td className="border border-slate-500 px-2 py-1 font-bold text-center">Versión del Formato</td>
            </tr>
            <tr>
              <td className="border border-slate-500 px-2 py-1 font-bold">Fecha Última Revisión</td>
              <td className="border border-slate-500 px-2 py-1">24/07/2014</td>
              <td className="border border-slate-500 px-2 py-1 font-bold">Código del Formato</td>
              <td className="border border-slate-500 px-2 py-1">AR-01-2014</td>
              <td className="border border-slate-500 px-2 py-1 text-center">2.0</td>
            </tr>
          </tbody>
        </table>

        {/* Banner de Custodia en Archivo Físico Institucional */}
        {s.physical_file_ref && (
          <div className="mt-4 p-2.5 bg-amber-50/80 border border-amber-300 rounded text-[9pt] text-amber-950 flex items-center justify-between">
            <span className="font-bold flex items-center gap-1.5">
              <span>📁</span> Ubicación en Archivo Físico Institucional:
            </span>
            <span className="font-semibold text-amber-900">{s.physical_file_ref}</span>
          </div>
        )}
      </div>

      {/* Anexo de Auditoría Distrital si existe evidencia física escaneada */}
      {s.physical_evidence_url && (
        <div className="print:break-before-page p-6 sm:p-8 bg-white border-2 border-dashed border-slate-300 print:border-slate-400 mt-6 max-w-3xl mx-auto w-full shadow-sm print:shadow-none">
          <div className="text-center pb-3 border-b border-slate-300">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              ANEXO DE AUDITORÍA DISTRITAL: ACTA DE JUNTA DE CURSO FIRMADA EN FÍSICO
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Constancia oficial de respaldo documental físico y firmas de responsabilidad según normativa de archivo DECE
            </p>
          </div>

          <div className="my-4 p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
            <p><span className="font-semibold text-slate-700">Ubicación en Archivo Físico:</span> {s.physical_file_ref || "Carpeta DECE Institucional"}</p>
            <p><span className="font-semibold text-slate-700">Curso:</span> {s.curso || "—"} &bull; <span className="font-semibold text-slate-700">Fecha de Reunión:</span> {fmt(s.fecha)}</p>
            <p><span className="font-semibold text-slate-700">Responsable del Acta:</span> {s.responsible_name || "—"}</p>
          </div>

          <div className="mt-4 flex flex-col items-center">
            <p className="text-xs text-slate-500 mb-2 font-medium">Documento Físico Firmado y Digitalizado:</p>
            {s.physical_evidence_url.startsWith("data:image/") || s.physical_evidence_url.match(/\.(png|jpg|jpeg|webp)$/i) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={s.physical_evidence_url}
                alt="Acta de Identificación de Alertas Digitalizada"
                className="max-w-full max-h-[820px] object-contain border border-slate-300 rounded shadow-xs"
              />
            ) : (
              <div className="p-6 border-2 border-dashed border-slate-300 rounded text-center w-full">
                <span className="text-3xl block mb-2">📄</span>
                <p className="text-xs font-semibold text-slate-700">Archivo digital adjunto (PDF / Documento)</p>
                <a
                  href={s.physical_evidence_url}
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
