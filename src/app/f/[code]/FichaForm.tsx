"use client";

import { useFormState, useFormStatus } from "react-dom";
import { submitEneisFichaAction, type FichaActionState } from "./actions";

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

export default function FichaForm({ code }: { code: string }) {
  const [state, formAction] = useFormState(submitEneisFichaAction.bind(null, code), initialState);

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
          <input name="asignatura" required className="input text-sm" placeholder="Ej. Ciencias Naturales" />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Subnivel de educación">
          <select name="subnivel" defaultValue="" className="select text-sm">
            <option value="">—</option>
            {SUBNIVELES.map((sn) => (
              <option key={sn} value={sn}>
                {sn}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Grado / Curso">
          <input name="curso" className="input text-sm" placeholder="Ej. Noveno Año EGB" />
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
        <input name="nombre_ficha" className="input text-sm" placeholder="Ej. NUESTRAS IDEAS SOBRE SEXUALIDAD" />
      </Field>

      <Field label="Objetivo Curricular del Área">
        <textarea name="objetivo_curricular" rows={2} className="textarea text-sm" />
      </Field>
      <Field label="Objetivo de Educación Integral en Sexualidad">
        <textarea name="objetivo_eis" rows={2} className="textarea text-sm" />
      </Field>
      <Field label="Destrezas con criterios de desempeño a evaluar">
        <textarea name="destrezas" rows={2} className="textarea text-sm" />
      </Field>
      <Field label="Orientación Conceptual">
        <textarea name="orientacion_conceptual" rows={2} className="textarea text-sm" />
      </Field>
      <Field label="Recursos">
        <input name="recursos" className="input text-sm" placeholder="Ej. Cuaderno, impresiones, proyector" />
      </Field>

      <div className="pt-2 border-t border-slate-100">
        <p className="text-xs font-bold text-slate-700 mb-2">Propuesta Didáctica</p>
        <div className="space-y-3">
          <Field label="Anticipación">
            <textarea name="anticipacion" rows={2} className="textarea text-sm" />
          </Field>
          <Field label="Conceptualización y construcción de conocimiento">
            <textarea name="conceptualizacion" rows={3} className="textarea text-sm" />
          </Field>
          <Field label="Consolidación">
            <textarea name="consolidacion" rows={2} className="textarea text-sm" />
          </Field>
        </div>
      </div>

      <Field label="Indicadores de evaluación">
        <textarea name="indicadores_evaluacion" rows={2} className="textarea text-sm" />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Número de estudiantes capacitados">
          <input type="number" name="num_estudiantes_capacitados" min={0} className="input text-sm" />
        </Field>
        <Field label="Observaciones (opcional)">
          <input name="observaciones" className="input text-sm" />
        </Field>
      </div>

      <SubmitButton />
      <p className="text-[11px] text-slate-400 text-center">
        Al entregar, se genera la ficha oficial en Word para imprimir y recoger las firmas de responsabilidad.
      </p>
    </form>
  );
}
