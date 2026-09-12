"use client";

import { useState } from "react";
import { updateAlertSessionAction } from "../actions";
import { parseAttendees, type AlertSessionAttendee } from "@/lib/alertIdentification";
import type { AlertIdentificationSessionRow } from "@/lib/types";

export default function AlertSessionEditForm({
  session,
  reportingTeachers,
}: {
  session: AlertIdentificationSessionRow;
  reportingTeachers: string[];
}) {
  const [attendees, setAttendees] = useState<AlertSessionAttendee[]>(parseAttendees(session.attendees_json));
  const [physicalFileRef, setPhysicalFileRef] = useState(session.physical_file_ref || "");
  const [physicalEvidenceUrl, setPhysicalEvidenceUrl] = useState(session.physical_evidence_url || "");
  const [physicalEvidenceName, setPhysicalEvidenceName] = useState("");

  function handleEvidenceUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      alert("El archivo no debe exceder los 15 MB.");
      return;
    }
    setPhysicalEvidenceName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhysicalEvidenceUrl((ev.target?.result as string) || "");
    };
    reader.readAsDataURL(file);
  }

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
        <p className="text-[11px] text-slate-400 mb-2">
          Agrega aquí solo a quienes asistieron pero no reportaron ningún estudiante (autoridades, otros docentes).
          Los docentes que sí reportaron ({reportingTeachers.length ? reportingTeachers.join(", ") : "ninguno todavía"})
          se agregan solos a la firma del acta.
        </p>
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

      {/* Respaldo Físico DECE y Evidencia de Auditoría Distrital */}
      <section className="bg-amber-50/70 p-5 rounded-xl border border-amber-200 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
            <span>📁</span> Respaldo Físico DECE y Evidencia de Auditoría Distrital
          </span>
          <span className="text-[11px] text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full font-medium">
            Normativa Ministerial
          </span>
        </div>
        <p className="text-xs text-amber-800/90 leading-relaxed">
          Permite registrar la ubicación en archivador físico institucional del acta de junta de curso firmada por los asistentes, y adjuntar el escaneo o foto para verificación distrital.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-semibold text-amber-900 mb-1">
              Ubicación en Archivo Físico Institucional
            </label>
            <input
              type="text"
              name="physical_file_ref"
              value={physicalFileRef}
              onChange={(e) => setPhysicalFileRef(e.target.value)}
              placeholder="Ej. Carpeta DECE 2026 / Juntas de Curso / Exp #05"
              className="w-full text-xs rounded-lg border border-amber-300 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-amber-900 mb-1">
              Adjuntar Foto o Escaneo del Acta Firmada (PDF o Imagen)
            </label>
            <input type="hidden" name="physical_evidence_url" value={physicalEvidenceUrl} />
            {physicalEvidenceUrl ? (
              <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-amber-300">
                <span className="text-xs text-emerald-800 font-medium flex items-center gap-1.5 truncate max-w-[200px]">
                  <span>📎</span> {physicalEvidenceName || "Acta_Firmada_Escaneada"}
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={physicalEvidenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Ver
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setPhysicalEvidenceUrl("");
                      setPhysicalEvidenceName("");
                    }}
                    className="text-xs text-rose-600 hover:underline font-medium"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ) : (
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={handleEvidenceUpload}
                className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 cursor-pointer"
              />
            )}
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button type="submit" className="btn-primary">Guardar cambios</button>
      </div>
    </form>
  );
}
