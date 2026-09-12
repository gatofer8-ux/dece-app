"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import { updateAuthorityAdvisoryAct, type ActionState } from "@/app/(app)/casos/actions";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import AIAssistButton from "@/components/AIAssistButton";
import DualSignatureModal, { type DualSignatureData } from "@/components/DualSignatureModal";
import type { AuthorityAdvisoryActRow } from "@/lib/types";
import { parseJsonArray, type ParticipantEntry } from "@/lib/authorityAdvisory";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
      {pending ? "Guardando cambios..." : "Guardar cambios"}
    </button>
  );
}

export default function AuthorityAdvisoryEditForm({
  caseId,
  act,
  defaultProfessionalName,
  defaultAuthorityName,
  defaultAuthorityRole,
}: {
  caseId: string;
  act: AuthorityAdvisoryActRow;
  defaultProfessionalName?: string;
  defaultAuthorityName?: string;
  defaultAuthorityRole?: string;
}) {
  const [state, formAction] = useFormState<ActionState, FormData>(
    updateAuthorityAdvisoryAct.bind(null, caseId, act.id),
    { error: null }
  );

  const initialParticipants = parseJsonArray<ParticipantEntry>(act.participants);
  const initialBackground = parseJsonArray<string>(act.background);
  const initialMeasures = parseJsonArray<string>(act.measures);
  const initialScope = parseJsonArray<string>(act.advisory_scope);

  const [participantCount, setParticipantCount] = useState(Math.max(initialParticipants.length, 1));
  const [backgroundCount, setBackgroundCount] = useState(Math.max(initialBackground.length, 1));
  const [measureCount, setMeasureCount] = useState(Math.max(initialMeasures.length, 1));
  const [scopeCount, setScopeCount] = useState(Math.max(initialScope.length, 1));

  // Parse existing signatures
  const parsedSigs = (() => {
    try {
      return act.signatures_json ? JSON.parse(act.signatures_json) : {};
    } catch {
      return {};
    }
  })();

  const [deceProfessionalName, setDeceProfessionalName] = useState(
    act.dece_professional_name || defaultProfessionalName || ""
  );
  const [authorityName, setAuthorityName] = useState(
    act.authority_name || defaultAuthorityName || ""
  );
  const [authorityRole, setAuthorityRole] = useState(
    act.authority_role || defaultAuthorityRole || "Rector/a"
  );

  const [deceSig, setDeceSig] = useState<DualSignatureData | null>(parsedSigs.dece || null);
  const [authoritySig, setAuthoritySig] = useState<DualSignatureData | null>(parsedSigs.authority || null);

  const [physicalFileRef, setPhysicalFileRef] = useState(act.physical_file_ref || "");
  const [physicalEvidenceUrl, setPhysicalEvidenceUrl] = useState(act.physical_evidence_url || "");
  const [physicalEvidenceName, setPhysicalEvidenceName] = useState("");
  const [activeSignerModal, setActiveSignerModal] = useState<"dece" | "authority" | null>(null);

  const signaturesPayload = JSON.stringify({
    dece: deceSig ? { ...deceSig, roleKey: "dece", nombre: deceProfessionalName, cargo: "Profesional DECE" } : null,
    authority: authoritySig ? { ...authoritySig, roleKey: "authority", nombre: authorityName, cargo: authorityRole } : null,
  });

  let overallSignatureType = act.signature_type || "PENDIENTE";
  const activeSigs = [deceSig, authoritySig].filter(Boolean);
  if (activeSigs.length > 0) {
    const hasDig = activeSigs.some((s) => s?.tipo === "digital");
    const hasFis = activeSigs.some((s) => s?.tipo === "fisica") || Boolean(physicalFileRef || physicalEvidenceUrl);
    if (hasDig && hasFis) overallSignatureType = "MIXTA";
    else if (hasDig) overallSignatureType = "DIGITAL";
    else if (hasFis) overallSignatureType = "FISICA";
  } else if (physicalFileRef || physicalEvidenceUrl) {
    overallSignatureType = "FISICA";
  }

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
    <form action={formAction} className="card p-6 space-y-6 max-w-4xl">
      {state?.error && (
        <div className="p-3 bg-red-50 text-red-700 text-xs rounded-md border border-red-200">
          {state.error}
        </div>
      )}

      {/* Datos del encabezado / contexto */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-3">Datos del asesoramiento</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label text-xs">Fecha del acta</label>
            <input
              type="date"
              name="act_date"
              defaultValue={act.act_date}
              required
              className="input"
            />
          </div>
          <div>
            <label className="label text-xs">Hora</label>
            <input
              type="time"
              name="act_time"
              defaultValue={act.act_time || ""}
              placeholder="hh:mm"
              className="input"
            />
          </div>
          <div>
            <label className="label text-xs">Lugar / Espacio</label>
            <input
              name="act_place"
              defaultValue={act.act_place || ""}
              placeholder="Ej. Rectorado / Oficina DECE"
              className="input"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div>
            <label className="label text-xs">Entidad que dispone las medidas (si aplica)</label>
            <input
              name="issuing_entity"
              defaultValue={act.issuing_entity || ""}
              placeholder="Ej. Junta Cantonal de Protección de Derechos / Fiscalía / Distrito"
              className="input"
            />
          </div>
          <div>
            <label className="label text-xs">Código de estándar DECE (opcional)</label>
            <input
              name="standard_code"
              defaultValue={act.standard_code || ""}
              placeholder="Ej. D3.C1.DO9.b"
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Participantes */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">Personas que participan</h3>
          <button
            type="button"
            onClick={() => setParticipantCount((n) => n + 1)}
            className="text-xs text-brand-700 hover:underline"
          >
            + Agregar participante
          </button>
        </div>
        <div className="space-y-2">
          {Array.from({ length: participantCount }).map((_, i) => {
            const p = initialParticipants[i] || { nombre: "", cargo: "", funcion: "" };
            return (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  name="participant_nombre"
                  defaultValue={p.nombre}
                  placeholder="Nombre y apellido"
                  className="input text-xs"
                />
                <input
                  name="participant_cargo"
                  defaultValue={p.cargo}
                  placeholder="Cargo / Rol institucional"
                  className="input text-xs"
                />
                <input
                  name="participant_funcion"
                  defaultValue={p.funcion}
                  placeholder="Función en el asesoramiento"
                  className="input text-xs"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Antecedentes */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">Antecedentes</h3>
          <div className="flex items-center gap-2">
            <VoiceDictationButton targetId="edit-authority-advisory-background-0" />
            <AIAssistButton targetId="edit-authority-advisory-background-0" caseId={caseId} fieldLabel="Antecedente en el acta de asesoramiento a la autoridad institucional" />
            <button
              type="button"
              onClick={() => setBackgroundCount((n) => n + 1)}
              className="text-xs text-brand-700 hover:underline ml-2"
            >
              + Agregar antecedente
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {Array.from({ length: backgroundCount }).map((_, i) => (
            <textarea
              key={i}
              id={i === 0 ? "edit-authority-advisory-background-0" : undefined}
              name="background_item"
              rows={2}
              defaultValue={initialBackground[i] || ""}
              placeholder="Ej. referencia a Oficio/Informe N°... con fecha..., y artículo legal aplicable"
              className="textarea"
            />
          ))}
        </div>
      </div>

      {/* Medidas de protección dispuestas */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">Medidas de protección dispuestas</h3>
          <div className="flex items-center gap-2">
            <VoiceDictationButton targetId="edit-authority-advisory-measure-0" />
            <AIAssistButton targetId="edit-authority-advisory-measure-0" caseId={caseId} fieldLabel="Medida de protección dispuesta a la autoridad institucional" />
            <button
              type="button"
              onClick={() => setMeasureCount((n) => n + 1)}
              className="text-xs text-brand-700 hover:underline ml-2"
            >
              + Agregar medida
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-400 mb-2">
          Se numerarán automáticamente como PRIMERO, SEGUNDO, TERCERO... al imprimir el documento.
        </p>
        <div className="space-y-2">
          {Array.from({ length: measureCount }).map((_, i) => (
            <textarea
              key={i}
              id={i === 0 ? "edit-authority-advisory-measure-0" : undefined}
              name="measure_item"
              rows={2}
              defaultValue={initialMeasures[i] || ""}
              placeholder="Disposición legal y medida cautelar adoptada para salvaguardar al estudiante..."
              className="textarea"
            />
          ))}
        </div>
      </div>

      {/* Alcance del asesoramiento brindado */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">Alcance del asesoramiento brindado</h3>
          <div className="flex items-center gap-2">
            <VoiceDictationButton targetId="edit-authority-advisory-scope-0" />
            <AIAssistButton targetId="edit-authority-advisory-scope-0" caseId={caseId} fieldLabel="Alcance del asesoramiento brindado a la autoridad institucional" />
            <button
              type="button"
              onClick={() => setScopeCount((n) => n + 1)}
              className="text-xs text-brand-700 hover:underline ml-2"
            >
              + Agregar acción de asesoramiento
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {Array.from({ length: scopeCount }).map((_, i) => (
            <textarea
              key={i}
              id={i === 0 ? "edit-authority-advisory-scope-0" : undefined}
              name="scope_item"
              rows={2}
              defaultValue={initialScope[i] || ""}
              placeholder="Ej. explicación de la base legal, recomendación de recursos, instrucción de confidencialidad, canal de seguimiento acordado, compromiso de la autoridad..."
              className="textarea"
            />
          ))}
        </div>
      </div>

      {/* Conclusión */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label text-xs">Conclusión</label>
          <div className="flex items-center gap-2">
            <VoiceDictationButton targetId="edit-authority-advisory-conclusion" />
            <AIAssistButton targetId="edit-authority-advisory-conclusion" caseId={caseId} fieldLabel="Conclusión del acta de asesoramiento a la autoridad institucional" />
          </div>
        </div>
        <textarea
          id="edit-authority-advisory-conclusion"
          name="conclusion"
          rows={3}
          defaultValue={act.conclusion || ""}
          placeholder="Síntesis final de acuerdos y ratificación de compromisos con la autoridad..."
          className="textarea"
        />
      </div>

      {/* Firmas y Respaldo Dual */}
      <div className="space-y-4 border-t border-slate-200 pt-5">
        <input type="hidden" name="signatures_json" value={signaturesPayload} />
        <input type="hidden" name="signature_type" value={overallSignatureType} />
        <input type="hidden" name="physical_file_ref" value={physicalFileRef} />
        <input type="hidden" name="physical_evidence_url" value={physicalEvidenceUrl} />

        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">
            Firmas de Constancia Institucional (Digital / Física)
          </h3>
          <span className="text-[11px] font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded-full">
            Modalidad: {overallSignatureType}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Profesional DECE */}
          <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2.5 shadow-2xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Profesional DECE que brinda asesoramiento *
              </label>
              <input
                type="text"
                name="dece_professional_name"
                value={deceProfessionalName}
                onChange={(e) => setDeceProfessionalName(e.target.value)}
                placeholder="Nombre del profesional DECE"
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-1.5 font-medium"
              />
            </div>
            <div className="pt-1 flex flex-wrap items-center justify-between gap-1 border-t border-slate-100">
              {deceSig?.tipo === "digital" || deceSig?.firma_data_url ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded">
                    ✓ Digital
                  </span>
                  {deceSig.firma_data_url && (
                    <img
                      src={deceSig.firma_data_url}
                      alt="Firma DECE"
                      className="h-5 max-w-[60px] object-contain border border-slate-200 rounded px-1 bg-white"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveSignerModal("dece")}
                    className="text-[11px] text-brand-700 hover:underline"
                  >
                    Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeceSig(null)}
                    className="text-[11px] text-rose-600 hover:underline"
                  >
                    Borrar
                  </button>
                </div>
              ) : deceSig?.tipo === "fisica" ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded">
                    📄 Papel
                  </span>
                  {deceSig.referencia_fisica && (
                    <span className="text-[10px] text-slate-600 truncate max-w-[120px]">
                      📁 {deceSig.referencia_fisica}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveSignerModal("dece")}
                    className="text-[11px] text-brand-700 hover:underline"
                  >
                    Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeceSig(null)}
                    className="text-[11px] text-rose-600 hover:underline"
                  >
                    Borrar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveSignerModal("dece")}
                  className="w-full text-center py-1.5 text-[11px] font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded transition-colors"
                >
                  ✍️ Registrar Firma (Digital o Física)
                </button>
              )}
            </div>
          </div>

          {/* Máxima Autoridad Institucional */}
          <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2.5 shadow-2xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Máxima autoridad institucional *
              </label>
              <input
                type="text"
                name="authority_name"
                value={authorityName}
                onChange={(e) => setAuthorityName(e.target.value)}
                placeholder="Nombre de la Rectora o Rector"
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-1.5 font-medium mb-1.5"
              />
              <input
                type="text"
                name="authority_role"
                value={authorityRole}
                onChange={(e) => setAuthorityRole(e.target.value)}
                placeholder="Cargo (ej. Rector/a)"
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-1 text-slate-600"
              />
            </div>
            <div className="pt-1 flex flex-wrap items-center justify-between gap-1 border-t border-slate-100">
              {authoritySig?.tipo === "digital" || authoritySig?.firma_data_url ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded">
                    ✓ Digital
                  </span>
                  {authoritySig.firma_data_url && (
                    <img
                      src={authoritySig.firma_data_url}
                      alt="Firma Autoridad"
                      className="h-5 max-w-[60px] object-contain border border-slate-200 rounded px-1 bg-white"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveSignerModal("authority")}
                    className="text-[11px] text-brand-700 hover:underline"
                  >
                    Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthoritySig(null)}
                    className="text-[11px] text-rose-600 hover:underline"
                  >
                    Borrar
                  </button>
                </div>
              ) : authoritySig?.tipo === "fisica" ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded">
                    📄 Papel
                  </span>
                  {authoritySig.referencia_fisica && (
                    <span className="text-[10px] text-slate-600 truncate max-w-[120px]">
                      📁 {authoritySig.referencia_fisica}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveSignerModal("authority")}
                    className="text-[11px] text-brand-700 hover:underline"
                  >
                    Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthoritySig(null)}
                    className="text-[11px] text-rose-600 hover:underline"
                  >
                    Borrar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveSignerModal("authority")}
                  className="w-full text-center py-1.5 text-[11px] font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded transition-colors"
                >
                  ✍️ Registrar Firma (Digital o Física)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Respaldo Físico Institucional y Auditoría */}
        <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <span>📁</span> Respaldo Físico Institucional y Evidencia de Auditoría Distrital
            </span>
            <span className="text-[11px] text-amber-700 bg-amber-100/70 border border-amber-300 px-2 py-0.5 rounded-full font-medium">
              Auditoría Ministerial
            </span>
          </div>
          <p className="text-xs text-amber-800/90 leading-relaxed">
            Para cumplir con las auditorías distritales del Ministerio de Educación, registra la carpeta o archivador físico institucional donde reposa el acta original firmada y sellada por la autoridad, y adjunta copia digitalizada (PDF o foto).
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
                placeholder="Ej. Archivador Rectorado 2026 / Tomo Asesoramientos DECE"
                className="w-full text-xs rounded-lg border border-amber-300 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                Adjuntar Escaneo o Foto del Acta Física Sellada (PDF o Imagen)
              </label>
              {physicalEvidenceUrl ? (
                <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-amber-300">
                  <span className="text-xs text-emerald-800 font-medium flex items-center gap-1.5 truncate max-w-[200px]">
                    <span>📎</span> {physicalEvidenceName || "Acta_Asesoramiento_Escaneada"}
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

        {/* Modal DualSignatureModal */}
        {activeSignerModal && (
          <DualSignatureModal
            isOpen={true}
            onClose={() => setActiveSignerModal(null)}
            signatoryName={
              activeSignerModal === "dece"
                ? deceProfessionalName || "Profesional DECE"
                : authorityName || "Máxima Autoridad Institucional"
            }
            signatoryRole={
              activeSignerModal === "dece"
                ? "Profesional DECE"
                : authorityRole || "Rector/a"
            }
            initialData={
              activeSignerModal === "dece"
                ? deceSig
                : authoritySig
            }
            onSave={(data) => {
              if (activeSignerModal === "dece") setDeceSig(data);
              else if (activeSignerModal === "authority") setAuthoritySig(data);
              setActiveSignerModal(null);
            }}
          />
        )}
      </div>

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
