import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader, EmptyState, formatDate } from "@/components/ui";
import type { DailyAttentionRow } from "@/lib/types";
import {
  ATTENDEE_TYPE_OPTIONS,
  actionAxisOptionsFor,
  actionAxisLabel,
  attendeeTypeLabel,
  parseStringList,
  type AttendeeType,
} from "@/lib/dailyAttention";
import { createDailyAttention, deleteDailyAttention } from "./actions";
import AIAssistButton from "./AIAssistButton";
import DeleteButton from "@/components/DeleteButton";
import VoiceDictationButton from "@/components/VoiceDictationButton";

export default async function AtencionDiariaPage({
  searchParams,
}: {
  searchParams: { tipo?: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const tipo = (searchParams.tipo && ["ESTUDIANTE", "REPRESENTANTE", "DOCENTE_AUTORIDAD"].includes(searchParams.tipo)
    ? searchParams.tipo
    : "ESTUDIANTE") as AttendeeType;

  const entries = db
    .prepare(
      `SELECT * FROM daily_attentions WHERE institution_id = ? AND attendee_type = ? ORDER BY attention_date DESC, created_at DESC LIMIT 200`
    )
    .all(institutionId, tipo) as DailyAttentionRow[];

  const axisOptions = actionAxisOptionsFor(tipo);

  return (
    <div>
      <PageHeader
        title="Registro de atención diaria"
        description="Bitácora de toda atención brindada por el DECE, se haya abierto o no un caso formal."
        action={
          <Link href={`/atencion-diaria/imprimir?tipo=${tipo}`} className="btn-secondary">
            🖨️ Imprimir registro
          </Link>
        }
      />

      <div className="flex gap-2 mb-4 border-b border-slate-200">
        {ATTENDEE_TYPE_OPTIONS.map((o) => (
          <Link
            key={o.value}
            href={`/atencion-diaria?tipo=${o.value}`}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              tipo === o.value ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {o.label}
          </Link>
        ))}
      </div>

      <details className="card p-5 mb-6">
        <summary className="text-sm font-semibold text-slate-700 cursor-pointer">
          + Registrar atención — {attendeeTypeLabel(tipo)}
        </summary>
        <form action={createDailyAttention} className="space-y-3 mt-4">
          <input type="hidden" name="attendee_type" value={tipo} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input type="date" name="attention_date" defaultValue={new Date().toISOString().slice(0, 10)} className="input" />
            {tipo === "DOCENTE_AUTORIDAD" && (
              <input name="duration" placeholder="Duración (ej. 30 min)" className="input" />
            )}
            <select name="jornada" defaultValue="" className="select">
              <option value="" disabled>Jornada...</option>
              <option value="MATUTINA">Matutina</option>
              <option value="VESPERTINA">Vespertina</option>
              <option value="NOCTURNA">Nocturna</option>
            </select>
          </div>

          {tipo === "DOCENTE_AUTORIDAD" && (
            <input name="attendee_name" placeholder="Nombre del docente/autoridad" className="input" />
          )}
          {tipo === "REPRESENTANTE" && (
            <input name="representative_name" placeholder="Nombre del representante" className="input" />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input name="student_name" placeholder="Nombre del/la estudiante" className="input" />
            <input name="student_grade" placeholder="Grado/Año/Paralelo" className="input" />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Motivo *</span>
            <div className="flex items-center gap-2">
              <VoiceDictationButton targetId="daily-attention-reason" />
              <AIAssistButton targetId="daily-attention-reason" fieldLabel="Motivo del registro de atención diaria" />
            </div>
          </div>
          <textarea
            id="daily-attention-reason"
            name="reason"
            required
            rows={2}
            placeholder={tipo === "REPRESENTANTE" ? "Motivo de asistencia al DECE..." : "Motivo de atención..."}
            className="textarea"
          />

          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Eje / acción</p>
            <div className="flex flex-wrap gap-3 text-sm">
              {axisOptions.map((o) => (
                <label key={o.value} className="flex items-center gap-1.5">
                  <input type="checkbox" name="action_axis" value={o.value} className="rounded" />
                  {o.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Modalidad de atención</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input name="modality_tech" placeholder="Medio tecnológico (especifique)" className="input" />
              <input name="modality_phone" placeholder="N° teléfono de contacto" className="input" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="modality_signed" className="rounded" />
                Firma registrada
              </label>
            </div>
          </div>

          {tipo === "DOCENTE_AUTORIDAD" && (
            <div>
              <label className="label text-xs">¿Presenta ficha de detección?</label>
              <select name="has_detection_sheet" defaultValue="" className="select max-w-xs">
                <option value="">—</option>
                <option value="SI">Sí</option>
                <option value="NO">No</option>
              </select>
            </div>
          )}

          <textarea name="observations" rows={2} placeholder="Observación (opcional)..." className="textarea" />

          <div className="flex justify-end">
            <button type="submit" className="btn-primary">Guardar atención</button>
          </div>
        </form>
      </details>

      {entries.length === 0 ? (
        <EmptyState title="Sin atenciones registradas todavía" description={`No hay registros de "${attendeeTypeLabel(tipo)}" aún.`} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Fecha</th>
                <th className="text-left px-4 py-3">Estudiante</th>
                {tipo === "REPRESENTANTE" && <th className="text-left px-4 py-3">Representante</th>}
                {tipo === "DOCENTE_AUTORIDAD" && <th className="text-left px-4 py-3">Docente/Autoridad</th>}
                <th className="text-left px-4 py-3">Motivo</th>
                <th className="text-left px-4 py-3">Eje/Acción</th>
                <th className="text-left px-4 py-3">Observación</th>
                <th className="text-left px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(e.attention_date)}</td>
                  <td className="px-4 py-3">{e.student_name || "—"}</td>
                  {tipo === "REPRESENTANTE" && <td className="px-4 py-3">{e.representative_name || "—"}</td>}
                  {tipo === "DOCENTE_AUTORIDAD" && <td className="px-4 py-3">{e.attendee_name || "—"}</td>}
                  <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{e.reason}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {parseStringList(e.action_axis).map((a) => actionAxisLabel(a)).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-400 max-w-xs truncate">{e.observations || "—"}</td>
                  <td className="px-4 py-3">
                    <DeleteButton
                      confirmMessage="¿Borrar este registro de atención diaria? Esta acción no se puede deshacer."
                      onDelete={async () => {
                        "use server";
                        await deleteDailyAttention(e.id);
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
