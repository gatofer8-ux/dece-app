"use client";

import { useState } from "react";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import {
  createAccompanimentReport,
  updateAccompanimentReport,
  draftAccompanimentField,
} from "../acompanamiento-actions";
import {
  INDICATOR_SIGNOS_FISICOS,
  INDICATOR_SIGNOS_COMPORTAMIENTO,
  INDICATOR_CONDUCTAS_IE,
  FACTOR_PERSONALES_RIESGO,
  FACTOR_PERSONALES_PROTECCION,
  FACTOR_FAMILIARES_RIESGO,
  FACTOR_FAMILIARES_PROTECCION,
  FACTOR_SITUACIONALES_RIESGO,
  FACTOR_SITUACIONALES_PROTECCION,
  EXT_REFERRAL_INSTANCES,
  PSYCHOSOCIAL_REFERRAL_OPTIONS,
  parseIndicators,
  parseRiskProtection,
  parseExtReferral,
  parsePsychosocialReferral,
  type ACCOMPANIMENT_AI_LABELS,
} from "@/lib/accompanimentReport";
import type { CaseAccompanimentReportRow } from "@/lib/types";
import DualSignatureModal, { type DualSignatureData } from "@/components/DualSignatureModal";

type AiKey = keyof typeof ACCOMPANIMENT_AI_LABELS;

function AiBtn({ caseId, fieldKey, targetId }: { caseId: string; fieldKey: AiKey; targetId: string }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function go() {
    const el = document.getElementById(targetId) as HTMLTextAreaElement | null;
    if (!el) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await draftAccompanimentField(caseId, fieldKey, el.value);
      if (res.error) setErr(res.error);
      else if (res.text) {
        el.value = res.text;
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
    } catch {
      setErr("Error con la IA.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <span className="inline-flex items-center gap-1">
      <button type="button" onClick={go} disabled={loading} className="rounded-full border bg-violet-50 border-violet-300 text-violet-700 hover:bg-violet-100 text-[11px] px-2 py-0.5 font-medium disabled:opacity-60">
        ✨ {loading ? "Redactando…" : "IA"}
      </button>
      {err && <span className="text-[11px] text-red-600">{err}</span>}
    </span>
  );
}

function CheckGroup({ name, title, options, selected }: { name: string; title: string; options: string[]; selected: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-600 mb-1">{title}</p>
      <div className="space-y-1">
        {options.map((o) => (
          <label key={o} className="flex items-start gap-2 text-xs">
            <input type="checkbox" name={name} value={o} defaultChecked={selected.includes(o)} className="mt-0.5" />
            <span>{o}</span>
          </label>
        ))}
        <input name={`${name}_otros`} placeholder="Otros…" className="input !py-1 text-xs mt-1" />
      </div>
    </div>
  );
}

export default function AccompanimentReportForm({
  caseId,
  mode,
  reportId,
  prefill,
  restitutionPlans,
  initialData,
}: {
  caseId: string;
  mode: "create" | "edit";
  reportId?: string;
  prefill: Record<string, string>;
  restitutionPlans: { id: string; label: string }[];
  initialData?: CaseAccompanimentReportRow;
}) {
  const v = (k: string) =>
    initialData && (initialData as unknown as Record<string, unknown>)[k] != null
      ? String((initialData as unknown as Record<string, unknown>)[k])
      : prefill[k] || "";

  const ind = initialData ? parseIndicators(initialData.indicators_json) : parseIndicators(null);
  const rp = initialData ? parseRiskProtection(initialData.risk_protection_json) : parseRiskProtection(null);
  const ext = initialData ? parseExtReferral(initialData.ext_referral_json) : { selected: [] };
  const psy = initialData ? parsePsychosocialReferral(initialData.psychosocial_referral_json) : { entries: [] };
  const psyName = (opt: string) => psy.entries.find((e) => e.option === opt)?.name || "";

  // Estados de firmas duales y respaldo físico
  const initialSignatures: DualSignatureData[] = (() => {
    try {
      return initialData?.signatures_json ? JSON.parse(initialData.signatures_json) : [];
    } catch {
      return [];
    }
  })();

  const [professionalSigning, setProfessionalSigning] = useState(v("professional_signing"));
  const [deceSig, setDeceSig] = useState<DualSignatureData | null>(
    initialSignatures.find((s) => s.signer_id === "dece" || s.role?.toLowerCase().includes("dece") || s.tipo) || null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const currentSignatures: DualSignatureData[] = deceSig
    ? [{ ...deceSig, signer_id: "dece", role: "PROFESIONAL DECE", signer_name: professionalSigning || "Profesional DECE" }]
    : [];

  const overallSignatureType =
    currentSignatures.length === 0
      ? "PENDIENTE"
      : deceSig?.tipo === "digital"
      ? "DIGITAL"
      : "FISICA";

  const action = mode === "edit" ? updateAccompanimentReport.bind(null, reportId!, caseId) : createAccompanimentReport.bind(null, caseId);

  const IN = (name: string, label: string, type = "text", w = "") => (
    <div className={w}>
      <label className="label text-xs">{label}</label>
      <input name={name} type={type} defaultValue={v(name)} className="input !py-1 text-sm" />
    </div>
  );
  const TA = (name: string, label: string, ai?: AiKey, rows = 5) => (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="label text-xs">{label}</label>
        <div className="flex items-center gap-2">
          <VoiceDictationButton targetId={`f-${name}`} />
          {ai && <AiBtn caseId={caseId} fieldKey={ai} targetId={`f-${name}`} />}
        </div>
      </div>
      <textarea id={`f-${name}`} name={name} rows={rows} defaultValue={v(name)} className="textarea text-sm" />
    </div>
  );

  return (
    <form action={action} className="card p-6 space-y-7 max-w-4xl">
      <input type="hidden" name="signatures_json" value={JSON.stringify(currentSignatures)} />
      <input type="hidden" name="signature_type" value={overallSignatureType} />
      <input type="hidden" name="physical_file_ref" value={physicalFileRef} />
      <input type="hidden" name="physical_evidence_url" value={physicalEvidenceUrl} />
      {mode !== "edit" && (
        <p className="text-xs text-slate-500">El «Informe N°» se asigna automáticamente al guardar (numeración oficial MinEduc).</p>
      )}
      {initialData?.report_number && (
        <p className="text-xs text-slate-500">Informe N°: <span className="font-mono font-semibold">{initialData.report_number}</span></p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {IN("report_date", "Fecha de elaboración del informe", "date")}
        {IN("professional_managing", "Profesional DECE que maneja el caso", "text", "sm:col-span-2")}
      </div>

      {restitutionPlans.length > 0 && (
        <div>
          <label className="label text-xs">Vincular con el Plan de Acompañamiento y Restitución</label>
          <select name="restitution_plan_id" defaultValue={v("restitution_plan_id")} className="select text-sm">
            <option value="">— Sin vincular —</option>
            {restitutionPlans.map((pl) => (
              <option key={pl.id} value={pl.id}>{pl.label}</option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400 mt-0.5">Al vincularlo, «Acciones de acompañamiento» ya trae un resumen del plan (editable).</p>
        </div>
      )}

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">1. Datos de identificación del estudiante</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {IN("student_full_name", "Apellidos y nombres", "text", "sm:col-span-2")}
          {IN("student_birth_day", "Día nac.", "text")}
          {IN("student_birth_month", "Mes nac.", "text")}
          {IN("student_birth_year", "Año nac.", "text")}
          {IN("student_age", "Edad")}
          {IN("student_nationality", "Nacionalidad")}
          {IN("student_document_id", "N° cédula o pasaporte")}
          {IN("student_grade", "Grado o curso")}
          {IN("student_jornada", "Jornada")}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">2. Datos de la madre, padre y/o representante legal</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {IN("rep_full_name", "Nombres y apellidos", "text", "sm:col-span-2")}
          {IN("rep_document_id", "Número de cédula")}
          {IN("rep_relationship", "Vínculo con el/la estudiante")}
          {IN("rep_address", "Dirección del domicilio", "text", "sm:col-span-2")}
          {IN("rep_phone_cell", "Celular")}
          {IN("rep_phone_landline", "Convencional")}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xs font-semibold text-slate-500 uppercase">3. Contexto psicosocial y pedagógico</h3>
        {TA("family_situation", "Situación familiar (con quién vive, configuración y dinámica familiar)", "family_situation", 6)}

        <div>
          <p className="text-xs font-semibold text-slate-600 mb-2">Indicadores (sección 3.2.1 A del Manual de Rutas y Protocolos de Violencia, 3.ª edición)</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CheckGroup name="signos_fisicos" title="Signos físicos" options={INDICATOR_SIGNOS_FISICOS} selected={ind.signos_fisicos} />
            <CheckGroup name="signos_comportamiento" title="Signos de comportamiento" options={INDICATOR_SIGNOS_COMPORTAMIENTO} selected={ind.signos_comportamiento} />
            <CheckGroup name="conductas_ie" title="Conductas que se identifican en la institución educativa" options={INDICATOR_CONDUCTAS_IE} selected={ind.conductas_ie} />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-600 mb-2">Factores de riesgo y protección (sección 3.2.1 B del mismo manual)</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-700">PERSONALES (del NNA)</p>
              <CheckGroup name="personales_riesgo" title="Factores de riesgo" options={FACTOR_PERSONALES_RIESGO} selected={rp.personales_riesgo} />
              <CheckGroup name="personales_proteccion" title="Factores protector" options={FACTOR_PERSONALES_PROTECCION} selected={rp.personales_proteccion} />
            </div>
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-700">FAMILIARES</p>
              <CheckGroup name="familiares_riesgo" title="Factores de riesgo" options={FACTOR_FAMILIARES_RIESGO} selected={rp.familiares_riesgo} />
              <CheckGroup name="familiares_proteccion" title="Factores protector" options={FACTOR_FAMILIARES_PROTECCION} selected={rp.familiares_proteccion} />
            </div>
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-700">SITUACIONALES Y SOCIALES</p>
              <CheckGroup name="situacionales_riesgo" title="Factores de riesgo" options={FACTOR_SITUACIONALES_RIESGO} selected={rp.situacionales_riesgo} />
              <CheckGroup name="situacionales_proteccion" title="Factores protector" options={FACTOR_SITUACIONALES_PROTECCION} selected={rp.situacionales_proteccion} />
            </div>
          </div>
        </div>

        {TA("academic_performance", "Rendimiento académico (breve; dificultades o cambios dentro y fuera del aula)", "academic_performance", 4)}
      </section>

      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">4. Acciones de acompañamiento</h3>
        {TA("accompaniment_actions", "Resumen de acciones inmediatas de acompañamiento", "accompaniment_actions", 6)}
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-500 uppercase">Referencia externa</h3>
        <div>
          <p className="text-xs font-semibold text-slate-600 mb-1">Procedimiento de referencia a instancias externas (marcar una o más):</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {EXT_REFERRAL_INSTANCES.map((o) => (
              <label key={o} className="flex items-center gap-2 text-xs">
                <input type="checkbox" name="ext_referral" value={o} defaultChecked={ext.selected.includes(o)} /> {o}
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-600 mb-1">Referencia externa para tratamiento psicológico-social (marcar y anotar el nombre):</p>
          <div className="space-y-1">
            {PSYCHOSOCIAL_REFERRAL_OPTIONS.map((o, i) => (
              <div key={o} className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                <label className="flex items-center gap-2 sm:w-72">
                  <input type="checkbox" name="psy_referral" value={o} defaultChecked={psy.entries.some((e) => e.option === o)} /> {o}
                </label>
                <input name={`psy_name_${i}`} defaultValue={psyName(o)} placeholder="Indicar nombre…" className="input !py-1 text-xs flex-1" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Firma y Responsabilidad Institucional</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label text-xs">Profesional DECE que elabora el informe</label>
            <input
              name="professional_signing"
              value={professionalSigning}
              onChange={(e) => setProfessionalSigning(e.target.value)}
              placeholder="Nombre del profesional DECE"
              className="input !py-1 text-sm font-medium"
            />
          </div>
          {IN("signing_date", "Fecha de elaboración (firma)", "date")}
        </div>

        {/* Panel de Firma Dual */}
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center space-y-2">
          <div className="text-slate-500 text-xs font-semibold">Estado de Firma del Profesional</div>
          <div className="min-h-[45px] flex items-center justify-center">
            {deceSig?.tipo === "digital" && deceSig?.firma_data_url ? (
              <div className="flex flex-col items-center">
                <img src={deceSig.firma_data_url} alt="Firma Profesional" className="h-10 max-w-[150px] object-contain" />
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded mt-1">✓ Firma Digital Registrada</span>
              </div>
            ) : deceSig?.tipo === "fisica" ? (
              <div className="text-center py-1">
                <div className="w-48 border-b border-slate-700 mx-auto mb-1"></div>
                <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded">📄 Modalidad Física (Firma Manuscrita en Papel)</span>
              </div>
            ) : (
              <span className="text-xs text-slate-400 italic">Sin firma registrada aún</span>
            )}
          </div>
          <div className="pt-2 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="btn-secondary text-xs px-3 py-1 flex items-center gap-1.5"
            >
              <span>✍️</span>
              <span>{deceSig ? "Cambiar Firma / Modalidad" : "Registrar Firma (Digital o Física)"}</span>
            </button>
            {deceSig && (
              <button
                type="button"
                onClick={() => setDeceSig(null)}
                className="text-xs text-rose-600 hover:underline px-2 py-1"
              >
                Quitar Firma
              </button>
            )}
          </div>
        </div>

        {/* Respaldo Físico DECE e Informe en Papel */}
        <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <span>📁</span> Respaldo Físico DECE e Informe de Acompañamiento en Papel (Auditoría Ministerial)
            </span>
            <span className="text-[11px] text-amber-700 bg-amber-100/70 border border-amber-300 px-2 py-0.5 rounded-full font-medium">
              Custodia Institucional
            </span>
          </div>
          <p className="text-xs text-amber-800/90 leading-relaxed">
            Para garantizar la constancia legal y auditoría física, registra la ubicación física en carpeta/archivador y opcionalmente adjunta copia escaneada o foto (PDF o Imagen) del informe con firmas manuscritas y sellos institucionales.
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
                placeholder="Ej. Archivador Casos Violencia 2026 / Informes Acompañamiento"
                className="w-full text-xs rounded-lg border border-amber-300 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                Adjuntar Informe Sellado / Firmado (PDF o Imagen)
              </label>
              {physicalEvidenceUrl ? (
                <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-amber-300">
                  <span className="text-xs text-emerald-800 font-medium flex items-center gap-1.5 truncate max-w-[200px]">
                    <span>📎</span> {physicalEvidenceName || "Informe_Acompanamiento_Sellado"}
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

        {/* Modal DualSignatureModal */}
        {isModalOpen && (
          <DualSignatureModal
            isOpen={true}
            onClose={() => setIsModalOpen(false)}
            signatoryName={professionalSigning || "Profesional DECE"}
            signatoryRole="PROFESIONAL DECE"
            initialData={deceSig}
            onSave={(data) => {
              setDeceSig(data);
              setIsModalOpen(false);
            }}
          />
        )}
      </section>

      <div className="flex justify-end">
        <button type="submit" className="btn-primary">{mode === "edit" ? "Guardar cambios" : "Guardar y ver informe"}</button>
      </div>
    </form>
  );
}
