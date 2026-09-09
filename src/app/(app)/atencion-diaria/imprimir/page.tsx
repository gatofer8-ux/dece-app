import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { formatDate, formatDateTime } from "@/components/ui";
import type { DailyAttentionRow, InstitutionRow } from "@/lib/types";
import {
  ATTENDEE_TYPE_OPTIONS,
  actionAxisOptionsFor,
  attendeeTypeLabel,
  parseStringList,
  type AttendeeType,
} from "@/lib/dailyAttention";
import PrintButton from "@/components/PrintButton";
import DocumentHeader from "@/components/DocumentHeader";
import DocumentFooter from "@/components/DocumentFooter";

export default async function ImprimirAtencionDiariaPage({
  searchParams,
}: {
  searchParams: { tipo?: string; mes?: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const tipo = (searchParams.tipo && ["ESTUDIANTE", "REPRESENTANTE", "DOCENTE_AUTORIDAD"].includes(searchParams.tipo)
    ? searchParams.tipo
    : "ESTUDIANTE") as AttendeeType;

  const institution = db.prepare("SELECT * FROM institutions WHERE id = ?").get(institutionId) as InstitutionRow;

  let where = "WHERE institution_id = ? AND attendee_type = ?";
  const params: (string | number)[] = [institutionId, tipo];
  if (searchParams.mes && /^\d{4}-\d{2}$/.test(searchParams.mes)) {
    where += " AND attention_date LIKE ?";
    params.push(`${searchParams.mes}%`);
  }

  const entries = db
    .prepare(`SELECT * FROM daily_attentions ${where} ORDER BY attention_date ASC, created_at ASC LIMIT 500`)
    .all(...params) as DailyAttentionRow[];

  const axisOptions = actionAxisOptionsFor(tipo);
  const titleByType: Record<AttendeeType, string> = {
    ESTUDIANTE: "Registro de atención a ESTUDIANTES",
    REPRESENTANTE: "Registro de atención a REPRESENTANTES",
    DOCENTE_AUTORIDAD: "Registro de atención virtual/presencial a PERSONAL DOCENTE Y AUTORIDADES",
  };

  return (
    <div className="max-w-[1300px] mx-auto bg-white">
      <style>{`
        @media print {
          @page { size: landscape; margin: 8mm; }
        }
      `}</style>
      <PrintButton />
      <div id="printable-content" className="p-6 print:p-0 text-[9px] leading-tight">
        <DocumentHeader
          title={titleByType[tipo]}
          subtitle="Departamento de Consejería Estudiantil"
          institutionName={institution.name}
          sealImage={institution.seal_image}
          compact
        />

        <table className="w-full border border-[#2F5496] border-collapse mt-3">
          <thead>
            <tr className="bg-[#2F5496] text-white">
              <th className="border border-[#2F5496]/50 px-1 py-1 w-8">N°</th>
              <th className="border border-[#2F5496]/50 px-1 py-1">Fecha{tipo === "DOCENTE_AUTORIDAD" ? " / Hora / Duración" : ""}</th>
              {tipo === "DOCENTE_AUTORIDAD" && <th className="border border-slate-400 px-1 py-1">Docente/Autoridad</th>}
              {tipo === "REPRESENTANTE" && <th className="border border-slate-400 px-1 py-1">Representante</th>}
              <th className="border border-slate-400 px-1 py-1">Estudiante</th>
              <th className="border border-slate-400 px-1 py-1">Grado/Paralelo</th>
              <th className="border border-slate-400 px-1 py-1">Jornada</th>
              <th className="border border-slate-400 px-1 py-1">{tipo === "REPRESENTANTE" ? "Motivo de asistencia" : "Motivo de atención"}</th>
              {axisOptions.map((o) => (
                <th key={o.value} className="border border-slate-400 px-1 py-1">{o.label}</th>
              ))}
              <th className="border border-slate-400 px-1 py-1">Medio tecnológico / Firma</th>
              <th className="border border-slate-400 px-1 py-1">Teléfono</th>
              {tipo === "DOCENTE_AUTORIDAD" && <th className="border border-slate-400 px-1 py-1">¿Ficha detección?</th>}
              <th className="border border-slate-400 px-1 py-1">Observación</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => {
              const axis = parseStringList(e.action_axis);
              return (
                <tr key={e.id}>
                  <td className="border border-slate-300 px-1 py-1 text-center">{i + 1}</td>
                  <td className="border border-slate-300 px-1 py-1 whitespace-nowrap">
                    {formatDate(e.attention_date)}{e.duration ? ` — ${e.duration}` : ""}
                  </td>
                  {tipo === "DOCENTE_AUTORIDAD" && <td className="border border-slate-300 px-1 py-1">{e.attendee_name || "—"}</td>}
                  {tipo === "REPRESENTANTE" && <td className="border border-slate-300 px-1 py-1">{e.representative_name || "—"}</td>}
                  <td className="border border-slate-300 px-1 py-1">{e.student_name || "—"}</td>
                  <td className="border border-slate-300 px-1 py-1">{e.student_grade || "—"}</td>
                  <td className="border border-slate-300 px-1 py-1">{e.jornada || "—"}</td>
                  <td className="border border-slate-300 px-1 py-1">{e.reason}</td>
                  {axisOptions.map((o) => (
                    <td key={o.value} className="border border-slate-300 px-1 py-1 text-center">
                      {axis.includes(o.value) ? "☑" : "☐"}
                    </td>
                  ))}
                  <td className="border border-slate-300 px-1 py-1">{e.modality_tech || (e.modality_signed ? "Firma" : "—")}</td>
                  <td className="border border-slate-300 px-1 py-1">{e.modality_phone || "—"}</td>
                  {tipo === "DOCENTE_AUTORIDAD" && <td className="border border-slate-300 px-1 py-1 text-center">{e.has_detection_sheet || "—"}</td>}
                  <td className="border border-slate-300 px-1 py-1">{e.observations || "—"}</td>
                </tr>
              );
            })}
            {entries.length === 0 && (
              <tr>
                <td colSpan={20} className="border border-slate-300 px-2 py-4 text-center text-slate-400">
                  Sin registros para {attendeeTypeLabel(tipo).toLowerCase()}{searchParams.mes ? ` en ${searchParams.mes}` : ""}.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <DocumentFooter institution={institution} />
      </div>
    </div>
  );
}
