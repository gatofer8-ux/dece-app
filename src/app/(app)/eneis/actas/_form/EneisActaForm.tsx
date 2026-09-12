"use client";

import { useState } from "react";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import { createEneisActaAction, updateEneisActaAction } from "../actions";
import {
  parseEneisActaParticipants,
  parseEneisActaCompromisos,
  type EneisActaParticipant,
  type EneisActaCompromiso,
} from "@/lib/eneis/eneisActas";
import type { EneisActaRow } from "@/lib/types";
import DualSignatureModal, { type DualSignatureData } from "@/components/DualSignatureModal";

type Prefill = Record<string, string>;

export default function EneisActaForm({
  mode,
  actaId,
  prefill,
  initialData,
}: {
  mode: "create" | "edit";
  actaId?: string;
  prefill: Prefill;
  initialData?: EneisActaRow;
}) {
  const v = (k: string): string => {
    const fromInitial = initialData ? (initialData as unknown as Record<string, unknown>)[k] : undefined;
    if (fromInitial != null) return String(fromInitial);
    const p = prefill[k];
    return p == null ? "" : String(p);
  };

  const [participants, setParticipants] = useState<EneisActaParticipant[]>(
    initialData ? parseEneisActaParticipants(initialData.participants_json) : []
  );
  // Estados de firmas duales y respaldo físico
  const initialSignaturesList: DualSignatureData[] = (() => {
    try {
      return initialData?.signatures_json ? JSON.parse(initialData.signatures_json) : [];
    } catch {
      return [];
    }
  })();

  const [dualSignatures, setDualSignatures] = useState<DualSignatureData[]>(initialSignaturesList);
  const [activeSignerIdx, setActiveSignerIdx] = useState<number | null>(null);

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

  const overallSignatureType =
    dualSignatures.length === 0
      ? (initialData?.signature_type || "digital")
      : dualSignatures.every((s) => s.tipo === "digital")
      ? "digital"
      : dualSignatures.every((s) => s.tipo === "fisica")
      ? "fisica"
      : "mixta";

  const [compromisos, setCompromisos] = useState<EneisActaCompromiso[]>(
    initialData ? parseEneisActaCompromisos(initialData.compromisos_json) : [{ compromiso: "", responsable: "", fecha: "" }]
  );

  const action = mode === "edit" ? updateEneisActaAction.bind(null, actaId!) : createEneisActaAction;

  const Label = ({ children }: { children: React.ReactNode }) => <label className="label text-xs">{children}</label>;

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
      <input type="hidden" name="signatures_json" value={JSON.stringify(dualSignatures)} />
      <input type="hidden" name="signature_type" value={overallSignatureType} />
      <input type="hidden" name="physical_file_ref" value={physicalFileRef} />
      <input type="hidden" name="physical_evidence_url" value={physicalEvidenceUrl} />
      <p className="text-xs text-slate-500">
        El número del acta y el encabezado institucional se asignan automáticamente al guardar.
      </p>

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Datos generales</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {IN({ name: "ciudad" })}
          {IN({ name: "meeting_date", type: "date" })}
          {IN({ name: "lugar", voice: true })}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          {IN({ name: "tema", voice: true, w: "sm:col-span-1" })}
          {IN({ name: "hora_inicio", type: "time" })}
          {IN({ name: "hora_fin", type: "time" })}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">Personas convocadas</h3>
          <button
            type="button"
            onClick={() => setParticipants((a) => [...a, { nombre: "", cargo: "" }])}
            className="text-xs bg-slate-200 px-2 py-1 rounded font-semibold"
          >
            + Persona
          </button>
        </div>
        <p className="text-[11px] text-slate-400 mb-2">
          Esta misma lista se usa también en la tabla de firmas de responsabilidad del acta.
        </p>
        <div className="space-y-2">
          {participants.map((p, i) => {
            const signerId = `p_${i}`;
            const sig = dualSignatures.find((s) => s.signer_id === signerId);
            return (
              <div key={i} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-center">
                  <input name="p_nombre" defaultValue={p.nombre} placeholder="Nombres y apellidos" className="input text-sm" />
                  <input name="p_cargo" defaultValue={p.cargo} placeholder="Cargo" className="input text-sm" />
                  <button
                    type="button"
                    onClick={() => {
                      setParticipants((arr) => arr.filter((_, j) => j !== i));
                      setDualSignatures((arr) => arr.filter((s) => s.signer_id !== signerId));
                    }}
                    className="text-red-600 text-xs px-2"
                  >
                    quitar
                  </button>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-xs">
                  <span className="text-[11px] font-medium text-slate-500">Firma de constancia:</span>
                  {sig?.tipo === "digital" ? (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded">🖋️ Digital</span>
                      <button type="button" onClick={() => setActiveSignerIdx(i)} className="text-[10px] text-brand-700 hover:underline">Cambiar</button>
                      <button type="button" onClick={() => setDualSignatures(dualSignatures.filter((s) => s.signer_id !== signerId))} className="text-[10px] text-rose-600 hover:underline">✕</button>
                    </div>
                  ) : sig?.tipo === "fisica" ? (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded">📄 Papel</span>
                      <button type="button" onClick={() => setActiveSignerIdx(i)} className="text-[10px] text-brand-700 hover:underline">Cambiar</button>
                      <button type="button" onClick={() => setDualSignatures(dualSignatures.filter((s) => s.signer_id !== signerId))} className="text-[10px] text-rose-600 hover:underline">✕</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setActiveSignerIdx(i)} className="text-[10px] font-semibold text-brand-700 hover:underline">
                      ✍️ Registrar Firma
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {participants.length === 0 && (
            <p className="text-xs text-slate-400">Sin personas registradas. El acta reservará filas en blanco.</p>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-1">
          <Label>Desarrollo de la reunión</Label>
          <VoiceDictationButton targetId="f-desarrollo" />
        </div>
        <p className="text-[11px] text-slate-400 mb-1">
          Reportes, avances, observaciones y nudos críticos de la reunión.
        </p>
        <textarea id="f-desarrollo" name="desarrollo" rows={6} defaultValue={v("desarrollo")} className="textarea text-sm" />
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">Compromisos</h3>
          <button
            type="button"
            onClick={() => setCompromisos((c) => [...c, { compromiso: "", responsable: "", fecha: "" }])}
            className="text-xs bg-slate-200 px-2 py-1 rounded font-semibold"
          >
            + Compromiso
          </button>
        </div>
        <div className="space-y-3">
          {compromisos.map((c, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Compromiso {i + 1}</span>
                {compromisos.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setCompromisos((arr) => arr.filter((_, j) => j !== i))}
                    className="text-red-600 text-xs"
                  >
                    quitar
                  </button>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label>Compromiso</Label>
                  <VoiceDictationButton targetId={`f-c_compromiso_${i}`} />
                </div>
                <textarea
                  id={`f-c_compromiso_${i}`}
                  name="c_compromiso"
                  rows={2}
                  defaultValue={c.compromiso}
                  className="textarea text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <Label>Responsable</Label>
                  <input name="c_responsable" defaultValue={c.responsable} className="input text-sm" />
                </div>
                <div>
                  <Label>Fecha tentativa</Label>
                  <input name="c_fecha" type="date" defaultValue={c.fecha} className="input text-sm" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Respaldo Físico DECE y Acta en Papel */}
      <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
            <span>📁</span> Respaldo Físico DECE y Acta en Papel (Auditoría Ministerial)
          </span>
          <span className="text-[11px] text-amber-700 bg-amber-100/70 border border-amber-300 px-2 py-0.5 rounded-full font-medium">
            Custodia Institucional
          </span>
        </div>
        <p className="text-xs text-amber-800/90 leading-relaxed">
          Para garantizar la constancia legal y auditoría física, registra la ubicación física en carpeta/archivador y opcionalmente adjunta copia escaneada o foto (PDF o Imagen) del acta firmada y sellada.
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
              placeholder="Ej. Archivador Actas ENEIS 2026 / Carpeta Convivencia"
              className="w-full text-xs rounded-lg border border-amber-300 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-amber-900 mb-1">
              Adjuntar Acta Firmada / Sellada (PDF o Imagen)
            </label>
            {physicalEvidenceUrl ? (
              <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-amber-300">
                <span className="text-xs text-emerald-800 font-medium flex items-center gap-1.5 truncate max-w-[200px]">
                  <span>📎</span> {physicalEvidenceName || "Acta_ENEIS_Sellada"}
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

      {activeSignerIdx !== null && participants[activeSignerIdx] && (
        <DualSignatureModal
          isOpen={true}
          onClose={() => setActiveSignerIdx(null)}
          signatoryName={participants[activeSignerIdx].nombre || "Convocado/a"}
          signatoryRole={participants[activeSignerIdx].cargo || "PARTICIPANTE"}
          initialData={dualSignatures.find((s) => s.signer_id === `p_${activeSignerIdx}`) || null}
          onSave={(data) => {
            const signerId = `p_${activeSignerIdx}`;
            const next = dualSignatures.filter((s) => s.signer_id !== signerId);
            next.push({ ...data, signer_id: signerId });
            setDualSignatures(next);
            setActiveSignerIdx(null);
          }}
        />
      )}

      <div className="flex justify-end">
        <button type="submit" className="btn-primary">
          {mode === "edit" ? "Guardar cambios" : "Guardar y ver acta"}
        </button>
      </div>
    </form>
  );
}

const LABELS: Record<string, string> = {
  ciudad: "Ciudad",
  meeting_date: "Fecha de la reunión",
  lugar: "Lugar",
  tema: "Tema de la reunión",
  hora_inicio: "Hora inicial",
  hora_fin: "Hora final",
};
