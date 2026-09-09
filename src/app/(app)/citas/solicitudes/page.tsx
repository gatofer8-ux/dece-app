import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader, Badge, formatDate } from "@/components/ui";
import type { AppointmentRequestRow, UserRow } from "@/lib/types";
import { REQUEST_STATUS_LABELS, requesterRoleLabel } from "@/lib/appointmentRequest";
import { confirmAppointmentRequest, rejectAppointmentRequest } from "./actions";
import { CopyLink } from "./CopyLink";

const STATUS_COLOR: Record<string, string> = {
  PENDIENTE: "amber",
  CONFIRMADA: "green",
  RECHAZADA: "red",
  CANCELADA: "slate",
};

export default async function SolicitudesCitaPage() {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);

  const pending = db
    .prepare("SELECT * FROM appointment_requests WHERE institution_id = ? AND status = 'PENDIENTE' ORDER BY created_at ASC")
    .all(institutionId) as AppointmentRequestRow[];
  const reviewed = db
    .prepare("SELECT * FROM appointment_requests WHERE institution_id = ? AND status != 'PENDIENTE' ORDER BY reviewed_at DESC LIMIT 30")
    .all(institutionId) as AppointmentRequestRow[];
  const professionals = db
    .prepare("SELECT * FROM users WHERE institution_id = ? AND role IN ('DECE','ADMIN') AND active = 1")
    .all(institutionId) as UserRow[];

  return (
    <div>
      <PageHeader
        title="Solicitudes de cita"
        description="Solicitudes enviadas por la comunidad educativa desde el enlace público. Confírmalas con fecha y hora, o recházalas — en ambos casos se le avisa por correo a quien la pidió."
      />

      <div className="mb-8 p-4 bg-emerald-50 rounded-lg border border-emerald-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-emerald-800">Tu enlace público de agendamiento</h3>
          <p className="text-xs text-emerald-700 mt-1">Comparte este enlace exacto con los padres de familia de TU institución. Así entrarán directo sin tener que buscar el colegio.</p>
        </div>
        <div className="flex w-full sm:w-auto items-center gap-2 bg-white px-3 py-2 rounded-md border border-emerald-200 shadow-sm">
          <CopyLink path={`/solicitar-cita/${institutionId}`} />
        </div>
      </div>

      <h2 className="text-sm font-semibold text-slate-700 mb-3">Pendientes ({pending.length})</h2>
      <div className="space-y-4 mb-8">
        {pending.map((r) => (
          <div key={r.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
              <div>
                <div className="font-medium text-slate-800">{r.requester_name} <span className="text-xs text-slate-400 font-normal">· {requesterRoleLabel(r.requester_role)}</span></div>
                <div className="text-xs text-slate-500">{r.requester_email}{r.requester_phone ? ` · ${r.requester_phone}` : ""}</div>
                {r.student_name && <div className="text-xs text-slate-500">Estudiante: {r.student_name} {r.student_course ? `(${r.student_course})` : ""}</div>}
              </div>
              <Badge color={STATUS_COLOR[r.status]}>{REQUEST_STATUS_LABELS[r.status]}</Badge>
            </div>
            <p className="text-sm text-slate-600 mb-3">{r.reason}</p>
            {r.preferred_date && (
              <p className="text-xs text-slate-400 mb-3">Preferencia del solicitante: {formatDate(r.preferred_date)} {r.preferred_time || ""}</p>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
              <form action={confirmAppointmentRequest.bind(null, r.id)} className="space-y-2">
                <div className="text-xs font-semibold text-slate-500 uppercase">Confirmar</div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" name="date" required defaultValue={r.preferred_date || ""} className="input text-xs !py-1.5" />
                  <input type="time" name="start_time" required defaultValue={r.preferred_time || ""} className="input text-xs !py-1.5" />
                </div>
                <select name="professional_id" defaultValue={session.user.id} className="select text-xs !py-1.5">
                  {professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input name="location" placeholder="Lugar (opcional)" className="input text-xs !py-1.5" />
                <button type="submit" className="btn-primary text-xs w-full">✅ Confirmar y avisar por correo</button>
              </form>
              <form action={rejectAppointmentRequest.bind(null, r.id)} className="space-y-2">
                <div className="text-xs font-semibold text-slate-500 uppercase">Rechazar</div>
                <textarea name="reject_reason" rows={2} placeholder="Motivo (opcional, se incluye en el correo)" className="textarea text-xs" />
                <button type="submit" className="btn-secondary text-xs w-full">✕ Rechazar y avisar por correo</button>
              </form>
            </div>
          </div>
        ))}
        {pending.length === 0 && <p className="text-sm text-slate-400">No hay solicitudes pendientes.</p>}
      </div>

      <h2 className="text-sm font-semibold text-slate-700 mb-3">Revisadas recientemente</h2>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Solicitante</th>
              <th className="text-left px-4 py-3">Motivo</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-left px-4 py-3">Revisada</th>
              <th className="text-left px-4 py-3">Notificar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reviewed.map((r) => {
              let waLink = null;
              if (r.requester_phone) {
                const cleanPhone = r.requester_phone.replace(/\D/g, "");
                const waPhone = cleanPhone.startsWith("0") ? "593" + cleanPhone.slice(1) : cleanPhone;
                
                let msg = "";
                if (r.status === "CONFIRMADA") {
                  msg = `Hola ${r.requester_name}, te saludamos del DECE. Tu cita ha sido CONFIRMADA.`;
                } else if (r.status === "RECHAZADA") {
                  msg = `Hola ${r.requester_name}, te saludamos del DECE. Sobre tu solicitud de cita: lamentablemente no pudimos confirmarla. ${r.reject_reason ? `Motivo: ${r.reject_reason}` : "Por favor contáctanos por otro medio."}`;
                }
                
                if (msg) {
                  waLink = `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`;
                }
              }

              return (
                <tr key={r.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{r.requester_name}</div>
                    <div className="text-xs text-slate-500">{r.requester_phone || "Sin teléfono"}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{r.reason}</td>
                  <td className="px-4 py-3"><Badge color={STATUS_COLOR[r.status]}>{REQUEST_STATUS_LABELS[r.status]}</Badge></td>
                  <td className="px-4 py-3 text-slate-600">{r.reviewed_at ? formatDate(r.reviewed_at) : "—"}</td>
                  <td className="px-4 py-3">
                    {waLink ? (
                      <a href={waLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                        Avisar
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">N/A</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {reviewed.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Sin solicitudes revisadas todavía.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
