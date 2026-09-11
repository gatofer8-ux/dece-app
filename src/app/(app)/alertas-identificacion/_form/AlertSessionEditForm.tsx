"use client";

import { useState } from "react";
import { updateAlertSessionAction } from "../actions";
import { parseAttendees, type AlertSessionAttendee } from "@/lib/alertIdentification";
import type { AlertIdentificationSessionRow } from "@/lib/types";

export default function AlertSessionEditForm({ session }: { session: AlertIdentificationSessionRow }) {
  const [attendees, setAttendees] = useState<AlertSessionAttendee[]>(parseAttendees(session.attendees_json));
  const action = updateAlertSessionAction.bind(null, session.id);

  return (
    <form action={action} className="card p-6 space-y-5">
      <h3 className="text-xs font-semibold text-slate-500 uppercase">Datos de la acta</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label text-xs">Curso</label>
          <input name="curso" defaultValue={session.curso || ""} className="input text-sm" required />
        </div>
        <div>
          <label className="label text-xs">Fecha de la reunión</label>
          <input type="date" name="fecha" defaultValue={session.fecha || ""} className="input text-sm" />
        </div>
        <div className="sm:col-span-2">
          <label className="label text-xs">Lugar</label>
          <input name="lugar" defaultValue={session.lugar || ""} className="input text-sm" />
        </div>
      </div>

      <div className="border rounded-lg p-3 space-y-2">
        <p className="text-xs font-semibold text-slate-600">Responsable del acta</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input name="responsible_name" defaultValue={session.responsible_name || ""} placeholder="Nombre" className="input text-sm" />
          <input name="responsible_role" defaultValue={session.responsible_role || ""} placeholder="Cargo" className="input text-sm" />
          <input name="responsible_email" type="email" defaultValue={session.responsible_email || ""} placeholder="Correo electrónico" className="input text-sm" />
          <input name="responsible_phone_ext" defaultValue={session.responsible_phone_ext || ""} placeholder="Extensión telefónica" className="input text-sm" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">Asistentes a la junta</h3>
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
              <input name="att_nombre" defaultValue={a.nombre} placeholder="Nombre" className="input text-sm" />
              <input name="att_telefono" defaultValue={a.telefono} placeholder="Teléfono de contacto" className="input text-sm" />
              <button type="button" onClick={() => setAttendees((arr) => arr.filter((_, j) => j !== i))} className="text-red-600 text-xs px-2">
                quitar
              </button>
            </div>
          ))}
          {attendees.length === 0 && <p className="text-xs text-slate-400">Sin asistentes registrados.</p>}
        </div>
      </div>

      <div>
        <label className="label text-xs">Observaciones</label>
        <textarea name="observaciones" rows={3} defaultValue={session.observaciones || ""} className="textarea text-sm" />
      </div>

      <div className="flex justify-end">
        <button type="submit" className="btn-primary">Guardar cambios</button>
      </div>
    </form>
  );
}
