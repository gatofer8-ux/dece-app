import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, requireInstitutionId } from "@/lib/session";
import { PageHeader, EmptyState, formatDate, getTodayEcuador } from "@/components/ui";
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
  searchParams: { tipo?: string; mes?: string; q?: string };
}) {
  const session = await requireRole(["ADMIN", "DECE"]);
  const institutionId = requireInstitutionId(session);
  const tipo = (searchParams.tipo && ["ESTUDIANTE", "REPRESENTANTE", "DOCENTE_AUTORIDAD"].includes(searchParams.tipo)
    ? searchParams.tipo
    : "ESTUDIANTE") as AttendeeType;
  const mes = searchParams.mes && /^\d{4}-\d{2}$/.test(searchParams.mes) ? searchParams.mes : "";
  const q = searchParams.q ? searchParams.q.trim() : "";

  let where = "WHERE institution_id = ? AND attendee_type = ?";
  const params: any[] = [institutionId, tipo];

  if (mes) {
    where += " AND attention_date LIKE ?";
    params.push(`${mes}%`);
  }

  if (q) {
    where += " AND (student_name LIKE ? OR representative_name LIKE ? OR attendee_name LIKE ? OR reason LIKE ?)";
    const term = `%${q}%`;
    params.push(term, term, term, term);
  }

  const entries = db
    .prepare(
      `SELECT * FROM daily_attentions ${where} ORDER BY attention_date DESC, created_at DESC LIMIT 300`
    )
    .all(...params) as DailyAttentionRow[];

  const axisOptions = actionAxisOptionsFor(tipo);

  const queryParams = new URLSearchParams();
  queryParams.set("tipo", tipo);
  if (mes) queryParams.set("mes", mes);
  const filterQueryStr = queryParams.toString();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Registro de atención diaria"
        description="Bitácora de toda atención brindada por el DECE, se haya abierto o no un caso formal."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/atencion-diaria/imprimir?${filterQueryStr}`}
              target="_blank"
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <span>🖨️</span>
              <span>Imprimir</span>
            </Link>
            <a
              href={`/api/atencion-diaria/export-word?${filterQueryStr}`}
              className="btn-secondary text-xs flex items-center gap-1.5"
              title="Descargar registro en Word oficial (.docx)"
            >
              <span>📥</span>
              <span>Word</span>
            </a>
            <a
              href={`/api/atencion-diaria/export-excel?${filterQueryStr}`}
              className="btn-secondary text-xs flex items-center gap-1.5"
              title="Descargar registro en Excel estructurado (.xlsx)"
            >
              <span>📊</span>
              <span>Excel</span>
            </a>
          </div>
        }
      />

      <div className="flex gap-2 border-b border-slate-200">
        {ATTENDEE_TYPE_OPTIONS.map((o) => (
          <Link
            key={o.value}
            href={`/atencion-diaria?tipo=${o.value}${mes ? `&mes=${mes}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              tipo === o.value ? "border-brand-600 text-brand-700 font-bold" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {o.label}
          </Link>
        ))}
      </div>

      {/* Barra de Filtros por Período y Búsqueda */}
      <form method="GET" action="/atencion-diaria" className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <input type="hidden" name="tipo" value={tipo} />
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="flex items-center gap-1.5">
            <label htmlFor="filter-mes" className="font-semibold text-slate-600 whitespace-nowrap">
              Filtrar por Mes:
            </label>
            <input
              id="filter-mes"
              type="month"
              name="mes"
              defaultValue={mes}
              className="input text-xs py-1 px-2.5 bg-white border-slate-300 rounded-lg max-w-[150px]"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Buscar por estudiante, tutor o motivo..."
              className="input text-xs py-1 px-2.5 bg-white border-slate-300 rounded-lg w-full"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="submit" className="btn-primary text-xs py-1 px-3">
            Filtrar
          </button>
          {(mes || q) && (
            <Link
              href={`/atencion-diaria?tipo=${tipo}`}
              className="text-xs text-slate-500 hover:text-slate-700 underline px-1"
            >
              Limpiar
            </Link>
          )}
        </div>
      </form>

      <details className="card p-5 mb-6">
        <summary className="text-sm font-semibold text-slate-700 cursor-pointer">
          + Registrar atención — {attendeeTypeLabel(tipo)}
        </summary>
        <form action={createDailyAttention} className="space-y-3 mt-4">
          <input type="hidden" name="attendee_type" value={tipo} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input type="date" name="attention_date" defaultValue={getTodayEcuador()} className="input" />
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
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(e.attention_date)}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{e.student_name || "—"}</td>
                  {tipo === "REPRESENTANTE" && <td className="px-4 py-3 text-slate-600">{e.representative_name || "—"}</td>}
                  {tipo === "DOCENTE_AUTORIDAD" && <td className="px-4 py-3 text-slate-600">{e.attendee_name || "—"}</td>}
                  <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={e.reason}>{e.reason}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {parseStringList(e.action_axis).map((a) => actionAxisLabel(a)).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-400 max-w-xs truncate" title={e.observations || ""}>{e.observations || "—"}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {e.case_file_id ? (
                        <Link
                          href={`/casos/${e.case_file_id}`}
                          className="px-2 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded border border-emerald-200"
                          title="Ver caso DECE vinculado"
                        >
                          📁 Caso
                        </Link>
                      ) : e.student_name ? (
                        <Link
                          href={`/casos/nuevo?estudiante_nombre=${encodeURIComponent(e.student_name)}&motivo=${encodeURIComponent(e.reason)}`}
                          className="px-2 py-1 text-xs font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 rounded border border-brand-200"
                          title="Abrir caso formal DECE a partir de esta atención"
                        >
                          + Caso
                        </Link>
                      ) : null}
                      <DeleteButton
                        confirmMessage="¿Borrar este registro de atención diaria? Esta acción no se puede deshacer."
                        onDelete={async () => {
                          "use server";
                          await deleteDailyAttention(e.id);
                        }}
                      />
                    </div>
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
