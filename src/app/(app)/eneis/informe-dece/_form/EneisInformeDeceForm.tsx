"use client";

import { useState } from "react";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import { createEneisInformeDeceAction, updateEneisInformeDeceAction } from "../actions";
import { ENEIS_INFORME_DECE_ACTIVIDADES_REQUERIDAS, parseEneisInformeDeceActividades } from "@/lib/eneis/eneisInformeDece";
import type { EneisInformeDeceRow } from "@/lib/types";
import DualSignatureModal, { type DualSignatureData } from "@/components/DualSignatureModal";

export default function EneisInformeDeceForm({
  mode,
  informeId,
  defaultPeriodo,
  initialData,
}: {
  mode: "create" | "edit";
  informeId?: string;
  defaultPeriodo: string;
  initialData?: EneisInformeDeceRow;
}) {
  const actividades = initialData ? parseEneisInformeDeceActividades(initialData.actividades_json) : [];
  const [removeFoto, setRemoveFoto] = useState<boolean[]>(ENEIS_INFORME_DECE_ACTIVIDADES_REQUERIDAS.map(() => false));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Estados de firmas duales y respaldo físico
  const initialSignaturesList: DualSignatureData[] = (() => {
    try {
      return initialData?.signatures_json ? JSON.parse(initialData.signatures_json) : [];
    } catch {
      return [];
    }
  })();

  const [deceSig, setDeceSig] = useState<DualSignatureData | null>(
    initialSignaturesList[0] || null
  );
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);

  const [physicalFileRef, setPhysicalFileRef] = useState(initialData?.physical_file_ref || "");
  const [physicalEvidenceUrl, setPhysicalEvidenceUrl] = useState(initialData?.physical_evidence_url || "");
  const [physicalEvidenceName, setPhysicalEvidenceName] = useState("");

  const handleEvidenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhysicalEvidenceName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPhysicalEvidenceUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const currentSignatures = deceSig ? [deceSig] : [];
  const overallSignatureType = deceSig ? deceSig.tipo : (initialData?.signature_type || "digital");

  async function onSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    const action = mode === "edit" ? updateEneisInformeDeceAction.bind(null, informeId!) : createEneisInformeDeceAction;
    const res = await action(formData);
    if (res?.error) {
      setError(res.error);
      setPending(false);
    }
  }

  return (
    <form action={onSubmit} className="card p-6 space-y-6 max-w-4xl">
      <input type="hidden" name="signatures_json" value={JSON.stringify(currentSignatures)} />
      <input type="hidden" name="signature_type" value={overallSignatureType} />
      <input type="hidden" name="physical_file_ref" value={physicalFileRef} />
      <input type="hidden" name="physical_evidence_url" value={physicalEvidenceUrl} />
      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-medium">⚠️ {error}</div>}
      <p className="text-xs text-slate-500">
        El número de informe, la institución y el código AMIE se completan automáticamente al generar el documento.
      </p>

      <div>
        <label className="label text-xs">Mes y año</label>
        <input
          type="month"
          name="periodo"
          defaultValue={initialData?.periodo || defaultPeriodo}
          className="input text-sm max-w-[220px]"
          required
        />
      </div>

      <div className="space-y-4">
        {ENEIS_INFORME_DECE_ACTIVIDADES_REQUERIDAS.map((req, i) => {
          const a = actividades[i];
          return (
            <div key={i} className="border rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-600">Actividad requerida {i + 1}</p>
              <p className="text-xs text-slate-500 italic">{req}</p>

              <div>
                <div className="flex items-center justify-between">
                  <label className="label text-xs">Actividad ejecutada</label>
                  <VoiceDictationButton targetId={`f-a_ejecutada_${i}`} />
                </div>
                <textarea id={`f-a_ejecutada_${i}`} name="a_ejecutada" rows={2} defaultValue={a?.ejecutada || ""} className="textarea text-sm" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Fecha</label>
                  <input type="date" name="a_fecha" defaultValue={a?.fecha || ""} className="input text-sm" />
                </div>
                <div>
                  <label className="label text-xs">Nº de beneficiados</label>
                  <input name="a_beneficiarios" defaultValue={a?.beneficiarios || ""} placeholder="Ej. 45 estudiantes" className="input text-sm" />
                </div>
              </div>

              <div>
                <label className="label text-xs">Registro fotográfico (una sola foto, no collage)</label>
                {a?.foto && !removeFoto[i] && (
                  <div className="flex items-center gap-2 mt-1 mb-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.foto} alt="Foto actual" className="w-20 h-16 object-cover rounded border" />
                    <button
                      type="button"
                      onClick={() => setRemoveFoto((arr) => arr.map((v, j) => (j === i ? true : v)))}
                      className="text-xs text-red-600"
                    >
                      quitar foto
                    </button>
                  </div>
                )}
                <input type="hidden" name={`a_foto_${i}_remove`} value={removeFoto[i] ? "1" : "0"} />
                <input type="file" name={`a_foto_${i}`} accept="image/*" className="text-xs" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Firma de Responsabilidad Profesional DECE */}
      <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
            <span>✍️</span> Firma de Responsabilidad del Profesional DECE
          </h3>
          {deceSig?.tipo === "digital" ? (
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded">🖋️ Digital</span>
              <button type="button" onClick={() => setIsSignModalOpen(true)} className="text-[10px] text-brand-700 hover:underline">Cambiar</button>
              <button type="button" onClick={() => setDeceSig(null)} className="text-[10px] text-rose-600 hover:underline">✕</button>
            </div>
          ) : deceSig?.tipo === "fisica" ? (
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded">📄 Papel</span>
              <button type="button" onClick={() => setIsSignModalOpen(true)} className="text-[10px] text-brand-700 hover:underline">Cambiar</button>
              <button type="button" onClick={() => setDeceSig(null)} className="text-[10px] text-rose-600 hover:underline">✕</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsSignModalOpen(true)}
              className="text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-2.5 py-1 rounded"
            >
              ✍️ Registrar Firma
            </button>
          )}
        </div>
      </div>

      {/* Respaldo Físico DECE e Informe en Papel */}
      <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
            <span>📁</span> Respaldo Físico DECE e Informe Mensual en Papel (Auditoría Ministerial)
          </span>
          <span className="text-[11px] text-amber-700 bg-amber-100/70 border border-amber-300 px-2 py-0.5 rounded-full font-medium">
            Custodia Institucional
          </span>
        </div>
        <p className="text-xs text-amber-800/90 leading-relaxed">
          Para garantizar la constancia legal y auditoría física, registra la ubicación física en carpeta/archivador y opcionalmente adjunta copia escaneada o foto (PDF o Imagen) del informe mensual firmado y sellado.
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
              placeholder="Ej. Archivador Informes Mensuales DECE 2026 / Carpeta ENEIS"
              className="w-full text-xs rounded-lg border border-amber-300 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-amber-900 mb-1">
              Adjuntar Informe Firmado / Sellado (PDF o Imagen)
            </label>
            {physicalEvidenceUrl ? (
              <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-amber-300">
                <span className="text-xs text-emerald-800 font-medium flex items-center gap-1.5 truncate max-w-[200px]">
                  <span>📎</span> {physicalEvidenceName || "Informe_Mensual_Sellado"}
                </span>
                <div className="flex items-center gap-2">
                  <a href={physicalEvidenceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Ver</a>
                  <button type="button" onClick={() => { setPhysicalEvidenceUrl(""); setPhysicalEvidenceName(""); }} className="text-xs text-rose-600 hover:underline font-medium">Quitar</button>
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

      {isSignModalOpen && (
        <DualSignatureModal
          isOpen={true}
          onClose={() => setIsSignModalOpen(false)}
          signatoryName="Profesional DECE"
          signatoryRole="PROFESIONAL DECE"
          initialData={deceSig}
          onSave={(data) => {
            setDeceSig(data);
            setIsSignModalOpen(false);
          }}
        />
      )}

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="btn-primary disabled:opacity-50">
          {pending ? "Guardando…" : mode === "edit" ? "Guardar cambios" : "Guardar y ver informe"}
        </button>
      </div>
    </form>
  );
}
