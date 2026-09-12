"use client";

import { useState } from "react";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import DualSignatureModal, { type DualSignatureData } from "@/components/DualSignatureModal";
import { createMeetingMinutes, updateMeetingMinutes, draftMeetingField } from "../actions";
import {
  parseAttendees,
  parseAgenda,
  parseSignatories,
  type MeetingAttendee,
  type MeetingSignatory,
  type AI_FIELD_LABELS,
} from "@/lib/meetingMinutes";
import type { MeetingMinutesRow } from "@/lib/types";

type Prefill = Record<string, string>;

function AiButton({
  fieldKey,
  targetId,
  getTopic,
}: {
  fieldKey: keyof typeof AI_FIELD_LABELS;
  targetId: string;
  getTopic: () => string;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function run() {
    const el = document.getElementById(targetId) as HTMLTextAreaElement | null;
    if (!el) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await draftMeetingField(fieldKey, el.value, { topic: getTopic() });
      if (res.error) setErr(res.error);
      else if (res.text) {
        el.value = res.text;
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
    } catch {
      setErr("Error al conectar con la IA.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="inline-flex items-center gap-1 rounded-full border bg-violet-50 border-violet-300 text-violet-700 hover:bg-violet-100 disabled:opacity-60 text-[11px] px-2 py-0.5 font-medium"
      >
        ✨ {loading ? "Redactando…" : "IA"}
      </button>
      {err && <span className="text-[11px] text-red-600">{err}</span>}
    </span>
  );
}

export default function ActasReunionForm({
  mode,
  meetingId,
  prefill,
  initialData,
}: {
  mode: "create" | "edit";
  meetingId?: string;
  prefill: Prefill;
  initialData?: MeetingMinutesRow;
}) {
  const v = (k: string): string => {
    const fromInitial = initialData ? (initialData as unknown as Record<string, unknown>)[k] : undefined;
    if (fromInitial != null) return String(fromInitial);
    const p = prefill[k];
    return p == null ? "" : String(p);
  };

  const [attendees, setAttendees] = useState<MeetingAttendee[]>(
    initialData ? parseAttendees(initialData.attendees_json) : []
  );
  const [signatories, setSignatories] = useState<MeetingSignatory[]>(
    initialData ? parseSignatories(initialData.signatories_json) : []
  );
  const [activeSigningIndex, setActiveSigningIndex] = useState<number | null>(null);

  const legacyAgenda = initialData && !((initialData.desarrollo_narrativo || "").trim())
    ? parseAgenda(initialData.agenda_json)
    : [];

  const action = mode === "edit" ? updateMeetingMinutes.bind(null, meetingId!) : createMeetingMinutes;

  const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="label text-xs">{children}</label>
  );

  const IN = ({ name, type = "text", w, voice }: { name: string; type?: string; w?: string; voice?: boolean }) => (
    <div className={w}>
      <div className="flex items-center justify-between">
        <Label>{LABELS[name] || name}</Label>
        {voice && <VoiceDictationButton targetId={`f-${name}`} />}
      </div>
      <input id={`f-${name}`} name={name} type={type} defaultValue={v(name)} className="input text-sm" />
    </div>
  );

  return (
    <form action={action} className="card p-6 space-y-6 max-w-4xl">
      {mode === "create" && (
        <p className="text-xs text-slate-500">
          El código del acta se asigna automáticamente al guardar (correlativo por institución y año).
        </p>
      )}

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Datos generales</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {IN({ name: "meeting_code" })}
          {IN({ name: "meeting_date", type: "date" })}
          {IN({ name: "next_meeting_date", type: "date" })}
        </div>
        <div className="mt-3">
          {IN({ name: "title_suffix", voice: true })}
          <p className="text-[11px] text-slate-400 mt-1">
            Se muestra junto al título, por ejemplo &quot;de Asesoramiento a Autoridades&quot;. Déjalo en blanco para el título genérico.
          </p>
        </div>
        <div className="border rounded-lg p-3 space-y-2 mt-3">
          <p className="text-xs font-semibold text-slate-600">Responsable del acta</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {IN({ name: "responsible_name", voice: true })}
            {IN({ name: "responsible_role", voice: true })}
            {IN({ name: "responsible_email", type: "email" })}
            {IN({ name: "responsible_phone_ext" })}
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Antecedentes de la reunión</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {IN({ name: "meeting_topic", voice: true, w: "sm:col-span-2" })}
          {IN({ name: "location", voice: true })}
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <Label>{LABELS.thematic_background}</Label>
            <div className="flex items-center gap-2">
              <VoiceDictationButton targetId="f-thematic_background" />
              <AiButton
                fieldKey="thematic_background"
                targetId="f-thematic_background"
                getTopic={() =>
                  (document.getElementById("f-meeting_topic") as HTMLInputElement | null)?.value || v("meeting_topic")
                }
              />
            </div>
          </div>
          <textarea
            id="f-thematic_background"
            name="thematic_background"
            rows={5}
            defaultValue={v("thematic_background")}
            className="textarea text-sm"
          />
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">Asistentes</h3>
          <button
            type="button"
            onClick={() => setAttendees((a) => [...a, { nombre: "", telefono: "" }])}
            className="text-xs bg-slate-200 px-2 py-1 rounded font-semibold"
          >
            + Asistente
          </button>
        </div>
        <div className="space-y-2">
          {attendees.map((a, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-center">
              <input
                name="att_nombre"
                defaultValue={a.nombre}
                placeholder="Nombre"
                className="input text-sm"
              />
              <input
                name="att_telefono"
                defaultValue={a.telefono}
                placeholder="Teléfono de contacto"
                className="input text-sm"
              />
              <button
                type="button"
                onClick={() => setAttendees((arr) => arr.filter((_, j) => j !== i))}
                className="text-red-600 text-xs px-2"
              >
                quitar
              </button>
            </div>
          ))}
          {attendees.length === 0 && (
            <p className="text-xs text-slate-400">Sin asistentes registrados. El acta reservará filas en blanco para la firma.</p>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">Desarrollo de la reunión</h3>
          <div className="flex items-center gap-2">
            <VoiceDictationButton targetId="f-desarrollo_narrativo" />
            <AiButton
              fieldKey="desarrollo_narrativo"
              targetId="f-desarrollo_narrativo"
              getTopic={() =>
                (document.getElementById("f-meeting_topic") as HTMLInputElement | null)?.value || v("meeting_topic")
              }
            />
          </div>
        </div>
        {legacyAgenda.length > 0 && (
          <p className="text-[11px] text-amber-600 mb-1">
            Esta acta tiene {legacyAgenda.length} compromiso(s) guardados con el formato anterior; se seguirán mostrando al
            imprimir mientras este campo esté vacío.
          </p>
        )}
        <textarea
          id="f-desarrollo_narrativo"
          name="desarrollo_narrativo"
          rows={8}
          defaultValue={v("desarrollo_narrativo")}
          className="textarea text-sm"
          placeholder="Redacta en un solo texto lo tratado en la reunión, acuerdos y compromisos."
        />
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">Aceptación — firmantes</h3>
          <button
            type="button"
            onClick={() => setSignatories((s) => [...s, { nombre: "" }])}
            className="text-xs bg-slate-200 px-2 py-1 rounded font-semibold"
          >
            + Firmante
          </button>
        </div>
        <div className="space-y-3">
          {signatories.map((s, i) => (
            <div key={i} className="card p-3 bg-slate-50/70 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1 space-y-1.5">
                <input
                  name="sig_nombre"
                  defaultValue={s.nombre}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSignatories((arr) => arr.map((item, idx) => (idx === i ? { ...item, nombre: val } : item)));
                  }}
                  placeholder="Nombre y apellido del participante *"
                  className="input text-sm w-full bg-white"
                />
                <input type="hidden" name="sig_firma" value={s.firma_data_url || ""} />

                {s.tipo === "digital" || s.firma_data_url ? (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-300 dark:border-emerald-800">
                      <span>✓</span> Firma digital en pantalla
                    </span>
                    {s.firma_data_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.firma_data_url}
                        alt={`Firma de ${s.nombre}`}
                        className="h-7 max-w-[100px] object-contain border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded px-1"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveSigningIndex(i)}
                      className="text-xs text-brand-600 dark:text-cyan-400 hover:underline cursor-pointer"
                    >
                      Modificar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSignatories((arr) =>
                          arr.map((item, idx) =>
                            idx === i
                              ? { ...item, tipo: undefined, firma_data_url: undefined, referencia_fisica: undefined, respaldo_archivo_url: undefined }
                              : item
                          )
                        );
                      }}
                      className="text-xs text-rose-600 hover:underline cursor-pointer"
                    >
                      Borrar
                    </button>
                  </div>
                ) : s.tipo === "fisica" ? (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded flex items-center gap-1 border border-amber-300 dark:border-amber-800">
                      <span>📄</span> Firma física (Papel)
                    </span>
                    {s.referencia_fisica && (
                      <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium truncate max-w-[160px]">
                        📁 {s.referencia_fisica}
                      </span>
                    )}
                    {s.respaldo_archivo_url && (
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <span>📎</span> Respaldo adjunto
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveSigningIndex(i)}
                      className="text-xs text-brand-600 dark:text-cyan-400 hover:underline cursor-pointer"
                    >
                      Modificar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSignatories((arr) =>
                          arr.map((item, idx) =>
                            idx === i
                              ? { ...item, tipo: undefined, firma_data_url: undefined, referencia_fisica: undefined, respaldo_archivo_url: undefined }
                              : item
                          )
                        );
                      }}
                      className="text-xs text-rose-600 hover:underline cursor-pointer"
                    >
                      Borrar
                    </button>
                  </div>
                ) : (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveSigningIndex(i)}
                      className="btn-secondary text-xs px-2.5 py-1 flex items-center gap-1.5 text-slate-700 dark:text-slate-300 hover:bg-brand-50 hover:text-brand-700 border-dashed cursor-pointer"
                    >
                      <span>✍️/📄</span>
                      <span>Registrar Firma (Digital o Física)</span>
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSignatories((arr) => arr.filter((_, j) => j !== i))}
                className="text-rose-600 hover:bg-rose-50 text-xs px-2 py-1 rounded self-end sm:self-center transition-colors cursor-pointer"
                title="Quitar firmante"
              >
                🗑️ Quitar
              </button>
            </div>
          ))}
          {/* Payload JSON enriquecido con dual metadata */}
          <input type="hidden" name="signatories_json_payload" value={JSON.stringify(signatories)} />
          {signatories.length === 0 && (
            <p className="text-xs text-slate-400">
              Sin firmantes. El acta reservará filas en blanco para firmar a mano.
            </p>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-1">
          <Label>{LABELS.additional_comments}</Label>
          <VoiceDictationButton targetId="f-additional_comments" />
        </div>
        <textarea
          id="f-additional_comments"
          name="additional_comments"
          rows={4}
          defaultValue={v("additional_comments")}
          className="textarea text-sm"
        />
      </section>

      <div className="flex justify-end">
        <button type="submit" className="btn-primary">
          {mode === "edit" ? "Guardar cambios" : "Guardar y ver acta"}
        </button>
      </div>

      {activeSigningIndex !== null && (
        <DualSignatureModal
          isOpen={true}
          signatoryName={signatories[activeSigningIndex]?.nombre || `Participante #${activeSigningIndex + 1}`}
          initialData={signatories[activeSigningIndex]}
          onClose={() => setActiveSigningIndex(null)}
          onSave={(data) => {
            setSignatories((arr) =>
              arr.map((item, idx) =>
                idx === activeSigningIndex
                  ? {
                      ...item,
                      tipo: data.tipo,
                      firma_data_url: data.firma_data_url,
                      referencia_fisica: data.referencia_fisica,
                      fecha_firma: data.fecha_firma,
                      respaldo_archivo_url: data.respaldo_archivo_url,
                      respaldo_nombre: data.respaldo_nombre,
                      observacion_firma: data.observacion_firma,
                    }
                  : item
              )
            );
            setActiveSigningIndex(null);
          }}
        />
      )}
    </form>
  );
}

const LABELS: Record<string, string> = {
  meeting_code: "Código del acta",
  meeting_date: "Fecha de la reunión",
  next_meeting_date: "Fecha próxima reunión",
  title_suffix: "Asunto / tipo de reunión (opcional)",
  responsible_name: "Nombre",
  responsible_role: "Cargo",
  responsible_email: "Correo electrónico",
  responsible_phone_ext: "Extensión telefónica",
  meeting_topic: "Tema de la reunión",
  location: "Lugar",
  thematic_background: "Antecedentes de la temática",
  additional_comments: "Observaciones y comentarios adicionales",
};
