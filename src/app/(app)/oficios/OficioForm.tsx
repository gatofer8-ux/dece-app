"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { useToast, useToastOnChange } from "@/components/Toast";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import AIAssistButton from "@/components/AIAssistButton";
import DualSignatureModal, { type DualSignatureData } from "@/components/DualSignatureModal";
import {
  OFICIO_TYPE_OPTIONS,
  OFICIO_ADDRESSEE_ROLE_OPTIONS,
  OFICIO_DEFAULT_CLOSING_NOTE,
  getDefaultBodyIntro,
  getOficioTypeOption,
  requiresDebidaDiligencia,
} from "@/lib/oficios";
import type { OficioType } from "@/lib/types";
import { createOficio, updateOficio, type ActionState } from "./actions";
import { generateOficioAiDraft } from "./ai-actions";

const initialState: ActionState = { error: null };

/** Caso de la institución ofrecido en el vinculador (se carga en el servidor). */
export interface OficioCaseOption {
  id: string;
  case_code: string;
  student_name: string;
  risk_type?: string | null;
}

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary disabled:opacity-60 text-sm px-5 py-2.5 shadow-sm font-semibold flex items-center gap-2"
    >
      {pending ? (
        <>
          <span className="animate-spin">⏳</span>
          <span>Guardando oficio...</span>
        </>
      ) : (
        <>
          <span>💾</span>
          <span>{isEditing ? "Actualizar oficio" : "Guardar y emitir oficio"}</span>
        </>
      )}
    </button>
  );
}

export default function OficioForm({
  oficioId,
  institutionName,
  schoolYearText,
  previewOficioNumber,
  currentOficioNumber,
  cases = [],
  defaultOficioType = "OTRO",
  defaultOficioDate,
  defaultCity = "Ambato",
  defaultAsunto = "",
  defaultAddresseeName = "",
  defaultAddresseeRole = "RECTORA",
  defaultAddresseeInstitution = "",
  defaultBodyIntro = "",
  defaultBodyContent = "",
  defaultClosingNote = OFICIO_DEFAULT_CLOSING_NOTE,
  defaultSignerName = "",
  defaultSignerRole = "ANALISTA DECE",
  defaultCaseFileId = "",
  defaultSignatures = "[]",
  defaultSignatureType = "PENDIENTE",
  defaultPhysicalFileRef = "",
  defaultPhysicalEvidenceUrl = "",
  isEditing = false,
}: {
  oficioId?: string;
  institutionName: string;
  schoolYearText?: string;
  /** Número que se asignará al guardar (solo lectura, se calcula en el servidor). */
  previewOficioNumber?: string;
  /** Número ya emitido, en edición (inmutable). */
  currentOficioNumber?: string;
  cases?: OficioCaseOption[];
  defaultOficioType?: OficioType;
  defaultOficioDate?: string;
  defaultCity?: string;
  defaultAsunto?: string;
  defaultAddresseeName?: string;
  defaultAddresseeRole?: string;
  defaultAddresseeInstitution?: string;
  defaultBodyIntro?: string;
  defaultBodyContent?: string;
  defaultClosingNote?: string;
  defaultSignerName?: string;
  defaultSignerRole?: string;
  defaultCaseFileId?: string;
  defaultSignatures?: string;
  defaultSignatureType?: string;
  defaultPhysicalFileRef?: string;
  defaultPhysicalEvidenceUrl?: string;
  isEditing?: boolean;
}) {
  const actionToUse = isEditing ? updateOficio.bind(null, oficioId!) : createOficio;
  const [state, formAction] = useFormState(actionToUse, initialState);
  useToastOnChange(state.error, "error");
  const toast = useToast();

  // ── Cabecera ──
  const [oficioType, setOficioType] = useState<OficioType>(defaultOficioType);
  const [oficioDate, setOficioDate] = useState(
    defaultOficioDate || new Date().toISOString().slice(0, 10)
  );
  const [city, setCity] = useState(defaultCity);
  const [caseFileId, setCaseFileId] = useState(defaultCaseFileId);

  // ── Destinatario ──
  const [addresseeName, setAddresseeName] = useState(defaultAddresseeName);
  const [addresseeRole, setAddresseeRole] = useState(defaultAddresseeRole);
  const [addresseeInstitution, setAddresseeInstitution] = useState(
    defaultAddresseeInstitution || institutionName
  );

  // ── Cuerpo ──
  const [asunto, setAsunto] = useState(defaultAsunto);
  const [bodyIntro, setBodyIntro] = useState(
    defaultBodyIntro || getDefaultBodyIntro(defaultOficioType)
  );
  const [bodyContent, setBodyContent] = useState(defaultBodyContent);
  const [closingNote, setClosingNote] = useState(defaultClosingNote);

  // ── Firma ──
  const [signerName, setSignerName] = useState(defaultSignerName);
  const [signerRole, setSignerRole] = useState(defaultSignerRole);

  const parsedInitialSignature: DualSignatureData | null = (() => {
    try {
      const parsed = JSON.parse(defaultSignatures || "[]");
      if (Array.isArray(parsed) && parsed.length > 0) return parsed[0] as DualSignatureData;
    } catch {
      // firma corrupta: se empieza sin firma
    }
    return null;
  })();

  const [signerSig, setSignerSig] = useState<DualSignatureData | null>(parsedInitialSignature);
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [physicalFileRef, setPhysicalFileRef] = useState(defaultPhysicalFileRef);
  const [physicalEvidenceUrl, setPhysicalEvidenceUrl] = useState(defaultPhysicalEvidenceUrl);
  const [physicalEvidenceName, setPhysicalEvidenceName] = useState("");

  // ── Generación completa con IA ──
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiModalType, setAiModalType] = useState<OficioType>(defaultOficioType);
  const [aiNotes, setAiNotes] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const selectedOption = getOficioTypeOption(oficioType);
  const selectedCase = cases.find((c) => c.id === caseFileId);
  const currentSignatures = signerSig ? [{ ...signerSig, signer_id: "dece" }] : [];
  const signatureType = signerSig ? signerSig.tipo : defaultSignatureType || "PENDIENTE";

  const caseContextForAi = selectedCase
    ? `Caso ${selectedCase.case_code} de ${selectedCase.student_name}${
        selectedCase.risk_type ? ` (tipología: ${selectedCase.risk_type})` : ""
      }`
    : "";

  const handleTypeChange = (next: OficioType) => {
    setOficioType(next);
    const previousTemplate = getDefaultBodyIntro(oficioType);
    // Solo se reemplaza el encuadre si el usuario no lo había redactado a mano.
    if (!bodyIntro.trim() || bodyIntro.trim() === previousTemplate.trim()) {
      setBodyIntro(getDefaultBodyIntro(next));
    }
  };

  const handleEvidenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhysicalEvidenceName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setPhysicalEvidenceUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateFullOficio = async () => {
    if (!aiNotes.trim()) {
      toast.error("Describe brevemente la situación o la actividad antes de generar el oficio.");
      return;
    }
    setIsGeneratingAi(true);
    try {
      const res = await generateOficioAiDraft({
        oficioType: aiModalType,
        institutionName,
        addresseeRole,
        caseContext: caseContextForAi || undefined,
        userDraftNotes: aiNotes,
        professionalName: signerName || "Profesional DECE",
      });

      setIsGeneratingAi(false);

      if ("error" in res) {
        toast.error(res.error || "No se pudo generar el oficio.");
        return;
      }

      setOficioType(aiModalType);
      setAsunto(res.asunto);
      setBodyIntro(res.body_intro);
      setBodyContent(res.body_content);
      setIsAiModalOpen(false);
      toast.success("Oficio redactado. Revisa y ajusta el texto antes de guardarlo.");
    } catch (err: any) {
      setIsGeneratingAi(false);
      toast.error(err?.message || "Error al procesar la propuesta de IA.");
    }
  };

  return (
    <form action={formAction} className="space-y-6">
      {/* Campos ocultos para la server action */}
      <input type="hidden" name="oficio_type" value={oficioType} />
      <input type="hidden" name="case_file_id" value={caseFileId} />
      <input type="hidden" name="body_intro" value={bodyIntro} />
      <input type="hidden" name="school_year_text" value={schoolYearText || ""} />
      <input type="hidden" name="signatures_json" value={JSON.stringify(currentSignatures)} />
      <input type="hidden" name="signature_type" value={signatureType} />
      <input type="hidden" name="physical_file_ref" value={physicalFileRef} />
      <input type="hidden" name="physical_evidence_url" value={physicalEvidenceUrl} />

      {state.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <div className="font-bold">Error al guardar el oficio</div>
            <div>{state.error}</div>
          </div>
        </div>
      )}

      {/* Cabecera */}
      <div className="card p-6 bg-gradient-to-br from-brand-900 via-brand-850 to-brand-800 text-white rounded-2xl shadow-md border-0">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs font-semibold text-brand-100 uppercase tracking-wider">
              <span>🏛️</span>
              <span>{institutionName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              OFICIO INSTITUCIONAL DEL DECE
            </h1>
            <p className="text-xs sm:text-sm text-brand-200 max-w-3xl leading-relaxed">
              Correspondencia oficial dirigida a la máxima autoridad institucional o a una
              entidad externa. El número consecutivo se asigna automáticamente en el libro
              de oficios del departamento, independiente del de informes técnicos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
            <Link
              href="/oficios"
              className="px-4 py-2 text-xs font-semibold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              Cancelar
            </Link>
            <SubmitButton isEditing={isEditing} />
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/10 p-3 rounded-xl backdrop-blur-xs">
            <div className="text-[11px] text-brand-200">Número de oficio</div>
            <div className="text-sm font-black text-white break-all">
              {currentOficioNumber || previewOficioNumber || "Se asignará al guardar"}
            </div>
            <div className="text-[10px] text-brand-300">
              {isEditing ? "Número ya emitido (no editable)" : "Previsualización del consecutivo"}
            </div>
          </div>
          <div className="bg-white/10 p-3 rounded-xl backdrop-blur-xs">
            <div className="text-[11px] text-brand-200">Circunstancia</div>
            <div className="text-sm font-bold text-white leading-snug">
              {selectedOption.icon} {selectedOption.label}
            </div>
          </div>
          <div className="bg-white/10 p-3 rounded-xl backdrop-blur-xs">
            <div className="text-[11px] text-brand-200">Caso vinculado</div>
            <div className="text-sm font-bold text-white leading-snug">
              {selectedCase
                ? `${selectedCase.case_code} — ${selectedCase.student_name}`
                : "Sin caso (oficio autónomo)"}
            </div>
          </div>
        </div>
      </div>

      {/* 1. Circunstancia del oficio */}
      <div className="card p-6 space-y-5 shadow-xs border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span>✉️</span>
            <span>1. Circunstancia y datos del oficio</span>
          </h2>
          <button
            type="button"
            onClick={() => {
              setAiModalType(oficioType);
              setIsAiModalOpen(true);
            }}
            className="btn-primary text-xs px-4 py-2 flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 self-start sm:self-auto"
          >
            <span>⚡</span>
            <span>Generar Oficio Completo con IA</span>
          </button>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">
            ¿Para qué circunstancia se emite este oficio? *
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {OFICIO_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleTypeChange(opt.value)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  oficioType === opt.value
                    ? "border-brand-500 bg-brand-50/70 ring-2 ring-brand-500/20"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                  <span>{opt.icon}</span>
                  <span>{opt.label}</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">{opt.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-3 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ciudad de emisión *
            </label>
            <input
              type="text"
              name="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="input w-full text-sm"
              placeholder="Ambato"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Fecha del oficio *
            </label>
            <input
              type="date"
              name="oficio_date"
              value={oficioDate}
              onChange={(e) => setOficioDate(e.target.value)}
              className="input w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Vincular a un caso existente (opcional)
            </label>
            <select
              value={caseFileId}
              onChange={(e) => setCaseFileId(e.target.value)}
              className="select w-full text-sm"
            >
              <option value="">Sin caso — oficio autónomo</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.case_code} — {c.student_name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Si vinculas un caso, el oficio queda registrado en su bitácora de acciones.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Destinatario */}
      <div className="card p-6 space-y-5 shadow-xs border border-slate-200">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b pb-3">
          <span>📮</span>
          <span>2. Persona o entidad destinataria</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre de la persona destinataria *
            </label>
            <div className="flex gap-2">
              <input
                id="oficio_addressee_name"
                type="text"
                name="addressee_name"
                value={addresseeName}
                onChange={(e) => setAddresseeName(e.target.value)}
                className="input w-full text-sm"
                placeholder="Msc. Diana Manzano"
                required
              />
              <VoiceDictationButton
                targetId="oficio_addressee_name"
                compact
                onResult={(t) => setAddresseeName(t)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Cargo *
            </label>
            <input
              type="text"
              name="addressee_role"
              value={addresseeRole}
              onChange={(e) => setAddresseeRole(e.target.value)}
              className="input w-full text-sm uppercase"
              placeholder="RECTORA"
              list="oficio-addressee-roles"
            />
            <datalist id="oficio-addressee-roles">
              {OFICIO_ADDRESSEE_ROLE_OPTIONS.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {OFICIO_ADDRESSEE_ROLE_OPTIONS.slice(0, 4).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setAddresseeRole(r)}
                  className="text-[10px] bg-slate-100 hover:bg-brand-50 text-slate-700 hover:text-brand-700 px-2 py-0.5 rounded border border-slate-200 transition-colors"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Institución u organismo destinatario
            </label>
            <div className="flex gap-2">
              <input
                id="oficio_addressee_institution"
                type="text"
                name="addressee_institution"
                value={addresseeInstitution}
                onChange={(e) => setAddresseeInstitution(e.target.value)}
                className="input w-full text-sm"
                placeholder='Unidad Educativa "Santa Rosa"'
              />
              <VoiceDictationButton
                targetId="oficio_addressee_institution"
                compact
                onResult={(t) => setAddresseeInstitution(t)}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Cámbiala cuando el oficio se dirija a una entidad externa (Junta Cantonal,
              Distrito, MSP, ONG…).
            </p>
          </div>
        </div>
      </div>

      {/* 3. Contenido del oficio */}
      <div className="card p-6 space-y-6 shadow-xs border border-slate-200">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b pb-3">
          <span>📝</span>
          <span>3. Contenido del oficio</span>
        </h2>

        {/* Asunto */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
            <label className="text-xs font-bold text-slate-700">
              ASUNTO * <span className="font-normal text-slate-400">(se imprime en mayúsculas)</span>
            </label>
            <div className="flex items-center gap-2">
              <AIAssistButton
                targetId="oficio_asunto"
                fieldLabel="Asunto del oficio institucional del DECE"
                documentType="Oficio institucional DECE"
                sectionPurpose="Redactar la línea de ASUNTO de un oficio institucional del DECE: una sola línea en mayúsculas que resuma el objeto del oficio, sin punto final."
                customContext={`Circunstancia del oficio: ${selectedOption.label}. Institución: ${institutionName}. Destinatario: ${addresseeRole} ${addresseeName}. ${caseContextForAi}`}
                compact
                onResult={(t) => setAsunto(t)}
              />
              <VoiceDictationButton
                targetId="oficio_asunto"
                compact
                onResult={(t) => setAsunto((prev) => (prev ? prev + " " + t : t))}
              />
            </div>
          </div>
          <textarea
            id="oficio_asunto"
            name="asunto"
            rows={2}
            value={asunto}
            onChange={(e) => setAsunto(e.target.value)}
            className="textarea w-full text-xs leading-relaxed uppercase"
            placeholder="INFORME TÉCNICO SITUACIONAL POR UNA PRESUNTA SITUACIÓN DE..."
            required
          />
        </div>

        {/* Párrafo de encuadre */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
            <label className="text-xs font-bold text-slate-700">
              Párrafo de encuadre legal o contextual
            </label>
            <div className="flex items-center gap-2">
              <AIAssistButton
                targetId="oficio_body_intro"
                fieldLabel="Párrafo de encuadre legal o contextual del oficio institucional"
                documentType="Oficio institucional DECE"
                sectionPurpose="Redactar el párrafo inicial de encuadre de un oficio del DECE: saludo formal y marco normativo o institucional que corresponda a la circunstancia, en un solo párrafo, sin inventar hechos ni normas que no correspondan."
                customContext={`Circunstancia: ${selectedOption.label}. ${
                  requiresDebidaDiligencia(oficioType)
                    ? "Debe citar el Art. 63.4 de Debida Diligencia."
                    : "NO debe citar el Art. 63.4 ni ninguna norma sobre violencia."
                } Institución: ${institutionName}.`}
                compact
                onResult={(t) => setBodyIntro(t)}
              />
              <VoiceDictationButton
                targetId="oficio_body_intro"
                compact
                onResult={(t) => setBodyIntro((prev) => (prev ? prev + " " + t : t))}
              />
            </div>
          </div>
          <textarea
            id="oficio_body_intro"
            rows={6}
            value={bodyIntro}
            onChange={(e) => setBodyIntro(e.target.value)}
            className="textarea w-full text-xs leading-relaxed"
            placeholder="Reciba un cordial saludo deseándole éxitos en sus funciones..."
          />
          <div className="flex flex-wrap items-center gap-3 mt-1.5">
            {bodyIntro.trim() !== getDefaultBodyIntro(oficioType).trim() && (
              <button
                type="button"
                onClick={() => setBodyIntro(getDefaultBodyIntro(oficioType))}
                className="text-[11px] text-brand-700 hover:text-brand-900 font-semibold underline"
              >
                Restaurar el encuadre oficial de esta circunstancia
              </button>
            )}
            {requiresDebidaDiligencia(oficioType) && (
              <span className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
                ⚖️ Esta circunstancia cita el Art. 63.4 — Debida Diligencia.
              </span>
            )}
          </div>
        </div>

        {/* Cuerpo específico */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
            <label className="text-xs font-bold text-slate-700">
              Solicitud o notificación concreta *
            </label>
            <div className="flex items-center gap-2">
              <AIAssistButton
                targetId="oficio_body_content"
                fieldLabel="Cuerpo del oficio institucional: solicitud o notificación concreta"
                documentType="Oficio institucional DECE"
                sectionPurpose="Redactar el párrafo principal de un oficio del DECE, que expone el contenido específico y cierra indicando con claridad qué se solicita o qué se informa. Reformula en lenguaje técnico sin inventar hechos, nombres ni fechas."
                customContext={`Circunstancia: ${selectedOption.label}. Institución: ${institutionName}. Destinatario: ${addresseeRole} ${addresseeName} de ${addresseeInstitution}. ${caseContextForAi}`}
                compact
                onResult={(t) => setBodyContent(t)}
              />
              <VoiceDictationButton
                targetId="oficio_body_content"
                compact
                onResult={(t) => setBodyContent((prev) => (prev ? prev + " " + t : t))}
              />
            </div>
          </div>
          <textarea
            id="oficio_body_content"
            name="body_content"
            rows={8}
            value={bodyContent}
            onChange={(e) => setBodyContent(e.target.value)}
            className="textarea w-full text-xs leading-relaxed"
            placeholder="Con este antecedente me permito adjuntar... y a través del presente solicito a su autoridad..."
            required
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Este es el contenido propio del oficio. Dicta o escribe los hechos; la IA solo
            estructura la redacción, nunca inventa datos.
          </p>
        </div>

        {/* Nota de cierre */}
        <div className="pt-4 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Nota de cierre
          </label>
          <input
            type="text"
            name="closing_note"
            value={closingNote}
            onChange={(e) => setClosingNote(e.target.value)}
            className="input w-full text-sm"
            placeholder={OFICIO_DEFAULT_CLOSING_NOTE}
          />
        </div>
      </div>

      {/* 4. Suscripción y respaldo */}
      <div className="card p-6 space-y-5 shadow-xs border border-slate-200">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b pb-3">
          <span>✍️</span>
          <span>4. Suscripción del oficio y respaldo institucional</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre de quien suscribe *
            </label>
            <div className="flex gap-2">
              <input
                id="oficio_signer_name"
                type="text"
                name="signer_name"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                className="input w-full text-sm"
                placeholder="Mgtr. Marlon Jácome"
                required
              />
              <VoiceDictationButton
                targetId="oficio_signer_name"
                compact
                onResult={(t) => setSignerName(t)}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Cargo de quien suscribe *
            </label>
            <input
              type="text"
              name="signer_role"
              value={signerRole}
              onChange={(e) => setSignerRole(e.target.value)}
              className="input w-full text-sm uppercase"
              placeholder="ANALISTA DECE"
            />
          </div>
        </div>

        {/* Firma dual */}
        <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
              <span>✍️</span> Firma de responsabilidad del profesional DECE
            </h3>
            {signerSig?.tipo === "digital" ? (
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded">
                  🖋️ Digital
                </span>
                <button type="button" onClick={() => setIsSignModalOpen(true)} className="text-[10px] text-brand-700 hover:underline">
                  Cambiar
                </button>
                <button type="button" onClick={() => setSignerSig(null)} className="text-[10px] text-rose-600 hover:underline">
                  ✕
                </button>
              </div>
            ) : signerSig?.tipo === "fisica" ? (
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded">
                  📄 Papel
                </span>
                <button type="button" onClick={() => setIsSignModalOpen(true)} className="text-[10px] text-brand-700 hover:underline">
                  Cambiar
                </button>
                <button type="button" onClick={() => setSignerSig(null)} className="text-[10px] text-rose-600 hover:underline">
                  ✕
                </button>
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
          <p className="text-[11px] text-slate-500 leading-relaxed">
            El talonario de recepción del pie del oficio ("Recibido por (firma)", "Nombre",
            "Fecha" y "Hora") siempre se imprime en blanco: lo llena a mano quien recibe el
            documento.
          </p>
        </div>

        {/* Respaldo físico */}
        <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <span>📁</span> Respaldo físico DECE y ubicación de archivo institucional
            </span>
            <span className="text-[11px] text-amber-700 bg-amber-100/70 border border-amber-300 px-2 py-0.5 rounded-full font-medium">
              Custodia DECE
            </span>
          </div>
          <p className="text-xs text-amber-800/90 leading-relaxed">
            Registra dónde queda archivado el oficio original con el sello de recepción y,
            opcionalmente, adjunta la copia escaneada o la foto del documento recibido.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                Ubicación en archivo físico institucional
              </label>
              <input
                type="text"
                value={physicalFileRef}
                onChange={(e) => setPhysicalFileRef(e.target.value)}
                placeholder="Ej. Archivador Oficios Enviados 2026 / Folio 032"
                className="w-full text-xs rounded-lg border border-amber-300 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                Adjuntar oficio sellado / recibido (PDF o imagen)
              </label>
              {physicalEvidenceUrl ? (
                <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-amber-300">
                  <span className="text-xs text-emerald-800 font-medium flex items-center gap-1.5 truncate max-w-[200px]">
                    <span>📎</span> {physicalEvidenceName || "Oficio_Sellado"}
                  </span>
                  <div className="flex items-center gap-2">
                    <a href={physicalEvidenceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
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
      </div>

      <div className="flex items-center justify-end gap-3">
        <Link href="/oficios" className="btn-secondary text-xs px-4 py-2">
          Cancelar
        </Link>
        <SubmitButton isEditing={isEditing} />
      </div>

      {isSignModalOpen && (
        <DualSignatureModal
          isOpen={true}
          onClose={() => setIsSignModalOpen(false)}
          signatoryName={signerName || "Profesional DECE"}
          signatoryRole={signerRole || "ANALISTA DECE"}
          initialData={signerSig}
          onSave={(data) => {
            setSignerSig(data);
            setIsSignModalOpen(false);
          }}
        />
      )}

      {/* Modal de generación completa con IA */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xl shadow-md">
                  ⚡
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Generar Oficio Completo con IA
                  </h3>
                  <p className="text-xs text-slate-500">
                    Se redactarán el asunto, el párrafo de encuadre y la solicitud a partir
                    de lo que escribas o dictes.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isGeneratingAi && setIsAiModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg p-1"
                disabled={isGeneratingAi}
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-700 block">
                1. ¿Para qué circunstancia es el oficio?
              </label>
              <div className="grid grid-cols-1 gap-2">
                {OFICIO_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAiModalType(opt.value)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      aiModalType === opt.value
                        ? "border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 block">
                  2. Describe brevemente la situación o la actividad
                </label>
                <VoiceDictationButton
                  targetId="oficio_ai_notes"
                  compact
                  onResult={(t) => setAiNotes((prev) => (prev ? prev + " " + t : t))}
                />
              </div>
              <textarea
                id="oficio_ai_notes"
                rows={5}
                value={aiNotes}
                onChange={(e) => setAiNotes(e.target.value)}
                className="textarea w-full text-xs leading-relaxed"
                placeholder="Ej. Se realizará un taller de prevención del consumo de drogas con el MSP para los terceros de bachillerato el 15 de octubre en el auditorio."
              />
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2.5">
                <span className="text-base shrink-0">💡</span>
                <p className="leading-relaxed">
                  La IA <strong>no inventa hechos, nombres ni fechas</strong>: solo aporta la
                  estructura de prosa y el encuadre institucional correcto alrededor de lo
                  que tú escribas. Revisa siempre el texto antes de emitirlo.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAiModalOpen(false)}
                disabled={isGeneratingAi}
                className="btn-secondary text-xs px-4 py-2"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGenerateFullOficio}
                disabled={isGeneratingAi}
                className="btn-primary text-xs px-5 py-2.5 flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              >
                {isGeneratingAi ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Redactando oficio...</span>
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    <span>Generar Oficio</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
