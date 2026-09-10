import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { db } from "@/lib/db";
import PrintButton from "@/components/PrintButton";
import DocumentHeader from "@/components/DocumentHeader";
import {
  parseAttendees,
  parseAgenda,
  parseSignatories,
  ACCEPTANCE_TEXT,
  ACCEPTANCE_NOTE,
} from "@/lib/meetingMinutes";
import type { MeetingMinutesRow, InstitutionRow } from "@/lib/types";

function fmt(d: string | null | undefined) {
  if (!d) return "—";
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d;
}
function lines(t: string | null | undefined) {
  return (t || "").split("\n").map((s) => s.trim()).filter(Boolean);
}

export default async function ImprimirActaReunionPage({ params }: { params: { id: string } }) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const m = db
    .prepare("SELECT * FROM meeting_minutes WHERE id = ? AND institution_id = ?")
    .get(params.id, institutionId) as MeetingMinutesRow | undefined;
  if (!m) notFound();
  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;

  const attendees = parseAttendees(m.attendees_json);
  const agenda = parseAgenda(m.agenda_json);
  const signatories = parseSignatories(m.signatories_json);
  const attRows = [...attendees, ...Array(Math.max(2, 8 - attendees.length)).fill({ nombre: "", correo: "", cargo: "" })];
  const sigRows = [...signatories, ...Array(Math.max(2, 8 - signatories.length)).fill({ nombre: "" })];

  const cell = "border border-slate-500 px-2 py-1 align-top text-[10pt]";
  const lbl = `${cell} bg-[#DEEAF6] font-bold text-[#1F3864] text-center`;
  const bar = `${cell} bg-[#BDD7EE] font-bold text-[#1F3864] text-center`;

  return (
    <div className="max-w-3xl mx-auto bg-white">
      <div className="no-print p-3 bg-slate-100 border-b flex items-center justify-between mb-4 rounded-lg">
        <Link href="/actas-reunion" className="text-xs text-slate-600 font-semibold">← Volver</Link>
        <div className="flex items-center gap-2">
          <Link href={`/actas-reunion/${params.id}/editar`} className="text-xs bg-slate-200 px-3 py-1.5 rounded font-semibold">✏️ Editar</Link>
          <a href={`/api/actas-reunion/${params.id}/export-word`} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded font-semibold">📥 Descargar Word</a>
          <PrintButton hideWordButton />
        </div>
      </div>

      <div id="printable-content" className="p-6 print:p-0 text-black">
        <style>{`@media print { @page { size: A4; margin: 1.4cm; } }`}</style>
        <DocumentHeader
          title="Acta de Reunión"
          subtitle="Ministerio de Educación — Departamento de Consejería Estudiantil (DECE)"
          institutionName={institution.name}
          sealImage={institution.seal_image}
          compact
        />

        <table className="w-full border-collapse mt-3">
          <tbody>
            <tr><td className={bar} colSpan={4}>DATOS GENERALES</td></tr>
            <tr>
              <td className={lbl}>Fecha reunión</td><td className={cell}>{fmt(m.meeting_date)}</td>
              <td className={lbl}>Código Reunión</td><td className={`${cell} font-semibold font-mono`}>{m.meeting_code || "—"}</td>
            </tr>
            <tr>
              <td className={lbl}>Fecha próxima reunión</td><td className={cell}>{fmt(m.next_meeting_date)}</td>
              <td className={lbl}>Dependencia</td><td className={cell}>DECE</td>
            </tr>
            <tr>
              <td className={lbl}>Responsable del Acta</td>
              <td className={cell}>{m.responsible_name || "—"}</td>
              <td className={cell}>{m.responsible_email || "—"}{m.responsible_phone_ext ? ` / Ext. ${m.responsible_phone_ext}` : ""}</td>
              <td className={cell}>{m.responsible_role || "—"}</td>
            </tr>

            <tr><td className={bar} colSpan={4}>ANTECEDENTES DE LA REUNIÓN</td></tr>
            <tr>
              <td className={lbl}>Tema Reunión</td><td className={cell}>{m.meeting_topic || "—"}</td>
              <td className={lbl}>Hora Inicio</td><td className={cell}>{m.start_time || "—"}</td>
            </tr>
            <tr>
              <td className={lbl}>Lugar</td><td className={cell}>{m.location || "—"}</td>
              <td className={lbl}>Hora Fin</td><td className={cell}>{m.end_time || "—"}</td>
            </tr>
            <tr>
              <td className={lbl}>Antecedentes de la Temática</td>
              <td className={`${cell} text-justify`} colSpan={3}>
                {lines(m.thematic_background).map((l, i) => <p key={i} className="mb-1">{l}</p>)}
                {lines(m.thematic_background).length === 0 && "—"}
              </td>
            </tr>
          </tbody>
        </table>

        <table className="w-full border-collapse mt-2">
          <tbody>
            <tr><td className={bar} colSpan={3}>ASISTENTES</td></tr>
            <tr><td className={lbl}>Nombre</td><td className={lbl}>Contacto (correo electrónico)</td><td className={lbl}>Cargo</td></tr>
            {attRows.map((a, i) => (
              <tr key={i}>
                <td className={cell}>{a.nombre || " "}</td>
                <td className={cell}>{a.correo || " "}</td>
                <td className={cell}>{a.cargo || " "}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <table className="w-full border-collapse mt-2">
          <tbody>
            <tr><td className={bar} colSpan={4}>DESARROLLO DE LA REUNIÓN</td></tr>
            <tr>
              <td className={lbl} style={{ width: "18%" }}>Tema</td>
              <td className={lbl}>Compromiso</td>
              <td className={lbl} style={{ width: "18%" }}>Responsable</td>
              <td className={lbl} style={{ width: "14%" }}>Fecha Plazo</td>
            </tr>
            {(agenda.length ? agenda : [{ tema: "", compromiso: "", responsable: "", fecha_plazo: "" }]).map((it, i) => (
              <tr key={i}>
                <td className={cell}>{it.tema || " "}</td>
                <td className={`${cell} text-justify`}>{it.compromiso || " "}</td>
                <td className={cell}>{it.responsable || " "}</td>
                <td className={cell}>{fmt(it.fecha_plazo)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <table className="w-full border-collapse mt-2">
          <tbody>
            <tr><td className={bar} colSpan={2}>ACEPTACIÓN</td></tr>
            <tr>
              <td className={`${cell} text-justify text-[#1F3864]`} colSpan={2}>
                <p className="mb-1">{ACCEPTANCE_TEXT}</p>
                <p className="font-bold">{ACCEPTANCE_NOTE}</p>
              </td>
            </tr>
            <tr><td className={lbl}>NOMBRE</td><td className={lbl}>FIRMA</td></tr>
            {sigRows.map((s, i) => (
              <tr key={i}>
                <td className={cell}>{s.nombre || " "}</td>
                <td className={cell} style={{ height: 34 }}>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        <table className="w-full border-collapse mt-2">
          <tbody>
            <tr><td className={bar}>OBSERVACIONES Y COMENTARIOS ADICIONALES</td></tr>
            <tr>
              <td className={`${cell} text-justify`} style={{ minHeight: 60 }}>
                {lines(m.additional_comments).map((l, i) => <p key={i} className="mb-1">{l}</p>)}
                {lines(m.additional_comments).length === 0 && " "}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
