"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { submitEneisFichaAction, generateFichaAiDraftAction, type FichaActionState } from "./actions";
import { ENEIS_MATERIALES } from "@/lib/eneis/eneisMaterialesCatalog";
import VoiceDictationButton from "@/components/VoiceDictationButton";

const initialState: FichaActionState = { error: null };

const SUBNIVELES = [
  "Educación Inicial",
  "Preparatoria",
  "Básica Elemental",
  "Básica Media",
  "Básica Superior",
  "Bachillerato",
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full disabled:opacity-60">
      {pending ? "Guardando..." : "📤 Entregar ficha"}
    </button>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="label text-xs">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function DictationField({
  id,
  name,
  value,
  onChange,
  rows = 2,
  placeholder,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <textarea
        id={id}
        name={name}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="textarea text-sm w-full pr-9"
      />
      <div className="absolute top-1.5 right-1.5">
        <VoiceDictationButton targetId={id} compact onResult={(txt) => onChange(value ? `${value} ${txt}` : txt)} />
      </div>
    </div>
  );
}

export default function FichaForm({ code }: { code: string }) {
  const [state, formAction] = useFormState(submitEneisFichaAction.bind(null, code), initialState);

  const [materialId, setMaterialId] = useState("");
  const [asignatura, setAsignatura] = useState("");
  const [curso, setCurso] = useState("");
  const [subnivel, setSubnivel] = useState("");
  const [nombreFicha, setNombreFicha] = useState("");

  const [objetivoCurricular, setObjetivoCurricular] = useState("");
  const [destrezas, setDestrezas] = useState("");
  const [objetivoEis, setObjetivoEis] = useState("");
  const [orientacionConceptual, setOrientacionConceptual] = useState("");
  const [recursos, setRecursos] = useState("");
  const [anticipacion, setAnticipacion] = useState("");
  const [conceptualizacion, setConceptualizacion] = useState("");
  const [consolidacion, setConsolidacion] = useState("");
  const [indicadores, setIndicadores] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPages, setAiPages] = useState<number[] | null>(null);

  async function handleGenerateAi() {
    setAiError(null);
    setAiPages(null);
    if (!materialId) {
      setAiError("Elige primero el libro o guía de referencia.");
      return;
    }
    if (!asignatura.trim()) {
      setAiError("Escribe la asignatura antes de generar con IA.");
      return;
    }
    setAiLoading(true);
    try {
      const res = await generateFichaAiDraftAction({ code, materialId, asignatura, curso, subnivel, nombreFicha });
      if (res.error || !res.data) {
        setAiError(res.error || "No se pudo generar el contenido.");
        return;
      }
      setObjetivoEis(res.data.objetivo_eis);
      setOrientacionConceptual(res.data.orientacion_conceptual);
      setRecursos(res.data.recursos);
      setAnticipacion(res.data.anticipacion);
      setConceptualizacion(res.data.conceptualizacion);
      setConsolidacion(res.data.consolidacion);
      setIndicadores(res.data.indicadores_evaluacion);
      setAiPages(res.data.referencePages);
    } catch (err: any) {
      setAiError(err?.message || "Ocurrió un error al generar con IA.");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-medium">⚠️ {state.error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Nombre completo del docente" required>
          <input name="docente_nombre" required className="input text-sm" placeholder="Mg. Nombre Apellido" />
        </Field>
        <Field label="Asignatura" required>
          <input
            name="asignatura"
            required
            value={asignatura}
            onChange={(e) => setAsignatura(e.target.value)}
            className="input text-sm"
            placeholder="Ej. Ciencias Naturales"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Subnivel de educación">
          <select name="subnivel" value={subnivel} onChange={(e) => setSubnivel(e.target.value)} className="select text-sm">
            <option value="">—</option>
            {SUBNIVELES.map((sn) => (
              <option key={sn} value={sn}>
                {sn}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Grado / Curso">
          <input
            name="curso"
            value={curso}
            onChange={(e) => setCurso(e.target.value)}
            className="input text-sm"
            placeholder="Ej. Noveno Año EGB"
          />
        </Field>
        <Field label="Paralelo">
          <input name="paralelo" className="input text-sm uppercase" placeholder="A" />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Fecha desde">
          <input type="date" name="fecha_desde" className="input text-sm" />
        </Field>
        <Field label="Fecha hasta (opcional)">
          <input type="date" name="fecha_hasta" className="input text-sm" />
        </Field>
      </div>

      <Field label="Nombre de la ficha">
        <input
          name="nombre_ficha"
          value={nombreFicha}
          onChange={(e) => setNombreFicha(e.target.value)}
          className="input text-sm"
          placeholder="Ej. NUESTRAS IDEAS SOBRE SEXUALIDAD"
        />
      </Field>

      <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-3 space-y-2">
        <Field label="Libro o guía de referencia que estás usando en tu planificación">
          <select name="material_id" value={materialId} onChange={(e) => setMaterialId(e.target.value)} className="select text-sm">
            <option value="">— Elige el material —</option>
            {ENEIS_MATERIALES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.short}
              </option>
            ))}
          </select>
        </Field>
        <button
          type="button"
          onClick={handleGenerateAi}
          disabled={aiLoading}
          className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-white px-3 py-1.5 rounded-lg border border-indigo-300 transition flex items-center gap-1.5 disabled:opacity-50"
        >
          {aiLoading ? "⏳ Redactando desde el libro..." : "✨ Generar objetivo, orientación y propuesta didáctica con IA"}
        </button>
        <p className="text-[11px] text-slate-500">
          La IA redacta usando el contenido real del libro elegido (no de otro), según la asignatura y el tema que ya
          escribiste arriba. Rellena los campos de abajo, que igual puedes editar o dictar por voz.
        </p>
        {aiError && <p className="text-xs text-red-600">⚠️ {aiError}</p>}
        {aiPages && aiPages.length > 0 && (
          <p className="text-[11px] text-emerald-700">
            Redactado según la(s) página(s) {aiPages.join(", ")} del material elegido.
          </p>
        )}
      </div>

      <Field label="Objetivo Curricular del Área">
        <DictationField id="f_objetivo_curricular" name="objetivo_curricular" value={objetivoCurricular} onChange={setObjetivoCurricular} />
      </Field>
      <Field label="Objetivo de Educación Integral en Sexualidad">
        <DictationField id="f_objetivo_eis" name="objetivo_eis" value={objetivoEis} onChange={setObjetivoEis} />
      </Field>
      <Field label="Destrezas con criterios de desempeño a evaluar">
        <DictationField id="f_destrezas" name="destrezas" value={destrezas} onChange={setDestrezas} />
      </Field>
      <Field label="Orientación Conceptual">
        <DictationField id="f_orientacion_conceptual" name="orientacion_conceptual" value={orientacionConceptual} onChange={setOrientacionConceptual} />
      </Field>
      <Field label="Recursos">
        <DictationField id="f_recursos" name="recursos" value={recursos} onChange={setRecursos} rows={1} placeholder="Ej. Cuaderno, impresiones, proyector" />
      </Field>

      <div className="pt-2 border-t border-slate-100">
        <p className="text-xs font-bold text-slate-700 mb-2">Propuesta Didáctica</p>
        <div className="space-y-3">
          <Field label="Anticipación">
            <DictationField id="f_anticipacion" name="anticipacion" value={anticipacion} onChange={setAnticipacion} />
          </Field>
          <Field label="Conceptualización y construcción de conocimiento">
            <DictationField id="f_conceptualizacion" name="conceptualizacion" value={conceptualizacion} onChange={setConceptualizacion} rows={3} />
          </Field>
          <Field label="Consolidación">
            <DictationField id="f_consolidacion" name="consolidacion" value={consolidacion} onChange={setConsolidacion} />
          </Field>
        </div>
      </div>

      <Field label="Indicadores de evaluación">
        <DictationField id="f_indicadores" name="indicadores_evaluacion" value={indicadores} onChange={setIndicadores} />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Número de estudiantes capacitados">
          <input type="number" name="num_estudiantes_capacitados" min={0} className="input text-sm" />
        </Field>
        <Field label="Observaciones (opcional)">
          <input name="observaciones" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className="input text-sm" />
        </Field>
      </div>

      <SubmitButton />
      <p className="text-[11px] text-slate-400 text-center">
        Al entregar, se genera la ficha oficial en Word para imprimir y recoger las firmas de responsabilidad.
      </p>
    </form>
  );
}
