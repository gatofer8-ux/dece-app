"use client";

import { useRef, useState } from "react";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import { draftActivityReportField } from "../report-actions";
import {
  createActivityReport,
  createStandaloneActivityReport,
  updateActivityReport,
} from "../report-actions";
import { ACTIVITY_REPORT_AXIS_OPTIONS } from "@/lib/activityReport";
import { PREVENTION_THEME_OPTIONS, type ActivityReportRow } from "@/lib/types";
import DualSignatureModal, { type DualSignatureData } from "@/components/DualSignatureModal";

type Prefill = Record<string, string | number | null>;

const AI_FIELDS = [
  "legal_basis",
  "objective_general",
  "objectives_specific",
  "development_analysis",
  "advances",
  "critical_nodes",
  "conclusions",
  "recommendations",
] as const;

function AiButton({
  fieldKey,
  targetId,
  getCtx,
}: {
  fieldKey: (typeof AI_FIELDS)[number];
  targetId: string;
  getCtx: () => { tema?: string; theme?: string; beneficiaries?: string; participants?: string };
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function run() {
    const el = document.getElementById(targetId) as HTMLTextAreaElement | HTMLInputElement | null;
    if (!el) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await draftActivityReportField(fieldKey, el.value, getCtx());
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

export default function ActivityReportForm({
  mode,
  activityId,
  reportId,
  prefill,
  initialData,
}: {
  mode: "create-from-activity" | "create-standalone" | "edit";
  activityId?: string;
  reportId?: string;
  prefill: Prefill;
  initialData?: ActivityReportRow;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  // Estados de firmas duales y respaldo físico
  const initialSignatures: DualSignatureData[] = (() => {
    try {
      const raw = initialData?.signatures_json || prefill?.signatures_json;
      return typeof raw === "string" ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  })();

  const [elaboratedSig, setElaboratedSig] = useState<DualSignatureData | null>(
    initialSignatures.find((s) => s.signer_id === "elaborated" || s.role?.toLowerCase().includes("elabora") || s.role?.toLowerCase().includes("dece")) || null
  );
  const [approvedSig, setApprovedSig] = useState<DualSignatureData | null>(
    initialSignatures.find((s) => s.signer_id === "approved" || s.role?.toLowerCase().includes("autoridad") || s.role?.toLowerCase().includes("rector")) || null
  );

  const [activeSignerModal, setActiveSignerModal] = useState<"elaborated" | "approved" | null>(null);

  const [physicalFileRef, setPhysicalFileRef] = useState(
    (initialData?.physical_file_ref || prefill?.physical_file_ref || "") as string
  );
  const [physicalEvidenceUrl, setPhysicalEvidenceUrl] = useState(
    (initialData?.physical_evidence_url || prefill?.physical_evidence_url || "") as string
  );
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

  const currentSignatures: DualSignatureData[] = [
    ...(elaboratedSig ? [{ ...elaboratedSig, signer_id: "elaborated" }] : []),
    ...(approvedSig ? [{ ...approvedSig, signer_id: "approved" }] : []),
  ];

  const overallSignatureType =
    currentSignatures.length === 0
      ? ((initialData?.signature_type || prefill?.signature_type || "digital") as string)
      : currentSignatures.every((s) => s.tipo === "digital")
      ? "digital"
      : currentSignatures.every((s) => s.tipo === "fisica")
      ? "fisica"
      : "mixta";
  const v = (k: string): string => {
    const fromInitial = initialData ? (initialData as unknown as Record<string, unknown>)[k] : undefined;
    if (fromInitial != null) return String(fromInitial);
    const p = prefill[k];
    return p == null ? "" : String(p);
  };

  const getCtx = () => ({
    tema: (document.getElementById("f-tema") as HTMLTextAreaElement | null)?.value || v("tema"),
    beneficiaries:
      (document.getElementById("f-activity_beneficiaries") as HTMLInputElement | null)?.value || v("activity_beneficiaries"),
    participants:
      (document.getElementById("f-participants_count") as HTMLInputElement | null)?.value ||
      v("participants_count"),
  });

  const action =
    mode === "edit"
      ? updateActivityReport.bind(null, reportId!)
      : mode === "create-standalone"
      ? createStandaloneActivityReport
      : createActivityReport.bind(null, activityId!);

  const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="label text-xs">{children}</label>
  );

  const TA = ({ name, rows = 3, ai }: { name: string; rows?: number; ai?: (typeof AI_FIELDS)[number] }) => (
    <>
      <div className="flex items-center justify-between mb-1">
        <Label>{LABELS[name] || name}</Label>
        <div className="flex items-center gap-2">
          <VoiceDictationButton targetId={`f-${name}`} />
          {ai && <AiButton fieldKey={ai} targetId={`f-${name}`} getCtx={getCtx} />}
        </div>
      </div>
      <textarea id={`f-${name}`} name={name} rows={rows} defaultValue={v(name)} className="textarea text-sm" />
    </>
  );

  const IN = ({ name, type = "text", w }: { name: string; type?: string; w?: string }) => (
    <div className={w}>
      <div className="flex items-center justify-between">
        <Label>{LABELS[name] || name}</Label>
        {type === "text" && <VoiceDictationButton targetId={`f-${name}`} />}
      </div>
      <input id={`f-${name}`} name={name} type={type} defaultValue={v(name)} className="input text-sm" />
    </div>
  );

  return (
    <form ref={formRef} action={action} className="card p-6 space-y-6 max-w-4xl">
      {mode !== "create-standalone" && initialData?.report_number && (
        <p className="text-xs text-slate-500">
          N° de Informe: <span className="font-mono font-semibold">{initialData.report_number}</span>
        </p>
      )}
      {mode !== "edit" && (
        <p className="text-xs text-slate-500">
          El N° de Informe se asigna automáticamente al guardar (formato oficial MinEduc).
        </p>
      )}

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Datos generales</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {IN({ name: "report_date", type: "date" })}
          {IN({ name: "school_year_text" })}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div className="border rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-slate-600">Funcionario responsable del informe</p>
            {IN({ name: "responsible_name" })}
            {IN({ name: "responsible_role" })}
            {IN({ name: "responsible_phone_ext" })}
            {IN({ name: "responsible_email", type: "email" })}
          </div>
          <div className="border rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-slate-600">Informe dirigido a</p>
            {IN({ name: "directed_to_name" })}
            {IN({ name: "directed_to_role" })}
            {IN({ name: "directed_to_phone_ext" })}
            {IN({ name: "directed_to_email", type: "email" })}
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Tema</h3>
        {TA({ name: "tema", rows: 2 })}
      </section>

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Antecedentes</h3>
        <div className="space-y-4">
          {TA({ name: "legal_basis", rows: 5, ai: "legal_basis" })}
          {TA({ name: "scope_text", rows: 2 })}
          {TA({ name: "objective_general", rows: 3, ai: "objective_general" })}
          {TA({ name: "objectives_specific", rows: 4, ai: "objectives_specific" })}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Desarrollo o análisis</h3>
        {TA({ name: "development_analysis", rows: 8, ai: "development_analysis" })}
      </section>

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Actividad</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {IN({ name: "activity_name" })}
          <div>
            <Label>Eje</Label>
            <select name="activity_axis" defaultValue={v("activity_axis") || ACTIVITY_REPORT_AXIS_OPTIONS[0]} className="select text-sm">
              {ACTIVITY_REPORT_AXIS_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          {IN({ name: "activity_date", type: "date" })}
          {IN({ name: "activity_responsible" })}
          {IN({ name: "activity_beneficiaries", w: "sm:col-span-2" })}
        </div>
        {mode === "create-standalone" && (
          <div className="mt-3">
            <Label>Tema de prevención (para la actividad)</Label>
            <select name="prevention_theme" defaultValue={v("prevention_theme")} className="select text-sm">
              <option value="">— Sin especificar —</option>
              {PREVENTION_THEME_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        )}
      </section>

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Resultados</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {IN({ name: "participants_count", type: "number" })}
        </div>
        <div className="space-y-4 mt-3">
          {TA({ name: "advances", rows: 5, ai: "advances" })}
          {TA({ name: "critical_nodes", rows: 4, ai: "critical_nodes" })}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Conclusiones y recomendaciones</h3>
        <div className="space-y-4">
          {TA({ name: "conclusions", rows: 5, ai: "conclusions" })}
          {TA({ name: "recommendations", rows: 5, ai: "recommendations" })}
        </div>
      </section>

      <section>
        {/* Hidden inputs para firmas duales y respaldo físico */}
        <input type="hidden" name="signatures_json" value={JSON.stringify(currentSignatures)} />
        <input type="hidden" name="signature_type" value={overallSignatureType} />
        <input type="hidden" name="physical_file_ref" value={physicalFileRef} />
        <input type="hidden" name="physical_evidence_url" value={physicalEvidenceUrl} />

        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">Firmas de Responsabilidad</h3>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
            overallSignatureType === "digital"
              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
              : overallSignatureType === "fisica"
              ? "bg-amber-50 text-amber-700 border-amber-300"
              : "bg-blue-50 text-blue-700 border-blue-300"
          }`}>
            Modalidad: {overallSignatureType === "digital" ? "Digital" : overallSignatureType === "fisica" ? "Física (Papel)" : "Mixta"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="border rounded-lg p-3 space-y-2 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-700">Desarrollo del documento (elabora)</p>
              {elaboratedSig?.tipo === "digital" ? (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded">🖋️ Digital</span>
                  <button type="button" onClick={() => setActiveSignerModal("elaborated")} className="text-[10px] text-brand-700 hover:underline">Cambiar</button>
                  <button type="button" onClick={() => setElaboratedSig(null)} className="text-[10px] text-rose-600 hover:underline">✕</button>
                </div>
              ) : elaboratedSig?.tipo === "fisica" ? (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded">📄 Papel</span>
                  <button type="button" onClick={() => setActiveSignerModal("elaborated")} className="text-[10px] text-brand-700 hover:underline">Cambiar</button>
                  <button type="button" onClick={() => setElaboratedSig(null)} className="text-[10px] text-rose-600 hover:underline">✕</button>
                </div>
              ) : (
                <button type="button" onClick={() => setActiveSignerModal("elaborated")} className="text-[10px] font-semibold text-brand-700 hover:underline">
                  ✍️ Registrar Firma
                </button>
              )}
            </div>
            {IN({ name: "elaborated_by_name" })}
            {IN({ name: "elaborated_by_role" })}
            {IN({ name: "elaborated_date", type: "date" })}
          </div>

          <div className="border rounded-lg p-3 space-y-2 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-700">Aprobación del documento (autoridad)</p>
              {approvedSig?.tipo === "digital" ? (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded">🖋️ Digital</span>
                  <button type="button" onClick={() => setActiveSignerModal("approved")} className="text-[10px] text-brand-700 hover:underline">Cambiar</button>
                  <button type="button" onClick={() => setApprovedSig(null)} className="text-[10px] text-rose-600 hover:underline">✕</button>
                </div>
              ) : approvedSig?.tipo === "fisica" ? (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded">📄 Papel</span>
                  <button type="button" onClick={() => setActiveSignerModal("approved")} className="text-[10px] text-brand-700 hover:underline">Cambiar</button>
                  <button type="button" onClick={() => setApprovedSig(null)} className="text-[10px] text-rose-600 hover:underline">✕</button>
                </div>
              ) : (
                <button type="button" onClick={() => setActiveSignerModal("approved")} className="text-[10px] font-semibold text-brand-700 hover:underline">
                  ✍️ Registrar Firma
                </button>
              )}
            </div>
            {IN({ name: "approved_by_name" })}
            {IN({ name: "approved_by_role" })}
            {IN({ name: "approved_date", type: "date" })}
          </div>
        </div>
      </section>

      {/* Respaldo Físico DECE e Informe de Taller en Papel */}
      <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
            <span>📁</span> Respaldo Físico DECE e Informe de Taller en Papel (Auditoría Ministerial)
          </span>
          <span className="text-[11px] text-amber-700 bg-amber-100/70 border border-amber-300 px-2 py-0.5 rounded-full font-medium">
            Custodia DECE
          </span>
        </div>
        <p className="text-xs text-amber-800/90 leading-relaxed">
          Para garantizar la constancia legal y auditoría física, registra la ubicación física en carpeta/archivador y opcionalmente adjunta copia escaneada o foto (PDF o Imagen) del informe de actividad firmado y sellado.
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
              placeholder="Ej. Archivador Informes POAT 2026 / Carpeta Talleres"
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
                  <span>📎</span> {physicalEvidenceName || "Informe_Taller_Sellado"}
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

      {activeSignerModal && (
        <DualSignatureModal
          isOpen={true}
          onClose={() => setActiveSignerModal(null)}
          signatoryName={
            activeSignerModal === "elaborated"
              ? (document.getElementById("f-elaborated_by_name") as HTMLInputElement)?.value || "Profesional DECE"
              : (document.getElementById("f-approved_by_name") as HTMLInputElement)?.value || "Máxima Autoridad"
          }
          signatoryRole={
            activeSignerModal === "elaborated"
              ? (document.getElementById("f-elaborated_by_role") as HTMLInputElement)?.value || "FACILITADOR/A DECE"
              : (document.getElementById("f-approved_by_role") as HTMLInputElement)?.value || "RECTOR/A INSTITUCIONAL"
          }
          initialData={activeSignerModal === "elaborated" ? elaboratedSig : approvedSig}
          onSave={(data) => {
            if (activeSignerModal === "elaborated") setElaboratedSig({ ...data, signer_id: "elaborated" });
            if (activeSignerModal === "approved") setApprovedSig({ ...data, signer_id: "approved" });
            setActiveSignerModal(null);
          }}
        />
      )}

      <div className="flex justify-end">
        <button type="submit" className="btn-primary">
          {mode === "edit" ? "Guardar cambios" : "Guardar y ver informe"}
        </button>
      </div>
      {mode !== "edit" && (
        <p className="text-xs text-slate-400 text-right">Podrás subir el registro fotográfico después de guardar, en «Editar».</p>
      )}
    </form>
  );
}

const LABELS: Record<string, string> = {
  report_date: "Fecha de informe",
  school_year_text: "Año lectivo",
  responsible_name: "Nombre",
  responsible_role: "Cargo",
  responsible_phone_ext: "Extensión telefónica",
  responsible_email: "Correo electrónico",
  directed_to_name: "Nombre",
  directed_to_role: "Cargo",
  directed_to_phone_ext: "Extensión telefónica",
  directed_to_email: "Correo electrónico",
  tema: "Tema del informe",
  legal_basis: "Base legal",
  scope_text: "Alcance",
  objective_general: "Objetivo general",
  objectives_specific: "Objetivos específicos (uno por línea)",
  development_analysis: "Desarrollo o análisis",
  activity_name: "Actividad",
  activity_date: "Fecha de la actividad",
  activity_responsible: "Responsable",
  activity_beneficiaries: "Beneficiarios",
  participants_count: "Número de participantes",
  advances: "Avances (uno por línea)",
  critical_nodes: "Nudos críticos (uno por línea)",
  conclusions: "Conclusiones (una por línea)",
  recommendations: "Recomendaciones (una por línea)",
  elaborated_by_name: "Nombre",
  elaborated_by_role: "Cargo",
  elaborated_date: "Fecha",
  approved_by_name: "Nombre",
  approved_by_role: "Cargo",
  approved_date: "Fecha",
};
