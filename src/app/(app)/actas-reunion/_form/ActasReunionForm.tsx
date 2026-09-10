"use client";

import { useState } from "react";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import { createMeetingMinutes, updateMeetingMinutes, draftMeetingField } from "../actions";
import {
  parseAttendees,
  parseAgenda,
  parseSignatories,
  type MeetingAttendee,
  type MeetingAgendaItem,
  type MeetingSignatory,
} from "@/lib/meetingMinutes";
import type { MeetingMinutesRow } from "@/lib/types";

type Prefill = Record<string, string>;

function AiButton({
  targetId,
  getTopic,
}: {
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
      const res = await draftMeetingField("thematic_background", el.value, { topic: getTopic() });
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
  const [agenda, setAgenda] = useState<MeetingAgendaItem[]>(
    initialData ? parseAgenda(initialData.agenda_json) : [{ tema: "", compromiso: "", responsable: "", fecha_plazo: "" }]
  );
  const [signatories, setSignatories] = useState<MeetingSignatory[]>(
    initialData ? parseSignatories(initialData.signatories_json) : []
  );

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
          <div />
          {IN({ name: "start_time", type: "time" })}
          {IN({ name: "end_time", type: "time" })}
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <Label>{LABELS.thematic_background}</Label>
            <div className="flex items-center gap-2">
              <VoiceDictationButton targetId="f-thematic_background" />
              <AiButton
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
            onClick={() => setAttendees((a) => [...a, { nombre: "", correo: "", cargo: "" }])}
            className="text-xs bg-slate-200 px-2 py-1 rounded font-semibold"
          >
            + Asistente
          </button>
        </div>
        <div className="space-y-2">
          {attendees.map((a, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
              <input
                name="att_nombre"
                defaultValue={a.nombre}
                placeholder="Nombre"
                className="input text-sm"
              />
              <input
                name="att_correo"
                defaultValue={a.correo}
                placeholder="Correo electrónico"
                className="input text-sm"
              />
              <input name="att_cargo" defaultValue={a.cargo} placeholder="Cargo" className="input text-sm" />
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
            <p className="text-xs text-slate-400">Sin asistentes registrados. El acta reservará filas en blanco.</p>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">Desarrollo de la reunión</h3>
          <button
            type="button"
            onClick={() =>
              setAgenda((a) => [...a, { tema: "", compromiso: "", responsable: "", fecha_plazo: "" }])
            }
            className="text-xs bg-slate-200 px-2 py-1 rounded font-semibold"
          >
            + Punto / compromiso
          </button>
        </div>
        <div className="space-y-3">
          {agenda.map((it, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Punto {i + 1}</span>
                {agenda.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setAgenda((arr) => arr.filter((_, j) => j !== i))}
                    className="text-red-600 text-xs"
                  >
                    quitar
                  </button>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label>Tema</Label>
                  <VoiceDictationButton targetId={`f-ag_tema_${i}`} />
                </div>
                <input id={`f-ag_tema_${i}`} name="ag_tema" defaultValue={it.tema} className="input text-sm" />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label>Compromiso</Label>
                  <VoiceDictationButton targetId={`f-ag_compromiso_${i}`} />
                </div>
                <textarea
                  id={`f-ag_compromiso_${i}`}
                  name="ag_compromiso"
                  rows={2}
                  defaultValue={it.compromiso}
                  className="textarea text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <Label>Responsable</Label>
                  <input name="ag_responsable" defaultValue={it.responsable} className="input text-sm" />
                </div>
                <div>
                  <Label>Fecha plazo</Label>
                  <input name="ag_fecha_plazo" type="date" defaultValue={it.fecha_plazo} className="input text-sm" />
                </div>
              </div>
            </div>
          ))}
        </div>
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
        <div className="space-y-2">
          {signatories.map((s, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                name="sig_nombre"
                defaultValue={s.nombre}
                placeholder="Nombre del participante"
                className="input text-sm flex-1"
              />
              <button
                type="button"
                onClick={() => setSignatories((arr) => arr.filter((_, j) => j !== i))}
                className="text-red-600 text-xs px-2"
              >
                quitar
              </button>
            </div>
          ))}
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
    </form>
  );
}

const LABELS: Record<string, string> = {
  meeting_code: "Código del acta",
  meeting_date: "Fecha de la reunión",
  next_meeting_date: "Fecha próxima reunión",
  responsible_name: "Nombre",
  responsible_role: "Cargo",
  responsible_email: "Correo electrónico",
  responsible_phone_ext: "Extensión telefónica",
  meeting_topic: "Tema de la reunión",
  location: "Lugar",
  start_time: "Hora de inicio",
  end_time: "Hora de fin",
  thematic_background: "Antecedentes de la temática",
  additional_comments: "Observaciones y comentarios adicionales",
};
