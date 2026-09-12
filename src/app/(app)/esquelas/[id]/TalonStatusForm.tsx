"use client";

import { useState } from "react";
import type { DeceEsquelaRow } from "@/lib/types";
import { updateTalonStatusAction } from "../actions";

export default function TalonStatusForm({ esquela }: { esquela: DeceEsquelaRow }) {
  const [talonReturned, setTalonReturned] = useState(Boolean(esquela.talon_returned));
  const [receivedByRelation, setReceivedByRelation] = useState(
    esquela.received_by_relation || "Estudiante"
  );
  const [receivedByName, setReceivedByName] = useState(
    esquela.received_by_name || (esquela.received_by_relation === "Estudiante" ? esquela.student_name : esquela.representative_name)
  );
  const [talonAttended, setTalonAttended] = useState(String(esquela.talon_attended ?? 0));
  const [physicalFileRef, setPhysicalFileRef] = useState(esquela.physical_file_ref || "");
  const [physicalEvidenceUrl, setPhysicalEvidenceUrl] = useState(esquela.physical_evidence_url || "");
  const [physicalEvidenceName, setPhysicalEvidenceName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

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

  return (
    <form
      action={async (formData: FormData) => {
        setIsSaving(true);
        setSavedSuccess(false);
        try {
          await updateTalonStatusAction(esquela.id, formData);
          setSavedSuccess(true);
          setTimeout(() => setSavedSuccess(false), 4000);
        } finally {
          setIsSaving(false);
        }
      }}
      className="card p-5 space-y-4 bg-slate-50/70 border-slate-200"
    >
      <input type="hidden" name="physical_file_ref" value={physicalFileRef} />
      <input type="hidden" name="physical_evidence_url" value={physicalEvidenceUrl} />

      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span>📋</span> Control de Talón de Notificación y Asistencia
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Registra el acuse de recibo devuelto al DECE y la comparecencia a la cita.
          </p>
        </div>

        {savedSuccess && (
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full animate-fade-in">
            ✓ Guardado con éxito
          </span>
        )}
      </div>

      {/* 1. Casilla de Devolución del Talón */}
      <div className="p-3 bg-white rounded-lg border border-slate-200">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="talon_returned"
            value="1"
            checked={talonReturned}
            onChange={(e) => setTalonReturned(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          <div>
            <div className="text-sm font-bold text-slate-800">
              Talón de acuse de recibo firmado y devuelto al DECE
            </div>
            <div className="text-xs text-slate-500">
              Marque esta casilla cuando el estudiante o familiar haya devuelto el talón desprendible recortado con la firma.
            </div>
          </div>
        </label>
      </div>

      {/* 2. Datos de Quién Recibió la Esquela */}
      {talonReturned && (
        <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-3 animate-fade-in">
          <div className="text-xs font-bold uppercase text-slate-500">
            Constancia de Recepción de la Esquela
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label text-xs font-semibold">¿Quién recibió la esquela?</label>
              <select
                name="received_by_relation"
                value={receivedByRelation}
                onChange={(e) => {
                  const val = e.target.value;
                  setReceivedByRelation(val);
                  if (val === "Estudiante") setReceivedByName(esquela.student_name);
                  else if (val === "Representante legal") setReceivedByName(esquela.representative_name);
                }}
                className="select text-xs"
              >
                <option value="Estudiante">Estudiante</option>
                <option value="Representante legal">Representante legal</option>
                <option value="Madre">Madre de familia</option>
                <option value="Padre">Padre de familia</option>
                <option value="Abuelo/a">Abuelo / Abuela</option>
                <option value="Tío/a">Tío / Tía</option>
                <option value="Hermano/a">Hermano/a mayor</option>
                <option value="Otro">Otro familiar</option>
              </select>
            </div>

            <div>
              <label className="label text-xs font-semibold">Nombres de quien recibió</label>
              <input
                type="text"
                name="received_by_name"
                value={receivedByName}
                onChange={(e) => setReceivedByName(e.target.value)}
                placeholder="Nombre completo"
                className="input text-xs"
              />
            </div>

            <div>
              <label className="label text-xs font-semibold">Cédula de quien recibió</label>
              <input
                type="text"
                name="received_by_id_number"
                defaultValue={esquela.received_by_id_number || ""}
                placeholder="N° de Cédula"
                className="input text-xs font-mono"
              />
            </div>

            <div>
              <label className="label text-xs font-semibold">Fecha de entrega / recibido</label>
              <input
                type="date"
                name="received_date"
                defaultValue={esquela.received_date || new Date().toISOString().slice(0, 10)}
                className="input text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. Comparecencia / Asistencia a la Cita */}
      <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-3">
        <div className="text-xs font-bold uppercase text-slate-500">
          Comparecencia a la Cita ({esquela.citation_date} · {esquela.citation_time})
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label text-xs font-semibold">Estado de Asistencia</label>
            <select
              name="talon_attended"
              value={talonAttended}
              onChange={(e) => setTalonAttended(e.target.value)}
              className="select text-xs font-semibold"
            >
              <option value="0">⏳ Pendiente (Por realizarse)</option>
              <option value="1">✅ Asistió puntualmente</option>
              <option value="2">⚠️ No asistió (Con justificación oportuna)</option>
              <option value="3">❌ No asistió (Injustificado)</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="label text-xs font-semibold">
              Observaciones de la comparecencia o justificación (Opcional)
            </label>
            <textarea
              name="talon_notes"
              rows={2}
              defaultValue={esquela.talon_notes || ""}
              placeholder="Ej: Se presentó la madre de familia a la hora pactada; se firmó acta de compromiso / Justificó por turno médico..."
              className="textarea text-xs"
            />
          </div>
        </div>
      </div>

      {/* 4. Respaldo Físico DECE y Talón Firmado (Auditoría Distrital) */}
      <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
            <span>📁</span> Respaldo Físico DECE y Talón Firmado (Auditoría Ministerial)
          </span>
          <span className="text-[11px] text-amber-700 bg-amber-100/70 border border-amber-300 px-2 py-0.5 rounded-full font-medium">
            Respaldo de Custodia
          </span>
        </div>
        <p className="text-xs text-amber-800/90 leading-relaxed">
          Para sustentar el trabajo del DECE ante auditorías distritales del Ministerio de Educación, registra la carpeta física institucional donde reposa el talón firmado archivado y adjunta fotografía o PDF del talón recibido.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-semibold text-amber-900 mb-1">
              Ubicación en Archivo Físico Institucional
            </label>
            <input
              type="text"
              value={physicalFileRef}
              onChange={(e) => setPhysicalFileRef(e.target.value)}
              placeholder="Ej. Carpeta Citaciones DECE 2026 / Tomo 1"
              className="w-full text-xs rounded-lg border border-amber-300 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-amber-900 mb-1">
              Adjuntar Foto o Escaneo del Talón Firmado (PDF o Imagen)
            </label>
            {physicalEvidenceUrl ? (
              <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-amber-300">
                <span className="text-xs text-emerald-800 font-medium flex items-center gap-1.5 truncate max-w-[200px]">
                  <span>📎</span> {physicalEvidenceName || "Talon_Firmado_Escaneado"}
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
                accept="image/*,application/pdf"
                onChange={handleEvidenceUpload}
                className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 cursor-pointer"
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={isSaving}
          className="btn-primary text-xs px-5 py-2 flex items-center gap-2"
        >
          {isSaving ? "Guardando..." : "💾 Guardar Estado del Talón"}
        </button>
      </div>
    </form>
  );
}
